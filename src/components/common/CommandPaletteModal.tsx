import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  ShoppingCart,
  DollarSign,
  Package,
  Users,
  LayoutDashboard,
  Smartphone,
  Receipt,
  FileSpreadsheet,
  BarChart3,
  Settings,
  Boxes,
  ClipboardList,
  Calculator,
  Truck,
  Keyboard,
  ArrowRight,
  Scale,
  Printer,
  Database as DatabaseIcon,
} from 'lucide-react';
import { Database } from '../../services/db';

interface CommandItem {
  id: string;
  title: string;
  category: string;
  shortcut?: string;
  targetModule?: string;
  action?: () => void;
  icon: React.ReactNode;
  keywords: string[];
}

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (module: string) => void;
  onOpenShortcuts: () => void;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onOpenShortcuts,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const COMMANDS: CommandItem[] = [
    {
      id: 'pos',
      title: 'Abrir PDV Balcão',
      category: 'Vendas & Frente de Caixa',
      shortcut: 'F2',
      targetModule: 'pos',
      icon: <ShoppingCart size={16} className="text-emerald-600" />,
      keywords: ['pdv', 'caixa', 'balcao', 'venda', 'cupom', 'frente', 'f2'],
    },
    {
      id: 'new-sale',
      title: 'Nova Venda Balcão / Identificar Cliente',
      category: 'Vendas & Frente de Caixa',
      shortcut: 'F3',
      targetModule: 'pos',
      icon: <ShoppingCart size={16} className="text-emerald-600" />,
      keywords: ['nova venda', 'vender', 'f3', 'iniciar', 'cliente'],
    },
    {
      id: 'fractional-qty',
      title: 'Quantidade Fracionada (até 3 decimais com Total Líquido)',
      category: 'Vendas & Frente de Caixa',
      shortcut: 'F12',
      targetModule: 'pos',
      icon: <Scale size={16} className="text-emerald-600" />,
      keywords: ['fracionada', 'quantidade', 'f12', 'peso', 'kg', 'balanca', 'decimais', 'balcao', 'gramas', 'metragem'],
    },
    {
      id: 'external-sales',
      title: 'Vendas Mobile / Força de Vendas',
      category: 'Vendas & Frente de Caixa',
      shortcut: 'F7',
      targetModule: 'external_sales',
      icon: <Smartphone size={16} className="text-sky-600" />,
      keywords: ['vendas mobile', 'mobile', 'celular', 'pedido', 'orcamento', 'f7'],
    },
    {
      id: 'orders',
      title: 'Histórico de Pedidos & Orçamentos',
      category: 'Vendas & Frente de Caixa',
      shortcut: 'F9',
      targetModule: 'orders',
      icon: <Receipt size={16} className="text-blue-600" />,
      keywords: ['pedidos', 'historico', 'orcamentos', 'f9', 'vendas'],
    },
    {
      id: 'products',
      title: 'Catálogo de Produtos & Estoque',
      category: 'Produtos & Estoque',
      shortcut: 'F4',
      targetModule: 'products',
      icon: <Package size={16} className="text-indigo-600" />,
      keywords: ['produtos', 'itens', 'mercadorias', 'estoque', 'f4', 'precos'],
    },
    {
      id: 'stock-locations',
      title: 'Locais de Estoque & Depósitos',
      category: 'Produtos & Estoque',
      targetModule: 'stock_locations',
      icon: <Boxes size={16} className="text-amber-600" />,
      keywords: ['locais', 'deposito', 'armazem', 'saldo', 'multi-local'],
    },
    {
      id: 'stock-movements',
      title: 'Movimentações & Kardex de Estoque',
      category: 'Produtos & Estoque',
      targetModule: 'stock_movements',
      icon: <ClipboardList size={16} className="text-amber-600" />,
      keywords: ['movimentacoes', 'kardex', 'entradas', 'saidas', 'ajustes'],
    },
    {
      id: 'inventory',
      title: 'Inventário Físico & Balanço',
      category: 'Produtos & Estoque',
      targetModule: 'inventory',
      icon: <ClipboardList size={16} className="text-slate-600" />,
      keywords: ['inventario', 'balanco', 'contagem', 'ajuste'],
    },
    {
      id: 'customers',
      title: 'Clientes & CRM',
      category: 'Cadastros',
      shortcut: 'F8',
      targetModule: 'customers',
      icon: <Users size={16} className="text-cyan-600" />,
      keywords: ['clientes', 'crm', 'f8', 'compradores', 'consumidor'],
    },
    {
      id: 'suppliers',
      title: 'Fornecedores & Parceiros',
      category: 'Cadastros',
      targetModule: 'suppliers',
      icon: <Truck size={16} className="text-cyan-600" />,
      keywords: ['fornecedores', 'parceiros', 'distribuidores'],
    },
    {
      id: 'cash-flow',
      title: 'Financeiro: Fluxo de Caixa',
      category: 'Financeiro',
      shortcut: 'F6',
      targetModule: 'cash_flow',
      icon: <DollarSign size={16} className="text-purple-600" />,
      keywords: ['financeiro', 'fluxo', 'caixa', 'f6', 'extrato'],
    },
    {
      id: 'accounts-receivable',
      title: 'Financeiro: Contas a Receber',
      category: 'Financeiro',
      targetModule: 'accounts_receivable',
      icon: <DollarSign size={16} className="text-emerald-600" />,
      keywords: ['receber', 'cobranca', 'faturas', 'crediario', 'titulos'],
    },
    {
      id: 'accounts-payable',
      title: 'Financeiro: Contas a Pagar',
      category: 'Financeiro',
      targetModule: 'accounts_payable',
      icon: <DollarSign size={16} className="text-rose-600" />,
      keywords: ['pagar', 'despesas', 'contas a pagar', 'boletos'],
    },
    {
      id: 'payment-methods',
      title: 'Financeiro: Formas de Pagamento (Boleto, Pix, Cartões)',
      category: 'Financeiro',
      targetModule: 'payment_methods',
      icon: <DollarSign size={16} className="text-blue-600" />,
      keywords: ['forma de pagamento', 'boleto', 'pix', 'cartao', 'debito', 'credito', 'crediario'],
    },
    {
      id: 'financial-accounts',
      title: 'Financeiro: Contas Bancárias & Caixa',
      category: 'Financeiro',
      targetModule: 'financial_accounts',
      icon: <DollarSign size={16} className="text-blue-600" />,
      keywords: ['contas', 'banco', 'bancos', 'caixa', 'banco do brasil', 'itau', 'agencia'],
    },
    {
      id: 'payment-terms',
      title: 'Financeiro: Prazos de Pagamento',
      category: 'Financeiro',
      targetModule: 'payment_terms',
      icon: <DollarSign size={16} className="text-blue-600" />,
      keywords: ['prazos', 'condicoes', 'a vista', 'parcelas', '30 dias', 'faturamento'],
    },
    {
      id: 'production-orders',
      title: 'Ordens de Produção & PCP',
      category: 'Indústria & Produção',
      targetModule: 'production_orders',
      icon: <Boxes size={16} className="text-teal-600" />,
      keywords: ['producao', 'pcp', 'fabricacao', 'ordens'],
    },
    {
      id: 'pricing-calculator',
      title: 'Precificação, Custos e Margens',
      category: 'Indústria & Produção',
      targetModule: 'pricing_calculator',
      icon: <Calculator size={16} className="text-teal-600" />,
      keywords: ['precificacao', 'markup', 'margem', 'custo', 'formacao de preco'],
    },
    {
      id: 'delivery-manifests',
      title: 'Romaneio de Entrega & Cargas',
      category: 'Expedição & Logística',
      targetModule: 'delivery_manifests',
      icon: <Truck size={16} className="text-blue-600" />,
      keywords: ['romaneio', 'expedicao', 'entrega', 'motorista', 'cargas', 'viagem'],
    },
    {
      id: 'delivery-routes',
      title: 'Rotas de Entrega & Associação em Lote',
      category: 'Expedição & Logística',
      targetModule: 'delivery_routes',
      icon: <Truck size={16} className="text-indigo-600" />,
      keywords: ['rotas', 'bairro', 'praca', 'cidade', 'vendedor', 'associacao em lote', 'roteirizacao'],
    },
    {
      id: 'expedition-reports',
      title: 'Relatórios de Expedição (Separação por Cliente)',
      category: 'Expedição & Logística',
      targetModule: 'expedition_reports',
      icon: <Truck size={16} className="text-blue-500" />,
      keywords: ['relatorios expedicao', 'mapa de carga', 'separacao por cliente', 'entregas'],
    },
    {
      id: 'excel-tools',
      title: 'Importação / Exportação Excel',
      category: 'Integrações',
      targetModule: 'excel_tools',
      icon: <FileSpreadsheet size={16} className="text-emerald-700" />,
      keywords: ['excel', 'planilha', 'importar', 'exportar', 'backup'],
    },
    {
      id: 'reports',
      title: 'Relatórios & Inteligência Gerencial',
      category: 'Gerencial',
      targetModule: 'reports',
      icon: <BarChart3 size={16} className="text-indigo-600" />,
      keywords: ['relatorios', 'metricas', 'graficos', 'vendas'],
    },
    {
      id: 'settings-supabase',
      title: 'Banco de Dados Supabase (PostgreSQL, Nuvem & Backup)',
      category: 'Configurações',
      targetModule: 'settings_supabase',
      icon: <DatabaseIcon size={16} className="text-emerald-600" />,
      keywords: ['supabase', 'banco de dados', 'postgres', 'postgresql', 'nuvem', 'backup', 'sincronizacao', 'sql'],
    },
    {
      id: 'settings',
      title: 'Configurações & Filiais',
      category: 'Configurações',
      targetModule: 'settings',
      icon: <Settings size={16} className="text-slate-600" />,
      keywords: ['configuracoes', 'empresa', 'filiais', 'usuarios'],
    },
    {
      id: 'settings-printer',
      title: 'Configuração de Impressão (Folha A4 & Térmica 80mm)',
      category: 'Configurações',
      targetModule: 'settings_printer',
      icon: <Printer size={16} className="text-emerald-600" />,
      keywords: ['impressora', 'impressao', 'a4', 'folha a4', 'relatorios', 'termica', 'cupom', 'bobina', '80mm', '58mm', 'margem', 'cabecalho'],
    },
    {
      id: 'dashboard',
      title: 'Painel Principal (Dashboard)',
      category: 'Navegação',
      shortcut: 'F10',
      targetModule: 'dashboard',
      icon: <LayoutDashboard size={16} className="text-blue-600" />,
      keywords: ['dashboard', 'inicio', 'home', 'painel', 'f10'],
    },
    {
      id: 'shortcuts-guide',
      title: 'Guia Completo de Atalhos de Teclado',
      category: 'Produtividade',
      shortcut: 'F1',
      action: onOpenShortcuts,
      icon: <Keyboard size={16} className="text-amber-600" />,
      keywords: ['atalhos', 'teclado', 'ajuda', 'f1', 'shortcuts'],
    },
  ];

  const isAdmin = Database.isAdmin();

  const filteredCommands = COMMANDS.filter((cmd) => {
    // Regra solicitada: apenas o usuário 'admin' poderá utilizar 'Empresa, Usuários & Auditoria' e 'Menu do Sistema'
    if (!isAdmin && (cmd.targetModule === 'settings' || cmd.targetModule === 'settings_menus')) {
      return false;
    }
    if (!query.trim()) return true;
    const q = query.toLowerCase().trim();
    return (
      cmd.title.toLowerCase().includes(q) ||
      cmd.category.toLowerCase().includes(q) ||
      cmd.shortcut?.toLowerCase().includes(q) ||
      cmd.keywords.some((k) => k.toLowerCase().includes(q))
    );
  });

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const handleSelectCommand = (cmd: CommandItem) => {
    onClose();
    if (cmd.action) {
      cmd.action();
    } else if (cmd.targetModule) {
      onNavigate(cmd.targetModule);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1 < filteredCommands.length ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : filteredCommands.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        handleSelectCommand(filteredCommands[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-100">
      <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[75vh]">
        {/* Input da Paleta */}
        <div className="p-3.5 border-b border-slate-100 flex items-center gap-3">
          <Search size={18} className="text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Digite o que deseja fazer ou para onde quer ir..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full text-sm font-semibold text-slate-900 placeholder:text-slate-400 bg-transparent focus:outline-hidden"
          />
          <kbd className="hidden sm:inline-block text-[10px] font-mono font-bold bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-slate-500">
            Esc
          </kbd>
        </div>

        {/* Lista de Resultados */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-50 p-2">
          {filteredCommands.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              Nenhuma ação encontrada para "{query}".
            </div>
          ) : (
            filteredCommands.map((cmd, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={cmd.id}
                  onClick={() => handleSelectCommand(cmd)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`p-2.5 rounded-xl flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                    isSelected ? 'bg-slate-900 text-white' : 'hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-slate-800 text-emerald-400' : 'bg-slate-100'
                      }`}
                    >
                      {cmd.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-xs sm:text-sm truncate">
                        {cmd.title}
                      </div>
                      <div
                        className={`text-[10px] truncate ${
                          isSelected ? 'text-slate-400' : 'text-slate-400'
                        }`}
                      >
                        {cmd.category}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {cmd.shortcut && (
                      <kbd
                        className={`font-mono text-[10px] font-extrabold px-1.5 py-0.5 rounded border shadow-2xs ${
                          isSelected
                            ? 'bg-slate-800 text-emerald-400 border-slate-700'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {cmd.shortcut}
                      </kbd>
                    )}
                    <ArrowRight
                      size={14}
                      className={isSelected ? 'text-emerald-400' : 'text-slate-300'}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Rodapé com Dicas de Navegação */}
        <div className="px-3 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="font-mono font-bold bg-white px-1 py-0.5 rounded border border-slate-200 text-slate-600">↑</kbd>{' '}
              <kbd className="font-mono font-bold bg-white px-1 py-0.5 rounded border border-slate-200 text-slate-600">↓</kbd>{' '}
              Navegar
            </span>
            <span>
              <kbd className="font-mono font-bold bg-white px-1 py-0.5 rounded border border-slate-200 text-slate-600">↵</kbd>{' '}
              Selecionar
            </span>
          </div>
          <span>
            Pressione <kbd className="font-mono font-bold bg-white px-1 py-0.5 rounded border border-slate-200 text-slate-600">F1</kbd> para atalhos
          </span>
        </div>
      </div>
    </div>
  );
};
