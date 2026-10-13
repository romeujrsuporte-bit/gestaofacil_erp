import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Truck,
  DollarSign,
  Warehouse,
  AlertCircle,
  FileCheck,
  PackageCheck,
  Calendar,
  X
} from 'lucide-react';
import { Database } from '../../services/db';
import { PurchaseOrder, PurchaseOrderItem, Product, Supplier, StockLocation, AccountPayable, StockMovement } from '../../types';
import { StockEngine } from '../../services/stockEngine';
import { formatCurrency, formatQuantity } from '../../services/pricingEngine';
import { toast } from '../../services/toast';

export const PurchasesView: React.FC = () => {
  const [dbState, setDbState] = useState(Database.getState());
  const currentCompany = Database.getCurrentCompany();
  const currentUser = Database.getCurrentUser();

  useEffect(() => {
    return Database.subscribe(() => {
      setDbState({ ...Database.getState() });
    });
  }, []);

  const [searchTerm, setSearchTerm] = useState('');

  // Modal de Novo Pedido de Compra
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('30 dias');
  const [installmentsCount, setInstallmentsCount] = useState(1);
  const [notes, setNotes] = useState('');
  const [orderItems, setOrderItems] = useState<PurchaseOrderItem[]>([]);

  // Item sendo adicionado ao pedido
  const [itemProductId, setItemProductId] = useState('');
  const [itemBuyQty, setItemBuyQty] = useState('');
  const [itemPackageFactor, setItemPackageFactor] = useState('1');
  const [itemCost, setItemCost] = useState('');
  const [itemDiscount, setItemDiscount] = useState('0');
  const [itemFreight, setItemFreight] = useState('0');
  const [itemDestLocId, setItemDestLocId] = useState('');

  // Modal de Recebimento de Mercadorias ("Receber Mercadorias")
  const [receivingOrder, setReceivingOrder] = useState<PurchaseOrder | null>(null);
  const [receivedQuantities, setReceivedQuantities] = useState<{ [productId: string]: number }>({});
  const [generateFinancialTitles, setGenerateFinancialTitles] = useState(true);

  const suppliers = dbState.suppliers.filter((s) => s.status === 'ativo');
  const locations = dbState.stockLocations.filter((l) => l.companyId === currentCompany.id);

  // Adicionar item ao pedido de compra
  const handleAddItemToOrder = () => {
    if (!itemProductId || !itemBuyQty || !itemCost) {
      alert('Selecione o produto, informe a quantidade e o custo unitário de compra.');
      return;
    }

    const prod = dbState.products.find((p) => p.id === itemProductId);
    if (!prod) return;

    const buyQty = parseFloat(itemBuyQty) || 0;
    const factor = parseFloat(itemPackageFactor) || 1;
    const cost = parseFloat(itemCost) || 0;
    const discount = parseFloat(itemDiscount) || 0;
    const freight = parseFloat(itemFreight) || 0;

    const totalItemUnits = buyQty * factor;
    const totalItemCost = Math.max(0, buyQty * cost - discount + freight);

    const newItem: PurchaseOrderItem = {
      productId: prod.id,
      productCode: prod.code,
      description: prod.description,
      buyUnit: factor > 1 ? 'CX' : prod.unit,
      saleUnit: prod.unit,
      packageFactor: factor,
      buyQuantity: buyQty,
      unitCost: cost,
      discount,
      freightApportioned: freight,
      otherExpensesApportioned: 0,
      totalCost: totalItemCost,
      receivedQuantity: 0,
      pendingQuantity: totalItemUnits,
      destinationLocationId: itemDestLocId || prod.defaultLocationId || locations[0]?.id || 'loc-comercial',
    };

    setOrderItems([...orderItems, newItem]);
    setItemProductId('');
    setItemBuyQty('');
    setItemCost('');
    setItemDiscount('0');
    setItemFreight('0');
  };

  // Salvar Pedido de Compra (sem alterar estoque ainda!)
  const handleSavePurchaseOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId || orderItems.length === 0) {
      alert('Selecione o fornecedor e adicione itens ao pedido de compra.');
      return;
    }

    const supplier = suppliers.find((s) => s.id === selectedSupplierId);
    const subtotal = orderItems.reduce((s, i) => s + i.buyQuantity * i.unitCost, 0);
    const discountTotal = orderItems.reduce((s, i) => s + i.discount, 0);
    const freightTotal = orderItems.reduce((s, i) => s + i.freightApportioned, 0);
    const total = orderItems.reduce((s, i) => s + i.totalCost, 0);

    const pcNumber = `PC-${new Date().getFullYear()}-${String(dbState.purchaseOrders.length + 1).padStart(4, '0')}`;
    const nowIso = new Date().toISOString();

    const newOrder: PurchaseOrder = {
      id: 'PC-' + Date.now(),
      number: pcNumber,
      companyId: currentCompany.id,
      supplierId: selectedSupplierId,
      supplierName: supplier?.name || 'Fornecedor',
      orderDate: nowIso.split('T')[0],
      expectedDeliveryDate: expectedDate || nowIso.split('T')[0],
      paymentTerms,
      installmentsCount,
      status: 'aguardando_entrega',
      items: orderItems,
      subtotal,
      discountTotal,
      freightTotal,
      otherExpensesTotal: 0,
      total,
      notes,
      userId: currentUser.id,
      userName: currentUser.name,
      createdAt: nowIso,
    };

    Database.getState().purchaseOrders.unshift(newOrder);
    Database.persist();

    Database.addAuditLog(
      'CRIAR_PEDIDO_COMPRA',
      'COMPRAS',
      newOrder.id,
      `Pedido de compra ${pcNumber} criado para ${newOrder.supplierName}. Total: ${formatCurrency(total)} (Aguardando Entrega - Estoque Não Alterado)`
    );

    alert(`Pedido de compra ${pcNumber} emitido com sucesso!\nStatus: Aguardando Entrega. O estoque só será atualizado quando a mercadoria for conferida e recebida.`);
    setIsNewOrderModalOpen(false);
    setOrderItems([]);
    setSelectedSupplierId('');
    setNotes('');
  };

  // Abrir Modal de Recebimento de Mercadorias
  const handleOpenReceiving = (order: PurchaseOrder) => {
    setReceivingOrder(order);
    const initialRec: { [productId: string]: number } = {};
    order.items.forEach((item) => {
      initialRec[item.productId] = item.pendingQuantity;
    });
    setReceivedQuantities(initialRec);
  };

  // Confirmar Entrada no Estoque ("Receber Mercadorias")
  const handleConfirmReceiving = () => {
    if (!receivingOrder) return;

    try {
      let currentBalances = [...dbState.stockBalances];
      const movements: StockMovement[] = [];
      const nowIso = new Date().toISOString();
      let allItemsCompleted = true;
      let totalReceivedValue = 0;

      // 1. Atualizar estoque de cada item recebido e recalcular custo médio
      const updatedItems = receivingOrder.items.map((item) => {
        const qtyToReceive = receivedQuantities[item.productId] || 0;
        if (qtyToReceive <= 0) {
          if (item.pendingQuantity > 0) allItemsCompleted = false;
          return item;
        }

        const destLoc = locations.find((l) => l.id === item.destinationLocationId) || locations[0];
        const effectiveUnitCost = item.totalCost / (item.buyQuantity * (item.packageFactor || 1));
        const itemReceivedCost = effectiveUnitCost * qtyToReceive;
        totalReceivedValue += itemReceivedCost;

        // Atualizar estoque atômico
        const { updatedBalances, createdMovement } = StockEngine.applyMovement(currentBalances, {
          companyId: currentCompany.id,
          productId: item.productId,
          productCode: item.productCode,
          productDescription: item.description,
          locationId: destLoc.id,
          locationName: destLoc.name,
          type: 'entrada_compra',
          quantity: qtyToReceive,
          unitCost: effectiveUnitCost,
          totalCost: itemReceivedCost,
          originDocType: 'compra',
          originDocId: receivingOrder.number,
          date: nowIso,
          userId: currentUser.id,
          userName: currentUser.name,
          notes: `Recebimento de mercadoria referente ao pedido ${receivingOrder.number}`,
        });

        currentBalances = updatedBalances;
        movements.push(createdMovement);

        // Atualizar custo médio do produto no cadastro
        const state = Database.getState();
        state.products = state.products.map((p) => {
          if (p.id === item.productId) {
            // Custo ponderado simples
            const currentStock = StockEngine.getTotalProductStock(currentBalances, p.id).physical;
            const newCost = Number(effectiveUnitCost.toFixed(2));
            return {
              ...p,
              costPrice: newCost,
            };
          }
          return p;
        });

        const newReceivedQty = item.receivedQuantity + qtyToReceive;
        const newPendingQty = Math.max(0, item.pendingQuantity - qtyToReceive);
        if (newPendingQty > 0) allItemsCompleted = false;

        return {
          ...item,
          receivedQuantity: newReceivedQty,
          pendingQuantity: newPendingQty,
        };
      });

      // 2. Atualizar Status do Pedido de Compra
      const updatedStatus = allItemsCompleted ? 'concluido' : 'parcialmente_recebido';
      const updatedOrders = dbState.purchaseOrders.map((o) =>
        o.id === receivingOrder.id
          ? {
              ...o,
              status: updatedStatus as any,
              items: updatedItems,
            }
          : o
      );

      // 3. Integrar com Contas a Pagar se selecionado e ainda não gerado
      let updatedPayables = [...dbState.accountsPayable];
      if (generateFinancialTitles) {
        const installments = receivingOrder.installmentsCount || 1;
        const installmentValue = Number((totalReceivedValue / installments).toFixed(2));

        for (let i = 1; i <= installments; i++) {
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + i * 30);

          updatedPayables.push({
            id: 'PAG-' + Date.now() + '-' + i,
            companyId: currentCompany.id,
            purchaseOrderId: receivingOrder.id,
            purchaseOrderNumber: receivingOrder.number,
            supplierId: receivingOrder.supplierId,
            supplierName: receivingOrder.supplierName,
            description: `Compra Mercadorias ${receivingOrder.number} - ${receivingOrder.supplierName}`,
            category: 'fornecedores',
            docNumber: `${receivingOrder.number}/${i}`,
            installmentNumber: i,
            totalInstallments: installments,
            issueDate: nowIso.split('T')[0],
            dueDate: dueDate.toISOString().split('T')[0],
            originalValue: installmentValue,
            discount: 0,
            addition: 0,
            paidValue: 0,
            balance: installmentValue,
            status: 'aberto',
            payments: [],
            notes: `Gerado automaticamente na entrada física do pedido ${receivingOrder.number}`,
          });
        }
      }

      const state = Database.getState();
      state.stockBalances = currentBalances;
      state.stockMovements = [...movements, ...state.stockMovements];
      state.purchaseOrders = updatedOrders;
      state.accountsPayable = updatedPayables;
      Database.persist();

      Database.addAuditLog(
        'RECEBIMENTO_MERCADORIA',
        'COMPRAS',
        receivingOrder.id,
        `Mercadorias do pedido ${receivingOrder.number} recebidas por ${currentUser.name}. Estoque atualizado no local e títulos a pagar gerados.`
      );

      toast.success(
        `Recebimento do pedido ${receivingOrder.number} confirmado! Os produtos foram adicionados ao estoque nos seus respectivos locais e o custo dos itens foi atualizado.`,
        'Entrada de Mercadorias Confirmada'
      );
      setReceivingOrder(null);
    } catch (e) {
      toast.error('Erro no recebimento: ' + (e as Error).message, 'Erro de Recebimento');
    }
  };

  const filteredOrders = dbState.purchaseOrders.filter((o) => {
    if (o.companyId !== currentCompany.id) return false;
    return (
      searchTerm === '' ||
      o.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.supplierName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="space-y-4">
      {/* Topo */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <ShoppingBag className="text-indigo-600" size={20} />
            <span>Pedidos de Compra & Entrada de Mercadorias</span>
          </h2>
          <p className="text-xs text-slate-500">
            Conecte compras aos fornecedores, confira entregas físicas, atualize o custo médio e gere contas a pagar.
          </p>
        </div>

        <button
          onClick={() => {
            setIsNewOrderModalOpen(true);
            setOrderItems([]);
          }}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shadow-xs transition-colors"
        >
          <Plus size={15} />
          <span>Novo Pedido de Compra</span>
        </button>
      </div>

      {/* Lista de Pedidos de Compra */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden space-y-3 p-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Buscar por número do pedido ou fornecedor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
              <tr>
                <th className="p-3">Nº Pedido</th>
                <th className="p-3">Data</th>
                <th className="p-3">Fornecedor</th>
                <th className="p-3">Previsão Entrega</th>
                <th className="p-3 text-right">Itens</th>
                <th className="p-3 text-right">Valor Total</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-center">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    Nenhum pedido de compra cadastrado.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((pc) => (
                  <tr key={pc.id} className="hover:bg-slate-50/80">
                    <td className="p-3 font-mono font-bold text-indigo-700">{pc.number}</td>
                    <td className="p-3 text-slate-500">{new Date(pc.orderDate).toLocaleDateString('pt-BR')}</td>
                    <td className="p-3 font-semibold text-slate-800">{pc.supplierName}</td>
                    <td className="p-3 text-slate-600">
                      {pc.expectedDeliveryDate ? new Date(pc.expectedDeliveryDate).toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td className="p-3 text-right font-mono">{pc.items.length} itens</td>
                    <td className="p-3 text-right font-bold text-slate-900">{formatCurrency(pc.total)}</td>
                    <td className="p-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        pc.status === 'concluido'
                          ? 'bg-emerald-100 text-emerald-800'
                          : pc.status === 'parcialmente_recebido'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {pc.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      {pc.status !== 'concluido' ? (
                        <button
                          onClick={() => handleOpenReceiving(pc)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-md text-[11px] shadow-xs flex items-center gap-1 mx-auto"
                        >
                          <PackageCheck size={13} />
                          <span>Receber Mercadorias</span>
                        </button>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Mercadorias Entregues</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Novo Pedido de Compra */}
      {isNewOrderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <form
            onSubmit={handleSavePurchaseOrder}
            className="bg-white rounded-2xl max-w-3xl w-full border border-slate-200 shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
                <ShoppingBag size={18} className="text-indigo-600" />
                <span>Novo Pedido de Compra</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsNewOrderModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">Fornecedor *</label>
                <select
                  required
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-semibold"
                >
                  <option value="">Selecione o fornecedor...</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.contactName || s.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Previsão de Entrega</label>
                <input
                  type="date"
                  value={expectedDate}
                  onChange={(e) => setExpectedDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Condição de Pagamento</label>
                <input
                  type="text"
                  placeholder="Ex: 28/56 dias, 30 dias"
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Número de Parcelas</label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={installmentsCount}
                  onChange={(e) => setInstallmentsCount(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold"
                />
              </div>
            </div>

            {/* Adicionar Itens ao Pedido */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Adicionar Produto ao Pedido
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs">
                <div className="sm:col-span-5">
                  <label className="block font-semibold text-slate-600 mb-1">Produto *</label>
                  <select
                    value={itemProductId}
                    onChange={(e) => {
                      setItemProductId(e.target.value);
                      const p = dbState.products.find((prod) => prod.id === e.target.value);
                      if (p) {
                        setItemCost(String(p.costPrice));
                        setItemDestLocId(p.defaultLocationId || locations[0]?.id || '');
                      }
                    }}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 font-medium"
                  >
                    <option value="">Selecione o produto...</option>
                    {dbState.products
                      .filter((p) => p.status === 'ativo')
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.code} - {p.description} ({p.unit})
                        </option>
                      ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-600 mb-1">Qtd Compra *</label>
                  <input
                    type="number"
                    step="any"
                    min="1"
                    placeholder="Ex: 10"
                    value={itemBuyQty}
                    onChange={(e) => setItemBuyQty(e.target.value)}
                    className="w-full px-2 py-2 bg-white border border-slate-200 rounded-lg font-bold"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-600 mb-1">Fator Embalagem</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="1 un/cx"
                    value={itemPackageFactor}
                    onChange={(e) => setItemPackageFactor(e.target.value)}
                    className="w-full px-2 py-2 bg-white border border-slate-200 rounded-lg"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block font-semibold text-slate-600 mb-1">Custo Compra (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={itemCost}
                    onChange={(e) => setItemCost(e.target.value)}
                    className="w-full px-2 py-2 bg-white border border-slate-200 rounded-lg font-bold"
                  />
                </div>

                <div className="sm:col-span-4">
                  <label className="block font-semibold text-slate-600 mb-1">Local Destino Previsto</label>
                  <select
                    value={itemDestLocId}
                    onChange={(e) => setItemDestLocId(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2"
                  >
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-3">
                  <label className="block font-semibold text-slate-600 mb-1">Desconto (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={itemDiscount}
                    onChange={(e) => setItemDiscount(e.target.value)}
                    className="w-full px-2 py-2 bg-white border border-slate-200 rounded-lg"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block font-semibold text-slate-600 mb-1">Frete Rateado (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={itemFreight}
                    onChange={(e) => setItemFreight(e.target.value)}
                    className="w-full px-2 py-2 bg-white border border-slate-200 rounded-lg"
                  />
                </div>

                <div className="sm:col-span-2 flex items-end">
                  <button
                    type="button"
                    onClick={handleAddItemToOrder}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-lg"
                  >
                    + Adicionar
                  </button>
                </div>
              </div>
            </div>

            {/* Grade de Itens Adicionados */}
            <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-2.5">Código</th>
                    <th className="p-2.5">Descrição</th>
                    <th className="p-2.5 text-right">Qtd</th>
                    <th className="p-2.5 text-right">Custo Unit.</th>
                    <th className="p-2.5 text-right">Total Item</th>
                    <th className="p-2.5 text-center">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orderItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-4 text-center text-slate-400">
                        Nenhum item adicionado ao pedido de compra ainda.
                      </td>
                    </tr>
                  ) : (
                    orderItems.map((item, idx) => (
                      <tr key={idx}>
                        <td className="p-2.5 font-mono font-bold text-slate-600">{item.productCode}</td>
                        <td className="p-2.5 font-semibold text-slate-800">{item.description}</td>
                        <td className="p-2.5 text-right font-bold">
                          {formatQuantity(item.buyQuantity)} {item.buyUnit} ({formatQuantity(item.buyQuantity * (item.packageFactor || 1))} {item.saleUnit})
                        </td>
                        <td className="p-2.5 text-right text-slate-600">{formatCurrency(item.unitCost)}</td>
                        <td className="p-2.5 text-right font-bold text-indigo-700">{formatCurrency(item.totalCost)}</td>
                        <td className="p-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => setOrderItems(orderItems.filter((_, i) => i !== idx))}
                            className="text-rose-500 hover:text-rose-700"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Total */}
            <div className="flex justify-between items-center pt-2 border-t border-slate-100">
              <span className="text-xs text-slate-500 italic">
                * Importante: O estoque físico NÃO será alterado até o recebimento efetivo das mercadorias.
              </span>
              <div className="text-right">
                <span className="text-xs text-slate-500 block">Total do Pedido:</span>
                <span className="text-base font-extrabold text-slate-900">
                  {formatCurrency(orderItems.reduce((s, i) => s + i.totalCost, 0))}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsNewOrderModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={orderItems.length === 0}
                className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg shadow-xs"
              >
                Emitir Pedido de Compra
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Receber Mercadorias (Conferência Física e Entrada no Estoque) */}
      {receivingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
                  <PackageCheck size={18} className="text-emerald-600" />
                  <span>Receber Mercadorias: Pedido {receivingOrder.number}</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Fornecedor: <strong className="text-slate-700">{receivingOrder.supplierName}</strong>
                </p>
              </div>
              <button
                onClick={() => setReceivingOrder(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <span className="font-bold text-slate-700 uppercase block">
                Conferência de Quantidades Entregues
              </span>

              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden p-2">
                {receivingOrder.items.map((item) => {
                  const destLoc = locations.find((l) => l.id === item.destinationLocationId) || locations[0];
                  return (
                    <div key={item.productId} className="py-2.5 flex items-center justify-between gap-3">
                      <div className="flex-1">
                        <div className="font-bold text-slate-800">{item.description}</div>
                        <div className="text-[11px] text-slate-400">
                          Total Comprado: {formatQuantity(item.buyQuantity * (item.packageFactor || 1))} {item.saleUnit} • Já recebido: {formatQuantity(item.receivedQuantity)} • Pendente: {formatQuantity(item.pendingQuantity)}
                        </div>
                        <div className="text-[10px] text-indigo-600 font-semibold mt-0.5">
                          Destino: {destLoc.name}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 font-medium">Qtd Entregue Agora:</span>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          max={item.pendingQuantity}
                          value={receivedQuantities[item.productId] ?? item.pendingQuantity}
                          onChange={(e) =>
                            setReceivedQuantities({
                              ...receivedQuantities,
                              [item.productId]: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-24 px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-center font-bold text-slate-900"
                        />
                        <span className="font-semibold text-slate-600">{item.saleUnit}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Opção de Geração Financeira */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                <label className="flex items-center gap-2 font-bold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={generateFinancialTitles}
                    onChange={(e) => setGenerateFinancialTitles(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded-sm"
                  />
                  <span>Gerar Contas a Pagar automaticamente vinculado a esta compra ({receivingOrder.paymentTerms})</span>
                </label>
                <p className="text-[11px] text-slate-500 pl-6">
                  Cria o título financeiro no Contas a Pagar para pagamento ao fornecedor conforme parcelamento negociado.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setReceivingOrder(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleConfirmReceiving}
                className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs flex items-center gap-1.5"
              >
                <PackageCheck size={16} />
                <span>Confirmar Entrada Física e Atualizar Estoque</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
