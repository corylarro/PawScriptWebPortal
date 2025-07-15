// lib/symptomFlags.ts - Enhanced for Multi-Discharge Support
import { collection, query, where, orderBy, getDocs, Timestamp, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { AdherenceRecord } from './adherence';
import { Discharge } from '@/types/discharge';

// Symptom flag types
export type SymptomFlagType = 'appetite_low' | 'appetite_drop' | 'energy_low' | 'energy_drop' | 'panting_persistent';

export interface SymptomFlag {
    type: SymptomFlagType;
    date: string; // YYYY-MM-DD when the flag was triggered
    description: string;
    severity: 'low' | 'medium' | 'high';
    value?: number; // The symptom value that triggered the flag
    previousValue?: number; // For drop flags
    dischargeId: string; // Track which discharge this flag came from
}

export interface SymptomEntry {
    date: string; // YYYY-MM-DD
    appetite: number;
    energyLevel: number;
    isPanting: boolean;
    notes?: string;
    recordedAt: Date;
    dischargeId: string; // Track which discharge this entry came from
}

export interface SymptomAnalysis {
    flags: SymptomFlag[];
    recentEntries: SymptomEntry[];
    trends: {
        appetite: {
            current: number;
            sevenDayAverage: number;
            trend: 'improving' | 'stable' | 'declining';
        };
        energy: {
            current: number;
            sevenDayAverage: number;
            trend: 'improving' | 'stable' | 'declining';
        };
        panting: {
            recentDays: number; // Number of days in last week with panting
            isFrequent: boolean;
        };
    };
}

/**
 * Enhanced interface for cross-discharge symptom analysis
 */
export interface CrossDischargeSymptomAnalysis {
    flags: SymptomFlag[];
    recentEntries: SymptomEntry[];
    trends: SymptomAnalysis['trends'];
    flagsByDischarge: Record<string, SymptomFlag[]>; // Grouped by discharge ID
    totalFlagCount: number;
    activeDischargeFlagCount: number; // Flags from currently active discharges
}

/**
 * Analyze symptoms for a single discharge (existing function - enhanced)
 */
export async function analyzeSymptoms(
    dischargeId: string,
    clinicId: string,
    dayRange: number = 30
): Promise<SymptomAnalysis> {
    try {
        // Get adherence records that contain symptom data
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - dayRange);

        const adherenceRef = collection(db, 'discharges', dischargeId, 'adherence');
        const q = query(
            adherenceRef,
            where('scheduledTime', '>=', Timestamp.fromDate(startDate)),
            where('scheduledTime', '<=', Timestamp.fromDate(endDate)),
            orderBy('scheduledTime', 'desc'),
            limit(500) // Reasonable limit for symptom analysis
        );

        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            return createEmptyAnalysis();
        }

        // Extract symptom entries from adherence records
        const records: AdherenceRecord[] = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as AdherenceRecord));

        // Group by date and extract symptom data (one entry per day)
        const symptomsByDate = new Map<string, SymptomEntry>();

        records.forEach(record => {
            if (!record.symptoms) return;

            const dateKey = record.scheduledTime.toDate().toISOString().split('T')[0];

            // Only keep the most recent symptom entry for each day
            if (!symptomsByDate.has(dateKey) ||
                record.symptoms.recordedAt.toDate() > (symptomsByDate.get(dateKey)?.recordedAt || new Date(0))) {

                symptomsByDate.set(dateKey, {
                    date: dateKey,
                    appetite: record.symptoms.appetite,
                    energyLevel: record.symptoms.energyLevel,
                    isPanting: record.symptoms.isPanting,
                    notes: record.symptoms.notes,
                    recordedAt: record.symptoms.recordedAt.toDate(),
                    dischargeId // Add discharge tracking
                });
            }
        });

        // Convert to sorted array (most recent first)
        const symptomEntries = Array.from(symptomsByDate.values())
            .sort((a, b) => b.date.localeCompare(a.date));

        console.log(`Found ${symptomEntries.length} unique symptom entries for discharge ${dischargeId}`);

        if (symptomEntries.length === 0) {
            return createEmptyAnalysis();
        }

        // Analyze flags
        const flags = generateSymptomFlags(symptomEntries, dischargeId);

        // Calculate trends
        const trends = calculateSymptomTrends(symptomEntries);

        return {
            flags,
            recentEntries: symptomEntries.slice(0, 14), // Last 2 weeks
            trends
        };

    } catch (error) {
        console.error('Error analyzing symptoms:', error);
        return createEmptyAnalysis();
    }
}

/**
 * NEW: Analyze symptoms across ALL discharges for a pet
 * This supports the enhanced metrics requirements
 */
export async function analyzePetSymptoms(
    discharges: Discharge[],
    dayRange: number = 14
): Promise<CrossDischargeSymptomAnalysis> {
    try {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - dayRange);

        let allEntries: SymptomEntry[] = [];
        let allFlags: SymptomFlag[] = [];
        const flagsByDischarge: Record<string, SymptomFlag[]> = {};

        // Collect symptom data from all discharges
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

            if (snapshot.empty) continue;

            const records: AdherenceRecord[] = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as AdherenceRecord));

            // Extract symptom entries for this discharge
            const symptomsByDate = new Map<string, SymptomEntry>();

            records.forEach(record => {
                if (!record.symptoms) return;

                const dateKey = record.scheduledTime.toDate().toISOString().split('T')[0];

                // Only keep the most recent symptom entry for each day
                if (!symptomsByDate.has(dateKey) ||
                    record.symptoms.recordedAt.toDate() > (symptomsByDate.get(dateKey)?.recordedAt || new Date(0))) {

                    symptomsByDate.set(dateKey, {
                        date: dateKey,
                        appetite: record.symptoms.appetite,
                        energyLevel: record.symptoms.energyLevel,
                        isPanting: record.symptoms.isPanting,
                        notes: record.symptoms.notes,
                        recordedAt: record.symptoms.recordedAt.toDate(),
                        dischargeId: discharge.id
                    });
                }
            });

            const dischargeEntries = Array.from(symptomsByDate.values());
            allEntries = [...allEntries, ...dischargeEntries];

            // Generate flags for this discharge
            const dischargeFlags = generateSymptomFlags(dischargeEntries, discharge.id);
            allFlags = [...allFlags, ...dischargeFlags];
            flagsByDischarge[discharge.id] = dischargeFlags;
        }

        // Sort all entries by date (most recent first)
        allEntries.sort((a, b) => b.date.localeCompare(a.date));

        // Sort all flags by date (most recent first)
        allFlags.sort((a, b) => b.date.localeCompare(a.date));

        // Calculate trends across all discharges
        const trends = calculateSymptomTrends(allEntries);

        // Count flags from active discharges
        const activeDischargeFlagCount = countActiveDischargeFlagsFlags(discharges, allFlags);

        return {
            flags: allFlags,
            recentEntries: allEntries.slice(0, 14), // Last 2 weeks across all discharges
            trends,
            flagsByDischarge,
            totalFlagCount: allFlags.length,
            activeDischargeFlagCount
        };

    } catch (error) {
        console.error('Error analyzing pet symptoms across discharges:', error);
        return {
            flags: [],
            recentEntries: [],
            trends: {
                appetite: { current: 0, sevenDayAverage: 0, trend: 'stable' },
                energy: { current: 0, sevenDayAverage: 0, trend: 'stable' },
                panting: { recentDays: 0, isFrequent: false }
            },
            flagsByDischarge: {},
            totalFlagCount: 0,
            activeDischargeFlagCount: 0
        };
    }
}

/**
 * NEW: Get symptom flag count across ALL discharges for a pet (for metrics)
 */
export async function getPetSymptomFlagCount(
    discharges: Discharge[],
    dayRange: number = 14
): Promise<number> {
    try {
        const analysis = await analyzePetSymptoms(discharges, dayRange);
        return analysis.totalFlagCount;
    } catch (error) {
        console.error('Error getting pet symptom flag count:', error);
        return 0;
    }
}

/**
 * Get symptom flag count for single discharge (existing function - kept for compatibility)
 */
export async function getSymptomFlagCount(
    dischargeId: string,
    clinicId: string,
    dayRange: number = 14
): Promise<number> {
    try {
        const analysis = await analyzeSymptoms(dischargeId, clinicId, dayRange);
        return analysis.flags.length;
    } catch (error) {
        console.error('Error getting symptom flag count:', error);
        return 0;
    }
}

/**
 * Helper function to count flags from currently active discharges
 */
function countActiveDischargeFlagsFlags(discharges: Discharge[], flags: SymptomFlag[]): number {
    const now = new Date();

    // Determine which discharges are currently active
    const activeDischargeIds = discharges
        .filter(discharge => isDischargeActive(discharge, now))
        .map(discharge => discharge.id);

    // Count flags from active discharges only
    return flags.filter(flag => activeDischargeIds.includes(flag.dischargeId)).length;
}

/**
 * Helper function to determine if a discharge is currently active
 */
function isDischargeActive(discharge: Discharge, currentDate: Date): boolean {
    // A discharge is active if it has any medications that are currently active
    return discharge.medications.some(med => {
        const startDate = new Date(med.startDate || discharge.createdAt);

        // If medication has an explicit end date
        if (med.endDate) {
            const endDate = new Date(med.endDate);
            return currentDate >= startDate && currentDate <= endDate;
        }

        // For tapered medications, check if we're within any taper stage
        if (med.isTapered && med.taperStages.length > 0) {
            return med.taperStages.some(stage => {
                const stageStart = new Date(stage.startDate);
                const stageEnd = new Date(stage.endDate);
                return currentDate >= stageStart && currentDate <= stageEnd;
            });
        }

        // For medications with totalDoses, consider active if within reasonable timeframe
        if (med.totalDoses) {
            const daysSinceStart = (currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
            return daysSinceStart <= 30;
        }

        // Default: consider active if started within last 30 days
        const daysSinceStart = (currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceStart <= 30;
    });
}

/**
 * Generate symptom flags based on the defined rules (enhanced with discharge tracking)
 */
function generateSymptomFlags(entries: SymptomEntry[], dischargeId: string): SymptomFlag[] {
    const flags: SymptomFlag[] = [];

    if (entries.length === 0) return flags;

    // Calculate 7-day rolling averages for context
    const sevenDayEntries = entries.slice(0, 7);
    const appetiteAvg = sevenDayEntries.length > 0
        ? sevenDayEntries.reduce((sum, e) => sum + e.appetite, 0) / sevenDayEntries.length
        : 0;
    const energyAvg = sevenDayEntries.length > 0
        ? sevenDayEntries.reduce((sum, e) => sum + e.energyLevel, 0) / sevenDayEntries.length
        : 0;

    // Process each entry for potential flags
    for (let i = 0; i < entries.length; i++) {
        const today = entries[i];
        const yesterday = i + 1 < entries.length ? entries[i + 1] : null;
        const isConsecutive = yesterday &&
            (new Date(today.date).getTime() - new Date(yesterday.date).getTime()) === (24 * 60 * 60 * 1000);

        // Rule 1: Low appetite ≤ 2 for 2+ consecutive days
        if (today.appetite <= 2 && yesterday && yesterday.appetite <= 2 && isConsecutive) {
            const existingFlag = flags.find(f => f.type === 'appetite_low' && f.date === today.date);
            if (!existingFlag) {
                flags.push({
                    type: 'appetite_low',
                    date: today.date,
                    description: `Low appetite (${today.appetite}/5) for multiple days`,
                    severity: today.appetite === 1 ? 'high' : 'medium',
                    value: today.appetite,
                    dischargeId
                });
            }
        }

        // Rule 2: Appetite drops ≥ 2 points vs 7-day average
        if (sevenDayEntries.length >= 3 && (appetiteAvg - today.appetite) >= 2) {
            const existingFlag = flags.find(f => f.type === 'appetite_drop' && f.date === today.date);
            if (!existingFlag) {
                flags.push({
                    type: 'appetite_drop',
                    date: today.date,
                    description: `Appetite dropped ${Math.round((appetiteAvg - today.appetite) * 10) / 10} points below recent average`,
                    severity: (appetiteAvg - today.appetite) >= 3 ? 'high' : 'medium',
                    value: today.appetite,
                    previousValue: Math.round(appetiteAvg * 10) / 10,
                    dischargeId
                });
            }
        }

        // Rule 3: Low energy ≤ 2 for 2+ consecutive days
        if (today.energyLevel <= 2 && yesterday && yesterday.energyLevel <= 2 && isConsecutive) {
            const existingFlag = flags.find(f => f.type === 'energy_low' && f.date === today.date);
            if (!existingFlag) {
                flags.push({
                    type: 'energy_low',
                    date: today.date,
                    description: `Low energy (${today.energyLevel}/5) for multiple days`,
                    severity: today.energyLevel === 1 ? 'high' : 'medium',
                    value: today.energyLevel,
                    dischargeId
                });
            }
        }

        // Rule 4: Energy drops ≥ 2 points vs 7-day average
        if (sevenDayEntries.length >= 3 && (energyAvg - today.energyLevel) >= 2) {
            const existingFlag = flags.find(f => f.type === 'energy_drop' && f.date === today.date);
            if (!existingFlag) {
                flags.push({
                    type: 'energy_drop',
                    date: today.date,
                    description: `Energy dropped ${Math.round((energyAvg - today.energyLevel) * 10) / 10} points below recent average`,
                    severity: (energyAvg - today.energyLevel) >= 3 ? 'high' : 'medium',
                    value: today.energyLevel,
                    previousValue: Math.round(energyAvg * 10) / 10,
                    dischargeId
                });
            }
        }

        // Rule 5: Panting for two days in a row
        if (today.isPanting && yesterday && yesterday.isPanting && isConsecutive) {
            const existingFlag = flags.find(f => f.type === 'panting_persistent' && f.date === today.date);
            if (!existingFlag) {
                flags.push({
                    type: 'panting_persistent',
                    date: today.date,
                    description: 'Persistent panting for 2+ consecutive days',
                    severity: 'medium',
                    dischargeId
                });
            }
        }
    }

    // Sort flags by date (most recent first)
    return flags.sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Calculate symptom trends (enhanced)
 */
function calculateSymptomTrends(entries: SymptomEntry[]) {
    if (entries.length === 0) {
        return {
            appetite: { current: 0, sevenDayAverage: 0, trend: 'stable' as const },
            energy: { current: 0, sevenDayAverage: 0, trend: 'stable' as const },
            panting: { recentDays: 0, isFrequent: false }
        };
    }

    const recent = entries.slice(0, 7); // Last 7 days
    const current = entries[0];

    // Calculate averages
    const appetiteAvg = recent.reduce((sum, e) => sum + e.appetite, 0) / recent.length;
    const energyAvg = recent.reduce((sum, e) => sum + e.energyLevel, 0) / recent.length;

    // Calculate trends (compare current vs average of days 2-7)
    const olderEntries = entries.slice(1, 8);
    const olderAppetiteAvg = olderEntries.length > 0
        ? olderEntries.reduce((sum, e) => sum + e.appetite, 0) / olderEntries.length
        : appetiteAvg;
    const olderEnergyAvg = olderEntries.length > 0
        ? olderEntries.reduce((sum, e) => sum + e.energyLevel, 0) / olderEntries.length
        : energyAvg;

    const appetiteTrend = appetiteAvg > olderAppetiteAvg + 0.5 ? 'improving'
        : appetiteAvg < olderAppetiteAvg - 0.5 ? 'declining'
            : 'stable';

    const energyTrend = energyAvg > olderEnergyAvg + 0.5 ? 'improving'
        : energyAvg < olderEnergyAvg - 0.5 ? 'declining'
            : 'stable';

    // Count panting days in last 7 days
    const pantingDays = recent.filter(e => e.isPanting).length;

    return {
        appetite: {
            current: current.appetite,
            sevenDayAverage: Math.round(appetiteAvg * 10) / 10,
            trend: appetiteTrend as 'improving' | 'stable' | 'declining'
        },
        energy: {
            current: current.energyLevel,
            sevenDayAverage: Math.round(energyAvg * 10) / 10,
            trend: energyTrend as 'improving' | 'stable' | 'declining'
        },
        panting: {
            recentDays: pantingDays,
            isFrequent: pantingDays >= 4 // 4+ days out of 7 is frequent
        }
    };
}

/**
 * Helper function to create empty analysis
 */
function createEmptyAnalysis(): SymptomAnalysis {
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

/**
 * Get dates when symptom flags were triggered (for Timeline markers)
 */
export async function getSymptomFlagDates(
    dischargeId: string,
    clinicId: string,
    dayRange: number = 30
): Promise<string[]> {
    try {
        const analysis = await analyzeSymptoms(dischargeId, clinicId, dayRange);
        return analysis.flags.map(flag => flag.date);
    } catch (error) {
        console.error('Error getting symptom flag dates:', error);
        return [];
    }
}

/**
 * Check if a specific date has symptom flags (for Timeline highlighting)
 */
export function hasSymptomFlagsOnDate(flags: SymptomFlag[], date: string): boolean {
    return flags.some(flag => flag.date === date);
}

/**
 * Get symptom flags for a specific date (for Timeline tooltips)
 */
export function getSymptomFlagsForDate(flags: SymptomFlag[], date: string): SymptomFlag[] {
    return flags.filter(flag => flag.date === date);
}

/**
 * Format a symptom flag for display
 */
export function formatSymptomFlag(flag: SymptomFlag): string {
    const date = new Date(flag.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
    });

    switch (flag.type) {
        case 'appetite_low':
            return `${date}: Low appetite (${flag.value}/5) for multiple days`;
        case 'appetite_drop':
            return `${date}: Appetite dropped from ${flag.previousValue} to ${flag.value}`;
        case 'energy_low':
            return `${date}: Low energy (${flag.value}/5) for multiple days`;
        case 'energy_drop':
            return `${date}: Energy dropped from ${flag.previousValue} to ${flag.value}`;
        case 'panting_persistent':
            return `${date}: Persistent panting for multiple days`;
        default:
            return `${date}: ${flag.description}`;
    }
}

/**
 * Get symptom flag severity color for UI
 */
export function getSymptomFlagColor(severity: 'low' | 'medium' | 'high'): string {
    switch (severity) {
        case 'high': return '#ef4444'; // Red
        case 'medium': return '#f59e0b'; // Orange
        case 'low': return '#eab308'; // Yellow
        default: return '#6b7280'; // Gray
    }
}