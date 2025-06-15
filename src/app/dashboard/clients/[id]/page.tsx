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
    }, [client, loadingClient]);

    // Load activity after pets
    useEffect(() => {
        if (pets.length >= 0 && !loadingPets) {
            loadRecentActivity();
        }
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
                        description: `Discharge created with ${discharge.medications?.length || 0} medications`,
                        date: discharge.createdAt?.toDate() || new Date(),
                        adherenceRate: Math.floor(Math.random() * 30) + 70 // Mock adherence data
                    });
                }
            });

            // Add some mock sync activities
            pets.forEach(pet => {
                if (pet.activeMedications > 0) {
                    activities.push({
                        id: `sync-${pet.id}`,
                        type: 'sync_activity',
                        petName: pet.name,
                        description: 'Recent dose logged in mobile app',
                        date: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
                        adherenceRate: Math.floor(Math.random() * 30) + 70
                    });
                }
            });

            // Sort by date and limit
            activities.sort((a, b) => b.date.getTime() - a.date.getTime());
            setRecentActivity(activities.slice(0, 10));

        } catch (err) {
            console.error('Error loading recent activity:', err);
        } finally {
            setLoadingActivity(false);
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

    const calculateAge = (dateOfBirth: Date) => {
        const now = new Date();
        const ageMs = now.getTime() - dateOfBirth.getTime();
        const ageYears = Math.floor(ageMs / (365.25 * 24 * 60 * 60 * 1000));
        const ageMonths = Math.floor((ageMs % (365.25 * 24 * 60 * 60 * 1000)) / (30.44 * 24 * 60 * 60 * 1000));

        if (ageYears > 0) {
            return ageMonths > 0 ? `${ageYears}y ${ageMonths}m` : `${ageYears}y`;
        } else if (ageMonths > 0) {
            return `${ageMonths}m`;
        } else {
            const ageWeeks = Math.floor(ageMs / (7 * 24 * 60 * 60 * 1000));
            return `${ageWeeks}w`;
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
                        borderTop: '3px solid #2563eb',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        margin: '0 auto 1rem auto'
                    }} />
                    <p style={{ color: '#64748b', fontSize: '1rem' }}>Loading client...</p>
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
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👤</div>
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
                            backgroundColor: '#2563eb',
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
                    {/* Back Navigation */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <Link
                            href="/dashboard/clients"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                color: '#64748b',
                                textDecoration: 'none',
                                fontSize: '0.875rem',
                                fontWeight: '400',
                                transition: 'color 0.2s ease'
                            }}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="15,18 9,12 15,6" />
                            </svg>
                            Back to Clients
                        </Link>

                        <div style={{
                            width: '1px',
                            height: '16px',
                            backgroundColor: '#e2e8f0'
                        }} />

                        <h1 style={{
                            fontSize: '1.25rem',
                            fontWeight: '600',
                            color: '#1e293b',
                            margin: '0'
                        }}>
                            {client.firstName} {client.lastName}
                        </h1>
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
                            backgroundColor: '#2563eb',
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
            </header>

            {/* Main Content */}
            <main style={{
                maxWidth: '1200px',
                margin: '0 auto',
                padding: '2rem'
            }}>
                {/* Client Information Section */}
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{
                                width: '64px',
                                height: '64px',
                                backgroundColor: '#007AFF',
                                borderRadius: '16px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '2rem'
                            }}>
                                👤
                            </div>
                            <div>
                                <h2 style={{
                                    fontSize: '1.75rem',
                                    fontWeight: '700',
                                    color: '#1e293b',
                                    margin: '0 0 0.5rem 0'
                                }}>
                                    {client.firstName} {client.lastName}
                                </h2>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '1rem',
                                    fontSize: '0.875rem',
                                    color: '#64748b'
                                }}>
                                    <span>Client since {formatDate(client.createdAt)}</span>
                                    <span>•</span>
                                    <span style={{
                                        backgroundColor: client.isActive ? '#dcfce7' : '#f3f4f6',
                                        color: client.isActive ? '#16a34a' : '#6b7280',
                                        padding: '0.25rem 0.5rem',
                                        borderRadius: '12px',
                                        fontSize: '0.75rem',
                                        fontWeight: '600'
                                    }}>
                                        {client.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => isEditing ? handleSaveClient() : setIsEditing(true)}
                            disabled={saving}
                            style={{
                                backgroundColor: isEditing ? '#16a34a' : '#2563eb',
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
                            {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Edit Info'}
                        </button>
                    </div>

                    {/* Client Details */}
                    {isEditing ? (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
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
                    ) : (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                            gap: '1.5rem'
                        }}>
                            <div>
                                <div style={{
                                    fontSize: '0.75rem',
                                    fontWeight: '600',
                                    color: '#64748b',
                                    marginBottom: '0.25rem'
                                }}>
                                    EMAIL
                                </div>
                                <div style={{
                                    fontSize: '0.875rem',
                                    color: '#1e293b'
                                }}>
                                    {client.email}
                                </div>
                            </div>
                            <div>
                                <div style={{
                                    fontSize: '0.75rem',
                                    fontWeight: '600',
                                    color: '#64748b',
                                    marginBottom: '0.25rem'
                                }}>
                                    PHONE
                                </div>
                                <div style={{
                                    fontSize: '0.875rem',
                                    color: '#1e293b'
                                }}>
                                    {client.phone || 'Not provided'}
                                </div>
                            </div>
                            <div>
                                <div style={{
                                    fontSize: '0.75rem',
                                    fontWeight: '600',
                                    color: '#64748b',
                                    marginBottom: '0.25rem'
                                }}>
                                    ADDRESS
                                </div>
                                <div style={{
                                    fontSize: '0.875rem',
                                    color: '#1e293b'
                                }}>
                                    {client.address.street || client.address.city ? (
                                        <>
                                            {client.address.street && <div>{client.address.street}</div>}
                                            {(client.address.city || client.address.state) && (
                                                <div>{client.address.city}{client.address.city && client.address.state ? ', ' : ''}{client.address.state} {client.address.zipCode}</div>
                                            )}
                                        </>
                                    ) : (
                                        'Not provided'
                                    )}
                                </div>
                            </div>
                            <div>
                                <div style={{
                                    fontSize: '0.75rem',
                                    fontWeight: '600',
                                    color: '#64748b',
                                    marginBottom: '0.25rem'
                                }}>
                                    TOTAL PETS
                                </div>
                                <div style={{
                                    fontSize: '0.875rem',
                                    color: '#1e293b'
                                }}>
                                    {pets.length}
                                </div>
                            </div>
                        </div>
                    )}

                    {client.notes && !isEditing && (
                        <div style={{
                            marginTop: '1.5rem',
                            padding: '1rem',
                            backgroundColor: '#f8fafc',
                            borderRadius: '8px',
                            border: '1px solid #e2e8f0'
                        }}>
                            <div style={{
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                color: '#64748b',
                                marginBottom: '0.5rem'
                            }}>
                                NOTES
                            </div>
                            <div style={{
                                fontSize: '0.875rem',
                                color: '#374151',
                                lineHeight: '1.5'
                            }}>
                                {client.notes}
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
                            style={{
                                backgroundColor: '#16a34a',
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
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="12" y1="5" x2="12" y2="19" />
                                <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                            Add Pet
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
                            color: '#6b7280'
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
                            <p style={{ fontSize: '0.875rem' }}>
                                Add this client&apos;s first pet to start tracking their medications and health.
                            </p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {pets.map((pet) => (
                                <div key={pet.id} style={{
                                    padding: '1.5rem',
                                    backgroundColor: '#f8fafc',
                                    borderRadius: '12px',
                                    border: '1px solid #e2e8f0',
                                    transition: 'all 0.2s ease'
                                }}
                                    onMouseEnter={(e) => e.currentTarget.style.borderColor = '#007AFF'}
                                    onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
                                >
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'auto 1fr auto auto',
                                        gap: '1rem',
                                        alignItems: 'center'
                                    }}>
                                        {/* Pet Avatar */}
                                        <div style={{
                                            width: '48px',
                                            height: '48px',
                                            backgroundColor: '#007AFF',
                                            borderRadius: '12px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '1.25rem'
                                        }}>
                                            🐾
                                        </div>

                                        {/* Pet Info */}
                                        <div>
                                            <h4 style={{
                                                fontSize: '1.125rem',
                                                fontWeight: '600',
                                                color: '#1e293b',
                                                margin: '0 0 0.25rem 0'
                                            }}>
                                                {pet.name}
                                            </h4>
                                            <div style={{
                                                fontSize: '0.875rem',
                                                color: '#64748b',
                                                display: 'flex',
                                                gap: '1rem',
                                                flexWrap: 'wrap'
                                            }}>
                                                <span>{pet.species}</span>
                                                {pet.breed && <span>• {pet.breed}</span>}
                                                {pet.weight && <span>• {pet.weight}</span>}
                                                {pet.dateOfBirth && <span>• {calculateAge(pet.dateOfBirth)} old</span>}
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

                                        {/* Active Medications */}
                                        <div style={{
                                            textAlign: 'center'
                                        }}>
                                            <div style={{
                                                fontSize: '1.25rem',
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

                                        {/* Actions */}
                                        <div style={{
                                            display: 'flex',
                                            gap: '0.5rem'
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

                                            {pet.activeMedications > 0 && (
                                                <Link
                                                    href={`/dashboard/patients/${pet.id}`}
                                                    style={{
                                                        backgroundColor: '#007AFF',
                                                        color: 'white',
                                                        border: 'none',
                                                        padding: '0.5rem 0.75rem',
                                                        borderRadius: '6px',
                                                        fontSize: '0.75rem',
                                                        fontWeight: '600',
                                                        textDecoration: 'none',
                                                        transition: 'all 0.2s ease'
                                                    }}
                                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0056b3'}
                                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#007AFF'}
                                                >
                                                    View Meds
                                                </Link>
                                            )}
                                        </div>
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
                                                <span style={{ color: '#64748b' }}> • Click &quot;View Meds&quot; to see details and sync data</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
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
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {recentActivity.map((activity) => (
                                <div key={activity.id} style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '1rem',
                                    backgroundColor: '#f8fafc',
                                    borderRadius: '8px',
                                    border: '1px solid #e2e8f0'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <div style={{
                                            width: '8px',
                                            height: '8px',
                                            borderRadius: '50%',
                                            backgroundColor: activity.type === 'discharge' ? '#007AFF' : '#16a34a'
                                        }} />
                                        <div>
                                            <div style={{
                                                fontSize: '0.875rem',
                                                fontWeight: '600',
                                                color: '#1e293b'
                                            }}>
                                                {activity.type === 'discharge' ? '📋' : '📱'} {activity.petName}
                                            </div>
                                            <div style={{
                                                fontSize: '0.75rem',
                                                color: '#64748b'
                                            }}>
                                                {activity.description}
                                                {activity.adherenceRate && (
                                                    <span style={{
                                                        marginLeft: '0.5rem',
                                                        color: activity.adherenceRate >= 85 ? '#16a34a' : activity.adherenceRate >= 70 ? '#f59e0b' : '#ef4444',
                                                        fontWeight: '600'
                                                    }}>
                                                        • {activity.adherenceRate}% adherence
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{
                                        fontSize: '0.75rem',
                                        color: '#64748b'
                                    }}>
                                        {formatTimeAgo(activity.date)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>

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