import React, { useState, useRef, useEffect } from 'react';
import { 
  Building2, 
  Bell, 
  Menu, 
  X, 
  ChevronDown,
  Keyboard,
  Search,
  KeyRound,
  LogOut,
  ShieldCheck,
  User as UserIcon,
  RefreshCw,
} from 'lucide-react';
import { Database } from '../../services/db';
import { SupabaseService, SupabaseConfig } from '../../services/supabaseService';
import { toast } from '../../services/toast';
import { GestaoFacilLogo } from '../common/AppLogo';
import { ChangePasswordModal } from '../auth/ChangePasswordModal';

interface HeaderProps {
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
  onNavigate: (module: string) => void;
  currentModule: string;
  onOpenShortcuts?: () => void;
  onOpenCommandPalette?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleSidebar,
  sidebarOpen,
  onNavigate,
  onOpenShortcuts,
  onOpenCommandPalette,
}) => {
  const dbState = Database.getState();
  const currentCompany = Database.getCurrentCompany();
  const currentUser = Database.getCurrentUser();
  const isAdmin = currentUser.login === 'admin';

  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isChangePassOpen, setIsChangePassOpen] = useState(false);
  const [supabaseConfig, setSupabaseConfig] = useState<SupabaseConfig>(SupabaseService.getConfig());
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return SupabaseService.subscribe((cfg) => {
      setSupabaseConfig(cfg);
    });
  }, []);

  // Fecha o menu de perfil ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCompanyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCompanyId = e.target.value;
    Database.setCurrentCompany(newCompanyId);
    const targetComp = dbState.companies.find((c) => c.id === newCompanyId);
    const compLabel = targetComp ? (targetComp.tradeName || targetComp.name) : newCompanyId;
    Database.addAuditLog(
      'TROCA_EMPRESA',
      'SISTEMA',
      newCompanyId,
      `Usuário alternou contexto para empresa: ${compLabel} (ID: ${newCompanyId})`
    );
    toast.success(`Visualizando dados da empresa: ${compLabel}`, 'Empresa Selecionada');
  };

  const handleUserChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedUserId = e.target.value;
    Database.setCurrentUser(selectedUserId);
    const targetUser = dbState.users.find((u) => u.id === selectedUserId);
    if (targetUser && targetUser.role === 'balconista') {
      onNavigate('pos');
    }
    Database.addAuditLog(
      'TROCA_PERFIL_USUARIO',
      'SEGURANCA',
      selectedUserId,
      `Sessão simulada alterada para usuário ID: ${selectedUserId}`
    );
  };

  // Iniciais do usuário ativo para o avatar circular
  const initials = currentUser.name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'RM';

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-2xs">
      {/* Linha Principal do Cabeçalho */}
      <div className="h-16 flex items-center justify-between px-3 md:px-6">
        {/* Lado Esquerdo: Menu Mobile & Logo GestãoFácil ERP */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 focus:outline-hidden lg:hidden cursor-pointer"
          title="Alternar menu"
        >
          {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        <div
          className="flex items-center gap-2 cursor-pointer select-none"
          onClick={() => onNavigate(Database.getDefaultModuleForCurrentUser())}
          title={currentUser.role === 'balconista' ? 'Ir para o PDV Balcão (Tela Inicial)' : 'Ir para o Painel Inicial'}
        >
          <GestaoFacilLogo size={36} showSlogan={true} />
        </div>
      </div>

      {/* Lado Central: Busca Rápida [Ctrl+K] & Seletor de Empresa */}
      <div className="flex items-center gap-2">
        {onOpenCommandPalette && (
          <button
            type="button"
            onClick={onOpenCommandPalette}
            className="hidden md:flex items-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 text-xs px-3 py-1.5 rounded-xl border border-slate-200 transition-colors cursor-pointer select-none"
            title="Paleta de Comandos e Busca Global [Ctrl + K]"
          >
            <Search size={14} className="text-slate-400" />
            <span className="hidden lg:inline text-xs font-medium">Busca rápida / Ir para...</span>
            <span className="lg:hidden text-xs font-medium">Buscar</span>
            <kbd className="font-mono text-[10px] font-bold bg-white text-slate-600 px-1.5 py-0.5 rounded border border-slate-200 shadow-2xs">
              Ctrl K
            </kbd>
          </button>
        )}

        <div className="hidden sm:flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 max-w-xs sm:max-w-md">
          <Building2 size={16} className="text-slate-400 shrink-0" />
          <select
            value={currentCompany.id}
            onChange={handleCompanyChange}
            className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-hidden cursor-pointer truncate w-full"
            title="Alternar entre Matriz e Filiais"
          >
            {dbState.companies.map((comp) => (
              <option key={comp.id} value={comp.id}>
                {comp.tradeName || comp.name} ({comp.type === 'matriz' ? 'Matriz' : 'Filial'})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Lado Direito: Atalhos F1, Notificações & Perfil de Usuário */}
      <div className="flex items-center gap-1.5 sm:gap-3">
        {/* Indicador Supabase Cloud em Tempo Real */}
        <button
          type="button"
          onClick={() => onNavigate('settings_supabase')}
          className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer select-none ${
            supabaseConfig.status === 'syncing'
              ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
              : supabaseConfig.status === 'connected'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
              : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
          }`}
          title={
            supabaseConfig.status === 'syncing'
              ? 'Sincronizando dados com o Supabase central...'
              : supabaseConfig.status === 'connected'
              ? `Supabase Centralizado Conectado: sincronizado às ${supabaseConfig.lastSyncAt ? new Date(supabaseConfig.lastSyncAt).toLocaleTimeString() : 'agora'}`
              : 'Supabase em espera / reconectando: clique para verificar status do banco'
          }
        >
          {supabaseConfig.status === 'syncing' ? (
            <RefreshCw size={12} className="animate-spin text-blue-600" />
          ) : (
            <span
              className={`w-2 h-2 rounded-full ${
                supabaseConfig.status === 'connected'
                  ? 'bg-emerald-500 animate-pulse'
                  : 'bg-amber-500'
              }`}
            />
          )}
          <span className="font-extrabold font-mono text-[11px]">Supabase</span>
          <span className="text-[10px] font-semibold">
            {supabaseConfig.status === 'syncing'
              ? 'Sincronizando'
              : supabaseConfig.status === 'connected'
              ? 'Online'
              : 'Aguardando'}
          </span>
        </button>

        {/* Botão Atalhos de Teclado F1 */}
        {onOpenShortcuts && (
          <button
            type="button"
            onClick={onOpenShortcuts}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-emerald-700 bg-slate-50 hover:bg-emerald-50/70 px-2.5 py-1.5 rounded-xl border border-slate-200 hover:border-emerald-300 transition-all cursor-pointer select-none"
            title="Guia de Atalhos de Teclado [F1]"
          >
            <Keyboard size={16} className="text-emerald-600" />
            <span className="hidden sm:inline">Atalhos</span>
            <kbd className="hidden md:inline-block font-mono text-[10px] font-extrabold bg-white text-emerald-800 px-1.5 py-0.2 rounded border border-emerald-200 shadow-2xs">
              F1
            </kbd>
          </button>
        )}

        {/* Notificação de Sino com badge vermelha */}
        <button
          type="button"
          onClick={() => onNavigate('stock_movements')}
          className="relative p-2 rounded-full text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
          title="Notificações do Sistema"
        >
          <Bell size={18} />
          <span className="absolute top-1 right-1 flex items-center justify-center w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full animate-pulse shadow-2xs">
            3
          </span>
        </button>

        {/* Perfil do Usuário com Menu de Opções e Logout */}
        <div className="relative pl-2 sm:pl-3 border-l border-slate-200" ref={profileMenuRef}>
          <button
            type="button"
            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            className="flex items-center gap-2.5 p-1 -m-1 rounded-xl hover:bg-slate-100/80 transition-colors cursor-pointer text-left select-none"
            title="Perfil do Usuário e Opções de Conta"
          >
            <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-xs shrink-0">
              {initials}
            </div>

            <div className="hidden md:flex flex-col text-left">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-900 leading-tight">
                  {currentUser.name}
                </span>
                {isAdmin && (
                  <span className="text-[9px] font-black uppercase bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded-full border border-blue-200">
                    Admin
                  </span>
                )}
              </div>
              <span className="text-[11px] font-medium text-slate-400 capitalize">
                @{currentUser.login} • {currentUser.role === 'admin' ? 'Administrador' : currentUser.role}
              </span>
            </div>

            <ChevronDown size={14} className={`text-slate-400 transition-transform ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* POPOVER DO PERFIL */}
          {isProfileMenuOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-4 py-2.5 border-b border-slate-100">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">
                  Usuário Conectado
                </span>
                <span className="text-xs font-bold text-slate-900 block truncate">
                  {currentUser.name}
                </span>
                <span className="text-[11px] text-slate-500 font-mono block">
                  Login: @{currentUser.login}
                </span>
                <span className="inline-block mt-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  Perfil: {currentUser.role}
                </span>
              </div>

              <div className="p-1 space-y-0.5 text-xs">
                {/* Opção Alterar Senha */}
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    setIsChangePassOpen(true);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-slate-700 hover:text-blue-700 hover:bg-blue-50/70 rounded-xl font-semibold transition-colors cursor-pointer"
                >
                  <KeyRound size={15} className="text-blue-600" />
                  <span>{isAdmin ? 'Alterar Senha do Admin' : 'Alterar Minha Senha'}</span>
                </button>

                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      onNavigate('settings');
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl font-semibold transition-colors cursor-pointer"
                  >
                    <ShieldCheck size={15} className="text-slate-500" />
                    <span>Empresas, Usuários & Auditoria</span>
                  </button>
                )}

                <div className="my-1 border-t border-slate-100" />

                {/* Opção Sair do Sistema / Logout */}
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    Database.logout();
                    toast.info('Sessão encerrada com sucesso.');
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl font-bold transition-colors cursor-pointer"
                >
                  <LogOut size={15} className="text-rose-600" />
                  <span>Sair do Sistema (Logout)</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal de Alteração de Senha */}
        <ChangePasswordModal
          isOpen={isChangePassOpen}
          onClose={() => setIsChangePassOpen(false)}
          targetUser={currentUser}
        />
      </div>
      </div>

      {/* Barra Superior Mobile: Recurso de Seleção de Empresa no Topo da Tela */}
      <div className="sm:hidden bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white px-3 py-2 border-t border-slate-750 shadow-xs flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 shrink-0 text-slate-300">
          <Building2 size={16} className="text-emerald-400 shrink-0 animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-300">
            Empresa:
          </span>
        </div>

        <div className="flex-1 min-w-0 relative">
          <select
            value={currentCompany.id}
            onChange={handleCompanyChange}
            aria-label="Selecionar empresa para visualizar os dados"
            className="w-full bg-slate-800/95 hover:bg-slate-750 text-white text-xs font-bold py-1.5 pl-2.5 pr-7 rounded-lg border border-slate-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 appearance-none cursor-pointer truncate shadow-inner"
          >
            {dbState.companies.map((comp) => (
              <option key={comp.id} value={comp.id} className="bg-slate-900 text-white py-1">
                {comp.tradeName || comp.name} ({comp.type === 'matriz' ? 'Matriz' : 'Filial'})
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>

        <span
          className={`shrink-0 text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
            currentCompany.type === 'matriz'
              ? 'bg-blue-950 text-blue-300 border-blue-600/60'
              : 'bg-purple-950 text-purple-300 border-purple-600/60'
          }`}
        >
          {currentCompany.type === 'matriz' ? 'Matriz' : 'Filial'}
        </span>
      </div>
    </header>
  );
};
