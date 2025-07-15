// lib/idGeneration.ts
/**
 * Utility functions for generating unique IDs for pets and medications
 * Used when creating new discharges to ensure consistent tracking across visits
 */

/**
 * Generate a unique pet ID
 * Format: pet_[uuid] for clear identification
 */
export function generatePetId(): string {
    try {
        // Use crypto.randomUUID() for browser compatibility
        const uuid = crypto.randomUUID();
        return `pet_${uuid}`;
    } catch {
        // Fallback for older browsers that don't support crypto.randomUUID()
        console.warn('crypto.randomUUID() not available, using fallback');
        return `pet_${generateUuidFallback()}`;
    }
}

/**
 * Generate a unique medication ID
 * Format: med_[uuid] for clear identification
 */
export function generateMedId(): string {
    try {
        // Use crypto.randomUUID() for browser compatibility
        const uuid = crypto.randomUUID();
        return `med_${uuid}`;
    } catch {
        // Fallback for older browsers that don't support crypto.randomUUID()
        console.warn('crypto.randomUUID() not available, using fallback');
        return `med_${generateUuidFallback()}`;
    }
}

/**
 * Fallback UUID generation for older browsers
 * Creates a UUID v4 compatible string
 */
function generateUuidFallback(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * Validate that a string is a properly formatted pet ID
 */
export function isValidPetId(id: string): boolean {
    if (typeof id !== 'string') return false;
    return /^pet_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

/**
 * Validate that a string is a properly formatted medication ID
 */
export function isValidMedId(id: string): boolean {
    if (typeof id !== 'string') return false;
    return /^med_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

/**
 * Extract the UUID portion from a pet ID
 */
export function extractUuidFromPetId(petId: string): string | null {
    if (!isValidPetId(petId)) return null;
    return petId.replace('pet_', '');
}

/**
 * Extract the UUID portion from a medication ID
 */
export function extractUuidFromMedId(medId: string): string | null {
    if (!isValidMedId(medId)) return null;
    return medId.replace('med_', '');
}