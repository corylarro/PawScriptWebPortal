// src/app/dashboard/patients/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/types/firestore';
import { DoseEvent, SymptomLog } from '@/types/patientMonitoring';
import { Discharge } from '@/types/discharge';
import { getFrequencyOption } from '@/data/medicationTemplates';

export async function generateStaticParams() {
    return [];
}

export default function PatientDetailPage() {
    const { id } = useParams();
    const { vetUser, clinic } = useAuth();
    const { loading: authLoading } = useRequireAuth();

    const [discharge, setDischarge] = useState<Discharge | null>(null);
    const [doseEvents, setDoseEvents] = useState<DoseEvent[]>([]);
    const [symptomLogs, setSymptomLogs] = useState<SymptomLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState<'overview' | 'medications' | 'symptoms' | 'timeline'>('overview');

    // Load discharge and monitoring data
    useEffect(() => {
        if (!id || typeof id !== 'string' || !vetUser) return;

        const loadPatientData = async () => {
            try {
                console.log('Loading patient detail for discharge:', id);

                // Load discharge
                const dischargeDoc = await getDoc(doc(db, COLLECTIONS.DISCHARGES, id));
                if (!dischargeDoc.exists()) {
                    setError('Patient not found');
                    setLoading(false);
                    return;
                }

                const dischargeData = {
                    id: dischargeDoc.id,
                    ...dischargeDoc.data(),
                    createdAt: dischargeDoc.data().createdAt?.toDate() || new Date(),
                    updatedAt: dischargeDoc.data().updatedAt?.toDate() || new Date()
                } as Discharge;

                setDischarge(dischargeData);

                // Generate mock dose events and symptom logs for demonstration
                // In a real implementation, these would come from Firestore collections
                generateMockData(dischargeData);

                setLoading(false);
            } catch (err) {
                console.error('Error loading patient data:', err);
                setError('Failed to load patient data');
                setLoading(false);
            }
        };

        loadPatientData();
    }, [id, vetUser]);

    // Generate mock data for demonstration
    const generateMockData = (discharge: Discharge) => {
        const now = new Date();
        const startDate = discharge.createdAt;
        const daysSinceStart = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

        const mockDoses: DoseEvent[] = [];
        const mockSymptoms: SymptomLog[] = [];

        // Generate dose events for the last 14 days
        for (let day = 0; day < Math.min(14, daysSinceStart + 1); day++) {
            const eventDate = new Date(now.getTime() - (day * 24 * 60 * 60 * 1000));

            discharge.medications.forEach((medication, medIndex) => {
                const frequency = medication.frequency || 1;
                const timesPerDay = typeof frequency === 'number' && frequency > 0 ? frequency : 1;

                for (let dose = 0; dose < timesPerDay; dose++) {
                    const scheduledHour = 8 + (dose * (12 / timesPerDay));
                    const scheduledTime = new Date(eventDate);
                    scheduledTime.setHours(scheduledHour, 0, 0, 0);

                    // Simulate some missed doses (20% chance)
                    const status = Math.random() < 0.8 ? 'given' : 'missed';
                    const actualTime = status === 'given'
                        ? new Date(scheduledTime.getTime() + (Math.random() - 0.5) * 60 * 60 * 1000) // Within 30 min
                        : undefined;

                    mockDoses.push({
                        id: `dose-${day}-${medIndex}-${dose}`,
                        dischargeId: discharge.id,
                        medicationName: medication.name,
                        scheduledTime,
                        actualTime,
                        status,
                        notes: status === 'missed' && Math.random() < 0.3 ? 'Pet refused medication' : undefined,
                        createdAt: actualTime || scheduledTime
                    });
                }
            });

            // Generate daily symptom log (80% chance)
            if (Math.random() < 0.8) {
                mockSymptoms.push({
                    id: `symptom-${day}`,
                    dischargeId: discharge.id,
                    logDate: eventDate,
                    appetite: Math.floor(Math.random() * 5) + 1,
                    energy: Math.floor(Math.random() * 5) + 1,
                    panting: Math.random() < 0.3,
                    notes: Math.random() < 0.4 ? 'Pet seems to be feeling better today' : undefined,
                    createdAt: eventDate
                });
            }
        }

        setDoseEvents(mockDoses.sort((a, b) => b.scheduledTime.getTime() - a.scheduledTime.getTime()));
        setSymptomLogs(mockSymptoms.sort((a, b) => b.logDate.getTime() - a.logDate.getTime()));
    };

    // Calculate adherence metrics
    const calculateMetrics = () => {
        const totalDoses = doseEvents.length;
        const givenDoses = doseEvents.filter(d => d.status === 'given').length;
        const missedDoses = doseEvents.filter(d => d.status === 'missed').length;
        const adherenceRate = totalDoses > 0 ? Math.round((givenDoses / totalDoses) * 100) : 0;

        // Calculate streak (consecutive days with all doses given)
        const dayGroups = new Map<string, DoseEvent[]>();
        doseEvents.forEach(dose => {
            const dayKey = dose.scheduledTime.toDateString();
            if (!dayGroups.has(dayKey)) {
                dayGroups.set(dayKey, []);
            }
            dayGroups.get(dayKey)!.push(dose);
        });

        let currentStreak = 0;
        const sortedDays = Array.from(dayGroups.entries()).sort((a, b) =>
            new Date(b[0]).getTime() - new Date(a[0]).getTime()
        );

        for (const [, dayDoses] of sortedDays) {
            const allGiven = dayDoses.every(d => d.status === 'given');
            if (allGiven) {
                currentStreak++;
            } else {
                break;
            }
        }

        return {
            totalDoses,
            givenDoses,
            missedDoses,
            adherenceRate,
            currentStreak,
            longestStreak: currentStreak // Simplified for demo
        };
    };

    const metrics = calculateMetrics();

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    };

    const formatFrequency = (frequency: number) => {
        const option = getFrequencyOption(frequency);
        return option ? option.label : `${frequency}x daily`;
    };

    if (authLoading || loading) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#f8fafc'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        width: '48px',
                        height: '48px',
                        border: '3px solid #e2e8f0',
                        borderTop: '3px solid #2563eb',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        margin: '0 auto 1rem auto'
                    }} />
                    <p style={{ color: '#64748b', fontSize: '1rem' }}>Loading patient details...</p>
                </div>
            </div>
        );
    }

    if (error || !discharge) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#f8fafc'
            }}>
                <div style={{ textAlign: 'center', maxWidth: '400px' }}>
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
                        color: '#6b7280',
                        marginBottom: '2rem'
                    }}>
                        {error || 'This patient may have been removed or you may not have access.'}
                    </p>
                    <Link
                        href="/dashboard/patients"
                        style={{
                            backgroundColor: '#2563eb',
                            color: 'white',
                            padding: '0.75rem 1.5rem',
                            borderRadius: '8px',
                            textDecoration: 'none',
                            fontWeight: '600'
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
            {/* Header */}
            <header style={{
                backgroundColor: 'white',
                borderBottom: '1px solid #e2e8f0',
                padding: '1rem 2rem',
                position: 'sticky',
                top: 0,
                zIndex: 10,
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}>
                <div style={{
                    maxWidth: '1200px',
                    margin: '0 auto',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    {/* Back Navigation */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <Link
                            href="/dashboard/patients"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                color: '#64748b',
                                textDecoration: 'none',
                                fontSize: '0.875rem',
                                fontWeight: '400',
                                transition: 'color 0.2s ease'
                            }}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="15,18 9,12 15,6" />
                            </svg>
                            Back to Patients
                        </Link>

                        <div style={{
                            width: '1px',
                            height: '16px',
                            backgroundColor: '#e2e8f0'
                        }} />

                        <h1 style={{
                            fontSize: '1.25rem',
                            fontWeight: '600',
                            color: '#1e293b',
                            margin: '0'
                        }}>
                            {discharge.pet.name} - Patient Details
                        </h1>
                    </div>

                    {/* User Info */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem'
                    }}>
                        <div style={{
                            width: '32px',
                            height: '32px',
                            backgroundColor: '#2563eb',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: '0.875rem',
                            fontWeight: '600'
                        }}>
                            {vetUser?.firstName?.[0] || 'U'}
                        </div>
                        <div>
                            <div style={{
                                fontSize: '0.875rem',
                                fontWeight: '600',
                                color: '#1e293b'
                            }}>
                                Dr. {vetUser?.firstName} {vetUser?.lastName}
                            </div>
                            <div style={{
                                fontSize: '0.75rem',
                                color: '#64748b'
                            }}>
                                {clinic?.name}
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main style={{
                maxWidth: '1200px',
                margin: '0 auto',
                padding: '2rem'
            }}>
                {/* Patient Header */}
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '16px',
                    padding: '2rem',
                    marginBottom: '2rem',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                    border: '1px solid #e2e8f0'
                }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '1.5rem'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{
                                width: '64px',
                                height: '64px',
                                backgroundColor: '#007AFF',
                                borderRadius: '16px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '2rem'
                            }}>
                                🐾
                            </div>
                            <div>
                                <h2 style={{
                                    fontSize: '1.75rem',
                                    fontWeight: '700',
                                    color: '#1e293b',
                                    margin: '0 0 0.5rem 0'
                                }}>
                                    {discharge.pet.name}
                                </h2>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '1rem',
                                    fontSize: '0.875rem',
                                    color: '#64748b'
                                }}>
                                    <span>{discharge.pet.species}</span>
                                    {discharge.pet.weight && <span>• {discharge.pet.weight}</span>}
                                    <span>• Discharged {formatDate(discharge.createdAt)}</span>
                                </div>
                            </div>
                        </div>

                        <div style={{
                            backgroundColor: metrics.adherenceRate >= 85 ? '#dcfce7' : metrics.adherenceRate >= 70 ? '#fef3c7' : '#fee2e2',
                            color: metrics.adherenceRate >= 85 ? '#16a34a' : metrics.adherenceRate >= 70 ? '#d97706' : '#dc2626',
                            padding: '0.5rem 1rem',
                            borderRadius: '12px',
                            fontSize: '0.875rem',
                            fontWeight: '600'
                        }}>
                            {metrics.adherenceRate}% Adherence
                        </div>
                    </div>

                    {/* Quick Stats */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                        gap: '1rem'
                    }}>
                        <div style={{
                            backgroundColor: '#f8fafc',
                            padding: '1rem',
                            borderRadius: '8px',
                            textAlign: 'center'
                        }}>
                            <div style={{
                                fontSize: '1.5rem',
                                fontWeight: '700',
                                color: '#2563eb',
                                marginBottom: '0.25rem'
                            }}>
                                {discharge.medications.length}
                            </div>
                            <div style={{
                                fontSize: '0.75rem',
                                color: '#64748b',
                                fontWeight: '600'
                            }}>
                                Active Medications
                            </div>
                        </div>

                        <div style={{
                            backgroundColor: '#f8fafc',
                            padding: '1rem',
                            borderRadius: '8px',
                            textAlign: 'center'
                        }}>
                            <div style={{
                                fontSize: '1.5rem',
                                fontWeight: '700',
                                color: '#16a34a',
                                marginBottom: '0.25rem'
                            }}>
                                {metrics.givenDoses}
                            </div>
                            <div style={{
                                fontSize: '0.75rem',
                                color: '#64748b',
                                fontWeight: '600'
                            }}>
                                Doses Given
                            </div>
                        </div>

                        <div style={{
                            backgroundColor: '#f8fafc',
                            padding: '1rem',
                            borderRadius: '8px',
                            textAlign: 'center'
                        }}>
                            <div style={{
                                fontSize: '1.5rem',
                                fontWeight: '700',
                                color: '#ef4444',
                                marginBottom: '0.25rem'
                            }}>
                                {metrics.missedDoses}
                            </div>
                            <div style={{
                                fontSize: '0.75rem',
                                color: '#64748b',
                                fontWeight: '600'
                            }}>
                                Doses Missed
                            </div>
                        </div>

                        <div style={{
                            backgroundColor: '#f8fafc',
                            padding: '1rem',
                            borderRadius: '8px',
                            textAlign: 'center'
                        }}>
                            <div style={{
                                fontSize: '1.5rem',
                                fontWeight: '700',
                                color: '#f59e0b',
                                marginBottom: '0.25rem'
                            }}>
                                {metrics.currentStreak}
                            </div>
                            <div style={{
                                fontSize: '0.75rem',
                                color: '#64748b',
                                fontWeight: '600'
                            }}>
                                Day Streak
                            </div>
                        </div>

                        <div style={{
                            backgroundColor: '#f8fafc',
                            padding: '1rem',
                            borderRadius: '8px',
                            textAlign: 'center'
                        }}>
                            <div style={{
                                fontSize: '1.5rem',
                                fontWeight: '700',
                                color: '#8b5cf6',
                                marginBottom: '0.25rem'
                            }}>
                                {symptomLogs.length}
                            </div>
                            <div style={{
                                fontSize: '0.75rem',
                                color: '#64748b',
                                fontWeight: '600'
                            }}>
                                Symptom Logs
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '16px',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                    border: '1px solid #e2e8f0',
                    overflow: 'hidden'
                }}>
                    {/* Tab Navigation */}
                    <div style={{
                        display: 'flex',
                        borderBottom: '1px solid #e2e8f0',
                        backgroundColor: '#f8fafc'
                    }}>
                        {[
                            { id: 'overview', label: 'Overview', icon: '📊' },
                            { id: 'medications', label: 'Medications', icon: '💊' },
                            { id: 'symptoms', label: 'Symptoms', icon: '📈' },
                            { id: 'timeline', label: 'Timeline', icon: '📅' }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as 'overview' | 'medications' | 'symptoms' | 'timeline')}
                                style={{
                                    padding: '1rem 1.5rem',
                                    backgroundColor: activeTab === tab.id ? 'white' : 'transparent',
                                    border: 'none',
                                    borderBottom: activeTab === tab.id ? '2px solid #2563eb' : '2px solid transparent',
                                    color: activeTab === tab.id ? '#2563eb' : '#64748b',
                                    fontSize: '0.875rem',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}
                            >
                                <span>{tab.icon}</span>
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Tab Content */}
                    <div style={{ padding: '2rem' }}>
                        {activeTab === 'overview' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                                {/* Recent Activity */}
                                <div>
                                    <h3 style={{
                                        fontSize: '1.25rem',
                                        fontWeight: '600',
                                        color: '#1e293b',
                                        marginBottom: '1rem'
                                    }}>
                                        Recent Activity
                                    </h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        {doseEvents.slice(0, 5).map((dose) => (
                                            <div key={dose.id} style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                padding: '0.75rem',
                                                backgroundColor: '#f8fafc',
                                                borderRadius: '8px',
                                                border: '1px solid #e2e8f0'
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                    <div style={{
                                                        width: '8px',
                                                        height: '8px',
                                                        borderRadius: '50%',
                                                        backgroundColor: dose.status === 'given' ? '#16a34a' : '#ef4444'
                                                    }} />
                                                    <div>
                                                        <div style={{
                                                            fontSize: '0.875rem',
                                                            fontWeight: '600',
                                                            color: '#1e293b'
                                                        }}>
                                                            {dose.medicationName}
                                                        </div>
                                                        <div style={{
                                                            fontSize: '0.75rem',
                                                            color: '#64748b'
                                                        }}>
                                                            {dose.status === 'given' ? 'Given' : 'Missed'} at {formatTime(dose.actualTime || dose.scheduledTime)}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div style={{
                                                    fontSize: '0.75rem',
                                                    color: '#64748b'
                                                }}>
                                                    {formatDate(dose.scheduledTime)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Recent Symptoms */}
                                {symptomLogs.length > 0 && (
                                    <div>
                                        <h3 style={{
                                            fontSize: '1.25rem',
                                            fontWeight: '600',
                                            color: '#1e293b',
                                            marginBottom: '1rem'
                                        }}>
                                            Recent Symptoms
                                        </h3>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                            {symptomLogs.slice(0, 3).map((symptom) => (
                                                <div key={symptom.id} style={{
                                                    padding: '1rem',
                                                    backgroundColor: '#f8fafc',
                                                    borderRadius: '8px',
                                                    border: '1px solid #e2e8f0'
                                                }}>
                                                    <div style={{
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        marginBottom: '0.5rem'
                                                    }}>
                                                        <div style={{
                                                            fontSize: '0.875rem',
                                                            fontWeight: '600',
                                                            color: '#1e293b'
                                                        }}>
                                                            Symptom Log
                                                        </div>
                                                        <div style={{
                                                            fontSize: '0.75rem',
                                                            color: '#64748b'
                                                        }}>
                                                            {formatDate(symptom.logDate)}
                                                        </div>
                                                    </div>
                                                    <div style={{
                                                        display: 'grid',
                                                        gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
                                                        gap: '0.5rem',
                                                        fontSize: '0.75rem'
                                                    }}>
                                                        <div>
                                                            <span style={{ color: '#64748b' }}>Appetite:</span> {symptom.appetite}/5
                                                        </div>
                                                        <div>
                                                            <span style={{ color: '#64748b' }}>Energy:</span> {symptom.energy}/5
                                                        </div>
                                                        <div>
                                                            <span style={{ color: '#64748b' }}>Panting:</span> {symptom.panting ? 'Yes' : 'No'}
                                                        </div>
                                                    </div>
                                                    {symptom.notes && (
                                                        <div style={{
                                                            marginTop: '0.5rem',
                                                            fontSize: '0.75rem',
                                                            color: '#374151',
                                                            fontStyle: 'italic'
                                                        }}>
                                                            &quot;{symptom.notes}&quot;
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'medications' && (
                            <div>
                                <h3 style={{
                                    fontSize: '1.25rem',
                                    fontWeight: '600',
                                    color: '#1e293b',
                                    marginBottom: '1.5rem'
                                }}>
                                    Prescribed Medications
                                </h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {discharge.medications.map((medication, index) => (
                                        <div key={index} style={{
                                            padding: '1.5rem',
                                            backgroundColor: '#f8fafc',
                                            borderRadius: '12px',
                                            border: '1px solid #e2e8f0'
                                        }}>
                                            <div style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'flex-start',
                                                marginBottom: '1rem'
                                            }}>
                                                <h4 style={{
                                                    fontSize: '1.125rem',
                                                    fontWeight: '600',
                                                    color: '#1e293b',
                                                    margin: '0'
                                                }}>
                                                    {medication.name}
                                                    {medication.isTapered && (
                                                        <span style={{
                                                            marginLeft: '0.5rem',
                                                            fontSize: '0.75rem',
                                                            backgroundColor: '#ddd6fe',
                                                            color: '#7c3aed',
                                                            padding: '0.25rem 0.5rem',
                                                            borderRadius: '12px',
                                                            fontWeight: '500'
                                                        }}>
                                                            TAPERED
                                                        </span>
                                                    )}
                                                </h4>
                                            </div>

                                            {!medication.isTapered ? (
                                                <div style={{
                                                    display: 'grid',
                                                    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                                                    gap: '1rem',
                                                    marginBottom: '1rem'
                                                }}>
                                                    <div>
                                                        <div style={{
                                                            fontSize: '0.75rem',
                                                            fontWeight: '600',
                                                            color: '#64748b',
                                                            marginBottom: '0.25rem'
                                                        }}>
                                                            DOSAGE
                                                        </div>
                                                        <div style={{
                                                            fontSize: '0.875rem',
                                                            color: '#1e293b'
                                                        }}>
                                                            {medication.dosage}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div style={{
                                                            fontSize: '0.75rem',
                                                            fontWeight: '600',
                                                            color: '#64748b',
                                                            marginBottom: '0.25rem'
                                                        }}>
                                                            FREQUENCY
                                                        </div>
                                                        <div style={{
                                                            fontSize: '0.875rem',
                                                            color: '#1e293b'
                                                        }}>
                                                            {formatFrequency(medication.frequency || 1)}
                                                        </div>
                                                    </div>
                                                    {medication.customTimes && medication.customTimes.length > 0 && (
                                                        <div>
                                                            <div style={{
                                                                fontSize: '0.75rem',
                                                                fontWeight: '600',
                                                                color: '#64748b',
                                                                marginBottom: '0.25rem'
                                                            }}>
                                                                TIMES
                                                            </div>
                                                            <div style={{
                                                                fontSize: '0.875rem',
                                                                color: '#1e293b'
                                                            }}>
                                                                {medication.customTimes.join(', ')}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div style={{ marginBottom: '1rem' }}>
                                                    <div style={{
                                                        fontSize: '0.75rem',
                                                        fontWeight: '600',
                                                        color: '#64748b',
                                                        marginBottom: '0.75rem'
                                                    }}>
                                                        TAPER SCHEDULE
                                                    </div>
                                                    {medication.taperStages.map((stage, stageIndex) => (
                                                        <div key={stageIndex} style={{
                                                            backgroundColor: 'white',
                                                            padding: '0.75rem',
                                                            borderRadius: '8px',
                                                            marginBottom: stageIndex < medication.taperStages.length - 1 ? '0.5rem' : '0',
                                                            border: '1px solid #e2e8f0'
                                                        }}>
                                                            <div style={{
                                                                fontSize: '0.75rem',
                                                                fontWeight: '600',
                                                                color: '#7c3aed',
                                                                marginBottom: '0.5rem'
                                                            }}>
                                                                Stage {stageIndex + 1}: {formatDate(new Date(stage.startDate))} - {formatDate(new Date(stage.endDate))}
                                                            </div>
                                                            <div style={{
                                                                display: 'grid',
                                                                gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))',
                                                                gap: '0.5rem',
                                                                fontSize: '0.75rem'
                                                            }}>
                                                                <div>
                                                                    <span style={{ color: '#64748b' }}>Dosage:</span> {stage.dosage}
                                                                </div>
                                                                <div>
                                                                    <span style={{ color: '#64748b' }}>Frequency:</span> {formatFrequency(stage.frequency)}
                                                                </div>
                                                                {stage.times.length > 0 && (
                                                                    <div>
                                                                        <span style={{ color: '#64748b' }}>Times:</span> {stage.times.join(', ')}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            <div style={{
                                                backgroundColor: 'white',
                                                padding: '0.75rem',
                                                borderRadius: '8px',
                                                border: '1px solid #e2e8f0'
                                            }}>
                                                <div style={{
                                                    fontSize: '0.75rem',
                                                    fontWeight: '600',
                                                    color: '#64748b',
                                                    marginBottom: '0.25rem'
                                                }}>
                                                    INSTRUCTIONS
                                                </div>
                                                <div style={{
                                                    fontSize: '0.875rem',
                                                    color: '#1e293b',
                                                    lineHeight: '1.4'
                                                }}>
                                                    {medication.instructions}
                                                </div>
                                            </div>

                                            {/* Medication adherence for this specific medication */}
                                            <div style={{
                                                marginTop: '1rem',
                                                padding: '0.75rem',
                                                backgroundColor: 'white',
                                                borderRadius: '8px',
                                                border: '1px solid #e2e8f0'
                                            }}>
                                                <div style={{
                                                    fontSize: '0.75rem',
                                                    fontWeight: '600',
                                                    color: '#64748b',
                                                    marginBottom: '0.5rem'
                                                }}>
                                                    ADHERENCE RATE
                                                </div>
                                                {(() => {
                                                    const medDoses = doseEvents.filter(d => d.medicationName === medication.name);
                                                    const medGiven = medDoses.filter(d => d.status === 'given').length;
                                                    const medRate = medDoses.length > 0 ? Math.round((medGiven / medDoses.length) * 100) : 0;
                                                    return (
                                                        <div style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '0.75rem'
                                                        }}>
                                                            <div style={{
                                                                fontSize: '1.25rem',
                                                                fontWeight: '700',
                                                                color: medRate >= 85 ? '#16a34a' : medRate >= 70 ? '#f59e0b' : '#ef4444'
                                                            }}>
                                                                {medRate}%
                                                            </div>
                                                            <div style={{
                                                                fontSize: '0.75rem',
                                                                color: '#64748b'
                                                            }}>
                                                                ({medGiven}/{medDoses.length} doses given)
                                                            </div>
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeTab === 'symptoms' && (
                            <div>
                                <h3 style={{
                                    fontSize: '1.25rem',
                                    fontWeight: '600',
                                    color: '#1e293b',
                                    marginBottom: '1.5rem'
                                }}>
                                    Symptom Tracking
                                </h3>

                                {symptomLogs.length === 0 ? (
                                    <div style={{
                                        textAlign: 'center',
                                        padding: '3rem',
                                        color: '#6b7280'
                                    }}>
                                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📊</div>
                                        <h4 style={{
                                            fontSize: '1.125rem',
                                            fontWeight: '600',
                                            marginBottom: '0.5rem',
                                            color: '#374151'
                                        }}>
                                            No Symptom Logs Yet
                                        </h4>
                                        <p style={{ fontSize: '0.875rem' }}>
                                            The pet owner hasn&apos;t logged any symptoms yet. Encourage them to track their pet&apos;s daily symptoms in the PawScript app.
                                        </p>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        {symptomLogs.map((symptom) => (
                                            <div key={symptom.id} style={{
                                                padding: '1.5rem',
                                                backgroundColor: '#f8fafc',
                                                borderRadius: '12px',
                                                border: '1px solid #e2e8f0'
                                            }}>
                                                <div style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    marginBottom: '1rem'
                                                }}>
                                                    <h4 style={{
                                                        fontSize: '1rem',
                                                        fontWeight: '600',
                                                        color: '#1e293b',
                                                        margin: '0'
                                                    }}>
                                                        Daily Symptoms
                                                    </h4>
                                                    <div style={{
                                                        fontSize: '0.875rem',
                                                        color: '#64748b',
                                                        fontWeight: '500'
                                                    }}>
                                                        {formatDate(symptom.logDate)}
                                                    </div>
                                                </div>

                                                <div style={{
                                                    display: 'grid',
                                                    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                                                    gap: '1rem',
                                                    marginBottom: symptom.notes ? '1rem' : '0'
                                                }}>
                                                    <div style={{
                                                        backgroundColor: 'white',
                                                        padding: '0.75rem',
                                                        borderRadius: '8px',
                                                        border: '1px solid #e2e8f0',
                                                        textAlign: 'center'
                                                    }}>
                                                        <div style={{
                                                            fontSize: '0.75rem',
                                                            fontWeight: '600',
                                                            color: '#64748b',
                                                            marginBottom: '0.25rem'
                                                        }}>
                                                            APPETITE
                                                        </div>
                                                        <div style={{
                                                            fontSize: '1.25rem',
                                                            fontWeight: '700',
                                                            color: symptom.appetite >= 4 ? '#16a34a' : symptom.appetite >= 3 ? '#f59e0b' : '#ef4444'
                                                        }}>
                                                            {symptom.appetite}/5
                                                        </div>
                                                    </div>

                                                    <div style={{
                                                        backgroundColor: 'white',
                                                        padding: '0.75rem',
                                                        borderRadius: '8px',
                                                        border: '1px solid #e2e8f0',
                                                        textAlign: 'center'
                                                    }}>
                                                        <div style={{
                                                            fontSize: '0.75rem',
                                                            fontWeight: '600',
                                                            color: '#64748b',
                                                            marginBottom: '0.25rem'
                                                        }}>
                                                            ENERGY
                                                        </div>
                                                        <div style={{
                                                            fontSize: '1.25rem',
                                                            fontWeight: '700',
                                                            color: symptom.energy >= 4 ? '#16a34a' : symptom.energy >= 3 ? '#f59e0b' : '#ef4444'
                                                        }}>
                                                            {symptom.energy}/5
                                                        </div>
                                                    </div>

                                                    <div style={{
                                                        backgroundColor: 'white',
                                                        padding: '0.75rem',
                                                        borderRadius: '8px',
                                                        border: '1px solid #e2e8f0',
                                                        textAlign: 'center'
                                                    }}>
                                                        <div style={{
                                                            fontSize: '0.75rem',
                                                            fontWeight: '600',
                                                            color: '#64748b',
                                                            marginBottom: '0.25rem'
                                                        }}>
                                                            PANTING
                                                        </div>
                                                        <div style={{
                                                            fontSize: '1.25rem',
                                                            fontWeight: '700',
                                                            color: symptom.panting ? '#f59e0b' : '#16a34a'
                                                        }}>
                                                            {symptom.panting ? 'Yes' : 'No'}
                                                        </div>
                                                    </div>
                                                </div>

                                                {symptom.notes && (
                                                    <div style={{
                                                        backgroundColor: 'white',
                                                        padding: '0.75rem',
                                                        borderRadius: '8px',
                                                        border: '1px solid #e2e8f0'
                                                    }}>
                                                        <div style={{
                                                            fontSize: '0.75rem',
                                                            fontWeight: '600',
                                                            color: '#64748b',
                                                            marginBottom: '0.25rem'
                                                        }}>
                                                            NOTES
                                                        </div>
                                                        <div style={{
                                                            fontSize: '0.875rem',
                                                            color: '#374151',
                                                            lineHeight: '1.4',
                                                            fontStyle: 'italic'
                                                        }}>
                                                            &quot;{symptom.notes}&quot;
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'timeline' && (
                            <div>
                                <h3 style={{
                                    fontSize: '1.25rem',
                                    fontWeight: '600',
                                    color: '#1e293b',
                                    marginBottom: '1.5rem'
                                }}>
                                    Treatment Timeline
                                </h3>

                                <div style={{ position: 'relative' }}>
                                    {/* Timeline line */}
                                    <div style={{
                                        position: 'absolute',
                                        left: '1rem',
                                        top: '0',
                                        bottom: '0',
                                        width: '2px',
                                        backgroundColor: '#e2e8f0'
                                    }} />

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        {/* Combine and sort all events */}
                                        {(() => {
                                            const allEvents = [
                                                ...doseEvents.map(d => ({ ...d, type: 'dose' as const })),
                                                ...symptomLogs.map(s => ({ ...s, type: 'symptom' as const, scheduledTime: s.logDate }))
                                            ].sort((a, b) => b.scheduledTime.getTime() - a.scheduledTime.getTime());

                                            return allEvents.slice(0, 20).map((event) => (
                                                <div key={`${event.type}-${event.id}`} style={{
                                                    position: 'relative',
                                                    paddingLeft: '3rem'
                                                }}>
                                                    {/* Timeline dot */}
                                                    <div style={{
                                                        position: 'absolute',
                                                        left: '0.75rem',
                                                        top: '0.75rem',
                                                        width: '0.5rem',
                                                        height: '0.5rem',
                                                        borderRadius: '50%',
                                                        backgroundColor: event.type === 'dose'
                                                            ? (event.status === 'given' ? '#16a34a' : '#ef4444')
                                                            : '#8b5cf6'
                                                    }} />

                                                    <div style={{
                                                        padding: '1rem',
                                                        backgroundColor: '#f8fafc',
                                                        borderRadius: '8px',
                                                        border: '1px solid #e2e8f0'
                                                    }}>
                                                        {event.type === 'dose' ? (
                                                            <div>
                                                                <div style={{
                                                                    display: 'flex',
                                                                    justifyContent: 'space-between',
                                                                    alignItems: 'center',
                                                                    marginBottom: '0.5rem'
                                                                }}>
                                                                    <div style={{
                                                                        fontSize: '0.875rem',
                                                                        fontWeight: '600',
                                                                        color: '#1e293b'
                                                                    }}>
                                                                        💊 {event.medicationName}
                                                                    </div>
                                                                    <div style={{
                                                                        fontSize: '0.75rem',
                                                                        color: '#64748b'
                                                                    }}>
                                                                        {formatDate(event.scheduledTime)} at {formatTime(event.scheduledTime)}
                                                                    </div>
                                                                </div>
                                                                <div style={{
                                                                    fontSize: '0.75rem',
                                                                    color: event.status === 'given' ? '#16a34a' : '#ef4444',
                                                                    fontWeight: '600'
                                                                }}>
                                                                    {event.status === 'given' ? '✅ Dose Given' : '❌ Dose Missed'}
                                                                    {event.actualTime && event.status === 'given' && (
                                                                        <span style={{ color: '#64748b', fontWeight: '400' }}>
                                                                            {' '}at {formatTime(event.actualTime)}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {event.notes && (
                                                                    <div style={{
                                                                        fontSize: '0.75rem',
                                                                        color: '#374151',
                                                                        marginTop: '0.25rem',
                                                                        fontStyle: 'italic'
                                                                    }}>
                                                                        &quot;{event.notes}&quot;
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <div>
                                                                <div style={{
                                                                    display: 'flex',
                                                                    justifyContent: 'space-between',
                                                                    alignItems: 'center',
                                                                    marginBottom: '0.5rem'
                                                                }}>
                                                                    <div style={{
                                                                        fontSize: '0.875rem',
                                                                        fontWeight: '600',
                                                                        color: '#1e293b'
                                                                    }}>
                                                                        📊 Symptom Log
                                                                    </div>
                                                                    <div style={{
                                                                        fontSize: '0.75rem',
                                                                        color: '#64748b'
                                                                    }}>
                                                                        {formatDate(event.logDate)}
                                                                    </div>
                                                                </div>
                                                                <div style={{
                                                                    display: 'flex',
                                                                    gap: '1rem',
                                                                    fontSize: '0.75rem',
                                                                    color: '#374151'
                                                                }}>
                                                                    <span>Appetite: {event.appetite}/5</span>
                                                                    <span>Energy: {event.energy}/5</span>
                                                                    <span>Panting: {event.panting ? 'Yes' : 'No'}</span>
                                                                </div>
                                                                {event.notes && (
                                                                    <div style={{
                                                                        fontSize: '0.75rem',
                                                                        color: '#374151',
                                                                        marginTop: '0.25rem',
                                                                        fontStyle: 'italic'
                                                                    }}>
                                                                        &quot;{event.notes}&quot;
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ));
                                        })()}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Spinning animation */}
            <style jsx>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}