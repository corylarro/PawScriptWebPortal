// components/patientDetail/TimelineTab.tsx
'use client';

// Types for this component
interface TimelineEvent {
    id: string;
    type: 'dose' | 'symptom_flag';
    date: string;
    time?: string;
    title: string;
    description: string;
    severity?: 'low' | 'medium' | 'high';
    delay?: number; // hours for dose events
    medicationName?: string;
    dischargeId?: string;
    sortTime: Date;
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

interface TimelineTabProps {
    timelineEvents: TimelineEvent[];
    recentDischarges: RecentDischarge[];
    petName: string;
}

export default function TimelineTab({
    timelineEvents,
    recentDischarges,
    petName
}: TimelineTabProps) {
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
                <span>📅</span>
                Treatment Timeline - All Visits
            </h3>

            {timelineEvents.length === 0 ? (
                <div style={{
                    textAlign: 'center',
                    padding: '3rem',
                    color: '#6D6D72',
                    backgroundColor: '#f8fafc',
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0'
                }}>
                    <div style={{ fontSize: '3.5rem', marginBottom: '1.5rem' }}>📅</div>
                    <h4 style={{
                        fontSize: '1.25rem',
                        fontWeight: '600',
                        marginBottom: '0.75rem',
                        color: '#374151'
                    }}>
                        No Timeline Events Yet
                    </h4>
                    <p style={{ fontSize: '1rem', fontWeight: '400', lineHeight: '1.5' }}>
                        Timeline events will appear here once the pet owner starts logging doses and symptoms in the mobile app.
                    </p>
                </div>
            ) : (
                <div>
                    {/* Combined Data Notice */}
                    <div style={{
                        backgroundColor: '#f0f9ff',
                        border: '1px solid #bae6fd',
                        borderRadius: '12px',
                        padding: '1rem',
                        marginBottom: '2rem',
                        fontSize: '0.875rem',
                        color: '#0369a1'
                    }}>
                        <strong>Combined Timeline:</strong> This view shows all medication and symptom events across {recentDischarges.length + 1} discharge{recentDischarges.length > 0 ? 's' : ''} for {petName}.
                    </div>

                    <div style={{ position: 'relative' }}>
                        {/* Timeline line */}
                        <div style={{
                            position: 'absolute',
                            left: '1.25rem',
                            top: '0',
                            bottom: '0',
                            width: '3px',
                            backgroundColor: '#e2e8f0',
                            borderRadius: '1.5px'
                        }} />

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            {timelineEvents.map((event) => (
                                <div key={event.id} style={{
                                    position: 'relative',
                                    paddingLeft: '3.5rem'
                                }}>
                                    {/* Timeline dot */}
                                    <div style={{
                                        position: 'absolute',
                                        left: '0.875rem',
                                        top: '1rem',
                                        width: '0.75rem',
                                        height: '0.75rem',
                                        borderRadius: '50%',
                                        backgroundColor: event.type === 'dose'
                                            ? (event.severity === 'high' ? '#dc2626' :
                                                event.severity === 'medium' ? '#d97706' : '#16a34a')
                                            : '#8b5cf6',
                                        border: '3px solid #FFFFFF',
                                        boxShadow: '0 0 0 1px #e2e8f0'
                                    }} />

                                    <div style={{
                                        padding: '1.5rem',
                                        backgroundColor: event.severity === 'high' ? '#fee2e2' :
                                            event.severity === 'medium' ? '#fef3c7' : '#f8fafc',
                                        borderRadius: '12px',
                                        border: `1px solid ${event.severity === 'high' ? '#fca5a5' :
                                            event.severity === 'medium' ? '#fbbf24' : '#e2e8f0'}`,
                                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
                                    }}>
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'flex-start',
                                            marginBottom: '0.75rem',
                                            flexWrap: 'wrap',
                                            gap: '0.75rem'
                                        }}>
                                            <div style={{
                                                fontSize: '1rem',
                                                fontWeight: '600',
                                                color: '#1e293b',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.5rem',
                                                flexWrap: 'wrap'
                                            }}>
                                                {event.title}
                                                {event.medicationName && (
                                                    <span style={{
                                                        fontSize: '0.75rem',
                                                        backgroundColor: '#e0f2fe',
                                                        color: '#0369a1',
                                                        padding: '0.25rem 0.5rem',
                                                        borderRadius: '6px',
                                                        fontWeight: '500'
                                                    }}>
                                                        {event.medicationName}
                                                    </span>
                                                )}
                                                {event.dischargeId && (
                                                    <span style={{
                                                        fontSize: '0.75rem',
                                                        backgroundColor: '#f3f4f6',
                                                        color: '#6b7280',
                                                        padding: '0.25rem 0.5rem',
                                                        borderRadius: '6px',
                                                        fontWeight: '500'
                                                    }}>
                                                        Visit: {event.dischargeId.slice(-6)}
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{
                                                fontSize: '0.875rem',
                                                color: '#6D6D72',
                                                fontWeight: '400'
                                            }}>
                                                {formatDate(new Date(event.date))}
                                                {event.time && ` at ${event.time}`}
                                            </div>
                                        </div>

                                        <div style={{
                                            fontSize: '0.875rem',
                                            color: '#374151',
                                            fontWeight: '400',
                                            lineHeight: '1.5'
                                        }}>
                                            {event.description}
                                            {event.type === 'dose' && event.delay && event.delay > 2 && (
                                                <span style={{
                                                    marginLeft: '0.75rem',
                                                    color: event.delay > 6 ? '#dc2626' : '#d97706',
                                                    fontWeight: '600',
                                                    backgroundColor: event.delay > 6 ? '#fee2e2' : '#fef3c7',
                                                    padding: '0.25rem 0.5rem',
                                                    borderRadius: '6px',
                                                    fontSize: '0.75rem'
                                                }}>
                                                    ⏰ {Math.round(event.delay)}h late
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}