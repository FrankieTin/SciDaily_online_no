import React, { useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { X, ChevronRight } from 'lucide-react';

export default function LoginModal({ onClose }: { onClose: () => void }) {
  const [error, setError] = useState('');
  const { loginWithGoogle } = useAuth();

  const handleGoogleLogin = async () => {
    setError('');
    try {
      await loginWithGoogle();
      onClose();
    } catch (err: any) {
      setError(err.message || '登录失败');
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
             <p className="text-[14px] text-text-muted mt-2 px-4">
               使用 Google 账号登录以同步您的<br/>科研进度、健身记录与心情日志
             </p>
          </div>

          <div className="space-y-4">
             {error && (
                <div className="bg-red-50 text-red-500 p-3 rounded-[12px] text-[13px] text-center border border-red-100">
                  {error}
                </div>
             )}
            
             <button 
               onClick={handleGoogleLogin}
               className="w-full bg-sage text-white font-bold py-3.5 rounded-[16px] text-[15px] hover:bg-sage-dark transition-colors shadow-sm flex justify-center items-center gap-3 mt-2"
             >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
                使用 Google 账号登录
                <ChevronRight size={18} />
             </button>
          </div>

          <p className="mt-8 text-center text-[12px] text-text-muted">
            登录即代表您同意我们的 服务条款 与 隐私政策
          </p>
        </div>
      </div>
    </div>
  );
}
