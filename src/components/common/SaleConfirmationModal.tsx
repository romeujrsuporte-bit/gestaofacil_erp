import React from 'react';
import {
  CheckCircle2,
  X,
  User,
  DollarSign,
  CreditCard,
  Clock,
  AlertCircle,
  ArrowLeft,
  ShoppingBag,
  Receipt,
  Warehouse,
  QrCode,
  Coins,
  Barcode,
  FileText
} from 'lucide-react';
import { formatCurrency } from '../../services/pricingEngine';

export interface SaleConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  modality: 'PDV Balcão' | 'Pedido de Venda' | 'Venda Mobile';
  customerName: string;
  customerDocument?: string;
  customerPhone?: string;
  totalAmount: number;
  paymentMethod: string;
  paymentTerm: string;
  installments?: number;
  itemsCount?: number;
  receivedAmount?: number;
  changeAmount?: number;
  locationName?: string;
  isSubmitting?: boolean;
}

export const formatPaymentMethodName = (method: string): string => {
  switch (method) {
    case 'pix':
      return 'Pix Cobrança (Instantâneo)';
    case 'dinheiro':
      return 'Dinheiro em Espécie';
    case 'cartao_credito':
      return 'Cartão de Crédito';
    case 'cartao_debito':
      return 'Cartão de Débito';
    case 'boleto':
      return 'Boleto Bancário';
    case 'crediario':
      return 'Crediário Próprio';
    default:
      return method ? method.toUpperCase() : 'Não informado';
  }
};

export const formatPaymentTermName = (term: string, installments?: number, total?: number): string => {
  let label = term;
  switch (term) {
    case 'a_vista':
    case 'A_VISTA':
    case 'avista':
    case 'vista':
      label = 'À Vista / Imediato';
      break;
    case '15_dias':
    case '15dias':
      label = '15 Dias Direto';
      break;
    case '30_dias':
    case '30dias':
      label = '30 Dias Faturado';
      break;
    case '30_60_dias':
    case '30_60':
      label = '30 / 60 Dias';
      break;
    case '30_60_90_dias':
    case '30_60_90':
      label = '30 / 60 / 90 Dias';
      break;
    case 'parcelado':
      label = 'Parcelado';
      break;
    case 'personalizado':
      label = 'Personalizado / A Combinar';
      break;
    default:
      if (!term || term.trim() === '') {
        label = 'Não informado';
      }
      break;
  }

  if (installments && installments > 1 && total && total > 0) {
    const installmentVal = total / installments;
    return `${label} (${installments}x de ${formatCurrency(installmentVal)})`;
  }

  return label;
};

export const SaleConfirmationModal: React.FC<SaleConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  modality,
  customerName,
  customerDocument,
  customerPhone,
  totalAmount,
  paymentMethod,
  paymentTerm,
  installments = 1,
  itemsCount,
  receivedAmount,
  changeAmount,
  locationName,
  isSubmitting = false,
}) => {
  if (!isOpen) return null;

  const formattedMethod = formatPaymentMethodName(paymentMethod);
  const formattedTerm = formatPaymentTermName(paymentTerm, installments, totalAmount);

  const getMethodIcon = () => {
    switch (paymentMethod) {
      case 'pix':
        return <QrCode size={20} className="text-emerald-600" />;
      case 'dinheiro':
        return <DollarSign size={20} className="text-emerald-600" />;
      case 'cartao_credito':
      case 'cartao_debito':
        return <CreditCard size={20} className="text-blue-600" />;
      case 'boleto':
        return <Barcode size={20} className="text-amber-600" />;
      case 'crediario':
        return <FileText size={20} className="text-purple-600" />;
      default:
        return <CreditCard size={20} className="text-slate-600" />;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sale-confirmation-title"
    >
      <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col my-auto transition-all">
        {/* Top Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-4 sm:p-5 flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shrink-0">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-950/70 px-2 py-0.5 rounded-full border border-emerald-700/60">
                  {modality}
                </span>
                <span className="text-[11px] font-bold text-slate-300">Conferência Final</span>
              </div>
              <h2 id="sale-confirmation-title" className="text-base sm:text-lg font-black tracking-tight text-white mt-0.5">
                Confirmar e Finalizar Venda
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            title="Voltar / Fechar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 space-y-4 text-slate-800 overflow-y-auto max-h-[75vh]">
          {/* Instrução de Conferência */}
          <div className="bg-blue-50/80 border border-blue-200 rounded-2xl p-3 flex items-start gap-2.5">
            <AlertCircle size={18} className="text-blue-600 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-900 leading-relaxed font-medium">
              Por favor, confira atentamente os dados da venda abaixo, <strong>principalmente a Forma e o Prazo de Pagamento</strong>, antes de confirmar a emissão.
            </p>
          </div>

          {/* Card 1: Nome do Cliente */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <User size={14} className="text-slate-600" />
                Nome do Cliente
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600">
                Obrigatório
              </span>
            </div>
            <div className="text-sm sm:text-base font-black text-slate-900 leading-snug">
              {customerName || 'Consumidor Final (Não Identificado)'}
            </div>
            {(customerDocument || customerPhone) && (
              <div className="text-xs text-slate-500 font-medium flex items-center gap-2 flex-wrap">
                {customerDocument && <span>Doc: <strong>{customerDocument}</strong></span>}
                {customerDocument && customerPhone && <span>•</span>}
                {customerPhone && <span>Tel: <strong>{customerPhone}</strong></span>}
              </div>
            )}
          </div>

          {/* Card 2: Valor Total do Pedido */}
          <div className="bg-gradient-to-br from-emerald-50 via-white to-emerald-50/40 border-2 border-emerald-400 rounded-2xl p-4 shadow-xs text-center space-y-1">
            <span className="text-[11px] font-black text-emerald-800 uppercase tracking-wider block">
              Valor Total do Pedido
            </span>
            <div className="text-2xl sm:text-3xl lg:text-4xl font-black font-mono text-emerald-700 tracking-tight">
              {formatCurrency(totalAmount)}
            </div>
            {itemsCount !== undefined && itemsCount > 0 && (
              <div className="text-[11px] text-emerald-800/80 font-semibold flex items-center justify-center gap-1">
                <ShoppingBag size={12} />
                <span>{itemsCount} produto{itemsCount === 1 ? '' : 's'} no pedido</span>
              </div>
            )}
          </div>

          {/* Grid Cards 3 e 4: Forma de Pagamento e Prazo de Pagamento (Destaque Principal Solicitado) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Forma de Pagamento */}
            <div className="bg-slate-50 border-2 border-slate-200 hover:border-blue-400 transition-colors rounded-2xl p-3.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <CreditCard size={14} className="text-blue-600" />
                  Forma de Pagto
                </span>
                <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 border border-blue-200">
                  OBRIGATÓRIO
                </span>
              </div>
              <div className="flex items-center gap-2 pt-0.5">
                <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-2xs">
                  {getMethodIcon()}
                </div>
                <div className="min-w-0">
                  <div className="text-xs sm:text-sm font-black text-slate-900 leading-snug truncate">
                    {formattedMethod}
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium">
                    Meio selecionado
                  </div>
                </div>
              </div>
            </div>

            {/* Prazo de Pagamento */}
            <div className="bg-slate-50 border-2 border-slate-200 hover:border-amber-400 transition-colors rounded-2xl p-3.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock size={14} className="text-amber-600" />
                  Prazo de Pagto
                </span>
                <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-200">
                  OBRIGATÓRIO
                </span>
              </div>
              <div className="flex items-center gap-2 pt-0.5">
                <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-2xs text-amber-600 font-bold">
                  <Clock size={18} />
                </div>
                <div className="min-w-0">
                  <div className="text-xs sm:text-sm font-black text-slate-900 leading-snug">
                    {formattedTerm}
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium">
                    Condição de vencimento
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Troco no PDV (se dinheiro em espécie com valor recebido informado) */}
          {paymentMethod === 'dinheiro' && receivedAmount !== undefined && receivedAmount > 0 && (
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-3 flex items-center justify-between text-xs">
              <div className="space-y-0.5">
                <span className="text-[11px] font-bold text-slate-600 block">Dinheiro Recebido:</span>
                <span className="text-sm font-black text-slate-900 font-mono">{formatCurrency(receivedAmount)}</span>
              </div>
              <div className="text-right space-y-0.5">
                <span className="text-[11px] font-extrabold text-emerald-800 block uppercase">Troco a Devolver:</span>
                <span className="text-base font-black text-emerald-700 font-mono">
                  {formatCurrency(changeAmount || 0)}
                </span>
              </div>
            </div>
          )}

          {/* Local de Estoque (se informado) */}
          {locationName && (
            <div className="text-[11px] text-slate-500 flex items-center justify-between px-1">
              <span className="flex items-center gap-1 font-medium">
                <Warehouse size={13} className="text-slate-400" />
                Estoque / Depósito de Saída:
              </span>
              <strong className="text-slate-700 font-bold">{locationName}</strong>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center gap-2.5 sm:gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-full sm:w-1/2 py-3 px-4 rounded-xl border-2 border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-100 text-slate-700 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
          >
            <ArrowLeft size={16} />
            <span>Voltar e Corrigir</span>
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="w-full sm:w-1/2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md hover:shadow-lg disabled:opacity-50"
          >
            <CheckCircle2 size={18} />
            <span>{isSubmitting ? 'Finalizando...' : 'Confirmar e Finalizar'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
