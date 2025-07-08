// src/components/DischargeSummary.tsx - Mobile Responsive Version
'use client';

import { forwardRef } from 'react';
import { Discharge, Medication, TaperStage } from '@/types/discharge';
import Image from 'next/image';

// Extended interface for discharge summary with optional additional fields
interface ExtendedDischarge extends Discharge {
    visitDate?: Date;
    diagnosis?: string;
}

interface DischargeSummaryProps {
    discharge: ExtendedDischarge;
    clinicName?: string;
    vetFirstName?: string;
    vetLastName?: string;
    clinicPhone?: string;
    clinicAddress?: string;
    clinicLogo?: string; // URL to uploaded clinic logo
    qrCodeUrl?: string; // QR code for scanning
    dischargeViewUrl?: string; // Direct link (unused but kept for consistency)
    isMobile?: boolean; // Mobile responsive prop
}

const DischargeSummary = forwardRef<HTMLDivElement, DischargeSummaryProps>(
    ({
        discharge,
        clinicName,
        vetFirstName,
        vetLastName,
        clinicPhone,
        clinicAddress,
        clinicLogo,
        qrCodeUrl,
        isMobile = false
        // dischargeViewUrl is intentionally not destructured as it's not used
    }, ref) => {
        const formatTime = (time: string) => {
            const [hours, minutes] = time.split(':');
            const hour = parseInt(hours);
            const ampm = hour >= 12 ? 'PM' : 'AM';
            const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
            return `${displayHour}:${minutes} ${ampm}`;
        };

        // Function to get frequency label without times
        const getFrequencyLabel = (frequency: number) => {
            if (frequency === 0.5) {
                return 'Every Other Day';
            } else if (frequency === 1) {
                return '1x/day';
            } else {
                return `${frequency}x/day`;
            }
        };

        // New function to format date ranges
        const formatDateRange = (startDate?: string, endDate?: string) => {
            if (!startDate && !endDate) return '';

            const formatSingleDate = (date: string) => {
                const d = new Date(date);
                return d.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                });
            };

            if (startDate && endDate) {
                return `${formatSingleDate(startDate)} - ${formatSingleDate(endDate)}`;
            } else if (startDate) {
                return `Starting ${formatSingleDate(startDate)}`;
            } else if (endDate) {
                return `Until ${formatSingleDate(endDate)}`;
            }
            return '';
        };

        const formatDate = (date: Date | string | undefined) => {
            if (!date) return '';
            const d = new Date(date);
            return d.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
        };

        const formattedAddress = clinicAddress
            ?.split(',')
            .map(part => part.trim())
            .filter(Boolean)
            .join(', ');

        return (
            <div
                ref={ref}
                style={{
                    backgroundColor: 'white',
                    borderRadius: '16px',
                    padding: isMobile ? '1.5rem' : '2rem',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                    border: '1px solid #e2e8f0',
                    fontFamily: 'Nunito, sans-serif',
                    maxWidth: '800px',
                    margin: '0 auto'
                }}
                className="printable-content"
            >
                {/* Header Section - Clinic Info with Logo */}
                <div style={{
                    borderBottom: '2px solid #007AFF',
                    paddingBottom: isMobile ? '1.5rem' : '2rem',
                    marginBottom: isMobile ? '1.5rem' : '2rem'
                }}>
                    <div style={{
                        display: 'flex',
                        flexDirection: isMobile ? 'column' : 'row',
                        alignItems: isMobile ? 'center' : 'flex-start',
                        gap: isMobile ? '1rem' : '1.5rem',
                        marginBottom: '1rem'
                    }}>
                        {/* Logo Section */}
                        <div style={{
                            flexShrink: 0,
                            width: isMobile ? '60px' : '80px',
                            height: isMobile ? '60px' : '80px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            {clinicLogo ? (
                                <Image
                                    src={clinicLogo}
                                    alt={`${clinicName} logo`}
                                    width={isMobile ? 60 : 80}
                                    height={isMobile ? 60 : 80}
                                    style={{
                                        objectFit: 'contain',
                                        borderRadius: '8px'
                                    }}
                                />
                            ) : (
                                <div style={{
                                    width: isMobile ? '60px' : '80px',
                                    height: isMobile ? '60px' : '80px',
                                    backgroundColor: '#007AFF',
                                    borderRadius: '12px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white'
                                }}>
                                    <div style={{
                                        fontSize: isMobile ? '1.25rem' : '1.5rem',
                                        fontWeight: '700',
                                        marginBottom: '0.25rem'
                                    }}>
                                        <Image
                                            src="/images/logowhite.png"
                                            alt="PawScript Logo"
                                            width={isMobile ? 48 : 64}
                                            height={isMobile ? 48 : 64}
                                            style={{
                                                objectFit: 'contain'
                                            }}
                                        />
                                    </div>
                                    <div style={{
                                        fontSize: '0.625rem',
                                        textAlign: 'center',
                                        lineHeight: '1'
                                    }}>
                                        PawScript
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Clinic Information */}
                        <div style={{
                            flex: 1,
                            textAlign: isMobile ? 'center' : 'left'
                        }}>
                            <h2 style={{
                                fontSize: isMobile ? '1.5rem' : '1.75rem',
                                fontWeight: '700',
                                color: '#1e293b',
                                marginBottom: '0.75rem',
                                margin: '0'
                            }}>
                                {clinicName || 'Veterinary Clinic'}
                            </h2>

                            <div style={{
                                fontSize: isMobile ? '0.875rem' : '1rem',
                                color: '#64748b',
                                lineHeight: '1.6'
                            }}>
                                {(vetFirstName || vetLastName) && (
                                    <p style={{ margin: '0.25rem 0', fontWeight: '600' }}>
                                        Prepared by: Dr. {[vetFirstName, vetLastName].filter(Boolean).join(' ')}
                                    </p>
                                )}

                                {clinicPhone && (
                                    <p style={{ margin: '0.25rem 0' }}>
                                        Phone: {clinicPhone}
                                    </p>
                                )}

                                {formattedAddress && (
                                    <p style={{ margin: '0.25rem 0' }}>
                                        Address: {formattedAddress}
                                    </p>
                                )}

                            </div>

                            {/* Show "Powered by PawScript" if using custom logo */}
                            {clinicLogo && (
                                <p style={{
                                    fontSize: '0.75rem',
                                    color: '#94a3b8',
                                    marginTop: '0.75rem',
                                    margin: '0.75rem 0 0 0'
                                }}>
                                    Powered by PawScript
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* QR Code Section */}
                {qrCodeUrl && (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: isMobile ? '1fr' : 'auto 1fr',
                        gap: isMobile ? '1.5rem' : '2rem',
                        alignItems: 'center',
                        backgroundColor: '#f8fafc',
                        padding: isMobile ? '1.5rem' : '2rem',
                        borderRadius: '12px',
                        marginBottom: isMobile ? '1.5rem' : '2rem',
                        border: '1px solid #e2e8f0'
                    }}>
                        {/* QR Code */}
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '0.75rem',
                            order: isMobile ? 2 : 1
                        }}>
                            <Image
                                src={qrCodeUrl}
                                alt="QR Code for discharge"
                                width={isMobile ? 160 : 200}
                                height={isMobile ? 160 : 200}
                                style={{
                                    border: '2px solid #e2e8f0',
                                    borderRadius: '12px',
                                    padding: '0.75rem',
                                    backgroundColor: 'white'
                                }}
                            />
                            <p style={{
                                fontSize: '0.75rem',
                                color: '#64748b',
                                textAlign: 'center',
                                margin: '0',
                                fontWeight: '600'
                            }}>
                                Scan to Import
                            </p>
                        </div>

                        {/* QR Description */}
                        <div style={{
                            order: isMobile ? 1 : 2
                        }}>
                            <h4 style={{
                                fontSize: isMobile ? '1.125rem' : '1.25rem',
                                fontWeight: '600',
                                color: '#1e293b',
                                marginBottom: '1rem',
                                margin: '0 0 1rem 0',
                                textAlign: isMobile ? 'center' : 'left'
                            }}>
                                Digital Medication Management
                            </h4>
                            <p style={{
                                fontSize: isMobile ? '0.875rem' : '1rem',
                                color: '#64748b',
                                lineHeight: '1.6',
                                marginBottom: '1rem',
                                textAlign: isMobile ? 'center' : 'left'
                            }}>
                                Pet owners can scan this QR code with their PawScript mobile app to automatically import the complete medication schedule, set up reminders, and track their pet&apos;s progress.
                            </p>
                            <div style={{
                                fontSize: isMobile ? '0.8rem' : '0.875rem',
                                color: '#64748b',
                                lineHeight: '1.5'
                            }}>
                                <p style={{
                                    margin: '0 0 0.5rem 0',
                                    fontWeight: '600',
                                    textAlign: isMobile ? 'center' : 'left'
                                }}>Instructions:</p>
                                <ol style={{
                                    margin: '0',
                                    paddingLeft: isMobile ? '1rem' : '1.25rem',
                                    listStyle: 'decimal'
                                }}>
                                    <li>Download PawScript from the App Store</li>
                                    <li>Open the app and tap &quot;Scan QR Code&quot;</li>
                                    <li>Point camera at this QR code</li>
                                    <li>Medication schedule will be imported automatically</li>
                                </ol>
                            </div>
                        </div>
                    </div>
                )}

                {/* Discharge Summary Header */}
                <div style={{
                    marginBottom: isMobile ? '1.5rem' : '2rem'
                }}>
                    <h3 style={{
                        fontSize: isMobile ? '1.25rem' : '1.5rem',
                        fontWeight: '700',
                        color: '#1e293b',
                        marginBottom: '0.5rem'
                    }}>
                        Discharge Summary
                    </h3>
                    <p style={{
                        fontSize: isMobile ? '0.875rem' : '1rem',
                        color: '#64748b',
                        margin: '0'
                    }}>
                        Visit Date: {formatDate(discharge.visitDate || discharge.createdAt)}
                    </p>
                </div>

                {/* Pet Information */}
                <div style={{
                    backgroundColor: '#f8fafc',
                    padding: isMobile ? '1.25rem' : '1.5rem',
                    borderRadius: '12px',
                    marginBottom: isMobile ? '1.5rem' : '2rem',
                    border: '1px solid #e2e8f0'
                }}>
                    <h4 style={{
                        fontSize: isMobile ? '1rem' : '1.125rem',
                        fontWeight: '600',
                        color: '#1e293b',
                        marginBottom: '1rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}>
                        🐾 Patient Information
                    </h4>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(150px, 1fr))',
                        gap: '1rem'
                    }}>
                        <div>
                            <span style={{
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                color: '#64748b',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em'
                            }}>
                                Name
                            </span>
                            <p style={{
                                fontSize: isMobile ? '0.875rem' : '1rem',
                                fontWeight: '600',
                                color: '#1e293b',
                                margin: '0.25rem 0 0 0'
                            }}>
                                {discharge.pet.name}
                            </p>
                        </div>
                        <div>
                            <span style={{
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                color: '#64748b',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em'
                            }}>
                                Species
                            </span>
                            <p style={{
                                fontSize: isMobile ? '0.875rem' : '1rem',
                                fontWeight: '600',
                                color: '#1e293b',
                                margin: '0.25rem 0 0 0'
                            }}>
                                {discharge.pet.species}
                            </p>
                        </div>
                        {discharge.pet.weight && (
                            <div>
                                <span style={{
                                    fontSize: '0.75rem',
                                    fontWeight: '600',
                                    color: '#64748b',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em'
                                }}>
                                    Weight
                                </span>
                                <p style={{
                                    fontSize: isMobile ? '0.875rem' : '1rem',
                                    fontWeight: '600',
                                    color: '#1e293b',
                                    margin: '0.25rem 0 0 0'
                                }}>
                                    {discharge.pet.weight}
                                </p>
                            </div>
                        )}
                    </div>
                    {discharge.diagnosis && (
                        <div style={{ marginTop: '1rem' }}>
                            <span style={{
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                color: '#64748b',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em'
                            }}>
                                Diagnosis / Reason for Visit
                            </span>
                            <p style={{
                                fontSize: isMobile ? '0.875rem' : '1rem',
                                color: '#1e293b',
                                margin: '0.25rem 0 0 0',
                                lineHeight: '1.5'
                            }}>
                                {discharge.diagnosis}
                            </p>
                        </div>
                    )}
                </div>

                {/* Medications */}
                <div style={{ marginBottom: isMobile ? '1.5rem' : '2rem' }}>
                    <h4 style={{
                        fontSize: isMobile ? '1.125rem' : '1.25rem',
                        fontWeight: '600',
                        color: '#1e293b',
                        marginBottom: '1.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}>
                        💊 Prescribed Medications ({discharge.medications.length})
                    </h4>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {discharge.medications.map((medication: Medication, index: number) => (
                            <div key={index} style={{
                                border: '1px solid #e2e8f0',
                                borderRadius: '12px',
                                padding: isMobile ? '1.25rem' : '1.5rem',
                                backgroundColor: 'white',
                                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                            }}>
                                <div style={{
                                    display: 'flex',
                                    flexDirection: isMobile ? 'column' : 'row',
                                    justifyContent: 'space-between',
                                    alignItems: isMobile ? 'flex-start' : 'flex-start',
                                    marginBottom: '1rem',
                                    gap: isMobile ? '0.75rem' : '0'
                                }}>
                                    <h5 style={{
                                        fontSize: isMobile ? '1rem' : '1.125rem',
                                        fontWeight: '600',
                                        color: '#1e293b',
                                        margin: '0'
                                    }}>
                                        {medication.name}
                                        {medication.isTapered && (
                                            <span style={{
                                                marginLeft: '0.75rem',
                                                fontSize: '0.75rem',
                                                backgroundColor: '#ddd6fe',
                                                color: '#7c3aed',
                                                padding: '0.25rem 0.75rem',
                                                borderRadius: '12px',
                                                fontWeight: '500',
                                                display: isMobile ? 'block' : 'inline',
                                                marginTop: isMobile ? '0.5rem' : '0'
                                            }}>
                                                TAPERED DOSING
                                            </span>
                                        )}
                                    </h5>
                                    {medication.dosage && (
                                        <span style={{
                                            fontSize: isMobile ? '0.875rem' : '1rem',
                                            fontWeight: '600',
                                            color: '#007AFF',
                                            backgroundColor: '#f0f9ff',
                                            padding: '0.5rem 1rem',
                                            borderRadius: '8px',
                                            alignSelf: isMobile ? 'flex-start' : 'auto'
                                        }}>
                                            {medication.dosage}
                                        </span>
                                    )}
                                </div>

                                {!medication.isTapered ? (
                                    /* Regular Medication */
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        <div style={{
                                            display: 'grid',
                                            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))',
                                            gap: '1rem'
                                        }}>
                                            <div>
                                                <span style={{
                                                    fontSize: '0.75rem',
                                                    fontWeight: '600',
                                                    color: '#64748b',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.05em'
                                                }}>
                                                    Frequency
                                                </span>
                                                <p style={{
                                                    fontSize: isMobile ? '0.875rem' : '1rem',
                                                    color: '#1e293b',
                                                    margin: '0.25rem 0 0 0',
                                                    fontWeight: '600'
                                                }}>
                                                    {medication.frequency && getFrequencyLabel(medication.frequency)}
                                                </p>
                                            </div>
                                            <div>
                                                <span style={{
                                                    fontSize: '0.75rem',
                                                    fontWeight: '600',
                                                    color: '#64748b',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.05em'
                                                }}>
                                                    Times
                                                </span>
                                                <p style={{
                                                    fontSize: isMobile ? '0.875rem' : '1rem',
                                                    color: '#1e293b',
                                                    margin: '0.25rem 0 0 0',
                                                    fontWeight: '500'
                                                }}>
                                                    {medication.customTimes?.map(formatTime).join(', ') || 'Not specified'}
                                                </p>
                                            </div>
                                            {(medication.startDate || medication.endDate) && (
                                                <div>
                                                    <span style={{
                                                        fontSize: '0.75rem',
                                                        fontWeight: '600',
                                                        color: '#64748b',
                                                        textTransform: 'uppercase',
                                                        letterSpacing: '0.05em'
                                                    }}>
                                                        Duration
                                                    </span>
                                                    <p style={{
                                                        fontSize: isMobile ? '0.875rem' : '1rem',
                                                        color: '#1e293b',
                                                        margin: '0.25rem 0 0 0'
                                                    }}>
                                                        {formatDateRange(medication.startDate, medication.endDate)}
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Special handling for Every Other Day - show dates */}
                                        {medication.frequency === 0.5 && (
                                            <div style={{
                                                backgroundColor: '#fef3c7',
                                                border: '1px solid #f59e0b',
                                                borderRadius: '8px',
                                                padding: '0.75rem',
                                                fontSize: isMobile ? '0.8rem' : '0.875rem',
                                                color: '#92400e'
                                            }}>
                                                <strong>Every Other Day Schedule:</strong> Give medication on alternating days.
                                                {medication.startDate && ` Starting ${formatDate(medication.startDate)}.`}
                                                {medication.endDate && ` Ending ${formatDate(medication.endDate)}.`}
                                            </div>
                                        )}

                                        <div>
                                            <span style={{
                                                fontSize: '0.75rem',
                                                fontWeight: '600',
                                                color: '#64748b',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.05em'
                                            }}>
                                                Instructions
                                            </span>
                                            <p style={{
                                                fontSize: isMobile ? '0.875rem' : '1rem',
                                                color: '#1e293b',
                                                margin: '0.5rem 0 0 0',
                                                lineHeight: '1.6'
                                            }}>
                                                {medication.instructions}
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    /* Tapered Medication */
                                    <div>
                                        <span style={{
                                            fontSize: '0.75rem',
                                            fontWeight: '600',
                                            color: '#64748b',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em'
                                        }}>
                                            Tapering Schedule
                                        </span>
                                        <div style={{
                                            marginTop: '1rem',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '1rem'
                                        }}>
                                            {medication.taperStages?.map((stage: TaperStage, stageIndex: number) => (
                                                <div key={stageIndex} style={{
                                                    backgroundColor: '#f8fafc',
                                                    padding: isMobile ? '0.75rem' : '1rem',
                                                    borderRadius: '8px',
                                                    border: '1px solid #e2e8f0'
                                                }}>
                                                    <div style={{
                                                        display: 'grid',
                                                        gridTemplateColumns: isMobile ? '1fr' : 'auto repeat(auto-fit, minmax(120px, 1fr))',
                                                        gap: '1rem',
                                                        alignItems: 'center'
                                                    }}>
                                                        <div style={{
                                                            backgroundColor: '#7c3aed',
                                                            color: 'white',
                                                            padding: '0.5rem',
                                                            borderRadius: '6px',
                                                            fontSize: '0.75rem',
                                                            fontWeight: '600',
                                                            textAlign: 'center',
                                                            minWidth: '60px',
                                                            justifySelf: isMobile ? 'center' : 'auto'
                                                        }}>
                                                            Stage {stageIndex + 1}
                                                        </div>
                                                        <div>
                                                            <span style={{
                                                                fontSize: '0.625rem',
                                                                fontWeight: '600',
                                                                color: '#64748b'
                                                            }}>
                                                                DOSAGE
                                                            </span>
                                                            <p style={{
                                                                fontSize: isMobile ? '0.8rem' : '0.875rem',
                                                                margin: '0.125rem 0 0 0',
                                                                fontWeight: '600'
                                                            }}>
                                                                {stage.dosage}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <span style={{
                                                                fontSize: '0.625rem',
                                                                fontWeight: '600',
                                                                color: '#64748b'
                                                            }}>
                                                                FREQUENCY
                                                            </span>
                                                            <p style={{
                                                                fontSize: isMobile ? '0.8rem' : '0.875rem',
                                                                margin: '0.125rem 0 0 0',
                                                                fontWeight: '600'
                                                            }}>
                                                                {getFrequencyLabel(stage.frequency)}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <span style={{
                                                                fontSize: '0.625rem',
                                                                fontWeight: '600',
                                                                color: '#64748b'
                                                            }}>
                                                                TIMES
                                                            </span>
                                                            <p style={{
                                                                fontSize: isMobile ? '0.8rem' : '0.875rem',
                                                                margin: '0.125rem 0 0 0',
                                                                fontWeight: '500'
                                                            }}>
                                                                {stage.times ? stage.times.map(formatTime).join(', ') : ''}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <span style={{
                                                                fontSize: '0.625rem',
                                                                fontWeight: '600',
                                                                color: '#64748b'
                                                            }}>
                                                                DATES
                                                            </span>
                                                            <p style={{
                                                                fontSize: isMobile ? '0.8rem' : '0.875rem',
                                                                margin: '0.125rem 0 0 0',
                                                                fontWeight: '500'
                                                            }}>
                                                                {formatDate(stage.startDate)} - {formatDate(stage.endDate)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <div style={{ marginTop: '1rem' }}>
                                            <span style={{
                                                fontSize: '0.75rem',
                                                fontWeight: '600',
                                                color: '#64748b',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.05em'
                                            }}>
                                                Instructions
                                            </span>
                                            <p style={{
                                                fontSize: isMobile ? '0.875rem' : '1rem',
                                                color: '#1e293b',
                                                margin: '0.5rem 0 0 0',
                                                lineHeight: '1.6'
                                            }}>
                                                {medication.instructions}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Additional Notes */}
                {discharge.notes && (
                    <div style={{
                        backgroundColor: '#fffbeb',
                        border: '1px solid #f59e0b',
                        borderRadius: '12px',
                        padding: isMobile ? '1.25rem' : '1.5rem',
                        marginBottom: isMobile ? '1.5rem' : '2rem'
                    }}>
                        <h4 style={{
                            fontSize: isMobile ? '1rem' : '1.125rem',
                            fontWeight: '600',
                            color: '#92400e',
                            marginBottom: '0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}>
                            📝 Additional Notes
                        </h4>
                        <p style={{
                            fontSize: isMobile ? '0.875rem' : '1rem',
                            color: '#92400e',
                            margin: '0',
                            lineHeight: '1.6'
                        }}>
                            {discharge.notes}
                        </p>
                    </div>
                )}

                {/* Footer - PawScript Branding */}
                <div style={{
                    borderTop: '1px solid #e2e8f0',
                    paddingTop: '1.5rem',
                    marginTop: isMobile ? '1.5rem' : '2rem',
                    textAlign: 'center'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.75rem',
                        fontSize: isMobile ? '0.8rem' : '0.875rem',
                        color: '#94a3b8'
                    }}>
                        <div style={{
                            width: '24px',
                            height: '24px',
                            backgroundColor: '#007AFF',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.75rem',
                            color: 'white',
                            fontWeight: '700'
                        }}>
                            <Image
                                src="/images/logowhite.png"
                                alt="PawScript Logo"
                                width={16}
                                height={16}
                                style={{
                                    objectFit: 'contain'
                                }}
                            />
                        </div>
                        <span style={{ fontWeight: '600' }}>Powered by PawScript</span>
                    </div>
                    <p style={{
                        fontSize: isMobile ? '0.7rem' : '0.75rem',
                        color: '#94a3b8',
                        margin: '0.5rem 0 0 0'
                    }}>
                        Digital medication management for pets
                    </p>
                </div>
            </div>
        );
    }
);

DischargeSummary.displayName = 'DischargeSummary';

export default DischargeSummary;