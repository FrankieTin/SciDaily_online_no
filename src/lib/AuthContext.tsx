import * as React from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  User as FirebaseUser,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

export interface LocalUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
}

interface AuthContextType {
  user: LocalUser | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateProfileData: (updates: { displayName?: string, photoURL?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  loginWithGoogle: async () => {},
  logout: async () => {},
  updateProfileData: async () => {}
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        // Ensure user document exists in Firestore
        const userRef = doc(db, 'users', fbUser.uid);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) {
          await setDoc(userRef, {
            displayName: fbUser.displayName || '科研新星',
            photoURL: fbUser.photoURL || '',
            email: fbUser.email || '',
            theme: 'dustblue',
            visibleTabs: ['time', 'plan', 'fitness', 'papers', 'journal', 'achievements'],
            createdAt: new Date().toISOString()
          });
        }
        
        const userData = userSnap.exists() ? userSnap.data() : null;
        
        setUser({
          uid: fbUser.uid,
          email: fbUser.email || '',
          displayName: userData?.displayName || fbUser.displayName || '科研新星',
          photoURL: userData?.photoURL || fbUser.photoURL || ''
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const logout = async () => {
    await signOut(auth);
  };
  
  const updateProfileData = async (updates: { displayName?: string, photoURL?: string }) => {
    if (!auth.currentUser) return;
    
    // Update Firebase Auth profile
    await updateProfile(auth.currentUser, {
      displayName: updates.displayName,
      photoURL: updates.photoURL
    });

    // Update Firestore document
    const userRef = doc(db, 'users', auth.currentUser.uid);
    await updateDoc(userRef, updates);

    // Update local state
    setUser(prev => prev ? { ...prev, ...updates } : null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginWithGoogle, logout, updateProfileData }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
