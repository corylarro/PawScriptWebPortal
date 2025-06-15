// src/hooks/useAuth.tsx
'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
    User,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    sendPasswordResetEmail
} from 'firebase/auth';
import { doc, getDoc, setDoc, addDoc, collection } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { VetUser, Clinic, COLLECTIONS } from '@/types/firestore';

interface AuthContextType {
    user: User | null;
    vetUser: VetUser | null;
    clinic: Clinic | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (email: string, password: string, userData: {
        firstName: string;
        lastName: string;
        clinicName: string;
        clinicPhone: string;
    }) => Promise<void>;
    logout: () => Promise<void>;
    resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<User | null>(null);
    const [vetUser, setVetUser] = useState<VetUser | null>(null);
    const [clinic, setClinic] = useState<Clinic | null>(null);
    const [loading, setLoading] = useState(true);

    // Load user profile and clinic data when user changes
    const loadUserData = async (firebaseUser: User | null) => {
        if (!firebaseUser) {
            setVetUser(null);
            setClinic(null);
            setLoading(false);
            return;
        }

        try {
            console.log('Loading user data for:', firebaseUser.uid);

            // Load vet user profile
            const vetUserDoc = await getDoc(doc(db, COLLECTIONS.VET_USERS, firebaseUser.uid));
            if (vetUserDoc.exists()) {
                const data = vetUserDoc.data();
                console.log('Raw vet user data:', data);

                // Convert Firestore timestamps to Date objects
                const vetUserData: VetUser = {
                    id: vetUserDoc.id,
                    email: data.email,
                    firstName: data.firstName,
                    lastName: data.lastName,
                    clinicId: data.clinicId,
                    role: data.role,
                    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
                    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
                };

                console.log('Processed vet user:', vetUserData);
                setVetUser(vetUserData);

                // Load clinic data
                if (vetUserData.clinicId) {
                    console.log('Loading clinic:', vetUserData.clinicId);
                    const clinicDoc = await getDoc(doc(db, COLLECTIONS.CLINICS, vetUserData.clinicId));
                    if (clinicDoc.exists()) {
                        const clinicRawData = clinicDoc.data();
                        console.log('Raw clinic data:', clinicRawData);

                        // Convert Firestore timestamps to Date objects
                        const clinicData: Clinic = {
                            id: clinicDoc.id,
                            name: clinicRawData.name,
                            address: clinicRawData.address,
                            phone: clinicRawData.phone,
                            email: clinicRawData.email || '',
                            licenseNumber: clinicRawData.licenseNumber,
                            createdAt: clinicRawData.createdAt?.toDate ? clinicRawData.createdAt.toDate() : clinicRawData.createdAt,
                            updatedAt: clinicRawData.updatedAt?.toDate ? clinicRawData.updatedAt.toDate() : clinicRawData.updatedAt,
                        };

                        console.log('Processed clinic:', clinicData);
                        setClinic(clinicData);
                    } else {
                        console.warn('Clinic not found:', vetUserData.clinicId);
                        setClinic(null);
                    }
                } else {
                    console.warn('No clinic ID found for user');
                    setClinic(null);
                }
            } else {
                console.warn('User authenticated but no profile found in Firestore for UID:', firebaseUser.uid);
                setVetUser(null);
                setClinic(null);
            }
        } catch (error) {
            console.error('Error loading user data:', error);
            setVetUser(null);
            setClinic(null);
        } finally {
            setLoading(false);
        }
    };

    // Listen for authentication state changes
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            console.log('Auth state changed:', firebaseUser?.uid || 'No user');
            setUser(firebaseUser);
            loadUserData(firebaseUser);
        });

        return unsubscribe;
    }, []);

    const signIn = async (email: string, password: string) => {
        setLoading(true);
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            setLoading(false);
            throw error;
        }
    };

    const signUp = async (
        email: string,
        password: string,
        userData: {
            firstName: string;
            lastName: string;
            clinicName: string;
            clinicPhone: string;
        }
    ) => {
        setLoading(true);
        try {
            console.log('Starting signup process...');

            // Create Firebase Auth user
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const firebaseUser = userCredential.user;
            console.log('Created Firebase user:', firebaseUser.uid);

            // Create clinic document first
            const clinicData: Omit<Clinic, 'id'> = {
                name: userData.clinicName,
                phone: userData.clinicPhone,
                address: {
                    street: '',
                    city: '',
                    state: '',
                    zipCode: ''
                },
                email: '',
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            console.log('Creating clinic document...');
            const clinicRef = await addDoc(collection(db, COLLECTIONS.CLINICS), clinicData);
            console.log('Created clinic with ID:', clinicRef.id);

            // Create vet user document with reference to clinic
            const vetUserData: Omit<VetUser, 'id'> = {
                email: firebaseUser.email!,
                firstName: userData.firstName,
                lastName: userData.lastName,
                clinicId: clinicRef.id,
                role: 'admin', // First user of a new clinic becomes admin
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            console.log('Creating vet user document...');
            await setDoc(doc(db, COLLECTIONS.VET_USERS, firebaseUser.uid), vetUserData);
            console.log('Created vet user document');

            // Manually trigger data loading after creating documents
            await loadUserData(firebaseUser);

        } catch (error) {
            console.error('Signup error:', error);
            setLoading(false);
            throw error;
        }
    };

    const logout = async () => {
        await signOut(auth);
    };

    const resetPassword = async (email: string) => {
        await sendPasswordResetEmail(auth, email);
    };

    const value: AuthContextType = {
        user,
        vetUser,
        clinic,
        loading,
        signIn,
        signUp,
        logout,
        resetPassword,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}