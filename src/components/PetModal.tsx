// src/components/PetModal.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { addDoc, collection, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS, Client, Pet } from '@/types/firestore';

interface PetModalProps {
    client: Client;
    clinicId: string;
    isOpen: boolean;
    onClose: () => void;
    onPetSaved: () => void; // Callback to refresh pet list
    mode: 'add' | 'edit';
    pet?: Pet; // Required when mode is 'edit'
}

export default function PetModal({
    client,
    clinicId,
    isOpen,
    onClose,
    onPetSaved,
    mode,
    pet
}: PetModalProps) {
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        species: '',
        breed: '',
        weight: '',
        age: '',
        microchipNumber: '',
        notes: ''
    });

    // Format age from months to readable format
    const formatAge = useCallback((totalMonths: number): string => {
        if (totalMonths < 1) return 'Less than 1 month';
        if (totalMonths < 12) {
            return `${totalMonths} month${totalMonths === 1 ? '' : 's'}`;
        }

        const years = Math.floor(totalMonths / 12);
        const months = totalMonths % 12;

        if (months === 0) {
            return `${years} year${years === 1 ? '' : 's'}`;
        }

        return `${years}y ${months}m`;
    }, []);

    // Format current age for display in edit mode
    const formatCurrentAge = useCallback((pet: Pet): string => {
        if (!pet.ageAtCreation || !pet.ageAsOfDate) {
            return '';
        }

        const now = new Date();
        const monthsElapsed = Math.floor((now.getTime() - pet.ageAsOfDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
        const currentAgeInMonths = pet.ageAtCreation + monthsElapsed;

        return formatAge(currentAgeInMonths);
    }, [formatAge]);

    // Pre-populate form when editing
    useEffect(() => {
        if (mode === 'edit' && pet) {
            setFormData({
                name: pet.name || '',
                species: pet.species || '',
                breed: pet.breed || '',
                weight: pet.weight || '',
                age: formatCurrentAge(pet),
                microchipNumber: pet.microchipNumber || '',
                notes: pet.notes || ''
            });
        } else if (mode === 'add') {
            // Reset form for add mode
            setFormData({
                name: '',
                species: '',
                breed: '',
                weight: '',
                age: '',
                microchipNumber: '',
                notes: ''
            });
        }
    }, [mode, pet, isOpen, formatCurrentAge]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.species) {
            alert('Please fill in required fields (name and species)');
            return;
        }

        setSaving(true);
        try {
            if (mode === 'add') {
                await handleAddPet();
            } else {
                await handleEditPet();
            }
        } catch (error) {
            console.error(`Error ${mode === 'add' ? 'adding' : 'updating'} pet:`, error);
            alert(`Failed to ${mode === 'add' ? 'add' : 'update'} pet. Please try again.`);
        } finally {
            setSaving(false);
        }
    };

    const handleAddPet = async () => {
        // Parse age into months if provided
        let ageAtCreation: number | undefined;
        let ageAsOfDate: Date | undefined;

        if (formData.age.trim()) {
            const parsedAge = parseAge(formData.age);
            if (parsedAge !== null) {
                ageAtCreation = parsedAge;
                ageAsOfDate = new Date();
            }
        }

        const petData = {
            name: formData.name.trim(),
            species: formData.species.trim(),
            breed: formData.breed.trim() || '',
            weight: standardizeWeight(formData.weight.trim()),
            ageAtCreation,
            ageAsOfDate,
            microchipNumber: formData.microchipNumber.trim() || '',
            clientId: client.id,
            clinicId: clinicId,
            isActive: true,
            notes: formData.notes.trim() || '',
            createdAt: new Date(),
            updatedAt: new Date()
        };

        await addDoc(collection(db, COLLECTIONS.PETS), petData);
        resetForm();
        onPetSaved();
        onClose();
    };

    const handleEditPet = async () => {
        if (!pet) return;

        // Calculate new age data if age was changed
        let ageAtCreation: number | undefined = pet.ageAtCreation;
        let ageAsOfDate: Date | undefined = pet.ageAsOfDate;

        if (formData.age.trim()) {
            const parsedAge = parseAge(formData.age);
            if (parsedAge !== null) {
                ageAtCreation = parsedAge;
                ageAsOfDate = new Date(); // Update the reference date
            }
        }

        const updateData = {
            name: formData.name.trim(),
            species: formData.species.trim(),
            breed: formData.breed.trim() || '',
            weight: standardizeWeight(formData.weight.trim()),
            ageAtCreation,
            ageAsOfDate,
            microchipNumber: formData.microchipNumber.trim() || '',
            notes: formData.notes.trim() || '',
            updatedAt: new Date()
        };

        await updateDoc(doc(db, COLLECTIONS.PETS, pet.id), updateData);
        onPetSaved();
        onClose();
    };

    // Standardize weight to include "lbs" if it's just a number
    const standardizeWeight = (weight: string): string => {
        if (!weight) return '';

        // If it's just a number, add "lbs"
        const numberMatch = weight.match(/^(\d+(?:\.\d+)?)$/);
        if (numberMatch) {
            return `${numberMatch[1]} lbs`;
        }

        // If it already has units, return as-is
        return weight;
    };

    // Age parsing function
    const parseAge = (ageInput: string): number | null => {
        if (!ageInput.trim()) return null;

        const input = ageInput.toLowerCase().trim();

        // Handle common formats
        const patterns = [
            // "2y 3m", "2 years 3 months", "2yr 3mo"
            /(\d+)\s*(?:y|yr|year|years)\s*(\d+)\s*(?:m|mo|month|months)/,
            // "2y", "2 years", "2yr"  
            /(\d+)\s*(?:y|yr|year|years)$/,
            // "6m", "6 months", "6mo"
            /(\d+)\s*(?:m|mo|month|months)$/,
            // "18 months", "6 weeks" (convert weeks to months)
            /(\d+)\s*(?:w|wk|week|weeks)$/
        ];

        // Try "years + months" pattern
        const yearMonthMatch = input.match(patterns[0]);
        if (yearMonthMatch) {
            const years = parseInt(yearMonthMatch[1]);
            const months = parseInt(yearMonthMatch[2]);
            return (years * 12) + months;
        }

        // Try "years only" pattern
        const yearMatch = input.match(patterns[1]);
        if (yearMatch) {
            return parseInt(yearMatch[1]) * 12;
        }

        // Try "months only" pattern
        const monthMatch = input.match(patterns[2]);
        if (monthMatch) {
            return parseInt(monthMatch[1]);
        }

        // Try "weeks only" pattern (convert to months)
        const weekMatch = input.match(patterns[3]);
        if (weekMatch) {
            const weeks = parseInt(weekMatch[1]);
            return Math.round(weeks / 4.33); // ~4.33 weeks per month
        }

        // Try just a number (assume months)
        const numberMatch = input.match(/^(\d+)$/);
        if (numberMatch) {
            const num = parseInt(numberMatch[1]);
            if (num <= 60) return num; // Assume months if reasonable
        }

        return null; // Could not parse
    };

    const resetForm = () => {
        setFormData({
            name: '',
            species: '',
            breed: '',
            weight: '',
            age: '',
            microchipNumber: '',
            notes: ''
        });
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            padding: '1rem'
        }}>
            <div style={{
                backgroundColor: 'white',
                borderRadius: '16px',
                padding: '2rem',
                width: '100%',
                maxWidth: '500px',
                maxHeight: '90vh',
                overflowY: 'auto',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '1.5rem'
                }}>
                    <h2 style={{
                        fontSize: '1.5rem',
                        fontWeight: '700',
                        color: '#1e293b',
                        margin: '0'
                    }}>
                        {mode === 'add' ? 'Add New Pet' : `Edit ${pet?.name}`}
                    </h2>
                    <button
                        onClick={onClose}
                        style={{
                            backgroundColor: 'transparent',
                            border: 'none',
                            fontSize: '1.5rem',
                            cursor: 'pointer',
                            color: '#64748b',
                            padding: '0.25rem'
                        }}
                    >
                        ×
                    </button>
                </div>

                <div style={{
                    backgroundColor: '#f8fafc',
                    padding: '1rem',
                    borderRadius: '8px',
                    marginBottom: '1.5rem',
                    border: '1px solid #e2e8f0'
                }}>
                    <div style={{
                        fontSize: '0.875rem',
                        color: '#64748b',
                        fontWeight: '600'
                    }}>
                        {mode === 'add' ? 'Adding pet for:' : 'Editing pet for:'}
                    </div>
                    <div style={{
                        fontSize: '1rem',
                        color: '#1e293b',
                        fontWeight: '600'
                    }}>
                        {client.firstName} {client.lastName}
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <div style={{
                        display: 'grid',
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
                                Pet Name *
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '8px',
                                    fontSize: '1rem',
                                    outline: 'none',
                                    boxSizing: 'border-box'
                                }}
                                placeholder="e.g., Buddy"
                            />
                        </div>

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '1rem'
                        }}>
                            <div>
                                <label style={{
                                    display: 'block',
                                    fontSize: '0.875rem',
                                    fontWeight: '600',
                                    color: '#374151',
                                    marginBottom: '0.5rem'
                                }}>
                                    Species *
                                </label>
                                <select
                                    required
                                    value={formData.species}
                                    onChange={(e) => setFormData({ ...formData, species: e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '8px',
                                        fontSize: '1rem',
                                        outline: 'none',
                                        boxSizing: 'border-box',
                                        backgroundColor: 'white'
                                    }}
                                >
                                    <option value="">Select species</option>
                                    <option value="Dog">Dog</option>
                                    <option value="Cat">Cat</option>
                                    <option value="Rabbit">Rabbit</option>
                                    <option value="Bird">Bird</option>
                                    <option value="Hamster">Hamster</option>
                                    <option value="Guinea Pig">Guinea Pig</option>
                                    <option value="Ferret">Ferret</option>
                                    <option value="Reptile">Reptile</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>

                            <div>
                                <label style={{
                                    display: 'block',
                                    fontSize: '0.875rem',
                                    fontWeight: '600',
                                    color: '#374151',
                                    marginBottom: '0.5rem'
                                }}>
                                    Breed
                                </label>
                                <input
                                    type="text"
                                    value={formData.breed}
                                    onChange={(e) => setFormData({ ...formData, breed: e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '8px',
                                        fontSize: '1rem',
                                        outline: 'none',
                                        boxSizing: 'border-box'
                                    }}
                                    placeholder="e.g., Golden Retriever"
                                />
                            </div>
                        </div>

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '1rem'
                        }}>
                            <div>
                                <label style={{
                                    display: 'block',
                                    fontSize: '0.875rem',
                                    fontWeight: '600',
                                    color: '#374151',
                                    marginBottom: '0.5rem'
                                }}>
                                    Weight
                                </label>
                                <input
                                    type="text"
                                    value={formData.weight}
                                    onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '8px',
                                        fontSize: '1rem',
                                        outline: 'none',
                                        boxSizing: 'border-box'
                                    }}
                                    placeholder="e.g., 25 lbs"
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
                                    Age {mode === 'edit' && '(Current)'}
                                </label>
                                <input
                                    type="text"
                                    value={formData.age}
                                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '8px',
                                        fontSize: '1rem',
                                        outline: 'none',
                                        boxSizing: 'border-box'
                                    }}
                                    placeholder="e.g., 3y 2m, 18m, 6 weeks"
                                />
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
                                Microchip Number
                            </label>
                            <input
                                type="text"
                                value={formData.microchipNumber}
                                onChange={(e) => setFormData({ ...formData, microchipNumber: e.target.value })}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '8px',
                                    fontSize: '1rem',
                                    outline: 'none',
                                    boxSizing: 'border-box'
                                }}
                                placeholder="e.g., 123456789012345"
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
                                Notes
                            </label>
                            <textarea
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                rows={3}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '8px',
                                    fontSize: '1rem',
                                    outline: 'none',
                                    resize: 'vertical',
                                    fontFamily: 'inherit',
                                    boxSizing: 'border-box'
                                }}
                                placeholder="Any additional notes about this pet..."
                            />
                        </div>
                    </div>

                    <div style={{
                        display: 'flex',
                        gap: '1rem',
                        justifyContent: 'flex-end'
                    }}>
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={saving}
                            style={{
                                backgroundColor: '#f1f5f9',
                                color: '#64748b',
                                border: '1px solid #e2e8f0',
                                padding: '0.75rem 1.5rem',
                                borderRadius: '8px',
                                fontSize: '0.875rem',
                                fontWeight: '600',
                                cursor: saving ? 'not-allowed' : 'pointer'
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            style={{
                                backgroundColor: saving ? '#94a3b8' : (mode === 'add' ? '#16a34a' : '#007AFF'),
                                color: 'white',
                                border: 'none',
                                padding: '0.75rem 1.5rem',
                                borderRadius: '8px',
                                fontSize: '0.875rem',
                                fontWeight: '600',
                                cursor: saving ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}
                        >
                            {saving && (
                                <div style={{
                                    width: '16px',
                                    height: '16px',
                                    border: '2px solid transparent',
                                    borderTop: '2px solid white',
                                    borderRadius: '50%',
                                    animation: 'spin 1s linear infinite'
                                }} />
                            )}
                            {saving
                                ? (mode === 'add' ? 'Adding Pet...' : 'Updating Pet...')
                                : (mode === 'add' ? 'Add Pet' : 'Update Pet')
                            }
                        </button>
                    </div>
                </form>

                <style jsx>{`
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        </div>
    );
}