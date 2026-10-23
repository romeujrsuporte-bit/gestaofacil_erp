import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  Home,
  ShoppingCart,
  Smartphone,
  ClipboardList,
  Package,
  Users,
  Truck,
  Warehouse,
  ShoppingBag,
  ArrowLeftRight,
  ClipboardCheck,
  History,
  Boxes,
  Layers,
  Calculator,
  Percent,
  CircleDollarSign,
  TrendingDown,
  TrendingUp,
  Vault,
  FileSpreadsheet,
  BarChart3,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  LogOut,
} from 'lucide-react';
import { Database } from '../../services/db';
import { toast } from '../../services/toast';
import { CashRegister } from '../common/icons/CashRegisterIcon';

interface SidebarProps {
  currentModule: string;
  onNavigate: (moduleId: string) => void;
  isOpen: boolean;
  onCloseMobile: () => void;
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
}

interface SubMenuItem {
  id: string;
  label: string;
  shortcut?: string;
}

interface MenuGroupItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  defaultModule: string;
  shortcut?: string;
  subItems?: SubMenuItem[];
  requiredPermission?: 'canAccessFinancial' | 'canAccessProduction' | 'canAccessPurchases' | 'canManageUsers';
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentModule,
  onNavigate,
  isOpen,
  onCloseMobile,
  isMinimized = false,
  onToggleMinimize,
}) => {
  const currentUser = Database.getCurrentUser();
  const permissions = currentUser.permissions;

  const [dbState, setDbState] = useState(Database.getState());

  useEffect(() => {
    return Database.subscribe(() => {
      setDbState({ ...Database.getState() });
    });
  }, []);

  const menuConfig = useMemo(() => {
    return Database.getSidebarMenuConfig();
  }, [dbState]);

  // Controla quais seções acordeão estão abertas
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    vendas: true,
    cadastros: false,
    compras: false,
    estoque: false,
    producao: false,
    expedicao: false,
    precificacao: false,
    financeiro: false,
    relatorios: false,
    importacao: false,
    configuracoes: false,
  });

  const toggleSection = (sectionKey: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  };

  const isBalconista = currentUser?.role === 'balconista';

  const menuSections: MenuGroupItem[] = [
    {
      id: 'inicio',
      label: isBalconista ? 'PDV Balcão' : 'Início',
      icon: isBalconista ? <CashRegister size={18} /> : <Home size={18} />,
      defaultModule: isBalconista ? 'pos' : 'dashboard',
      shortcut: isBalconista ? 'F2' : 'F10',
    },
    {
      id: 'vendas',
      label: 'Vendas',
      icon: <ShoppingCart size={18} />,
      defaultModule: 'pos',
      subItems: [
        { id: 'pos', label: 'PDV Balcão', shortcut: 'F2' },
        { id: 'orders', label: 'Pedido de Venda', shortcut: 'F3' },
        { id: 'orders_quotes', label: 'Orçamentos' },
        { id: 'external_sales', label: 'Vendas Mobile', shortcut: 'F7' },
        { id: 'orders_history', label: 'Histórico de Vendas', shortcut: 'F9' },
      ],
    },
    {
      id: 'cadastros',
      label: 'Cadastros',
      icon: <FolderOpen size={18} />,
      defaultModule: 'products',
      subItems: [
        { id: 'products', label: 'Produtos & Insumos', shortcut: 'F4' },
        { id: 'customers', label: 'Clientes', shortcut: 'F8' },
        { id: 'suppliers', label: 'Fornecedores' },
        { id: 'stock_locations', label: 'Locais de Estoque' },
      ],
    },
    {
      id: 'compras',
      label: 'Compras',
      icon: <ShoppingBag size={18} />,
      defaultModule: 'purchases',
      requiredPermission: 'canAccessPurchases',
      subItems: [
        { id: 'purchases', label: 'Pedidos de Compra' },
      ],
    },
    {
      id: 'estoque',
      label: 'Estoque',
      icon: <Warehouse size={18} />,
      defaultModule: 'stock_locations',
      subItems: [
        { id: 'stock_transfers', label: 'Transferência entre Locais' },
        { id: 'inventory', label: 'Inventário & Ajustes' },
        { id: 'stock_movements', label: 'Extrato de Estoque' },
      ],
    },
    {
      id: 'producao',
      label: 'Produção',
      icon: <Boxes size={18} />,
      defaultModule: 'bom_composition',
      requiredPermission: 'canAccessProduction',
      subItems: [
        { id: 'bom_composition', label: 'Composição' },
        { id: 'components_catalog', label: 'Componentes' },
        { id: 'production_orders', label: 'Ordens de Produção' },
      ],
    },
    {
      id: 'expedicao',
      label: 'Expedição',
      icon: <Truck size={18} />,
      defaultModule: 'delivery_manifests',
      subItems: [
        { id: 'delivery_manifests', label: 'Romaneio de Entrega' },
        { id: 'delivery_routes', label: 'Rotas de Entrega' },
        { id: 'delivery_market_areas', label: 'Praças Comerciais' },
        { id: 'delivery_neighborhoods', label: 'Bairros' },
        { id: 'delivery_cities', label: 'Cidades' },
        { id: 'delivery_states', label: 'Estados (UF)' },
        { id: 'expedition_reports', label: 'Relatórios de Entrega' },
      ],
    },
    {
      id: 'precificacao',
      label: 'Precificação',
      icon: <Calculator size={18} />,
      defaultModule: 'pricing_calculator',
      subItems: [
        { id: 'pricing_calculator', label: 'Formação de Preço' },
        { id: 'batch_pricing', label: 'Atualização em Lote' },
      ],
    },
    {
      id: 'financeiro',
      label: 'Financeiro',
      icon: <CircleDollarSign size={18} />,
      defaultModule: 'cash_flow',
      requiredPermission: 'canAccessFinancial',
      subItems: [
        { id: 'cash_flow', label: 'Fluxo de Caixa', shortcut: 'F6' },
        { id: 'accounts_receivable', label: 'Contas a Receber' },
        { id: 'accounts_payable', label: 'Contas a Pagar' },
        { id: 'cash_register', label: 'Controle de Caixa PDV' },
        { id: 'payment_methods', label: 'Formas de Pagamento' },
        { id: 'financial_accounts', label: 'Contas Bancárias & Caixa' },
        { id: 'payment_terms', label: 'Prazos de Pagamento' },
        { id: 'financial_reports', label: 'Relatórios' },
      ],
    },
    {
      id: 'relatorios',
      label: 'Relatórios',
      icon: <BarChart3 size={18} />,
      defaultModule: 'reports',
      subItems: [
        { id: 'reports', label: 'Relatórios Gerenciais' },
      ],
    },
    {
      id: 'importacao',
      label: 'Importação/Exportação',
      icon: <FileSpreadsheet size={18} />,
      defaultModule: 'excel_tools',
      subItems: [
        { id: 'excel_tools', label: 'Planilhas Excel (.xlsx)' },
      ],
    },
    {
      id: 'configuracoes',
      label: 'Configurações',
      icon: <Settings size={18} />,
      defaultModule: 'settings',
      subItems: [
        { id: 'settings', label: 'Empresas, Usuários & Auditoria' },
        { id: 'settings_supabase', label: 'Banco Supabase (Nuvem)' },
        { id: 'settings_menus', label: 'Menus do Sistema' },
        { id: 'settings_preferences', label: 'Preferências & Alertas' },
        { id: 'settings_printer', label: 'Configuração de Impressão' },
      ],
    },
  ];

  const isAdmin = currentUser.login === 'admin';

  const visibleMenuSections = useMemo(() => {
    return menuSections
      .filter((section) => {
        // Seção oculta nas preferências do sistema
        if (section.id !== 'configuracoes' && menuConfig.hiddenSections.includes(section.id)) {
          return false;
        }
        // Permissões gerais de perfil
        if (section.requiredPermission && !permissions[section.requiredPermission]) {
          return false;
        }
        // Permissões granulares de menus definidas pelo administrador para este usuário
        if (!isAdmin && !Database.isMenuSectionAllowedForCurrentUser(section.id)) {
          return false;
        }
        return true;
      })
      .map((section) => {
        if (!section.subItems) return section;
        const visibleSubs = section.subItems.filter((sub) => {
          // Apenas o usuário "admin" poderá utilizar os submenus administrativos
          if (!isAdmin && (sub.id === 'settings' || sub.id === 'settings_menus' || sub.id === 'settings_supabase')) {
            return false;
          }
          // Submenu oculto globalmente nas preferências
          if (menuConfig.hiddenSubItems.includes(sub.id)) {
            return false;
          }
          // Permissão granular do submenu definida pelo admin para este usuário
          if (!isAdmin && !Database.isSubItemAllowedForCurrentUser(sub.id)) {
            return false;
          }
          return true;
        });

        return {
          ...section,
          defaultModule: !isAdmin && section.id === 'configuracoes' ? 'settings_preferences' : section.defaultModule,
          subItems: visibleSubs,
        };
      })
      .filter((section) => {
        if (section.subItems && section.subItems.length === 0 && section.id !== 'inicio') {
          return false;
        }
        return true;
      });
  }, [menuSections, menuConfig, permissions, currentUser]);

  const handleSubItemClick = (id: string) => {
    onNavigate(id);
    onCloseMobile();
  };

  return (
    <>
      {/* Overlay escuro no mobile */}
      {isOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      {/* Barra Lateral Preta Harmonizada com suporte ao Modo Minimizado */}
      <aside
        className={`fixed lg:sticky top-0 lg:top-16 left-0 h-full lg:h-[calc(100vh-4rem)] bg-zinc-950 text-zinc-200 z-50 lg:z-20 transition-all duration-200 ease-in-out border-r border-zinc-800/90 shadow-md flex flex-col justify-between ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${isMinimized ? 'w-64 lg:w-[68px]' : 'w-64'}`}
      >
        {/* Topo / Lista de Menus */}
        <div className="flex-1 overflow-y-auto">
          {/* Cabeçalho Mobile */}
          <div className="p-3.5 flex items-center justify-between lg:hidden border-b border-zinc-800/80">
            <span className="font-bold text-white text-sm">Menu de Navegação</span>
            <button
              onClick={onCloseMobile}
              className="text-zinc-400 hover:text-white p-1 rounded-md hover:bg-zinc-900 transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Seletor Rápido de Empresa no Menu Mobile */}
          <div className="p-3 lg:hidden border-b border-zinc-800/80 bg-zinc-900/60">
            <div className="flex items-center gap-1.5 text-zinc-300 mb-1.5">
              <Building2 size={15} className="text-emerald-400" />
              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                Empresa Ativa:
              </span>
            </div>
            <select
              value={Database.getCurrentCompany().id}
              onChange={(e) => {
                const newCompanyId = e.target.value;
                Database.setCurrentCompany(newCompanyId);
                const comp = dbState.companies.find((c) => c.id === newCompanyId);
                const compName = comp ? (comp.tradeName || comp.name) : newCompanyId;
                Database.addAuditLog(
                  'TROCA_EMPRESA',
                  'SISTEMA',
                  newCompanyId,
                  `Usuário alternou empresa no menu mobile para: ${compName}`
                );
                toast.success(`Empresa alterada para: ${compName}`, 'Empresa Selecionada');
              }}
              className="w-full bg-zinc-950 border border-zinc-700/80 text-white text-xs font-semibold rounded-lg px-2.5 py-1.5 focus:outline-hidden focus:border-emerald-500 cursor-pointer"
            >
              {dbState.companies.map((comp) => (
                <option key={comp.id} value={comp.id}>
                  {comp.tradeName || comp.name} ({comp.type === 'matriz' ? 'Matriz' : 'Filial'})
                </option>
              ))}
            </select>
          </div>

          {/* Botão de Toggle Minimizar Desktop */}
          {onToggleMinimize && (
            <div className="hidden lg:flex items-center justify-between px-3 py-2 border-b border-zinc-800/80">
              {!isMinimized && (
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  Menu Principal
                </span>
              )}
              <button
                type="button"
                onClick={onToggleMinimize}
                className={`p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors ${
                  isMinimized ? 'mx-auto' : ''
                }`}
                title={isMinimized ? 'Expandir Menu Completo' : 'Minimizar Menu (Apenas Ícones)'}
              >
                {isMinimized ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
              </button>
            </div>
          )}

          {/* Navegação Estilo GestãoFácil ERP */}
          <nav className={`p-2 space-y-1 text-xs ${isMinimized ? 'px-1.5' : ''}`}>
            {visibleMenuSections.map((section) => {
              if (section.requiredPermission && !permissions[section.requiredPermission]) {
                return null;
              }

              const hasSubItems = section.subItems && section.subItems.length > 0;
              const isSectionOpen = openSections[section.id];
              const isSectionActive =
                currentModule === section.defaultModule ||
                (section.subItems && section.subItems.some((s) => s.id === currentModule));

              if (isMinimized) {
                // Modo Apenas Ícones
                return (
                  <button
                    key={section.id}
                    onClick={() => {
                      onNavigate(section.defaultModule);
                      onCloseMobile();
                    }}
                    title={section.label}
                    className={`w-full flex items-center justify-center p-2.5 rounded-xl transition-all relative group cursor-pointer ${
                      isSectionActive
                        ? 'bg-emerald-600 text-white shadow-xs font-bold ring-1 ring-emerald-400/60'
                        : 'text-zinc-400 hover:bg-zinc-900/90 hover:text-white'
                    }`}
                  >
                    <span>{section.icon}</span>

                    {/* Tooltip flutuante */}
                    <div className="absolute left-full ml-2 px-2.5 py-1 bg-zinc-900 text-white text-xs font-semibold rounded-md shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 border border-zinc-700 flex items-center gap-1.5">
                      <span>{section.label}</span>
                      {section.shortcut && (
                        <span className="font-mono text-[10px] text-emerald-400 font-bold">
                          [{section.shortcut}]
                        </span>
                      )}
                    </div>
                  </button>
                );
              }

              // Modo Completo com Accordions
              return (
                <div key={section.id} className="space-y-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (hasSubItems) {
                        toggleSection(section.id);
                      } else {
                        onNavigate(section.defaultModule);
                        onCloseMobile();
                      }
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl font-semibold transition-all text-left cursor-pointer ${
                      isSectionActive
                        ? 'bg-emerald-600 text-white font-bold shadow-xs border border-emerald-500/50'
                        : 'text-zinc-300 hover:bg-zinc-900/90 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={isSectionActive ? 'text-white' : 'text-zinc-400'}>
                        {section.icon}
                      </span>
                      <span className="text-xs truncate">{section.label}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {section.shortcut && !hasSubItems && (
                        <kbd
                          className={`font-mono text-[9px] font-bold px-1.5 py-0.2 rounded border shadow-2xs ${
                            isSectionActive
                              ? 'bg-emerald-700 text-emerald-100 border-emerald-500'
                              : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                          }`}
                        >
                          {section.shortcut}
                        </kbd>
                      )}
                      {hasSubItems && (
                        <span className={isSectionActive ? 'text-emerald-100' : 'text-zinc-500'}>
                          {isSectionOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </span>
                      )}
                    </div>
                  </button>

                  {/* Sub-itens expandidos */}
                  {hasSubItems && isSectionOpen && (
                    <div className="pl-7 pr-1 py-1 space-y-0.5">
                      {section.subItems?.map((sub) => {
                        const isSubActive = currentModule === sub.id;

                        return (
                          <button
                            key={sub.id}
                            type="button"
                            onClick={() => handleSubItemClick(sub.id)}
                            className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer text-[11px] ${
                              isSubActive
                                ? 'text-emerald-400 font-extrabold bg-zinc-900/90 border border-emerald-500/30 shadow-2xs'
                                : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 truncate">
                              <span className={isSubActive ? 'text-emerald-400 font-bold' : 'text-zinc-600'}>
                                {isSubActive ? '•' : '◦'}
                              </span>
                              <span className="truncate">{sub.label}</span>
                            </div>

                            {sub.shortcut && (
                              <kbd
                                className={`font-mono text-[9px] font-bold px-1 py-0.2 rounded border shadow-2xs shrink-0 ${
                                  isSubActive
                                    ? 'bg-zinc-800 text-emerald-300 border-zinc-700'
                                    : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                                }`}
                              >
                                {sub.shortcut}
                              </kbd>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        {/* Botão Sair do Sistema / Logout */}
        <div className="p-2 border-t border-zinc-800/80">
          <button
            type="button"
            onClick={() => {
              Database.logout();
              toast.info('Sessão encerrada com sucesso.');
            }}
            className={`w-full flex items-center ${
              isMinimized ? 'justify-center p-2' : 'justify-between px-3 py-2'
            } text-zinc-400 hover:text-rose-400 hover:bg-rose-950/20 border border-transparent hover:border-rose-900/40 rounded-xl transition-all text-xs font-bold cursor-pointer group`}
            title="Encerrar sessão e voltar para a tela de login"
          >
            <div className="flex items-center gap-2">
              <LogOut size={16} className="text-zinc-500 group-hover:text-rose-400" />
              {!isMinimized && <span>Sair do Sistema</span>}
            </div>
            {!isMinimized && (
              <span className="text-[10px] text-zinc-500 group-hover:text-rose-400 font-mono">
                {currentUser.login}
              </span>
            )}
          </button>
        </div>

        {/* Rodapé da Barra Lateral: GestãoFácil ERP v1.0.0 */}
        <div className="p-2.5 border-t border-zinc-800/80 text-[11px] text-zinc-400 font-medium text-center shrink-0">
          {!isMinimized ? (
            <div className="flex flex-col items-start gap-0.5 text-left">
              <div className="flex items-center justify-between w-full">
                <span className="font-bold text-white tracking-wide">GestãoFácil ERP</span>
                <span className="font-mono text-[10px] text-emerald-400 bg-emerald-950/70 border border-emerald-800/60 px-1 py-0.2 rounded">
                  v1.0.0
                </span>
              </div>
              <span className="text-[9px] text-zinc-500 truncate w-full">
                Organização e Controle, de um jeito simples
              </span>
            </div>
          ) : (
            <span className="font-mono text-[9px] block text-emerald-400 font-bold">GF</span>
          )}
        </div>
      </aside>
    </>
  );
};
