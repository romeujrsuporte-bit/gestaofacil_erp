import React, { useState } from 'react';
import {
  Vault,
  Building2,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  DollarSign,
  AlertTriangle,
  X,
  Star,
  Wallet,
  Landmark,
  ArrowUpRight,
  Check
} from 'lucide-react';
import { Database } from '../../services/db';
import { FinancialAccountRecord, FinancialAccountType } from '../../types';
import { formatCurrency } from '../../services/pricingEngine';
import { toast } from '../../services/toast';

const COMMON_BANKS = [
  { code: '001', name: 'Banco do Brasil S.A.' },
  { code: '341', name: 'Banco Itaú Unibanco S.A.' },
  { code: '104', name: 'Caixa Econômica Federal' },
  { code: '237', name: 'Banco Bradesco S.A.' },
  { code: '033', name: 'Banco Santander (Brasil) S.A.' },
  { code: '260', name: 'Nu Pagamentos S.A. (Nubank)' },
  { code: '077', name: 'Banco Inter S.A.' },
  { code: '756', name: 'Banco Cooperativo Sicoob S.A.' },
  { code: '748', name: 'Banco Cooperativo Sicredi S.A.' },
  { code: '422', name: 'Banco Safra S.A.' },
  { code: '336', name: 'Banco C6 S.A.' },
  { code: '212', name: 'Banco Original S.A.' },
];

export const FinancialAccountsManager: React.FC = () => {
  const currentCompany = Database.getCurrentCompany();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('todos');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'ativo' | 'inativo'>('todos');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FinancialAccountRecord | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<FinancialAccountRecord | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [type, setType] = useState<FinancialAccountType>('corrente');
  const [bankName, setBankName] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [agency, setAgency] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [initialBalance, setInitialBalance] = useState('0');
  const [currentBalance, setCurrentBalance] = useState('0');
  const [isDefault, setIsDefault] = useState(false);
  const [status, setStatus] = useState<'ativo' | 'inativo'>('ativo');
  const [notes, setNotes] = useState('');

  const accounts = Database.getFinancialAccounts(currentCompany.id);

  // Totais
  const totalBalance = accounts.reduce((s, a) => s + (a.status === 'ativo' ? a.currentBalance : 0), 0);
  const totalCashRegisters = accounts
    .filter((a) => a.type === 'caixa' && a.status === 'ativo')
    .reduce((s, a) => s + a.currentBalance, 0);
  const totalBankAccounts = accounts
    .filter((a) => a.type !== 'caixa' && a.status === 'ativo')
    .reduce((s, a) => s + a.currentBalance, 0);

  const handleOpenCreate = () => {
    setEditingItem(null);
    setName('');
    setCode('');
    setType('corrente');
    setBankName('Banco do Brasil S.A.');
    setBankCode('001');
    setAgency('');
    setAccountNumber('');
    setInitialBalance('0');
    setCurrentBalance('0');
    setIsDefault(accounts.length === 0);
    setStatus('ativo');
    setNotes('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: FinancialAccountRecord) => {
    setEditingItem(item);
    setName(item.name);
    setCode(item.code);
    setType(item.type);
    setBankName(item.bankName || '');
    setBankCode(item.bankCode || '');
    setAgency(item.agency || '');
    setAccountNumber(item.accountNumber || '');
    setInitialBalance(String(item.initialBalance || 0));
    setCurrentBalance(String(item.currentBalance || 0));
    setIsDefault(Boolean(item.isDefault));
    setStatus(item.status);
    setNotes(item.notes || '');
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.warning('Informe o nome da conta financeira.', 'Campo Obrigatório');
      return;
    }

    const initBal = parseFloat(initialBalance.replace(',', '.')) || 0;
    const currBal = parseFloat(currentBalance.replace(',', '.')) || (editingItem ? editingItem.currentBalance : initBal);

    try {
      Database.saveFinancialAccount({
        id: editingItem?.id,
        companyId: currentCompany.id,
        name: name.trim(),
        code: (code.trim() || name.trim().toUpperCase().replace(/\s+/g, '_')).slice(0, 20),
        type,
        bankName: type === 'caixa' ? 'Caixa Físico Interno' : bankName.trim() || undefined,
        bankCode: type === 'caixa' ? undefined : bankCode.trim() || undefined,
        agency: type === 'caixa' ? undefined : agency.trim() || undefined,
        accountNumber: type === 'caixa' ? undefined : accountNumber.trim() || undefined,
        initialBalance: initBal,
        currentBalance: currBal,
        isDefault,
        status,
        notes: notes.trim() || undefined,
      });

      toast.success(
        editingItem ? 'Conta financeira atualizada com sucesso!' : 'Conta financeira criada com sucesso!',
        'Contas Financeiras'
      );
      setIsModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar conta.', 'Erro');
    }
  };

  const handleConfirmDelete = () => {
    if (!deleteCandidate) return;
    try {
      Database.deleteFinancialAccount(deleteCandidate.id);
      toast.success(`Conta "${deleteCandidate.name}" excluída com sucesso!`, 'Exclusão Concluída');
      setDeleteCandidate(null);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao excluir conta.', 'Erro');
    }
  };

  const filteredAccounts = accounts.filter((item) => {
    const matchSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.bankName && item.bankName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.accountNumber && item.accountNumber.includes(searchTerm));
    const matchType = typeFilter === 'todos' || item.type === typeFilter;
    const matchStatus = statusFilter === 'todos' || item.status === statusFilter;
    return matchSearch && matchType && matchStatus;
  });

  const getTypeBadge = (t: FinancialAccountType) => {
    switch (t) {
      case 'caixa':
        return (
          <span className="inline-flex items-center gap-1 text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
            <Vault size={11} />
            Caixa Físico
          </span>
        );
      case 'corrente':
        return (
          <span className="inline-flex items-center gap-1 text-blue-800 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
            <Building2 size={11} />
            Conta Corrente
          </span>
        );
      case 'poupanca':
        return (
          <span className="inline-flex items-center gap-1 text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
            <Wallet size={11} />
            Poupança
          </span>
        );
      case 'investimento':
        return (
          <span className="inline-flex items-center gap-1 text-purple-800 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
            <Landmark size={11} />
            Aplicação
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-slate-800 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
            Outra
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Cards de Saldo Consolidado */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Saldo Geral Disponível
            </span>
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <DollarSign size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1 font-mono">
            {formatCurrency(totalBalance)}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Soma de todos os caixas e bancos ativos
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Disponível em Bancos
            </span>
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <Building2 size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-blue-700 mt-1 font-mono">
            {formatCurrency(totalBankAccounts)}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Contas correntes, poupanças e aplicações
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Disponível em Caixa Físico
            </span>
            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <Vault size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-1 font-mono">
            {formatCurrency(totalCashRegisters)}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Dinheiro em espécie na frente de loja
          </span>
        </div>
      </div>

      {/* Header com Botão Nova Conta */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="text-blue-600" size={20} />
            <h3 className="text-base font-bold text-slate-800">
              Contas Financeiras & Bancárias
            </h3>
            <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-bold border border-blue-200">
              {accounts.length} contas
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Cadastre contas bancárias (Banco do Brasil, Itaú, Bradesco, etc.) e gavetas de caixa para conciliação e controle de saldo.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
        >
          <Plus size={16} />
          <span>Nova Conta (Caixa ou Banco)</span>
        </button>
      </div>

      {/* Barra de Busca e Filtros */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nome da conta, banco, agência ou número..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-hidden focus:bg-white focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700 cursor-pointer"
          >
            <option value="todos">Todos os Tipos</option>
            <option value="caixa">Caixa Físico</option>
            <option value="corrente">Conta Corrente</option>
            <option value="poupanca">Poupança</option>
            <option value="investimento">Aplicação</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700 cursor-pointer"
          >
            <option value="todos">Todos os Status</option>
            <option value="ativo">Apenas Ativas</option>
            <option value="inativo">Apenas Inativas</option>
          </select>
        </div>
      </div>

      {/* Tabela de Contas */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold text-[10px]">
              <tr>
                <th className="py-2.5 px-3">Código</th>
                <th className="py-2.5 px-3">Nome da Conta</th>
                <th className="py-2.5 px-3">Tipo</th>
                <th className="py-2.5 px-3">Banco / Agência / Conta</th>
                <th className="py-2.5 px-3 text-right">Saldo Inicial</th>
                <th className="py-2.5 px-3 text-right">Saldo Atual</th>
                <th className="py-2.5 px-3 text-center">Padrão</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    Nenhuma conta encontrada com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredAccounts.map((acc) => (
                  <tr key={acc.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3">
                      <span className="font-mono font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-[11px]">
                        {acc.code}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">
                      <div className="flex items-center gap-1.5">
                        {acc.type === 'caixa' ? (
                          <Vault size={15} className="text-emerald-600" />
                        ) : (
                          <Building2 size={15} className="text-blue-600" />
                        )}
                        <span>{acc.name}</span>
                      </div>
                      {acc.notes && (
                        <span className="text-[10px] text-slate-400 block font-normal truncate max-w-xs">
                          {acc.notes}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">{getTypeBadge(acc.type)}</td>
                    <td className="py-2.5 px-3 text-slate-700">
                      {acc.type === 'caixa' ? (
                        <span className="text-slate-500 italic">Gaveta / Balcão da Loja</span>
                      ) : (
                        <div>
                          <span className="font-bold block text-slate-800">
                            {acc.bankName} {acc.bankCode ? `(${acc.bankCode})` : ''}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            Ag: {acc.agency || '-'} | C/C: {acc.accountNumber || '-'}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                      {formatCurrency(acc.initialBalance)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-black text-sm">
                      <span className={acc.currentBalance >= 0 ? 'text-emerald-700' : 'text-rose-600'}>
                        {formatCurrency(acc.currentBalance)}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {acc.isDefault ? (
                        <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                          <Star size={10} className="fill-amber-500 text-amber-500" />
                          Principal
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[10px]">-</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {acc.status === 'ativo' ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                          <CheckCircle2 size={11} />
                          Ativa
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                          <XCircle size={11} />
                          Inativa
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(acc)}
                          className="p-1 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                          title="Editar Conta"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteCandidate(acc)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                          title="Excluir Conta"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL CRIAR / EDITAR CONTA */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-scaleIn">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="text-blue-600" size={18} />
                <h3 className="font-bold text-slate-800 text-sm">
                  {editingItem ? 'Editar Conta Financeira' : 'Cadastrar Conta (Caixa ou Banco)'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-slate-700 font-bold mb-1">
                    Nome da Conta *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Banco do Brasil C/C Principal, Caixa Geral, Itaú..."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800 focus:outline-hidden focus:bg-white focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Código Identificador
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: CX-01, BB-01, ITAU-01"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-slate-800 uppercase focus:outline-hidden focus:bg-white focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Tipo de Conta *
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800 cursor-pointer"
                  >
                    <option value="corrente">Conta Corrente Bancária</option>
                    <option value="caixa">Caixa Físico Interno</option>
                    <option value="poupanca">Conta Poupança</option>
                    <option value="investimento">Aplicação / Investimento</option>
                    <option value="outra">Outro Tipo</option>
                  </select>
                </div>

                {type !== 'caixa' && (
                  <>
                    <div className="sm:col-span-2">
                      <label className="block text-slate-700 font-bold mb-1">
                        Instituição Financeira / Banco
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <select
                          value={bankCode}
                          onChange={(e) => {
                            const b = COMMON_BANKS.find((x) => x.code === e.target.value);
                            setBankCode(e.target.value);
                            if (b) setBankName(b.name);
                          }}
                          className="col-span-1 px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800 cursor-pointer"
                        >
                          <option value="">Outro Banco</option>
                          {COMMON_BANKS.map((b) => (
                            <option key={b.code} value={b.code}>
                              {b.code} - {b.name.split(' ')[0]}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          placeholder="Nome do Banco"
                          value={bankName}
                          onChange={(e) => setBankName(e.target.value)}
                          className="col-span-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-800"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">
                        Agência (com dígito)
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: 3456-7"
                        value={agency}
                        onChange={(e) => setAgency(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-medium text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">
                        Número da Conta (com dígito)
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: 12345-6"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-medium text-slate-800"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Saldo Inicial (R$)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={initialBalance}
                    onChange={(e) => setInitialBalance(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Saldo Atual (R$)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={currentBalance}
                    onChange={(e) => setCurrentBalance(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-black text-slate-900"
                  />
                </div>

                <div className="sm:col-span-2 flex items-center gap-2 pt-1">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isDefault}
                      onChange={(e) => setIsDefault(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                  <div>
                    <span className="font-bold text-slate-800 block">Definir como Conta Padrão</span>
                    <span className="text-[11px] text-slate-500">
                      Conta pré-selecionada para lançamentos de receitas e despesas
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800 cursor-pointer"
                  >
                    <option value="ativo">Ativa</option>
                    <option value="inativo">Inativa</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Observações</label>
                  <input
                    type="text"
                    placeholder="Ex: Gerente de conta, contato, convênio..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-800"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <Check size={15} />
                  <span>Salvar Conta</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      {deleteCandidate && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-sm w-full p-4 space-y-3 animate-scaleIn">
            <div className="flex items-center gap-2.5 text-rose-600">
              <div className="p-2 bg-rose-50 rounded-xl">
                <AlertTriangle size={20} />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Excluir Conta Financeira?</h3>
            </div>
            <p className="text-xs text-slate-600">
              Deseja realmente remover a conta{' '}
              <strong>"{deleteCandidate.name}" ({deleteCandidate.code})</strong>?
              Saldo atual: <strong>{formatCurrency(deleteCandidate.currentBalance)}</strong>.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteCandidate(null)}
                className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-3.5 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors cursor-pointer shadow-xs"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
