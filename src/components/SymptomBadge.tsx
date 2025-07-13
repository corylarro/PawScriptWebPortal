// components/SymptomBadge.tsx
'use client';

import { useState, useEffect } from 'react';
import { getSymptomFlagCount, formatSymptomFlag, SymptomFlag } from '@/lib/symptomFlags';

interface SymptomBadgeProps {
    dischargeId: string;
    clinicId: string;
    flags?: SymptomFlag[]; // Optional: pass existing flags to avoid re-fetching
    className?: string;
    showTooltip?: boolean;
}

export default function SymptomBadge({
    dischargeId,
    clinicId,
    flags,
    className = '',
    showTooltip = true
}: SymptomBadgeProps) {
    const [flagCount, setFlagCount] = useState<number>(0);
    const [loading, setLoading] = useState(true);
    const [showTooltipState, setShowTooltipState] = useState(false);

    useEffect(() => {
        if (flags) {
            // Use provided flags if available
            setFlagCount(flags.length);
            setLoading(false);
        } else {
            // Fetch flag count from API
            const fetchFlagCount = async () => {
                try {
                    const count = await getSymptomFlagCount(dischargeId, clinicId);
                    setFlagCount(count);
                } catch (error) {
                    console.error('Error fetching symptom flag count:', error);
                    setFlagCount(0);
                } finally {
                    setLoading(false);
                }
            };

            fetchFlagCount();
        }
    }, [dischargeId, clinicId, flags]);

    // Don't render if no flags
    if (loading) {
        return (
            <div style={{
                width: '20px',
                height: '20px',
                backgroundColor: '#f1f5f9',
                borderRadius: '10px',
                animation: 'pulse 1.5s ease-in-out infinite'
            }}>
                <style jsx>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}</style>
            </div>
        );
    }

    if (flagCount === 0) {
        return null;
    }

    const handleMouseEnter = () => {
        if (showTooltip) {
            setShowTooltipState(true);
        }
    };

    const handleMouseLeave = () => {
        setShowTooltipState(false);
    };

    return (
        <div
            style={{ position: 'relative', display: 'inline-block' }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {/* Main Badge */}
            <div
                style={{
                    backgroundColor: '#FF9500', // Warning Orange from PawScript palette
                    color: 'white',
                    padding: '0.375rem 0.75rem',
                    borderRadius: '16px',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    cursor: showTooltip ? 'pointer' : 'default',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 1px 3px rgba(255, 149, 0, 0.3)',
                    fontFamily: 'Nunito, system-ui, sans-serif'
                }}
                className={className}
                onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#e8850c'; // Slightly darker orange on hover
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 2px 6px rgba(255, 149, 0, 0.4)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#FF9500';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(255, 149, 0, 0.3)';
                }}
            >
                {/* Warning Icon */}
                <span style={{
                    fontSize: '1rem',
                    lineHeight: '1',
                    display: 'flex',
                    alignItems: 'center'
                }}>
                    ⚠︎
                </span>

                {/* Text */}
                <span style={{ lineHeight: '1' }}>
                    Symptoms ({flagCount})
                </span>
            </div>

            {/* Tooltip */}
            {showTooltip && showTooltipState && flags && flags.length > 0 && (
                <div
                    style={{
                        position: 'absolute',
                        top: '100%',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        marginTop: '0.5rem',
                        backgroundColor: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        padding: '1rem',
                        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
                        zIndex: 50,
                        minWidth: '280px',
                        maxWidth: '400px',
                        fontFamily: 'Nunito, system-ui, sans-serif'
                    }}
                >
                    {/* Tooltip Arrow */}
                    <div
                        style={{
                            position: 'absolute',
                            top: '-6px',
                            left: '50%',
                            transform: 'translateX(-50%) rotate(45deg)',
                            width: '12px',
                            height: '12px',
                            backgroundColor: 'white',
                            border: '1px solid #e2e8f0',
                            borderBottom: 'none',
                            borderRight: 'none'
                        }}
                    />

                    {/* Tooltip Header */}
                    <div style={{
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: '#1e293b',
                        marginBottom: '0.75rem',
                        paddingBottom: '0.5rem',
                        borderBottom: '1px solid #f1f5f9'
                    }}>
                        Recent Symptom Flags
                    </div>

                    {/* Flag List */}
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem'
                    }}>
                        {flags.slice(0, 5).map((flag, index) => ( // Show max 5 most recent flags
                            <div
                                key={`${flag.type}-${flag.date}-${index}`}
                                style={{
                                    fontSize: '0.75rem',
                                    color: '#374151',
                                    lineHeight: '1.4',
                                    padding: '0.5rem',
                                    backgroundColor: '#f8fafc',
                                    borderRadius: '6px',
                                    borderLeft: `3px solid ${getSeverityColor(flag.severity)}`
                                }}
                            >
                                {formatSymptomFlag(flag)}
                            </div>
                        ))}

                        {flags.length > 5 && (
                            <div style={{
                                fontSize: '0.75rem',
                                color: '#64748b',
                                fontStyle: 'italic',
                                textAlign: 'center',
                                marginTop: '0.25rem'
                            }}>
                                +{flags.length - 5} more flag{flags.length - 5 !== 1 ? 's' : ''}
                            </div>
                        )}
                    </div>

                    {/* Tooltip Footer */}
                    <div style={{
                        fontSize: '0.75rem',
                        color: '#64748b',
                        marginTop: '0.75rem',
                        paddingTop: '0.5rem',
                        borderTop: '1px solid #f1f5f9',
                        textAlign: 'center'
                    }}>
                        View full symptom history in the Symptoms tab
                    </div>
                </div>
            )}
        </div>
    );
}

/**
 * Get color for symptom flag severity
 */
function getSeverityColor(severity: 'low' | 'medium' | 'high'): string {
    switch (severity) {
        case 'high': return '#ef4444'; // Red
        case 'medium': return '#f59e0b'; // Orange
        case 'low': return '#eab308'; // Yellow
        default: return '#6b7280'; // Gray
    }
}

/**
 * Compact version for use in tight spaces (just the icon and count)
 */
export function SymptomBadgeCompact({
    dischargeId,
    clinicId,
    flags,
    className = ''
}: SymptomBadgeProps) {
    const [flagCount, setFlagCount] = useState<number>(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (flags) {
            setFlagCount(flags.length);
            setLoading(false);
        } else {
            const fetchFlagCount = async () => {
                try {
                    const count = await getSymptomFlagCount(dischargeId, clinicId);
                    setFlagCount(count);
                } catch (error) {
                    console.error('Error fetching symptom flag count:', error);
                    setFlagCount(0);
                } finally {
                    setLoading(false);
                }
            };

            fetchFlagCount();
        }
    }, [dischargeId, clinicId, flags]);

    if (loading) {
        return (
            <div style={{
                width: '24px',
                height: '24px',
                backgroundColor: '#f1f5f9',
                borderRadius: '12px',
                animation: 'pulse 1.5s ease-in-out infinite'
            }} />
        );
    }

    if (flagCount === 0) {
        return null;
    }

    return (
        <div
            style={{
                backgroundColor: '#FF9500',
                color: 'white',
                width: '24px',
                height: '24px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                fontWeight: '700',
                fontFamily: 'Nunito, system-ui, sans-serif',
                boxShadow: '0 1px 3px rgba(255, 149, 0, 0.3)'
            }}
            className={className}
            title={`${flagCount} symptom flag${flagCount !== 1 ? 's' : ''}`}
        >
            {flagCount > 9 ? '9+' : flagCount}
        </div>
    );
}