// src/app/privacy/page.tsx
'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function PrivacyPolicyPage() {
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
                        Privacy Policy
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
                            At PawScript, we respect your privacy. This policy explains what data we collect, how we use it, and how we protect it.
                        </p>

                        <h2 style={{
                            fontSize: '1.5rem',
                            fontWeight: '600',
                            color: '#1e293b',
                            marginTop: '2rem',
                            marginBottom: '1rem'
                        }}>
                            1. What We Collect
                        </h2>
                        <p style={{ marginBottom: '1.5rem' }}>
                            PawScript does not collect or store any personal data on external servers. All information you enter — including pet details, medications, and symptoms — is stored locally on your device.
                        </p>
                        <p style={{ marginBottom: '1.5rem' }}>
                            We do not require account registration to use the app. If you choose to sign in or upgrade to Pro, your credentials are stored securely on your device using Apple's standard encryption via Keychain and UserDefaults.
                        </p>

                        <h2 style={{
                            fontSize: '1.5rem',
                            fontWeight: '600',
                            color: '#1e293b',
                            marginTop: '2rem',
                            marginBottom: '1rem'
                        }}>
                            2. How Your Data Is Used
                        </h2>
                        <p style={{ marginBottom: '1rem' }}>
                            Your data is used solely to support the app's functionality:
                        </p>
                        <ul style={{ marginBottom: '1.5rem', paddingLeft: '1.5rem' }}>
                            <li style={{ marginBottom: '0.5rem' }}>To track your pet's medications and reminders</li>
                            <li style={{ marginBottom: '0.5rem' }}>To generate notifications</li>
                            <li style={{ marginBottom: '0.5rem' }}>To optionally scan prescription labels and autofill medication information</li>
                            <li style={{ marginBottom: '0.5rem' }}>To create PDF exports (stored locally on your device)</li>
                        </ul>
                        <p style={{ marginBottom: '1.5rem' }}>
                            We do not collect analytics, behavior data, or share any personal information with third parties.
                        </p>

                        <h2 style={{
                            fontSize: '1.5rem',
                            fontWeight: '600',
                            color: '#1e293b',
                            marginTop: '2rem',
                            marginBottom: '1rem'
                        }}>
                            3. Scanning & OCR
                        </h2>
                        <p style={{ marginBottom: '1.5rem' }}>
                            If you use the label scanning feature, the image is processed locally on your device using Apple's built-in tools and/or secure AI processing. No images are stored or transmitted after processing.
                        </p>

                        <h2 style={{
                            fontSize: '1.5rem',
                            fontWeight: '600',
                            color: '#1e293b',
                            marginTop: '2rem',
                            marginBottom: '1rem'
                        }}>
                            4. Notifications
                        </h2>
                        <p style={{ marginBottom: '1.5rem' }}>
                            PawScript requests permission to send you notifications for medication reminders. These notifications are scheduled locally and are not used for marketing or data collection.
                        </p>

                        <h2 style={{
                            fontSize: '1.5rem',
                            fontWeight: '600',
                            color: '#1e293b',
                            marginTop: '2rem',
                            marginBottom: '1rem'
                        }}>
                            5. In-App Purchases
                        </h2>
                        <p style={{ marginBottom: '1.5rem' }}>
                            In-app purchases are processed securely through Apple's App Store. We do not receive or store any payment information.
                        </p>

                        <h2 style={{
                            fontSize: '1.5rem',
                            fontWeight: '600',
                            color: '#1e293b',
                            marginTop: '2rem',
                            marginBottom: '1rem'
                        }}>
                            6. Children's Privacy
                        </h2>
                        <p style={{ marginBottom: '1.5rem' }}>
                            PawScript is not intended for children under 13. We do not knowingly collect personal data from children.
                        </p>

                        <h2 style={{
                            fontSize: '1.5rem',
                            fontWeight: '600',
                            color: '#1e293b',
                            marginTop: '2rem',
                            marginBottom: '1rem'
                        }}>
                            7. Contact
                        </h2>
                        <p style={{ marginBottom: '1.5rem' }}>
                            If you have any questions or concerns about this policy, contact us at:{' '}
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