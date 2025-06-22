// src/app/signup/page.tsx (POLISHED VERSION - Inline Styles Only)
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/hooks/useAuth';

export default function SignupPage() {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: '',
        clinicName: '',
        clinicPhone: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [focusedField, setFocusedField] = useState<string>('');
    const [showPasswordValidation, setShowPasswordValidation] = useState(false);

    const { signUp, user } = useAuth();
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

        // Validation
        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match.');
            setLoading(false);
            return;
        }

        if (formData.password.length < 8 || !isPasswordValid(formData.password)) {
            setError('Please ensure your password meets all requirements.');
            setLoading(false);
            return;
        }

        // Phone number validation
        const phoneDigits = formData.clinicPhone.replace(/\D/g, '');
        if (phoneDigits.length !== 10) {
            setError('Please enter a valid 10-digit phone number.');
            setLoading(false);
            return;
        }

        try {
            await signUp(formData.email, formData.password, {
                firstName: formData.firstName,
                lastName: formData.lastName,
                clinicName: formData.clinicName,
                clinicPhone: formData.clinicPhone
            });
        } catch (err) {
            console.error('Signup error:', err);
            const errorCode = (err as { code?: string })?.code || 'unknown';
            setError(getErrorMessage(errorCode));
        } finally {
            setLoading(false);
        }
    };

    const getErrorMessage = (errorCode: string) => {
        switch (errorCode) {
            case 'auth/email-already-in-use':
                return 'An account with this email already exists.';
            case 'auth/invalid-email':
                return 'Please enter a valid email address.';
            case 'auth/operation-not-allowed':
                return 'Email/password accounts are not enabled.';
            case 'auth/weak-password':
                return 'Password should be at least 6 characters.';
            default:
                return 'Failed to create account. Please try again.';
        }
    };

    // Password validation functions
    const getPasswordValidation = (password: string) => {
        return {
            length: password.length >= 8,
            hasNumber: /\d/.test(password),
            hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password),
            hasUpper: /[A-Z]/.test(password),
            hasLower: /[a-z]/.test(password)
        };
    };

    const isPasswordValid = (password: string) => {
        const validation = getPasswordValidation(password);
        return validation.length && validation.hasNumber && validation.hasSpecial && validation.hasUpper && validation.hasLower;
    };

    // Phone number formatting
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

    const handlePhoneChange = (value: string) => {
        const formattedPhone = formatPhoneNumber(value);
        handleInputChange('clinicPhone', formattedPhone);
    };

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
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
                maxWidth: '500px'
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
                            Join PawScript
                        </h1>
                        <p style={{
                            fontSize: '0.875rem',
                            color: '#64748b',
                            fontWeight: '400'
                        }}>
                            Create your veterinary account and clinic
                        </p>
                    </div>

                    {/* Signup Form */}
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

                            {/* Personal Information Section */}
                            <div style={{ marginBottom: '2rem' }}>
                                <h3 style={{
                                    fontSize: '1.125rem',
                                    fontWeight: '600',
                                    color: '#1e293b',
                                    marginBottom: '1rem',
                                    borderBottom: '2px solid #f1f5f9',
                                    paddingBottom: '0.5rem'
                                }}>
                                    Your Information
                                </h3>

                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                    gap: '1rem',
                                    marginBottom: '1.25rem'
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
                                            required
                                            value={formData.firstName}
                                            onChange={(e) => handleInputChange('firstName', e.target.value)}
                                            onFocus={() => setFocusedField('firstName')}
                                            onBlur={() => setFocusedField('')}
                                            placeholder="Enter your first name"
                                            style={inputStyle(focusedField === 'firstName')}
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
                                            required
                                            value={formData.lastName}
                                            onChange={(e) => handleInputChange('lastName', e.target.value)}
                                            onFocus={() => setFocusedField('lastName')}
                                            onBlur={() => setFocusedField('')}
                                            placeholder="Enter your last name"
                                            style={inputStyle(focusedField === 'lastName')}
                                        />
                                    </div>
                                </div>

                                <div style={{ marginBottom: '1.25rem' }}>
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
                                        value={formData.email}
                                        onChange={(e) => handleInputChange('email', e.target.value)}
                                        onFocus={() => setFocusedField('email')}
                                        onBlur={() => setFocusedField('')}
                                        placeholder="Enter your email address"
                                        style={inputStyle(focusedField === 'email')}
                                    />
                                </div>

                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                    gap: '1rem'
                                }}>
                                    <div>
                                        <label style={{
                                            display: 'block',
                                            fontSize: '0.875rem',
                                            fontWeight: '600',
                                            color: '#374151',
                                            marginBottom: '0.5rem'
                                        }}>
                                            Password
                                        </label>
                                        <div style={{ position: 'relative' }}>
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                required
                                                value={formData.password}
                                                onChange={(e) => handleInputChange('password', e.target.value)}
                                                onFocus={() => {
                                                    setFocusedField('password');
                                                    setShowPasswordValidation(true);
                                                }}
                                                onBlur={() => {
                                                    setFocusedField('');
                                                    if (formData.password === '') {
                                                        setShowPasswordValidation(false);
                                                    }
                                                }}
                                                placeholder="Create password"
                                                style={{
                                                    ...inputStyle(focusedField === 'password'),
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

                                        {/* Password Validation */}
                                        {(showPasswordValidation || formData.password.length > 0) && (
                                            <div style={{
                                                marginTop: '0.75rem',
                                                padding: '1rem',
                                                backgroundColor: '#f8fafc',
                                                borderRadius: '8px',
                                                border: '1px solid #e2e8f0'
                                            }}>
                                                <div style={{
                                                    fontSize: '0.75rem',
                                                    fontWeight: '600',
                                                    color: '#374151',
                                                    marginBottom: '0.5rem'
                                                }}>
                                                    Password Requirements:
                                                </div>
                                                {Object.entries({
                                                    'At least 8 characters': getPasswordValidation(formData.password).length,
                                                    'Contains a number': getPasswordValidation(formData.password).hasNumber,
                                                    'Contains a special character': getPasswordValidation(formData.password).hasSpecial,
                                                    'Contains uppercase letter': getPasswordValidation(formData.password).hasUpper,
                                                    'Contains lowercase letter': getPasswordValidation(formData.password).hasLower
                                                }).map(([requirement, met]) => (
                                                    <div key={requirement} style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '0.5rem',
                                                        fontSize: '0.75rem',
                                                        marginBottom: '0.25rem'
                                                    }}>
                                                        <span style={{
                                                            color: met ? '#22c55e' : '#ef4444',
                                                            fontWeight: 'bold'
                                                        }}>
                                                            {met ? '✓' : '✗'}
                                                        </span>
                                                        <span style={{
                                                            color: met ? '#16a34a' : '#dc2626'
                                                        }}>
                                                            {requirement}
                                                        </span>
                                                    </div>
                                                ))}
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
                                            Confirm Password
                                        </label>
                                        <div style={{ position: 'relative' }}>
                                            <input
                                                type={showConfirmPassword ? 'text' : 'password'}
                                                required
                                                value={formData.confirmPassword}
                                                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                                                onFocus={() => setFocusedField('confirmPassword')}
                                                onBlur={() => setFocusedField('')}
                                                placeholder="Confirm password"
                                                style={{
                                                    ...inputStyle(focusedField === 'confirmPassword'),
                                                    paddingRight: '2.75rem'
                                                }}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
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
                                                {showConfirmPassword ? (
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

                                        {/* Password Match Validation */}
                                        {formData.confirmPassword && (
                                            <div style={{
                                                marginTop: '0.5rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.5rem',
                                                fontSize: '0.75rem'
                                            }}>
                                                <span style={{
                                                    color: formData.password === formData.confirmPassword ? '#22c55e' : '#ef4444',
                                                    fontWeight: 'bold'
                                                }}>
                                                    {formData.password === formData.confirmPassword ? '✓' : '✗'}
                                                </span>
                                                <span style={{
                                                    color: formData.password === formData.confirmPassword ? '#16a34a' : '#dc2626'
                                                }}>
                                                    Passwords {formData.password === formData.confirmPassword ? 'match' : 'do not match'}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Clinic Information Section */}
                            <div style={{ marginBottom: '2rem' }}>
                                <h3 style={{
                                    fontSize: '1.125rem',
                                    fontWeight: '600',
                                    color: '#1e293b',
                                    marginBottom: '1rem',
                                    borderBottom: '2px solid #f1f5f9',
                                    paddingBottom: '0.5rem'
                                }}>
                                    Clinic Information
                                </h3>

                                <div style={{ marginBottom: '1.25rem' }}>
                                    <label style={{
                                        display: 'block',
                                        fontSize: '0.875rem',
                                        fontWeight: '600',
                                        color: '#374151',
                                        marginBottom: '0.5rem'
                                    }}>
                                        Clinic Name
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.clinicName}
                                        onChange={(e) => handleInputChange('clinicName', e.target.value)}
                                        onFocus={() => setFocusedField('clinicName')}
                                        onBlur={() => setFocusedField('')}
                                        placeholder="Enter your clinic name"
                                        style={inputStyle(focusedField === 'clinicName')}
                                    />
                                </div>

                                <div style={{ marginBottom: '0' }}>
                                    <label style={{
                                        display: 'block',
                                        fontSize: '0.875rem',
                                        fontWeight: '600',
                                        color: '#374151',
                                        marginBottom: '0.5rem'
                                    }}>
                                        Clinic Phone
                                    </label>
                                    <input
                                        type="tel"
                                        required
                                        value={formData.clinicPhone}
                                        onChange={(e) => handlePhoneChange(e.target.value)}
                                        onFocus={() => setFocusedField('clinicPhone')}
                                        onBlur={() => setFocusedField('')}
                                        placeholder="(555) 123-4567"
                                        maxLength={14}
                                        style={inputStyle(focusedField === 'clinicPhone')}
                                    />

                                    {/* Phone validation indicator */}
                                    {formData.clinicPhone && (
                                        <div style={{
                                            marginTop: '0.5rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                            fontSize: '0.75rem'
                                        }}>
                                            <span style={{
                                                color: formData.clinicPhone.replace(/\D/g, '').length === 10 ? '#22c55e' : '#ef4444',
                                                fontWeight: 'bold'
                                            }}>
                                                {formData.clinicPhone.replace(/\D/g, '').length === 10 ? '✓' : '✗'}
                                            </span>
                                            <span style={{
                                                color: formData.clinicPhone.replace(/\D/g, '').length === 10 ? '#16a34a' : '#dc2626'
                                            }}>
                                                {formData.clinicPhone.replace(/\D/g, '').length === 10
                                                    ? 'Valid phone number'
                                                    : `${formData.clinicPhone.replace(/\D/g, '').length}/10 digits`}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div style={{
                                    marginTop: '1rem',
                                    padding: '1rem',
                                    backgroundColor: '#f8fafc',
                                    borderRadius: '8px',
                                    border: '1px solid #e2e8f0'
                                }}>
                                    <p style={{
                                        fontSize: '0.875rem',
                                        color: '#64748b',
                                        margin: '0',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem'
                                    }}>
                                        <span style={{
                                            width: '20px',
                                            height: '20px',
                                            backgroundColor: '#007AFF',
                                            borderRadius: '50%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '0.75rem',
                                            color: 'white',
                                            fontWeight: '700',
                                            flexShrink: 0
                                        }}>i</span>
                                        <span>We&apos;ll help you complete your clinic profile after you create your account.</span>
                                    </p>
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
                                        Creating Account...
                                    </div>
                                ) : (
                                    'Create Account'
                                )}
                            </button>

                            <div style={{ textAlign: 'center', width: '100%' }}>
                                <span style={{ fontSize: '0.875rem', color: '#64748b' }}>
                                    Already have an account? {' '}
                                    <Link
                                        href="/login"
                                        style={{
                                            color: '#007AFF',
                                            textDecoration: 'none',
                                            fontWeight: '600'
                                        }}
                                    >
                                        Sign in
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