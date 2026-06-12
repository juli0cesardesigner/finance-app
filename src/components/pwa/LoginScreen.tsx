"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Lock, Mail, Loader2, LogIn } from "lucide-react";

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      if (data.session) {
        onLoginSuccess();
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Credenciais inválidas. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex-1 flex flex-col items-center justify-center relative bg-black text-white min-h-dvh h-dvh overflow-hidden w-full px-6">
      {/* Siri-Glow Background Spheres para ambientação premium */}
      <div className="fixed top-[-20%] -left-[30%] w-[150vw] h-[60vh] bg-blue-600/10 rounded-full blur-[130px] pointer-events-none -z-10 animate-siri-pulse-1" />
      <div className="fixed bottom-[-20%] -right-[30%] w-[150vw] h-[60vh] bg-purple-600/10 rounded-full blur-[150px] pointer-events-none -z-10 animate-siri-pulse-2" />

      <div className="w-full max-w-sm flex flex-col gap-8 relative z-10">
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-zinc-800 to-black border border-zinc-800/50 shadow-[0_0_40px_rgba(255,255,255,0.05)] flex items-center justify-center mb-2">
            <Lock className="w-10 h-10 text-zinc-300" strokeWidth={1.5} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Acesso Restrito</h1>
          <p className="text-zinc-500 text-sm">Insira suas credenciais para continuar</p>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-5 w-full">
          <div className="flex flex-col gap-4">
            {/* Input Email */}
            <div className="relative group">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-blue-400 transition-colors">
                <Mail className="w-5 h-5" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="w-full bg-[#050507]/60 border border-zinc-900 focus:border-zinc-700 focus:bg-[#09090b]/90 rounded-2xl py-4 pl-12 pr-4 text-sm text-zinc-200 outline-none transition-all placeholder:text-zinc-600 shadow-inner backdrop-blur-xl"
              />
            </div>

            {/* Input Senha */}
            <div className="relative group">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-blue-400 transition-colors">
                <Lock className="w-5 h-5" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Senha"
                className="w-full bg-[#050507]/60 border border-zinc-900 focus:border-zinc-700 focus:bg-[#09090b]/90 rounded-2xl py-4 pl-12 pr-4 text-sm text-zinc-200 outline-none transition-all placeholder:text-zinc-600 shadow-inner backdrop-blur-xl"
              />
            </div>
          </div>

          {errorMsg && (
            <div className="text-red-400 text-xs font-medium text-center bg-red-500/10 border border-red-500/20 py-3 rounded-2xl backdrop-blur-md">
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-white text-black font-bold text-sm hover:bg-zinc-200 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_30px_rgba(255,255,255,0.15)]"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <span>Entrar no Sistema</span>
                <LogIn className="w-4 h-4 ml-1" />
              </>
            )}
          </button>
        </form>
      </div>
    </main>
  );
}
