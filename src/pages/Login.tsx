import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { AlertCircle, Lock, Mail } from 'lucide-react';
import { cn } from '../lib/utils';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  const dbConfigured = import.meta.env.VITE_SUPABASE_URL !== undefined && import.meta.env.VITE_SUPABASE_URL !== '';

  if (!dbConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow p-8 text-center border border-slate-200">
          <AlertCircle className="mx-auto h-12 w-12 text-amber-500 mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">Configuração Ausente</h2>
          <p className="text-slate-600 mb-4">
            Você precisa adicionar <b>VITE_SUPABASE_URL</b> e <b>VITE_SUPABASE_ANON_KEY</b> nas variáveis de ambiente (Secrets) para usar o app.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4 relative overflow-hidden">
      {/* Decorative background blocks */}
      <div className="absolute top-0 left-0 w-full h-1/2 bg-[#03305D]"></div>
      
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100 relative z-10">
        <div className="bg-[#03305D] p-8 text-center flex flex-col items-center border-b-4 border-[#FCA311]">
          <div className="bg-white p-3 rounded-xl mb-4 w-28 h-28 flex items-center justify-center shadow-inner">
            <img src="/logo.svg" alt="UNIPÊ Logo" className="max-w-full max-h-full object-contain" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Medicina <span className="text-[#FCA311]">UNIPÊ</span></h2>
          <p className="text-blue-100 mt-2 text-sm font-medium">Agendamento de Consultas do Internato</p>
        </div>
        
        <form onSubmit={handleLogin} className="p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg text-sm flex items-start gap-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                E-mail
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 block w-full rounded-md border border-slate-300 py-2.5 text-slate-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Senha
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 block w-full rounded-md border border-slate-300 py-2.5 text-slate-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={cn(
                "w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-[#03305D] transition-colors mt-2",
                loading ? "bg-amber-300 cursor-not-allowed" : "bg-[#FCA311] hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FCA311]"
              )}
            >
              {loading ? 'Autenticando...' : 'Acessar Sistema'}
            </button>
          </div>
        </form>
        <div className="bg-slate-50 p-4 text-center border-t border-slate-100">
          <p className="text-xs text-slate-500 font-medium">Desenvolvido por: Prof. Rodrigo Niskier | 2026</p>
        </div>
      </div>
    </div>
  );
}
