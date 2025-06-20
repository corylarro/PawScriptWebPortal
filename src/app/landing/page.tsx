// src/app/landing/page.tsx (UPDATED VERSION)
'use client';

import Link from 'next/link';
import Image from 'next/image';
import Footer from '@/components/Footer';

export default function LandingPage() {
    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: '#ffffff',
            fontFamily: 'Nunito, -apple-system, BlinkMacSystemFont, sans-serif'
        }}>
            {/* Navigation */}
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
                {/* Logo */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        position: 'relative',
                        borderRadius: '8px',
                        overflow: 'hidden'
                    }}>
                        <Image
                            src="/images/pawscript-logo.png"
                            alt="PawScript Logo"
                            fill
                            style={{ objectFit: 'cover' }}
                        />
                    </div>
                    <span style={{
                        fontSize: '1.5rem',
                        fontWeight: '700',
                        color: '#1e293b'
                    }}>
                        PawScript
                    </span>
                </div>

                {/* Navigation Links */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                    <a
                        href="#features"
                        style={{
                            color: '#6D6D72',
                            textDecoration: 'none',
                            fontWeight: '400',
                            fontSize: '0.95rem'
                        }}
                    >
                        Features
                    </a>
                    <Link
                        href="/vets"
                        style={{
                            color: '#6D6D72',
                            textDecoration: 'none',
                            fontWeight: '400',
                            fontSize: '0.95rem'
                        }}
                    >
                        For Vets
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
                        Vet Login
                    </Link>
                </div>
            </nav>

            {/* Hero Section */}
            <div style={{
                padding: '6rem 2rem 5rem',
                backgroundColor: '#FFFFFF'
            }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '5rem',
                        alignItems: 'center'
                    }}>
                        {/* Left Column */}
                        <div>
                            <h1 style={{
                                fontSize: '3.5rem',
                                fontWeight: '700',
                                color: '#1e293b',
                                marginBottom: '1.75rem',
                                letterSpacing: '-0.025em',
                                lineHeight: '1.1'
                            }}>
                                Track meds. Get reminders.
                                <br />
                                <span style={{ color: '#007AFF' }}>Share with your vet.</span>
                            </h1>

                            <p style={{
                                fontSize: '1.375rem',
                                color: '#6D6D72',
                                marginBottom: '3rem',
                                lineHeight: '1.5',
                                fontWeight: '400',
                                maxWidth: '500px'
                            }}>
                                PawScript helps you manage your pet&apos;s medications, log symptoms, and keep your vet informed — all in one place.
                            </p>

                            <div style={{ marginBottom: '2rem' }}>
                                <a
                                    href="https://apps.apple.com/app/pawscript/id1234567890"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        display: 'inline-block',
                                        backgroundColor: '#007AFF',
                                        color: 'white',
                                        padding: '1.125rem 2.25rem',
                                        borderRadius: '14px',
                                        textDecoration: 'none',
                                        fontWeight: '600',
                                        fontSize: '1.125rem',
                                        boxShadow: '0 6px 20px rgba(0, 122, 255, 0.25)'
                                    }}
                                >
                                    📱 Download Free
                                </a>
                            </div>

                            <div style={{
                                fontSize: '0.95rem',
                                color: '#6D6D72',
                                fontWeight: '400'
                            }}>
                                Veterinarian? <Link
                                    href="/vets"
                                    style={{
                                        color: '#007AFF',
                                        textDecoration: 'none',
                                        fontWeight: '600'
                                    }}
                                >
                                    Try Vet Portal
                                </Link> | <Link
                                    href="/login"
                                    style={{
                                        color: '#007AFF',
                                        textDecoration: 'none',
                                        fontWeight: '600'
                                    }}
                                >
                                    Vet Login
                                </Link>
                            </div>
                        </div>

                        {/* Right Column */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'center'
                        }}>
                            <Image
                                src="/images/pawscript-app-mockup.JPEG"
                                alt="PawScript App showing medication reminders"
                                width={320}
                                height={480}
                                style={{
                                    maxWidth: '100%',
                                    height: 'auto',
                                    borderRadius: '20px',
                                    boxShadow: '0 25px 50px rgba(0, 0, 0, 0.08)'
                                }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Features Section */}
            <div id="features" style={{
                padding: '6rem 2rem',
                backgroundColor: 'white'
            }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: '5rem' }}>
                        <h2 style={{
                            fontSize: '2.75rem',
                            fontWeight: '700',
                            color: '#1e293b',
                            marginBottom: '1.25rem'
                        }}>
                            What You Can Do
                        </h2>
                        <p style={{
                            fontSize: '1.375rem',
                            color: '#6D6D72',
                            maxWidth: '600px',
                            margin: '0 auto',
                            fontWeight: '400',
                            lineHeight: '1.5'
                        }}>
                            Track meds, never miss a dose, and share logs with your vet
                        </p>
                    </div>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                        gap: '3rem'
                    }}>
                        {/* Feature 1 */}
                        <div style={{
                            padding: '3rem 2rem',
                            borderRadius: '20px',
                            border: '1px solid #F2F2F7',
                            textAlign: 'center',
                            backgroundColor: '#FFFFFF'
                        }}>
                            <div style={{
                                width: '80px',
                                height: '80px',
                                backgroundColor: '#007AFF',
                                borderRadius: '20px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 2rem auto',
                                fontSize: '2rem'
                            }}>
                                💊
                            </div>
                            <h3 style={{
                                fontSize: '1.5rem',
                                fontWeight: '600',
                                color: '#1e293b',
                                marginBottom: '1.25rem'
                            }}>
                                Track Medications
                            </h3>
                            <p style={{
                                color: '#6D6D72',
                                lineHeight: '1.6',
                                fontWeight: '400',
                                fontSize: '1.125rem'
                            }}>
                                Manual entry or label scanning — add all your pet&apos;s medications with dosage, frequency, and instructions
                            </p>
                        </div>

                        {/* Feature 2 */}
                        <div style={{
                            padding: '3rem 2rem',
                            borderRadius: '20px',
                            border: '1px solid #F2F2F7',
                            textAlign: 'center',
                            backgroundColor: '#FFFFFF'
                        }}>
                            <div style={{
                                width: '80px',
                                height: '80px',
                                backgroundColor: '#34C759',
                                borderRadius: '20px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 2rem auto',
                                fontSize: '2rem'
                            }}>
                                ⏰
                            </div>
                            <h3 style={{
                                fontSize: '1.5rem',
                                fontWeight: '600',
                                color: '#1e293b',
                                marginBottom: '1.25rem'
                            }}>
                                Get Smart Reminders
                            </h3>
                            <p style={{
                                color: '#6D6D72',
                                lineHeight: '1.6',
                                fontWeight: '400',
                                fontSize: '1.125rem'
                            }}>
                                Custom timing and automated alerts ensure you never miss a dose, with flexible scheduling for your routine
                            </p>
                        </div>

                        {/* Feature 3 */}
                        <div style={{
                            padding: '3rem 2rem',
                            borderRadius: '20px',
                            border: '1px solid #F2F2F7',
                            textAlign: 'center',
                            backgroundColor: '#FFFFFF'
                        }}>
                            <div style={{
                                width: '80px',
                                height: '80px',
                                backgroundColor: '#FF9500',
                                borderRadius: '20px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 2rem auto',
                                fontSize: '2rem'
                            }}>
                                📓
                            </div>
                            <h3 style={{
                                fontSize: '1.5rem',
                                fontWeight: '600',
                                color: '#1e293b',
                                marginBottom: '1.25rem'
                            }}>
                                Log Symptoms
                            </h3>
                            <p style={{
                                color: '#6D6D72',
                                lineHeight: '1.6',
                                fontWeight: '400',
                                fontSize: '1.125rem'
                            }}>
                                Track appetite, energy, and other symptoms to share health patterns and progress with your veterinarian
                            </p>
                        </div>
                    </div>

                    {/* Vet Sync Card */}
                    <div style={{
                        marginTop: '4rem',
                        display: 'flex',
                        justifyContent: 'center'
                    }}>
                        <div style={{
                            padding: '3rem 2.5rem',
                            borderRadius: '24px',
                            border: '2px solid #007AFF',
                            textAlign: 'center',
                            backgroundColor: 'rgba(0, 122, 255, 0.02)',
                            maxWidth: '500px',
                            width: '100%'
                        }}>
                            <div style={{
                                width: '80px',
                                height: '80px',
                                backgroundColor: '#007AFF',
                                borderRadius: '20px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 2rem auto',
                                fontSize: '2rem'
                            }}>
                                📥
                            </div>
                            <h3 style={{
                                fontSize: '1.5rem',
                                fontWeight: '600',
                                color: '#1e293b',
                                marginBottom: '1.25rem'
                            }}>
                                Vet Sync (If Available)
                            </h3>
                            <p style={{
                                color: '#6D6D72',
                                lineHeight: '1.6',
                                fontWeight: '400',
                                marginBottom: '1.5rem',
                                fontSize: '1.125rem'
                            }}>
                                If your vet uses PawScript, scan a QR code to auto-import all medication details, instructions, and reminders
                            </p>
                            <div style={{
                                fontSize: '1rem',
                                color: '#007AFF',
                                fontWeight: '600',
                                fontStyle: 'italic'
                            }}>
                                This makes setup even easier, but isn&apos;t required
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Works Even Better With Your Vet */}
            <div style={{
                padding: '5rem 2rem',
                backgroundColor: '#FAFBFC'
            }}>
                <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
                    <h2 style={{
                        fontSize: '2.5rem',
                        fontWeight: '600',
                        color: '#1e293b',
                        marginBottom: '1.75rem'
                    }}>
                        Works Even Better With Your Vet
                    </h2>
                    <p style={{
                        fontSize: '1.375rem',
                        color: '#6D6D72',
                        lineHeight: '1.6',
                        marginBottom: '3rem',
                        fontWeight: '400'
                    }}>
                        If your vet uses PawScript, you can scan a discharge QR code and have all your pet&apos;s medications, instructions, and reminders preloaded instantly. No manual entry needed!
                    </p>

                    <div style={{
                        backgroundColor: 'white',
                        padding: '3rem 2.5rem',
                        borderRadius: '24px',
                        marginBottom: '2rem',
                        boxShadow: '0 8px 25px rgba(0, 0, 0, 0.06)',
                        border: '1px solid rgba(0, 122, 255, 0.1)'
                    }}>
                        <div style={{
                            fontSize: '1.25rem',
                            color: '#6D6D72',
                            marginBottom: '2rem',
                            fontWeight: '400'
                        }}>
                            Is your clinic using PawScript?
                        </div>
                        <Link
                            href="/vets"
                            style={{
                                display: 'inline-block',
                                backgroundColor: '#007AFF',
                                color: 'white',
                                padding: '1rem 2rem',
                                borderRadius: '14px',
                                textDecoration: 'none',
                                fontWeight: '600',
                                fontSize: '1.125rem',
                                boxShadow: '0 6px 20px rgba(0, 122, 255, 0.25)'
                            }}
                        >
                            🧑‍⚕️ Send them this link
                        </Link>
                    </div>
                </div>
            </div>

            {/* Use the reusable Footer component with dark variant */}
            <Footer variant="dark" />
        </div>
    );
}