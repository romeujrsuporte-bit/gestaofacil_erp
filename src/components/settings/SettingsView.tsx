import React, { useState, useEffect, useMemo } from 'react';
import {
  Settings,
  Building2,
  Users,
  Shield,
  History,
  Download,
  Upload,
  RotateCcw,
  CheckCircle2,
  Plus,
  Edit2,
  Printer,
  Sliders,
  AlertTriangle,
  Eye,
  EyeOff,
  Bell,
  Check,
  LayoutGrid,
  CheckSquare,
  Square,
  Home,
  ShoppingCart,
  FolderOpen,
  ShoppingBag,
  Warehouse,
  Boxes,
  Calculator,
  CircleDollarSign,
  BarChart3,
  FileSpreadsheet,
  Search,
  X,
  ArrowRight,
  Sparkles,
  Lock,
  Truck,
  Database as DatabaseIcon,
  KeyRound,
  ShieldCheck,
  TrendingUp,
  DollarSign,
  Percent,
  Unlock,
} from 'lucide-react';
import {
  Database,
  DEFAULT_ROLE_MENU_SECTIONS,
  DEFAULT_ROLE_SUB_ITEMS,
  DEFAULT_ROLE_FINANCIAL_PERMISSIONS,
} from '../../services/db';
import { Company, User, UserRole, SidebarMenuConfig } from '../../types';
import { ThermalPrinterSettings } from './ThermalPrinterSettings';
import { SupabaseSettings } from './SupabaseSettings';
import { ChangePasswordModal } from '../auth/ChangePasswordModal';
import { formatCurrency } from '../../services/pricingEngine';
import { toast } from '../../services/toast';

interface SettingsViewProps {
  initialTab?: 'empresas' | 'usuarios' | 'impressora' | 'preferencias' | 'menus' | 'supabase' | 'auditoria' | 'backup';
}

export interface MenuCatalogItem {
  id: string;
  label: string;
  description: string;
  iconName: string;
  isProtected?: boolean;
  subItems: {
    id: string;
    label: string;
    description: string;
    shortcut?: string;
  }[];
}

export const MENU_SECTIONS_CATALOG: MenuCatalogItem[] = [
  {
    id: 'inicio',
    label: 'Início',
    description: 'Painel inicial com indicadores de desempenho (KPIs), faturamento do dia e atalhos operacionais rápidos.',
    iconName: 'home',
    subItems: [
      { id: 'dashboard', label: 'Painel Geral & Métricas', description: 'Visão unificada das vendas, estoque e faturamento do dia', shortcut: 'F10' },
    ],
  },
  {
    id: 'vendas',
    label: 'Vendas',
    description: 'Frente de caixa balcão (PDV), pedidos de venda, orçamentos, vendas mobile e histórico comercial.',
    iconName: 'shopping-cart',
    subItems: [
      { id: 'pos', label: 'PDV Balcão', description: 'Ponto de venda ágil com teclado rápido e emissão térmica', shortcut: 'F2' },
      { id: 'orders', label: 'Pedido de Venda', description: 'Emissão de pedidos com desconto/acréscimo e finalização rápida', shortcut: 'F3' },
      { id: 'orders_quotes', label: 'Orçamentos', description: 'Propostas comerciais e cotações para clientes' },
      { id: 'external_sales', label: 'Vendas Mobile', description: 'Módulo mobile para vendedores em rota e representantes', shortcut: 'F7' },
      { id: 'orders_history', label: 'Histórico de Vendas', description: 'Consulta detalhada e reimpressão de vendas realizadas', shortcut: 'F9' },
    ],
  },
  {
    id: 'cadastros',
    label: 'Cadastros',
    description: 'Base de dados de produtos, insumos, clientes, fornecedores e locais físicos de armazenagem.',
    iconName: 'folder-open',
    subItems: [
      { id: 'products', label: 'Produtos & Insumos', description: 'Catálogo de itens para revenda, fabricados e insumos', shortcut: 'F4' },
      { id: 'customers', label: 'Clientes', description: 'Cadastro de clientes, crédito e histórico comercial', shortcut: 'F8' },
      { id: 'suppliers', label: 'Fornecedores', description: 'Cadastro de fornecedores de mercadorias e matéria-prima' },
      { id: 'stock_locations', label: 'Locais de Estoque', description: 'Gestão de almoxarifados, lojas e depósitos' },
    ],
  },
  {
    id: 'compras',
    label: 'Compras',
    description: 'Gestão de aquisições de insumos e mercadorias com geração de contas a pagar.',
    iconName: 'shopping-bag',
    subItems: [
      { id: 'purchases', label: 'Pedidos de Compra', description: 'Emissão de pedidos a fornecedores e recebimento com atualização de custos' },
    ],
  },
  {
    id: 'estoque',
    label: 'Estoque',
    description: 'Transferências entre depósitos, inventário rotativo ou geral e extrato completo de movimentações.',
    iconName: 'warehouse',
    subItems: [
      { id: 'stock_transfers', label: 'Transferência entre Locais', description: 'Movimentação física de saldos entre almoxarifados' },
      { id: 'inventory', label: 'Inventário & Ajustes', description: 'Contagem física e acerto de perdas ou sobras' },
      { id: 'stock_movements', label: 'Extrato de Estoque', description: 'Kardex e rastreamento completo de entradas e saídas' },
    ],
  },
  {
    id: 'producao',
    label: 'Produção',
    description: 'Composição de produtos (BOM), catálogo de componentes e ordens de fabricação multi-produtos.',
    iconName: 'boxes',
    subItems: [
      { id: 'bom_composition', label: 'Composição', description: 'Ficha técnica com insumos necessários para cada produto acabado' },
      { id: 'components_catalog', label: 'Componentes', description: 'Catálogo de insumos e matérias-primas vinculadas' },
      { id: 'production_orders', label: 'Ordens de Produção', description: 'Emissão de OPs multi-produtos com baixa automática de insumos' },
    ],
  },
  {
    id: 'expedicao',
    label: 'Expedição',
    description: 'Emissão e controle de romaneios de entrega, roteirização de cargas por rota/região e relatórios de entrega.',
    iconName: 'truck',
    subItems: [
      { id: 'delivery_manifests', label: 'Romaneio de Entrega', description: 'Criação e despacho de romaneios com pedidos da rota e manifesto de carga' },
      { id: 'delivery_routes', label: 'Rotas de Entrega', description: 'Gestão de rotas de entrega e associação em lote' },
      { id: 'delivery_market_areas', label: 'Praças Comerciais', description: 'Cadastro e gestão de Praças Comerciais e macrorregiões de atendimento' },
      { id: 'delivery_neighborhoods', label: 'Bairros', description: 'Cadastro de bairros vinculados a cidades e rotas padrão' },
      { id: 'delivery_cities', label: 'Cidades', description: 'Cadastro de municípios atendidos com vínculo a praça e rota' },
      { id: 'delivery_states', label: 'Estados (UF)', description: 'Cadastro e manutenção de Unidades Federativas atendidas' },
      { id: 'expedition_reports', label: 'Relatórios de Entrega', description: 'Lista consolidada de produtos e conferência de entregas separada por cliente' },
    ],
  },
  {
    id: 'precificacao',
    label: 'Precificação',
    description: 'Simulador de formação de preços, markup, margem de contribuição e reajuste em lote.',
    iconName: 'calculator',
    subItems: [
      { id: 'pricing_calculator', label: 'Formação de Preço', description: 'Simulador com cálculo de custo, impostos e lucro desejado' },
      { id: 'batch_pricing', label: 'Atualização em Lote', description: 'Reajuste percentual simultâneo por categoria ou tabela' },
    ],
  },
  {
    id: 'financeiro',
    label: 'Financeiro',
    description: 'Fluxo de caixa diário e projetado, contas a pagar, contas a receber, caixa PDV e contas bancárias.',
    iconName: 'circle-dollar-sign',
    subItems: [
      { id: 'cash_flow', label: 'Fluxo de Caixa', description: 'DRE e fluxo financeiro diário e consolidado', shortcut: 'F6' },
      { id: 'accounts_receivable', label: 'Contas a Receber', description: 'Controle de títulos a receber e cobranças' },
      { id: 'accounts_payable', label: 'Contas a Pagar', description: 'Controle de compromissos a pagar a fornecedores' },
      { id: 'cash_register', label: 'Controle de Caixa PDV', description: 'Abertura, sangrias, suprimentos e fechamento cego' },
      { id: 'payment_methods', label: 'Formas de Pagamento', description: 'Configuração de taxas de cartão, PIX e boletos' },
      { id: 'financial_accounts', label: 'Contas Bancárias & Caixa', description: 'Saldos bancários e caixas internos da empresa' },
      { id: 'payment_terms', label: 'Prazos de Pagamento', description: 'Condições de parcelamento comercial (ex: 30/60/90)' },
      { id: 'financial_reports', label: 'Relatórios Financeiros', description: 'Demonstrativos e relatórios de receitas e despesas' },
    ],
  },
  {
    id: 'relatorios',
    label: 'Relatórios',
    description: 'Relatórios analíticos consolidados de faturamento, curva ABC, produtos mais vendidos e margens.',
    iconName: 'bar-chart-3',
    subItems: [
      { id: 'reports', label: 'Relatórios Gerenciais', description: 'Gráficos e estatísticas consolidadas da operação' },
    ],
  },
  {
    id: 'importacao',
    label: 'Importação/Exportação',
    description: 'Exportação e carga de dados em massa através de planilhas eletrônicas Excel (.xlsx).',
    iconName: 'file-spreadsheet',
    subItems: [
      { id: 'excel_tools', label: 'Planilhas Excel (.xlsx)', description: 'Importação e exportação de cadastros de produtos e vendas' },
    ],
  },
  {
    id: 'configuracoes',
    label: 'Configurações',
    description: 'Gestão de filiais, usuários, controle de permissões, impressoras térmicas e menus do sistema.',
    iconName: 'settings',
    isProtected: true,
    subItems: [
      { id: 'settings', label: 'Empresas, Usuários & Auditoria', description: 'Cadastro de filiais e controle de perfis de operadores' },
      { id: 'settings_supabase', label: 'Banco Supabase (Nuvem)', description: 'Conexão PostgreSQL, sincronização e backup em nuvem' },
      { id: 'settings_menus', label: 'Menus do Sistema', description: 'Seleção de menus visíveis na barra lateral' },
      { id: 'settings_preferences', label: 'Preferências & Alertas', description: 'Alertas de contas vencidas e parâmetros do sistema' },
      { id: 'settings_printer', label: 'Configuração de Impressão', description: 'Configurações de impressão térmica 58mm/80mm e documentos em Folha A4' },
    ],
  },
];

export const SettingsView: React.FC<SettingsViewProps> = ({ initialTab = 'empresas' }) => {
  const [dbState, setDbState] = useState(Database.getState());
  const currentCompany = Database.getCurrentCompany();
  const currentUser = Database.getCurrentUser();
  const isAdmin = currentUser.login === 'admin';

  // Se o usuário não for o admin, as abas de Empresas, Usuários, Auditoria e Menus são bloqueadas
  const isRestrictedTab = (tab: string) =>
    tab === 'empresas' || tab === 'usuarios' || tab === 'auditoria' || tab === 'menus';

  const initialAllowedTab = !isAdmin && isRestrictedTab(initialTab) ? 'preferencias' : initialTab;

  const [activeTab, setActiveTab] = useState<'empresas' | 'usuarios' | 'impressora' | 'preferencias' | 'menus' | 'supabase' | 'auditoria' | 'backup'>(initialAllowedTab);

  useEffect(() => {
    if (!isAdmin && isRestrictedTab(initialTab)) {
      setActiveTab('preferencias');
    } else {
      setActiveTab(initialTab);
    }
  }, [initialTab, isAdmin]);

  useEffect(() => {
    return Database.subscribe(() => {
      setDbState({ ...Database.getState() });
      setMenuConfig(Database.getSidebarMenuConfig());
    });
  }, []);

  // Configurações do Menu Lateral
  const [menuConfig, setMenuConfig] = useState<SidebarMenuConfig>(() => Database.getSidebarMenuConfig());
  const [menuSearchTerm, setMenuSearchTerm] = useState<string>('');
  const [menuStatusFilter, setMenuStatusFilter] = useState<'todos' | 'visiveis' | 'ocultos'>('todos');

  const handleToggleSection = (sectionId: string) => {
    if (sectionId === 'configuracoes') {
      toast.warning('O menu Configurações não pode ser ocultado para garantir o acesso ao sistema.', 'Menu Protegido');
      return;
    }

    const isCurrentlyHidden = menuConfig.hiddenSections.includes(sectionId);
    let nextHiddenSections: string[];

    if (isCurrentlyHidden) {
      nextHiddenSections = menuConfig.hiddenSections.filter((id) => id !== sectionId);
    } else {
      nextHiddenSections = [...menuConfig.hiddenSections, sectionId];
    }

    const nextConfig: SidebarMenuConfig = {
      ...menuConfig,
      hiddenSections: nextHiddenSections,
    };

    setMenuConfig(nextConfig);
    Database.setSidebarMenuConfig(nextConfig);
    toast.success(
      isCurrentlyHidden
        ? `Menu "${MENU_SECTIONS_CATALOG.find((s) => s.id === sectionId)?.label}" agora está VISÍVEL na barra lateral.`
        : `Menu "${MENU_SECTIONS_CATALOG.find((s) => s.id === sectionId)?.label}" foi OCULTADO da barra lateral.`,
      'Menu Lateral Atualizado'
    );
  };

  const handleToggleSubItem = (subItemId: string) => {
    const isCurrentlyHidden = menuConfig.hiddenSubItems.includes(subItemId);
    let nextHiddenSubItems: string[];

    if (isCurrentlyHidden) {
      nextHiddenSubItems = menuConfig.hiddenSubItems.filter((id) => id !== subItemId);
    } else {
      nextHiddenSubItems = [...menuConfig.hiddenSubItems, subItemId];
    }

    const nextConfig: SidebarMenuConfig = {
      ...menuConfig,
      hiddenSubItems: nextHiddenSubItems,
    };

    setMenuConfig(nextConfig);
    Database.setSidebarMenuConfig(nextConfig);
  };

  const handleToggleAllSubItemsInSection = (sectionId: string, showAll: boolean) => {
    const section = MENU_SECTIONS_CATALOG.find((s) => s.id === sectionId);
    if (!section || !section.subItems) return;

    const subItemIds = section.subItems.map((s) => s.id);
    let nextHiddenSubItems = [...menuConfig.hiddenSubItems];

    if (showAll) {
      nextHiddenSubItems = nextHiddenSubItems.filter((id) => !subItemIds.includes(id));
    } else {
      subItemIds.forEach((id) => {
        if (!nextHiddenSubItems.includes(id)) {
          nextHiddenSubItems.push(id);
        }
      });
    }

    const nextConfig: SidebarMenuConfig = {
      ...menuConfig,
      hiddenSubItems: nextHiddenSubItems,
    };

    setMenuConfig(nextConfig);
    Database.setSidebarMenuConfig(nextConfig);
    toast.info(
      showAll
        ? `Todos os subitens de "${section.label}" foram marcados como visíveis.`
        : `Todos os subitens de "${section.label}" foram ocultados.`,
      'Subitens Atualizados'
    );
  };

  const handleShowAllMenus = () => {
    const nextConfig: SidebarMenuConfig = {
      hiddenSections: [],
      hiddenSubItems: [],
    };
    setMenuConfig(nextConfig);
    Database.setSidebarMenuConfig(nextConfig);
    toast.success('Todos os menus e submenus agora estão visíveis no menu lateral.', 'Todos os Menus Visíveis');
  };

  const handleResetMenusDefault = () => {
    Database.resetSidebarMenuConfig();
    const def = Database.getSidebarMenuConfig();
    setMenuConfig(def);
    toast.info('Configuração do menu lateral restaurada para o padrão.', 'Padrão Restaurado');
  };

  const renderMenuIcon = (iconName: string, size = 18) => {
    switch (iconName) {
      case 'home': return <Home size={size} />;
      case 'shopping-cart': return <ShoppingCart size={size} />;
      case 'folder-open': return <FolderOpen size={size} />;
      case 'shopping-bag': return <ShoppingBag size={size} />;
      case 'warehouse': return <Warehouse size={size} />;
      case 'boxes': return <Boxes size={size} />;
      case 'calculator': return <Calculator size={size} />;
      case 'circle-dollar-sign': return <CircleDollarSign size={size} />;
      case 'bar-chart-3': return <BarChart3 size={size} />;
      case 'file-spreadsheet': return <FileSpreadsheet size={size} />;
      case 'truck': return <Truck size={size} />;
      case 'settings': return <Settings size={size} />;
      default: return <LayoutGrid size={size} />;
    }
  };

  // Backup / Restauração
  const [jsonBackupText, setJsonBackupText] = useState('');

  // Modal Empresa
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [compName, setCompName] = useState('');
  const [compTradeName, setCompTradeName] = useState('');
  const [compCnpj, setCompCnpj] = useState('');
  const [compType, setCompType] = useState<'matriz' | 'filial'>('filial');
  const [compPhone, setCompPhone] = useState('');
  const [compCity, setCompCity] = useState('');
  const [compState, setCompState] = useState('SP');

  // Modal Usuário
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [passwordChangeUser, setPasswordChangeUser] = useState<User | null>(null);
  const [userName, setUserName] = useState('');
  const [userLogin, setUserLogin] = useState('');
  const [userRole, setUserRole] = useState<UserRole>('balconista');
  const [userMaxDiscount, setUserMaxDiscount] = useState('10');
  const [prefSaveMsg, setPrefSaveMsg] = useState<string | null>(null);

  // Modal de Configuração de Menus, Submenus & Indicadores da Empresa (Exclusivo para o @admin)
  const [userConfiguringPermissions, setUserConfiguringPermissions] = useState<User | null>(null);
  const [permModalTab, setPermModalTab] = useState<'numeros' | 'menus'>('numeros');
  const [permMenuSearch, setPermMenuSearch] = useState('');
  const [tempFinPerms, setTempFinPerms] = useState({
    canViewGrossProfit: true,
    canViewNetProfit: false,
    canViewTotalRevenue: true,
    canViewProfitMargin: true,
    canViewProductCosts: true,
    canViewCashBalances: true,
  });
  const [tempAllowedSections, setTempAllowedSections] = useState<string[]>([]);
  const [tempAllowedSubItems, setTempAllowedSubItems] = useState<string[]>([]);

  const handleOpenPermissionsModal = (targetUser: User) => {
    if (!isAdmin) {
      toast.error(
        'Apenas o usuário "admin" tem autorização para definir menus, submenus e números da empresa.',
        'Acesso Restrito ao Administrador'
      );
      return;
    }
    setUserConfiguringPermissions(targetUser);
    setPermModalTab('numeros');
    setPermMenuSearch('');

    const perms = targetUser.permissions;
    const role = targetUser.role || 'balconista';
    const finDefaults = DEFAULT_ROLE_FINANCIAL_PERMISSIONS[role] || DEFAULT_ROLE_FINANCIAL_PERMISSIONS.balconista;
    const menuDefaults = DEFAULT_ROLE_MENU_SECTIONS[role] || DEFAULT_ROLE_MENU_SECTIONS.balconista;
    const subDefaults = DEFAULT_ROLE_SUB_ITEMS[role] || DEFAULT_ROLE_SUB_ITEMS.balconista;

    setTempFinPerms({
      canViewGrossProfit: perms.canViewGrossProfit !== undefined ? perms.canViewGrossProfit : finDefaults.canViewGrossProfit,
      canViewNetProfit: perms.canViewNetProfit !== undefined ? perms.canViewNetProfit : finDefaults.canViewNetProfit,
      canViewTotalRevenue: perms.canViewTotalRevenue !== undefined ? perms.canViewTotalRevenue : finDefaults.canViewTotalRevenue,
      canViewProfitMargin: perms.canViewProfitMargin !== undefined ? perms.canViewProfitMargin : finDefaults.canViewProfitMargin,
      canViewProductCosts: perms.canViewProductCosts !== undefined ? perms.canViewProductCosts : (perms.canViewCosts ?? finDefaults.canViewProductCosts),
      canViewCashBalances: perms.canViewCashBalances !== undefined ? perms.canViewCashBalances : finDefaults.canViewCashBalances,
    });

    setTempAllowedSections(
      perms.allowedMenuSections ? [...perms.allowedMenuSections] : (targetUser.login === 'admin' ? MENU_SECTIONS_CATALOG.map((s) => s.id) : [...menuDefaults])
    );
    setTempAllowedSubItems(
      perms.allowedSubItems ? [...perms.allowedSubItems] : (targetUser.login === 'admin' ? MENU_SECTIONS_CATALOG.flatMap((s) => s.subItems?.map((sub) => sub.id) || []) : [...subDefaults])
    );
  };

  const handleSavePermissionsConfig = () => {
    if (!isAdmin || !userConfiguringPermissions) {
      toast.error('Apenas o usuário "admin" pode salvar permissões.');
      return;
    }

    const res = Database.updateUserPermissions(
      userConfiguringPermissions.id,
      {
        ...tempFinPerms,
        canViewCosts: tempFinPerms.canViewProductCosts,
        allowedMenuSections: tempAllowedSections,
        allowedSubItems: tempAllowedSubItems,
      },
      currentUser.id
    );

    if (res.success) {
      toast.success(
        `Permissões de menus e números da empresa salvas para ${userConfiguringPermissions.name}!`,
        'Permissões Atualizadas'
      );
      setUserConfiguringPermissions(null);
    } else {
      toast.error(res.error || 'Erro ao salvar permissões.');
    }
  };

  const handleSelectAllMenus = () => {
    setTempAllowedSections(MENU_SECTIONS_CATALOG.map((s) => s.id));
    setTempAllowedSubItems(MENU_SECTIONS_CATALOG.flatMap((s) => s.subItems?.map((sub) => sub.id) || []));
  };

  const handleDeselectAllMenus = () => {
    setTempAllowedSections(['inicio']);
    setTempAllowedSubItems(['dashboard']);
  };

  const handleResetToRoleDefaults = () => {
    if (!userConfiguringPermissions) return;
    const role = userConfiguringPermissions.role || 'balconista';
    const finDef = DEFAULT_ROLE_FINANCIAL_PERMISSIONS[role] || DEFAULT_ROLE_FINANCIAL_PERMISSIONS.balconista;
    const menuDef = DEFAULT_ROLE_MENU_SECTIONS[role] || DEFAULT_ROLE_MENU_SECTIONS.balconista;
    const subDef = DEFAULT_ROLE_SUB_ITEMS[role] || DEFAULT_ROLE_SUB_ITEMS.balconista;

    setTempFinPerms({ ...finDef });
    setTempAllowedSections([...menuDef]);
    setTempAllowedSubItems([...subDef]);
    toast.info(`Configurações redefinidas para o padrão do perfil "${role}".`);
  };

  const handleTogglePermSection = (sectionId: string) => {
    const isCurrentlyAllowed = tempAllowedSections.includes(sectionId);
    const section = MENU_SECTIONS_CATALOG.find((s) => s.id === sectionId);
    const sectionSubIds = section?.subItems?.map((s) => s.id) || [];

    if (isCurrentlyAllowed) {
      setTempAllowedSections((prev) => prev.filter((id) => id !== sectionId));
      setTempAllowedSubItems((prev) => prev.filter((id) => !sectionSubIds.includes(id)));
    } else {
      setTempAllowedSections((prev) => [...prev, sectionId]);
      setTempAllowedSubItems((prev) => Array.from(new Set([...prev, ...sectionSubIds])));
    }
  };

  const handleTogglePermSubItem = (sectionId: string, subItemId: string) => {
    const isCurrentlyAllowed = tempAllowedSubItems.includes(subItemId);
    if (isCurrentlyAllowed) {
      const nextSubs = tempAllowedSubItems.filter((id) => id !== subItemId);
      setTempAllowedSubItems(nextSubs);
      const section = MENU_SECTIONS_CATALOG.find((s) => s.id === sectionId);
      const remainingSubs = section?.subItems?.filter((s) => nextSubs.includes(s.id)) || [];
      if (remainingSubs.length === 0) {
        setTempAllowedSections((prev) => prev.filter((id) => id !== sectionId));
      }
    } else {
      setTempAllowedSubItems((prev) => [...prev, subItemId]);
      if (!tempAllowedSections.includes(sectionId)) {
        setTempAllowedSections((prev) => [...prev, sectionId]);
      }
    }
  };

  // Salvar Empresa
  const handleSaveCompany = (e: React.FormEvent) => {
    e.preventDefault();
    if (!compName.trim() || !compCnpj.trim()) {
      alert('Nome e CNPJ da empresa são obrigatórios.');
      return;
    }

    const state = Database.getState();
    if (editingCompany) {
      state.companies = state.companies.map((c) =>
        c.id === editingCompany.id
          ? {
              ...c,
              name: compName.trim(),
              tradeName: compTradeName.trim(),
              cnpjCpf: compCnpj.trim(),
              type: compType,
              phone: compPhone.trim(),
              address: { ...c.address, city: compCity.trim(), state: compState },
            }
          : c
      );
      Database.addAuditLog('ATUALIZAR_EMPRESA', 'CONFIGURACOES', editingCompany.id, `Empresa ${compName} atualizada`);
    } else {
      const newComp: Company = {
        id: 'comp-' + Date.now(),
        name: compName.trim(),
        tradeName: compTradeName.trim() || compName.trim(),
        cnpjCpf: compCnpj.trim(),
        type: compType,
        phone: compPhone.trim(),
        email: 'contato@empresa.com.br',
        address: {
          street: 'Avenida Principal',
          number: '100',
          neighborhood: 'Centro',
          city: compCity.trim() || 'São Paulo',
          state: compState,
          zipCode: '01000-000',
        },
        status: 'ativo',
      };
      state.companies.push(newComp);
      Database.addAuditLog('CRIAR_EMPRESA', 'CONFIGURACOES', newComp.id, `Filial/Empresa ${newComp.name} cadastrada`);
    }

    Database.persist();
    setIsCompanyModalOpen(false);
  };

  // Salvar Usuário
  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim() || !userLogin.trim()) {
      alert('Nome e Login são obrigatórios.');
      return;
    }

    const state = Database.getState();
    const maxDisc = parseFloat(userMaxDiscount) || 5;

    const permissions = {
      admin: {
        canViewCosts: true,
        canEditProducts: true,
        canDeleteRecords: true,
        canCancelSales: true,
        canAuthorizeDiscount: true,
        maxDiscountPercent: 30,
        canAccessFinancial: true,
        canAccessProduction: true,
        canAccessPurchases: true,
        canManageUsers: true,
        canAdjustStock: true,
        canCloseCashRegister: true,
      },
      gerente: {
        canViewCosts: true,
        canEditProducts: true,
        canDeleteRecords: false,
        canCancelSales: true,
        canAuthorizeDiscount: true,
        maxDiscountPercent: 20,
        canAccessFinancial: true,
        canAccessProduction: true,
        canAccessPurchases: true,
        canManageUsers: false,
        canAdjustStock: true,
        canCloseCashRegister: true,
      },
      balconista: {
        canViewCosts: false,
        canEditProducts: false,
        canDeleteRecords: false,
        canCancelSales: false,
        canAuthorizeDiscount: false,
        maxDiscountPercent: maxDisc,
        canAccessFinancial: false,
        canAccessProduction: false,
        canAccessPurchases: false,
        canManageUsers: false,
        canAdjustStock: false,
        canCloseCashRegister: true,
      },
      vendedor_externo: {
        canViewCosts: false,
        canEditProducts: false,
        canDeleteRecords: false,
        canCancelSales: false,
        canAuthorizeDiscount: false,
        maxDiscountPercent: maxDisc,
        canAccessFinancial: false,
        canAccessProduction: false,
        canAccessPurchases: false,
        canManageUsers: false,
        canAdjustStock: false,
        canCloseCashRegister: false,
      },
      financeiro: {
        canViewCosts: true,
        canEditProducts: false,
        canDeleteRecords: false,
        canCancelSales: true,
        canAuthorizeDiscount: true,
        maxDiscountPercent: 15,
        canAccessFinancial: true,
        canAccessProduction: false,
        canAccessPurchases: true,
        canManageUsers: false,
        canAdjustStock: false,
        canCloseCashRegister: true,
      },
    }[userRole];

    const isBalconista = userRole === 'balconista';
    const subDefaults = DEFAULT_ROLE_SUB_ITEMS[userRole] || DEFAULT_ROLE_SUB_ITEMS.balconista;
    const menuDefaults = DEFAULT_ROLE_MENU_SECTIONS[userRole] || DEFAULT_ROLE_MENU_SECTIONS.balconista;
    const finDefaults = DEFAULT_ROLE_FINANCIAL_PERMISSIONS[userRole] || DEFAULT_ROLE_FINANCIAL_PERMISSIONS.balconista;

    if (editingUser) {
      state.users = state.users.map((u) => {
        if (u.id !== editingUser.id) return u;
        const currentAllowedSubs = u.permissions.allowedSubItems || subDefaults;
        const sanitizedSubs = isBalconista
          ? currentAllowedSubs.filter((item) => item !== 'dashboard')
          : currentAllowedSubs;

        return {
          ...u,
          name: userName.trim(),
          login: userLogin.trim(),
          role: userRole,
          password: u.password || (u.login === 'admin' ? 'admin' : '1234'),
          permissions: {
            ...permissions,
            maxDiscountPercent: maxDisc,
            canViewGrossProfit: isBalconista ? false : (u.permissions.canViewGrossProfit ?? finDefaults.canViewGrossProfit),
            canViewNetProfit: isBalconista ? false : (u.permissions.canViewNetProfit ?? finDefaults.canViewNetProfit),
            canViewTotalRevenue: isBalconista ? false : (u.permissions.canViewTotalRevenue ?? finDefaults.canViewTotalRevenue),
            canViewProfitMargin: isBalconista ? false : (u.permissions.canViewProfitMargin ?? finDefaults.canViewProfitMargin),
            canViewProductCosts: isBalconista ? false : (u.permissions.canViewProductCosts ?? finDefaults.canViewProductCosts),
            canViewCashBalances: isBalconista ? false : (u.permissions.canViewCashBalances ?? finDefaults.canViewCashBalances),
            allowedMenuSections: u.permissions.allowedMenuSections || [...menuDefaults],
            allowedSubItems: sanitizedSubs,
          },
        };
      });
      Database.addAuditLog('ATUALIZAR_USUARIO', 'CONFIGURACOES', editingUser.id, `Usuário ${userName} atualizado`);
    } else {
      const newUser: User = {
        id: 'usr-' + Date.now(),
        name: userName.trim(),
        login: userLogin.trim(),
        password: userLogin.trim().toLowerCase() === 'admin' ? 'admin' : '1234',
        role: userRole,
        companyId: currentCompany.id,
        status: 'ativo',
        permissions: {
          ...permissions,
          maxDiscountPercent: maxDisc,
          canViewGrossProfit: isBalconista ? false : finDefaults.canViewGrossProfit,
          canViewNetProfit: isBalconista ? false : finDefaults.canViewNetProfit,
          canViewTotalRevenue: isBalconista ? false : finDefaults.canViewTotalRevenue,
          canViewProfitMargin: isBalconista ? false : finDefaults.canViewProfitMargin,
          canViewProductCosts: isBalconista ? false : finDefaults.canViewProductCosts,
          canViewCashBalances: isBalconista ? false : finDefaults.canViewCashBalances,
          allowedMenuSections: [...menuDefaults],
          allowedSubItems: isBalconista ? subDefaults.filter((s) => s !== 'dashboard') : [...subDefaults],
        },
      };
      state.users.push(newUser);
      Database.addAuditLog('CRIAR_USUARIO', 'CONFIGURACOES', newUser.id, `Usuário ${newUser.name} (${userRole}) cadastrado com senha padrão`);
    }

    Database.persist();
    setIsUserModalOpen(false);
  };

  // Download do Backup JSON do Banco
  const handleExportBackup = () => {
    const json = Database.exportDatabaseJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GestaoFacil_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Restaurar Backup JSON
  const handleRestoreBackup = () => {
    if (!jsonBackupText.trim()) {
      alert('Cole o JSON de backup na caixa de texto antes de restaurar.');
      return;
    }

    const ok = window.confirm(
      'ATENÇÃO: A restauração de backup irá substituir todos os dados atuais pelos dados do arquivo. Deseja prosseguir?'
    );
    if (!ok) return;

    const success = Database.importDatabaseJSON(jsonBackupText);
    if (success) {
      alert('Backup restaurado com sucesso! A página será atualizada com os novos dados.');
      window.location.reload();
    } else {
      alert('Falha ao restaurar: O formato do JSON informado é inválido.');
    }
  };

  // Reset de Fábrica
  const handleFactoryReset = () => {
    const confirm = window.prompt(
      'ATENÇÃO: Isso irá apagar todas as vendas e alterações e redefinir o sistema com as sementes de demonstração de fábrica.\nDigite "RESET" para confirmar:'
    );
    if (confirm === 'RESET') {
      Database.resetToFactoryDefaults();
      alert('Sistema resetado para os valores padrão com sucesso!');
      window.location.reload();
    }
  };

  return (
    <div className="space-y-4">
      {/* Topo / Sub-Abas */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Settings className="text-blue-600" size={20} />
            <span>Configurações, Empresas, Usuários & Auditoria</span>
          </h2>
          <p className="text-xs text-slate-500">
            Administração de filiais, perfis de acesso, políticas de segurança, log de auditoria e backup do sistema.
          </p>
        </div>

        <div className="flex flex-wrap bg-slate-100 p-1 rounded-xl text-xs font-bold gap-1">
          {isAdmin && (
            <>
              <button
                onClick={() => setActiveTab('empresas')}
                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                  activeTab === 'empresas' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Building2 size={14} />
                <span>Matriz / Filiais</span>
              </button>
              <button
                onClick={() => setActiveTab('usuarios')}
                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                  activeTab === 'usuarios' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users size={14} />
                <span>Usuários & Perfis</span>
              </button>
              <button
                onClick={() => setActiveTab('menus')}
                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                  activeTab === 'menus' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutGrid size={14} />
                <span>Menus do Sistema</span>
              </button>
            </>
          )}
          <button
            onClick={() => setActiveTab('impressora')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'impressora' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Printer size={14} />
            <span>Configuração de Impressão</span>
          </button>
          <button
            onClick={() => setActiveTab('preferencias')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'preferencias' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sliders size={14} />
            <span>Preferências & Alertas</span>
          </button>
          {isAdmin && (
            <button
              onClick={() => setActiveTab('auditoria')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                activeTab === 'auditoria' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History size={14} />
              <span>Logs de Auditoria</span>
            </button>
          )}
          <button
            onClick={() => setActiveTab('supabase')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'supabase' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <DatabaseIcon size={14} className="text-emerald-600" />
            <span>Banco Supabase</span>
          </button>
          <button
            onClick={() => setActiveTab('backup')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'backup' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Download size={14} />
            <span>Backup & Restauração</span>
          </button>
        </div>
      </div>

      {/* ABA 1: EMPRESAS (MATRIZ E FILIAIS) */}
      {activeTab === 'empresas' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-sm text-slate-800">Empresas e Filiais Cadastradas</h3>
              <p className="text-xs text-slate-500">
                O sistema permite operar com matriz e filiais mantendo caixas e estoques identificados por empresa.
              </p>
            </div>
            <button
              onClick={() => {
                setEditingCompany(null);
                setCompName('');
                setCompTradeName('');
                setCompCnpj('');
                setCompType('filial');
                setCompPhone('');
                setCompCity('São Paulo');
                setCompState('SP');
                setIsCompanyModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-xs"
            >
              <Plus size={14} />
              <span>Nova Filial</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {dbState.companies.map((c) => (
              <div key={c.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-bold text-sm text-slate-900">{c.tradeName || c.name}</span>
                    <span className={`ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      c.type === 'matriz' ? 'bg-blue-900 text-blue-100' : 'bg-slate-200 text-slate-800'
                    }`}>
                      {c.type}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setEditingCompany(c);
                      setCompName(c.name);
                      setCompTradeName(c.tradeName);
                      setCompCnpj(c.cnpjCpf);
                      setCompType(c.type);
                      setCompPhone(c.phone);
                      setCompCity(c.address.city);
                      setCompState(c.address.state);
                      setIsCompanyModalOpen(true);
                    }}
                    className="p-1 hover:bg-slate-200 rounded text-slate-500"
                  >
                    <Edit2 size={14} />
                  </button>
                </div>

                <div className="text-xs text-slate-600 space-y-0.5">
                  <div>Razão Social: <strong>{c.name}</strong></div>
                  <div>CNPJ: {c.cnpjCpf}</div>
                  <div>Telefone: {c.phone}</div>
                  <div>Cidade: {c.address.city}/{c.address.state}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ABA 2: USUÁRIOS E PERFIS */}
      {activeTab === 'usuarios' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-sm text-slate-800">Usuários e Perfis de Acesso</h3>
              <p className="text-xs text-slate-500">
                Gerencie permissões por função: Administrador, Gerente, Balconista, Vendedor Externo e Financeiro.
              </p>
            </div>
            <button
              onClick={() => {
                setEditingUser(null);
                setUserName('');
                setUserLogin('');
                setUserRole('balconista');
                setUserMaxDiscount('10');
                setIsUserModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-xs"
            >
              <Plus size={14} />
              <span>Novo Usuário</span>
            </button>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {dbState.users.map((u) => (
              <div key={u.id} className="py-3 flex items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-slate-800 text-sm flex items-center gap-2">
                    <span>{u.name}</span>
                    <span className="text-[10px] font-bold px-2 py-0.2 rounded-full uppercase bg-slate-100 text-slate-700">
                      {u.role}
                    </span>
                    {u.login === 'admin' ? (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-300">
                        Admin Master
                      </span>
                    ) : null}
                  </div>
                  <div className="text-slate-500 text-[11px] mt-0.5 flex flex-wrap items-center gap-2">
                    <span>Login: <strong className="font-mono text-slate-800">@{u.login}</strong></span>
                    <span>•</span>
                    <span>Desconto Máx: <strong>{u.permissions.maxDiscountPercent}%</strong></span>
                    <span>•</span>
                    {u.login === 'admin' ? (
                      <span className="font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        Senha: <strong>{u.password === 'admin' ? 'Padrão (admin)' : 'Alterada'}</strong> (Somente @admin pode alterar)
                      </span>
                    ) : (
                      <span className="font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        Senha: <strong>{u.password === '1234' ? 'Padrão (1234)' : 'Personalizada'}</strong>
                      </span>
                    )}
                  </div>

                  <div className="text-slate-500 text-[11px] mt-1.5 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                      <LayoutGrid size={12} className="text-blue-600" />
                      <span>
                        {u.login === 'admin'
                          ? 'Menus: Todos (Acesso Total)'
                          : `${u.permissions.allowedMenuSections ? u.permissions.allowedMenuSections.length : 'Padrão'} Menus • ${u.permissions.allowedSubItems ? u.permissions.allowedSubItems.length : 'Padrão'} Submenus`}
                      </span>
                    </span>
                    <span className={`inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded-md border ${
                      u.login === 'admin' || u.permissions.canViewGrossProfit || u.permissions.canViewNetProfit
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}>
                      <TrendingUp size={12} className={u.login === 'admin' || u.permissions.canViewGrossProfit || u.permissions.canViewNetProfit ? 'text-emerald-600' : 'text-slate-400'} />
                      <span>
                        {u.login === 'admin'
                          ? 'Números da Empresa: Acesso Total'
                          : u.permissions.canViewGrossProfit && u.permissions.canViewNetProfit
                          ? 'Lucro Bruto & Líquido'
                          : u.permissions.canViewGrossProfit
                          ? 'Lucro Bruto (Líquido Oculto)'
                          : u.permissions.canViewNetProfit
                          ? 'Lucro Líquido (Bruto Oculto)'
                          : 'Lucros & Números da Empresa: Ocultos'}
                      </span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap justify-end">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    u.status === 'ativo' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {u.status}
                  </span>

                  {/* Botão Configuração de Menus, Submenus & Números da Empresa (Exclusivo do @admin) */}
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => handleOpenPermissionsModal(u)}
                      className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-colors cursor-pointer shadow-2xs"
                      title={
                        u.login === 'admin'
                          ? 'Visualizar configuração de menus e números da empresa do Administrador Master'
                          : `Definir quais menus, submenus e números da empresa ${u.name} pode visualizar e utilizar`
                      }
                    >
                      <ShieldCheck size={13} className="text-indigo-600" />
                      <span>Menus & Números</span>
                    </button>
                  )}

                  {/* Botão Alterar Senha */}
                  <button
                    type="button"
                    onClick={() => setPasswordChangeUser(u)}
                    className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors cursor-pointer"
                    title={u.login === 'admin' ? 'Alterar senha do administrador (apenas o próprio admin pode alterar)' : `Alterar senha do usuário ${u.name}`}
                  >
                    <KeyRound size={13} />
                    <span>{u.login === 'admin' ? 'Alterar Senha do Admin' : 'Alterar Senha'}</span>
                  </button>

                  {/* Botão Redefinir para 1234 (Apenas para não-admin) */}
                  {u.login !== 'admin' && (
                    <button
                      type="button"
                      onClick={() => {
                        const res = Database.resetPasswordToDefault(u.id, currentUser.id);
                        if (res.success) {
                          toast.success(`Senha do usuário ${u.name} redefinida para a senha padrão "1234"!`);
                        } else {
                          toast.error(res.error || 'Erro ao redefinir senha.');
                        }
                      }}
                      className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                      title="Redefinir senha deste usuário para o padrão 1234"
                    >
                      <RotateCcw size={12} />
                      <span className="hidden sm:inline">Resetar (1234)</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setEditingUser(u);
                      setUserName(u.name);
                      setUserLogin(u.login);
                      setUserRole(u.role);
                      setUserMaxDiscount(String(u.permissions.maxDiscountPercent));
                      setIsUserModalOpen(true);
                    }}
                    className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-md cursor-pointer"
                    title="Editar dados cadastrais do usuário"
                  >
                    <Edit2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ABA 3: LOGS DE AUDITORIA */}
      {activeTab === 'auditoria' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="pb-2 border-b border-slate-100">
            <h3 className="font-bold text-sm text-slate-800">Trilha de Auditoria do Sistema</h3>
            <p className="text-xs text-slate-500">
              Histórico rastreável de todas as ações sensíveis: vendas, cancelamentos, abertura/fechamento de caixa, compras e precificação.
            </p>
          </div>

          <div className="divide-y divide-slate-100 text-xs max-h-96 overflow-y-auto">
            {dbState.auditLogs.map((log) => (
              <div key={log.id} className="py-2.5">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="font-mono font-bold text-blue-700">{log.action}</span>
                  <span className="text-slate-400">{new Date(log.timestamp).toLocaleString('pt-BR')}</span>
                </div>
                <div className="font-medium text-slate-800 mt-0.5">{log.details}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Usuário: {log.userName} • Módulo: {log.module}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ABA 4: BACKUP E RESTAURAÇÃO */}
      {activeTab === 'backup' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="pb-2 border-b border-slate-100">
            <h3 className="font-bold text-sm text-slate-800">Backup, Exportação e Restauração Segura</h3>
            <p className="text-xs text-slate-500">
              Gere cópias de segurança de todo o banco de dados em formato JSON, restaure backups ou redefina para os dados de fábrica.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <h4 className="font-bold text-xs text-slate-800 uppercase">Exportar Cópia de Segurança</h4>
              <p className="text-xs text-slate-500">
                Baixa um arquivo .json com todas as empresas, produtos, compras, estoques, clientes e financeiro.
              </p>
              <button
                onClick={handleExportBackup}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-lg shadow-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <Download size={15} />
                <span>Baixar Backup Completo (.json)</span>
              </button>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <h4 className="font-bold text-xs text-slate-800 uppercase">Redefinir Dados de Fábrica</h4>
              <p className="text-xs text-slate-500">
                Restaura o estado inicial do sistema com os dados de demonstração da empresa "Química & Limpeza Imperial".
              </p>
              <button
                onClick={handleFactoryReset}
                className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs py-2.5 rounded-lg shadow-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <RotateCcw size={15} />
                <span>Restaurar Padrões de Fábrica</span>
              </button>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-700">
              Restaurar Dados a Partir de JSON:
            </label>
            <textarea
              rows={4}
              value={jsonBackupText}
              onChange={(e) => setJsonBackupText(e.target.value)}
              placeholder="Cole aqui o conteúdo de um backup .json para restaurar..."
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
            />
            <div className="flex justify-end">
              <button
                onClick={handleRestoreBackup}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-xs"
              >
                Restaurar Backup do JSON
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ABA: BANCO DE DADOS SUPABASE POSTGRESQL */}
      {activeTab === 'supabase' && <SupabaseSettings />}

      {/* ABA: CONFIGURAÇÃO DE MENUS DO SISTEMA (MENU LATERAL) */}
      {activeTab === 'menus' && (() => {
        const totalSections = MENU_SECTIONS_CATALOG.length;
        const visibleSectionsCount = MENU_SECTIONS_CATALOG.filter(
          (s) => s.id === 'configuracoes' || !menuConfig.hiddenSections.includes(s.id)
        ).length;

        const totalSubItems = MENU_SECTIONS_CATALOG.reduce(
          (acc, s) => acc + (s.subItems ? s.subItems.length : 0),
          0
        );
        const visibleSubItemsCount = MENU_SECTIONS_CATALOG.reduce((acc, s) => {
          if (!s.subItems) return acc;
          const vis = s.subItems.filter((sub) => !menuConfig.hiddenSubItems.includes(sub.id)).length;
          return acc + vis;
        }, 0);

        const filteredCatalogSections = MENU_SECTIONS_CATALOG.filter((sec) => {
          const isSecHidden = sec.id !== 'configuracoes' && menuConfig.hiddenSections.includes(sec.id);

          if (menuStatusFilter === 'visiveis' && isSecHidden) return false;
          if (menuStatusFilter === 'ocultos' && !isSecHidden) return false;

          if (!menuSearchTerm.trim()) return true;
          const term = menuSearchTerm.toLowerCase();
          const matchSection = sec.label.toLowerCase().includes(term) || sec.description.toLowerCase().includes(term);
          const matchSub = sec.subItems?.some(
            (sub) => sub.label.toLowerCase().includes(term) || sub.description.toLowerCase().includes(term)
          );
          return matchSection || matchSub;
        });

        return (
          <div className="space-y-4">
            {/* Top Card: Cabeçalho & Ações Globais */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-100 gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                    <LayoutGrid size={22} />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
                      <span>Personalização dos Menus da Barra Lateral</span>
                      <span className="text-[11px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
                        {visibleSectionsCount} de {totalSections} menus ativos
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 max-w-2xl mt-0.5">
                      Selecione quais menus principais e submódulos devem ser exibidos no menu lateral esquerdo. 
                      Oculte os recursos que sua empresa não utiliza para simplificar a navegação da equipe.
                    </p>
                  </div>
                </div>

                {/* Botões de Ação Rápida */}
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <button
                    type="button"
                    onClick={handleShowAllMenus}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                    title="Tornar todos os menus e submenus visíveis na barra lateral"
                  >
                    <Eye size={14} />
                    <span>Mostrar Todos</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleResetMenusDefault}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-colors cursor-pointer"
                    title="Restaurar a configuração padrão do menu"
                  >
                    <RotateCcw size={14} />
                    <span>Restaurar Padrão</span>
                  </button>
                </div>
              </div>

              {/* Barra de Filtros e Busca Rápida */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                <div className="sm:col-span-7 relative flex items-center">
                  <Search size={15} className="absolute left-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar menu ou submódulo (ex: Produção, Vendas, Estoque)..."
                    value={menuSearchTerm}
                    onChange={(e) => setMenuSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                  />
                  {menuSearchTerm && (
                    <button
                      type="button"
                      onClick={() => setMenuSearchTerm('')}
                      className="absolute right-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                <div className="sm:col-span-5 flex items-center justify-end gap-1.5">
                  <span className="text-[11px] font-bold text-slate-500 mr-1">Filtrar:</span>
                  {(['todos', 'visiveis', 'ocultos'] as const).map((filterOpt) => (
                    <button
                      key={filterOpt}
                      type="button"
                      onClick={() => setMenuStatusFilter(filterOpt)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer capitalize ${
                        menuStatusFilter === filterOpt
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                      }`}
                    >
                      {filterOpt === 'todos' ? 'Todos' : filterOpt === 'visiveis' ? 'Visíveis' : 'Ocultos'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Indicadores de Resumo */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 uppercase">Menus Principais</span>
                    <p className="text-sm font-extrabold text-slate-800">
                      {visibleSectionsCount} de {totalSections} visíveis
                    </p>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs">
                    {Math.round((visibleSectionsCount / totalSections) * 100)}%
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 uppercase">Submódulos / Telas</span>
                    <p className="text-sm font-extrabold text-slate-800">
                      {visibleSubItemsCount} de {totalSubItems} ativos
                    </p>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-xs">
                    {Math.round((visibleSubItemsCount / totalSubItems) * 100)}%
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 uppercase">Status da Barra Lateral</span>
                    <p className="text-sm font-extrabold text-emerald-700 flex items-center gap-1.5">
                      <CheckCircle2 size={14} />
                      <span>Atualização em Tempo Real</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Lista dos Menus */}
            <div className="space-y-3.5">
              {filteredCatalogSections.length === 0 ? (
                <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-2">
                  <LayoutGrid size={32} className="mx-auto text-slate-300" />
                  <h4 className="font-bold text-sm text-slate-700">Nenhum menu encontrado</h4>
                  <p className="text-xs text-slate-500">
                    Nenhum menu corresponde ao termo de busca "{menuSearchTerm}".
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuSearchTerm('');
                      setMenuStatusFilter('todos');
                    }}
                    className="mt-2 text-xs font-bold text-blue-600 hover:text-blue-700"
                  >
                    Limpar filtros
                  </button>
                </div>
              ) : (
                filteredCatalogSections.map((section) => {
                  const isProtected = section.id === 'configuracoes';
                  const isSectionHidden = !isProtected && menuConfig.hiddenSections.includes(section.id);
                  const subItems = section.subItems || [];
                  const visibleSubs = subItems.filter((s) => !menuConfig.hiddenSubItems.includes(s.id));

                  return (
                    <div
                      key={section.id}
                      className={`rounded-2xl border transition-all ${
                        isSectionHidden
                          ? 'bg-slate-50/70 border-slate-200'
                          : 'bg-white border-slate-200 shadow-xs hover:border-slate-300'
                      }`}
                    >
                      {/* Cabeçalho da Seção / Menu Principal */}
                      <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100">
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                              isSectionHidden
                                ? 'bg-slate-200 text-slate-600'
                                : 'bg-blue-50 text-blue-700 shadow-xs'
                            }`}
                          >
                            {renderMenuIcon(section.iconName, 20)}
                          </div>

                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-extrabold text-sm sm:text-base text-slate-800">
                                {section.label}
                              </h4>

                              {isProtected ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                                  <Lock size={10} />
                                  <span>Protegido (Sempre Visível)</span>
                                </span>
                              ) : isSectionHidden ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                                  <EyeOff size={10} />
                                  <span>Oculto da Barra Lateral</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <Eye size={10} />
                                  <span>Visível na Barra Lateral</span>
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
                              {section.description}
                            </p>
                          </div>
                        </div>

                        {/* Botão de Toggle da Seção Inteira */}
                        <div className="flex items-center gap-2 sm:self-center shrink-0">
                          {isProtected ? (
                            <div
                              className="px-3 py-1.5 bg-slate-100 text-slate-500 rounded-xl text-xs font-bold border border-slate-200 flex items-center gap-1.5 cursor-not-allowed"
                              title="O menu de Configurações não pode ser desativado para garantir a administração do sistema."
                            >
                              <Lock size={13} />
                              <span>Fixado</span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleToggleSection(section.id)}
                              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs ${
                                isSectionHidden
                                  ? 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              }`}
                              title={
                                isSectionHidden
                                  ? `Clique para exibir o menu "${section.label}" no menu lateral`
                                  : `Clique para ocultar o menu "${section.label}" do menu lateral`
                              }
                            >
                              {isSectionHidden ? (
                                <>
                                  <EyeOff size={14} />
                                  <span>Oculto (Clique para Ativar)</span>
                                </>
                              ) : (
                                <>
                                  <Check size={14} />
                                  <span>Menu Ativo</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Subitens da Seção */}
                      {subItems.length > 0 && (
                        <div className="p-4 sm:p-5 bg-slate-50/50 rounded-b-2xl space-y-3">
                          {isSectionHidden ? (
                            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
                              <AlertTriangle size={15} className="text-amber-600 shrink-0" />
                              <span>
                                Como o menu principal <strong>{section.label}</strong> está ocultado, nenhum dos submódulos abaixo será exibido na barra lateral até que o menu principal seja ativado.
                              </span>
                            </div>
                          ) : null}

                          <div className="flex items-center justify-between pb-1 flex-wrap gap-2">
                            <span className="text-xs font-bold text-slate-600">
                              Submódulos do menu ({visibleSubs.length} de {subItems.length} visíveis):
                            </span>

                            {!isSectionHidden && (
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleToggleAllSubItemsInSection(section.id, true)}
                                  className="text-[11px] font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
                                >
                                  Marcar Todos
                                </button>
                                <span className="text-slate-300">•</span>
                                <button
                                  type="button"
                                  onClick={() => handleToggleAllSubItemsInSection(section.id, false)}
                                  className="text-[11px] font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
                                >
                                  Desmarcar Todos
                                </button>
                              </div>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                            {subItems.map((sub) => {
                              const isSubHidden = menuConfig.hiddenSubItems.includes(sub.id);
                              const isSubEffectivelyHidden = isSectionHidden || isSubHidden;

                              return (
                                <button
                                  key={sub.id}
                                  type="button"
                                  disabled={isSectionHidden}
                                  onClick={() => handleToggleSubItem(sub.id)}
                                  className={`p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 cursor-pointer disabled:cursor-not-allowed ${
                                    isSubEffectivelyHidden
                                      ? 'bg-white/60 border-slate-200 text-slate-400 opacity-70'
                                      : 'bg-white border-slate-200 hover:border-blue-300 shadow-xs text-slate-800'
                                  }`}
                                >
                                  <div className="pt-0.5 shrink-0">
                                    {!isSubEffectivelyHidden ? (
                                      <CheckSquare size={16} className="text-emerald-600" />
                                    ) : (
                                      <Square size={16} className="text-slate-300" />
                                    )}
                                  </div>

                                  <div className="space-y-0.5 min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-1">
                                      <span
                                        className={`text-xs font-bold truncate ${
                                          !isSubEffectivelyHidden ? 'text-slate-900' : 'text-slate-500'
                                        }`}
                                      >
                                        {sub.label}
                                      </span>
                                      {sub.shortcut && (
                                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 bg-slate-100 text-slate-600 border border-slate-200 rounded shrink-0">
                                          {sub.shortcut}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-tight">
                                      {sub.description}
                                    </p>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Dica de Rodapé */}
            <div className="p-4 bg-blue-50/60 border border-blue-200/70 rounded-2xl text-xs text-blue-900 flex items-start gap-2.5">
              <Sparkles size={16} className="text-blue-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-bold">Sincronização Automática:</span>
                <p className="text-blue-800/90 leading-relaxed">
                  Todas as seleções de menus e submódulos são salvas no banco de dados e entram em vigor instantaneamente
                  na barra de navegação lateral. Você pode alterar essa configuração a qualquer momento.
                </p>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ABA 5: CONFIGURAÇÃO DA IMPRESSORA TÉRMICA */}
      {activeTab === 'impressora' && <ThermalPrinterSettings />}

      {/* ABA 6: PREFERÊNCIAS DO SISTEMA & ALERTAS */}
      {activeTab === 'preferencias' && (() => {
        const isOverdueAlertHidden = dbState.hideOverdueAlert === true || Database.isOverdueAlertHidden();
        const todayIso = new Date().toISOString().split('T')[0];
        const overdueReceivables = dbState.accountsReceivable.filter(
          (r) => r.companyId === currentCompany.id && r.status === 'aberto' && r.dueDate < todayIso
        );
        const totalOverdueBalance = overdueReceivables.reduce((s, r) => s + r.balance, 0);
        const uniqueOverdueCustomerCount = new Set(
          overdueReceivables.map((r) => r.customerId || r.customerName)
        ).size;

        const handleToggleHideOverdueAlert = () => {
          const nextVal = !isOverdueAlertHidden;
          Database.setHideOverdueAlert(nextVal);
          Database.addAuditLog(
            nextVal ? 'OCULTAR_ALERTA_INADIMPLENCIA' : 'EXIBIR_ALERTA_INADIMPLENCIA',
            'CONFIGURACOES',
            'DASHBOARD',
            nextVal
              ? 'Usuário configurou para OCULTAR a mensagem de Alerta de Inadimplência na tela inicial'
              : 'Usuário configurou para EXIBIR a mensagem de Alerta de Inadimplência na tela inicial'
          );
          setDbState({ ...Database.getState() });
          const msg = nextVal
            ? 'Configuração salva: Alerta de Inadimplência ocultado na tela inicial.'
            : 'Configuração salva: Alerta de Inadimplência visível na tela inicial.';
          setPrefSaveMsg(msg);
          toast.success(msg, 'Preferências Atualizadas');
        };

        return (
          <div className="space-y-4">
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
                <div>
                  <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
                    <Sliders className="text-blue-600" size={18} />
                    <span>Preferências do Sistema, Notificações & Tela Inicial</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Controle as opções visuais da Tela Inicial (Dashboard) e políticas de avisos de inadimplência.
                  </p>
                </div>
              </div>

              {prefSaveMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-400 rounded-xl text-xs font-bold text-emerald-900 flex items-center justify-between gap-2 animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                    <span>{prefSaveMsg}</span>
                  </div>
                  <button
                    onClick={() => setPrefSaveMsg(null)}
                    className="text-emerald-700 hover:text-emerald-900 p-0.5 rounded cursor-pointer"
                  >
                    <Check size={14} />
                  </button>
                </div>
              )}

              {/* CARD: ALERTA DE INADIMPLÊNCIA NA TELA INICIAL */}
              <div
                className={`p-5 rounded-2xl border-2 transition-all ${
                  isOverdueAlertHidden
                    ? 'bg-slate-50/80 border-slate-200'
                    : 'bg-gradient-to-br from-rose-50/50 via-white to-slate-50 border-rose-200 shadow-xs'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
                        isOverdueAlertHidden
                          ? 'bg-slate-200 text-slate-600'
                          : 'bg-rose-600 text-white animate-pulse'
                      }`}
                    >
                      <AlertTriangle size={24} />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-black uppercase tracking-wider text-rose-700 bg-rose-100 px-2.5 py-0.5 rounded-full border border-rose-200">
                          Aviso Financeiro
                        </span>
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                            isOverdueAlertHidden
                              ? 'bg-slate-100 text-slate-600 border-slate-300'
                              : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          }`}
                        >
                          {isOverdueAlertHidden ? (
                            <>
                              <EyeOff size={12} />
                              <span>Oculto na Tela Inicial</span>
                            </>
                          ) : (
                            <>
                              <Eye size={12} />
                              <span>Visível na Tela Inicial</span>
                            </>
                          )}
                        </span>
                      </div>

                      <h4 className="text-sm sm:text-base font-extrabold text-slate-800">
                        Mensagem de "Alerta de Inadimplência" na Tela Inicial
                      </h4>
                      <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
                        Quando ativado, exibe um banner destacado no topo da tela inicial sempre que houver clientes
                        com duplicatas e títulos vencidos, permitindo contato e cobrança imediatos via WhatsApp ou Força
                        de Vendas Mobile. Se desativado, o banner permanece oculto, mantendo a tela inicial limpa.
                      </p>
                    </div>
                  </div>

                  {/* Controle de Toggle / Botão */}
                  <div className="flex flex-col items-start md:items-end gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleToggleHideOverdueAlert}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black shadow-xs transition-all cursor-pointer ${
                        isOverdueAlertHidden
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                          : 'bg-slate-800 hover:bg-slate-700 text-white'
                      }`}
                      title={
                        isOverdueAlertHidden
                          ? 'Clique para ativar a exibição do alerta na tela inicial'
                          : 'Clique para ocultar a mensagem de alerta da tela inicial'
                      }
                    >
                      {isOverdueAlertHidden ? (
                        <>
                          <Eye size={16} />
                          <span>Exibir Alerta na Tela Inicial</span>
                        </>
                      ) : (
                        <>
                          <EyeOff size={16} />
                          <span>Ocultar Alerta na Tela Inicial</span>
                        </>
                      )}
                    </button>
                    <span className="text-[11px] text-slate-500">
                      {isOverdueAlertHidden
                        ? 'O banner está ocultado atualmente'
                        : 'O banner está em exibição no Dashboard'}
                    </span>
                  </div>
                </div>

                {/* Resumo em tempo real de clientes com pendências */}
                <div className="mt-4 pt-4 border-t border-slate-200/80 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-white p-3 rounded-xl border border-slate-200 text-center sm:text-left">
                    <span className="text-[11px] text-slate-500 font-semibold uppercase">Clientes Inadimplentes</span>
                    <p className="text-base font-extrabold text-slate-800 mt-0.5">
                      {uniqueOverdueCustomerCount} cliente{uniqueOverdueCustomerCount === 1 ? '' : 's'}
                    </p>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-slate-200 text-center sm:text-left">
                    <span className="text-[11px] text-slate-500 font-semibold uppercase">Parcelas Vencidas</span>
                    <p className="text-base font-extrabold text-slate-800 mt-0.5">
                      {overdueReceivables.length} parcela{overdueReceivables.length === 1 ? '' : 's'}
                    </p>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-slate-200 text-center sm:text-left">
                    <span className="text-[11px] text-slate-500 font-semibold uppercase">Total em Atraso</span>
                    <p className="text-base font-extrabold text-rose-600 font-mono mt-0.5">
                      {formatCurrency(totalOverdueBalance)}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-xs text-slate-500 bg-white/70 p-2.5 rounded-lg border border-slate-200/60">
                  <span>
                    💡 <strong>Dica:</strong> A opção selecionada é salva automaticamente no banco local e pode ser
                    alternada a qualquer momento tanto aqui quanto na própria barra superior da tela inicial.
                  </span>
                </div>
              </div>

              {/* CARD: POLÍTICA DE CONTROLE DE ESTOQUE POR EMPRESA & VENDA COM ESTOQUE NEGATIVO */}
              {(() => {
                const stockConfig = Database.getStockControlConfig();
                const canSellNegative = Database.canSellNegativeStock();
                const totalNegativeProducts = dbState.stockBalances.filter((b) => b.quantity < 0).length;

                const handleToggleStockControl = () => {
                  const nextVal = !stockConfig.enableStockControl;
                  const updated = Database.updateStockControlConfig({ enableStockControl: nextVal });
                  setDbState({ ...Database.getState() });
                  const msg = nextVal
                    ? 'Controle de estoque ATIVADO no sistema.'
                    : 'Controle de estoque DESATIVADO. Vendas com saldo zerado/negativo estão permitidas livremente.';
                  setPrefSaveMsg(msg);
                  toast.success(msg, 'Controle de Estoque');
                };

                const handleToggleAllowNegativeStock = () => {
                  const nextVal = !stockConfig.allowNegativeStock;
                  const updated = Database.updateStockControlConfig({ allowNegativeStock: nextVal });
                  setDbState({ ...Database.getState() });
                  const msg = nextVal
                    ? 'Permissão de venda com estoque negativo HABILITADA. O PDV e pedidos não serão bloqueados por falta de saldo.'
                    : 'Venda com estoque negativo BLOQUEADA. O sistema exigirá saldo físico para concluir saídas e vendas.';
                  setPrefSaveMsg(msg);
                  toast.success(msg, 'Política de Estoque Negativo');
                };

                return (
                  <div
                    className={`p-5 rounded-2xl border-2 transition-all ${
                      canSellNegative
                        ? 'bg-gradient-to-br from-amber-50/60 via-white to-slate-50 border-amber-200 shadow-xs'
                        : 'bg-gradient-to-br from-emerald-50/60 via-white to-slate-50 border-emerald-200 shadow-xs'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="flex items-start gap-3.5">
                        <div
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
                            canSellNegative
                              ? 'bg-amber-500 text-white'
                              : 'bg-emerald-600 text-white'
                          }`}
                        >
                          <Boxes size={24} />
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-100 px-2.5 py-0.5 rounded-full border border-indigo-200">
                              Gestão de Estoque
                            </span>
                            <span
                              className={`text-xs font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                                stockConfig.enableStockControl
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                  : 'bg-slate-100 text-slate-700 border-slate-300'
                              }`}
                            >
                              <Warehouse size={12} />
                              <span>{stockConfig.enableStockControl ? 'Controle de Estoque Ativo' : 'Controle Desativado'}</span>
                            </span>
                            <span
                              className={`text-xs font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                                canSellNegative
                                  ? 'bg-amber-100 text-amber-900 border-amber-300 font-extrabold'
                                  : 'bg-blue-100 text-blue-900 border-blue-300'
                              }`}
                            >
                              <CheckCircle2 size={12} />
                              <span>{canSellNegative ? 'Venda com Estoque Negativo: LIBERADA' : 'Venda Negativa: BLOQUEADA'}</span>
                            </span>
                          </div>

                          <h4 className="text-sm sm:text-base font-extrabold text-slate-800">
                            Controle de Estoque & Permissão de Vendas com Estoque Negativo
                          </h4>
                          <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
                            Configure se o sistema deve controlar o estoque e se é permitido realizar vendas de produtos
                            com saldo zerado ou insuficiente no PDV Balcão, Pedido de Venda e Venda Mobile.
                            Quando a venda com estoque negativo está habilitada, a venda é finalizada normalmente e o saldo
                            fica negativo até que nova compra, produção ou ajuste alimente o estoque da respectiva empresa.
                          </p>
                        </div>
                      </div>

                      {/* Botões de Ação */}
                      <div className="flex flex-col sm:flex-row md:flex-col gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={handleToggleStockControl}
                          className={`flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer ${
                            stockConfig.enableStockControl
                              ? 'bg-slate-800 hover:bg-slate-700 text-white'
                              : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                          }`}
                        >
                          <span>{stockConfig.enableStockControl ? 'Desativar Controle de Estoque' : 'Ativar Controle de Estoque'}</span>
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-white/20">
                            {stockConfig.enableStockControl ? 'Ativo' : 'Inativo'}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={handleToggleAllowNegativeStock}
                          className={`flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer ${
                            stockConfig.allowNegativeStock
                              ? 'bg-rose-700 hover:bg-rose-600 text-white'
                              : 'bg-amber-600 hover:bg-amber-500 text-white'
                          }`}
                        >
                          <span>{stockConfig.allowNegativeStock ? 'Bloquear Venda com Estoque Negativo' : 'Permitir Venda com Estoque Negativo'}</span>
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-white/20">
                            {stockConfig.allowNegativeStock ? 'Liberado' : 'Bloqueado'}
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Resumo e Indicadores do Estoque */}
                    <div className="mt-4 pt-4 border-t border-slate-200/80 grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="bg-white p-3 rounded-xl border border-slate-200">
                        <span className="text-[11px] text-slate-500 font-semibold uppercase">Modo Operacional</span>
                        <p className={`text-sm font-extrabold mt-0.5 ${canSellNegative ? 'text-amber-700' : 'text-emerald-700'}`}>
                          {canSellNegative ? 'Vendas Contínuas (Sem Travar)' : 'Rigoroso (Exige Saldo Físico)'}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {canSellNegative
                            ? 'Vendedores podem emitir pedidos mesmo sem estoque disponível'
                            : 'Vendas são bloqueadas caso o produto não tenha saldo no local'}
                        </p>
                      </div>

                      <div className="bg-white p-3 rounded-xl border border-slate-200">
                        <span className="text-[11px] text-slate-500 font-semibold uppercase">Alimentação por Empresa</span>
                        <p className="text-sm font-extrabold text-indigo-700 mt-0.5">
                          {dbState.companies.length} Empresa{dbState.companies.length === 1 ? '' : 's'} Configurada{dbState.companies.length === 1 ? '' : 's'}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          Compras, inventários e produção exigem seleção da empresa para alimentar estoque
                        </p>
                      </div>

                      <div className="bg-white p-3 rounded-xl border border-slate-200">
                        <span className="text-[11px] text-slate-500 font-semibold uppercase">Itens com Saldo Negativo</span>
                        <p className={`text-sm font-extrabold mt-0.5 ${totalNegativeProducts > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                          {totalNegativeProducts} registro{totalNegativeProducts === 1 ? '' : 's'}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {totalNegativeProducts > 0
                            ? 'Produtos com saldo negativo aguardando reposição'
                            : 'Nenhum saldo negativo registrado no momento'}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        );
      })()}

      {/* Modal Empresa */}
      {isCompanyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <form
            onSubmit={handleSaveCompany}
            className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-3"
          >
            <h3 className="font-bold text-base text-slate-800">
              {editingCompany ? 'Editar Empresa/Filial' : 'Nova Filial'}
            </h3>

            <div className="space-y-2 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Razão Social *</label>
                <input
                  type="text"
                  required
                  value={compName}
                  onChange={(e) => setCompName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nome Fantasia</label>
                <input
                  type="text"
                  value={compTradeName}
                  onChange={(e) => setCompTradeName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">CNPJ *</label>
                <input
                  type="text"
                  required
                  value={compCnpj}
                  onChange={(e) => setCompCnpj(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tipo</label>
                  <select
                    value={compType}
                    onChange={(e) => setCompType(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2"
                  >
                    <option value="filial">Filial</option>
                    <option value="matriz">Matriz</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Telefone</label>
                  <input
                    type="text"
                    value={compPhone}
                    onChange={(e) => setCompPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Cidade</label>
                  <input
                    type="text"
                    value={compCity}
                    onChange={(e) => setCompCity(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">UF</label>
                  <input
                    type="text"
                    maxLength={2}
                    value={compState}
                    onChange={(e) => setCompState(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsCompanyModalOpen(false)}
                className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-xs"
              >
                Salvar Empresa
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Usuário */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <form
            onSubmit={handleSaveUser}
            className="bg-white rounded-2xl max-w-sm w-full border border-slate-200 shadow-2xl p-6 space-y-3"
          >
            <h3 className="font-bold text-base text-slate-800">
              {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
            </h3>

            <div className="space-y-2 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Login de Acesso *</label>
                <input
                  type="text"
                  required
                  value={userLogin}
                  onChange={(e) => setUserLogin(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Perfil de Acesso</label>
                <select
                  value={userRole}
                  onChange={(e) => setUserRole(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-semibold"
                >
                  <option value="admin">Administrador (Acesso Total)</option>
                  <option value="gerente">Gerente Geral</option>
                  <option value="balconista">Balconista de PDV</option>
                  <option value="vendedor_externo">Vendedor Externo Mobile</option>
                  <option value="financeiro">Financeiro / Contas</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Desconto Máximo Autorizado (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={userMaxDiscount}
                  onChange={(e) => setUserMaxDiscount(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold"
                />
              </div>

              {/* Informação sobre Senha Padrão e Política de Acesso */}
              <div className="p-2.5 bg-blue-50/80 border border-blue-200/80 rounded-xl space-y-1 text-[11px] text-blue-900">
                <div className="flex items-center gap-1.5 font-bold text-blue-950">
                  <KeyRound size={13} className="text-blue-600" />
                  <span>Política de Senhas do ERP:</span>
                </div>
                <p className="text-blue-800 leading-snug">
                  • Usuário <strong className="font-mono">admin</strong>: senha padrão <span className="font-mono font-bold bg-white px-1 rounded border border-blue-200">admin</span> (alterável apenas pelo próprio @admin).
                </p>
                <p className="text-blue-800 leading-snug">
                  • Demais usuários: senha padrão <span className="font-mono font-bold bg-white px-1 rounded border border-blue-200">1234</span>.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsUserModalOpen(false)}
                className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-xs cursor-pointer"
              >
                Salvar Usuário
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal de Configuração de Menus, Submenus & Números da Empresa (Exclusivo para o @admin) */}
      {userConfiguringPermissions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full border border-slate-200 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto animate-in fade-in-50 duration-150">
            {/* Cabeçalho do Modal */}
            <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/70 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                    <span>Permissões de Menus, Submenus & Números da Empresa</span>
                  </h3>
                  <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-2">
                    <span className="font-bold text-slate-800">{userConfiguringPermissions.name}</span>
                    <span>•</span>
                    <span>Login: <strong className="font-mono text-indigo-700 font-bold">@{userConfiguringPermissions.login}</strong></span>
                    <span>•</span>
                    <span className="uppercase text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                      Perfil: {userConfiguringPermissions.role}
                    </span>
                    {userConfiguringPermissions.login === 'admin' ? (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-300">
                        Admin Master (Acesso Total)
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setUserConfiguringPermissions(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                title="Fechar sem salvar"
              >
                <X size={18} />
              </button>
            </div>

            {/* Aviso Informativo de Segurança */}
            <div className="px-5 py-2.5 bg-indigo-50/80 border-b border-indigo-100 text-xs text-indigo-900 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Lock size={14} className="text-indigo-600 shrink-0" />
                <span className="leading-snug">
                  <strong>Apenas o usuário "admin"</strong> pode definir quais menus e submenus cada usuário pode utilizar e se poderá visualizar dados estratégicos da empresa (como <strong>Lucro Bruto</strong> ou <strong>Lucro Líquido</strong>).
                </span>
              </div>
            </div>

            {/* Navegação entre Abas do Modal */}
            <div className="flex items-center gap-2 px-5 pt-3 pb-2 border-b border-slate-100 bg-white">
              <button
                type="button"
                onClick={() => setPermModalTab('numeros')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  permModalTab === 'numeros'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <DollarSign size={15} />
                <span>Números da Empresa & Lucratividade</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  permModalTab === 'numeros' ? 'bg-indigo-700 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {Object.values(tempFinPerms).filter(Boolean).length}/6 ativos
                </span>
              </button>

              <button
                type="button"
                onClick={() => setPermModalTab('menus')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  permModalTab === 'menus'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <LayoutGrid size={15} />
                <span>Menus & Submenus Permitidos</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  permModalTab === 'menus' ? 'bg-indigo-700 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {tempAllowedSections.length} menus • {tempAllowedSubItems.length} submenus
                </span>
              </button>
            </div>

            {/* Conteúdo com Scroll */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {/* ======================================================== */}
              {/* ABA 1: VISIBILIDADE DE NÚMEROS DA EMPRESA & LUCRATIVIDADE */}
              {/* ======================================================== */}
              {permModalTab === 'numeros' && (
                <div className="space-y-4">
                  {/* Presets Rápidos */}
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">Predefinições Rápidas de Segurança:</span>
                      <span className="text-[11px] text-slate-500">Configure rapidamente o perfil de visualização financeira deste usuário:</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => {
                          setTempFinPerms({
                            canViewGrossProfit: false,
                            canViewNetProfit: false,
                            canViewTotalRevenue: false,
                            canViewProfitMargin: false,
                            canViewProductCosts: false,
                            canViewCashBalances: false,
                          });
                          toast.info('Todos os números e lucros da empresa foram ocultados para este usuário.');
                        }}
                        className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                        title="Ocultar todos os números estratégicos, custos e lucros da empresa"
                      >
                        Ocultar Todos os Números
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setTempFinPerms({
                            canViewGrossProfit: true,
                            canViewNetProfit: false,
                            canViewTotalRevenue: true,
                            canViewProfitMargin: true,
                            canViewProductCosts: true,
                            canViewCashBalances: false,
                          });
                          toast.info('Permissões ajustadas para: Apenas Lucro Bruto e Faturamento.');
                        }}
                        className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                        title="Permitir Lucro Bruto e Faturamento, mantendo Lucro Líquido e Saldos protegidos"
                      >
                        Apenas Lucro Bruto & Vendas
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setTempFinPerms({
                            canViewGrossProfit: true,
                            canViewNetProfit: true,
                            canViewTotalRevenue: true,
                            canViewProfitMargin: true,
                            canViewProductCosts: true,
                            canViewCashBalances: true,
                          });
                          toast.info('Acesso total liberado para todos os indicadores financeiros.');
                        }}
                        className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                        title="Liberar todos os números e lucros da empresa para este usuário"
                      >
                        Liberar Todos os Indicadores
                      </button>
                    </div>
                  </div>

                  {/* Lista de Métricas Sensíveis */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    {/* 1. LUCRO BRUTO */}
                    <div
                      onClick={() =>
                        setTempFinPerms((prev) => ({ ...prev, canViewGrossProfit: !prev.canViewGrossProfit }))
                      }
                      className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                        tempFinPerms.canViewGrossProfit
                          ? 'bg-emerald-50/50 border-emerald-300 shadow-2xs'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                            <TrendingUp size={16} className={tempFinPerms.canViewGrossProfit ? 'text-emerald-600' : 'text-slate-400'} />
                            <span>Visualizar Lucro Bruto (Real)</span>
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            tempFinPerms.canViewGrossProfit ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {tempFinPerms.canViewGrossProfit ? 'Permitido' : 'Oculto / Bloqueado'}
                          </span>
                        </div>
                        <p className="text-slate-600 text-xs leading-relaxed">
                          Permite ao usuário visualizar o <strong>Lucro Bruto Real</strong> em R$ (Receita de Vendas menos Custo CMV). 
                          Quando desativado, o Lucro Bruto é substituído por aviso de informação restrita no Dashboard e relatórios.
                        </p>
                        <div className="p-2 bg-amber-50/80 rounded-lg border border-amber-200/80 text-[11px] text-amber-900 font-medium">
                          💡 <em>Recomendado ocultar para balconistas e vendedores de balcão que não devam saber o lucro bruto da empresa.</em>
                        </div>
                      </div>

                      <div className="pt-3 mt-3 border-t border-slate-200/70 flex items-center justify-between">
                        <span className="text-[11px] text-slate-500">Status para este usuário:</span>
                        <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          tempFinPerms.canViewGrossProfit ? 'bg-emerald-600' : 'bg-slate-300'
                        }`}>
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            tempFinPerms.canViewGrossProfit ? 'translate-x-6' : 'translate-x-1'
                          }`} />
                        </div>
                      </div>
                    </div>

                    {/* 2. LUCRO LÍQUIDO & DRE */}
                    <div
                      onClick={() =>
                        setTempFinPerms((prev) => ({ ...prev, canViewNetProfit: !prev.canViewNetProfit }))
                      }
                      className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                        tempFinPerms.canViewNetProfit
                          ? 'bg-emerald-50/50 border-emerald-300 shadow-2xs'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                            <DollarSign size={16} className={tempFinPerms.canViewNetProfit ? 'text-emerald-600' : 'text-slate-400'} />
                            <span>Visualizar Lucro Líquido & DRE</span>
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            tempFinPerms.canViewNetProfit ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {tempFinPerms.canViewNetProfit ? 'Permitido' : 'Oculto / Bloqueado'}
                          </span>
                        </div>
                        <p className="text-slate-600 text-xs leading-relaxed">
                          Permite visualizar o <strong>Lucro Líquido</strong> final da empresa após dedução de todas as despesas fixas, despesas operacionais, comissões e impostos (DRE - Demonstrativo de Resultados).
                        </p>
                        <div className="p-2 bg-rose-50/80 rounded-lg border border-rose-200/80 text-[11px] text-rose-900 font-medium">
                          🔒 <em>Dado de máxima confidencialidade da diretoria. Mantenha desativado para usuários operacionais e vendedores.</em>
                        </div>
                      </div>

                      <div className="pt-3 mt-3 border-t border-slate-200/70 flex items-center justify-between">
                        <span className="text-[11px] text-slate-500">Status para este usuário:</span>
                        <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          tempFinPerms.canViewNetProfit ? 'bg-emerald-600' : 'bg-slate-300'
                        }`}>
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            tempFinPerms.canViewNetProfit ? 'translate-x-6' : 'translate-x-1'
                          }`} />
                        </div>
                      </div>
                    </div>

                    {/* 3. FATURAMENTO TOTAL / RECEITA GLOBAL */}
                    <div
                      onClick={() =>
                        setTempFinPerms((prev) => ({ ...prev, canViewTotalRevenue: !prev.canViewTotalRevenue }))
                      }
                      className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                        tempFinPerms.canViewTotalRevenue
                          ? 'bg-blue-50/50 border-blue-300 shadow-2xs'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                            <BarChart3 size={16} className={tempFinPerms.canViewTotalRevenue ? 'text-blue-600' : 'text-slate-400'} />
                            <span>Visualizar Faturamento Global</span>
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            tempFinPerms.canViewTotalRevenue ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {tempFinPerms.canViewTotalRevenue ? 'Permitido' : 'Oculto / Bloqueado'}
                          </span>
                        </div>
                        <p className="text-slate-600 text-xs leading-relaxed">
                          Permite ver o montante total de faturamento em R$ da empresa no dia, mês e ano no Dashboard e relatórios consolidados.
                        </p>
                      </div>

                      <div className="pt-3 mt-3 border-t border-slate-200/70 flex items-center justify-between">
                        <span className="text-[11px] text-slate-500">Status para este usuário:</span>
                        <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          tempFinPerms.canViewTotalRevenue ? 'bg-blue-600' : 'bg-slate-300'
                        }`}>
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            tempFinPerms.canViewTotalRevenue ? 'translate-x-6' : 'translate-x-1'
                          }`} />
                        </div>
                      </div>
                    </div>

                    {/* 4. MARGEM DE LUCRO (%) & MARKUP */}
                    <div
                      onClick={() =>
                        setTempFinPerms((prev) => ({ ...prev, canViewProfitMargin: !prev.canViewProfitMargin }))
                      }
                      className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                        tempFinPerms.canViewProfitMargin
                          ? 'bg-blue-50/50 border-blue-300 shadow-2xs'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                            <Percent size={16} className={tempFinPerms.canViewProfitMargin ? 'text-blue-600' : 'text-slate-400'} />
                            <span>Visualizar Margens (%) & Markup</span>
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            tempFinPerms.canViewProfitMargin ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {tempFinPerms.canViewProfitMargin ? 'Permitido' : 'Oculto / Bloqueado'}
                          </span>
                        </div>
                        <p className="text-slate-600 text-xs leading-relaxed">
                          Permite consultar os percentuais exatos de margem de contribuição sobre a venda e índices de markup aplicados aos produtos e propostas comerciais.
                        </p>
                      </div>

                      <div className="pt-3 mt-3 border-t border-slate-200/70 flex items-center justify-between">
                        <span className="text-[11px] text-slate-500">Status para este usuário:</span>
                        <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          tempFinPerms.canViewProfitMargin ? 'bg-blue-600' : 'bg-slate-300'
                        }`}>
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            tempFinPerms.canViewProfitMargin ? 'translate-x-6' : 'translate-x-1'
                          }`} />
                        </div>
                      </div>
                    </div>

                    {/* 5. CUSTO DE PRODUTOS & CMV */}
                    <div
                      onClick={() =>
                        setTempFinPerms((prev) => ({ ...prev, canViewProductCosts: !prev.canViewProductCosts }))
                      }
                      className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                        tempFinPerms.canViewProductCosts
                          ? 'bg-blue-50/50 border-blue-300 shadow-2xs'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                            <Warehouse size={16} className={tempFinPerms.canViewProductCosts ? 'text-blue-600' : 'text-slate-400'} />
                            <span>Visualizar Custo de Fornecedores</span>
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            tempFinPerms.canViewProductCosts ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {tempFinPerms.canViewProductCosts ? 'Permitido' : 'Oculto / Bloqueado'}
                          </span>
                        </div>
                        <p className="text-slate-600 text-xs leading-relaxed">
                          Permite ver o preço de compra de fornecedores e o custo unitário de mercadorias e matérias-primas no catálogo e no estoque.
                        </p>
                      </div>

                      <div className="pt-3 mt-3 border-t border-slate-200/70 flex items-center justify-between">
                        <span className="text-[11px] text-slate-500">Status para este usuário:</span>
                        <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          tempFinPerms.canViewProductCosts ? 'bg-blue-600' : 'bg-slate-300'
                        }`}>
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            tempFinPerms.canViewProductCosts ? 'translate-x-6' : 'translate-x-1'
                          }`} />
                        </div>
                      </div>
                    </div>

                    {/* 6. SALDOS EM CAIXA & CONTAS BANCÁRIAS */}
                    <div
                      onClick={() =>
                        setTempFinPerms((prev) => ({ ...prev, canViewCashBalances: !prev.canViewCashBalances }))
                      }
                      className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                        tempFinPerms.canViewCashBalances
                          ? 'bg-blue-50/50 border-blue-300 shadow-2xs'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                            <CircleDollarSign size={16} className={tempFinPerms.canViewCashBalances ? 'text-blue-600' : 'text-slate-400'} />
                            <span>Visualizar Saldos Bancários & Caixa</span>
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            tempFinPerms.canViewCashBalances ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {tempFinPerms.canViewCashBalances ? 'Permitido' : 'Oculto / Bloqueado'}
                          </span>
                        </div>
                        <p className="text-slate-600 text-xs leading-relaxed">
                          Permite consultar saldos disponíveis em contas correntes, caixas da empresa e totais acumulados de títulos a pagar e a receber.
                        </p>
                      </div>

                      <div className="pt-3 mt-3 border-t border-slate-200/70 flex items-center justify-between">
                        <span className="text-[11px] text-slate-500">Status para este usuário:</span>
                        <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          tempFinPerms.canViewCashBalances ? 'bg-blue-600' : 'bg-slate-300'
                        }`}>
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            tempFinPerms.canViewCashBalances ? 'translate-x-6' : 'translate-x-1'
                          }`} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ======================================================== */}
              {/* ABA 2: CONTROLE GRANULAR DE MENUS E SUBMENUS             */}
              {/* ======================================================== */}
              {permModalTab === 'menus' && (
                <div className="space-y-4">
                  {/* Barra de Ações e Busca */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pb-2 border-b border-slate-100">
                    <div className="relative flex-1">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Buscar menu ou submódulo (ex: Romaneio, Pedidos, Caixa)..."
                        value={permMenuSearch}
                        onChange={(e) => setPermMenuSearch(e.target.value)}
                        className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-hidden focus:bg-white focus:ring-1 focus:ring-indigo-500"
                      />
                      {permMenuSearch && (
                        <button
                          type="button"
                          onClick={() => setPermMenuSearch('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                      <button
                        type="button"
                        onClick={handleSelectAllMenus}
                        className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-lg border border-indigo-200 transition-colors cursor-pointer"
                        title="Marcar todos os menus e submenus como permitidos para este usuário"
                      >
                        Marcar Todos
                      </button>
                      <button
                        type="button"
                        onClick={handleDeselectAllMenus}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                        title="Desmarcar todos os menus (deixando apenas o Início/Dashboard)"
                      >
                        Bloquear Todos
                      </button>
                      <button
                        type="button"
                        onClick={handleResetToRoleDefaults}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg border border-slate-200 transition-colors cursor-pointer flex items-center gap-1"
                        title="Restaurar a configuração padrão recomendada para a função deste usuário"
                      >
                        <RotateCcw size={12} />
                        <span>Padrão do Cargo</span>
                      </button>
                    </div>
                  </div>

                  {/* Lista de Seções e Submenus */}
                  <div className="space-y-3">
                    {MENU_SECTIONS_CATALOG.filter((sec) => {
                      if (!permMenuSearch.trim()) return true;
                      const term = permMenuSearch.toLowerCase().trim();
                      const matchSection = sec.label.toLowerCase().includes(term) || sec.description.toLowerCase().includes(term);
                      const matchSub = sec.subItems?.some(
                        (sub) => sub.label.toLowerCase().includes(term) || sub.description.toLowerCase().includes(term)
                      );
                      return matchSection || matchSub;
                    }).map((section) => {
                      const isSectionAllowed = tempAllowedSections.includes(section.id);
                      const sectionSubIds = section.subItems?.map((s) => s.id) || [];
                      const allowedSubsCount = sectionSubIds.filter((id) => tempAllowedSubItems.includes(id)).length;
                      const isFullyAllowed = sectionSubIds.length > 0 && allowedSubsCount === sectionSubIds.length;
                      const isPartiallyAllowed = allowedSubsCount > 0 && allowedSubsCount < sectionSubIds.length;

                      const isConfigSection = section.id === 'configuracoes';
                      const isTargetUserAdmin = userConfiguringPermissions.login === 'admin';

                      return (
                        <div
                          key={section.id}
                          className={`rounded-xl border transition-all overflow-hidden ${
                            isSectionAllowed
                              ? 'bg-white border-slate-200 shadow-2xs'
                              : 'bg-slate-50/70 border-slate-200/80 opacity-70'
                          }`}
                        >
                          {/* Cabeçalho da Seção */}
                          <div className="p-3 bg-slate-50/90 border-b border-slate-100 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                              <button
                                type="button"
                                disabled={isConfigSection && !isTargetUserAdmin}
                                onClick={() => handleTogglePermSection(section.id)}
                                className={`w-5 h-5 rounded flex items-center justify-center transition-colors cursor-pointer ${
                                  isFullyAllowed
                                    ? 'bg-indigo-600 text-white'
                                    : isPartiallyAllowed
                                    ? 'bg-indigo-100 text-indigo-700 border border-indigo-400'
                                    : 'border border-slate-300 bg-white hover:border-slate-400 text-transparent'
                                } ${isConfigSection && !isTargetUserAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
                                title={
                                  isConfigSection && !isTargetUserAdmin
                                    ? 'Aba de configurações administrativas é restrita apenas ao usuário admin master'
                                    : 'Marcar / Desmarcar todos os submenus deste menu'
                                }
                              >
                                {isFullyAllowed ? <Check size={14} strokeWidth={3} /> : isPartiallyAllowed ? '–' : null}
                              </button>

                              <div className="flex items-center gap-2">
                                <span className={`p-1.5 rounded-lg ${isSectionAllowed ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-200 text-slate-500'}`}>
                                  {renderMenuIcon(section.iconName, 16)}
                                </span>
                                <div>
                                  <span className="font-extrabold text-xs text-slate-900 block flex items-center gap-1.5">
                                    <span>Menu: {section.label}</span>
                                    {isConfigSection && (
                                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-300">
                                        Admin Master
                                      </span>
                                    )}
                                  </span>
                                  <span className="text-[11px] text-slate-500 hidden sm:block">
                                    {section.description}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                isFullyAllowed
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : allowedSubsCount > 0
                                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                  : 'bg-slate-200 text-slate-600'
                              }`}>
                                {allowedSubsCount} de {sectionSubIds.length} submenus
                              </span>
                            </div>
                          </div>

                          {/* Grade de Submenus */}
                          {section.subItems && section.subItems.length > 0 && (
                            <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2 bg-white">
                              {section.subItems.map((sub) => {
                                const isSubAllowed = tempAllowedSubItems.includes(sub.id);
                                const isRestrictedAdminSub =
                                  (sub.id === 'settings' || sub.id === 'settings_menus' || sub.id === 'settings_supabase') &&
                                  !isTargetUserAdmin;

                                return (
                                  <div
                                    key={sub.id}
                                    onClick={() => {
                                      if (isRestrictedAdminSub) return;
                                      handleTogglePermSubItem(section.id, sub.id);
                                    }}
                                    className={`p-2.5 rounded-lg border text-xs flex items-start justify-between gap-2 transition-all cursor-pointer ${
                                      isRestrictedAdminSub
                                        ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                                        : isSubAllowed
                                        ? 'bg-indigo-50/40 border-indigo-200 text-slate-900'
                                        : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600'
                                    }`}
                                  >
                                    <div className="flex items-start gap-2">
                                      <div
                                        className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center transition-colors shrink-0 ${
                                          isRestrictedAdminSub
                                            ? 'bg-slate-200 text-slate-400'
                                            : isSubAllowed
                                            ? 'bg-indigo-600 text-white'
                                            : 'border border-slate-300 bg-white'
                                        }`}
                                      >
                                        {isSubAllowed ? <Check size={12} strokeWidth={3} /> : null}
                                      </div>
                                      <div>
                                        <div className="font-bold flex items-center gap-1.5">
                                          <span>{sub.label}</span>
                                          {sub.shortcut && (
                                            <span className="font-mono text-[9px] font-bold px-1 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                              {sub.shortcut}
                                            </span>
                                          )}
                                        </div>
                                        <div className="text-[11px] text-slate-500 leading-snug mt-0.5">
                                          {sub.description}
                                        </div>
                                        {isRestrictedAdminSub && (
                                          <div className="text-[10px] text-amber-700 font-bold mt-1">
                                            Restrito ao Administrador Master
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Rodapé com Ações */}
            <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-slate-500 text-center sm:text-left">
                Salvando permissões para <strong>{userConfiguringPermissions.name}</strong> (@{userConfiguringPermissions.login})
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setUserConfiguringPermissions(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer w-full sm:w-auto text-center"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSavePermissionsConfig}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer w-full sm:w-auto"
                >
                  <ShieldCheck size={15} />
                  <span>Salvar Permissões de Acesso</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <ChangePasswordModal
        isOpen={!!passwordChangeUser}
        onClose={() => setPasswordChangeUser(null)}
        targetUser={passwordChangeUser || currentUser}
      />
    </div>
  );
};
