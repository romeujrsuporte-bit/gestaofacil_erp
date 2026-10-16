import React, { useState, useEffect } from 'react';
import {
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { Database as DbService } from '../../services/db';
import { GestaoFacilLogo } from '../common/AppLogo';
import { toast } from '../../services/toast';

interface LoginViewProps {
  onLoginSuccess: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Recupera apenas o nome de usuário lembrado caso o usuário tenha marcado anteriormente
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const remembered = localStorage.getItem(DbService.AUTH_REMEMBER_LOGIN_KEY);
      if (remembered) {
        setLogin(remembered);
      }
      // O campo de senha sempre inicia vazio por segurança e privacidade
      setPassword('');
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    setTimeout(() => {
      const result = DbService.authenticate(login, password, rememberMe);

      if (result.success && result.user) {
        toast.success(`Bem-vindo(a), ${result.user.name}!`);
        setIsLoading(false);
        onLoginSuccess();
      } else {
        setErrorMsg(result.error || 'Credenciais inválidas. Verifique seu login e senha.');
        setIsLoading(false);
      }
    }, 250);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 relative overflow-hidden select-none">
      {/* Elementos visuais decorativos de fundo suaves */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-slate-900/40 rounded-full blur-3xl pointer-events-none" />

      {/* CARD PRINCIPAL DE LOGIN: Focado exclusivamente em Login e Senha */}
      <div className="relative z-10 w-full max-w-md bg-slate-900/95 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 backdrop-blur-xl">
        {/* CABEÇALHO DO CARD */}
        <div className="text-center mb-6">
          <div className="inline-flex justify-center mb-3">
            <GestaoFacilLogo size={48} variant="dark" showSlogan={false} />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1">
            Acesso ao Sistema
          </h2>
          <p className="text-xs text-slate-400 mt-1.5">
            Informe suas credenciais para iniciar sua sessão de trabalho
          </p>
        </div>

        {/* ALERTA DE ERRO */}
        {errorMsg && (
          <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-start gap-2.5 text-rose-300 text-xs animate-shake">
            <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-400" />
            <span className="font-semibold leading-relaxed">{errorMsg}</span>
          </div>
        )}

        {/* FORMULÁRIO */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* CAMPO USUÁRIO / LOGIN */}
          <div>
            <label className="block text-xs font-extrabold text-slate-300 uppercase tracking-wider mb-1.5">
              Usuário / Login:
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <UserIcon size={16} />
              </div>
              <input
                type="text"
                required
                autoFocus={!login}
                value={login}
                onChange={(e) => {
                  setLogin(e.target.value);
                  setErrorMsg(null);
                }}
                placeholder="Digite seu usuário"
                className="w-full pl-10 pr-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-white font-medium text-sm placeholder:text-slate-600 focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
              />
            </div>
          </div>

          {/* CAMPO SENHA */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-extrabold text-slate-300 uppercase tracking-wider">
                Senha de Acesso:
              </label>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Lock size={16} />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoFocus={!!login}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrorMsg(null);
                }}
                placeholder="Digite sua senha"
                className="w-full pl-10 pr-11 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-white font-medium text-sm placeholder:text-slate-600 focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 cursor-pointer"
                title={showPassword ? 'Ocultar senha' : 'Exibir senha'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* OPÇÃO LEMBRAR DE MIM */}
          <div className="flex items-center justify-between text-xs pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-slate-400 hover:text-slate-200">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded bg-slate-950 border-slate-800 text-emerald-600 focus:ring-emerald-500 focus:ring-offset-slate-900 cursor-pointer"
              />
              <span>Lembrar meu usuário neste dispositivo</span>
            </label>
          </div>

          {/* BOTÃO ENTRAR */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-emerald-950/40 transition-all flex items-center justify-center gap-2 cursor-pointer mt-3"
          >
            {isLoading ? (
              <span>Validando credenciais...</span>
            ) : (
              <>
                <span>Acessar o Sistema</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* RODAPÉ DO CARD */}
        <div className="pt-5 mt-6 border-t border-slate-800/80 text-center">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
            <ShieldCheck size={13} className="text-emerald-400" />
            <span>Ambiente seguro com criptografia de sessão ativa</span>
          </div>
        </div>
      </div>
    </div>
  );
};
