// src/app/terms/page.tsx
'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function TermsOfServicePage() {
    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: '#f8fafc',
            fontFamily: 'Nunito, -apple-system, BlinkMacSystemFont, sans-serif'
        }}>
            {/* Header */}
            <nav style={{
                padding: '1rem 2rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: 'white',
                borderBottom: '1px solid #F2F2F7',
                position: 'sticky',
                top: 0,
                zIndex: 50
            }}>
                <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        position: 'relative',
                        borderRadius: '8px',
                        overflow: 'hidden'
                    }}>
                        {/* Placeholder for logo - you can replace with actual image */}
                        <div style={{
                            width: '100%',
                            height: '100%',
                            backgroundColor: '#007AFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.5rem',
                            color: 'white',
                            fontWeight: '700'
                        }}>
                            🐾
                        </div>
                    </div>
                    <span style={{
                        fontSize: '1.5rem',
                        fontWeight: '700',
                        color: '#1e293b'
                    }}>
                        PawScript
                    </span>
                </Link>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Link
                        href="/vets"
                        style={{
                            color: '#6D6D72',
                            textDecoration: 'none',
                            fontWeight: '400'
                        }}
                    >
                        For Vets
                    </Link>
                    <Link
                        href="/login"
                        style={{
                            color: '#6D6D72',
                            textDecoration: 'none',
                            fontWeight: '400'
                        }}
                    >
                        Login
                    </Link>
                    <Link
                        href="/signup"
                        style={{
                            backgroundColor: '#007AFF',
                            color: 'white',
                            textDecoration: 'none',
                            padding: '0.5rem 1rem',
                            borderRadius: '8px',
                            fontWeight: '600',
                            fontSize: '0.875rem'
                        }}
                    >
                        Sign Up
                    </Link>
                </div>
            </nav>

            {/* Main Content */}
            <main style={{
                maxWidth: '800px',
                margin: '0 auto',
                padding: '3rem 2rem'
            }}>
                {/* Header */}
                <div style={{
                    textAlign: 'center',
                    marginBottom: '3rem'
                }}>
                    <h1 style={{
                        fontSize: '2.5rem',
                        fontWeight: '700',
                        color: '#1e293b',
                        marginBottom: '1rem'
                    }}>
                        Terms of Service
                    </h1>
                    <p style={{
                        fontSize: '1rem',
                        color: '#6D6D72',
                        fontWeight: '300'
                    }}>
                        Effective Date: May 9, 2025
                    </p>
                </div>

                {/* Content */}
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    padding: '2.5rem',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                    border: '1px solid #e2e8f0'
                }}>
                    <div style={{ lineHeight: '1.7', color: '#374151' }}>
                        <p style={{ marginBottom: '1.5rem' }}>
                            Welcome to PawScript. By using this app, you agree to the following terms:
                        </p>

                        <h2 style={{
                            fontSize: '1.5rem',
                            fontWeight: '600',
                            color: '#1e293b',
                            marginTop: '2rem',
                            marginBottom: '1rem'
                        }}>
                            1. Not Medical Advice
                        </h2>
                        <p style={{ marginBottom: '1.5rem' }}>
                            PawScript is not a veterinary service and does not provide medical advice, diagnosis, or treatment. The app is designed to help you track and manage your pet's medications and symptoms, but it is not a substitute for professional veterinary care. Always consult your veterinarian for medical guidance.
                        </p>

                        <h2 style={{
                            fontSize: '1.5rem',
                            fontWeight: '600',
                            color: '#1e293b',
                            marginTop: '2rem',
                            marginBottom: '1rem'
                        }}>
                            2. Data Storage
                        </h2>
                        <p style={{ marginBottom: '1.5rem' }}>
                            All data you enter into PawScript is stored locally on your device unless otherwise specified. We do not sync or transmit your data to a server or third party. You are responsible for backing up any information you wish to keep.
                        </p>

                        <h2 style={{
                            fontSize: '1.5rem',
                            fontWeight: '600',
                            color: '#1e293b',
                            marginTop: '2rem',
                            marginBottom: '1rem'
                        }}>
                            3. User Responsibility
                        </h2>
                        <p style={{ marginBottom: '1.5rem' }}>
                            You are responsible for entering accurate medication and schedule information. While PawScript offers reminders and tools to support consistency, it is your responsibility to administer medications appropriately and consult a vet as needed.
                        </p>

                        <h2 style={{
                            fontSize: '1.5rem',
                            fontWeight: '600',
                            color: '#1e293b',
                            marginTop: '2rem',
                            marginBottom: '1rem'
                        }}>
                            4. Pro Tier and In-App Purchases
                        </h2>
                        <p style={{ marginBottom: '1rem' }}>
                            PawScript offers an optional one-time Pro upgrade that unlocks additional features, including:
                        </p>
                        <ul style={{ marginBottom: '1rem', paddingLeft: '1.5rem' }}>
                            <li style={{ marginBottom: '0.5rem' }}>Unlimited pet profiles</li>
                            <li style={{ marginBottom: '0.5rem' }}>Label scanning (OCR) to autofill medication info</li>
                            <li style={{ marginBottom: '0.5rem' }}>PDF export of pet medication history</li>
                        </ul>
                        <p style={{ marginBottom: '1.5rem' }}>
                            Purchases are handled through Apple's App Store. All purchases are final. We do not offer refunds.
                        </p>

                        <h2 style={{
                            fontSize: '1.5rem',
                            fontWeight: '600',
                            color: '#1e293b',
                            marginTop: '2rem',
                            marginBottom: '1rem'
                        }}>
                            5. Scan Cap Policy
                        </h2>
                        <p style={{ marginBottom: '1.5rem' }}>
                            To ensure performance and fairness, PawScript's Pro tier includes a scan cap of 30 label scans per year. Most users will never hit this cap. If you experience issues or require additional access, please contact us.
                        </p>

                        <h2 style={{
                            fontSize: '1.5rem',
                            fontWeight: '600',
                            color: '#1e293b',
                            marginTop: '2rem',
                            marginBottom: '1rem'
                        }}>
                            6. Contact
                        </h2>
                        <p style={{ marginBottom: '1.5rem' }}>
                            If you have questions about these terms or experience any issues, contact us at:{' '}
                            <a href="mailto:pawscriptapp@gmail.com" style={{
                                color: '#007AFF',
                                textDecoration: 'none',
                                fontWeight: '600'
                            }}>
                                pawscriptapp@gmail.com
                            </a>
                        </p>
                    </div>
                </div>

                {/* Back Navigation */}
                <div style={{
                    textAlign: 'center',
                    marginTop: '2rem'
                }}>
                    <Link
                        href="/"
                        style={{
                            color: '#007AFF',
                            textDecoration: 'none',
                            fontWeight: '600',
                            fontSize: '0.875rem'
                        }}
                    >
                        ← Back to Home
                    </Link>
                </div>
            </main>

            {/* Footer */}
            <footer style={{
                backgroundColor: 'white',
                borderTop: '1px solid #e2e8f0',
                padding: '2rem',
                marginTop: '3rem'
            }}>
                <div style={{
                    maxWidth: '1200px',
                    margin: '0 auto',
                    textAlign: 'center'
                }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: '2rem',
                        marginBottom: '1rem',
                        flexWrap: 'wrap'
                    }}>
                        <Link
                            href="/privacy"
                            style={{
                                color: '#6D6D72',
                                textDecoration: 'none',
                                fontSize: '0.875rem',
                                fontWeight: '400'
                            }}
                        >
                            Privacy Policy
                        </Link>
                        <Link
                            href="/terms"
                            style={{
                                color: '#6D6D72',
                                textDecoration: 'none',
                                fontSize: '0.875rem',
                                fontWeight: '400'
                            }}
                        >
                            Terms of Service
                        </Link>
                        <a
                            href="mailto:pawscriptapp@gmail.com"
                            style={{
                                color: '#6D6D72',
                                textDecoration: 'none',
                                fontSize: '0.875rem',
                                fontWeight: '400'
                            }}
                        >
                            Contact
                        </a>
                    </div>
                    <p style={{
                        color: '#6D6D72',
                        fontSize: '0.75rem',
                        fontWeight: '300',
                        margin: '0'
                    }}>
                        © 2025 PawScript. All rights reserved.
                    </p>
                </div>
            </footer>
        </div>
    );
}