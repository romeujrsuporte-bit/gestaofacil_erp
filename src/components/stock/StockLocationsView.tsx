import React, { useState, useEffect } from 'react';
import {
  Warehouse,
  ArrowLeftRight,
  ClipboardCheck,
  History,
  Plus,
  Search,
  Filter,
  AlertCircle,
  CheckCircle,
  FileSpreadsheet,
  Edit2,
  Trash2,
  Boxes,
  RotateCw
} from 'lucide-react';
import { Database } from '../../services/db';
import { StockLocation, Product, StockMovement, ProductStockBalance } from '../../types';
import { StockEngine } from '../../services/stockEngine';
import { formatCurrency, formatQuantity } from '../../services/pricingEngine';
import { toast } from '../../services/toast';

export const StockLocationsView: React.FC<{ initialSubTab?: 'locais' | 'transferencias' | 'inventario' | 'movimentacoes' }> = ({
  initialSubTab = 'locais',
}) => {
  const [dbState, setDbState] = useState(Database.getState());
  const currentCompany = Database.getCurrentCompany();
  const currentUser = Database.getCurrentUser();

  useEffect(() => {
    return Database.subscribe(() => {
      setDbState({ ...Database.getState() });
    });
  }, []);

  const [activeTab, setActiveTab] = useState<'locais' | 'transferencias' | 'inventario' | 'movimentacoes'>(initialSubTab);

  // Estados de Locais
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<StockLocation | null>(null);
  const [locName, setLocName] = useState('');
  const [locCode, setLocCode] = useState('');
  const [locType, setLocType] = useState<StockLocation['type']>('outros');
  const [locDesc, setLocDesc] = useState('');

  // Estados de Transferência entre Locais
  const [transferOriginLocId, setTransferOriginLocId] = useState('');
  const [transferDestLocId, setTransferDestLocId] = useState('');
  const [transferProductId, setTransferProductId] = useState('');
  const [transferQty, setTransferQty] = useState('');
  const [transferNotes, setTransferNotes] = useState('');

  // Estados de Inventário
  const [inventoryLocId, setInventoryLocId] = useState('');
  const [inventoryCounts, setInventoryCounts] = useState<{ [productId: string]: string }>({});
  const [inventoryReasons, setInventoryReasons] = useState<{ [productId: string]: string }>({});

  // Estados de Movimentações
  const [movFilterType, setMovFilterType] = useState('todos');
  const [movSearchProd, setMovSearchProd] = useState('');

  const locations = dbState.stockLocations.filter((l) => l.companyId === currentCompany.id);

  // Criar / Editar Local de Estoque
  const handleSaveLocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!locName.trim() || !locCode.trim()) {
      alert('Preencha Código e Nome do Local.');
      return;
    }

    const state = Database.getState();
    if (editingLocation) {
      state.stockLocations = state.stockLocations.map((l) =>
        l.id === editingLocation.id
          ? {
              ...l,
              name: locName.trim(),
              code: locCode.trim().toUpperCase(),
              type: locType,
              description: locDesc.trim(),
            }
          : l
      );
      Database.addAuditLog('ATUALIZAR_LOCAL', 'ESTOQUE', editingLocation.id, `Local ${locName} atualizado`);
    } else {
      const newLoc: StockLocation = {
        id: 'LOC-' + Date.now(),
        code: locCode.trim().toUpperCase(),
        name: locName.trim(),
        companyId: currentCompany.id,
        description: locDesc.trim(),
        type: locType,
        status: 'ativo',
      };
      state.stockLocations.push(newLoc);
      Database.addAuditLog('CRIAR_LOCAL', 'ESTOQUE', newLoc.id, `Local ${newLoc.name} (${newLoc.code}) cadastrado`);
    }

    Database.persist();
    setIsLocationModalOpen(false);
    setEditingLocation(null);
  };

  const handleInactivateLocation = (loc: StockLocation) => {
    const hasMovements = dbState.stockMovements.some((m) => m.locationId === loc.id || m.toLocationId === loc.id);
    if (hasMovements) {
      const ok = window.confirm(
        `O local "${loc.name}" possui movimentações históricas e não pode ser deletado. Deseja inativá-lo?`
      );
      if (ok) {
        Database.getState().stockLocations = Database.getState().stockLocations.map((l) =>
          l.id === loc.id ? { ...l, status: 'inativo' as const } : l
        );
        Database.persist();
        alert('Local inativado.');
      }
      return;
    }

    if (window.confirm(`Excluir o local "${loc.name}"?`)) {
      Database.getState().stockLocations = Database.getState().stockLocations.filter((l) => l.id !== loc.id);
      Database.persist();
      alert('Local excluído com sucesso.');
    }
  };

  // Executar Transferência Entre Locais
  const handleExecuteTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferOriginLocId || !transferDestLocId || !transferProductId || !transferQty) {
      alert('Selecione Origem, Destino, Produto e Quantidade.');
      return;
    }
    if (transferOriginLocId === transferDestLocId) {
      alert('O local de origem não pode ser igual ao local de destino.');
      return;
    }

    const qty = parseFloat(transferQty);
    if (isNaN(qty) || qty <= 0) {
      alert('Informe uma quantidade válida maior que zero.');
      return;
    }

    const product = dbState.products.find((p) => p.id === transferProductId);
    const originLoc = locations.find((l) => l.id === transferOriginLocId);
    const destLoc = locations.find((l) => l.id === transferDestLocId);

    if (!product || !originLoc || !destLoc) return;

    try {
      const { updatedBalances, movements } = StockEngine.transferBetweenLocations(
        dbState.stockBalances,
        product,
        originLoc,
        destLoc,
        qty,
        currentUser.id,
        currentUser.name,
        currentCompany.id,
        transferNotes
      );

      const state = Database.getState();
      state.stockBalances = updatedBalances;
      state.stockMovements = [...movements, ...state.stockMovements];
      Database.persist();

      Database.addAuditLog(
        'TRANSFERENCIA_ESTOQUE',
        'ESTOQUE',
        movements[0].originDocId,
        `Transferência de ${qty} ${product.unit} de ${product.description} de ${originLoc.name} para ${destLoc.name}`
      );

      toast.success(
        `Transferência concluída com sucesso! ${qty} ${product.unit} de ${product.description} transferidos para ${destLoc.name}.`,
        'Transferência de Estoque'
      );
      setTransferProductId('');
      setTransferQty('');
      setTransferNotes('');
    } catch (err) {
      toast.error('Erro na transferência: ' + (err as Error).message, 'Erro de Transferência');
    }
  };

  // Confirmar Ajuste de Inventário Físico
  const handleApplyInventoryAdjustments = () => {
    if (!currentUser.permissions.canAdjustStock) {
      alert('Acesso negado: Seu perfil não possui permissão para aplicar ajustes de inventário.');
      return;
    }
    if (!inventoryLocId) {
      alert('Selecione o local de estoque inventariado.');
      return;
    }

    const selectedLoc = locations.find((l) => l.id === inventoryLocId);
    if (!selectedLoc) return;

    const adjustedItems = Object.entries(inventoryCounts).filter(([_, val]) => val.trim() !== '');
    if (adjustedItems.length === 0) {
      alert('Informe a contagem física de pelo menos um produto para ajustar.');
      return;
    }

    const confirm = window.confirm(
      `Deseja aplicar o ajuste de contagem física para ${adjustedItems.length} produto(s) no local "${selectedLoc.name}"?`
    );
    if (!confirm) return;

    try {
      let currentBalances = [...dbState.stockBalances];
      const movements: StockMovement[] = [];
      const nowIso = new Date().toISOString();
      const docId = 'INV-' + Date.now();

      for (const [prodId, countStr] of adjustedItems) {
        const countedQty = parseFloat(countStr);
        if (isNaN(countedQty) || countedQty < 0) continue;

        const prod = dbState.products.find((p) => p.id === prodId);
        if (!prod) continue;

        const currentBal = StockEngine.getBalance(currentBalances, prodId, inventoryLocId);
        const difference = countedQty - currentBal.quantity;

        if (difference !== 0) {
          const reason = inventoryReasons[prodId] || 'Ajuste de inventário físico periódico';

          const { updatedBalances, createdMovement } = StockEngine.applyMovement(
            currentBalances,
            {
              companyId: currentCompany.id,
              productId: prod.id,
              productCode: prod.code,
              productDescription: prod.description,
              locationId: selectedLoc.id,
              locationName: selectedLoc.name,
              type: 'ajuste_inventario',
              quantity: difference,
              unitCost: prod.costPrice,
              totalCost: prod.costPrice * difference,
              originDocType: 'inventario',
              originDocId: docId,
              date: nowIso,
              userId: currentUser.id,
              userName: currentUser.name,
              notes: `${reason} (Anterior: ${currentBal.quantity}, Contado: ${countedQty}, Dif: ${difference > 0 ? '+' : ''}${difference})`,
            },
            { allowNegativeStock: false }
          );

          currentBalances = updatedBalances;
          movements.push(createdMovement);
        }
      }

      const state = Database.getState();
      state.stockBalances = currentBalances;
      state.stockMovements = [...movements, ...state.stockMovements];
      Database.persist();

      Database.addAuditLog(
        'AJUSTE_INVENTARIO',
        'ESTOQUE',
        docId,
        `Inventário aplicado no local ${selectedLoc.name} por ${currentUser.name} (${movements.length} divergências ajustadas)`
      );

      toast.success(
        `Inventário processado com sucesso! ${movements.length} produto(s) tiveram seus saldos sincronizados no local ${selectedLoc.name}.`,
        'Inventário Aplicado'
      );
      setInventoryCounts({});
      setInventoryReasons({});
    } catch (e) {
      toast.error('Erro no inventário: ' + (e as Error).message, 'Erro de Inventário');
    }
  };

  // Movimentações filtradas
  const filteredMovements = dbState.stockMovements.filter((m) => {
    if (m.companyId !== currentCompany.id) return false;
    if (movFilterType !== 'todos' && m.type !== movFilterType) return false;
    if (movSearchProd && !m.productDescription.toLowerCase().includes(movSearchProd.toLowerCase()) && !m.productCode.toLowerCase().includes(movSearchProd.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Topo com Abas do Módulo */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Warehouse className="text-indigo-600" size={20} />
            <span>Controle de Múltiplos Locais de Estoque & Movimentações</span>
          </h2>
          <p className="text-xs text-slate-500">
            Armazenamento setorizado (Matéria-Prima, Comercial, Almoxarifado), transferências internas e inventário.
          </p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
          <button
            onClick={() => setActiveTab('locais')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'locais' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Locais Cadastrados
          </button>
          <button
            onClick={() => setActiveTab('transferencias')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'transferencias' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Transferência Interna
          </button>
          <button
            onClick={() => setActiveTab('inventario')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'inventario' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Inventário & Ajustes
          </button>
          <button
            onClick={() => setActiveTab('movimentacoes')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'movimentacoes' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Extrato de Movimentações
          </button>
        </div>
      </div>

      {/* ABA 1: LOCAIS CADASTRADOS */}
      {activeTab === 'locais' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-600 uppercase">
              Locais de Armazenamento da Empresa ({locations.length})
            </span>
            <button
              onClick={() => {
                setEditingLocation(null);
                setLocName('');
                setLocCode('LOC-0' + (locations.length + 1));
                setLocType('outros');
                setLocDesc('');
                setIsLocationModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shadow-xs"
            >
              <Plus size={15} />
              <span>Novo Local de Estoque</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {locations.map((loc) => {
              // Contar itens e saldos neste local
              const itemsInLoc = dbState.stockBalances.filter((b) => b.locationId === loc.id && b.quantity > 0);
              const totalItemsCount = itemsInLoc.reduce((s, i) => s + i.quantity, 0);

              return (
                <div
                  key={loc.id}
                  className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                        {loc.code}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        loc.status === 'ativo' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {loc.status}
                      </span>
                    </div>

                    <h4 className="font-bold text-sm text-slate-800 mt-2">{loc.name}</h4>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{loc.description || 'Sem descrição informada.'}</p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Saldo Físico</span>
                      <span className="font-bold text-slate-800">{itemsInLoc.length} produtos ({formatQuantity(totalItemsCount)} un)</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingLocation(loc);
                          setLocName(loc.name);
                          setLocCode(loc.code);
                          setLocType(loc.type);
                          setLocDesc(loc.description);
                          setIsLocationModalOpen(true);
                        }}
                        className="p-1.5 hover:bg-slate-100 rounded-md text-slate-500 hover:text-slate-800"
                        title="Editar Local"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        onClick={() => handleInactivateLocation(loc)}
                        className="p-1.5 hover:bg-rose-50 rounded-md text-rose-500"
                        title="Inativar ou Excluir"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ABA 2: TRANSFERÊNCIA ENTRE LOCAIS */}
      {activeTab === 'transferencias' && (
        <form onSubmit={handleExecuteTransfer} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs max-w-xl mx-auto space-y-4">
          <div className="pb-3 border-b border-slate-100 flex items-center gap-2">
            <ArrowLeftRight size={18} className="text-indigo-600" />
            <h3 className="font-bold text-sm text-slate-800">Transferência Interna de Estoque</h3>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Local de Origem (Saída) *</label>
              <select
                required
                value={transferOriginLocId}
                onChange={(e) => setTransferOriginLocId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium"
              >
                <option value="">Selecione a origem...</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} ({l.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Local de Destino (Entrada) *</label>
              <select
                required
                value={transferDestLocId}
                onChange={(e) => setTransferDestLocId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium"
              >
                <option value="">Selecione o destino...</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} ({l.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Produto a Transferir *</label>
            <select
              required
              value={transferProductId}
              onChange={(e) => setTransferProductId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-medium"
            >
              <option value="">Selecione o produto...</option>
              {dbState.products.map((p) => {
                const bal = transferOriginLocId
                  ? StockEngine.getBalance(dbState.stockBalances, p.id, transferOriginLocId).quantity
                  : 0;
                return (
                  <option key={p.id} value={p.id}>
                    {p.code} - {p.description} {transferOriginLocId ? `(Disp na Origem: ${bal} ${p.unit})` : ''}
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Quantidade a Transferir *</label>
            <input
              type="number"
              step="any"
              min="0.001"
              required
              placeholder="Ex: 50"
              value={transferQty}
              onChange={(e) => setTransferQty(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Motivo / Observações</label>
            <input
              type="text"
              placeholder="Ex: Reposição de prateleiras da loja de balcão"
              value={transferNotes}
              onChange={(e) => setTransferNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-3 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
          >
            <ArrowLeftRight size={16} />
            <span>Confirmar Transferência Atômica</span>
          </button>
        </form>
      )}

      {/* ABA 3: INVENTÁRIO FÍSICO & AJUSTES */}
      {activeTab === 'inventario' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                <ClipboardCheck size={18} className="text-emerald-600" />
                <span>Contagem Física & Ajuste de Inventário por Local</span>
              </h3>
              <p className="text-xs text-slate-500">
                Selecione um local de estoque, insira as contagens físicas e confirme os acertos com justificativa auditada.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600 whitespace-nowrap">Local:</span>
              <select
                value={inventoryLocId}
                onChange={(e) => setInventoryLocId(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold"
              >
                <option value="">Selecione o Local...</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {!inventoryLocId ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              Selecione um local de estoque acima para listar os produtos e iniciar a contagem física.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-3">Código</th>
                      <th className="p-3">Descrição do Produto</th>
                      <th className="p-3 text-right">Saldo Atual Sistema</th>
                      <th className="p-3 text-center">Contagem Física</th>
                      <th className="p-3 text-right">Divergência</th>
                      <th className="p-3">Justificativa do Acerto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dbState.products.map((p) => {
                      const bal = StockEngine.getBalance(dbState.stockBalances, p.id, inventoryLocId);
                      const countedStr = inventoryCounts[p.id] ?? '';
                      const countedNum = countedStr !== '' ? parseFloat(countedStr) : null;
                      const diff = countedNum !== null ? countedNum - bal.quantity : 0;

                      return (
                        <tr key={p.id} className="hover:bg-slate-50/80">
                          <td className="p-3 font-mono font-bold text-slate-600">{p.code}</td>
                          <td className="p-3 font-semibold text-slate-800">{p.description}</td>
                          <td className="p-3 text-right font-bold text-slate-700">
                            {formatQuantity(bal.quantity)} {p.unit}
                          </td>
                          <td className="p-3 text-center">
                            <input
                              type="number"
                              step="any"
                              placeholder={String(bal.quantity)}
                              value={countedStr}
                              onChange={(e) =>
                                setInventoryCounts({ ...inventoryCounts, [p.id]: e.target.value })
                              }
                              className="w-24 px-2 py-1 bg-slate-50 border border-slate-300 rounded-md text-center font-bold text-slate-900 focus:outline-hidden"
                            />
                          </td>
                          <td className="p-3 text-right font-bold">
                            {countedNum !== null ? (
                              <span
                                className={
                                  diff === 0
                                    ? 'text-slate-400'
                                    : diff > 0
                                    ? 'text-emerald-600'
                                    : 'text-rose-600'
                                }
                              >
                                {diff > 0 ? `+${formatQuantity(diff)}` : formatQuantity(diff)} {p.unit}
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="p-3">
                            <input
                              type="text"
                              placeholder="Motivo (ex: avaria, sobra física...)"
                              value={inventoryReasons[p.id] || ''}
                              onChange={(e) =>
                                setInventoryReasons({ ...inventoryReasons, [p.id]: e.target.value })
                              }
                              disabled={countedNum === null || diff === 0}
                              className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs disabled:opacity-40"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end pt-3 border-t border-slate-100">
                <button
                  onClick={handleApplyInventoryAdjustments}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <CheckCircle size={16} />
                  <span>Aplicar Ajustes e Registrar Inventário</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ABA 4: EXTRATO DE MOVIMENTAÇÕES */}
      {activeTab === 'movimentacoes' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden space-y-3 p-4">
          <div className="flex flex-col sm:flex-row gap-2.5 text-xs">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Buscar por descrição ou código do produto..."
                value={movSearchProd}
                onChange={(e) => setMovSearchProd(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              />
            </div>

            <div>
              <select
                value={movFilterType}
                onChange={(e) => setMovFilterType(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold"
              >
                <option value="todos">Todos os Tipos de Movimento</option>
                <option value="saida_venda">Saída por Venda</option>
                <option value="entrada_compra">Entrada por Compra</option>
                <option value="consumo_producao">Consumo de Componentes (Produção)</option>
                <option value="entrada_producao">Entrada de Produto Acabado</option>
                <option value="transferencia_saida">Transferência (Saída)</option>
                <option value="transferencia_entrada">Transferência (Entrada)</option>
                <option value="ajuste_inventario">Ajuste de Inventário</option>
                <option value="devolucao">Devolução / Estorno</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-3">Data / Hora</th>
                  <th className="p-3">Produto</th>
                  <th className="p-3">Tipo de Movimento</th>
                  <th className="p-3">Local Estoque</th>
                  <th className="p-3 text-right">Quantidade</th>
                  <th className="p-3 text-right">Custo Total</th>
                  <th className="p-3">Documento Origem</th>
                  <th className="p-3">Usuário</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMovements.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      Nenhuma movimentação de estoque registrada com os filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  filteredMovements.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/80">
                      <td className="p-3 text-slate-500 whitespace-nowrap">
                        {new Date(m.date).toLocaleString('pt-BR')}
                      </td>
                      <td className="p-3 font-semibold text-slate-800">
                        {m.productCode} - {m.productDescription}
                      </td>
                      <td className="p-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          m.type.includes('entrada')
                            ? 'bg-emerald-100 text-emerald-800'
                            : m.type.includes('saida') || m.type.includes('consumo')
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {m.type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-3 text-slate-600 font-medium">
                        {m.locationName}
                        {m.toLocationName && ` ➔ ${m.toLocationName}`}
                      </td>
                      <td className="p-3 text-right font-bold text-slate-900">
                        {formatQuantity(m.quantity)}
                      </td>
                      <td className="p-3 text-right font-medium text-slate-600">
                        {currentUser.permissions.canViewCosts ? formatCurrency(m.totalCost) : '••••'}
                      </td>
                      <td className="p-3 font-mono text-slate-600">{m.originDocId}</td>
                      <td className="p-3 text-slate-500">{m.userName}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Criação / Edição de Local */}
      {isLocationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <form
            onSubmit={handleSaveLocation}
            className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-4"
          >
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-800">
                {editingLocation ? 'Editar Local de Estoque' : 'Novo Local de Estoque'}
              </h3>
              <button
                type="button"
                onClick={() => setIsLocationModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Código do Local *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: MP-02, EXP-01"
                  value={locCode}
                  onChange={(e) => setLocCode(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nome do Local *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Matéria-Prima Secundária"
                  value={locName}
                  onChange={(e) => setLocName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Tipo de Finalidade</label>
                <select
                  value={locType}
                  onChange={(e) => setLocType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium"
                >
                  <option value="materia_prima">Matéria-Prima</option>
                  <option value="comercial">Comercial</option>
                  <option value="almoxarifado">Almoxarifado & Insumos</option>
                  <option value="embalagens">Embalagens & Frascos</option>
                  <option value="outros">Outros / Expedição</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Descrição / Localização Física</label>
                <textarea
                  rows={2}
                  value={locDesc}
                  onChange={(e) => setLocDesc(e.target.value)}
                  placeholder="Ex: Corredor B, Prateleiras 1 a 4"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsLocationModalOpen(false)}
                className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-xs"
              >
                Salvar Local
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
