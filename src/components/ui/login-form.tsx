import { cn } from "../../lib/utils";
import { useState } from "react";

interface LoginFormProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onGoogleLogin?: () => void;
  onDemoLogin?: () => void;
  error?: string | null;
  submitting?: boolean;
  isOnline?: boolean;
  signUpLink?: React.ReactNode;
  className?: string;
}

export function LoginForm({
  onLogin,
  onGoogleLogin,
  onDemoLogin,
  error,
  submitting = false,
  isOnline = true,
  signUpLink,
  className,
}: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onLogin(email, password);
  };

  return (
    <div className={cn("flex h-[700px] w-full", className)}>
      <div className="w-full hidden md:inline-block">
        <img className="h-full w-full object-cover" src="https://raw.githubusercontent.com/prebuiltui/prebuiltui/main/assets/login/leftSideImage.png" alt="" />
      </div>

      <div className="w-full flex flex-col items-center justify-center p-8">
        <form onSubmit={handleSubmit} className="md:w-96 w-full max-w-sm flex flex-col items-center justify-center">
          <div className="text-center mb-2">
            <h2 className="text-4xl text-gray-900 font-medium">Sign in</h2>
            <p className="text-sm text-gray-500/90 mt-2">Welcome back! Please sign in to continue</p>
          </div>

          {error && (
            <div className="w-full mt-4 bg-red-50 border border-red-200 text-red-600 text-sm rounded-full px-6 py-3 text-center font-medium">
              {error}
            </div>
          )}

          {onGoogleLogin && (
            <>
              <button type="button" onClick={onGoogleLogin} className="w-full mt-6 bg-gray-500/10 flex items-center justify-center h-12 rounded-full gap-2 hover:bg-gray-500/15 transition-colors">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span className="text-sm font-medium text-gray-600">Sign in with Google</span>
              </button>
              <div className="flex items-center gap-4 w-full my-5">
                <div className="w-full h-px bg-gray-300/90" />
                <p className="text-nowrap text-sm text-gray-500/90">or sign in with email</p>
                <div className="w-full h-px bg-gray-300/90" />
              </div>
            </>
          )}

          <div className="flex items-center w-full bg-transparent border border-gray-300/60 h-12 rounded-full overflow-hidden pl-6 gap-2 focus-within:border-indigo-400 transition-colors">
            <svg width="16" height="11" viewBox="0 0 16 11" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" clipRule="evenodd" d="M0 .55.571 0H15.43l.57.55v9.9l-.571.55H.57L0 10.45zm1.143 1.138V9.9h13.714V1.69l-6.503 4.8h-.697zM13.749 1.1H2.25L8 5.356z" fill="#6B7280"/>
            </svg>
            <input type="email" placeholder="Email id" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-transparent text-gray-700 placeholder-gray-400 outline-none text-sm w-full h-full pr-4" required disabled={submitting} />
          </div>

          <div className="flex items-center mt-4 w-full bg-transparent border border-gray-300/60 h-12 rounded-full overflow-hidden pl-6 gap-2 focus-within:border-indigo-400 transition-colors">
            <svg width="13" height="17" viewBox="0 0 13 17" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M13 8.5c0-.938-.729-1.7-1.625-1.7h-.812V4.25C10.563 1.907 8.74 0 6.5 0S2.438 1.907 2.438 4.25V6.8h-.813C.729 6.8 0 7.562 0 8.5v6.8c0 .938.729 1.7 1.625 1.7h9.75c.896 0 1.625-.762 1.625-1.7zM4.063 4.25c0-1.406 1.093-2.55 2.437-2.55s2.438 1.144 2.438 2.55V6.8H4.061z" fill="#6B7280"/>
            </svg>
            <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-transparent text-gray-700 placeholder-gray-400 outline-none text-sm w-full h-full pr-4" required disabled={submitting} />
          </div>

          <div className="w-full flex items-center justify-between mt-6 text-gray-500">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-indigo-500 focus:ring-indigo-400" />
              <span className="text-sm">Remember me</span>
            </label>
            <a className="text-sm underline hover:text-indigo-500 transition-colors" href="#">Forgot password?</a>
          </div>

          <button type="submit" disabled={submitting} className="mt-6 w-full h-11 rounded-full text-white bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium">
            {submitting ? "Signing in..." : "Login"}
          </button>

          {signUpLink && (
            <p className="text-gray-500 text-sm mt-5">{signUpLink}</p>
          )}

          {!isOnline && onDemoLogin && (
            <div className="w-full mt-6 space-y-3">
              <div className="flex items-center gap-4 w-full">
                <div className="w-full h-px bg-gray-300/90" />
                <p className="text-nowrap text-xs text-gray-400">offline mode</p>
                <div className="w-full h-px bg-gray-300/90" />
              </div>
              <button type="button" onClick={onDemoLogin} className="w-full h-11 rounded-full text-white bg-gray-700 hover:bg-gray-800 transition-all font-medium text-sm">
                Continue as Demo User
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
