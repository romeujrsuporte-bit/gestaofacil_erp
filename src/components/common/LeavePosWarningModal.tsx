import React from 'react';
import { AlertTriangle, ShoppingCart, ArrowRight, X } from 'lucide-react';
import { OrderItem } from '../../types';
import { formatCurrency } from '../../services/pricingEngine';

interface LeavePosWarningModalProps {
  isOpen: boolean;
  cart: OrderItem[];
  targetModuleName?: string | null;
  onConfirmLeave: () => void;
  onCancelLeave: () => void;
}

export const LeavePosWarningModal: React.FC<LeavePosWarningModalProps> = ({
  isOpen,
  cart,
  targetModuleName,
  onConfirmLeave,
  onCancelLeave,
}) => {
  if (!isOpen) return null;

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalValue = cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  const getTargetModuleLabel = (mod?: string | null) => {
    switch (mod) {
      case 'dashboard':
        return 'Início / Dashboard';
      case 'orders':
        return 'Pedido de Venda';
      case 'products':
        return 'Produtos & Estoque';
      case 'customers':
        return 'Clientes & CRM';
      case 'cash_flow':
        return 'Financeiro';
      case 'external_sales':
        return 'Vendas Mobile';
      case 'stock_locations':
        return 'Estoque';
      case 'delivery_manifests':
      case 'delivery_routes':
      case 'expedition_reports':
      case 'expedicao':
        return 'Expedição';
      case 'reports':
        return 'Relatórios';
      case 'settings':
      case 'settings_supabase':
        return 'Configurações / Supabase';
      default:
        return 'outro menu';
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-md w-full border border-amber-200/80 shadow-2xl overflow-hidden flex flex-col">
        {/* Faixa Superior de Alerta */}
        <div className="bg-amber-500 text-slate-950 px-4 py-2 text-xs font-black uppercase tracking-wider flex items-center gap-2">
          <AlertTriangle size={16} />
          <span>Atenção: Venda em Andamento</span>
        </div>

        <div className="p-5 space-y-4">
          {/* Cabeçalho */}
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200 shadow-2xs">
              <ShoppingCart size={24} />
            </div>

            <div className="space-y-1">
              <h3 className="font-extrabold text-slate-900 text-base leading-snug">
                Deseja realmente sair do PDV Balcão?
              </h3>
              <p className="text-xs text-rose-600 font-bold">
                Se você mudar de tela agora, você perderá todos os dados e produtos que já foram adicionados a esta venda!
              </p>
            </div>
          </div>

          {/* Card Resumo do Carrinho que será perdido */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
            <div className="flex justify-between items-center text-xs text-slate-600">
              <span className="font-semibold">Itens no carrinho:</span>
              <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200 font-mono">
                {totalItems} {totalItems === 1 ? 'item' : 'itens'}
              </span>
            </div>

            <div className="flex justify-between items-center text-xs text-slate-600">
              <span className="font-semibold">Subtotal acumulado:</span>
              <span className="font-black text-slate-900 text-sm font-mono text-emerald-700">
                {formatCurrency(totalValue)}
              </span>
            </div>

            {targetModuleName && (
              <div className="text-[11px] text-slate-500 pt-1.5 border-t border-slate-200 flex items-center justify-between">
                <span>Destino solicitado:</span>
                <span className="font-bold text-slate-700 bg-slate-200/70 px-2 py-0.5 rounded">
                  {getTargetModuleLabel(targetModuleName)}
                </span>
              </div>
            )}
          </div>

          {/* Pergunta de Confirmação */}
          <p className="text-xs text-slate-600 text-center font-medium">
            Para não perder os dados, clique em <strong>Permanecer na Venda</strong> e finalize o cupom.
          </p>

          {/* Botões de Ação */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onCancelLeave}
              autoFocus
              className="w-full px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer order-2 sm:order-1"
            >
              <span>Permanecer na Venda</span>
            </button>

            <button
              type="button"
              onClick={onConfirmLeave}
              className="w-full px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 font-bold text-xs rounded-xl border border-rose-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer order-1 sm:order-2"
            >
              <span>Descartar e Sair</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
