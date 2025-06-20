// src/types/firestore.ts
export interface Clinic {
    id: string;
    name: string;
    address: {
        street: string;
        city: string;
        state: string;
        zipCode: string;
    };
    phone: string;
    email: string;
    licenseNumber?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface VetUser {
    id: string; // Firebase Auth UID
    email: string;
    firstName: string;
    lastName: string;
    clinicId: string;
    role: 'admin' | 'veterinarian' | 'staff';
    createdAt: Date;
    updatedAt: Date;
}

export interface Client {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: {
        street: string;
        city: string;
        state: string;
        zipCode: string;
    };
    clinicId: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    notes?: string;
}

export interface Pet {
    id: string;
    name: string;
    species: string;
    breed?: string;
    weight?: string;
    dateOfBirth?: Date; // Legacy field - kept for backward compatibility
    ageAtCreation?: number; // age in months when record was created
    ageAsOfDate?: Date;     // date when age was recorded
    microchipNumber?: string;
    clientId: string;
    clinicId: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    notes?: string;
}

// Firestore collection references
export const COLLECTIONS = {
    CLINICS: 'clinics',
    VET_USERS: 'vetUsers',
    CLIENTS: 'clients',
    PETS: 'pets',
    MEDICATIONS: 'medications',
    DISCHARGES: 'discharges',
    PATIENT_SYNC: 'patientSync',
} as const;