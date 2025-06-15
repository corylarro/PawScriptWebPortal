// src/app/demo/page.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function DemoPage() {
    const [currentStep, setCurrentStep] = useState(1);
    const [demoData, setDemoData] = useState<{
        pet: { name: string; species: string; weight: string };
        medications: Array<{
            name: string;
            dosage: string;
            frequency: string;
            instructions: string;
        }>;
        showQR: boolean;
    }>({
        pet: { name: '', species: '', weight: '' },
        medications: [],
        showQR: false
    });

    const steps = [
        {
            id: 1,
            title: "Add Pet Information",
            description: "Start by entering the pet's basic details",
            action: "Let's add Buddy, a 45lb Golden Retriever"
        },
        {
            id: 2,
            title: "Add Medications",
            description: "Add prescribed medications with dosage and frequency",
            action: "Add Carprofen 75mg twice daily"
        },
        {
            id: 3,
            title: "Add Instructions",
            description: "Include special instructions and notes",
            action: "Add feeding and monitoring instructions"
        },
        {
            id: 4,
            title: "Generate QR Code",
            description: "Create QR code for pet owner to scan",
            action: "Generate the QR code"
        },
        {
            id: 5,
            title: "Pet Owner Experience",
            description: "See what the pet owner sees when they scan",
            action: "View the mobile-friendly discharge summary"
        }
    ];

    const handleStepAction = (stepId: number) => {
        switch (stepId) {
            case 1:
                setDemoData(prev => ({
                    ...prev,
                    pet: { name: 'Buddy', species: 'Golden Retriever', weight: '45 lbs' }
                }));
                break;
            case 2:
                setDemoData(prev => ({
                    ...prev,
                    medications: [{
                        name: 'Carprofen',
                        dosage: '75mg',
                        frequency: 'Twice daily (BID)',
                        instructions: 'Give with food. Monitor for GI upset.'
                    }]
                }));
                break;
            case 3:
                // Instructions added (visual feedback)
                break;
            case 4:
                setDemoData(prev => ({ ...prev, showQR: true }));
                break;
            case 5:
                // Show mobile view
                break;
        }

        if (stepId < steps.length) {
            setTimeout(() => setCurrentStep(stepId + 1), 1500);
        }
    };

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
                <Link href="/vets" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
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
                        PawScript Demo
                    </span>
                </Link>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Link
                        href="/vets"
                        style={{
                            color: '#6D6D72',
                            textDecoration: 'none',
                            fontWeight: '400',
                            fontSize: '0.95rem'
                        }}
                    >
                        ← Back to Vets
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
                            fontSize: '0.95rem'
                        }}
                    >
                        Start Free Trial
                    </Link>
                </div>
            </nav>

            {/* Demo Content */}
            <main style={{
                maxWidth: '1200px',
                margin: '0 auto',
                padding: '3rem 2rem'
            }}>
                {/* Hero */}
                <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
                    <h1 style={{
                        fontSize: '3rem',
                        fontWeight: '700',
                        color: '#1e293b',
                        marginBottom: '1rem'
                    }}>
                        See PawScript in Action
                    </h1>
                    <p style={{
                        fontSize: '1.25rem',
                        color: '#6D6D72',
                        marginBottom: '2rem',
                        maxWidth: '600px',
                        margin: '0 auto 2rem auto'
                    }}>
                        Watch how PawScript streamlines your discharge process from creation to QR code scanning.
                    </p>
                </div>

                {/* Interactive Demo */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '3rem',
                    alignItems: 'flex-start'
                }}>
                    {/* Left Side - Steps */}
                    <div>
                        <h2 style={{
                            fontSize: '1.5rem',
                            fontWeight: '600',
                            color: '#1e293b',
                            marginBottom: '2rem'
                        }}>
                            Interactive Walkthrough
                        </h2>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {steps.map((step) => (
                                <div key={step.id} style={{
                                    padding: '1.5rem',
                                    backgroundColor: currentStep === step.id ? '#007AFF' :
                                        currentStep > step.id ? '#34C759' : 'white',
                                    color: currentStep >= step.id ? 'white' : '#374151',
                                    borderRadius: '12px',
                                    border: '1px solid #e2e8f0',
                                    cursor: currentStep === step.id ? 'pointer' : 'default',
                                    transition: 'all 0.3s ease',
                                    position: 'relative'
                                }}>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '1rem'
                                    }}>
                                        <div style={{
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '50%',
                                            backgroundColor: currentStep >= step.id ? 'rgba(255,255,255,0.2)' : '#f1f5f9',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '0.875rem',
                                            fontWeight: '600',
                                            color: currentStep >= step.id ? 'white' : '#64748b'
                                        }}>
                                            {currentStep > step.id ? '✓' : step.id}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <h3 style={{
                                                fontSize: '1rem',
                                                fontWeight: '600',
                                                margin: '0 0 0.25rem 0'
                                            }}>
                                                {step.title}
                                            </h3>
                                            <p style={{
                                                fontSize: '0.875rem',
                                                margin: '0',
                                                opacity: 0.9
                                            }}>
                                                {step.description}
                                            </p>
                                        </div>
                                    </div>

                                    {currentStep === step.id && (
                                        <button
                                            onClick={() => handleStepAction(step.id)}
                                            style={{
                                                marginTop: '1rem',
                                                backgroundColor: 'rgba(255,255,255,0.2)',
                                                color: 'white',
                                                border: '1px solid rgba(255,255,255,0.3)',
                                                padding: '0.5rem 1rem',
                                                borderRadius: '6px',
                                                fontSize: '0.875rem',
                                                fontWeight: '500',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.3)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)';
                                            }}
                                        >
                                            {step.action} &rarr;
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right Side - Preview */}
                    <div style={{
                        position: 'sticky',
                        top: '2rem'
                    }}>
                        <div style={{
                            backgroundColor: 'white',
                            borderRadius: '16px',
                            padding: '2rem',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                            border: '1px solid #e2e8f0',
                            minHeight: '500px'
                        }}>
                            <h3 style={{
                                fontSize: '1.25rem',
                                fontWeight: '600',
                                color: '#1e293b',
                                marginBottom: '1.5rem',
                                textAlign: 'center'
                            }}>
                                Live Preview
                            </h3>

                            {/* Step 1: Pet Info */}
                            {currentStep >= 1 && demoData.pet.name && (
                                <div style={{
                                    backgroundColor: '#f8fafc',
                                    padding: '1rem',
                                    borderRadius: '8px',
                                    marginBottom: '1rem',
                                    animation: 'fadeIn 0.5s ease-in'
                                }}>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.75rem',
                                        marginBottom: '0.5rem'
                                    }}>
                                        <div style={{ fontSize: '1.5rem' }}>🐾</div>
                                        <div>
                                            <h4 style={{
                                                fontSize: '1rem',
                                                fontWeight: '600',
                                                color: '#1e293b',
                                                margin: '0'
                                            }}>
                                                {demoData.pet.name}
                                            </h4>
                                            <p style={{
                                                fontSize: '0.875rem',
                                                color: '#64748b',
                                                margin: '0'
                                            }}>
                                                {demoData.pet.species} • {demoData.pet.weight}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Step 2: Medications */}
                            {currentStep >= 2 && demoData.medications.length > 0 && (
                                <div style={{
                                    backgroundColor: '#f0f9ff',
                                    padding: '1rem',
                                    borderRadius: '8px',
                                    marginBottom: '1rem',
                                    animation: 'fadeIn 0.5s ease-in'
                                }}>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        marginBottom: '0.75rem'
                                    }}>
                                        <div style={{ fontSize: '1rem' }}>💊</div>
                                        <h4 style={{
                                            fontSize: '0.875rem',
                                            fontWeight: '600',
                                            color: '#1e293b',
                                            margin: '0'
                                        }}>
                                            Medications
                                        </h4>
                                    </div>
                                    {demoData.medications.map((med, medIndex) => (
                                        <div key={medIndex} style={{
                                            backgroundColor: 'white',
                                            padding: '0.75rem',
                                            borderRadius: '6px',
                                            border: '1px solid #e0f2fe'
                                        }}>
                                            <div style={{
                                                fontSize: '0.875rem',
                                                fontWeight: '600',
                                                color: '#1e293b',
                                                marginBottom: '0.25rem'
                                            }}>
                                                {med.name} - {med.dosage}
                                            </div>
                                            <div style={{
                                                fontSize: '0.75rem',
                                                color: '#64748b',
                                                marginBottom: '0.25rem'
                                            }}>
                                                {med.frequency}
                                            </div>
                                            <div style={{
                                                fontSize: '0.75rem',
                                                color: '#374151'
                                            }}>
                                                {med.instructions}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Step 4: QR Code */}
                            {currentStep >= 4 && demoData.showQR && (
                                <div style={{
                                    textAlign: 'center',
                                    backgroundColor: '#f0fdf4',
                                    padding: '1.5rem',
                                    borderRadius: '8px',
                                    animation: 'fadeIn 0.5s ease-in'
                                }}>
                                    <div style={{
                                        fontSize: '1rem',
                                        fontWeight: '600',
                                        color: '#166534',
                                        marginBottom: '1rem'
                                    }}>
                                        ✅ QR Code Generated!
                                    </div>
                                    <div style={{
                                        width: '120px',
                                        height: '120px',
                                        backgroundColor: 'white',
                                        border: '2px solid #16a34a',
                                        borderRadius: '8px',
                                        margin: '0 auto',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '2rem'
                                    }}>
                                        📱
                                    </div>
                                    <p style={{
                                        fontSize: '0.75rem',
                                        color: '#15803d',
                                        margin: '0.5rem 0 0 0'
                                    }}>
                                        Ready for pet owner to scan
                                    </p>
                                </div>
                            )}

                            {/* Step 5: Mobile Preview */}
                            {currentStep >= 5 && (
                                <div style={{
                                    backgroundColor: '#fef3c7',
                                    padding: '1rem',
                                    borderRadius: '8px',
                                    textAlign: 'center',
                                    animation: 'fadeIn 0.5s ease-in'
                                }}>
                                    <div style={{
                                        fontSize: '1rem',
                                        fontWeight: '600',
                                        color: '#92400e',
                                        marginBottom: '0.5rem'
                                    }}>
                                        📱 Pet Owner&apos;s View
                                    </div>
                                    <p style={{
                                        fontSize: '0.875rem',
                                        color: '#a16207',
                                        margin: '0'
                                    }}>
                                        Clean, mobile-friendly discharge summary with automatic medication import to PawScript app
                                    </p>
                                </div>
                            )}

                            {currentStep === 1 && !demoData.pet.name && (
                                <div style={{
                                    textAlign: 'center',
                                    color: '#94a3b8',
                                    fontSize: '0.875rem',
                                    padding: '2rem'
                                }}>
                                    Click the button to start the demo &rarr;
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* CTA Section */}
                {currentStep >= steps.length && (
                    <div style={{
                        textAlign: 'center',
                        marginTop: '4rem',
                        padding: '3rem',
                        backgroundColor: 'white',
                        borderRadius: '16px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}>
                        <h2 style={{
                            fontSize: '2rem',
                            fontWeight: '700',
                            color: '#1e293b',
                            marginBottom: '1rem'
                        }}>
                            Ready to Streamline Your Discharge Process?
                        </h2>
                        <p style={{
                            fontSize: '1.125rem',
                            color: '#6D6D72',
                            marginBottom: '2rem'
                        }}>
                            Start your free 30-day trial and see how PawScript transforms client compliance.
                        </p>
                        <div style={{
                            display: 'flex',
                            gap: '1rem',
                            justifyContent: 'center',
                            flexWrap: 'wrap'
                        }}>
                            <Link
                                href="/signup"
                                style={{
                                    backgroundColor: '#007AFF',
                                    color: 'white',
                                    padding: '1rem 2rem',
                                    borderRadius: '12px',
                                    textDecoration: 'none',
                                    fontWeight: '600',
                                    fontSize: '1.125rem'
                                }}
                            >
                                🚀 Start Free Trial
                            </Link>
                            <button
                                onClick={() => {
                                    setCurrentStep(1);
                                    setDemoData({ pet: { name: '', species: '', weight: '' }, medications: [], showQR: false });
                                }}
                                style={{
                                    backgroundColor: 'white',
                                    color: '#007AFF',
                                    border: '2px solid #007AFF',
                                    padding: '1rem 2rem',
                                    borderRadius: '12px',
                                    fontWeight: '600',
                                    fontSize: '1.125rem',
                                    cursor: 'pointer'
                                }}
                            >
                                🔄 Restart Demo
                            </button>
                        </div>
                    </div>
                )}
            </main>

            {/* Animations */}
            <style jsx>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}