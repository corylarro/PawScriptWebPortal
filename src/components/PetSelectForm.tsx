// src/components/PetSelectForm.tsx - Age tracking system
'use client';

import { useState } from 'react';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/types/firestore';

// Define interfaces locally since they're not in the provided types
interface Client {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: {
        street: string;
        city: string;
        state: string;
        zipCode: string;
    };
    clinicId: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    notes?: string;
}

interface Pet {
    id: string;
    name: string;
    species: string;
    breed?: string;
    weight?: string;
    ageAtCreation?: number; // age in months when record was created
    ageAsOfDate?: Date;     // date when age was recorded
    microchipNumber?: string;
    clientId: string;
    clinicId: string;
    isActive: boolean;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

interface PetSelectFormProps {
    client: Client;
    pets: Pet[];
    selectedPet: Pet | null;
    onPetChange: (pet: Pet | null) => void;
}

export default function PetSelectForm({ client, pets, selectedPet, onPetChange }: PetSelectFormProps) {
    const [showNewPetForm, setShowNewPetForm] = useState(false);
    const [creating, setCreating] = useState(false);

    // New pet form state
    const [newPet, setNewPet] = useState({
        name: '',
        species: '',
        breed: '',
        weight: '',
        age: '', // Changed from dateOfBirth to age
        microchipNumber: '',
        notes: ''
    });

    // Age parsing function
    const parseAge = (ageInput: string): number | null => {
        if (!ageInput.trim()) return null;

        const input = ageInput.toLowerCase().trim();
        let totalMonths = 0;

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

        // Try pattern matching
        const yearMonthMatch = input.match(patterns[0]);
        if (yearMonthMatch) {
            totalMonths = parseInt(yearMonthMatch[1]) * 12 + parseInt(yearMonthMatch[2]);
            return totalMonths;
        }

        const yearMatch = input.match(patterns[1]);
        if (yearMatch) {
            totalMonths = parseInt(yearMatch[1]) * 12;
            return totalMonths;
        }

        const monthMatch = input.match(patterns[2]);
        if (monthMatch) {
            totalMonths = parseInt(monthMatch[1]);
            return totalMonths;
        }

        const weekMatch = input.match(patterns[3]);
        if (weekMatch) {
            totalMonths = Math.round(parseInt(weekMatch[1]) / 4.33); // weeks to months
            return totalMonths;
        }

        // Try parsing as plain number (assume months)
        const numberMatch = input.match(/^\d+$/);
        if (numberMatch) {
            return parseInt(input);
        }

        return null;
    };

    // Calculate current age based on stored age and time elapsed
    const calculateCurrentAge = (pet: Pet): string => {
        if (!pet.ageAtCreation || !pet.ageAsOfDate) {
            return 'Unknown';
        }

        const now = new Date();
        const monthsElapsed = Math.floor((now.getTime() - pet.ageAsOfDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
        const currentAgeInMonths = pet.ageAtCreation + monthsElapsed;

        return formatAge(currentAgeInMonths);
    };

    // Format age from months to readable format
    const formatAge = (totalMonths: number): string => {
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
    };

    const handleCreatePet = async () => {
        if (!newPet.name || !newPet.species) {
            alert('Please fill in required fields (Name, Species)');
            return;
        }

        // Parse age if provided
        let ageAtCreation = null;
        if (newPet.age.trim()) {
            ageAtCreation = parseAge(newPet.age);
            if (ageAtCreation === null) {
                alert('Please enter age in a valid format (e.g., "2y 6m", "18 months", "3 years")');
                return;
            }
        }

        setCreating(true);
        try {
            // Build pet data object, only including fields that have values
            const petData: {
                name: string;
                species: string;
                clientId: string;
                clinicId: string;
                isActive: boolean;
                createdAt: Date;
                updatedAt: Date;
                breed?: string;
                weight?: string;
                ageAtCreation?: number;
                ageAsOfDate?: Date;
                microchipNumber?: string;
                notes?: string;
            } = {
                name: newPet.name,
                species: newPet.species,
                clientId: client.id,
                clinicId: client.clinicId,
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            // Only add optional fields if they have values
            if (newPet.breed.trim()) {
                petData.breed = newPet.breed;
            }

            if (newPet.weight.trim()) {
                petData.weight = newPet.weight;
            }

            if (ageAtCreation !== null) {
                petData.ageAtCreation = ageAtCreation;
                petData.ageAsOfDate = new Date();
            }

            if (newPet.microchipNumber.trim()) {
                petData.microchipNumber = newPet.microchipNumber;
            }

            if (newPet.notes.trim()) {
                petData.notes = newPet.notes;
            }

            console.log('Creating pet with data:', petData);

            const docRef = await addDoc(collection(db, COLLECTIONS.PETS), petData);

            const createdPet: Pet = {
                id: docRef.id,
                name: petData.name,
                species: petData.species,
                breed: petData.breed,
                weight: petData.weight,
                ageAtCreation: petData.ageAtCreation,
                ageAsOfDate: petData.ageAsOfDate,
                microchipNumber: petData.microchipNumber,
                clientId: petData.clientId,
                clinicId: petData.clinicId,
                isActive: petData.isActive,
                notes: petData.notes,
                createdAt: petData.createdAt,
                updatedAt: petData.updatedAt
            };

            onPetChange(createdPet);
            setShowNewPetForm(false);

            // Reset form
            setNewPet({
                name: '',
                species: '',
                breed: '',
                weight: '',
                age: '',
                microchipNumber: '',
                notes: ''
            });
        } catch (error) {
            console.error('Error creating pet:', error);
            alert('Failed to create pet. Please try again.');
        } finally {
            setCreating(false);
        }
    };

    return (
        <div>
            {/* Selected Pet Display */}
            {selectedPet && (
                <div style={{
                    padding: '1rem',
                    backgroundColor: '#f0f9ff',
                    borderRadius: '8px',
                    border: '2px solid #0ea5e9',
                    marginBottom: '1rem'
                }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start'
                    }}>
                        <div>
                            <div style={{
                                fontSize: '1rem',
                                fontWeight: '600',
                                color: '#0c4a6e',
                                marginBottom: '0.25rem'
                            }}>
                                🐾 {selectedPet.name}
                            </div>
                            <div style={{
                                fontSize: '0.875rem',
                                color: '#075985',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.125rem'
                            }}>
                                <div>Species: {selectedPet.species}</div>
                                {selectedPet.breed && <div>Breed: {selectedPet.breed}</div>}
                                {selectedPet.weight && <div>Weight: {selectedPet.weight}</div>}
                                {selectedPet.ageAtCreation && (
                                    <div>Age: {calculateCurrentAge(selectedPet)}</div>
                                )}
                                {selectedPet.microchipNumber && (
                                    <div>Microchip: {selectedPet.microchipNumber}</div>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={() => onPetChange(null)}
                            style={{
                                backgroundColor: 'transparent',
                                color: '#075985',
                                border: '1px solid #0ea5e9',
                                padding: '0.5rem',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                cursor: 'pointer',
                                fontWeight: '600'
                            }}
                        >
                            Change Pet
                        </button>
                    </div>
                </div>
            )}

            {/* Pet Selection */}
            {!selectedPet && (
                <div>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '1rem'
                    }}>
                        <div>
                            <div style={{
                                fontSize: '1rem',
                                fontWeight: '600',
                                color: '#1e293b',
                                marginBottom: '0.25rem'
                            }}>
                                Select Pet for {client.firstName} {client.lastName}
                            </div>
                            <div style={{
                                fontSize: '0.875rem',
                                color: '#64748b'
                            }}>
                                {pets.length === 0
                                    ? 'No pets found for this client'
                                    : `${pets.length} pet${pets.length === 1 ? '' : 's'} found`
                                }
                            </div>
                        </div>

                        <button
                            onClick={() => setShowNewPetForm(true)}
                            style={{
                                backgroundColor: '#16a34a',
                                color: 'white',
                                border: 'none',
                                padding: '0.75rem 1rem',
                                borderRadius: '8px',
                                fontSize: '0.875rem',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'background-color 0.2s ease',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            + New Pet
                        </button>
                    </div>

                    {/* Pet List */}
                    {pets.length > 0 ? (
                        <div style={{
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            backgroundColor: 'white'
                        }}>
                            {pets.map((pet) => (
                                <div
                                    key={pet.id}
                                    onClick={() => onPetChange(pet)}
                                    style={{
                                        padding: '1rem',
                                        borderBottom: '1px solid #f3f4f6',
                                        cursor: 'pointer',
                                        transition: 'background-color 0.2s ease',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                    <div>
                                        <div style={{
                                            fontSize: '1rem',
                                            fontWeight: '600',
                                            color: '#1e293b',
                                            marginBottom: '0.25rem'
                                        }}>
                                            🐾 {pet.name}
                                        </div>
                                        <div style={{
                                            fontSize: '0.75rem',
                                            color: '#64748b',
                                            display: 'flex',
                                            gap: '1rem'
                                        }}>
                                            <span>{pet.species}</span>
                                            {pet.breed && <span>• {pet.breed}</span>}
                                            {pet.weight && <span>• {pet.weight}</span>}
                                            {pet.ageAtCreation && <span>• {calculateCurrentAge(pet)} old</span>}
                                        </div>
                                    </div>
                                    <div style={{
                                        fontSize: '0.75rem',
                                        color: '#2563eb',
                                        fontWeight: '600'
                                    }}>
                                        Select →
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{
                            textAlign: 'center',
                            padding: '3rem 2rem',
                            color: '#6b7280',
                            backgroundColor: '#f9fafb',
                            borderRadius: '8px',
                            border: '2px dashed #d1d5db'
                        }}>
                            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🐾</div>
                            <p style={{ fontSize: '1.125rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                                No pets found for this client
                            </p>
                            <p style={{ fontSize: '0.875rem', margin: '0' }}>
                                Click &quot;New Pet&quot; to add their first pet
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* New Pet Form Modal */}
            {showNewPetForm && (
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
                    zIndex: 1000,
                    padding: '1rem'
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        padding: '2rem',
                        maxWidth: '600px',
                        width: '100%',
                        maxHeight: '90vh',
                        overflowY: 'auto'
                    }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '1.5rem'
                        }}>
                            <h3 style={{
                                fontSize: '1.25rem',
                                fontWeight: '600',
                                color: '#1e293b',
                                margin: '0'
                            }}>
                                Add New Pet for {client.firstName} {client.lastName}
                            </h3>
                            <button
                                onClick={() => setShowNewPetForm(false)}
                                style={{
                                    backgroundColor: 'transparent',
                                    border: 'none',
                                    fontSize: '1.5rem',
                                    cursor: 'pointer',
                                    color: '#6b7280',
                                    padding: '0.25rem'
                                }}
                            >
                                ×
                            </button>
                        </div>

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
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
                                    Pet Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={newPet.name}
                                    onChange={(e) => setNewPet({ ...newPet, name: e.target.value })}
                                    placeholder="e.g., Buddy, Whiskers"
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '8px',
                                        fontSize: '1rem',
                                        outline: 'none',
                                        fontFamily: 'inherit',
                                        boxSizing: 'border-box'
                                    }}
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
                                    Species *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={newPet.species}
                                    onChange={(e) => setNewPet({ ...newPet, species: e.target.value })}
                                    placeholder="e.g., Dog, Cat, Bird, Rabbit"
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '8px',
                                        fontSize: '1rem',
                                        outline: 'none',
                                        fontFamily: 'inherit',
                                        boxSizing: 'border-box'
                                    }}
                                />
                            </div>
                        </div>

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
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
                                    Breed
                                </label>
                                <input
                                    type="text"
                                    value={newPet.breed}
                                    onChange={(e) => setNewPet({ ...newPet, breed: e.target.value })}
                                    placeholder="e.g., Golden Retriever, Mixed"
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '8px',
                                        fontSize: '1rem',
                                        outline: 'none',
                                        fontFamily: 'inherit',
                                        boxSizing: 'border-box'
                                    }}
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
                                    Weight
                                </label>
                                <input
                                    type="text"
                                    value={newPet.weight}
                                    onChange={(e) => setNewPet({ ...newPet, weight: e.target.value })}
                                    placeholder="e.g., 25 lbs, 4.5 kg"
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '8px',
                                        fontSize: '1rem',
                                        outline: 'none',
                                        fontFamily: 'inherit',
                                        boxSizing: 'border-box'
                                    }}
                                />
                            </div>
                        </div>

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
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
                                    Age (Current/Estimated)
                                </label>
                                <input
                                    type="text"
                                    value={newPet.age}
                                    onChange={(e) => setNewPet({ ...newPet, age: e.target.value })}
                                    placeholder="e.g., 2y 6m, 18 months, 3 years"
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '8px',
                                        fontSize: '1rem',
                                        outline: 'none',
                                        fontFamily: 'inherit',
                                        boxSizing: 'border-box'
                                    }}
                                />
                                <div style={{
                                    fontSize: '0.75rem',
                                    color: '#6b7280',
                                    marginTop: '0.25rem'
                                }}>
                                    Formats: &quot;2y 6m&quot;, &quot;18 months&quot;, &quot;3 years&quot;, &quot;6m&quot;
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
                                    value={newPet.microchipNumber}
                                    onChange={(e) => setNewPet({ ...newPet, microchipNumber: e.target.value })}
                                    placeholder="15-digit microchip number"
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '8px',
                                        fontSize: '1rem',
                                        outline: 'none',
                                        fontFamily: 'inherit',
                                        boxSizing: 'border-box'
                                    }}
                                />
                            </div>
                        </div>

                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{
                                display: 'block',
                                fontSize: '0.875rem',
                                fontWeight: '600',
                                color: '#374151',
                                marginBottom: '0.5rem'
                            }}>
                                Notes (Internal)
                            </label>
                            <textarea
                                value={newPet.notes}
                                onChange={(e) => setNewPet({ ...newPet, notes: e.target.value })}
                                placeholder="Internal notes about this pet..."
                                rows={3}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '8px',
                                    fontSize: '1rem',
                                    outline: 'none',
                                    fontFamily: 'inherit',
                                    resize: 'vertical',
                                    boxSizing: 'border-box'
                                }}
                            />
                        </div>

                        <div style={{
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: '1rem',
                            marginTop: '2rem'
                        }}>
                            <button
                                onClick={() => setShowNewPetForm(false)}
                                style={{
                                    backgroundColor: 'white',
                                    color: '#6b7280',
                                    border: '1px solid #d1d5db',
                                    padding: '0.75rem 1.5rem',
                                    borderRadius: '8px',
                                    fontSize: '0.875rem',
                                    fontWeight: '600',
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreatePet}
                                disabled={creating || !newPet.name || !newPet.species}
                                style={{
                                    backgroundColor: creating || !newPet.name || !newPet.species ? '#9ca3af' : '#16a34a',
                                    color: 'white',
                                    border: 'none',
                                    padding: '0.75rem 1.5rem',
                                    borderRadius: '8px',
                                    fontSize: '0.875rem',
                                    fontWeight: '600',
                                    cursor: creating || !newPet.name || !newPet.species ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}
                            >
                                {creating && (
                                    <div style={{
                                        width: '16px',
                                        height: '16px',
                                        border: '2px solid transparent',
                                        borderTop: '2px solid white',
                                        borderRadius: '50%',
                                        animation: 'spin 1s linear infinite'
                                    }} />
                                )}
                                {creating ? 'Adding Pet...' : 'Add Pet'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Spinning animation */}
            <style jsx>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}