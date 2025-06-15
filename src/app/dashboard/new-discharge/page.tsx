// src/app/dashboard/new-discharge/page.tsx - Fixed TypeScript errors
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs, orderBy, addDoc } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { Client, Pet } from '@/types/firestore';
import { Medication } from '@/types/discharge';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/types/firestore';
import ClientSearchForm from '@/components/ClientSearchForm';
import PetSelectForm from '@/components/PetSelectForm';
import MedicationForm from '@/components/MedicationForm';

export default function NewDischargePage() {
    const { vetUser, clinic } = useAuth();
    const { loading } = useRequireAuth();
    const router = useRouter();

    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
    const [clientPets, setClientPets] = useState<Pet[]>([]);

    // Visit information state
    const [visitInfo, setVisitInfo] = useState({
        visitDate: new Date().toISOString().split('T')[0], // Today's date as default
        diagnosis: '',
        notes: ''
    });

    // Medications state
    const [medications, setMedications] = useState<Medication[]>([]);
    const [saving, setSaving] = useState(false);

    // Load pets when client is selected
    useEffect(() => {
        const loadClientPets = async () => {
            if (!selectedClient || !clinic) {
                setClientPets([]);
                return;
            }

            try {
                console.log('Loading pets for client:', selectedClient.id);
                const petsQuery = query(
                    collection(db, COLLECTIONS.PETS),
                    where('clientId', '==', selectedClient.id),
                    where('clinicId', '==', clinic.id),
                    where('isActive', '==', true),
                    orderBy('name')
                );

                const petsSnapshot = await getDocs(petsQuery);
                const pets = petsSnapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        name: data.name,
                        species: data.species,
                        breed: data.breed,
                        weight: data.weight,
                        microchipNumber: data.microchipNumber,
                        clientId: data.clientId,
                        clinicId: data.clinicId,
                        isActive: data.isActive,
                        notes: data.notes,
                        createdAt: data.createdAt?.toDate() || new Date(),
                        updatedAt: data.updatedAt?.toDate() || new Date(),
                        dateOfBirth: data.dateOfBirth?.toDate() || undefined,
                    } as Pet;
                });

                console.log('Loaded pets:', pets);
                setClientPets(pets);

                // Auto-select if only one pet
                if (pets.length === 1) {
                    setSelectedPet(pets[0]);
                }
            } catch (error) {
                console.error('Error loading client pets:', error);
                setClientPets([]);
            }
        };

        loadClientPets();
    }, [selectedClient, clinic]);

    const handleClientChange = (client: Client | null) => {
        console.log('Client changed:', client);
        setSelectedClient(client);
        setSelectedPet(null); // Reset pet selection when client changes
        setClientPets([]);
    };

    const handlePetChange = (pet: Pet | null) => {
        console.log('Pet changed:', pet);
        setSelectedPet(pet);
    };

    // Medication handlers
    const handleAddMedication = () => {
        const newMedication: Medication = {
            name: '',
            dosage: '',
            frequency: 1,
            times: ['08:00'],
            customTimes: ['08:00'],
            startDate: '',
            endDate: '',
            instructions: '',
            editable: true,
            isTapered: false,
            taperStages: []
        };
        setMedications([...medications, newMedication]);
    };

    const handleUpdateMedication = (index: number, updatedMedication: Medication) => {
        const updatedMedications = medications.map((med, i) =>
            i === index ? updatedMedication : med
        );
        setMedications(updatedMedications);
    };

    const handleRemoveMedication = (index: number) => {
        setMedications(medications.filter((_, i) => i !== index));
    };

    // Create discharge functionality
    const handleCreateDischarge = async () => {
        if (!vetUser || !clinic || !selectedClient || !selectedPet) {
            console.error('Missing required data for discharge creation');
            alert('Missing required information. Please check your selections.');
            return;
        }

        // Validate that all medications have required fields
        const incompleteMediactions = medications.filter(med => !med.name || !med.instructions);
        if (incompleteMediactions.length > 0) {
            alert('Please complete all medication details (name and instructions are required).');
            return;
        }

        setSaving(true);

        try {
            console.log('Creating discharge document...');

            // Clean medications data - remove undefined fields
            const cleanedMedications = medications.map(med => {
                const cleanMed: Record<string, unknown> = {
                    name: med.name,
                    instructions: med.instructions,
                    editable: med.editable,
                    isTapered: med.isTapered,
                    taperStages: med.taperStages || []
                };

                // Only add fields that have values
                if (med.dosage?.trim()) cleanMed.dosage = med.dosage;
                if (med.frequency !== undefined) cleanMed.frequency = med.frequency;
                if (med.times && med.times.length > 0) cleanMed.times = med.times;
                if (med.customTimes && med.customTimes.length > 0) cleanMed.customTimes = med.customTimes;
                if (med.startDate?.trim()) cleanMed.startDate = med.startDate;
                if (med.endDate?.trim()) cleanMed.endDate = med.endDate;
                if (med.customFrequency !== undefined) cleanMed.customFrequency = med.customFrequency;

                return cleanMed;
            });

            // Prepare discharge data - only include fields with values
            const dischargeData: Record<string, unknown> = {
                pet: {
                    name: selectedPet.name,
                    species: selectedPet.species,
                    weight: selectedPet.weight || ''
                },
                medications: cleanedMedications,
                vetId: vetUser.id,
                clinicId: clinic.id,
                visitDate: new Date(visitInfo.visitDate),
                diagnosis: visitInfo.diagnosis,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            // Only add notes if they exist
            if (visitInfo.notes?.trim()) {
                dischargeData.notes = visitInfo.notes;
            }

            console.log('Cleaned discharge data:', dischargeData);

            // Save to Firestore
            const docRef = await addDoc(collection(db, COLLECTIONS.DISCHARGES), dischargeData);

            console.log('Discharge created with ID:', docRef.id);

            // Navigate to success page with discharge ID
            router.push(`/dashboard/discharge-success?id=${docRef.id}`);

        } catch (error) {
            console.error('Error creating discharge:', error);
            alert('Failed to create discharge. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#f8fafc'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        width: '48px',
                        height: '48px',
                        border: '3px solid #e2e8f0',
                        borderTop: '3px solid #2563eb',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        margin: '0 auto 1rem auto'
                    }} />
                    <p style={{ color: '#64748b', fontSize: '1rem' }}>Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: '#f8fafc',
            fontFamily: 'Nunito, -apple-system, BlinkMacSystemFont, sans-serif'
        }}>
            {/* Header */}
            <header style={{
                backgroundColor: 'white',
                borderBottom: '1px solid #e2e8f0',
                padding: '1rem 2rem',
                position: 'sticky',
                top: 0,
                zIndex: 10,
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}>
                <div style={{
                    maxWidth: '1200px',
                    margin: '0 auto',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <Link
                            href="/dashboard"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                color: '#64748b',
                                textDecoration: 'none',
                                fontSize: '0.875rem',
                                fontWeight: '400'
                            }}
                        >
                            ← Back to Dashboard
                        </Link>
                        <h1 style={{
                            fontSize: '1.25rem',
                            fontWeight: '600',
                            color: '#1e293b',
                            margin: '0'
                        }}>
                            New Discharge Summary
                        </h1>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            {clinic?.name || 'No clinic'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                            Dr. {vetUser?.firstName || 'No user'} {vetUser?.lastName || ''}
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main style={{
                maxWidth: '800px',
                margin: '0 auto',
                padding: '2rem'
            }}>
                {/* Client Selection Section */}
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    padding: '2rem',
                    marginBottom: '2rem',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                    border: '1px solid #e2e8f0'
                }}>
                    <h2 style={{
                        fontSize: '1.25rem',
                        fontWeight: '600',
                        color: '#1e293b',
                        marginBottom: '1.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}>
                        <div style={{
                            width: '24px',
                            height: '24px',
                            backgroundColor: '#2563eb',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.75rem',
                            color: 'white',
                            fontWeight: '700'
                        }}>
                            1
                        </div>
                        Client Selection
                    </h2>

                    {clinic?.id ? (
                        <ClientSearchForm
                            clinicId={clinic.id}
                            selectedClient={selectedClient}
                            onClientChange={handleClientChange}
                        />
                    ) : (
                        <div style={{
                            padding: '2rem',
                            textAlign: 'center',
                            color: '#ef4444',
                            backgroundColor: '#fef2f2',
                            borderRadius: '8px',
                            border: '1px solid #fecaca'
                        }}>
                            <p>⚠️ No clinic found. Please check your account setup.</p>
                        </div>
                    )}
                </div>

                {/* Pet Selection Section - Only show if client is selected */}
                {selectedClient && (
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        padding: '2rem',
                        marginBottom: '2rem',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                        border: '1px solid #e2e8f0'
                    }}>
                        <h2 style={{
                            fontSize: '1.25rem',
                            fontWeight: '600',
                            color: '#1e293b',
                            marginBottom: '1.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}>
                            <div style={{
                                width: '24px',
                                height: '24px',
                                backgroundColor: '#2563eb',
                                borderRadius: '6px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.75rem',
                                color: 'white',
                                fontWeight: '700'
                            }}>
                                2
                            </div>
                            Pet Selection
                        </h2>

                        <PetSelectForm
                            client={selectedClient}
                            pets={clientPets}
                            selectedPet={selectedPet}
                            onPetChange={handlePetChange}
                        />
                    </div>
                )}

                {/* Visit Information Section - Only show if pet is selected */}
                {selectedClient && selectedPet && (
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        padding: '2rem',
                        marginBottom: '2rem',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                        border: '1px solid #e2e8f0'
                    }}>
                        <h2 style={{
                            fontSize: '1.25rem',
                            fontWeight: '600',
                            color: '#1e293b',
                            marginBottom: '1.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}>
                            <div style={{
                                width: '24px',
                                height: '24px',
                                backgroundColor: '#2563eb',
                                borderRadius: '6px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.75rem',
                                color: 'white',
                                fontWeight: '700'
                            }}>
                                3
                            </div>
                            Visit Information
                        </h2>

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                            gap: '1.5rem',
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
                                    Visit Date *
                                </label>
                                <input
                                    type="date"
                                    required
                                    value={visitInfo.visitDate}
                                    onChange={(e) => setVisitInfo({ ...visitInfo, visitDate: e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '8px',
                                        fontSize: '1rem',
                                        outline: 'none',
                                        transition: 'border-color 0.2s ease',
                                        fontFamily: 'inherit',
                                        boxSizing: 'border-box'
                                    }}
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
                                    Reason for Visit / Diagnosis *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={visitInfo.diagnosis}
                                    onChange={(e) => setVisitInfo({ ...visitInfo, diagnosis: e.target.value })}
                                    placeholder="e.g., Routine checkup, UTI treatment, Surgery follow-up"
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '8px',
                                        fontSize: '1rem',
                                        outline: 'none',
                                        transition: 'border-color 0.2s ease',
                                        fontFamily: 'inherit',
                                        boxSizing: 'border-box'
                                    }}
                                    onFocus={(e) => e.target.style.borderColor = '#2563eb'}
                                    onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
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
                                Additional Notes
                            </label>
                            <textarea
                                value={visitInfo.notes}
                                onChange={(e) => setVisitInfo({ ...visitInfo, notes: e.target.value })}
                                placeholder="Additional discharge instructions, follow-up care, or other important information for the pet owner..."
                                rows={4}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '8px',
                                    fontSize: '1rem',
                                    outline: 'none',
                                    transition: 'border-color 0.2s ease',
                                    fontFamily: 'inherit',
                                    resize: 'vertical',
                                    boxSizing: 'border-box'
                                }}
                                onFocus={(e) => e.target.style.borderColor = '#2563eb'}
                                onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                            />
                        </div>
                    </div>
                )}

                {/* Medications Section - Only show if visit info is complete */}
                {selectedClient && selectedPet && visitInfo.visitDate && visitInfo.diagnosis && (
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        padding: '2rem',
                        marginBottom: '2rem',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                        border: '1px solid #e2e8f0'
                    }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '1.5rem'
                        }}>
                            <h2 style={{
                                fontSize: '1.25rem',
                                fontWeight: '600',
                                color: '#1e293b',
                                margin: '0',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}>
                                <div style={{
                                    width: '24px',
                                    height: '24px',
                                    backgroundColor: '#2563eb',
                                    borderRadius: '6px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.75rem',
                                    color: 'white',
                                    fontWeight: '700'
                                }}>
                                    4
                                </div>
                                Medications ({medications.length})
                            </h2>

                            <button
                                onClick={handleAddMedication}
                                style={{
                                    backgroundColor: '#2563eb',
                                    color: 'white',
                                    border: 'none',
                                    padding: '0.75rem 1.5rem',
                                    borderRadius: '8px',
                                    fontSize: '0.875rem',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    transition: 'background-color 0.2s ease',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1d4ed8'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="12" y1="5" x2="12" y2="19" />
                                    <line x1="5" y1="12" x2="19" y2="12" />
                                </svg>
                                Add Medication
                            </button>
                        </div>

                        {medications.length === 0 ? (
                            <div style={{
                                textAlign: 'center',
                                padding: '3rem 2rem',
                                color: '#6b7280',
                                backgroundColor: '#f9fafb',
                                borderRadius: '8px',
                                border: '2px dashed #d1d5db'
                            }}>
                                <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>💊</div>
                                <p style={{ fontSize: '1.125rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                                    No medications added yet
                                </p>
                                <p style={{ fontSize: '0.875rem', margin: '0' }}>
                                    Click &quot;Add Medication&quot; to get started
                                </p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {medications.map((medication, index) => (
                                    <MedicationForm
                                        key={index}
                                        medication={medication}
                                        index={index}
                                        onUpdate={handleUpdateMedication}
                                        onRemove={handleRemoveMedication}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Final Review & Save - Only show if medications are added */}
                {selectedClient && selectedPet && visitInfo.visitDate && visitInfo.diagnosis && medications.length > 0 && (
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        padding: '2rem',
                        marginBottom: '2rem',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                        border: '1px solid #e2e8f0'
                    }}>
                        <h2 style={{
                            fontSize: '1.25rem',
                            fontWeight: '600',
                            color: '#1e293b',
                            marginBottom: '1rem'
                        }}>
                            🎉 Ready to Create Discharge Summary!
                        </h2>

                        {/* Summary Cards */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                            gap: '1rem',
                            marginBottom: '2rem'
                        }}>
                            <div style={{
                                padding: '1rem',
                                backgroundColor: '#f0f9ff',
                                borderRadius: '8px',
                                border: '1px solid #0ea5e9'
                            }}>
                                <h3 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#0c4a6e', margin: '0 0 0.5rem 0' }}>
                                    👤 Client & Pet
                                </h3>
                                <p style={{ margin: '0', fontSize: '0.875rem', color: '#0c4a6e' }}>
                                    {selectedClient.firstName} {selectedClient.lastName}
                                </p>
                                <p style={{ margin: '0', fontSize: '0.75rem', color: '#075985' }}>
                                    {selectedPet.name} ({selectedPet.species})
                                </p>
                            </div>
                            <div style={{
                                padding: '1rem',
                                backgroundColor: '#f0f9ff',
                                borderRadius: '8px',
                                border: '1px solid #0ea5e9'
                            }}>
                                <h3 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#0c4a6e', margin: '0 0 0.5rem 0' }}>
                                    🏥 Visit
                                </h3>
                                <p style={{ margin: '0', fontSize: '0.875rem', color: '#0c4a6e' }}>
                                    {new Date(visitInfo.visitDate).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric'
                                    })}
                                </p>
                                <p style={{ margin: '0', fontSize: '0.75rem', color: '#075985' }}>
                                    {visitInfo.diagnosis}
                                </p>
                            </div>
                            <div style={{
                                padding: '1rem',
                                backgroundColor: '#f0f9ff',
                                borderRadius: '8px',
                                border: '1px solid #0ea5e9'
                            }}>
                                <h3 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#0c4a6e', margin: '0 0 0.5rem 0' }}>
                                    💊 Medications
                                </h3>
                                <p style={{ margin: '0', fontSize: '0.875rem', color: '#0c4a6e' }}>
                                    {medications.length} medication{medications.length === 1 ? '' : 's'}
                                </p>
                                <p style={{ margin: '0', fontSize: '0.75rem', color: '#075985' }}>
                                    {medications.map(m => m.name).filter(Boolean).join(', ') || 'Names not set'}
                                </p>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'center',
                            gap: '1rem'
                        }}>
                            <button
                                style={{
                                    backgroundColor: 'white',
                                    color: '#6b7280',
                                    border: '1px solid #d1d5db',
                                    padding: '0.75rem 1.5rem',
                                    borderRadius: '8px',
                                    fontSize: '0.875rem',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = '#f3f4f6';
                                    e.currentTarget.style.color = '#4b5563';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'white';
                                    e.currentTarget.style.color = '#6b7280';
                                }}
                                onClick={() => {
                                    // TODO: Save as draft functionality
                                    alert('Save as draft functionality coming soon!');
                                }}
                                disabled={saving}
                            >
                                Save as Draft
                            </button>

                            <button
                                style={{
                                    backgroundColor: saving ? '#9ca3af' : '#16a34a',
                                    color: 'white',
                                    border: 'none',
                                    padding: '0.75rem 2rem',
                                    borderRadius: '8px',
                                    fontSize: '0.875rem',
                                    fontWeight: '600',
                                    cursor: saving ? 'not-allowed' : 'pointer',
                                    transition: 'background-color 0.2s ease',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}
                                onMouseEnter={(e) => {
                                    if (!saving) {
                                        e.currentTarget.style.backgroundColor = '#15803d';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!saving) {
                                        e.currentTarget.style.backgroundColor = '#16a34a';
                                    }
                                }}
                                onClick={handleCreateDischarge}
                                disabled={saving}
                            >
                                {saving ? (
                                    <>
                                        <div style={{
                                            width: '16px',
                                            height: '16px',
                                            border: '2px solid transparent',
                                            borderTop: '2px solid white',
                                            borderRadius: '50%',
                                            animation: 'spin 1s linear infinite'
                                        }} />
                                        Creating Discharge...
                                    </>
                                ) : (
                                    <>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="20,6 9,17 4,12" />
                                        </svg>
                                        Create Discharge Summary
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {/* Next Steps Preview - Only show if visit info is complete but no medications */}
                {selectedClient && selectedPet && visitInfo.visitDate && visitInfo.diagnosis && medications.length === 0 && (
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        padding: '2rem',
                        marginBottom: '2rem',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                        border: '1px solid #e2e8f0'
                    }}>
                        <h2 style={{
                            fontSize: '1.25rem',
                            fontWeight: '600',
                            color: '#1e293b',
                            marginBottom: '1rem'
                        }}>
                            ✅ Ready for Step 4: Medications
                        </h2>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                            gap: '1rem',
                            marginBottom: '1rem'
                        }}>
                            <div style={{
                                padding: '1rem',
                                backgroundColor: '#f0f9ff',
                                borderRadius: '8px',
                                border: '1px solid #0ea5e9'
                            }}>
                                <h3 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#0c4a6e', margin: '0 0 0.5rem 0' }}>
                                    👤 Client
                                </h3>
                                <p style={{ margin: '0', fontSize: '0.875rem', color: '#0c4a6e' }}>
                                    {selectedClient.firstName} {selectedClient.lastName}
                                </p>
                            </div>
                            <div style={{
                                padding: '1rem',
                                backgroundColor: '#f0f9ff',
                                borderRadius: '8px',
                                border: '1px solid #0ea5e9'
                            }}>
                                <h3 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#0c4a6e', margin: '0 0 0.5rem 0' }}>
                                    🐾 Pet
                                </h3>
                                <p style={{ margin: '0', fontSize: '0.875rem', color: '#0c4a6e' }}>
                                    {selectedPet.name} ({selectedPet.species})
                                </p>
                            </div>
                            <div style={{
                                padding: '1rem',
                                backgroundColor: '#f0f9ff',
                                borderRadius: '8px',
                                border: '1px solid #0ea5e9'
                            }}>
                                <h3 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#0c4a6e', margin: '0 0 0.5rem 0' }}>
                                    🏥 Visit
                                </h3>
                                <p style={{ margin: '0', fontSize: '0.875rem', color: '#0c4a6e' }}>
                                    {new Date(visitInfo.visitDate).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric'
                                    })}
                                </p>
                                <p style={{ margin: '0', fontSize: '0.75rem', color: '#075985' }}>
                                    {visitInfo.diagnosis}
                                </p>
                            </div>
                        </div>
                        <p style={{
                            color: '#6b7280',
                            marginBottom: '1rem',
                            textAlign: 'center'
                        }}>
                            Add medications and dosing instructions to complete the discharge
                        </p>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'center'
                        }}>
                            <button
                                style={{
                                    backgroundColor: '#2563eb',
                                    color: 'white',
                                    border: 'none',
                                    padding: '0.75rem 2rem',
                                    borderRadius: '8px',
                                    fontSize: '0.875rem',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    transition: 'background-color 0.2s ease',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1d4ed8'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                                onClick={handleAddMedication}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="12" y1="5" x2="12" y2="19" />
                                    <line x1="5" y1="12" x2="19" y2="12" />
                                </svg>
                                Add First Medication
                            </button>
                        </div>
                    </div>
                )}

                {/* Next Steps Preview - Only show if both client and pet are selected but visit info incomplete */}
                {selectedClient && selectedPet && (!visitInfo.visitDate || !visitInfo.diagnosis) && (
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        padding: '2rem',
                        marginBottom: '2rem',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                        border: '1px solid #e2e8f0'
                    }}>
                        <h2 style={{
                            fontSize: '1.25rem',
                            fontWeight: '600',
                            color: '#1e293b',
                            marginBottom: '1rem'
                        }}>
                            ✅ Ready for Next Step!
                        </h2>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '1rem',
                            marginBottom: '1rem'
                        }}>
                            <div style={{
                                padding: '1rem',
                                backgroundColor: '#f0f9ff',
                                borderRadius: '8px',
                                border: '1px solid #0ea5e9'
                            }}>
                                <h3 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#0c4a6e', margin: '0 0 0.5rem 0' }}>
                                    👤 Client
                                </h3>
                                <p style={{ margin: '0', fontSize: '0.875rem', color: '#0c4a6e' }}>
                                    {selectedClient.firstName} {selectedClient.lastName}
                                </p>
                            </div>
                            <div style={{
                                padding: '1rem',
                                backgroundColor: '#f0f9ff',
                                borderRadius: '8px',
                                border: '1px solid #0ea5e9'
                            }}>
                                <h3 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#0c4a6e', margin: '0 0 0.5rem 0' }}>
                                    🐾 Pet
                                </h3>
                                <p style={{ margin: '0', fontSize: '0.875rem', color: '#0c4a6e' }}>
                                    {selectedPet.name} ({selectedPet.species})
                                </p>
                            </div>
                        </div>
                        <p style={{
                            color: '#6b7280',
                            marginBottom: '1rem',
                            textAlign: 'center'
                        }}>
                            Complete visit information above to continue to medications
                        </p>
                    </div>
                )}
            </main>

            <style jsx>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}