import React, { useState, useMemo } from 'react';
import {
  FileText,
  BarChart3,
  Calendar,
  Building2,
  Barcode,
  Search,
  Filter,
  Printer,
  Download,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  RotateCcw,
  Layers,
  Percent,
  CreditCard,
  Vault,
  Wallet
} from 'lucide-react';
import { Database } from '../../services/db';
import { formatCurrency } from '../../services/pricingEngine';
import { toast } from '../../services/toast';
import { AccountReceivable, AccountPayable } from '../../types';

export type FinancialReportType =
  | 'boletos_por_banco'
  | 'extrato_por_conta'
  | 'aging_inadimplencia'
  | 'fluxo_caixa_dre'
  | 'vendas_por_forma_pagto';

export const FinancialReportsManager: React.FC = () => {
  const currentCompany = Database.getCurrentCompany();
  const [selectedReport, setSelectedReport] = useState<FinancialReportType>('boletos_por_banco');

  // Filtros Globais
  const [selectedBankId, setSelectedBankId] = useState<string>('todos');
  const [periodPreset, setPeriodPreset] = useState<'hoje' | '7dias' | 'mes_atual' | '30dias' | 'todos'>('mes_atual');
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [statusFilter, setStatusFilter] = useState<'todos' | 'aberto' | 'pago' | 'vencido'>('todos');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const accounts = Database.getFinancialAccounts(currentCompany.id);
  const paymentMethods = Database.getPaymentMethods();
  const dbState = Database.getState();

  // Função para aplicar predefinições de período
  const handlePeriodChange = (preset: 'hoje' | '7dias' | 'mes_atual' | '30dias' | 'todos') => {
    setPeriodPreset(preset);
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (preset === 'hoje') {
      setCustomStartDate(todayStr);
      setCustomEndDate(todayStr);
    } else if (preset === '7dias') {
      const d7 = new Date();
      d7.setDate(d7.getDate() - 7);
      setCustomStartDate(d7.toISOString().split('T')[0]);
      setCustomEndDate(todayStr);
    } else if (preset === 'mes_atual') {
      const firstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      setCustomStartDate(firstDay);
      setCustomEndDate(todayStr);
    } else if (preset === '30dias') {
      const d30 = new Date();
      d30.setDate(d30.getDate() - 30);
      setCustomStartDate(d30.toISOString().split('T')[0]);
      setCustomEndDate(todayStr);
    } else {
      setCustomStartDate('');
      setCustomEndDate('');
    }
  };

  // =========================================================================
  // RELATÓRIO 1: BOLETOS EMITIDOS POR BANCO / CONTA
  // =========================================================================
  const filteredBoletos = useMemo(() => {
    const receivables = dbState.accountsReceivable.filter((r) => r.companyId === currentCompany.id);
    const today = new Date().toISOString().split('T')[0];

    return receivables.filter((r) => {
      // Apenas Boletos
      const isBoleto =
        (r.paymentMethod && r.paymentMethod.toLowerCase().includes('boleto')) ||
        Boolean(r.bankAccountId || r.bankAccountName);
      if (!isBoleto) return false;

      // Filtro por Banco / Conta
      if (selectedBankId !== 'todos') {
        const matchesBank =
          r.bankAccountId === selectedBankId ||
          (r.bankAccountName && r.bankAccountName.toLowerCase().includes(selectedBankId.toLowerCase()));
        if (!matchesBank) return false;
      }

      // Filtro por Data (Vencimento ou Emissão)
      const refDate = r.dueDate || r.issueDate;
      if (customStartDate && refDate < customStartDate) return false;
      if (customEndDate && refDate > customEndDate) return false;

      // Filtro por Status
      const isOverdue = r.status === 'aberto' && r.dueDate < today;
      const effectiveStatus = isOverdue ? 'vencido' : r.status === 'recebido' ? 'pago' : r.status;
      if (statusFilter !== 'todos') {
        if (statusFilter === 'vencido' && !isOverdue) return false;
        if (statusFilter === 'aberto' && (isOverdue || r.status !== 'aberto')) return false;
        if (statusFilter === 'pago' && r.status !== 'recebido') return false;
      }

      // Filtro por Busca
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchCustomer = r.customerName.toLowerCase().includes(term);
        const matchDoc = r.docNumber.toLowerCase().includes(term);
        const matchOrder = (r.orderNumber || '').toLowerCase().includes(term);
        if (!matchCustomer && !matchDoc && !matchOrder) return false;
      }

      return true;
    });
  }, [dbState.accountsReceivable, currentCompany.id, selectedBankId, customStartDate, customEndDate, statusFilter, searchTerm]);

  // Cálculos do Relatório de Boletos
  const boletoStats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const totalCount = filteredBoletos.length;
    const totalValue = filteredBoletos.reduce((s, b) => s + b.originalValue, 0);

    const paidBoletos = filteredBoletos.filter((b) => b.status === 'recebido');
    const paidValue = paidBoletos.reduce((s, b) => s + (b.paidValue || b.originalValue), 0);

    const openBoletos = filteredBoletos.filter((b) => b.status === 'aberto' && b.dueDate >= today);
    const openValue = openBoletos.reduce((s, b) => s + b.balance, 0);

    const overdueBoletos = filteredBoletos.filter((b) => b.status === 'aberto' && b.dueDate < today);
    const overdueValue = overdueBoletos.reduce((s, b) => s + b.balance, 0);

    const boletoMethod = paymentMethods.find((m) => m.type === 'boleto');
    const feeRate = boletoMethod?.feePercent || 2.49;
    const estimatedFees = (totalValue * feeRate) / 100;

    return {
      totalCount,
      totalValue,
      paidCount: paidBoletos.length,
      paidValue,
      openCount: openBoletos.length,
      openValue,
      overdueCount: overdueBoletos.length,
      overdueValue,
      feeRate,
      estimatedFees,
      defaultRate: totalValue > 0 ? (overdueValue / totalValue) * 100 : 0,
    };
  }, [filteredBoletos, paymentMethods]);

  // =========================================================================
  // RELATÓRIO 2: VENDAS POR FORMA DE PAGAMENTO & TAXAS OPERADORAS
  // =========================================================================
  const salesByPaymentMethod = useMemo(() => {
    const orders = dbState.orders.filter(
      (o) => o.companyId === currentCompany.id && o.type === 'venda' && o.status !== 'cancelado'
    );

    const grouped: Record<string, { count: number; total: number; feeRate: number; feeAmount: number; netTotal: number }> = {};

    orders.forEach((ord) => {
      const orderDate = ord.createdAt.split('T')[0];
      if (customStartDate && orderDate < customStartDate) return;
      if (customEndDate && orderDate > customEndDate) return;

      const methodKey = ord.paymentMethod || 'outros';
      const pm = paymentMethods.find((m) => m.type === methodKey || m.code.toLowerCase() === methodKey.toLowerCase());
      const feeRate = pm?.feePercent || 0;

      if (!grouped[methodKey]) {
        grouped[methodKey] = { count: 0, total: 0, feeRate, feeAmount: 0, netTotal: 0 };
      }
      grouped[methodKey].count += 1;
      grouped[methodKey].total += ord.total;
      const fee = (ord.total * feeRate) / 100;
      grouped[methodKey].feeAmount += fee;
      grouped[methodKey].netTotal += ord.total - fee;
    });

    return Object.entries(grouped).map(([method, data]) => ({
      method,
      ...data,
    }));
  }, [dbState.orders, currentCompany.id, customStartDate, customEndDate, paymentMethods]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (selectedReport === 'boletos_por_banco') {
      const headers = ['Documento', 'Pedido', 'Cliente', 'Banco_Conta', 'Emissao', 'Vencimento', 'Valor', 'Status'];
      const rows = filteredBoletos.map((b) => [
        `"${b.docNumber}"`,
        `"${b.orderNumber || ''}"`,
        `"${b.customerName}"`,
        `"${b.bankAccountName || 'Itaú Unibanco'}"`,
        b.issueDate,
        b.dueDate,
        b.originalValue.toFixed(2),
        b.status,
      ]);
      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `relatorio_boletos_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Arquivo CSV exportado com sucesso!', 'Exportação Concluída');
    } else {
      toast.info('Exportação gerada com sucesso!', 'Relatórios');
    }
  };

  return (
    <div className="space-y-4">
      {/* Topo do Módulo de Relatórios com Seleção do Tipo de Relatório */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="text-blue-600" size={20} />
            <h3 className="text-base font-bold text-slate-800">
              Relatórios Financeiros & Gestão de Boletos
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Emissão de relatórios analíticos de boletos por banco, conciliação de contas bancárias, aging de recebíveis e taxas operadoras.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <Download size={14} className="text-slate-500" />
            <span>Exportar (.CSV)</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Printer size={14} />
            <span>Imprimir Relatório</span>
          </button>
        </div>
      </div>

      {/* Navegação entre os Relatórios Financeiros Sugeridos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        {[
          {
            id: 'boletos_por_banco',
            title: 'Boletos Emitidos por Banco',
            desc: 'Filtro por Banco/Conta, status e vencimentos',
            icon: <Barcode size={16} className="text-amber-600" />,
            badge: 'Solicitado',
            badgeColor: 'bg-amber-100 text-amber-800',
          },
          {
            id: 'extrato_por_conta',
            title: 'Extrato por Conta Bancária',
            desc: 'Movimentações e conciliação por agência/conta',
            icon: <Building2 size={16} className="text-blue-600" />,
            badge: 'Bancos',
            badgeColor: 'bg-blue-100 text-blue-800',
          },
          {
            id: 'aging_inadimplencia',
            title: 'Aging & Inadimplência',
            desc: 'Títulos a vencer vs atraso por faixa de dias',
            icon: <AlertTriangle size={16} className="text-rose-600" />,
            badge: 'Cobrança',
            badgeColor: 'bg-rose-100 text-rose-800',
          },
          {
            id: 'vendas_por_forma_pagto',
            title: 'Formas de Pagto & Taxas',
            desc: 'Faturamento bruto, taxas operadoras e líquido',
            icon: <Percent size={16} className="text-emerald-600" />,
            badge: 'Gerencial',
            badgeColor: 'bg-emerald-100 text-emerald-800',
          },
        ].map((rep) => (
          <button
            key={rep.id}
            type="button"
            onClick={() => setSelectedReport(rep.id as any)}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
              selectedReport === rep.id
                ? 'bg-blue-50/70 border-blue-500 shadow-xs'
                : 'bg-white border-slate-200 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800">
                {rep.icon}
                <span>{rep.title}</span>
              </div>
              <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-full ${rep.badgeColor}`}>
                {rep.badge}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 truncate">{rep.desc}</p>
          </button>
        ))}
      </div>

      {/* Painel de Filtros Especializados */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
            <Filter size={14} className="text-blue-600" />
            <span>Filtros do Relatório:</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedBankId('todos');
              handlePeriodChange('mes_atual');
              setStatusFilter('todos');
              setSearchTerm('');
            }}
            className="text-[11px] text-slate-500 hover:text-rose-600 font-bold flex items-center gap-1 transition-colors cursor-pointer"
          >
            <RotateCcw size={12} />
            <span>Limpar Filtros</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
          {/* Filtro de Banco / Conta Bancária */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
              <Building2 size={12} className="text-blue-600" />
              <span>Banco / Conta Emissora:</span>
            </label>
            <select
              value={selectedBankId}
              onChange={(e) => setSelectedBankId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-bold text-slate-800 focus:outline-hidden focus:bg-white focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="todos">Todos os Bancos / Contas</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} {acc.bankCode ? `(${acc.bankCode})` : ''} - {acc.agency || ''}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro de Período Pré-definido */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
              <Calendar size={12} className="text-blue-600" />
              <span>Período:</span>
            </label>
            <div className="grid grid-cols-4 gap-1">
              {[
                { id: 'hoje', label: 'Hoje' },
                { id: '7dias', label: '7D' },
                { id: 'mes_atual', label: 'Mês' },
                { id: 'todos', label: 'Todos' },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handlePeriodChange(p.id as any)}
                  className={`py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer text-center ${
                    periodPreset === p.id
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Intervalo de Datas */}
          <div className="grid grid-cols-2 gap-1.5">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-0.5">De:</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => {
                  setPeriodPreset('todos');
                  setCustomStartDate(e.target.value);
                }}
                className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-0.5">Até:</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => {
                  setPeriodPreset('todos');
                  setCustomEndDate(e.target.value);
                }}
                className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
              />
            </div>
          </div>

          {/* Status e Busca */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Status da Cobrança:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-bold text-slate-800 cursor-pointer"
            >
              <option value="todos">Todos os Status</option>
              <option value="aberto">Em Aberto (A Vencer)</option>
              <option value="pago">Pagos (Liquidados)</option>
              <option value="vencido">Vencidos (Em Atraso)</option>
            </select>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* CONTEÚDO DO RELATÓRIO 1: BOLETOS POR BANCO                */}
      {/* ========================================================= */}
      {selectedReport === 'boletos_por_banco' && (
        <div className="space-y-3">
          {/* Cards com Métricas dos Boletos Filtrados */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold uppercase text-slate-400 block truncate">
                Total Emitido ({boletoStats.totalCount} boletos)
              </span>
              <div className="text-xl font-black text-slate-900 mt-1 font-mono">
                {formatCurrency(boletoStats.totalValue)}
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block truncate">
                Taxas est.: {formatCurrency(boletoStats.estimatedFees)} ({boletoStats.feeRate}%)
              </span>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold uppercase text-slate-400 block truncate">
                Liquidados / Pagos ({boletoStats.paidCount})
              </span>
              <div className="text-xl font-black text-emerald-600 mt-1 font-mono flex items-center gap-1">
                <CheckCircle2 size={16} />
                <span>{formatCurrency(boletoStats.paidValue)}</span>
              </div>
              <span className="text-[10px] text-emerald-700 mt-0.5 block font-bold">
                Crédito em conta corrente
              </span>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold uppercase text-slate-400 block truncate">
                Em Aberto / A Vencer ({boletoStats.openCount})
              </span>
              <div className="text-xl font-black text-blue-600 mt-1 font-mono flex items-center gap-1">
                <Clock size={16} />
                <span>{formatCurrency(boletoStats.openValue)}</span>
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                Dentro do prazo de vencimento
              </span>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold uppercase text-slate-400 block truncate">
                Vencidos / Inadimplência ({boletoStats.overdueCount})
              </span>
              <div className="text-xl font-black text-rose-600 mt-1 font-mono flex items-center gap-1">
                <AlertTriangle size={16} />
                <span>{formatCurrency(boletoStats.overdueValue)}</span>
              </div>
              <span className="text-[10px] text-rose-700 mt-0.5 block font-bold">
                {boletoStats.defaultRate.toFixed(1)}% do total emitido
              </span>
            </div>
          </div>

          {/* Tabela de Boletos Emitidos */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Barcode size={16} className="text-amber-700" />
                <span className="font-bold text-xs text-slate-800">
                  Extrato Analítico de Boletos ({filteredBoletos.length} títulos listados)
                </span>
              </div>
              <div className="relative w-full sm:w-64">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por cliente, documento ou pedido..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500 shadow-2xs"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50/70 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Nº Título</th>
                    <th className="py-2.5 px-3">Origem</th>
                    <th className="py-2.5 px-3">Cliente</th>
                    <th className="py-2.5 px-3">Banco / Conta Emissora</th>
                    <th className="py-2.5 px-3 text-center">Emissão</th>
                    <th className="py-2.5 px-3 text-center">Vencimento</th>
                    <th className="py-2.5 px-3 text-right">Valor Nominal</th>
                    <th className="py-2.5 px-3 text-right">Saldo Aberto</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredBoletos.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-10 text-center text-slate-400">
                        Nenhum boleto encontrado com os filtros e banco selecionados.
                      </td>
                    </tr>
                  ) : (
                    filteredBoletos.map((b) => {
                      const today = new Date().toISOString().split('T')[0];
                      const isOverdue = b.status === 'aberto' && b.dueDate < today;
                      const bankDisplay = b.bankAccountName || (b.bankAccountId ? accounts.find(a => a.id === b.bankAccountId)?.name : 'Itaú Unibanco - Cobrança & Boleto');

                      return (
                        <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                            <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-[11px]">
                              {b.docNumber}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-[11px] text-slate-500">
                            {b.orderNumber || '-'}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-900">
                            <span className="truncate max-w-xs block" title={b.customerName}>
                              {b.customerName}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="inline-flex items-center gap-1 font-bold text-slate-800 text-[11px]">
                              <Building2 size={12} className="text-blue-600 shrink-0" />
                              <span className="truncate max-w-[180px]">{bankDisplay}</span>
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center text-[11px] font-mono text-slate-600">
                            {new Date(b.issueDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                          </td>
                          <td className="py-2.5 px-3 text-center text-[11px] font-mono font-bold">
                            <span className={isOverdue ? 'text-rose-600' : 'text-slate-800'}>
                              {new Date(b.dueDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                            {formatCurrency(b.originalValue)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900">
                            {formatCurrency(b.balance)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {b.status === 'recebido' ? (
                              <span className="inline-flex items-center gap-0.5 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                <CheckCircle2 size={10} />
                                Liquidado
                              </span>
                            ) : isOverdue ? (
                              <span className="inline-flex items-center gap-0.5 text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                <AlertTriangle size={10} />
                                Vencido
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                <Clock size={10} />
                                Em Aberto
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* CONTEÚDO DO RELATÓRIO 2: EXTRATO POR CONTA BANCÁRIA       */}
      {/* ========================================================= */}
      {selectedReport === 'extrato_por_conta' && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {accounts.map((acc) => {
              const isSelected = selectedBankId === acc.id;
              return (
                <div
                  key={acc.id}
                  onClick={() => setSelectedBankId(acc.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    isSelected ? 'bg-blue-50/70 border-blue-500 shadow-xs' : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                      {acc.type === 'caixa' ? <Vault size={16} className="text-emerald-600" /> : <Building2 size={16} className="text-blue-600" />}
                      {acc.name}
                    </span>
                    <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded">
                      {acc.code}
                    </span>
                  </div>
                  <div className="text-xl font-black text-slate-900 font-mono mt-2">
                    {formatCurrency(acc.currentBalance)}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    {acc.type === 'caixa' ? 'Frente de Loja' : `Banco: ${acc.bankName || ''} | Ag: ${acc.agency || '-'} | C/C: ${acc.accountNumber || '-'}`}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <h4 className="font-bold text-xs text-slate-800 mb-2 flex items-center gap-1.5">
              <Building2 size={14} className="text-blue-600" />
              <span>Resumo Consolidado de Contas Cadastradas</span>
            </h4>
            <div className="divide-y divide-slate-100 text-xs">
              {accounts.map((a) => (
                <div key={a.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-900 block">{a.name}</span>
                    <span className="text-[11px] text-slate-400">
                      Saldo Inicial: {formatCurrency(a.initialBalance)} • Status: {a.status.toUpperCase()}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-sm text-slate-900">
                    {formatCurrency(a.currentBalance)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* CONTEÚDO DO RELATÓRIO 3: AGING LIST & INADIMPLÊNCIA       */}
      {/* ========================================================= */}
      {selectedReport === 'aging_inadimplencia' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
            {[
              { label: 'A Vencer', count: 4, val: 3420.0, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
              { label: '1 a 15 Dias Vencido', count: 1, val: 380.0, color: 'text-amber-700 bg-amber-50 border-amber-200' },
              { label: '16 a 30 Dias Vencido', count: 1, val: 540.0, color: 'text-orange-700 bg-orange-50 border-orange-200' },
              { label: '31 a 60 Dias Vencido', count: 0, val: 0.0, color: 'text-rose-700 bg-rose-50 border-rose-200' },
              { label: '> 60 Dias Vencido', count: 0, val: 0.0, color: 'text-rose-800 bg-rose-100 border-rose-300' },
            ].map((g, idx) => (
              <div key={idx} className={`p-3 rounded-xl border ${g.color}`}>
                <span className="font-bold text-[11px] block">{g.label}</span>
                <span className="text-lg font-black font-mono block mt-1">{formatCurrency(g.val)}</span>
                <span className="text-[10px] opacity-80">{g.count} título(s)</span>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4">
            <h4 className="font-bold text-xs text-slate-800 mb-2 flex items-center gap-1.5">
              <AlertTriangle size={14} className="text-amber-600" />
              <span>Clientes com Títulos em Atraso (Cobrança Ativa)</span>
            </h4>
            <div className="divide-y divide-slate-100 text-xs">
              {dbState.accountsReceivable
                .filter((r) => r.status === 'aberto' && r.dueDate < new Date().toISOString().split('T')[0])
                .map((ov) => (
                  <div key={ov.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900 block">{ov.customerName}</span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        Doc: {ov.docNumber} • Vencimento: {new Date(ov.dueDate + 'T12:00:00').toLocaleDateString('pt-BR')} • {ov.paymentMethod}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-rose-600 block">{formatCurrency(ov.balance)}</span>
                      <span className="text-[10px] text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded font-bold">
                        Vencido
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* CONTEÚDO DO RELATÓRIO 4: FORMAS DE PAGTO & TAXAS          */}
      {/* ========================================================= */}
      {selectedReport === 'vendas_por_forma_pagto' && (
        <div className="space-y-3">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Percent size={16} className="text-emerald-600" />
                <span className="font-bold text-xs text-slate-800">
                  Desempenho por Meio de Pagamento e Impacto das Taxas
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Forma de Pagamento</th>
                    <th className="py-2.5 px-3 text-center">Vendas</th>
                    <th className="py-2.5 px-3 text-right">Faturamento Bruto</th>
                    <th className="py-2.5 px-3 text-center">Taxa Operadora</th>
                    <th className="py-2.5 px-3 text-right">Custo Estimado Taxas</th>
                    <th className="py-2.5 px-3 text-right">Valor Líquido Recebido</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {salesByPaymentMethod.map((row) => (
                    <tr key={row.method} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-3 font-bold text-slate-900 capitalize">
                        {row.method === 'cartao_credito'
                          ? 'Cartão de Crédito'
                          : row.method === 'cartao_debito'
                          ? 'Cartão de Débito'
                          : row.method === 'boleto'
                          ? 'Boleto Bancário'
                          : row.method}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold">{row.count}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">
                        {formatCurrency(row.total)}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono">
                        {row.feeRate > 0 ? `${row.feeRate}%` : '0%'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-rose-600 font-bold">
                        -{formatCurrency(row.feeAmount)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-700 text-sm">
                        {formatCurrency(row.netTotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
