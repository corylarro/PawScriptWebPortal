// app/dashboard/patients/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/types/firestore';
import { Discharge } from '@/types/discharge';
import { getAllDischargesForPet, getAllAdherenceForPet, getAllSymptomLogsForPet } from '@/lib/petDataUtils';

// Import modularized tab components - keep the original architecture
import SymptomsTab from '@/components/patientDetail/SymptomsTab';
import MedicationsTab from '@/components/patientDetail/MedicationsTab';
import TimelineTab from '@/components/patientDetail/TimelineTab';
import RecentDischargesTab from '@/components/patientDetail/RecentDischargesTab';
import { ExtendedSymptomAnalysis } from '@/components/patientDetail/SymptomsTab';

// Enhanced types for aggregated data
interface AggregatedPatientData {
    primaryDischarge: Discharge; // The discharge we're viewing
    allDischarges: Discharge[]; // All discharges for this pet
    aggregatedAdherence: {
        overall: {
            totalDoses: number;
            givenDoses: number;
            lateDoses: number;
            missedDoses: number;
            adherenceRate: number;
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
            date: string;
            scheduledDoses: number;
            givenDoses: number;
            missedDoses: number;
            adherenceRate: number;
        }>;
    };
    aggregatedSymptoms: ExtendedSymptomAnalysis;
    timelineEvents: TimelineEvent[];
    lastActivity?: Date;
    isActive: boolean;
}

interface TimelineEvent {
    id: string;
    type: 'dose' | 'symptom_flag' | 'new_discharge';
    date: string;
    time?: string;
    title: string;
    description: string;
    severity?: 'low' | 'medium' | 'high';
    delay?: number;
    medicationName?: string;
    dischargeId?: string;
}

export default function PatientDetailPage() {
    const { id } = useParams();
    const { vetUser, clinic } = useAuth();
    const { loading: authLoading } = useRequireAuth();

    // Core state for aggregated data
    const [patientData, setPatientData] = useState<AggregatedPatientData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState<'recent' | 'medications' | 'symptoms' | 'timeline'>('recent');

    // Build comprehensive timeline from all sources
    const buildComprehensiveTimeline = async (
        allDischarges: Discharge[],
        adherenceRecords: any[],
        symptomAnalysis: ExtendedSymptomAnalysis
    ): Promise<TimelineEvent[]> => {
        const events: TimelineEvent[] = [];

        // Add discharge events
        allDischarges.forEach(discharge => {
            events.push({
                id: `discharge-${discharge.id}`,
                type: 'new_discharge',
                date: discharge.createdAt.toISOString().split('T')[0],
                time: discharge.createdAt.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                }),
                title: 'New Discharge Summary',
                description: `${discharge.medications.length} medications prescribed`,
                dischargeId: discharge.id
            });
        });

        // Add dose events from adherence records
        adherenceRecords.forEach(record => {
            const scheduledTime = record.scheduledTime.toDate();
            const delay = record.givenAt && record.status === 'given'
                ? Math.round((record.givenAt.toDate().getTime() - scheduledTime.getTime()) / (1000 * 60))
                : undefined;

            events.push({
                id: `dose-${record.id}`,
                type: 'dose',
                date: scheduledTime.toISOString().split('T')[0],
                time: scheduledTime.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                }),
                title: record.status === 'given' ? 'Dose Given' : 'Dose Missed',
                description: `${record.medicationName} - ${record.dosage}`,
                severity: record.status === 'missed' ? 'medium' :
                    (delay && delay > 120) ? 'low' : undefined,
                delay,
                medicationName: record.medicationName,
                dischargeId: record.dischargeId
            });
        });

        // Add symptom flag events
        symptomAnalysis.flags.forEach(flag => {
            events.push({
                id: `symptom-${flag.date}-${flag.type}`,
                type: 'symptom_flag',
                date: flag.date,
                title: 'Symptom Alert',
                description: flag.description,
                severity: flag.severity
            });
        });

        // Sort by date and time, most recent first
        return events.sort((a, b) => {
            const dateCompare = b.date.localeCompare(a.date);
            if (dateCompare !== 0) return dateCompare;

            if (a.time && b.time) {
                return b.time.localeCompare(a.time);
            }
            return 0;
        });
    };

    // Load complete patient data across all discharges
    useEffect(() => {
        const loadPatientData = async () => {
            if (!id || !vetUser || !clinic) return;

            try {
                setLoading(true);
                setError('');

                // First, get the primary discharge we're viewing
                const primaryDischargeDoc = await getDoc(doc(db, COLLECTIONS.DISCHARGES, id as string));

                if (!primaryDischargeDoc.exists()) {
                    setError('Patient record not found');
                    return;
                }

                const primaryDischargeData = primaryDischargeDoc.data();
                const primaryDischarge = {
                    id: primaryDischargeDoc.id,
                    ...primaryDischargeData,
                    createdAt: primaryDischargeData.createdAt?.toDate() || new Date(),
                    updatedAt: primaryDischargeData.updatedAt?.toDate() || new Date()
                } as Discharge;

                console.log(`Loading complete data for pet: ${primaryDischarge.pet.name} (${primaryDischarge.pet.species})`);

                // Get ALL discharges for this pet across all visits
                const allDischarges = await getAllDischargesForPet(
                    primaryDischarge.pet.name,
                    clinic.id,
                    primaryDischarge.pet.species
                );

                console.log(`Found ${allDischarges.length} total discharges for this pet`);

                // Get aggregated adherence data across ALL discharges
                const adherenceData = await getAllAdherenceForPet(
                    primaryDischarge.pet.name,
                    clinic.id,
                    primaryDischarge.pet.species,
                    120 // Last 120 days for detailed view
                );

                // Get aggregated symptom data across ALL discharges
                const symptomData = await getAllSymptomLogsForPet(
                    primaryDischarge.pet.name,
                    clinic.id,
                    primaryDischarge.pet.species,
                    120 // Last 120 days for detailed view
                );

                // Build comprehensive timeline from all sources
                const timelineEvents = await buildComprehensiveTimeline(
                    allDischarges,
                    adherenceData.allRecords,
                    symptomData.aggregatedAnalysis
                );

                // Assemble complete patient data
                const aggregatedData: AggregatedPatientData = {
                    primaryDischarge,
                    allDischarges,
                    aggregatedAdherence: adherenceData.aggregatedMetrics,
                    aggregatedSymptoms: symptomData.aggregatedAnalysis,
                    timelineEvents,
                    lastActivity: adherenceData.lastActivity,
                    isActive: adherenceData.isActive
                };

                setPatientData(aggregatedData);

            } catch (err) {
                console.error('Error loading patient data:', err);
                setError('Failed to load patient data');
            } finally {
                setLoading(false);
            }
        };

        loadPatientData();
    }, [id, vetUser, clinic]);

    // Loading and error states
    if (authLoading || loading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '400px',
                fontFamily: 'Nunito, -apple-system, BlinkMacSystemFont, sans-serif'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        fontSize: '1.125rem',
                        color: '#6D6D72',
                        marginBottom: '0.5rem'
                    }}>
                        Loading patient details...
                    </div>
                    <div style={{
                        width: '32px',
                        height: '32px',
                        border: '3px solid #F2F2F7',
                        borderTop: '3px solid #007AFF',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        margin: '0 auto'
                    }} />
                </div>
            </div>
        );
    }

    if (error || !patientData) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '400px',
                fontFamily: 'Nunito, -apple-system, BlinkMacSystemFont, sans-serif'
            }}>
                <div style={{
                    textAlign: 'center',
                    backgroundColor: '#FFFFFF',
                    padding: '2rem',
                    borderRadius: '12px',
                    border: '1px solid #E5E5EA'
                }}>
                    <div style={{
                        fontSize: '1.25rem',
                        fontWeight: 600,
                        color: '#FF3B30',
                        marginBottom: '0.5rem'
                    }}>
                        {error || 'Patient not found'}
                    </div>
                    <Link
                        href="/dashboard/patients"
                        style={{
                            color: '#007AFF',
                            textDecoration: 'none',
                            fontSize: '0.875rem'
                        }}
                    >
                        ← Back to Patient Dashboard
                    </Link>
                </div>
            </div>
        );
    }

    const { primaryDischarge, allDischarges, aggregatedAdherence, aggregatedSymptoms, timelineEvents } = patientData;

    return (
        <div style={{
            fontFamily: 'Nunito, -apple-system, BlinkMacSystemFont, sans-serif',
            backgroundColor: '#F2F2F7',
            minHeight: '100vh'
        }}>
            {/* Header */}
            <div style={{
                backgroundColor: '#FFFFFF',
                borderBottom: '1px solid #E5E5EA',
                padding: '2rem 2.5rem'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    marginBottom: '1.5rem'
                }}>
                    <Link
                        href="/dashboard/patients"
                        style={{
                            color: '#007AFF',
                            textDecoration: 'none',
                            fontSize: '0.875rem',
                            fontWeight: 500
                        }}
                    >
                        ← Patients
                    </Link>
                    <div style={{
                        width: '1px',
                        height: '16px',
                        backgroundColor: '#D1D1D6'
                    }} />
                    <h1 style={{
                        fontSize: '2rem',
                        fontWeight: 700,
                        color: '#1D1D1F',
                        margin: 0
                    }}>
                        {primaryDischarge.pet.name}
                    </h1>
                </div>

                {/* Patient Info Summary */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '1.5rem',
                    marginBottom: '1.5rem'
                }}>
                    <div>
                        <div style={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: '#8E8E93',
                            textTransform: 'uppercase',
                            letterSpacing: '0.075em',
                            marginBottom: '0.25rem'
                        }}>
                            Pet Details
                        </div>
                        <div style={{
                            fontSize: '0.875rem',
                            color: '#1D1D1F',
                            lineHeight: 1.4
                        }}>
                            {primaryDischarge.pet.species}
                            {primaryDischarge.pet.weight && ` • ${primaryDischarge.pet.weight}`}
                        </div>
                    </div>

                    <div>
                        <div style={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: '#8E8E93',
                            textTransform: 'uppercase',
                            letterSpacing: '0.075em',
                            marginBottom: '0.25rem'
                        }}>
                            Visit History
                        </div>
                        <div style={{
                            fontSize: '0.875rem',
                            color: '#1D1D1F',
                            lineHeight: 1.4
                        }}>
                            {allDischarges.length} visit{allDischarges.length !== 1 ? 's' : ''}
                            <br />
                            Latest: {primaryDischarge.createdAt.toLocaleDateString()}
                        </div>
                    </div>

                    <div>
                        <div style={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: '#8E8E93',
                            textTransform: 'uppercase',
                            letterSpacing: '0.075em',
                            marginBottom: '0.25rem'
                        }}>
                            Adherence Rate
                        </div>
                        <div style={{
                            fontSize: '1.5rem',
                            fontWeight: 700,
                            color: aggregatedAdherence.overall.adherenceRate >= 85 ? '#34C759' :
                                aggregatedAdherence.overall.adherenceRate >= 70 ? '#FF9500' : '#FF3B30'
                        }}>
                            {aggregatedAdherence.overall.adherenceRate}%
                        </div>
                        <div style={{
                            fontSize: '0.75rem',
                            color: '#8E8E93'
                        }}>
                            {aggregatedAdherence.overall.givenDoses}/{aggregatedAdherence.overall.totalDoses} doses given
                        </div>
                    </div>

                    <div>
                        <div style={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: '#8E8E93',
                            textTransform: 'uppercase',
                            letterSpacing: '0.075em',
                            marginBottom: '0.25rem'
                        }}>
                            Current Status
                        </div>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}>
                            <span style={{
                                width: '8px',
                                height: '8px',
                                backgroundColor: patientData.isActive ? '#34C759' : '#8E8E93',
                                borderRadius: '50%'
                            }} />
                            <span style={{
                                fontSize: '0.875rem',
                                fontWeight: 600,
                                color: patientData.isActive ? '#34C759' : '#8E8E93'
                            }}>
                                {patientData.isActive ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                        {patientData.lastActivity && (
                            <div style={{
                                fontSize: '0.75rem',
                                color: '#8E8E93',
                                marginTop: '0.25rem'
                            }}>
                                Last dose: {patientData.lastActivity.toLocaleDateString()}
                            </div>
                        )}
                    </div>
                </div>

                {/* Multiple Visits Banner */}
                {allDischarges.length > 1 && (
                    <div style={{
                        backgroundColor: '#E5F4FF',
                        border: '1px solid #B3D9FF',
                        borderRadius: '8px',
                        padding: '1rem',
                        marginBottom: '1.5rem'
                    }}>
                        <div style={{
                            fontSize: '0.875rem',
                            color: '#007AFF',
                            fontWeight: 600,
                            marginBottom: '0.25rem'
                        }}>
                            📊 Comprehensive Patient History
                        </div>
                        <div style={{
                            fontSize: '0.75rem',
                            color: '#007AFF',
                            lineHeight: 1.4
                        }}>
                            This view shows aggregated data from all {allDischarges.length} visits for {primaryDischarge.pet.name}.
                            Adherence rates, symptom trends, and timeline events include data from across all discharge summaries.
                        </div>
                    </div>
                )}

                {/* Tab Navigation */}
                <div style={{
                    display: 'flex',
                    gap: '2rem',
                    borderBottom: '2px solid #F2F2F7'
                }}>
                    {[
                        { key: 'recent' as const, label: 'Recent Discharges', count: allDischarges.length },
                        { key: 'medications' as const, label: 'Medications', count: aggregatedAdherence.perMedication.length },
                        { key: 'symptoms' as const, label: 'Symptoms', count: aggregatedSymptoms.flags.length },
                        { key: 'timeline' as const, label: 'Timeline', count: timelineEvents.length }
                    ].map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            style={{
                                backgroundColor: 'transparent',
                                border: 'none',
                                padding: '1rem 0',
                                fontSize: '0.875rem',
                                fontWeight: 600,
                                color: activeTab === tab.key ? '#007AFF' : '#8E8E93',
                                borderBottom: activeTab === tab.key ? '2px solid #007AFF' : '2px solid transparent',
                                cursor: 'pointer',
                                transition: 'color 0.2s',
                                fontFamily: 'inherit',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}
                        >
                            {tab.label}
                            {tab.count > 0 && (
                                <span style={{
                                    backgroundColor: activeTab === tab.key ? '#007AFF' : '#D1D1D6',
                                    color: activeTab === tab.key ? '#FFFFFF' : '#8E8E93',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    padding: '0.125rem 0.5rem',
                                    borderRadius: '12px',
                                    minWidth: '20px',
                                    textAlign: 'center'
                                }}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab Content - Use existing components with correct props */}
            <div style={{ padding: '2rem 2.5rem' }}>
                {activeTab === 'recent' && (
                    <RecentDischargesTab
                        recentDischarges={allDischarges.map(discharge => ({
                            id: discharge.id,
                            pet: discharge.pet,
                            createdAt: discharge.createdAt,
                            adherenceRate: 0, // Will be calculated by component
                            symptomFlagCount: 0, // Will be calculated by component
                            isActive: discharge.id === primaryDischarge.id
                        }))}
                        petName={primaryDischarge.pet.name}
                        clinicId={clinic.id}
                    />
                )}

                {activeTab === 'medications' && (
                    <MedicationsTab
                        adherenceMetrics={aggregatedAdherence}
                        recentDischarges={allDischarges.map(discharge => ({
                            id: discharge.id,
                            pet: discharge.pet,
                            createdAt: discharge.createdAt,
                            adherenceRate: 0, // Will be calculated by component
                            symptomFlagCount: 0, // Will be calculated by component  
                            isActive: discharge.id === primaryDischarge.id
                        }))}
                        petName={primaryDischarge.pet.name}
                    />
                )}

                {activeTab === 'symptoms' && (
                    <SymptomsTab
                        symptomAnalysis={aggregatedSymptoms}
                        recentDischarges={allDischarges.map(discharge => ({
                            id: discharge.id,
                            pet: discharge.pet,
                            createdAt: discharge.createdAt,
                            adherenceRate: 0, // Will be calculated by component
                            symptomFlagCount: 0, // Will be calculated by component
                            isActive: discharge.id === primaryDischarge.id
                        }))}
                        petName={primaryDischarge.pet.name}
                    />
                )}

                {activeTab === 'timeline' && (
                    <TimelineTab
                        timelineEvents={timelineEvents.map(event => ({
                            ...event,
                            sortTime: new Date(event.date + (event.time ? ` ${event.time}` : ''))
                        }))}
                        recentDischarges={allDischarges.map(discharge => ({
                            id: discharge.id,
                            pet: discharge.pet,
                            createdAt: discharge.createdAt,
                            adherenceRate: 0, // Will be calculated by component
                            symptomFlagCount: 0, // Will be calculated by component
                            isActive: discharge.id === primaryDischarge.id
                        }))}
                        petName={primaryDischarge.pet.name}
                    />
                )}
            </div>

            {/* CSS for spinner animation */}
            <style jsx>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}

// Enhanced types for aggregated data
interface AggregatedPatientData {
    primaryDischarge: Discharge; // The discharge we're viewing
    allDischarges: Discharge[]; // All discharges for this pet
    aggregatedAdherence: {
        overall: {
            totalDoses: number;
            givenDoses: number;
            lateDoses: number;
            missedDoses: number;
            adherenceRate: number;
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
            date: string;
            scheduledDoses: number;
            givenDoses: number;
            missedDoses: number;
            adherenceRate: number;
        }>;
    };
    aggregatedSymptoms: ExtendedSymptomAnalysis;
    timelineEvents: TimelineEvent[];
    lastActivity?: Date;
    isActive: boolean;
}

interface TimelineEvent {
    id: string;
    type: 'dose' | 'symptom_flag' | 'new_discharge';
    date: string;
    time?: string;
    title: string;
    description: string;
    severity?: 'low' | 'medium' | 'high';
    delay?: number;
    medicationName?: string;
    dischargeId?: string;
}

// Remove unused helper function
// const isSamePet = (pet1: { name: string; species: string }, pet2: { name: string; species: string }): boolean => {
//     return pet1.name.toLowerCase() === pet2.name.toLowerCase() && 
//            pet1.species.toLowerCase() === pet2.species.toLowerCase();
// };

export default function PatientDetailPage() {
    const { id } = useParams();
    const { vetUser, clinic } = useAuth();
    const { loading: authLoading } = useRequireAuth();

    // Core state for aggregated data
    const [patientData, setPatientData] = useState<AggregatedPatientData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState<'recent' | 'medications' | 'symptoms' | 'timeline'>('recent');

    // Load complete patient data across all discharges
    useEffect(() => {
        const loadPatientData = async () => {
            if (!id || !vetUser || !clinic) return;

            try {
                setLoading(true);
                setError('');

                // First, get the primary discharge we're viewing
                const primaryDischargeDoc = await getDoc(doc(db, COLLECTIONS.DISCHARGES, id as string));

                if (!primaryDischargeDoc.exists()) {
                    setError('Patient record not found');
                    return;
                }

                const primaryDischargeData = primaryDischargeDoc.data();
                const primaryDischarge = {
                    id: primaryDischargeDoc.id,
                    ...primaryDischargeData,
                    createdAt: primaryDischargeData.createdAt?.toDate() || new Date(),
                    updatedAt: primaryDischargeData.updatedAt?.toDate() || new Date()
                } as Discharge;

                console.log(`Loading complete data for pet: ${primaryDischarge.pet.name} (${primaryDischarge.pet.species})`);

                // Get ALL discharges for this pet across all visits
                const allDischarges = await getAllDischargesForPet(
                    primaryDischarge.pet.name,
                    clinic.id,
                    primaryDischarge.pet.species
                );

                console.log(`Found ${allDischarges.length} total discharges for this pet`);

                // Get aggregated adherence data across ALL discharges
                const adherenceData = await getAllAdherenceForPet(
                    primaryDischarge.pet.name,
                    clinic.id,
                    primaryDischarge.pet.species,
                    120 // Last 120 days for detailed view
                );

                // Get aggregated symptom data across ALL discharges
                const symptomData = await getAllSymptomLogsForPet(
                    primaryDischarge.pet.name,
                    clinic.id,
                    primaryDischarge.pet.species,
                    120 // Last 120 days for detailed view
                );

                // Build comprehensive timeline from all sources
                const timelineEvents = await buildComprehensiveTimeline(
                    allDischarges,
                    adherenceData.allRecords,
                    symptomData.aggregatedAnalysis
                );

                // Assemble complete patient data
                const aggregatedData: AggregatedPatientData = {
                    primaryDischarge,
                    allDischarges,
                    aggregatedAdherence: adherenceData.aggregatedMetrics,
                    aggregatedSymptoms: symptomData.aggregatedAnalysis,
                    timelineEvents,
                    lastActivity: adherenceData.lastActivity,
                    isActive: adherenceData.isActive
                };

                setPatientData(aggregatedData);

            } catch (err) {
                console.error('Error loading patient data:', err);
                setError('Failed to load patient data');
            } finally {
                setLoading(false);
            }
        };

        loadPatientData();
    }, [id, vetUser, clinic]);

    // Build comprehensive timeline from all data sources
    const buildComprehensiveTimeline = async (
        allDischarges: Discharge[],
        adherenceRecords: any[],
        symptomLogs: any[]
    ): Promise<TimelineEvent[]> => {
        const events: TimelineEvent[] = [];

        // Add discharge events
        allDischarges.forEach(discharge => {
            events.push({
                id: `discharge-${discharge.id}`,
                type: 'new_discharge',
                date: discharge.createdAt.toISOString().split('T')[0],
                time: discharge.createdAt.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                }),
                title: 'New Discharge Summary',
                description: `${discharge.medications.length} medications prescribed`,
                dischargeId: discharge.id
            });
        });

        // Add dose events from adherence records
        adherenceRecords.forEach(record => {
            const scheduledTime = record.scheduledTime.toDate();
            const delay = record.givenAt && record.status === 'given'
                ? Math.round((record.givenAt.toDate().getTime() - scheduledTime.getTime()) / (1000 * 60))
                : undefined;

            events.push({
                id: `dose-${record.id}`,
                type: 'dose',
                date: scheduledTime.toISOString().split('T')[0],
                time: scheduledTime.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                }),
                title: record.status === 'given' ? 'Dose Given' : 'Dose Missed',
                description: `${record.medicationName} - ${record.dosage}`,
                severity: record.status === 'missed' ? 'medium' :
                    (delay && delay > 120) ? 'low' : undefined,
                delay,
                medicationName: record.medicationName,
                dischargeId: record.dischargeId
            });
        });

        // Add symptom flag events
        symptomData.aggregatedAnalysis.flags.forEach(flag => {
            events.push({
                id: `symptom-${flag.date}-${flag.type}`,
                type: 'symptom_flag',
                date: flag.date,
                title: 'Symptom Alert',
                description: flag.description,
                severity: flag.severity
            });
        });

        // Sort by date and time, most recent first
        return events.sort((a, b) => {
            const dateCompare = b.date.localeCompare(a.date);
            if (dateCompare !== 0) return dateCompare;

            if (a.time && b.time) {
                return b.time.localeCompare(a.time);
            }
            return 0;
        });
    };

    // Loading and error states
    if (authLoading || loading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '400px',
                fontFamily: 'Nunito, -apple-system, BlinkMacSystemFont, sans-serif'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        fontSize: '1.125rem',
                        color: '#6D6D72',
                        marginBottom: '0.5rem'
                    }}>
                        Loading patient details...
                    </div>
                    <div style={{
                        width: '32px',
                        height: '32px',
                        border: '3px solid #F2F2F7',
                        borderTop: '3px solid #007AFF',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        margin: '0 auto'
                    }} />
                </div>
            </div>
        );
    }

    if (error || !patientData) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '400px',
                fontFamily: 'Nunito, -apple-system, BlinkMacSystemFont, sans-serif'
            }}>
                <div style={{
                    textAlign: 'center',
                    backgroundColor: '#FFFFFF',
                    padding: '2rem',
                    borderRadius: '12px',
                    border: '1px solid #E5E5EA'
                }}>
                    <div style={{
                        fontSize: '1.25rem',
                        fontWeight: 600,
                        color: '#FF3B30',
                        marginBottom: '0.5rem'
                    }}>
                        {error || 'Patient not found'}
                    </div>
                    <Link
                        href="/dashboard/patients"
                        style={{
                            color: '#007AFF',
                            textDecoration: 'none',
                            fontSize: '0.875rem'
                        }}
                    >
                        ← Back to Patient Dashboard
                    </Link>
                </div>
            </div>
        );
    }

    const { primaryDischarge, allDischarges, aggregatedAdherence, aggregatedSymptoms, timelineEvents } = patientData;

    return (
        <div style={{
            fontFamily: 'Nunito, -apple-system, BlinkMacSystemFont, sans-serif',
            backgroundColor: '#F2F2F7',
            minHeight: '100vh'
        }}>
            {/* Header */}
            <div style={{
                backgroundColor: '#FFFFFF',
                borderBottom: '1px solid #E5E5EA',
                padding: '2rem 2.5rem'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    marginBottom: '1.5rem'
                }}>
                    <Link
                        href="/dashboard/patients"
                        style={{
                            color: '#007AFF',
                            textDecoration: 'none',
                            fontSize: '0.875rem',
                            fontWeight: 500
                        }}
                    >
                        ← Patients
                    </Link>
                    <div style={{
                        width: '1px',
                        height: '16px',
                        backgroundColor: '#D1D1D6'
                    }} />
                    <h1 style={{
                        fontSize: '2rem',
                        fontWeight: 700,
                        color: '#1D1D1F',
                        margin: 0
                    }}>
                        {primaryDischarge.pet.name}
                    </h1>
                </div>

                {/* Patient Info Summary */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '1.5rem',
                    marginBottom: '1.5rem'
                }}>
                    <div>
                        <div style={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: '#8E8E93',
                            textTransform: 'uppercase',
                            letterSpacing: '0.075em',
                            marginBottom: '0.25rem'
                        }}>
                            Pet Details
                        </div>
                        <div style={{
                            fontSize: '0.875rem',
                            color: '#1D1D1F',
                            lineHeight: 1.4
                        }}>
                            {primaryDischarge.pet.species}
                            {primaryDischarge.pet.weight && ` • ${primaryDischarge.pet.weight}`}
                        </div>
                    </div>

                    <div>
                        <div style={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: '#8E8E93',
                            textTransform: 'uppercase',
                            letterSpacing: '0.075em',
                            marginBottom: '0.25rem'
                        }}>
                            Visit History
                        </div>
                        <div style={{
                            fontSize: '0.875rem',
                            color: '#1D1D1F',
                            lineHeight: 1.4
                        }}>
                            {allDischarges.length} visit{allDischarges.length !== 1 ? 's' : ''}
                            <br />
                            Latest: {primaryDischarge.createdAt.toLocaleDateString()}
                        </div>
                    </div>

                    <div>
                        <div style={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: '#8E8E93',
                            textTransform: 'uppercase',
                            letterSpacing: '0.075em',
                            marginBottom: '0.25rem'
                        }}>
                            Adherence Rate
                        </div>
                        <div style={{
                            fontSize: '1.5rem',
                            fontWeight: 700,
                            color: aggregatedAdherence.overall.adherenceRate >= 85 ? '#34C759' :
                                aggregatedAdherence.overall.adherenceRate >= 70 ? '#FF9500' : '#FF3B30'
                        }}>
                            {aggregatedAdherence.overall.adherenceRate}%
                        </div>
                        <div style={{
                            fontSize: '0.75rem',
                            color: '#8E8E93'
                        }}>
                            {aggregatedAdherence.overall.givenDoses}/{aggregatedAdherence.overall.totalDoses} doses given
                        </div>
                    </div>

                    <div>
                        <div style={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: '#8E8E93',
                            textTransform: 'uppercase',
                            letterSpacing: '0.075em',
                            marginBottom: '0.25rem'
                        }}>
                            Current Status
                        </div>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}>
                            <span style={{
                                width: '8px',
                                height: '8px',
                                backgroundColor: patientData.isActive ? '#34C759' : '#8E8E93',
                                borderRadius: '50%'
                            }} />
                            <span style={{
                                fontSize: '0.875rem',
                                fontWeight: 600,
                                color: patientData.isActive ? '#34C759' : '#8E8E93'
                            }}>
                                {patientData.isActive ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                        {patientData.lastActivity && (
                            <div style={{
                                fontSize: '0.75rem',
                                color: '#8E8E93',
                                marginTop: '0.25rem'
                            }}>
                                Last dose: {patientData.lastActivity.toLocaleDateString()}
                            </div>
                        )}
                    </div>
                </div>

                {/* Multiple Visits Banner */}
                {allDischarges.length > 1 && (
                    <div style={{
                        backgroundColor: '#E5F4FF',
                        border: '1px solid #B3D9FF',
                        borderRadius: '8px',
                        padding: '1rem',
                        marginBottom: '1.5rem'
                    }}>
                        <div style={{
                            fontSize: '0.875rem',
                            color: '#007AFF',
                            fontWeight: 600,
                            marginBottom: '0.25rem'
                        }}>
                            📊 Comprehensive Patient History
                        </div>
                        <div style={{
                            fontSize: '0.75rem',
                            color: '#007AFF',
                            lineHeight: 1.4
                        }}>
                            This view shows aggregated data from all {allDischarges.length} visits for {primaryDischarge.pet.name}.
                            Adherence rates, symptom trends, and timeline events include data from across all discharge summaries.
                        </div>
                    </div>
                )}

                {/* Tab Navigation */}
                <div style={{
                    display: 'flex',
                    gap: '2rem',
                    borderBottom: '2px solid #F2F2F7'
                }}>
                    {[
                        { key: 'recent' as const, label: 'Recent Discharges', count: allDischarges.length },
                        { key: 'medications' as const, label: 'Medications', count: aggregatedAdherence.perMedication.length },
                        { key: 'symptoms' as const, label: 'Symptoms', count: aggregatedSymptoms.flags.length },
                        { key: 'timeline' as const, label: 'Timeline', count: timelineEvents.length }
                    ].map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            style={{
                                backgroundColor: 'transparent',
                                border: 'none',
                                padding: '1rem 0',
                                fontSize: '0.875rem',
                                fontWeight: 600,
                                color: activeTab === tab.key ? '#007AFF' : '#8E8E93',
                                borderBottom: activeTab === tab.key ? '2px solid #007AFF' : '2px solid transparent',
                                cursor: 'pointer',
                                transition: 'color 0.2s',
                                fontFamily: 'inherit',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}
                        >
                            {tab.label}
                            {tab.count > 0 && (
                                <span style={{
                                    backgroundColor: activeTab === tab.key ? '#007AFF' : '#D1D1D6',
                                    color: activeTab === tab.key ? '#FFFFFF' : '#8E8E93',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    padding: '0.125rem 0.5rem',
                                    borderRadius: '12px',
                                    minWidth: '20px',
                                    textAlign: 'center'
                                }}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab Content */}
            <div style={{ padding: '2rem 2.5rem' }}>
                {activeTab === 'recent' && (
                    <div>
                        <h3 style={{
                            fontSize: '1.25rem',
                            fontWeight: 600,
                            marginBottom: '1rem',
                            color: '#1D1D1F'
                        }}>
                            Recent Discharges ({allDischarges.length})
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {allDischarges.map((discharge, index) => (
                                <div key={discharge.id} style={{
                                    backgroundColor: '#FFFFFF',
                                    border: discharge.id === primaryDischarge.id ? '2px solid #007AFF' : '1px solid #E5E5EA',
                                    borderRadius: '12px',
                                    padding: '1.5rem'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                                        <div>
                                            <h4 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, marginBottom: '0.25rem' }}>
                                                Visit {allDischarges.length - index}
                                                {discharge.id === primaryDischarge.id && (
                                                    <span style={{ color: '#007AFF', marginLeft: '0.5rem' }}>(Current)</span>
                                                )}
                                            </h4>
                                            <p style={{ fontSize: '0.875rem', color: '#6D6D72', margin: 0 }}>
                                                {discharge.createdAt.toLocaleDateString()}
                                            </p>
                                        </div>
                                        <span style={{
                                            backgroundColor: '#F2F2F7',
                                            color: '#1D1D1F',
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            padding: '0.25rem 0.75rem',
                                            borderRadius: '12px'
                                        }}>
                                            {discharge.medications.length} medication{discharge.medications.length !== 1 ? 's' : ''}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '0.875rem', color: '#1D1D1F' }}>
                                        Medications: {discharge.medications.map(med => med.name).join(', ')}
                                    </div>
                                    {discharge.notes && (
                                        <div style={{ fontSize: '0.875rem', color: '#6D6D72', marginTop: '0.5rem' }}>
                                            Notes: {discharge.notes}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'medications' && (
                    <div>
                        <h3 style={{
                            fontSize: '1.25rem',
                            fontWeight: 600,
                            marginBottom: '1rem',
                            color: '#1D1D1F'
                        }}>
                            Medication Adherence
                        </h3>

                        {/* Overall Metrics */}
                        <div style={{
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #E5E5EA',
                            borderRadius: '12px',
                            padding: '1.5rem',
                            marginBottom: '1.5rem'
                        }}>
                            <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Overall Adherence</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                                <div>
                                    <div style={{ fontSize: '2rem', fontWeight: 700, color: '#007AFF' }}>
                                        {aggregatedAdherence.overall.adherenceRate}%
                                    </div>
                                    <div style={{ fontSize: '0.875rem', color: '#6D6D72' }}>Adherence Rate</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#34C759' }}>
                                        {aggregatedAdherence.overall.givenDoses}
                                    </div>
                                    <div style={{ fontSize: '0.875rem', color: '#6D6D72' }}>Doses Given</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#FF3B30' }}>
                                        {aggregatedAdherence.overall.missedDoses}
                                    </div>
                                    <div style={{ fontSize: '0.875rem', color: '#6D6D72' }}>Doses Missed</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#FF9500' }}>
                                        {aggregatedAdherence.overall.lateDoses}
                                    </div>
                                    <div style={{ fontSize: '0.875rem', color: '#6D6D72' }}>Late Doses</div>
                                </div>
                            </div>
                        </div>

                        {/* Per Medication */}
                        {aggregatedAdherence.perMedication.length > 0 && (
                            <div style={{
                                backgroundColor: '#FFFFFF',
                                border: '1px solid #E5E5EA',
                                borderRadius: '12px',
                                padding: '1.5rem'
                            }}>
                                <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>By Medication</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {aggregatedAdherence.perMedication.map(med => (
                                        <div key={med.medicationName} style={{
                                            padding: '1rem',
                                            border: '1px solid #F2F2F7',
                                            borderRadius: '8px'
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                                <span style={{ fontWeight: 600 }}>{med.medicationName}</span>
                                                <span style={{
                                                    backgroundColor: med.adherenceRate >= 85 ? '#E8F5E8' : med.adherenceRate >= 70 ? '#FFF3CD' : '#FFEBEE',
                                                    color: med.adherenceRate >= 85 ? '#34C759' : med.adherenceRate >= 70 ? '#FF9500' : '#FF3B30',
                                                    padding: '0.25rem 0.75rem',
                                                    borderRadius: '12px',
                                                    fontSize: '0.875rem',
                                                    fontWeight: 600
                                                }}>
                                                    {med.adherenceRate}%
                                                </span>
                                            </div>
                                            <div style={{ fontSize: '0.875rem', color: '#6D6D72' }}>
                                                {med.onTimeDoses} on time • {med.lateDoses} late • {med.missedDoses} missed
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'symptoms' && (
                    <div>
                        <h3 style={{
                            fontSize: '1.25rem',
                            fontWeight: 600,
                            marginBottom: '1rem',
                            color: '#1D1D1F'
                        }}>
                            Symptom Analysis
                        </h3>

                        {/* Symptom Flags */}
                        {aggregatedSymptoms.flags.length > 0 ? (
                            <div style={{
                                backgroundColor: '#FFFFFF',
                                border: '1px solid #E5E5EA',
                                borderRadius: '12px',
                                padding: '1.5rem',
                                marginBottom: '1.5rem'
                            }}>
                                <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>
                                    Symptom Alerts ({aggregatedSymptoms.flags.length})
                                </h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {aggregatedSymptoms.flags.map((flag, index) => (
                                        <div key={index} style={{
                                            padding: '1rem',
                                            border: `1px solid ${flag.severity === 'high' ? '#FFEBEE' : flag.severity === 'medium' ? '#FFF3CD' : '#E5F4FF'}`,
                                            backgroundColor: flag.severity === 'high' ? '#FFEBEE' : flag.severity === 'medium' ? '#FFF3CD' : '#E5F4FF',
                                            borderRadius: '8px'
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                                <div>
                                                    <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{flag.description}</div>
                                                    <div style={{ fontSize: '0.875rem', color: '#6D6D72' }}>{flag.date}</div>
                                                </div>
                                                <span style={{
                                                    backgroundColor: flag.severity === 'high' ? '#FF3B30' : flag.severity === 'medium' ? '#FF9500' : '#007AFF',
                                                    color: '#FFFFFF',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 600,
                                                    padding: '0.25rem 0.75rem',
                                                    borderRadius: '12px',
                                                    textTransform: 'capitalize'
                                                }}>
                                                    {flag.severity}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div style={{
                                backgroundColor: '#FFFFFF',
                                border: '1px solid #E5E5EA',
                                borderRadius: '12px',
                                padding: '2rem',
                                textAlign: 'center',
                                marginBottom: '1.5rem'
                            }}>
                                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
                                <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>No Symptom Alerts</h4>
                                <p style={{ color: '#6D6D72', margin: 0 }}>This pet has no concerning symptom patterns.</p>
                            </div>
                        )}

                        {/* Recent Symptom Trends */}
                        {aggregatedSymptoms.recentEntries.length > 0 && (
                            <div style={{
                                backgroundColor: '#FFFFFF',
                                border: '1px solid #E5E5EA',
                                borderRadius: '12px',
                                padding: '1.5rem'
                            }}>
                                <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Recent Trends</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                    <div>
                                        <div style={{ fontSize: '0.875rem', color: '#6D6D72', marginBottom: '0.25rem' }}>Appetite</div>
                                        <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#1D1D1F' }}>
                                            {aggregatedSymptoms.trends.appetite.current}/5
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: '#8E8E93' }}>
                                            7-day avg: {aggregatedSymptoms.trends.appetite.sevenDayAverage}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.875rem', color: '#6D6D72', marginBottom: '0.25rem' }}>Energy</div>
                                        <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#1D1D1F' }}>
                                            {aggregatedSymptoms.trends.energy.current}/5
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: '#8E8E93' }}>
                                            7-day avg: {aggregatedSymptoms.trends.energy.sevenDayAverage}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.875rem', color: '#6D6D72', marginBottom: '0.25rem' }}>Panting</div>
                                        <div style={{ fontSize: '1.5rem', fontWeight: 600, color: aggregatedSymptoms.trends.panting.isFrequent ? '#FF9500' : '#34C759' }}>
                                            {aggregatedSymptoms.trends.panting.isFrequent ? 'Frequent' : 'Normal'}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: '#8E8E93' }}>
                                            {aggregatedSymptoms.trends.panting.recentDays} days this week
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'timeline' && (
                    <div>
                        <h3 style={{
                            fontSize: '1.25rem',
                            fontWeight: 600,
                            marginBottom: '1rem',
                            color: '#1D1D1F'
                        }}>
                            Patient Timeline ({timelineEvents.length} events)
                        </h3>

                        {timelineEvents.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {timelineEvents.map(event => (
                                    <div key={event.id} style={{
                                        backgroundColor: '#FFFFFF',
                                        border: '1px solid #E5E5EA',
                                        borderRadius: '12px',
                                        padding: '1.5rem',
                                        borderLeft: `4px solid ${event.type === 'new_discharge' ? '#007AFF' :
                                                event.type === 'dose' ? (event.severity === 'medium' ? '#FF3B30' : '#34C759') :
                                                    event.severity === 'high' ? '#FF3B30' :
                                                        event.severity === 'medium' ? '#FF9500' : '#007AFF'
                                            }`
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                                            <div>
                                                <h4 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, marginBottom: '0.25rem' }}>
                                                    {event.title}
                                                </h4>
                                                <p style={{ fontSize: '0.875rem', color: '#1D1D1F', margin: 0 }}>
                                                    {event.description}
                                                </p>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1D1D1F' }}>
                                                    {event.date}
                                                </div>
                                                {event.time && (
                                                    <div style={{ fontSize: '0.75rem', color: '#6D6D72' }}>
                                                        {event.time}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {event.delay && event.delay > 0 && (
                                            <div style={{
                                                fontSize: '0.75rem',
                                                color: '#FF9500',
                                                backgroundColor: '#FFF3CD',
                                                padding: '0.25rem 0.5rem',
                                                borderRadius: '4px',
                                                display: 'inline-block',
                                                marginTop: '0.5rem'
                                            }}>
                                                {event.delay} minutes late
                                            </div>
                                        )}

                                        {event.medicationName && (
                                            <div style={{ fontSize: '0.75rem', color: '#6D6D72', marginTop: '0.25rem' }}>
                                                {event.medicationName}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div style={{
                                backgroundColor: '#FFFFFF',
                                border: '1px solid #E5E5EA',
                                borderRadius: '12px',
                                padding: '2rem',
                                textAlign: 'center'
                            }}>
                                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
                                <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>No Timeline Events</h4>
                                <p style={{ color: '#6D6D72', margin: 0 }}>Timeline events will appear as the pet owner logs doses and symptoms.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* CSS for spinner animation */}
            <style jsx>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}