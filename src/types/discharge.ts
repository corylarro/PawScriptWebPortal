// src/types/discharge.ts - Updated with missing fields
export interface Pet {
    name: string;
    species: string;
    weight: string;
}

export interface TaperStage {
    startDate: string; // YYYY-MM-DD format
    endDate: string;   // YYYY-MM-DD format
    dosage: string;    // e.g., "10mg", "5mg"
    frequency: number; // times per day
    times: string[];   // e.g., ["08:00", "20:00"]
}

export interface Medication {
    name: string;
    dosage?: string;        // Only for non-tapered meds
    frequency?: number;     // Only for non-tapered meds
    customFrequency?: number; // For custom frequency input
    times?: string[];       // Only for non-tapered meds
    customTimes?: string[]; // User-editable times
    startDate?: string;     // Optional for non-tapered meds
    endDate?: string;       // Optional for non-tapered meds
    instructions: string;   // Always present, auto-filled from template or manual
    allowClientToAdjustTime: boolean;      // Whether pet owner can adjust times in app
    isTapered: boolean;
    taperStages: TaperStage[]; // Empty array for non-tapered meds
}

export interface Discharge {
    id: string;
    pet: Pet;
    medications: Medication[];
    notes?: string;         // Made optional since it might not always be present
    visitDate?: Date;       // Added missing field
    diagnosis?: string;     // Added missing field
    createdAt: Date;
    updatedAt: Date;
    vetId: string;          // Firebase Auth UID of the vet who created this
    clinicId: string;       // Reference to the clinic
}

// For creating new discharges (without id, dates)
export type CreateDischargeData = Omit<Discharge, 'id' | 'createdAt' | 'updatedAt'>;

// Frequency options for the UI
export interface FrequencyOption {
    value: number;
    label: string;
    abbreviation: string;
    times: string[];
    category: 'common' | 'other';
}

// Medication template structure
export interface MedicationTemplate {
    name: string;
    defaultInstructions: string;
}