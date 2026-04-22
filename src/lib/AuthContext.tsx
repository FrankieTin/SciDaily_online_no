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

export interface VerificationInfo {
  verification_id: string;
  is_user?: boolean;
  [key: string]: unknown;
}

interface AuthContextType {
  user: LocalUser | null;
  loading: boolean;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  loginWithEmailCode: (email: string, code: string, verificationInfo: VerificationInfo) => Promise<void>;
  registerWithEmail: (email: string, code: string, verificationInfo: VerificationInfo, pass: string) => Promise<void>;
  sendEmailCode: (email: string) => Promise<VerificationInfo>;
  sendPhoneCode: (phone: string) => Promise<VerificationInfo>;
  loginWithPhonePassword: (phone: string, pass: string) => Promise<void>;
  loginWithPhoneCode: (phone: string, code: string, verificationInfo: VerificationInfo) => Promise<void>;
  registerWithPhone: (phone: string, code: string, verificationInfo: VerificationInfo, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfileData: (updates: { displayName?: string; photoURL?: string }) => Promise<void>;
}

const noop = async () => {};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  loginWithEmail: noop,
  loginWithEmailCode: noop,
  registerWithEmail: noop,
  sendEmailCode: async () => ({ verification_id: '' }),
  sendPhoneCode: async () => ({ verification_id: '' }),
  loginWithPhonePassword: noop,
  loginWithPhoneCode: noop,
  registerWithPhone: noop,
  logout: noop,
  updateProfileData: noop,
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
    const errorObj = error as Record<string, unknown>;

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

    if (errorObj.error && typeof errorObj.error === 'object') {
      return getErrorMessage(errorObj.error, fallback);
    }
  }

  return fallback;
};

const ensureAuthResult = <T,>(result: T, fallbackMessage: string) => {
  const resultWithError = result as T & { error?: unknown };

  if (resultWithError?.error) {
    throw new Error(getErrorMessage(resultWithError.error, fallbackMessage));
  }

  return result;
};

const extractUserCandidate = (candidate?: unknown) => {
  if (!candidate || typeof candidate !== 'object') {
    return null;
  }

  const candidateObj = candidate as Record<string, unknown>;

  if (candidateObj.user && typeof candidateObj.user === 'object') {
    return candidateObj.user as Record<string, unknown>;
  }

  if (candidateObj.data && typeof candidateObj.data === 'object') {
    const dataObj = candidateObj.data as Record<string, unknown>;
    if (dataObj.user && typeof dataObj.user === 'object') {
      return dataObj.user as Record<string, unknown>;
    }
  }

  if (typeof candidateObj.uid === 'string' && candidateObj.uid) {
    return candidateObj;
  }

  return null;
};

const buildDefaultProfile = (tcbUser: Record<string, unknown>) => ({
  displayName:
    (typeof tcbUser.nickname === 'string' && tcbUser.nickname) ||
    (typeof tcbUser.username === 'string' && tcbUser.username) ||
    DEFAULT_DISPLAY_NAME,
  photoURL: '',
  email: typeof tcbUser.email === 'string' ? tcbUser.email : '',
  phone:
    (typeof tcbUser.phoneNumber === 'string' && tcbUser.phoneNumber) ||
    (typeof tcbUser.phone_number === 'string' && tcbUser.phone_number) ||
    '',
  theme: 'dustblue',
  visibleTabs: DEFAULT_VISIBLE_TABS,
  createdAt: new Date().toISOString(),
});

const sanitizeProfileData = (profile: Record<string, unknown> | null | undefined) => {
  if (!profile) {
    return null;
  }

  return Object.fromEntries(
    Object.entries(profile).filter(([key]) => !key.startsWith('_')),
  ) as Record<string, unknown>;
};

const readUserProfile = async (uid: string) => {
  const { data } = await db.collection('users').doc(uid).get();

  if (Array.isArray(data)) {
    return sanitizeProfileData(data[0] || null);
  }

  return sanitizeProfileData(data || null);
};

const runAttempts = async <T,>(attempts: Array<() => Promise<T>>) => {
  let lastError: unknown;

  for (const attempt of attempts) {
    try {
      return await attempt();
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [loading, setLoading] = useState(true);
  const authAny = auth as any;

  const getAuthenticatedUser = async (candidate?: unknown) => {
    const normalizedCandidate = extractUserCandidate(candidate);
    if (typeof normalizedCandidate?.uid === 'string' && normalizedCandidate.uid) {
      return normalizedCandidate;
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

  const syncUserSession = async (candidate?: unknown) => {
    const tcbUser = await getAuthenticatedUser(candidate);

    if (!tcbUser?.uid) {
      setUser(null);
      return null;
    }

    let userData: Record<string, unknown> | null = null;

    try {
      userData = await readUserProfile(tcbUser.uid);

      if (!userData) {
        userData = buildDefaultProfile(tcbUser);
        await db.collection('users').doc(tcbUser.uid).set(userData);
      }
    } catch (error) {
      console.error('Failed to sync user profile from CloudBase:', error);
      userData = buildDefaultProfile(tcbUser);
    }

    const nextUser: LocalUser = {
      uid: tcbUser.uid as string,
      email:
        (typeof tcbUser.email === 'string' && tcbUser.email) ||
        (typeof userData?.email === 'string' ? userData.email : '') ||
        '',
      phone:
        (typeof tcbUser.phoneNumber === 'string' && tcbUser.phoneNumber) ||
        (typeof tcbUser.phone_number === 'string' && tcbUser.phone_number) ||
        (typeof userData?.phone === 'string' ? userData.phone : '') ||
        '',
      displayName:
        (typeof userData?.displayName === 'string' && userData.displayName) ||
        (typeof tcbUser.nickname === 'string' && tcbUser.nickname) ||
        (typeof tcbUser.username === 'string' && tcbUser.username) ||
        DEFAULT_DISPLAY_NAME,
      photoURL:
        (typeof userData?.photoURL === 'string' && userData.photoURL) ||
        (typeof tcbUser.picture === 'string' ? tcbUser.picture : '') ||
        '',
    };

    setUser(nextUser);
    return nextUser;
  };

  const saveUserProfile = async (
    uid: string,
    baseUser: Record<string, unknown>,
    updates: { displayName?: string; photoURL?: string },
  ) => {
    const existingProfile = await readUserProfile(uid);
    const nextProfile = {
      ...buildDefaultProfile(baseUser),
      ...(existingProfile || {}),
      ...updates,
    };

    await db.collection('users').doc(uid).set(nextProfile);
    return nextProfile;
  };

  const syncLocalUserState = (
    baseUser: Record<string, unknown>,
    profile: Record<string, unknown>,
  ) => {
    setUser((prev) => ({
      uid: (baseUser.uid as string) || prev?.uid || '',
      email:
        (typeof profile.email === 'string' && profile.email) ||
        (typeof baseUser.email === 'string' && baseUser.email) ||
        prev?.email ||
        '',
      phone:
        (typeof profile.phone === 'string' && profile.phone) ||
        (typeof baseUser.phoneNumber === 'string' && baseUser.phoneNumber) ||
        (typeof baseUser.phone_number === 'string' && baseUser.phone_number) ||
        prev?.phone ||
        '',
      displayName:
        (typeof profile.displayName === 'string' && profile.displayName) ||
        (typeof baseUser.nickname === 'string' && baseUser.nickname) ||
        (typeof baseUser.username === 'string' && baseUser.username) ||
        prev?.displayName ||
        DEFAULT_DISPLAY_NAME,
      photoURL:
        (typeof profile.photoURL === 'string' && profile.photoURL) ||
        (typeof baseUser.picture === 'string' && baseUser.picture) ||
        prev?.photoURL ||
        '',
    }));
  };

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;

    const handleAuthStateChange = async (candidate?: unknown) => {
      try {
        await syncUserSession(candidate);
      } catch (error) {
        console.error('Auth state sync error:', error);
        if (active) {
          setUser(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    const initAuth = async () => {
      try {
        await handleAuthStateChange();

        if (typeof authAny.onAuthStateChange === 'function') {
          const result = authAny.onAuthStateChange((nextState: unknown) => {
            void handleAuthStateChange(nextState);
          });
          unsubscribe = result?.data?.subscription?.unsubscribe;
          return;
        }

        if (typeof authAny.onLoginStateChanged === 'function') {
          const result = authAny.onLoginStateChanged((nextState: unknown) => {
            void handleAuthStateChange(nextState);
          });
          unsubscribe =
            typeof result === 'function'
              ? result
              : result?.data?.subscription?.unsubscribe;
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (active) {
          setUser(null);
          setLoading(false);
        }
      }
    };

    void initAuth();

    return () => {
      active = false;
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  const loginWithEmail = async (email: string, pass: string) => {
    try {
      const result = await authAny.signInWithPassword({
        email: email.trim(),
        password: pass,
      });

      ensureAuthResult(result, '邮箱登录失败');
      await syncUserSession(result?.data?.user);
    } catch (error) {
      throw new Error(getErrorMessage(error, '邮箱登录失败'));
    }
  };

  const sendEmailCode = async (email: string) => {
    try {
      const result = await authAny.getVerification({ email: email.trim() });
      return ensureAuthResult(result, '发送邮箱验证码失败') as VerificationInfo;
    } catch (error) {
      throw new Error(getErrorMessage(error, '发送邮箱验证码失败'));
    }
  };

  const loginWithEmailCode = async (email: string, code: string, verificationInfo: VerificationInfo) => {
    if (!verificationInfo?.verification_id) {
      throw new Error('请先获取邮箱验证码');
    }

    try {
      const result = await authAny.verifyOtp({
        email: email.trim(),
        token: code.trim(),
        messageId: verificationInfo.verification_id,
      });

      ensureAuthResult(result, '邮箱验证码登录失败');
      await syncUserSession(result?.data?.user);
    } catch (error) {
      throw new Error(getErrorMessage(error, '邮箱验证码登录失败'));
    }
  };

  const registerWithEmail = async (
    email: string,
    code: string,
    verificationInfo: VerificationInfo,
    pass: string,
  ) => {
    if (!verificationInfo?.verification_id) {
      throw new Error('请先获取邮箱验证码');
    }

    try {
      const verificationTokenRes = ensureAuthResult(
        await authAny.verify({
          verification_id: verificationInfo.verification_id,
          verification_code: code.trim(),
        }),
        '邮箱验证码校验失败',
      ) as { verification_token: string };

      const signUpResult = await authAny.signUp({
        email: email.trim(),
        verification_code: code.trim(),
        verification_token: verificationTokenRes.verification_token,
        password: pass,
      });

      ensureAuthResult(signUpResult, '邮箱注册失败');

      const syncedUser = await syncUserSession(signUpResult?.data?.user);
      if (!syncedUser) {
        const signInResult = await authAny.signInWithPassword({
          email: email.trim(),
          password: pass,
        });
        ensureAuthResult(signInResult, '注册后自动登录失败');
        await syncUserSession(signInResult?.data?.user);
      }
    } catch (error) {
      throw new Error(getErrorMessage(error, '邮箱注册失败'));
    }
  };

  const sendPhoneCode = async (phone: string) => {
    try {
      const result = await authAny.getVerification({
        phone_number: normalizePhone(phone),
      });

      return ensureAuthResult(result, '发送短信验证码失败') as VerificationInfo;
    } catch (error) {
      throw new Error(getErrorMessage(error, '发送短信验证码失败'));
    }
  };

  const loginWithPhonePassword = async (phone: string, pass: string) => {
    try {
      const result = await runAttempts([
        () =>
          authAny.signInWithPassword({
            phone: cleanPhone(phone),
            password: pass,
          }),
        () =>
          authAny.signInWithPassword({
            phone: normalizePhone(phone),
            password: pass,
          }),
      ]);

      ensureAuthResult(result, '手机号登录失败');
      await syncUserSession((result as { data?: { user?: unknown } })?.data?.user);
    } catch (error) {
      throw new Error(getErrorMessage(error, '手机号登录失败'));
    }
  };

  const loginWithPhoneCode = async (phone: string, code: string, verificationInfo: VerificationInfo) => {
    if (!verificationInfo?.verification_id) {
      throw new Error('请先获取短信验证码');
    }

    try {
      const result = await runAttempts([
        () =>
          authAny.verifyOtp({
            phone: cleanPhone(phone),
            token: code.trim(),
            messageId: verificationInfo.verification_id,
          }),
        () =>
          authAny.verifyOtp({
            phone: normalizePhone(phone),
            token: code.trim(),
            messageId: verificationInfo.verification_id,
          }),
        () =>
          authAny.verifyOtp({
            phone_number: normalizePhone(phone),
            token: code.trim(),
            messageId: verificationInfo.verification_id,
          }),
      ]);

      ensureAuthResult(result, '验证码登录失败');
      await syncUserSession((result as { data?: { user?: unknown } })?.data?.user);
    } catch (error) {
      throw new Error(getErrorMessage(error, '验证码登录失败'));
    }
  };

  const registerWithPhone = async (
    phone: string,
    code: string,
    verificationInfo: VerificationInfo,
    pass: string,
  ) => {
    if (!verificationInfo?.verification_id) {
      throw new Error('请先获取短信验证码');
    }

    try {
      const verificationTokenRes = ensureAuthResult(
        await authAny.verify({
          verification_id: verificationInfo.verification_id,
          verification_code: code.trim(),
        }),
        '短信验证码校验失败',
      ) as { verification_token: string };

      const signUpResult = await authAny.signUp({
        phone_number: normalizePhone(phone),
        verification_code: code.trim(),
        verification_token: verificationTokenRes.verification_token,
        password: pass,
      });

      ensureAuthResult(signUpResult, '手机号注册失败');

      const syncedUser = await syncUserSession(signUpResult?.data?.user);
      if (!syncedUser) {
        const signInResult = await runAttempts([
          () =>
            authAny.signInWithPassword({
              phone: cleanPhone(phone),
              password: pass,
            }),
          () =>
            authAny.signInWithPassword({
              phone: normalizePhone(phone),
              password: pass,
            }),
        ]);

        ensureAuthResult(signInResult, '注册后自动登录失败');
        await syncUserSession((signInResult as { data?: { user?: unknown } })?.data?.user);
      }
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

  const updateProfileData = async (updates: { displayName?: string; photoURL?: string }) => {
    try {
      const normalizedUpdates = Object.fromEntries(
        Object.entries(updates).filter(([, value]) => typeof value === 'string'),
      ) as { displayName?: string; photoURL?: string };

      const currentUser =
        user
          ? {
              uid: user.uid,
              email: user.email || '',
              phoneNumber: user.phone || '',
              nickname: user.displayName || DEFAULT_DISPLAY_NAME,
              picture: user.photoURL || '',
            }
          : await getAuthenticatedUser();

      if (!currentUser?.uid) {
        throw new Error('当前登录状态已失效，请重新登录');
      }

      let savedProfile: Record<string, unknown>;

      try {
        await db.collection('users').doc(currentUser.uid).update(normalizedUpdates);
        savedProfile = {
          ...buildDefaultProfile(currentUser),
          ...(await readUserProfile(currentUser.uid)),
          ...normalizedUpdates,
        };
      } catch (error) {
        console.warn('Direct profile update failed, falling back to set():', error);
        savedProfile = await saveUserProfile(currentUser.uid, currentUser, normalizedUpdates);
      }

      syncLocalUserState(currentUser, savedProfile);
    } catch (error) {
      console.error('Failed to update profile:', error);
      throw new Error(getErrorMessage(error, '更新资料失败'));
    }
  };

  return (
    <AuthContext.Provider
      value={{
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
        updateProfileData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
