// src/app/dashboard/discharge-success/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { Discharge } from '@/types/discharge';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/types/firestore';

export default function DischargeSuccessPage() {
    const { vetUser, clinic } = useAuth();
    const { loading: authLoading } = useRequireAuth();
    const searchParams = useSearchParams();

    const [discharge, setDischarge] = useState<Discharge | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [qrCodeUrl, setQrCodeUrl] = useState('');
    const [dischargeViewUrl, setDischargeViewUrl] = useState('');

    const dischargeId = searchParams.get('id');

    useEffect(() => {
        const loadDischarge = async () => {
            if (!dischargeId) {
                setError('No discharge ID provided');
                setLoading(false);
                return;
            }

            try {
                console.log('Loading discharge:', dischargeId);
                const docRef = doc(db, COLLECTIONS.DISCHARGES, dischargeId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    const dischargeData: Discharge = {
                        id: docSnap.id,
                        pet: data.pet,
                        medications: data.medications,
                        notes: data.notes,
                        vetId: data.vetId,
                        clinicId: data.clinicId,
                        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
                        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
                    };

                    console.log('Loaded discharge:', dischargeData);
                    setDischarge(dischargeData);
                } else {
                    setError('Discharge not found');
                }
            } catch (err) {
                console.error('Error loading discharge:', err);
                setError('Failed to load discharge');
            } finally {
                setLoading(false);
            }
        };

        // Generate URLs only on client side
        const generateUrls = () => {
            if (typeof window !== 'undefined' && dischargeId) {
                const baseUrl = `${window.location.origin}/discharge/${dischargeId}`;
                setDischargeViewUrl(baseUrl);
                setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(baseUrl)}`);
            }
        };

        if (!authLoading) {
            loadDischarge();
            generateUrls();
        }
    }, [dischargeId, authLoading]);

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
                    <p style={{ color: '#64748b', fontSize: '1rem' }}>Loading discharge...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#f8fafc'
            }}>
                <div style={{ textAlign: 'center', maxWidth: '400px', padding: '2rem' }}>
                    <div style={{
                        fontSize: '3rem',
                        marginBottom: '1rem'
                    }}>❌</div>
                    <h1 style={{
                        fontSize: '1.5rem',
                        fontWeight: '600',
                        color: '#dc2626',
                        marginBottom: '0.5rem'
                    }}>
                        Error Loading Discharge
                    </h1>
                    <p style={{
                        color: '#6b7280',
                        marginBottom: '2rem'
                    }}>
                        {error}
                    </p>
                    <Link
                        href="/dashboard"
                        style={{
                            display: 'inline-block',
                            backgroundColor: '#2563eb',
                            color: 'white',
                            padding: '0.75rem 1.5rem',
                            borderRadius: '8px',
                            textDecoration: 'none',
                            fontWeight: '600'
                        }}
                    >
                        Back to Dashboard
                    </Link>
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
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}>
                <div style={{
                    maxWidth: '1200px',
                    margin: '0 auto',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <h1 style={{
                        fontSize: '1.25rem',
                        fontWeight: '600',
                        color: '#1e293b',
                        margin: '0'
                    }}>
                        Discharge Created Successfully
                    </h1>

                    <div style={{ textAlign: 'right' }}>
                        <div style={{
                            fontSize: '0.75rem',
                            color: '#64748b',
                            fontWeight: '600'
                        }}>
                            {clinic?.name}
                        </div>
                        <div style={{
                            fontSize: '0.75rem',
                            color: '#94a3b8'
                        }}>
                            Dr. {vetUser?.firstName} {vetUser?.lastName}
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main style={{
                maxWidth: '800px',
                margin: '0 auto',
                padding: '2rem'
            }}>
                {/* Success Message */}
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    padding: '2rem',
                    marginBottom: '2rem',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                    border: '1px solid #e2e8f0',
                    textAlign: 'center'
                }}>
                    <div style={{
                        width: '64px',
                        height: '64px',
                        backgroundColor: '#16a34a',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 1.5rem auto',
                        fontSize: '1.5rem',
                        color: 'white'
                    }}>
                        ✓
                    </div>

                    <h2 style={{
                        fontSize: '1.5rem',
                        fontWeight: '700',
                        color: '#1e293b',
                        marginBottom: '0.5rem'
                    }}>
                        Discharge Summary Created!
                    </h2>

                    <p style={{
                        fontSize: '1rem',
                        color: '#64748b',
                        marginBottom: '1.5rem'
                    }}>
                        {discharge && `Discharge summary for ${discharge.pet.name} has been created successfully.`}
                    </p>

                    <div style={{
                        backgroundColor: '#f3f4f6',
                        padding: '1rem',
                        borderRadius: '8px',
                        fontSize: '0.875rem',
                        color: '#374151'
                    }}>
                        <strong>Discharge ID:</strong> {dischargeId}
                    </div>
                </div>

                {/* QR Code Section */}
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    padding: '2rem',
                    marginBottom: '2rem',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                    border: '1px solid #e2e8f0'
                }}>
                    <h3 style={{
                        fontSize: '1.25rem',
                        fontWeight: '600',
                        color: '#1e293b',
                        marginBottom: '1.5rem',
                        textAlign: 'center'
                    }}>
                        QR Code for Pet Owner
                    </h3>

                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '1.5rem'
                    }}>
                        {/* QR Code */}
                        {qrCodeUrl && (
                            <div style={{
                                padding: '1rem',
                                backgroundColor: '#ffffff',
                                borderRadius: '12px',
                                border: '2px solid #e5e7eb',
                                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                            }}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={qrCodeUrl}
                                    alt="QR Code for discharge summary"
                                    width={200}
                                    height={200}
                                    style={{
                                        display: 'block'
                                    }}
                                />
                            </div>
                        )}

                        {/* Instructions */}
                        <div style={{
                            textAlign: 'center',
                            maxWidth: '500px'
                        }}>
                            <p style={{
                                fontSize: '1rem',
                                color: '#374151',
                                marginBottom: '1rem',
                                lineHeight: '1.6'
                            }}>
                                <strong>Instructions for pet owner:</strong>
                            </p>
                            <ol style={{
                                textAlign: 'left',
                                color: '#6b7280',
                                fontSize: '0.875rem',
                                lineHeight: '1.6',
                                paddingLeft: '1.5rem'
                            }}>
                                <li>Open the PawScript app on your phone</li>
                                <li>Tap the QR code scanner</li>
                                <li>Scan this QR code</li>
                                <li>The medication schedule will be automatically added</li>
                            </ol>
                        </div>

                        {/* Alternative Link */}
                        {dischargeViewUrl && (
                            <div style={{
                                backgroundColor: '#f8fafc',
                                padding: '1rem',
                                borderRadius: '8px',
                                border: '1px solid #e2e8f0',
                                width: '100%',
                                textAlign: 'center'
                            }}>
                                <p style={{
                                    fontSize: '0.875rem',
                                    color: '#6b7280',
                                    marginBottom: '0.5rem'
                                }}>
                                    Alternative: Send this link directly
                                </p>
                                <code style={{
                                    fontSize: '0.75rem',
                                    color: '#374151',
                                    backgroundColor: '#ffffff',
                                    padding: '0.5rem',
                                    borderRadius: '4px',
                                    border: '1px solid #d1d5db',
                                    wordBreak: 'break-all'
                                }}>
                                    {dischargeViewUrl}
                                </code>
                            </div>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '1rem',
                    flexWrap: 'wrap'
                }}>
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
                            transition: 'background-color 0.2s ease'
                        }}
                    >
                        Create Another Discharge
                    </Link>

                    <Link
                        href="/dashboard"
                        style={{
                            backgroundColor: 'white',
                            color: '#6b7280',
                            border: '1px solid #d1d5db',
                            padding: '0.75rem 1.5rem',
                            borderRadius: '8px',
                            textDecoration: 'none',
                            fontWeight: '600',
                            fontSize: '0.875rem',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        Back to Dashboard
                    </Link>
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