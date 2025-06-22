// src/components/QRCodeSharing.tsx - Fixed TypeScript errors
'use client';

import Link from 'next/link';
import Image from 'next/image';

interface QRCodeSharingProps {
    qrCodeUrl: string;
    dischargeViewUrl: string;
    petName?: string;
}

export default function QRCodeSharing({ qrCodeUrl, dischargeViewUrl }: QRCodeSharingProps) {
    return (
        <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '2rem',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
            border: '1px solid #e2e8f0',
            height: 'fit-content'
        }} className="no-print">
            <h3 style={{
                fontSize: '1.25rem',
                fontWeight: '600',
                color: '#1e293b',
                marginBottom: '1.5rem',
                textAlign: 'center',
                fontFamily: 'Nunito, sans-serif'
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
                    <Image
                        src={qrCodeUrl}
                        alt="QR Code for discharge"
                        width={200}
                        height={200}
                        style={{
                            border: '2px solid #e2e8f0',
                            borderRadius: '12px',
                            padding: '0.5rem',
                            backgroundColor: 'white'
                        }}
                    />
                    <p style={{
                        fontSize: '0.875rem',
                        color: '#64748b',
                        textAlign: 'center',
                        lineHeight: '1.5',
                        fontFamily: 'Nunito, sans-serif'
                    }}>
                        Pet owners can scan this QR code to import the medication schedule directly into their PawScript mobile app
                    </p>
                </div>
            )}

            {dischargeViewUrl && (
                <div style={{
                    marginTop: '1.5rem',
                    padding: '1rem',
                    backgroundColor: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0'
                }}>
                    <p style={{
                        fontSize: '0.875rem',
                        color: '#64748b',
                        marginBottom: '0.5rem',
                        fontWeight: '600',
                        fontFamily: 'Nunito, sans-serif'
                    }}>
                        Direct Link:
                    </p>
                    <code style={{
                        fontSize: '0.75rem',
                        color: '#1e293b',
                        backgroundColor: 'white',
                        padding: '0.75rem',
                        borderRadius: '6px',
                        display: 'block',
                        wordBreak: 'break-all',
                        border: '1px solid #e2e8f0',
                        fontFamily: 'monospace'
                    }}>
                        {dischargeViewUrl}
                    </code>
                </div>
            )}

            <div style={{
                marginTop: '1.5rem',
                textAlign: 'center'
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
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        transition: 'background-color 0.2s ease',
                        fontFamily: 'Nunito, sans-serif'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0056CC'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#007AFF'}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Create Another Discharge
                </Link>
            </div>
        </div>
    );
}