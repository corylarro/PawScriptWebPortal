// src/app/dashboard/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/types/firestore';
import { Discharge } from '@/types/discharge';
import Image from 'next/image';
import Link from 'next/link';

export default function DashboardPage() {
    const { vetUser, clinic, logout } = useAuth();
    const { loading } = useRequireAuth();

    const [recentDischarges, setRecentDischarges] = useState<Discharge[]>([]);
    const [stats, setStats] = useState({
        totalToday: 0,
        totalThisWeek: 0,
        totalThisMonth: 0
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [loadingData, setLoadingData] = useState(true);

    // Load dashboard data
    useEffect(() => {
        const loadDashboardData = async () => {
            if (!vetUser || !clinic) return;

            try {
                // Get recent discharges
                const recentQuery = query(
                    collection(db, COLLECTIONS.DISCHARGES),
                    where('vetId', '==', vetUser.id),
                    orderBy('createdAt', 'desc'),
                    limit(10)
                );

                const recentSnapshot = await getDocs(recentQuery);
                const recentData: Discharge[] = recentSnapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        pet: data.pet,
                        medications: data.medications,
                        notes: data.notes,
                        vetId: data.vetId,
                        clinicId: data.clinicId,
                        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
                        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt),
                    };
                });

                setRecentDischarges(recentData);

                // Calculate stats
                const now = new Date();
                const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                const weekStart = new Date(today);
                weekStart.setDate(today.getDate() - today.getDay());
                const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

                const todayCount = recentData.filter(d => d.createdAt >= today).length;
                const weekCount = recentData.filter(d => d.createdAt >= weekStart).length;
                const monthCount = recentData.filter(d => d.createdAt >= monthStart).length;

                setStats({
                    totalToday: todayCount,
                    totalThisWeek: weekCount,
                    totalThisMonth: monthCount
                });

            } catch (error) {
                console.error('Error loading dashboard data:', error);
            } finally {
                setLoadingData(false);
            }
        };

        if (!loading && vetUser) {
            loadDashboardData();
        }
    }, [vetUser, clinic, loading]);

    const handleLogout = async () => {
        try {
            await logout();
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const filteredDischarges = recentDischarges.filter(discharge =>
        discharge.pet.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        discharge.pet.species.toLowerCase().includes(searchTerm.toLowerCase())
    );

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
                    <p style={{ color: '#64748b', fontSize: '1rem' }}>Loading dashboard...</p>
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
                                    color: '#2563eb',
                                    textDecoration: 'none',
                                    fontSize: '0.875rem',
                                    fontWeight: '600',
                                    borderBottom: '2px solid #2563eb',
                                    paddingBottom: '0.25rem'
                                }}
                            >
                                Dashboard
                            </Link>
                            <Link
                                href="/dashboard/clients"
                                style={{
                                    color: '#64748b',
                                    textDecoration: 'none',
                                    fontSize: '0.875rem',
                                    fontWeight: '500'
                                }}
                            >
                                Clients & Pets
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
                                Medication Monitoring
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

                    {/* User Menu */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        flexShrink: 0
                    }}>
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
                                    color: '#1e293b',
                                    whiteSpace: 'nowrap'
                                }}>
                                    Dr. {vetUser?.firstName} {vetUser?.lastName}
                                </div>
                                <div style={{
                                    fontSize: '0.75rem',
                                    color: '#64748b',
                                    whiteSpace: 'nowrap'
                                }}>
                                    {clinic?.name || 'Loading clinic...'}
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleLogout}
                            style={{
                                backgroundColor: '#f1f5f9',
                                color: '#64748b',
                                border: '1px solid #e2e8f0',
                                padding: '0.5rem 1rem',
                                borderRadius: '8px',
                                fontSize: '0.875rem',
                                fontWeight: '500',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                whiteSpace: 'nowrap'
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
                            Sign Out
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main style={{
                maxWidth: '1200px',
                margin: '0 auto',
                padding: '2rem'
            }}>
                {/* Welcome Section with Quick Actions */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto',
                    gap: '2rem',
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
                            Welcome back, Dr. {vetUser?.firstName}
                        </h1>
                        <p style={{
                            fontSize: '1rem',
                            color: '#64748b',
                            margin: '0'
                        }}>
                            Here&apos;s what&apos;s happening with your discharges today.
                        </p>
                    </div>

                    <Link
                        href="/dashboard/new-discharge"
                        style={{
                            backgroundColor: '#007AFF',
                            color: 'white',
                            padding: '0.875rem 1.5rem',
                            borderRadius: '12px',
                            textDecoration: 'none',
                            fontWeight: '600',
                            fontSize: '1rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            boxShadow: '0 4px 12px rgba(0, 122, 255, 0.25)',
                            transition: 'transform 0.2s ease',
                            whiteSpace: 'nowrap'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        Create Discharge
                    </Link>
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
                        borderRadius: '12px',
                        padding: '1.5rem',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                        border: '1px solid #e2e8f0'
                    }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            marginBottom: '0.5rem'
                        }}>
                            <h3 style={{
                                fontSize: '0.875rem',
                                fontWeight: '600',
                                color: '#64748b',
                                margin: '0'
                            }}>
                                Today
                            </h3>
                        </div>
                        <div style={{
                            fontSize: '2rem',
                            fontWeight: '700',
                            color: '#1e293b'
                        }}>
                            {loadingData ? '...' : stats.totalToday}
                        </div>
                        <div style={{
                            fontSize: '0.875rem',
                            color: '#64748b'
                        }}>
                            Discharges created
                        </div>
                    </div>

                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        padding: '1.5rem',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                        border: '1px solid #e2e8f0'
                    }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            marginBottom: '0.5rem'
                        }}>
                            <h3 style={{
                                fontSize: '0.875rem',
                                fontWeight: '600',
                                color: '#64748b',
                                margin: '0'
                            }}>
                                This Week
                            </h3>
                        </div>
                        <div style={{
                            fontSize: '2rem',
                            fontWeight: '700',
                            color: '#1e293b'
                        }}>
                            {loadingData ? '...' : stats.totalThisWeek}
                        </div>
                        <div style={{
                            fontSize: '0.875rem',
                            color: '#64748b'
                        }}>
                            Discharges created
                        </div>
                    </div>

                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        padding: '1.5rem',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                        border: '1px solid #e2e8f0'
                    }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            marginBottom: '0.5rem'
                        }}>
                            <h3 style={{
                                fontSize: '0.875rem',
                                fontWeight: '600',
                                color: '#64748b',
                                margin: '0'
                            }}>
                                This Month
                            </h3>
                        </div>
                        <div style={{
                            fontSize: '2rem',
                            fontWeight: '700',
                            color: '#1e293b'
                        }}>
                            {loadingData ? '...' : stats.totalThisMonth}
                        </div>
                        <div style={{
                            fontSize: '0.875rem',
                            color: '#64748b'
                        }}>
                            Discharges created
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
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
                        marginBottom: '1.5rem'
                    }}>
                        Quick Actions
                    </h2>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                        gap: '1rem'
                    }}>
                        <Link
                            href="/dashboard/clients"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1rem',
                                padding: '1.5rem',
                                backgroundColor: '#f8fafc',
                                borderRadius: '12px',
                                border: '1px solid #e2e8f0',
                                textDecoration: 'none',
                                transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = '#007AFF';
                                e.currentTarget.style.backgroundColor = '#f0f9ff';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = '#e2e8f0';
                                e.currentTarget.style.backgroundColor = '#f8fafc';
                            }}
                        >
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
                                👥
                            </div>
                            <div>
                                <h3 style={{
                                    fontSize: '1.125rem',
                                    fontWeight: '600',
                                    color: '#1e293b',
                                    margin: '0 0 0.25rem 0'
                                }}>
                                    Manage Clients & Pets
                                </h3>
                                <p style={{
                                    fontSize: '0.875rem',
                                    color: '#64748b',
                                    margin: '0'
                                }}>
                                    View client profiles and their pet information
                                </p>
                            </div>
                        </Link>

                        <Link
                            href="/dashboard/patients"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1rem',
                                padding: '1.5rem',
                                backgroundColor: '#f8fafc',
                                borderRadius: '12px',
                                border: '1px solid #e2e8f0',
                                textDecoration: 'none',
                                transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = '#16a34a';
                                e.currentTarget.style.backgroundColor = '#f0fdf4';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = '#e2e8f0';
                                e.currentTarget.style.backgroundColor = '#f8fafc';
                            }}
                        >
                            <div style={{
                                width: '48px',
                                height: '48px',
                                backgroundColor: '#16a34a',
                                borderRadius: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1.25rem'
                            }}>
                                📊
                            </div>
                            <div>
                                <h3 style={{
                                    fontSize: '1.125rem',
                                    fontWeight: '600',
                                    color: '#1e293b',
                                    margin: '0 0 0.25rem 0'
                                }}>
                                    Medication Monitoring
                                </h3>
                                <p style={{
                                    fontSize: '0.875rem',
                                    color: '#64748b',
                                    margin: '0'
                                }}>
                                    Track medication adherence and symptoms
                                </p>
                            </div>
                        </Link>
                    </div>
                </div>

                {/* Recent Discharges */}
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '16px',
                    padding: '2rem',
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
                            fontSize: '1.5rem',
                            fontWeight: '700',
                            color: '#1e293b',
                            margin: '0'
                        }}>
                            Recent Discharges
                        </h2>

                        {/* Search */}
                        <div style={{ position: 'relative', maxWidth: '300px' }}>
                            <input
                                type="text"
                                placeholder="Search by pet name or species..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem 2.5rem 0.75rem 1rem',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '8px',
                                    fontSize: '0.875rem',
                                    outline: 'none',
                                    transition: 'border-color 0.2s ease',
                                    fontFamily: 'inherit',
                                    boxSizing: 'border-box'
                                }}
                                onFocus={(e) => e.target.style.borderColor = '#2563eb'}
                                onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
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

                    {loadingData ? (
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
                            Loading discharges...
                        </div>
                    ) : filteredDischarges.length === 0 ? (
                        <div style={{
                            textAlign: 'center',
                            padding: '3rem',
                            color: '#6b7280'
                        }}>
                            {searchTerm ? (
                                <>
                                    <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🔍</div>
                                    <p style={{ fontSize: '1.125rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                                        No discharges found
                                    </p>
                                    <p style={{ fontSize: '0.875rem', margin: '0' }}>
                                        Try adjusting your search terms
                                    </p>
                                </>
                            ) : (
                                <>
                                    <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📋</div>
                                    <p style={{ fontSize: '1.125rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                                        No discharges yet
                                    </p>
                                    <p style={{ fontSize: '0.875rem', margin: '0 0 1.5rem 0' }}>
                                        Create your first discharge summary to get started
                                    </p>
                                    <Link
                                        href="/dashboard/new-discharge"
                                        style={{
                                            backgroundColor: '#007AFF',
                                            color: 'white',
                                            padding: '0.75rem 1.5rem',
                                            borderRadius: '8px',
                                            textDecoration: 'none',
                                            fontWeight: '600',
                                            fontSize: '0.875rem'
                                        }}
                                    >
                                        Create First Discharge
                                    </Link>
                                </>
                            )}
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {filteredDischarges.map((discharge) => (
                                <div key={discharge.id} style={{
                                    padding: '1.5rem',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '12px',
                                    backgroundColor: '#fafbfc',
                                    transition: 'all 0.2s ease',
                                    cursor: 'pointer'
                                }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.borderColor = '#007AFF';
                                        e.currentTarget.style.backgroundColor = '#f8fafc';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.borderColor = '#e2e8f0';
                                        e.currentTarget.style.backgroundColor = '#fafbfc';
                                    }}
                                >
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'auto 1fr auto auto',
                                        gap: '1rem',
                                        alignItems: 'center'
                                    }}>
                                        {/* Pet Icon */}
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
                                            <h3 style={{
                                                fontSize: '1.125rem',
                                                fontWeight: '600',
                                                color: '#1e293b',
                                                margin: '0 0 0.25rem 0'
                                            }}>
                                                {discharge.pet.name}
                                            </h3>
                                            <p style={{
                                                fontSize: '0.875rem',
                                                color: '#64748b',
                                                margin: '0 0 0.25rem 0'
                                            }}>
                                                {discharge.pet.species}
                                                {discharge.pet.weight && ` • ${discharge.pet.weight}`}
                                            </p>
                                            <p style={{
                                                fontSize: '0.75rem',
                                                color: '#94a3b8',
                                                margin: '0'
                                            }}>
                                                {discharge.medications.length} medication{discharge.medications.length !== 1 ? 's' : ''} • {formatDate(discharge.createdAt)}
                                            </p>
                                        </div>

                                        {/* Medications Preview */}
                                        <div style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '0.25rem',
                                            minWidth: '150px'
                                        }}>
                                            {discharge.medications.slice(0, 2).map((med, index) => (
                                                <div key={index} style={{
                                                    fontSize: '0.75rem',
                                                    color: '#374151',
                                                    backgroundColor: 'white',
                                                    padding: '0.25rem 0.5rem',
                                                    borderRadius: '4px',
                                                    border: '1px solid #e5e7eb'
                                                }}>
                                                    {med.name}
                                                    {med.isTapered && (
                                                        <span style={{
                                                            marginLeft: '0.25rem',
                                                            fontSize: '0.625rem',
                                                            backgroundColor: '#ddd6fe',
                                                            color: '#7c3aed',
                                                            padding: '0.125rem 0.25rem',
                                                            borderRadius: '4px'
                                                        }}>
                                                            TAPERED
                                                        </span>
                                                    )}
                                                </div>
                                            ))}
                                            {discharge.medications.length > 2 && (
                                                <div style={{
                                                    fontSize: '0.75rem',
                                                    color: '#64748b',
                                                    fontStyle: 'italic'
                                                }}>
                                                    +{discharge.medications.length - 2} more
                                                </div>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div style={{
                                            display: 'flex',
                                            gap: '0.5rem'
                                        }}>
                                            <Link
                                                href={`/discharge/${discharge.id}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{
                                                    backgroundColor: '#f1f5f9',
                                                    color: '#64748b',
                                                    border: 'none',
                                                    padding: '0.5rem',
                                                    borderRadius: '6px',
                                                    fontSize: '0.75rem',
                                                    cursor: 'pointer',
                                                    textDecoration: 'none',
                                                    display: 'flex',
                                                    alignItems: 'center',
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
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                                    <polyline points="15,3 21,3 21,9" />
                                                    <line x1="10" y1="14" x2="21" y2="3" />
                                                </svg>
                                            </Link>

                                            <Link
                                                href={`/dashboard/discharge-success?id=${discharge.id}`}
                                                style={{
                                                    backgroundColor: '#007AFF',
                                                    color: 'white',
                                                    border: 'none',
                                                    padding: '0.5rem 0.75rem',
                                                    borderRadius: '6px',
                                                    fontSize: '0.75rem',
                                                    cursor: 'pointer',
                                                    textDecoration: 'none',
                                                    fontWeight: '500',
                                                    transition: 'all 0.2s ease'
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.backgroundColor = '#0056b3';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.backgroundColor = '#007AFF';
                                                }}
                                            >
                                                View QR
                                            </Link>
                                        </div>
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