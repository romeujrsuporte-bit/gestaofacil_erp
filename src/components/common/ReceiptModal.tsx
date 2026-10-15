import React, { useState } from 'react';
import {
  Printer,
  Share2,
  X,
  Check,
  MessageSquare,
  FileText,
  FileCheck,
  Building2,
  MapPin,
  Phone,
  Mail,
  User as UserIcon,
  Calendar,
  CreditCard,
  Truck,
  Scissors
} from 'lucide-react';
import { Order, Company } from '../../types';
import { formatCurrency, formatQuantity } from '../../services/pricingEngine';
import { Database } from '../../services/db';
import { GestaoFacilLogo } from './AppLogo';

interface ReceiptModalProps {
  order: Order;
  company: Company;
  isOpen: boolean;
  onClose: () => void;
  initialFormat?: 'a4' | 'thermal';
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  order,
  company,
  isOpen,
  onClose,
  initialFormat,
}) => {
  const [copied, setCopied] = useState(false);
  const printerConfig = Database.getPrinterConfig();

  // Define formato padrão: se veio como prop, usa ela; senão usa configuração padrão por módulo
  const [printFormat, setPrintFormat] = useState<'a4' | 'thermal'>(() => {
    if (initialFormat) return initialFormat;
    if (order.origin === 'externa_celular') {
      return printerConfig.defaultExternalSalesFormat || 'a4';
    }
    if (order.origin === 'pdv') {
      return printerConfig.defaultPosFormat || 'thermal';
    }
    return printerConfig.defaultSalesOrderFormat || 'a4';
  });

  if (!isOpen) return null;

  // Busca dados adicionais do cliente no banco se houver
  const customerDetails = order.customerId
    ? Database.getState().customers.find((c) => c.id === order.customerId)
    : null;

  const handlePrint = () => {
    window.print();
  };

  const getWhatsAppText = () => {
    const isQuote = order.type === 'orcamento';
    const printableSubtotal = order.items.reduce((s, itm) => {
      const effUnit =
        itm.additionValue && itm.additionValue > 0
          ? (itm.totalPrice + (itm.discountValue || 0)) / (itm.quantity || 1)
          : itm.unitPrice;
      return s + effUnit * itm.quantity;
    }, 0);

    let text = `*${company.tradeName || company.name}*\n`;
    text += `${isQuote ? 'ORÇAMENTO COMERCIAL' : 'COMPROVANTE DE VENDA'} Nº: ${order.number}\n`;
    text += `Data: ${new Date(order.createdAt).toLocaleString('pt-BR')}\n`;
    text += `Vendedor: ${order.userName}\n`;
    text += `Cliente: ${order.customerName}\n`;
    text += `--------------------------------\n`;
    text += `ITENS:\n`;
    order.items.forEach((item, i) => {
      const effectiveUnitPrice =
        item.additionValue && item.additionValue > 0
          ? (item.totalPrice + (item.discountValue || 0)) / (item.quantity || 1)
          : item.unitPrice;
      text += `${i + 1}. ${item.description}\n   ${formatQuantity(item.quantity)} ${item.unit} x ${formatCurrency(
        effectiveUnitPrice
      )}${item.discountValue > 0 ? ` (-${formatCurrency(item.discountValue)})` : ''} = ${formatCurrency(
        item.totalPrice
      )}\n`;
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
    text += `\n\n_Documento emitido pelo GestãoFácil ERP_`;
    return encodeURIComponent(text);
  };

  const handleWhatsAppShare = () => {
    const text = getWhatsAppText();
    const phone = (order.customerPhone || customerDetails?.phone || customerDetails?.whatsapp || '').replace(/\D/g, '');
    const url = phone ? `https://wa.me/55${phone}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(url, '_blank');
  };

  const handleCopyText = () => {
    const rawText = decodeURIComponent(getWhatsAppText());
    navigator.clipboard.writeText(rawText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isQuote = order.type === 'orcamento';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      {/* CSS para Impressão Perfeita em Folha A4 ou Cupom Térmico */}
      <style>{`
        @media print {
          @page {
            size: ${printFormat === 'a4' ? 'A4 portrait' : 'auto'};
            margin: ${printFormat === 'a4' ? '10mm 12mm 12mm 12mm' : '0mm'};
          }
          body * {
            visibility: hidden !important;
          }
          .printable-document-container, .printable-document-container * {
            visibility: visible !important;
          }
          .printable-document-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div
        className={`bg-white rounded-2xl shadow-2xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh] ${
          printFormat === 'a4' ? 'max-w-4xl' : 'max-w-md'
        }`}
      >
        {/* CABEÇALHO DO MODAL COM SELETOR DE FORMATO (A4 VS TÉRMICA) */}
        <div className="bg-slate-900 text-white px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 shrink-0 no-print">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <Printer size={16} />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base leading-tight">
                {isQuote ? 'Orçamento / Proposta Comercial' : 'Pedido de Venda / Comprovante'}
              </h3>
              <span className="text-[11px] text-slate-400 font-mono">
                Nº {order.number} • {new Date(order.createdAt).toLocaleDateString('pt-BR')}
              </span>
            </div>
          </div>

          {/* Seletor de Formato: Folha A4 vs Cupom 80mm */}
          <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs font-bold">
            <button
              type="button"
              onClick={() => setPrintFormat('a4')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                printFormat === 'a4'
                  ? 'bg-blue-600 text-white shadow-sm font-extrabold'
                  : 'text-slate-300 hover:text-white'
              }`}
              title="Layout completo em Folha A4 para clientes, contratos e conferência"
            >
              <FileText size={14} />
              <span>Folha A4 Oficial</span>
            </button>
            <button
              type="button"
              onClick={() => setPrintFormat('thermal')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                printFormat === 'thermal'
                  ? 'bg-blue-600 text-white shadow-sm font-extrabold'
                  : 'text-slate-300 hover:text-white'
              }`}
              title={`Layout compacto para impressora térmica de bobina (${printerConfig.paperWidth})`}
            >
              <Printer size={14} />
              <span>Cupom Térmico ({printerConfig.paperWidth})</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title="Fechar janela"
          >
            <X size={20} />
          </button>
        </div>

        {/* ÁREA DE VISUALIZAÇÃO E IMPRESSÃO */}
        <div className="flex-1 p-3 sm:p-6 bg-slate-100/80 overflow-y-auto flex justify-center">
          {printFormat === 'a4' ? (
            /* ========================================================= */
            /* LAYOUT EXECUTIVO EM FOLHA A4                              */
            /* ========================================================= */
            <div
              id="printable-a4-order"
              className="printable-document-container w-full max-w-[794px] bg-white p-6 sm:p-8 rounded-xl shadow-md border border-slate-200 text-slate-800 text-xs leading-normal select-text space-y-4"
            >
              {/* 1. CANHOTO DE RECEBIMENTO DESTACÁVEL (SE CONFIGURADO) */}
              {printerConfig.a4ShowReceiptStub !== false && (
                <div className="pb-3 border-b-2 border-dashed border-slate-300 text-[10px] space-y-1.5">
                  <div className="flex justify-between items-center text-slate-500 font-semibold">
                    <span className="flex items-center gap-1 uppercase tracking-wider text-blue-900 font-bold">
                      <Scissors size={12} className="text-slate-400" />
                      Canhoto de Recebimento de Mercadorias (Destaque Aqui)
                    </span>
                    <span className="font-mono font-bold text-slate-700">PEDIDO Nº: {order.number}</span>
                  </div>
                  <p className="text-slate-600 text-[10px] leading-tight">
                    Recebi(emos) de <strong>{company.tradeName || company.name}</strong> os produtos constantes no presente {isQuote ? 'Orçamento' : 'Pedido de Venda'}, em perfeitas condições e conformidade com as especificações solicitadas.
                  </p>
                  <div className="grid grid-cols-12 gap-3 pt-1">
                    <div className="col-span-3 border-b border-slate-400 pb-0.5">
                      <span className="text-[9px] text-slate-400 block">Data de Recebimento:</span>
                      <span className="font-mono text-slate-700">___/___/______</span>
                    </div>
                    <div className="col-span-5 border-b border-slate-400 pb-0.5">
                      <span className="text-[9px] text-slate-400 block">Nome Legível do Recebedor:</span>
                      <span className="text-slate-400 text-[9px] italic">_________________________________</span>
                    </div>
                    <div className="col-span-4 border-b border-slate-400 pb-0.5">
                      <span className="text-[9px] text-slate-400 block">Assinatura / RG do Recebedor:</span>
                      <span className="text-slate-400 text-[9px] italic">_______________________</span>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. CABEÇALHO TIMBRADO DA EMPRESA */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-200">
                <div className="flex items-start gap-3">
                  <GestaoFacilLogo size={44} showSlogan={false} />
                  <div>
                    <h1 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-tight">
                      {company.tradeName || company.name}
                    </h1>
                    {company.name !== company.tradeName && (
                      <p className="text-[11px] text-slate-600 font-medium">{company.name}</p>
                    )}
                    <div className="text-[10px] text-slate-500 mt-0.5 space-y-0.5">
                      <p>
                        CNPJ: <strong className="font-mono text-slate-700">{company.cnpjCpf}</strong>
                        {(company as any).ie && <span> • IE: <strong className="font-mono text-slate-700">{(company as any).ie}</strong></span>}
                      </p>
                      <p>
                        {company.address.street}, {company.address.number}
                        {company.address.neighborhood && ` - ${company.address.neighborhood}`} • {company.address.city}/{company.address.state} • CEP {company.address.zipCode}
                      </p>
                      <p>
                        {company.phone && <span>Tel: <strong>{company.phone}</strong></span>}
                        {company.email && <span> • E-mail: <strong>{company.email}</strong></span>}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Bloco de Identificação do Documento */}
                <div className="text-right sm:border-l sm:border-slate-200 sm:pl-4 space-y-0.5 shrink-0">
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-900 border border-blue-200">
                    {isQuote ? 'Orçamento Comercial' : 'Pedido de Venda'}
                  </span>
                  <div className="text-lg font-black font-mono text-slate-900">
                    Nº {order.number}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Emissão: <strong className="text-slate-700 font-mono">{new Date(order.createdAt).toLocaleString('pt-BR')}</strong>
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Status: <strong className="uppercase text-emerald-700">{order.status}</strong>
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Vendedor: <strong className="text-slate-800">{order.userName}</strong>
                  </div>
                </div>
              </div>

              {/* 3. DADOS DO CLIENTE & ENTREGA */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                <div className="text-[11px] font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5 pb-1 border-b border-slate-200">
                  <UserIcon size={13} className="text-blue-600" />
                  <span>Dados do Cliente & Destinatário</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-[11px]">
                  <div className="sm:col-span-8">
                    <span className="text-slate-400 block text-[10px]">Cliente / Razão Social:</span>
                    <strong className="text-slate-800 text-xs">{order.customerName}</strong>
                  </div>
                  <div className="sm:col-span-4">
                    <span className="text-slate-400 block text-[10px]">CPF / CNPJ:</span>
                    <strong className="font-mono text-slate-700">{order.customerCpfCnpj || customerDetails?.cpfCnpj || 'Não informado'}</strong>
                  </div>

                  <div className="sm:col-span-6">
                    <span className="text-slate-400 block text-[10px]">Endereço de Entrega:</span>
                    <span className="text-slate-700">
                      {customerDetails?.street
                        ? `${customerDetails.street}, ${customerDetails.number || 'S/N'}${customerDetails.neighborhood ? ` - ${customerDetails.neighborhood}` : ''}`
                        : 'Balcão / A retirar'}
                    </span>
                  </div>
                  <div className="sm:col-span-3">
                    <span className="text-slate-400 block text-[10px]">Cidade/UF:</span>
                    <span className="text-slate-700">{customerDetails ? `${customerDetails.city}/${customerDetails.state}` : '-'}</span>
                  </div>
                  <div className="sm:col-span-3">
                    <span className="text-slate-400 block text-[10px]">Telefone / WhatsApp:</span>
                    <span className="font-mono text-slate-700">{order.customerPhone || customerDetails?.phone || customerDetails?.whatsapp || '-'}</span>
                  </div>

                  {customerDetails?.deliveryRouteName && (
                    <div className="sm:col-span-12 flex items-center gap-2 pt-1 text-[10px] text-blue-900 bg-blue-50/60 p-1.5 rounded-lg border border-blue-100">
                      <Truck size={13} className="text-blue-600 shrink-0" />
                      <span>Rota de Entrega: <strong>{customerDetails.deliveryRouteName}</strong> {customerDetails.marketArea && `• Praça: ${customerDetails.marketArea}`}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 4. TABELA DE PRODUTOS / ITENS DO PEDIDO */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-slate-900 text-white font-extrabold text-[10px] uppercase tracking-wider">
                      <th className="py-2 px-2.5 text-center w-10">#</th>
                      <th className="py-2 px-2.5 w-20">Código</th>
                      <th className="py-2 px-2.5">Descrição do Produto</th>
                      <th className="py-2 px-2 text-center w-12">UN</th>
                      <th className="py-2 px-2.5 text-right w-16">Qtd</th>
                      <th className="py-2 px-2.5 text-right w-24">Unitário</th>
                      <th className="py-2 px-2 text-right w-20">Desconto</th>
                      <th className="py-2 px-3 text-right w-24">Total Líquido</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {order.items.map((item, idx) => {
                      const effectiveUnitPrice =
                        item.additionValue && item.additionValue > 0
                          ? (item.totalPrice + (item.discountValue || 0)) / (item.quantity || 1)
                          : item.unitPrice;

                      return (
                        <tr key={item.id || idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                          <td className="py-1.5 px-2.5 text-center text-slate-400 font-mono text-[10px]">{idx + 1}</td>
                          <td className="py-1.5 px-2.5 font-mono font-bold text-slate-600 text-[10px]">{item.productCode || '-'}</td>
                          <td className="py-1.5 px-2.5 font-medium text-slate-800">{item.description}</td>
                          <td className="py-1.5 px-2 text-center text-slate-500 font-semibold">{item.unit}</td>
                          <td className="py-1.5 px-2.5 text-right font-bold text-slate-900 font-mono">{formatQuantity(item.quantity)}</td>
                          <td className="py-1.5 px-2.5 text-right font-mono text-slate-600">{formatCurrency(effectiveUnitPrice)}</td>
                          <td className="py-1.5 px-2 text-right font-mono text-rose-600">
                            {item.discountValue > 0 ? `-${formatCurrency(item.discountValue)}` : '-'}
                          </td>
                          <td className="py-1.5 px-3 text-right font-bold font-mono text-slate-900">{formatCurrency(item.totalPrice)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* 5. TOTAIS FINANCEIROS & CONDIÇÃO DE PAGAMENTO */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-start">
                {/* Coluna Esquerda: Forma e Condições de Pagamento */}
                <div className="sm:col-span-7 bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2 text-[11px]">
                  <div className="font-bold text-slate-700 flex items-center gap-1.5 border-b border-slate-200 pb-1">
                    <CreditCard size={14} className="text-blue-600" />
                    <span>Condições Comerciais & Pagamento</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-slate-400 text-[10px] block">Forma de Pagamento:</span>
                      <strong className="text-slate-800 uppercase">{order.paymentMethod}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Condição:</span>
                      <strong className="text-slate-800">
                        {order.installmentsCount > 1 ? `${order.installmentsCount}x Parcelado` : 'À Vista'}
                      </strong>
                    </div>
                  </div>

                  {order.notes && (
                    <div className="pt-1.5 border-t border-slate-200">
                      <span className="text-slate-400 text-[10px] block font-semibold">Observações do Pedido:</span>
                      <p className="text-slate-700 text-[10px] italic">{order.notes}</p>
                    </div>
                  )}
                </div>

                {/* Coluna Direita: Resumo Financeiro Consolidado */}
                <div className="sm:col-span-5 bg-slate-900 text-white rounded-xl p-3.5 space-y-1.5 text-xs shadow-sm">
                  <div className="flex justify-between text-slate-300 text-[11px]">
                    <span>Subtotal dos Itens:</span>
                    <span className="font-mono">{formatCurrency(order.subtotal)}</span>
                  </div>
                  {order.discountTotal > 0 && (
                    <div className="flex justify-between text-rose-300 text-[11px]">
                      <span>Desconto Total:</span>
                      <span className="font-mono">-{formatCurrency(order.discountTotal)}</span>
                    </div>
                  )}
                  {(order as any).freightTotal > 0 && (
                    <div className="flex justify-between text-slate-300 text-[11px]">
                      <span>Frete / Entrega:</span>
                      <span className="font-mono">+{formatCurrency((order as any).freightTotal)}</span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-slate-700 flex justify-between items-center text-sm font-black">
                    <span className="uppercase text-amber-400">Total Geral:</span>
                    <span className="text-base text-emerald-400 font-mono">{formatCurrency(order.total)}</span>
                  </div>
                </div>
              </div>

              {/* 6. TERMOS E CONDIÇÕES LEGAIS (A4) */}
              {printerConfig.a4ShowCommercialTerms !== false && (
                <div className="pt-2 border-t border-slate-200 text-[9px] text-slate-500 space-y-0.5 leading-tight">
                  <p className="font-bold text-slate-700">Termos e Condições Comerciais:</p>
                  <p>
                    {printerConfig.a4CommercialTermsText ||
                      'Orçamento/Pedido válido por 10 dias úteis. As mercadorias devem ser conferidas no ato da entrega. Não aceitamos devoluções de produtos abertos ou avariados após assinatura do canhoto.'}
                  </p>
                </div>
              )}

              {/* 7. ASSINATURA DA EMPRESA E CLIENTE NO RODAPÉ */}
              {printerConfig.a4ShowSignatures !== false && (
                <div className="grid grid-cols-2 gap-8 pt-6 pb-2 text-center text-[10px]">
                  <div className="border-t border-slate-400 pt-1">
                    <span className="font-bold text-slate-800 block">{company.tradeName || company.name}</span>
                    <span className="text-slate-500">Vendedor: {order.userName}</span>
                  </div>
                  <div className="border-t border-slate-400 pt-1">
                    <span className="font-bold text-slate-800 block">{order.customerName}</span>
                    <span className="text-slate-500">Assinatura do Cliente / Comprador</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ========================================================= */
            /* LAYOUT CUPOM TÉRMICO (80MM / 58MM)                        */
            /* ========================================================= */
            <div
              id="printable-receipt"
              style={{
                '--receipt-width': printerConfig.paperWidth,
                '--receipt-margin-left': `${printerConfig.marginLeft}mm`,
                '--receipt-margin-right': `${printerConfig.marginRight}mm`,
                '--receipt-font-size':
                  printerConfig.fontSize === 'pequena'
                    ? '10px'
                    : printerConfig.fontSize === 'grande'
                    ? '12px'
                    : '11px',
                width: '100%',
                maxWidth: printerConfig.paperWidth === '58mm' ? '255px' : '330px',
                paddingLeft: `${Math.round(printerConfig.marginLeft * 3.8) + 8}px`,
                paddingRight: `${Math.round(printerConfig.marginRight * 3.8) + 8}px`,
                boxSizing: 'border-box',
              } as React.CSSProperties}
              className="printable-document-container w-full bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-slate-800 font-mono text-xs leading-relaxed"
            >
              {/* Cabeçalho da Empresa Dinâmico */}
              <div
                className={`pb-3 border-b border-dashed border-slate-300 ${
                  printerConfig.headerAlignment === 'left' ? 'text-left' : 'text-center'
                }`}
              >
                {printerConfig.showTradeName && (
                  <div className="font-bold text-sm tracking-wide">{company.tradeName || company.name}</div>
                )}
                {printerConfig.headerFormat === 'completo' && company.name !== company.tradeName && (
                  <div className="text-[10px] text-slate-600 truncate">{company.name}</div>
                )}
                {printerConfig.showCnpj && (
                  <div className="text-[11px] text-slate-500">CNPJ: {company.cnpjCpf}</div>
                )}
                {printerConfig.showPhone && company.phone && (
                  <div className="text-[11px] text-slate-500">Tel: {company.phone}</div>
                )}
                {printerConfig.showAddress && printerConfig.headerFormat === 'completo' && (
                  <div className="text-[10px] text-slate-400">
                    {company.address.street}, {company.address.number} - {company.address.city}/{company.address.state}
                  </div>
                )}
                {printerConfig.customHeaderText && (
                  <div className="text-[10px] font-bold text-slate-700 pt-1">{printerConfig.customHeaderText}</div>
                )}
              </div>

              {/* Dados do Pedido */}
              <div className="py-2.5 border-b border-dashed border-slate-300 space-y-0.5 text-[11px]">
                <div className="flex justify-between font-bold">
                  <span>{isQuote ? 'ORÇAMENTO' : 'VENDA'}: {order.number}</span>
                  <span>{new Date(order.createdAt).toLocaleDateString('pt-BR')}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>
                    Origem:{' '}
                    {order.origin === 'pdv'
                      ? 'PDV Balcão'
                      : order.origin === 'externa_celular'
                      ? 'Venda Externa Mobile'
                      : 'Balcão'}
                  </span>
                  <span>{new Date(order.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="text-slate-600">
                  Vendedor: <span className="font-semibold">{order.userName}</span>
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
                    const effectiveUnitPrice =
                      item.additionValue && item.additionValue > 0
                        ? (item.totalPrice + (item.discountValue || 0)) / (item.quantity || 1)
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
              <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal Itens:</span>
                  <span>{formatCurrency(order.subtotal)}</span>
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
              </div>

              {/* Rodapé Comercial */}
              <div className="pt-3 text-center text-[10px] text-slate-400 whitespace-pre-line leading-relaxed">
                {printerConfig.footerMessage || '*** DOCUMENTO NÃO FISCAL ***\nObrigado pela preferência e confiança!'}
              </div>
            </div>
          )}
        </div>

        {/* BARRA INFERIOR DE AÇÕES E BOTÕES DE IMPRESSÃO */}
        <div className="p-4 bg-white border-t border-slate-200 flex flex-wrap gap-2 justify-between items-center no-print shrink-0">
          <button
            type="button"
            onClick={handleCopyText}
            className="flex items-center gap-1.5 text-xs text-slate-700 hover:text-slate-900 border border-slate-300 hover:bg-slate-100 px-3.5 py-2 rounded-xl font-bold transition-colors cursor-pointer"
          >
            {copied ? <Check size={15} className="text-emerald-600" /> : <MessageSquare size={15} />}
            <span>{copied ? 'Copiado!' : 'Copiar Texto'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleWhatsAppShare}
              className="flex items-center gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-bold shadow-xs transition-colors cursor-pointer"
              title="Compartilhar resumo comercial via WhatsApp"
            >
              <Share2 size={15} />
              <span>Enviar WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-extrabold shadow-md shadow-blue-500/20 transition-all cursor-pointer"
              title={`Imprimir no formato ${printFormat === 'a4' ? 'Folha A4' : 'Cupom Térmico'}`}
            >
              <Printer size={16} />
              <span>Imprimir {printFormat === 'a4' ? 'Folha A4' : 'Cupom Térmico'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
