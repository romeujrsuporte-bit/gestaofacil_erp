import React, { useState } from 'react';
import {
  CreditCard,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Barcode,
  QrCode,
  DollarSign,
  FileText,
  AlertTriangle,
  X,
  Layers,
  Percent,
  Clock,
  Building2,
  Check
} from 'lucide-react';
import { Database } from '../../services/db';
import { PaymentMethodRecord, PaymentMethodType } from '../../types';
import { formatCurrency } from '../../services/pricingEngine';
import { toast } from '../../services/toast';

export const PaymentMethodsManager: React.FC = () => {
  const [dbState, setDbState] = useState(Database.getState());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'ativo' | 'inativo'>('todos');
  const [typeFilter, setTypeFilter] = useState<string>('todos');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PaymentMethodRecord | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<PaymentMethodRecord | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [type, setType] = useState<PaymentMethodType>('boleto');
  const [feePercent, setFeePercent] = useState('0');
  const [daysToReceive, setDaysToReceive] = useState('1');
  const [defaultAccountId, setDefaultAccountId] = useState('');
  const [allowInstallments, setAllowInstallments] = useState(false);
  const [maxInstallments, setMaxInstallments] = useState('1');
  const [status, setStatus] = useState<'ativo' | 'inativo'>('ativo');
  const [notes, setNotes] = useState('');

  const accounts = Database.getFinancialAccounts();
  const paymentMethods = Database.getPaymentMethods();

  const handleOpenCreate = () => {
    setEditingItem(null);
    setName('');
    setCode('');
    setType('boleto');
    setFeePercent('2.49');
    setDaysToReceive('1');
    setDefaultAccountId(accounts[0]?.id || '');
    setAllowInstallments(true);
    setMaxInstallments('12');
    setStatus('ativo');
    setNotes('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: PaymentMethodRecord) => {
    setEditingItem(item);
    setName(item.name);
    setCode(item.code);
    setType(item.type);
    setFeePercent(String(item.feePercent || 0));
    setDaysToReceive(String(item.daysToReceive || 0));
    setDefaultAccountId(item.defaultAccountId || '');
    setAllowInstallments(Boolean(item.allowInstallments));
    setMaxInstallments(String(item.maxInstallments || 1));
    setStatus(item.status);
    setNotes(item.notes || '');
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.warning('Informe o nome da forma de pagamento.', 'Campo Obrigatório');
      return;
    }

    const fee = parseFloat(feePercent.replace(',', '.')) || 0;
    const days = parseInt(daysToReceive, 10) || 0;
    const maxInst = parseInt(maxInstallments, 10) || 1;

    try {
      Database.savePaymentMethod({
        id: editingItem?.id,
        name: name.trim(),
        code: (code.trim() || name.trim().toUpperCase().replace(/\s+/g, '_')).slice(0, 20),
        type,
        feePercent: Math.max(0, fee),
        daysToReceive: Math.max(0, days),
        defaultAccountId: defaultAccountId || undefined,
        allowInstallments,
        maxInstallments: allowInstallments ? Math.max(1, maxInst) : 1,
        status,
        notes: notes.trim() || undefined,
      });

      toast.success(
        editingItem ? 'Forma de pagamento atualizada com sucesso!' : 'Forma de pagamento cadastrada com sucesso!',
        'Formas de Pagamento'
      );
      setDbState(Database.getState());
      setIsModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar forma de pagamento.', 'Erro');
    }
  };

  const handleConfirmDelete = () => {
    if (!deleteCandidate) return;
    try {
      Database.deletePaymentMethod(deleteCandidate.id);
      toast.success(`Forma de pagamento "${deleteCandidate.name}" excluída com sucesso!`, 'Exclusão Concluída');
      setDbState(Database.getState());
      setDeleteCandidate(null);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao excluir forma de pagamento.', 'Erro');
    }
  };

  const filteredMethods = paymentMethods.filter((item) => {
    const matchSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'todos' || item.status === statusFilter;
    const matchType = typeFilter === 'todos' || item.type === typeFilter;
    return matchSearch && matchStatus && matchType;
  });

  const getTypeIcon = (t: PaymentMethodType) => {
    switch (t) {
      case 'boleto':
        return <Barcode size={16} className="text-amber-600" />;
      case 'pix':
        return <QrCode size={16} className="text-emerald-600" />;
      case 'dinheiro':
        return <DollarSign size={16} className="text-emerald-600" />;
      case 'cartao_credito':
      case 'cartao_debito':
        return <CreditCard size={16} className="text-blue-600" />;
      case 'crediario':
        return <FileText size={16} className="text-purple-600" />;
      default:
        return <Layers size={16} className="text-slate-600" />;
    }
  };

  const getTypeLabel = (t: PaymentMethodType) => {
    switch (t) {
      case 'boleto':
        return 'Boleto Bancário';
      case 'pix':
        return 'Pix Instantâneo';
      case 'dinheiro':
        return 'Dinheiro em Espécie';
      case 'cartao_credito':
        return 'Cartão de Crédito';
      case 'cartao_debito':
        return 'Cartão de Débito';
      case 'crediario':
        return 'Crediário Próprio';
      default:
        return 'Outro Meio';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header com Estatísticas e Botão Novo */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <CreditCard className="text-blue-600" size={20} />
            <h3 className="text-base font-bold text-slate-800">
              Formas de Pagamento
            </h3>
            <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-bold border border-blue-200">
              {paymentMethods.length} cadastradas
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Gerencie os meios de recebimento (Boleto, Pix, Cartões, Dinheiro, etc.), taxas e parcelamentos disponíveis no PDV e Vendas.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
        >
          <Plus size={16} />
          <span>Nova Forma de Pagamento</span>
        </button>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nome, código ou tipo (ex: Boleto, Pix, CC)..."
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
            <option value="boleto">Boleto Bancário</option>
            <option value="pix">Pix Instantâneo</option>
            <option value="dinheiro">Dinheiro</option>
            <option value="cartao_credito">Cartão de Crédito</option>
            <option value="cartao_debito">Cartão de Débito</option>
            <option value="crediario">Crediário Próprio</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700 cursor-pointer"
          >
            <option value="todos">Todos os Status</option>
            <option value="ativo">Apenas Ativos</option>
            <option value="inativo">Apenas Inativos</option>
          </select>
        </div>
      </div>

      {/* Grid / Tabela de Formas de Pagamento */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold text-[10px]">
              <tr>
                <th className="py-2.5 px-3">Código</th>
                <th className="py-2.5 px-3">Nome / Descrição</th>
                <th className="py-2.5 px-3">Tipo do Meio</th>
                <th className="py-2.5 px-3 text-right">Taxa Operadora</th>
                <th className="py-2.5 px-3 text-center">Compensação</th>
                <th className="py-2.5 px-3 text-center">Parcelamento</th>
                <th className="py-2.5 px-3">Conta Vinculada</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredMethods.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    Nenhuma forma de pagamento encontrada com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredMethods.map((m) => {
                  const linkedAcc = accounts.find((a) => a.id === m.defaultAccountId);
                  return (
                    <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3">
                        <span className="font-mono font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-[11px]">
                          {m.code}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          {getTypeIcon(m.type)}
                          <span>{m.name}</span>
                        </div>
                        {m.notes && (
                          <span className="text-[10px] text-slate-400 block font-normal truncate max-w-xs">
                            {m.notes}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="text-slate-600 font-medium">
                          {getTypeLabel(m.type)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">
                        {m.feePercent > 0 ? `${m.feePercent.toFixed(2)}%` : <span className="text-slate-400">0%</span>}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="inline-flex items-center gap-0.5 text-slate-700 font-medium">
                          <Clock size={11} className="text-slate-400" />
                          {m.daysToReceive === 0 ? 'D+0 (Imediato)' : `D+${m.daysToReceive}`}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {m.allowInstallments ? (
                          <span className="text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                            Até {m.maxInstallments || 12}x
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[10px]">Não permitido</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 text-xs">
                        {linkedAcc ? (
                          <span className="truncate max-w-[150px] inline-block font-medium text-slate-700" title={linkedAcc.name}>
                            {linkedAcc.name}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Padrão da empresa</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {m.status === 'ativo' ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                            <CheckCircle2 size={11} />
                            Ativo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                            <XCircle size={11} />
                            Inativo
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(m)}
                            className="p-1 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                            title="Editar Forma de Pagamento"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteCandidate(m)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                            title="Excluir Forma de Pagamento"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL CRIAR / EDITAR */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-scaleIn">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="text-blue-600" size={18} />
                <h3 className="font-bold text-slate-800 text-sm">
                  {editingItem ? 'Editar Forma de Pagamento' : 'Nova Forma de Pagamento'}
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
                    Nome da Forma de Pagamento *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Boleto Bancário, Pix Cobrança, Cartão Visa..."
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
                    placeholder="Ex: BOLETO, PIX, CC"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-slate-800 uppercase focus:outline-hidden focus:bg-white focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Tipo do Meio *
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800 focus:outline-hidden focus:bg-white focus:ring-1 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="boleto">Boleto Bancário</option>
                    <option value="pix">Pix Instantâneo</option>
                    <option value="dinheiro">Dinheiro em Espécie</option>
                    <option value="cartao_credito">Cartão de Crédito</option>
                    <option value="cartao_debito">Cartão de Débito</option>
                    <option value="crediario">Crediário Próprio</option>
                    <option value="outro">Outro Meio</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Taxa da Operadora (%)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={feePercent}
                      onChange={(e) => setFeePercent(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-slate-800 pr-7 focus:outline-hidden focus:bg-white focus:ring-1 focus:ring-blue-500"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs select-none">
                      %
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Dias para Compensar (Liquidação)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="180"
                      placeholder="1"
                      value={daysToReceive}
                      onChange={(e) => setDaysToReceive(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-slate-800 pr-12 focus:outline-hidden focus:bg-white focus:ring-1 focus:ring-blue-500"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-[11px] select-none">
                      dias
                    </span>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-700 font-bold mb-1">
                    Conta Bancária / Caixa de Crédito Padrão
                  </label>
                  <select
                    value={defaultAccountId}
                    onChange={(e) => setDefaultAccountId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-800 focus:outline-hidden focus:bg-white focus:ring-1 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="">Conta padrão da movimentação</option>
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.code} - {acc.name} ({acc.bankName || acc.type})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2 bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-800 block text-xs">Permitir Parcelamento?</span>
                      <span className="text-[11px] text-slate-500">
                        Habilita a seleção de múltiplas parcelas no PDV e Pedidos
                      </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={allowInstallments}
                        onChange={(e) => setAllowInstallments(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  {allowInstallments && (
                    <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                      <span className="text-slate-700 font-bold text-xs">
                        Quantidade Máxima de Parcelas:
                      </span>
                      <select
                        value={maxInstallments}
                        onChange={(e) => setMaxInstallments(e.target.value)}
                        className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 cursor-pointer"
                      >
                        {[2, 3, 4, 5, 6, 8, 10, 12, 18, 24, 36].map((n) => (
                          <option key={n} value={n}>
                            Até {n}x
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800 cursor-pointer"
                  >
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Observações</label>
                  <input
                    type="text"
                    placeholder="Instruções adicionais..."
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
                  <span>Salvar Forma de Pagamento</span>
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
              <h3 className="font-bold text-slate-900 text-sm">Excluir Forma de Pagamento?</h3>
            </div>
            <p className="text-xs text-slate-600">
              Deseja realmente remover a forma de pagamento{' '}
              <strong>"{deleteCandidate.name}" ({deleteCandidate.code})</strong>?
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
