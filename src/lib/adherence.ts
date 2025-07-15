// lib/adherence.ts - Enhanced for Multi-Discharge Support
import { collection, query, where, orderBy, getDocs, Timestamp, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Discharge, Medication } from '@/types/discharge';

// Firebase adherence record structure (matches your actual data)
export interface AdherenceRecord {
    id: string;

    // Dose event fields
    medicationId: string;
    medicationName: string;
    petName: string;
    scheduledTime: Timestamp;
    givenAt?: Timestamp; // Present if status is "given"
    status: 'given' | 'missed' | 'skipped';
    dosage: string;
    frequency: number;
    instructions: string;
    loggedAt: Timestamp;

    // Symptom fields (nested under symptoms object)
    symptoms?: {
        appetite: number; // 1-5
        energyLevel: number; // 1-5
        isPanting: boolean;
        notes?: string;
        recordedAt: Timestamp;
    };
}

// Enhanced adherence record with discharge tracking
export interface ExtendedAdherenceRecord extends AdherenceRecord {
    dischargeId: string;
}

// Calculated adherence metrics
export interface AdherenceMetrics {
    overall: {
        totalDoses: number;
        givenDoses: number;
        lateDoses: number; // Given >2h after scheduled
        missedDoses: number;
        adherenceRate: number; // percentage
    };

    perMedication: Array<{
        medicationName: string;
        totalDoses: number;
        onTimeDoses: number;
        lateDoses: number;
        missedDoses: number;
        adherenceRate: number;
        dischargeId?: string; // Track which discharge the medication is from
    }>;

    timeline: Array<{
        date: string; // YYYY-MM-DD
        scheduledDoses: number;
        givenDoses: number;
        missedDoses: number;
        adherenceRate: number;
    }>;
}

// Enhanced metrics for cross-discharge analysis
export interface CrossDischargeAdherenceMetrics {
    overall: AdherenceMetrics['overall'];
    activeOnly: AdherenceMetrics['overall']; // Metrics for currently active medications only
    perMedication: AdherenceMetrics['perMedication'];
    perDischarge: Array<{
        dischargeId: string;
        dischargeDate: Date;
        metrics: AdherenceMetrics['overall'];
        isActive: boolean;
    }>;
    timeline: AdherenceMetrics['timeline'];
    lastDoseGiven?: {
        date: Date;
        medicationName: string;
        dischargeId: string;
    };
}

/**
 * Calculate adherence metrics for a single discharge (existing function - enhanced)
 */
export async function calculateAdherenceMetrics(
    dischargeId: string,
    clinicId: string,
    dayRange: number = 30
): Promise<AdherenceMetrics> {
    try {
        // Calculate date range (last N days)
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - dayRange);

        // Query adherence records for this discharge in the date range
        const adherenceRef = collection(db, 'discharges', dischargeId, 'adherence');
        const q = query(
            adherenceRef,
            where('scheduledTime', '>=', Timestamp.fromDate(startDate)),
            where('scheduledTime', '<=', Timestamp.fromDate(endDate)),
            orderBy('scheduledTime', 'desc'),
            limit(500) // Reasonable limit for 30 days of data
        );

        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            return createEmptyMetrics();
        }

        // Parse records
        const records: AdherenceRecord[] = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as AdherenceRecord));

        console.log(`Found ${records.length} adherence records for discharge ${dischargeId}`);

        return calculateMetricsFromRecords(records);

    } catch (error) {
        console.error('Error calculating adherence metrics:', error);
        return createEmptyMetrics();
    }
}

/**
 * NEW: Calculate adherence metrics across ALL discharges for a pet
 */
export async function calculatePetAdherenceMetrics(
    discharges: Discharge[],
    dayRange: number = 90
): Promise<CrossDischargeAdherenceMetrics> {
    try {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - dayRange);

        let allRecords: ExtendedAdherenceRecord[] = [];
        const perDischargeMetrics: CrossDischargeAdherenceMetrics['perDischarge'] = [];

        // Collect adherence data from all discharges
        for (const discharge of discharges) {
            const adherenceRef = collection(db, 'discharges', discharge.id, 'adherence');
            const q = query(
                adherenceRef,
                where('scheduledTime', '>=', Timestamp.fromDate(startDate)),
                where('scheduledTime', '<=', Timestamp.fromDate(endDate)),
                orderBy('scheduledTime', 'desc'),
                limit(300) // Reasonable limit per discharge
            );

            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                // Add empty metrics for this discharge
                perDischargeMetrics.push({
                    dischargeId: discharge.id,
                    dischargeDate: discharge.visitDate || discharge.createdAt,
                    metrics: createEmptyMetrics().overall,
                    isActive: isDischargeActive(discharge)
                });
                continue;
            }

            // Convert records and add discharge tracking
            const dischargeRecords: ExtendedAdherenceRecord[] = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                dischargeId: discharge.id
            } as ExtendedAdherenceRecord));

            allRecords = [...allRecords, ...dischargeRecords];

            // Calculate metrics for this specific discharge
            const dischargeMetrics = calculateMetricsFromRecords(dischargeRecords);
            perDischargeMetrics.push({
                dischargeId: discharge.id,
                dischargeDate: discharge.visitDate || discharge.createdAt,
                metrics: dischargeMetrics.overall,
                isActive: isDischargeActive(discharge)
            });
        }

        // Calculate overall metrics across all discharges
        const overallMetrics = calculateMetricsFromRecords(allRecords);

        // Calculate active-only metrics (last 30 days from active medications only)
        const activeRecords = getActiveOnlyRecords(allRecords, discharges);
        const activeOnlyMetrics = calculateMetricsFromRecords(activeRecords);

        // Find last dose given across all discharges
        const lastDoseGiven = findLastDoseGiven(allRecords);

        return {
            overall: overallMetrics.overall,
            activeOnly: activeOnlyMetrics.overall,
            perMedication: overallMetrics.perMedication,
            perDischarge: perDischargeMetrics,
            timeline: overallMetrics.timeline,
            lastDoseGiven
        };

    } catch (error) {
        console.error('Error calculating pet adherence metrics:', error);
        return {
            overall: createEmptyMetrics().overall,
            activeOnly: createEmptyMetrics().overall,
            perMedication: [],
            perDischarge: [],
            timeline: []
        };
    }
}

/**
 * NEW: Get pet dose metrics for dashboard display
 */
export async function getPetDoseMetrics(
    discharges: Discharge[],
    dayRange: number = 30
): Promise<{
    missedDoseCount: number;
    lateDoseCount: number;
    lastDoseGivenDate?: Date;
    totalRecentDoses: number;
    recentAdherenceRate: number;
}> {
    try {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - dayRange);

        let allRecords: ExtendedAdherenceRecord[] = [];

        // Collect recent adherence data from all discharges
        for (const discharge of discharges) {
            const adherenceRef = collection(db, 'discharges', discharge.id, 'adherence');
            const q = query(
                adherenceRef,
                where('scheduledTime', '>=', Timestamp.fromDate(startDate)),
                where('scheduledTime', '<=', Timestamp.fromDate(endDate)),
                orderBy('scheduledTime', 'desc'),
                limit(200) // Reasonable limit per discharge
            );

            const snapshot = await getDocs(q);

            if (!snapshot.empty) {
                const dischargeRecords: ExtendedAdherenceRecord[] = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    dischargeId: discharge.id
                } as ExtendedAdherenceRecord));

                allRecords = [...allRecords, ...dischargeRecords];
            }
        }

        // Calculate dose metrics
        const missedDoseCount = allRecords.filter(r => r.status === 'missed').length;

        const lateDoseCount = allRecords.filter(r => {
            if (r.status !== 'given' || !r.givenAt) return false;
            const scheduledTime = r.scheduledTime.toDate().getTime();
            const givenTime = r.givenAt.toDate().getTime();
            const twoHours = 2 * 60 * 60 * 1000;
            return givenTime > scheduledTime + twoHours;
        }).length;

        // Find most recent dose given
        const givenRecords = allRecords
            .filter(r => r.status === 'given' && r.givenAt)
            .sort((a, b) => b.givenAt!.toDate().getTime() - a.givenAt!.toDate().getTime());

        const lastDoseGivenDate = givenRecords.length > 0
            ? givenRecords[0].givenAt!.toDate()
            : undefined;

        const totalRecentDoses = allRecords.length;
        const givenDoses = allRecords.filter(r => r.status === 'given').length;
        const recentAdherenceRate = totalRecentDoses > 0
            ? Math.round((givenDoses / totalRecentDoses) * 100)
            : 0;

        return {
            missedDoseCount,
            lateDoseCount,
            lastDoseGivenDate,
            totalRecentDoses,
            recentAdherenceRate
        };

    } catch (error) {
        console.error('Error calculating pet dose metrics:', error);
        return {
            missedDoseCount: 0,
            lateDoseCount: 0,
            totalRecentDoses: 0,
            recentAdherenceRate: 0
        };
    }
}

/**
 * Helper function to calculate metrics from a set of records
 */
function calculateMetricsFromRecords(records: (AdherenceRecord | ExtendedAdherenceRecord)[]): AdherenceMetrics {
    if (records.length === 0) {
        return createEmptyMetrics();
    }

    // Calculate overall metrics
    const totalDoses = records.length;
    const givenRecords = records.filter(r => r.status === 'given');
    const givenDoses = givenRecords.length;
    const missedDoses = records.filter(r => r.status === 'missed' || r.status === 'skipped').length;

    // Calculate late doses (given >2 hours after scheduled)
    const lateDoses = givenRecords.filter(r => {
        if (!r.givenAt) return false;
        const scheduledTime = r.scheduledTime.toDate();
        const actualTime = r.givenAt.toDate();
        const delayHours = (actualTime.getTime() - scheduledTime.getTime()) / (1000 * 60 * 60);
        return delayHours > 2;
    }).length;

    const adherenceRate = totalDoses > 0 ? Math.round((givenDoses / totalDoses) * 100) : 0;

    // Calculate per-medication metrics
    const medicationGroups = new Map<string, (AdherenceRecord | ExtendedAdherenceRecord)[]>();
    records.forEach(record => {
        const medName = record.medicationName;
        if (!medicationGroups.has(medName)) {
            medicationGroups.set(medName, []);
        }
        medicationGroups.get(medName)!.push(record);
    });

    const perMedication = Array.from(medicationGroups.entries()).map(([medName, medRecords]) => {
        const medTotal = medRecords.length;
        const medGiven = medRecords.filter(r => r.status === 'given');
        const medGivenCount = medGiven.length;
        const medMissed = medRecords.filter(r => r.status === 'missed' || r.status === 'skipped').length;

        const medLate = medGiven.filter(r => {
            if (!r.givenAt) return false;
            const scheduledTime = r.scheduledTime.toDate();
            const actualTime = r.givenAt.toDate();
            const delayHours = (actualTime.getTime() - scheduledTime.getTime()) / (1000 * 60 * 60);
            return delayHours > 2;
        }).length;

        const medOnTime = medGivenCount - medLate;
        const medAdherence = medTotal > 0 ? Math.round((medGivenCount / medTotal) * 100) : 0;

        return {
            medicationName: medName,
            totalDoses: medTotal,
            onTimeDoses: medOnTime,
            lateDoses: medLate,
            missedDoses: medMissed,
            adherenceRate: medAdherence,
            dischargeId: 'dischargeId' in medRecords[0] ? (medRecords[0] as ExtendedAdherenceRecord).dischargeId : undefined
        };
    });

    // Calculate timeline (daily breakdown)
    const dayGroups = new Map<string, (AdherenceRecord | ExtendedAdherenceRecord)[]>();
    records.forEach(record => {
        const dateKey = record.scheduledTime.toDate().toISOString().split('T')[0]; // YYYY-MM-DD
        if (!dayGroups.has(dateKey)) {
            dayGroups.set(dateKey, []);
        }
        dayGroups.get(dateKey)!.push(record);
    });

    const timeline = Array.from(dayGroups.entries()).map(([date, dayRecords]) => {
        const scheduled = dayRecords.length;
        const given = dayRecords.filter(r => r.status === 'given').length;
        const missed = dayRecords.filter(r => r.status === 'missed' || r.status === 'skipped').length;
        const dayAdherence = scheduled > 0 ? Math.round((given / scheduled) * 100) : 0;

        return {
            date,
            scheduledDoses: scheduled,
            givenDoses: given,
            missedDoses: missed,
            adherenceRate: dayAdherence
        };
    }).sort((a, b) => a.date.localeCompare(b.date)); // Sort chronologically

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
 * Helper function to filter records to active medications only
 */
function getActiveOnlyRecords(
    records: ExtendedAdherenceRecord[],
    discharges: Discharge[]
): ExtendedAdherenceRecord[] {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));

    // Build a map of active medications by discharge
    const activeMedsByDischarge = new Map<string, Set<string>>();

    discharges.forEach(discharge => {
        const activeMeds = discharge.medications
            .filter(med => isMedicationActive(med, discharge, now))
            .map(med => med.name);

        activeMedsByDischarge.set(discharge.id, new Set(activeMeds));
    });

    // Filter records to active medications and last 30 days
    return records.filter(record => {
        const isRecent = record.scheduledTime.toDate() >= thirtyDaysAgo;
        const activeMeds = activeMedsByDischarge.get(record.dischargeId);
        const isActiveMed = activeMeds?.has(record.medicationName) || false;

        return isRecent && isActiveMed;
    });
}

/**
 * Helper function to determine if a medication is currently active
 */
function isMedicationActive(medication: Medication, discharge: Discharge, currentDate: Date): boolean {
    const startDate = new Date(medication.startDate || discharge.createdAt);

    // If medication has an explicit end date
    if (medication.endDate) {
        const endDate = new Date(medication.endDate);
        return currentDate >= startDate && currentDate <= endDate;
    }

    // For tapered medications, check if we're within any taper stage
    if (medication.isTapered && medication.taperStages.length > 0) {
        return medication.taperStages.some(stage => {
            const stageStart = new Date(stage.startDate);
            const stageEnd = new Date(stage.endDate);
            return currentDate >= stageStart && currentDate <= stageEnd;
        });
    }

    // For medications with totalDoses, consider active if within reasonable timeframe
    if (medication.totalDoses) {
        const daysSinceStart = (currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceStart <= 30;
    }

    // Default: consider active if started within last 30 days
    const daysSinceStart = (currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceStart <= 30;
}

/**
 * Helper function to determine if a discharge is currently active
 */
function isDischargeActive(discharge: Discharge): boolean {
    const now = new Date();
    return discharge.medications.some(med => isMedicationActive(med, discharge, now));
}

/**
 * Helper function to find the most recent dose given across all records
 */
function findLastDoseGiven(records: ExtendedAdherenceRecord[]): CrossDischargeAdherenceMetrics['lastDoseGiven'] {
    const givenRecords = records
        .filter(r => r.status === 'given' && r.givenAt)
        .sort((a, b) => b.givenAt!.toDate().getTime() - a.givenAt!.toDate().getTime());

    if (givenRecords.length === 0) return undefined;

    const lastRecord = givenRecords[0];
    return {
        date: lastRecord.givenAt!.toDate(),
        medicationName: lastRecord.medicationName,
        dischargeId: lastRecord.dischargeId
    };
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
 * Get recent adherence records for timeline display (existing function - kept for compatibility)
 */
export async function getRecentAdherenceRecords(
    dischargeId: string,
    recordLimit: number = 50
): Promise<AdherenceRecord[]> {
    try {
        const adherenceRef = collection(db, 'discharges', dischargeId, 'adherence');
        const q = query(
            adherenceRef,
            orderBy('scheduledTime', 'desc'),
            limit(recordLimit)
        );

        const snapshot = await getDocs(q);

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as AdherenceRecord));

    } catch (error) {
        console.error('Error fetching adherence records:', error);
        return [];
    }
}

/**
 * Calculate summary adherence rate for patient dashboard (existing function - kept for compatibility)
 */
export async function getPatientAdherenceSummary(
    dischargeId: string,
    clinicId: string
): Promise<{ adherenceRate: number; lastActivity?: Date; isActive: boolean }> {
    try {
        // Get last 30 days of data
        const metrics = await calculateAdherenceMetrics(dischargeId, clinicId, 30);

        // Get the most recent activity
        const recentRecords = await getRecentAdherenceRecords(dischargeId, 1);
        const lastActivity = recentRecords.length > 0
            ? recentRecords[0].loggedAt.toDate()
            : undefined;

        // Consider active if there's been activity in the last 7 days
        const isActive = lastActivity
            ? (Date.now() - lastActivity.getTime()) < (7 * 24 * 60 * 60 * 1000)
            : false;

        return {
            adherenceRate: metrics.overall.adherenceRate,
            lastActivity,
            isActive
        };

    } catch (error) {
        console.error('Error getting patient adherence summary:', error);
        return {
            adherenceRate: 0,
            isActive: false
        };
    }
}