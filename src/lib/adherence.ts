// lib/adherence.ts
import { collection, query, where, orderBy, getDocs, Timestamp, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';

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
    }>;

    timeline: Array<{
        date: string; // YYYY-MM-DD
        scheduledDoses: number;
        givenDoses: number;
        missedDoses: number;
        adherenceRate: number;
    }>;
}

/**
 * Calculate adherence metrics for a patient over the last 30 days
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
            // Return empty metrics if no data
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

        // Parse records
        const records: AdherenceRecord[] = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as AdherenceRecord));

        console.log(`Found ${records.length} adherence records for discharge ${dischargeId}`);

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
        const medicationGroups = new Map<string, AdherenceRecord[]>();
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
                adherenceRate: medAdherence
            };
        });

        // Calculate timeline (daily breakdown)
        const dayGroups = new Map<string, AdherenceRecord[]>();
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

    } catch (error) {
        console.error('Error calculating adherence metrics:', error);

        // Return empty metrics on error
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
}

/**
 * Get recent adherence records for timeline display
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
 * Calculate summary adherence rate for patient dashboard
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