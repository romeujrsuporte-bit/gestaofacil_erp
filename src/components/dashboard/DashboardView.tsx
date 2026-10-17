import React, { useState, useEffect, useMemo } from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Smartphone,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  Boxes,
  FileSpreadsheet,
  AlertTriangle,
  ArrowRight,
  Receipt,
  Users,
  CheckCircle2,
  Clock,
  Sparkles,
  Eye,
  EyeOff,
  ClipboardList,
  X,
  Percent,
  BarChart3,
  PieChart,
  Target,
  Award,
  Flame,
  ArrowUpRight,
  ShieldCheck,
  Scale,
  Wallet,
  Calendar,
  Layers,
  ChevronRight,
  Lock,
} from 'lucide-react';
import { Database } from '../../services/db';
import { StockEngine } from '../../services/stockEngine';
import { formatCurrency, formatQuantity } from '../../services/pricingEngine';
import { Order, Product } from '../../types';

interface DashboardViewProps {
  onNavigate: (module: string) => void;
  hideKpis?: boolean;
  onToggleHideKpis?: () => void;
}

type PeriodFilter = 'mes_atual' | 'hoje' | 'ultimos_30_dias' | 'todos';

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  hideKpis: propHideKpis,
  onToggleHideKpis,
}) => {
  const [dbState, setDbState] = useState(Database.getState());
  const currentCompany = Database.getCurrentCompany();
  const currentUser = Database.getCurrentUser();
  const canViewGrossProfit = Database.canCurrentUserView('grossProfit');
  const canViewNetProfit = Database.canCurrentUserView('netProfit');
  const canViewTotalRevenue = Database.canCurrentUserView('totalRevenue');
  const canViewProfitMargin = Database.canCurrentUserView('profitMargin');
  const canViewProductCosts = Database.canCurrentUserView('productCosts');
  const canViewCashBalances = Database.canCurrentUserView('cashBalances');
  const [internalHideKpis, setInternalHideKpis] = useState(false);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('mes_atual');

  const isKpisHidden = propHideKpis !== undefined ? propHideKpis : internalHideKpis;
  const toggleKpis = onToggleHideKpis || (() => setInternalHideKpis((prev) => !prev));

  useEffect(() => {
    return Database.subscribe(() => {
      setDbState({ ...Database.getState() });
    });
  }, []);

  // Alerta de Inadimplência / Parcelas Vencidas dos Clientes
  const [showOverdueDetails, setShowOverdueDetails] = useState(false);
  const [showTopAlert, setShowTopAlert] = useState(false);
  const todayIso = new Date().toISOString().split('T')[0];
  const overdueReceivables = dbState.accountsReceivable.filter(
    (r) => r.companyId === currentCompany.id && r.status === 'aberto' && r.dueDate < todayIso
  );
  const totalOverdueBalance = overdueReceivables.reduce((s, r) => s + r.balance, 0);

  // Agrupamento por cliente para resumo visual no alerta
  type OverdueCustomerGroup = {
    customerId: string;
    customerName: string;
    totalBalance: number;
    count: number;
    oldestDueDate: string;
    items: typeof overdueReceivables;
  };

  const overdueCustomersMap = new Map<string, OverdueCustomerGroup>();
  overdueReceivables.forEach((r) => {
    const custId = r.customerId || r.customerName;
    const existing: OverdueCustomerGroup = overdueCustomersMap.get(custId) || {
      customerId: custId,
      customerName: r.customerName,
      totalBalance: 0,
      count: 0,
      oldestDueDate: r.dueDate,
      items: [] as typeof overdueReceivables,
    };
    existing.totalBalance += r.balance;
    existing.count += 1;
    if (r.dueDate < existing.oldestDueDate) {
      existing.oldestDueDate = r.dueDate;
    }
    existing.items.push(r);
    overdueCustomersMap.set(custId, existing);
  });

  const overdueCustomersList = Array.from(overdueCustomersMap.values()).sort(
    (a, b) => b.totalBalance - a.totalBalance
  );

  // Mapa de produtos para busca rápida de custos e dados
  const productMap = useMemo(() => {
    const map = new Map<string, Product>();
    dbState.products.forEach((p) => map.set(p.id, p));
    return map;
  }, [dbState.products]);

  // Base de todos os pedidos da empresa
  const companyOrdersAll = useMemo(() => {
    return dbState.orders.filter(
      (o) => o.companyId === currentCompany.id && o.type === 'venda' && o.status !== 'cancelado'
    );
  }, [dbState.orders, currentCompany.id]);

  const companyQuotesAll = useMemo(() => {
    return dbState.orders.filter(
      (o) => o.companyId === currentCompany.id && o.type === 'orcamento' && o.status !== 'cancelado'
    );
  }, [dbState.orders, currentCompany.id]);

  // Filtragem dinâmica de pedidos por período selecionado
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const thirtyDaysAgoIso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const periodOrders = useMemo(() => {
    return companyOrdersAll.filter((o) => {
      const orderDate = (o.createdAt || '').slice(0, 10);
      if (periodFilter === 'hoje') {
        return orderDate === todayIso;
      }
      if (periodFilter === 'mes_atual') {
        return orderDate.startsWith(currentMonthStr);
      }
      if (periodFilter === 'ultimos_30_dias') {
        return orderDate >= thirtyDaysAgoIso;
      }
      return true; // 'todos'
    });
  }, [companyOrdersAll, periodFilter, todayIso, currentMonthStr, thirtyDaysAgoIso]);

  const periodQuotes = useMemo(() => {
    return companyQuotesAll.filter((o) => {
      const orderDate = (o.createdAt || '').slice(0, 10);
      if (periodFilter === 'hoje') {
        return orderDate === todayIso;
      }
      if (periodFilter === 'mes_atual') {
        return orderDate.startsWith(currentMonthStr);
      }
      if (periodFilter === 'ultimos_30_dias') {
        return orderDate >= thirtyDaysAgoIso;
      }
      return true;
    });
  }, [companyQuotesAll, periodFilter, todayIso, currentMonthStr, thirtyDaysAgoIso]);

  // ==========================================
  // CÁLCULOS DE KPIS DE VENDAS (SALES KPIS)
  // ==========================================
  const salesGrossTotal = periodOrders.reduce((sum, o) => sum + (o.subtotal || o.total), 0);
  const salesDiscountsTotal = periodOrders.reduce((sum, o) => sum + (o.discountTotal || 0), 0);
  const salesNetTotal = periodOrders.reduce((sum, o) => sum + o.total, 0);
  const salesCount = periodOrders.length;
  const avgTicket = salesCount > 0 ? salesNetTotal / salesCount : 0;
  const totalUnitsSold = periodOrders.reduce((sum, o) => {
    return sum + (o.items || []).reduce((iSum, item) => iSum + (item.quantity || 1), 0);
  }, 0);
  const avgItemsPerOrder = salesCount > 0 ? totalUnitsSold / salesCount : 0;
  const discountRatePercent = salesGrossTotal > 0 ? (salesDiscountsTotal / salesGrossTotal) * 100 : 0;

  // Canais de Venda
  const pdvOrders = periodOrders.filter((o) => o.origin === 'pdv');
  const pdvRevenue = pdvOrders.reduce((sum, o) => sum + o.total, 0);

  const mobileOrders = periodOrders.filter((o) => o.origin === 'externa_celular');
  const mobileRevenue = mobileOrders.reduce((sum, o) => sum + o.total, 0);

  const backofficeOrders = periodOrders.filter((o) => o.origin !== 'pdv' && o.origin !== 'externa_celular');
  const backofficeRevenue = backofficeOrders.reduce((sum, o) => sum + o.total, 0);

  // Funil Comercial / Conversão de Orçamentos
  const quotesCount = periodQuotes.length;
  const quotesTotal = periodQuotes.reduce((sum, o) => sum + o.total, 0);
  const totalProposals = salesCount + quotesCount;
  const conversionRate = totalProposals > 0 ? (salesCount / totalProposals) * 100 : 0;

  // Meios de Pagamento
  const paymentMethodsStats = useMemo(() => {
    const map: Record<string, { count: number; total: number; label: string; color: string }> = {
      pix: { count: 0, total: 0, label: 'PIX Instantâneo', color: 'emerald' },
      cartao_credito: { count: 0, total: 0, label: 'Cartão de Crédito', color: 'blue' },
      cartao_debito: { count: 0, total: 0, label: 'Cartão de Débito', color: 'indigo' },
      dinheiro: { count: 0, total: 0, label: 'Dinheiro em Espécie', color: 'amber' },
      boleto: { count: 0, total: 0, label: 'Boleto / A Prazo', color: 'purple' },
      outros: { count: 0, total: 0, label: 'Outras Formas', color: 'slate' },
    };

    periodOrders.forEach((o) => {
      const pm = (o.paymentMethod || 'outros').toLowerCase();
      let key = 'outros';
      if (pm.includes('pix')) key = 'pix';
      else if (pm.includes('credito') || pm.includes('crédito')) key = 'cartao_credito';
      else if (pm.includes('debito') || pm.includes('débito')) key = 'cartao_debito';
      else if (pm.includes('dinheiro')) key = 'dinheiro';
      else if (pm.includes('boleto') || pm.includes('prazo')) key = 'boleto';

      map[key].count += 1;
      map[key].total += o.total;
    });

    return Object.entries(map)
      .map(([key, val]) => ({
        key,
        ...val,
        percentage: salesNetTotal > 0 ? (val.total / salesNetTotal) * 100 : 0,
      }))
      .filter((m) => m.count > 0 || m.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [periodOrders, salesNetTotal]);

  // ==========================================
  // CÁLCULOS DE KPIS DE LUCRATIVIDADE (PROFITABILITY KPIS)
  // ==========================================
  const profitabilityStats = useMemo(() => {
    let totalCmv = 0;
    let pdvCmv = 0;
    let mobileCmv = 0;
    let backofficeCmv = 0;

    const productRankingMap = new Map<
      string,
      {
        productId: string;
        code: string;
        name: string;
        unit: string;
        quantitySold: number;
        revenue: number;
        cmv: number;
        profit: number;
      }
    >();

    periodOrders.forEach((order) => {
      let orderCmv = 0;
      (order.items || []).forEach((item) => {
        const prod = productMap.get(item.productId);
        // Custo Unitário: prioriza o gravado no item, senão busca o costPrice do cadastro
        const unitCost =
          item.unitCost !== undefined && item.unitCost > 0
            ? item.unitCost
            : prod && prod.costPrice > 0
            ? prod.costPrice
            : item.unitPrice * 0.5; // fallback seguro 50%

        const itemCmv = unitCost * (item.quantity || 1);
        const itemRevenue = item.totalPrice !== undefined ? item.totalPrice : item.unitPrice * (item.quantity || 1) - (item.discountValue || 0);
        orderCmv += itemCmv;

        // Agrupamento por produto
        const prodId = item.productId || item.description;
        const existing = productRankingMap.get(prodId) || {
          productId: prodId,
          code: item.productCode || (prod ? prod.code : 'PROD'),
          name: item.description || (prod ? prod.description : 'Produto'),
          unit: item.unit || (prod ? prod.unit : 'UN'),
          quantitySold: 0,
          revenue: 0,
          cmv: 0,
          profit: 0,
        };

        existing.quantitySold += item.quantity || 1;
        existing.revenue += itemRevenue;
        existing.cmv += itemCmv;
        existing.profit += itemRevenue - itemCmv;
        productRankingMap.set(prodId, existing);
      });

      totalCmv += orderCmv;
      if (order.origin === 'pdv') pdvCmv += orderCmv;
      else if (order.origin === 'externa_celular') mobileCmv += orderCmv;
      else backofficeCmv += orderCmv;
    });

    const grossProfit = salesNetTotal - totalCmv;
    const grossMarginPercent = salesNetTotal > 0 ? (grossProfit / salesNetTotal) * 100 : 0;
    const markupPercent = totalCmv > 0 ? (grossProfit / totalCmv) * 100 : 0;
    const avgProfitPerOrder = salesCount > 0 ? grossProfit / salesCount : 0;

    // Canais - Lucro
    const pdvProfit = pdvRevenue - pdvCmv;
    const pdvMargin = pdvRevenue > 0 ? (pdvProfit / pdvRevenue) * 100 : 0;

    const mobileProfit = mobileRevenue - mobileCmv;
    const mobileMargin = mobileRevenue > 0 ? (mobileProfit / mobileRevenue) * 100 : 0;

    const backofficeProfit = backofficeRevenue - backofficeCmv;
    const backofficeMargin = backofficeRevenue > 0 ? (backofficeProfit / backofficeRevenue) * 100 : 0;

    // Ranking de produtos por lucro gerado
    const ranking = Array.from(productRankingMap.values())
      .map((p) => ({
        ...p,
        margin: p.revenue > 0 ? (p.profit / p.revenue) * 100 : 0,
        markup: p.cmv > 0 ? (p.profit / p.cmv) * 100 : 0,
      }))
      .sort((a, b) => b.profit - a.profit);

    return {
      totalCmv,
      grossProfit,
      grossMarginPercent,
      markupPercent,
      avgProfitPerOrder,
      pdvCmv,
      pdvProfit,
      pdvMargin,
      mobileCmv,
      mobileProfit,
      mobileMargin,
      backofficeCmv,
      backofficeProfit,
      backofficeMargin,
      ranking,
    };
  }, [periodOrders, productMap, salesNetTotal, salesCount, pdvRevenue, mobileRevenue, backofficeRevenue]);

  // Outros indicadores existentes (Estoque Crítico, Títulos, Caixa)
  const lowStockProducts = dbState.products.filter((p) => {
    const stock = StockEngine.getTotalProductStock(dbState.stockBalances, p.id);
    return p.status === 'ativo' && stock.available <= p.minStock;
  });

  const openReceivables = dbState.accountsReceivable
    .filter((r) => r.companyId === currentCompany.id && r.status !== 'recebido' && r.status !== 'cancelado')
    .reduce((s, r) => s + r.balance, 0);

  const openPayables = dbState.accountsPayable
    .filter((p) => p.companyId === currentCompany.id && p.status !== 'pago' && p.status !== 'cancelado')
    .reduce((s, p) => s + p.balance, 0);

  const paidPayablesTotal = dbState.accountsPayable
    .filter((p) => p.companyId === currentCompany.id && p.status === 'pago')
    .reduce((s, p) => s + (p.paidValue || p.originalValue), 0);

  const estimatedNetProfit = profitabilityStats.grossProfit - paidPayablesTotal;

  const activeRegister = dbState.cashRegisters.find(
    (c) => c.companyId === currentCompany.id && c.status === 'aberto'
  );

  const getPeriodLabel = () => {
    switch (periodFilter) {
      case 'hoje':
        return 'Hoje';
      case 'mes_atual':
        return 'Mês Atual';
      case 'ultimos_30_dias':
        return 'Últimos 30 Dias';
      case 'todos':
        return 'Todo o Histórico';
    }
  };

  return (
    <div className="space-y-4">
      {/* ALERTA DE CLIENTES COM PARCELAS VENCIDAS (TELA PRINCIPAL) */}
      {overdueReceivables.length > 0 && showTopAlert && (
        <div className="bg-gradient-to-r from-slate-950 via-rose-950/40 to-slate-900 text-white p-4 sm:p-5 rounded-2xl border-2 border-rose-500/50 shadow-lg space-y-3 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-xs shrink-0 animate-pulse">
                <AlertTriangle size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-black uppercase tracking-wider text-rose-400 bg-rose-500/20 px-2.5 py-0.5 rounded-full border border-rose-500/30">
                    Alerta de Inadimplência
                  </span>
                  <span className="text-xs font-black text-rose-300">
                    {overdueCustomersList.length} cliente{overdueCustomersList.length === 1 ? '' : 's'} com débitos vencidos
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-white tracking-tight mt-0.5">
                  Total em Atraso: <span className="text-rose-400 font-mono">{formatCurrency(totalOverdueBalance)}</span> ({overdueReceivables.length} parcela{overdueReceivables.length === 1 ? '' : 's'} vencida{overdueReceivables.length === 1 ? '' : 's'})
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap self-end sm:self-auto">
              <button
                type="button"
                onClick={() => onNavigate('external_sales')}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl shadow-xs transition-colors cursor-pointer"
                title="Abrir Análise de Clientes na Força de Vendas"
              >
                <Smartphone size={15} />
                <span>Analisar na Venda Mobile</span>
              </button>
              <button
                type="button"
                onClick={() => setShowOverdueDetails((prev) => !prev)}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-rose-200 text-xs font-bold rounded-xl border border-rose-500/30 transition-colors cursor-pointer"
              >
                <Eye size={14} />
                <span>{showOverdueDetails ? 'Ocultar Detalhes' : 'Ver Clientes'}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowTopAlert(false)}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-900/90 hover:bg-slate-800 text-rose-300 hover:text-white text-xs font-bold rounded-xl border border-rose-500/40 hover:border-rose-400 transition-colors cursor-pointer"
                title="Ocultar Alerta de Inadimplência no topo da tela"
              >
                <EyeOff size={14} />
                <span>Ocultar Alerta</span>
              </button>
              <button
                type="button"
                onClick={() => setShowTopAlert(false)}
                className="p-2 bg-slate-800/80 hover:bg-rose-900/60 text-slate-400 hover:text-rose-200 rounded-xl transition-colors cursor-pointer"
                title="Fechar alerta"
                aria-label="Fechar alerta"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Chips rápidos dos clientes com parcelas vencidas */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            {overdueCustomersList.map((c) => (
              <div
                key={c.customerId}
                className="bg-slate-900/90 border border-rose-500/30 rounded-xl px-3 py-1.5 flex items-center gap-2 shrink-0"
              >
                <span className="font-bold text-white text-xs">{c.customerName}</span>
                <span className="text-rose-400 font-mono font-black">{formatCurrency(c.totalBalance)}</span>
                <span className="text-[10px] text-rose-300/80 bg-rose-500/20 px-1.5 py-0.2 rounded">
                  {c.count} parcela{c.count === 1 ? '' : 's'}
                </span>
              </div>
            ))}
          </div>

          {/* Detalhes expandidos das parcelas vencidas */}
          {showOverdueDetails && (
            <div className="bg-slate-900/80 rounded-xl p-3 border border-rose-500/30 text-xs space-y-2 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-[11px] uppercase text-slate-400 border-b border-slate-800 font-bold">
                    <th className="py-1.5 px-2">Cliente</th>
                    <th className="py-1.5 px-2">Documento</th>
                    <th className="py-1.5 px-2">Vencimento</th>
                    <th className="py-1.5 px-2">Dias em Atraso</th>
                    <th className="py-1.5 px-2 text-right">Valor Vencido</th>
                    <th className="py-1.5 px-2 text-center">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {overdueReceivables.map((r) => {
                    const diffMs = new Date(todayIso).getTime() - new Date(r.dueDate).getTime();
                    const diffDays = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
                    return (
                      <tr key={r.id} className="hover:bg-slate-800/40">
                        <td className="py-2 px-2 font-bold text-white">{r.customerName}</td>
                        <td className="py-2 px-2 font-mono text-slate-300">{r.docNumber}</td>
                        <td className="py-2 px-2 text-rose-300">{new Date(r.dueDate).toLocaleDateString('pt-BR')}</td>
                        <td className="py-2 px-2 text-rose-400 font-bold">{diffDays} dias</td>
                        <td className="py-2 px-2 text-right font-mono font-black text-rose-400">
                          {formatCurrency(r.balance)}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => onNavigate('external_sales')}
                            className="text-[11px] font-bold text-emerald-400 hover:underline cursor-pointer"
                          >
                            Ver Análise
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Banner de Boas-Vindas */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-2xl p-5 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-blue-500/30 text-blue-300 font-bold px-2 py-0.5 rounded-full border border-blue-400/20 uppercase tracking-wider">
              {currentCompany.type === 'matriz' ? 'Matriz' : 'Filial'}
            </span>
            <span className="text-xs text-slate-400">
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold mt-1 tracking-tight">
            Olá, {currentUser.name.split(' ')[0]}! Bem-vindo ao GestãoFácil ERP
          </h1>
          <p className="text-xs text-slate-300 mt-0.5">
            Empresa ativa: <strong className="text-white">{currentCompany.tradeName || currentCompany.name}</strong> • CNPJ: {currentCompany.cnpjCpf}
          </p>
        </div>

        {/* Ações Rápidas */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigate('pos')}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
            title="Abrir PDV Balcão [F2]"
          >
            <ShoppingCart size={15} />
            <span>PDV Balcão</span>
            <kbd className="font-mono text-[10px] bg-emerald-700/90 text-emerald-100 px-1.5 py-0.2 rounded border border-emerald-500/60">
              F2
            </kbd>
          </button>
          <button
            onClick={() => onNavigate('orders')}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
            title="Módulo de Pedido de Venda & Orçamentos [F3]"
          >
            <ClipboardList size={15} />
            <span>Pedido de Venda</span>
            <kbd className="font-mono text-[10px] bg-blue-700/90 text-blue-100 px-1.5 py-0.2 rounded border border-blue-500/60">
              F3
            </kbd>
          </button>
          <button
            onClick={() => onNavigate('external_sales')}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
            title="Força de Vendas Mobile [F7]"
          >
            <Smartphone size={15} />
            <span>Venda Mobile</span>
            <kbd className="font-mono text-[10px] bg-blue-700/90 text-blue-100 px-1.5 py-0.2 rounded border border-blue-500/60">
              F7
            </kbd>
          </button>
        </div>
      </div>

      {/* Barra de Controle de Visualização do Dashboard de Indicadores e Filtros */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between bg-white px-4 py-3 rounded-2xl border border-slate-200 shadow-xs gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <LayoutDashboard size={17} />
          </div>
          <div>
            <div className="text-xs font-extrabold text-slate-800 flex items-center gap-2">
              <span>Painel Executivo: Dashboards de Vendas & Lucratividade</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-bold uppercase">
                {getPeriodLabel()}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Análise em tempo real de faturamento, margens brutas, canais e saúde comercial
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Seletor de Período dos Dashboards */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <button
              onClick={() => setPeriodFilter('hoje')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                periodFilter === 'hoje'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Hoje
            </button>
            <button
              onClick={() => setPeriodFilter('mes_atual')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                periodFilter === 'mes_atual'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Mês Atual
            </button>
            <button
              onClick={() => setPeriodFilter('ultimos_30_dias')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                periodFilter === 'ultimos_30_dias'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              30 Dias
            </button>
            <button
              onClick={() => setPeriodFilter('todos')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                periodFilter === 'todos'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Histórico Geral
            </button>
          </div>

          {overdueReceivables.length > 0 && (
            <button
              onClick={() => {
                setShowTopAlert((prev) => !prev);
                if (!showTopAlert) {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
              className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl transition-colors border cursor-pointer ${
                !showTopAlert
                  ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-300 shadow-2xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
              }`}
              title={
                !showTopAlert
                  ? 'Exibir Alerta de Inadimplência no topo da tela inicial'
                  : 'Ocultar Alerta de Inadimplência no topo da tela inicial'
              }
            >
              {!showTopAlert ? (
                <>
                  <AlertTriangle size={14} className="text-rose-600" />
                  <span>Alerta de Inadimplência ({overdueCustomersList.length})</span>
                </>
              ) : (
                <>
                  <EyeOff size={14} className="text-slate-500" />
                  <span>Ocultar Alerta</span>
                </>
              )}
            </button>
          )}

          <button
            onClick={toggleKpis}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition-colors border border-slate-200 cursor-pointer"
            title={isKpisHidden ? 'Exibir cards de indicadores' : 'Ocultar cards de indicadores'}
          >
            {isKpisHidden ? <Eye size={14} className="text-emerald-600" /> : <EyeOff size={14} className="text-slate-500" />}
            <span>{isKpisHidden ? 'Mostrar Indicadores' : 'Ocultar Indicadores'}</span>
          </button>
        </div>
      </div>

      {/* Grid de Indicadores Principais Executivos - Ocultável pelo usuário */}
      {!isKpisHidden ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 animate-in fade-in duration-200">
          {/* Faturamento */}
          <div
            onClick={() => onNavigate('orders_history')}
            className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-blue-400 hover:shadow-sm transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
              <span>Faturamento Líquido</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <DollarSign size={17} />
              </div>
            </div>
            {canViewTotalRevenue ? (
              <>
                <div className="text-xl sm:text-2xl font-black text-slate-900 mt-2 font-mono">
                  {formatCurrency(salesNetTotal)}
                </div>
                <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                  <span>{salesCount} vendas no período</span>
                  <span className="text-emerald-600 font-extrabold font-mono">Méd: {formatCurrency(avgTicket)}</span>
                </div>
              </>
            ) : (
              <>
                <div className="mt-2.5 py-1 px-2 bg-slate-50 border border-slate-200 rounded-lg inline-flex items-center gap-1.5 text-xs font-bold text-slate-500">
                  <Lock size={13} className="text-slate-400" />
                  <span>Valor Reservado</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-2">
                  <span>{salesCount} vendas no período</span>
                </div>
              </>
            )}
          </div>

          {/* Lucro Bruto e Margem */}
          {canViewGrossProfit ? (
            <div
              className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-emerald-400 hover:shadow-sm transition-all group"
            >
              <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
                <span>Lucro Bruto Real</span>
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Percent size={17} />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-black text-emerald-600 mt-2 font-mono">
                {formatCurrency(profitabilityStats.grossProfit)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                {canViewProfitMargin ? (
                  <>
                    <span className="font-bold text-slate-700">Margem: {profitabilityStats.grossMarginPercent.toFixed(1)}%</span>
                    <span className="text-blue-600 font-bold">Markup: {profitabilityStats.markupPercent.toFixed(1)}%</span>
                  </>
                ) : (
                  <span className="text-slate-400 italic">Margem oculta</span>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-slate-50/70 p-4 rounded-2xl border border-dashed border-slate-200 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
                <span>Lucro Bruto Real</span>
                <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center">
                  <Lock size={15} />
                </div>
              </div>
              <div className="my-1.5">
                <span className="text-xs font-bold text-slate-500 bg-slate-200/60 px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5">
                  <Lock size={13} className="text-slate-400" />
                  <span>Informação Restrita</span>
                </span>
              </div>
              <span className="text-[10px] text-slate-400 leading-tight">Lucro protegido pelo administrador</span>
            </div>
          )}

          {/* Previsões Financeiras */}
          <div
            onClick={() => onNavigate('financial')}
            className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-indigo-400 hover:shadow-sm transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
              <span>Contas & Caixa</span>
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <TrendingUp size={17} />
              </div>
            </div>
            {canViewCashBalances ? (
              <>
                <div className="text-xs font-semibold text-emerald-700 mt-2">
                  A Receber: <strong className="font-extrabold font-mono">{formatCurrency(openReceivables)}</strong>
                </div>
                <div className="text-xs font-semibold text-rose-600 mt-1">
                  A Pagar: <strong className="font-extrabold font-mono">{formatCurrency(openPayables)}</strong>
                </div>
              </>
            ) : (
              <div className="mt-2.5 py-1 px-2 bg-slate-50 border border-slate-200 rounded-lg inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <Lock size={13} className="text-slate-400" />
                <span>Saldos Restritos</span>
              </div>
            )}
          </div>

          {/* Estoque Crítico */}
          <div
            onClick={() => onNavigate('stock_movements')}
            className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-amber-400 hover:shadow-sm transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
              <span>Estoque Crítico</span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <AlertTriangle size={17} />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-amber-600 mt-2">
              {lowStockProducts.length} itens
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Abaixo do estoque de segurança
            </div>
          </div>
        </div>
      ) : (
        <div className="p-3 bg-slate-50 border border-dashed border-slate-300 rounded-2xl flex items-center justify-between text-xs text-slate-500">
          <span>Cards executivos rápidos estão ocultos.</span>
          <button
            onClick={toggleKpis}
            className="font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
          >
            Mostrar Novamente
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* SEÇÃO 1: DASHBOARD COMPLETO COM KPIS DE VENDAS */}
      {/* ======================================================== */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <BarChart3 size={19} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <span>Dashboard de Desempenho Comercial & Vendas</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  {getPeriodLabel()}
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Métricas de faturamento, volume de pedidos, canais de distribuição e taxa de conversão
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('orders_history')}
            className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 self-start sm:self-auto cursor-pointer hover:underline"
          >
            <span>Ver Histórico Detalhado</span>
            <ChevronRight size={14} />
          </button>
        </div>

        {/* Linha de KPIs de Vendas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
            <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">Faturamento Bruto</span>
            <div className="text-lg sm:text-xl font-black text-slate-900 font-mono mt-1">
              {formatCurrency(salesGrossTotal)}
            </div>
            <div className="text-[10px] text-slate-500 mt-1">
              Descontos: <strong className="text-rose-600 font-mono">{formatCurrency(salesDiscountsTotal)}</strong> ({discountRatePercent.toFixed(1)}%)
            </div>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
            <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">Ticket Médio</span>
            <div className="text-lg sm:text-xl font-black text-emerald-700 font-mono mt-1">
              {formatCurrency(avgTicket)}
            </div>
            <div className="text-[10px] text-slate-500 mt-1">
              Baseado em {salesCount} venda{salesCount === 1 ? '' : 's'} concluída{salesCount === 1 ? '' : 's'}
            </div>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
            <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">Itens Comercializados</span>
            <div className="text-lg sm:text-xl font-black text-blue-700 font-mono mt-1">
              {formatQuantity(totalUnitsSold)} un.
            </div>
            <div className="text-[10px] text-slate-500 mt-1">
              Média de <strong className="text-slate-800 font-mono">{avgItemsPerOrder.toFixed(1)}</strong> itens por pedido
            </div>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
            <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">Taxa de Conversão</span>
            <div className="text-lg sm:text-xl font-black text-purple-700 font-mono mt-1">
              {conversionRate.toFixed(1)}%
            </div>
            <div className="text-[10px] text-slate-500 mt-1">
              {salesCount} vendas de {totalProposals} negociações
            </div>
          </div>
        </div>

        {/* Gráfico / Comparativo de Canais e Meios de Pagamento */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-1">
          {/* Desempenho por Canal de Venda (6 cols) */}
          <div className="lg:col-span-6 bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Smartphone size={15} className="text-blue-600" />
                <span>Desempenho por Canal de Venda</span>
              </h3>
              <span className="text-[11px] text-slate-500 font-semibold">{salesCount} pedidos</span>
            </div>

            <div className="space-y-3">
              {/* Canal: PDV Balcão */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    PDV Balcão
                  </span>
                  <div className="text-right">
                    <span className="font-black text-slate-900 font-mono">{formatCurrency(pdvRevenue)}</span>
                    <span className="text-[10px] text-slate-500 ml-1.5">({pdvOrders.length} ped • {salesNetTotal > 0 ? ((pdvRevenue / salesNetTotal) * 100).toFixed(0) : 0}%)</span>
                  </div>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all"
                    style={{ width: `${salesNetTotal > 0 ? (pdvRevenue / salesNetTotal) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>

              {/* Canal: Vendas Mobile */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                    Vendas Mobile
                  </span>
                  <div className="text-right">
                    <span className="font-black text-slate-900 font-mono">{formatCurrency(mobileRevenue)}</span>
                    <span className="text-[10px] text-slate-500 ml-1.5">({mobileOrders.length} ped • {salesNetTotal > 0 ? ((mobileRevenue / salesNetTotal) * 100).toFixed(0) : 0}%)</span>
                  </div>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-500 h-full rounded-full transition-all"
                    style={{ width: `${salesNetTotal > 0 ? (mobileRevenue / salesNetTotal) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>

              {/* Canal: Retaguarda / Outros */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                    Retaguarda & Televendas
                  </span>
                  <div className="text-right">
                    <span className="font-black text-slate-900 font-mono">{formatCurrency(backofficeRevenue)}</span>
                    <span className="text-[10px] text-slate-500 ml-1.5">({backofficeOrders.length} ped • {salesNetTotal > 0 ? ((backofficeRevenue / salesNetTotal) * 100).toFixed(0) : 0}%)</span>
                  </div>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-500 h-full rounded-full transition-all"
                    style={{ width: `${salesNetTotal > 0 ? (backofficeRevenue / salesNetTotal) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-500">
              <span>Orçamentos Comerciais Pendentes:</span>
              <strong className="text-slate-800 font-mono">{quotesCount} emitidos ({formatCurrency(quotesTotal)})</strong>
            </div>
          </div>

          {/* Mix de Meios de Pagamento (6 cols) */}
          <div className="lg:col-span-6 bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Wallet size={15} className="text-emerald-600" />
                <span>Mix de Meios de Pagamento</span>
              </h3>
              <span className="text-[11px] text-slate-500 font-semibold font-mono">{formatCurrency(salesNetTotal)}</span>
            </div>

            {paymentMethodsStats.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                Nenhuma venda registrada no período selecionado.
              </div>
            ) : (
              <div className="space-y-2.5">
                {paymentMethodsStats.map((item) => (
                  <div key={item.key}>
                    <div className="flex items-center justify-between text-xs mb-0.5">
                      <span className="font-semibold text-slate-700">{item.label}</span>
                      <div className="text-right">
                        <span className="font-bold text-slate-900 font-mono">{formatCurrency(item.total)}</span>
                        <span className="text-[10px] text-slate-500 ml-1 font-mono">({item.percentage.toFixed(1)}%)</span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-blue-600 h-full rounded-full transition-all"
                        style={{ width: `${item.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-500">
              <span>Forma com maior participação:</span>
              <strong className="text-emerald-700 font-semibold">
                {paymentMethodsStats[0] ? `${paymentMethodsStats[0].label} (${paymentMethodsStats[0].percentage.toFixed(1)}%)` : 'N/A'}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SEÇÃO 2: DASHBOARD COMPLETO COM KPIS DE LUCRATIVIDADE */}
      {/* ======================================================== */}
      {canViewGrossProfit && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <TrendingUp size={19} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <span>Dashboard de Lucratividade & Margens Reais</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {getPeriodLabel()}
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Análise de Custo da Mercadoria Vendida (CMV), margem bruta sobre receita, markup praticado e rentabilidade
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => onNavigate('pricing_calculator')}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-200 transition-colors cursor-pointer flex items-center gap-1"
            >
              <span>Calculadora de Precificação</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>

        {/* Indicadores Chave de Lucratividade */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {/* 1. Lucro Bruto Total */}
          <div className="bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-200">
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800">Lucro Bruto Total</span>
            <div className="text-lg sm:text-2xl font-black text-emerald-700 font-mono mt-1">
              {formatCurrency(profitabilityStats.grossProfit)}
            </div>
            <div className="text-[10px] text-emerald-700/90 font-semibold mt-1">
              Receita menos Custo (CMV)
            </div>
          </div>

          {/* 2. Lucro Líquido Real & DRE */}
          {canViewNetProfit ? (
            <div className="bg-indigo-50/70 p-3.5 rounded-xl border border-indigo-200">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-indigo-950">Lucro Líquido (DRE)</span>
                <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800 uppercase">
                  Líquido
                </span>
              </div>
              <div className={`text-lg sm:text-2xl font-black font-mono mt-1 ${estimatedNetProfit >= 0 ? 'text-indigo-700' : 'text-rose-600'}`}>
                {formatCurrency(estimatedNetProfit)}
              </div>
              <div className="text-[10px] text-indigo-800/90 font-medium mt-1">
                Lucro Bruto menos Despesas Pagas
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 p-3.5 rounded-xl border border-dashed border-slate-200 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-bold uppercase tracking-wider">Lucro Líquido</span>
                <Lock size={13} />
              </div>
              <div className="my-1">
                <span className="text-[11px] font-bold text-slate-500 bg-slate-200/60 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                  <Lock size={11} className="text-slate-400" />
                  <span>Restrito</span>
                </span>
              </div>
              <span className="text-[10px] text-slate-400 leading-tight">Oculto pelo administrador</span>
            </div>
          )}

          {/* 3. Margem Bruta Consolidada */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Margem Bruta</span>
              <span className={`text-[10px] font-black px-1.5 py-0.2 rounded ${
                profitabilityStats.grossMarginPercent >= 40
                  ? 'bg-emerald-100 text-emerald-800'
                  : profitabilityStats.grossMarginPercent >= 25
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-amber-100 text-amber-800'
              }`}>
                {profitabilityStats.grossMarginPercent >= 40 ? 'Excelente' : profitabilityStats.grossMarginPercent >= 25 ? 'Saudável' : 'Atenção'}
              </span>
            </div>
            <div className="text-lg sm:text-2xl font-black text-slate-900 font-mono mt-1">
              {profitabilityStats.grossMarginPercent.toFixed(1)}%
            </div>
            <div className="text-[10px] text-slate-500 mt-1">
              Percentual sobre a venda
            </div>
          </div>

          {/* 4. CMV Total */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Custo Total (CMV)</span>
            <div className="text-lg sm:text-xl font-black text-slate-800 font-mono mt-1">
              {canViewProductCosts ? formatCurrency(profitabilityStats.totalCmv) : '••••'}
            </div>
            <div className="text-[10px] text-slate-500 mt-1">
              {salesNetTotal > 0 && canViewTotalRevenue ? `${((profitabilityStats.totalCmv / salesNetTotal) * 100).toFixed(1)}% da receita` : 'Custo operacional'}
            </div>
          </div>

          {/* 5. Markup Médio */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Markup Praticado</span>
            <div className="text-lg sm:text-xl font-black text-blue-700 font-mono mt-1">
              {canViewProfitMargin ? `${profitabilityStats.markupPercent.toFixed(1)}%` : '••••'}
            </div>
            <div className="text-[10px] text-slate-500 mt-1">
              Multiplicador s/ custo
            </div>
          </div>

          {/* 6. Lucro Médio por Pedido */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Lucro Médio / Pedido</span>
            <div className="text-lg sm:text-xl font-black text-emerald-700 font-mono mt-1">
              {formatCurrency(profitabilityStats.avgProfitPerOrder)}
            </div>
            <div className="text-[10px] text-slate-500 mt-1">
              Por transação concluída
            </div>
          </div>
        </div>

        {/* Rentabilidade por Canal de Venda */}
        <div className="bg-slate-50/60 p-4 rounded-xl border border-slate-200 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <Scale size={15} className="text-emerald-600" />
            <span>Rentabilidade e Margem de Lucro por Canal de Venda</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-bold text-slate-800">PDV Balcão</span>
                <span className="text-[11px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  {profitabilityStats.pdvMargin.toFixed(1)}% margem
                </span>
              </div>
              <div className="text-base font-black text-slate-900 font-mono">
                {formatCurrency(profitabilityStats.pdvProfit)}
              </div>
              <div className="text-[10px] text-slate-500 flex justify-between mt-1">
                <span>Venda: {formatCurrency(pdvRevenue)}</span>
                <span>CMV: {formatCurrency(profitabilityStats.pdvCmv)}</span>
              </div>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-bold text-slate-800">Venda Mobile</span>
                <span className="text-[11px] font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                  {profitabilityStats.mobileMargin.toFixed(1)}% margem
                </span>
              </div>
              <div className="text-base font-black text-slate-900 font-mono">
                {formatCurrency(profitabilityStats.mobileProfit)}
              </div>
              <div className="text-[10px] text-slate-500 flex justify-between mt-1">
                <span>Venda: {formatCurrency(mobileRevenue)}</span>
                <span>CMV: {formatCurrency(profitabilityStats.mobileCmv)}</span>
              </div>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-bold text-slate-800">Retaguarda & Outros</span>
                <span className="text-[11px] font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                  {profitabilityStats.backofficeMargin.toFixed(1)}% margem
                </span>
              </div>
              <div className="text-base font-black text-slate-900 font-mono">
                {formatCurrency(profitabilityStats.backofficeProfit)}
              </div>
              <div className="text-[10px] text-slate-500 flex justify-between mt-1">
                <span>Venda: {formatCurrency(backofficeRevenue)}</span>
                <span>CMV: {formatCurrency(profitabilityStats.backofficeCmv)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Ranking de Produtos por Contribuição de Lucro */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Award size={15} className="text-amber-500" />
              <span>Top Produtos com Maior Contribuição de Lucro Bruto</span>
            </h3>
            <span className="text-[11px] text-slate-400">Ordenado por lucro em R$</span>
          </div>

          {profitabilityStats.ranking.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
              Nenhum item faturado no período selecionado para compor o ranking.
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-[11px] uppercase font-bold text-slate-500 border-b border-slate-200">
                    <th className="py-2.5 px-3">Produto</th>
                    <th className="py-2.5 px-2 text-center">Qtd Vendida</th>
                    <th className="py-2.5 px-2 text-right">Faturamento</th>
                    <th className="py-2.5 px-2 text-right">Custo (CMV)</th>
                    <th className="py-2.5 px-3 text-right">Lucro Bruto (R$)</th>
                    <th className="py-2.5 px-2 text-right">Margem %</th>
                    <th className="py-2.5 px-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {profitabilityStats.ranking.slice(0, 5).map((prod, idx) => (
                    <tr key={prod.productId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2 px-3">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full bg-slate-100 text-[10px] text-slate-600 font-mono flex items-center justify-center font-bold">
                            {idx + 1}
                          </span>
                          <span>{prod.name}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono ml-5.5">{prod.code}</div>
                      </td>
                      <td className="py-2 px-2 text-center font-mono font-semibold text-slate-700">
                        {formatQuantity(prod.quantitySold)} {prod.unit}
                      </td>
                      <td className="py-2 px-2 text-right font-mono font-semibold text-slate-800">
                        {formatCurrency(prod.revenue)}
                      </td>
                      <td className="py-2 px-2 text-right font-mono text-slate-500">
                        {formatCurrency(prod.cmv)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-black text-emerald-600">
                        {formatCurrency(prod.profit)}
                      </td>
                      <td className="py-2 px-2 text-right font-mono font-bold text-slate-800">
                        {prod.margin.toFixed(1)}%
                      </td>
                      <td className="py-2 px-2 text-center">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          prod.margin >= 40
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : prod.margin >= 20
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {prod.margin >= 40 ? 'Alta' : prod.margin >= 20 ? 'Boa' : 'Baixa'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      )}

      {/* ======================================================== */}
      {/* SEÇÃO 3: RECURSOS COMPLEMENTARES & ATALHOS OPERACIONAIS */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Acesso aos Módulos Principais (8 cols) */}
        <div className="md:col-span-8 space-y-3">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Layers size={16} className="text-blue-600" />
                <span>Recursos Operacionais & Gestão Avançada</span>
              </h3>
              <span className="text-[11px] text-slate-400">Atalhos rápidos integrados</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              <button
                onClick={() => onNavigate('bom_composition')}
                className="p-3 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-xl text-left transition-all cursor-pointer group"
              >
                <Boxes size={22} className="text-blue-600 mb-1.5 group-hover:scale-105 transition-transform" />
                <div className="font-bold text-slate-800">Composição</div>
                <div className="text-[10px] text-slate-500">Fórmulas e produção</div>
              </button>

              <button
                onClick={() => onNavigate('pricing_calculator')}
                className="p-3 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-xl text-left transition-all cursor-pointer group"
              >
                <TrendingUp size={22} className="text-emerald-600 mb-1.5 group-hover:scale-105 transition-transform" />
                <div className="font-bold text-slate-800">Precificação</div>
                <div className="text-[10px] text-slate-500">Margem real sobre venda</div>
              </button>

              <button
                onClick={() => onNavigate('excel_tools')}
                className="p-3 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-xl text-left transition-all cursor-pointer group"
              >
                <FileSpreadsheet size={22} className="text-emerald-600 mb-1.5 group-hover:scale-105 transition-transform" />
                <div className="font-bold text-slate-800">Planilhas Excel</div>
                <div className="text-[10px] text-slate-500">Importação e modelos</div>
              </button>

              <button
                onClick={() => onNavigate('purchases')}
                className="p-3 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-xl text-left transition-all cursor-pointer group"
              >
                <Package size={22} className="text-blue-600 mb-1.5 group-hover:scale-105 transition-transform" />
                <div className="font-bold text-slate-800">Compras</div>
                <div className="text-[10px] text-slate-500">Pedidos e suprimentos</div>
              </button>
            </div>
          </div>

          {/* Atalho para Consulta do Histórico de Vendas */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                <Clock size={20} />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">Histórico de Pedidos e Vendas Faturadas</div>
                <div className="text-[11px] text-slate-500">
                  {companyOrdersAll.length} pedido(s) registrado(s) no sistema da empresa
                </div>
              </div>
            </div>
            <button
              onClick={() => onNavigate('orders_history')}
              className="px-3.5 py-2 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
              title="Acessar Histórico Completo [F9]"
            >
              <span>Ver Histórico Completo</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* Status do Caixa PDV Atual (4 cols) */}
        <div className="md:col-span-4 space-y-3">
          <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-md space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">Turno de Caixa PDV</span>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                activeRegister ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-300'
              }`}>
                {activeRegister ? 'Aberto' : 'Fechado'}
              </span>
            </div>
            {activeRegister ? (
              <div className="space-y-1 text-xs text-slate-300">
                <div>
                  Operador: <strong className="text-white">{activeRegister.userName}</strong>
                </div>
                <div>
                  Fundo de Troco Inicial:{' '}
                  <strong className="text-emerald-400 font-mono">{formatCurrency(activeRegister.initialBalance)}</strong>
                </div>
                <div className="pt-2">
                  <button
                    onClick={() => onNavigate('pos')}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl transition-colors cursor-pointer text-center"
                  >
                    Ir para Frente de Caixa
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2 text-xs text-slate-400">
                <p>O caixa do PDV Balcão encontra-se fechado no momento.</p>
                <button
                  onClick={() => onNavigate('pos')}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-colors cursor-pointer text-center"
                >
                  Abrir Caixa no PDV
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
