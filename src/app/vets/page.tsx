// src/app/vets/page.tsx (MOBILE RESPONSIVE VERSION)
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function VetsPage() {
    const [isMobile, setIsMobile] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Check if mobile on mount and resize
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: '#ffffff',
            fontFamily: 'Nunito, -apple-system, BlinkMacSystemFont, sans-serif',
            overflowX: 'hidden'
        }}>
            {/* Navigation */}
            <nav style={{
                padding: isMobile ? '1rem' : '1rem 2rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: 'white',
                borderBottom: '1px solid #F2F2F7',
                position: 'sticky',
                top: 0,
                zIndex: 50
            }}>
                {/* Logo */}
                <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
                    <div style={{
                        width: isMobile ? '32px' : '40px',
                        height: isMobile ? '32px' : '40px',
                        position: 'relative',
                        borderRadius: '8px',
                        overflow: 'hidden'
                    }}>
                        <Image
                            src="/images/logoblack.png"
                            alt="PawScript Logo"
                            fill
                            style={{ objectFit: 'cover' }}
                        />
                    </div>
                    <span style={{
                        fontSize: isMobile ? '1.25rem' : '1.5rem',
                        fontWeight: '700',
                        color: '#1e293b'
                    }}>
                        PawScript
                    </span>
                </Link>

                {/* Desktop Navigation Links */}
                {!isMobile && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2rem'
                    }}>
                        <Link
                            href="/"
                            style={{
                                color: '#6D6D72',
                                textDecoration: 'none',
                                fontWeight: '400',
                                fontSize: '0.95rem'
                            }}
                        >
                            For Pet Parents
                        </Link>
                        <Link
                            href="/login"
                            style={{
                                color: '#007AFF',
                                textDecoration: 'none',
                                fontWeight: '600',
                                fontSize: '0.95rem'
                            }}
                        >
                            Login
                        </Link>
                        <Link
                            href="/signup"
                            style={{
                                backgroundColor: '#007AFF',
                                color: 'white',
                                padding: '0.5rem 1rem',
                                borderRadius: '8px',
                                textDecoration: 'none',
                                fontWeight: '600',
                                fontSize: '0.95rem',
                                border: 'none',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#0051D0';
                                e.currentTarget.style.transform = 'translateY(-1px)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '#007AFF';
                                e.currentTarget.style.transform = 'translateY(0)';
                            }}
                        >
                            Get Started
                        </Link>
                    </div>
                )}

                {/* Mobile Hamburger Button */}
                {isMobile && (
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        style={{
                            backgroundColor: 'transparent',
                            border: 'none',
                            padding: '0.5rem',
                            cursor: 'pointer'
                        }}
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6D6D72" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            {mobileMenuOpen ? (
                                <>
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </>
                            ) : (
                                <>
                                    <line x1="3" y1="6" x2="21" y2="6" />
                                    <line x1="3" y1="12" x2="21" y2="12" />
                                    <line x1="3" y1="18" x2="21" y2="18" />
                                </>
                            )}
                        </svg>
                    </button>
                )}
            </nav>

            {/* Mobile Navigation Menu */}
            {isMobile && mobileMenuOpen && (
                <div style={{
                    backgroundColor: 'white',
                    borderBottom: '1px solid #F2F2F7',
                    padding: '1rem',
                    position: 'sticky',
                    top: '73px',
                    zIndex: 40
                }}>
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem'
                    }}>
                        <Link
                            href="/"
                            onClick={() => setMobileMenuOpen(false)}
                            style={{
                                color: '#6D6D72',
                                textDecoration: 'none',
                                fontWeight: '400',
                                fontSize: '1rem',
                                padding: '0.5rem 0',
                                borderBottom: '1px solid #F2F2F7'
                            }}
                        >
                            For Pet Parents
                        </Link>
                        <Link
                            href="/login"
                            onClick={() => setMobileMenuOpen(false)}
                            style={{
                                color: '#007AFF',
                                textDecoration: 'none',
                                fontWeight: '600',
                                fontSize: '1rem',
                                padding: '0.5rem 0',
                                borderBottom: '1px solid #F2F2F7'
                            }}
                        >
                            Login
                        </Link>
                        <Link
                            href="/signup"
                            onClick={() => setMobileMenuOpen(false)}
                            style={{
                                backgroundColor: '#007AFF',
                                color: 'white',
                                padding: '0.75rem 1rem',
                                borderRadius: '8px',
                                textDecoration: 'none',
                                fontWeight: '600',
                                fontSize: '1rem',
                                textAlign: 'center',
                                display: 'block'
                            }}
                        >
                            Get Started
                        </Link>
                    </div>
                </div>
            )}

            {/* Hero Section */}
            <div style={{
                padding: isMobile ? '3rem 1rem 2.5rem' : 'clamp(3rem, 8vw, 6rem) 2rem clamp(2.5rem, 6vw, 5rem)',
                backgroundColor: '#FFFFFF',
                textAlign: 'center'
            }}>
                <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                    <h1 style={{
                        fontSize: isMobile ? '2.25rem' : 'clamp(2.5rem, 5vw, 3.75rem)',
                        fontWeight: '700',
                        color: '#1e293b',
                        marginBottom: '1.75rem',
                        letterSpacing: '-0.025em',
                        lineHeight: '1.1'
                    }}>
                        Streamline Discharge.
                        <br />
                        <span style={{ color: '#007AFF' }}>Monitor Progress.</span>
                    </h1>

                    <p style={{
                        fontSize: isMobile ? '1.125rem' : 'clamp(1.125rem, 2.5vw, 1.5rem)',
                        color: '#6D6D72',
                        marginBottom: '3rem',
                        lineHeight: '1.5',
                        fontWeight: '400',
                        maxWidth: '700px',
                        margin: '0 auto 3rem auto'
                    }}>
                        PawScript&apos;s vet portal helps you create comprehensive discharge summaries and track patient medication adherence — without disrupting your workflow.
                    </p>

                    <div style={{
                        display: 'flex',
                        flexDirection: isMobile ? 'column' : 'row',
                        gap: '1.5rem',
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginBottom: '2rem'
                    }}>
                        <Link
                            href="/signup"
                            style={{
                                display: 'inline-block',
                                backgroundColor: '#007AFF',
                                color: 'white',
                                padding: isMobile ? '1rem 2rem' : '1.125rem 2.25rem',
                                borderRadius: '14px',
                                textDecoration: 'none',
                                fontWeight: '600',
                                fontSize: isMobile ? '1rem' : '1.125rem',
                                boxShadow: '0 6px 20px rgba(0, 122, 255, 0.25)',
                                border: 'none',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                width: isMobile ? '100%' : 'auto',
                                maxWidth: isMobile ? '280px' : 'none'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#0051D0';
                                e.currentTarget.style.transform = 'translateY(-1px)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '#007AFF';
                                e.currentTarget.style.transform = 'translateY(0)';
                            }}
                        >
                            Start Free Trial
                        </Link>
                        <Link
                            href="/demo"
                            style={{
                                display: 'inline-block',
                                backgroundColor: 'white',
                                color: '#007AFF',
                                padding: isMobile ? '1rem 2rem' : '1.125rem 2.25rem',
                                borderRadius: '14px',
                                textDecoration: 'none',
                                fontWeight: '600',
                                fontSize: isMobile ? '1rem' : '1.125rem',
                                border: '2px solid #007AFF',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                width: isMobile ? '100%' : 'auto',
                                maxWidth: isMobile ? '280px' : 'none'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#007AFF';
                                e.currentTarget.style.color = 'white';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'white';
                                e.currentTarget.style.color = '#007AFF';
                            }}
                        >
                            Watch Demo
                        </Link>
                    </div>

                    <p style={{
                        fontSize: isMobile ? '0.875rem' : '0.95rem',
                        color: '#6D6D72',
                        fontWeight: '400'
                    }}>
                        Already have an account? <Link
                            href="/login"
                            style={{
                                color: '#007AFF',
                                textDecoration: 'none',
                                fontWeight: '600'
                            }}
                        >
                            Sign in here
                        </Link>
                    </p>
                </div>
            </div>

            {/* Key Benefits Section */}
            <div style={{
                padding: isMobile ? '3rem 1rem' : 'clamp(3rem, 8vw, 6rem) 2rem',
                backgroundColor: '#F8FAFC'
            }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: isMobile ? '3rem' : '5rem' }}>
                        <h2 style={{
                            fontSize: isMobile ? '2rem' : 'clamp(2rem, 4vw, 2.75rem)',
                            fontWeight: '700',
                            color: '#1e293b',
                            marginBottom: '1.25rem'
                        }}>
                            Why Veterinarians Choose PawScript
                        </h2>
                        <p style={{
                            fontSize: isMobile ? '1.125rem' : 'clamp(1.125rem, 2.5vw, 1.375rem)',
                            color: '#6D6D72',
                            maxWidth: '600px',
                            margin: '0 auto',
                            fontWeight: '400',
                            lineHeight: '1.5'
                        }}>
                            Improve client compliance and patient outcomes with minimal effort
                        </p>
                    </div>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(300px, 1fr))',
                        gap: isMobile ? '2rem' : '3rem'
                    }}>
                        {/* Benefit 1 */}
                        <div style={{
                            padding: isMobile ? '2rem 1.5rem' : '3rem 2rem',
                            borderRadius: '20px',
                            backgroundColor: '#FFFFFF',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                            textAlign: 'center',
                            transition: 'all 0.2s ease'
                        }}>
                            <div style={{
                                width: isMobile ? '60px' : '80px',
                                height: isMobile ? '60px' : '80px',
                                backgroundColor: '#34C759',
                                borderRadius: '20px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 2rem auto',
                                fontSize: isMobile ? '1.5rem' : '2rem',
                                color: 'white',
                                fontWeight: '700'
                            }}>
                                📋
                            </div>
                            <h3 style={{
                                fontSize: isMobile ? '1.25rem' : '1.5rem',
                                fontWeight: '600',
                                color: '#1e293b',
                                marginBottom: '1.25rem'
                            }}>
                                Faster Discharge Process
                            </h3>
                            <p style={{
                                color: '#6D6D72',
                                lineHeight: '1.6',
                                fontWeight: '400',
                                fontSize: isMobile ? '1rem' : '1.125rem'
                            }}>
                                Create comprehensive discharge summaries in under 2 minutes. Generate QR codes that instantly load all medication details into the client&apos;s phone.
                            </p>
                        </div>

                        {/* Benefit 2 */}
                        <div style={{
                            padding: isMobile ? '2rem 1.5rem' : '3rem 2rem',
                            borderRadius: '20px',
                            backgroundColor: '#FFFFFF',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                            textAlign: 'center',
                            transition: 'all 0.2s ease'
                        }}>
                            <div style={{
                                width: isMobile ? '60px' : '80px',
                                height: isMobile ? '60px' : '80px',
                                backgroundColor: '#007AFF',
                                borderRadius: '20px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 2rem auto',
                                fontSize: isMobile ? '1.5rem' : '2rem',
                                color: 'white',
                                fontWeight: '700'
                            }}>
                                📊
                            </div>
                            <h3 style={{
                                fontSize: isMobile ? '1.25rem' : '1.5rem',
                                fontWeight: '600',
                                color: '#1e293b',
                                marginBottom: '1.25rem'
                            }}>
                                Real-Time Compliance Tracking
                            </h3>
                            <p style={{
                                color: '#6D6D72',
                                lineHeight: '1.6',
                                fontWeight: '400',
                                fontSize: isMobile ? '1rem' : '1.125rem'
                            }}>
                                See which clients are following medication schedules and symptom patterns in real-time. Know exactly how treatment is progressing between visits.
                            </p>
                        </div>

                        {/* Benefit 3 */}
                        <div style={{
                            padding: isMobile ? '2rem 1.5rem' : '3rem 2rem',
                            borderRadius: '20px',
                            backgroundColor: '#FFFFFF',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                            textAlign: 'center',
                            transition: 'all 0.2s ease'
                        }}>
                            <div style={{
                                width: isMobile ? '60px' : '80px',
                                height: isMobile ? '60px' : '80px',
                                backgroundColor: '#FF9500',
                                borderRadius: '20px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 2rem auto',
                                fontSize: isMobile ? '1.5rem' : '2rem',
                                color: 'white',
                                fontWeight: '700'
                            }}>
                                💬
                            </div>
                            <h3 style={{
                                fontSize: isMobile ? '1.25rem' : '1.5rem',
                                fontWeight: '600',
                                color: '#1e293b',
                                marginBottom: '1.25rem'
                            }}>
                                Better Client Communication
                            </h3>
                            <p style={{
                                color: '#6D6D72',
                                lineHeight: '1.6',
                                fontWeight: '400',
                                fontSize: isMobile ? '1rem' : '1.125rem'
                            }}>
                                Clients receive clear, organized medication schedules with automatic reminders. Follow-up calls become more focused and productive.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* How It Works Section */}
            <div style={{
                padding: isMobile ? '3rem 1rem' : 'clamp(3rem, 8vw, 6rem) 2rem',
                backgroundColor: '#FFFFFF'
            }}>
                <div style={{ maxWidth: '1000px', margin: '0 auto', textAlign: 'center' }}>
                    <h2 style={{
                        fontSize: isMobile ? '2rem' : 'clamp(2rem, 4vw, 2.75rem)',
                        fontWeight: '700',
                        color: '#1e293b',
                        marginBottom: '1.25rem'
                    }}>
                        How It Works
                    </h2>
                    <p style={{
                        fontSize: isMobile ? '1.125rem' : 'clamp(1.125rem, 2.5vw, 1.375rem)',
                        color: '#6D6D72',
                        marginBottom: isMobile ? '3rem' : '4rem',
                        fontWeight: '400',
                        lineHeight: '1.5'
                    }}>
                        Simple workflow that integrates seamlessly with your current process
                    </p>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(250px, 1fr))',
                        gap: isMobile ? '2.5rem' : '3rem',
                        textAlign: 'left'
                    }}>
                        {/* Step 1 */}
                        <div style={{ position: 'relative' }}>
                            <div style={{
                                width: isMobile ? '50px' : '60px',
                                height: isMobile ? '50px' : '60px',
                                backgroundColor: '#007AFF',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: '1.5rem',
                                fontSize: isMobile ? '1.25rem' : '1.5rem',
                                fontWeight: '700',
                                color: 'white'
                            }}>
                                1
                            </div>
                            <h3 style={{
                                fontSize: isMobile ? '1.25rem' : '1.375rem',
                                fontWeight: '600',
                                color: '#1e293b',
                                marginBottom: '1rem'
                            }}>
                                Create Discharge Summary
                            </h3>
                            <p style={{
                                color: '#6D6D72',
                                lineHeight: '1.6',
                                fontWeight: '400',
                                fontSize: isMobile ? '1rem' : '1.125rem'
                            }}>
                                Add medications, dosages, and instructions using our searchable drug database. Include taper schedules and special notes.
                            </p>
                        </div>

                        {/* Step 2 */}
                        <div style={{ position: 'relative' }}>
                            <div style={{
                                width: isMobile ? '50px' : '60px',
                                height: isMobile ? '50px' : '60px',
                                backgroundColor: '#34C759',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: '1.5rem',
                                fontSize: isMobile ? '1.25rem' : '1.5rem',
                                fontWeight: '700',
                                color: 'white'
                            }}>
                                2
                            </div>
                            <h3 style={{
                                fontSize: isMobile ? '1.25rem' : '1.375rem',
                                fontWeight: '600',
                                color: '#1e293b',
                                marginBottom: '1rem'
                            }}>
                                Generate QR Code
                            </h3>
                            <p style={{
                                color: '#6D6D72',
                                lineHeight: '1.6',
                                fontWeight: '400',
                                fontSize: isMobile ? '1rem' : '1.125rem'
                            }}>
                                Instantly generate a QR code that contains all medication details. Print it on discharge papers or email to clients.
                            </p>
                        </div>

                        {/* Step 3 */}
                        <div style={{ position: 'relative' }}>
                            <div style={{
                                width: isMobile ? '50px' : '60px',
                                height: isMobile ? '50px' : '60px',
                                backgroundColor: '#FF9500',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: '1.5rem',
                                fontSize: isMobile ? '1.25rem' : '1.5rem',
                                fontWeight: '700',
                                color: 'white'
                            }}>
                                3
                            </div>
                            <h3 style={{
                                fontSize: isMobile ? '1.25rem' : '1.375rem',
                                fontWeight: '600',
                                color: '#1e293b',
                                marginBottom: '1rem'
                            }}>
                                Monitor Progress
                            </h3>
                            <p style={{
                                color: '#6D6D72',
                                lineHeight: '1.6',
                                fontWeight: '400',
                                fontSize: isMobile ? '1rem' : '1.125rem'
                            }}>
                                View real-time medication adherence and symptom logs through your dashboard. Get alerts for missed doses or concerning symptoms.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Integration Section */}
            <div style={{
                padding: isMobile ? '3rem 1rem' : 'clamp(3rem, 8vw, 6rem) 2rem',
                backgroundColor: '#F8FAFC'
            }}>
                <div style={{ maxWidth: '1000px', margin: '0 auto', textAlign: 'center' }}>
                    <h2 style={{
                        fontSize: isMobile ? '2rem' : 'clamp(2rem, 4vw, 2.5rem)',
                        fontWeight: '600',
                        color: '#1e293b',
                        marginBottom: '1.75rem'
                    }}>
                        Works With Your Existing Workflow
                    </h2>
                    <p style={{
                        fontSize: isMobile ? '1.125rem' : 'clamp(1.125rem, 2.5vw, 1.375rem)',
                        color: '#6D6D72',
                        lineHeight: '1.6',
                        marginBottom: isMobile ? '2rem' : '3rem',
                        fontWeight: '400'
                    }}>
                        PawScript doesn&apos;t replace your practice management software — it enhances it. Add discharge summaries to your current process without disruption.
                    </p>

                    <div style={{
                        backgroundColor: 'white',
                        padding: isMobile ? '2rem 1.5rem' : '3rem 2.5rem',
                        borderRadius: '24px',
                        boxShadow: '0 8px 25px rgba(0, 0, 0, 0.06)',
                        border: '1px solid rgba(0, 122, 255, 0.1)',
                        marginBottom: '3rem'
                    }}>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))',
                            gap: '2rem',
                            textAlign: 'center'
                        }}>
                            <div>
                                <div style={{
                                    fontSize: '2rem',
                                    marginBottom: '1rem',
                                    color: '#007AFF',
                                    fontWeight: '700'
                                }}>⚡</div>
                                <h4 style={{
                                    fontSize: '1.125rem',
                                    fontWeight: '600',
                                    color: '#1e293b',
                                    marginBottom: '0.5rem'
                                }}>
                                    Quick Setup
                                </h4>
                                <p style={{ color: '#6D6D72', fontSize: '0.95rem' }}>
                                    Get started in under 10 minutes
                                </p>
                            </div>
                            <div>
                                <div style={{
                                    fontSize: '2rem',
                                    marginBottom: '1rem',
                                    color: '#34C759',
                                    fontWeight: '700'
                                }}>🔗</div>
                                <h4 style={{
                                    fontSize: '1.125rem',
                                    fontWeight: '600',
                                    color: '#1e293b',
                                    marginBottom: '0.5rem'
                                }}>
                                    No Integration Required
                                </h4>
                                <p style={{ color: '#6D6D72', fontSize: '0.95rem' }}>
                                    Works alongside your current system
                                </p>
                            </div>
                            <div>
                                <div style={{
                                    fontSize: '2rem',
                                    marginBottom: '1rem',
                                    color: '#FF9500',
                                    fontWeight: '700'
                                }}>💰</div>
                                <h4 style={{
                                    fontSize: '1.125rem',
                                    fontWeight: '600',
                                    color: '#1e293b',
                                    marginBottom: '0.5rem'
                                }}>
                                    Free to Start
                                </h4>
                                <p style={{ color: '#6D6D72', fontSize: '0.95rem' }}>
                                    30-day trial, then $29/month per vet
                                </p>
                            </div>
                        </div>
                    </div>

                    <Link
                        href="/signup"
                        style={{
                            display: 'inline-block',
                            backgroundColor: '#007AFF',
                            color: 'white',
                            padding: isMobile ? '1rem 2rem' : '1.125rem 2.25rem',
                            borderRadius: '14px',
                            textDecoration: 'none',
                            fontWeight: '600',
                            fontSize: isMobile ? '1rem' : '1.125rem',
                            boxShadow: '0 6px 20px rgba(0, 122, 255, 0.25)',
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            width: isMobile ? '100%' : 'auto',
                            maxWidth: isMobile ? '280px' : 'none'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#0051D0';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#007AFF';
                            e.currentTarget.style.transform = 'translateY(0)';
                        }}
                    >
                        Start Your Free Trial
                    </Link>
                </div>
            </div>

            {/* Footer */}
            <div style={{
                padding: isMobile ? '3rem 1rem 2rem' : '4rem 2rem 3rem',
                backgroundColor: '#1e293b',
                color: 'white',
                textAlign: 'center',
                fontFamily: 'Nunito, -apple-system, BlinkMacSystemFont, sans-serif'
            }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.75rem',
                        marginBottom: '2.5rem'
                    }}>
                        <div style={{
                            width: isMobile ? '28px' : '36px',
                            height: isMobile ? '28px' : '36px',
                            position: 'relative',
                            borderRadius: '8px',
                            overflow: 'hidden'
                        }}>
                            <Image
                                src="/images/logowhite.png"
                                alt="PawScript Logo"
                                fill
                                style={{ objectFit: 'cover' }}
                            />
                        </div>
                        <span style={{
                            fontSize: isMobile ? '1.25rem' : '1.375rem',
                            fontWeight: '700'
                        }}>
                            PawScript
                        </span>
                    </div>

                    <p style={{
                        color: '#94a3b8',
                        marginBottom: '2.5rem',
                        fontWeight: '400',
                        fontSize: isMobile ? '1rem' : '1.125rem'
                    }}>
                        Streamlining pet medication management for veterinarians and families.
                    </p>

                    <div style={{
                        display: 'flex',
                        flexDirection: isMobile ? 'column' : 'row',
                        justifyContent: 'center',
                        gap: isMobile ? '1rem' : '2.5rem',
                        marginBottom: '2.5rem',
                        fontSize: '1rem'
                    }}>
                        <Link
                            href="/"
                            style={{
                                color: '#94a3b8',
                                textDecoration: 'none',
                                fontWeight: '400',
                                transition: 'color 0.2s ease',
                                cursor: 'pointer',
                                padding: isMobile ? '0.5rem 0' : '0'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.color = '#007AFF'}
                            onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
                        >
                            For Pet Parents
                        </Link>
                        <Link
                            href="/login"
                            style={{
                                color: '#94a3b8',
                                textDecoration: 'none',
                                fontWeight: '400',
                                transition: 'color 0.2s ease',
                                cursor: 'pointer',
                                padding: isMobile ? '0.5rem 0' : '0'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.color = '#007AFF'}
                            onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
                        >
                            Login
                        </Link>
                        <Link
                            href="/demo"
                            style={{
                                color: '#94a3b8',
                                textDecoration: 'none',
                                fontWeight: '400',
                                transition: 'color 0.2s ease',
                                cursor: 'pointer',
                                padding: isMobile ? '0.5rem 0' : '0'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.color = '#007AFF'}
                            onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
                        >
                            Demo
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
        </div>
    );
}