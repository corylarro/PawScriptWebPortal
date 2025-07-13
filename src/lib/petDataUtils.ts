// lib/petDataUtils.ts
import { collection, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/types/firestore';
import { Discharge } from '@/types/discharge';
import { AdherenceRecord, AdherenceMetrics } from './adherence';
import { SymptomAnalysis, SymptomFlag } from './symptomFlags';

/**
 * Get all discharges for a specific pet across all visits
 */
export async function getAllDischargesForPet(
    petName: string,
    clinicId: string,
    petSpecies?: string
): Promise<Discharge[]> {
    try {
        const q = query(
            collection(db, COLLECTIONS.DISCHARGES),
            where('clinicId', '==', clinicId),
            orderBy('createdAt', 'desc')
        );

        const snapshot = await getDocs(q);

        // Filter by pet name and optionally species
        const discharges = snapshot.docs
            .map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate() || new Date(),
                updatedAt: doc.data().updatedAt?.toDate() || new Date()
            } as Discharge))
            .filter(discharge => {
                const nameMatch = discharge.pet.name.toLowerCase() === petName.toLowerCase();
                const speciesMatch = !petSpecies || discharge.pet.species.toLowerCase() === petSpecies.toLowerCase();
                return nameMatch && speciesMatch;
            });

        console.log(`Found ${discharges.length} discharges for pet ${petName}`);
        return discharges;

    } catch (error) {
        console.error(`Error fetching discharges for pet ${petName}:`, error);
        return [];
    }
}

/**
 * Get aggregated adherence data across all discharges for a pet
 */
export async function getAllAdherenceForPet(
    petName: string,
    clinicId: string,
    petSpecies?: string,
    dayRange: number = 90
): Promise<{
    aggregatedMetrics: AdherenceMetrics;
    allRecords: (AdherenceRecord & { dischargeId: string })[];
    lastActivity?: Date;
    isActive: boolean;
}> {
    try {
        // Get all discharges for this pet
        const discharges = await getAllDischargesForPet(petName, clinicId, petSpecies);

        if (discharges.length === 0) {
            return {
                aggregatedMetrics: createEmptyMetrics(),
                allRecords: [],
                isActive: false
            };
        }

        // Calculate date range
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - dayRange);

        // Collect all adherence records across discharges
        const allRecords: (AdherenceRecord & { dischargeId: string })[] = [];

        for (const discharge of discharges) {
            try {
                const adherenceRef = collection(db, 'discharges', discharge.id, 'adherence');
                const q = query(
                    adherenceRef,
                    where('scheduledTime', '>=', Timestamp.fromDate(startDate)),
                    where('scheduledTime', '<=', Timestamp.fromDate(endDate)),
                    orderBy('scheduledTime', 'desc')
                );

                const snapshot = await getDocs(q);

                snapshot.docs.forEach(doc => {
                    allRecords.push({
                        id: doc.id,
                        dischargeId: discharge.id,
                        ...doc.data()
                    } as AdherenceRecord & { dischargeId: string });
                });
            } catch (error) {
                console.error(`Error fetching adherence for discharge ${discharge.id}:`, error);
            }
        }

        // Sort all records by scheduled time
        allRecords.sort((a, b) => b.scheduledTime.seconds - a.scheduledTime.seconds);

        // Calculate aggregated metrics
        const aggregatedMetrics = calculateAggregatedAdherence(allRecords);

        // Find last activity
        const lastActivity = allRecords.length > 0
            ? allRecords[0].loggedAt.toDate()
            : undefined;

        // Consider active if there's been activity in the last 7 days
        const isActive = lastActivity
            ? (Date.now() - lastActivity.getTime()) < (7 * 24 * 60 * 60 * 1000)
            : false;

        return {
            aggregatedMetrics,
            allRecords,
            lastActivity,
            isActive
        };

    } catch (error) {
        console.error(`Error getting adherence for pet ${petName}:`, error);
        return {
            aggregatedMetrics: createEmptyMetrics(),
            allRecords: [],
            isActive: false
        };
    }
}

/**
 * Get aggregated symptom data across all discharges for a pet
 */
export async function getAllSymptomLogsForPet(
    petName: string,
    clinicId: string,
    petSpecies?: string,
    dayRange: number = 90
): Promise<{
    aggregatedAnalysis: SymptomAnalysis;
    allSymptoms: Array<{
        dischargeId: string;
        medicationName: string;
        date: string;
        appetite: number;
        energyLevel: number;
        isPanting: boolean;
        notes?: string;
        recordedAt: Date;
    }>;
    flagCount: number;
}> {
    try {
        // Get all discharges for this pet
        const discharges = await getAllDischargesForPet(petName, clinicId, petSpecies);

        if (discharges.length === 0) {
            return {
                aggregatedAnalysis: createEmptySymptomAnalysis(),
                allSymptoms: [],
                flagCount: 0
            };
        }

        // Calculate date range
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - dayRange);

        // Collect all symptom logs across discharges
        const allSymptoms: Array<{
            dischargeId: string;
            medicationName: string;
            date: string;
            appetite: number;
            energyLevel: number;
            isPanting: boolean;
            notes?: string;
            recordedAt: Date;
        }> = [];

        for (const discharge of discharges) {
            try {
                const adherenceRef = collection(db, 'discharges', discharge.id, 'adherence');
                const q = query(
                    adherenceRef,
                    where('scheduledTime', '>=', Timestamp.fromDate(startDate)),
                    where('scheduledTime', '<=', Timestamp.fromDate(endDate)),
                    orderBy('scheduledTime', 'desc')
                );

                const snapshot = await getDocs(q);

                snapshot.docs.forEach(doc => {
                    const record = doc.data() as AdherenceRecord;
                    if (record.symptoms) {
                        const dateKey = record.scheduledTime.toDate().toISOString().split('T')[0];

                        allSymptoms.push({
                            dischargeId: discharge.id,
                            medicationName: record.medicationName,
                            date: dateKey,
                            appetite: record.symptoms.appetite,
                            energyLevel: record.symptoms.energyLevel,
                            isPanting: record.symptoms.isPanting,
                            notes: record.symptoms.notes,
                            recordedAt: record.symptoms.recordedAt.toDate()
                        });
                    }
                });
            } catch (error) {
                console.error(`Error fetching symptoms for discharge ${discharge.id}:`, error);
            }
        }

        // Group by date and keep most recent entry per day
        const symptomsByDate = new Map<string, typeof allSymptoms[0]>();
        allSymptoms.forEach(symptom => {
            if (!symptomsByDate.has(symptom.date) ||
                symptom.recordedAt > (symptomsByDate.get(symptom.date)?.recordedAt || new Date(0))) {
                symptomsByDate.set(symptom.date, symptom);
            }
        });

        // Convert to symptom entries for analysis
        const symptomEntries = Array.from(symptomsByDate.values())
            .map(s => ({
                date: s.date,
                appetite: s.appetite,
                energyLevel: s.energyLevel,
                isPanting: s.isPanting,
                notes: s.notes,
                recordedAt: s.recordedAt
            }))
            .sort((a, b) => b.date.localeCompare(a.date));

        // Calculate aggregated analysis
        const aggregatedAnalysis = calculateAggregatedSymptoms(symptomEntries);

        return {
            aggregatedAnalysis,
            allSymptoms: Array.from(symptomsByDate.values()),
            flagCount: aggregatedAnalysis.flags.length
        };

    } catch (error) {
        console.error(`Error getting symptoms for pet ${petName}:`, error);
        return {
            aggregatedAnalysis: createEmptySymptomAnalysis(),
            allSymptoms: [],
            flagCount: 0
        };
    }
}

/**
 * Helper function to calculate aggregated adherence metrics
 */
function calculateAggregatedAdherence(records: (AdherenceRecord & { dischargeId: string })[]): AdherenceMetrics {
    if (records.length === 0) {
        return createEmptyMetrics();
    }

    // Group by medication across all discharges
    const medicationGroups = new Map<string, (AdherenceRecord & { dischargeId: string })[]>();

    records.forEach(record => {
        const key = record.medicationName;
        if (!medicationGroups.has(key)) {
            medicationGroups.set(key, []);
        }
        medicationGroups.get(key)!.push(record);
    });

    // Calculate overall metrics
    const totalDoses = records.length;
    const givenDoses = records.filter(r => r.status === 'given').length;
    const missedDoses = records.filter(r => r.status === 'missed').length;

    // Calculate late doses (given more than 2 hours after scheduled)
    const lateDoses = records.filter(r => {
        if (r.status !== 'given' || !r.givenAt) return false;
        const scheduledTime = r.scheduledTime.toDate().getTime();
        const givenTime = r.givenAt.toDate().getTime();
        const twoHours = 2 * 60 * 60 * 1000;
        return givenTime > scheduledTime + twoHours;
    }).length;

    const adherenceRate = totalDoses > 0 ? Math.round((givenDoses / totalDoses) * 100) : 0;

    // Calculate per-medication metrics
    const perMedication = Array.from(medicationGroups.entries()).map(([medicationName, medRecords]) => {
        const medTotal = medRecords.length;
        const medGiven = medRecords.filter(r => r.status === 'given').length;
        const medLate = medRecords.filter(r => {
            if (r.status !== 'given' || !r.givenAt) return false;
            const scheduledTime = r.scheduledTime.toDate().getTime();
            const givenTime = r.givenAt.toDate().getTime();
            const twoHours = 2 * 60 * 60 * 1000;
            return givenTime > scheduledTime + twoHours;
        }).length;
        const medMissed = medRecords.filter(r => r.status === 'missed').length;
        const onTimeDoses = medGiven - medLate;

        return {
            medicationName,
            totalDoses: medTotal,
            onTimeDoses,
            lateDoses: medLate,
            missedDoses: medMissed,
            adherenceRate: medTotal > 0 ? Math.round((medGiven / medTotal) * 100) : 0
        };
    });

    // Calculate timeline by date
    const dateGroups = new Map<string, (AdherenceRecord & { dischargeId: string })[]>();
    records.forEach(record => {
        const dateKey = record.scheduledTime.toDate().toISOString().split('T')[0];
        if (!dateGroups.has(dateKey)) {
            dateGroups.set(dateKey, []);
        }
        dateGroups.get(dateKey)!.push(record);
    });

    const timeline = Array.from(dateGroups.entries()).map(([date, dayRecords]) => {
        const scheduled = dayRecords.length;
        const given = dayRecords.filter(r => r.status === 'given').length;
        const missed = dayRecords.filter(r => r.status === 'missed').length;
        const dayAdherence = scheduled > 0 ? Math.round((given / scheduled) * 100) : 0;

        return {
            date,
            scheduledDoses: scheduled,
            givenDoses: given,
            missedDoses: missed,
            adherenceRate: dayAdherence
        };
    }).sort((a, b) => a.date.localeCompare(b.date));

    return {
        overall: {
            totalDoses,
            givenDoses,
            lateDoses,
            missedDoses,
            adherenceRate
        },
        perMedication,
        timeline
    };
}

/**
 * Helper function to calculate aggregated symptom analysis
 */
function calculateAggregatedSymptoms(entries: Array<{
    date: string;
    appetite: number;
    energyLevel: number;
    isPanting: boolean;
    notes?: string;
    recordedAt: Date;
}>): SymptomAnalysis {
    if (entries.length === 0) {
        return createEmptySymptomAnalysis();
    }

    // Generate flags based on symptom patterns
    const flags = generateSymptomFlags(entries);

    // Calculate trends
    const sevenDayEntries = entries.slice(0, 7);
    const appetiteValues = sevenDayEntries.map(e => e.appetite).filter(v => v > 0);
    const energyValues = sevenDayEntries.map(e => e.energyLevel).filter(v => v > 0);

    const appetiteAvg = appetiteValues.length > 0
        ? appetiteValues.reduce((sum, val) => sum + val, 0) / appetiteValues.length
        : 0;

    const energyAvg = energyValues.length > 0
        ? energyValues.reduce((sum, val) => sum + val, 0) / energyValues.length
        : 0;

    const pantingDays = sevenDayEntries.filter(e => e.isPanting).length;

    // Calculate trends
    const appetiteTrend = calculateTrend(entries.map(e => e.appetite));
    const energyTrend = calculateTrend(entries.map(e => e.energyLevel));

    const trends = {
        appetite: {
            current: entries.length > 0 ? entries[0].appetite : 0,
            sevenDayAverage: Math.round(appetiteAvg * 10) / 10,
            trend: appetiteTrend
        },
        energy: {
            current: entries.length > 0 ? entries[0].energyLevel : 0,
            sevenDayAverage: Math.round(energyAvg * 10) / 10,
            trend: energyTrend
        },
        panting: {
            recentDays: pantingDays,
            isFrequent: pantingDays >= 3
        }
    };

    return {
        flags,
        recentEntries: entries.slice(0, 14),
        trends
    };
}

/**
 * Helper function to generate symptom flags
 */
function generateSymptomFlags(entries: Array<{
    date: string;
    appetite: number;
    energyLevel: number;
    isPanting: boolean;
}>): SymptomFlag[] {
    const flags: SymptomFlag[] = [];

    if (entries.length === 0) return flags;

    // Check recent entries for flags
    entries.slice(0, 7).forEach((entry, index) => {
        // Low appetite flags
        if (entry.appetite <= 2) {
            flags.push({
                type: 'appetite_low',
                date: entry.date,
                description: `Very low appetite (${entry.appetite}/5)`,
                severity: entry.appetite === 1 ? 'high' : 'medium',
                value: entry.appetite
            });
        }

        // Low energy flags
        if (entry.energyLevel <= 2) {
            flags.push({
                type: 'energy_low',
                date: entry.date,
                description: `Low energy level (${entry.energyLevel}/5)`,
                severity: entry.energyLevel === 1 ? 'high' : 'medium',
                value: entry.energyLevel
            });
        }

        // Appetite drop flags (compared to previous day)
        if (index < entries.length - 1) {
            const previousEntry = entries[index + 1];
            const appetiteDrop = previousEntry.appetite - entry.appetite;
            if (appetiteDrop >= 2) {
                flags.push({
                    type: 'appetite_drop',
                    date: entry.date,
                    description: `Appetite dropped from ${previousEntry.appetite} to ${entry.appetite}`,
                    severity: appetiteDrop >= 3 ? 'high' : 'medium',
                    value: entry.appetite,
                    previousValue: previousEntry.appetite
                });
            }

            // Energy drop flags
            const energyDrop = previousEntry.energyLevel - entry.energyLevel;
            if (energyDrop >= 2) {
                flags.push({
                    type: 'energy_drop',
                    date: entry.date,
                    description: `Energy dropped from ${previousEntry.energyLevel} to ${entry.energyLevel}`,
                    severity: energyDrop >= 3 ? 'high' : 'medium',
                    value: entry.energyLevel,
                    previousValue: previousEntry.energyLevel
                });
            }
        }

        // Persistent panting flag
        if (entry.isPanting) {
            const recentPantingDays = entries.slice(0, 3).filter(e => e.isPanting).length;
            if (recentPantingDays >= 3) {
                flags.push({
                    type: 'panting_persistent',
                    date: entry.date,
                    description: `Persistent panting for ${recentPantingDays} days`,
                    severity: 'medium'
                });
            }
        }
    });

    return flags;
}

/**
 * Helper function to calculate trend direction
 */
function calculateTrend(values: number[]): 'improving' | 'stable' | 'declining' {
    if (values.length < 3) return 'stable';

    const recent = values.slice(0, 3);
    const older = values.slice(3, 6);

    if (recent.length === 0 || older.length === 0) return 'stable';

    const recentAvg = recent.reduce((sum, val) => sum + val, 0) / recent.length;
    const olderAvg = older.reduce((sum, val) => sum + val, 0) / older.length;

    const difference = recentAvg - olderAvg;

    if (difference > 0.5) return 'improving';
    if (difference < -0.5) return 'declining';
    return 'stable';
}

/**
 * Helper function to create empty metrics
 */
function createEmptyMetrics(): AdherenceMetrics {
    return {
        overall: {
            totalDoses: 0,
            givenDoses: 0,
            lateDoses: 0,
            missedDoses: 0,
            adherenceRate: 0
        },
        perMedication: [],
        timeline: []
    };
}

/**
 * Helper function to create empty symptom analysis
 */
function createEmptySymptomAnalysis(): SymptomAnalysis {
    return {
        flags: [],
        recentEntries: [],
        trends: {
            appetite: { current: 0, sevenDayAverage: 0, trend: 'stable' },
            energy: { current: 0, sevenDayAverage: 0, trend: 'stable' },
            panting: { recentDays: 0, isFrequent: false }
        }
    };
}