// src/components/ClientSearchForm.tsx
'use client';

import { useState } from 'react';
import { collection, query, where, getDocs, addDoc, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/types/firestore';

// Define the Client interface
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

interface ClientSearchFormProps {
    clinicId: string;
    selectedClient: Client | null;
    onClientChange: (client: Client | null) => void;
}

export default function ClientSearchForm({ clinicId, selectedClient, onClientChange }: ClientSearchFormProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<Client[]>([]);
    const [searching, setSearching] = useState(false);
    const [showNewClientForm, setShowNewClientForm] = useState(false);
    const [creating, setCreating] = useState(false);

    // New client form state
    const [newClient, setNewClient] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        street: '',
        city: '',
        state: '',
        zipCode: '',
        notes: ''
    });

    const handleSearch = async (term: string) => {
        if (!term.trim() || !clinicId) {
            setSearchResults([]);
            return;
        }

        setSearching(true);
        try {
            // Search by name (first or last)
            const nameQuery = query(
                collection(db, COLLECTIONS.CLIENTS || 'clients'),
                where('clinicId', '==', clinicId),
                where('isActive', '==', true),
                orderBy('lastName'),
                limit(10)
            );

            const snapshot = await getDocs(nameQuery);
            const clients = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    firstName: data.firstName,
                    lastName: data.lastName,
                    email: data.email,
                    phone: data.phone,
                    address: data.address || { street: '', city: '', state: '', zipCode: '' },
                    clinicId: data.clinicId,
                    isActive: data.isActive,
                    notes: data.notes,
                    createdAt: data.createdAt?.toDate() || new Date(),
                    updatedAt: data.updatedAt?.toDate() || new Date(),
                } as Client;
            });

            // Filter by search term on client side (simple approach)
            const filtered = clients.filter(client => {
                const fullName = `${client.firstName} ${client.lastName}`.toLowerCase();
                const email = client.email.toLowerCase();
                const phone = client.phone.replace(/\D/g, '');
                const searchLower = term.toLowerCase();
                const searchPhone = term.replace(/\D/g, '');

                return fullName.includes(searchLower) ||
                    email.includes(searchLower) ||
                    (searchPhone && phone.includes(searchPhone));
            });

            setSearchResults(filtered);
        } catch (error) {
            console.error('Error searching clients:', error);
        } finally {
            setSearching(false);
        }
    };

    const handleCreateClient = async () => {
        if (!newClient.firstName || !newClient.lastName || !newClient.email) {
            alert('Please fill in required fields (First Name, Last Name, Email)');
            return;
        }

        setCreating(true);
        try {
            const clientData = {
                firstName: newClient.firstName,
                lastName: newClient.lastName,
                email: newClient.email,
                phone: newClient.phone,
                address: {
                    street: newClient.street,
                    city: newClient.city,
                    state: newClient.state,
                    zipCode: newClient.zipCode
                },
                clinicId,
                isActive: true,
                notes: newClient.notes,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const docRef = await addDoc(collection(db, COLLECTIONS.CLIENTS || 'clients'), clientData);

            const createdClient: Client = {
                id: docRef.id,
                ...clientData
            };

            onClientChange(createdClient);
            setShowNewClientForm(false);
            setSearchResults([]);
            setSearchTerm('');

            // Reset form
            setNewClient({
                firstName: '',
                lastName: '',
                email: '',
                phone: '',
                street: '',
                city: '',
                state: '',
                zipCode: '',
                notes: ''
            });
        } catch (error) {
            console.error('Error creating client:', error);
            alert('Failed to create client. Please try again.');
        } finally {
            setCreating(false);
        }
    };

    const formatPhoneNumber = (value: string) => {
        const phoneNumber = value.replace(/\D/g, '');
        const limitedPhoneNumber = phoneNumber.slice(0, 10);

        if (limitedPhoneNumber.length <= 3) {
            return limitedPhoneNumber;
        } else if (limitedPhoneNumber.length <= 6) {
            return `(${limitedPhoneNumber.slice(0, 3)}) ${limitedPhoneNumber.slice(3)}`;
        } else {
            return `(${limitedPhoneNumber.slice(0, 3)}) ${limitedPhoneNumber.slice(3, 6)}-${limitedPhoneNumber.slice(6)}`;
        }
    };

    return (
        <div>
            {/* Selected Client Display */}
            {selectedClient && (
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
                                👤 {selectedClient.firstName} {selectedClient.lastName}
                            </div>
                            <div style={{
                                fontSize: '0.875rem',
                                color: '#075985',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.125rem'
                            }}>
                                <div>Email: {selectedClient.email}</div>
                                <div>Phone: {selectedClient.phone}</div>
                                {selectedClient.address.city && (
                                    <div>Location: {selectedClient.address.city}, {selectedClient.address.state}</div>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={() => onClientChange(null)}
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
                            Change Client
                        </button>
                    </div>
                </div>
            )}

            {/* Client Search */}
            {!selectedClient && (
                <div>
                    <div style={{
                        display: 'flex',
                        gap: '1rem',
                        marginBottom: '1rem'
                    }}>
                        <div style={{ flex: 1 }}>
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    handleSearch(e.target.value);
                                }}
                                placeholder="Search by name, email, or phone..."
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
                        <button
                            onClick={() => setShowNewClientForm(true)}
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
                            + New Client
                        </button>
                    </div>

                    {/* Search Results */}
                    {searchTerm && (
                        <div>
                            {searching ? (
                                <div style={{
                                    textAlign: 'center',
                                    padding: '2rem',
                                    color: '#6b7280'
                                }}>
                                    <div style={{
                                        width: '24px',
                                        height: '24px',
                                        border: '2px solid #e5e7eb',
                                        borderTop: '2px solid #2563eb',
                                        borderRadius: '50%',
                                        animation: 'spin 1s linear infinite',
                                        margin: '0 auto 0.5rem auto'
                                    }} />
                                    Searching clients...
                                </div>
                            ) : searchResults.length > 0 ? (
                                <div style={{
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '8px',
                                    backgroundColor: 'white'
                                }}>
                                    {searchResults.map((client) => (
                                        <div
                                            key={client.id}
                                            onClick={() => onClientChange(client)}
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
                                                    👤 {client.firstName} {client.lastName}
                                                </div>
                                                <div style={{
                                                    fontSize: '0.75rem',
                                                    color: '#64748b',
                                                    display: 'flex',
                                                    gap: '1rem'
                                                }}>
                                                    <span>{client.email}</span>
                                                    <span>• {client.phone}</span>
                                                    {client.address.city && (
                                                        <span>• {client.address.city}, {client.address.state}</span>
                                                    )}
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
                                    padding: '2rem',
                                    color: '#6b7280',
                                    backgroundColor: '#f9fafb',
                                    borderRadius: '8px',
                                    border: '1px solid #e5e7eb'
                                }}>
                                    No clients found for &quot;{searchTerm}&quot;. Try a different search term or add a new client.
                                </div>
                            )}
                        </div>
                    )}

                    {/* Initial State */}
                    {!searchTerm && (
                        <div style={{
                            textAlign: 'center',
                            padding: '3rem 2rem',
                            color: '#6b7280',
                            backgroundColor: '#f9fafb',
                            borderRadius: '8px',
                            border: '2px dashed #d1d5db'
                        }}>
                            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>👤</div>
                            <p style={{ fontSize: '1.125rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                                Search for a client to get started
                            </p>
                            <p style={{ fontSize: '0.875rem', margin: '0' }}>
                                Enter a name, email, or phone number above
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* New Client Form Modal */}
            {showNewClientForm && (
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
                                Add New Client
                            </h3>
                            <button
                                onClick={() => setShowNewClientForm(false)}
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
                                    First Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={newClient.firstName}
                                    onChange={(e) => setNewClient({ ...newClient, firstName: e.target.value })}
                                    placeholder="Enter first name"
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
                                    Last Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={newClient.lastName}
                                    onChange={(e) => setNewClient({ ...newClient, lastName: e.target.value })}
                                    placeholder="Enter last name"
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
                                    Email Address *
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={newClient.email}
                                    onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                                    placeholder="Enter email address"
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
                                    Phone Number
                                </label>
                                <input
                                    type="tel"
                                    value={newClient.phone}
                                    onChange={(e) => setNewClient({ ...newClient, phone: formatPhoneNumber(e.target.value) })}
                                    placeholder="(555) 123-4567"
                                    maxLength={14}
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
                                Street Address
                            </label>
                            <input
                                type="text"
                                value={newClient.street}
                                onChange={(e) => setNewClient({ ...newClient, street: e.target.value })}
                                placeholder="Enter street address"
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

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr 1fr',
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
                                    City
                                </label>
                                <input
                                    type="text"
                                    value={newClient.city}
                                    onChange={(e) => setNewClient({ ...newClient, city: e.target.value })}
                                    placeholder="Enter city"
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
                                    State
                                </label>
                                <input
                                    type="text"
                                    value={newClient.state}
                                    onChange={(e) => setNewClient({ ...newClient, state: e.target.value })}
                                    placeholder="OR"
                                    maxLength={2}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '8px',
                                        fontSize: '1rem',
                                        outline: 'none',
                                        fontFamily: 'inherit',
                                        boxSizing: 'border-box',
                                        textTransform: 'uppercase'
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
                                    ZIP Code
                                </label>
                                <input
                                    type="text"
                                    value={newClient.zipCode}
                                    onChange={(e) => setNewClient({ ...newClient, zipCode: e.target.value })}
                                    placeholder="97005"
                                    maxLength={10}
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
                                value={newClient.notes}
                                onChange={(e) => setNewClient({ ...newClient, notes: e.target.value })}
                                placeholder="Internal notes about this client..."
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
                                onClick={() => setShowNewClientForm(false)}
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
                                onClick={handleCreateClient}
                                disabled={creating || !newClient.firstName || !newClient.lastName || !newClient.email}
                                style={{
                                    backgroundColor: creating || !newClient.firstName || !newClient.lastName || !newClient.email ? '#9ca3af' : '#16a34a',
                                    color: 'white',
                                    border: 'none',
                                    padding: '0.75rem 1.5rem',
                                    borderRadius: '8px',
                                    fontSize: '0.875rem',
                                    fontWeight: '600',
                                    cursor: creating || !newClient.firstName || !newClient.lastName || !newClient.email ? 'not-allowed' : 'pointer',
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
                                {creating ? 'Adding Client...' : 'Add Client'}
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