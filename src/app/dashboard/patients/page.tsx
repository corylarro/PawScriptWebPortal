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
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
    const [filterAlert, setFilterAlert] = useState<'all' | 'high' | 'medium' | 'low' | 'none'>('all');

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

    // Filter patients based on search and filters
    const filteredPatients = patients.filter(patient => {
        // Search filter - search both pet name and parent name
        if (searchTerm) {
            const searchLower = searchTerm.toLowerCase();
            const petNameMatch = patient.petName.toLowerCase().includes(searchLower);
            const parentNameMatch = patient.petParentName.toLowerCase().includes(searchLower);
            if (!petNameMatch && !parentNameMatch) {
                return false;
            }
        }

        // Status filter
        if (filterStatus === 'active' && !patient.isActive) return false;
        if (filterStatus === 'inactive' && patient.isActive) return false;

        // Alert filter
        if (filterAlert !== 'all' && patient.alertLevel !== filterAlert) return false;

        return true;
    });

    const getAlertColor = (level: string) => {
        switch (level) {
            case 'high': return '#ef4444';
            case 'medium': return '#f59e0b';
            case 'low': return '#eab308';
            default: return '#10b981';
        }
    };

    const getAlertText = (level: string) => {
        switch (level) {
            case 'high': return 'High Priority';
            case 'medium': return 'Medium Priority';
            case 'low': return 'Low Priority';
            default: return 'Good';
        }
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const formatTimeAgo = (date: Date) => {
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return '1 day ago';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
        return `${Math.floor(diffDays / 30)} months ago`;
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
                    <p style={{ color: '#64748b', fontSize: '1rem' }}>Loading patients...</p>
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
                    {/* Logo & Navigation */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
                            <div style={{
                                width: '36px',
                                height: '36px',
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
                            <span style={{
                                fontSize: '1.25rem',
                                fontWeight: '700',
                                color: '#1e293b'
                            }}>
                                PawScript
                            </span>
                        </Link>

                        <nav style={{ display: 'flex', gap: '1.5rem' }}>
                            <Link
                                href="/dashboard"
                                style={{
                                    color: '#64748b',
                                    textDecoration: 'none',
                                    fontSize: '0.875rem',
                                    fontWeight: '500'
                                }}
                            >
                                Dashboard
                            </Link>
                            <Link
                                href="/dashboard/patients"
                                style={{
                                    color: '#2563eb',
                                    textDecoration: 'none',
                                    fontSize: '0.875rem',
                                    fontWeight: '600',
                                    borderBottom: '2px solid #2563eb',
                                    paddingBottom: '0.25rem'
                                }}
                            >
                                Patients
                            </Link>
                            <Link
                                href="/dashboard/new-discharge"
                                style={{
                                    color: '#64748b',
                                    textDecoration: 'none',
                                    fontSize: '0.875rem',
                                    fontWeight: '500'
                                }}
                            >
                                New Discharge
                            </Link>
                        </nav>
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
                            color: '#64748b',
                            margin: '0'
                        }}>
                            Track medication adherence and symptom logs from pet owners
                        </p>
                    </div>

                    <Link
                        href="/dashboard/new-discharge"
                        style={{
                            backgroundColor: '#2563eb',
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
                        backgroundColor: 'white',
                        padding: '1.5rem',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                    }}>
                        <div style={{
                            fontSize: '2rem',
                            fontWeight: '700',
                            color: '#2563eb',
                            marginBottom: '0.5rem'
                        }}>
                            {filteredPatients.length}
                        </div>
                        <div style={{
                            fontSize: '0.875rem',
                            color: '#64748b',
                            fontWeight: '600'
                        }}>
                            Total Patients
                        </div>
                    </div>

                    <div style={{
                        backgroundColor: 'white',
                        padding: '1.5rem',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                    }}>
                        <div style={{
                            fontSize: '2rem',
                            fontWeight: '700',
                            color: '#16a34a',
                            marginBottom: '0.5rem'
                        }}>
                            {filteredPatients.filter(p => p.isActive).length}
                        </div>
                        <div style={{
                            fontSize: '0.875rem',
                            color: '#64748b',
                            fontWeight: '600'
                        }}>
                            Active Treatments
                        </div>
                    </div>

                    <div style={{
                        backgroundColor: 'white',
                        padding: '1.5rem',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
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
                            color: '#64748b',
                            fontWeight: '600'
                        }}>
                            High Priority
                        </div>
                    </div>

                    <div style={{
                        backgroundColor: 'white',
                        padding: '1.5rem',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                    }}>
                        <div style={{
                            fontSize: '2rem',
                            fontWeight: '700',
                            color: '#16a34a',
                            marginBottom: '0.5rem'
                        }}>
                            {Math.round(filteredPatients.reduce((acc, p) => acc + p.adherenceRate, 0) / filteredPatients.length || 0)}%
                        </div>
                        <div style={{
                            fontSize: '0.875rem',
                            color: '#64748b',
                            fontWeight: '600'
                        }}>
                            Avg Adherence
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div style={{
                    backgroundColor: 'white',
                    padding: '1.5rem',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    marginBottom: '1.5rem',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                }}>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '1rem',
                        alignItems: 'end'
                    }}>
                        <div>
                            <label style={{
                                display: 'block',
                                fontSize: '0.875rem',
                                fontWeight: '600',
                                color: '#374151',
                                marginBottom: '0.5rem'
                            }}>
                                Search Patients
                            </label>
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search by pet or owner name..."
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '6px',
                                    fontSize: '0.875rem',
                                    outline: 'none',
                                    boxSizing: 'border-box'
                                }}
                            />
                        </div>

                        <div>
                            <label style={{
                                display: 'block',
                                fontSize: '0.875rem',
                                fontWeight: '600',
                                color: '#374151',
                                marginBottom: '0.5rem'
                            }}>
                                Status
                            </label>
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'inactive')}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '6px',
                                    fontSize: '0.875rem',
                                    outline: 'none',
                                    backgroundColor: 'white',
                                    boxSizing: 'border-box'
                                }}
                            >
                                <option value="all">All Patients</option>
                                <option value="active">Active Only</option>
                                <option value="inactive">Inactive Only</option>
                            </select>
                        </div>

                        <div>
                            <label style={{
                                display: 'block',
                                fontSize: '0.875rem',
                                fontWeight: '600',
                                color: '#374151',
                                marginBottom: '0.5rem'
                            }}>
                                Priority Level
                            </label>
                            <select
                                value={filterAlert}
                                onChange={(e) => setFilterAlert(e.target.value as 'all' | 'high' | 'medium' | 'low' | 'none')}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '6px',
                                    fontSize: '0.875rem',
                                    outline: 'none',
                                    backgroundColor: 'white',
                                    boxSizing: 'border-box'
                                }}
                            >
                                <option value="all">All Levels</option>
                                <option value="high">High Priority</option>
                                <option value="medium">Medium Priority</option>
                                <option value="low">Low Priority</option>
                                <option value="none">Good</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Patient List */}
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                    overflow: 'hidden'
                }}>
                    {filteredPatients.length === 0 ? (
                        <div style={{
                            textAlign: 'center',
                            padding: '4rem 2rem',
                            color: '#6b7280'
                        }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🐾</div>
                            <h3 style={{
                                fontSize: '1.25rem',
                                fontWeight: '600',
                                marginBottom: '0.5rem',
                                color: '#374151'
                            }}>
                                No patients found
                            </h3>
                            <p style={{ fontSize: '0.875rem', marginBottom: '2rem' }}>
                                {patients.length === 0
                                    ? "Create your first discharge summary to start monitoring patients."
                                    : "Try adjusting your search filters."
                                }
                            </p>
                            {patients.length === 0 && (
                                <Link
                                    href="/dashboard/new-discharge"
                                    style={{
                                        backgroundColor: '#2563eb',
                                        color: 'white',
                                        padding: '0.75rem 1.5rem',
                                        borderRadius: '8px',
                                        textDecoration: 'none',
                                        fontWeight: '600',
                                        fontSize: '0.875rem'
                                    }}
                                >
                                    Create First Discharge
                                </Link>
                            )}
                        </div>
                    ) : (
                        <div>
                            {/* Table Header */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1fr 1fr auto',
                                gap: '1rem',
                                padding: '1rem 1.5rem',
                                backgroundColor: '#f8fafc',
                                borderBottom: '1px solid #e2e8f0',
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                color: '#64748b',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em'
                            }}>
                                <div>Pet & Owner</div>
                                <div>Contact</div>
                                <div>Medications</div>
                                <div>Adherence</div>
                                <div>Priority</div>
                                <div>Status</div>
                                <div></div>
                            </div>

                            {/* Patient Rows */}
                            {filteredPatients.map((patient) => (
                                <div key={patient.dischargeId} style={{
                                    display: 'grid',
                                    gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1fr 1fr auto',
                                    gap: '1rem',
                                    padding: '1rem 1.5rem',
                                    borderBottom: '1px solid #f1f5f9',
                                    alignItems: 'center',
                                    transition: 'background-color 0.2s ease'
                                }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                    <div>
                                        <div style={{
                                            fontSize: '0.875rem',
                                            fontWeight: '600',
                                            color: '#1e293b',
                                            marginBottom: '0.25rem'
                                        }}>
                                            🐾 {patient.petName}
                                        </div>
                                        <div style={{
                                            fontSize: '0.75rem',
                                            color: '#64748b'
                                        }}>
                                            Owner: {patient.petParentName}
                                        </div>
                                        <div style={{
                                            fontSize: '0.75rem',
                                            color: '#94a3b8'
                                        }}>
                                            {patient.petSpecies} • {formatDate(patient.createdAt)}
                                        </div>
                                    </div>

                                    <div>
                                        <div style={{
                                            fontSize: '0.75rem',
                                            color: '#64748b',
                                            marginBottom: '0.25rem'
                                        }}>
                                            {patient.petParentEmail}
                                        </div>
                                        <div style={{
                                            fontSize: '0.75rem',
                                            color: '#94a3b8'
                                        }}>
                                            Last activity: {formatTimeAgo(patient.lastActivity || patient.createdAt)}
                                        </div>
                                    </div>

                                    <div style={{
                                        fontSize: '0.875rem',
                                        color: '#374151',
                                        textAlign: 'center'
                                    }}>
                                        {patient.medicationCount}
                                    </div>

                                    <div style={{
                                        fontSize: '0.875rem',
                                        fontWeight: '600',
                                        color: patient.adherenceRate >= 85 ? '#16a34a' : patient.adherenceRate >= 70 ? '#f59e0b' : '#ef4444',
                                        textAlign: 'center'
                                    }}>
                                        {patient.adherenceRate}%
                                    </div>

                                    <div style={{ textAlign: 'center' }}>
                                        <span style={{
                                            backgroundColor: getAlertColor(patient.alertLevel),
                                            color: 'white',
                                            fontSize: '0.75rem',
                                            fontWeight: '600',
                                            padding: '0.25rem 0.5rem',
                                            borderRadius: '12px'
                                        }}>
                                            {getAlertText(patient.alertLevel)}
                                        </span>
                                    </div>

                                    <div style={{ textAlign: 'center' }}>
                                        <span style={{
                                            backgroundColor: patient.isActive ? '#dcfce7' : '#f3f4f6',
                                            color: patient.isActive ? '#16a34a' : '#6b7280',
                                            fontSize: '0.75rem',
                                            fontWeight: '600',
                                            padding: '0.25rem 0.5rem',
                                            borderRadius: '12px'
                                        }}>
                                            {patient.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>

                                    <div>
                                        <Link
                                            href={`/dashboard/patients/${patient.dischargeId}`}
                                            style={{
                                                backgroundColor: '#f1f5f9',
                                                color: '#64748b',
                                                border: '1px solid #e2e8f0',
                                                padding: '0.5rem 0.75rem',
                                                borderRadius: '6px',
                                                fontSize: '0.75rem',
                                                fontWeight: '600',
                                                textDecoration: 'none',
                                                transition: 'all 0.2s ease'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.backgroundColor = '#e2e8f0';
                                                e.currentTarget.style.color = '#475569';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor = '#f1f5f9';
                                                e.currentTarget.style.color = '#64748b';
                                            }}
                                        >
                                            View Details
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
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