// components/patientDetail/SymptomsTab.tsx
'use client';

// Local types for this component to avoid conflicts
interface SymptomEntry {
    date: string; // YYYY-MM-DD
    appetite: number;
    energyLevel: number;
    isPanting: boolean;
    notes?: string;
    recordedAt: Date;
    dischargeId?: string;
}

interface SymptomFlag {
    type: 'appetite_low' | 'appetite_drop' | 'energy_low' | 'energy_drop' | 'panting_persistent';
    date: string; // YYYY-MM-DD when the flag was triggered
    description: string;
    severity: 'low' | 'medium' | 'high';
    value?: number; // The symptom value that triggered the flag
    previousValue?: number; // For drop flags
    dischargeId?: string;
}

export interface ExtendedSymptomAnalysis {
    flags: SymptomFlag[];
    recentEntries: SymptomEntry[];
    trends: {
        appetite: { current: number; sevenDayAverage: number; trend: 'improving' | 'stable' | 'declining' };
        energy: { current: number; sevenDayAverage: number; trend: 'improving' | 'stable' | 'declining' };
        panting: { recentDays: number; isFrequent: boolean };
    };
}

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

interface SymptomsTabProps {
    symptomAnalysis: ExtendedSymptomAnalysis | null;
    recentDischarges: RecentDischarge[];
    petName: string;
}

export default function SymptomsTab({
    symptomAnalysis,
    recentDischarges,
    petName
}: SymptomsTabProps) {
    // Helper function to format date
    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    // Helper function to get flags for a specific date
    const getFlagsForDate = (flags: SymptomFlag[], date: string): SymptomFlag[] => {
        return flags.filter(flag => flag.date === date);
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
                Symptom Analysis - All Visits
            </h3>

            {!symptomAnalysis || symptomAnalysis.recentEntries.length === 0 ? (
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
                        No Symptom Data Available
                    </h4>
                    <p style={{ fontSize: '1rem', fontWeight: '400', lineHeight: '1.5' }}>
                        Symptom data will appear here once the pet owner starts logging daily symptoms in the PawScript mobile app.
                    </p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Combined Data Notice */}
                    <div style={{
                        backgroundColor: '#f0f9ff',
                        border: '1px solid #bae6fd',
                        borderRadius: '12px',
                        padding: '1rem',
                        fontSize: '0.875rem',
                        color: '#0369a1'
                    }}>
                        <strong>Combined Data:</strong> This view shows symptom data across all {recentDischarges.length + 1} discharge{recentDischarges.length > 0 ? 's' : ''} for {petName}.
                    </div>

                    {/* Symptom Flags */}
                    {symptomAnalysis.flags.length > 0 && (
                        <div style={{
                            backgroundColor: '#fef3c7',
                            border: '1px solid #fbbf24',
                            borderRadius: '12px',
                            padding: '1.5rem',
                            marginBottom: '1rem'
                        }}>
                            <h4 style={{
                                fontSize: '1.125rem',
                                fontWeight: '600',
                                color: '#92400e',
                                marginBottom: '1rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}>
                                <span>⚠️</span>
                                Symptom Alerts ({symptomAnalysis.flags.length})
                            </h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {symptomAnalysis.flags.map((flag, index) => (
                                    <div key={index} style={{
                                        fontSize: '0.875rem',
                                        color: '#92400e',
                                        fontWeight: '400',
                                        padding: '0.75rem',
                                        backgroundColor: '#fff3cd',
                                        borderRadius: '8px',
                                        border: '1px solid #fbbf24'
                                    }}>
                                        <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
                                            {flag.date} - {flag.type.replace('_', ' ').toUpperCase()}
                                        </div>
                                        <div>{flag.description}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Recent Symptom Entries */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {symptomAnalysis.recentEntries.map((entry, index) => {
                            const entryFlags = getFlagsForDate(symptomAnalysis.flags, entry.date);
                            return (
                                <div key={index} style={{
                                    padding: '1.75rem',
                                    backgroundColor: entryFlags.length > 0 ? '#fef3c7' : '#f8fafc',
                                    borderRadius: '16px',
                                    border: entryFlags.length > 0 ? '1px solid #fbbf24' : '1px solid #e2e8f0'
                                }}>
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginBottom: '1.25rem'
                                    }}>
                                        <h4 style={{
                                            fontSize: '1.125rem',
                                            fontWeight: '600',
                                            color: '#1e293b',
                                            margin: '0',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem'
                                        }}>
                                            Daily Symptoms
                                            {entryFlags.length > 0 && (
                                                <span style={{
                                                    marginLeft: '0.5rem',
                                                    fontSize: '0.75rem',
                                                    backgroundColor: '#d97706',
                                                    color: '#FFFFFF',
                                                    padding: '0.25rem 0.5rem',
                                                    borderRadius: '12px',
                                                    fontWeight: '600'
                                                }}>
                                                    {entryFlags.length} Alert{entryFlags.length !== 1 ? 's' : ''}
                                                </span>
                                            )}
                                            {entry.dischargeId && (
                                                <span style={{
                                                    fontSize: '0.75rem',
                                                    backgroundColor: '#e0f2fe',
                                                    color: '#0369a1',
                                                    padding: '0.25rem 0.5rem',
                                                    borderRadius: '6px',
                                                    fontWeight: '500'
                                                }}>
                                                    Visit: {entry.dischargeId.slice(-6)}
                                                </span>
                                            )}
                                        </h4>
                                        <div style={{
                                            fontSize: '1rem',
                                            color: '#6D6D72',
                                            fontWeight: '500'
                                        }}>
                                            {formatDate(new Date(entry.date))}
                                        </div>
                                    </div>

                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                                        gap: '1.25rem',
                                        marginBottom: entry.notes ? '1.25rem' : '0'
                                    }}>
                                        <div style={{
                                            backgroundColor: '#FFFFFF',
                                            padding: '1rem',
                                            borderRadius: '10px',
                                            border: '1px solid #e2e8f0',
                                            textAlign: 'center',
                                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
                                        }}>
                                            <div style={{
                                                fontSize: '0.8125rem',
                                                fontWeight: '600',
                                                color: '#6D6D72',
                                                marginBottom: '0.5rem'
                                            }}>
                                                APPETITE
                                            </div>
                                            <div style={{
                                                fontSize: '1.5rem',
                                                fontWeight: '700',
                                                color: entry.appetite >= 4 ? '#16a34a' : entry.appetite >= 3 ? '#d97706' : '#dc2626'
                                            }}>
                                                {entry.appetite}/5
                                            </div>
                                        </div>

                                        <div style={{
                                            backgroundColor: '#FFFFFF',
                                            padding: '1rem',
                                            borderRadius: '10px',
                                            border: '1px solid #e2e8f0',
                                            textAlign: 'center',
                                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
                                        }}>
                                            <div style={{
                                                fontSize: '0.8125rem',
                                                fontWeight: '600',
                                                color: '#6D6D72',
                                                marginBottom: '0.5rem'
                                            }}>
                                                ENERGY
                                            </div>
                                            <div style={{
                                                fontSize: '1.5rem',
                                                fontWeight: '700',
                                                color: entry.energyLevel >= 4 ? '#16a34a' : entry.energyLevel >= 3 ? '#d97706' : '#dc2626'
                                            }}>
                                                {entry.energyLevel}/5
                                            </div>
                                        </div>

                                        <div style={{
                                            backgroundColor: '#FFFFFF',
                                            padding: '1rem',
                                            borderRadius: '10px',
                                            border: '1px solid #e2e8f0',
                                            textAlign: 'center',
                                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
                                        }}>
                                            <div style={{
                                                fontSize: '0.8125rem',
                                                fontWeight: '600',
                                                color: '#6D6D72',
                                                marginBottom: '0.5rem'
                                            }}>
                                                PANTING
                                            </div>
                                            <div style={{
                                                fontSize: '1.5rem',
                                                fontWeight: '700',
                                                color: entry.isPanting ? '#d97706' : '#16a34a'
                                            }}>
                                                {entry.isPanting ? 'Yes' : 'No'}
                                            </div>
                                        </div>
                                    </div>

                                    {entry.notes && (
                                        <div style={{
                                            backgroundColor: '#FFFFFF',
                                            padding: '1rem',
                                            borderRadius: '10px',
                                            border: '1px solid #e2e8f0',
                                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
                                        }}>
                                            <div style={{
                                                fontSize: '0.8125rem',
                                                fontWeight: '600',
                                                color: '#6D6D72',
                                                marginBottom: '0.5rem'
                                            }}>
                                                OWNER NOTES
                                            </div>
                                            <div style={{
                                                fontSize: '0.9375rem',
                                                color: '#374151',
                                                lineHeight: '1.5',
                                                fontStyle: 'italic',
                                                fontWeight: '400'
                                            }}>
                                                &quot;{entry.notes}&quot;
                                            </div>
                                        </div>
                                    )}

                                    {/* Show flags for this date */}
                                    {entryFlags.length > 0 && (
                                        <div style={{
                                            marginTop: '1.25rem',
                                            padding: '1rem',
                                            backgroundColor: '#fff3cd',
                                            borderRadius: '10px',
                                            border: '1px solid #fbbf24'
                                        }}>
                                            <div style={{
                                                fontSize: '0.8125rem',
                                                fontWeight: '600',
                                                color: '#92400e',
                                                marginBottom: '0.75rem'
                                            }}>
                                                TRIGGERED ALERTS
                                            </div>
                                            {entryFlags.map((flag, flagIndex) => (
                                                <div key={flagIndex} style={{
                                                    fontSize: '0.8125rem',
                                                    color: '#92400e',
                                                    fontWeight: '400',
                                                    marginBottom: flagIndex < entryFlags.length - 1 ? '0.5rem' : '0',
                                                    padding: '0.5rem',
                                                    backgroundColor: '#fef3c7',
                                                    borderRadius: '6px'
                                                }}>
                                                    • {flag.description}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}