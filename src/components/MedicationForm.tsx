// src/components/MedicationForm.tsx
'use client';

import { useState } from 'react';
import { Medication, TaperStage } from '@/types/discharge';
import { medicationTemplates, getMedicationTemplate } from '@/data/medicationTemplates';

interface MedicationFormProps {
    medication: Medication;
    index: number;
    onUpdate: (index: number, medication: Medication) => void;
    onRemove: (index: number) => void;
    onValidate?: (index: number, isValid: boolean) => void; // Add this line
}

// Clean frequency options - removed 0.5 "Every Other Day"
const frequencyOptions = [
    { value: 1, label: '1x/day', times: ['08:00'] },
    { value: 2, label: '2x/day', times: ['08:00', '20:00'] },
    { value: 3, label: '3x/day', times: ['08:00', '14:00', '20:00'] },
    { value: 4, label: '4x/day', times: ['08:00', '12:00', '16:00', '20:00'] },
    { value: 5, label: '5x/day', times: ['08:00', '11:00', '14:00', '17:00', '20:00'] },
    { value: 6, label: '6x/day', times: ['08:00', '10:30', '13:00', '15:30', '18:00', '20:30'] },
    { value: 7, label: '7x/day', times: ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'] },
    { value: 8, label: '8x/day', times: ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'] },
    { value: 9, label: '9x/day', times: ['08:00', '09:30', '11:00', '12:30', '14:00', '15:30', '17:00', '18:30', '20:00'] },
    { value: 10, label: '10x/day', times: ['08:00', '09:20', '10:40', '12:00', '13:20', '14:40', '16:00', '17:20', '18:40', '20:00'] }
];

export default function MedicationForm({ medication, index, onUpdate, onRemove, onValidate }: MedicationFormProps) {
    const [isExpanded, setIsExpanded] = useState(true);
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});


    // Update medication when changes are made
    const updateMedication = (updates: Partial<Medication>) => {
        const updatedMedication = { ...medication, ...updates };
        onUpdate(index, updatedMedication);

        // Clear validation errors when user makes changes
        if (validationErrors.totalDoses && updates.totalDoses) {
            setValidationErrors(prev => ({ ...prev, totalDoses: '' }));
        }

        // Notify parent of validation status
        if (onValidate) {
            setTimeout(() => {
                const isValid = validateMedication();
                onValidate(index, isValid);
            }, 0);
        }
    };

    // Handle medication name change and auto-fill instructions
    const handleMedicationNameChange = (name: string) => {
        const template = getMedicationTemplate(name);
        const updates: Partial<Medication> = { name };

        if (template && !medication.instructions) {
            updates.instructions = template.defaultInstructions;
        }

        updateMedication(updates);
    };



    // Auto-calculate end date for every other day medications
    const calculateEndDate = (startDate: string, totalDoses: number) => {
        if (!startDate || !totalDoses || totalDoses <= 0) return '';

        const start = new Date(startDate);
        // Every other day means we add (totalDoses - 1) * 2 days
        const endDate = new Date(start);
        endDate.setDate(start.getDate() + ((totalDoses - 1) * 2));

        return endDate.toISOString().split('T')[0];
    };

    // Auto-calculate total doses for daily medications (30 days default)
    const calculateTotalDoses = (startDate: string, endDate: string, frequency: number, isEveryOtherDay: boolean) => {
        if (!startDate || !endDate || !frequency) return undefined;

        const start = new Date(startDate);
        const end = new Date(endDate);
        const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

        if (isEveryOtherDay) {
            // Every other day: count actual dose days
            return Math.ceil(daysDiff / 2);
        } else {
            // Daily: multiply days by frequency
            return daysDiff * frequency;
        }
    };

    // Handle total doses change with validation
    const handleTotalDosesChange = (totalDoses: number) => {
        const updates: Partial<Medication> = { totalDoses };

        // Auto-calculate end date for every other day medications
        if (medication.isEveryOtherDay && medication.startDate && totalDoses > 0) {
            updates.endDate = calculateEndDate(medication.startDate, totalDoses);
        }

        updateMedication(updates);
    };

    // Handle total doses blur for validation
    const handleTotalDosesBlur = () => {
        if (medication.isEveryOtherDay && (!medication.totalDoses || medication.totalDoses <= 0)) {
            setValidationErrors(prev => ({ ...prev, totalDoses: 'Needed for EOD' }));
        }
    };

    // Handle start date change
    const handleStartDateChange = (startDate: string) => {
        const updates: Partial<Medication> = { startDate };

        if (medication.isEveryOtherDay) {
            // Auto-calculate end date for EOD medications
            if (medication.totalDoses && medication.totalDoses > 0) {
                updates.endDate = calculateEndDate(startDate, medication.totalDoses);
            }
        } else {
            // Auto-calculate total doses for daily medications
            if (medication.endDate && medication.frequency) {
                updates.totalDoses = calculateTotalDoses(startDate, medication.endDate, medication.frequency, false);
            }
        }

        updateMedication(updates);
    };

    // Handle end date change with auto-calculation logic
    const handleEndDateChange = (endDate: string) => {
        const updates: Partial<Medication> = { endDate };

        // Auto-calculate total doses for daily medications (not EOD)
        if (!medication.isEveryOtherDay && medication.startDate && medication.frequency) {
            updates.totalDoses = calculateTotalDoses(medication.startDate, endDate, medication.frequency, false);
        }

        updateMedication(updates);
    };

    // Handle taper stage total doses change with end date calculation
    const handleTaperStageTotalDosesChange = (stageIndex: number, totalDoses: number) => {
        const updates: Partial<TaperStage> = { totalDoses };
        const stage = medication.taperStages[stageIndex];

        // Auto-calculate end date for EOD stages
        if (stage.isEveryOtherDay && stage.startDate && totalDoses > 0) {
            const start = new Date(stage.startDate);
            const endDate = new Date(start);
            endDate.setDate(start.getDate() + ((totalDoses - 1) * 2));
            updates.endDate = endDate.toISOString().split('T')[0];
        }

        updateTaperStage(stageIndex, updates);
    };

    // Check if end date should be read-only (Daily with start date + total doses)
    const isEndDateReadOnly = () => {
        return !medication.isEveryOtherDay &&
            medication.startDate &&
            medication.totalDoses &&
            medication.totalDoses > 0;
    };

    // Handle frequency change and auto-generate times
    const handleFrequencyChange = (frequency: number) => {
        const frequencyOption = frequencyOptions.find(opt => opt.value === frequency);
        if (frequencyOption) {
            const updates: Partial<Medication> = {
                frequency,
                times: frequencyOption.times,
                customTimes: [...frequencyOption.times] // Create a copy for editing
            };

            // Recalculate total doses if we have date range
            if (!medication.isEveryOtherDay && medication.startDate && medication.endDate) {
                updates.totalDoses = calculateTotalDoses(medication.startDate, medication.endDate, frequency, false);
            }

            updateMedication(updates);
        }
    };

    // Handle every other day toggle
    const handleEveryOtherDayToggle = (isEveryOtherDay: boolean) => {
        const updates: Partial<Medication> = { isEveryOtherDay };

        if (isEveryOtherDay) {
            // Switching to every other day - FORCE frequency to 1 (mobile app constraint)
            updates.frequency = 1; // Always 1x per dose day for EOD
            updates.times = ['08:00'];
            updates.customTimes = ['08:00'];
            updates.totalDoses = 5; // Default to 5 doses

            // Auto-calculate end date if start date exists
            if (medication.startDate) {
                updates.endDate = calculateEndDate(medication.startDate, 5);
            }
        } else {
            // Switching to daily - recalculate total doses if we have date range
            if (medication.startDate && medication.endDate && medication.frequency) {
                updates.totalDoses = calculateTotalDoses(medication.startDate, medication.endDate, medication.frequency, false);
            }
        }

        updateMedication(updates);
    };

    // Handle individual time change
    const handleTimeChange = (timeIndex: number, newTime: string) => {
        if (medication.customTimes) {
            const updatedTimes = [...medication.customTimes];
            updatedTimes[timeIndex] = newTime;
            updateMedication({ customTimes: updatedTimes });
        }
    };

    // Validate entire medication form
    const validateMedication = (): boolean => {
        const errors: Record<string, string> = {};

        // Basic required fields
        if (!medication.name?.trim()) {
            errors.name = 'Medication name is required';
        }
        if (!medication.instructions?.trim()) {
            errors.instructions = 'Instructions are required';
        }

        if (!medication.isTapered) {
            // Simple medication validation
            if (!medication.dosage?.trim()) {
                errors.dosage = 'Dosage is required';
            }
            if (medication.isEveryOtherDay && (!medication.totalDoses || medication.totalDoses <= 0)) {
                errors.totalDoses = 'Total doses required for EOD';
            }
        } else {
            // Taper stage validation
            medication.taperStages.forEach((stage, index) => {
                if (!stage.dosage?.trim()) {
                    errors[`stage-${index}-dosage`] = `Stage ${index + 1} dosage is required`;
                }
                if (!stage.startDate) {
                    errors[`stage-${index}-startDate`] = `Stage ${index + 1} start date is required`;
                }
                if (!stage.endDate) {
                    errors[`stage-${index}-endDate`] = `Stage ${index + 1} end date is required`;
                }
                if (stage.isEveryOtherDay && (!stage.totalDoses || stage.totalDoses <= 0)) {
                    errors[`stage-${index}-totalDoses`] = `Stage ${index + 1} total doses required for EOD`;
                }
            });
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    // Handle taper toggle
    const handleTaperToggle = (isTapered: boolean) => {
        if (isTapered) {
            // Switching to tapered - clear simple medication fields and add default stage
            const defaultStage: TaperStage = {
                startDate: '',
                endDate: '',
                dosage: medication.dosage || '',
                frequency: medication.frequency || 1,
                times: medication.customTimes || ['08:00'],
                allowClientToAdjustTime: true,
                totalDoses: undefined,
                isEveryOtherDay: false
            };

            updateMedication({
                isTapered: true,
                dosage: undefined,
                frequency: undefined,
                times: undefined,
                customTimes: undefined,
                startDate: undefined,
                endDate: undefined,
                totalDoses: undefined,
                isEveryOtherDay: false, // Clear EOD when switching to tapered
                taperStages: [defaultStage]
            });
        } else {
            // Switching to simple - clear taper stages and set default simple fields
            updateMedication({
                isTapered: false,
                dosage: '',
                frequency: 1,
                times: ['08:00'],
                customTimes: ['08:00'],
                startDate: '',
                endDate: '',
                totalDoses: undefined,
                isEveryOtherDay: false,
                taperStages: []
            });
        }
    };

    // Add new taper stage
    const addTaperStage = () => {
        const newStage: TaperStage = {
            startDate: '',
            endDate: '',
            dosage: '',
            frequency: 1,
            times: ['08:00'],
            allowClientToAdjustTime: true,
            totalDoses: undefined,
            isEveryOtherDay: false
        };

        // Auto-fill start date as next day after previous stage's end date
        if (medication.taperStages.length > 0) {
            const lastStage = medication.taperStages[medication.taperStages.length - 1];
            if (lastStage.endDate) {
                const nextDay = new Date(lastStage.endDate);
                nextDay.setDate(nextDay.getDate() + 1);
                newStage.startDate = nextDay.toISOString().split('T')[0];
            }
        }

        updateMedication({
            taperStages: [...medication.taperStages, newStage]
        });
    };

    // Remove taper stage
    const removeTaperStage = (stageIndex: number) => {
        updateMedication({
            taperStages: medication.taperStages.filter((_, i) => i !== stageIndex)
        });
    };

    // Update specific taper stage
    const updateTaperStage = (stageIndex: number, updates: Partial<TaperStage>) => {
        const updatedStages = medication.taperStages.map((stage, i) =>
            i === stageIndex ? { ...stage, ...updates } : stage
        );

        updateMedication({ taperStages: updatedStages });

        // ADD THESE LINES:
        if (validationErrors[`taperStage-${stageIndex}-totalDoses`] && updates.totalDoses) {
            setValidationErrors(prev => ({ ...prev, [`taperStage-${stageIndex}-totalDoses`]: '' }));
        }
    };

    // Handle taper stage frequency change
    const handleTaperFrequencyChange = (stageIndex: number, frequency: number) => {
        const frequencyOption = frequencyOptions.find(opt => opt.value === frequency);
        if (frequencyOption) {
            updateTaperStage(stageIndex, {
                frequency,
                times: frequencyOption.times
            });
        }
    };

    // Handle taper stage every other day toggle
    const handleTaperStageEODToggle = (stageIndex: number, isEveryOtherDay: boolean) => {
        const updates: Partial<TaperStage> = { isEveryOtherDay };

        if (isEveryOtherDay) {
            updates.frequency = 1;
            updates.times = ['08:00'];
            updates.totalDoses = 5; // ADD THIS LINE
        }

        updateTaperStage(stageIndex, updates);
    };

    // Handle taper stage total doses blur for validation
    const handleTaperStageTotalDosesBlur = (stageIndex: number) => {
        const stage = medication.taperStages[stageIndex];
        if (stage.isEveryOtherDay && (!stage.totalDoses || stage.totalDoses <= 0)) {
            setValidationErrors(prev => ({ ...prev, [`taperStage-${stageIndex}-totalDoses`]: 'Needed for EOD stage' }));
        }
    };



    // Auto-calculate total doses for taper stage when dates change
    const handleTaperStageDateChange = (stageIndex: number, field: 'startDate' | 'endDate', value: string) => {
        const updates: Partial<TaperStage> = { [field]: value };

        // Auto-calculate end date for EOD stages when start date or total doses change
        const stage = medication.taperStages[stageIndex];
        const updatedStage = { ...stage, ...updates };

        if (updatedStage.isEveryOtherDay && field === 'startDate' && updatedStage.totalDoses && updatedStage.totalDoses > 0) {
            // Calculate end date for EOD: (totalDoses - 1) * 2 days + start date
            const start = new Date(value);
            const endDate = new Date(start);
            endDate.setDate(start.getDate() + ((updatedStage.totalDoses - 1) * 2));
            updates.endDate = endDate.toISOString().split('T')[0];
        }

        updateTaperStage(stageIndex, updates);
    };

    // Format date for display
    const formatDateForDisplay = (dateString: string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        });
    };

    // Calculate days duration for every other day preview
    const calculateDaysDuration = (startDate: string, totalDoses: number) => {
        if (!startDate || !totalDoses) return 0;
        return ((totalDoses - 1) * 2) + 1; // Number of days from start to end
    };

    // Generate preview summary
    const getPreviewSummary = () => {
        if (!medication.frequency || !medication.customTimes?.length) return '';

        const frequencyOption = frequencyOptions.find(opt => opt.value === medication.frequency);
        if (!frequencyOption) return '';

        const times = medication.customTimes.map(time => {
            const [hours, minutes] = time.split(':');
            const hour = parseInt(hours);
            const ampm = hour >= 12 ? 'PM' : 'AM';
            const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
            return `${displayHour}:${minutes} ${ampm}`;
        }).join(', ');

        const startDate = medication.startDate ? formatDateForDisplay(medication.startDate) : 'today';
        const totalDosesText = medication.totalDoses ? `, ${medication.totalDoses} total doses` : '';

        if (medication.isEveryOtherDay) {
            const totalDoses = medication.totalDoses || 0;
            const daysDuration = medication.startDate && totalDoses > 0 ? calculateDaysDuration(medication.startDate, totalDoses) : 0;

            if (totalDoses > 0 && daysDuration > 0) {
                return `This medication will be given every other day at ${times}, ${totalDoses} doses over ${daysDuration} days, starting ${startDate}.`;
            } else {
                return `This medication will be given every other day at ${times}, starting ${startDate}.`;
            }
        } else {
            return `This medication will be given ${frequencyOption.label} at ${times}${totalDosesText}, starting ${startDate}.`;
        }
    };

    const inputStyle = (isFocused: boolean = false) => ({
        width: '100%',
        padding: '0.75rem',
        border: isFocused ? '2px solid #007AFF' : '1px solid #d1d5db',
        borderRadius: '8px',
        fontSize: '0.875rem',
        outline: 'none',
        transition: 'border-color 0.2s ease',
        fontFamily: 'Nunito, sans-serif',
        boxSizing: 'border-box' as const
    });

    const timeInputStyle = {
        padding: '0.5rem 0.75rem',
        border: '1px solid #d1d5db',
        borderRadius: '6px',
        fontSize: '0.875rem',
        fontWeight: '500',
        outline: 'none',
        transition: 'border-color 0.2s ease',
        fontFamily: 'Nunito, sans-serif',
        textAlign: 'center' as const,
        minWidth: '80px'
    };

    return (
        <div style={{
            border: '1px solid #e5e7eb',
            borderRadius: '16px',
            backgroundColor: '#ffffff',
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
        }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1.25rem 1.5rem',
                backgroundColor: '#f8fafc',
                borderBottom: '1px solid #e5e7eb'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '0.25rem',
                            color: '#6b7280',
                            transition: 'all 0.2s ease',
                            borderRadius: '4px'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                        <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{
                                transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                                transition: 'transform 0.2s ease'
                            }}
                        >
                            <polyline points="9,18 15,12 9,6" />
                        </svg>
                    </button>

                    <h3 style={{
                        fontSize: '1.125rem',
                        fontWeight: '600',
                        color: '#1e293b',
                        margin: '0',
                        fontFamily: 'Nunito, sans-serif'
                    }}>
                        {medication.name || `Medication ${index + 1}`}
                        {medication.isTapered && (
                            <span style={{
                                marginLeft: '0.75rem',
                                fontSize: '0.75rem',
                                backgroundColor: '#ddd6fe',
                                color: '#7c3aed',
                                padding: '0.25rem 0.75rem',
                                borderRadius: '12px',
                                fontWeight: '600',
                                textTransform: 'uppercase',
                                letterSpacing: '0.025em'
                            }}>
                                Tapered
                            </span>
                        )}
                        {medication.isEveryOtherDay && (
                            <span style={{
                                marginLeft: '0.75rem',
                                fontSize: '0.75rem',
                                backgroundColor: '#fef3c7',
                                color: '#92400e',
                                padding: '0.25rem 0.75rem',
                                borderRadius: '12px',
                                fontWeight: '600',
                                textTransform: 'uppercase',
                                letterSpacing: '0.025em'
                            }}>
                                EOD
                            </span>
                        )}
                    </h3>
                </div>

                <button
                    onClick={() => onRemove(index)}
                    style={{
                        backgroundColor: 'transparent',
                        color: '#ef4444',
                        border: '1px solid #ef4444',
                        padding: '0.5rem 0.75rem',
                        borderRadius: '8px',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontFamily: 'Nunito, sans-serif'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#ef4444';
                        e.currentTarget.style.color = 'white';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = '#ef4444';
                    }}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3,6 5,6 21,6" />
                        <path d="M19,6l-2,14H7L5,6" />
                        <path d="M10,11v6" />
                        <path d="M14,11v6" />
                    </svg>
                    Remove
                </button>
            </div>

            {/* Form Content */}
            {isExpanded && (
                <div style={{ padding: '1.5rem' }}>
                    {/* Medication Name and Instructions */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: window.innerWidth <= 768 ? '1fr' : '1fr 1fr',
                        gap: '1.5rem',
                        marginBottom: '2rem'
                    }}>
                        <div>
                            <label style={{
                                display: 'block',
                                fontSize: '0.875rem',
                                fontWeight: '600',
                                color: '#374151',
                                marginBottom: '0.5rem',
                                fontFamily: 'Nunito, sans-serif'
                            }}>
                                Medication Name *
                            </label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    list={`medications-${index}`}
                                    type="text"
                                    required
                                    value={medication.name}
                                    onChange={(e) => handleMedicationNameChange(e.target.value)}
                                    placeholder="Type or select medication"
                                    style={{
                                        ...inputStyle(),
                                        borderColor: formErrors.name ? '#ef4444' : '#d1d5db'
                                    }}
                                    onFocus={(e) => e.target.style.borderColor = formErrors.name ? '#ef4444' : '#007AFF'}
                                    onBlur={(e) => e.target.style.borderColor = formErrors.name ? '#ef4444' : '#d1d5db'}
                                />
                                {formErrors.name && (
                                    <p style={{
                                        fontSize: '0.75rem',
                                        color: '#ef4444',
                                        margin: '0.25rem 0 0 0',
                                        fontFamily: 'Nunito, sans-serif'
                                    }}>
                                        {formErrors.name}
                                    </p>
                                )}
                                <datalist id={`medications-${index}`}>
                                    {medicationTemplates.map((template) => (
                                        <option key={template.name} value={template.name} />
                                    ))}
                                </datalist>
                            </div>
                        </div>

                        <div>
                            <label style={{
                                display: 'block',
                                fontSize: '0.875rem',
                                fontWeight: '600',
                                color: '#374151',
                                marginBottom: '0.5rem',
                                fontFamily: 'Nunito, sans-serif'
                            }}>
                                Instructions *
                            </label>
                            <textarea
                                required
                                rows={3}
                                value={medication.instructions}
                                onChange={(e) => updateMedication({ instructions: e.target.value })}
                                placeholder="Medication instructions and notes"
                                style={{
                                    ...inputStyle(),
                                    resize: 'vertical',
                                    minHeight: '90px',
                                    borderColor: formErrors.instructions ? '#ef4444' : '#d1d5db'
                                }}
                                onFocus={(e) => e.target.style.borderColor = formErrors.instructions ? '#ef4444' : '#007AFF'}
                                onBlur={(e) => e.target.style.borderColor = formErrors.instructions ? '#ef4444' : '#d1d5db'}
                            />
                            {formErrors.instructions && (
                                <p style={{
                                    fontSize: '0.75rem',
                                    color: '#ef4444',
                                    margin: '0.25rem 0 0 0',
                                    fontFamily: 'Nunito, sans-serif'
                                }}>
                                    {formErrors.instructions}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Tapered Toggle */}
                    <div style={{ marginBottom: '2rem' }}>
                        <label style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            color: '#374151',
                            fontFamily: 'Nunito, sans-serif'
                        }}>
                            <input
                                type="checkbox"
                                checked={medication.isTapered}
                                onChange={(e) => handleTaperToggle(e.target.checked)}
                                style={{
                                    width: '18px',
                                    height: '18px',
                                    accentColor: '#007AFF'
                                }}
                            />
                            This medication has a tapered dosing schedule
                        </label>
                    </div>

                    {/* Simple Medication Form */}
                    {!medication.isTapered && (
                        <div>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: window.innerWidth <= 768 ? '1fr' : 'repeat(auto-fit, minmax(180px, 1fr))',
                                gap: '1.5rem',
                                marginBottom: '1.5rem'
                            }}>
                                <div>
                                    <label style={{
                                        display: 'block',
                                        fontSize: '0.875rem',
                                        fontWeight: '600',
                                        color: '#374151',
                                        marginBottom: '0.5rem',
                                        fontFamily: 'Nunito, sans-serif'
                                    }}>
                                        Dosage *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={medication.dosage || ''}
                                        onChange={(e) => updateMedication({ dosage: e.target.value })}
                                        placeholder="e.g., 50mg, 1 tablet"
                                        style={{
                                            ...inputStyle(),
                                            borderColor: formErrors.dosage ? '#ef4444' : '#d1d5db'
                                        }}
                                        onFocus={(e) => e.target.style.borderColor = formErrors.dosage ? '#ef4444' : '#007AFF'}
                                        onBlur={(e) => e.target.style.borderColor = formErrors.dosage ? '#ef4444' : '#d1d5db'}
                                    />
                                    {formErrors.dosage && (
                                        <p style={{
                                            fontSize: '0.75rem',
                                            color: '#ef4444',
                                            margin: '0.25rem 0 0 0',
                                            fontFamily: 'Nunito, sans-serif'
                                        }}>
                                            {formErrors.dosage}
                                        </p>
                                    )}
                                </div>

                                {/* Schedule Type Section */}
                                <div>
                                    <label style={{
                                        display: 'block',
                                        fontSize: '0.875rem',
                                        fontWeight: '600',
                                        color: '#374151',
                                        marginBottom: '0.5rem',
                                        fontFamily: 'Nunito, sans-serif'
                                    }}>
                                        Schedule Type *
                                    </label>

                                    {/* Radio Button Schedule Selector */}
                                    <div style={{
                                        border: '1px solid #d1d5db',
                                        borderRadius: '8px',
                                        backgroundColor: 'white',
                                        overflow: 'hidden'
                                    }}>
                                        {/* Daily Option */}
                                        <label
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                padding: '0.75rem',
                                                cursor: 'pointer',
                                                borderBottom: '1px solid #e5e7eb',
                                                backgroundColor: !medication.isEveryOtherDay ? '#f0f9ff' : 'transparent',
                                                outline: 'none'
                                            }}
                                            tabIndex={0}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                    e.preventDefault();
                                                    handleEveryOtherDayToggle(false);
                                                }
                                            }}
                                        >
                                            <input
                                                type="radio"
                                                name={`schedule-${index}`}
                                                checked={!medication.isEveryOtherDay}
                                                onChange={() => handleEveryOtherDayToggle(false)}
                                                style={{
                                                    marginRight: '0.75rem',
                                                    accentColor: '#007AFF'
                                                }}
                                                tabIndex={-1}
                                            />
                                            <div>
                                                <div style={{
                                                    fontSize: '0.875rem',
                                                    fontWeight: '600',
                                                    color: '#374151',
                                                    fontFamily: 'Nunito, sans-serif'
                                                }}>
                                                    Daily
                                                </div>
                                                <div style={{
                                                    fontSize: '0.75rem',
                                                    color: '#6b7280',
                                                    fontFamily: 'Nunito, sans-serif'
                                                }}>
                                                    1-10 times per day
                                                </div>
                                            </div>
                                        </label>

                                        {/* Every Other Day Option */}
                                        <label
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                padding: '0.75rem',
                                                cursor: 'pointer',
                                                backgroundColor: medication.isEveryOtherDay ? '#fef3c7' : 'transparent',
                                                outline: 'none'
                                            }}
                                            tabIndex={0}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                    e.preventDefault();
                                                    handleEveryOtherDayToggle(true);
                                                }
                                            }}
                                        >
                                            <input
                                                type="radio"
                                                name={`schedule-${index}`}
                                                checked={medication.isEveryOtherDay || false}
                                                onChange={() => handleEveryOtherDayToggle(true)}
                                                style={{
                                                    marginRight: '0.75rem',
                                                    accentColor: '#FF9500'
                                                }}
                                                tabIndex={-1}
                                            />
                                            <div>
                                                <div style={{
                                                    fontSize: '0.875rem',
                                                    fontWeight: '600',
                                                    color: '#374151',
                                                    fontFamily: 'Nunito, sans-serif'
                                                }}>
                                                    Every Other Day
                                                    <span style={{
                                                        marginLeft: '0.5rem',
                                                        fontSize: '0.625rem',
                                                        backgroundColor: '#f59e0b',
                                                        color: 'white',
                                                        padding: '0.125rem 0.5rem',
                                                        borderRadius: '8px',
                                                        fontWeight: '700',
                                                        textTransform: 'uppercase'
                                                    }}>
                                                        EOD
                                                    </span>
                                                </div>
                                                <div style={{
                                                    fontSize: '0.75rem',
                                                    color: '#6b7280',
                                                    fontFamily: 'Nunito, sans-serif'
                                                }}>
                                                    One dose on dosing days
                                                </div>
                                            </div>
                                        </label>
                                    </div>
                                </div>

                                {/* Frequency Dropdown - Only show for Daily */}
                                {!medication.isEveryOtherDay && (
                                    <div style={{ position: 'relative' }}>
                                        <label style={{
                                            display: 'block',
                                            fontSize: '0.875rem',
                                            fontWeight: '600',
                                            color: '#374151',
                                            marginBottom: '0.5rem',
                                            fontFamily: 'Nunito, sans-serif'
                                        }}>
                                            Frequency *
                                        </label>
                                        <select
                                            required
                                            value={medication.frequency || 1}
                                            onChange={(e) => handleFrequencyChange(parseFloat(e.target.value))}
                                            style={{
                                                ...inputStyle(),
                                                backgroundColor: 'white'
                                            }}
                                            onFocus={(e) => e.target.style.borderColor = '#007AFF'}
                                            onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                                        >
                                            {frequencyOptions.map((option) => (
                                                <option key={option.value} value={option.value}>
                                                    {option.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {/* Hidden frequency field for EOD with tooltip */}
                                {medication.isEveryOtherDay && (
                                    <div style={{ position: 'relative' }}>
                                        <label style={{
                                            display: 'block',
                                            fontSize: '0.875rem',
                                            fontWeight: '600',
                                            color: '#374151',
                                            marginBottom: '0.5rem',
                                            fontFamily: 'Nunito, sans-serif'
                                        }}>
                                            Frequency *
                                        </label>
                                        <div style={{
                                            ...inputStyle(),
                                            backgroundColor: '#f9fafb',
                                            color: '#6b7280',
                                            cursor: 'not-allowed',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between'
                                        }}>
                                            <span>1x/day</span>
                                            <div style={{ position: 'relative', display: 'inline-block' }}>
                                                <svg
                                                    width="16"
                                                    height="16"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="#6b7280"
                                                    strokeWidth="2"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    style={{ cursor: 'help' }}
                                                >
                                                    <circle cx="12" cy="12" r="10" />
                                                    <path d="M9,9h0a3,3,0,0,1,6,0c0,2-3,3-3,3" />
                                                    <path d="M12,17h0" />
                                                </svg>
                                            </div>
                                        </div>
                                        <p style={{
                                            fontSize: '0.75rem',
                                            color: '#6b7280',
                                            margin: '0.25rem 0 0 0',
                                            fontFamily: 'Nunito, sans-serif'
                                        }}>
                                            EOD schedules are limited to one dose on dosing days
                                        </p>
                                    </div>
                                )}

                                <div>
                                    <label style={{
                                        display: 'block',
                                        fontSize: '0.875rem',
                                        fontWeight: '600',
                                        color: '#374151',
                                        marginBottom: '0.5rem',
                                        fontFamily: 'Nunito, sans-serif'
                                    }}>
                                        Start Date
                                    </label>
                                    <input
                                        type="date"
                                        value={medication.startDate || ''}
                                        onChange={(e) => handleStartDateChange(e.target.value)}
                                        style={inputStyle()}
                                        onFocus={(e) => e.target.style.borderColor = '#007AFF'}
                                        onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                                    />
                                </div>

                                <div>
                                    <label style={{
                                        display: 'block',
                                        fontSize: '0.875rem',
                                        fontWeight: '600',
                                        color: '#374151',
                                        marginBottom: '0.5rem',
                                        fontFamily: 'Nunito, sans-serif'
                                    }}>
                                        End Date {medication.isEveryOtherDay ? '(Auto-calculated)' : isEndDateReadOnly() ? '(Auto-calculated)' : ''}
                                    </label>
                                    <input
                                        type="date"
                                        value={medication.endDate || ''}
                                        onChange={(e) => handleEndDateChange(e.target.value)}
                                        disabled={Boolean(medication.isEveryOtherDay) || Boolean(isEndDateReadOnly())}
                                        style={{
                                            ...inputStyle(),
                                            backgroundColor: (medication.isEveryOtherDay || isEndDateReadOnly()) ? '#f9fafb' : 'white',
                                            cursor: (medication.isEveryOtherDay || isEndDateReadOnly()) ? 'not-allowed' : 'text'
                                        }}
                                        onFocus={(e) => e.target.style.borderColor = '#007AFF'}
                                        onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                                    />
                                    {(medication.isEveryOtherDay || isEndDateReadOnly()) && (
                                        <p style={{
                                            fontSize: '0.75rem',
                                            color: '#6b7280',
                                            margin: '0.25rem 0 0 0',
                                            fontFamily: 'Nunito, sans-serif'
                                        }}>
                                            {medication.isEveryOtherDay
                                                ? 'End date automatically calculated from total doses'
                                                : 'End date automatically calculated from start date and total doses'
                                            }
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Total Doses Field - Always Visible */}
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{
                                    display: 'block',
                                    fontSize: '0.875rem',
                                    fontWeight: '600',
                                    color: '#374151',
                                    marginBottom: '0.5rem',
                                    fontFamily: 'Nunito, sans-serif'
                                }}>
                                    Total Doses
                                    {medication.isEveryOtherDay && (
                                        <span style={{ color: '#ef4444', marginLeft: '0.25rem' }}>*</span>
                                    )}
                                </label>
                                <input
                                    type="number"
                                    required={medication.isEveryOtherDay}
                                    min="1"
                                    max="200"
                                    value={medication.totalDoses || ''}
                                    onChange={(e) => handleTotalDosesChange(parseInt(e.target.value) || 0)}
                                    onBlur={handleTotalDosesBlur}
                                    placeholder={medication.isEveryOtherDay ? "e.g., 5" : "Auto-calculated if dates entered"}
                                    style={{
                                        ...inputStyle(),
                                        backgroundColor: 'white',
                                        borderColor: validationErrors.totalDoses ? '#ef4444' : '#d1d5db'
                                    }}
                                    onFocus={(e) => e.target.style.borderColor = validationErrors.totalDoses ? '#ef4444' : '#007AFF'}
                                />
                                {validationErrors.totalDoses ? (
                                    <p style={{
                                        fontSize: '0.75rem',
                                        color: '#ef4444',
                                        margin: '0.25rem 0 0 0',
                                        fontFamily: 'Nunito, sans-serif'
                                    }}>
                                        {validationErrors.totalDoses}
                                    </p>
                                ) : (
                                    <p style={{
                                        fontSize: '0.75rem',
                                        color: '#6b7280',
                                        margin: '0.25rem 0 0 0',
                                        fontFamily: 'Nunito, sans-serif'
                                    }}>
                                        {medication.isEveryOtherDay
                                            ? 'Required for every-other-day schedules'
                                            : 'Optional for daily schedules (auto-calculated from date range if provided)'
                                        }
                                    </p>
                                )}
                            </div>

                            {/* Dosing Times */}
                            {medication.customTimes && medication.customTimes.length > 0 && (
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        marginBottom: '1rem'
                                    }}>
                                        <label style={{
                                            fontSize: '0.875rem',
                                            fontWeight: '600',
                                            color: '#374151',
                                            fontFamily: 'Nunito, sans-serif'
                                        }}>
                                            Dosing Times
                                        </label>
                                        <span style={{
                                            fontSize: '0.75rem',
                                            color: '#6b7280',
                                            fontFamily: 'Nunito, sans-serif'
                                        }}>
                                            Tap to edit time
                                        </span>
                                    </div>

                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: window.innerWidth <= 768
                                            ? 'repeat(auto-fit, minmax(120px, 1fr))'
                                            : `repeat(${Math.min(medication.customTimes.length, 4)}, 1fr)`,
                                        gap: '1rem'
                                    }}>
                                        {medication.customTimes.map((time, timeIndex) => (
                                            <div key={timeIndex} style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                gap: '0.5rem'
                                            }}>
                                                <label style={{
                                                    fontSize: '0.75rem',
                                                    fontWeight: '600',
                                                    color: '#6b7280',
                                                    textAlign: 'center',
                                                    fontFamily: 'Nunito, sans-serif'
                                                }}>
                                                    Dose {timeIndex + 1}
                                                </label>
                                                <input
                                                    type="time"
                                                    value={time}
                                                    onChange={(e) => handleTimeChange(timeIndex, e.target.value)}
                                                    style={{
                                                        ...timeInputStyle,
                                                        borderColor: '#d1d5db'
                                                    }}
                                                    onFocus={(e) => e.target.style.borderColor = '#007AFF'}
                                                    onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                                                />
                                            </div>
                                        ))}
                                    </div>

                                    <div style={{ marginTop: '1rem' }}>
                                        <label style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.75rem',
                                            cursor: 'pointer',
                                            fontSize: '0.875rem',
                                            fontWeight: '500',
                                            color: '#374151',
                                            fontFamily: 'Nunito, sans-serif'
                                        }}>
                                            <input
                                                type="checkbox"
                                                checked={medication.allowClientToAdjustTime || false}
                                                onChange={(e) => updateMedication({ allowClientToAdjustTime: e.target.checked })}
                                                style={{
                                                    width: '16px',
                                                    height: '16px',
                                                    accentColor: '#007AFF'
                                                }}
                                            />
                                            Allow client to adjust dose times
                                        </label>
                                    </div>
                                </div>
                            )}

                            {/* Preview Summary */}
                            {getPreviewSummary() && (
                                <div style={{
                                    backgroundColor: '#f0f9ff',
                                    border: '1px solid #0ea5e9',
                                    borderRadius: '8px',
                                    padding: '1rem',
                                    marginTop: '1rem'
                                }}>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        gap: '0.75rem'
                                    }}>
                                        <div style={{
                                            width: '20px',
                                            height: '20px',
                                            borderRadius: '50%',
                                            backgroundColor: '#0ea5e9',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0,
                                            marginTop: '0.125rem'
                                        }}>
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="20,6 9,17 4,12" />
                                            </svg>
                                        </div>
                                        <p style={{
                                            fontSize: '0.875rem',
                                            color: '#0369a1',
                                            margin: '0',
                                            lineHeight: '1.5',
                                            fontFamily: 'Nunito, sans-serif'
                                        }}>
                                            {getPreviewSummary()}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Tapered Medication Form */}
                    {medication.isTapered && (
                        <div>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '1.5rem'
                            }}>
                                <h4 style={{
                                    fontSize: '1rem',
                                    fontWeight: '600',
                                    color: '#374151',
                                    margin: '0',
                                    fontFamily: 'Nunito, sans-serif'
                                }}>
                                    Taper Stages ({medication.taperStages.length})
                                </h4>

                                <button
                                    onClick={addTaperStage}
                                    style={{
                                        backgroundColor: '#007AFF',
                                        color: 'white',
                                        border: 'none',
                                        padding: '0.5rem 1rem',
                                        borderRadius: '8px',
                                        fontSize: '0.75rem',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        transition: 'background-color 0.2s ease',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        fontFamily: 'Nunito, sans-serif'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0056CC'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#007AFF'}
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="12" y1="5" x2="12" y2="19" />
                                        <line x1="5" y1="12" x2="19" y2="12" />
                                    </svg>
                                    Add Stage
                                </button>
                            </div>

                            {medication.taperStages.length === 0 ? (
                                <div style={{
                                    textAlign: 'center',
                                    padding: '3rem 2rem',
                                    color: '#6b7280',
                                    backgroundColor: '#f9fafb',
                                    borderRadius: '12px',
                                    border: '2px dashed #d1d5db'
                                }}>
                                    <svg
                                        width="48"
                                        height="48"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        style={{ margin: '0 auto 1rem auto', opacity: 0.5 }}
                                    >
                                        <line x1="12" y1="5" x2="12" y2="19" />
                                        <line x1="5" y1="12" x2="19" y2="12" />
                                    </svg>
                                    <p style={{
                                        margin: '0',
                                        fontFamily: 'Nunito, sans-serif',
                                        fontSize: '0.875rem'
                                    }}>
                                        No taper stages added yet. Click "Add Stage" to get started.
                                    </p>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    {medication.taperStages.map((stage, stageIndex) => (
                                        <div key={stageIndex} style={{
                                            border: '1px solid #e5e7eb',
                                            borderRadius: '12px',
                                            padding: '1.5rem',
                                            backgroundColor: '#fafbfc'
                                        }}>
                                            <div style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                marginBottom: '1.5rem'
                                            }}>
                                                <h5 style={{
                                                    fontSize: '0.875rem',
                                                    fontWeight: '600',
                                                    color: '#374151',
                                                    margin: '0',
                                                    fontFamily: 'Nunito, sans-serif'
                                                }}>
                                                    Stage {stageIndex + 1}
                                                </h5>

                                                {medication.taperStages.length > 1 && (
                                                    <button
                                                        onClick={() => removeTaperStage(stageIndex)}
                                                        style={{
                                                            backgroundColor: 'transparent',
                                                            color: '#ef4444',
                                                            border: '1px solid #ef4444',
                                                            padding: '0.25rem 0.5rem',
                                                            borderRadius: '6px',
                                                            fontSize: '0.75rem',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s ease',
                                                            fontFamily: 'Nunito, sans-serif'
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.backgroundColor = '#ef4444';
                                                            e.currentTarget.style.color = 'white';
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.backgroundColor = 'transparent';
                                                            e.currentTarget.style.color = '#ef4444';
                                                        }}
                                                    >
                                                        Remove
                                                    </button>
                                                )}
                                            </div>

                                            <div style={{
                                                display: 'grid',
                                                gridTemplateColumns: window.innerWidth <= 768
                                                    ? '1fr'
                                                    : 'repeat(auto-fit, minmax(140px, 1fr))',
                                                gap: '1rem',
                                                marginBottom: '1rem'
                                            }}>
                                                <div>
                                                    <label style={{
                                                        display: 'block',
                                                        fontSize: '0.75rem',
                                                        fontWeight: '600',
                                                        color: '#374151',
                                                        marginBottom: '0.5rem',
                                                        fontFamily: 'Nunito, sans-serif'
                                                    }}>
                                                        Start Date *
                                                    </label>
                                                    <input
                                                        type="date"
                                                        required
                                                        value={stage.startDate}
                                                        onChange={(e) => handleTaperStageDateChange(stageIndex, 'startDate', e.target.value)}
                                                        style={{
                                                            ...inputStyle(),
                                                            fontSize: '0.75rem',
                                                            padding: '0.5rem',
                                                            borderColor: formErrors[`stage-${stageIndex}-startDate`] ? '#ef4444' : '#d1d5db'
                                                        }}
                                                        onFocus={(e) => e.target.style.borderColor = formErrors[`stage-${stageIndex}-startDate`] ? '#ef4444' : '#007AFF'}
                                                        onBlur={(e) => e.target.style.borderColor = formErrors[`stage-${stageIndex}-startDate`] ? '#ef4444' : '#d1d5db'}
                                                    />
                                                    {formErrors[`stage-${stageIndex}-startDate`] && (
                                                        <p style={{
                                                            fontSize: '0.625rem',
                                                            color: '#ef4444',
                                                            margin: '0.25rem 0 0 0',
                                                            fontFamily: 'Nunito, sans-serif'
                                                        }}>
                                                            {formErrors[`stage-${stageIndex}-startDate`]}
                                                        </p>
                                                    )}
                                                </div>

                                                <div>
                                                    <label style={{
                                                        display: 'block',
                                                        fontSize: '0.75rem',
                                                        fontWeight: '600',
                                                        color: '#374151',
                                                        marginBottom: '0.5rem',
                                                        fontFamily: 'Nunito, sans-serif'
                                                    }}>
                                                        End Date *
                                                    </label>
                                                    <input
                                                        type="date"
                                                        required
                                                        value={stage.endDate}
                                                        onChange={(e) => handleTaperStageDateChange(stageIndex, 'endDate', e.target.value)}
                                                        disabled={stage.isEveryOtherDay}
                                                        style={{
                                                            ...inputStyle(),
                                                            fontSize: '0.75rem',
                                                            padding: '0.5rem',
                                                            backgroundColor: stage.isEveryOtherDay ? '#f9fafb' : 'white',
                                                            cursor: stage.isEveryOtherDay ? 'not-allowed' : 'text',
                                                            borderColor: formErrors[`stage-${stageIndex}-endDate`] ? '#ef4444' : '#d1d5db'
                                                        }}
                                                        onFocus={(e) => e.target.style.borderColor = formErrors[`stage-${stageIndex}-endDate`] ? '#ef4444' : '#007AFF'}
                                                        onBlur={(e) => e.target.style.borderColor = formErrors[`stage-${stageIndex}-endDate`] ? '#ef4444' : '#d1d5db'}
                                                    />
                                                    {formErrors[`stage-${stageIndex}-endDate`] && (
                                                        <p style={{
                                                            fontSize: '0.625rem',
                                                            color: '#ef4444',
                                                            margin: '0.25rem 0 0 0',
                                                            fontFamily: 'Nunito, sans-serif'
                                                        }}>
                                                            {formErrors[`stage-${stageIndex}-endDate`]}
                                                        </p>
                                                    )}
                                                </div>

                                                <div>
                                                    <label style={{
                                                        display: 'block',
                                                        fontSize: '0.75rem',
                                                        fontWeight: '600',
                                                        color: '#374151',
                                                        marginBottom: '0.5rem',
                                                        fontFamily: 'Nunito, sans-serif'
                                                    }}>
                                                        Dosage *
                                                    </label>
                                                    <input
                                                        type="text"
                                                        required
                                                        value={stage.dosage}
                                                        onChange={(e) => updateTaperStage(stageIndex, { dosage: e.target.value })}
                                                        placeholder="e.g., 10mg"
                                                        style={{
                                                            ...inputStyle(),
                                                            fontSize: '0.75rem',
                                                            padding: '0.5rem',
                                                            borderColor: formErrors[`stage-${stageIndex}-dosage`] ? '#ef4444' : '#d1d5db'
                                                        }}
                                                        onFocus={(e) => e.target.style.borderColor = formErrors[`stage-${stageIndex}-dosage`] ? '#ef4444' : '#007AFF'}
                                                        onBlur={(e) => e.target.style.borderColor = formErrors[`stage-${stageIndex}-dosage`] ? '#ef4444' : '#d1d5db'}
                                                    />
                                                    {formErrors[`stage-${stageIndex}-dosage`] && (
                                                        <p style={{
                                                            fontSize: '0.625rem',
                                                            color: '#ef4444',
                                                            margin: '0.25rem 0 0 0',
                                                            fontFamily: 'Nunito, sans-serif'
                                                        }}>
                                                            {formErrors[`stage-${stageIndex}-dosage`]}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Stage Schedule Type */}
                                            <div style={{ marginBottom: '1rem' }}>
                                                <label style={{
                                                    display: 'block',
                                                    fontSize: '0.75rem',
                                                    fontWeight: '600',
                                                    color: '#374151',
                                                    marginBottom: '0.5rem',
                                                    fontFamily: 'Nunito, sans-serif'
                                                }}>
                                                    Schedule Type *
                                                </label>

                                                <div style={{
                                                    border: '1px solid #d1d5db',
                                                    borderRadius: '6px',
                                                    backgroundColor: 'white',
                                                    overflow: 'hidden'
                                                }}>
                                                    {/* Daily Option for Stage */}
                                                    <label style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        padding: '0.5rem 0.75rem',
                                                        cursor: 'pointer',
                                                        borderBottom: '1px solid #e5e7eb',
                                                        backgroundColor: !stage.isEveryOtherDay ? '#f0f9ff' : 'transparent',
                                                        fontSize: '0.75rem'
                                                    }}>
                                                        <input
                                                            type="radio"
                                                            name={`stage-schedule-${index}-${stageIndex}`}
                                                            checked={!stage.isEveryOtherDay}
                                                            onChange={() => handleTaperStageEODToggle(stageIndex, false)}
                                                            style={{
                                                                marginRight: '0.5rem',
                                                                accentColor: '#007AFF'
                                                            }}
                                                        />
                                                        <div>
                                                            <div style={{
                                                                fontWeight: '600',
                                                                color: '#374151',
                                                                fontFamily: 'Nunito, sans-serif'
                                                            }}>
                                                                Daily
                                                            </div>
                                                            <div style={{
                                                                fontSize: '0.625rem',
                                                                color: '#6b7280',
                                                                fontFamily: 'Nunito, sans-serif'
                                                            }}>
                                                                1-10 times per day
                                                            </div>
                                                        </div>
                                                    </label>

                                                    {/* Every Other Day Option for Stage */}
                                                    <label style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        padding: '0.5rem 0.75rem',
                                                        cursor: 'pointer',
                                                        backgroundColor: stage.isEveryOtherDay ? '#fef3c7' : 'transparent',
                                                        fontSize: '0.75rem'
                                                    }}>
                                                        <input
                                                            type="radio"
                                                            name={`stage-schedule-${index}-${stageIndex}`}
                                                            checked={stage.isEveryOtherDay ? true : false}
                                                            onChange={() => handleTaperStageEODToggle(stageIndex, true)}
                                                            style={{
                                                                marginRight: '0.5rem',
                                                                accentColor: '#FF9500'
                                                            }}
                                                        />
                                                        <div>
                                                            <div style={{
                                                                fontWeight: '600',
                                                                color: '#374151',
                                                                fontFamily: 'Nunito, sans-serif'
                                                            }}>
                                                                Every Other Day
                                                                <span style={{
                                                                    marginLeft: '0.375rem',
                                                                    fontSize: '0.5rem',
                                                                    backgroundColor: '#f59e0b',
                                                                    color: 'white',
                                                                    padding: '0.0625rem 0.375rem',
                                                                    borderRadius: '6px',
                                                                    fontWeight: '700',
                                                                    textTransform: 'uppercase'
                                                                }}>
                                                                    EOD
                                                                </span>
                                                            </div>
                                                            <div style={{
                                                                fontSize: '0.625rem',
                                                                color: '#6b7280',
                                                                fontFamily: 'Nunito, sans-serif'
                                                            }}>
                                                                One dose on dosing days
                                                            </div>
                                                        </div>
                                                    </label>
                                                </div>
                                            </div>

                                            {/* Frequency - Only show for Daily stages */}
                                            {!stage.isEveryOtherDay && (
                                                <div style={{ marginBottom: '1rem' }}>
                                                    <label style={{
                                                        display: 'block',
                                                        fontSize: '0.75rem',
                                                        fontWeight: '600',
                                                        color: '#374151',
                                                        marginBottom: '0.5rem',
                                                        fontFamily: 'Nunito, sans-serif'
                                                    }}>
                                                        Frequency *
                                                    </label>
                                                    <select
                                                        required
                                                        value={stage.frequency}
                                                        onChange={(e) => handleTaperFrequencyChange(stageIndex, parseFloat(e.target.value))}
                                                        style={{
                                                            ...inputStyle(),
                                                            fontSize: '0.75rem',
                                                            padding: '0.5rem',
                                                            backgroundColor: 'white'
                                                        }}
                                                        onFocus={(e) => e.target.style.borderColor = '#007AFF'}
                                                        onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                                                    >
                                                        {frequencyOptions.map((option) => (
                                                            <option key={option.value} value={option.value}>
                                                                {option.label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}

                                            {/* Total Doses for EOD Taper Stages */}
                                            {stage.isEveryOtherDay && (
                                                <div style={{ marginBottom: '1rem' }}>
                                                    <label style={{
                                                        display: 'block',
                                                        fontSize: '0.75rem',
                                                        fontWeight: '600',
                                                        color: '#374151',
                                                        marginBottom: '0.5rem',
                                                        fontFamily: 'Nunito, sans-serif'
                                                    }}>
                                                        Total Doses
                                                        <span style={{ color: '#ef4444', marginLeft: '0.25rem' }}>*</span>
                                                    </label>
                                                    <input
                                                        type="number"
                                                        required
                                                        min="1"
                                                        max="50"
                                                        value={stage.totalDoses || ''}
                                                        onChange={(e) => handleTaperStageTotalDosesChange(stageIndex, parseInt(e.target.value) || 0)}
                                                        onBlur={() => handleTaperStageTotalDosesBlur(stageIndex)}
                                                        placeholder="e.g., 5"
                                                        style={{
                                                            ...inputStyle(),
                                                            fontSize: '0.75rem',
                                                            padding: '0.5rem',
                                                            backgroundColor: 'white',
                                                            borderColor: validationErrors[`taperStage-${stageIndex}-totalDoses`] ? '#ef4444' : '#d1d5db'
                                                        }}
                                                    />
                                                    {validationErrors[`taperStage-${stageIndex}-totalDoses`] ? (
                                                        <p style={{ fontSize: '0.625rem', color: '#ef4444', margin: '0.25rem 0 0 0', fontFamily: 'Nunito, sans-serif' }}>
                                                            {validationErrors[`taperStage-${stageIndex}-totalDoses`]}
                                                        </p>
                                                    ) : (
                                                        <p style={{ fontSize: '0.625rem', color: '#6b7280', margin: '0.25rem 0 0 0', fontFamily: 'Nunito, sans-serif' }}>
                                                            Required for every-other-day stages
                                                        </p>
                                                    )}
                                                </div>
                                            )}

                                            {/* Stage Times Display with Editable Times */}
                                            {stage.times && stage.times.length > 0 && (
                                                <div style={{ marginTop: '1rem' }}>
                                                    <div style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        marginBottom: '0.75rem'
                                                    }}>
                                                        <label style={{
                                                            fontSize: '0.75rem',
                                                            fontWeight: '600',
                                                            color: '#374151',
                                                            fontFamily: 'Nunito, sans-serif'
                                                        }}>
                                                            Dosing Times
                                                        </label>
                                                        <span style={{
                                                            fontSize: '0.625rem',
                                                            color: '#6b7280',
                                                            fontFamily: 'Nunito, sans-serif'
                                                        }}>
                                                            Tap to edit time
                                                        </span>
                                                    </div>

                                                    <div style={{
                                                        display: 'grid',
                                                        gridTemplateColumns: window.innerWidth <= 768
                                                            ? 'repeat(auto-fit, minmax(100px, 1fr))'
                                                            : `repeat(${Math.min(stage.times.length, 4)}, 1fr)`,
                                                        gap: '0.75rem'
                                                    }}>
                                                        {stage.times.map((time, timeIndex) => (
                                                            <div key={timeIndex} style={{
                                                                display: 'flex',
                                                                flexDirection: 'column',
                                                                alignItems: 'center',
                                                                gap: '0.25rem'
                                                            }}>
                                                                <label style={{
                                                                    fontSize: '0.625rem',
                                                                    fontWeight: '600',
                                                                    color: '#6b7280',
                                                                    textAlign: 'center',
                                                                    fontFamily: 'Nunito, sans-serif'
                                                                }}>
                                                                    Dose {timeIndex + 1}
                                                                </label>
                                                                <input
                                                                    type="time"
                                                                    value={time}
                                                                    onChange={(e) => {
                                                                        const updatedTimes = [...stage.times];
                                                                        updatedTimes[timeIndex] = e.target.value;
                                                                        updateTaperStage(stageIndex, { times: updatedTimes });
                                                                    }}
                                                                    style={{
                                                                        padding: '0.375rem 0.5rem',
                                                                        border: '1px solid #d1d5db',
                                                                        borderRadius: '4px',
                                                                        fontSize: '0.75rem',
                                                                        fontWeight: '500',
                                                                        outline: 'none',
                                                                        transition: 'border-color 0.2s ease',
                                                                        fontFamily: 'Nunito, sans-serif',
                                                                        textAlign: 'center',
                                                                    }}
                                                                    onFocus={(e) => e.target.style.borderColor = '#007AFF'}
                                                                    onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {/* Taper stage time adjustment checkbox */}
                                                    <div style={{ marginTop: '1rem' }}>
                                                        <label style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '0.75rem',
                                                            cursor: 'pointer',
                                                            fontSize: '0.75rem',
                                                            fontWeight: '500',
                                                            color: '#374151',
                                                            fontFamily: 'Nunito, sans-serif'
                                                        }}>
                                                            <input
                                                                type="checkbox"
                                                                checked={stage.allowClientToAdjustTime || false}
                                                                onChange={(e) => updateTaperStage(stageIndex, { allowClientToAdjustTime: e.target.checked })}
                                                                style={{
                                                                    width: '14px',
                                                                    height: '14px',
                                                                    accentColor: '#007AFF'
                                                                }}
                                                            />
                                                            Allow client to adjust dose times for this stage
                                                        </label>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}