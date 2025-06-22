// src/app/dashboard/page.tsx (MOBILE RESPONSIVE VERSION)
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
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

    const navItems = [
        { href: '/dashboard', label: 'Dashboard', active: true },
        { href: '/dashboard/clients', label: 'Clients & Pets', active: false },
        { href: '/dashboard/patients', label: 'Medication Monitoring', active: false },
        { href: '/dashboard/new-discharge', label: 'New Discharge', active: false }
    ];

    if (loading) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#F2F2F7',
                fontFamily: 'Nunito, -apple-system, BlinkMacSystemFont, sans-serif'
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
                    <p style={{
                        color: '#6D6D72',
                        fontSize: '1rem',
                        fontWeight: '400'
                    }}>
                        Loading dashboard...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: '#F2F2F7',
            fontFamily: 'Nunito, -apple-system, BlinkMacSystemFont, sans-serif'
        }}>
            {/* Header */}
            <header style={{
                backgroundColor: '#FFFFFF',
                borderBottom: '1px solid #e2e8f0',
                padding: '1rem 2rem',
                position: 'sticky',
                top: 0,
                zIndex: 50,
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                backdropFilter: 'blur(10px)'
            }}>
                <div style={{
                    maxWidth: '1200px',
                    margin: '0 auto',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    {/* Logo */}
                    <Link
                        href="/dashboard"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            textDecoration: 'none',
                            transition: 'transform 0.2s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                        <div style={{
                            width: '36px',
                            height: '36px',
                            backgroundColor: 'transparent',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden'
                        }}>
                            <Image
                                src="/images/logoblack.png"
                                alt="PawScript"
                                width={28}
                                height={28}
                                style={{ objectFit: 'contain' }}
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

                    {/* Desktop Navigation */}
                    <nav style={{
                        display: 'flex',
                        gap: '1.5rem',
                        alignItems: 'center'
                    }} className="desktop-nav">
                        {navItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                style={{
                                    color: item.active ? '#007AFF' : '#6D6D72',
                                    textDecoration: 'none',
                                    fontSize: '0.875rem',
                                    fontWeight: item.active ? '600' : '500',
                                    borderBottom: item.active ? '2px solid #007AFF' : 'none',
                                    paddingBottom: '0.25rem',
                                    transition: 'all 0.2s ease'
                                }}
                                onMouseEnter={(e) => {
                                    if (!item.active) {
                                        e.currentTarget.style.color = '#007AFF';
                                        e.currentTarget.style.transform = 'translateY(-1px)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!item.active) {
                                        e.currentTarget.style.color = '#6D6D72';
                                        e.currentTarget.style.transform = 'translateY(0)';
                                    }
                                }}
                            >
                                {item.label}
                            </Link>
                        ))}
                    </nav>

                    {/* Desktop User Menu */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem'
                    }} className="desktop-user">
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
                                fontWeight: '600',
                                boxShadow: '0 2px 8px rgba(0, 122, 255, 0.25)'
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
                                    color: '#6D6D72',
                                    whiteSpace: 'nowrap',
                                    fontWeight: '400'
                                }}>
                                    {clinic?.name || 'Loading clinic...'}
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleLogout}
                            style={{
                                backgroundColor: 'transparent',
                                color: '#6D6D72',
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
                                e.currentTarget.style.backgroundColor = '#F2F2F7';
                                e.currentTarget.style.borderColor = '#6D6D72';
                                e.currentTarget.style.transform = 'translateY(-1px)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                                e.currentTarget.style.borderColor = '#e2e8f0';
                                e.currentTarget.style.transform = 'translateY(0)';
                            }}
                        >
                            Sign Out
                        </button>
                    </div>

                    {/* Mobile Hamburger Menu */}
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        style={{
                            display: 'none',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center',
                            width: '40px',
                            height: '40px',
                            backgroundColor: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '0'
                        }}
                        className="mobile-menu-button"
                    >
                        <div style={{
                            width: '20px',
                            height: '2px',
                            backgroundColor: '#1e293b',
                            transition: 'all 0.3s ease',
                            transform: isMobileMenuOpen ? 'rotate(45deg) translate(5px, 5px)' : 'none'
                        }} />
                        <div style={{
                            width: '20px',
                            height: '2px',
                            backgroundColor: '#1e293b',
                            margin: '4px 0',
                            transition: 'all 0.3s ease',
                            opacity: isMobileMenuOpen ? 0 : 1
                        }} />
                        <div style={{
                            width: '20px',
                            height: '2px',
                            backgroundColor: '#1e293b',
                            transition: 'all 0.3s ease',
                            transform: isMobileMenuOpen ? 'rotate(-45deg) translate(7px, -6px)' : 'none'
                        }} />
                    </button>
                </div>

                {/* Mobile Menu Dropdown */}
                {isMobileMenuOpen && (
                    <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #e2e8f0',
                        borderTop: 'none',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                        zIndex: 40
                    }} className="mobile-menu">
                        <div style={{
                            maxWidth: '1200px',
                            margin: '0 auto',
                            padding: '1rem 2rem'
                        }}>
                            {/* User Info */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                paddingBottom: '1rem',
                                borderBottom: '1px solid #e2e8f0',
                                marginBottom: '1rem'
                            }}>
                                <div style={{
                                    width: '40px',
                                    height: '40px',
                                    backgroundColor: '#007AFF',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    fontSize: '1rem',
                                    fontWeight: '600',
                                    boxShadow: '0 2px 8px rgba(0, 122, 255, 0.25)'
                                }}>
                                    {vetUser?.firstName?.[0] || 'U'}
                                </div>
                                <div>
                                    <div style={{
                                        fontSize: '1rem',
                                        fontWeight: '600',
                                        color: '#1e293b'
                                    }}>
                                        Dr. {vetUser?.firstName} {vetUser?.lastName}
                                    </div>
                                    <div style={{
                                        fontSize: '0.875rem',
                                        color: '#6D6D72',
                                        fontWeight: '400'
                                    }}>
                                        {clinic?.name || 'Loading clinic...'}
                                    </div>
                                </div>
                            </div>

                            {/* Navigation Links */}
                            <nav style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.5rem',
                                marginBottom: '1rem'
                            }}>
                                {navItems.map((item) => (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        style={{
                                            color: item.active ? '#007AFF' : '#1e293b',
                                            textDecoration: 'none',
                                            fontSize: '1rem',
                                            fontWeight: item.active ? '600' : '500',
                                            padding: '0.75rem',
                                            borderRadius: '8px',
                                            backgroundColor: item.active ? '#E5F3FF' : 'transparent',
                                            transition: 'all 0.2s ease'
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!item.active) {
                                                e.currentTarget.style.backgroundColor = '#F2F2F7';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!item.active) {
                                                e.currentTarget.style.backgroundColor = 'transparent';
                                            }
                                        }}
                                    >
                                        {item.label}
                                    </Link>
                                ))}
                            </nav>

                            {/* Sign Out Button */}
                            <button
                                onClick={() => {
                                    setIsMobileMenuOpen(false);
                                    handleLogout();
                                }}
                                style={{
                                    width: '100%',
                                    backgroundColor: '#F2F2F7',
                                    color: '#6D6D72',
                                    border: '1px solid #e2e8f0',
                                    padding: '0.75rem',
                                    borderRadius: '8px',
                                    fontSize: '1rem',
                                    fontWeight: '500',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = '#E2E8F0';
                                    e.currentTarget.style.borderColor = '#6D6D72';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = '#F2F2F7';
                                    e.currentTarget.style.borderColor = '#e2e8f0';
                                }}
                            >
                                Sign Out
                            </button>
                        </div>
                    </div>
                )}
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
                }} className="welcome-section">
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
                            color: '#6D6D72',
                            margin: '0',
                            fontWeight: '400'
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
                            transition: 'all 0.2s ease',
                            whiteSpace: 'nowrap'
                        }}
                        className="create-discharge-btn"
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 122, 255, 0.35)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 122, 255, 0.25)';
                        }}
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
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: '1.5rem',
                    marginBottom: '2rem'
                }}>
                    <div style={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: '12px',
                        padding: '1.5rem',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                        border: '1px solid #e2e8f0',
                        transition: 'all 0.2s ease'
                    }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
                        }}
                    >
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: '0.75rem'
                        }}>
                            <h3 style={{
                                fontSize: '0.875rem',
                                fontWeight: '600',
                                color: '#6D6D72',
                                margin: '0'
                            }}>
                                Today
                            </h3>
                        </div>
                        <div style={{
                            fontSize: '2rem',
                            fontWeight: '700',
                            color: '#1e293b',
                            marginBottom: '0.25rem'
                        }}>
                            {loadingData ? '...' : stats.totalToday}
                        </div>
                        <div style={{
                            fontSize: '0.875rem',
                            color: '#6D6D72',
                            fontWeight: '400'
                        }}>
                            Discharges created
                        </div>
                    </div>

                    <div style={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: '12px',
                        padding: '1.5rem',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                        border: '1px solid #e2e8f0',
                        transition: 'all 0.2s ease'
                    }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
                        }}
                    >
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: '0.75rem'
                        }}>
                            <h3 style={{
                                fontSize: '0.875rem',
                                fontWeight: '600',
                                color: '#6D6D72',
                                margin: '0'
                            }}>
                                This Week
                            </h3>
                        </div>
                        <div style={{
                            fontSize: '2rem',
                            fontWeight: '700',
                            color: '#1e293b',
                            marginBottom: '0.25rem'
                        }}>
                            {loadingData ? '...' : stats.totalThisWeek}
                        </div>
                        <div style={{
                            fontSize: '0.875rem',
                            color: '#6D6D72',
                            fontWeight: '400'
                        }}>
                            Discharges created
                        </div>
                    </div>

                    <div style={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: '12px',
                        padding: '1.5rem',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                        border: '1px solid #e2e8f0',
                        transition: 'all 0.2s ease'
                    }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
                        }}
                    >
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: '0.75rem'
                        }}>
                            <h3 style={{
                                fontSize: '0.875rem',
                                fontWeight: '600',
                                color: '#6D6D72',
                                margin: '0'
                            }}>
                                This Month
                            </h3>
                        </div>
                        <div style={{
                            fontSize: '2rem',
                            fontWeight: '700',
                            color: '#1e293b',
                            marginBottom: '0.25rem'
                        }}>
                            {loadingData ? '...' : stats.totalThisMonth}
                        </div>
                        <div style={{
                            fontSize: '0.875rem',
                            color: '#6D6D72',
                            fontWeight: '400'
                        }}>
                            Discharges created
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '16px',
                    padding: '2rem',
                    marginBottom: '2rem',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
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
                        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                        gap: '1rem'
                    }} className="quick-actions">
                        <Link
                            href="/dashboard/clients"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1rem',
                                padding: '1.5rem',
                                backgroundColor: '#F2F2F7',
                                borderRadius: '12px',
                                border: '1px solid #e2e8f0',
                                textDecoration: 'none',
                                transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = '#007AFF';
                                e.currentTarget.style.backgroundColor = '#E5F3FF';
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 122, 255, 0.15)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = '#e2e8f0';
                                e.currentTarget.style.backgroundColor = '#F2F2F7';
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = 'none';
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
                                boxShadow: '0 2px 8px rgba(0, 122, 255, 0.25)',
                                overflow: 'hidden'
                            }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                                    <circle cx="9" cy="7" r="4" />
                                    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                </svg>
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
                                    color: '#6D6D72',
                                    margin: '0',
                                    fontWeight: '400'
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
                                backgroundColor: '#F2F2F7',
                                borderRadius: '12px',
                                border: '1px solid #e2e8f0',
                                textDecoration: 'none',
                                transition: 'all 0.2s ease',
                                position: 'relative',
                                opacity: '0.7',
                                cursor: 'not-allowed'
                            }}
                            onClick={(e) => e.preventDefault()}
                        >
                            <div style={{
                                width: '48px',
                                height: '48px',
                                backgroundColor: '#6D6D72',
                                borderRadius: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 2px 8px rgba(109, 109, 114, 0.25)',
                                overflow: 'hidden'
                            }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                                </svg>
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    marginBottom: '0.25rem'
                                }}>
                                    <h3 style={{
                                        fontSize: '1.125rem',
                                        fontWeight: '600',
                                        color: '#1e293b',
                                        margin: '0'
                                    }}>
                                        Medication Monitoring
                                    </h3>
                                    <span style={{
                                        backgroundColor: '#FF9500',
                                        color: 'white',
                                        fontSize: '0.625rem',
                                        fontWeight: '600',
                                        padding: '0.125rem 0.375rem',
                                        borderRadius: '4px',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.025em'
                                    }}>
                                        Coming Soon
                                    </span>
                                </div>
                                <p style={{
                                    fontSize: '0.875rem',
                                    color: '#6D6D72',
                                    margin: '0',
                                    fontWeight: '400'
                                }}>
                                    Track medication adherence and symptoms
                                </p>
                            </div>
                        </Link>
                    </div>
                </div>

                {/* Recent Discharges */}
                <div style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '16px',
                    padding: '2rem',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                    border: '1px solid #e2e8f0'
                }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '1.5rem',
                        flexWrap: 'wrap',
                        gap: '1rem'
                    }} className="recent-discharges-header">
                        <h2 style={{
                            fontSize: '1.5rem',
                            fontWeight: '700',
                            color: '#1e293b',
                            margin: '0'
                        }}>
                            Recent Discharges
                        </h2>

                        {/* Search */}
                        <div style={{ position: 'relative', maxWidth: '300px', flex: '1', minWidth: '200px' }} className="search-container">
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
                                    transition: 'all 0.2s ease',
                                    fontFamily: 'inherit',
                                    boxSizing: 'border-box',
                                    backgroundColor: '#FFFFFF'
                                }}
                                onFocus={(e) => {
                                    e.target.style.borderColor = '#007AFF';
                                    e.target.style.boxShadow = '0 0 0 3px rgba(0, 122, 255, 0.1)';
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = '#d1d5db';
                                    e.target.style.boxShadow = 'none';
                                }}
                            />
                            <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="#6D6D72"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                style={{
                                    position: 'absolute',
                                    right: '0.75rem',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    pointerEvents: 'none'
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
                            color: '#6D6D72'
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
                            <p style={{ fontWeight: '400' }}>Loading discharges...</p>
                        </div>
                    ) : filteredDischarges.length === 0 ? (
                        <div style={{
                            textAlign: 'center',
                            padding: '3rem'
                        }}>
                            {searchTerm ? (
                                <>
                                    <div style={{
                                        fontSize: '2rem',
                                        marginBottom: '1rem',
                                        opacity: 0.6
                                    }}>
                                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                            <circle cx="11" cy="11" r="8" />
                                            <path d="m21 21-4.35-4.35" />
                                        </svg>
                                    </div>
                                    <p style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.5rem', color: '#1e293b' }}>
                                        No discharges found
                                    </p>
                                    <p style={{ fontSize: '0.875rem', margin: '0', fontWeight: '400' }}>
                                        Try adjusting your search terms
                                    </p>
                                </>
                            ) : (
                                <>
                                    <div style={{
                                        fontSize: '2rem',
                                        marginBottom: '1rem',
                                        opacity: 0.6
                                    }}>
                                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                            <polyline points="14,2 14,8 20,8" />
                                            <line x1="16" y1="13" x2="8" y2="13" />
                                            <line x1="16" y1="17" x2="8" y2="17" />
                                            <polyline points="10,9 9,9 8,9" />
                                        </svg>
                                    </div>
                                    <p style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.5rem', color: '#1e293b' }}>
                                        No discharges yet
                                    </p>
                                    <p style={{ fontSize: '0.875rem', margin: '0 0 1.5rem 0', fontWeight: '400' }}>
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
                                            fontSize: '0.875rem',
                                            transition: 'all 0.2s ease',
                                            display: 'inline-block'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.transform = 'translateY(-1px)';
                                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 122, 255, 0.25)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.transform = 'translateY(0)';
                                            e.currentTarget.style.boxShadow = 'none';
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
                                    backgroundColor: '#FAFBFC',
                                    transition: 'all 0.2s ease',
                                    cursor: 'pointer'
                                }}
                                    className="discharge-item"
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.borderColor = '#007AFF';
                                        e.currentTarget.style.backgroundColor = '#F8FAFC';
                                        e.currentTarget.style.transform = 'translateY(-1px)';
                                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 122, 255, 0.1)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.borderColor = '#e2e8f0';
                                        e.currentTarget.style.backgroundColor = '#FAFBFC';
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = 'none';
                                    }}
                                >
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'auto 1fr auto',
                                        gap: '1rem',
                                        alignItems: 'center'
                                    }} className="discharge-content">
                                        {/* Pet Icon with Logo */}
                                        <div style={{
                                            width: '48px',
                                            height: '48px',
                                            backgroundColor: '#007AFF',
                                            borderRadius: '12px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            boxShadow: '0 2px 8px rgba(0, 122, 255, 0.25)',
                                            overflow: 'hidden'
                                        }}>
                                            <Image
                                                src="/images/logowhite.png"
                                                alt="PawScript"
                                                width={24}
                                                height={24}
                                                style={{ objectFit: 'contain' }}
                                            />
                                        </div>

                                        {/* Pet Info and Medications */}
                                        <div style={{ minWidth: 0 }}>
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
                                                color: '#6D6D72',
                                                margin: '0 0 0.25rem 0',
                                                fontWeight: '400'
                                            }}>
                                                {discharge.pet.species}
                                                {discharge.pet.weight && ` • ${discharge.pet.weight}`}
                                            </p>
                                            <p style={{
                                                fontSize: '0.75rem',
                                                color: '#94a3b8',
                                                margin: '0 0 0.75rem 0',
                                                fontWeight: '400'
                                            }}>
                                                {discharge.medications.length} medication{discharge.medications.length !== 1 ? 's' : ''} • {formatDate(discharge.createdAt)}
                                            </p>

                                            {/* Medications Preview */}
                                            <div style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '0.25rem'
                                            }} className="medications-preview">
                                                {discharge.medications.slice(0, 2).map((med, index) => (
                                                    <div key={index} style={{
                                                        fontSize: '0.75rem',
                                                        color: '#374151',
                                                        backgroundColor: '#FFFFFF',
                                                        padding: '0.25rem 0.5rem',
                                                        borderRadius: '4px',
                                                        border: '1px solid #e5e7eb',
                                                        fontWeight: '500',
                                                        display: 'inline-block',
                                                        maxWidth: 'fit-content'
                                                    }}>
                                                        {med.name}
                                                        {med.isTapered && (
                                                            <span style={{
                                                                marginLeft: '0.25rem',
                                                                fontSize: '0.625rem',
                                                                backgroundColor: '#ddd6fe',
                                                                color: '#7c3aed',
                                                                padding: '0.125rem 0.25rem',
                                                                borderRadius: '4px',
                                                                fontWeight: '600'
                                                            }}>
                                                                TAPERED
                                                            </span>
                                                        )}
                                                    </div>
                                                ))}
                                                {discharge.medications.length > 2 && (
                                                    <div style={{
                                                        fontSize: '0.75rem',
                                                        color: '#6D6D72',
                                                        fontStyle: 'italic',
                                                        fontWeight: '400'
                                                    }}>
                                                        +{discharge.medications.length - 2} more
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '0.5rem',
                                            minWidth: 'fit-content'
                                        }} className="discharge-actions">
                                            <Link
                                                href={`/discharge/${discharge.id}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{
                                                    backgroundColor: '#F2F2F7',
                                                    color: '#6D6D72',
                                                    border: 'none',
                                                    padding: '0.5rem',
                                                    borderRadius: '6px',
                                                    fontSize: '0.75rem',
                                                    cursor: 'pointer',
                                                    textDecoration: 'none',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    transition: 'all 0.2s ease'
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.backgroundColor = '#E2E8F0';
                                                    e.currentTarget.style.color = '#475569';
                                                    e.currentTarget.style.transform = 'scale(1.05)';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.backgroundColor = '#F2F2F7';
                                                    e.currentTarget.style.color = '#6D6D72';
                                                    e.currentTarget.style.transform = 'scale(1)';
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
                                                    transition: 'all 0.2s ease',
                                                    textAlign: 'center',
                                                    whiteSpace: 'nowrap'
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.backgroundColor = '#0056b3';
                                                    e.currentTarget.style.transform = 'scale(1.05)';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.backgroundColor = '#007AFF';
                                                    e.currentTarget.style.transform = 'scale(1)';
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

            {/* CSS Styles */}
            <style jsx>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                
                /* Mobile Styles */
                @media (max-width: 768px) {
                    .desktop-nav {
                        display: none !important;
                    }
                    
                    .desktop-user {
                        display: none !important;
                    }
                    
                    .mobile-menu-button {
                        display: flex !important;
                    }
                    
                    main {
                        padding: 1rem !important;
                    }
                    
                    .welcome-section {
                        grid-template-columns: 1fr !important;
                        text-align: center !important;
                        gap: 1rem !important;
                    }
                    
                    .welcome-section h1 {
                        font-size: 1.5rem !important;
                    }
                    
                    .create-discharge-btn {
                        width: 100% !important;
                        justify-content: center !important;
                    }
                    
                    .quick-actions {
                        grid-template-columns: 1fr !important;
                    }
                    
                    .recent-discharges-header {
                        flex-direction: column !important;
                        align-items: stretch !important;
                        gap: 1rem !important;
                    }
                    
                    .recent-discharges-header h2 {
                        text-align: center !important;
                    }
                    
                    .search-container {
                        max-width: 100% !important;
                        min-width: 100% !important;
                    }
                    
                    .discharge-content {
                        grid-template-columns: auto 1fr !important;
                        gap: 0.75rem !important;
                    }
                    
                    .discharge-actions {
                        grid-column: 1 / -1 !important;
                        flex-direction: row !important;
                        justify-content: flex-end !important;
                        margin-top: 0.75rem !important;
                    }
                    
                    .medications-preview {
                        margin-top: 0.5rem !important;
                    }
                }
                
                @media (max-width: 640px) {
                    .discharge-item {
                        padding: 1rem !important;
                    }
                    
                    .discharge-actions {
                        justify-content: center !important;
                    }
                }
            `}</style>
        </div>
    );
}