// src/app/dashboard/discharge-success/page.tsx
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { doc, getDoc } from 'firebase/firestore';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { Discharge } from '@/types/discharge';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/types/firestore';

// Separate component that uses useSearchParams
function DischargeSuccessContent() {
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
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        width: '64px',
                        height: '64px',
                        backgroundColor: '#fee2e2',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 1rem auto',
                        fontSize: '1.5rem',
                        color: '#dc2626'
                    }}>
                        ⚠️
                    </div>
                    <h2 style={{
                        fontSize: '1.5rem',
                        fontWeight: '700',
                        color: '#dc2626',
                        marginBottom: '0.5rem'
                    }}>
                        Error
                    </h2>
                    <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
                        {error}
                    </p>
                    <Link
                        href="/dashboard"
                        style={{
                            backgroundColor: '#007AFF',
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

                    {discharge && (
                        <p style={{
                            fontSize: '1rem',
                            color: '#64748b',
                            marginBottom: '2rem'
                        }}>
                            Successfully created discharge for <strong>{discharge.pet.name}</strong> with {discharge.medications.length} medication{discharge.medications.length === 1 ? '' : 's'}.
                        </p>
                    )}

                    {/* QR Code Section */}
                    <div style={{
                        padding: '2rem',
                        backgroundColor: '#f8fafc',
                        borderRadius: '8px',
                        marginBottom: '2rem'
                    }}>
                        <h3 style={{
                            fontSize: '1.25rem',
                            fontWeight: '600',
                            color: '#1e293b',
                            marginBottom: '1rem'
                        }}>
                            Share with Pet Owner
                        </h3>

                        {qrCodeUrl && (
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '1rem'
                            }}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={qrCodeUrl}
                                    alt="QR Code for discharge"
                                    style={{
                                        width: '200px',
                                        height: '200px',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '8px'
                                    }}
                                />
                                <p style={{
                                    fontSize: '0.875rem',
                                    color: '#64748b',
                                    textAlign: 'center'
                                }}>
                                    Pet owners can scan this QR code to import the discharge into their PawScript mobile app
                                </p>
                            </div>
                        )}

                        {dischargeViewUrl && (
                            <div style={{
                                marginTop: '1rem',
                                padding: '1rem',
                                backgroundColor: 'white',
                                borderRadius: '8px',
                                border: '1px solid #e2e8f0'
                            }}>
                                <p style={{
                                    fontSize: '0.875rem',
                                    color: '#64748b',
                                    marginBottom: '0.5rem'
                                }}>
                                    Direct link:
                                </p>
                                <code style={{
                                    fontSize: '0.75rem',
                                    color: '#1e293b',
                                    backgroundColor: '#f1f5f9',
                                    padding: '0.5rem',
                                    borderRadius: '4px',
                                    display: 'block',
                                    wordBreak: 'break-all'
                                }}>
                                    {dischargeViewUrl}
                                </code>
                            </div>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div style={{
                        display: 'flex',
                        gap: '1rem',
                        justifyContent: 'center',
                        flexWrap: 'wrap'
                    }}>
                        <Link
                            href="/dashboard/new-discharge"
                            style={{
                                backgroundColor: '#007AFF',
                                color: 'white',
                                padding: '0.75rem 1.5rem',
                                borderRadius: '8px',
                                textDecoration: 'none',
                                fontWeight: '600'
                            }}
                        >
                            Create Another
                        </Link>
                        <Link
                            href="/dashboard"
                            style={{
                                backgroundColor: '#f1f5f9',
                                color: '#64748b',
                                padding: '0.75rem 1.5rem',
                                borderRadius: '8px',
                                textDecoration: 'none',
                                fontWeight: '600',
                                border: '1px solid #e2e8f0'
                            }}
                        >
                            Back to Dashboard
                        </Link>
                    </div>
                </div>
            </main>

            {/* Animation styles */}
            <style jsx>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}

// Main component with Suspense wrapper
export default function DischargeSuccessPage() {
    return (
        <Suspense fallback={
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
                    <p style={{ color: '#64748b', fontSize: '1rem' }}>Loading...</p>
                </div>
            </div>
        }>
            <DischargeSuccessContent />
        </Suspense>
    );
}