// src/app/dashboard/patients/[id]/page.tsx - Fixed with Real Data Loading
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
import { getPetMetrics } from '@/lib/petDataUtils';
import Navigation from '@/components/Navigation';

// Import data loading functions
import { calculateAdherenceMetrics, getRecentAdherenceRecords, AdherenceMetrics, AdherenceRecord } from '@/lib/adherence';
import { analyzeSymptoms, SymptomAnalysis } from '@/lib/symptomFlags';

// Import modularized tab components
import SymptomsTab from '@/components/patientDetail/SymptomsTab';
import MedicationsTab from '@/components/patientDetail/MedicationsTab';
import TimelineTab from '@/components/patientDetail/TimelineTab';
import RecentDischargesTab from '@/components/patientDetail/RecentDischargesTab';

// Enhanced metrics interface for Quick Glance
interface QuickGlanceMetrics {
    petName: string;
    petSpecies: string;
    petWeight?: string;

    // Key metrics for Quick Glance
    overallAdherenceRate: number; // All meds, all discharges
    activeOnlyAdherenceRate: number; // Active meds only
    activeMedsCount: number;
    archivedMedsCount: number;
    missedDoseCount: number; // Last 30 days
    lateDoseCount: number; // Last 30 days
    lastDoseGivenDate?: Date;
    currentStatus: 'active' | 'inactive';
    recentSymptomAlerts: number; // Last 14 days
    totalVisits: number;
    lastVisitDate: Date;
}

// Simple RecentDischarge interface to match tab components
interface RecentDischarge {
    id: string;
    pet: {
        name: string;
        species: string;
        weight?: string;
    };
    createdAt: Date;
    adherenceRate: number;
    symptomFlagCount: number;
    isActive: boolean;
}

// Timeline event interface for patient detail
interface PatientTimelineEvent {
    id: string;
    type: 'dose' | 'symptom_flag';
    date: string;
    time?: string;
    title: string;
    description: string;
    severity?: 'low' | 'medium' | 'high';
    delay?: number;
    medicationName?: string;
    dischargeId?: string;
    sortTime: Date;
}

export default function PatientDetailPage() {
    const { id } = useParams();
    const { vetUser, clinic } = useAuth();
    const { loading: authLoading } = useRequireAuth();

    // Core state
    const [discharge, setDischarge] = useState<Discharge | null>(null);
    const [allDischarges, setAllDischarges] = useState<Discharge[]>([]);
    const [quickGlanceMetrics, setQuickGlanceMetrics] = useState<QuickGlanceMetrics | null>(null);

    // Real data state for tabs
    const [adherenceMetrics, setAdherenceMetrics] = useState<AdherenceMetrics | null>(null);
    const [symptomAnalysis, setSymptomAnalysis] = useState<SymptomAnalysis | null>(null);
    const [timelineEvents, setTimelineEvents] = useState<PatientTimelineEvent[]>([]);

    const [loading, setLoading] = useState(true);
    const [dataLoading, setDataLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState<'recent' | 'medications' | 'symptoms' | 'timeline'>('recent');
    const [isMobile, setIsMobile] = useState(false);

    // Check if mobile on mount
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Convert all discharges to RecentDischarge format for tab compatibility
    const recentDischarges: RecentDischarge[] = allDischarges.map(discharge => ({
        id: discharge.id,
        pet: discharge.pet,
        createdAt: discharge.createdAt,
        adherenceRate: 0, // Will be calculated by tab components
        symptomFlagCount: 0, // Will be calculated by tab components
        isActive: true // Will be determined by tab components
    }));

    // Helper function to create timeline events from adherence records
    const createTimelineEvents = (records: AdherenceRecord[], symptoms: SymptomAnalysis): PatientTimelineEvent[] => {
        const events: PatientTimelineEvent[] = [];

        // Add dose events
        records.forEach(record => {
            const scheduledDate = record.scheduledTime.toDate();
            const givenDate = record.givenAt?.toDate();

            // Calculate delay if dose was given late
            let delay = 0;
            let severity: 'low' | 'medium' | 'high' = 'low';

            if (record.status === 'given' && givenDate) {
                delay = Math.round((givenDate.getTime() - scheduledDate.getTime()) / (1000 * 60 * 60)); // hours
                if (delay > 6) severity = 'high';
                else if (delay > 2) severity = 'medium';
            } else if (record.status === 'missed') {
                severity = 'high';
            }

            const title = record.status === 'given' ? 'Dose Given' :
                record.status === 'missed' ? 'Dose Missed' : 'Dose Skipped';

            const description = record.status === 'given'
                ? `${record.dosage} of ${record.medicationName}${delay > 2 ? ` (${delay}h late)` : ''}`
                : `${record.dosage} of ${record.medicationName}`;

            events.push({
                id: record.id,
                type: 'dose',
                date: scheduledDate.toISOString().split('T')[0],
                time: (givenDate || scheduledDate).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                }),
                title,
                description,
                severity,
                delay,
                medicationName: record.medicationName,
                dischargeId: id as string,
                sortTime: givenDate || scheduledDate
            });
        });

        // Add symptom flag events
        symptoms.flags.forEach(flag => {
            events.push({
                id: `symptom-${flag.type}-${flag.date}`,
                type: 'symptom_flag',
                date: flag.date,
                title: 'Symptom Alert',
                description: flag.description,
                severity: flag.severity,
                dischargeId: id as string,
                sortTime: new Date(flag.date)
            });
        });

        // Sort by date/time, most recent first
        return events.sort((a, b) => b.sortTime.getTime() - a.sortTime.getTime());
    };

    // Load patient data and basic metrics
    useEffect(() => {
        const loadPatientData = async () => {
            if (!vetUser || !clinic || !id) return;

            try {
                setLoading(true);
                setError('');

                // Load the main discharge
                const dischargeDoc = await getDoc(doc(db, COLLECTIONS.DISCHARGES, id as string));

                if (!dischargeDoc.exists()) {
                    setError('Patient discharge not found');
                    setLoading(false);
                    return;
                }

                const dischargeData = dischargeDoc.data();
                const mainDischarge = {
                    id: dischargeDoc.id,
                    ...dischargeData,
                    createdAt: dischargeData.createdAt?.toDate() || new Date(),
                    updatedAt: dischargeData.updatedAt?.toDate() || new Date(),
                    visitDate: dischargeData.visitDate?.toDate() || dischargeData.createdAt?.toDate() || new Date()
                } as Discharge;

                setDischarge(mainDischarge);

                // Load enhanced metrics for this pet across ALL discharges
                const petMetrics = await getPetMetrics(
                    mainDischarge.pet.name,
                    clinic.id,
                    mainDischarge.pet.species
                );

                setQuickGlanceMetrics(petMetrics);

                // Load ALL discharges for this pet to pass to tabs
                const { getAllDischargesForPet } = await import('@/lib/petDataUtils');
                const petDischarges = await getAllDischargesForPet(
                    mainDischarge.pet.name,
                    clinic.id,
                    mainDischarge.pet.species
                );
                setAllDischarges(petDischarges);

                console.log('Patient data loaded successfully');

            } catch (err) {
                console.error('Error loading patient data:', err);
                setError('Failed to load patient data');
            } finally {
                setLoading(false);
            }
        };

        if (!authLoading) {
            loadPatientData();
        }
    }, [id, vetUser, clinic, authLoading]);

    // Load detailed data for tabs
    useEffect(() => {
        const loadDetailedData = async () => {
            if (!discharge || !clinic) return;

            try {
                setDataLoading(true);
                console.log('Loading detailed data for tabs...');

                // Load adherence metrics (30 days)
                const adherenceData = await calculateAdherenceMetrics(
                    discharge.id,
                    clinic.id,
                    30
                );
                setAdherenceMetrics(adherenceData);
                console.log('Adherence metrics loaded:', adherenceData);

                // Load symptom analysis (30 days)
                const symptomData = await analyzeSymptoms(
                    discharge.id,
                    clinic.id,
                    30
                );
                setSymptomAnalysis(symptomData);
                console.log('Symptom analysis loaded:', symptomData);

                // Load recent adherence records for timeline (60 days, limit 100)
                const recentRecords = await getRecentAdherenceRecords(discharge.id, 100);
                console.log('Recent adherence records loaded:', recentRecords.length);

                // Create timeline events
                const timeline = createTimelineEvents(recentRecords, symptomData);
                setTimelineEvents(timeline);
                console.log('Timeline events created:', timeline.length);

            } catch (err) {
                console.error('Error loading detailed data:', err);
                // Don't set error - we can still show the basic data
            } finally {
                setDataLoading(false);
            }
        };

        if (discharge && !loading) {
            loadDetailedData();
        }
    }, [discharge, clinic, loading]);

    // Utility functions
    const getAdherenceColor = (rate: number): string => {
        if (rate >= 85) return '#34C759'; // Success Green
        if (rate >= 70) return '#FF9500'; // Warning Orange
        return '#ef4444'; // Error Red
    };

    const getStatusColor = (status: 'active' | 'inactive'): string => {
        return status === 'active' ? '#34C759' : '#6D6D72';
    };

    const formatTimeAgo = (date: Date): string => {
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);

        if (diffHours < 1) return 'Less than 1 hour ago';
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
        });
    };

    const formatDate = (date: Date): string => {
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    // Create fallback empty data for tabs when loading
    const getEmptyAdherenceMetrics = (): AdherenceMetrics => ({
        overall: { totalDoses: 0, givenDoses: 0, lateDoses: 0, missedDoses: 0, adherenceRate: 0 },
        perMedication: [],
        timeline: []
    });

    const getEmptySymptomAnalysis = (): SymptomAnalysis => ({
        flags: [],
        recentEntries: [],
        trends: {
            appetite: { current: 0, sevenDayAverage: 0, trend: 'stable' },
            energy: { current: 0, sevenDayAverage: 0, trend: 'stable' },
            panting: { recentDays: 0, isFrequent: false }
        }
    });

    if (authLoading || loading) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#f8fafc',
                fontFamily: 'Nunito, -apple-system, BlinkMacSystemFont, sans-serif'
            }}>
                <div style={{
                    textAlign: 'center',
                    color: '#64748b'
                }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        border: '4px solid #e2e8f0',
                        borderTop: '4px solid #007AFF',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        margin: '0 auto 1rem auto'
                    }} />
                    Loading patient details...
                </div>
            </div>
        );
    }

    if (error || !discharge || !quickGlanceMetrics) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#f8fafc',
                fontFamily: 'Nunito, -apple-system, BlinkMacSystemFont, sans-serif',
                padding: '1rem'
            }}>
                <div style={{ textAlign: 'center', maxWidth: '400px', width: '100%' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🐾</div>
                    <h1 style={{
                        fontSize: '1.5rem',
                        fontWeight: '600',
                        color: '#dc2626',
                        marginBottom: '0.5rem'
                    }}>
                        Patient Not Found
                    </h1>
                    <p style={{
                        color: '#64748b',
                        marginBottom: '2rem',
                        lineHeight: '1.5'
                    }}>
                        {error || 'This patient may have been removed or you may not have access to view their records.'}
                    </p>
                    <Link
                        href="/dashboard/patients"
                        style={{
                            backgroundColor: '#007AFF',
                            color: 'white',
                            padding: '0.75rem 1.5rem',
                            borderRadius: '8px',
                            textDecoration: 'none',
                            fontWeight: '600',
                            display: 'inline-block'
                        }}
                    >
                        Back to Patients
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: '#f8fafc',
            fontFamily: 'Nunito, -apple-system, BlinkMacSystemFont, sans-serif'
        }}>
            {/* Navigation Component */}
            <Navigation activeRoute="/dashboard/patients" />

            {/* Breadcrumb Navigation */}
            <div style={{
                backgroundColor: 'white',
                borderBottom: '1px solid #e2e8f0',
                padding: isMobile ? '0.75rem 1rem' : '1rem 2rem'
            }}>
                <div style={{
                    maxWidth: '1200px',
                    margin: '0 auto',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '0.875rem',
                    color: '#64748b'
                }}>
                    <Link
                        href="/dashboard/patients"
                        style={{
                            color: '#64748b',
                            textDecoration: 'none',
                            fontWeight: '500',
                            transition: 'color 0.2s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#007AFF'}
                        onMouseLeave={(e) => e.currentTarget.style.color = '#64748b'}
                    >
                        Patients
                    </Link>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9,18 15,12 9,6" />
                    </svg>
                    <span style={{
                        color: '#007AFF',
                        fontWeight: '600'
                    }}>
                        {quickGlanceMetrics.petName}
                    </span>
                </div>
            </div>

            {/* Main Content */}
            <main style={{
                maxWidth: '1200px',
                margin: '0 auto',
                padding: isMobile ? '1rem' : '2rem'
            }}>
                {/* Patient Header */}
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    padding: isMobile ? '1.5rem' : '2rem',
                    marginBottom: '2rem',
                    border: '1px solid #e2e8f0'
                }}>
                    <div style={{
                        display: 'flex',
                        flexDirection: isMobile ? 'column' : 'row',
                        justifyContent: 'space-between',
                        alignItems: isMobile ? 'flex-start' : 'center',
                        gap: isMobile ? '1rem' : '0'
                    }}>
                        <div>
                            <h1 style={{
                                fontSize: isMobile ? '1.75rem' : '2.25rem',
                                fontWeight: '700',
                                color: '#1e293b',
                                margin: '0 0 0.5rem 0'
                            }}>
                                {quickGlanceMetrics.petName}
                            </h1>
                            <p style={{
                                fontSize: isMobile ? '1rem' : '1.125rem',
                                color: '#64748b',
                                margin: '0 0 0.25rem 0'
                            }}>
                                {quickGlanceMetrics.petSpecies}
                                {quickGlanceMetrics.petWeight && (
                                    <span>
                                        {' • '}
                                        {quickGlanceMetrics.petWeight.includes('lb') || quickGlanceMetrics.petWeight.includes('kg')
                                            ? quickGlanceMetrics.petWeight
                                            : `${quickGlanceMetrics.petWeight} lbs`
                                        }
                                    </span>
                                )}
                            </p>
                            <p style={{
                                fontSize: '0.875rem',
                                color: '#9ca3af',
                                margin: 0
                            }}>
                                {quickGlanceMetrics.totalVisits} visit{quickGlanceMetrics.totalVisits !== 1 ? 's' : ''} • Last visit: {formatDate(quickGlanceMetrics.lastVisitDate)}
                            </p>
                        </div>

                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1rem'
                        }}>
                            <div style={{
                                backgroundColor: quickGlanceMetrics.currentStatus === 'active' ? '#dcfce7' : '#f1f5f9',
                                color: getStatusColor(quickGlanceMetrics.currentStatus),
                                padding: '0.5rem 1rem',
                                borderRadius: '8px',
                                fontSize: '0.875rem',
                                fontWeight: '600',
                                textTransform: 'capitalize'
                            }}>
                                {quickGlanceMetrics.currentStatus}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Glance Metrics Grid */}
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    padding: isMobile ? '1.5rem' : '2rem',
                    marginBottom: '2rem',
                    border: '1px solid #e2e8f0'
                }}>
                    <h2 style={{
                        fontSize: '1.25rem',
                        fontWeight: '600',
                        color: '#1e293b',
                        marginBottom: '1.5rem'
                    }}>
                        Quick Glance Metrics
                    </h2>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(250px, 1fr))',
                        gap: '1.5rem'
                    }}>
                        {/* Overall Adherence */}
                        <div style={{
                            backgroundColor: '#f8fafc',
                            borderRadius: '10px',
                            padding: '1.25rem',
                            border: '1px solid #f1f5f9'
                        }}>
                            <h3 style={{
                                fontSize: '0.875rem',
                                fontWeight: '600',
                                color: '#6b7280',
                                marginBottom: '0.5rem',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em'
                            }}>
                                Overall Adherence
                            </h3>
                            <div style={{
                                fontSize: '2rem',
                                fontWeight: '700',
                                color: getAdherenceColor(quickGlanceMetrics.overallAdherenceRate),
                                marginBottom: '0.25rem'
                            }}>
                                {quickGlanceMetrics.overallAdherenceRate}%
                            </div>
                            <p style={{
                                fontSize: '0.75rem',
                                color: '#9ca3af',
                                margin: 0
                            }}>
                                All medications, all visits
                            </p>
                        </div>

                        {/* Active Meds Adherence */}
                        <div style={{
                            backgroundColor: '#f8fafc',
                            borderRadius: '10px',
                            padding: '1.25rem',
                            border: '1px solid #f1f5f9'
                        }}>
                            <h3 style={{
                                fontSize: '0.875rem',
                                fontWeight: '600',
                                color: '#6b7280',
                                marginBottom: '0.5rem',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em'
                            }}>
                                Active Meds Adherence
                            </h3>
                            <div style={{
                                fontSize: '2rem',
                                fontWeight: '700',
                                color: getAdherenceColor(quickGlanceMetrics.activeOnlyAdherenceRate),
                                marginBottom: '0.25rem'
                            }}>
                                {quickGlanceMetrics.activeOnlyAdherenceRate}%
                            </div>
                            <p style={{
                                fontSize: '0.75rem',
                                color: '#9ca3af',
                                margin: 0
                            }}>
                                Current medications only
                            </p>
                        </div>

                        {/* Medications Count */}
                        <div style={{
                            backgroundColor: '#f8fafc',
                            borderRadius: '10px',
                            padding: '1.25rem',
                            border: '1px solid #f1f5f9'
                        }}>
                            <h3 style={{
                                fontSize: '0.875rem',
                                fontWeight: '600',
                                color: '#6b7280',
                                marginBottom: '0.5rem',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em'
                            }}>
                                Medications
                            </h3>
                            <div style={{
                                fontSize: '2rem',
                                fontWeight: '700',
                                color: '#1e293b',
                                marginBottom: '0.25rem'
                            }}>
                                {quickGlanceMetrics.activeMedsCount}
                            </div>
                            <p style={{
                                fontSize: '0.75rem',
                                color: '#9ca3af',
                                margin: 0
                            }}>
                                {quickGlanceMetrics.archivedMedsCount} completed
                            </p>
                        </div>

                        {/* Recent Issues */}
                        <div style={{
                            backgroundColor: '#f8fafc',
                            borderRadius: '10px',
                            padding: '1.25rem',
                            border: '1px solid #f1f5f9'
                        }}>
                            <h3 style={{
                                fontSize: '0.875rem',
                                fontWeight: '600',
                                color: '#6b7280',
                                marginBottom: '0.5rem',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em'
                            }}>
                                Recent Issues
                            </h3>
                            <div style={{
                                fontSize: '2rem',
                                fontWeight: '700',
                                color: quickGlanceMetrics.missedDoseCount > 0 ? '#ef4444' : '#34C759',
                                marginBottom: '0.25rem'
                            }}>
                                {quickGlanceMetrics.missedDoseCount}
                            </div>
                            <p style={{
                                fontSize: '0.75rem',
                                color: '#9ca3af',
                                margin: 0
                            }}>
                                missed doses (30d)
                            </p>
                        </div>

                        {/* Last Dose */}
                        <div style={{
                            backgroundColor: '#f8fafc',
                            borderRadius: '10px',
                            padding: '1.25rem',
                            border: '1px solid #f1f5f9'
                        }}>
                            <h3 style={{
                                fontSize: '0.875rem',
                                fontWeight: '600',
                                color: '#6b7280',
                                marginBottom: '0.5rem',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em'
                            }}>
                                Last Dose
                            </h3>
                            <div style={{
                                fontSize: quickGlanceMetrics.lastDoseGivenDate ? '1.25rem' : '2rem',
                                fontWeight: '700',
                                color: quickGlanceMetrics.lastDoseGivenDate ? '#1e293b' : '#9ca3af',
                                marginBottom: '0.25rem'
                            }}>
                                {quickGlanceMetrics.lastDoseGivenDate
                                    ? formatTimeAgo(quickGlanceMetrics.lastDoseGivenDate)
                                    : 'No doses logged'
                                }
                            </div>
                            <p style={{
                                fontSize: '0.75rem',
                                color: '#9ca3af',
                                margin: 0
                            }}>
                                Any medication
                            </p>
                        </div>

                        {/* Symptom Alerts */}
                        <div style={{
                            backgroundColor: '#f8fafc',
                            borderRadius: '10px',
                            padding: '1.25rem',
                            border: '1px solid #f1f5f9'
                        }}>
                            <h3 style={{
                                fontSize: '0.875rem',
                                fontWeight: '600',
                                color: '#6b7280',
                                marginBottom: '0.5rem',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em'
                            }}>
                                Symptom Alerts
                            </h3>
                            <div style={{
                                fontSize: '2rem',
                                fontWeight: '700',
                                color: quickGlanceMetrics.recentSymptomAlerts > 0 ? '#FF9500' : '#34C759',
                                marginBottom: '0.25rem'
                            }}>
                                {quickGlanceMetrics.recentSymptomAlerts}
                            </div>
                            <p style={{
                                fontSize: '0.75rem',
                                color: '#9ca3af',
                                margin: 0
                            }}>
                                Last 14 days
                            </p>
                        </div>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    overflow: 'hidden'
                }}>
                    {/* Tab Headers */}
                    <div style={{
                        display: 'flex',
                        borderBottom: '1px solid #f1f5f9',
                        backgroundColor: '#f8fafc'
                    }}>
                        {[
                            { id: 'recent', label: 'Recent Discharges', icon: '' },
                            { id: 'medications', label: 'Medications', icon: '' },
                            { id: 'symptoms', label: 'Symptoms', icon: '' },
                            { id: 'timeline', label: 'Timeline', icon: '' }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as 'recent' | 'medications' | 'symptoms' | 'timeline')}
                                style={{
                                    flex: 1,
                                    padding: isMobile ? '0.75rem 0.5rem' : '1rem 1.5rem',
                                    border: 'none',
                                    backgroundColor: activeTab === tab.id ? 'white' : 'transparent',
                                    color: activeTab === tab.id ? '#007AFF' : '#6b7280',
                                    fontWeight: activeTab === tab.id ? '600' : '500',
                                    fontSize: isMobile ? '0.75rem' : '0.875rem',
                                    borderBottom: activeTab === tab.id ? '2px solid #007AFF' : '2px solid transparent',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    fontFamily: 'inherit',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem'
                                }}
                            >
                                <span>{tab.icon}</span>
                                <span style={{ display: isMobile ? 'none' : 'block' }}>
                                    {tab.label}
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* Tab Content */}
                    <div style={{ minHeight: '400px', position: 'relative' }}>
                        {/* Loading overlay for tab data */}
                        {dataLoading && (
                            <div style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                zIndex: 10
                            }}>
                                <div style={{
                                    textAlign: 'center',
                                    color: '#64748b'
                                }}>
                                    <div style={{
                                        width: '32px',
                                        height: '32px',
                                        border: '3px solid #e2e8f0',
                                        borderTop: '3px solid #007AFF',
                                        borderRadius: '50%',
                                        animation: 'spin 1s linear infinite',
                                        margin: '0 auto 0.75rem auto'
                                    }} />
                                    Loading {activeTab} data...
                                </div>
                            </div>
                        )}

                        {activeTab === 'recent' && (
                            <RecentDischargesTab
                                recentDischarges={recentDischarges}
                                petName={discharge.pet.name}
                                clinicId={clinic?.id || ''}
                            />
                        )}

                        {activeTab === 'medications' && (
                            <MedicationsTab
                                adherenceMetrics={adherenceMetrics || getEmptyAdherenceMetrics()}
                                recentDischarges={recentDischarges}
                                petName={discharge.pet.name}
                            />
                        )}

                        {activeTab === 'symptoms' && (
                            <SymptomsTab
                                symptomAnalysis={symptomAnalysis || getEmptySymptomAnalysis()}
                                recentDischarges={recentDischarges}
                                petName={discharge.pet.name}
                            />
                        )}

                        {activeTab === 'timeline' && (
                            <TimelineTab
                                timelineEvents={timelineEvents}
                                recentDischarges={recentDischarges}
                                petName={discharge.pet.name}
                            />
                        )}
                    </div>
                </div>

                {/* Data Status Footer (helpful for debugging) */}
                {!dataLoading && (adherenceMetrics || symptomAnalysis || timelineEvents.length > 0) && (
                    <div style={{
                        marginTop: '1rem',
                        padding: '0.75rem 1rem',
                        backgroundColor: '#f0f9ff',
                        border: '1px solid #bae6fd',
                        borderRadius: '8px',
                        fontSize: '0.75rem',
                        color: '#0369a1'
                    }}>
                        <strong>Data Summary:</strong> {' '}
                        {adherenceMetrics && `${adherenceMetrics.overall.totalDoses} total doses`}
                        {adherenceMetrics && symptomAnalysis && ', '}
                        {symptomAnalysis && `${symptomAnalysis.recentEntries.length} symptom entries`}
                        {(adherenceMetrics || symptomAnalysis) && timelineEvents.length > 0 && ', '}
                        {timelineEvents.length > 0 && `${timelineEvents.length} timeline events`}
                        {' • '}Last updated: {new Date().toLocaleTimeString()}
                    </div>
                )}
            </main>

            {/* CSS for animations */}
            <style jsx>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}