import React, { useState } from 'react';
import {
  Keyboard,
  X,
  Search,
  ShoppingCart,
  DollarSign,
  Package,
  Users,
  LayoutDashboard,
  Smartphone,
  Receipt,
  Sparkles,
  Command,
  ArrowRight,
  Scale,
  ClipboardList
} from 'lucide-react';
import { Database } from '../../services/db';

export interface ShortcutItem {
  id: string;
  category: 'global' | 'pos' | 'system';
  keys: string[];
  description: string;
  actionText: string;
  targetModule?: string;
  icon?: React.ReactNode;
  color?: string;
}

export const SYSTEM_SHORTCUTS: ShortcutItem[] = [
  // Navegação Geral
  {
    id: 'f10-dashboard',
    category: 'global',
    keys: ['F10'],
    description: 'Painel Principal / Dashboard com indicadores',
    actionText: 'Ir para Dashboard',
    targetModule: 'dashboard',
    icon: <LayoutDashboard size={15} />,
    color: 'text-blue-600 bg-blue-50 border-blue-200',
  },
  {
    id: 'f2-pos',
    category: 'global',
    keys: ['F2'],
    description: 'Abrir PDV Balcão (ou Consulta Rápida se já estiver no PDV)',
    actionText: 'Abrir PDV Balcão',
    targetModule: 'pos',
    icon: <ShoppingCart size={15} />,
    color: 'text-emerald-700 bg-emerald-50 border-emerald-300',
  },
  {
    id: 'f3-new-sale',
    category: 'global',
    keys: ['F3'],
    description: 'Emissão de Pedido de Venda & Orçamentos Comerciais',
    actionText: 'Pedido de Venda',
    targetModule: 'orders',
    icon: <ClipboardList size={15} />,
    color: 'text-blue-700 bg-blue-50 border-blue-300',
  },
  {
    id: 'shift-f3-new-cust',
    category: 'pos',
    keys: ['Shift', 'F3'],
    description: 'Cadastrar Novo Cliente Rapidamente no Balcão',
    actionText: 'Novo Cliente Balcão',
    targetModule: 'pos',
    icon: <Users size={15} />,
    color: 'text-emerald-700 bg-emerald-50 border-emerald-300',
  },
  {
    id: 'f12-fractional-qty',
    category: 'pos',
    keys: ['F12'],
    description: 'Quantidade Fracionada (até 3 casas decimais) com recálculo automático do Total Líquido',
    actionText: 'Qtd Fracionada [F12]',
    targetModule: 'pos',
    icon: <Scale size={15} />,
    color: 'text-emerald-700 bg-emerald-50 border-emerald-300',
  },
  {
    id: 'f4-products',
    category: 'global',
    keys: ['F4'],
    description: 'Catálogo de Produtos, Estoque e Preços (ou Desconto no PDV)',
    actionText: 'Ver Produtos & Estoque',
    targetModule: 'products',
    icon: <Package size={15} />,
    color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
  },
  {
    id: 'f6-financial',
    category: 'global',
    keys: ['F6'],
    description: 'Financeiro: Fluxo de Caixa, Contas a Pagar e Receber',
    actionText: 'Ir para Financeiro',
    targetModule: 'cash_flow',
    icon: <DollarSign size={15} />,
    color: 'text-purple-600 bg-purple-50 border-purple-200',
  },
  {
    id: 'f7-external-sales',
    category: 'global',
    keys: ['F7'],
    description: 'Força de Vendas / Vendas no Celular',
    actionText: 'Vendas Mobile',
    targetModule: 'external_sales',
    icon: <Smartphone size={15} />,
    color: 'text-sky-600 bg-sky-50 border-sky-200',
  },
  {
    id: 'f8-customers',
    category: 'global',
    keys: ['F8'],
    description: 'Gestão de Clientes & CRM',
    actionText: 'Ir para Clientes',
    targetModule: 'customers',
    icon: <Users size={15} />,
    color: 'text-cyan-600 bg-cyan-50 border-cyan-200',
  },
  {
    id: 'f9-orders',
    category: 'global',
    keys: ['F9'],
    description: 'Histórico de Pedidos & Orçamentos (ou Finalizar Venda no PDV)',
    actionText: 'Histórico de Pedidos',
    targetModule: 'orders',
    icon: <Receipt size={15} />,
    color: 'text-emerald-700 bg-emerald-50 border-emerald-300',
  },
  {
    id: 'ctrl-k-palette',
    category: 'system',
    keys: ['Ctrl', 'K'],
    description: 'Paleta de Comandos Global: busca rápida de qualquer tela ou ação',
    actionText: 'Abrir Paleta de Comandos',
    icon: <Command size={15} />,
    color: 'text-slate-800 bg-slate-100 border-slate-300',
  },
  {
    id: 'alt-m-sidebar',
    category: 'system',
    keys: ['Alt', 'M'],
    description: 'Minimizar ou Expandir a Barra Lateral (Menu Compacto)',
    actionText: 'Alternar Menu',
    icon: <Keyboard size={15} />,
    color: 'text-slate-700 bg-slate-100 border-slate-200',
  },
  {
    id: 'f1-help',
    category: 'system',
    keys: ['F1'],
    description: 'Central de Ajuda de Atalhos de Teclado',
    actionText: 'Exibir este Guia',
    icon: <Sparkles size={15} />,
    color: 'text-amber-700 bg-amber-50 border-amber-300',
  },
  {
    id: 'esc-close',
    category: 'system',
    keys: ['Esc'],
    description: 'Fechar modais abertos, paleta de comandos ou limpar buscas',
    actionText: 'Fechar / Cancelar',
    icon: <X size={15} />,
    color: 'text-rose-600 bg-rose-50 border-rose-200',
  },
];

interface GlobalShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (module: string) => void;
  onOpenCommandPalette: () => void;
}

export const GlobalShortcutsModal: React.FC<GlobalShortcutsModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onOpenCommandPalette,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'global' | 'pos' | 'system'>('all');

  if (!isOpen) return null;

  const isBalconista = Database.isBalconista();

  const adjustedShortcuts = SYSTEM_SHORTCUTS.map((item) => {
    if (isBalconista && item.id === 'f10-dashboard') {
      return {
        ...item,
        description: 'Tela Inicial: PDV Balcão (Frente de Caixa)',
        actionText: 'Ir para PDV Balcão',
        targetModule: 'pos',
        icon: <ShoppingCart size={15} />,
        color: 'text-emerald-700 bg-emerald-50 border-emerald-300',
      };
    }
    return item;
  });

  const filteredShortcuts = adjustedShortcuts.filter((item) => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      item.description.toLowerCase().includes(term) ||
      item.actionText.toLowerCase().includes(term) ||
      item.keys.some((k) => k.toLowerCase().includes(term));
    return matchesCategory && matchesSearch;
  });

  const handleExecuteShortcut = (item: ShortcutItem) => {
    onClose();
    if (item.id === 'ctrl-k-palette') {
      onOpenCommandPalette();
    } else if (item.targetModule) {
      onNavigate(item.targetModule);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl p-5 space-y-4 max-h-[90vh] flex flex-col">
        {/* Cabeçalho */}
        <div className="flex justify-between items-start pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-emerald-400 flex items-center justify-center shadow-xs">
              <Keyboard size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-slate-900">
                  Central de Atalhos de Teclado
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                  Produtividade
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Pressione a tecla a qualquer momento para abrir telas ou agilizar atendimentos
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
            title="Fechar (Esc)"
          >
            <X size={20} />
          </button>
        </div>

        {/* Barra de Busca & Filtros Rápidos */}
        <div className="flex flex-col sm:flex-row items-center gap-2">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Pesquisar atalho por tecla ou função (ex: F2, PDV, Cliente)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-emerald-500"
              autoFocus
            />
          </div>

          <div className="flex items-center gap-1 w-full sm:w-auto shrink-0 overflow-x-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Todos ({SYSTEM_SHORTCUTS.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory('global')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedCategory === 'global'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Navegação
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory('pos')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedCategory === 'pos'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              PDV Balcão
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory('system')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedCategory === 'system'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Sistema
            </button>
          </div>
        </div>

        {/* Lista de Atalhos */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl pr-1">
          {filteredShortcuts.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              Nenhum atalho encontrado para "{searchTerm}".
            </div>
          ) : (
            filteredShortcuts.map((item) => (
              <div
                key={item.id}
                onClick={() => handleExecuteShortcut(item)}
                className="p-3 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3 cursor-pointer group"
                title={`Executar: ${item.actionText}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Badge de Tecla */}
                  <div className="flex items-center gap-1 shrink-0">
                    {item.keys.map((key, i) => (
                      <React.Fragment key={key}>
                        {i > 0 && <span className="text-slate-400 text-xs font-bold">+</span>}
                        <kbd className="min-w-8 text-center px-2 py-1 bg-white border border-slate-300 rounded-md font-mono text-xs font-extrabold text-slate-800 shadow-2xs group-hover:border-emerald-500 group-hover:text-emerald-700 transition-colors">
                          {key}
                        </kbd>
                      </React.Fragment>
                    ))}
                  </div>

                  <div className="min-w-0">
                    <div className="font-bold text-xs sm:text-sm text-slate-900 group-hover:text-emerald-700 transition-colors truncate flex items-center gap-1.5">
                      {item.icon}
                      <span>{item.actionText}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">
                      {item.description}
                    </div>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-1 text-[11px] font-bold text-slate-400 group-hover:text-emerald-600 transition-colors">
                  <span className="hidden sm:inline">Executar</span>
                  <ArrowRight size={13} />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Rodapé Informativo */}
        <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-2">
          <span>
            💡 Dica: Você pode abrir a <strong>Paleta de Comandos</strong> a qualquer instante pressionando <kbd className="font-mono font-bold bg-slate-100 px-1 py-0.5 rounded border border-slate-200">Ctrl + K</kbd>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
