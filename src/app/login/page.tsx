// src/app/login/page.tsx (POLISHED VERSION - Inline Styles Only)
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/hooks/useAuth';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [emailFocused, setEmailFocused] = useState(false);
    const [passwordFocused, setPasswordFocused] = useState(false);

    const { signIn, user } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (user) {
            router.push('/dashboard');
        }
    }, [user, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await signIn(email, password);
        } catch (err) {
            console.error('Login error:', err);
            const errorCode = (err as { code?: string })?.code || 'unknown';
            setError(getErrorMessage(errorCode));
        } finally {
            setLoading(false);
        }
    };

    const getErrorMessage = (errorCode: string) => {
        switch (errorCode) {
            case 'auth/user-not-found':
                return 'No account found with this email address.';
            case 'auth/wrong-password':
                return 'Incorrect password. Please try again.';
            case 'auth/invalid-email':
                return 'Please enter a valid email address.';
            case 'auth/too-many-requests':
                return 'Too many failed attempts. Please try again later.';
            default:
                return 'Login failed. Please check your credentials and try again.';
        }
    };

    const inputStyle = (isFocused: boolean) => ({
        width: '100%',
        padding: '0.875rem 1rem',
        border: isFocused ? '2px solid #007AFF' : '1px solid #e2e8f0',
        borderRadius: '8px',
        fontSize: '1rem',
        outline: 'none',
        transition: 'all 0.2s ease',
        backgroundColor: '#ffffff',
        boxShadow: isFocused ? '0 0 0 3px rgba(0, 122, 255, 0.08)' : 'none',
        fontFamily: 'Nunito, -apple-system, BlinkMacSystemFont, sans-serif',
        boxSizing: 'border-box' as const
    });

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f8fafc',
            padding: '2rem 1rem',
            fontFamily: 'Nunito, -apple-system, BlinkMacSystemFont, sans-serif'
        }}>
            <div style={{
                width: '100%',
                maxWidth: '400px'
            }}>
                {/* Main Card */}
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '16px',
                    padding: '2.5rem',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                    border: '1px solid #f1f5f9',
                    boxSizing: 'border-box' as const
                }}>
                    {/* Header with Logo */}
                    <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                        {/* Back to Home Link */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'flex-start',
                            marginBottom: '1rem'
                        }}>
                            <Link
                                href="/"
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
                                onMouseEnter={(e) => e.currentTarget.style.color = '#007AFF'}
                                onMouseLeave={(e) => e.currentTarget.style.color = '#64748b'}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="15,18 9,12 15,6" />
                                </svg>
                                Back to Home
                            </Link>
                        </div>

                        <div style={{
                            display: 'flex',
                            justifyContent: 'center',
                            marginBottom: '1.5rem'
                        }}>
                            <div style={{
                                width: '64px',
                                height: '64px',
                                position: 'relative',
                                borderRadius: '12px',
                                overflow: 'hidden',
                                boxShadow: '0 4px 12px rgba(0, 122, 255, 0.15)',
                                backgroundColor: 'transparent'
                            }}>
                                <Image
                                    src="/images/logoblack.png"
                                    alt="PawScript Logo"
                                    fill
                                    style={{
                                        objectFit: 'contain',
                                        backgroundColor: 'transparent'
                                    }}
                                />
                            </div>
                        </div>
                        <h1 style={{
                            fontSize: '1.875rem',
                            fontWeight: '700',
                            color: '#1e293b',
                            marginBottom: '0.5rem',
                            letterSpacing: '-0.025em'
                        }}>
                            Welcome to PawScript
                        </h1>
                        <p style={{
                            fontSize: '0.875rem',
                            color: '#64748b',
                            fontWeight: '400'
                        }}>
                            Sign in to your veterinary account
                        </p>
                    </div>

                    {/* Login Form */}
                    <div style={{ width: '100%' }}>
                        <form onSubmit={handleSubmit} style={{ width: '100%' }}>
                            {error && (
                                <div style={{
                                    backgroundColor: '#fef2f2',
                                    border: '1px solid #fecaca',
                                    color: '#dc2626',
                                    padding: '0.875rem 1rem',
                                    borderRadius: '8px',
                                    fontSize: '0.875rem',
                                    marginBottom: '1.5rem',
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: '0.5rem',
                                    boxSizing: 'border-box' as const,
                                    width: '100%'
                                }}>
                                    <span style={{ fontSize: '1rem', flexShrink: 0, marginTop: '1px' }}>⚠️</span>
                                    <span>{error}</span>
                                </div>
                            )}

                            <div style={{ marginBottom: '1.25rem', width: '100%' }}>
                                <label style={{
                                    display: 'block',
                                    fontSize: '0.875rem',
                                    fontWeight: '600',
                                    color: '#374151',
                                    marginBottom: '0.5rem'
                                }}>
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    onFocus={() => setEmailFocused(true)}
                                    onBlur={() => setEmailFocused(false)}
                                    placeholder="Enter your email address"
                                    style={inputStyle(emailFocused)}
                                />
                            </div>

                            <div style={{ marginBottom: '1.75rem', width: '100%' }}>
                                <label style={{
                                    display: 'block',
                                    fontSize: '0.875rem',
                                    fontWeight: '600',
                                    color: '#374151',
                                    marginBottom: '0.5rem'
                                }}>
                                    Password
                                </label>
                                <div style={{ position: 'relative', width: '100%' }}>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        onFocus={() => setPasswordFocused(true)}
                                        onBlur={() => setPasswordFocused(false)}
                                        placeholder="Enter your password"
                                        style={{
                                            ...inputStyle(passwordFocused),
                                            paddingRight: '2.75rem'
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        style={{
                                            position: 'absolute',
                                            right: '0.75rem',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            background: 'none',
                                            border: 'none',
                                            color: '#94a3b8',
                                            cursor: 'pointer',
                                            padding: '0.25rem',
                                            borderRadius: '4px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            width: '20px',
                                            height: '20px'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.color = '#64748b'}
                                        onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
                                    >
                                        {showPassword ? (
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                                <line x1="1" y1="1" x2="23" y2="23" />
                                            </svg>
                                        ) : (
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                                <circle cx="12" cy="12" r="3" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                style={{
                                    width: '100%',
                                    backgroundColor: loading ? '#94a3b8' : '#007AFF',
                                    color: 'white',
                                    fontWeight: '600',
                                    fontSize: '1rem',
                                    padding: '0.875rem 1rem',
                                    borderRadius: '8px',
                                    border: 'none',
                                    cursor: loading ? 'not-allowed' : 'pointer',
                                    marginBottom: '1.5rem',
                                    transition: 'all 0.2s ease',
                                    boxShadow: loading ? 'none' : '0 1px 3px rgba(0, 0, 0, 0.1)',
                                    boxSizing: 'border-box' as const
                                }}
                                onMouseEnter={(e) => {
                                    if (!loading) {
                                        e.currentTarget.style.backgroundColor = '#0051D0';
                                        e.currentTarget.style.transform = 'translateY(-1px)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!loading) {
                                        e.currentTarget.style.backgroundColor = '#007AFF';
                                        e.currentTarget.style.transform = 'translateY(0)';
                                    }
                                }}
                            >
                                {loading ? (
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                        <div style={{
                                            width: '16px',
                                            height: '16px',
                                            border: '2px solid transparent',
                                            borderTop: '2px solid white',
                                            borderRadius: '50%',
                                            animation: 'spin 1s linear infinite'
                                        }} />
                                        Signing in...
                                    </div>
                                ) : (
                                    'Sign In'
                                )}
                            </button>

                            <div style={{ textAlign: 'center', width: '100%' }}>
                                <span style={{ fontSize: '0.875rem', color: '#64748b' }}>
                                    {"Don't have an account? "}
                                    <Link
                                        href="/signup"
                                        style={{
                                            color: '#007AFF',
                                            textDecoration: 'none',
                                            fontWeight: '600'
                                        }}
                                    >
                                        Sign up
                                    </Link>
                                </span>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            {/* Add spinning animation */}
            <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
        </div>
    );
}