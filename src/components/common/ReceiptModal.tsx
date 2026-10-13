import React from 'react';
import { Printer, Share2, X, Check, MessageSquare } from 'lucide-react';
import { Order, Company } from '../../types';
import { formatCurrency, formatQuantity } from '../../services/pricingEngine';
import { Database } from '../../services/db';

interface ReceiptModalProps {
  order: Order;
  company: Company;
  isOpen: boolean;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  order,
  company,
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = React.useState(false);
  const printerConfig = Database.getPrinterConfig();

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const getWhatsAppText = () => {
    const isQuote = order.type === 'orcamento';
    const printableSubtotal = order.items.reduce((s, itm) => {
      const effUnit = (itm.additionValue && itm.additionValue > 0)
        ? ((itm.totalPrice + (itm.discountValue || 0)) / (itm.quantity || 1))
        : itm.unitPrice;
      return s + (effUnit * itm.quantity);
    }, 0);

    let text = `*${company.tradeName || company.name}*\n`;
    text += `${isQuote ? 'ORÇAMENTO COMERCIAL' : 'COMPROVANTE DE VENDA'} Nº: ${order.number}\n`;
    text += `Data: ${new Date(order.createdAt).toLocaleString('pt-BR')}\n`;
    text += `Vendedor: ${order.userName}\n`;
    text += `Cliente: ${order.customerName}\n`;
    text += `--------------------------------\n`;
    text += `ITENS:\n`;
    order.items.forEach((item, i) => {
      const effectiveUnitPrice = (item.additionValue && item.additionValue > 0)
        ? ((item.totalPrice + (item.discountValue || 0)) / (item.quantity || 1))
        : item.unitPrice;
      text += `${i + 1}. ${item.description}\n   ${formatQuantity(item.quantity)} ${item.unit} x ${formatCurrency(effectiveUnitPrice)}${item.discountValue > 0 ? ` (-${formatCurrency(item.discountValue)})` : ''} = ${formatCurrency(item.totalPrice)}\n`;
    });
    text += `--------------------------------\n`;
    text += `Subtotal: ${formatCurrency(printableSubtotal || order.subtotal)}\n`;
    if (order.discountTotal > 0) {
      text += `Desconto: -${formatCurrency(order.discountTotal)}\n`;
    }
    text += `*TOTAL: ${formatCurrency(order.total)}*\n`;
    text += `Pagamento: ${order.paymentMethod.toUpperCase()}`;
    if (order.installmentsCount > 1) {
      text += ` (${order.installmentsCount}x)`;
    }
    text += `\n\n_Documento não fiscal gerado pelo GestãoFácil ERP_`;
    return encodeURIComponent(text);
  };

  const handleWhatsAppShare = () => {
    const text = getWhatsAppText();
    const phone = order.customerPhone?.replace(/\D/g, '') || '';
    const url = phone ? `https://wa.me/55${phone}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(url, '_blank');
  };

  const handleCopyText = () => {
    const rawText = decodeURIComponent(getWhatsAppText());
    navigator.clipboard.writeText(rawText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className={`bg-white rounded-2xl shadow-2xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 ${
        printerConfig.paperWidth === '58mm' ? 'max-w-sm' : 'max-w-md'
      }`}>
        {/* Header do Modal */}
        <div className="bg-slate-800 text-white px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Printer size={18} className="text-emerald-400" />
            <h3 className="font-bold text-sm">
              {order.type === 'orcamento' ? 'Orçamento Comercial' : 'Comprovante de Venda'}
            </h3>
            <span className="text-[10px] bg-slate-700 text-slate-300 font-mono px-2 py-0.5 rounded-full border border-slate-600">
              {printerConfig.paperWidth}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg"
          >
            <X size={18} />
          </button>
        </div>

        {/* Área Visual / Imprimível do Cupom Térmico */}
        <div className="p-6 bg-slate-50 flex justify-center max-h-[65vh] overflow-y-auto">
          <div
            id="printable-receipt"
            style={{
              '--receipt-width': printerConfig.paperWidth,
              '--receipt-margin-left': `${printerConfig.marginLeft}mm`,
              '--receipt-margin-right': `${printerConfig.marginRight}mm`,
              '--receipt-font-size': printerConfig.fontSize === 'pequena' ? '10px' : printerConfig.fontSize === 'grande' ? '12px' : '11px',
              width: '100%',
              maxWidth: printerConfig.paperWidth === '58mm' ? '255px' : '330px',
              paddingLeft: `${Math.round(printerConfig.marginLeft * 3.8) + 8}px`,
              paddingRight: `${Math.round(printerConfig.marginRight * 3.8) + 8}px`,
              boxSizing: 'border-box',
            } as React.CSSProperties}
            className="w-full bg-white p-4 rounded-xl border border-slate-200 shadow-xs text-slate-800 font-mono text-xs leading-relaxed"
          >
            {/* Cabeçalho da Empresa Dinâmico Conforme Configuração */}
            <div className={`pb-3 border-b border-dashed border-slate-300 ${
              printerConfig.headerAlignment === 'left' ? 'text-left' : 'text-center'
            }`}>
              {printerConfig.showTradeName && (
                <div className="font-bold text-sm tracking-wide">
                  {company.tradeName || company.name}
                </div>
              )}
              {printerConfig.headerFormat === 'completo' && company.name !== company.tradeName && (
                <div className="text-[10px] text-slate-600 truncate">
                  {company.name}
                </div>
              )}
              {printerConfig.showCnpj && (
                <div className="text-[11px] text-slate-500">
                  CNPJ: {company.cnpjCpf}
                </div>
              )}
              {printerConfig.showPhone && company.phone && (
                <div className="text-[11px] text-slate-500">
                  Tel: {company.phone}
                </div>
              )}
              {printerConfig.showAddress && printerConfig.headerFormat === 'completo' && (
                <div className="text-[10px] text-slate-400">
                  {company.address.street}, {company.address.number} - {company.address.city}/{company.address.state}
                </div>
              )}
              {printerConfig.customHeaderText && (
                <div className="text-[10px] font-bold text-slate-700 pt-1">
                  {printerConfig.customHeaderText}
                </div>
              )}
            </div>

            {/* Dados do Pedido */}
            <div className="py-2.5 border-b border-dashed border-slate-300 space-y-0.5 text-[11px]">
              <div className="flex justify-between font-bold">
                <span>{order.type === 'orcamento' ? 'ORÇAMENTO' : 'VENDA'}: {order.number}</span>
                <span>{new Date(order.createdAt).toLocaleDateString('pt-BR')}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Origem: {order.origin === 'pdv' ? 'PDV Balcão' : order.origin === 'externa_celular' ? 'Venda Externa' : 'Balcão'}</span>
                <span>{new Date(order.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="text-slate-600">
                Atendente: <span className="font-semibold">{order.userName}</span>
              </div>
              <div className="text-slate-600 truncate">
                Cliente: <span className="font-semibold">{order.customerName}</span>
              </div>
            </div>

            {/* Tabela de Itens */}
            <div className="py-2.5 border-b border-dashed border-slate-300">
              <div className="text-[10px] font-bold text-slate-500 uppercase flex justify-between mb-1">
                <span>QTD x ITEM</span>
                <span>TOTAL</span>
              </div>
              <div className="space-y-1.5">
                {order.items.map((item, idx) => {
                  const effectiveUnitPrice = (item.additionValue && item.additionValue > 0)
                    ? ((item.totalPrice + (item.discountValue || 0)) / (item.quantity || 1))
                    : item.unitPrice;
                  return (
                    <div key={item.id || idx} className="text-[11px]">
                      <div className="font-semibold text-slate-800">{item.description}</div>
                      <div className="flex justify-between text-slate-500">
                        <span>
                          {formatQuantity(item.quantity)} {item.unit} x {formatCurrency(effectiveUnitPrice)}
                          {item.discountValue > 0 && ` (-${formatCurrency(item.discountValue)})`}
                        </span>
                        <span className="font-medium text-slate-800">{formatCurrency(item.totalPrice)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Totais */}
            {(() => {
              const printableSubtotal = order.items.reduce((s, itm) => {
                const effUnit = (itm.additionValue && itm.additionValue > 0)
                  ? ((itm.totalPrice + (itm.discountValue || 0)) / (itm.quantity || 1))
                  : itm.unitPrice;
                return s + (effUnit * itm.quantity);
              }, 0);

              return (
                <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal Itens:</span>
                    <span>{formatCurrency(printableSubtotal || order.subtotal)}</span>
                  </div>
                  {order.discountTotal > 0 && (
                    <div className="flex justify-between text-rose-600 font-medium">
                      <span>Descontos:</span>
                      <span>-{formatCurrency(order.discountTotal)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-sm pt-1 border-t border-slate-200">
                    <span>VALOR TOTAL:</span>
                    <span>{formatCurrency(order.total)}</span>
                  </div>
                </div>
              );
            })()}

            {/* Pagamento */}
            <div className="py-2.5 border-b border-dashed border-slate-300 space-y-0.5 text-[11px]">
              <div className="flex justify-between">
                <span>Forma de Pagto:</span>
                <span className="font-bold uppercase">{order.paymentMethod}</span>
              </div>
              {order.installmentsCount > 1 && (
                <div className="flex justify-between text-slate-500">
                  <span>Condição:</span>
                  <span>{order.installmentsCount}x parcelado</span>
                </div>
              )}
              {order.receivedAmount > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Valor Recebido:</span>
                  <span>{formatCurrency(order.receivedAmount)}</span>
                </div>
              )}
              {order.changeAmount > 0 && (
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span>Troco:</span>
                  <span>{formatCurrency(order.changeAmount)}</span>
                </div>
              )}
            </div>

            {/* Rodapé Comercial Conforme Configuração */}
            <div className="pt-3 text-center text-[10px] text-slate-400 whitespace-pre-line leading-relaxed">
              {printerConfig.footerMessage || '*** DOCUMENTO NÃO FISCAL ***\nObrigado pela preferência e confiança!'}
            </div>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="p-4 bg-white border-t border-slate-200 flex flex-wrap gap-2 justify-between items-center">
          <button
            onClick={handleCopyText}
            className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-800 border border-slate-200 hover:bg-slate-100 px-3 py-2 rounded-lg font-medium transition-colors"
          >
            {copied ? <Check size={15} className="text-emerald-500" /> : <MessageSquare size={15} />}
            <span>{copied ? 'Copiado!' : 'Copiar Texto'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleWhatsAppShare}
              className="flex items-center gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-lg font-semibold shadow-xs transition-colors"
            >
              <Share2 size={15} />
              <span>WhatsApp</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-lg font-semibold shadow-xs transition-colors"
            >
              <Printer size={15} />
              <span>Imprimir</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
