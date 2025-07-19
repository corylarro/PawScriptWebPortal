// components/patientDetail/MedicationsTab.tsx
'use client';

import AdherenceTable from '@/components/AdherenceTable';

// Types for this component
interface AdherenceMetrics {
    overall: {
        totalDoses: number;
        givenDoses: number;
        lateDoses: number;
        missedDoses: number;
        adherenceRate: number;
    };
    perMedication: Array<{
        medicationName: string;
        totalDoses: number;
        onTimeDoses: number;
        lateDoses: number;
        missedDoses: number;
        adherenceRate: number;
        discharges?: string[];
    }>;
    timeline: Array<{
        date: string;
        scheduledDoses: number;
        givenDoses: number;
        missedDoses: number;
        adherenceRate: number;
    }>;
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

interface MedicationsTabProps {
    adherenceMetrics: AdherenceMetrics | null;
    recentDischarges: RecentDischarge[];
    petName: string;
}

export default function MedicationsTab({
    adherenceMetrics,
    recentDischarges,
    petName
}: MedicationsTabProps) {
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
                Medication Adherence - All Visits
            </h3>

            {adherenceMetrics && adherenceMetrics.perMedication.length > 0 ? (
                <div>
                    <div style={{
                        backgroundColor: '#f0f9ff',
                        border: '1px solid #bae6fd',
                        borderRadius: '12px',
                        padding: '1rem',
                        marginBottom: '1.5rem',
                        fontSize: '0.875rem',
                        color: '#0369a1'
                    }}>
                        <strong>Combined Data:</strong> This view shows medication adherence across all {recentDischarges.length + 1} discharge{recentDischarges.length > 0 ? 's' : ''} for {petName}.
                    </div>
                    <AdherenceTable
                        metrics={adherenceMetrics}
                        loading={!adherenceMetrics}
                    />
                </div>
            ) : (
                <div style={{
                    textAlign: 'center',
                    padding: '3rem',
                    color: '#6D6D72',
                    backgroundColor: '#f8fafc',
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0'
                }}>
                    <div style={{ fontSize: '3.5rem', marginBottom: '1.5rem' }}>💊</div>
                    <h4 style={{
                        fontSize: '1.25rem',
                        fontWeight: '600',
                        marginBottom: '0.75rem',
                        color: '#374151'
                    }}>
                        No Medication Data Available
                    </h4>
                    <p style={{ fontSize: '1rem', fontWeight: '400', lineHeight: '1.5' }}>
                        Medication adherence data will appear here once the pet owner starts logging doses in the PawScript mobile app.
                    </p>
                </div>
            )}
        </div>
    );
}