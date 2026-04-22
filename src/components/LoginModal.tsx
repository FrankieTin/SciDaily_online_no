import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { X, ChevronRight, Mail, Phone, Lock, MessageSquare } from 'lucide-react';

export default function LoginModal({ onClose }: { onClose: () => void }) {
  const [loginType, setLoginType] = useState<'email' | 'phone'>('phone');
  const [isRegister, setIsRegister] = useState(false);
  const [emailMode, setEmailMode] = useState<'password' | 'code'>('password');
  // 手机号登录/注册 subtypes
  const [phoneMode, setPhoneMode] = useState<'password' | 'code'>('password');
  // 步骤控制
  const [PhoneVerificationStep, setPhoneVerificationStep] = useState(false);
  const [emailVerificationStep, setEmailVerificationStep] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState('');
  const [phoneVerificationInfo, setPhoneVerificationInfo] = useState<any>(null);
  const [emailVerificationInfo, setEmailVerificationInfo] = useState<any>(null);
  
  const { loginWithEmail, loginWithEmailCode, registerWithEmail, sendEmailCode, sendPhoneCode, loginWithPhonePassword, loginWithPhoneCode, registerWithPhone } = useAuth();

  useEffect(() => {
    let timer: any;
    if (countdown > 0) {
      timer = setInterval(() => setCountdown(c => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  // 重置所有状态
  const resetStates = () => {
    setEmail('');
    setPassword('');
    setPhone('');
    setCode('');
    setIsCodeSent(false);
    setCountdown(0);
    setEmailMode('password');
    setPhoneMode('password');
    setPhoneVerificationStep(false);
    setEmailVerificationStep(false);
    setPhoneVerificationInfo(null);
    setEmailVerificationInfo(null);
    setError('');
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (isRegister) {
      if (!code.trim()) {
        setError('请输入验证码');
        return;
      }
      if (!password.trim()) {
        setError('请设置密码');
        return;
      }
      if (!emailVerificationInfo?.verification_id) {
        setError('请先获取验证码');
        return;
      }
      try {
        await registerWithEmail(email, code, emailVerificationInfo, password);
        onClose();
      } catch (err: any) {
        setError(err.message || '注册失败');
      }
    } else {
      if (emailMode === 'password') {
        try {
          await loginWithEmail(email, password);
          onClose();
        } catch (err: any) {
          setError(err.message || '登录失败');
        }
      } else {
        if (!code.trim()) {
          setError('请输入验证码');
          return;
        }
        if (!emailVerificationInfo?.verification_id) {
          setError('请先获取验证码');
          return;
        }
        try {
          await loginWithEmailCode(email, code, emailVerificationInfo);
          onClose();
        } catch (err: any) {
          setError(err.message || '登录失败');
        }
      }
    }
  };

  const handeSendCode = async () => {
    if (!phone || countdown > 0) return;
    setError('');
    try {
      const result = await sendPhoneCode(phone);
      setPhoneVerificationInfo(result);
      setIsCodeSent(true);
      setCountdown(60);
    } catch (err: any) {
      setError(err.message || '发送验证码失败');
    }
  };

  const handleSendEmailCode = async () => {
    if (!email || countdown > 0) return;
    setError('');
    try {
      const result = await sendEmailCode(email);
      setEmailVerificationInfo(result);
      setEmailVerificationStep(true);
      setCountdown(60);
    } catch (err: any) {
      setError(err.message || '发送验证码失败');
    }
  };

  const handlePhoneLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (isRegister) {
      // 手机号注册
      if (!PhoneVerificationStep) {
        // 第一步：发送验证码
        try {
          const result = await sendPhoneCode(phone);
          setPhoneVerificationInfo(result);
          setIsCodeSent(true);
          setPhoneVerificationStep(true);
          setCountdown(60);
        } catch (err: any) {
          setError(err.message || '发送验证码失败');
        }
        return;
      } else {
        // 第二步：验证验证码并注册
        if (!code.trim()) {
          setError('请输入验证码');
          return;
        }
        if (!password.trim()) {
          setError('请设置密码');
          return;
        }
        try {
          await registerWithPhone(phone, code, phoneVerificationInfo, password);
          onClose();
        } catch (err: any) {
          setError(err.message || '注册失败');
        }
      }
    } else {
      // 手机号登录
      if (phoneMode === 'password') {
        // 密码登录
        if (!password.trim()) {
          setError('请输入密码');
          return;
        }
        try {
          await loginWithPhonePassword(phone, password);
          onClose();
        } catch (err: any) {
          // 如果错误提示用户未注册，可引导注册
          setError(err.message || '登录失败');
        }
        } else {
          // 验证码登录
          if (!code.trim()) {
            setError('请输入验证码');
            return;
          }
          if (!isCodeSent) {
            setError('请先获取验证码');
            return;
          }
          try {
            await loginWithPhoneCode(phone, code, phoneVerificationInfo);
            onClose();
          } catch (err: any) {
            setError(err.message || '登录失败');
          }
        }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-sm rounded-[24px] shadow-2xl relative overflow-hidden animate-in slide-in-from-bottom-8 duration-500">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-text-muted hover:bg-black/5 rounded-full z-10 transition-colors"
        >
          <X size={20} />
        </button>

        <div className="p-8">
          <div className="text-center mb-8">
             <div className="w-16 h-16 bg-sage/10 text-sage rounded-[20px] flex items-center justify-center mx-auto mb-4 border border-sage/20">
               <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
             </div>
             <h2 className="text-[24px] font-serif font-bold text-text-main">
               欢迎来到科研Daily
             </h2>
             <p className="text-[14px] text-text-muted mt-2">
               你的科研、生活将在此留下精彩瞬间！
             </p>
          </div>

          <div className="flex gap-4 mb-6">
            <button 
              onClick={() => { 
                setLoginType('phone'); 
                setError(''); 
                resetStates();
              }}
              className={`flex-1 py-2 text-[14px] font-bold rounded-[12px] border transition-all ${loginType === 'phone' ? 'bg-sage text-white border-sage' : 'bg-transparent text-text-muted border-line hover:border-sage/40'}`}
            >
              {isRegister ? '手机注册' : '手机登录'}
            </button>
            <button 
              onClick={() => { 
                setLoginType('email'); 
                setError(''); 
                resetStates();
              }}
              className={`flex-1 py-2 text-[14px] font-bold rounded-[12px] border transition-all ${loginType === 'email' ? 'bg-sage text-white border-sage' : 'bg-transparent text-text-muted border-line hover:border-sage/40'}`}
            >
              {isRegister ? '邮箱注册' : '邮箱登录'}
            </button>
          </div>

          {error && (
            <div className="bg-red-50 text-red-500 p-3 rounded-[12px] text-[13px] text-center border border-red-100 mb-4">
              {error}
            </div>
          )}

          {loginType === 'phone' ? (
            <form onSubmit={handlePhoneLogin} className="space-y-4">
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted">
                  <Phone size={18} />
                </div>
                <input 
                  type="tel" 
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="手机号" 
                  className="w-full bg-[#FAF8F6] border border-line pl-11 pr-4 py-3.5 rounded-[16px] text-[15px] outline-none focus:ring-1 focus:ring-sage transition-all"
                />
              </div>

              {!isRegister && (
                <div className="flex gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => { setPhoneMode('password'); setError(''); }}
                    className={`flex-1 py-2 text-[13px] font-bold rounded-[12px] border transition-all ${phoneMode === 'password' ? 'bg-sage text-white border-sage' : 'bg-transparent text-text-muted border-line hover:border-sage/40'}`}
                  >
                    密码登录
                  </button>
                  <button
                    type="button"
                    onClick={() => { setPhoneMode('code'); setError(''); }}
                    className={`flex-1 py-2 text-[13px] font-bold rounded-[12px] border transition-all ${phoneMode === 'code' ? 'bg-sage text-white border-sage' : 'bg-transparent text-text-muted border-line hover:border-sage/40'}`}
                  >
                    验证码登录
                  </button>
                </div>
              )}

              {(!isRegister && phoneMode === 'password') && (
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted">
                    <Lock size={18} />
                  </div>
                  <input 
                    type="password" 
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="密码" 
                    className="w-full bg-[#FAF8F6] border border-line pl-11 pr-4 py-3.5 rounded-[16px] text-[15px] outline-none focus:ring-1 focus:ring-sage transition-all"
                  />
                </div>
              )}

              {(isRegister || phoneMode === 'code' || PhoneVerificationStep) && (
                <>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted">
                        <MessageSquare size={18} />
                      </div>
                      <input 
                        type="text" 
                        required
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        placeholder="验证码" 
                        className="w-full bg-[#FAF8F6] border border-line pl-11 pr-4 py-3.5 rounded-[16px] text-[15px] outline-none focus:ring-1 focus:ring-sage transition-all"
                      />
                    </div>
                    <button 
                      type="button" 
                      onClick={handeSendCode}
                      disabled={countdown > 0}
                      className={`px-4 rounded-[16px] text-[13px] font-bold border transition-all ${countdown > 0 ? 'bg-base text-text-muted border-line' : 'bg-white text-sage border-sage hover:bg-sage/5'}`}
                    >
                      {countdown > 0 ? `${countdown}s` : '获取验证码'}
                    </button>
                  </div>

                  {isRegister && (
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted">
                        <Lock size={18} />
                      </div>
                      <input 
                        type="password" 
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="设置密码（至少8位）" 
                        className="w-full bg-[#FAF8F6] border border-line pl-11 pr-4 py-3.5 rounded-[16px] text-[15px] outline-none focus:ring-1 focus:ring-sage transition-all"
                      />
                    </div>
                  )}
                </>
              )}

              <button type="submit" className="w-full bg-sage text-white font-bold py-3.5 rounded-[16px] text-[15px] hover:bg-sage-dark transition-colors shadow-sm flex justify-center items-center gap-2 group mt-2">
                {isRegister 
                  ? (PhoneVerificationStep ? '完成注册' : '获取验证码')
                  : '立即登录'
                }
                <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted">
                  <Mail size={18} />
                </div>
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="邮箱" 
                  className="w-full bg-[#FAF8F6] border border-line pl-11 pr-4 py-3.5 rounded-[16px] text-[15px] outline-none focus:ring-1 focus:ring-sage transition-all"
                />
              </div>

              {!isRegister && (
                <div className="flex gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => { setEmailMode('password'); setError(''); setCode(''); }}
                    className={`flex-1 py-2 text-[13px] font-bold rounded-[12px] border transition-all ${emailMode === 'password' ? 'bg-sage text-white border-sage' : 'bg-transparent text-text-muted border-line hover:border-sage/40'}`}
                  >
                    密码登录
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEmailMode('code'); setError(''); setPassword(''); }}
                    className={`flex-1 py-2 text-[13px] font-bold rounded-[12px] border transition-all ${emailMode === 'code' ? 'bg-sage text-white border-sage' : 'bg-transparent text-text-muted border-line hover:border-sage/40'}`}
                  >
                    验证码登录
                  </button>
                </div>
              )}

              {(isRegister || (!isRegister && emailMode === 'code')) && (
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted">
                      <MessageSquare size={18} />
                    </div>
                    <input 
                      type="text" 
                      required
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="验证码" 
                      className="w-full bg-[#FAF8F6] border border-line pl-11 pr-4 py-3.5 rounded-[16px] text-[15px] outline-none focus:ring-1 focus:ring-sage transition-all"
                    />
                  </div>
                  <button 
                    type="button"
                    onClick={handleSendEmailCode}
                    disabled={countdown > 0}
                    className={`px-4 rounded-[16px] text-[13px] font-bold border transition-all ${countdown > 0 ? 'bg-base text-text-muted border-line' : 'bg-white text-sage border-sage hover:bg-sage/5'}`}
                  >
                    {countdown > 0 ? `${countdown}s` : '获取验证码'}
                  </button>
                </div>
              )}

              {(isRegister || (!isRegister && emailMode === 'password')) && (
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted">
                    <Lock size={18} />
                  </div>
                  <input 
                    type="password" 
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={isRegister ? "设置密码（至少8位）" : "密码"} 
                    className="w-full bg-[#FAF8F6] border border-line pl-11 pr-4 py-3.5 rounded-[16px] text-[15px] outline-none focus:ring-1 focus:ring-sage transition-all"
                  />
                </div>
              )}

              <button type="submit" className="w-full bg-sage text-white font-bold py-3.5 rounded-[16px] text-[15px] hover:bg-sage-dark transition-colors shadow-sm flex justify-center items-center gap-2 group mt-2">
                {isRegister ? '完成注册' : '点击登录'}
                <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            {!isRegister ? (
              <button 
                type="button"
                onClick={() => {
                  setIsRegister(true);
                  resetStates();
                }}
                className="text-[13px] text-sage hover:underline font-bold"
              >
                没有账号？立即注册
              </button>
            ) : (
              <button 
                type="button"
                onClick={() => {
                  setIsRegister(false);
                  resetStates();
                }}
                className="text-[13px] text-sage hover:underline font-bold"
              >
                已有账号？立即登录
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
