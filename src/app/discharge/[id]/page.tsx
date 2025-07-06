// src/app/discharge/[id]/page.tsx - Updated with new mobile app fields
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { doc, getDoc } from 'firebase/firestore';
import { Discharge } from '@/types/discharge';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/types/firestore';
import { getFrequencyOption } from '@/data/medicationTemplates';

export default function PublicDischargePage() {
    const { id } = useParams();
    const [discharge, setDischarge] = useState<Discharge | null>(null);
    const [dischargeRaw, setDischargeRaw] = useState<Record<string, unknown> | null>(null); // For accessing extra fields
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const loadDischarge = async () => {
            if (!id || typeof id !== 'string') {
                setError('Invalid discharge ID');
                setLoading(false);
                return;
            }

            try {
                console.log('Loading discharge:', id);
                const docRef = doc(db, COLLECTIONS.DISCHARGES, id);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();

                    // Store raw data for mobile app fields
                    setDischargeRaw(data);
                    console.log('Raw discharge data for mobile app:', data);
                    console.log('New fields check:', {
                        clinicName: data.clinicName,
                        vetFirstName: data.vetFirstName,
                        vetLastName: data.vetLastName,
                        vetPhone: data.vetPhone
                    });

                    const dischargeData: Discharge = {
                        id: docSnap.id,
                        pet: data.pet,
                        medications: data.medications,
                        notes: data.notes,
                        visitDate: data.visitDate?.toDate ? data.visitDate.toDate() : (data.visitDate ? new Date(data.visitDate) : undefined),
                        diagnosis: data.diagnosis,
                        vetId: data.vetId,
                        clinicId: data.clinicId,
                        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
                        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt),
                    };

                    console.log('Loaded discharge:', dischargeData);
                    console.log('Raw discharge data for mobile app:', data);
                    setDischarge(dischargeData);
                } else {
                    setError('Discharge summary not found');
                }
            } catch (err) {
                console.error('Error loading discharge:', err);
                setError('Failed to load discharge summary');
            } finally {
                setLoading(false);
            }
        };

        loadDischarge();
    }, [id]);

    // Helper function to format frequency display
    const formatFrequency = (frequency: number) => {
        const option = getFrequencyOption(frequency);
        return option ? option.label : `${frequency}x daily`;
    };

    // Helper function to format date
    const formatDate = (dateString: string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    if (loading) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#f8fafc',
                padding: '1rem'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        width: '48px',
                        height: '48px',
                        border: '3px solid #e2e8f0',
                        borderTop: '3px solid #007AFF',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        margin: '0 auto 1rem auto'
                    }} />
                    <p style={{ color: '#64748b', fontSize: '1rem' }}>Loading discharge summary...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#f8fafc',
                padding: '1rem'
            }}>
                <div style={{ textAlign: 'center', maxWidth: '400px' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
                    <h1 style={{
                        fontSize: '1.5rem',
                        fontWeight: '600',
                        color: '#dc2626',
                        marginBottom: '0.5rem'
                    }}>
                        Discharge Not Found
                    </h1>
                    <p style={{
                        color: '#6b7280',
                        marginBottom: '2rem',
                        lineHeight: '1.5'
                    }}>
                        {error}. This discharge summary may have been removed or the link may be incorrect.
                    </p>
                    <a
                        href="https://apps.apple.com/app/pawscript/id1234567890"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            display: 'inline-block',
                            backgroundColor: '#007AFF',
                            color: 'white',
                            padding: '0.75rem 1.5rem',
                            borderRadius: '12px',
                            textDecoration: 'none',
                            fontWeight: '600'
                        }}
                    >
                        Download PawScript App
                    </a>
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
                backgroundColor: '#007AFF',
                color: 'white',
                padding: '1.5rem 1rem',
                textAlign: 'center'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.75rem',
                    marginBottom: '1rem'
                }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        position: 'relative',
                        borderRadius: '8px',
                        overflow: 'hidden'
                    }}>
                        <Image
                            src="/images/pawscript-logo.png"
                            alt="PawScript Logo"
                            fill
                            style={{ objectFit: 'cover' }}
                        />
                    </div>
                    <h1 style={{
                        fontSize: '1.5rem',
                        fontWeight: '700',
                        margin: '0'
                    }}>
                        PawScript
                    </h1>
                </div>
                <p style={{
                    fontSize: '1rem',
                    margin: '0',
                    opacity: 0.9
                }}>
                    Discharge Summary for {discharge?.pet.name}
                </p>
            </header>

            {/* Main Content */}
            <main style={{
                maxWidth: '600px',
                margin: '0 auto',
                padding: '1.5rem 1rem'
            }}>
                {/* Clinic Information - NEW */}
                {(typeof dischargeRaw?.clinicName === 'string' || typeof dischargeRaw?.vetFirstName === 'string' || typeof dischargeRaw?.vetLastName === 'string') && (
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '16px',
                        padding: '1.5rem',
                        marginBottom: '1.5rem',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                        border: '1px solid #e2e8f0'
                    }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1rem',
                            marginBottom: '1rem'
                        }}>
                            <div style={{
                                width: '48px',
                                height: '48px',
                                backgroundColor: '#34C759',
                                borderRadius: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1.5rem'
                            }}>
                                🏥
                            </div>
                            <div>
                                <h2 style={{
                                    fontSize: '1.25rem',
                                    fontWeight: '700',
                                    color: '#1e293b',
                                    margin: '0 0 0.25rem 0'
                                }}>
                                    {typeof dischargeRaw?.clinicName === 'string' ? dischargeRaw.clinicName : 'Veterinary Clinic'}
                                </h2>
                                <p style={{
                                    fontSize: '0.875rem',
                                    color: '#64748b',
                                    margin: '0'
                                }}>
                                    {typeof dischargeRaw?.vetFirstName === 'string' && typeof dischargeRaw?.vetLastName === 'string' &&
                                        `Dr. ${dischargeRaw.vetFirstName} ${dischargeRaw.vetLastName}`
                                    }
                                    {typeof dischargeRaw?.vetPhone === 'string' && (
                                        <span style={{ marginLeft: '0.5rem' }}>
                                            • {dischargeRaw.vetPhone}
                                        </span>
                                    )}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Pet Information */}
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '16px',
                    padding: '1.5rem',
                    marginBottom: '1.5rem',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                    border: '1px solid #e2e8f0'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        marginBottom: '1rem'
                    }}>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            backgroundColor: '#007AFF',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.5rem'
                        }}>
                            🐾
                        </div>
                        <div>
                            <h2 style={{
                                fontSize: '1.25rem',
                                fontWeight: '700',
                                color: '#1e293b',
                                margin: '0 0 0.25rem 0'
                            }}>
                                {discharge?.pet.name}
                            </h2>
                            <p style={{
                                fontSize: '0.875rem',
                                color: '#64748b',
                                margin: '0'
                            }}>
                                {discharge?.pet.species}
                                {discharge?.pet.weight && ` • ${discharge.pet.weight}`}
                            </p>
                        </div>
                    </div>

                    <div style={{
                        fontSize: '0.75rem',
                        color: '#94a3b8',
                        textAlign: 'center',
                        paddingTop: '1rem',
                        borderTop: '1px solid #f1f5f9'
                    }}>
                        Visit Date: {formatDate(discharge?.visitDate ? discharge.visitDate.toISOString().split('T')[0] : discharge?.createdAt.toISOString().split('T')[0] || '')}
                        {discharge?.diagnosis && (
                            <div style={{
                                fontSize: '0.875rem',
                                color: '#64748b',
                                textAlign: 'center',
                                marginTop: '0.5rem',
                                fontStyle: 'italic'
                            }}>
                                Reason for visit: {discharge.diagnosis}
                            </div>
                        )}
                    </div>
                </div>

                {/* Medications */}
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '16px',
                    padding: '1.5rem',
                    marginBottom: '1.5rem',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                    border: '1px solid #e2e8f0'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        marginBottom: '1.5rem'
                    }}>
                        <div style={{
                            width: '32px',
                            height: '32px',
                            backgroundColor: '#34C759',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1rem'
                        }}>
                            💊
                        </div>
                        <h3 style={{
                            fontSize: '1.125rem',
                            fontWeight: '600',
                            color: '#1e293b',
                            margin: '0'
                        }}>
                            Medications ({discharge?.medications.length || 0})
                        </h3>
                    </div>

                    {discharge?.medications.map((medication, index) => (
                        <div key={index} style={{
                            padding: '1rem',
                            backgroundColor: '#f8fafc',
                            borderRadius: '12px',
                            marginBottom: index < discharge.medications.length - 1 ? '1rem' : '0'
                        }}>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'flex-start',
                                marginBottom: '0.75rem'
                            }}>
                                <h4 style={{
                                    fontSize: '1rem',
                                    fontWeight: '600',
                                    color: '#1e293b',
                                    margin: '0'
                                }}>
                                    {medication.name}
                                    {medication.isTapered && (
                                        <span style={{
                                            marginLeft: '0.5rem',
                                            fontSize: '0.625rem',
                                            backgroundColor: '#ddd6fe',
                                            color: '#7c3aed',
                                            padding: '0.125rem 0.375rem',
                                            borderRadius: '8px',
                                            fontWeight: '500'
                                        }}>
                                            TAPERED
                                        </span>
                                    )}
                                    {/* NEW: Every Other Day Badge */}
                                    {medication.isEveryOtherDay && (
                                        <span style={{
                                            marginLeft: '0.5rem',
                                            fontSize: '0.625rem',
                                            backgroundColor: '#fef3c7',
                                            color: '#d97706',
                                            padding: '0.125rem 0.375rem',
                                            borderRadius: '8px',
                                            fontWeight: '500'
                                        }}>
                                            EVERY OTHER DAY
                                        </span>
                                    )}
                                </h4>
                                {/* NEW: Time Adjustment Badge */}
                                {medication.allowClientToAdjustTime && (
                                    <span style={{
                                        fontSize: '0.625rem',
                                        backgroundColor: '#dcfce7',
                                        color: '#16a34a',
                                        padding: '0.125rem 0.375rem',
                                        borderRadius: '8px',
                                        fontWeight: '500'
                                    }}>
                                        TIMES ADJUSTABLE
                                    </span>
                                )}
                            </div>

                            {/* Simple Medication */}
                            {!medication.isTapered && (
                                <div style={{ marginBottom: '0.75rem' }}>
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
                                        gap: '0.75rem',
                                        marginBottom: '0.75rem'
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
                                                {medication.dosage || 'As prescribed'}
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
                                                {medication.isEveryOtherDay ? 'Every other day' : formatFrequency(medication.frequency || 1)}
                                            </div>
                                        </div>
                                        {/* NEW: Total Doses Display */}
                                        {medication.totalDoses && (
                                            <div>
                                                <div style={{
                                                    fontSize: '0.75rem',
                                                    fontWeight: '600',
                                                    color: '#64748b',
                                                    marginBottom: '0.25rem'
                                                }}>
                                                    TOTAL DOSES
                                                </div>
                                                <div style={{
                                                    fontSize: '0.875rem',
                                                    color: '#1e293b'
                                                }}>
                                                    {medication.totalDoses}
                                                </div>
                                            </div>
                                        )}
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
                                    {(medication.startDate || medication.endDate) && (
                                        <div style={{
                                            display: 'grid',
                                            gridTemplateColumns: '1fr 1fr',
                                            gap: '0.75rem',
                                            marginBottom: '0.75rem'
                                        }}>
                                            {medication.startDate && (
                                                <div>
                                                    <div style={{
                                                        fontSize: '0.75rem',
                                                        fontWeight: '600',
                                                        color: '#64748b',
                                                        marginBottom: '0.25rem'
                                                    }}>
                                                        START DATE
                                                    </div>
                                                    <div style={{
                                                        fontSize: '0.875rem',
                                                        color: '#1e293b'
                                                    }}>
                                                        {formatDate(medication.startDate)}
                                                    </div>
                                                </div>
                                            )}
                                            {medication.endDate && (
                                                <div>
                                                    <div style={{
                                                        fontSize: '0.75rem',
                                                        fontWeight: '600',
                                                        color: '#64748b',
                                                        marginBottom: '0.25rem'
                                                    }}>
                                                        END DATE
                                                    </div>
                                                    <div style={{
                                                        fontSize: '0.875rem',
                                                        color: '#1e293b'
                                                    }}>
                                                        {formatDate(medication.endDate)}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Tapered Medication */}
                            {medication.isTapered && medication.taperStages.length > 0 && (
                                <div style={{ marginBottom: '0.75rem' }}>
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
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                marginBottom: '0.5rem'
                                            }}>
                                                <div style={{
                                                    fontSize: '0.75rem',
                                                    fontWeight: '600',
                                                    color: '#7c3aed'
                                                }}>
                                                    Stage {stageIndex + 1}: {formatDate(stage.startDate)} - {formatDate(stage.endDate)}
                                                </div>
                                                {/* NEW: EOD Badge for Taper Stages */}
                                                {stage.isEveryOtherDay && (
                                                    <span style={{
                                                        fontSize: '0.625rem',
                                                        backgroundColor: '#fef3c7',
                                                        color: '#d97706',
                                                        padding: '0.125rem 0.375rem',
                                                        borderRadius: '8px',
                                                        fontWeight: '500'
                                                    }}>
                                                        EOD
                                                    </span>
                                                )}
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
                                                    <span style={{ color: '#64748b' }}>Frequency:</span> {stage.isEveryOtherDay ? 'Every other day' : formatFrequency(stage.frequency)}
                                                </div>
                                                {/* NEW: Total Doses for Taper Stage */}
                                                {stage.totalDoses && (
                                                    <div>
                                                        <span style={{ color: '#64748b' }}>Total:</span> {stage.totalDoses}
                                                    </div>
                                                )}
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

                            {/* Instructions */}
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
                        </div>
                    ))}
                </div>

                {/* Additional Notes */}
                {discharge?.notes && (
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '16px',
                        padding: '1.5rem',
                        marginBottom: '1.5rem',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                        border: '1px solid #e2e8f0'
                    }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            marginBottom: '1rem'
                        }}>
                            <div style={{
                                width: '32px',
                                height: '32px',
                                backgroundColor: '#FF9500',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1rem'
                            }}>
                                📝
                            </div>
                            <h3 style={{
                                fontSize: '1.125rem',
                                fontWeight: '600',
                                color: '#1e293b',
                                margin: '0'
                            }}>
                                Additional Notes
                            </h3>
                        </div>
                        <div style={{
                            fontSize: '0.875rem',
                            color: '#374151',
                            lineHeight: '1.6',
                            backgroundColor: '#f8fafc',
                            padding: '1rem',
                            borderRadius: '8px'
                        }}>
                            {discharge.notes}
                        </div>
                    </div>
                )}

                {/* Download App CTA */}
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '16px',
                    padding: '2rem',
                    textAlign: 'center',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                    border: '2px solid #007AFF'
                }}>
                    <div style={{
                        width: '64px',
                        height: '64px',
                        backgroundColor: '#007AFF',
                        borderRadius: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 1rem auto',
                        fontSize: '1.5rem'
                    }}>
                        📱
                    </div>
                    <h3 style={{
                        fontSize: '1.25rem',
                        fontWeight: '700',
                        color: '#1e293b',
                        marginBottom: '0.5rem'
                    }}>
                        Get the PawScript App
                    </h3>
                    <p style={{
                        fontSize: '0.875rem',
                        color: '#64748b',
                        marginBottom: '1.5rem',
                        lineHeight: '1.5'
                    }}>
                        Download PawScript to automatically import this medication schedule, set up reminders, and track your pet&apos;s progress.
                    </p>
                    <a
                        href="https://apps.apple.com/app/pawscript/id1234567890"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            display: 'inline-block',
                            backgroundColor: '#007AFF',
                            color: 'white',
                            padding: '1rem 2rem',
                            borderRadius: '14px',
                            textDecoration: 'none',
                            fontWeight: '600',
                            fontSize: '1rem',
                            boxShadow: '0 4px 12px rgba(0, 122, 255, 0.25)',
                            transition: 'transform 0.2s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        📲 Download Free
                    </a>
                </div>
            </main>

            {/* Footer */}
            <footer style={{
                textAlign: 'center',
                padding: '2rem 1rem',
                color: '#94a3b8',
                fontSize: '0.875rem'
            }}>
                <p style={{ margin: '0' }}>
                    © 2025 PawScript. Making pet medication management simple.
                </p>
            </footer>

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