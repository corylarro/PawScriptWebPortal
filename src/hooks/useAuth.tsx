// src/hooks/useAuth.tsx
'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type {
    User,
    Auth
} from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
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

    // Firebase instances - will be lazily loaded
    const [auth, setAuth] = useState<Auth | null>(null);
    const [db, setDb] = useState<Firestore | null>(null);
    const [firebaseLoaded, setFirebaseLoaded] = useState(false);

    // Lazy load Firebase
    useEffect(() => {
        const loadFirebase = async () => {
            try {
                console.log('Loading Firebase...');
                const firebaseModule = await import('@/lib/firebase');
                setAuth(firebaseModule.auth);
                setDb(firebaseModule.db);
                setFirebaseLoaded(true);
                console.log('Firebase loaded successfully');
            } catch (error) {
                console.error('Failed to load Firebase:', error);
                setLoading(false);
            }
        };

        loadFirebase();
    }, []);

    // Load user profile and clinic data when user changes
    const loadUserData = async (firebaseUser: User | null) => {
        if (!firebaseUser || !db) {
            setVetUser(null);
            setClinic(null);
            setLoading(false);
            return;
        }

        try {
            console.log('Loading user data for:', firebaseUser.uid);

            // Dynamic import for Firestore functions
            const { doc, getDoc } = await import('firebase/firestore');

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

    // Listen for authentication state changes - only after Firebase is loaded
    useEffect(() => {
        if (!firebaseLoaded || !auth) return;

        const setupAuthListener = async () => {
            const { onAuthStateChanged } = await import('firebase/auth');

            const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
                console.log('Auth state changed:', firebaseUser?.uid || 'No user');
                setUser(firebaseUser);
                loadUserData(firebaseUser);
            });

            return unsubscribe;
        };

        let unsubscribe: (() => void) | undefined;
        setupAuthListener().then((unsub) => {
            unsubscribe = unsub;
        });

        return () => {
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, [firebaseLoaded, auth, db]);

    const signIn = async (email: string, password: string) => {
        if (!auth) {
            throw new Error('Firebase not loaded');
        }

        setLoading(true);
        try {
            const { signInWithEmailAndPassword } = await import('firebase/auth');
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
        if (!auth || !db) {
            throw new Error('Firebase not loaded');
        }

        setLoading(true);
        try {
            console.log('Starting signup process...');

            // Dynamic imports for Firebase functions
            const { createUserWithEmailAndPassword } = await import('firebase/auth');
            const { doc, setDoc, addDoc, collection } = await import('firebase/firestore');

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
        if (!auth) {
            throw new Error('Firebase not loaded');
        }

        const { signOut } = await import('firebase/auth');
        await signOut(auth);
    };

    const resetPassword = async (email: string) => {
        if (!auth) {
            throw new Error('Firebase not loaded');
        }

        const { sendPasswordResetEmail } = await import('firebase/auth');
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