// components/AdherenceTable.tsx
'use client';

import { AdherenceMetrics } from '@/lib/adherence';

interface AdherenceTableProps {
    metrics: AdherenceMetrics | null;
    loading?: boolean;
}

export default function AdherenceTable({ metrics, loading }: AdherenceTableProps) {
    if (loading) {
        return (
            <div style={{
                padding: '3rem 2rem',
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
                    margin: '0 auto 1rem auto'
                }} />
                Loading adherence data...
            </div>
        );
    }

    if (!metrics || metrics.perMedication.length === 0) {
        return (
            <div style={{
                padding: '3rem 2rem',
                textAlign: 'center',
                color: '#6b7280',
                backgroundColor: '#f8fafc',
                borderRadius: '12px',
                border: '1px solid #e2e8f0'
            }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📊</div>
                <h4 style={{
                    fontSize: '1.125rem',
                    fontWeight: '600',
                    marginBottom: '0.5rem',
                    color: '#374151'
                }}>
                    No Adherence Data Yet
                </h4>
                <p style={{
                    fontSize: '0.875rem',
                    margin: '0',
                    lineHeight: '1.5'
                }}>
                    Medication adherence data will appear here once the pet owner starts logging doses in the PawScript mobile app.
                </p>
            </div>
        );
    }

    const getAdherenceColor = (rate: number) => {
        if (rate >= 85) return '#16a34a'; // Green
        if (rate >= 70) return '#f59e0b'; // Orange  
        return '#ef4444'; // Red
    };

    const getAdherenceBadge = (rate: number) => {
        if (rate >= 85) return { color: '#16a34a', bg: '#dcfce7', label: 'Excellent' };
        if (rate >= 70) return { color: '#f59e0b', bg: '#fef3c7', label: 'Good' };
        return { color: '#ef4444', bg: '#fee2e2', label: 'Needs Attention' };
    };

    return (
        <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            overflow: 'hidden'
        }}>
            {/* Table Header */}
            <div style={{
                backgroundColor: '#f8fafc',
                padding: '1rem 1.5rem',
                borderBottom: '1px solid #e2e8f0'
            }}>
                <h3 style={{
                    fontSize: '1.125rem',
                    fontWeight: '600',
                    color: '#1e293b',
                    margin: '0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                }}>
                    💊 Medication Adherence
                </h3>
            </div>

            {/* Desktop Table */}
            <div style={{ display: 'block' }} className="desktop-table">
                {/* Column Headers */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1fr 1fr 1fr 1.2fr',
                    gap: '1rem',
                    padding: '1rem 1.5rem',
                    backgroundColor: '#f1f5f9',
                    borderBottom: '1px solid #e2e8f0',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    color: '#64748b',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                }}>
                    <div>Medication</div>
                    <div style={{ textAlign: 'center' }}>On-time</div>
                    <div style={{ textAlign: 'center' }}>Late</div>
                    <div style={{ textAlign: 'center' }}>Missed</div>
                    <div style={{ textAlign: 'center' }}>Adherence</div>
                </div>

                {/* Data Rows */}
                {metrics.perMedication.map((med, index) => {
                    const badge = getAdherenceBadge(med.adherenceRate);

                    return (
                        <div
                            key={med.medicationName}
                            style={{
                                display: 'grid',
                                gridTemplateColumns: '2fr 1fr 1fr 1fr 1.2fr',
                                gap: '1rem',
                                padding: '1.25rem 1.5rem',
                                borderBottom: index < metrics.perMedication.length - 1 ? '1px solid #f1f5f9' : 'none',
                                transition: 'background-color 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#f8fafc';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                        >
                            {/* Medication Name */}
                            <div>
                                <div style={{
                                    fontSize: '0.875rem',
                                    fontWeight: '600',
                                    color: '#1e293b',
                                    marginBottom: '0.25rem'
                                }}>
                                    {med.medicationName}
                                </div>
                                <div style={{
                                    fontSize: '0.75rem',
                                    color: '#64748b'
                                }}>
                                    {med.totalDoses} total dose{med.totalDoses !== 1 ? 's' : ''}
                                </div>
                            </div>

                            {/* On-time Doses */}
                            <div style={{ textAlign: 'center' }}>
                                <div style={{
                                    fontSize: '1.25rem',
                                    fontWeight: '700',
                                    color: '#16a34a',
                                    marginBottom: '0.25rem'
                                }}>
                                    {med.onTimeDoses}
                                </div>
                                <div style={{
                                    fontSize: '0.75rem',
                                    color: '#64748b'
                                }}>
                                    {med.totalDoses > 0 ? Math.round((med.onTimeDoses / med.totalDoses) * 100) : 0}%
                                </div>
                            </div>

                            {/* Late Doses */}
                            <div style={{ textAlign: 'center' }}>
                                <div style={{
                                    fontSize: '1.25rem',
                                    fontWeight: '700',
                                    color: '#f59e0b',
                                    marginBottom: '0.25rem'
                                }}>
                                    {med.lateDoses}
                                </div>
                                <div style={{
                                    fontSize: '0.75rem',
                                    color: '#64748b'
                                }}>
                                    {med.totalDoses > 0 ? Math.round((med.lateDoses / med.totalDoses) * 100) : 0}%
                                </div>
                            </div>

                            {/* Missed Doses */}
                            <div style={{ textAlign: 'center' }}>
                                <div style={{
                                    fontSize: '1.25rem',
                                    fontWeight: '700',
                                    color: '#ef4444',
                                    marginBottom: '0.25rem'
                                }}>
                                    {med.missedDoses}
                                </div>
                                <div style={{
                                    fontSize: '0.75rem',
                                    color: '#64748b'
                                }}>
                                    {med.totalDoses > 0 ? Math.round((med.missedDoses / med.totalDoses) * 100) : 0}%
                                </div>
                            </div>

                            {/* Overall Adherence */}
                            <div style={{ textAlign: 'center' }}>
                                <div style={{
                                    fontSize: '1.5rem',
                                    fontWeight: '700',
                                    color: getAdherenceColor(med.adherenceRate),
                                    marginBottom: '0.5rem'
                                }}>
                                    {med.adherenceRate}%
                                </div>
                                <div style={{
                                    backgroundColor: badge.bg,
                                    color: badge.color,
                                    padding: '0.25rem 0.5rem',
                                    borderRadius: '12px',
                                    fontSize: '0.75rem',
                                    fontWeight: '600',
                                    display: 'inline-block'
                                }}>
                                    {badge.label}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Mobile Cards (hidden on desktop) */}
            <div style={{ display: 'none' }} className="mobile-cards">
                {metrics.perMedication.map((med, index) => {
                    const badge = getAdherenceBadge(med.adherenceRate);

                    return (
                        <div
                            key={med.medicationName}
                            style={{
                                padding: '1.5rem',
                                borderBottom: index < metrics.perMedication.length - 1 ? '1px solid #f1f5f9' : 'none'
                            }}
                        >
                            {/* Medication Header */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '1rem'
                            }}>
                                <div>
                                    <div style={{
                                        fontSize: '1rem',
                                        fontWeight: '600',
                                        color: '#1e293b',
                                        marginBottom: '0.25rem'
                                    }}>
                                        {med.medicationName}
                                    </div>
                                    <div style={{
                                        fontSize: '0.75rem',
                                        color: '#64748b'
                                    }}>
                                        {med.totalDoses} total doses
                                    </div>
                                </div>

                                <div style={{ textAlign: 'right' }}>
                                    <div style={{
                                        fontSize: '1.5rem',
                                        fontWeight: '700',
                                        color: getAdherenceColor(med.adherenceRate),
                                        marginBottom: '0.25rem'
                                    }}>
                                        {med.adherenceRate}%
                                    </div>
                                    <div style={{
                                        backgroundColor: badge.bg,
                                        color: badge.color,
                                        padding: '0.25rem 0.5rem',
                                        borderRadius: '12px',
                                        fontSize: '0.75rem',
                                        fontWeight: '600',
                                        display: 'inline-block'
                                    }}>
                                        {badge.label}
                                    </div>
                                </div>
                            </div>

                            {/* Dose Breakdown */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(3, 1fr)',
                                gap: '1rem',
                                backgroundColor: '#f8fafc',
                                padding: '1rem',
                                borderRadius: '8px'
                            }}>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{
                                        fontSize: '1.25rem',
                                        fontWeight: '700',
                                        color: '#16a34a',
                                        marginBottom: '0.25rem'
                                    }}>
                                        {med.onTimeDoses}
                                    </div>
                                    <div style={{
                                        fontSize: '0.75rem',
                                        color: '#64748b',
                                        fontWeight: '600'
                                    }}>
                                        On-time
                                    </div>
                                </div>

                                <div style={{ textAlign: 'center' }}>
                                    <div style={{
                                        fontSize: '1.25rem',
                                        fontWeight: '700',
                                        color: '#f59e0b',
                                        marginBottom: '0.25rem'
                                    }}>
                                        {med.lateDoses}
                                    </div>
                                    <div style={{
                                        fontSize: '0.75rem',
                                        color: '#64748b',
                                        fontWeight: '600'
                                    }}>
                                        Late
                                    </div>
                                </div>

                                <div style={{ textAlign: 'center' }}>
                                    <div style={{
                                        fontSize: '1.25rem',
                                        fontWeight: '700',
                                        color: '#ef4444',
                                        marginBottom: '0.25rem'
                                    }}>
                                        {med.missedDoses}
                                    </div>
                                    <div style={{
                                        fontSize: '0.75rem',
                                        color: '#64748b',
                                        fontWeight: '600'
                                    }}>
                                        Missed
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Overall Summary Footer */}
            {metrics.overall.totalDoses > 0 && (
                <div style={{
                    backgroundColor: '#f8fafc',
                    padding: '1rem 1.5rem',
                    borderTop: '1px solid #e2e8f0'
                }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '1rem'
                    }}>
                        <div style={{
                            fontSize: '0.875rem',
                            color: '#64748b'
                        }}>
                            <strong style={{ color: '#1e293b' }}>Overall:</strong> {metrics.overall.givenDoses} of {metrics.overall.totalDoses} doses given ({metrics.overall.lateDoses} late)
                        </div>
                        <div style={{
                            fontSize: '1.125rem',
                            fontWeight: '700',
                            color: getAdherenceColor(metrics.overall.adherenceRate)
                        }}>
                            {metrics.overall.adherenceRate}% Total Adherence
                        </div>
                    </div>
                </div>
            )}

            {/* Responsive CSS */}
            <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .desktop-table {
            display: none !important;
          }
          
          .mobile-cards {
            display: block !important;
          }
        }
      `}</style>
        </div>
    );
}