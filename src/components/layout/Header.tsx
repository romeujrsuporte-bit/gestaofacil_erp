import React from 'react';
import { 
  Building2, 
  Bell, 
  Menu, 
  X, 
  ChevronDown,
  Keyboard,
  Search
} from 'lucide-react';
import { Database } from '../../services/db';
import { GestaoFacilLogo } from '../common/AppLogo';

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

  const handleCompanyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    Database.setCurrentCompany(e.target.value);
    Database.addAuditLog(
      'TROCA_EMPRESA',
      'SISTEMA',
      e.target.value,
      `Usuário alternou contexto para empresa ID: ${e.target.value}`
    );
  };

  const handleUserChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    Database.setCurrentUser(e.target.value);
    Database.addAuditLog(
      'TROCA_PERFIL_USUARIO',
      'SEGURANCA',
      e.target.value,
      `Sessão simulada alterada para usuário ID: ${e.target.value}`
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
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-2xs h-16 flex items-center justify-between px-3 md:px-6">
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
          onClick={() => onNavigate('dashboard')}
          title="Ir para o Painel Inicial"
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
        {/* Indicador Supabase Cloud */}
        <button
          type="button"
          onClick={() => onNavigate('settings_supabase')}
          className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200 select-none"
          title="Supabase PostgreSQL Conectado: Clique para gerenciar sincronização e banco de dados"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-extrabold font-mono text-[11px]">Supabase</span>
          <span className="text-[10px] text-emerald-600 font-semibold">Online</span>
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

        {/* Perfil do Usuário com avatar azul 'RM' */}
        <div className="flex items-center gap-2.5 pl-2 sm:pl-3 border-l border-slate-200 relative group">
          <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-xs shrink-0 select-none">
            {initials}
          </div>

          <div className="hidden md:flex flex-col text-left">
            <span className="text-xs font-bold text-slate-900 leading-tight">
              {currentUser.name}
            </span>
            <span className="text-[11px] font-medium text-slate-400 capitalize">
              {currentUser.role === 'admin' ? 'Administrador' : currentUser.role}
            </span>
          </div>

          {/* Troca rápida de perfil simulado */}
          <div className="relative">
            <select
              value={currentUser.id}
              onChange={handleUserChange}
              className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"
              title="Trocar usuário para testar permissões"
            >
              {dbState.users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>
    </header>
  );
};
