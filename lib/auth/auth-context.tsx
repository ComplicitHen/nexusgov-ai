'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  signInWithPopup,
  GoogleAuthProvider,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/config';
import { User, UserRole } from '@/types';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch user data from Firestore
  const fetchUserData = async (firebaseUser: FirebaseUser): Promise<User | null> => {
    try {
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));

      if (userDoc.exists()) {
        const data = userDoc.data();
        return {
          id: firebaseUser.uid,
          email: firebaseUser.email!,
          displayName: firebaseUser.displayName || data.displayName || 'User',
          organizationId: data.organizationId,
          role: data.role || 'USER',
          createdAt: data.createdAt?.toDate() || new Date(),
          lastLoginAt: new Date(),
          personalBudget: data.personalBudget,
          preferences: data.preferences || {
            language: 'sv',
            enableCitations: true,
          },
        };
      }

      return null;
    } catch (error) {
      console.error('Error fetching user data:', error);
      return null;
    }
  };

  // Create new user document in Firestore
  const createUserDocument = async (firebaseUser: FirebaseUser) => {
    try {
      const userData: Partial<User> = {
        email: firebaseUser.email!,
        displayName: firebaseUser.displayName || 'User',
        organizationId: '', // Will be set by admin
        role: 'USER',
        createdAt: new Date(),
        lastLoginAt: new Date(),
        preferences: {
          language: 'sv',
          enableCitations: true,
        },
      };

      await setDoc(doc(db, 'users', firebaseUser.uid), {
        ...userData,
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
      });

      return userData as User;
    } catch (error) {
      console.error('Error creating user document:', error);
      throw error;
    }
  };

  // Update last login time
  const updateLastLogin = async (userId: string) => {
    try {
      await setDoc(
        doc(db, 'users', userId),
        { lastLoginAt: serverTimestamp() },
        { merge: true }
      );
    } catch (error) {
      console.error('Error updating last login:', error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setFirebaseUser(firebaseUser);

      if (firebaseUser) {
        // Update last login
        await updateLastLogin(firebaseUser.uid);

        // Fetch user data
        let userData = await fetchUserData(firebaseUser);

        // If user document doesn't exist, create it
        if (!userData) {
          userData = await createUserDocument(firebaseUser);
        }

        setUser(userData);
      } else {
        setUser(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      console.error('Sign in error:', error);
      throw new Error(getAuthErrorMessage(error.code));
    }
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);

      // Update profile with display name
      await updateProfile(userCredential.user, { displayName });

      // Create user document
      await createUserDocument(userCredential.user);
    } catch (error: any) {
      console.error('Sign up error:', error);
      throw new Error(getAuthErrorMessage(error.code));
    }
  };

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error('Google sign in error:', error);
      throw new Error(getAuthErrorMessage(error.code));
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  };

  const refreshUser = async () => {
    if (firebaseUser) {
      const userData = await fetchUserData(firebaseUser);
      setUser(userData);
    }
  };

  const value: AuthContextType = {
    user,
    firebaseUser,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Helper function to get user-friendly error messages in Swedish
function getAuthErrorMessage(errorCode: string): string {
  const errorMessages: { [key: string]: string } = {
    'auth/email-already-in-use': 'E-postadressen används redan av ett annat konto.',
    'auth/invalid-email': 'Ogiltig e-postadress.',
    'auth/operation-not-allowed': 'Denna åtgärd är inte tillåten.',
    'auth/weak-password': 'Lösenordet är för svagt. Använd minst 6 tecken.',
    'auth/user-disabled': 'Detta konto har inaktiverats.',
    'auth/user-not-found': 'Ingen användare hittades med denna e-postadress.',
    'auth/wrong-password': 'Felaktigt lösenord.',
    'auth/too-many-requests': 'För många misslyckade inloggningsförsök. Försök igen senare.',
    'auth/network-request-failed': 'Nätverksfel. Kontrollera din internetanslutning.',
    'auth/popup-closed-by-user': 'Inloggningsfönstret stängdes.',
  };

  return errorMessages[errorCode] || 'Ett oväntat fel inträffade. Försök igen.';
}
