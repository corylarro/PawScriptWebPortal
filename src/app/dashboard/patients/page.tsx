// src/app/dashboard/patients/page.tsx - Revamped UI with Real Data
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { collection, query, where, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/types/firestore';
import { Discharge } from '@/types/discharge';
import { getPatientListMetrics } from '@/lib/petDataUtils';
import Navigation from '@/components/Navigation';
import SymptomBadge from '@/components/SymptomBadge';

interface PatientSummary {
    dischargeId: string; // Latest discharge ID for navigation
    petId: string; // Unique identifier for the pet
    petName: string;
    petSpecies: string;
    petWeight?: string;
    createdAt: Date; // First discharge date
    updatedAt: Date; // Most recent discharge date

    // Enhanced metrics from petDataUtils
    lastVisitDate: Date;
    overallAdherenceRate: number; // All meds, all discharges (90d)
    activeOnlyAdherenceRate: number; // Active meds only
    recentSymptomAlerts: number; // Last 14 days
    currentStatus: 'active' | 'inactive';

    // Calculated fields
    medicationCount: number;
    totalDischarges: number;
    alertLevel: 'none' | 'low' | 'medium' | 'high';
}

export default function PatientDashboardPage() {
    const { vetUser, clinic } = useAuth();
    const { loading: authLoading } = useRequireAuth();

    const [patients, setPatients] = useState<PatientSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
    const [filterAlert, setFilterAlert] = useState<'all' | 'high' | 'medium' | 'low' | 'none'>('all');
    const [isMobile, setIsMobile] = useState(false);

    // Check if mobile on mount
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Helper function to generate unique pet identifier
    const getPetId = (pet: { id?: string; name: string; species: string }): string => {
        return pet.id || `${pet.name}-${pet.species}`.toLowerCase().replace(/\s+/g, '-');
    };

    // Calculate alert level based on adherence and symptom flags
    const calculateAlertLevel = (adherenceRate: number, symptomFlags: number): 'none' | 'low' | 'medium' | 'high' => {
        if (symptomFlags >= 3 || adherenceRate < 50) return 'high';
        if (symptomFlags >= 2 || adherenceRate < 70) return 'medium';
        if (symptomFlags >= 1 || adherenceRate < 85) return 'low';
        return 'none';
    };

    // Load patient summaries with enhanced metrics
    useEffect(() => {
        if (!vetUser || !clinic) return;

        const q = query(
            collection(db, COLLECTIONS.DISCHARGES),
            where('clinicId', '==', clinic.id),
            orderBy('createdAt', 'desc'),
            limit(200) // Reasonable limit to get all recent patients
        );

        const unsubscribe = onSnapshot(q, async (snapshot) => {
            console.log('Loading enhanced patient summaries...');
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
                    updatedAt: dischargeData.updatedAt?.toDate() || new Date(),
                    visitDate: dischargeData.visitDate?.toDate() || dischargeData.createdAt?.toDate() || new Date()
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
                        group.petWeight = discharge.pet.weight || group.petWeight;
                    }
                }
            });

            console.log(`Found ${petGroups.size} unique pets across ${snapshot.docs.length} discharges`);

            // Now get enhanced metrics for each pet
            const enhancedPatients = await Promise.all(
                Array.from(petGroups.values()).map(async (petGroup) => {
                    try {
                        // Get enhanced metrics using our new utility function
                        const metrics = await getPatientListMetrics(
                            petGroup.petName,
                            clinic.id,
                            petGroup.petSpecies
                        );

                        // Calculate alert level
                        const alertLevel = calculateAlertLevel(
                            metrics.overallAdherenceRate,
                            metrics.recentSymptomAlerts
                        );

                        // Count total medications across all discharges
                        const totalMedications = petGroup.allDischarges.reduce(
                            (count, discharge) => count + (discharge.medications?.length || 0),
                            0
                        );

                        const patient: PatientSummary = {
                            dischargeId: petGroup.latestDischarge.id,
                            petId: petGroup.petId,
                            petName: petGroup.petName,
                            petSpecies: petGroup.petSpecies,
                            petWeight: petGroup.petWeight,
                            createdAt: petGroup.allDischarges[petGroup.allDischarges.length - 1].createdAt, // First discharge
                            updatedAt: petGroup.latestDischarge.createdAt, // Most recent discharge

                            // Enhanced metrics
                            lastVisitDate: metrics.lastVisitDate,
                            overallAdherenceRate: metrics.overallAdherenceRate,
                            activeOnlyAdherenceRate: metrics.activeOnlyAdherenceRate,
                            recentSymptomAlerts: metrics.recentSymptomAlerts,
                            currentStatus: metrics.currentStatus,

                            // Calculated fields
                            medicationCount: totalMedications,
                            totalDischarges: petGroup.allDischarges.length,
                            alertLevel
                        };

                        return patient;
                    } catch (error) {
                        console.error(`Error loading metrics for pet ${petGroup.petName}:`, error);

                        // Return basic patient data without enhanced metrics
                        return {
                            dischargeId: petGroup.latestDischarge.id,
                            petId: petGroup.petId,
                            petName: petGroup.petName,
                            petSpecies: petGroup.petSpecies,
                            petWeight: petGroup.petWeight,
                            createdAt: petGroup.allDischarges[petGroup.allDischarges.length - 1].createdAt,
                            updatedAt: petGroup.latestDischarge.createdAt,
                            lastVisitDate: petGroup.latestDischarge.visitDate || petGroup.latestDischarge.createdAt,
                            overallAdherenceRate: 0,
                            activeOnlyAdherenceRate: 0,
                            recentSymptomAlerts: 0,
                            currentStatus: 'inactive' as const,
                            medicationCount: petGroup.allDischarges.reduce((count, d) => count + (d.medications?.length || 0), 0),
                            totalDischarges: petGroup.allDischarges.length,
                            alertLevel: 'none' as const
                        };
                    }
                })
            );

            // Sort patients by priority (alert level) and then by recent activity
            enhancedPatients.sort((a, b) => {
                // First by alert level (high priority first)
                const alertOrder = { 'high': 0, 'medium': 1, 'low': 2, 'none': 3 };
                const alertDiff = alertOrder[a.alertLevel] - alertOrder[b.alertLevel];
                if (alertDiff !== 0) return alertDiff;

                // Then by active status
                if (a.currentStatus !== b.currentStatus) {
                    return a.currentStatus === 'active' ? -1 : 1;
                }

                // Finally by most recent visit
                return b.lastVisitDate.getTime() - a.lastVisitDate.getTime();
            });

            setPatients(enhancedPatients);
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
            if (filterStatus === 'active' && patient.currentStatus !== 'active') return false;
            if (filterStatus === 'inactive' && patient.currentStatus !== 'inactive') return false;
        }

        // Alert filter
        if (filterAlert !== 'all' && patient.alertLevel !== filterAlert) {
            return false;
        }

        return true;
    });

    // Utility functions for styling
    const getAlertColor = (level: string) => {
        switch (level) {
            case 'high': return '#ef4444';
            case 'medium': return '#FF9500';
            case 'low': return '#eab308';
            default: return '#34C759';
        }
    };

    const getAlertBgColor = (level: string) => {
        switch (level) {
            case 'high': return '#fee2e2';
            case 'medium': return '#fef3c7';
            case 'low': return '#fef3c7';
            default: return '#dcfce7';
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

    const getAdherenceColor = (rate: number) => {
        if (rate >= 85) return '#34C759'; // Success Green
        if (rate >= 70) return '#FF9500'; // Warning Orange
        return '#ef4444'; // Error Red
    };

    const getStatusColor = (status: 'active' | 'inactive') => {
        return status === 'active' ? '#34C759' : '#6D6D72';
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    // Calculate quick stats from real data
    const quickStats = {
        totalPatients: patients.length,
        activePatients: patients.filter(p => p.currentStatus === 'active').length,
        highPriorityPatients: patients.filter(p => p.alertLevel === 'high').length,
        avgAdherence: Math.round(patients.reduce((sum, p) => sum + p.overallAdherenceRate, 0) / patients.length) || 0,
        totalAlerts: patients.reduce((sum, p) => sum + p.recentSymptomAlerts, 0)
    };

    if (authLoading || loading) {
        return (
            <div style={{
                minHeight: '100vh',
                backgroundColor: '#f8fafc',
                fontFamily: 'Nunito, -apple-system, BlinkMacSystemFont, sans-serif',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
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
                    Loading patients...
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

            {/* Main Content */}
            <main style={{
                maxWidth: '1400px',
                margin: '0 auto',
                padding: isMobile ? '1rem' : '2rem'
            }}>
                {/* Page Header */}
                <div style={{
                    display: 'flex',
                    flexDirection: isMobile ? 'column' : 'row',
                    justifyContent: 'space-between',
                    alignItems: isMobile ? 'flex-start' : 'center',
                    gap: isMobile ? '1rem' : '0',
                    marginBottom: '2rem'
                }}>
                    <div>
                        <h1 style={{
                            fontSize: isMobile ? '1.75rem' : '2.25rem',
                            fontWeight: '700',
                            color: '#1e293b',
                            margin: '0 0 0.5rem 0'
                        }}>
                            Patient Management
                        </h1>
                        <p style={{
                            fontSize: isMobile ? '0.875rem' : '1rem',
                            color: '#64748b',
                            margin: 0
                        }}>
                            Monitor adherence, symptoms, and treatment progress for all your patients
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
                            gap: '0.5rem',
                            whiteSpace: 'nowrap',
                            boxShadow: '0 4px 12px rgba(0, 122, 255, 0.25)',
                            transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 122, 255, 0.35)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 122, 255, 0.25)';
                        }}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        New Discharge
                    </Link>
                </div>

                {/* Quick Stats at Top */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)',
                    gap: isMobile ? '1rem' : '1.5rem',
                    marginBottom: '2rem'
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        padding: isMobile ? '1.25rem' : '1.5rem',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                        textAlign: 'center',
                        transition: 'transform 0.2s ease'
                    }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        <div style={{
                            fontSize: isMobile ? '1.75rem' : '2rem',
                            fontWeight: '700',
                            color: '#007AFF',
                            marginBottom: '0.5rem'
                        }}>
                            {quickStats.totalPatients}
                        </div>
                        <div style={{
                            fontSize: '0.75rem',
                            color: '#6D6D72',
                            fontWeight: '600',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                        }}>
                            Total Patients
                        </div>
                    </div>

                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        padding: isMobile ? '1.25rem' : '1.5rem',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                        textAlign: 'center',
                        transition: 'transform 0.2s ease'
                    }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        <div style={{
                            fontSize: isMobile ? '1.75rem' : '2rem',
                            fontWeight: '700',
                            color: '#34C759',
                            marginBottom: '0.5rem'
                        }}>
                            {quickStats.activePatients}
                        </div>
                        <div style={{
                            fontSize: '0.75rem',
                            color: '#6D6D72',
                            fontWeight: '600',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                        }}>
                            Active Patients
                        </div>
                    </div>

                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        padding: isMobile ? '1.25rem' : '1.5rem',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                        textAlign: 'center',
                        transition: 'transform 0.2s ease'
                    }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        <div style={{
                            fontSize: isMobile ? '1.75rem' : '2rem',
                            fontWeight: '700',
                            color: '#ef4444',
                            marginBottom: '0.5rem'
                        }}>
                            {quickStats.highPriorityPatients}
                        </div>
                        <div style={{
                            fontSize: '0.75rem',
                            color: '#6D6D72',
                            fontWeight: '600',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                        }}>
                            High Priority
                        </div>
                    </div>

                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        padding: isMobile ? '1.25rem' : '1.5rem',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                        textAlign: 'center',
                        transition: 'transform 0.2s ease'
                    }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        <div style={{
                            fontSize: isMobile ? '1.75rem' : '2rem',
                            fontWeight: '700',
                            color: getAdherenceColor(quickStats.avgAdherence),
                            marginBottom: '0.5rem'
                        }}>
                            {quickStats.avgAdherence}%
                        </div>
                        <div style={{
                            fontSize: '0.75rem',
                            color: '#6D6D72',
                            fontWeight: '600',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                        }}>
                            Avg Adherence
                        </div>
                    </div>

                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        padding: isMobile ? '1.25rem' : '1.5rem',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                        textAlign: 'center',
                        transition: 'transform 0.2s ease',
                        gridColumn: isMobile ? 'span 2' : 'auto'
                    }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        <div style={{
                            fontSize: isMobile ? '1.75rem' : '2rem',
                            fontWeight: '700',
                            color: '#FF9500',
                            marginBottom: '0.5rem'
                        }}>
                            {quickStats.totalAlerts}
                        </div>
                        <div style={{
                            fontSize: '0.75rem',
                            color: '#6D6D72',
                            fontWeight: '600',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                        }}>
                            Recent Alerts
                        </div>
                    </div>
                </div>

                {/* Search and Filters */}
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    padding: isMobile ? '1.25rem' : '1.5rem',
                    marginBottom: '1.5rem',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
                }}>
                    <div style={{
                        display: 'flex',
                        flexDirection: isMobile ? 'column' : 'row',
                        gap: '1rem',
                        alignItems: isMobile ? 'stretch' : 'center'
                    }}>
                        <div style={{ flex: 1, position: 'relative' }}>
                            <div style={{
                                position: 'absolute',
                                left: '1rem',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: '#9ca3af'
                            }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="11" cy="11" r="8" />
                                    <path d="m21 21-4.35-4.35" />
                                </svg>
                            </div>
                            <input
                                type="text"
                                placeholder="Search pets by name or species..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '0.875rem 1rem 0.875rem 2.5rem',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '8px',
                                    fontSize: '0.875rem',
                                    fontFamily: 'inherit',
                                    outline: 'none',
                                    transition: 'border-color 0.2s ease'
                                }}
                                onFocus={(e) => e.target.style.borderColor = '#007AFF'}
                                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                            />
                        </div>

                        <div style={{
                            display: 'flex',
                            gap: '0.75rem',
                            flexWrap: 'wrap'
                        }}>
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'inactive')}
                                style={{
                                    padding: '0.875rem 1rem',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '8px',
                                    fontSize: '0.875rem',
                                    backgroundColor: 'white',
                                    fontFamily: 'inherit',
                                    minWidth: '120px',
                                    outline: 'none'
                                }}
                            >
                                <option value="all">All Status</option>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>

                            <select
                                value={filterAlert}
                                onChange={(e) => setFilterAlert(e.target.value as 'all' | 'high' | 'medium' | 'low' | 'none')}
                                style={{
                                    padding: '0.875rem 1rem',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '8px',
                                    fontSize: '0.875rem',
                                    backgroundColor: 'white',
                                    fontFamily: 'inherit',
                                    minWidth: '120px',
                                    outline: 'none'
                                }}
                            >
                                <option value="all">All Priority</option>
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
                    overflow: 'hidden',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
                }}>
                    {filteredPatients.length === 0 ? (
                        <div style={{
                            padding: '4rem 2rem',
                            textAlign: 'center',
                            color: '#6b7280'
                        }}>
                            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🐾</div>
                            <h3 style={{
                                fontSize: '1.25rem',
                                fontWeight: '600',
                                marginBottom: '0.5rem',
                                color: '#374151'
                            }}>
                                {searchTerm || filterStatus !== 'all' || filterAlert !== 'all'
                                    ? 'No patients match your filters'
                                    : 'No patients found'
                                }
                            </h3>
                            <p style={{ fontSize: '0.875rem', margin: 0 }}>
                                {searchTerm || filterStatus !== 'all' || filterAlert !== 'all'
                                    ? 'Try adjusting your search or filters'
                                    : 'Create your first discharge to see patients here'
                                }
                            </p>
                        </div>
                    ) : (
                        <div>
                            {/* Desktop Table Header */}
                            {!isMobile && (
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: '2.5fr 1fr 1.2fr 0.8fr 0.8fr 1fr',
                                    gap: '1.25rem',
                                    padding: '1.25rem 2rem',
                                    backgroundColor: '#f8fafc',
                                    borderBottom: '1px solid #e2e8f0',
                                    fontSize: '0.75rem',
                                    fontWeight: '600',
                                    color: '#6D6D72',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.075em'
                                }}>
                                    <div>Patient</div>
                                    <div style={{ textAlign: 'center' }}>Last Visit</div>
                                    <div style={{ textAlign: 'center' }}>Adherence</div>
                                    <div style={{ textAlign: 'center' }}>Symptoms</div>
                                    <div style={{ textAlign: 'center' }}>Status</div>
                                    <div style={{ textAlign: 'center' }}>Priority</div>
                                </div>
                            )}

                            {/* Patient Rows */}
                            {filteredPatients.map((patient, index) => (
                                <Link
                                    key={patient.petId}
                                    href={`/dashboard/patients/${patient.dischargeId}`}
                                    style={{
                                        display: isMobile ? 'block' : 'grid',
                                        gridTemplateColumns: isMobile ? 'none' : '2.5fr 1fr 1.2fr 0.8fr 0.8fr 1fr',
                                        gap: isMobile ? '0' : '1.25rem',
                                        padding: isMobile ? '1.5rem' : '1.75rem 2rem',
                                        borderBottom: index < filteredPatients.length - 1 ? '1px solid #f1f5f9' : 'none',
                                        textDecoration: 'none',
                                        color: 'inherit',
                                        transition: 'background-color 0.2s ease',
                                        cursor: 'pointer'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                    {isMobile ? (
                                        // Mobile layout
                                        <div>
                                            <div style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'flex-start',
                                                marginBottom: '1rem'
                                            }}>
                                                <div>
                                                    <h3 style={{
                                                        fontSize: '1.25rem',
                                                        fontWeight: '600',
                                                        color: '#1e293b',
                                                        margin: '0 0 0.25rem 0'
                                                    }}>
                                                        {patient.petName}
                                                    </h3>
                                                    <p style={{
                                                        fontSize: '0.875rem',
                                                        color: '#64748b',
                                                        margin: 0
                                                    }}>
                                                        {patient.petSpecies}
                                                        {patient.petWeight && ` • ${patient.petWeight}`}
                                                    </p>
                                                </div>

                                                <div style={{
                                                    backgroundColor: getAlertBgColor(patient.alertLevel),
                                                    color: getAlertColor(patient.alertLevel),
                                                    padding: '0.375rem 0.75rem',
                                                    borderRadius: '8px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: '600'
                                                }}>
                                                    {getAlertText(patient.alertLevel)}
                                                </div>
                                            </div>

                                            <div style={{
                                                display: 'grid',
                                                gridTemplateColumns: 'repeat(2, 1fr)',
                                                gap: '1rem',
                                                fontSize: '0.875rem'
                                            }}>
                                                <div>
                                                    <span style={{ color: '#6b7280', fontSize: '0.75rem', fontWeight: '500' }}>Last Visit</span>
                                                    <div style={{ fontWeight: '500', color: '#374151' }}>{formatDate(patient.lastVisitDate)}</div>
                                                </div>

                                                <div>
                                                    <span style={{ color: '#6b7280', fontSize: '0.75rem', fontWeight: '500' }}>Status</span>
                                                    <div style={{
                                                        color: getStatusColor(patient.currentStatus),
                                                        fontWeight: '500',
                                                        textTransform: 'capitalize'
                                                    }}>
                                                        {patient.currentStatus}
                                                    </div>
                                                </div>

                                                <div>
                                                    <span style={{ color: '#6b7280', fontSize: '0.75rem', fontWeight: '500' }}>Adherence</span>
                                                    <div style={{
                                                        color: getAdherenceColor(patient.overallAdherenceRate),
                                                        fontWeight: '600'
                                                    }}>
                                                        {patient.overallAdherenceRate}%
                                                    </div>
                                                </div>

                                                <div>
                                                    <span style={{ color: '#6b7280', fontSize: '0.75rem', fontWeight: '500' }}>Alerts</span>
                                                    <div style={{
                                                        color: patient.recentSymptomAlerts > 0 ? '#ef4444' : '#9ca3af',
                                                        fontWeight: '500'
                                                    }}>
                                                        {patient.recentSymptomAlerts || 'None'}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Symptoms Component */}
                                            {patient.recentSymptomAlerts > 0 && (
                                                <div style={{ marginTop: '1rem' }}>
                                                    <SymptomBadge
                                                        dischargeId={patient.dischargeId}
                                                        clinicId={clinic?.id || ''}
                                                        showTooltip={false}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        // Desktop layout
                                        <>
                                            <div>
                                                <h3 style={{
                                                    fontSize: '1rem',
                                                    fontWeight: '600',
                                                    color: '#1e293b',
                                                    margin: '0 0 0.25rem 0'
                                                }}>
                                                    {patient.petName}
                                                </h3>
                                                <p style={{
                                                    fontSize: '0.875rem',
                                                    color: '#64748b',
                                                    margin: '0 0 0.25rem 0'
                                                }}>
                                                    {patient.petSpecies}
                                                    {patient.petWeight && ` • ${patient.petWeight}`}
                                                </p>
                                                <p style={{
                                                    fontSize: '0.75rem',
                                                    color: '#9ca3af',
                                                    margin: 0
                                                }}>
                                                    {patient.totalDischarges} visit{patient.totalDischarges !== 1 ? 's' : ''}
                                                </p>
                                            </div>

                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{
                                                    fontSize: '0.875rem',
                                                    fontWeight: '500',
                                                    color: '#374151'
                                                }}>
                                                    {formatDate(patient.lastVisitDate)}
                                                </div>
                                            </div>

                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{
                                                    fontSize: '0.875rem',
                                                    fontWeight: '600',
                                                    color: getAdherenceColor(patient.overallAdherenceRate),
                                                    marginBottom: '0.25rem'
                                                }}>
                                                    {patient.overallAdherenceRate}%
                                                </div>
                                                <div style={{
                                                    fontSize: '0.75rem',
                                                    color: getAdherenceColor(patient.activeOnlyAdherenceRate)
                                                }}>
                                                    {patient.activeOnlyAdherenceRate}% active
                                                </div>
                                            </div>

                                            <div style={{
                                                display: 'flex',
                                                justifyContent: 'center',
                                                alignItems: 'center'
                                            }}>
                                                {patient.recentSymptomAlerts > 0 ? (
                                                    <SymptomBadge
                                                        dischargeId={patient.dischargeId}
                                                        clinicId={clinic?.id || ''}
                                                        showTooltip={true}
                                                    />
                                                ) : (
                                                    <span style={{
                                                        fontSize: '0.75rem',
                                                        color: '#9ca3af'
                                                    }}>
                                                        No alerts
                                                    </span>
                                                )}
                                            </div>

                                            <div style={{
                                                display: 'flex',
                                                justifyContent: 'center',
                                                alignItems: 'center'
                                            }}>
                                                <div style={{
                                                    backgroundColor: patient.currentStatus === 'active' ? '#dcfce7' : '#f1f5f9',
                                                    color: getStatusColor(patient.currentStatus),
                                                    padding: '0.375rem 0.75rem',
                                                    borderRadius: '6px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: '600',
                                                    textTransform: 'capitalize'
                                                }}>
                                                    {patient.currentStatus}
                                                </div>
                                            </div>

                                            <div style={{
                                                display: 'flex',
                                                justifyContent: 'center',
                                                alignItems: 'center'
                                            }}>
                                                <div style={{
                                                    backgroundColor: getAlertBgColor(patient.alertLevel),
                                                    color: getAlertColor(patient.alertLevel),
                                                    padding: '0.375rem 0.75rem',
                                                    borderRadius: '8px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: '600'
                                                }}>
                                                    {getAlertText(patient.alertLevel)}
                                                </div>
                                            </div>
                                        </>
                                    )}
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
                                        background: 'none',
                                        border: 'none',
                                        color: '#007AFF',
                                        cursor: 'pointer',
                                        textDecoration: 'underline',
                                        fontSize: 'inherit',
                                        fontFamily: 'inherit'
                                    }}
                                >
                                    Clear filters
                                </button>
                            </span>
                        )}
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