import React, { useState, useEffect, useRef } from 'react';
import {
  ShoppingCart,
  CheckCircle2,
  FileText,
  Plus,
  Minus,
  Trash2,
  Search,
  User,
  UserPlus,
  Tag,
  Send,
  Warehouse,
  X,
  Package,
  Sparkles,
  ClipboardList,
  AlertCircle,
  Clock,
  Layers,
  ArrowRight,
  Barcode,
  Boxes
} from 'lucide-react';
import { Database } from '../../services/db';
import { Product, Customer, Order, OrderItem } from '../../types';
import { StockEngine } from '../../services/stockEngine';
import { formatCurrency, formatQuantity } from '../../services/pricingEngine';
import { ReceiptModal } from '../common/ReceiptModal';
import { SaleConfirmationModal } from '../common/SaleConfirmationModal';
import { toast } from '../../services/toast';

interface QuickOrderDeskProps {
  onOrderFinished?: (order: Order) => void;
  defaultDocType?: 'venda' | 'orcamento';
  onNavigateToHistory?: () => void;
}

export const QuickOrderDesk: React.FC<QuickOrderDeskProps> = ({
  onOrderFinished,
  defaultDocType = 'venda',
  onNavigateToHistory,
}) => {
  const [dbState, setDbState] = useState(Database.getState());
  const currentCompany = Database.getCurrentCompany();
  const currentUser = Database.getCurrentUser();

  useEffect(() => {
    return Database.subscribe(() => {
      setDbState({ ...Database.getState() });
    });
  }, []);

  // Tipo de Documento: 'venda' ou 'orcamento'
  const [docType, setDocType] = useState<'venda' | 'orcamento'>(defaultDocType);

  // Cliente Selecionado
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');

  // Carrinho de Itens
  const [cart, setCart] = useState<OrderItem[]>([]);

  // Pesquisa de Produtos
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showSearchResults, setShowSearchResults] = useState<boolean>(false);
  const [selectedLocationId, setSelectedLocationId] = useState<string>(() => {
    const locs = Database.getState().stockLocations.filter(
      (l) => l.companyId === Database.getCurrentCompany().id && l.status === 'ativo'
    );
    const comercialLoc = locs.find(
      (l) => l.name.toLowerCase() === 'comercial' || l.type === 'comercial' || l.id === 'loc-comercial'
    );
    return comercialLoc?.id || locs[0]?.id || 'loc-comercial';
  });

  // Forma de Pagamento & Parcelas
  const [paymentMethod, setPaymentMethod] = useState<Order['paymentMethod']>('pix');
  const [paymentTerm, setPaymentTerm] = useState<string>('a_vista');
  const [showSaleConfirmationModal, setShowSaleConfirmationModal] = useState<boolean>(false);
  const [selectedBoletoAccountId, setSelectedBoletoAccountId] = useState<string>(() => {
    const boletoMethod = Database.getPaymentMethods().find((m) => m.type === 'boleto');
    if (boletoMethod?.defaultAccountId) return boletoMethod.defaultAccountId;
    const boletoAccs = Database.getBoletoAccounts();
    return boletoAccs[0]?.id || '';
  });
  const [installments, setInstallments] = useState<number>(1);
  const [notes, setNotes] = useState<string>('');

  // Desconto Geral no Pedido (% ou R$)
  const [discountType, setDiscountType] = useState<'percent' | 'value'>(() => {
    return (localStorage.getItem('omni_discount_type') as 'percent' | 'value') || 'percent';
  });
  const [discountInput, setDiscountInput] = useState<string>('');

  const handleDiscountTypeChange = (newType: 'percent' | 'value') => {
    setDiscountType(newType);
    localStorage.setItem('omni_discount_type', newType);
  };

  // Modal de Cadastro Rápido de Cliente
  const [showQuickCustomerModal, setShowQuickCustomerModal] = useState<boolean>(false);
  const [newCustName, setNewCustName] = useState<string>('');
  const [newCustPhone, setNewCustPhone] = useState<string>('');
  const [newCustCpfCnpj, setNewCustCpfCnpj] = useState<string>('');
  const [newCustCity, setNewCustCity] = useState<string>('');

  // Modal de Desconto por Item
  const [showItemDiscountModal, setShowItemDiscountModal] = useState<boolean>(false);
  const [discountingItemId, setDiscountingItemId] = useState<string | null>(null);
  const [itemDiscountType, setItemDiscountType] = useState<'percent' | 'value'>('percent');
  const [itemDiscountInput, setItemDiscountInput] = useState<string>('');

  // Comprovante / Recibo
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState<boolean>(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Clientes e Locais
  const customers = dbState.customers.filter((c) => c.status === 'ativo');
  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  const locations = dbState.stockLocations.filter(
    (l) => l.companyId === currentCompany.id && l.status === 'ativo'
  );
  const selectedLocation = locations.find((l) => l.id === selectedLocationId) || locations[0];
  const selectedLocationName = selectedLocation?.name || 'Comercial';

  // Produtos filtrados de acordo com o Depósito de Saída selecionado
  const filteredProducts = dbState.products.filter((p) => {
    if (p.status !== 'ativo' || p.salePrice <= 0) return false;
    const stock = StockEngine.getBalance(dbState.stockBalances, p.id, selectedLocationId);
    if (stock.quantity <= 0) return false;
    if (!searchQuery.trim()) return false;
    const cleanQuery = searchQuery.toLowerCase().trim();
    return (
      p.description.toLowerCase().includes(cleanQuery) ||
      p.code.toLowerCase().includes(cleanQuery) ||
      (p.barcode && p.barcode.includes(cleanQuery))
    );
  });

  // Produtos em destaque / populares com saldo no depósito selecionado
  const popularProducts = dbState.products
    .filter((p) => {
      if (p.status !== 'ativo' || p.salePrice <= 0) return false;
      const stock = StockEngine.getBalance(dbState.stockBalances, p.id, selectedLocationId);
      return stock.quantity > 0;
    })
    .slice(0, 6);

  // ==========================================
  // MANIPULAÇÃO DO CARRINHO
  // ==========================================
  const handleAddToCart = (product: Product, quantityToAdd: number = 1) => {
    const stock = StockEngine.getBalance(dbState.stockBalances, product.id, selectedLocationId);
    const existing = cart.find((i) => i.productId === product.id);
    const currentCartQty = existing ? existing.quantity : 0;
    const nextTotalQty = currentCartQty + quantityToAdd;

    // Se for venda e saldo insuficiente, alerta amigável
    if (docType === 'venda' && stock.quantity < nextTotalQty) {
      const confirmAdd = window.confirm(
        `Atenção: Saldo insuficiente de "${product.description}" no local selecionado.\nSaldo disponível: ${stock.quantity} ${product.unit}.\nDeseja adicionar mesmo assim?`
      );
      if (!confirmAdd) return;
    }

    if (existing) {
      const newQty = existing.quantity + quantityToAdd;
      const unitPrice = existing.unitPrice;
      const itemDiscVal = existing.discountValue || 0;
      const totalPrice = Math.max(0, newQty * unitPrice - itemDiscVal);

      setCart(
        cart.map((i) =>
          i.productId === product.id
            ? {
                ...i,
                quantity: newQty,
                totalPrice,
              }
            : i
        )
      );
    } else {
      const newItem: OrderItem = {
        id: 'ITM-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
        productId: product.id,
        productCode: product.code,
        description: product.description,
        unit: product.unit,
        quantity: quantityToAdd,
        unitPrice: product.salePrice,
        discountPercent: 0,
        discountValue: 0,
        totalPrice: product.salePrice * quantityToAdd,
        unitCost: product.costPrice,
        locationId: selectedLocationId,
        isMasterPack: product.isMasterPack,
        masterPackUnits: product.masterPackUnits,
        masterPackAssociatedProductId: product.masterPackAssociatedProductId,
        masterPackAssociatedProductCode: product.masterPackAssociatedProductCode,
      };
      setCart([newItem, ...cart]);
    }

    setSearchQuery('');
    setShowSearchResults(false);
  };

  const handleUpdateQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.productId === productId) {
            const nextQty = i.quantity + delta;
            if (nextQty <= 0) return null;
            const itemDiscVal = i.discountValue || 0;
            return {
              ...i,
              quantity: nextQty,
              totalPrice: Math.max(0, nextQty * i.unitPrice - itemDiscVal),
            };
          }
          return i;
        })
        .filter(Boolean) as OrderItem[]
    );
  };

  const handleRemoveItem = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.productId !== productId));
  };

  // ==========================================
  // DESCONTO POR ITEM
  // ==========================================
  const handleOpenItemDiscount = (item: OrderItem) => {
    setDiscountingItemId(item.id);
    if (item.discountPercent && item.discountPercent > 0) {
      setItemDiscountType('percent');
      setItemDiscountInput(String(item.discountPercent));
    } else if (item.discountValue && item.discountValue > 0) {
      setItemDiscountType('value');
      setItemDiscountInput(item.discountValue.toFixed(2).replace('.', ','));
    } else {
      setItemDiscountType('percent');
      setItemDiscountInput('');
    }
    setShowItemDiscountModal(true);
  };

  const handleApplyItemDiscount = () => {
    if (!discountingItemId) return;
    const item = cart.find((i) => i.id === discountingItemId);
    if (!item) return;

    const baseGross = item.quantity * item.unitPrice;
    const cleanVal = parseFloat(itemDiscountInput.replace(',', '.')) || 0;
    const maxPercent = currentUser.permissions.maxDiscountPercent;

    let finalDiscVal = 0;
    let finalDiscPercent = 0;

    if (itemDiscountType === 'percent') {
      finalDiscPercent = Math.min(maxPercent, Math.max(0, cleanVal));
      finalDiscVal = (baseGross * finalDiscPercent) / 100;
    } else {
      const maxAllowedVal = (baseGross * maxPercent) / 100;
      finalDiscVal = Math.min(maxAllowedVal, Math.min(baseGross, Math.max(0, cleanVal)));
      finalDiscPercent = baseGross > 0 ? (finalDiscVal / baseGross) * 100 : 0;
    }

    setCart((prev) =>
      prev.map((i) => {
        if (i.id === discountingItemId) {
          return {
            ...i,
            discountPercent: finalDiscPercent,
            discountValue: finalDiscVal,
            totalPrice: Math.max(0, baseGross - finalDiscVal),
          };
        }
        return i;
      })
    );

    setShowItemDiscountModal(false);
    setDiscountingItemId(null);
  };

  // ==========================================
  // CÁLCULOS TOTAIS
  // ==========================================
  const grossSubtotal = cart.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const totalItemDiscounts = cart.reduce((s, i) => s + (i.discountValue || 0), 0);
  const subtotalAfterItemDiscounts = cart.reduce((s, i) => s + i.totalPrice, 0);

  const parsedOrderDiscountNum = Math.max(0, parseFloat(discountInput.replace(',', '.')) || 0);
  const maxAllowedPercent = currentUser.permissions.maxDiscountPercent;
  const maxAllowedVal = (subtotalAfterItemDiscounts * maxAllowedPercent) / 100;

  let globalOrderDiscount = 0;
  if (discountType === 'percent') {
    const safePercent = Math.min(maxAllowedPercent, parsedOrderDiscountNum);
    globalOrderDiscount = (subtotalAfterItemDiscounts * safePercent) / 100;
  } else {
    globalOrderDiscount = Math.min(maxAllowedVal, Math.min(subtotalAfterItemDiscounts, parsedOrderDiscountNum));
  }

  const effectiveGlobalDiscountPercent =
    subtotalAfterItemDiscounts > 0 ? (globalOrderDiscount / subtotalAfterItemDiscounts) * 100 : 0;

  const totalDiscountAll = totalItemDiscounts + globalOrderDiscount;
  const orderFinalTotal = Math.max(0, subtotalAfterItemDiscounts - globalOrderDiscount);

  // ==========================================
  // CADASTRO RÁPIDO DE CLIENTE
  // ==========================================
  const handleSaveQuickCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) {
      alert('Informe o nome do cliente.');
      return;
    }

    const newCode = 'CLI-' + String(dbState.customers.length + 1).padStart(3, '0');
    const newCustomer: Customer = {
      id: 'CLI-' + Date.now(),
      code: newCode,
      name: newCustName.trim(),
      tradeName: newCustName.trim(),
      cpfCnpj: newCustCpfCnpj.trim() || '000.000.000-00',
      type: newCustCpfCnpj.replace(/\D/g, '').length > 11 ? 'PJ' : 'PF',
      phone: newCustPhone.trim(),
      whatsapp: newCustPhone.trim(),
      email: '',
      city: newCustCity.trim() || 'Local',
      state: 'SP',
      creditLimit: 2000,
      status: 'ativo',
      createdAt: new Date().toISOString(),
    };

    const state = Database.getState();
    state.customers = [newCustomer, ...state.customers];
    Database.persist();

    setSelectedCustomerId(newCustomer.id);
    setShowQuickCustomerModal(false);
    setNewCustName('');
    setNewCustPhone('');
    setNewCustCpfCnpj('');
    setNewCustCity('');
  };

  // Pré-finalizar pedido (validação de forma e prazo de pagamento obrigatórios e abertura da tela de confirmação)
  const handlePreFinalizeOrder = () => {
    if (cart.length === 0) {
      alert('Adicione pelo menos 1 produto ao pedido.');
      return;
    }
    if (!paymentMethod) {
      alert('A Forma de Pagamento é obrigatória em todas as modalidades de venda.');
      return;
    }
    if (!paymentTerm || paymentTerm.trim() === '') {
      alert('O Prazo de Pagamento é obrigatório em todas as modalidades de venda.');
      return;
    }
    setShowSaleConfirmationModal(true);
  };

  // ==========================================
  // FINALIZAR PEDIDO DE VENDA OU ORÇAMENTO (após confirmação na tela)
  // ==========================================
  const handleFinalizeOrder = () => {
    setShowSaleConfirmationModal(false);

    if (cart.length === 0) {
      alert('Adicione pelo menos 1 produto ao pedido.');
      return;
    }
    if (!paymentMethod) {
      alert('A Forma de Pagamento é obrigatória em todas as modalidades de venda.');
      return;
    }
    if (!paymentTerm || paymentTerm.trim() === '') {
      alert('O Prazo de Pagamento é obrigatório em todas as modalidades de venda.');
      return;
    }

    const prefix = docType === 'orcamento' ? 'ORC' : 'PED';
    const now = new Date();
    const orderNumber = `${prefix}-${now.getFullYear()}-${String(dbState.orders.length + 1).padStart(5, '0')}`;
    const nowIso = now.toISOString();

    try {
      let currentBalances = [...dbState.stockBalances];
      const createdMovements = [];

      // Se for VENDA, realiza a baixa física de estoque
      if (docType === 'venda') {
        for (const item of cart) {
          const loc =
            dbState.stockLocations.find((l) => l.id === item.locationId) ||
            dbState.stockLocations.find((l) => l.id === selectedLocationId) ||
            dbState.stockLocations[0];

          const { updatedBalances, createdMovement } = StockEngine.applyMovement(currentBalances, {
            companyId: currentCompany.id,
            productId: item.productId,
            productCode: item.productCode,
            productDescription: item.description,
            locationId: loc.id,
            locationName: loc.name,
            type: 'saida_venda',
            quantity: item.quantity,
            unitCost: item.unitCost,
            totalCost: item.unitCost * item.quantity,
            originDocType: 'venda',
            originDocId: orderNumber,
            date: nowIso,
            userId: currentUser.id,
            userName: currentUser.name,
            notes: `Pedido de Venda Retaguarda/Início emitido por ${currentUser.name}`,
          });

          currentBalances = updatedBalances;
          createdMovements.push(createdMovement);
        }
      }

      const targetBoletoAccount = paymentMethod === 'boleto'
        ? Database.getBoletoAccounts(currentCompany.id).find((a) => a.id === selectedBoletoAccountId) || Database.getBoletoAccounts(currentCompany.id)[0]
        : undefined;

      const newOrder: Order = {
        id: 'ORD-' + Date.now(),
        number: orderNumber,
        type: docType,
        origin: 'retaguarda_pedido',
        companyId: currentCompany.id,
        customerId: selectedCustomerId || 'CLI-CONSUMIDOR',
        customerName: selectedCustomer ? selectedCustomer.name : 'Consumidor Final (Não Identificado)',
        customerPhone: selectedCustomer?.whatsapp || selectedCustomer?.phone,
        userId: currentUser.id,
        userName: currentUser.name,
        items: cart,
        subtotal: grossSubtotal,
        discountTotal: totalDiscountAll,
        total: orderFinalTotal,
        paymentMethod,
        bankAccountId: targetBoletoAccount?.id,
        bankAccountName: targetBoletoAccount?.name,
        installmentsCount: installments,
        receivedAmount: docType === 'venda' && (paymentMethod === 'pix' || paymentMethod === 'dinheiro') ? orderFinalTotal : 0,
        changeAmount: 0,
        status: docType === 'orcamento' ? 'aberto' : 'concluido',
        validityDate:
          docType === 'orcamento'
            ? new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]
            : undefined,
        notes: notes || `Pedido gerado via painel Início por ${currentUser.name}`,
        stockDeducted: docType === 'venda',
        financialGenerated: docType === 'venda',
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      // Se venda a prazo, gerar Contas a Receber
      let updatedReceivables = [...dbState.accountsReceivable];
      if (docType === 'venda' && (paymentMethod === 'boleto' || installments > 1)) {
        const valParcela = Number((orderFinalTotal / installments).toFixed(2));
        for (let i = 1; i <= installments; i++) {
          const due = new Date();
          due.setDate(due.getDate() + i * 30);
          updatedReceivables.push({
            id: 'REC-' + Date.now() + '-' + i,
            companyId: currentCompany.id,
            orderId: newOrder.id,
            orderNumber: newOrder.number,
            customerId: newOrder.customerId,
            customerName: newOrder.customerName,
            docNumber: `${orderNumber}/${i}`,
            installmentNumber: i,
            totalInstallments: installments,
            issueDate: nowIso.split('T')[0],
            dueDate: due.toISOString().split('T')[0],
            originalValue: valParcela,
            discount: 0,
            addition: 0,
            paidValue: 0,
            balance: valParcela,
            paymentMethod: paymentMethod === 'boleto' ? 'Boleto Bancário' : 'Cartão Crédito',
            bankAccountId: paymentMethod === 'boleto' ? targetBoletoAccount?.id : undefined,
            bankAccountName: paymentMethod === 'boleto' ? targetBoletoAccount?.name : undefined,
            bankCode: paymentMethod === 'boleto' ? targetBoletoAccount?.bankCode : undefined,
            status: 'aberto',
            receipts: [],
          });
        }
      }

      // Salva no banco de dados
      const state = Database.getState();
      state.stockBalances = currentBalances;
      state.stockMovements = [...createdMovements, ...state.stockMovements];
      state.orders = [newOrder, ...state.orders];
      state.accountsReceivable = updatedReceivables;
      Database.persist();

      Database.addAuditLog(
        'PEDIDO_VENDA_CRIADO',
        'PEDIDOS_RETAGUARDA',
        newOrder.id,
        `${docType === 'orcamento' ? 'Orçamento' : 'Pedido de Venda'} ${orderNumber} criado por ${currentUser.name} para ${newOrder.customerName}. Total: ${formatCurrency(orderFinalTotal)}`
      );

      toast.success(
        `${docType === 'orcamento' ? 'Orçamento' : 'Pedido de Venda'} ${orderNumber} gravado com sucesso!`,
        'Documento Emitido'
      );

      setCompletedOrder(newOrder);
      setShowReceiptModal(true);

      // Limpa formulário para próximo pedido
      setCart([]);
      setDiscountInput('');
      setNotes('');

      if (onOrderFinished) {
        onOrderFinished(newOrder);
      }
    } catch (err: any) {
      alert('Erro ao gravar pedido: ' + err.message);
    }
  };

  return (
    <div id="pedidos-venda-desk" className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-5 space-y-4">
      {/* Cabeçalho do Recurso: Título & Alternador Venda / Orçamento */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
            <ClipboardList size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight">
                Pedido de Venda & Orçamentos
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-blue-50 text-blue-700 border border-blue-200">
                Nova Emissão
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Realize pedidos de venda ou orçamentos comerciais diretamente aqui, sem abrir PDV Balcão nem Venda Externa.
            </p>
          </div>
        </div>

        {/* Alternância Venda vs Orçamento */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl self-start sm:self-auto border border-slate-200">
          <button
            type="button"
            onClick={() => setDocType('venda')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              docType === 'venda'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CheckCircle2 size={13} />
            <span>Venda</span>
          </button>
          <button
            type="button"
            onClick={() => setDocType('orcamento')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              docType === 'orcamento'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText size={13} />
            <span>Orçamento</span>
          </button>
        </div>
      </div>

      {/* Grid Superior: Identificação do Cliente & Local de Saída */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        {/* Seleção de Cliente (8 cols) */}
        <div className="md:col-span-8 space-y-1">
          <div className="flex justify-between items-center text-xs">
            <label className="font-bold text-slate-700 flex items-center gap-1">
              <User size={14} className="text-blue-600" />
              <span>Cliente do Pedido *</span>
            </label>
            <button
              type="button"
              onClick={() => setShowQuickCustomerModal(true)}
              className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <UserPlus size={12} />
              <span>+ Novo Cliente</span>
            </button>
          </div>

          <select
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(e.target.value)}
            className={`w-full rounded-xl px-3 py-2 text-xs font-bold transition-all truncate focus:outline-hidden ${
              selectedCustomer
                ? 'bg-emerald-50/90 border-2 border-emerald-500 text-emerald-950 ring-2 ring-emerald-400/30 shadow-2xs'
                : 'bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500'
            }`}
          >
            <option value="">Consumidor Final (Não Identificado)</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.phone ? `(${c.phone})` : ''} {c.cpfCnpj ? `• ${c.cpfCnpj}` : ''}
              </option>
            ))}
          </select>

          {selectedCustomer && (
            <div className="flex items-center justify-between text-xs text-emerald-900 bg-gradient-to-r from-emerald-50 via-teal-50/70 to-emerald-100/60 p-2.5 rounded-xl border-2 border-emerald-500 shadow-xs font-bold">
              <span className="truncate flex items-center gap-1.5">
                <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                <strong className="text-emerald-950">{selectedCustomer.name}</strong> • {selectedCustomer.phone || selectedCustomer.city || 'Sem telefone'}
              </span>
              <span className="font-extrabold shrink-0 ml-2 bg-white/95 text-emerald-800 px-2 py-0.5 rounded border border-emerald-300 text-[10px]">
                Limite: {formatCurrency(selectedCustomer.creditLimit)}
              </span>
            </div>
          )}
        </div>

        {/* Local de Estoque (4 cols) */}
        <div className="md:col-span-4 space-y-1">
          <label className="block text-xs font-bold text-slate-700">
            <span className="flex items-center gap-1">
              <Warehouse size={14} className="text-slate-400" />
              <span>Depósito de Saída</span>
            </span>
          </label>
          <select
            value={selectedLocationId}
            onChange={(e) => setSelectedLocationId(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-hidden focus:bg-white truncate"
          >
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name} {loc.id === 'loc-comercial' || loc.name.toLowerCase() === 'comercial' ? '(Padrão)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Seção de Busca e Adição Rápida de Produtos */}
      <div className="space-y-2">
        <label className="block text-xs font-bold text-slate-700">
          Adicionar Produtos ao Pedido:
        </label>
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Digite o nome, código de barras ou referência do produto..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSearchResults(true);
            }}
            onFocus={() => setShowSearchResults(true)}
            className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setShowSearchResults(false);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X size={14} />
            </button>
          )}

          {/* Dropdown de Resultados da Busca */}
          {showSearchResults && searchQuery.trim() && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-30 max-h-56 overflow-y-auto divide-y divide-slate-100">
              {filteredProducts.length === 0 ? (
                <div className="p-3 text-xs text-slate-400 text-center">
                  Nenhum produto encontrado para "{searchQuery}".
                </div>
              ) : (
                filteredProducts.map((p) => {
                  const stock = StockEngine.getBalance(dbState.stockBalances, p.id, selectedLocationId);
                  const isOutOfStock = stock.quantity <= 0;

                  return (
                    <div
                      key={p.id}
                      onClick={() => handleAddToCart(p, 1)}
                      className="p-2.5 hover:bg-blue-50 flex items-center justify-between gap-3 cursor-pointer transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.2 rounded">
                            {p.code}
                          </span>
                          <span className="text-xs font-bold text-slate-800 truncate">
                            {p.description}
                          </span>
                          {p.isMasterPack && (
                            <span className="inline-flex items-center gap-1 text-[9px] bg-amber-100 text-amber-900 font-extrabold px-1.5 py-0.2 rounded border border-amber-300">
                              <Boxes size={10} className="text-amber-700" />
                              Master ({p.masterPackUnits} un/{p.unit})
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                          <span>Preço: <strong className="text-slate-700">{formatCurrency(p.salePrice)}</strong></span>
                          <span>•</span>
                          <span className={isOutOfStock ? 'text-rose-600 font-semibold' : 'text-emerald-700 font-semibold'}>
                            Saldo ({selectedLocationName}): {formatQuantity(stock.quantity)} {p.unit}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddToCart(p, 1);
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-2xs shrink-0 cursor-pointer"
                      >
                        <Plus size={12} />
                        <span>Adicionar</span>
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Atalhos Rápidos de Produtos (quando a busca está limpa) */}
        {!searchQuery && popularProducts.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <span className="text-[11px] text-slate-400 font-bold shrink-0">Sugestões:</span>
            {popularProducts.map((prod) => (
              <button
                key={prod.id}
                type="button"
                onClick={() => handleAddToCart(prod, 1)}
                className="bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-slate-700 hover:text-blue-900 px-2 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
                title={`Adicionar ${prod.description}`}
              >
                <Plus size={11} className="text-blue-600" />
                <span className="truncate max-w-[140px]">{prod.description}</span>
                <span className="font-bold font-mono text-slate-900">{formatCurrency(prod.salePrice)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Grade / Lista de Itens do Pedido */}
      <div className="space-y-2 border border-slate-200 rounded-xl p-3 bg-slate-50/50">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-700 flex items-center gap-1.5 uppercase text-[11px] tracking-wider">
            <ShoppingCart size={14} className="text-blue-600" />
            <span>Itens do Pedido ({cart.reduce((s, i) => s + i.quantity, 0)} itens)</span>
          </span>
          {cart.length > 0 && (
            <button
              type="button"
              onClick={() => setCart([])}
              className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer"
            >
              Limpar Pedido
            </button>
          )}
        </div>

        {cart.length === 0 ? (
          <div className="py-6 text-center text-slate-400 space-y-1 bg-white rounded-xl border border-dashed border-slate-200">
            <Package size={28} className="mx-auto text-slate-300" />
            <p className="text-xs font-bold text-slate-600">Nenhum produto adicionado ao pedido</p>
            <p className="text-[11px] text-slate-400">
              Utilize o campo de busca acima ou clique nas sugestões para adicionar os produtos.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 max-h-52 overflow-y-auto bg-white rounded-xl border border-slate-200 px-2">
            {cart.map((item) => (
              <div key={item.id} className="py-2 flex items-center justify-between gap-2 text-xs">
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-slate-900 truncate flex items-center gap-1.5 flex-wrap">
                    <span>{item.description}</span>
                    {item.isMasterPack && (
                      <span className="inline-flex items-center gap-1 text-[9px] bg-amber-100 text-amber-900 font-extrabold px-1.5 py-0.2 rounded border border-amber-300">
                        <Boxes size={10} className="text-amber-700" />
                        Master ({item.masterPackUnits} un/{item.unit})
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-2">
                    <span>
                      {formatCurrency(item.unitPrice)} x {item.quantity} {item.unit}
                    </span>
                    {item.discountValue > 0 && (
                      <span className="text-amber-700 font-bold">
                        (-{formatCurrency(item.discountValue)})
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Controle de Quantidade */}
                  <div className="flex items-center bg-slate-100 border border-slate-200 rounded-lg">
                    <button
                      type="button"
                      onClick={() => handleUpdateQty(item.productId, -1)}
                      className="w-6 h-6 flex items-center justify-center text-slate-600 hover:bg-slate-200 rounded-l cursor-pointer"
                    >
                      <Minus size={11} />
                    </button>
                    <span className="w-6 text-center font-bold text-slate-900 font-mono text-xs">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleUpdateQty(item.productId, 1)}
                      className="w-6 h-6 flex items-center justify-center text-slate-600 hover:bg-slate-200 rounded-r cursor-pointer"
                    >
                      <Plus size={11} />
                    </button>
                  </div>

                  {/* Desconto por Item */}
                  <button
                    type="button"
                    onClick={() => handleOpenItemDiscount(item)}
                    className={`p-1 rounded cursor-pointer transition-colors ${
                      item.discountValue > 0
                        ? 'bg-amber-100 text-amber-800 ring-1 ring-amber-300'
                        : 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                    }`}
                    title="Desconto neste item"
                  >
                    <Tag size={13} />
                  </button>

                  {/* Preço Total do Item */}
                  <span className="font-mono font-bold text-slate-900 min-w-[70px] text-right">
                    {formatCurrency(item.totalPrice)}
                  </span>

                  {/* Remover Item */}
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(item.productId)}
                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                    title="Remover"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Condições Comerciais: Forma de Pagamento, Parcelas, Desconto Geral */}
      <div className="pt-2 border-t border-slate-100 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
          {/* Forma de Pagamento */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-slate-700 font-bold">Forma de Pagto: *</label>
              <span className="text-[9px] font-black text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                OBRIGATÓRIO
              </span>
            </div>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-medium text-slate-800 focus:outline-hidden"
            >
              <option value="pix">Pix</option>
              <option value="dinheiro">Dinheiro</option>
              <option value="cartao_credito">Cartão de Crédito</option>
              <option value="boleto">Boleto Bancário</option>
            </select>
          </div>

          {/* Prazo de Pagamento */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-slate-700 font-bold">Prazo de Pagto: *</label>
              <span className="text-[9px] font-black text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                OBRIGATÓRIO
              </span>
            </div>
            <select
              value={paymentTerm}
              onChange={(e) => setPaymentTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-medium text-slate-800 focus:outline-hidden"
            >
              <option value="a_vista">À Vista / Imediato</option>
              <option value="15_dias">15 Dias Direto</option>
              <option value="30_dias">30 Dias Faturado</option>
              <option value="30_60_dias">30 / 60 Dias</option>
              <option value="30_60_90_dias">30 / 60 / 90 Dias</option>
              <option value="parcelado">Parcelado</option>
              <option value="personalizado">Personalizado</option>
            </select>
          </div>

          {/* Se Boleto: Conta / Banco Emissor */}
          {paymentMethod === 'boleto' && (
            <div>
              <label className="block text-amber-900 font-bold mb-1 flex items-center gap-1">
                <Barcode size={12} className="text-amber-700" />
                Conta / Banco do Boleto:
              </label>
              <select
                value={selectedBoletoAccountId}
                onChange={(e) => setSelectedBoletoAccountId(e.target.value)}
                className="w-full bg-white border border-amber-300 rounded-xl p-2 font-bold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-amber-500 shadow-2xs"
              >
                {Database.getBoletoAccounts(currentCompany.id).map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} {acc.bankCode ? `(${acc.bankCode})` : ''} - Ag: {acc.agency || '-'} C/C: {acc.accountNumber || '-'}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Se Cartão ou Boleto: Parcelas */}
          {paymentMethod === 'cartao_credito' || paymentMethod === 'boleto' ? (
            <div>
              <label className="block text-slate-600 font-semibold mb-1">
                {paymentMethod === 'boleto' ? 'Parcelas Boleto:' : 'Parcelas:'}
              </label>
              <select
                value={installments}
                onChange={(e) => setInstallments(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-medium text-slate-800"
              >
                {[1, 2, 3, 4, 5, 6, 10, 12].map((n) => (
                  <option key={n} value={n}>
                    {n}x de {formatCurrency(orderFinalTotal / n)}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Observações da Entrega:</label>
              <input
                type="text"
                placeholder="Ex: Entregar à tarde, nota na caixa..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs"
              />
            </div>
          )}

          {/* Desconto Geral no Total */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-slate-600 font-semibold text-xs">Desconto Geral:</label>
              <div className="inline-flex rounded-md bg-slate-200/80 p-0.5 border border-slate-300">
                <button
                  type="button"
                  onClick={() => handleDiscountTypeChange('percent')}
                  className={`px-2 py-0.5 text-xs font-bold rounded cursor-pointer transition-all ${
                    discountType === 'percent'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Percentual (%)"
                >
                  %
                </button>
                <button
                  type="button"
                  onClick={() => handleDiscountTypeChange('value')}
                  className={`px-2 py-0.5 text-xs font-bold rounded cursor-pointer transition-all ${
                    discountType === 'value'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Valor em Reais (R$)"
                >
                  R$
                </button>
              </div>
            </div>

            <div className="relative flex items-center">
              {discountType === 'value' && (
                <span className="absolute left-2.5 text-xs font-bold text-slate-500">R$</span>
              )}
              <input
                type="text"
                inputMode="decimal"
                value={discountInput}
                onChange={(e) => setDiscountInput(e.target.value.replace(/[^0-9.,]/g, ''))}
                placeholder={
                  discountType === 'percent'
                    ? `Ex: 5 (Máx ${currentUser.permissions.maxDiscountPercent}%)`
                    : `Ex: 10,00 (Máx ${formatCurrency(maxAllowedVal)})`
                }
                className={`w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-medium text-right text-xs focus:outline-hidden focus:bg-white focus:ring-1 focus:ring-emerald-500 ${
                  discountType === 'value' ? 'pl-8' : ''
                }`}
              />
            </div>
            {globalOrderDiscount > 0 && (
              <div className="text-[10px] text-emerald-600 font-semibold mt-0.5 text-right">
                {discountType === 'percent'
                  ? `Equivalente a -${formatCurrency(globalOrderDiscount)}`
                  : `Equivalente a ${effectiveGlobalDiscountPercent.toFixed(1).replace('.0', '')}%`}
              </div>
            )}
          </div>
        </div>

        {paymentMethod === 'cartao_credito' && (
          <div>
            <label className="block text-slate-600 font-semibold text-xs mb-1">Observações da Entrega:</label>
            <input
              type="text"
              placeholder="Ex: Entregar à tarde, nota na caixa..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs"
            />
          </div>
        )}
      </div>

      {/* Resumo Financeiro & Botão de Confirmação */}
      <div className="bg-slate-900 text-white p-3.5 sm:p-4 rounded-xl space-y-2">
        <div className="flex justify-between text-xs text-slate-300">
          <span>Subtotal dos Produtos:</span>
          <span className="font-mono">{formatCurrency(grossSubtotal)}</span>
        </div>

        {totalDiscountAll > 0 && (
          <div className="flex justify-between text-xs text-rose-300">
            <span>Descontos Concedidos:</span>
            <span className="font-mono">-{formatCurrency(totalDiscountAll)}</span>
          </div>
        )}

        <div className="flex items-center justify-between text-base sm:text-lg font-extrabold pt-2 border-t border-slate-800">
          <span className="uppercase text-xs sm:text-sm tracking-wider text-slate-300">
            Total do Pedido:
          </span>
          <span className="text-emerald-400 font-mono text-xl sm:text-2xl">
            {formatCurrency(orderFinalTotal)}
          </span>
        </div>
      </div>

      {/* Botão de Ação Principal */}
      <button
        type="button"
        disabled={cart.length === 0}
        onClick={handlePreFinalizeOrder}
        className={`w-full py-3.5 rounded-xl font-black text-sm text-white shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer ${
          cart.length === 0
            ? 'bg-slate-300 opacity-60 cursor-not-allowed'
            : docType === 'orcamento'
            ? 'bg-blue-600 hover:bg-blue-700 active:scale-[0.99]'
            : 'bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99]'
        }`}
      >
        <Send size={18} />
        <span>
          {docType === 'orcamento'
            ? 'GERAR E COMPARTILHAR ORÇAMENTO'
            : 'CONFIRMAR PEDIDO DE VENDA'}
        </span>
      </button>

      {/* Modal de Cadastro Rápido de Cliente */}
      {showQuickCustomerModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <UserPlus size={16} className="text-emerald-600" />
                <span>Cadastro Rápido de Cliente</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowQuickCustomerModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveQuickCustomer} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: João da Silva Santos"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">WhatsApp / Telefone</label>
                  <input
                    type="text"
                    placeholder="(11) 99999-9999"
                    value={newCustPhone}
                    onChange={(e) => setNewCustPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">CPF / CNPJ</label>
                  <input
                    type="text"
                    placeholder="000.000.000-00"
                    value={newCustCpfCnpj}
                    onChange={(e) => setNewCustCpfCnpj(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Cidade / UF</label>
                <input
                  type="text"
                  placeholder="Ex: São Paulo / SP"
                  value={newCustCity}
                  onChange={(e) => setNewCustCity(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowQuickCustomerModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 font-bold hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs"
                >
                  Salvar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Desconto por Item */}
      {showItemDiscountModal && discountingItemId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-4 space-y-3 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                <Tag size={16} className="text-amber-600" />
                <span>Desconto no Produto</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowItemDiscountModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between bg-slate-50 p-2 rounded-xl">
                <span className="font-bold text-slate-600">Tipo de Desconto:</span>
                <div className="inline-flex rounded-lg bg-slate-200 p-0.5">
                  <button
                    type="button"
                    onClick={() => setItemDiscountType('percent')}
                    className={`px-3 py-1 font-bold rounded-md ${
                      itemDiscountType === 'percent' ? 'bg-amber-600 text-white' : 'text-slate-700'
                    }`}
                  >
                    %
                  </button>
                  <button
                    type="button"
                    onClick={() => setItemDiscountType('value')}
                    className={`px-3 py-1 font-bold rounded-md ${
                      itemDiscountType === 'value' ? 'bg-amber-600 text-white' : 'text-slate-700'
                    }`}
                  >
                    R$
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Valor do Desconto</label>
                <input
                  type="text"
                  placeholder={itemDiscountType === 'percent' ? 'Ex: 10' : 'Ex: 15,00'}
                  value={itemDiscountInput}
                  onChange={(e) => setItemDiscountInput(e.target.value.replace(/[^0-9.,]/g, ''))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-right font-mono font-bold"
                  autoFocus
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowItemDiscountModal(false)}
                  className="px-3 py-1.5 border border-slate-200 rounded-xl text-slate-600 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleApplyItemDiscount}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold shadow-xs"
                >
                  Aplicar Desconto
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: TELA DE CONFIRMAÇÃO DA VENDA (NOME DO CLIENTE, TOTAL, FORMA E PRAZO DE PAGTO) */}
      <SaleConfirmationModal
        isOpen={showSaleConfirmationModal}
        onClose={() => setShowSaleConfirmationModal(false)}
        onConfirm={handleFinalizeOrder}
        modality="Pedido de Venda"
        customerName={selectedCustomer ? selectedCustomer.name : 'Consumidor Final (Não Identificado)'}
        customerDocument={selectedCustomer?.cpfCnpj}
        customerPhone={selectedCustomer?.whatsapp || selectedCustomer?.phone}
        totalAmount={orderFinalTotal}
        paymentMethod={paymentMethod || 'pix'}
        paymentTerm={paymentTerm || 'a_vista'}
        installments={installments}
        itemsCount={cart.reduce((s, i) => s + i.quantity, 0)}
      />

      {/* Modal de Comprovante / Recibo do Pedido */}
      {showReceiptModal && completedOrder && (
        <ReceiptModal
          order={completedOrder}
          company={currentCompany}
          isOpen={showReceiptModal}
          onClose={() => {
            setShowReceiptModal(false);
            setCompletedOrder(null);
          }}
        />
      )}
    </div>
  );
};
