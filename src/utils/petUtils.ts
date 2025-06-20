// src/utils/petUtils.ts
import { Pet } from '@/types/firestore';

/**
 * Calculate current age based on ageAtCreation and time elapsed
 */
export const calculateCurrentAge = (pet: Pet): string => {
    // Check if we have the new age tracking data
    if (pet.ageAtCreation && pet.ageAsOfDate) {
        const now = new Date();
        const monthsElapsed = Math.floor((now.getTime() - pet.ageAsOfDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
        const currentAgeInMonths = pet.ageAtCreation + monthsElapsed;
        return formatAge(currentAgeInMonths);
    }

    // Fallback to dateOfBirth if available (legacy support)
    if (pet.dateOfBirth) {
        return calculateAgeFromBirth(pet.dateOfBirth);
    }

    return 'Age unknown';
};

/**
 * Calculate age from date of birth (legacy support)
 */
export const calculateAgeFromBirth = (dateOfBirth: Date): string => {
    const now = new Date();
    const ageMs = now.getTime() - dateOfBirth.getTime();
    const ageYears = Math.floor(ageMs / (365.25 * 24 * 60 * 60 * 1000));
    const ageMonths = Math.floor((ageMs % (365.25 * 24 * 60 * 60 * 1000)) / (30.44 * 24 * 60 * 60 * 1000));

    if (ageYears > 0) {
        return ageMonths > 0 ? `${ageYears}y ${ageMonths}m` : `${ageYears}y`;
    } else if (ageMonths > 0) {
        return `${ageMonths}m`;
    } else {
        const ageWeeks = Math.floor(ageMs / (7 * 24 * 60 * 60 * 1000));
        return `${ageWeeks}w`;
    }
};

/**
 * Format age from months to readable format
 */
export const formatAge = (totalMonths: number): string => {
    if (totalMonths < 1) return 'Less than 1 month';
    if (totalMonths < 12) {
        return `${totalMonths} month${totalMonths === 1 ? '' : 's'}`;
    }

    const years = Math.floor(totalMonths / 12);
    const months = totalMonths % 12;

    if (months === 0) {
        return `${years} year${years === 1 ? '' : 's'}`;
    }

    return `${years}y ${months}m`;
};

/**
 * Standardize weight display to always show "lbs" 
 */
export const formatWeight = (weight?: string): string => {
    if (!weight) return '';

    // If it's just a number, add "lbs"
    const numberMatch = weight.match(/^(\d+(?:\.\d+)?)$/);
    if (numberMatch) {
        return `${numberMatch[1]} lbs`;
    }

    // If it already has "lbs" or other units, return as-is
    return weight;
};

/**
 * Create pet display string with all relevant info
 */
export const formatPetDisplay = (pet: Pet): string => {
    const parts: string[] = [];

    if (pet.species) parts.push(pet.species);
    if (pet.breed) parts.push(pet.breed);
    if (pet.weight) parts.push(formatWeight(pet.weight));

    const age = calculateCurrentAge(pet);
    if (age && age !== 'Age unknown') parts.push(age);

    return parts.join(' • ');
};