import React, { useState } from 'react';
import {
  Printer,
  X,
  FileText,
  Boxes,
  Truck,
  DollarSign,
  Users,
  CheckCircle2,
  Calendar,
  Building2,
  MapPin,
  ClipboardList,
  AlertCircle,
  Smartphone,
  Wallet,
  Award,
  Layers,
  Scissors,
  Check
} from 'lucide-react';
import { Database } from '../../services/db';
import { formatCurrency, formatQuantity } from '../../services/pricingEngine';
import { GestaoFacilLogo } from '../common/AppLogo';

export type A4ReportType =
  | 'pedido_modelo'
  | 'venda_mobile_modelo'
  | 'op_modelo'
  | 'fechamento_caixa'
  | 'inventario'
  | 'financeiro'
  | 'cliente'
  | 'romaneio_modelo'
  | 'comissoes_vendedores';

interface A4ReportsPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportType: A4ReportType;
}

export const A4ReportsPreviewModal: React.FC<A4ReportsPreviewModalProps> = ({
  isOpen,
  onClose,
  reportType: initialReportType,
}) => {
  const [reportType, setReportType] = useState<A4ReportType>(initialReportType);
  const company = Database.getCurrentCompany();
  const state = Database.getState();
  const printerConfig = Database.getPrinterConfig();

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const todayStr = new Date().toLocaleDateString('pt-BR');
  const nowTimeStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  // 1. Dados de Pedidos de Venda
  const sampleOrder = state.orders?.find((o) => o.type === 'venda' && o.status !== 'cancelado') || {
    id: 'ord-sample',
    number: 'PV-2026-00128',
    companyId: company.id,
    userId: 'usr-admin',
    userName: 'Carlos Silva (Vendedor)',
    customerId: 'cli-sample',
    customerName: 'Supermercado Central de Alimentos Ltda',
    customerCpfCnpj: '45.678.901/0001-23',
    customerPhone: '(11) 3322-1100',
    type: 'venda',
    origin: 'pedido_venda',
    status: 'faturado',
    items: [
      {
        id: 'itm-1',
        productId: 'prod-1',
        productCode: 'DET-001',
        code: 'DET-001',
        description: 'Detergente Concentrado Neutro 5L',
        quantity: 10,
        unit: 'UN' as const,
        unitPrice: 24.5,
        discountPercent: 0,
        discountValue: 0,
        additionValue: 0,
        totalPrice: 245.0,
        unitCost: 12.0,
        locationId: 'loc-1',
      },
      {
        id: 'itm-2',
        productId: 'prod-2',
        productCode: 'DES-002',
        code: 'DES-002',
        description: 'Desinfetante Floral Antibacteriano 2L',
        quantity: 15,
        unit: 'UN' as const,
        unitPrice: 14.9,
        discountPercent: 5.7,
        discountValue: 13.5,
        additionValue: 0,
        totalPrice: 210.0,
        unitCost: 7.0,
        locationId: 'loc-1',
      },
      {
        id: 'itm-3',
        productId: 'prod-3',
        productCode: 'SAB-003',
        code: 'SAB-003',
        description: 'Sabão Líquido Especial Roupas 5L',
        quantity: 6,
        unit: 'UN' as const,
        unitPrice: 38.0,
        discountPercent: 0,
        discountValue: 0,
        additionValue: 0,
        totalPrice: 228.0,
        unitCost: 18.0,
        locationId: 'loc-1',
      },
    ],
    subtotal: 696.5,
    discountTotal: 13.5,
    additionTotal: 0,
    freightTotal: 25.0,
    total: 708.0,
    paymentMethod: 'Boleto Bancário 28 DDL',
    installmentsCount: 1,
    createdAt: new Date().toISOString(),
    notes: 'Entregar no portão 2 de carga e descarga das 08:00 às 17:00.',
  };

  // 2. Dados de Vendas Mobile
  const sampleMobileOrder = state.orders?.find((o) => o.origin === 'externa_celular') || {
    ...sampleOrder,
    number: 'MOB-2026-00045',
    origin: 'externa_celular',
    userName: 'Roberto Vendas (Mobile Rota Sul)',
    customerName: 'Padaria e Confeitaria Estrela do Bairro Ltda',
    customerCpfCnpj: '12.345.678/0001-99',
    total: 345.8,
    paymentMethod: 'Pix Instantâneo (QR Code Mobile)',
    notes: 'Venda realizada via smartphone pronta-entrega na rota.',
  };

  // 3. Dados de Ordem de Produção
  const sampleOp = state.productionOrders?.[0] || {
    id: 'op-sample',
    number: 'OP-2026-00088',
    companyId: company.id,
    productId: 'prod-1',
    productDescription: 'Detergente Concentrado Neutro 5L',
    productCode: 'DET-001',
    unit: 'GL',
    plannedQuantity: 200,
    producedQuantity: 0,
    status: 'planejada',
    startDate: todayStr,
    dueDate: todayStr,
    destinationLocationId: 'loc-1',
    notes: 'Utilizar lote de essência neutra Nº 2026-B. Padrão de viscosidade 45 cP.',
  };

  // 4. Dados de Inventário Físico
  const products = (state.products || []).filter((p) => p.status !== 'inativo');
  const stockBalances = state.stockBalances || [];

  // 5. Dados Financeiros
  const receivables = state.accountsReceivable || [];
  const payables = state.accountsPayable || [];
  const totalReceivables = receivables.reduce((s, r) => s + (r.status === 'aberto' || r.status === 'vencido' ? r.balance : 0), 0);
  const totalPayables = payables.reduce((s, p) => s + (p.status === 'aberto' || p.status === 'vencido' ? p.balance : 0), 0);

  // 6. Dados de Cliente
  const sampleCustomer = state.customers?.[0] || {
    id: 'cli-sample',
    name: 'Supermercado Central de Alimentos Ltda',
    tradeName: 'Super Central',
    cpfCnpj: '45.678.901/0001-23',
    phone: '(11) 3322-1100',
    whatsapp: '(11) 99887-7665',
    email: 'compras@supercentral.com.br',
    street: 'Av. das Nações',
    number: '1450',
    neighborhood: 'Centro',
    city: 'São Paulo',
    state: 'SP',
    marketArea: 'Centro Expandido',
    sellerName: 'Carlos Silva',
    deliveryRouteName: 'Rota 02 - Centro Expandido & Paulista',
    creditLimit: 25000.0,
    status: 'ativo',
  };

  // 7. Dados de Fechamento de Caixa
  const sampleCash = state.cashRegisters?.[0] || {
    id: 'csh-sample',
    companyId: company.id,
    userId: 'usr-admin',
    userName: 'Operador Principal',
    terminalNumber: 'Caixa #01 (Frente de Loja)',
    initialBalance: 150.0,
    status: 'fechado',
    openedAt: `${todayStr} 08:00`,
    closedAt: `${todayStr} 18:30`,
  };

  // 8. Dados de Vendedores & Comissões
  const sellersList = [
    { name: 'Carlos Silva', role: 'Vendedor Externo', ordersCount: 28, revenue: 38450.0, commissionRate: 3.5 },
    { name: 'Roberto Vendas', role: 'Vendas Mobile (Rota)', ordersCount: 42, revenue: 26800.0, commissionRate: 4.0 },
    { name: 'Juliana Balcão', role: 'Televendas & Balcão', ordersCount: 54, revenue: 41200.0, commissionRate: 2.5 },
    { name: 'Marcos Entrega', role: 'Pronta Entrega', ordersCount: 19, revenue: 18900.0, commissionRate: 3.0 },
  ];

  const reportNames: Record<A4ReportType, { title: string; subtitle: string }> = {
    pedido_modelo: {
      title: 'Espelho de Pedido de Venda',
      subtitle: 'Documento comercial completo para faturamento, conferência e canhoto de entrega',
    },
    venda_mobile_modelo: {
      title: 'Comprovante de Venda Mobile (Rota)',
      subtitle: 'Emissão externa via aplicativo móvel com recibo e dados do cliente',
    },
    op_modelo: {
      title: 'Ficha de Produção & PCP (BOM)',
      subtitle: 'Ordem de fabricação, matérias-primas requeridas e controle de qualidade',
    },
    fechamento_caixa: {
      title: 'Extrato de Fechamento de Caixa (PDV)',
      subtitle: 'Conferência cega, sangrias, suprimentos e totais por forma de pagamento',
    },
    inventario: {
      title: 'Folha de Contagem de Estoque & Auditoria',
      subtitle: 'Posição física, saldo do sistema e colunas de dupla contagem de inventário',
    },
    financeiro: {
      title: 'Extrato Financeiro Gerencial (Fluxo & Aging)',
      subtitle: 'Posição de contas a receber, contas a pagar e balanço de liquidez',
    },
    cliente: {
      title: 'Ficha Cadastral e Financeira do Cliente',
      subtitle: 'Dados fiscais, endereço de entrega, limite de crédito e histórico',
    },
    romaneio_modelo: {
      title: 'Romaneio de Carga & Manifesto de Rota',
      subtitle: 'Relação de entregas na sequência de rota, motorista e conferência na descarga',
    },
    comissoes_vendedores: {
      title: 'Relatório de Desempenho & Comissões',
      subtitle: 'Faturamento consolidado por vendedor, ticket médio e cálculo de comissões',
    },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      {/* CSS para Impressão Perfeita A4 */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm 12mm 12mm 12mm;
          }
          body * {
            visibility: hidden !important;
          }
          .printable-a4-report, .printable-a4-report * {
            visibility: visible !important;
          }
          .printable-a4-report {
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

      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[94vh]">
        {/* TOPO DO MODAL */}
        <div className="bg-slate-900 text-white px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 shrink-0 no-print">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <FileText size={16} />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base leading-tight">
                {reportNames[reportType].title}
              </h3>
              <span className="text-[11px] text-slate-400">
                {reportNames[reportType].subtitle}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* BARRA DE SELEÇÃO RÁPIDA DE RELATÓRIO A4 */}
        <div className="bg-slate-800 px-4 py-2 flex items-center gap-1.5 overflow-x-auto no-print border-b border-slate-700">
          <span className="text-[11px] font-bold text-slate-400 uppercase shrink-0 mr-1">
            Modelos A4:
          </span>
          <button
            type="button"
            onClick={() => setReportType('pedido_modelo')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
              reportType === 'pedido_modelo' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'
            }`}
          >
            Pedido de Venda
          </button>
          <button
            type="button"
            onClick={() => setReportType('venda_mobile_modelo')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
              reportType === 'venda_mobile_modelo' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'
            }`}
          >
            Vendas Mobile
          </button>
          <button
            type="button"
            onClick={() => setReportType('op_modelo')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
              reportType === 'op_modelo' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'
            }`}
          >
            Ordem de Produção (PCP)
          </button>
          <button
            type="button"
            onClick={() => setReportType('fechamento_caixa')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
              reportType === 'fechamento_caixa' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'
            }`}
          >
            Fechamento de Caixa
          </button>
          <button
            type="button"
            onClick={() => setReportType('inventario')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
              reportType === 'inventario' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'
            }`}
          >
            Inventário & Estoque
          </button>
          <button
            type="button"
            onClick={() => setReportType('financeiro')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
              reportType === 'financeiro' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'
            }`}
          >
            Extrato Financeiro
          </button>
          <button
            type="button"
            onClick={() => setReportType('cliente')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
              reportType === 'cliente' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'
            }`}
          >
            Ficha de Cliente
          </button>
          <button
            type="button"
            onClick={() => setReportType('romaneio_modelo')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
              reportType === 'romaneio_modelo' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'
            }`}
          >
            Romaneio de Carga
          </button>
          <button
            type="button"
            onClick={() => setReportType('comissoes_vendedores')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
              reportType === 'comissoes_vendedores' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'
            }`}
          >
            Comissões de Vendas
          </button>
        </div>

        {/* ÁREA DE VISUALIZAÇÃO A4 */}
        <div className="flex-1 p-3 sm:p-6 bg-slate-100/80 overflow-y-auto flex justify-center">
          <div
            id="printable-a4-report-content"
            className="printable-a4-report w-full max-w-[794px] bg-white p-6 sm:p-8 rounded-xl shadow-md border border-slate-200 text-slate-800 text-xs leading-normal select-text space-y-4"
          >
            {/* CABEÇALHO TIMBRADO DA EMPRESA */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-200">
              <div className="flex items-start gap-3">
                <GestaoFacilLogo size={42} showSlogan={false} />
                <div>
                  <h1 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-tight">
                    {company.tradeName || company.name}
                  </h1>
                  <p className="text-[11px] text-slate-600 font-medium">{company.name}</p>
                  <div className="text-[10px] text-slate-500 mt-0.5 space-y-0.5">
                    <div>
                      CNPJ: <strong className="font-mono text-slate-700">{company.cnpjCpf}</strong>
                      {(company as any).ie && <span> • IE: <strong className="font-mono text-slate-700">{(company as any).ie}</strong></span>}
                    </div>
                    <div>
                      {company.address.street}, {company.address.number} • {company.address.city}/{company.address.state} • Tel: {company.phone}
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-right sm:border-l sm:border-slate-200 sm:pl-4 space-y-0.5 shrink-0">
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-900 border border-blue-200">
                  {reportNames[reportType].title}
                </span>
                <div className="text-[11px] font-mono font-bold text-slate-700 pt-1">
                  Emissão: {todayStr} às {nowTimeStr}
                </div>
                <div className="text-[10px] text-slate-400">
                  Padrão Folha A4 • GestãoFácil ERP
                </div>
              </div>
            </div>

            {/* ========================================================= */}
            {/* 1. PEDIDO DE VENDA MODELO EXECUTIVO (A4)                  */}
            {/* ========================================================= */}
            {reportType === 'pedido_modelo' && (
              <div className="space-y-3">
                {/* Canhoto Destacável */}
                <div className="pb-3 border-b-2 border-dashed border-slate-300 text-[10px] space-y-1">
                  <div className="flex justify-between items-center text-slate-600 font-bold">
                    <span className="flex items-center gap-1 uppercase tracking-wider text-blue-900">
                      <Scissors size={12} className="text-slate-400" />
                      Protocolo de Entrega & Canhoto Destacável
                    </span>
                    <span className="font-mono font-bold">PEDIDO: {sampleOrder.number}</span>
                  </div>
                  <p className="text-slate-500 text-[9px]">
                    Recebi os produtos discriminados neste pedido em perfeito estado de conservação e conformidade.
                  </p>
                  <div className="grid grid-cols-12 gap-3 pt-1">
                    <div className="col-span-3 border-b border-slate-400 pb-0.5">
                      <span className="text-[9px] text-slate-400 block">Data de Entrega:</span>
                      <span className="font-mono text-slate-700">___/___/______</span>
                    </div>
                    <div className="col-span-5 border-b border-slate-400 pb-0.5">
                      <span className="text-[9px] text-slate-400 block">Nome do Recebedor:</span>
                      <span className="text-slate-400 text-[9px] italic">_______________________</span>
                    </div>
                    <div className="col-span-4 border-b border-slate-400 pb-0.5">
                      <span className="text-[9px] text-slate-400 block">Assinatura / RG:</span>
                      <span className="text-slate-400 text-[9px] italic">_______________________</span>
                    </div>
                  </div>
                </div>

                {/* Dados do Cliente */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1">
                  <div className="flex justify-between font-bold text-slate-800 border-b border-slate-200 pb-1">
                    <span>DESTINATÁRIO / CLIENTE</span>
                    <span className="text-blue-700 font-mono">PEDIDO Nº {sampleOrder.number}</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] pt-1">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Cliente:</span>
                      <strong className="text-slate-800">{sampleOrder.customerName}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">CNPJ/CPF:</span>
                      <strong className="font-mono text-slate-700">{sampleOrder.customerCpfCnpj}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Telefone:</span>
                      <span className="font-mono text-slate-700">{sampleOrder.customerPhone}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Vendedor Responsável:</span>
                      <span className="text-slate-700">{sampleOrder.userName}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-400 block text-[10px]">Endereço de Entrega:</span>
                      <span className="text-slate-700">Av. das Nações, 1450 - Centro • São Paulo/SP</span>
                    </div>
                  </div>
                </div>

                {/* Tabela de Itens */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse text-[10px]">
                    <thead>
                      <tr className="bg-slate-900 text-white font-extrabold uppercase tracking-wider">
                        <th className="py-2 px-2.5 w-12 text-center">#</th>
                        <th className="py-2 px-2.5 w-24">Código</th>
                        <th className="py-2 px-2.5">Descrição do Item</th>
                        <th className="py-2 px-2 text-center w-14">Qtd</th>
                        <th className="py-2 px-2 text-center w-12">UN</th>
                        <th className="py-2 px-2.5 text-right w-20">Unitário</th>
                        <th className="py-2 px-2.5 text-right w-20">Desconto</th>
                        <th className="py-2 px-3 text-right w-24">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {sampleOrder.items.map((item, idx) => (
                        <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                          <td className="py-2 px-2.5 text-center text-slate-400 font-mono">{idx + 1}</td>
                          <td className="py-2 px-2.5 font-mono font-bold text-slate-700">{(item as any).productCode || (item as any).code || '-'}</td>
                          <td className="py-2 px-2.5 font-semibold text-slate-900">{item.description}</td>
                          <td className="py-2 px-2 text-center font-mono font-bold text-slate-800">{formatQuantity(item.quantity)}</td>
                          <td className="py-2 px-2 text-center text-slate-500">{item.unit}</td>
                          <td className="py-2 px-2.5 text-right font-mono text-slate-700">{formatCurrency(item.unitPrice)}</td>
                          <td className="py-2 px-2.5 text-right font-mono text-rose-600">
                            {item.discountValue > 0 ? `-${formatCurrency(item.discountValue)}` : '-'}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">{formatCurrency(item.totalPrice)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Resumo Financeiro & Condições */}
                <div className="grid grid-cols-12 gap-3 pt-2">
                  <div className="col-span-7 bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] space-y-1">
                    <span className="font-bold text-slate-700 block uppercase text-[10px]">Condições Comerciais:</span>
                    <div>Forma de Pagamento: <strong>{sampleOrder.paymentMethod}</strong></div>
                    <div>Observações: <span className="italic text-slate-600">{sampleOrder.notes}</span></div>
                    <div className="text-[10px] text-slate-500 pt-1">
                      Validade da proposta: 10 dias. Garantia legal de 90 dias conforme Código de Defesa do Consumidor.
                    </div>
                  </div>

                  <div className="col-span-5 bg-slate-900 text-white rounded-xl p-3 space-y-1 text-xs">
                    <div className="flex justify-between text-slate-300 text-[11px]">
                      <span>Subtotal Itens:</span>
                      <span className="font-mono">{formatCurrency(sampleOrder.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-rose-300 text-[11px]">
                      <span>Desconto Comercial:</span>
                      <span className="font-mono">-{formatCurrency(sampleOrder.discountTotal)}</span>
                    </div>
                    <div className="flex justify-between text-slate-300 text-[11px]">
                      <span>Frete / Entrega:</span>
                      <span className="font-mono">+{formatCurrency(sampleOrder.freightTotal || 0)}</span>
                    </div>
                    <div className="pt-2 border-t border-slate-700 flex justify-between items-center font-bold">
                      <span className="text-amber-400 uppercase text-xs">Total do Pedido:</span>
                      <span className="text-base text-emerald-400 font-mono font-black">{formatCurrency(sampleOrder.total)}</span>
                    </div>
                  </div>
                </div>

                {/* Assinaturas */}
                <div className="grid grid-cols-2 gap-8 pt-6 pb-2 text-center text-[10px]">
                  <div className="border-t border-slate-400 pt-1">
                    <span className="font-bold text-slate-800 block">{company.tradeName || company.name}</span>
                    <span className="text-slate-500">Vendedor: {sampleOrder.userName}</span>
                  </div>
                  <div className="border-t border-slate-400 pt-1">
                    <span className="font-bold text-slate-800 block">{sampleOrder.customerName}</span>
                    <span className="text-slate-500">Assinatura do Cliente / Comprador</span>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* 2. VENDAS MOBILE / PRONTA ENTREGA (A4)                    */}
            {/* ========================================================= */}
            {reportType === 'venda_mobile_modelo' && (
              <div className="space-y-3">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs flex justify-between items-center">
                  <div>
                    <span className="text-blue-900 font-extrabold uppercase block text-xs">
                      Comprovante Oficial de Venda Externa Mobile (Força de Vendas)
                    </span>
                    <span className="text-slate-600 text-[11px]">
                      Venda registrada em rota com sincronização direta ao ERP GestãoFácil
                    </span>
                  </div>
                  <div className="text-right font-mono">
                    <span className="text-blue-800 font-bold block">{sampleMobileOrder.number}</span>
                    <span className="text-slate-500 text-[10px]">Canal: Aplicativo Mobile</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1">
                    <span className="font-bold text-slate-700 text-[10px] uppercase block">Dados do Operador Externo:</span>
                    <div>Vendedor: <strong>{sampleMobileOrder.userName}</strong></div>
                    <div>Rota de Atendimento: <strong>Rota 01 - Zona Sul Comercial</strong></div>
                    <div>Dispositivo: <strong>Tablet/Smartphone Android (Pronta Entrega)</strong></div>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1">
                    <span className="font-bold text-slate-700 text-[10px] uppercase block">Dados do Estabelecimento:</span>
                    <div>Cliente: <strong>{sampleMobileOrder.customerName}</strong></div>
                    <div>CNPJ: <strong className="font-mono">{sampleMobileOrder.customerCpfCnpj}</strong></div>
                    <div>Forma de Pagamento: <strong className="text-blue-800">{sampleMobileOrder.paymentMethod}</strong></div>
                  </div>
                </div>

                {/* Tabela de Produtos Entregues */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse text-[10px]">
                    <thead>
                      <tr className="bg-slate-900 text-white font-extrabold uppercase">
                        <th className="py-2 px-2.5">Código</th>
                        <th className="py-2 px-2.5">Produto Entregue em Rota</th>
                        <th className="py-2 px-2 text-center">Qtd</th>
                        <th className="py-2 px-2 text-center">UN</th>
                        <th className="py-2 px-2.5 text-right">Unitário</th>
                        <th className="py-2 px-3 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {sampleOrder.items.slice(0, 2).map((item) => (
                        <tr key={item.id} className="bg-white">
                          <td className="py-2 px-2.5 font-mono font-bold text-slate-700">{(item as any).productCode || (item as any).code || '-'}</td>
                          <td className="py-2 px-2.5 font-semibold text-slate-900">{item.description}</td>
                          <td className="py-2 px-2 text-center font-mono font-bold">{formatQuantity(item.quantity)}</td>
                          <td className="py-2 px-2 text-center text-slate-500">{item.unit}</td>
                          <td className="py-2 px-2.5 text-right font-mono">{formatCurrency(item.unitPrice)}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold">{formatCurrency(item.totalPrice)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-100 font-extrabold text-xs">
                        <td colSpan={5} className="py-2 px-2.5 text-right uppercase text-slate-700">Total Faturado no Ponto:</td>
                        <td className="py-2 px-3 text-right font-mono text-emerald-800 font-black">{formatCurrency(sampleMobileOrder.total)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div className="grid grid-cols-2 gap-8 pt-8 text-center text-[10px]">
                  <div className="border-t border-slate-400 pt-1">
                    <span className="font-bold text-slate-800 block">Vendedor Responsável pela Rota</span>
                    <span className="text-slate-400">Visto de Baixa no Estoque do Veículo</span>
                  </div>
                  <div className="border-t border-slate-400 pt-1">
                    <span className="font-bold text-slate-800 block">{sampleMobileOrder.customerName}</span>
                    <span className="text-slate-400">Assinatura de Quitação e Recebimento</span>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* 3. ORDEM DE PRODUÇÃO & PCP (A4)                           */}
            {/* ========================================================= */}
            {reportType === 'op_modelo' && (
              <div className="space-y-3">
                <div className="bg-teal-50 border border-teal-200 rounded-xl p-3 text-xs flex justify-between items-center">
                  <div>
                    <span className="text-teal-900 font-black uppercase text-xs block">
                      Ficha de Fabricação & Ordem de Produção (PCP)
                    </span>
                    <span className="text-slate-600 text-[11px]">
                      Produto a Fabricar: <strong>{sampleOp.productDescription}</strong> ({sampleOp.productCode})
                    </span>
                  </div>
                  <div className="text-right font-mono">
                    <span className="text-teal-800 font-black text-sm block">{sampleOp.number}</span>
                    <span className="text-slate-500 text-[10px]">Status: Planejada</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                    <span className="text-slate-400 text-[10px] block">Lote Programado:</span>
                    <strong className="font-mono text-slate-900">LOTE-2026-042</strong>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                    <span className="text-slate-400 text-[10px] block">Quantidade Planejada:</span>
                    <strong className="font-mono text-teal-800 text-sm">{formatQuantity(sampleOp.plannedQuantity)} {(sampleOp as any).unit || 'UN'}</strong>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                    <span className="text-slate-400 text-[10px] block">Depósito Destino:</span>
                    <strong className="text-slate-900">Estoque de Produtos Acabados</strong>
                  </div>
                </div>

                {/* Composição / Lista de Insumos (BOM) */}
                <div className="space-y-1">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                    Composição e Baixa Prevista de Insumos (BOM):
                  </h4>
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left border-collapse text-[10px]">
                      <thead>
                        <tr className="bg-slate-900 text-white font-extrabold uppercase">
                          <th className="py-2 px-2.5">Código</th>
                          <th className="py-2 px-2.5">Matéria-Prima / Insumo Requerido</th>
                          <th className="py-2 px-2 text-center">UN</th>
                          <th className="py-2 px-2.5 text-right">Qtd Padrão</th>
                          <th className="py-2 px-2.5 text-center">Lote Utilizado</th>
                          <th className="py-2 px-2.5 text-center">Conferência</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        <tr className="bg-white">
                          <td className="py-2 px-2.5 font-mono font-bold text-slate-700">INS-001</td>
                          <td className="py-2 px-2.5 font-semibold text-slate-900">Base Ativa Tensoativo Lauril 70%</td>
                          <td className="py-2 px-2 text-center text-slate-500">KG</td>
                          <td className="py-2 px-2.5 text-right font-mono font-bold">120,00</td>
                          <td className="py-2 px-2.5 text-center font-mono text-slate-400">LOT-LAU-08</td>
                          <td className="py-2 px-2.5 text-center font-mono text-slate-400">[  ] OK</td>
                        </tr>
                        <tr className="bg-slate-50">
                          <td className="py-2 px-2.5 font-mono font-bold text-slate-700">INS-002</td>
                          <td className="py-2 px-2.5 font-semibold text-slate-900">Espessante Cloreto de Sódio Industrial</td>
                          <td className="py-2 px-2 text-center text-slate-500">KG</td>
                          <td className="py-2 px-2.5 text-right font-mono font-bold">35,00</td>
                          <td className="py-2 px-2.5 text-center font-mono text-slate-400">LOT-SAL-12</td>
                          <td className="py-2 px-2.5 text-center font-mono text-slate-400">[  ] OK</td>
                        </tr>
                        <tr className="bg-white">
                          <td className="py-2 px-2.5 font-mono font-bold text-slate-700">EMB-005</td>
                          <td className="py-2 px-2.5 font-semibold text-slate-900">Galão Plástico Virgem 5L c/ Tampa Lacre</td>
                          <td className="py-2 px-2 text-center text-slate-500">UN</td>
                          <td className="py-2 px-2.5 text-right font-mono font-bold">200,00</td>
                          <td className="py-2 px-2.5 text-center font-mono text-slate-400">LOT-GAL-04</td>
                          <td className="py-2 px-2.5 text-center font-mono text-slate-400">[  ] OK</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Checklist de Qualidade */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5 text-[10px]">
                  <span className="font-bold text-slate-800 uppercase block">Checklist de Liberação da Batelada:</span>
                  <div className="grid grid-cols-4 gap-2 text-slate-700">
                    <div>[  ] Viscosidade Padrão</div>
                    <div>[  ] PH entre 6.5 e 7.5</div>
                    <div>[  ] Lacre e Rotulagem</div>
                    <div>[  ] Peso Líquido Conferido</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8 pt-6 text-center text-[10px]">
                  <div className="border-t border-slate-400 pt-1">
                    <span className="font-bold text-slate-800 block">Operador de Produção / Apontamento</span>
                    <span className="text-slate-400">Início: ____:____ • Fim: ____:____</span>
                  </div>
                  <div className="border-t border-slate-400 pt-1">
                    <span className="font-bold text-slate-800 block">Responsável Técnico / Químico</span>
                    <span className="text-slate-400">Visto de Liberação para Venda</span>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* 4. FECHAMENTO DE CAIXA / PDV (A4)                         */}
            {/* ========================================================= */}
            {reportType === 'fechamento_caixa' && (
              <div className="space-y-3">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs flex justify-between items-center">
                  <div>
                    <span className="text-amber-900 font-black uppercase text-xs block">
                      Demonstrativo de Fechamento de Caixa & Auditoria de Turno
                    </span>
                    <span className="text-slate-600 text-[11px]">
                      Conferência de recebimentos, sangrias, suprimentos e quebra de caixa
                    </span>
                  </div>
                  <div className="text-right font-mono">
                    <span className="text-slate-900 font-bold block">{(sampleCash as any).terminalNumber || 'Caixa #01'}</span>
                    <span className="text-slate-500 text-[10px]">Operador: {sampleCash.userName}</span>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-3 text-center text-xs">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                    <span className="text-slate-400 text-[10px] block uppercase">Fundo de Troco:</span>
                    <strong className="font-mono text-slate-800">{formatCurrency(sampleCash.initialBalance)}</strong>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                    <span className="text-slate-400 text-[10px] block uppercase">Total Vendas PDV:</span>
                    <strong className="font-mono text-emerald-700">{formatCurrency(3450.80)}</strong>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                    <span className="text-slate-400 text-[10px] block uppercase">Sangrias Efetuadas:</span>
                    <strong className="font-mono text-rose-600">-{formatCurrency(2800.00)}</strong>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                    <span className="text-slate-400 text-[10px] block uppercase">Saldo Gaveta:</span>
                    <strong className="font-mono text-blue-800 font-bold">{formatCurrency(800.80)}</strong>
                  </div>
                </div>

                {/* Resumo por Forma de Pagamento */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse text-[10px]">
                    <thead>
                      <tr className="bg-slate-900 text-white font-extrabold uppercase">
                        <th className="py-2 px-2.5">Forma de Pagamento</th>
                        <th className="py-2 px-2 text-center">Transações</th>
                        <th className="py-2 px-2.5 text-right">Valor Sistema</th>
                        <th className="py-2 px-2.5 text-right">Valor Contado</th>
                        <th className="py-2 px-3 text-right">Diferença</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      <tr className="bg-white">
                        <td className="py-2 px-2.5 font-semibold text-slate-800">Dinheiro em Espécie</td>
                        <td className="py-2 px-2 text-center font-mono">18</td>
                        <td className="py-2 px-2.5 text-right font-mono font-bold">{formatCurrency(1240.00)}</td>
                        <td className="py-2 px-2.5 text-right font-mono text-slate-600">{formatCurrency(1240.00)}</td>
                        <td className="py-2 px-3 text-right font-mono text-emerald-600 font-bold">R$ 0,00</td>
                      </tr>
                      <tr className="bg-slate-50">
                        <td className="py-2 px-2.5 font-semibold text-slate-800">Pix Instantâneo (QR Code)</td>
                        <td className="py-2 px-2 text-center font-mono">22</td>
                        <td className="py-2 px-2.5 text-right font-mono font-bold">{formatCurrency(1420.80)}</td>
                        <td className="py-2 px-2.5 text-right font-mono text-slate-600">{formatCurrency(1420.80)}</td>
                        <td className="py-2 px-3 text-right font-mono text-emerald-600 font-bold">R$ 0,00</td>
                      </tr>
                      <tr className="bg-white">
                        <td className="py-2 px-2.5 font-semibold text-slate-800">Cartão de Crédito / Débito</td>
                        <td className="py-2 px-2 text-center font-mono">15</td>
                        <td className="py-2 px-2.5 text-right font-mono font-bold">{formatCurrency(790.00)}</td>
                        <td className="py-2 px-2.5 text-right font-mono text-slate-600">{formatCurrency(790.00)}</td>
                        <td className="py-2 px-3 text-right font-mono text-emerald-600 font-bold">R$ 0,00</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="grid grid-cols-2 gap-8 pt-8 text-center text-[10px]">
                  <div className="border-t border-slate-400 pt-1">
                    <span className="font-bold text-slate-800 block">Operador de Caixa</span>
                    <span className="text-slate-400">Assinatura de Fechamento de Turno</span>
                  </div>
                  <div className="border-t border-slate-400 pt-1">
                    <span className="font-bold text-slate-800 block">Gerente / Supervisor Financeiro</span>
                    <span className="text-slate-400">Visto de Conferência dos Valores</span>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* 5. INVENTÁRIO FÍSICO DE ESTOQUE (A4)                      */}
            {/* ========================================================= */}
            {reportType === 'inventario' && (
              <div className="space-y-3">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-wrap justify-between items-center text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Depósito / Local de Armazenagem:</span>
                    <strong className="text-slate-900">Estoque Central de Mercadorias (Geral)</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Total de Itens Cadastrados:</span>
                    <strong className="text-slate-900">{products.length} itens ativos</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Tipo de Auditoria:</span>
                    <strong className="text-blue-700">Contagem Física Periódica de Estoque</strong>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse text-[10px]">
                    <thead>
                      <tr className="bg-slate-900 text-white font-extrabold uppercase tracking-wider">
                        <th className="py-2 px-2 text-center w-8">#</th>
                        <th className="py-2 px-2 w-20">Código</th>
                        <th className="py-2 px-2.5">Descrição do Produto</th>
                        <th className="py-2 px-2 text-center w-12">UN</th>
                        <th className="py-2 px-2 text-right w-16">Saldo Sist.</th>
                        <th className="py-2 px-2 text-center w-24">1ª Contagem</th>
                        <th className="py-2 px-2 text-center w-24">2ª Contagem</th>
                        <th className="py-2 px-2 text-center w-16">Visto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {products.slice(0, 14).map((p, idx) => {
                        const bal = stockBalances.find((b) => b.productId === p.id);
                        const qty = bal ? bal.quantity : 0;
                        return (
                          <tr key={p.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                            <td className="py-1.5 px-2 text-center text-slate-400 font-mono">{idx + 1}</td>
                            <td className="py-1.5 px-2 font-mono font-bold text-slate-700">{p.code}</td>
                            <td className="py-1.5 px-2.5 font-medium text-slate-900 truncate max-w-[200px]">{p.description}</td>
                            <td className="py-1.5 px-2 text-center text-slate-600 font-semibold">{p.unit}</td>
                            <td className="py-1.5 px-2 text-right font-mono font-bold text-slate-800">{formatQuantity(qty)}</td>
                            <td className="py-1.5 px-2 text-center font-mono text-slate-400">____</td>
                            <td className="py-1.5 px-2 text-center font-mono text-slate-400">____</td>
                            <td className="py-1.5 px-2 text-center font-mono text-slate-400">___</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="grid grid-cols-2 gap-8 pt-6 text-center text-[10px]">
                  <div className="border-t border-slate-400 pt-1">
                    <span className="font-bold text-slate-800 block">Conferente / Auditor do Estoque</span>
                    <span className="text-slate-400">Assinatura de Realização da Contagem</span>
                  </div>
                  <div className="border-t border-slate-400 pt-1">
                    <span className="font-bold text-slate-800 block">Supervisor de Almoxarifado</span>
                    <span className="text-slate-400">Visto de Validação e Ajuste de Saldo</span>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* 6. EXTRATO FINANCEIRO GERENCIAL (A4)                      */}
            {/* ========================================================= */}
            {reportType === 'financeiro' && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
                    <span className="text-[10px] text-emerald-800 font-bold uppercase block">Contas a Receber (Em Aberto)</span>
                    <span className="text-base font-black font-mono text-emerald-700">{formatCurrency(totalReceivables)}</span>
                  </div>
                  <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-center">
                    <span className="text-[10px] text-rose-800 font-bold uppercase block">Contas a Pagar (Em Aberto)</span>
                    <span className="text-base font-black font-mono text-rose-700">{formatCurrency(totalPayables)}</span>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
                    <span className="text-[10px] text-blue-800 font-bold uppercase block">Saldo Projetado / Líquido</span>
                    <span className="text-base font-black font-mono text-blue-800">
                      {formatCurrency(totalReceivables - totalPayables)}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                    Posição de Títulos a Receber (Próximos Vencimentos):
                  </h4>
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left border-collapse text-[10px]">
                      <thead>
                        <tr className="bg-slate-900 text-white font-extrabold uppercase tracking-wider">
                          <th className="py-2 px-2.5">Vencimento</th>
                          <th className="py-2 px-2.5">Documento</th>
                          <th className="py-2 px-2.5">Cliente</th>
                          <th className="py-2 px-2.5">Forma</th>
                          <th className="py-2 px-3 text-right">Valor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {receivables.slice(0, 6).map((rec, idx) => (
                          <tr key={rec.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                            <td className="py-1.5 px-2.5 font-mono text-slate-700">{rec.dueDate}</td>
                            <td className="py-1.5 px-2.5 font-mono font-bold text-slate-600">{rec.docNumber}</td>
                            <td className="py-1.5 px-2.5 font-medium text-slate-800">{rec.customerName}</td>
                            <td className="py-1.5 px-2.5 uppercase text-slate-500">{rec.paymentMethod}</td>
                            <td className="py-1.5 px-3 text-right font-mono font-bold text-slate-900">{formatCurrency(rec.balance || rec.originalValue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="pt-6 text-center text-[10px]">
                  <div className="w-64 mx-auto border-t border-slate-400 pt-1">
                    <span className="font-bold text-slate-800 block">Departamento Financeiro & Controladoria</span>
                    <span className="text-slate-400">Assinatura do Gestor Financeiro</span>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* 7. FICHA CADASTRAL DO CLIENTE (A4)                        */}
            {/* ========================================================= */}
            {reportType === 'cliente' && (
              <div className="space-y-3">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                  <div className="text-xs font-black uppercase text-slate-800 border-b border-slate-200 pb-1 flex justify-between">
                    <span>1. Dados Cadastrais Principais</span>
                    <span className="text-emerald-700 font-bold uppercase">{sampleCustomer.status}</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Razão Social:</span>
                      <strong className="text-slate-900">{sampleCustomer.name}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Nome Fantasia:</span>
                      <strong className="text-slate-900">{sampleCustomer.tradeName || '-'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">CNPJ / CPF:</span>
                      <strong className="font-mono text-slate-800">{sampleCustomer.cpfCnpj}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Telefone Comercial:</span>
                      <span className="font-mono text-slate-700">{sampleCustomer.phone || '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">WhatsApp:</span>
                      <span className="font-mono text-slate-700">{sampleCustomer.whatsapp || '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">E-mail Comercial:</span>
                      <span className="text-slate-700">{sampleCustomer.email || '-'}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                  <div className="text-xs font-black uppercase text-slate-800 border-b border-slate-200 pb-1">
                    <span>2. Parâmetros Comerciais & Logística de Entrega</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Limite de Crédito Aprovado:</span>
                      <strong className="text-blue-800 font-mono text-sm">{formatCurrency(sampleCustomer.creditLimit || 0)}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Rota de Entrega Vinculada:</span>
                      <strong className="text-slate-900">{sampleCustomer.deliveryRouteName || 'Rota Padrão'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Vendedor Responsável:</span>
                      <strong className="text-slate-900">{sampleCustomer.sellerName || 'Equipe Interna'}</strong>
                    </div>
                    <div className="col-span-3">
                      <span className="text-slate-400 block text-[10px]">Endereço de Entrega:</span>
                      <span className="text-slate-800">
                        {sampleCustomer.street}, {sampleCustomer.number} - {sampleCustomer.neighborhood} • {sampleCustomer.city}/{sampleCustomer.state}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-6 text-center text-[10px]">
                  <div className="w-64 mx-auto border-t border-slate-400 pt-1">
                    <span className="font-bold text-slate-800 block">Validação Cadastral & Crédito</span>
                    <span className="text-slate-400">Assinatura do Analista de Crédito</span>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* 8. ROMANEIO DE CARGA / EXPEDIÇÃO (A4)                     */}
            {/* ========================================================= */}
            {reportType === 'romaneio_modelo' && (
              <div className="space-y-3">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs flex justify-between items-center">
                  <div>
                    <span className="text-amber-900 font-black uppercase text-xs block">
                      Manifesto de Carga & Romaneio de Expedição A4
                    </span>
                    <span className="text-slate-600 text-[11px]">
                      Conferência de saída do caminhão e ordem sequencial de descarregamento
                    </span>
                  </div>
                  <div className="text-right font-mono">
                    <span className="text-amber-800 font-bold block">ROM-2026-0031</span>
                    <span className="text-slate-500 text-[10px]">Veículo: Iveco Daily (ABC-4D56)</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                    <span className="text-slate-400 text-[10px] block">Motorista / Transportador:</span>
                    <strong className="text-slate-900">José Roberto de Souza</strong>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                    <span className="text-slate-400 text-[10px] block">Rota de Entrega:</span>
                    <strong className="text-slate-900">Rota 01 - Centro & Grande ABC</strong>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                    <span className="text-slate-400 text-[10px] block">Total de Entregas:</span>
                    <strong className="font-mono text-blue-800">12 Clientes • R$ 14.850,00</strong>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse text-[10px]">
                    <thead>
                      <tr className="bg-slate-900 text-white font-extrabold uppercase">
                        <th className="py-2 px-2 text-center w-8">Seq</th>
                        <th className="py-2 px-2.5">Pedido / NF</th>
                        <th className="py-2 px-2.5">Cliente Destinatário</th>
                        <th className="py-2 px-2.5">Bairro / Cidade</th>
                        <th className="py-2 px-2 text-center">Vol.</th>
                        <th className="py-2 px-2.5 text-right">A Receber</th>
                        <th className="py-2 px-2.5 text-center">Assinatura / Visto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      <tr className="bg-white">
                        <td className="py-2 px-2 text-center font-mono font-bold text-blue-700">01</td>
                        <td className="py-2 px-2.5 font-mono font-bold text-slate-800">PV-2026-00128</td>
                        <td className="py-2 px-2.5 font-semibold text-slate-900">Supermercado Central de Alimentos</td>
                        <td className="py-2 px-2.5 text-slate-600">Centro - São Paulo</td>
                        <td className="py-2 px-2 text-center font-mono font-bold">14 CX</td>
                        <td className="py-2 px-2.5 text-right font-mono text-emerald-700 font-bold">Faturado</td>
                        <td className="py-2 px-2.5 text-center font-mono text-slate-400">________________</td>
                      </tr>
                      <tr className="bg-slate-50">
                        <td className="py-2 px-2 text-center font-mono font-bold text-blue-700">02</td>
                        <td className="py-2 px-2.5 font-mono font-bold text-slate-800">PV-2026-00130</td>
                        <td className="py-2 px-2.5 font-semibold text-slate-900">Padaria e Confeitaria Estrela Ltda</td>
                        <td className="py-2 px-2.5 text-slate-600">Bela Vista - São Paulo</td>
                        <td className="py-2 px-2 text-center font-mono font-bold">8 CX</td>
                        <td className="py-2 px-2.5 text-right font-mono text-blue-800 font-bold">{formatCurrency(450.0)}</td>
                        <td className="py-2 px-2.5 text-center font-mono text-slate-400">________________</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="grid grid-cols-2 gap-8 pt-6 text-center text-[10px]">
                  <div className="border-t border-slate-400 pt-1">
                    <span className="font-bold text-slate-800 block">Conferente de Carga / Expedição</span>
                    <span className="text-slate-400">Visto de Liberação na Saída</span>
                  </div>
                  <div className="border-t border-slate-400 pt-1">
                    <span className="font-bold text-slate-800 block">Motorista Responsável</span>
                    <span className="text-slate-400">Recebimento da Mercadoria e Canhotos</span>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* 9. COMISSÕES DE VENDEDORES (A4)                           */}
            {/* ========================================================= */}
            {reportType === 'comissoes_vendedores' && (
              <div className="space-y-3">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs flex justify-between items-center">
                  <div>
                    <span className="text-emerald-900 font-black uppercase text-xs block">
                      Relatório Executivo de Vendas & Comissões por Vendedor
                    </span>
                    <span className="text-slate-600 text-[11px]">
                      Apuração mensal de metas, faturamento por operador e valor líquido de comissões
                    </span>
                  </div>
                  <div className="text-right font-mono">
                    <span className="text-emerald-800 font-bold block">Período: Mês Atual</span>
                    <span className="text-slate-500 text-[10px]">Equipe Comercial Geral</span>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse text-[10px]">
                    <thead>
                      <tr className="bg-slate-900 text-white font-extrabold uppercase">
                        <th className="py-2 px-2.5">Vendedor / Operador</th>
                        <th className="py-2 px-2.5">Cargo / Canal</th>
                        <th className="py-2 px-2 text-center">Pedidos</th>
                        <th className="py-2 px-2.5 text-right">Faturamento</th>
                        <th className="py-2 px-2.5 text-right">Ticket Médio</th>
                        <th className="py-2 px-2 text-center">% Com.</th>
                        <th className="py-2 px-3 text-right">Comissão a Pagar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {sellersList.map((seller, idx) => {
                        const commissionVal = (seller.revenue * seller.commissionRate) / 100;
                        const avg = seller.revenue / (seller.ordersCount || 1);
                        return (
                          <tr key={seller.name} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                            <td className="py-2 px-2.5 font-bold text-slate-800">{seller.name}</td>
                            <td className="py-2 px-2.5 text-slate-600">{seller.role}</td>
                            <td className="py-2 px-2 text-center font-mono font-bold">{seller.ordersCount}</td>
                            <td className="py-2 px-2.5 text-right font-mono font-bold text-slate-900">{formatCurrency(seller.revenue)}</td>
                            <td className="py-2 px-2.5 text-right font-mono text-slate-600">{formatCurrency(avg)}</td>
                            <td className="py-2 px-2 text-center font-mono font-semibold text-blue-700">{seller.commissionRate.toFixed(1)}%</td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">{formatCurrency(commissionVal)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-100 font-extrabold text-xs">
                        <td colSpan={3} className="py-2.5 px-2.5 uppercase text-slate-700">Total Geral da Equipe:</td>
                        <td className="py-2.5 px-2.5 text-right font-mono text-slate-900 font-black">
                          {formatCurrency(sellersList.reduce((s, x) => s + x.revenue, 0))}
                        </td>
                        <td colSpan={2} />
                        <td className="py-2.5 px-3 text-right font-mono text-emerald-800 font-black">
                          {formatCurrency(sellersList.reduce((s, x) => s + (x.revenue * x.commissionRate) / 100, 0))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div className="grid grid-cols-2 gap-8 pt-6 text-center text-[10px]">
                  <div className="border-t border-slate-400 pt-1">
                    <span className="font-bold text-slate-800 block">Gerente Comercial</span>
                    <span className="text-slate-400">Assinatura de Homologação</span>
                  </div>
                  <div className="border-t border-slate-400 pt-1">
                    <span className="font-bold text-slate-800 block">Diretoria / Financeiro</span>
                    <span className="text-slate-400">Autorização para Pagamento em Folha</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* BARRA INFERIOR DE IMPRESSÃO */}
        <div className="p-4 bg-white border-t border-slate-200 flex justify-between items-center gap-3 no-print shrink-0">
          <div className="text-xs text-slate-500 hidden sm:block">
            Formato: <strong>Folha A4 (210 x 297 mm)</strong> • Orientação: Retrato
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Fechar
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-extrabold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer"
            >
              <Printer size={16} />
              <span>Imprimir Relatório em Folha A4</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
