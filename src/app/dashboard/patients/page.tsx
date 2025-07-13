// src/app/dashboard/patients/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { collection, query, where, orderBy, onSnapshot, limit, getDocs } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/types/firestore';
import { Discharge } from '@/types/discharge';
import { getPatientAdherenceSummary } from '@/lib/adherence';
import { getSymptomFlagCount } from '@/lib/symptomFlags';
import SymptomBadge from '@/components/SymptomBadge';

interface PatientSummary {
    dischargeId: string; // Latest discharge ID for navigation
    petId: string; // Unique identifier for the pet
    petName: string;
    petSpecies: string;
    petWeight?: string;
    createdAt: Date; // First discharge date
    updatedAt: Date; // Most recent discharge date
    medicationCount: number;
    adherenceRate: number;
    lastActivity?: Date;
    isActive: boolean;
    alertLevel: 'none' | 'low' | 'medium' | 'high';
    symptomFlagCount: number;
    totalDischarges: number; // Number of discharge records for this pet
}

export default function PatientDashboardPage() {
    const { vetUser, clinic } = useAuth();
    const { loading: authLoading } = useRequireAuth();

    const [patients, setPatients] = useState<PatientSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
    const [filterAlert, setFilterAlert] = useState<'all' | 'high' | 'medium' | 'low' | 'none'>('all');

    // Helper function to generate unique pet identifier
    const getPetId = (pet: { id?: string; name: string; species: string }): string => {
        // Use pet.id if available, otherwise fallback to name + species combination
        return pet.id || `${pet.name}-${pet.species}`.toLowerCase().replace(/\s+/g, '-');
    };

    // Calculate alert level based on adherence and symptom flags
    const calculateAlertLevel = (adherenceRate: number, symptomFlags: number): 'none' | 'low' | 'medium' | 'high' => {
        if (symptomFlags >= 3 || adherenceRate < 50) return 'high';
        if (symptomFlags >= 2 || adherenceRate < 70) return 'medium';
        if (symptomFlags >= 1 || adherenceRate < 85) return 'low';
        return 'none';
    };

    // Load patient summaries with real data - FIXED to group by pet
    useEffect(() => {
        if (!vetUser || !clinic) return;

        const q = query(
            collection(db, COLLECTIONS.DISCHARGES),
            where('clinicId', '==', clinic.id),
            orderBy('createdAt', 'desc'),
            limit(200) // Increased limit to ensure we get all pets
        );

        const unsubscribe = onSnapshot(q, async (snapshot) => {
            console.log('Loading patient summaries...');
            setLoading(true);

            // Group discharges by pet first
            const petGroups = new Map<string, {
                petId: string;
                petName: string;
                petSpecies: string;
                petWeight?: string;
                latestDischarge: Discharge;
                allDischarges: Discharge[];
            }>();

            // Group all discharges by pet
            snapshot.docs.forEach(doc => {
                const dischargeData = doc.data();
                const discharge = {
                    id: doc.id,
                    ...dischargeData,
                    createdAt: dischargeData.createdAt?.toDate() || new Date(),
                    updatedAt: dischargeData.updatedAt?.toDate() || new Date()
                } as Discharge;

                const petId = getPetId(discharge.pet);

                if (!petGroups.has(petId)) {
                    // First discharge for this pet
                    petGroups.set(petId, {
                        petId,
                        petName: discharge.pet.name,
                        petSpecies: discharge.pet.species,
                        petWeight: discharge.pet.weight,
                        latestDischarge: discharge,
                        allDischarges: [discharge]
                    });
                } else {
                    // Add to existing pet group
                    const group = petGroups.get(petId)!;
                    group.allDischarges.push(discharge);

                    // Update latest discharge if this one is more recent
                    if (discharge.createdAt > group.latestDischarge.createdAt) {
                        group.latestDischarge = discharge;
                        // Update pet info from most recent discharge
                        group.petName = discharge.pet.name;
                        group.petSpecies = discharge.pet.species;
                        if (discharge.pet.weight) {
                            group.petWeight = discharge.pet.weight;
                        }
                    }
                }
            });

            console.log(`Grouped ${snapshot.docs.length} discharges into ${petGroups.size} unique pets`);

            // Now create summaries based on the latest discharge for each pet
            const summaries: PatientSummary[] = [];

            for (const group of petGroups.values()) {
                const latestDischarge = group.latestDischarge;

                try {
                    // Get real adherence data for the latest discharge
                    const adherenceSummary = await getPatientAdherenceSummary(latestDischarge.id, clinic.id);

                    // Get symptom flag count for the latest discharge
                    const symptomCount = await getSymptomFlagCount(latestDischarge.id, clinic.id);

                    // Calculate alert level based on adherence rate and symptom flags
                    const alertLevel = calculateAlertLevel(adherenceSummary.adherenceRate, symptomCount);

                    const summary: PatientSummary = {
                        dischargeId: latestDischarge.id, // Use latest discharge ID for navigation
                        petId: group.petId,
                        petName: group.petName,
                        petSpecies: group.petSpecies,
                        petWeight: group.petWeight,
                        createdAt: group.allDischarges[0].createdAt, // First discharge date
                        updatedAt: latestDischarge.createdAt, // Most recent discharge date
                        medicationCount: latestDischarge.medications.length,
                        adherenceRate: adherenceSummary.adherenceRate,
                        lastActivity: adherenceSummary.lastActivity,
                        isActive: adherenceSummary.isActive,
                        alertLevel,
                        symptomFlagCount: symptomCount,
                        totalDischarges: group.allDischarges.length
                    };

                    summaries.push(summary);
                } catch (error) {
                    console.error(`Error loading data for discharge ${latestDischarge.id}:`, error);

                    // Fallback summary with basic data
                    const summary: PatientSummary = {
                        dischargeId: latestDischarge.id,
                        petId: group.petId,
                        petName: group.petName,
                        petSpecies: group.petSpecies,
                        petWeight: group.petWeight,
                        createdAt: group.allDischarges[0].createdAt,
                        updatedAt: latestDischarge.createdAt,
                        medicationCount: latestDischarge.medications.length,
                        adherenceRate: 0,
                        lastActivity: undefined,
                        isActive: false,
                        alertLevel: 'none',
                        symptomFlagCount: 0,
                        totalDischarges: group.allDischarges.length
                    };

                    summaries.push(summary);
                }
            }

            // Sort by most recent activity first, then by alert level
            summaries.sort((a, b) => {
                // First sort by alert level (high priority first)
                if (a.alertLevel !== b.alertLevel) {
                    const alertOrder = { 'high': 4, 'medium': 3, 'low': 2, 'none': 1 };
                    return alertOrder[b.alertLevel] - alertOrder[a.alertLevel];
                }

                // Then by activity status
                if (a.isActive !== b.isActive) {
                    return a.isActive ? -1 : 1;
                }

                // Finally by most recent activity or update
                const aDate = a.lastActivity || a.updatedAt;
                const bDate = b.lastActivity || b.updatedAt;
                return bDate.getTime() - aDate.getTime();
            });

            setPatients(summaries);
            setLoading(false);
        });

        return unsubscribe;
    }, [vetUser, clinic]);

    // Filter patients based on search and filters
    const filteredPatients = patients.filter(patient => {
        // Search filter
        if (searchTerm) {
            const searchLower = searchTerm.toLowerCase();
            if (!patient.petName.toLowerCase().includes(searchLower) &&
                !patient.petSpecies.toLowerCase().includes(searchLower)) {
                return false;
            }
        }

        // Status filter
        if (filterStatus !== 'all') {
            if (filterStatus === 'active' && !patient.isActive) return false;
            if (filterStatus === 'inactive' && patient.isActive) return false;
        }

        // Alert filter
        if (filterAlert !== 'all' && patient.alertLevel !== filterAlert) {
            return false;
        }

        return true;
    });

    // Utility functions
    const getAlertColor = (level: string) => {
        switch (level) {
            case 'high': return '#ef4444';
            case 'medium': return '#FF9500';
            case 'low': return '#eab308';
            default: return '#34C759';
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

    const formatLastActivity = (date?: Date) => {
        if (!date) return 'No activity';

        const now = new Date();
        const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

        if (diffInHours < 1) return 'Just now';
        if (diffInHours < 24) return `${diffInHours}h ago`;

        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays === 1) return '1 day ago';
        if (diffInDays < 7) return `${diffInDays} days ago`;

        const diffInWeeks = Math.floor(diffInDays / 7);
        if (diffInWeeks === 1) return '1 week ago';
        if (diffInWeeks < 4) return `${diffInWeeks} weeks ago`;

        return formatDate(date);
    };

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
                padding: '1.25rem 2rem',
                position: 'sticky',
                top: 0,
                zIndex: 10,
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
                backdropFilter: 'blur(10px)'
            }}>
                <div style={{
                    maxWidth: '1400px',
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
                        minWidth: '280px'
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
                                width: '40px',
                                height: '40px',
                                backgroundColor: '#007AFF',
                                borderRadius: '10px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 4px 12px rgba(0, 122, 255, 0.25)',
                                overflow: 'hidden'
                            }}>
                                <Image
                                    src="/images/pawscript-logo.png"
                                    alt="PawScript"
                                    width={24}
                                    height={24}
                                    style={{ objectFit: 'contain' }}
                                />
                            </div>
                            <span style={{
                                fontSize: '1.375rem',
                                fontWeight: '700',
                                color: '#1e293b'
                            }}>
                                PawScript
                            </span>
                        </Link>

                        <nav style={{
                            display: 'flex',
                            gap: '1.75rem',
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
                                    padding: '0.375rem 0'
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
                                paddingBottom: '0.375rem'
                            }}>
                                Patients
                            </div>
                            <Link
                                href="/dashboard/new-discharge"
                                style={{
                                    color: '#6D6D72',
                                    textDecoration: 'none',
                                    fontSize: '0.875rem',
                                    fontWeight: '500',
                                    transition: 'all 0.2s ease',
                                    padding: '0.375rem 0'
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
                        gap: '0.875rem'
                    }}>
                        <div style={{
                            width: '36px',
                            height: '36px',
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

            {/* Main Content */}
            <main style={{
                maxWidth: '1400px',
                margin: '0 auto',
                padding: '2rem'
            }}>
                {/* Page Header */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '2rem',
                    flexWrap: 'wrap',
                    gap: '1.5rem'
                }}>
                    <div style={{ maxWidth: '600px' }}>
                        <h1 style={{
                            fontSize: '2.25rem',
                            fontWeight: '700',
                            color: '#1e293b',
                            margin: '0 0 0.75rem 0',
                            lineHeight: '1.2'
                        }}>
                            Patient Monitoring
                        </h1>
                        <p style={{
                            fontSize: '1.125rem',
                            color: '#6D6D72',
                            margin: '0',
                            fontWeight: '400',
                            lineHeight: '1.5'
                        }}>
                            Track medication adherence and symptom logs from pet owners in real-time
                        </p>
                    </div>

                    <Link
                        href="/dashboard/new-discharge"
                        style={{
                            backgroundColor: '#007AFF',
                            color: 'white',
                            padding: '0.875rem 1.75rem',
                            borderRadius: '10px',
                            textDecoration: 'none',
                            fontWeight: '600',
                            fontSize: '0.875rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.625rem',
                            transition: 'all 0.2s ease',
                            boxShadow: '0 2px 8px rgba(0, 122, 255, 0.25)'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 122, 255, 0.35)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 122, 255, 0.25)';
                        }}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        New Discharge
                    </Link>
                </div>

                {/* Summary Stats */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                    gap: '1.5rem',
                    marginBottom: '2.5rem'
                }}>
                    <div style={{
                        backgroundColor: '#FFFFFF',
                        padding: '2rem',
                        borderRadius: '16px',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
                        textAlign: 'center'
                    }}>
                        <div style={{
                            fontSize: '2.5rem',
                            fontWeight: '700',
                            color: '#007AFF',
                            marginBottom: '0.75rem'
                        }}>
                            {filteredPatients.length}
                        </div>
                        <div style={{
                            fontSize: '0.875rem',
                            color: '#6D6D72',
                            fontWeight: '600',
                            marginBottom: '0.25rem'
                        }}>
                            Total Patients
                        </div>
                        <div style={{
                            fontSize: '0.75rem',
                            color: '#9ca3af',
                            fontWeight: '400'
                        }}>
                            Unique pets under care
                        </div>
                    </div>

                    <div style={{
                        backgroundColor: '#FFFFFF',
                        padding: '2rem',
                        borderRadius: '16px',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
                        textAlign: 'center'
                    }}>
                        <div style={{
                            fontSize: '2.5rem',
                            fontWeight: '700',
                            color: '#34C759',
                            marginBottom: '0.75rem'
                        }}>
                            {filteredPatients.filter(p => p.isActive).length}
                        </div>
                        <div style={{
                            fontSize: '0.875rem',
                            color: '#6D6D72',
                            fontWeight: '600',
                            marginBottom: '0.25rem'
                        }}>
                            Active Treatments
                        </div>
                        <div style={{
                            fontSize: '0.75rem',
                            color: '#9ca3af',
                            fontWeight: '400'
                        }}>
                            Activity in last 7 days
                        </div>
                    </div>

                    <div style={{
                        backgroundColor: '#FFFFFF',
                        padding: '2rem',
                        borderRadius: '16px',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
                        textAlign: 'center'
                    }}>
                        <div style={{
                            fontSize: '2.5rem',
                            fontWeight: '700',
                            color: '#ef4444',
                            marginBottom: '0.75rem'
                        }}>
                            {filteredPatients.filter(p => p.alertLevel === 'high').length}
                        </div>
                        <div style={{
                            fontSize: '0.875rem',
                            color: '#6D6D72',
                            fontWeight: '600',
                            marginBottom: '0.25rem'
                        }}>
                            High Priority
                        </div>
                        <div style={{
                            fontSize: '0.75rem',
                            color: '#9ca3af',
                            fontWeight: '400'
                        }}>
                            Requires attention
                        </div>
                    </div>

                    <div style={{
                        backgroundColor: '#FFFFFF',
                        padding: '2rem',
                        borderRadius: '16px',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
                        textAlign: 'center'
                    }}>
                        <div style={{
                            fontSize: '2.5rem',
                            fontWeight: '700',
                            color: '#34C759',
                            marginBottom: '0.75rem'
                        }}>
                            {filteredPatients.length > 0
                                ? Math.round(filteredPatients.reduce((acc, p) => acc + p.adherenceRate, 0) / filteredPatients.length)
                                : 0}%
                        </div>
                        <div style={{
                            fontSize: '0.875rem',
                            color: '#6D6D72',
                            fontWeight: '600',
                            marginBottom: '0.25rem'
                        }}>
                            Avg Adherence
                        </div>
                        <div style={{
                            fontSize: '0.75rem',
                            color: '#9ca3af',
                            fontWeight: '400'
                        }}>
                            Overall compliance rate
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div style={{
                    backgroundColor: '#FFFFFF',
                    padding: '1.75rem',
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    marginBottom: '2rem',
                    display: 'flex',
                    gap: '1.25rem',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)'
                }}>
                    {/* Search */}
                    <div style={{ flex: '1', minWidth: '250px' }}>
                        <div style={{
                            position: 'relative',
                            display: 'flex',
                            alignItems: 'center'
                        }}>
                            <svg
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="#6D6D72"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                style={{
                                    position: 'absolute',
                                    left: '0.875rem',
                                    zIndex: 1
                                }}
                            >
                                <circle cx="11" cy="11" r="8" />
                                <path d="m21 21-4.35-4.35" />
                            </svg>
                            <input
                                type="text"
                                placeholder="Search by pet name or species..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem 0.875rem 0.75rem 3rem',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '10px',
                                    fontSize: '0.875rem',
                                    fontFamily: 'Nunito, -apple-system, BlinkMacSystemFont, sans-serif',
                                    outline: 'none',
                                    transition: 'border-color 0.2s ease'
                                }}
                                onFocus={(e) => e.target.style.borderColor = '#007AFF'}
                                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                            />
                        </div>
                    </div>

                    {/* Status Filter */}
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'inactive')}
                        style={{
                            padding: '0.75rem 1rem',
                            border: '1px solid #e2e8f0',
                            borderRadius: '10px',
                            fontSize: '0.875rem',
                            fontFamily: 'Nunito, -apple-system, BlinkMacSystemFont, sans-serif',
                            outline: 'none',
                            backgroundColor: '#FFFFFF',
                            cursor: 'pointer'
                        }}
                    >
                        <option value="all">All Status</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>

                    {/* Alert Filter */}
                    <select
                        value={filterAlert}
                        onChange={(e) => setFilterAlert(e.target.value as 'all' | 'high' | 'medium' | 'low' | 'none')}
                        style={{
                            padding: '0.75rem 1rem',
                            border: '1px solid #e2e8f0',
                            borderRadius: '10px',
                            fontSize: '0.875rem',
                            fontFamily: 'Nunito, -apple-system, BlinkMacSystemFont, sans-serif',
                            outline: 'none',
                            backgroundColor: '#FFFFFF',
                            cursor: 'pointer'
                        }}
                    >
                        <option value="all">All Priorities</option>
                        <option value="high">High Priority</option>
                        <option value="medium">Medium Priority</option>
                        <option value="low">Low Priority</option>
                        <option value="none">No Issues</option>
                    </select>

                    {/* Clear Filters */}
                    {(searchTerm || filterStatus !== 'all' || filterAlert !== 'all') && (
                        <button
                            onClick={() => {
                                setSearchTerm('');
                                setFilterStatus('all');
                                setFilterAlert('all');
                            }}
                            style={{
                                padding: '0.75rem 1rem',
                                border: '1px solid #e2e8f0',
                                borderRadius: '10px',
                                fontSize: '0.875rem',
                                fontFamily: 'Nunito, -apple-system, BlinkMacSystemFont, sans-serif',
                                backgroundColor: '#F2F2F7',
                                color: '#6D6D72',
                                cursor: 'pointer',
                                fontWeight: '500',
                                transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#e2e8f0';
                                e.currentTarget.style.color = '#1e293b';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '#F2F2F7';
                                e.currentTarget.style.color = '#6D6D72';
                            }}
                        >
                            Clear Filters
                        </button>
                    )}
                </div>

                {/* Patient List */}
                <div style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
                    overflow: 'hidden'
                }}>
                    {filteredPatients.length === 0 ? (
                        <div style={{
                            textAlign: 'center',
                            padding: '4rem 2rem',
                            color: '#6D6D72'
                        }}>
                            <div style={{
                                width: '80px',
                                height: '80px',
                                backgroundColor: '#F2F2F7',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 1.5rem auto',
                                fontSize: '2rem'
                            }}>
                                🐾
                            </div>
                            <h3 style={{
                                fontSize: '1.375rem',
                                fontWeight: '600',
                                marginBottom: '0.75rem',
                                color: '#1e293b'
                            }}>
                                {patients.length === 0 ? 'No patients yet' : 'No patients match your filters'}
                            </h3>
                            <p style={{
                                fontSize: '1rem',
                                marginBottom: '2rem',
                                fontWeight: '400',
                                maxWidth: '400px',
                                margin: '0 auto 2rem auto',
                                lineHeight: '1.5'
                            }}>
                                {patients.length === 0
                                    ? 'Create your first discharge to start monitoring patient adherence and symptoms.'
                                    : 'Try adjusting your search or filter criteria to find patients.'
                                }
                            </p>
                            {patients.length === 0 && (
                                <Link
                                    href="/dashboard/new-discharge"
                                    style={{
                                        backgroundColor: '#007AFF',
                                        color: 'white',
                                        padding: '0.875rem 1.75rem',
                                        borderRadius: '10px',
                                        textDecoration: 'none',
                                        fontWeight: '600',
                                        fontSize: '0.875rem',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.625rem',
                                        transition: 'all 0.2s ease'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                        e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 122, 255, 0.35)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = 'none';
                                    }}
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="12" y1="5" x2="12" y2="19" />
                                        <line x1="5" y1="12" x2="19" y2="12" />
                                    </svg>
                                    Create First Discharge
                                </Link>
                            )}
                        </div>
                    ) : (
                        <div>
                            {/* Table Header */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: '2.5fr 1fr 1fr 1fr 1fr 1fr',
                                gap: '1.25rem',
                                padding: '1.25rem 1.75rem',
                                backgroundColor: '#F2F2F7',
                                borderBottom: '1px solid #e2e8f0',
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                color: '#6D6D72',
                                textTransform: 'uppercase',
                                letterSpacing: '0.075em'
                            }}>
                                <div>Patient</div>
                                <div style={{ textAlign: 'center' }}>Medications</div>
                                <div style={{ textAlign: 'center' }}>Adherence</div>
                                <div style={{ textAlign: 'center' }}>Symptoms</div>
                                <div style={{ textAlign: 'center' }}>Status</div>
                                <div style={{ textAlign: 'center' }}>Priority</div>
                            </div>

                            {/* Patient Rows */}
                            {filteredPatients.map((patient, index) => (
                                <Link
                                    key={patient.dischargeId}
                                    href={`/dashboard/patients/${patient.dischargeId}`}
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: '2.5fr 1fr 1fr 1fr 1fr 1fr',
                                        gap: '1.25rem',
                                        padding: '1.5rem 1.75rem',
                                        borderBottom: index < filteredPatients.length - 1 ? '1px solid #f1f5f9' : 'none',
                                        textDecoration: 'none',
                                        transition: 'all 0.2s ease',
                                        cursor: 'pointer'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = '#f8fafc';
                                        e.currentTarget.style.transform = 'translateY(-1px)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = 'transparent';
                                        e.currentTarget.style.transform = 'translateY(0)';
                                    }}
                                >
                                    {/* Patient Info */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <div style={{
                                            width: '48px',
                                            height: '48px',
                                            backgroundColor: '#007AFF',
                                            borderRadius: '12px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '1.5rem',
                                            flexShrink: 0,
                                            boxShadow: '0 2px 8px rgba(0, 122, 255, 0.25)'
                                        }}>
                                            🐾
                                        </div>
                                        <div style={{ minWidth: 0, flex: 1 }}>
                                            <div style={{
                                                fontSize: '1rem',
                                                fontWeight: '600',
                                                color: '#1e293b',
                                                marginBottom: '0.375rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.5rem'
                                            }}>
                                                {patient.petName}
                                                {patient.totalDischarges > 1 && (
                                                    <span style={{
                                                        fontSize: '0.75rem',
                                                        backgroundColor: '#e0f2fe',
                                                        color: '#0369a1',
                                                        padding: '0.125rem 0.375rem',
                                                        borderRadius: '6px',
                                                        fontWeight: '500'
                                                    }}>
                                                        {patient.totalDischarges} visits
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{
                                                fontSize: '0.8125rem',
                                                color: '#6D6D72',
                                                fontWeight: '400',
                                                marginBottom: '0.25rem'
                                            }}>
                                                {patient.petSpecies}
                                                {patient.petWeight && ` • ${patient.petWeight}`}
                                            </div>
                                            <div style={{
                                                fontSize: '0.75rem',
                                                color: '#9ca3af',
                                                fontWeight: '400'
                                            }}>
                                                Last activity: {formatLastActivity(patient.lastActivity)}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Medications */}
                                    <div style={{ textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <div style={{
                                            backgroundColor: '#f0f9ff',
                                            color: '#0369a1',
                                            padding: '0.375rem 0.75rem',
                                            borderRadius: '8px',
                                            fontSize: '0.875rem',
                                            fontWeight: '600'
                                        }}>
                                            {patient.medicationCount}
                                        </div>
                                    </div>

                                    {/* Adherence */}
                                    <div style={{ textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <div style={{
                                            backgroundColor: patient.adherenceRate >= 85 ? '#dcfce7' :
                                                patient.adherenceRate >= 70 ? '#fef3c7' :
                                                    patient.adherenceRate > 0 ? '#fee2e2' : '#f3f4f6',
                                            color: patient.adherenceRate >= 85 ? '#16a34a' :
                                                patient.adherenceRate >= 70 ? '#d97706' :
                                                    patient.adherenceRate > 0 ? '#dc2626' : '#6b7280',
                                            padding: '0.375rem 0.75rem',
                                            borderRadius: '8px',
                                            fontSize: '0.875rem',
                                            fontWeight: '600'
                                        }}>
                                            {patient.adherenceRate > 0 ? `${patient.adherenceRate}%` : 'No data'}
                                        </div>
                                    </div>

                                    {/* Symptoms */}
                                    <div style={{ textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {patient.symptomFlagCount > 0 ? (
                                            <SymptomBadge
                                                dischargeId={patient.dischargeId}
                                                clinicId={clinic?.id || ''}
                                                showTooltip={false}
                                            />
                                        ) : (
                                            <span style={{
                                                fontSize: '0.8125rem',
                                                color: '#6b7280',
                                                fontWeight: '400'
                                            }}>
                                                None
                                            </span>
                                        )}
                                    </div>

                                    {/* Status */}
                                    <div style={{ textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.375rem',
                                            padding: '0.375rem 0.75rem',
                                            borderRadius: '8px',
                                            backgroundColor: patient.isActive ? '#dcfce7' : '#f3f4f6'
                                        }}>
                                            <div style={{
                                                width: '8px',
                                                height: '8px',
                                                borderRadius: '50%',
                                                backgroundColor: patient.isActive ? '#16a34a' : '#6b7280'
                                            }} />
                                            <span style={{
                                                fontSize: '0.8125rem',
                                                color: patient.isActive ? '#16a34a' : '#6b7280',
                                                fontWeight: '500'
                                            }}>
                                                {patient.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Priority */}
                                    <div style={{ textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <div style={{
                                            backgroundColor: patient.alertLevel === 'high' ? '#fee2e2' :
                                                patient.alertLevel === 'medium' ? '#fef3c7' :
                                                    patient.alertLevel === 'low' ? '#fef3c7' : '#dcfce7',
                                            color: getAlertColor(patient.alertLevel),
                                            padding: '0.375rem 0.75rem',
                                            borderRadius: '8px',
                                            fontSize: '0.8125rem',
                                            fontWeight: '600'
                                        }}>
                                            {getAlertText(patient.alertLevel)}
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

                {/* Results Summary */}
                {filteredPatients.length > 0 && (
                    <div style={{
                        textAlign: 'center',
                        padding: '1.5rem',
                        fontSize: '0.875rem',
                        color: '#6D6D72',
                        fontWeight: '400'
                    }}>
                        Showing {filteredPatients.length} of {patients.length} patients
                        {(searchTerm || filterStatus !== 'all' || filterAlert !== 'all') && patients.length !== filteredPatients.length && (
                            <span style={{ color: '#9ca3af' }}>
                                {' • '}
                                <button
                                    onClick={() => {
                                        setSearchTerm('');
                                        setFilterStatus('all');
                                        setFilterAlert('all');
                                    }}
                                    style={{
                                        color: '#007AFF',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        fontSize: '0.875rem',
                                        fontWeight: '500',
                                        textDecoration: 'underline',
                                        fontFamily: 'inherit'
                                    }}
                                >
                                    Show all patients
                                </button>
                            </span>
                        )}
                    </div>
                )}
            </main>

            {/* Styles */}
            <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @media (max-width: 1024px) {
          /* Hide some navigation on smaller tablets */
          nav {
            display: none !important;
          }
        }
        
        @media (max-width: 768px) {
          header {
            padding: 1rem !important;
          }
          
          main {
            padding: 1rem !important;
          }
          
          h1 {
            font-size: 1.75rem !important;
          }
          
          /* Make table responsive on mobile */
          div[style*="gridTemplateColumns: '2.5fr 1fr 1fr 1fr 1fr 1fr'"] {
            grid-template-columns: 1fr !important;
            gap: 0.75rem !important;
          }
          
          /* Hide table header on mobile */
          div[style*="backgroundColor: '#F2F2F7'"][style*="textTransform: 'uppercase'"] {
            display: none !important;
          }
          
          /* Stack patient info vertically on mobile */
          div[style*="display: flex"][style*="alignItems: 'center'"][style*="gap: '1rem'"] {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 0.75rem !important;
          }
          
          /* Mobile filters */
          div[style*="display: flex"][style*="gap: '1.25rem'"][style*="flexWrap: wrap"] {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 1rem !important;
          }
          
          div[style*="display: flex"][style*="gap: '1.25rem'"][style*="flexWrap: wrap"] > * {
            width: 100% !important;
            min-width: auto !important;
          }
          
          /* Mobile stats grid */
          div[style*="gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr)'"] {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 1rem !important;
          }
          
          /* Mobile page header */
          div[style*="justifyContent: 'space-between'"][style*="flexWrap: wrap"] {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 1.5rem !important;
          }
        }
        
        @media (max-width: 480px) {
          /* Single column stats on very small screens */
          div[style*="gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr)'"] {
            grid-template-columns: 1fr !important;
          }
          
          /* Smaller text on mobile */
          h1 {
            font-size: 1.5rem !important;
          }
          
          /* Adjust padding */
          main {
            padding: 0.75rem !important;
          }
          
          header {
            padding: 0.75rem 1rem !important;
          }
        }
        
        /* Print styles */
        @media print {
          header {
            position: static !important;
            box-shadow: none !important;
          }
          
          main {
            padding: 1rem !important;
          }
          
          * {
            background: white !important;
            color: black !important;
            box-shadow: none !important;
          }
          
          /* Hide filters when printing */
          div[style*="backgroundColor: '#FFFFFF'"][style*="display: flex"][style*="gap: '1.25rem'"] {
            display: none !important;
          }
          
          /* Simplify table for print */
          div[style*="gridTemplateColumns"] {
            border: 1px solid #666 !important;
          }
        }
      `}</style>
        </div>
    );
}