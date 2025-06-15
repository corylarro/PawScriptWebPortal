// src/types/patientMonitoring.ts

import { Discharge } from './discharge';

export interface DoseEvent {
    id: string;
    dischargeId: string;
    medicationName: string;
    scheduledTime: Date;
    actualTime?: Date;
    status: 'given' | 'missed' | 'skipped';
    notes?: string;
    createdAt: Date;
}

export interface SymptomLog {
    id: string;
    dischargeId: string;
    logDate: Date;
    appetite: number; // 1-5 scale
    energy: number;   // 1-5 scale
    panting: boolean;
    notes?: string;
    createdAt: Date;
}

export interface PatientSync {
    id: string;
    dischargeId: string;
    petName: string;
    petParentName: string; // Added pet parent name
    petParentEmail?: string; // Added pet parent email
    vetId: string;
    clinicId: string;
    isActive: boolean;
    lastSyncAt: Date;
    createdAt: Date;

    // Mobile app user info (optional)
    mobileUserId?: string;

    // Calculated metrics (updated by cloud functions or client)
    totalDoses: number;
    givenDoses: number;
    adherenceRate: number; // percentage
    currentStreak: number; // consecutive days
    lastDoseAt?: Date;
}

// Extended discharge type for monitoring
export interface DischargeWithMonitoring extends Discharge {
    patientSync?: PatientSync;
    recentDoses?: DoseEvent[];
    recentSymptoms?: SymptomLog[];
    adherenceRate?: number;
    isActive?: boolean;
}

// Dashboard view models
export interface PatientSummary {
    dischargeId: string;
    petName: string;
    petSpecies: string;
    petParentName: string; // Added pet parent name
    petParentEmail?: string; // Added pet parent email
    createdAt: Date;
    medicationCount: number;
    adherenceRate: number;
    lastActivity?: Date;
    isActive: boolean;
    alertLevel: 'none' | 'low' | 'medium' | 'high';
}

export interface PatientDetail {
    discharge: Discharge;
    patientSync: PatientSync;
    doseEvents: DoseEvent[];
    symptomLogs: SymptomLog[];
    adherenceMetrics: {
        totalDoses: number;
        givenDoses: number;
        missedDoses: number;
        adherenceRate: number;
        currentStreak: number;
        longestStreak: number;
        lastSevenDays: {
            date: string;
            given: number;
            missed: number;
            rate: number;
        }[];
    };
    symptomTrends: {
        date: string;
        appetite: number;
        energy: number;
        panting: boolean;
        notes?: string;
    }[];
}

// Firestore collection references
export const PATIENT_COLLECTIONS = {
    PATIENT_SYNC: 'patientSync',
    DOSE_EVENTS: 'doseEvents',
    SYMPTOM_LOGS: 'symptomLogs',
} as const;

// Alert level calculation based on adherence and activity
export function calculateAlertLevel(adherenceRate: number, daysSinceLastActivity: number): 'none' | 'low' | 'medium' | 'high' {
    if (daysSinceLastActivity > 7) return 'high';
    if (adherenceRate < 50) return 'high';
    if (adherenceRate < 70) return 'medium';
    if (adherenceRate < 85) return 'low';
    return 'none';
}