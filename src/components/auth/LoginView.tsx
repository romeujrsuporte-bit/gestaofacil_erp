import React, { useState, useEffect } from 'react';
import {
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Truck,
  ShoppingCart,
  Database,
  ArrowRight,
  Sparkles,
  KeyRound,
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

  // Recupera login lembrado caso exista
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const remembered = localStorage.getItem(DbService.AUTH_REMEMBER_LOGIN_KEY);
      if (remembered) {
        setLogin(remembered);
        // Se for admin, já deixa sugerido
        if (remembered === 'admin') {
          setPassword('admin');
        } else {
          setPassword('1234');
        }
      } else {
        // Sugestão padrão inicial para facilidade de primeiro acesso
        setLogin('admin');
        setPassword('admin');
      }
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

  const handleQuickFill = (userLogin: string, defaultPass: string) => {
    setLogin(userLogin);
    setPassword(defaultPass);
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 relative overflow-hidden select-none">
      {/* Elementos visuais decorativos de fundo */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-950/20 rounded-full blur-3xl pointer-events-none" />

      {/* CARD PRINCIPAL DE LOGIN */}
      <div className="relative z-10 w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12">
        {/* COLUNA ESQUERDA: APRESENTAÇÃO & ATALHOS RÁPIDOS */}
        <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950/80 p-6 sm:p-8 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-800">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <GestaoFacilLogo size={42} showSlogan={false} />
              <div>
                <h1 className="text-lg font-black text-white tracking-tight">OmniComércio ERP</h1>
                <span className="text-[11px] font-bold text-blue-400 uppercase tracking-widest block">
                  Sistema Comercial & PDV
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-6">
              Plataforma empresarial integrada com PDV ágil, expedição com romaneios de entrega, vendas mobile, controle de estoque e nuvem Supabase PostgreSQL.
            </p>

            <div className="space-y-2.5 mb-6 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                <span>Expedição & Romaneios de Entrega por Rota</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                <span>PDV Balcão & Vendas Externas Mobile</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                <span>Gestão Multi-Empresa & Controle de Perfis</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                <span>Banco de Dados em Nuvem Supabase</span>
              </div>
            </div>
          </div>

          {/* DICA DE ACESSO RÁPIDO PARA TESTES */}
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-3.5 space-y-2 mt-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                <KeyRound size={12} />
                <span>Acesso Rápido / Usuários Padrão</span>
              </span>
              <span className="text-[10px] text-slate-400">Clique para testar</span>
            </div>

            <div className="grid grid-cols-1 gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => handleQuickFill('admin', 'admin')}
                className="w-full px-2.5 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded-xl text-left flex items-center justify-between transition-colors cursor-pointer"
                title="Administrador: Senha padrão 'admin' (Acesso total)"
              >
                <div className="flex items-center gap-1.5 font-bold">
                  <span className="w-2 h-2 rounded-full bg-blue-400" />
                  <span>admin</span>
                  <span className="text-[10px] text-blue-300/70 font-normal">(Administrador)</span>
                </div>
                <span className="font-mono text-[10px] bg-blue-950/80 px-1.5 py-0.5 rounded text-blue-300 border border-blue-500/20">
                  senha: admin
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('gerente', '1234')}
                className="w-full px-2.5 py-1.5 bg-slate-800/60 hover:bg-slate-800 text-slate-300 border border-slate-700/50 rounded-xl text-left flex items-center justify-between transition-colors cursor-pointer"
                title="Gerente Comercial: Senha padrão '1234'"
              >
                <div className="flex items-center gap-1.5 font-bold">
                  <span className="w-2 h-2 rounded-full bg-slate-400" />
                  <span>gerente</span>
                  <span className="text-[10px] text-slate-400 font-normal">(Gerente)</span>
                </div>
                <span className="font-mono text-[10px] bg-slate-900 px-1.5 py-0.5 rounded text-slate-400 border border-slate-700/50">
                  senha: 1234
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('balcao', '1234')}
                className="w-full px-2.5 py-1.5 bg-slate-800/60 hover:bg-slate-800 text-slate-300 border border-slate-700/50 rounded-xl text-left flex items-center justify-between transition-colors cursor-pointer"
                title="Operador PDV: Senha padrão '1234'"
              >
                <div className="flex items-center gap-1.5 font-bold">
                  <span className="w-2 h-2 rounded-full bg-slate-400" />
                  <span>balcao</span>
                  <span className="text-[10px] text-slate-400 font-normal">(Balcão PDV)</span>
                </div>
                <span className="font-mono text-[10px] bg-slate-900 px-1.5 py-0.5 rounded text-slate-400 border border-slate-700/50">
                  senha: 1234
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('externo', '1234')}
                className="w-full px-2.5 py-1.5 bg-slate-800/60 hover:bg-slate-800 text-slate-300 border border-slate-700/50 rounded-xl text-left flex items-center justify-between transition-colors cursor-pointer"
                title="Vendedor Externo Mobile: Senha padrão '1234'"
              >
                <div className="flex items-center gap-1.5 font-bold">
                  <span className="w-2 h-2 rounded-full bg-slate-400" />
                  <span>externo</span>
                  <span className="text-[10px] text-slate-400 font-normal">(Vendas Mobile)</span>
                </div>
                <span className="font-mono text-[10px] bg-slate-900 px-1.5 py-0.5 rounded text-slate-400 border border-slate-700/50">
                  senha: 1234
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* COLUNA DIREITA: FORMULÁRIO DE LOGIN */}
        <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-center bg-slate-900/90">
          <div className="max-w-md w-full mx-auto space-y-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[11px] font-bold mb-3">
                <ShieldCheck size={13} />
                <span>Autenticação Segura</span>
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight">Entrar no Sistema</h2>
              <p className="text-xs text-slate-400 mt-1">
                Informe seu nome de usuário e senha para iniciar sua sessão operacional.
              </p>
            </div>

            {/* ALERTA DE ERRO */}
            {errorMsg && (
              <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-start gap-2.5 text-rose-300 text-xs animate-shake">
                <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-400" />
                <span className="font-semibold leading-relaxed">{errorMsg}</span>
              </div>
            )}

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
                    autoFocus
                    value={login}
                    onChange={(e) => {
                      setLogin(e.target.value);
                      setErrorMsg(null);
                    }}
                    placeholder="Ex: admin, gerente, balcao"
                    className="w-full pl-10 pr-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-white font-medium text-sm placeholder:text-slate-600 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  />
                </div>
              </div>

              {/* CAMPO SENHA */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-extrabold text-slate-300 uppercase tracking-wider">
                    Senha de Acesso:
                  </label>
                  <span className="text-[11px] text-slate-500">
                    {login === 'admin' ? 'Padrão: admin' : 'Padrão: 1234'}
                  </span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock size={16} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setErrorMsg(null);
                    }}
                    placeholder="Digite sua senha"
                    className="w-full pl-10 pr-11 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-white font-medium text-sm placeholder:text-slate-600 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
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
                    className="w-4 h-4 rounded bg-slate-950 border-slate-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-900"
                  />
                  <span>Lembrar meu usuário neste navegador</span>
                </label>
              </div>

              {/* BOTÃO ENTRAR */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-blue-900/30 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
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

            <div className="pt-4 border-t border-slate-800/80 text-center">
              <span className="text-[11px] text-slate-500 block">
                OmniComércio ERP & PDV • Versão 1.0.0
              </span>
              <span className="text-[10px] text-slate-600 block mt-0.5">
                Segurança com isolamento de perfis e trilha de auditoria ativa
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
