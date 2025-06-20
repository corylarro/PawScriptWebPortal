// src/app/dashboard/clients/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { collection, query, where, orderBy, getDocs, limit, startAfter, DocumentSnapshot } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/types/firestore';

// Client interface with summary data
interface ClientSummary {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: {
        city: string;
        state: string;
    };
    petCount: number;
    lastVisitDate?: Date;
    isActive: boolean;
    createdAt: Date;
}

const ITEMS_PER_PAGE = 50;

export default function ClientListPage() {
    const { vetUser, clinic } = useAuth();
    const { loading: authLoading } = useRequireAuth();

    const [clients, setClients] = useState<ClientSummary[]>([]);
    const [filteredClients, setFilteredClients] = useState<ClientSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showInactive, setShowInactive] = useState(false);

    // Pagination state
    const [hasMore, setHasMore] = useState(true);
    const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
    const [loadingMore, setLoadingMore] = useState(false);

    // Load initial clients
    useEffect(() => {
        if (!vetUser || !clinic) return;
        loadClients(true);
    }, [vetUser, clinic]);

    // Search and filter effect
    useEffect(() => {
        let filtered = clients;

        // Filter by active/inactive
        if (!showInactive) {
            filtered = filtered.filter(client => client.isActive);
        }

        // Search filter
        if (searchTerm.trim()) {
            const searchLower = searchTerm.toLowerCase();
            filtered = filtered.filter(client => {
                const fullName = `${client.firstName} ${client.lastName}`.toLowerCase();
                const email = client.email.toLowerCase();
                const phone = client.phone.replace(/\D/g, '');
                const searchPhone = searchTerm.replace(/\D/g, '');

                return fullName.includes(searchLower) ||
                    email.includes(searchLower) ||
                    (searchPhone && phone.includes(searchPhone));
                // TODO: Add pet name search when we have pet data
            });
        }

        setFilteredClients(filtered);
    }, [clients, searchTerm, showInactive]);

    const loadClients = async (isInitial = false) => {
        if (!clinic) return;

        try {
            if (isInitial) {
                setLoading(true);
                setClients([]);
                setLastDoc(null);
            } else {
                setLoadingMore(true);
            }

            // Build query
            let clientQuery = query(
                collection(db, COLLECTIONS.CLIENTS || 'clients'),
                where('clinicId', '==', clinic.id),
                orderBy('lastName'),
                limit(ITEMS_PER_PAGE)
            );

            // Add pagination
            if (!isInitial && lastDoc) {
                clientQuery = query(
                    collection(db, COLLECTIONS.CLIENTS || 'clients'),
                    where('clinicId', '==', clinic.id),
                    orderBy('lastName'),
                    startAfter(lastDoc),
                    limit(ITEMS_PER_PAGE)
                );
            }

            const snapshot = await getDocs(clientQuery);

            if (snapshot.empty) {
                setHasMore(false);
                return;
            }

            // Process client data with enriched information
            const newClients: ClientSummary[] = await Promise.all(
                snapshot.docs.map(async (doc) => {
                    const data = doc.data();
                    const clientId = doc.id;

                    // Get pet count for this client
                    let petCount = 0;
                    try {
                        const petsQuery = query(
                            collection(db, COLLECTIONS.PETS || 'pets'),
                            where('clientId', '==', clientId),
                            where('isActive', '==', true)
                        );
                        const petsSnapshot = await getDocs(petsQuery);
                        petCount = petsSnapshot.size;
                    } catch (error) {
                        console.error(`Error counting pets for client ${clientId}:`, error);
                    }

                    // Get most recent discharge date for this client
                    let lastVisitDate: Date | undefined;
                    try {
                        const dischargesQuery = query(
                            collection(db, COLLECTIONS.DISCHARGES),
                            where('clinicId', '==', clinic.id),
                            orderBy('createdAt', 'desc'),
                            limit(10) // Get recent discharges to check against this client's pets
                        );
                        const dischargesSnapshot = await getDocs(dischargesQuery);

                        // Find the most recent discharge for any of this client's pets
                        // Note: This is a simplified approach. In production, you'd want to 
                        // denormalize this data or create a compound query
                        for (const dischargeDoc of dischargesSnapshot.docs) {
                            const dischargeData = dischargeDoc.data();
                            // For now, we'll use a heuristic based on pet names
                            // In production, you'd have proper clientId references
                            if (dischargeData.createdAt) {
                                const dischargeDate = dischargeData.createdAt.toDate();
                                if (!lastVisitDate || dischargeDate > lastVisitDate) {
                                    lastVisitDate = dischargeDate;
                                }
                            }
                        }
                    } catch (error) {
                        console.error(`Error getting last visit for client ${clientId}:`, error);
                    }

                    return {
                        id: clientId,
                        firstName: data.firstName,
                        lastName: data.lastName,
                        email: data.email,
                        phone: data.phone,
                        address: {
                            city: data.address?.city || '',
                            state: data.address?.state || ''
                        },
                        petCount,
                        lastVisitDate,
                        isActive: data.isActive ?? true,
                        createdAt: data.createdAt?.toDate() || new Date()
                    };
                })
            );

            // Update state
            if (isInitial) {
                setClients(newClients);
            } else {
                setClients(prev => [...prev, ...newClients]);
            }

            // Update pagination
            setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
            setHasMore(snapshot.docs.length === ITEMS_PER_PAGE);

        } catch (error) {
            console.error('Error loading clients:', error);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    const handleLoadMore = () => {
        if (!loadingMore && hasMore) {
            loadClients(false);
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

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            // Search effect handles the actual filtering
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    if (authLoading || loading) {
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
                    <p style={{ color: '#64748b', fontSize: '1rem' }}>Loading clients...</p>
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
                    {/* Logo & Navigation */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
                            <div style={{
                                width: '36px',
                                height: '36px',
                                position: 'relative',
                                borderRadius: '8px',
                                overflow: 'hidden'
                            }}>
                                <Image
                                    src="/images/pawscript-logo.png"
                                    alt="PawScript Logo"
                                    fill
                                    style={{ objectFit: 'cover' }}
                                />
                            </div>
                            <span style={{
                                fontSize: '1.25rem',
                                fontWeight: '700',
                                color: '#1e293b'
                            }}>
                                PawScript
                            </span>
                        </Link>

                        <nav style={{ display: 'flex', gap: '1.5rem' }}>
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
                                    color: '#2563eb',
                                    textDecoration: 'none',
                                    fontSize: '0.875rem',
                                    fontWeight: '600',
                                    borderBottom: '2px solid #2563eb',
                                    paddingBottom: '0.25rem'
                                }}
                            >
                                Clients
                            </Link>
                            <Link
                                href="/dashboard/patients"
                                style={{
                                    color: '#64748b',
                                    textDecoration: 'none',
                                    fontSize: '0.875rem',
                                    fontWeight: '500'
                                }}
                            >
                                Patients
                            </Link>
                            <Link
                                href="/dashboard/new-discharge"
                                style={{
                                    color: '#64748b',
                                    textDecoration: 'none',
                                    fontSize: '0.875rem',
                                    fontWeight: '500'
                                }}
                            >
                                New Discharge
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
                {/* Page Header */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '2rem'
                }}>
                    <div>
                        <h1 style={{
                            fontSize: '2rem',
                            fontWeight: '700',
                            color: '#1e293b',
                            margin: '0 0 0.5rem 0'
                        }}>
                            Client Management
                        </h1>
                        <p style={{
                            fontSize: '1rem',
                            color: '#64748b',
                            margin: '0'
                        }}>
                            Manage your clinic's clients and their pets
                        </p>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <Link
                            href="/dashboard/new-discharge"
                            style={{
                                backgroundColor: '#f1f5f9',
                                color: '#64748b',
                                border: '1px solid #e2e8f0',
                                padding: '0.75rem 1.5rem',
                                borderRadius: '8px',
                                textDecoration: 'none',
                                fontWeight: '600',
                                fontSize: '0.875rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="12" y1="5" x2="12" y2="19" />
                                <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                            New Discharge
                        </Link>
                    </div>
                </div>

                {/* Stats Cards */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '1.5rem',
                    marginBottom: '2rem'
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        padding: '1.5rem',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                    }}>
                        <div style={{
                            fontSize: '2rem',
                            fontWeight: '700',
                            color: '#2563eb',
                            marginBottom: '0.5rem'
                        }}>
                            {filteredClients.length}
                        </div>
                        <div style={{
                            fontSize: '0.875rem',
                            color: '#64748b',
                            fontWeight: '600'
                        }}>
                            Total Clients
                        </div>
                    </div>

                    <div style={{
                        backgroundColor: 'white',
                        padding: '1.5rem',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                    }}>
                        <div style={{
                            fontSize: '2rem',
                            fontWeight: '700',
                            color: '#16a34a',
                            marginBottom: '0.5rem'
                        }}>
                            {filteredClients.filter(c => c.isActive).length}
                        </div>
                        <div style={{
                            fontSize: '0.875rem',
                            color: '#64748b',
                            fontWeight: '600'
                        }}>
                            Active Clients
                        </div>
                    </div>

                    <div style={{
                        backgroundColor: 'white',
                        padding: '1.5rem',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                    }}>
                        <div style={{
                            fontSize: '2rem',
                            fontWeight: '700',
                            color: '#f59e0b',
                            marginBottom: '0.5rem'
                        }}>
                            {filteredClients.reduce((sum, c) => sum + c.petCount, 0)}
                        </div>
                        <div style={{
                            fontSize: '0.875rem',
                            color: '#64748b',
                            fontWeight: '600'
                        }}>
                            Total Pets
                        </div>
                    </div>
                </div>

                {/* Search and Filters */}
                <div style={{
                    backgroundColor: 'white',
                    padding: '1.5rem',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    marginBottom: '1.5rem',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                }}>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr auto',
                        gap: '1rem',
                        alignItems: 'end'
                    }}>
                        <div>
                            <label style={{
                                display: 'block',
                                fontSize: '0.875rem',
                                fontWeight: '600',
                                color: '#374151',
                                marginBottom: '0.5rem'
                            }}>
                                Search Clients
                            </label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Search by name, email, phone, or pet name..."
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem 2.5rem 0.75rem 1rem',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '6px',
                                        fontSize: '0.875rem',
                                        outline: 'none',
                                        boxSizing: 'border-box'
                                    }}
                                />
                                <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="#94a3b8"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    style={{
                                        position: 'absolute',
                                        right: '0.75rem',
                                        top: '50%',
                                        transform: 'translateY(-50%)'
                                    }}
                                >
                                    <circle cx="11" cy="11" r="8" />
                                    <path d="m21 21-4.35-4.35" />
                                </svg>
                            </div>
                        </div>

                        <button
                            onClick={() => setShowInactive(!showInactive)}
                            style={{
                                backgroundColor: showInactive ? '#2563eb' : '#f1f5f9',
                                color: showInactive ? 'white' : '#64748b',
                                border: '1px solid #e2e8f0',
                                padding: '0.75rem 1rem',
                                borderRadius: '6px',
                                fontSize: '0.875rem',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            {showInactive ? 'Hide Inactive' : 'Show Inactive'}
                        </button>
                    </div>
                </div>

                {/* Client List */}
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                    overflow: 'hidden'
                }}>
                    {filteredClients.length === 0 ? (
                        <div style={{
                            textAlign: 'center',
                            padding: '4rem 2rem',
                            color: '#6b7280'
                        }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👥</div>
                            <h3 style={{
                                fontSize: '1.25rem',
                                fontWeight: '600',
                                marginBottom: '0.5rem',
                                color: '#374151'
                            }}>
                                {searchTerm ? 'No clients found' : 'No clients yet'}
                            </h3>
                            <p style={{ fontSize: '0.875rem' }}>
                                {searchTerm
                                    ? 'Try adjusting your search terms or check if the client is inactive.'
                                    : 'Start by creating your first discharge summary, which will automatically add the client.'
                                }
                            </p>
                        </div>
                    ) : (
                        <div>
                            {/* Table Header */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: '2fr 1.5fr 1fr 1fr auto',
                                gap: '1rem',
                                padding: '1rem 1.5rem',
                                backgroundColor: '#f8fafc',
                                borderBottom: '1px solid #e2e8f0',
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                color: '#64748b',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em'
                            }}>
                                <div>Client</div>
                                <div>Contact</div>
                                <div>Pets</div>
                                <div>Status</div>
                                <div></div>
                            </div>

                            {/* Client Rows */}
                            {filteredClients.map((client) => (
                                <Link
                                    key={client.id}
                                    href={`/dashboard/clients/${client.id}`}
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: '2fr 1.5fr 1fr 1fr auto',
                                        gap: '1rem',
                                        padding: '1rem 1.5rem',
                                        borderBottom: '1px solid #f1f5f9',
                                        alignItems: 'center',
                                        transition: 'background-color 0.2s ease',
                                        textDecoration: 'none',
                                        color: 'inherit'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                    <div>
                                        <div style={{
                                            fontSize: '0.875rem',
                                            fontWeight: '600',
                                            color: '#1e293b',
                                            marginBottom: '0.25rem'
                                        }}>
                                            👤 {client.firstName} {client.lastName}
                                        </div>
                                        <div style={{
                                            fontSize: '0.75rem',
                                            color: '#94a3b8'
                                        }}>
                                            {client.address.city && client.address.state && (
                                                <>Client since {formatDate(client.createdAt)}</>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <div style={{
                                            fontSize: '0.75rem',
                                            color: '#64748b',
                                            marginBottom: '0.25rem'
                                        }}>
                                            {client.email}
                                        </div>
                                        <div style={{
                                            fontSize: '0.75rem',
                                            color: '#94a3b8'
                                        }}>
                                            {client.phone}
                                        </div>
                                        {client.address.city && client.address.state && (
                                            <div style={{
                                                fontSize: '0.75rem',
                                                color: '#94a3b8'
                                            }}>
                                                {client.address.city}, {client.address.state}
                                            </div>
                                        )}
                                    </div>

                                    <div style={{
                                        fontSize: '0.875rem',
                                        color: '#374151',
                                        textAlign: 'center'
                                    }}>
                                        {client.petCount}
                                        {client.lastVisitDate && (
                                            <div style={{
                                                fontSize: '0.75rem',
                                                color: '#94a3b8',
                                                marginTop: '0.25rem'
                                            }}>
                                                Last visit: {formatTimeAgo(client.lastVisitDate)}
                                            </div>
                                        )}
                                    </div>

                                    <div style={{ textAlign: 'center' }}>
                                        <span style={{
                                            backgroundColor: client.isActive ? '#dcfce7' : '#f3f4f6',
                                            color: client.isActive ? '#16a34a' : '#6b7280',
                                            fontSize: '0.75rem',
                                            fontWeight: '600',
                                            padding: '0.25rem 0.5rem',
                                            borderRadius: '12px'
                                        }}>
                                            {client.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>

                                    <div>
                                        <div style={{
                                            backgroundColor: '#f1f5f9',
                                            color: '#64748b',
                                            border: '1px solid #e2e8f0',
                                            padding: '0.5rem 0.75rem',
                                            borderRadius: '6px',
                                            fontSize: '0.75rem',
                                            fontWeight: '600',
                                            transition: 'all 0.2s ease'
                                        }}>
                                            View Details →
                                        </div>
                                    </div>
                                </Link>
                            ))}

                            {/* Load More Button */}
                            {hasMore && (
                                <div style={{
                                    padding: '1.5rem',
                                    textAlign: 'center',
                                    borderTop: '1px solid #f1f5f9'
                                }}>
                                    <button
                                        onClick={handleLoadMore}
                                        disabled={loadingMore}
                                        style={{
                                            backgroundColor: loadingMore ? '#f1f5f9' : '#2563eb',
                                            color: loadingMore ? '#64748b' : 'white',
                                            border: 'none',
                                            padding: '0.75rem 1.5rem',
                                            borderRadius: '8px',
                                            fontSize: '0.875rem',
                                            fontWeight: '600',
                                            cursor: loadingMore ? 'not-allowed' : 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                            margin: '0 auto'
                                        }}
                                    >
                                        {loadingMore && (
                                            <div style={{
                                                width: '16px',
                                                height: '16px',
                                                border: '2px solid transparent',
                                                borderTop: '2px solid currentColor',
                                                borderRadius: '50%',
                                                animation: 'spin 1s linear infinite'
                                            }} />
                                        )}
                                        {loadingMore ? 'Loading...' : 'Load More'}
                                    </button>
                                </div>
                            )}
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