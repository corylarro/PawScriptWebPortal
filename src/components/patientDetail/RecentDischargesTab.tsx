// components/patientDetail/RecentDischargesTab.tsx
'use client';

import Link from 'next/link';
import SymptomBadge from '@/components/SymptomBadge';

// Types for this component
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

interface RecentDischargesTabProps {
    recentDischarges: RecentDischarge[];
    petName: string;
    clinicId: string;
}

export default function RecentDischargesTab({
    recentDischarges,
    petName,
    clinicId
}: RecentDischargesTabProps) {
    // Helper function to format date
    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    return (
        <div>
            <h3 style={{
                fontSize: '1.375rem',
                fontWeight: '600',
                color: '#1e293b',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
            }}>
                <span></span>
                Recent Discharges for {petName}
            </h3>

            {recentDischarges.length === 0 ? (
                <div style={{
                    textAlign: 'center',
                    padding: '3rem',
                    color: '#6D6D72',
                    backgroundColor: '#f8fafc',
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0'
                }}>
                    <div style={{ fontSize: '3.5rem', marginBottom: '1.5rem' }}></div>
                    <h4 style={{
                        fontSize: '1.25rem',
                        fontWeight: '600',
                        marginBottom: '0.75rem',
                        color: '#374151'
                    }}>
                        No Previous Discharges
                    </h4>
                    <p style={{ fontSize: '1rem', fontWeight: '400', lineHeight: '1.5' }}>
                        This is the first discharge found for {petName}. As more visits are recorded, they will appear here for easy comparison.
                    </p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {recentDischarges.map((recentDischarge) => (
                        <Link
                            key={recentDischarge.id}
                            href={`/discharge/${recentDischarge.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '1.5rem',
                                backgroundColor: '#f8fafc',
                                borderRadius: '12px',
                                border: '1px solid #e2e8f0',
                                textDecoration: 'none',
                                transition: 'all 0.2s ease',
                                cursor: 'pointer'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#e6f3ff';
                                e.currentTarget.style.borderColor = '#007AFF';
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 122, 255, 0.15)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '#f8fafc';
                                e.currentTarget.style.borderColor = '#e2e8f0';
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = 'none';
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{
                                    width: '12px',
                                    height: '12px',
                                    borderRadius: '50%',
                                    backgroundColor: recentDischarge.isActive ? '#16a34a' : '#6b7280'
                                }} />
                                <div>
                                    <div style={{
                                        fontSize: '1rem',
                                        fontWeight: '600',
                                        color: '#1e293b',
                                        marginBottom: '0.375rem'
                                    }}>
                                        Discharge Summary - {formatDate(recentDischarge.createdAt)}
                                    </div>
                                    <div style={{
                                        fontSize: '0.875rem',
                                        color: '#6D6D72',
                                        fontWeight: '400',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '1rem',
                                        flexWrap: 'wrap'
                                    }}>
                                        <span>{recentDischarge.adherenceRate}% adherence</span>
                                        {recentDischarge.symptomFlagCount > 0 && (
                                            <span style={{ color: '#d97706' }}>
                                                {recentDischarge.symptomFlagCount} symptom flag{recentDischarge.symptomFlagCount !== 1 ? 's' : ''}
                                            </span>
                                        )}
                                        <span style={{
                                            backgroundColor: recentDischarge.isActive ? '#dcfce7' : '#f3f4f6',
                                            color: recentDischarge.isActive ? '#16a34a' : '#6b7280',
                                            padding: '0.125rem 0.5rem',
                                            borderRadius: '6px',
                                            fontSize: '0.75rem',
                                            fontWeight: '500'
                                        }}>
                                            {recentDischarge.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                {recentDischarge.symptomFlagCount > 0 && (
                                    <SymptomBadge
                                        dischargeId={recentDischarge.id}
                                        clinicId={clinicId}
                                        showTooltip={false}
                                    />
                                )}
                                <svg
                                    width="20"
                                    height="20"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="#6D6D72"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    style={{ flexShrink: 0 }}
                                >
                                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                    <polyline points="15,3 21,3 21,9" />
                                    <line x1="10" y1="14" x2="21" y2="3" />
                                </svg>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}