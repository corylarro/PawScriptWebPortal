// lib/petDataUtils.ts - Updated for Enhanced Vet Portal Metrics
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/types/firestore';
import { Discharge, Medication } from '@/types/discharge';

/**
 * Core interfaces for pet metrics
 */
export interface PetMetrics {
    // Patient identification
    petName: string;
    petSpecies: string;
    petWeight?: string;

    // Visit information
    lastVisitDate: Date;
    totalVisits: number;

    // Adherence metrics
    overallAdherenceRate: number; // All meds, all discharges (last 90d)
    activeOnlyAdherenceRate: number; // Active meds only

    // Medication counts
    activeMedsCount: number;
    archivedMedsCount: number;

    // Dose tracking
    missedDoseCount: number; // Last 14-30d
    lateDoseCount: number; // Last 14-30d
    lastDoseGivenDate?: Date; // Most recent dose from any med

    // Activity status
    currentStatus: 'active' | 'inactive';

    // Symptom monitoring
    recentSymptomAlerts: number; // Last 14d
}

export interface MedicationStatus {
    medicationName: string;
    isActive: boolean;
    startDate: Date;
    endDate?: Date;
    dischargeId: string;
}

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
                updatedAt: doc.data().updatedAt?.toDate() || new Date(),
                visitDate: doc.data().visitDate?.toDate() || doc.data().createdAt?.toDate() || new Date()
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
 * Get comprehensive pet metrics for dashboard display
 */
export async function getPetMetrics(
    petName: string,
    clinicId: string,
    petSpecies?: string
): Promise<PetMetrics> {
    try {
        const discharges = await getAllDischargesForPet(petName, clinicId, petSpecies);

        if (discharges.length === 0) {
            return createEmptyPetMetrics(petName, petSpecies || '');
        }

        const latestDischarge = discharges[0]; // Most recent
        const lastVisitDate = latestDischarge.visitDate || latestDischarge.createdAt;

        // Get all medications across all discharges
        const allMedications = await getAllMedicationsForPet(discharges);

        // Calculate adherence metrics
        const adherenceMetrics = await calculatePetAdherenceMetrics(discharges);

        // Calculate dose metrics
        const doseMetrics = await calculatePetDoseMetrics(discharges);

        // Calculate symptom alerts
        const symptomAlerts = await calculatePetSymptomAlerts(discharges);

        // Determine current status
        const currentStatus = determinePatientStatus(doseMetrics.lastDoseGivenDate);

        return {
            petName: latestDischarge.pet.name,
            petSpecies: latestDischarge.pet.species,
            petWeight: latestDischarge.pet.weight,
            lastVisitDate,
            totalVisits: discharges.length,
            overallAdherenceRate: adherenceMetrics.overall,
            activeOnlyAdherenceRate: adherenceMetrics.activeOnly,
            activeMedsCount: allMedications.filter(med => med.isActive).length,
            archivedMedsCount: allMedications.filter(med => !med.isActive).length,
            missedDoseCount: doseMetrics.missedCount,
            lateDoseCount: doseMetrics.lateCount,
            lastDoseGivenDate: doseMetrics.lastDoseGivenDate,
            currentStatus,
            recentSymptomAlerts: symptomAlerts
        };

    } catch (error) {
        console.error(`Error calculating pet metrics for ${petName}:`, error);
        return createEmptyPetMetrics(petName, petSpecies || '');
    }
}

/**
 * Get all medications across all discharges for a pet
 */
async function getAllMedicationsForPet(discharges: Discharge[]): Promise<MedicationStatus[]> {
    const medications: MedicationStatus[] = [];
    const now = new Date();

    for (const discharge of discharges) {
        for (const med of discharge.medications) {
            // Determine if medication is currently active
            const isActive = isMedicationActive(med, discharge, now);

            medications.push({
                medicationName: med.name,
                isActive,
                startDate: new Date(med.startDate || discharge.createdAt),
                endDate: med.endDate ? new Date(med.endDate) : undefined,
                dischargeId: discharge.id
            });
        }
    }

    return medications;
}

/**
 * Determine if a medication is currently active
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

    // For medications with totalDoses, consider inactive if doses are completed
    if (medication.totalDoses) {
        // This would require checking actual dose completion from adherence records
        // For now, assume active if within reasonable timeframe (30 days)
        const daysSinceStart = (currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceStart <= 30;
    }

    // Default: consider active if started within last 30 days
    const daysSinceStart = (currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceStart <= 30;
}

/**
 * Calculate adherence metrics for a pet across all discharges
 */
async function calculatePetAdherenceMetrics(discharges: Discharge[]): Promise<{
    overall: number;
    activeOnly: number;
}> {
    try {
        // Import the enhanced adherence functions
        const { calculatePetAdherenceMetrics } = await import('./adherence');

        // Get comprehensive adherence metrics across all discharges
        const metrics = await calculatePetAdherenceMetrics(discharges, 90); // Last 90 days

        return {
            overall: metrics.overall.adherenceRate,
            activeOnly: metrics.activeOnly.adherenceRate
        };

    } catch (error) {
        console.error('Error calculating pet adherence metrics:', error);
        return { overall: 0, activeOnly: 0 };
    }
}

/**
 * Calculate dose-related metrics for a pet
 */
async function calculatePetDoseMetrics(discharges: Discharge[]): Promise<{
    missedCount: number;
    lateCount: number;
    lastDoseGivenDate?: Date;
}> {
    try {
        // Import the enhanced adherence functions
        const { getPetDoseMetrics } = await import('./adherence');

        // Get dose metrics across all discharges (last 30 days)
        const metrics = await getPetDoseMetrics(discharges, 30);

        return {
            missedCount: metrics.missedDoseCount,
            lateCount: metrics.lateDoseCount,
            lastDoseGivenDate: metrics.lastDoseGivenDate
        };

    } catch (error) {
        console.error('Error calculating pet dose metrics:', error);
        return { missedCount: 0, lateCount: 0 };
    }
}

/**
 * Calculate symptom alerts for a pet (last 14 days)
 */
async function calculatePetSymptomAlerts(discharges: Discharge[]): Promise<number> {
    try {
        // Import the enhanced symptom flags function
        const { getPetSymptomFlagCount } = await import('./symptomFlags');

        // Get symptom flags across all discharges for this pet
        const alertCount = await getPetSymptomFlagCount(discharges, 14); // Last 14 days

        return alertCount;

    } catch (error) {
        console.error('Error calculating pet symptom alerts:', error);
        return 0;
    }
}

/**
 * Determine patient status based on recent activity
 */
function determinePatientStatus(lastDoseDate?: Date): 'active' | 'inactive' {
    if (!lastDoseDate) return 'inactive';

    const sevenDaysAgo = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000));
    return lastDoseDate >= sevenDaysAgo ? 'active' : 'inactive';
}

/**
 * Create empty metrics object
 */
function createEmptyPetMetrics(petName: string, petSpecies: string): PetMetrics {
    return {
        petName,
        petSpecies,
        lastVisitDate: new Date(),
        totalVisits: 0,
        overallAdherenceRate: 0,
        activeOnlyAdherenceRate: 0,
        activeMedsCount: 0,
        archivedMedsCount: 0,
        missedDoseCount: 0,
        lateDoseCount: 0,
        currentStatus: 'inactive',
        recentSymptomAlerts: 0
    };
}

/**
 * Get quick summary metrics for patient list display
 */
export async function getPatientListMetrics(
    petName: string,
    clinicId: string,
    petSpecies?: string
): Promise<{
    lastVisitDate: Date;
    overallAdherenceRate: number;
    activeOnlyAdherenceRate: number;
    recentSymptomAlerts: number;
    currentStatus: 'active' | 'inactive';
}> {
    try {
        const fullMetrics = await getPetMetrics(petName, clinicId, petSpecies);

        return {
            lastVisitDate: fullMetrics.lastVisitDate,
            overallAdherenceRate: fullMetrics.overallAdherenceRate,
            activeOnlyAdherenceRate: fullMetrics.activeOnlyAdherenceRate,
            recentSymptomAlerts: fullMetrics.recentSymptomAlerts,
            currentStatus: fullMetrics.currentStatus
        };

    } catch (error) {
        console.error(`Error getting patient list metrics for ${petName}:`, error);
        return {
            lastVisitDate: new Date(),
            overallAdherenceRate: 0,
            activeOnlyAdherenceRate: 0,
            recentSymptomAlerts: 0,
            currentStatus: 'inactive'
        };
    }
}