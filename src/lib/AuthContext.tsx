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
  loginWithEmailCode: (email: string, code: string, verificationInfo: any) => Promise<void>;
  registerWithEmail: (email: string, code: string, verificationInfo: any, pass: string) => Promise<void>;
  sendEmailCode: (email: string) => Promise<any>;
  sendPhoneCode: (phone: string) => Promise<any>;
  loginWithPhonePassword: (phone: string, pass: string) => Promise<void>;
  loginWithPhoneCode: (phone: string, code: string, verificationInfo: any) => Promise<void>;
  registerWithPhone: (phone: string, code: string, verificationInfo: any, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfileData: (updates: { displayName?: string, photoURL?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  loginWithEmail: async () => {},
  loginWithEmailCode: async () => {},
  registerWithEmail: async () => {},
  sendEmailCode: async () => undefined as any,
  sendPhoneCode: async () => undefined as any,
  loginWithPhonePassword: async () => {},
  loginWithPhoneCode: async () => {},
  registerWithPhone: async () => {},
  logout: async () => {},
  updateProfileData: async () => {}
});

const DEFAULT_VISIBLE_TABS = ['time', 'plan', 'fitness', 'papers', 'journal', 'achievements'];
const DEFAULT_DISPLAY_NAME = '科研新星';

const cleanPhone = (phone: string) => phone.trim().replace(/[\s-]/g, '');

const normalizePhone = (phone: string) => {
  const cleanedPhone = cleanPhone(phone);
  return cleanedPhone.startsWith('+') ? cleanedPhone : `+86${cleanedPhone}`;
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (typeof error === 'string' && error.trim()) {
    return error;
  }

  if (error && typeof error === 'object') {
    const errorObj = error as Record<string, any>;

    if (typeof errorObj.message === 'string' && errorObj.message.trim()) {
      return errorObj.message;
    }

    if (typeof errorObj.error_description === 'string' && errorObj.error_description.trim()) {
      return errorObj.error_description;
    }

    if (typeof errorObj.msg === 'string' && errorObj.msg.trim()) {
      return errorObj.msg;
    }

    if (typeof errorObj.code === 'string' && errorObj.code.trim()) {
      return errorObj.code;
    }
  }

  return fallback;
};

const ensureAuthResult = (result: any, fallbackMessage: string) => {
  if (result?.error) {
    throw new Error(getErrorMessage(result.error, fallbackMessage));
  }

  return result;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [loading, setLoading] = useState(true);
  const authAny = auth as any;

  const getAuthenticatedUser = async (candidate?: any) => {
    if (candidate?.uid) {
      return candidate;
    }

    try {
      if (typeof authAny.getCurrentUser === 'function') {
        const currentUser = await authAny.getCurrentUser();
        if (currentUser?.uid) {
          return currentUser;
        }
      }
    } catch (error) {
      console.warn('Failed to get current user from getCurrentUser:', error);
    }

    try {
      if (typeof authAny.getLoginState === 'function') {
        const loginState = await authAny.getLoginState();
        if (loginState?.user?.uid) {
          return loginState.user;
        }
      }
    } catch (error) {
      console.warn('Failed to get login state from getLoginState:', error);
    }

    try {
      if (typeof authAny.hasLoginState === 'function') {
        const loginState = authAny.hasLoginState();
        if (loginState?.user?.uid) {
          return loginState.user;
        }
      }
    } catch (error) {
      console.warn('Failed to get login state from hasLoginState:', error);
    }

    if (authAny.currentUser?.uid) {
      return authAny.currentUser;
    }

    return null;
  };

  const readUserProfile = async (uid: string) => {
    const { data } = await db.collection('users').doc(uid).get();

    if (Array.isArray(data)) {
      return data[0] || null;
    }

    return data || null;
  };

  const buildDefaultProfile = (tcbUser: any) => ({
    displayName: tcbUser.nickname || tcbUser.username || DEFAULT_DISPLAY_NAME,
    photoURL: '',
    email: tcbUser.email || '',
    phone: tcbUser.phoneNumber || tcbUser.phone_number || '',
    theme: 'dustblue',
    visibleTabs: DEFAULT_VISIBLE_TABS,
    createdAt: new Date().toISOString()
  });

  const syncUserSession = async (candidate?: any) => {
    if (!auth || !db) {
      setUser(null);
      return null;
    }

    const tcbUser = await getAuthenticatedUser(candidate);

    if (!tcbUser?.uid) {
      setUser(null);
      return null;
    }

    let userData: any = null;

    try {
      userData = await readUserProfile(tcbUser.uid);

      if (!userData) {
        userData = buildDefaultProfile(tcbUser);
        await db.collection('users').doc(tcbUser.uid).set(userData);
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      try {
        userData = buildDefaultProfile(tcbUser);
        await db.collection('users').doc(tcbUser.uid).set(userData);
      } catch (createError) {
        console.error('Failed to create default user profile:', createError);
      }
    }

    const nextUser: LocalUser = {
      uid: tcbUser.uid,
      email: tcbUser.email || userData?.email || '',
      phone: tcbUser.phoneNumber || tcbUser.phone_number || userData?.phone || '',
      displayName: userData?.displayName || tcbUser.nickname || tcbUser.username || DEFAULT_DISPLAY_NAME,
      photoURL: userData?.photoURL || tcbUser.picture || ''
    };

    setUser(nextUser);
    return nextUser;
  };

  const saveUserProfile = async (uid: string, baseUser: any, updates: { displayName?: string, photoURL?: string }) => {
    const existingProfile = await readUserProfile(uid);
    const nextProfile = {
      ...buildDefaultProfile(baseUser),
      ...(existingProfile || {}),
      ...updates
    };

    await db.collection('users').doc(uid).set(nextProfile);
    return nextProfile;
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (!auth || !db) {
          console.warn('CloudBase not initialized');
          return;
        }
        await syncUserSession();

        if (typeof authAny.onLoginStateChanged === 'function') {
          await authAny.onLoginStateChanged(async (loginState: any) => {
            try {
              await syncUserSession(loginState?.user);
            } catch (error) {
              console.error('Auth state sync error:', error);
              setUser(null);
            } finally {
              setLoading(false);
            }
          });
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const loginWithEmail = async (email: string, pass: string) => {
    try {
      const result = await authAny.signInWithPassword({
        email: email.trim(),
        password: pass
      });
      ensureAuthResult(result, '邮箱登录失败');
      await syncUserSession(result?.data?.user);
    } catch (error) {
      throw new Error(getErrorMessage(error, '邮箱登录失败'));
    }
  };

  const sendEmailCode = async (email: string) => {
    try {
      return await authAny.getVerification({ email: email.trim() });
    } catch (error) {
      throw new Error(getErrorMessage(error, '发送邮箱验证码失败'));
    }
  };

  const loginWithEmailCode = async (email: string, code: string, verificationInfo: any) => {
    if (!verificationInfo?.verification_id) {
      throw new Error('请先获取邮箱验证码');
    }

    try {
      const result = await authAny.verifyOtp({
        email: email.trim(),
        token: code.trim(),
        messageId: verificationInfo.verification_id
      });
      ensureAuthResult(result, '邮箱验证码登录失败');
      await syncUserSession(result?.data?.user);
    } catch (error) {
      throw new Error(getErrorMessage(error, '邮箱验证码登录失败'));
    }
  };

  const registerWithEmail = async (email: string, code: string, verificationInfo: any, pass: string) => {
    if (!verificationInfo?.verification_id) {
      throw new Error('请先获取邮箱验证码');
    }

    try {
      const verificationTokenRes = await authAny.verify({
        verification_id: verificationInfo.verification_id,
        verification_code: code.trim()
      });

      await authAny.signUp({
        email: email.trim(),
        verification_code: code.trim(),
        verification_token: verificationTokenRes.verification_token,
        password: pass
      });

      await syncUserSession();
    } catch (error) {
      throw new Error(getErrorMessage(error, '邮箱注册失败'));
    }
  };

  const sendPhoneCode = async (phone: string) => {
    try {
      return await authAny.getVerification({
        phone_number: normalizePhone(phone)
      });
    } catch (error) {
      throw new Error(getErrorMessage(error, '发送短信验证码失败'));
    }
  };

  const loginWithPhonePassword = async (phone: string, pass: string) => {
    try {
      const result = await authAny.signInWithPassword({
        phone: cleanPhone(phone),
        password: pass
      });
      ensureAuthResult(result, '手机号登录失败');
      await syncUserSession(result?.data?.user);
    } catch (error) {
      throw new Error(getErrorMessage(error, '手机号登录失败'));
    }
  };

  const loginWithPhoneCode = async (phone: string, code: string, verificationInfo: any) => {
    if (!verificationInfo?.verification_id) {
      throw new Error('请先获取短信验证码');
    }

    try {
      const result = await authAny.verifyOtp({
        phone: cleanPhone(phone),
        token: code.trim(),
        messageId: verificationInfo.verification_id
      });
      ensureAuthResult(result, '验证码登录失败');
      await syncUserSession(result?.data?.user);
    } catch (error) {
      throw new Error(getErrorMessage(error, '验证码登录失败'));
    }
  };

  const registerWithPhone = async (phone: string, code: string, verificationInfo: any, pass: string) => {
    if (!verificationInfo?.verification_id) {
      throw new Error('请先获取短信验证码');
    }

    try {
      const verificationTokenRes = await authAny.verify({
        verification_id: verificationInfo.verification_id,
        verification_code: code.trim()
      });

      await authAny.signUp({
        phone_number: normalizePhone(phone),
        verification_code: code.trim(),
        verification_token: verificationTokenRes.verification_token,
        password: pass
      });

      await syncUserSession();
    } catch (error) {
      throw new Error(getErrorMessage(error, '手机号注册失败'));
    }
  };

  const logout = async () => {
    try {
      await authAny.signOut();
      setUser(null);
    } catch (error) {
      throw new Error(getErrorMessage(error, '退出登录失败'));
    }
  };
  
  const updateProfileData = async (updates: { displayName?: string, photoURL?: string }) => {
    try {
      const currentUser = await getAuthenticatedUser();

      if (!currentUser?.uid) {
        return;
      }

      const savedProfile = await saveUserProfile(currentUser.uid, currentUser, updates);

      setUser(prev => prev ? {
        ...prev,
        displayName: savedProfile.displayName || prev.displayName,
        photoURL: savedProfile.photoURL || prev.photoURL,
        email: savedProfile.email || prev.email,
        phone: savedProfile.phone || prev.phone
      } : {
        uid: currentUser.uid,
        email: currentUser.email || savedProfile.email || '',
        phone: currentUser.phoneNumber || currentUser.phone_number || savedProfile.phone || '',
        displayName: savedProfile.displayName || currentUser.nickname || currentUser.username || DEFAULT_DISPLAY_NAME,
        photoURL: savedProfile.photoURL || currentUser.picture || ''
      });
    } catch (error) {
      console.error('Failed to update profile:', error);
      throw new Error(getErrorMessage(error, '更新资料失败'));
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      loginWithEmail, 
      loginWithEmailCode,
      registerWithEmail, 
      sendEmailCode, 
      sendPhoneCode, 
      loginWithPhonePassword, 
      loginWithPhoneCode, 
      registerWithPhone, 
      logout, 
      updateProfileData 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
