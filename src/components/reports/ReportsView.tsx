import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  Package,
  Calendar,
  DollarSign,
  Download,
  AlertTriangle,
  Award,
  Layers,
  FileSpreadsheet,
  Percent,
  Printer,
  FileText
} from 'lucide-react';
import { Database } from '../../services/db';
import { StockEngine } from '../../services/stockEngine';
import { formatCurrency, formatQuantity } from '../../services/pricingEngine';
import { A4ReportsPreviewModal, A4ReportType } from './A4ReportsPreviewModal';

export const ReportsView: React.FC = () => {
  const dbState = Database.getState();
  const currentCompany = Database.getCurrentCompany();
  const canViewTotalRevenue = Database.canCurrentUserView('totalRevenue');

  const [reportTab, setReportTab] = useState<'vendas' | 'estoque' | 'financeiro' | 'producao'>('vendas');
  const [a4ReportModal, setA4ReportModal] = useState<A4ReportType | null>(null);

  // Vendas da Empresa
  const companyOrders = dbState.orders.filter(
    (o) => o.companyId === currentCompany.id && o.type === 'venda' && o.status !== 'cancelado'
  );

  const totalRevenue = companyOrders.reduce((s, o) => s + o.total, 0);
  const totalSalesCount = companyOrders.length;
  const avgTicket = totalSalesCount > 0 ? totalRevenue / totalSalesCount : 0;
  const totalDiscounts = companyOrders.reduce((s, o) => s + (o.discountTotal || 0), 0);

  // Vendas por Origem (PDV vs Mobile)
  const pdvRevenue = companyOrders.filter((o) => o.origin === 'pdv').reduce((s, o) => s + o.total, 0);
  const mobileRevenue = companyOrders.filter((o) => o.origin === 'externa_celular').reduce((s, o) => s + o.total, 0);

  // Produtos mais vendidos
  const productSalesMap = new Map<string, { description: string; qty: number; totalVal: number }>();
  companyOrders.forEach((o) => {
    o.items.forEach((item) => {
      const existing = productSalesMap.get(item.productId) || {
        description: item.description,
        qty: 0,
        totalVal: 0,
      };
      existing.qty += item.quantity;
      existing.totalVal += item.totalPrice;
      productSalesMap.set(item.productId, existing);
    });
  });
  const topProducts = Array.from(productSalesMap.values()).sort((a, b) => b.totalVal - a.totalVal);

  // Vendas por Vendedor
  const sellerSalesMap = new Map<string, { name: string; count: number; totalVal: number }>();
  companyOrders.forEach((o) => {
    const existing = sellerSalesMap.get(o.userId) || { name: o.userName, count: 0, totalVal: 0 };
    existing.count += 1;
    existing.totalVal += o.total;
    sellerSalesMap.set(o.userId, existing);
  });
  const topSellers = Array.from(sellerSalesMap.values()).sort((a, b) => b.totalVal - a.totalVal);

  // Estoque Crítico
  const lowStockProducts = dbState.products.filter((p) => {
    const stock = StockEngine.getTotalProductStock(dbState.stockBalances, p.id);
    return p.status === 'ativo' && stock.available <= p.minStock;
  });

  return (
    <div className="space-y-4">
      {/* Topo / Seletor de Relatórios */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 className="text-indigo-600" size={20} />
            <span>Indicadores & Relatórios Gerenciais da Pequena Empresa</span>
          </h2>
          <p className="text-xs text-slate-500">
            Painel consolidado para tomada de decisão: faturamento, ticket médio, canais de venda e rentabilidade.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setReportTab('vendas')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                reportTab === 'vendas' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Vendas & Canais
            </button>
            <button
              onClick={() => setReportTab('estoque')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                reportTab === 'estoque' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Estoque Crítico ({lowStockProducts.length})
            </button>
            <button
              onClick={() => setReportTab('producao')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                reportTab === 'producao' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Produção Realizada
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              if (reportTab === 'estoque') setA4ReportModal('inventario');
              else if (reportTab === 'producao') setA4ReportModal('op_modelo');
              else setA4ReportModal('comissoes_vendedores');
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
            title="Visualizar e imprimir este relatório no formato executivo em Folha A4"
          >
            <Printer size={14} />
            <span>Imprimir em Folha A4</span>
          </button>
        </div>
      </div>

      {/* ABA 1: VENDAS & CANAIS */}
      {reportTab === 'vendas' && (
        <div className="space-y-4">
          {/* Métricas Principais */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Faturamento Total de Vendas
              </span>
              <div className="text-2xl font-extrabold text-slate-900 mt-1">
                {canViewTotalRevenue ? formatCurrency(totalRevenue) : '•••• (Oculto)'}
              </div>
              <span className="text-[11px] text-slate-500 mt-0.5 block">{totalSalesCount} pedidos concluídos</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Ticket Médio por Venda
              </span>
              <div className="text-2xl font-extrabold text-indigo-600 mt-1">
                {canViewTotalRevenue ? formatCurrency(avgTicket) : '••••'}
              </div>
              <span className="text-[11px] text-slate-500 mt-0.5 block">Média por atendimento</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                PDV Balcão vs Mobile
              </span>
              <div className="text-sm font-extrabold text-slate-800 mt-1">
                Balcão: {canViewTotalRevenue ? formatCurrency(pdvRevenue) : '••••'}
              </div>
              <div className="text-xs text-indigo-600 font-semibold mt-0.5">
                Venda Celular: {canViewTotalRevenue ? formatCurrency(mobileRevenue) : '••••'}
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Descontos Concedidos
              </span>
              <div className="text-2xl font-extrabold text-rose-600 mt-1">
                {canViewTotalRevenue ? formatCurrency(totalDiscounts) : '••••'}
              </div>
              <span className="text-[11px] text-slate-500 mt-0.5 block">Monitoramento de margem</span>
            </div>
          </div>

          {/* Gráficos / Tabelas Comparativas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Produtos Mais Vendidos */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Award size={15} className="text-amber-500" />
                <span>Ranking: Produtos Mais Vendidos (Faturamento)</span>
              </h3>

              <div className="divide-y divide-slate-100 text-xs">
                {topProducts.length === 0 ? (
                  <p className="text-slate-400 py-4">Nenhuma venda registrada ainda.</p>
                ) : (
                  topProducts.slice(0, 5).map((prod, idx) => (
                    <div key={idx} className="py-2.5 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 font-bold text-[10px] flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <div>
                          <div className="font-semibold text-slate-800">{prod.description}</div>
                          <div className="text-[10px] text-slate-400">
                            {formatQuantity(prod.qty)} unidades vendidas
                          </div>
                        </div>
                      </div>
                      <div className="font-extrabold text-slate-900">
                        {canViewTotalRevenue ? formatCurrency(prod.totalVal) : `${formatQuantity(prod.qty)} un`}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Performance por Vendedor */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp size={15} className="text-indigo-600" />
                <span>Desempenho por Usuário / Vendedor</span>
              </h3>

              <div className="divide-y divide-slate-100 text-xs">
                {topSellers.length === 0 ? (
                  <p className="text-slate-400 py-4">Nenhuma venda registrada ainda.</p>
                ) : (
                  topSellers.map((seller, idx) => (
                    <div key={idx} className="py-2.5 flex justify-between items-center">
                      <div>
                        <div className="font-semibold text-slate-800">{seller.name}</div>
                        <div className="text-[10px] text-slate-400">{seller.count} vendas concretizadas</div>
                      </div>
                      <div className="text-right">
                        <div className="font-extrabold text-slate-900">
                          {canViewTotalRevenue ? formatCurrency(seller.totalVal) : `${seller.count} vendas`}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {canViewTotalRevenue
                            ? `${((seller.totalVal / (totalRevenue || 1)) * 100).toFixed(1)}% do faturamento`
                            : 'Participação Oculta'}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ABA 2: ESTOQUE CRÍTICO */}
      {reportTab === 'estoque' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="text-amber-500" size={18} />
            <h3 className="font-bold text-sm text-slate-800">
              Produtos Abaixo do Estoque Mínimo ou Zerados
            </h3>
          </div>
          <p className="text-xs text-slate-500">
            Itens que necessitam de pedido de compra urgente aos fornecedores ou emissão de ordem de produção interna.
          </p>

          <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-3">Código</th>
                  <th className="p-3">Produto</th>
                  <th className="p-3">Tipo</th>
                  <th className="p-3 text-right">Estoque Mínimo</th>
                  <th className="p-3 text-right">Saldo Físico Atual</th>
                  <th className="p-3 text-right">Quantidade a Repor</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lowStockProducts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      Excelente! Todos os produtos ativos estão com saldo acima do estoque mínimo.
                    </td>
                  </tr>
                ) : (
                  lowStockProducts.map((p) => {
                    const stock = StockEngine.getTotalProductStock(dbState.stockBalances, p.id);
                    const toReplenish = Math.max(0, p.minStock - stock.available);

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/80">
                        <td className="p-3 font-mono font-bold text-slate-600">{p.code}</td>
                        <td className="p-3 font-semibold text-slate-800">{p.description}</td>
                        <td className="p-3 uppercase text-[10px] text-slate-500">{p.productType}</td>
                        <td className="p-3 text-right font-medium text-slate-600">
                          {formatQuantity(p.minStock)} {p.unit}
                        </td>
                        <td className="p-3 text-right font-bold text-rose-600">
                          {formatQuantity(stock.available)} {p.unit}
                        </td>
                        <td className="p-3 text-right font-bold text-indigo-700">
                          +{formatQuantity(toReplenish)} {p.unit}
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                              stock.available === 0 ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {stock.available === 0 ? 'Zerado' : 'Estoque Baixo'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ABA 3: PRODUÇÃO REALIZADA */}
      {reportTab === 'producao' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <Layers className="text-indigo-600" size={18} />
            <h3 className="font-bold text-sm text-slate-800">
              Relatório de Produção Interna & Consumo de Matérias-Primas
            </h3>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {dbState.productionOrders.length === 0 ? (
              <p className="text-slate-400 py-6 text-center">Nenhuma ordem de produção registrada.</p>
            ) : (
              dbState.productionOrders.map((op) => (
                <div key={op.id} className="py-3 space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="font-mono font-bold text-indigo-700">{op.number}</span>
                    <span className="text-slate-400">{new Date(op.orderDate).toLocaleString('pt-BR')}</span>
                  </div>
                  <div className="font-bold text-slate-800">
                    {formatQuantity(op.producedQuantity)} un de {op.productDescription} (Custo Total: {formatCurrency(op.totalCost)})
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Componentes Consumidos:</span>
                    {op.componentsConsumed.map((c, i) => (
                      <div key={i} className="flex justify-between text-[11px] text-slate-600">
                        <span>• {c.description}</span>
                        <span>{formatQuantity(c.actualQty)} {c.unit} ({formatCurrency(c.totalCost)})</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Modal de Impressão de Relatórios em Folha A4 */}
      {a4ReportModal && (
        <A4ReportsPreviewModal
          isOpen={!!a4ReportModal}
          onClose={() => setA4ReportModal(null)}
          reportType={a4ReportModal}
        />
      )}
    </div>
  );
};
