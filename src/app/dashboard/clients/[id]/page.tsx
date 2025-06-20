// src/app/dashboard/clients/[id]/page.tsx - Phase 1: Fixed unused imports
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { doc, getDoc, collection, query, where, orderBy, getDocs, limit, updateDoc } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { db } from '@/lib/firebase';
import { COLLECTIONS, Client, Pet } from '@/types/firestore';
import PetModal from '@/components/PetModal';
import { formatPetDisplay } from '@/utils/petUtils';

// Extended Pet interface for the detail view (adds computed fields)
interface PetWithMedications extends Pet {
    activeMedications: number;
    lastDischargeDate?: Date;
}

interface RecentActivity {
    id: string;
    type: 'discharge' | 'sync_activity';
    petName: string;
    description: string;
    date: Date;
    adherenceRate?: number;
}

export default function ClientDetailPage() {
    const { id } = useParams();
    const { vetUser, clinic } = useAuth();
    const { loading: authLoading } = useRequireAuth();

    // Progressive loading states
    const [client, setClient] = useState<Client | null>(null);
    const [pets, setPets] = useState<PetWithMedications[]>([]);
    const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);

    const [loadingClient, setLoadingClient] = useState(true);
    const [loadingPets, setLoadingPets] = useState(true);
    const [loadingActivity, setLoadingActivity] = useState(true);
    const [error, setError] = useState('');

    // Edit state
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState<Partial<Client>>({});
    const [saving, setSaving] = useState(false);

    // Pet modal state
    const [showPetModal, setShowPetModal] = useState(false);
    const [petModalMode, setPetModalMode] = useState<'add' | 'edit'>('add');
    const [editingPet, setEditingPet] = useState<PetWithMedications | undefined>();

    // Load client info first
    useEffect(() => {
        if (!id || typeof id !== 'string' || !vetUser || !clinic) return;
        loadClient();
    }, [id, vetUser, clinic]);

    // Load pets after client
    useEffect(() => {
        if (client && !loadingClient) {
            loadPets();
        }
    }, [client, loadingClient, clinic]);

    // Load activity after pets
    useEffect(() => {
        if (pets.length >= 0 && !loadingPets) {
            loadRecentActivity();
        }
    }, [pets, loadingPets, client, clinic]);

    const loadClient = async () => {
        if (!id || !clinic) return;

        try {
            setLoadingClient(true);
            const clientDoc = await getDoc(doc(db, COLLECTIONS.CLIENTS, id as string));

            if (!clientDoc.exists()) {
                setError('Client not found');
                return;
            }

            const data = clientDoc.data();

            // Verify client belongs to this clinic
            if (data.clinicId !== clinic.id) {
                setError('Access denied');
                return;
            }

            const clientData: Client = {
                id: clientDoc.id,
                firstName: data.firstName || '',
                lastName: data.lastName || '',
                email: data.email || '',
                phone: data.phone || '',
                address: data.address || { street: '', city: '', state: '', zipCode: '' },
                clinicId: data.clinicId || '',
                isActive: data.isActive ?? true,
                notes: data.notes || '',
                createdAt: data.createdAt?.toDate() || new Date(),
                updatedAt: data.updatedAt?.toDate() || new Date()
            };

            setClient(clientData);
            setEditForm(clientData);

        } catch (err) {
            console.error('Error loading client:', err);
            setError('Failed to load client information');
        } finally {
            setLoadingClient(false);
        }
    };

    const loadPets = async () => {
        if (!client || !clinic) return;

        try {
            setLoadingPets(true);

            // Get pets for this client
            const petsQuery = query(
                collection(db, COLLECTIONS.PETS),
                where('clientId', '==', client.id),
                where('isActive', '==', true),
                orderBy('createdAt', 'desc')
            );

            const petsSnapshot = await getDocs(petsQuery);

            // Process pets with active medication counts
            const petsData: PetWithMedications[] = await Promise.all(
                petsSnapshot.docs.map(async (petDoc) => {
                    const petData = petDoc.data();

                    // Get active medication count (simplified - looking at recent discharges)
                    let activeMedications = 0;
                    let lastDischargeDate: Date | undefined;

                    try {
                        const dischargesQuery = query(
                            collection(db, COLLECTIONS.DISCHARGES),
                            where('clinicId', '==', clinic.id),
                            orderBy('createdAt', 'desc'),
                            limit(10)
                        );
                        const dischargesSnapshot = await getDocs(dischargesQuery);

                        // Find discharges for this pet (by name matching)
                        dischargesSnapshot.docs.forEach(dischargeDoc => {
                            const discharge = dischargeDoc.data();
                            if (discharge.pet?.name === petData.name) {
                                activeMedications = discharge.medications?.length || 0;
                                if (!lastDischargeDate && discharge.createdAt) {
                                    lastDischargeDate = discharge.createdAt.toDate();
                                }
                            }
                        });
                    } catch (error) {
                        console.error('Error getting medications for pet:', error);
                    }

                    const pet: PetWithMedications = {
                        id: petDoc.id,
                        name: petData.name || '',
                        species: petData.species || '',
                        breed: petData.breed || '',
                        weight: petData.weight || '',
                        dateOfBirth: petData.dateOfBirth?.toDate(),
                        microchipNumber: petData.microchipNumber || '',
                        clientId: petData.clientId || '',
                        clinicId: petData.clinicId || '',
                        isActive: petData.isActive ?? true,
                        notes: petData.notes || '',
                        createdAt: petData.createdAt?.toDate() || new Date(),
                        updatedAt: petData.updatedAt?.toDate() || new Date(),
                        activeMedications,
                        lastDischargeDate
                    };

                    return pet;
                })
            );

            setPets(petsData);

        } catch (err) {
            console.error('Error loading pets:', err);
        } finally {
            setLoadingPets(false);
        }
    };

    const loadRecentActivity = async () => {
        if (!client || !clinic) return;

        try {
            setLoadingActivity(true);

            // Get recent discharges related to this client's pets
            const dischargesQuery = query(
                collection(db, COLLECTIONS.DISCHARGES),
                where('clinicId', '==', clinic.id),
                orderBy('createdAt', 'desc'),
                limit(20)
            );

            const dischargesSnapshot = await getDocs(dischargesQuery);
            const activities: RecentActivity[] = [];

            // Filter and process discharges for this client's pets
            dischargesSnapshot.docs.forEach(dischargeDoc => {
                const discharge = dischargeDoc.data();
                const petName = discharge.pet?.name;

                // Check if this discharge is for one of this client's pets
                if (pets.some(pet => pet.name === petName)) {
                    activities.push({
                        id: dischargeDoc.id,
                        type: 'discharge',
                        petName,
                        description: `Discharge created with ${discharge.medications?.length || 0} medication${discharge.medications?.length === 1 ? '' : 's'}`,
                        date: discharge.createdAt?.toDate() || new Date(),
                        adherenceRate: Math.floor(Math.random() * 20) + 80 // Placeholder
                    });
                }
            });

            setRecentActivity(activities.slice(0, 10));

        } catch (err) {
            console.error('Error loading recent activity:', err);
        } finally {
            setLoadingActivity(false);
        }
    };

    const handleEditClient = async () => {
        if (!client) return;

        setSaving(true);
        try {
            const updateData = {
                firstName: editForm.firstName || '',
                lastName: editForm.lastName || '',
                email: editForm.email || '',
                phone: editForm.phone || '',
                address: editForm.address || { street: '', city: '', state: '', zipCode: '' },
                notes: editForm.notes || '',
                updatedAt: new Date()
            };

            await updateDoc(doc(db, COLLECTIONS.CLIENTS, client.id), updateData);

            // Update local state
            setClient({ ...client, ...updateData });
            setIsEditing(false);

        } catch (error) {
            console.error('Error updating client:', error);
            alert('Failed to update client information');
        } finally {
            setSaving(false);
        }
    };

    // Pet modal handlers
    const handleAddPet = () => {
        setPetModalMode('add');
        setEditingPet(undefined);
        setShowPetModal(true);
    };

    const handleEditPet = (pet: PetWithMedications) => {
        setPetModalMode('edit');
        setEditingPet(pet);
        setShowPetModal(true);
    };

    const handlePetSaved = () => {
        // Refresh pets list
        loadPets();
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const formatTimeAgo = (date: Date) => {
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return '1 day ago';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
        return `${Math.floor(diffDays / 30)} months ago`;
    };

    if (authLoading || loadingClient) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '50vh',
                flexDirection: 'column',
                gap: '1rem'
            }}>
                <div style={{
                    width: '40px',
                    height: '40px',
                    border: '4px solid #e2e8f0',
                    borderTop: '4px solid #2563eb',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                }} />
                <div style={{ color: '#64748b', fontSize: '0.875rem' }}>
                    Loading client information...
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{
                backgroundColor: '#fef2f2',
                borderRadius: '12px',
                padding: '2rem',
                margin: '2rem',
                textAlign: 'center',
                border: '1px solid #fecaca'
            }}>
                <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⚠️</div>
                <h2 style={{ color: '#dc2626', marginBottom: '0.5rem' }}>Error</h2>
                <p style={{ color: '#7f1d1d' }}>{error}</p>
                <Link href="/dashboard/clients" style={{
                    display: 'inline-block',
                    marginTop: '1rem',
                    color: '#2563eb',
                    textDecoration: 'none'
                }}>
                    ← Back to Clients
                </Link>
            </div>
        );
    }

    if (!client) {
        return null;
    }

    return (
        <div style={{
            padding: '2rem',
            maxWidth: '1200px',
            margin: '0 auto',
            fontFamily: 'Nunito, -apple-system, BlinkMacSystemFont, sans-serif'
        }}>
            {/* Header with Back Navigation */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '2rem',
                gap: '1rem'
            }}>
                <Link href="/dashboard/clients" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    color: '#64748b',
                    textDecoration: 'none',
                    fontSize: '0.875rem',
                    fontWeight: '600'
                }}>
                    ← Back to Clients
                </Link>
                <div style={{
                    width: '1px',
                    height: '1rem',
                    backgroundColor: '#e2e8f0'
                }} />
                <h1 style={{
                    fontSize: '1.875rem',
                    fontWeight: '700',
                    color: '#1e293b',
                    margin: '0'
                }}>
                    {client.firstName} {client.lastName}
                </h1>
                <div style={{
                    backgroundColor: client.isActive ? '#dcfce7' : '#fee2e2',
                    color: client.isActive ? '#166534' : '#dc2626',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '9999px',
                    fontSize: '0.75rem',
                    fontWeight: '600'
                }}>
                    {client.isActive ? 'Active' : 'Inactive'}
                </div>
            </div>

            {/* Client Information Card */}
            <div style={{
                backgroundColor: 'white',
                borderRadius: '16px',
                padding: '2rem',
                marginBottom: '2rem',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                border: '1px solid #e2e8f0'
            }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '1.5rem'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem'
                    }}>
                        <div style={{
                            width: '60px',
                            height: '60px',
                            borderRadius: '50%',
                            backgroundColor: '#007AFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: '1.5rem',
                            fontWeight: '700'
                        }}>
                            {client.firstName[0]?.toUpperCase()}{client.lastName[0]?.toUpperCase()}
                        </div>
                        <div>
                            <h2 style={{
                                fontSize: '1.5rem',
                                fontWeight: '700',
                                color: '#1e293b',
                                margin: '0 0 0.25rem 0'
                            }}>
                                {client.firstName} {client.lastName}
                            </h2>
                            <div style={{
                                fontSize: '0.875rem',
                                color: '#64748b'
                            }}>
                                Client since {formatDate(client.createdAt)}
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsEditing(!isEditing)}
                        style={{
                            backgroundColor: isEditing ? '#f1f5f9' : '#007AFF',
                            color: isEditing ? '#64748b' : 'white',
                            border: isEditing ? '1px solid #e2e8f0' : 'none',
                            padding: '0.75rem 1.5rem',
                            borderRadius: '8px',
                            fontSize: '0.875rem',
                            fontWeight: '600',
                            cursor: 'pointer'
                        }}
                    >
                        {isEditing ? 'Cancel' : 'Edit Info'}
                    </button>
                </div>

                {isEditing ? (
                    <div>
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
                                    First Name
                                </label>
                                <input
                                    type="text"
                                    value={editForm.firstName || ''}
                                    onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '8px',
                                        fontSize: '1rem',
                                        outline: 'none',
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
                                    Last Name
                                </label>
                                <input
                                    type="text"
                                    value={editForm.lastName || ''}
                                    onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '8px',
                                        fontSize: '1rem',
                                        outline: 'none',
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
                                    Email
                                </label>
                                <input
                                    type="email"
                                    value={editForm.email || ''}
                                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '8px',
                                        fontSize: '1rem',
                                        outline: 'none',
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
                                    Phone
                                </label>
                                <input
                                    type="tel"
                                    value={editForm.phone || ''}
                                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '8px',
                                        fontSize: '1rem',
                                        outline: 'none',
                                        boxSizing: 'border-box'
                                    }}
                                />
                            </div>
                        </div>
                        <div style={{
                            marginBottom: '1rem'
                        }}>
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
                                value={editForm.notes || ''}
                                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
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
                                placeholder="Additional notes about this client..."
                            />
                        </div>
                        <div style={{
                            display: 'flex',
                            gap: '1rem',
                            justifyContent: 'flex-end'
                        }}>
                            <button
                                onClick={() => setIsEditing(false)}
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
                                onClick={handleEditClient}
                                disabled={saving}
                                style={{
                                    backgroundColor: saving ? '#94a3b8' : '#16a34a',
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
                                {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '1.5rem'
                    }}>
                        <div>
                            <div style={{
                                fontSize: '0.875rem',
                                color: '#64748b',
                                fontWeight: '600',
                                marginBottom: '0.25rem'
                            }}>
                                EMAIL
                            </div>
                            <div style={{
                                fontSize: '1rem',
                                color: '#1e293b'
                            }}>
                                {client.email || 'Not provided'}
                            </div>
                        </div>
                        <div>
                            <div style={{
                                fontSize: '0.875rem',
                                color: '#64748b',
                                fontWeight: '600',
                                marginBottom: '0.25rem'
                            }}>
                                PHONE
                            </div>
                            <div style={{
                                fontSize: '1rem',
                                color: '#1e293b'
                            }}>
                                {client.phone || 'Not provided'}
                            </div>
                        </div>
                        <div>
                            <div style={{
                                fontSize: '0.875rem',
                                color: '#64748b',
                                fontWeight: '600',
                                marginBottom: '0.25rem'
                            }}>
                                ADDRESS
                            </div>
                            <div style={{
                                fontSize: '1rem',
                                color: '#1e293b'
                            }}>
                                {client.address?.street ?
                                    `${client.address.street}, ${client.address.city}, ${client.address.state} ${client.address.zipCode}` :
                                    'Not provided'
                                }
                            </div>
                        </div>
                        <div>
                            <div style={{
                                fontSize: '0.875rem',
                                color: '#64748b',
                                fontWeight: '600',
                                marginBottom: '0.25rem'
                            }}>
                                TOTAL PETS
                            </div>
                            <div style={{
                                fontSize: '1rem',
                                color: '#1e293b'
                            }}>
                                {pets.length}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Pets Section */}
            <div style={{
                backgroundColor: 'white',
                borderRadius: '16px',
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
                    <h3 style={{
                        fontSize: '1.5rem',
                        fontWeight: '700',
                        color: '#1e293b',
                        margin: '0',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}>
                        🐾 Pets ({pets.length})
                    </h3>
                    <button
                        onClick={handleAddPet}
                        style={{
                            backgroundColor: '#34C759',
                            color: 'white',
                            border: 'none',
                            padding: '0.75rem 1.5rem',
                            borderRadius: '8px',
                            fontSize: '0.875rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}
                    >
                        + Add Pet
                    </button>
                </div>

                {loadingPets ? (
                    <div style={{
                        textAlign: 'center',
                        padding: '3rem',
                        color: '#64748b'
                    }}>
                        <div style={{
                            width: '32px',
                            height: '32px',
                            border: '3px solid #e2e8f0',
                            borderTop: '3px solid #2563eb',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite',
                            margin: '0 auto 1rem auto'
                        }} />
                        Loading pets...
                    </div>
                ) : pets.length === 0 ? (
                    <div style={{
                        textAlign: 'center',
                        padding: '3rem',
                        color: '#6b7280',
                        backgroundColor: '#f9fafb',
                        borderRadius: '8px',
                        border: '2px dashed #d1d5db'
                    }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🐾</div>
                        <h4 style={{
                            fontSize: '1.125rem',
                            fontWeight: '600',
                            marginBottom: '0.5rem',
                            color: '#374151'
                        }}>
                            No pets yet
                        </h4>
                        <p style={{ fontSize: '0.875rem', marginBottom: '1rem' }}>
                            Add the first pet for {client.firstName} to get started.
                        </p>
                        <button
                            onClick={handleAddPet}
                            style={{
                                backgroundColor: '#34C759',
                                color: 'white',
                                border: 'none',
                                padding: '0.75rem 1.5rem',
                                borderRadius: '8px',
                                fontSize: '0.875rem',
                                fontWeight: '600',
                                cursor: 'pointer'
                            }}
                        >
                            + Add First Pet
                        </button>
                    </div>
                ) : (
                    <div style={{
                        display: 'grid',
                        gap: '1rem'
                    }}>
                        {pets.map((pet) => (
                            <div
                                key={pet.id}
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '1.5rem',
                                    backgroundColor: '#f8fafc',
                                    borderRadius: '12px',
                                    border: '1px solid #e2e8f0'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{
                                        width: '48px',
                                        height: '48px',
                                        borderRadius: '50%',
                                        backgroundColor: '#007AFF',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '1.5rem'
                                    }}>
                                        🐾
                                    </div>
                                    <div>
                                        <div style={{
                                            fontSize: '1.125rem',
                                            fontWeight: '700',
                                            color: '#1e293b',
                                            marginBottom: '0.25rem'
                                        }}>
                                            {pet.name}
                                        </div>
                                        <div style={{
                                            fontSize: '0.875rem',
                                            color: '#64748b'
                                        }}>
                                            {formatPetDisplay(pet)}
                                        </div>
                                        {pet.lastDischargeDate && (
                                            <div style={{
                                                fontSize: '0.75rem',
                                                color: '#94a3b8',
                                                marginTop: '0.25rem'
                                            }}>
                                                Last visit: {formatTimeAgo(pet.lastDischargeDate)}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '1rem'
                                }}>
                                    {/* Active Medications */}
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{
                                            fontSize: '1.25rem',
                                            fontWeight: '700',
                                            color: pet.activeMedications > 0 ? '#16a34a' : '#64748b'
                                        }}>
                                            {pet.activeMedications}
                                        </div>
                                        <div style={{
                                            fontSize: '0.75rem',
                                            color: '#64748b',
                                            fontWeight: '600'
                                        }}>
                                            Active Meds
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div style={{
                                        display: 'flex',
                                        gap: '0.5rem'
                                    }}>
                                        <button
                                            onClick={() => handleEditPet(pet)}
                                            style={{
                                                backgroundColor: 'white',
                                                color: '#007AFF',
                                                border: '1px solid #007AFF',
                                                padding: '0.5rem 0.75rem',
                                                borderRadius: '6px',
                                                fontSize: '0.75rem',
                                                fontWeight: '600',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Edit Pet
                                        </button>
                                        {pet.activeMedications > 0 && (
                                            <button
                                                style={{
                                                    backgroundColor: '#007AFF',
                                                    color: 'white',
                                                    border: 'none',
                                                    padding: '0.5rem 0.75rem',
                                                    borderRadius: '6px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: '600',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                View Meds
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {pets.length > 0 && (
                    <div style={{
                        marginTop: '1rem',
                        padding: '1rem',
                        backgroundColor: '#f0f9ff',
                        borderRadius: '8px',
                        border: '1px solid #0ea5e9'
                    }}>
                        <div style={{
                            fontSize: '0.875rem',
                            color: '#0c4a6e',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}>
                            <div style={{ fontSize: '1rem' }}>💡</div>
                            <div>
                                <strong>Current Medications:</strong> {pets.reduce((total, pet) => total + pet.activeMedications, 0)} active prescription{pets.reduce((total, pet) => total + pet.activeMedications, 0) === 1 ? '' : 's'}
                                <span style={{ color: '#64748b' }}> • Click &quot;View Meds&quot; to see details and sync data</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Recent Activity Section */}
            <div style={{
                backgroundColor: 'white',
                borderRadius: '16px',
                padding: '2rem',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                border: '1px solid #e2e8f0'
            }}>
                <h3 style={{
                    fontSize: '1.5rem',
                    fontWeight: '700',
                    color: '#1e293b',
                    marginBottom: '1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                }}>
                    📊 Recent Activity
                </h3>

                {loadingActivity ? (
                    <div style={{
                        textAlign: 'center',
                        padding: '3rem',
                        color: '#64748b'
                    }}>
                        <div style={{
                            width: '32px',
                            height: '32px',
                            border: '3px solid #e2e8f0',
                            borderTop: '3px solid #2563eb',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite',
                            margin: '0 auto 1rem auto'
                        }} />
                        Loading recent activity...
                    </div>
                ) : recentActivity.length === 0 ? (
                    <div style={{
                        textAlign: 'center',
                        padding: '3rem',
                        color: '#6b7280'
                    }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📊</div>
                        <h4 style={{
                            fontSize: '1.125rem',
                            fontWeight: '600',
                            marginBottom: '0.5rem',
                            color: '#374151'
                        }}>
                            No recent activity
                        </h4>
                        <p style={{ fontSize: '0.875rem' }}>
                            Activity will appear here when pets have medications and sync with the mobile app.
                        </p>
                    </div>
                ) : (
                    <div style={{
                        display: 'grid',
                        gap: '1rem'
                    }}>
                        {recentActivity.map((activity) => (
                            <div
                                key={activity.id}
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '1rem',
                                    backgroundColor: '#f8fafc',
                                    borderRadius: '8px',
                                    border: '1px solid #e2e8f0'
                                }}
                            >
                                <div>
                                    <div style={{
                                        fontSize: '0.875rem',
                                        fontWeight: '600',
                                        color: '#1e293b',
                                        marginBottom: '0.25rem'
                                    }}>
                                        {activity.petName} • {activity.description}
                                    </div>
                                    <div style={{
                                        fontSize: '0.75rem',
                                        color: '#64748b'
                                    }}>
                                        {formatTimeAgo(activity.date)}
                                    </div>
                                </div>
                                {activity.adherenceRate && (
                                    <div style={{
                                        fontSize: '0.875rem',
                                        fontWeight: '600',
                                        color: activity.adherenceRate >= 80 ? '#16a34a' : '#dc2626'
                                    }}>
                                        {activity.adherenceRate}% adherence
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Pet Modal */}
            {showPetModal && client && clinic && (
                <PetModal
                    client={client}
                    clinicId={clinic.id}
                    isOpen={showPetModal}
                    onClose={() => {
                        setShowPetModal(false);
                        setEditingPet(undefined);
                    }}
                    onPetSaved={handlePetSaved}
                    mode={petModalMode}
                    pet={editingPet}
                />
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