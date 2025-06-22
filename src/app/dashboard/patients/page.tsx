// src/app/dashboard/patients/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { collection, query, where, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/types/firestore';
import { PatientSummary, calculateAlertLevel } from '@/types/patientMonitoring';
import { Discharge } from '@/types/discharge';

export default function PatientDashboardPage() {
    const { vetUser, clinic } = useAuth();
    const { loading: authLoading } = useRequireAuth();

    const [patients, setPatients] = useState<PatientSummary[]>([]);
    const [loading, setLoading] = useState(true);

    // Remove unused state variables that are causing ESLint errors
    // const [searchTerm, setSearchTerm] = useState('');
    // const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
    // const [filterAlert, setFilterAlert] = useState<'all' | 'high' | 'medium' | 'low' | 'none'>('all');

    // Load patient summaries
    useEffect(() => {
        if (!vetUser || !clinic) return;

        const q = query(
            collection(db, COLLECTIONS.DISCHARGES),
            where('clinicId', '==', clinic.id),
            orderBy('createdAt', 'desc'),
            limit(100)
        );

        const unsubscribe = onSnapshot(q, async (snapshot) => {
            console.log('Loading patient summaries...');

            const summaries: PatientSummary[] = [];

            for (const doc of snapshot.docs) {
                const dischargeData = doc.data();
                const discharge = {
                    id: doc.id,
                    ...dischargeData,
                    createdAt: dischargeData.createdAt?.toDate() || new Date(),
                    updatedAt: dischargeData.updatedAt?.toDate() || new Date()
                } as Discharge;

                // TODO: In a real implementation, you'd fetch patientSync data here
                // For now, we'll create mock data based on the discharge
                const daysSinceCreated = Math.floor((Date.now() - discharge.createdAt.getTime()) / (1000 * 60 * 60 * 24));
                const mockAdherenceRate = Math.max(20, 100 - (daysSinceCreated * 5)); // Simulate declining adherence
                const isActive = daysSinceCreated < 30; // Consider active if created within 30 days

                // Generate mock pet parent names
                const petParentNames = ['Sarah Johnson', 'Mike Chen', 'Emily Rodriguez', 'David Wilson', 'Lisa Thompson', 'James Miller', 'Amanda Garcia', 'Ryan Davis'];
                const randomParentName = petParentNames[Math.floor(Math.random() * petParentNames.length)];

                const summary: PatientSummary = {
                    dischargeId: discharge.id,
                    petName: discharge.pet.name,
                    petSpecies: discharge.pet.species,
                    petParentName: randomParentName,
                    petParentEmail: `${randomParentName.toLowerCase().replace(' ', '.')}@email.com`,
                    createdAt: discharge.createdAt,
                    medicationCount: discharge.medications.length,
                    adherenceRate: mockAdherenceRate,
                    lastActivity: new Date(Date.now() - (Math.random() * 7 * 24 * 60 * 60 * 1000)), // Random within last week
                    isActive,
                    alertLevel: calculateAlertLevel(mockAdherenceRate, Math.random() * 10)
                };

                summaries.push(summary);
            }


            setPatients(summaries);
            setLoading(false);
        });

        return unsubscribe;
    }, [vetUser, clinic]);

    // Filter patients based on search and filters - simplified for coming soon page
    const filteredPatients = patients;

    // Utility functions for when the feature is implemented
    // const getAlertColor = (level: string) => {
    //     switch (level) {
    //         case 'high': return '#ef4444';
    //         case 'medium': return '#FF9500';
    //         case 'low': return '#eab308';
    //         default: return '#34C759';
    //     }
    // };

    // const getAlertText = (level: string) => {
    //     switch (level) {
    //         case 'high': return 'High Priority';
    //         case 'medium': return 'Medium Priority';
    //         case 'low': return 'Low Priority';
    //         default: return 'Good';
    //     }
    // };

    // const formatDate = (date: Date) => {
    //     return date.toLocaleDateString('en-US', {
    //         month: 'short',
    //         day: 'numeric',
    //         year: 'numeric'
    //     });
    // };

    // const formatTimeAgo = (date: Date) => {
    //     const now = new Date();
    //     const diffMs = now.getTime() - date.getTime();
    //     const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    //     if (diffDays === 0) return 'Today';
    //     if (diffDays === 1) return '1 day ago';
    //     if (diffDays < 7) return `${diffDays} days ago`;
    //     if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    //     return `${Math.floor(diffDays / 30)} months ago`;
    // };

    if (authLoading || loading) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#F2F2F7',
                fontFamily: 'Nunito, -apple-system, BlinkMacSystemFont, sans-serif'
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
                    <p style={{
                        color: '#6D6D72',
                        fontSize: '1rem',
                        fontWeight: '400'
                    }}>
                        Loading patients...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: '#F2F2F7',
            fontFamily: 'Nunito, -apple-system, BlinkMacSystemFont, sans-serif'
        }}>
            {/* Header */}
            <header style={{
                backgroundColor: '#FFFFFF',
                borderBottom: '1px solid #e2e8f0',
                padding: '1rem 2rem',
                position: 'sticky',
                top: 0,
                zIndex: 10,
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                backdropFilter: 'blur(10px)'
            }}>
                <div style={{
                    maxWidth: '1200px',
                    margin: '0 auto',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '1rem'
                }}>
                    {/* Logo & Navigation */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2rem',
                        flex: '1',
                        minWidth: '250px'
                    }}>
                        <Link
                            href="/dashboard"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                textDecoration: 'none',
                                transition: 'transform 0.2s ease'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        >
                            <div style={{
                                width: '36px',
                                height: '36px',
                                backgroundColor: '#007AFF',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 2px 8px rgba(0, 122, 255, 0.25)',
                                overflow: 'hidden'
                            }}>
                                <Image
                                    src="/images/pawscript-logo.png"
                                    alt="PawScript"
                                    width={20}
                                    height={20}
                                    style={{ objectFit: 'contain' }}
                                />
                            </div>
                            <span style={{
                                fontSize: '1.25rem',
                                fontWeight: '700',
                                color: '#1e293b'
                            }}>
                                PawScript
                            </span>
                        </Link>

                        <nav style={{
                            display: 'flex',
                            gap: '1.5rem',
                            alignItems: 'center'
                        }}>
                            <Link
                                href="/dashboard"
                                style={{
                                    color: '#6D6D72',
                                    textDecoration: 'none',
                                    fontSize: '0.875rem',
                                    fontWeight: '500',
                                    transition: 'all 0.2s ease',
                                    padding: '0.25rem 0'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.color = '#007AFF';
                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.color = '#6D6D72';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                }}
                            >
                                Dashboard
                            </Link>
                            <div style={{
                                color: '#007AFF',
                                textDecoration: 'none',
                                fontSize: '0.875rem',
                                fontWeight: '600',
                                borderBottom: '2px solid #007AFF',
                                paddingBottom: '0.25rem',
                                position: 'relative',
                                opacity: '0.6'
                            }}>
                                Patients
                                <span style={{
                                    backgroundColor: '#FF9500',
                                    color: 'white',
                                    fontSize: '0.625rem',
                                    fontWeight: '600',
                                    padding: '0.125rem 0.25rem',
                                    borderRadius: '4px',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.025em',
                                    position: 'absolute',
                                    top: '-0.5rem',
                                    right: '-1rem',
                                    whiteSpace: 'nowrap'
                                }}>
                                    V2
                                </span>
                            </div>
                            <Link
                                href="/dashboard/new-discharge"
                                style={{
                                    color: '#6D6D72',
                                    textDecoration: 'none',
                                    fontSize: '0.875rem',
                                    fontWeight: '500',
                                    transition: 'all 0.2s ease',
                                    padding: '0.25rem 0'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.color = '#007AFF';
                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.color = '#6D6D72';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                }}
                            >
                                New Discharge
                            </Link>
                        </nav>
                    </div>

                    {/* User Menu */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem'
                    }}>
                        <div style={{
                            width: '32px',
                            height: '32px',
                            backgroundColor: '#007AFF',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: '0.875rem',
                            fontWeight: '600',
                            boxShadow: '0 2px 8px rgba(0, 122, 255, 0.25)'
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
                                color: '#6D6D72',
                                fontWeight: '400'
                            }}>
                                {clinic?.name}
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Coming Soon Overlay */}
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(242, 242, 247, 0.95)',
                backdropFilter: 'blur(8px)',
                zIndex: 1000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <div style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '20px',
                    padding: '3rem 2rem',
                    maxWidth: '500px',
                    margin: '2rem',
                    textAlign: 'center',
                    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
                    border: '1px solid #e2e8f0'
                }}>
                    <div style={{
                        width: '80px',
                        height: '80px',
                        backgroundColor: '#FF9500',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 2rem auto',
                        boxShadow: '0 8px 24px rgba(255, 149, 0, 0.3)'
                    }}>
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                        </svg>
                    </div>

                    <h2 style={{
                        fontSize: '1.75rem',
                        fontWeight: '700',
                        color: '#1e293b',
                        marginBottom: '1rem'
                    }}>
                        Patient Monitoring
                    </h2>

                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        backgroundColor: '#FF9500',
                        color: 'white',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        padding: '0.5rem 1rem',
                        borderRadius: '8px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        marginBottom: '1.5rem'
                    }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12,6 12,12 16,14" />
                        </svg>
                        Coming in Version 2
                    </div>

                    <p style={{
                        fontSize: '1rem',
                        color: '#6D6D72',
                        marginBottom: '0.5rem',
                        lineHeight: '1.6',
                        fontWeight: '400'
                    }}>
                        Track medication adherence, symptom logs, and patient progress data from the mobile app.
                    </p>

                    <p style={{
                        fontSize: '0.875rem',
                        color: '#94a3b8',
                        marginBottom: '2rem',
                        fontWeight: '400'
                    }}>
                        This feature is actively in development and will evolve based on veterinarian feedback.                    </p>

                    <div style={{
                        display: 'flex',
                        gap: '1rem',
                        justifyContent: 'center',
                        flexWrap: 'wrap'
                    }}>
                        <Link
                            href="/dashboard"
                            style={{
                                backgroundColor: '#007AFF',
                                color: 'white',
                                padding: '0.875rem 1.5rem',
                                borderRadius: '12px',
                                textDecoration: 'none',
                                fontWeight: '600',
                                fontSize: '0.875rem',
                                transition: 'all 0.2s ease',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-1px)';
                                e.currentTarget.style.boxShadow = '0 8px 20px rgba(0, 122, 255, 0.3)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = 'none';
                            }}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="15,18 9,12 15,6" />
                            </svg>
                            Back to Dashboard
                        </Link>

                        <Link
                            href="/dashboard/new-discharge"
                            style={{
                                backgroundColor: 'transparent',
                                color: '#007AFF',
                                border: '2px solid #007AFF',
                                padding: '0.875rem 1.5rem',
                                borderRadius: '12px',
                                textDecoration: 'none',
                                fontWeight: '600',
                                fontSize: '0.875rem',
                                transition: 'all 0.2s ease',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#007AFF';
                                e.currentTarget.style.color = 'white';
                                e.currentTarget.style.transform = 'translateY(-1px)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                                e.currentTarget.style.color = '#007AFF';
                                e.currentTarget.style.transform = 'translateY(0)';
                            }}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="12" y1="5" x2="12" y2="19" />
                                <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                            Create Discharge
                        </Link>
                        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                            <a
                                href="mailto:cory.larro@gmail.com"
                                style={{
                                    fontSize: '0.75rem',
                                    color: '#007AFF',
                                    textDecoration: 'underline',
                                    fontWeight: '500'
                                }}
                            >
                                Notify me when this is live
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content (blurred behind overlay) */}
            <main style={{
                maxWidth: '1200px',
                margin: '0 auto',
                padding: '2rem',
                filter: 'blur(2px)',
                opacity: '0.6'
            }}>
                {/* Page Header */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '2rem'
                }}>
                    <div>
                        <h1 style={{
                            fontSize: '2rem',
                            fontWeight: '700',
                            color: '#1e293b',
                            margin: '0 0 0.5rem 0'
                        }}>
                            Patient Monitoring
                        </h1>
                        <p style={{
                            fontSize: '1rem',
                            color: '#6D6D72',
                            margin: '0',
                            fontWeight: '400'
                        }}>
                            Track medication adherence and symptom logs from pet owners
                        </p>
                    </div>

                    <Link
                        href="/dashboard/new-discharge"
                        style={{
                            backgroundColor: '#007AFF',
                            color: 'white',
                            padding: '0.75rem 1.5rem',
                            borderRadius: '8px',
                            textDecoration: 'none',
                            fontWeight: '600',
                            fontSize: '0.875rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        New Discharge
                    </Link>
                </div>

                {/* Summary Stats */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '1.5rem',
                    marginBottom: '2rem'
                }}>
                    <div style={{
                        backgroundColor: '#FFFFFF',
                        padding: '1.5rem',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
                    }}>
                        <div style={{
                            fontSize: '2rem',
                            fontWeight: '700',
                            color: '#007AFF',
                            marginBottom: '0.5rem'
                        }}>
                            {filteredPatients.length}
                        </div>
                        <div style={{
                            fontSize: '0.875rem',
                            color: '#6D6D72',
                            fontWeight: '600'
                        }}>
                            Total Patients
                        </div>
                    </div>

                    <div style={{
                        backgroundColor: '#FFFFFF',
                        padding: '1.5rem',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
                    }}>
                        <div style={{
                            fontSize: '2rem',
                            fontWeight: '700',
                            color: '#34C759',
                            marginBottom: '0.5rem'
                        }}>
                            {filteredPatients.filter(p => p.isActive).length}
                        </div>
                        <div style={{
                            fontSize: '0.875rem',
                            color: '#6D6D72',
                            fontWeight: '600'
                        }}>
                            Active Treatments
                        </div>
                    </div>

                    <div style={{
                        backgroundColor: '#FFFFFF',
                        padding: '1.5rem',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
                    }}>
                        <div style={{
                            fontSize: '2rem',
                            fontWeight: '700',
                            color: '#ef4444',
                            marginBottom: '0.5rem'
                        }}>
                            {filteredPatients.filter(p => p.alertLevel === 'high').length}
                        </div>
                        <div style={{
                            fontSize: '0.875rem',
                            color: '#6D6D72',
                            fontWeight: '600'
                        }}>
                            High Priority
                        </div>
                    </div>

                    <div style={{
                        backgroundColor: '#FFFFFF',
                        padding: '1.5rem',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
                    }}>
                        <div style={{
                            fontSize: '2rem',
                            fontWeight: '700',
                            color: '#34C759',
                            marginBottom: '0.5rem'
                        }}>
                            {Math.round(filteredPatients.reduce((acc, p) => acc + p.adherenceRate, 0) / filteredPatients.length || 0)}%
                        </div>
                        <div style={{
                            fontSize: '0.875rem',
                            color: '#6D6D72',
                            fontWeight: '600'
                        }}>
                            Avg Adherence
                        </div>
                    </div>
                </div>

                {/* Rest of the content continues with the same styling... */}
                <div style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                    overflow: 'hidden'
                }}>
                    <div style={{
                        textAlign: 'center',
                        padding: '4rem 2rem',
                        color: '#6D6D72'
                    }}>
                        <div style={{
                            width: '64px',
                            height: '64px',
                            backgroundColor: '#F2F2F7',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 1rem auto'
                        }}>
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#6D6D72" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                            </svg>
                        </div>
                        <h3 style={{
                            fontSize: '1.25rem',
                            fontWeight: '600',
                            marginBottom: '0.5rem',
                            color: '#1e293b'
                        }}>
                            Patient data will appear here
                        </h3>
                        <p style={{
                            fontSize: '0.875rem',
                            marginBottom: '2rem',
                            fontWeight: '400'
                        }}>
                            Once connected to the mobile app, you'll see real-time patient monitoring data.
                        </p>
                    </div>
                </div>
            </main>

            {/* Spinning animation */}
            <style jsx>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                
                @media (max-width: 768px) {
                    .nav-links {
                        display: none !important;
                    }
                    
                    main {
                        padding: 1rem !important;
                    }
                    
                    h1 {
                        fontSize: 1.5rem !important;
                    }
                    
                    .coming-soon-modal {
                        margin: 1rem !important;
                        padding: 2rem 1.5rem !important;
                    }
                    
                    .coming-soon-buttons {
                        flex-direction: column !important;
                        gap: 0.75rem !important;
                    }
                    
                    .stats-grid {
                        grid-template-columns: repeat(2, 1fr) !important;
                        gap: 1rem !important;
                    }
                    
                    .page-header {
                        flex-direction: column !important;
                        align-items: flex-start !important;
                        gap: 1rem !important;
                    }
                }
                
                @media (max-width: 480px) {
                    .stats-grid {
                        grid-template-columns: 1fr !important;
                    }
                    
                    .coming-soon-icon {
                        width: 60px !important;
                        height: 60px !important;
                    }
                    
                    .coming-soon-title {
                        font-size: 1.5rem !important;
                    }
                }
            `}</style>
        </div>
    );
}