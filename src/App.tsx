import React, { useState, useEffect } from 'react';
import { Lock } from 'lucide-react';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { DashboardView } from './components/dashboard/DashboardView';
import { PosView } from './components/pos/PosView';
import { ExternalSalesView } from './components/externalSales/ExternalSalesView';
import { OrdersView } from './components/orders/OrdersView';
import { ProductsView } from './components/products/ProductsView';
import { CrmView } from './components/crm/CrmView';
import { StockLocationsView } from './components/stock/StockLocationsView';
import { ProductionView } from './components/production/ProductionView';
import { PricingView } from './components/pricing/PricingView';
import { PurchasesView } from './components/purchases/PurchasesView';
import { FinancialView } from './components/financial/FinancialView';
import { ExcelToolsView } from './components/excel/ExcelToolsView';
import { ReportsView } from './components/reports/ReportsView';
import { ExpeditionView } from './components/expedition/ExpeditionView';
import { SettingsView } from './components/settings/SettingsView';
import { GlobalShortcutsModal } from './components/common/GlobalShortcutsModal';
import { CommandPaletteModal } from './components/common/CommandPaletteModal';
import { LeavePosWarningModal } from './components/common/LeavePosWarningModal';
import { ToastContainer } from './components/common/ToastContainer';
import { LoginView } from './components/auth/LoginView';
import { OrderItem } from './types';
import { Database } from './services/db';
import { SupabaseService } from './services/supabaseService';
import { toast } from './services/toast';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return Database.isSessionAuthenticated();
  });
  const [currentModule, setCurrentModule] = useState<string>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [sidebarMinimized, setSidebarMinimized] = useState<boolean>(() => {
    return localStorage.getItem('omni_sidebar_minimized') === 'true';
  });
  const [hideDashboardKpis, setHideDashboardKpis] = useState<boolean>(() => {
    return localStorage.getItem('omni_hide_dashboard_kpis') === 'true';
  });
  const [, setDbVersion] = useState(0);
  const currentCompany = Database.getCurrentCompany();

  // Carrinho do PDV Balcão mantido no nível superior para detectar venda em andamento
  const [posCart, setPosCart] = useState<OrderItem[]>([]);
  const [showLeavePosWarningModal, setShowLeavePosWarningModal] = useState<boolean>(false);
  const [pendingNavigationModule, setPendingNavigationModule] = useState<string | null>(null);

  // Modais Globais de Produtividade
  const [showShortcutsModal, setShowShortcutsModal] = useState<boolean>(false);
  const [showCommandPalette, setShowCommandPalette] = useState<boolean>(false);

  // Navegação central com proteção contra perda de dados no PDV
  const navigateTo = (targetModule: string) => {
    if (targetModule === currentModule) return;

    // Regra solicitada: apenas o usuário 'admin' poderá utilizar os submenus 'Empresa, Usuários & Auditoria', 'Menu do Sistema' e 'Banco Supabase'
    if (!Database.isAdmin() && (targetModule === 'settings' || targetModule === 'settings_menus' || targetModule === 'settings_supabase')) {
      toast.error(
        'Acesso restrito: apenas o usuário "admin" tem permissão para acessar os submenus administrativos do sistema.',
        'Permissão Insuficiente'
      );
      return;
    }

    // Checagem de permissões granulares definidas pelo admin para este usuário
    if (!Database.isAdmin()) {
      const isAllowedSub = Database.isSubItemAllowedForCurrentUser(targetModule);
      const isAllowedSec = Database.isMenuSectionAllowedForCurrentUser(targetModule);
      if (!isAllowedSub && !isAllowedSec && targetModule !== 'dashboard') {
        toast.error(
          'Acesso restrito: seu perfil de usuário não possui permissão concedida pelo administrador para utilizar este recurso.',
          'Módulo Bloqueado'
        );
        return;
      }
    }

    // Se o usuário iniciou uma venda (pelo menos 1 item no carrinho do PDV) e tenta ir para qualquer outro menu:
    if (currentModule === 'pos' && posCart.length > 0) {
      setPendingNavigationModule(targetModule);
      setShowLeavePosWarningModal(true);
      return;
    }

    setCurrentModule(targetModule);
  };

  const handleConfirmLeavePos = () => {
    setPosCart([]);
    setShowLeavePosWarningModal(false);
    if (pendingNavigationModule) {
      setCurrentModule(pendingNavigationModule);
      setPendingNavigationModule(null);
    }
  };

  const handleCancelLeavePos = () => {
    setShowLeavePosWarningModal(false);
    setPendingNavigationModule(null);
  };

  // Alerta nativo de fechamento/recarregamento da página se houver venda em andamento no PDV
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (currentModule === 'pos' && posCart.length > 0) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [currentModule, posCart.length]);

  const handleToggleSidebarMinimize = () => {
    setSidebarMinimized((prev) => {
      const next = !prev;
      localStorage.setItem('omni_sidebar_minimized', String(next));
      return next;
    });
  };

  const handleToggleDashboardKpis = () => {
    setHideDashboardKpis((prev) => {
      const next = !prev;
      localStorage.setItem('omni_hide_dashboard_kpis', String(next));
      return next;
    });
  };

  useEffect(() => {
    // Carregar dados locais imediatos e escutar mudanças reativas
    Database.load();
    const unsubscribe = Database.subscribe(() => {
      setDbVersion((v) => v + 1);
      setIsAuthenticated(Database.isSessionAuthenticated());
    });

    // Inicialização da sincronização centralizada em tempo real com o Supabase
    // Conecta Realtime, reconcilia dados e sincroniza alterações entre todos os computadores
    const cleanupSupabase = SupabaseService.init();

    return () => {
      unsubscribe();
      cleanupSupabase();
    };
  }, []);

  // SISTEMA DE ATALHOS GLOBAIS DE TECLADO
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Se a confirmação de saída do PDV, a paleta ou modal de atalhos estiver aberta, Esc fecha
      if (e.key === 'Escape') {
        if (showLeavePosWarningModal) {
          handleCancelLeavePos();
          return;
        }
        if (showCommandPalette) {
          setShowCommandPalette(false);
          return;
        }
        if (showShortcutsModal) {
          setShowShortcutsModal(false);
          return;
        }
      }

      // Ctrl + K ou Cmd + K abre a Paleta de Comandos
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setShowCommandPalette((prev) => !prev);
        return;
      }

      // Alt + M alterna minimização do menu lateral
      if (e.altKey && (e.key === 'm' || e.key === 'M')) {
        e.preventDefault();
        handleToggleSidebarMinimize();
        return;
      }

      // F1 abre o Guia de Atalhos
      if (e.key === 'F1') {
        e.preventDefault();
        setShowShortcutsModal((prev) => !prev);
        return;
      }

      // Atalho de interrogação (?) fora de campos de texto
      const target = e.target as HTMLElement | null;
      const isTyping =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      if (e.key === '?' && !isTyping && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setShowShortcutsModal(true);
        return;
      }

      // F12: Quantidade Fracionada no PDV Balcão (impede DevTools do navegador)
      if (e.key === 'F12') {
        e.preventDefault();
        if (currentModule !== 'pos') {
          navigateTo('pos');
        }
        return;
      }

      // F2: Se fora do PDV, abre o PDV Balcão diretamente
      // (Se já estiver no PDV, o próprio PosView executa o modal de consulta F2)
      if (e.key === 'F2') {
        if (currentModule !== 'pos') {
          e.preventDefault();
          navigateTo('pos');
        }
      }
      // F3: Pedido de Venda & Orçamentos (fora do PDV)
      else if (e.key === 'F3') {
        if (currentModule !== 'pos') {
          e.preventDefault();
          navigateTo('orders');
        }
      }
      // F4: Catálogo de Produtos e Preços (fora do PDV)
      else if (e.key === 'F4') {
        if (currentModule !== 'pos') {
          e.preventDefault();
          navigateTo('products');
        }
      }
      // F6: Financeiro (Fluxo de Caixa / Contas)
      else if (e.key === 'F6') {
        e.preventDefault();
        navigateTo('cash_flow');
      }
      // F7: Vendas Mobile
      else if (e.key === 'F7') {
        e.preventDefault();
        navigateTo('external_sales');
      }
      // F8: Clientes & CRM
      else if (e.key === 'F8') {
        e.preventDefault();
        navigateTo('customers');
      }
      // F9: Histórico de Vendas / Pedidos Faturados (fora do PDV)
      else if (e.key === 'F9') {
        if (currentModule !== 'pos') {
          e.preventDefault();
          navigateTo('orders_history');
        }
      }
      // F10: Painel de Controle / Dashboard Inicial
      else if (e.key === 'F10') {
        e.preventDefault();
        navigateTo('dashboard');
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [currentModule, showCommandPalette, showShortcutsModal, showLeavePosWarningModal, posCart.length]);

  // Ao abrir o PDV Balcão, ocultar o Dashboard Informativo e minimizar o menu para apenas ícones
  useEffect(() => {
    if (currentModule === 'pos') {
      setSidebarMinimized(true);
      setHideDashboardKpis(true);
    }
  }, [currentModule]);

  const renderModule = () => {
    // Verificação de segurança: se o usuário não for admin, bloquear acesso a módulos restritos
    if (!Database.isAdmin()) {
      if (currentModule === 'settings' || currentModule === 'settings_menus' || currentModule === 'settings_supabase') {
        return (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50 min-h-[60vh]">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3 border border-amber-200">
              <Lock size={26} />
            </div>
            <h2 className="text-base font-bold text-slate-800">Acesso Restrito ao Administrador</h2>
            <p className="text-xs text-slate-500 max-w-md mt-1 mb-4">
              Apenas o usuário "admin" tem autorização para acessar as configurações de empresas, usuários, banco de dados e menus.
            </p>
            <button
              onClick={() => setCurrentModule('dashboard')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              Voltar ao Início
            </button>
          </div>
        );
      }

      const isAllowedSub = Database.isSubItemAllowedForCurrentUser(currentModule);
      const isAllowedSec = Database.isMenuSectionAllowedForCurrentUser(currentModule);
      if (!isAllowedSub && !isAllowedSec && currentModule !== 'dashboard') {
        return (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50 min-h-[60vh]">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3 border border-amber-200">
              <Lock size={26} />
            </div>
            <h2 className="text-base font-bold text-slate-800">Recurso Bloqueado pelo Administrador</h2>
            <p className="text-xs text-slate-500 max-w-md mt-1 mb-4">
              Seu perfil de usuário não possui permissão concedida pelo administrador para visualizar ou utilizar este menu/módulo.
            </p>
            <button
              onClick={() => setCurrentModule('dashboard')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              Voltar ao Início
            </button>
          </div>
        );
      }
    }

    switch (currentModule) {
      case 'dashboard':
        return <DashboardView onNavigate={navigateTo} />;
      case 'pos':
        return (
          <PosView
            isSidebarMinimized={sidebarMinimized}
            onToggleSidebarMinimize={handleToggleSidebarMinimize}
            hideDashboardKpis={hideDashboardKpis}
            onToggleDashboardKpis={handleToggleDashboardKpis}
            cart={posCart}
            setCart={setPosCart}
          />
        );
      case 'external_sales':
        return <ExternalSalesView />;
      case 'orders':
        return <OrdersView initialMode="novo_pedido" initialDocType="venda" />;
      case 'orders_quotes':
        return <OrdersView initialMode="novo_pedido" initialDocType="orcamento" />;
      case 'orders_history':
        return <OrdersView initialMode="historico" />;
      case 'products':
        return <ProductsView />;
      case 'customers':
        return <CrmView initialSubTab="clientes" />;
      case 'suppliers':
        return <CrmView initialSubTab="fornecedores" />;
      case 'stock_locations':
        return <StockLocationsView initialSubTab="locais" />;
      case 'stock_transfers':
        return <StockLocationsView initialSubTab="transferencias" />;
      case 'inventory':
        return <StockLocationsView initialSubTab="inventario" />;
      case 'stock_movements':
        return <StockLocationsView initialSubTab="movimentacoes" />;
      case 'bom_composition':
        return <ProductionView initialSubTab="composicao" initialCompositionSubTab="ficha" />;
      case 'components_catalog':
        return <ProductionView initialSubTab="composicao" initialCompositionSubTab="componentes" />;
      case 'production_orders':
        return <ProductionView initialSubTab="ordens" />;
      case 'delivery_manifests':
        return <ExpeditionView initialTab="romaneios" />;
      case 'delivery_routes':
        return <ExpeditionView initialTab="rotas" initialRouteSubTab="rotas" />;
      case 'delivery_market_areas':
        return <ExpeditionView initialTab="rotas" initialRouteSubTab="pracas" />;
      case 'delivery_neighborhoods':
        return <ExpeditionView initialTab="rotas" initialRouteSubTab="bairros" />;
      case 'delivery_cities':
        return <ExpeditionView initialTab="rotas" initialRouteSubTab="cidades" />;
      case 'delivery_states':
        return <ExpeditionView initialTab="rotas" initialRouteSubTab="estados" />;
      case 'expedition_reports':
        return <ExpeditionView initialTab="relatorios" />;
      case 'expedicao':
        return <ExpeditionView initialTab="romaneios" />;
      case 'pricing_calculator':
        return <PricingView initialSubTab="individual" />;
      case 'batch_pricing':
        return <PricingView initialSubTab="em_lote" />;
      case 'purchases':
        return <PurchasesView />;
      case 'cash_flow':
        return <FinancialView initialSubTab="fluxo_caixa" />;
      case 'accounts_receivable':
        return <FinancialView initialSubTab="contas_receber" />;
      case 'accounts_payable':
        return <FinancialView initialSubTab="contas_pagar" />;
      case 'cash_register':
        return <FinancialView initialSubTab="caixa_pdv" />;
      case 'payment_methods':
        return <FinancialView initialSubTab="formas_pagamento" />;
      case 'financial_accounts':
        return <FinancialView initialSubTab="contas_bancarias" />;
      case 'payment_terms':
        return <FinancialView initialSubTab="prazos_pagamento" />;
      case 'financial_reports':
        return <FinancialView initialSubTab="relatorios" />;
      case 'excel_tools':
        return <ExcelToolsView />;
      case 'reports':
        return <ReportsView />;
      case 'settings':
        return <SettingsView initialTab="empresas" />;
      case 'settings_supabase':
        return <SettingsView initialTab="supabase" />;
      case 'settings_menus':
        return <SettingsView initialTab="menus" />;
      case 'settings_printer':
        return <SettingsView initialTab="impressora" />;
      case 'settings_preferences':
        return <SettingsView initialTab="preferencias" />;
      default:
        return <DashboardView onNavigate={navigateTo} />;
    }
  };

  if (!isAuthenticated) {
    return (
      <>
        <LoginView onLoginSuccess={() => setIsAuthenticated(true)} />
        <ToastContainer />
      </>
    );
  }

  return (
    <div className={`min-h-screen bg-slate-100 flex flex-col font-sans text-slate-900 ${currentModule === 'pos' ? 'h-screen overflow-hidden' : ''}`}>
      {/* Barra de Navegação Superior */}
      <Header
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        sidebarOpen={sidebarOpen}
        onNavigate={navigateTo}
        currentModule={currentModule}
        onOpenShortcuts={() => setShowShortcutsModal(true)}
        onOpenCommandPalette={() => setShowCommandPalette(true)}
      />

      {/* Conteúdo Principal com Barra Lateral */}
      <div className={`flex-1 flex min-h-0 ${currentModule === 'pos' ? 'h-[calc(100vh-4rem)] overflow-hidden' : ''}`}>
        <Sidebar
          currentModule={currentModule}
          onNavigate={navigateTo}
          isOpen={sidebarOpen}
          onCloseMobile={() => setSidebarOpen(false)}
          isMinimized={sidebarMinimized}
          onToggleMinimize={handleToggleSidebarMinimize}
        />

        {/* Área Central de Visualização dos Módulos */}
        <main
          key={`main-content-${currentModule}-${currentCompany.id}`}
          className={`flex-1 w-full mx-auto ${
            currentModule === 'pos'
              ? 'p-2 sm:p-2.5 max-w-[1700px] h-full overflow-hidden flex flex-col min-h-0'
              : currentModule === 'orders' || currentModule === 'orders_quotes'
              ? 'p-2 sm:p-3 max-w-[1700px] overflow-x-hidden'
              : 'p-3 sm:p-5 lg:p-6 max-w-7xl overflow-x-hidden'
          }`}
        >
          {renderModule()}
        </main>
      </div>

      {/* SISTEMA GLOBAL DE NOTIFICAÇÕES TOAST */}
      <ToastContainer />

      {/* ALERTA DE SEGURANÇA: VENDA EM ANDAMENTO NO PDV BALCÃO */}
      <LeavePosWarningModal
        isOpen={showLeavePosWarningModal}
        cart={posCart}
        targetModuleName={pendingNavigationModule}
        onConfirmLeave={handleConfirmLeavePos}
        onCancelLeave={handleCancelLeavePos}
      />

      {/* MODAL: GUIA COMPLETO DE ATALHOS GLOBAIS DE TECLADO [F1] */}
      <GlobalShortcutsModal
        isOpen={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
        onNavigate={navigateTo}
        onOpenCommandPalette={() => {
          setShowShortcutsModal(false);
          setShowCommandPalette(true);
        }}
      />

      {/* MODAL: PALETA DE COMANDOS GLOBAL [CTRL + K] */}
      <CommandPaletteModal
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        onNavigate={navigateTo}
        onOpenShortcuts={() => {
          setShowCommandPalette(false);
          setShowShortcutsModal(true);
        }}
      />
    </div>
  );
}
