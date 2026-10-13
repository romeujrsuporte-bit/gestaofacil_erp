import React, { useState, useEffect } from 'react';
import {
  CircleDollarSign,
  TrendingDown,
  TrendingUp,
  Vault,
  Plus,
  Search,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  DollarSign,
  FileSpreadsheet,
  Lock,
  Unlock,
  History,
  RotateCw,
  CreditCard,
  Building2,
  BarChart3,
} from 'lucide-react';
import { Database } from '../../services/db';
import { AccountReceivable, AccountPayable, CashRegister, CashMovement } from '../../types';
import { formatCurrency } from '../../services/pricingEngine';
import { toast } from '../../services/toast';
import { PaymentMethodsManager } from './PaymentMethodsManager';
import { FinancialAccountsManager } from './FinancialAccountsManager';
import { PaymentTermsManager } from './PaymentTermsManager';
import { FinancialReportsManager } from './FinancialReportsManager';

export type FinancialSubTab =
  | 'fluxo_caixa'
  | 'contas_receber'
  | 'contas_pagar'
  | 'caixa_pdv'
  | 'formas_pagamento'
  | 'contas_bancarias'
  | 'prazos_pagamento'
  | 'relatorios';

export const FinancialView: React.FC<{ initialSubTab?: FinancialSubTab }> = ({
  initialSubTab = 'fluxo_caixa',
}) => {
  const [dbState, setDbState] = useState(Database.getState());
  const currentCompany = Database.getCurrentCompany();
  const currentUser = Database.getCurrentUser();

  useEffect(() => {
    return Database.subscribe(() => {
      setDbState({ ...Database.getState() });
    });
  }, []);

  const [activeTab, setActiveTab] = useState<FinancialSubTab>(initialSubTab);

  useEffect(() => {
    setActiveTab(initialSubTab);
  }, [initialSubTab]);

  // Modais de Baixa / Pagamento / Recebimento
  const [receivingTitle, setReceivingTitle] = useState<AccountReceivable | null>(null);
  const [payingTitle, setPayingTitle] = useState<AccountPayable | null>(null);
  const [partialAmount, setPartialAmount] = useState<string>('');
  const [paymentMethodUsed, setPaymentMethodUsed] = useState<string>('Pix');

  // Modal de Nova Conta a Pagar
  const [isNewPayableOpen, setIsNewPayableOpen] = useState(false);
  const [payableDesc, setPayableDesc] = useState('');
  const [payableSupplierName, setPayableSupplierName] = useState('');
  const [payableCategory, setPayableCategory] = useState<AccountPayable['category']>('outros');
  const [payableAmount, setPayableAmount] = useState('');
  const [payableDueDate, setPayableDueDate] = useState('');

  // Fechamento de Caixa PDV (Conferência Cega)
  const [isCloseRegisterModalOpen, setIsCloseRegisterModalOpen] = useState(false);
  const [reportedCash, setReportedCash] = useState('');
  const [reportedPix, setReportedPix] = useState('');
  const [reportedCard, setReportedCard] = useState('');
  const [closingNotes, setClosingNotes] = useState('');

  // Modal Suprimento / Sangria
  const [isCashOperationModalOpen, setIsCashOperationModalOpen] = useState(false);
  const [cashOpType, setCashOpType] = useState<'suprimento' | 'sangria'>('suprimento');
  const [cashOpAmount, setCashOpAmount] = useState('');
  const [cashOpReason, setCashOpReason] = useState('');

  // Caixa aberto ativo
  const activeCashRegister = dbState.cashRegisters.find(
    (c) => c.companyId === currentCompany.id && c.status === 'aberto'
  );

  // FILTROS E CÁLCULOS DO FLUXO DE CAIXA
  // 1. Entradas Realizadas (Vendas à vista + recebimentos de títulos baixados)
  const cashRegisterMovements = dbState.cashRegisters
    .filter((c) => c.companyId === currentCompany.id)
    .flatMap((c) => c.movements);

  const realCashIn = cashRegisterMovements
    .filter((m) => m.type.startsWith('venda_') || m.type === 'suprimento')
    .reduce((s, m) => s + m.amount, 0);

  const titlesReceivedIn = dbState.accountsReceivable
    .filter((r) => r.companyId === currentCompany.id)
    .flatMap((r) => r.receipts)
    .reduce((s, rec) => s + rec.amount, 0);

  const totalRealizedIn = realCashIn + titlesReceivedIn;

  // 2. Saídas Realizadas (Sangrias + pagamentos baixados)
  const sangriasOut = cashRegisterMovements
    .filter((m) => m.type === 'sangria')
    .reduce((s, m) => s + m.amount, 0);

  const titlesPaidOut = dbState.accountsPayable
    .filter((p) => p.companyId === currentCompany.id)
    .flatMap((p) => p.payments)
    .reduce((s, pay) => s + pay.amount, 0);

  const totalRealizedOut = sangriasOut + titlesPaidOut;
  const currentNetBalance = totalRealizedIn - totalRealizedOut;

  // 3. Previsões Futuras (Títulos em aberto)
  const expectedReceivables = dbState.accountsReceivable
    .filter((r) => r.companyId === currentCompany.id && r.status !== 'recebido' && r.status !== 'cancelado')
    .reduce((s, r) => s + r.balance, 0);

  const expectedPayables = dbState.accountsPayable
    .filter((p) => p.companyId === currentCompany.id && p.status !== 'pago' && p.status !== 'cancelado')
    .reduce((s, p) => s + p.balance, 0);

  const projectedBalance = currentNetBalance + expectedReceivables - expectedPayables;

  // Realizar Baixa de Conta a Receber
  const handleConfirmReceivingTitle = () => {
    if (!receivingTitle) return;
    const amount = parseFloat(partialAmount) || receivingTitle.balance;
    if (amount <= 0 || amount > receivingTitle.balance) {
      alert(`Valor inválido. Informe um valor entre R$ 0,01 e ${formatCurrency(receivingTitle.balance)}.`);
      return;
    }

    const nowIso = new Date().toISOString();
    const newPaidVal = receivingTitle.paidValue + amount;
    const newBalance = Math.max(0, receivingTitle.originalValue - newPaidVal);
    const newStatus = newBalance === 0 ? 'recebido' : 'parcial';

    const updatedReceivables = dbState.accountsReceivable.map((r) =>
      r.id === receivingTitle.id
        ? {
            ...r,
            paidValue: newPaidVal,
            balance: newBalance,
            status: newStatus as any,
            receipts: [
              ...r.receipts,
              {
                date: nowIso,
                amount,
                method: paymentMethodUsed,
                userId: currentUser.id,
                notes: `Baixa realizada por ${currentUser.name}`,
              },
            ],
          }
        : r
    );

    // Se o caixa do balcão estiver aberto e for dinheiro/pix, registrar movimento
    let updatedCashRegs = [...dbState.cashRegisters];
    if (activeCashRegister) {
      updatedCashRegs = updatedCashRegs.map((reg) =>
        reg.id === activeCashRegister.id
          ? {
              ...reg,
              movements: [
                ...reg.movements,
                {
                  id: 'MOV-' + Date.now(),
                  type: paymentMethodUsed === 'Dinheiro' ? 'venda_dinheiro' : 'venda_pix',
                  amount,
                  description: `Recebimento Título ${receivingTitle.docNumber} - ${receivingTitle.customerName}`,
                  timestamp: nowIso,
                  userId: currentUser.id,
                },
              ],
            }
          : reg
      );
    }

    const state = Database.getState();
    state.accountsReceivable = updatedReceivables;
    state.cashRegisters = updatedCashRegs;
    Database.persist();

    Database.addAuditLog(
      'BAIXA_CONTAS_RECEBER',
      'FINANCEIRO',
      receivingTitle.id,
      `Recebimento de ${formatCurrency(amount)} registrado para ${receivingTitle.customerName} via ${paymentMethodUsed}`
    );

    toast.success(`Recebimento de ${formatCurrency(amount)} registrado com sucesso!`, 'Contas a Receber');
    setReceivingTitle(null);
    setPartialAmount('');
  };

  // Realizar Pagamento de Conta a Pagar
  const handleConfirmPayingTitle = () => {
    if (!payingTitle) return;
    const amount = parseFloat(partialAmount) || payingTitle.balance;
    if (amount <= 0 || amount > payingTitle.balance) {
      toast.warning(`Valor inválido. Máximo permitido: ${formatCurrency(payingTitle.balance)}.`, 'Valor Inválido');
      return;
    }

    const nowIso = new Date().toISOString();
    const newPaidVal = payingTitle.paidValue + amount;
    const newBalance = Math.max(0, payingTitle.originalValue - newPaidVal);
    const newStatus = newBalance === 0 ? 'pago' : 'parcial';

    const updatedPayables = dbState.accountsPayable.map((p) =>
      p.id === payingTitle.id
        ? {
            ...p,
            paidValue: newPaidVal,
            balance: newBalance,
            status: newStatus as any,
            payments: [
              ...p.payments,
              {
                date: nowIso,
                amount,
                method: paymentMethodUsed,
                userId: currentUser.id,
                notes: `Pagamento efetuado por ${currentUser.name}`,
              },
            ],
          }
        : p
    );

    const state = Database.getState();
    state.accountsPayable = updatedPayables;
    Database.persist();

    Database.addAuditLog(
      'BAIXA_CONTAS_PAGAR',
      'FINANCEIRO',
      payingTitle.id,
      `Pagamento de ${formatCurrency(amount)} registrado para ${payingTitle.description} via ${paymentMethodUsed}`
    );

    toast.success(`Pagamento de ${formatCurrency(amount)} liquidado com sucesso!`, 'Contas a Pagar');
    setPayingTitle(null);
    setPartialAmount('');
  };

  // Cadastrar Nova Obrigação a Pagar (Aluguel, Luz, Fornecedor...)
  const handleCreatePayable = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(payableAmount);
    if (!payableDesc.trim() || isNaN(amt) || amt <= 0) {
      alert('Preencha a descrição e um valor válido.');
      return;
    }

    const newPayable: AccountPayable = {
      id: 'PAG-' + Date.now(),
      companyId: currentCompany.id,
      supplierName: payableSupplierName || 'Despesa Administrativa',
      description: payableDesc.trim(),
      category: payableCategory,
      docNumber: 'LANÇ-' + Date.now().toString().slice(-4),
      installmentNumber: 1,
      totalInstallments: 1,
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: payableDueDate || new Date().toISOString().split('T')[0],
      originalValue: amt,
      discount: 0,
      addition: 0,
      paidValue: 0,
      balance: amt,
      status: 'aberto',
      payments: [],
      notes: 'Lançamento manual financeiro',
    };

    Database.getState().accountsPayable.unshift(newPayable);
    Database.persist();
    Database.addAuditLog('CRIAR_CONTA_PAGAR', 'FINANCEIRO', newPayable.id, `Conta a pagar ${payableDesc} criada no valor de ${formatCurrency(amt)}`);

    setIsNewPayableOpen(false);
    setPayableDesc('');
    setPayableSupplierName('');
    setPayableAmount('');
    setPayableDueDate('');
    alert('Despesa cadastrada no Contas a Pagar com sucesso!');
  };

  // Realizar Suprimento ou Sangria no Caixa PDV
  const handleExecuteCashOperation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCashRegister) {
      alert('Não há caixa aberto no momento.');
      return;
    }

    const amt = parseFloat(cashOpAmount);
    if (isNaN(amt) || amt <= 0) {
      alert('Informe um valor válido maior que zero.');
      return;
    }

    const nowIso = new Date().toISOString();
    const newMovement: CashMovement = {
      id: 'MOV-' + Date.now(),
      type: cashOpType,
      amount: amt,
      description: cashOpReason.trim() || (cashOpType === 'suprimento' ? 'Suprimento de troco' : 'Sangria de segurança para o cofre'),
      timestamp: nowIso,
      userId: currentUser.id,
    };

    const state = Database.getState();
    state.cashRegisters = state.cashRegisters.map((reg) =>
      reg.id === activeCashRegister.id
        ? {
            ...reg,
            movements: [...reg.movements, newMovement],
          }
        : reg
    );
    Database.persist();

    Database.addAuditLog(
      cashOpType === 'suprimento' ? 'SUPRIMENTO_CAIXA' : 'SANGRIA_CAIXA',
      'FINANCEIRO',
      activeCashRegister.id,
      `${cashOpType.toUpperCase()} de ${formatCurrency(amt)} realizado por ${currentUser.name}. Motivo: ${newMovement.description}`
    );

    alert(`${cashOpType === 'suprimento' ? 'Suprimento' : 'Sangria'} de ${formatCurrency(amt)} registrado no caixa.`);
    setIsCashOperationModalOpen(false);
    setCashOpAmount('');
    setCashOpReason('');
  };

  // Fechamento de Caixa PDV com Conferência Cega
  const handleConfirmCloseCashRegister = () => {
    if (!activeCashRegister) return;

    // Calcular valores esperados pelo sistema
    const expectedMoney =
      activeCashRegister.initialBalance +
      activeCashRegister.movements
        .filter((m) => m.type === 'suprimento' || m.type === 'venda_dinheiro')
        .reduce((s, m) => s + m.amount, 0) -
      activeCashRegister.movements
        .filter((m) => m.type === 'sangria')
        .reduce((s, m) => s + m.amount, 0);

    const expectedPix = activeCashRegister.movements
      .filter((m) => m.type === 'venda_pix')
      .reduce((s, m) => s + m.amount, 0);

    const expectedCard = activeCashRegister.movements
      .filter((m) => m.type === 'venda_cartao')
      .reduce((s, m) => s + m.amount, 0);

    const expectedTotal = expectedMoney + expectedPix + expectedCard;

    const repMoney = parseFloat(reportedCash) || 0;
    const repPix = parseFloat(reportedPix) || 0;
    const repCard = parseFloat(reportedCard) || 0;
    const repTotal = repMoney + repPix + repCard;

    const diff = repTotal - expectedTotal;

    const state = Database.getState();
    state.cashRegisters = state.cashRegisters.map((reg) =>
      reg.id === activeCashRegister.id
        ? {
            ...reg,
            status: 'fechado' as const,
            closedAt: new Date().toISOString(),
            reportedBalance: {
              dinheiro: repMoney,
              pix: repPix,
              cartao: repCard,
              outros: 0,
            },
            expectedBalance: {
              dinheiro: expectedMoney,
              pix: expectedPix,
              cartao: expectedCard,
              outros: 0,
            },
            difference: diff,
            closingNotes,
          }
        : reg
    );
    Database.persist();

    Database.addAuditLog(
      'FECHAMENTO_CAIXA',
      'FINANCEIRO',
      activeCashRegister.id,
      `Caixa fechado por ${currentUser.name}. Esperado: ${formatCurrency(expectedTotal)}, Informado: ${formatCurrency(repTotal)}, Diferença: ${formatCurrency(diff)}`
    );

    alert(
      `Caixa PDV encerrado com sucesso!\n\nEsperado pelo Sistema: ${formatCurrency(expectedTotal)}\nInformado pelo Operador: ${formatCurrency(repTotal)}\nDivergência apurada: ${diff >= 0 ? '+' : ''}${formatCurrency(diff)}`
    );

    setIsCloseRegisterModalOpen(false);
    setReportedCash('');
    setReportedPix('');
    setReportedCard('');
    setClosingNotes('');
  };

  const receivables = dbState.accountsReceivable.filter((r) => r.companyId === currentCompany.id);
  const payables = dbState.accountsPayable.filter((p) => p.companyId === currentCompany.id);

  return (
    <div className="space-y-4">
      {/* Topo / Sub-Abas Financeiras */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <CircleDollarSign className="text-blue-600" size={20} />
            <span>Módulo Financeiro & Gestão de Fluxo de Caixa</span>
          </h2>
          <p className="text-xs text-slate-500">
            Controle de recebimentos, compromissos a pagar com fornecedores, conciliação de caixa PDV e projeção futura.
          </p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold flex-wrap gap-1">
          <button
            onClick={() => setActiveTab('fluxo_caixa')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'fluxo_caixa' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CircleDollarSign size={14} />
            <span>Fluxo de Caixa</span>
          </button>
          <button
            onClick={() => setActiveTab('contas_receber')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'contas_receber' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TrendingUp size={14} />
            <span>Contas a Receber</span>
          </button>
          <button
            onClick={() => setActiveTab('contas_pagar')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'contas_pagar' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TrendingDown size={14} />
            <span>Contas a Pagar</span>
          </button>
          <button
            onClick={() => setActiveTab('caixa_pdv')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'caixa_pdv' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Vault size={14} />
            <span>Caixa PDV</span>
          </button>
          <button
            onClick={() => setActiveTab('formas_pagamento')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'formas_pagamento' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CreditCard size={14} />
            <span>Formas de Pagamento</span>
          </button>
          <button
            onClick={() => setActiveTab('contas_bancarias')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'contas_bancarias' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 size={14} />
            <span>Contas (Caixa / Bancos)</span>
          </button>
          <button
            onClick={() => setActiveTab('prazos_pagamento')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'prazos_pagamento' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar size={14} />
            <span>Prazos de Pagamento</span>
          </button>
          <button
            onClick={() => setActiveTab('relatorios')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'relatorios' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 size={14} />
            <span>Relatórios</span>
          </button>
        </div>
      </div>

      {/* ABA 1: FLUXO DE CAIXA (REALIZADO VS PREVISTO) */}
      {activeTab === 'fluxo_caixa' && (
        <div className="space-y-4">
          {/* Cards de Resumo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Entradas Realizadas
              </span>
              <div className="text-2xl font-extrabold text-emerald-600 mt-1 flex items-center gap-1">
                <ArrowUpRight size={22} />
                <span>{formatCurrency(totalRealizedIn)}</span>
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">Vendas à vista + recebimentos baixados</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Saídas Realizadas
              </span>
              <div className="text-2xl font-extrabold text-rose-600 mt-1 flex items-center gap-1">
                <ArrowDownRight size={22} />
                <span>{formatCurrency(totalRealizedOut)}</span>
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">Despesas pagas + sangrias de caixa</span>
            </div>

            <div className="bg-slate-900 text-white p-4 rounded-xl shadow-md">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Saldo Financeiro Realizado
              </span>
              <div className="text-2xl font-extrabold text-emerald-400 mt-1">
                {formatCurrency(currentNetBalance)}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">Disponibilidade líquida em caixa / bancos</span>
            </div>

            <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl shadow-xs">
              <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider block">
                Saldo Projetado Futuro
              </span>
              <div className="text-2xl font-extrabold text-blue-900 mt-1">
                {formatCurrency(projectedBalance)}
              </div>
              <span className="text-[11px] text-blue-600 mt-1 block">
                (+ {formatCurrency(expectedReceivables)} a receber / - {formatCurrency(expectedPayables)} a pagar)
              </span>
            </div>
          </div>

          {/* Gráfico Comparativo & Quadro de Previsões */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                Comparativo: Realizado vs Previsto (Regime de Caixa)
              </h3>
              <p className="text-xs text-slate-500">
                Uma venda a prazo NÃO entra no fluxo de caixa realizado até o recebimento efetivo, evitando distorções contábeis.
              </p>

              <div className="space-y-3 pt-2">
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-700">Entradas Efetivadas</span>
                    <span className="text-emerald-700">{formatCurrency(totalRealizedIn)}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5">
                    <div className="bg-emerald-500 h-2.5 rounded-full" style={{ width: '100%' }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-700">A Receber no Prazo (Futuro)</span>
                    <span className="text-blue-700">{formatCurrency(expectedReceivables)}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5">
                    <div className="bg-blue-500 h-2.5 rounded-full" style={{ width: '65%' }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-700">A Pagar para Fornecedores (Futuro)</span>
                    <span className="text-amber-700">{formatCurrency(expectedPayables)}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5">
                    <div className="bg-amber-500 h-2.5 rounded-full" style={{ width: '45%' }}></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                Compromissos Urgentes (Vencendo nos Próximos Dias)
              </h3>

              <div className="divide-y divide-slate-100 text-xs">
                {payables.filter((p) => p.status === 'aberto').slice(0, 4).map((p) => (
                  <div key={p.id} className="py-2.5 flex justify-between items-center">
                    <div>
                      <div className="font-bold text-slate-800">{p.description}</div>
                      <div className="text-[11px] text-slate-400">
                        Vencimento: {new Date(p.dueDate).toLocaleDateString('pt-BR')} • {p.supplierName}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-rose-600">{formatCurrency(p.balance)}</div>
                      <button
                        onClick={() => {
                          setPayingTitle(p);
                          setPartialAmount(String(p.balance));
                        }}
                        className="text-[10px] text-blue-600 font-bold hover:underline"
                      >
                        Pagar Agora
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ABA 2: CONTAS A RECEBER */}
      {activeTab === 'contas_receber' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden space-y-3 p-4">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <h3 className="font-bold text-sm text-slate-800">Títulos a Receber (Vendas e Clientes)</h3>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
              Total em Aberto: {formatCurrency(expectedReceivables)}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-3">Doc / Parcela</th>
                  <th className="p-3">Cliente</th>
                  <th className="p-3">Emissão</th>
                  <th className="p-3">Vencimento</th>
                  <th className="p-3 text-right">Valor Original</th>
                  <th className="p-3 text-right">Recebido</th>
                  <th className="p-3 text-right">Saldo Aberto</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {receivables.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400">
                      Nenhum título a receber registrado.
                    </td>
                  </tr>
                ) : (
                  receivables.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/80">
                      <td className="p-3 font-mono font-bold text-blue-700">{r.docNumber}</td>
                      <td className="p-3 font-semibold text-slate-800">{r.customerName}</td>
                      <td className="p-3 text-slate-500">{new Date(r.issueDate).toLocaleDateString('pt-BR')}</td>
                      <td className="p-3 font-medium text-slate-700">{new Date(r.dueDate).toLocaleDateString('pt-BR')}</td>
                      <td className="p-3 text-right font-medium text-slate-600">{formatCurrency(r.originalValue)}</td>
                      <td className="p-3 text-right font-medium text-emerald-600">{formatCurrency(r.paidValue)}</td>
                      <td className="p-3 text-right font-bold text-slate-900">{formatCurrency(r.balance)}</td>
                      <td className="p-3 text-center">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          r.status === 'recebido'
                            ? 'bg-emerald-100 text-emerald-800'
                            : r.status === 'parcial'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {r.status !== 'recebido' ? (
                          <button
                            onClick={() => {
                              setReceivingTitle(r);
                              setPartialAmount(String(r.balance));
                            }}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-md text-[11px] shadow-xs"
                          >
                            Dar Baixa
                          </button>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Liquidado</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ABA 3: CONTAS A PAGAR */}
      {activeTab === 'contas_pagar' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden space-y-3 p-4">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-sm text-slate-800">Contas a Pagar (Obrigações e Compras)</h3>
              <span className="text-xs text-slate-500">
                Aluguel, fornecedores, água, luz, salários e impostos.
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                Pendente: {formatCurrency(expectedPayables)}
              </span>
              <button
                onClick={() => setIsNewPayableOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-xs"
              >
                <Plus size={14} />
                <span>Lançar Despesa</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-3">Doc / Ref</th>
                  <th className="p-3">Descrição da Obrigação</th>
                  <th className="p-3">Categoria</th>
                  <th className="p-3">Favorecido / Fornecedor</th>
                  <th className="p-3">Vencimento</th>
                  <th className="p-3 text-right">Valor Total</th>
                  <th className="p-3 text-right">Pago</th>
                  <th className="p-3 text-right">Saldo a Pagar</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payables.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-slate-400">
                      Nenhuma conta a pagar registrada.
                    </td>
                  </tr>
                ) : (
                  payables.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/80">
                      <td className="p-3 font-mono font-bold text-slate-600">{p.docNumber}</td>
                      <td className="p-3 font-semibold text-slate-800">{p.description}</td>
                      <td className="p-3">
                        <span className="text-[10px] font-bold uppercase bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                          {p.category}
                        </span>
                      </td>
                      <td className="p-3 text-slate-600">{p.supplierName}</td>
                      <td className="p-3 font-medium text-slate-700">{new Date(p.dueDate).toLocaleDateString('pt-BR')}</td>
                      <td className="p-3 text-right font-medium text-slate-600">{formatCurrency(p.originalValue)}</td>
                      <td className="p-3 text-right font-medium text-emerald-600">{formatCurrency(p.paidValue)}</td>
                      <td className="p-3 text-right font-bold text-rose-600">{formatCurrency(p.balance)}</td>
                      <td className="p-3 text-center">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          p.status === 'pago'
                            ? 'bg-emerald-100 text-emerald-800'
                            : p.status === 'parcial'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {p.status !== 'pago' ? (
                          <button
                            onClick={() => {
                              setPayingTitle(p);
                              setPartialAmount(String(p.balance));
                            }}
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-md text-[11px] shadow-xs"
                          >
                            Pagar
                          </button>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Pago</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ABA 4: CAIXA PDV (ABERTURA, FECHAMENTO, CONFERÊNCIA CEGA, SANGRIA, SUPRIMENTO) */}
      {activeTab === 'caixa_pdv' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Vault className="text-blue-600" size={20} />
                <h3 className="font-bold text-base text-slate-800">Controle e Fechamento de Caixa PDV</h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                  activeCashRegister ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                }`}>
                  {activeCashRegister ? 'Caixa Aberto' : 'Caixa Fechado'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {activeCashRegister
                  ? `Operador: ${activeCashRegister.userName} • Aberto em: ${new Date(activeCashRegister.openedAt).toLocaleTimeString('pt-BR')} • Fundo Inicial: ${formatCurrency(activeCashRegister.initialBalance)}`
                  : 'Nenhum caixa aberto neste momento.'}
              </p>
            </div>

            {activeCashRegister && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setCashOpType('suprimento');
                    setIsCashOperationModalOpen(true);
                  }}
                  className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-lg border border-emerald-200 transition-colors"
                >
                  + Suprimento
                </button>
                <button
                  onClick={() => {
                    setCashOpType('sangria');
                    setIsCashOperationModalOpen(true);
                  }}
                  className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 font-bold text-xs rounded-lg border border-rose-200 transition-colors"
                >
                  - Sangria
                </button>
                <button
                  onClick={() => setIsCloseRegisterModalOpen(true)}
                  className="px-4 py-2 bg-slate-900 hover:bg-black text-white font-bold text-xs rounded-lg shadow-xs transition-colors"
                >
                  Encerrar Turno / Fechar Caixa
                </button>
              </div>
            )}
          </div>

          {/* Histórico de Movimentos do Caixa Aberto */}
          {activeCashRegister && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Movimentações do Caixa Atual
              </h4>

              <div className="divide-y divide-slate-100 text-xs">
                {activeCashRegister.movements.length === 0 ? (
                  <p className="text-slate-400 py-4">Nenhuma movimentação avulsa registrada no caixa.</p>
                ) : (
                  activeCashRegister.movements.map((m) => (
                    <div key={m.id} className="py-2 flex justify-between items-center">
                      <div>
                        <div className="font-semibold text-slate-800">{m.description}</div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(m.timestamp).toLocaleTimeString('pt-BR')} • Tipo: {m.type}
                        </div>
                      </div>
                      <div className="font-bold text-slate-900">{formatCurrency(m.amount)}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Histórico dos Caixas Fechados Anteriores com Conferência Cega */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <History size={15} />
              <span>Histórico de Fechamentos Anteriores (Conferência de Diferenças)</span>
            </h4>

            <div className="divide-y divide-slate-100 text-xs">
              {dbState.cashRegisters.filter((c) => c.status === 'fechado').length === 0 ? (
                <p className="text-slate-400 py-4">Nenhum caixa encerrado anteriormente registrado.</p>
              ) : (
                dbState.cashRegisters
                  .filter((c) => c.status === 'fechado')
                  .map((c) => (
                    <div key={c.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="font-bold text-slate-800 flex items-center gap-2">
                          <span>Caixa Encerrado por: {c.userName}</span>
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                            {c.closedAt ? new Date(c.closedAt).toLocaleString('pt-BR') : ''}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Fundo Inicial: {formatCurrency(c.initialBalance)} • Esperado Total: {formatCurrency((c.expectedBalance?.dinheiro || 0) + (c.expectedBalance?.pix || 0) + (c.expectedBalance?.cartao || 0))}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-[11px] text-slate-600">
                          Informado: <strong>{formatCurrency((c.reportedBalance?.dinheiro || 0) + (c.reportedBalance?.pix || 0) + (c.reportedBalance?.cartao || 0))}</strong>
                        </div>
                        <div className={`text-xs font-bold ${
                          (c.difference || 0) === 0
                            ? 'text-emerald-600'
                            : (c.difference || 0) > 0
                            ? 'text-blue-600'
                            : 'text-rose-600'
                        }`}>
                          Diferença: {(c.difference || 0) >= 0 ? '+' : ''}{formatCurrency(c.difference || 0)}
                        </div>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ABA 5: FORMAS DE PAGAMENTO */}
      {activeTab === 'formas_pagamento' && <PaymentMethodsManager />}

      {/* ABA 6: CONTAS FINANCEIRAS / BANCÁRIAS */}
      {activeTab === 'contas_bancarias' && <FinancialAccountsManager />}

      {/* ABA 7: PRAZOS DE PAGAMENTO */}
      {activeTab === 'prazos_pagamento' && <PaymentTermsManager />}

      {/* ABA 8: RELATÓRIOS FINANCEIROS */}
      {activeTab === 'relatorios' && <FinancialReportsManager />}

      {/* Modal: Fechamento de Caixa PDV (Conferência Cega) */}
      {isCloseRegisterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-4">
            <h3 className="font-bold text-base text-slate-800">
              Conferência e Fechamento de Caixa
            </h3>
            <p className="text-xs text-slate-500">
              Conte os valores em espécie na gaveta física e consulte os relatórios dos terminais de cartão e Pix antes de finalizar.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Total em Dinheiro na Gaveta (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder="0.00"
                  value={reportedCash}
                  onChange={(e) => setReportedCash(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Total em Pix Conferido (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={reportedPix}
                  onChange={(e) => setReportedPix(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Total em Cartões (Débito/Crédito)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={reportedCard}
                  onChange={(e) => setReportedCard(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Observações de Encerramento</label>
                <textarea
                  rows={2}
                  value={closingNotes}
                  onChange={(e) => setClosingNotes(e.target.value)}
                  placeholder="Justificativa para eventuais diferenças de moedas..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setIsCloseRegisterModalOpen(false)}
                className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Voltar
              </button>
              <button
                onClick={handleConfirmCloseCashRegister}
                className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-xs"
              >
                Concluir Fechamento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Suprimento / Sangria */}
      {isCashOperationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <form
            onSubmit={handleExecuteCashOperation}
            className="bg-white rounded-2xl max-w-sm w-full border border-slate-200 shadow-2xl p-6 space-y-3.5"
          >
            <h3 className="font-bold text-base text-slate-800 capitalize">
              {cashOpType === 'suprimento' ? 'Suprimento de Caixa (+)' : 'Sangria de Caixa (-)'}
            </h3>

            <div className="text-xs space-y-2.5">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Valor (R$) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={cashOpAmount}
                  onChange={(e) => setCashOpAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Justificativa / Motivo</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Troco inicial extra, recolhimento para cofre..."
                  value={cashOpReason}
                  onChange={(e) => setCashOpReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsCashOperationModalOpen(false)}
                className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className={`px-4 py-2 text-xs font-bold text-white rounded-lg shadow-xs ${
                  cashOpType === 'suprimento' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                Confirmar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Baixa de Contas a Receber */}
      {receivingTitle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full border border-slate-200 shadow-2xl p-6 space-y-3.5">
            <h3 className="font-bold text-base text-slate-800">Registrar Recebimento</h3>
            <p className="text-xs text-slate-500">
              Cliente: <strong>{receivingTitle.customerName}</strong> • Doc: {receivingTitle.docNumber}
            </p>

            <div className="space-y-2.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Valor a Receber (Saldo: {formatCurrency(receivingTitle.balance)})</label>
                <input
                  type="number"
                  step="0.01"
                  max={receivingTitle.balance}
                  value={partialAmount}
                  onChange={(e) => setPartialAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Forma de Pagamento</label>
                <select
                  value={paymentMethodUsed}
                  onChange={(e) => setPaymentMethodUsed(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-semibold"
                >
                  <option value="Pix">Pix</option>
                  <option value="Dinheiro">Dinheiro</option>
                  <option value="Cartão de Débito">Cartão de Débito</option>
                  <option value="Cartão de Crédito">Cartão de Crédito</option>
                  <option value="Transferência Bancária">Transferência Bancária</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setReceivingTitle(null)}
                className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmReceivingTitle}
                className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs"
              >
                Confirmar Recebimento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Pagamento de Contas a Pagar */}
      {payingTitle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full border border-slate-200 shadow-2xl p-6 space-y-3.5">
            <h3 className="font-bold text-base text-slate-800">Efetuar Pagamento de Despesa</h3>
            <p className="text-xs text-slate-500">
              Favorecido: <strong>{payingTitle.supplierName}</strong> ({payingTitle.description})
            </p>

            <div className="space-y-2.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Valor a Pagar (Saldo: {formatCurrency(payingTitle.balance)})</label>
                <input
                  type="number"
                  step="0.01"
                  max={payingTitle.balance}
                  value={partialAmount}
                  onChange={(e) => setPartialAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Forma de Saída</label>
                <select
                  value={paymentMethodUsed}
                  onChange={(e) => setPaymentMethodUsed(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-semibold"
                >
                  <option value="Pix">Pix / Transferência</option>
                  <option value="Boleto">Boleto Bancário</option>
                  <option value="Dinheiro">Dinheiro</option>
                  <option value="Cartão de Crédito">Cartão de Crédito</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setPayingTitle(null)}
                className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmPayingTitle}
                className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-xs"
              >
                Liquidado / Baixar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Lançar Conta a Pagar */}
      {isNewPayableOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <form
            onSubmit={handleCreatePayable}
            className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-3.5"
          >
            <h3 className="font-bold text-base text-slate-800">Lançar Nova Obrigação Financeira</h3>

            <div className="space-y-2.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Descrição da Despesa *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Conta de Energia CEMIG - Outubro"
                  value={payableDesc}
                  onChange={(e) => setPayableDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Categoria de Despesa</label>
                <select
                  value={payableCategory}
                  onChange={(e) => setPayableCategory(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium"
                >
                  <option value="aluguel">Aluguel do Imóvel</option>
                  <option value="energia">Energia Elétrica</option>
                  <option value="agua">Água e Esgoto</option>
                  <option value="internet_telefone">Telefonia e Internet</option>
                  <option value="salarios">Salários e Pró-Labore</option>
                  <option value="fornecedores">Fornecedores Diversos</option>
                  <option value="impostos">Impostos e Tributos (DAS)</option>
                  <option value="administrativo">Despesas Administrativas</option>
                  <option value="outros">Outras Despesas</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Favorecido / Fornecedor</label>
                <input
                  type="text"
                  placeholder="Ex: Companhia de Energia S.A."
                  value={payableSupplierName}
                  onChange={(e) => setPayableSupplierName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Valor Total (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="0.00"
                    value={payableAmount}
                    onChange={(e) => setPayableAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Data de Vencimento *</label>
                  <input
                    type="date"
                    required
                    value={payableDueDate}
                    onChange={(e) => setPayableDueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsNewPayableOpen(false)}
                className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-xs"
              >
                Salvar Despesa
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
