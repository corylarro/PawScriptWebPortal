// src/app/dashboard/clients/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { doc, getDoc, collection, query, where, orderBy, getDocs, limit, updateDoc } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { db } from '@/lib/firebase';
import { COLLECTIONS, Client, Pet } from '@/types/firestore';

// Extended Pet interface for the detail view (adds computed fields)
interface PetWithMedications extends Pet {
    activeMedications: number;
    lastDischargeDate?: Date;
}

// Updated interface for past visits (renamed from RecentActivity)
interface PastVisit {
    id: string;
    petName: string;
    medicationCount: number;
    date: Date;
    createdAt: Date;
}

export default function ClientDetailPage() {
    const { id } = useParams();
    const { vetUser, clinic } = useAuth();
    const { loading: authLoading } = useRequireAuth();

    // Progressive loading states
    const [client, setClient] = useState<Client | null>(null);
    const [pets, setPets] = useState<PetWithMedications[]>([]);
    const [pastVisits, setPastVisits] = useState<PastVisit[]>([]);

    const [loadingClient, setLoadingClient] = useState(true);
    const [loadingPets, setLoadingPets] = useState(true);
    const [loadingVisits, setLoadingVisits] = useState(true);
    const [error, setError] = useState('');

    // Edit state
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState<Partial<Client>>({});
    const [saving, setSaving] = useState(false);

    // Load client info first
    useEffect(() => {
        if (!id || typeof id !== 'string' || !vetUser || !clinic) return;
        loadClient();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, vetUser, clinic]);

    // Load pets after client
    useEffect(() => {
        if (client && !loadingClient) {
            loadPets();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [client, loadingClient]);

    // Load past visits after pets
    useEffect(() => {
        if (pets.length >= 0 && !loadingPets) {
            loadPastVisits();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pets, loadingPets]);

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
            if (data?.clinicId !== clinic.id) {
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

    const loadPastVisits = async () => {
        if (!client || !clinic) return;

        try {
            setLoadingVisits(true);

            // Get all discharges related to this client's pets
            const dischargesQuery = query(
                collection(db, COLLECTIONS.DISCHARGES),
                where('clinicId', '==', clinic.id),
                orderBy('createdAt', 'desc'),
                limit(50) // Increased limit to get more comprehensive history
            );

            const dischargesSnapshot = await getDocs(dischargesQuery);
            const visits: PastVisit[] = [];

            // Filter and process discharges for this client's pets
            dischargesSnapshot.docs.forEach(dischargeDoc => {
                const discharge = dischargeDoc.data();
                const petName = discharge.pet?.name;

                // Check if this discharge is for one of this client's pets
                if (pets.some(pet => pet.name === petName)) {
                    visits.push({
                        id: dischargeDoc.id,
                        petName,
                        medicationCount: discharge.medications?.length || 0,
                        date: discharge.createdAt?.toDate() || new Date(),
                        createdAt: discharge.createdAt?.toDate() || new Date()
                    });
                }
            });

            // Sort by date (newest first)
            visits.sort((a, b) => b.date.getTime() - a.date.getTime());
            setPastVisits(visits);

        } catch (err) {
            console.error('Error loading past visits:', err);
        } finally {
            setLoadingVisits(false);
        }
    };

    const handleSaveClient = async () => {
        if (!client || !editForm) return;

        try {
            setSaving(true);

            const updateData = {
                firstName: editForm.firstName || '',
                lastName: editForm.lastName || '',
                email: editForm.email || '',
                phone: editForm.phone || '',
                address: editForm.address || { street: '', city: '', state: '', zipCode: '' },
                updatedAt: new Date()
            };

            await updateDoc(doc(db, COLLECTIONS.CLIENTS, client.id), updateData);

            // Update local state
            setClient({ ...client, ...updateData });
            setIsEditing(false);

        } catch (err) {
            console.error('Error saving client:', err);
        } finally {
            setSaving(false);
        }
    };

    const formatRelativeTime = (date: Date) => {
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const diffWeeks = Math.floor(diffDays / 7);
        const diffMonths = Math.floor(diffDays / 30);

        if (diffDays === 0) {
            return 'Today';
        } else if (diffDays === 1) {
            return '1 day ago';
        } else if (diffDays < 7) {
            return `${diffDays} days ago`;
        } else if (diffWeeks === 1) {
            return '1 week ago';
        } else if (diffWeeks < 4) {
            return `${diffWeeks} weeks ago`;
        } else if (diffMonths === 1) {
            return '1 month ago';
        } else {
            return `${diffMonths} months ago`;
        }
    };

    if (authLoading || loadingClient) {
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
                        borderTop: '3px solid #007AFF',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        margin: '0 auto 1rem auto'
                    }} />
                    <p style={{ color: '#64748b', fontSize: '1rem' }}>Loading client details...</p>
                </div>
            </div>
        );
    }

    if (error || !client) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#f8fafc'
            }}>
                <div style={{ textAlign: 'center', maxWidth: '400px' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🐾</div>
                    <h1 style={{
                        fontSize: '1.5rem',
                        fontWeight: '600',
                        color: '#dc2626',
                        marginBottom: '0.5rem'
                    }}>
                        Client Not Found
                    </h1>
                    <p style={{
                        color: '#6b7280',
                        marginBottom: '2rem'
                    }}>
                        {error || 'This client may have been removed or you may not have access.'}
                    </p>
                    <Link
                        href="/dashboard/clients"
                        style={{
                            backgroundColor: '#007AFF',
                            color: 'white',
                            padding: '0.75rem 1.5rem',
                            borderRadius: '8px',
                            textDecoration: 'none',
                            fontWeight: '600'
                        }}
                    >
                        Back to Clients
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: '#f8fafc',
            fontFamily: 'Nunito, system-ui, sans-serif'
        }}>
            {/* Header */}
            <div style={{
                backgroundColor: 'white',
                borderBottom: '1px solid #e2e8f0',
                padding: '1rem 2rem'
            }}>
                <div style={{
                    maxWidth: '1200px',
                    margin: '0 auto',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    {/* Logo & Navigation */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                        <Link
                            href="/dashboard"
                            style={{
                                fontSize: '1.5rem',
                                fontWeight: '700',
                                color: '#007AFF',
                                textDecoration: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}
                        >
                            🐾 PawScript
                        </Link>

                        <nav style={{ display: 'flex', gap: '1rem' }}>
                            <Link
                                href="/dashboard"
                                style={{
                                    color: '#64748b',
                                    textDecoration: 'none',
                                    fontSize: '0.875rem',
                                    fontWeight: '500'
                                }}
                            >
                                Dashboard
                            </Link>
                            <Link
                                href="/dashboard/clients"
                                style={{
                                    color: '#007AFF',
                                    textDecoration: 'none',
                                    fontSize: '0.875rem',
                                    fontWeight: '600',
                                    borderBottom: '2px solid #007AFF',
                                    paddingBottom: '0.25rem'
                                }}
                            >
                                Clients & Pets
                            </Link>
                        </nav>
                    </div>

                    {/* User Info */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem'
                    }}>
                        <div style={{
                            width: '32px',
                            height: '32px',
                            backgroundColor: '#007AFF',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: '0.875rem',
                            fontWeight: '600'
                        }}>
                            {vetUser?.firstName?.[0] || 'U'}
                        </div>
                        <div>
                            <div style={{
                                fontSize: '0.875rem',
                                fontWeight: '600',
                                color: '#1e293b'
                            }}>
                                Dr. {vetUser?.firstName} {vetUser?.lastName}
                            </div>
                            <div style={{
                                fontSize: '0.75rem',
                                color: '#64748b'
                            }}>
                                {clinic?.name}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div style={{
                maxWidth: '1200px',
                margin: '0 auto',
                padding: '2rem'
            }}>
                {/* Client Info Section */}
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
                        <h1 style={{
                            fontSize: '1.875rem',
                            fontWeight: '700',
                            color: '#1e293b',
                            margin: 0,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}>
                            👤 {client.firstName} {client.lastName}
                        </h1>

                        <button
                            style={{
                                backgroundColor: isEditing ? '#6b7280' : '#007AFF',
                                color: 'white',
                                border: 'none',
                                padding: '0.75rem 1.5rem',
                                borderRadius: '8px',
                                fontSize: '0.875rem',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            }}
                            onClick={() => {
                                if (isEditing) {
                                    handleSaveClient();
                                } else {
                                    setIsEditing(true);
                                }
                            }}
                            disabled={saving}
                        >
                            {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Edit Client'}
                        </button>
                    </div>

                    {/* Client Details */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                        gap: '1.5rem'
                    }}>
                        <div>
                            <label style={{
                                display: 'block',
                                fontSize: '0.875rem',
                                fontWeight: '600',
                                color: '#374151',
                                marginBottom: '0.5rem'
                            }}>
                                Contact Information
                            </label>
                            {isEditing ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    <input
                                        type="email"
                                        value={editForm.email || ''}
                                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                        placeholder="Email"
                                        style={{
                                            padding: '0.75rem',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '6px',
                                            fontSize: '0.875rem'
                                        }}
                                    />
                                    <input
                                        type="tel"
                                        value={editForm.phone || ''}
                                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                        placeholder="Phone"
                                        style={{
                                            padding: '0.75rem',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '6px',
                                            fontSize: '0.875rem'
                                        }}
                                    />
                                </div>
                            ) : (
                                <div>
                                    <p style={{ margin: '0 0 0.5rem 0', color: '#4b5563' }}>
                                        📧 {client.email || 'No email provided'}
                                    </p>
                                    <p style={{ margin: '0', color: '#4b5563' }}>
                                        📞 {client.phone || 'No phone provided'}
                                    </p>
                                </div>
                            )}
                        </div>

                        <div>
                            <label style={{
                                display: 'block',
                                fontSize: '0.875rem',
                                fontWeight: '600',
                                color: '#374151',
                                marginBottom: '0.5rem'
                            }}>
                                Address
                            </label>
                            {isEditing ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    <input
                                        type="text"
                                        value={editForm.address?.street || ''}
                                        onChange={(e) => setEditForm({
                                            ...editForm,
                                            address: { ...editForm.address!, street: e.target.value }
                                        })}
                                        placeholder="Street Address"
                                        style={{
                                            padding: '0.75rem',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '6px',
                                            fontSize: '0.875rem'
                                        }}
                                    />
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <input
                                            type="text"
                                            value={editForm.address?.city || ''}
                                            onChange={(e) => setEditForm({
                                                ...editForm,
                                                address: { ...editForm.address!, city: e.target.value }
                                            })}
                                            placeholder="City"
                                            style={{
                                                flex: 1,
                                                padding: '0.75rem',
                                                border: '1px solid #d1d5db',
                                                borderRadius: '6px',
                                                fontSize: '0.875rem'
                                            }}
                                        />
                                        <input
                                            type="text"
                                            value={editForm.address?.state || ''}
                                            onChange={(e) => setEditForm({
                                                ...editForm,
                                                address: { ...editForm.address!, state: e.target.value }
                                            })}
                                            placeholder="State"
                                            style={{
                                                width: '80px',
                                                padding: '0.75rem',
                                                border: '1px solid #d1d5db',
                                                borderRadius: '6px',
                                                fontSize: '0.875rem'
                                            }}
                                        />
                                        <input
                                            type="text"
                                            value={editForm.address?.zipCode || ''}
                                            onChange={(e) => setEditForm({
                                                ...editForm,
                                                address: { ...editForm.address!, zipCode: e.target.value }
                                            })}
                                            placeholder="ZIP"
                                            style={{
                                                width: '100px',
                                                padding: '0.75rem',
                                                border: '1px solid #d1d5db',
                                                borderRadius: '6px',
                                                fontSize: '0.875rem'
                                            }}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <p style={{ margin: '0', color: '#4b5563' }}>
                                    🏠 {client.address?.street ? (
                                        `${client.address.street}, ${client.address.city}, ${client.address.state} ${client.address.zipCode}`
                                    ) : (
                                        'No address provided'
                                    )}
                                </p>
                            )}
                        </div>
                    </div>
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
                    <h2 style={{
                        fontSize: '1.5rem',
                        fontWeight: '700',
                        color: '#1e293b',
                        marginBottom: '1.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}>
                        🐾 Pets ({pets.length})
                    </h2>

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
                                borderTop: '3px solid #007AFF',
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
                            color: '#6b7280'
                        }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🐾</div>
                            <h4 style={{
                                fontSize: '1.125rem',
                                fontWeight: '600',
                                marginBottom: '0.5rem',
                                color: '#374151'
                            }}>
                                No pets found
                            </h4>
                            <p style={{ fontSize: '0.875rem' }}>
                                This client doesn&apos;t have any pets registered yet.
                            </p>
                        </div>
                    ) : (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
                            gap: '1rem'
                        }}>
                            {pets.map(pet => (
                                <div
                                    key={pet.id}
                                    style={{
                                        backgroundColor: '#f8fafc',
                                        borderRadius: '12px',
                                        padding: '1.5rem',
                                        border: '1px solid #e2e8f0'
                                    }}
                                >
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'flex-start',
                                        marginBottom: '1rem'
                                    }}>
                                        {/* Pet Info */}
                                        <div style={{ flex: 1 }}>
                                            <h3 style={{
                                                fontSize: '1.125rem',
                                                fontWeight: '600',
                                                color: '#1e293b',
                                                margin: '0 0 0.5rem 0'
                                            }}>
                                                {pet.name}
                                            </h3>
                                            <p style={{
                                                fontSize: '0.875rem',
                                                color: '#64748b',
                                                margin: '0 0 0.25rem 0'
                                            }}>
                                                {pet.species} • {pet.breed} • {pet.weight}
                                            </p>
                                            {pet.lastDischargeDate && (
                                                <p style={{
                                                    fontSize: '0.75rem',
                                                    color: '#6b7280',
                                                    margin: '0'
                                                }}>
                                                    Last visit: {pet.lastDischargeDate.toLocaleDateString()}
                                                </p>
                                            )}
                                        </div>

                                        {/* Active Medications Badge */}
                                        <div style={{
                                            textAlign: 'center',
                                            minWidth: '60px'
                                        }}>
                                            <div style={{
                                                fontSize: '1.5rem',
                                                fontWeight: '700',
                                                color: pet.activeMedications > 0 ? '#16a34a' : '#94a3b8',
                                                marginBottom: '0.25rem'
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
                                    </div>

                                    {/* Actions - Only Edit Pet button now */}
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'flex-end'
                                    }}>
                                        <button
                                            style={{
                                                backgroundColor: '#f1f5f9',
                                                color: '#64748b',
                                                border: '1px solid #e2e8f0',
                                                padding: '0.5rem 0.75rem',
                                                borderRadius: '6px',
                                                fontSize: '0.75rem',
                                                fontWeight: '600',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.backgroundColor = '#e2e8f0';
                                                e.currentTarget.style.color = '#475569';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor = '#f1f5f9';
                                                e.currentTarget.style.color = '#64748b';
                                            }}
                                        >
                                            Edit Pet
                                        </button>
                                    </div>

                                    {/* Show active medications inline */}
                                    {pet.activeMedications > 0 && (
                                        <div style={{
                                            marginTop: '1rem',
                                            padding: '0.75rem',
                                            backgroundColor: 'white',
                                            borderRadius: '8px',
                                            border: '1px solid #e2e8f0'
                                        }}>
                                            <div style={{
                                                fontSize: '0.75rem',
                                                fontWeight: '600',
                                                color: '#64748b',
                                                marginBottom: '0.5rem'
                                            }}>
                                                CURRENT MEDICATIONS
                                            </div>
                                            <div style={{
                                                fontSize: '0.875rem',
                                                color: '#374151'
                                            }}>
                                                {pet.activeMedications} active prescription{pet.activeMedications !== 1 ? 's' : ''}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Past Visits Section */}
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
                        🩺 Past Visits
                    </h3>

                    {loadingVisits ? (
                        <div style={{
                            textAlign: 'center',
                            padding: '3rem',
                            color: '#64748b'
                        }}>
                            <div style={{
                                width: '32px',
                                height: '32px',
                                border: '3px solid #e2e8f0',
                                borderTop: '3px solid #007AFF',
                                borderRadius: '50%',
                                animation: 'spin 1s linear infinite',
                                margin: '0 auto 1rem auto'
                            }} />
                            Loading past visits...
                        </div>
                    ) : pastVisits.length === 0 ? (
                        <div style={{
                            textAlign: 'center',
                            padding: '3rem',
                            color: '#6b7280'
                        }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🩺</div>
                            <h4 style={{
                                fontSize: '1.125rem',
                                fontWeight: '600',
                                marginBottom: '0.5rem',
                                color: '#374151'
                            }}>
                                No past visits
                            </h4>
                            <p style={{ fontSize: '0.875rem' }}>
                                Past discharge summaries will appear here once created.
                            </p>
                        </div>
                    ) : (
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '1rem'
                        }}>
                            {pastVisits.map(visit => (
                                <div
                                    key={visit.id}
                                    style={{
                                        backgroundColor: '#f8fafc',
                                        borderRadius: '12px',
                                        padding: '1.5rem',
                                        border: '1px solid #e2e8f0',
                                        transition: 'all 0.2s ease'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = '#f1f5f9';
                                        e.currentTarget.style.borderColor = '#cbd5e1';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = '#f8fafc';
                                        e.currentTarget.style.borderColor = '#e2e8f0';
                                    }}
                                >
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}>
                                        <div style={{ flex: 1 }}>
                                            <h4 style={{
                                                fontSize: '1.125rem',
                                                fontWeight: '600',
                                                color: '#1e293b',
                                                margin: '0 0 0.5rem 0'
                                            }}>
                                                {visit.petName}
                                            </h4>
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '1rem',
                                                fontSize: '0.875rem',
                                                color: '#64748b'
                                            }}>
                                                <span>
                                                    💊 {visit.medicationCount} medication{visit.medicationCount !== 1 ? 's' : ''}
                                                </span>
                                                <span>
                                                    📅 {formatRelativeTime(visit.date)}
                                                </span>
                                            </div>
                                        </div>

                                        <Link
                                            href={`/dashboard/patients/${visit.id}`}
                                            style={{
                                                backgroundColor: '#007AFF',
                                                color: 'white',
                                                padding: '0.5rem 1rem',
                                                borderRadius: '6px',
                                                textDecoration: 'none',
                                                fontSize: '0.875rem',
                                                fontWeight: '600',
                                                transition: 'all 0.2s ease'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.backgroundColor = '#0051d5';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor = '#007AFF';
                                            }}
                                        >
                                            View Discharge Summary
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Loading/Spinning Animation CSS */}
            <style jsx>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}