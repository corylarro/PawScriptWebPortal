// src/components/MedicationForm.tsx
'use client';

import { useState } from 'react';
import { Medication, TaperStage } from '@/types/discharge';
import { medicationTemplates, frequencyOptions, getMedicationTemplate, getFrequencyOption } from '@/data/medicationTemplates';

interface MedicationFormProps {
    medication: Medication;
    index: number;
    onUpdate: (index: number, medication: Medication) => void;
    onRemove: (index: number) => void;
}

export default function MedicationForm({ medication, index, onUpdate, onRemove }: MedicationFormProps) {
    const [isExpanded, setIsExpanded] = useState(true);

    // Update medication when changes are made
    const updateMedication = (updates: Partial<Medication>) => {
        const updatedMedication = { ...medication, ...updates };
        onUpdate(index, updatedMedication);
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

    // Handle frequency change and auto-generate times
    const handleFrequencyChange = (frequency: number) => {
        const frequencyOption = getFrequencyOption(frequency);
        if (frequencyOption) {
            const updates: Partial<Medication> = {
                frequency,
                times: frequencyOption.times,
                customTimes: frequencyOption.times
            };

            // Handle custom frequency
            if (frequency === -99) {
                updates.customFrequency = 1;
            } else {
                updates.customFrequency = undefined;
            }

            updateMedication(updates);
        }
    };

    // Handle custom frequency change
    const handleCustomFrequencyChange = (customFreq: number) => {
        // Generate times based on custom frequency
        const times: string[] = [];
        if (customFreq > 0 && customFreq <= 6) {
            const hoursInterval = 24 / customFreq;
            for (let i = 0; i < customFreq; i++) {
                const hour = Math.floor(8 + (i * hoursInterval)) % 24;
                times.push(`${hour.toString().padStart(2, '0')}:00`);
            }
        }

        updateMedication({
            customFrequency: customFreq,
            times,
            customTimes: times
        });
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
                times: medication.customTimes || ['08:00']
            };

            updateMedication({
                isTapered: true,
                dosage: undefined,
                frequency: undefined,
                times: undefined,
                customTimes: undefined,
                startDate: undefined,
                endDate: undefined,
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
            times: ['08:00']
        };

        // Auto-fill start date based on previous stage's end date
        if (medication.taperStages.length > 0) {
            const lastStage = medication.taperStages[medication.taperStages.length - 1];
            if (lastStage.endDate) {
                const nextDay = new Date(lastStage.endDate);
                nextDay.setDate(nextDay.getDate() + 1);
                newStage.startDate = nextDay.toISOString().split('T')[0]; // YYYY-MM-DD format
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
    };

    // Handle taper stage frequency change
    const handleTaperFrequencyChange = (stageIndex: number, frequency: number) => {
        const frequencyOption = getFrequencyOption(frequency);
        if (frequencyOption) {
            updateTaperStage(stageIndex, {
                frequency,
                times: frequencyOption.times
            });
        }
    };

    const inputStyle = (isFocused: boolean = false) => ({
        width: '100%',
        padding: '0.75rem',
        border: isFocused ? '2px solid #2563eb' : '1px solid #d1d5db',
        borderRadius: '6px',
        fontSize: '0.875rem',
        outline: 'none',
        transition: 'border-color 0.2s ease',
        fontFamily: 'inherit',
        boxSizing: 'border-box' as const
    });

    return (
        <div style={{
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            backgroundColor: '#ffffff',
            overflow: 'hidden'
        }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1rem 1.5rem',
                backgroundColor: '#f9fafb',
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
                            transition: 'transform 0.2s ease'
                        }}
                    >
                        <svg
                            width="16"
                            height="16"
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
                        fontSize: '1rem',
                        fontWeight: '600',
                        color: '#374151',
                        margin: '0'
                    }}>
                        {medication.name || `Medication ${index + 1}`}
                        {medication.isTapered && (
                            <span style={{
                                marginLeft: '0.5rem',
                                fontSize: '0.75rem',
                                backgroundColor: '#ddd6fe',
                                color: '#7c3aed',
                                padding: '0.25rem 0.5rem',
                                borderRadius: '12px',
                                fontWeight: '500'
                            }}>
                                TAPERED
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
                        padding: '0.5rem',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem'
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
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                        gridTemplateColumns: '1fr 1fr',
                        gap: '1rem',
                        marginBottom: '1.5rem'
                    }}>
                        <div>
                            <label style={{
                                display: 'block',
                                fontSize: '0.875rem',
                                fontWeight: '600',
                                color: '#374151',
                                marginBottom: '0.5rem'
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
                                    style={inputStyle()}
                                    onFocus={(e) => e.target.style.borderColor = '#2563eb'}
                                    onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                                />
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
                                marginBottom: '0.5rem'
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
                                    minHeight: '80px'
                                }}
                                onFocus={(e) => e.target.style.borderColor = '#2563eb'}
                                onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                            />
                        </div>
                    </div>

                    {/* Tapered Toggle */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            color: '#374151'
                        }}>
                            <input
                                type="checkbox"
                                checked={medication.isTapered}
                                onChange={(e) => handleTaperToggle(e.target.checked)}
                                style={{
                                    width: '16px',
                                    height: '16px',
                                    accentColor: '#2563eb'
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
                                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                                gap: '1rem',
                                marginBottom: '1rem'
                            }}>
                                <div>
                                    <label style={{
                                        display: 'block',
                                        fontSize: '0.875rem',
                                        fontWeight: '600',
                                        color: '#374151',
                                        marginBottom: '0.5rem'
                                    }}>
                                        Dosage *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={medication.dosage || ''}
                                        onChange={(e) => updateMedication({ dosage: e.target.value })}
                                        placeholder="e.g., 50mg, 1 tablet"
                                        style={inputStyle()}
                                        onFocus={(e) => e.target.style.borderColor = '#2563eb'}
                                        onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                                    />
                                </div>

                                <div>
                                    <label style={{
                                        display: 'block',
                                        fontSize: '0.875rem',
                                        fontWeight: '600',
                                        color: '#374151',
                                        marginBottom: '0.5rem'
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
                                        onFocus={(e) => e.target.style.borderColor = '#2563eb'}
                                        onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                                    >
                                        <optgroup label="Common">
                                            {frequencyOptions.filter(opt => opt.category === 'common').map((option) => (
                                                <option key={option.value} value={option.value}>
                                                    {option.label}
                                                </option>
                                            ))}
                                        </optgroup>
                                        <optgroup label="Other">
                                            {frequencyOptions.filter(opt => opt.category === 'other').map((option) => (
                                                <option key={option.value} value={option.value}>
                                                    {option.label}
                                                </option>
                                            ))}
                                        </optgroup>
                                    </select>
                                </div>

                                {/* Custom Frequency Input */}
                                {medication.frequency === -99 && (
                                    <div>
                                        <label style={{
                                            display: 'block',
                                            fontSize: '0.875rem',
                                            fontWeight: '600',
                                            color: '#374151',
                                            marginBottom: '0.5rem'
                                        }}>
                                            Times per day *
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="6"
                                            required
                                            value={medication.customFrequency || 1}
                                            onChange={(e) => handleCustomFrequencyChange(parseInt(e.target.value))}
                                            placeholder="e.g., 5"
                                            style={inputStyle()}
                                            onFocus={(e) => e.target.style.borderColor = '#2563eb'}
                                            onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                                        />
                                    </div>
                                )}

                                <div>
                                    <label style={{
                                        display: 'block',
                                        fontSize: '0.875rem',
                                        fontWeight: '600',
                                        color: '#374151',
                                        marginBottom: '0.5rem'
                                    }}>
                                        Start Date
                                    </label>
                                    <input
                                        type="date"
                                        value={medication.startDate || ''}
                                        onChange={(e) => updateMedication({ startDate: e.target.value })}
                                        style={inputStyle()}
                                        onFocus={(e) => e.target.style.borderColor = '#2563eb'}
                                        onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                                    />
                                </div>

                                <div>
                                    <label style={{
                                        display: 'block',
                                        fontSize: '0.875rem',
                                        fontWeight: '600',
                                        color: '#374151',
                                        marginBottom: '0.5rem'
                                    }}>
                                        End Date
                                    </label>
                                    <input
                                        type="date"
                                        value={medication.endDate || ''}
                                        onChange={(e) => updateMedication({ endDate: e.target.value })}
                                        style={inputStyle()}
                                        onFocus={(e) => e.target.style.borderColor = '#2563eb'}
                                        onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                                    />
                                </div>
                            </div>

                            {/* Dosing Times and Editability */}
                            {medication.customTimes && medication.customTimes.length > 0 && (
                                <div style={{ marginTop: '1rem' }}>
                                    <div style={{
                                        backgroundColor: '#f3f4f6',
                                        padding: '0.75rem',
                                        borderRadius: '6px',
                                        fontSize: '0.875rem',
                                        marginBottom: '0.75rem'
                                    }}>
                                        <strong>Dosing times:</strong> {medication.customTimes.join(', ')}
                                    </div>

                                    <label style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        cursor: 'pointer',
                                        fontSize: '0.875rem',
                                        fontWeight: '500',
                                        color: '#374151'
                                    }}>
                                        <input
                                            type="checkbox"
                                            checked={medication.editable}
                                            onChange={(e) => updateMedication({ editable: e.target.checked })}
                                            style={{
                                                width: '16px',
                                                height: '16px',
                                                accentColor: '#2563eb'
                                            }}
                                        />
                                        Let pet owner adjust times in app
                                    </label>
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
                                marginBottom: '1rem'
                            }}>
                                <h4 style={{
                                    fontSize: '1rem',
                                    fontWeight: '600',
                                    color: '#374151',
                                    margin: '0'
                                }}>
                                    Taper Stages ({medication.taperStages.length})
                                </h4>

                                <button
                                    onClick={addTaperStage}
                                    style={{
                                        backgroundColor: '#2563eb',
                                        color: 'white',
                                        border: 'none',
                                        padding: '0.5rem 1rem',
                                        borderRadius: '6px',
                                        fontSize: '0.75rem',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        transition: 'background-color 0.2s ease',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.25rem'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1d4ed8'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                                >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="12" y1="5" x2="12" y2="19" />
                                        <line x1="5" y1="12" x2="19" y2="12" />
                                    </svg>
                                    Add Stage
                                </button>
                            </div>

                            {medication.taperStages.length === 0 ? (
                                <div style={{
                                    textAlign: 'center',
                                    padding: '2rem',
                                    color: '#6b7280',
                                    backgroundColor: '#f9fafb',
                                    borderRadius: '6px',
                                    border: '1px dashed #d1d5db'
                                }}>
                                    <p style={{ margin: '0' }}>No taper stages added yet. Click &quot;Add Stage&quot; to get started.</p>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {medication.taperStages.map((stage, stageIndex) => (
                                        <div key={stageIndex} style={{
                                            border: '1px solid #e5e7eb',
                                            borderRadius: '8px',
                                            padding: '1rem',
                                            backgroundColor: '#fafbfc'
                                        }}>
                                            <div style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                marginBottom: '1rem'
                                            }}>
                                                <h5 style={{
                                                    fontSize: '0.875rem',
                                                    fontWeight: '600',
                                                    color: '#374151',
                                                    margin: '0'
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
                                                            borderRadius: '4px',
                                                            fontSize: '0.75rem',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s ease'
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
                                                gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                                                gap: '0.75rem'
                                            }}>
                                                <div>
                                                    <label style={{
                                                        display: 'block',
                                                        fontSize: '0.75rem',
                                                        fontWeight: '600',
                                                        color: '#374151',
                                                        marginBottom: '0.25rem'
                                                    }}>
                                                        Start Date *
                                                    </label>
                                                    <input
                                                        type="date"
                                                        required
                                                        value={stage.startDate}
                                                        onChange={(e) => updateTaperStage(stageIndex, { startDate: e.target.value })}
                                                        style={{
                                                            ...inputStyle(),
                                                            fontSize: '0.75rem',
                                                            padding: '0.5rem'
                                                        }}
                                                        onFocus={(e) => e.target.style.borderColor = '#2563eb'}
                                                        onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                                                    />
                                                </div>

                                                <div>
                                                    <label style={{
                                                        display: 'block',
                                                        fontSize: '0.75rem',
                                                        fontWeight: '600',
                                                        color: '#374151',
                                                        marginBottom: '0.25rem'
                                                    }}>
                                                        End Date *
                                                    </label>
                                                    <input
                                                        type="date"
                                                        required
                                                        value={stage.endDate}
                                                        onChange={(e) => updateTaperStage(stageIndex, { endDate: e.target.value })}
                                                        style={{
                                                            ...inputStyle(),
                                                            fontSize: '0.75rem',
                                                            padding: '0.5rem'
                                                        }}
                                                        onFocus={(e) => e.target.style.borderColor = '#2563eb'}
                                                        onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                                                    />
                                                </div>

                                                <div>
                                                    <label style={{
                                                        display: 'block',
                                                        fontSize: '0.75rem',
                                                        fontWeight: '600',
                                                        color: '#374151',
                                                        marginBottom: '0.25rem'
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
                                                            padding: '0.5rem'
                                                        }}
                                                        onFocus={(e) => e.target.style.borderColor = '#2563eb'}
                                                        onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                                                    />
                                                </div>

                                                <div>
                                                    <label style={{
                                                        display: 'block',
                                                        fontSize: '0.75rem',
                                                        fontWeight: '600',
                                                        color: '#374151',
                                                        marginBottom: '0.25rem'
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
                                                        onFocus={(e) => e.target.style.borderColor = '#2563eb'}
                                                        onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                                                    >
                                                        <optgroup label="Common">
                                                            {frequencyOptions.filter(opt => opt.category === 'common').map((option) => (
                                                                <option key={option.value} value={option.value}>
                                                                    {option.label}
                                                                </option>
                                                            ))}
                                                        </optgroup>
                                                        <optgroup label="Other">
                                                            {frequencyOptions.filter(opt => opt.category === 'other' && opt.value !== -99).map((option) => (
                                                                <option key={option.value} value={option.value}>
                                                                    {option.label}
                                                                </option>
                                                            ))}
                                                        </optgroup>
                                                    </select>
                                                </div>
                                            </div>

                                            {/* Stage Times Display */}
                                            {stage.times && stage.times.length > 0 && (
                                                <div style={{
                                                    backgroundColor: '#f3f4f6',
                                                    padding: '0.5rem',
                                                    borderRadius: '4px',
                                                    fontSize: '0.75rem',
                                                    marginTop: '0.75rem'
                                                }}>
                                                    <strong>Times:</strong> {stage.times.join(', ')}
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