// src/app/dashboard/discharge-success/page.tsx - Mobile Responsive Version
'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { Discharge } from '@/types/discharge';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/types/firestore';
import DischargeSummary from '@/components/DischargeSummary';

// Loading component
function LoadingSpinner() {
    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f8fafc',
            fontFamily: 'Nunito, sans-serif',
            padding: '1rem'
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
                    color: '#64748b',
                    fontSize: '1rem',
                    fontWeight: '400'
                }}>
                    Loading discharge...
                </p>
            </div>
        </div>
    );
}

// Error component
function ErrorDisplay({ error }: { error: string }) {
    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f8fafc',
            fontFamily: 'Nunito, sans-serif',
            padding: '1rem'
        }}>
            <div style={{
                textAlign: 'center',
                maxWidth: '400px'
            }}>
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
                <p style={{
                    color: '#64748b',
                    marginBottom: '1.5rem',
                    fontSize: '1rem'
                }}>
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
                        fontWeight: '600',
                        display: 'inline-block',
                        transition: 'background-color 0.2s ease'
                    }}
                >
                    Back to Dashboard
                </Link>
            </div>
        </div>
    );
}

// Success actions header
function SuccessActions({ onPrint, onDownload, isDownloading, isMobile }: {
    onPrint: () => void;
    onDownload: () => void;
    isDownloading: boolean;
    isMobile: boolean;
}) {
    return (
        <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: isMobile ? '1.5rem' : '2rem',
            marginBottom: '2rem',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
            border: '1px solid #e2e8f0',
            textAlign: 'center'
        }} className="no-print">
            <div style={{
                width: isMobile ? '48px' : '64px',
                height: isMobile ? '48px' : '64px',
                backgroundColor: '#34C759',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.5rem auto',
                fontSize: isMobile ? '1.25rem' : '1.5rem',
                color: 'white'
            }}>
                ✓
            </div>

            <h1 style={{
                fontSize: isMobile ? '1.25rem' : '1.5rem',
                fontWeight: '700',
                color: '#1e293b',
                marginBottom: '1rem',
                fontFamily: 'Nunito, sans-serif'
            }}>
                Discharge Summary Created!
            </h1>

            {/* Action Buttons */}
            <div style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                gap: '1rem',
                justifyContent: 'center',
                marginBottom: '1rem'
            }}>
                <button
                    onClick={onPrint}
                    style={{
                        backgroundColor: '#6366f1',
                        color: 'white',
                        border: 'none',
                        padding: '0.75rem 1.5rem',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontFamily: 'Nunito, sans-serif',
                        fontSize: '0.875rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        transition: 'background-color 0.2s ease',
                        width: isMobile ? '100%' : 'auto'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#4f46e5'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#6366f1'}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6,9 6,2 18,2 18,9" />
                        <path d="M6,18H4a2,2,0,0,1-2-2V11a2,2,0,0,1,2-2H20a2,2,0,0,1,2,2v5a2,2,0,0,1-2,2H18" />
                        <rect x="6" y="14" width="12" height="8" />
                    </svg>
                    Print
                </button>

                <button
                    onClick={onDownload}
                    disabled={isDownloading}
                    style={{
                        backgroundColor: isDownloading ? '#9ca3af' : '#f59e0b',
                        color: 'white',
                        border: 'none',
                        padding: '0.75rem 1.5rem',
                        borderRadius: '8px',
                        cursor: isDownloading ? 'not-allowed' : 'pointer',
                        fontWeight: '600',
                        fontFamily: 'Nunito, sans-serif',
                        fontSize: '0.875rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        transition: 'background-color 0.2s ease',
                        width: isMobile ? '100%' : 'auto'
                    }}
                    onMouseEnter={(e) => {
                        if (!isDownloading) {
                            e.currentTarget.style.backgroundColor = '#d97706';
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (!isDownloading) {
                            e.currentTarget.style.backgroundColor = '#f59e0b';
                        }
                    }}
                >
                    {isDownloading ? (
                        <div style={{
                            width: '16px',
                            height: '16px',
                            border: '2px solid rgba(255,255,255,0.3)',
                            borderTop: '2px solid white',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite'
                        }} />
                    ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7,10 12,15 17,10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                    )}
                    {isDownloading ? 'Generating...' : 'Download PDF'}
                </button>
            </div>

            <div style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                gap: '1rem',
                justifyContent: 'center'
            }}>
                <Link
                    href="/dashboard/new-discharge"
                    style={{
                        backgroundColor: '#007AFF',
                        color: 'white',
                        padding: '0.75rem 1.5rem',
                        borderRadius: '8px',
                        textDecoration: 'none',
                        fontWeight: '600',
                        fontFamily: 'Nunito, sans-serif',
                        transition: 'background-color 0.2s ease',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        width: isMobile ? '100%' : 'auto'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0056CC'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#007AFF'}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
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
                        fontFamily: 'Nunito, sans-serif',
                        border: '1px solid #e2e8f0',
                        transition: 'background-color 0.2s ease',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: isMobile ? '100%' : 'auto'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#e2e8f0';
                        e.currentTarget.style.color = '#374151';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#f1f5f9';
                        e.currentTarget.style.color = '#64748b';
                    }}
                >
                    Back to Dashboard
                </Link>
            </div>
        </div>
    );
}

// Main content component that uses useSearchParams
function DischargeSuccessContent() {
    const { vetUser, clinic } = useAuth();
    const { loading: authLoading } = useRequireAuth();
    const searchParams = useSearchParams();
    const printRef = useRef<HTMLDivElement>(null);

    const [discharge, setDischarge] = useState<Discharge | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [qrCodeUrl, setQrCodeUrl] = useState('');
    const [dischargeViewUrl, setDischargeViewUrl] = useState('');
    const [isDownloading, setIsDownloading] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    const dischargeId = searchParams.get('id');

    // Check if mobile on mount and resize
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

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
                        visitDate: data.visitDate?.toDate ? data.visitDate.toDate() : data.visitDate,
                        diagnosis: data.diagnosis,
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

    const handlePrint = () => {
        if (printRef.current) {
            const printContent = printRef.current.innerHTML;
            const originalContent = document.body.innerHTML;

            document.body.innerHTML = printContent;
            window.print();
            document.body.innerHTML = originalContent;
            window.location.reload(); // Reload to restore React functionality
        }
    };

    const handleDownloadPDF = async () => {
        setIsDownloading(true);

        try {
            // For now, we'll use the browser's print functionality
            // html2pdf.js can be added later if needed
            if (printRef.current) {
                // Create a simple PDF-like experience using print
                const printContent = printRef.current.innerHTML;
                const originalContent = document.body.innerHTML;

                document.body.innerHTML = printContent;
                window.print();
                document.body.innerHTML = originalContent;
                window.location.reload();
            }
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Failed to generate PDF. Please try printing instead.');
        } finally {
            setIsDownloading(false);
        }
    };

    // Loading state
    if (authLoading || loading) {
        return <LoadingSpinner />;
    }

    // Error state
    if (error) {
        return <ErrorDisplay error={error} />;
    }

    // No discharge found
    if (!discharge) {
        return <ErrorDisplay error="Discharge not found" />;
    }

    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: '#f8fafc',
            fontFamily: 'Nunito, sans-serif',
            overflowX: 'hidden'
        }}>
            {/* Main Content */}
            <main style={{
                maxWidth: '800px',
                margin: '0 auto',
                padding: isMobile ? '1rem' : '2rem'
            }}>
                {/* Success Actions - Only visible on screen */}
                <SuccessActions
                    onPrint={handlePrint}
                    onDownload={handleDownloadPDF}
                    isDownloading={isDownloading}
                    isMobile={isMobile}
                />

                {/* Discharge Summary - Following the new layout structure */}
                <DischargeSummary
                    ref={printRef}
                    discharge={discharge}
                    clinicName={clinic?.name}
                    vetFirstName={vetUser?.firstName}
                    vetLastName={vetUser?.lastName}
                    clinicPhone={clinic?.phone}
                    clinicAddress={clinic?.address ?
                        `${clinic.address.street}, ${clinic.address.city}, ${clinic.address.state} ${clinic.address.zipCode}`
                        : undefined
                    }
                    qrCodeUrl={qrCodeUrl}
                    dischargeViewUrl={dischargeViewUrl}
                    isMobile={isMobile}
                />
            </main>

            {/* Animations and Print Styles */}
            <style jsx>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                
                @media print {
                    .no-print {
                        display: none !important;
                    }
                    
                    body {
                        background: white !important;
                    }
                    
                    main {
                        max-width: none !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                }
                
                @media (max-width: 768px) {
                    main {
                        padding: 1rem !important;
                    }
                }
            `}</style>
        </div>
    );
}

// Main component with Suspense wrapper
export default function DischargeSuccessPage() {
    return (
        <Suspense fallback={<LoadingSpinner />}>
            <DischargeSuccessContent />
        </Suspense>
    );
}