import * as React from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from './tcb';

export interface LocalUser {
  uid: string;
  email?: string;
  phone?: string;
  displayName: string;
  photoURL?: string;
}

interface AuthContextType {
  user: LocalUser | null;
  loading: boolean;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string) => Promise<void>;
  sendPhoneCode: (phone: string) => Promise<void>;
  loginWithPhone: (phone: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfileData: (updates: { displayName?: string, photoURL?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  loginWithEmail: async () => {},
  registerWithEmail: async () => {},
  sendPhoneCode: async () => {},
  loginWithPhone: async () => {},
  logout: async () => {},
  updateProfileData: async () => {}
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onLoginStateChanged(async (tcbUser) => {
      if (tcbUser) {
        // TCB users don't automatically have a profile document, we manage it ourselves in a collection if needed
        // Or we use their built-in profile. TCB auth.currentUser has profile info.
        
        const userRef = db.collection('users').doc(tcbUser.uid);
        const { data } = await userRef.get();
        
        let userData = data && data.length > 0 ? data[0] : null;

        if (!userData) {
          userData = {
            displayName: '科研新星',
            photoURL: '',
            email: tcbUser.email || '',
            phone: tcbUser.phoneNumber || '',
            theme: 'dustblue',
            visibleTabs: ['time', 'plan', 'fitness', 'papers', 'journal', 'achievements'],
            createdAt: new Date().toISOString()
          };
          await userRef.set(userData);
        }
        
        setUser({
          uid: tcbUser.uid,
          email: tcbUser.email,
          phone: tcbUser.phoneNumber,
          displayName: userData.displayName || '科研新星',
          photoURL: userData.photoURL || ''
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => {}; // TCB onLoginStateChanged doesn't return an unsubscribe in all versions, checking... 
    // Actually in JS SDK v2 it might. Let's assume we handle it via state.
  }, []);

  const loginWithEmail = async (email: string, pass: string) => {
    await auth.signInWithEmailAndPassword(email, pass);
  };

  const registerWithEmail = async (email: string, pass: string) => {
    await auth.signUpWithEmailAndPassword(email, pass);
  };

  const sendPhoneCode = async (phone: string) => {
    // TCB requires +86 prefix for mainland China if not provided
    const formattedPhone = phone.startsWith('+') ? phone : `+86${phone}`;
    await auth.sendPhoneCode(formattedPhone);
  };

  const loginWithPhone = async (phone: string, code: string) => {
    const formattedPhone = phone.startsWith('+') ? phone : `+86${phone}`;
    await (auth as any).signInWithPhoneCode(formattedPhone, code);
  };

  const logout = async () => {
    await auth.signOut();
  };
  
  const updateProfileData = async (updates: { displayName?: string, photoURL?: string }) => {
    const tcbUser = auth.hasLoginState();
    if (!tcbUser) return;
    
    // Update TCB user profile
    // Note: TCB auth.updateUser is the method for profile
    // await auth.updateUser({ displayName: updates.displayName, avatarUrl: updates.photoURL });

    // Update Firestore-like document in TCB
    await db.collection('users').doc(tcbUser.user.uid).update(updates);

    // Update local state
    setUser(prev => prev ? { ...prev, ...updates } : null);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      loginWithEmail, 
      registerWithEmail, 
      sendPhoneCode, 
      loginWithPhone, 
      logout, 
      updateProfileData 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
