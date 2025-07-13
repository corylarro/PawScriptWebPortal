// lib/symptomFlags.ts
import { collection, query, where, orderBy, getDocs, Timestamp, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { AdherenceRecord } from './adherence';

// Symptom flag types
export type SymptomFlagType = 'appetite_low' | 'appetite_drop' | 'energy_low' | 'energy_drop' | 'panting_persistent';

export interface SymptomFlag {
    type: SymptomFlagType;
    date: string; // YYYY-MM-DD when the flag was triggered
    description: string;
    severity: 'low' | 'medium' | 'high';
    value?: number; // The symptom value that triggered the flag
    previousValue?: number; // For drop flags
}

export interface SymptomEntry {
    date: string; // YYYY-MM-DD
    appetite: number;
    energyLevel: number;
    isPanting: boolean;
    notes?: string;
    recordedAt: Date;
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
 * Analyze symptoms and generate flags based on the defined rules
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
                    recordedAt: record.symptoms.recordedAt.toDate()
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
        const flags = generateSymptomFlags(symptomEntries);

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
 * Generate symptom flags based on the defined rules
 */
function generateSymptomFlags(entries: SymptomEntry[]): SymptomFlag[] {
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

    // Check each day for flag conditions
    for (let i = 0; i < entries.length; i++) {
        const today = entries[i];
        const yesterday = i + 1 < entries.length ? entries[i + 1] : null;

        // Ensure yesterday is actually the day before (consecutive days)
        const isConsecutive = yesterday &&
            new Date(today.date).getTime() - new Date(yesterday.date).getTime() === 24 * 60 * 60 * 1000;

        // Rule 1: Appetite ≤ 2 two days in a row
        if (today.appetite <= 2 && yesterday && yesterday.appetite <= 2 && isConsecutive) {
            const existingFlag = flags.find(f => f.type === 'appetite_low' && f.date === today.date);
            if (!existingFlag) {
                flags.push({
                    type: 'appetite_low',
                    date: today.date,
                    description: `Low appetite (${today.appetite}/5) for 2+ consecutive days`,
                    severity: today.appetite === 1 ? 'high' : 'medium',
                    value: today.appetite
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
                    previousValue: Math.round(appetiteAvg * 10) / 10
                });
            }
        }

        // Rule 3: Energy ≤ 2 two days in a row
        if (today.energyLevel <= 2 && yesterday && yesterday.energyLevel <= 2 && isConsecutive) {
            const existingFlag = flags.find(f => f.type === 'energy_low' && f.date === today.date);
            if (!existingFlag) {
                flags.push({
                    type: 'energy_low',
                    date: today.date,
                    description: `Low energy (${today.energyLevel}/5) for 2+ consecutive days`,
                    severity: today.energyLevel === 1 ? 'high' : 'medium',
                    value: today.energyLevel
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
                    previousValue: Math.round(energyAvg * 10) / 10
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
                    severity: 'medium'
                });
            }
        }
    }

    // Sort flags by date (most recent first)
    return flags.sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Calculate symptom trends
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
 * Get symptom flag count for patient dashboard badge
 */
export async function getSymptomFlagCount(
    dischargeId: string,
    clinicId: string
): Promise<number> {
    try {
        const analysis = await analyzeSymptoms(dischargeId, clinicId, 14); // Last 2 weeks
        return analysis.flags.length;
    } catch (error) {
        console.error('Error getting symptom flag count:', error);
        return 0;
    }
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