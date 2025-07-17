// src/components/Navigation.tsx
'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Image from 'next/image';
import Link from 'next/link';

interface NavigationProps {
    activeRoute?: string;
}

interface NavItem {
    href: string;
    label: string;
    active: boolean;
}

export default function Navigation({ activeRoute = '/dashboard' }: NavigationProps) {
    const { vetUser, clinic, logout } = useAuth();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const navItems: NavItem[] = [
        { href: '/dashboard', label: 'Dashboard', active: activeRoute === '/dashboard' },
        { href: '/dashboard/clients', label: 'Clients & Pets', active: activeRoute === '/dashboard/clients' },
        { href: '/dashboard/patients', label: 'Medication Monitoring', active: activeRoute === '/dashboard/patients' },
        { href: '/dashboard/new-discharge', label: 'New Discharge', active: activeRoute === '/dashboard/new-discharge' }
    ];

    const handleLogout = async () => {
        try {
            await logout();
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    return (
        <>
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

            {/* CSS Styles */}
            <style jsx>{`
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
                }
            `}</style>
        </>
    );
}