import React, { useState } from 'react';
import {
  Calendar,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  X,
  Layers,
  Percent,
  Check,
  TrendingDown,
  TrendingUp,
  Tag
} from 'lucide-react';
import { Database } from '../../services/db';
import { PaymentTermRecord } from '../../types';
import { formatCurrency } from '../../services/pricingEngine';
import { toast } from '../../services/toast';

export const PaymentTermsManager: React.FC = () => {
  const currentCompany = Database.getCurrentCompany();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'ativo' | 'inativo'>('todos');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PaymentTermRecord | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<PaymentTermRecord | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [installmentsCount, setInstallmentsCount] = useState('1');
  const [daysIntervals, setDaysIntervals] = useState('0');
  const [percentAdditionOrDiscount, setPercentAdditionOrDiscount] = useState('0');
  const [minOrderValue, setMinOrderValue] = useState('');
  const [status, setStatus] = useState<'ativo' | 'inativo'>('ativo');
  const [notes, setNotes] = useState('');

  const termsList = Database.getPaymentTermsList(currentCompany.id);

  const handleOpenCreate = () => {
    setEditingItem(null);
    setName('');
    setCode('');
    setInstallmentsCount('1');
    setDaysIntervals('0');
    setPercentAdditionOrDiscount('0');
    setMinOrderValue('');
    setStatus('ativo');
    setNotes('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: PaymentTermRecord) => {
    setEditingItem(item);
    setName(item.name);
    setCode(item.code);
    setInstallmentsCount(String(item.installmentsCount || 1));
    setDaysIntervals(item.daysIntervals || '0');
    setPercentAdditionOrDiscount(String(item.percentAdditionOrDiscount || 0));
    setMinOrderValue(item.minOrderValue ? String(item.minOrderValue) : '');
    setStatus(item.status);
    setNotes(item.notes || '');
    setIsModalOpen(true);
  };

  // Sugestão automática de intervalos ao mudar o número de parcelas
  const handleInstallmentsChange = (countStr: string) => {
    setInstallmentsCount(countStr);
    const count = parseInt(countStr, 10);
    if (!editingItem && !isNaN(count) && count > 0) {
      if (count === 1) {
        setDaysIntervals('30');
      } else {
        const days = [];
        for (let i = 1; i <= count; i++) {
          days.push(i * 30);
        }
        setDaysIntervals(days.join(', '));
      }
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.warning('Informe o nome da condição/prazo de pagamento.', 'Campo Obrigatório');
      return;
    }

    const instCount = parseInt(installmentsCount, 10) || 1;
    const perc = parseFloat(percentAdditionOrDiscount.replace(',', '.')) || 0;
    const minVal = parseFloat(minOrderValue.replace(',', '.')) || undefined;

    try {
      Database.savePaymentTerm({
        id: editingItem?.id,
        companyId: currentCompany.id,
        name: name.trim(),
        code: (code.trim() || name.trim().toUpperCase().replace(/\s+/g, '_')).slice(0, 20),
        installmentsCount: Math.max(1, instCount),
        daysIntervals: daysIntervals.trim() || '0',
        percentAdditionOrDiscount: perc,
        minOrderValue: minVal,
        status,
        notes: notes.trim() || undefined,
      });

      toast.success(
        editingItem ? 'Prazo de pagamento atualizado com sucesso!' : 'Prazo de pagamento cadastrado com sucesso!',
        'Prazos de Pagamento'
      );
      setIsModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar prazo.', 'Erro');
    }
  };

  const handleConfirmDelete = () => {
    if (!deleteCandidate) return;
    try {
      Database.deletePaymentTerm(deleteCandidate.id);
      toast.success(`Prazo "${deleteCandidate.name}" excluído com sucesso!`, 'Exclusão Concluída');
      setDeleteCandidate(null);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao excluir prazo.', 'Erro');
    }
  };

  const filteredTerms = termsList.filter((item) => {
    const matchSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.daysIntervals.includes(searchTerm);
    const matchStatus = statusFilter === 'todos' || item.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-4">
      {/* Header com Botão Novo */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="text-blue-600" size={20} />
            <h3 className="text-base font-bold text-slate-800">
              Prazos & Condições de Pagamento
            </h3>
            <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-bold border border-blue-200">
              {termsList.length} cadastrados
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure os prazos comerciais de faturamento (À Vista, 14 Dias, 28 Dias, 30/60/90 Dias, etc.) aplicáveis aos pedidos e vendas.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
        >
          <Plus size={16} />
          <span>Novo Prazo de Pagamento</span>
        </button>
      </div>

      {/* Barra de Busca e Filtros */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nome do prazo, código ou dias (ex: À Vista, 30 Dias, 30_60)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-hidden focus:bg-white focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
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

      {/* Tabela de Prazos */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold text-[10px]">
              <tr>
                <th className="py-2.5 px-3">Código</th>
                <th className="py-2.5 px-3">Condição Comercial</th>
                <th className="py-2.5 px-3 text-center">Nº Parcelas</th>
                <th className="py-2.5 px-3">Dias de Vencimento</th>
                <th className="py-2.5 px-3 text-center">Acréscimo / Desconto</th>
                <th className="py-2.5 px-3 text-right">Pedido Mínimo</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredTerms.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Nenhum prazo de pagamento encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredTerms.map((term) => (
                  <tr key={term.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3">
                      <span className="font-mono font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-[11px]">
                        {term.code}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={14} className="text-blue-600" />
                        <span>{term.name}</span>
                      </div>
                      {term.notes && (
                        <span className="text-[10px] text-slate-400 block font-normal truncate max-w-xs">
                          {term.notes}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-50 text-blue-700 font-bold font-mono text-[11px] border border-blue-200">
                        {term.installmentsCount}x
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1">
                        <Clock size={11} className="text-slate-400" />
                        <span className="font-mono text-slate-700 font-bold">
                          {term.daysIntervals} dias
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold">
                      {term.percentAdditionOrDiscount < 0 ? (
                        <span className="inline-flex items-center gap-0.5 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px]">
                          <TrendingDown size={11} />
                          {term.percentAdditionOrDiscount}% Desc.
                        </span>
                      ) : term.percentAdditionOrDiscount > 0 ? (
                        <span className="inline-flex items-center gap-0.5 text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full text-[10px]">
                          <TrendingUp size={11} />
                          +{term.percentAdditionOrDiscount}% Acrésc.
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">0%</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                      {term.minOrderValue ? formatCurrency(term.minOrderValue) : <span className="text-slate-400">-</span>}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {term.status === 'ativo' ? (
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
                          onClick={() => handleOpenEdit(term)}
                          className="p-1 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                          title="Editar Prazo"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteCandidate(term)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                          title="Excluir Prazo"
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

      {/* MODAL CRIAR / EDITAR PRAZO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-scaleIn">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="text-blue-600" size={18} />
                <h3 className="font-bold text-slate-800 text-sm">
                  {editingItem ? 'Editar Prazo de Pagamento' : 'Novo Prazo de Pagamento'}
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
                    Nome / Descrição Comercial *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 30 Dias, 30 / 60 Dias (2x), À Vista..."
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
                    placeholder="Ex: 30D, 30_60D, AVISTA"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-slate-800 uppercase focus:outline-hidden focus:bg-white focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Quantidade de Parcelas
                  </label>
                  <select
                    value={installmentsCount}
                    onChange={(e) => handleInstallmentsChange(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800 cursor-pointer"
                  >
                    {[1, 2, 3, 4, 5, 6, 8, 10, 12, 18, 24].map((n) => (
                      <option key={n} value={n}>
                        {n} parcela{n > 1 ? 's' : ''} ({n}x)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-700 font-bold mb-1">
                    Intervalos de Vencimento em Dias (separados por vírgula) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 0 (para à vista), 30, 30, 60 ou 0, 30, 60"
                    value={daysIntervals}
                    onChange={(e) => setDaysIntervals(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-slate-800 focus:outline-hidden focus:bg-white focus:ring-1 focus:ring-blue-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Exemplos: <code>0</code> (à vista imediato), <code>14</code> (14 dias), <code>30, 60</code> (2 parcelas), <code>0, 30, 60</code> (entrada + 2 parcelas)
                  </span>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Acréscimo (+) ou Desconto (-) %
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="Ex: -3 para desc. ou 2 para acrésc."
                      value={percentAdditionOrDiscount}
                      onChange={(e) => setPercentAdditionOrDiscount(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-slate-800 pr-7 focus:outline-hidden focus:bg-white focus:ring-1 focus:ring-blue-500"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs select-none">
                      %
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Valor Mínimo do Pedido (R$)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00 (Opcional)"
                    value={minOrderValue}
                    onChange={(e) => setMinOrderValue(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-medium text-slate-800"
                  />
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
                    placeholder="Instruções para os vendedores..."
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
                  <span>Salvar Prazo</span>
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
              <h3 className="font-bold text-slate-900 text-sm">Excluir Prazo de Pagamento?</h3>
            </div>
            <p className="text-xs text-slate-600">
              Deseja realmente remover a condição comercial{' '}
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
