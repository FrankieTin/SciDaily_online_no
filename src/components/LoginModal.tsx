import React, { useEffect, useState } from 'react';
import { useAuth, type VerificationInfo } from '../lib/AuthContext';
import { ChevronRight, Lock, Mail, MessageSquare, Phone, X } from 'lucide-react';

type AuthChannel = 'phone' | 'email';
type AuthMode = 'login' | 'register';
type LoginMethod = 'password' | 'code';

const pillButtonBase =
  'flex-1 rounded-[20px] border text-[14px] font-bold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60';
const inputWrapperBase =
  'flex items-center gap-3 rounded-[22px] border border-line bg-[#FCFBF9] px-5 py-5 shadow-[inset_0_1px_3px_rgba(0,0,0,0.03)] transition-all focus-within:border-sage/60 focus-within:ring-2 focus-within:ring-sage/10';
const inputBase =
  'w-full bg-transparent text-[15px] text-text-main outline-none placeholder:text-text-muted/70';

function AuthToggleButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${pillButtonBase} px-4 py-3.5 ${
        active
          ? 'border-sage bg-sage text-white shadow-[0_10px_24px_rgba(126,150,160,0.22)]'
          : 'border-line bg-white text-text-muted hover:border-sage/35 hover:text-text-main'
      }`}
    >
      {children}
    </button>
  );
}

function InputField({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className={inputWrapperBase}>
      <div className="text-text-muted/80">{icon}</div>
      {children}
    </div>
  );
}

export default function LoginModal({ onClose }: { onClose: () => void }) {
  const [channel, setChannel] = useState<AuthChannel>('phone');
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [phoneLoginMethod, setPhoneLoginMethod] = useState<LoginMethod>('password');
  const [emailLoginMethod, setEmailLoginMethod] = useState<LoginMethod>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [phoneVerificationInfo, setPhoneVerificationInfo] = useState<VerificationInfo | null>(null);
  const [emailVerificationInfo, setEmailVerificationInfo] = useState<VerificationInfo | null>(null);

  const {
    loginWithEmail,
    loginWithEmailCode,
    registerWithEmail,
    sendEmailCode,
    sendPhoneCode,
    loginWithPhonePassword,
    loginWithPhoneCode,
    registerWithPhone,
  } = useAuth();

  useEffect(() => {
    if (countdown <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setCountdown((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [countdown]);

  const resetTransientState = () => {
    setPassword('');
    setCode('');
    setCountdown(0);
    setError('');
    setSubmitting(false);
    setPhoneVerificationInfo(null);
    setEmailVerificationInfo(null);
  };

  const currentLoginMethod = channel === 'phone' ? phoneLoginMethod : emailLoginMethod;
  const isCodeFlow = authMode === 'register' || currentLoginMethod === 'code';
  const activeVerificationInfo = channel === 'phone' ? phoneVerificationInfo : emailVerificationInfo;
  const contactValue = channel === 'phone' ? phone.trim() : email.trim();

  const switchChannel = (nextChannel: AuthChannel) => {
    setChannel(nextChannel);
    resetTransientState();
  };

  const switchAuthMode = (nextMode: AuthMode) => {
    setAuthMode(nextMode);
    resetTransientState();
  };

  const handleSendCode = async () => {
    if (!contactValue || countdown > 0) {
      return;
    }

    setError('');

    try {
      if (channel === 'phone') {
        const result = await sendPhoneCode(phone);
        setPhoneVerificationInfo(result);
      } else {
        const result = await sendEmailCode(email);
        setEmailVerificationInfo(result);
      }
      setCountdown(60);
    } catch (err) {
      const nextError = err instanceof Error ? err.message : '发送验证码失败';
      setError(nextError);
    }
  };

  const primaryButtonLabel =
    authMode === 'register'
      ? '完成注册'
      : channel === 'phone'
        ? '立即登录'
        : '点击登录';

  const secondaryTabLeftLabel = authMode === 'register' ? '手机注册' : '手机登录';
  const secondaryTabRightLabel = authMode === 'register' ? '邮箱注册' : '邮箱登录';

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (!contactValue) {
      setError(channel === 'phone' ? '请输入手机号' : '请输入邮箱');
      return;
    }

    if (authMode === 'register') {
      if (!activeVerificationInfo?.verification_id) {
        setError('请先获取验证码');
        return;
      }

      if (!code.trim()) {
        setError('请输入验证码');
        return;
      }
    }

    if (authMode === 'login' && currentLoginMethod === 'password' && !password) {
      setError('请输入密码');
      return;
    }

    if (authMode === 'login' && currentLoginMethod === 'code') {
      if (!activeVerificationInfo?.verification_id) {
        setError('请先获取验证码');
        return;
      }

      if (!code.trim()) {
        setError('请输入验证码');
        return;
      }
    }

    setSubmitting(true);

    try {
      if (authMode === 'register') {
        if (channel === 'phone') {
          await registerWithPhone(phone, code, activeVerificationInfo as VerificationInfo, password);
        } else {
          await registerWithEmail(email, code, activeVerificationInfo as VerificationInfo, password);
        }
      } else if (channel === 'phone') {
        if (phoneLoginMethod === 'password') {
          await loginWithPhonePassword(phone, password);
        } else {
          await loginWithPhoneCode(phone, code, activeVerificationInfo as VerificationInfo);
        }
      } else if (emailLoginMethod === 'password') {
        await loginWithEmail(email, password);
      } else {
        await loginWithEmailCode(email, code, activeVerificationInfo as VerificationInfo);
      }

      onClose();
    } catch (err) {
      const nextError = err instanceof Error ? err.message : '操作失败，请重试';
      setError(nextError);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/38 p-4 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative w-full max-w-[430px] overflow-hidden rounded-[36px] bg-white px-7 pb-8 pt-10 shadow-[0_28px_80px_rgba(65,80,90,0.28)] animate-in slide-in-from-bottom-10 duration-500 sm:px-9 sm:pt-11">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 rounded-full p-2 text-text-muted/85 transition-colors hover:bg-black/5 hover:text-text-main"
          aria-label="关闭"
        >
          <X size={24} />
        </button>

        <div className="mx-auto mb-8 flex max-w-[320px] flex-col items-center text-center">
          <div className="mb-6 flex h-[104px] w-[104px] items-center justify-center rounded-[28px] border border-black/10 bg-[#F8F8F7] text-sage shadow-[0_8px_20px_rgba(0,0,0,0.06)]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="54"
              height="54"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
            </svg>
          </div>
          <h2 className="text-[28px] font-bold font-serif leading-tight text-text-main sm:text-[32px]">
            欢迎来到科研Daily
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-text-muted sm:text-[16px]">
            你的科研、生活将在此留下精彩瞬间！
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex gap-4">
            <AuthToggleButton active={channel === 'phone'} onClick={() => switchChannel('phone')}>
              {secondaryTabLeftLabel}
            </AuthToggleButton>
            <AuthToggleButton active={channel === 'email'} onClick={() => switchChannel('email')}>
              {secondaryTabRightLabel}
            </AuthToggleButton>
          </div>

          {error && (
            <div className="rounded-[18px] border border-red-100 bg-red-50 px-4 py-3 text-center text-[13px] text-red-500">
              {error}
            </div>
          )}

          {channel === 'phone' ? (
            <InputField icon={<Phone size={25} strokeWidth={1.8} />}>
              <input
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="手机号"
                className={inputBase}
                autoComplete="tel"
                inputMode="tel"
              />
            </InputField>
          ) : (
            <InputField icon={<Mail size={25} strokeWidth={1.8} />}>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="邮箱"
                className={inputBase}
                autoComplete="email"
              />
            </InputField>
          )}

          {authMode === 'login' && (
            <div className="flex gap-4">
              <AuthToggleButton
                active={currentLoginMethod === 'password'}
                onClick={() => {
                  if (channel === 'phone') {
                    setPhoneLoginMethod('password');
                  } else {
                    setEmailLoginMethod('password');
                  }
                  setError('');
                  setCode('');
                }}
              >
                密码登录
              </AuthToggleButton>
              <AuthToggleButton
                active={currentLoginMethod === 'code'}
                onClick={() => {
                  if (channel === 'phone') {
                    setPhoneLoginMethod('code');
                  } else {
                    setEmailLoginMethod('code');
                  }
                  setError('');
                  setPassword('');
                }}
              >
                验证码登录
              </AuthToggleButton>
            </div>
          )}

          {isCodeFlow && (
            <div className="flex gap-3">
              <div className="min-w-0 flex-1">
                <InputField icon={<MessageSquare size={25} strokeWidth={1.8} />}>
                  <input
                    type="text"
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                    placeholder="验证码"
                    className={inputBase}
                    inputMode="numeric"
                  />
                </InputField>
              </div>
              <button
                type="button"
                onClick={handleSendCode}
                disabled={!contactValue || countdown > 0 || submitting}
                className="min-w-[118px] rounded-[22px] border border-sage/65 bg-white px-4 text-[14px] font-bold text-sage transition-all hover:bg-sage/5 disabled:border-line disabled:bg-[#F4F4F2] disabled:text-text-muted"
              >
                {countdown > 0 ? `${countdown}s` : '获取验证码'}
              </button>
            </div>
          )}

          {(authMode === 'register' || currentLoginMethod === 'password') && (
            <InputField icon={<Lock size={25} strokeWidth={1.8} />}>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={authMode === 'register' ? '设置密码（至少8位）' : '密码'}
                className={inputBase}
                autoComplete={authMode === 'register' ? 'new-password' : 'current-password'}
              />
            </InputField>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-1 flex w-full items-center justify-center gap-2 rounded-[24px] bg-sage px-6 py-5 text-[18px] font-bold text-white shadow-[0_16px_28px_rgba(126,150,160,0.22)] transition-all hover:bg-sage-dark disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting ? '处理中...' : primaryButtonLabel}
            <ChevronRight size={22} />
          </button>
        </form>

        <div className="mt-8 text-center">
          {authMode === 'login' ? (
            <button
              type="button"
              onClick={() => switchAuthMode('register')}
              className="text-[15px] font-bold text-sage transition-opacity hover:opacity-80"
            >
              没有账号？立即注册
            </button>
          ) : (
            <button
              type="button"
              onClick={() => switchAuthMode('login')}
              className="text-[15px] font-bold text-sage transition-opacity hover:opacity-80"
            >
              已有账号？立即登录
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
