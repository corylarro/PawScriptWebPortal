// src/components/Footer.tsx
'use client';

import Link from 'next/link';
import Image from 'next/image';

interface FooterProps {
    variant?: 'light' | 'dark';
    className?: string;
}

export default function Footer({
    variant = 'light',
    className = ''
}: FooterProps) {
    const isDark = variant === 'dark';

    if (isDark) {
        // Dark footer for landing page
        return (
            <div style={{
                padding: '4rem 2rem 3rem',
                backgroundColor: '#1e293b',
                color: 'white',
                textAlign: 'center'
            }} className={className}>
                <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.75rem',
                        marginBottom: '2.5rem'
                    }}>
                        <div style={{
                            width: '36px',
                            height: '36px',
                            position: 'relative',
                            borderRadius: '8px',
                            overflow: 'hidden'
                        }}>
                            {/* You can replace this with actual logo or keep as placeholder */}
                            <div style={{
                                width: '100%',
                                height: '100%',
                                backgroundColor: '#007AFF',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1.2rem',
                                color: 'white',
                                fontWeight: '700'
                            }}>
                                🐾
                            </div>
                        </div>
                        <span style={{
                            fontSize: '1.375rem',
                            fontWeight: '700'
                        }}>
                            PawScript
                        </span>
                    </div>

                    <p style={{
                        color: '#94a3b8',
                        marginBottom: '2.5rem',
                        fontWeight: '400',
                        fontSize: '1.125rem'
                    }}>
                        Making pet medication management simple for families and veterinarians.
                    </p>

                    <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        gap: '2.5rem',
                        marginBottom: '2.5rem',
                        fontSize: '1rem',
                        flexWrap: 'wrap'
                    }}>
                        <a
                            href="https://apps.apple.com/app/pawscript/id1234567890"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                color: '#94a3b8',
                                textDecoration: 'none',
                                fontWeight: '400',
                                transition: 'color 0.2s ease'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.color = '#007AFF'}
                            onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
                        >
                            Download App
                        </a>
                        <Link
                            href="/vets"
                            style={{
                                color: '#94a3b8',
                                textDecoration: 'none',
                                fontWeight: '400',
                                transition: 'color 0.2s ease'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.color = '#007AFF'}
                            onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
                        >
                            For Veterinarians
                        </Link>
                        <Link
                            href="/login"
                            style={{
                                color: '#94a3b8',
                                textDecoration: 'none',
                                fontWeight: '400',
                                transition: 'color 0.2s ease'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.color = '#007AFF'}
                            onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
                        >
                            Vet Login
                        </Link>
                        <Link
                            href="/privacy"
                            style={{
                                color: '#94a3b8',
                                textDecoration: 'none',
                                fontWeight: '400',
                                transition: 'color 0.2s ease'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.color = '#007AFF'}
                            onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
                        >
                            Privacy
                        </Link>
                        <Link
                            href="/terms"
                            style={{
                                color: '#94a3b8',
                                textDecoration: 'none',
                                fontWeight: '400',
                                transition: 'color 0.2s ease'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.color = '#007AFF'}
                            onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
                        >
                            Terms
                        </Link>
                    </div>

                    <div style={{
                        paddingTop: '2rem',
                        borderTop: '1px solid #334155',
                        fontSize: '0.9rem',
                        color: '#94a3b8',
                        fontWeight: '400'
                    }}>
                        © 2025 PawScript. All rights reserved.
                    </div>
                </div>
            </div>
        );
    }

    // Light footer for other pages
    return (
        <footer
            style={{
                backgroundColor: 'white',
                borderTop: '1px solid #e2e8f0',
                padding: '2rem',
                marginTop: '3rem'
            }}
            className={className}
        >
            <div style={{
                maxWidth: '1200px',
                margin: '0 auto',
                textAlign: 'center'
            }}>
                {/* Footer Links */}
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
                            fontWeight: '400',
                            transition: 'color 0.2s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#007AFF'}
                        onMouseLeave={(e) => e.currentTarget.style.color = '#6D6D72'}
                    >
                        Privacy Policy
                    </Link>
                    <Link
                        href="/terms"
                        style={{
                            color: '#6D6D72',
                            textDecoration: 'none',
                            fontSize: '0.875rem',
                            fontWeight: '400',
                            transition: 'color 0.2s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#007AFF'}
                        onMouseLeave={(e) => e.currentTarget.style.color = '#6D6D72'}
                    >
                        Terms of Service
                    </Link>
                    <a
                        href="mailto:pawscriptapp@gmail.com"
                        style={{
                            color: '#6D6D72',
                            textDecoration: 'none',
                            fontSize: '0.875rem',
                            fontWeight: '400',
                            transition: 'color 0.2s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#007AFF'}
                        onMouseLeave={(e) => e.currentTarget.style.color = '#6D6D72'}
                    >
                        Contact
                    </a>
                    <Link
                        href="/demo"
                        style={{
                            color: '#6D6D72',
                            textDecoration: 'none',
                            fontSize: '0.875rem',
                            fontWeight: '400',
                            transition: 'color 0.2s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#007AFF'}
                        onMouseLeave={(e) => e.currentTarget.style.color = '#6D6D72'}
                    >
                        Demo
                    </Link>
                    <Link
                        href="/vets"
                        style={{
                            color: '#6D6D72',
                            textDecoration: 'none',
                            fontSize: '0.875rem',
                            fontWeight: '400',
                            transition: 'color 0.2s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#007AFF'}
                        onMouseLeave={(e) => e.currentTarget.style.color = '#6D6D72'}
                    >
                        For Vets
                    </Link>
                </div>

                {/* Copyright */}
                <p style={{
                    color: '#6D6D72',
                    fontSize: '0.75rem',
                    fontWeight: '300',
                    margin: '0',
                    fontFamily: 'Nunito, -apple-system, BlinkMacSystemFont, sans-serif'
                }}>
                    © 2025 PawScript. All rights reserved.
                </p>
            </div>
        </footer>
    );
}