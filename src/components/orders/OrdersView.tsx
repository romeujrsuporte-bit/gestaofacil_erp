import React, { useState, useEffect, useRef } from 'react';
import {
  ClipboardList,
  Search,
  Filter,
  Plus,
  Printer,
  Share2,
  ArrowRightCircle,
  XCircle,
  CheckCircle,
  CheckCircle2,
  Eye,
  FileSpreadsheet,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Pencil,
  ShoppingBag,
  ShoppingCart,
  Minus,
  Trash2,
  UserPlus,
  Tag,
  Barcode,
  DollarSign,
  CreditCard,
  QrCode,
  Warehouse,
  Package,
  Send,
  X,
  FileText,
  Check,
  ChevronRight,
  User,
  Clock,
  Truck,
  Calendar,
  Building2,
  Layers,
  ShieldCheck,
  Percent,
  ChevronDown,
  Info,
  Boxes,
  UserCheck,
  Hash,
  Receipt
} from 'lucide-react';
import { Database } from '../../services/db';
import { Order, OrderType, OrderOrigin, OrderStatus, Product, Customer, OrderItem } from '../../types';
import { StockEngine } from '../../services/stockEngine';
import { formatCurrency, formatQuantity } from '../../services/pricingEngine';
import { ReceiptModal } from '../common/ReceiptModal';
import { EditOrderModal } from './EditOrderModal';
import { toast } from '../../services/toast';

interface OrdersViewProps {
  initialMode?: 'novo_pedido' | 'historico';
  initialDocType?: 'venda' | 'orcamento';
}

export const OrdersView: React.FC<OrdersViewProps> = ({
  initialMode = 'novo_pedido',
  initialDocType = 'venda',
}) => {
  const [dbState, setDbState] = useState(Database.getState());
  const currentCompany = Database.getCurrentCompany();
  const currentUser = Database.getCurrentUser();

  useEffect(() => {
    return Database.subscribe(() => {
      setDbState({ ...Database.getState() });
    });
  }, []);

  // Aba ativa: 'novo_pedido' (padrão) | 'historico'
  const [activeTab, setActiveTab] = useState<'novo_pedido' | 'historico'>(initialMode);

  // Tipo de documento na emissão: 'venda' | 'orcamento'
  const [docType, setDocType] = useState<'venda' | 'orcamento'>(initialDocType);

  // ==========================================
  // ESTADO DA EMISSÃO DE NOVO PEDIDO / ORÇAMENTO
  // ==========================================
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [productSearch, setProductSearch] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [selectedLocationId, setSelectedLocationId] = useState<string>(() => {
    const locs = Database.getState().stockLocations.filter(
      (l) => l.companyId === Database.getCurrentCompany().id && l.status === 'ativo'
    );
    const comercialLoc = locs.find(
      (l) => l.name.toLowerCase() === 'comercial' || l.type === 'comercial' || l.id === 'loc-comercial'
    );
    return comercialLoc?.id || locs[0]?.id || 'loc-comercial';
  });
  const [filterByLocationStock, setFilterByLocationStock] = useState<boolean>(true);

  // Quantidade temporária por produto no catálogo
  const [qtyToAddMap, setQtyToAddMap] = useState<Record<string, number>>({});

  // Desconto global no pedido
  const [discountType, setDiscountType] = useState<'percent' | 'value'>(() => {
    return (localStorage.getItem('omni_discount_type') as 'percent' | 'value') || 'percent';
  });
  const [discountInput, setDiscountInput] = useState<string>('');

  const handleDiscountTypeChange = (newType: 'percent' | 'value') => {
    setDiscountType(newType);
    localStorage.setItem('omni_discount_type', newType);
  };

  // Forma de Pagamento e Parcelas
  const [paymentMethod, setPaymentMethod] = useState<Order['paymentMethod']>('pix');
  const [selectedBoletoAccountId, setSelectedBoletoAccountId] = useState<string>(() => {
    const boletoMethod = Database.getPaymentMethods().find((m) => m.type === 'boleto');
    if (boletoMethod?.defaultAccountId) return boletoMethod.defaultAccountId;
    const boletoAccs = Database.getBoletoAccounts();
    return boletoAccs[0]?.id || '';
  });
  const [installments, setInstallments] = useState<number>(1);
  const [notes, setNotes] = useState<string>('');

  // Modal de Cadastro Rápido de Cliente
  const [showQuickCustomerModal, setShowQuickCustomerModal] = useState<boolean>(false);
  const [quickCustName, setQuickCustName] = useState('');
  const [quickCustPhone, setQuickCustPhone] = useState('');
  const [quickCustCpfCnpj, setQuickCustCpfCnpj] = useState('');
  const [quickCustCreditLimit, setQuickCustCreditLimit] = useState('1000');

  // Modal de Ajuste (Desconto ou Acréscimo) por Item
  const [showItemDiscountModal, setShowItemDiscountModal] = useState<boolean>(false);
  const [discountingItemId, setDiscountingItemId] = useState<string | null>(null);
  const [itemAdjustmentMode, setItemAdjustmentMode] = useState<'desconto' | 'acrescimo'>('desconto');
  const [itemDiscountType, setItemDiscountType] = useState<'percent' | 'value'>('percent');
  const [itemDiscountInput, setItemDiscountInput] = useState<string>('');

  // ==========================================
  // CONFIGURAÇÕES DO NOVO LAYOUT EXECUTIVO
  // ==========================================
  // Modo de inclusão de itens: 'insercao_rapida' (Padrão ERP) | 'catalogo_grade'
  const [itemsEntryMode, setItemsEntryMode] = useState<'insercao_rapida' | 'catalogo_grade'>('insercao_rapida');

  // Estado da barra rápida inteligente de inserção de itens
  const [fastSelectedProductId, setFastSelectedProductId] = useState<string>('');
  const [fastProductSearchTerm, setFastProductSearchTerm] = useState<string>('');
  const [fastItemQty, setFastItemQty] = useState<number>(1);
  const [fastItemAdjustmentMode, setFastItemAdjustmentMode] = useState<'desconto' | 'acrescimo'>('desconto');
  const [fastItemAdjustmentInput, setFastItemAdjustmentInput] = useState<string>('');
  const [fastItemAdjustmentType, setFastItemAdjustmentType] = useState<'percent' | 'value'>('percent');

  // Expedição, Logística & Condições Comerciais do Pedido
  const [freightType, setFreightType] = useState<'retirada' | 'entrega_propria' | 'cif' | 'fob' | 'sem_frete'>('retirada');
  const [deliveryForecast, setDeliveryForecast] = useState<string>('Imediato');
  const [paymentTerms, setPaymentTerms] = useState<string>('a_vista');
  const [internalNotes, setInternalNotes] = useState<string>('');
  const [showNotesModal, setShowNotesModal] = useState<boolean>(false);

  // ==========================================
  // ESTADO DO HISTÓRICO DE PEDIDOS
  // ==========================================
  const [filterType, setFilterType] = useState<string>('todos');
  const [filterOrigin, setFilterOrigin] = useState<string>('todos');
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [filterSeller, setFilterSeller] = useState<string>('todos');
  const [searchCustomer, setSearchCustomer] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [viewDetailsOrder, setViewDetailsOrder] = useState<Order | null>(null);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);

  // Clientes e Locais
  const customers = dbState.customers.filter((c) => c.status === 'ativo');
  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  const locations = dbState.stockLocations.filter(
    (l) => l.companyId === currentCompany.id && l.status === 'ativo'
  );
  const selectedLocation = locations.find((l) => l.id === selectedLocationId) || locations[0];
  const selectedLocationName = selectedLocation?.name || 'Comercial';

  // Categorias de produtos
  const categories = ['todos', ...Array.from(new Set(dbState.products.map((p) => p.family).filter(Boolean)))];

  // Produtos filtrados de acordo com o Depósito de Saída selecionado (Catálogo)
  const filteredProducts = dbState.products.filter((p) => {
    if (p.status !== 'ativo' || p.salePrice <= 0) return false;
    if (filterByLocationStock) {
      const stock = StockEngine.getBalance(dbState.stockBalances, p.id, selectedLocationId);
      if (stock.quantity <= 0) return false;
    }
    const matchesSearch =
      productSearch === '' ||
      p.description.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.code.toLowerCase().includes(productSearch.toLowerCase()) ||
      (p.barcode && p.barcode.includes(productSearch));
    const matchesCategory = selectedCategory === 'todos' || p.family === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Produtos disponíveis no Depósito de Saída selecionado (Barra Rápida de Inserção)
  const fastEntryProducts = dbState.products.filter((p) => {
    if (p.status !== 'ativo' || p.salePrice <= 0) return false;
    if (filterByLocationStock) {
      const stock = StockEngine.getBalance(dbState.stockBalances, p.id, selectedLocationId);
      return stock.quantity > 0;
    }
    return true;
  });

  // Lista de pedidos da empresa com filtros aplicados (Aba Histórico)
  const filteredOrders = dbState.orders.filter((order) => {
    if (order.companyId !== currentCompany.id) return false;
    if (filterType !== 'todos' && order.type !== filterType) return false;
    if (filterOrigin !== 'todos' && order.origin !== filterOrigin) return false;
    if (filterStatus !== 'todos' && order.status !== filterStatus) return false;
    if (filterSeller !== 'todos' && order.userId !== filterSeller) return false;
    if (searchCustomer && !order.customerName.toLowerCase().includes(searchCustomer.toLowerCase())) return false;
    if (startDate && order.createdAt.split('T')[0] < startDate) return false;
    if (endDate && order.createdAt.split('T')[0] > endDate) return false;
    return true;
  });

  // ==========================================
  // CÁLCULOS DO CARRINHO DE NOVO PEDIDO
  // ==========================================
  const grossSubtotal = cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const totalItemDiscounts = cart.reduce((sum, item) => sum + (item.discountValue || 0), 0);
  const totalItemAdditions = cart.reduce((sum, item) => sum + (item.additionValue || 0), 0);
  const subtotalAfterItemDiscounts = cart.reduce((sum, item) => sum + item.totalPrice, 0);

  const parsedOrderDiscountNum = Math.max(0, parseFloat(discountInput.replace(',', '.')) || 0);
  const maxAllowedDiscountPercent = currentUser.permissions.maxDiscountPercent;
  const maxAllowedDiscountVal = (subtotalAfterItemDiscounts * maxAllowedDiscountPercent) / 100;

  let orderDiscountVal = 0;
  if (discountType === 'percent') {
    const safePercent = Math.min(maxAllowedDiscountPercent, parsedOrderDiscountNum);
    orderDiscountVal = (subtotalAfterItemDiscounts * safePercent) / 100;
  } else {
    orderDiscountVal = Math.min(subtotalAfterItemDiscounts, parsedOrderDiscountNum);
  }
  const effectiveDiscountPercent =
    subtotalAfterItemDiscounts > 0 ? (orderDiscountVal / subtotalAfterItemDiscounts) * 100 : 0;
  const orderTotal = Math.max(0, subtotalAfterItemDiscounts - orderDiscountVal);
  const combinedDiscounts = totalItemDiscounts + orderDiscountVal;

  // Adicionar produto ao carrinho
  const handleAddToCart = (product: Product, forcedQty?: number) => {
    const qty = forcedQty || qtyToAddMap[product.id] || 1;
    if (qty <= 0) return;

    const stock = StockEngine.getBalance(dbState.stockBalances, product.id, selectedLocationId);
    const existing = cart.find((i) => i.productId === product.id);
    const currentQty = existing ? existing.quantity : 0;
    const requestedTotal = currentQty + qty;

    if (docType === 'venda' && stock.quantity < requestedTotal) {
      const proceed = window.confirm(
        `Atenção: O saldo de "${product.description}" no local é de ${formatQuantity(stock.quantity)} ${product.unit}. Deseja adicionar mesmo assim?`
      );
      if (!proceed) return;
    }

    if (existing) {
      const newQty = existing.quantity + qty;
      const newGross = newQty * existing.unitPrice;
      const newDiscVal = (newGross * (existing.discountPercent || 0)) / 100;
      setCart((prev) =>
        prev.map((i) =>
          i.productId === product.id
            ? {
                ...i,
                quantity: newQty,
                discountValue: Math.round(newDiscVal * 100) / 100,
                totalPrice: Math.round((newGross - newDiscVal) * 100) / 100,
              }
            : i
        )
      );
    } else {
      const newItem: OrderItem = {
        id: 'ITEM-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
        productId: product.id,
        productCode: product.code,
        description: product.description,
        unit: product.unit,
        quantity: qty,
        unitPrice: product.salePrice,
        discountPercent: 0,
        discountValue: 0,
        totalPrice: qty * product.salePrice,
        unitCost: product.costPrice,
        locationId: selectedLocationId,
        isMasterPack: product.isMasterPack,
        masterPackUnits: product.masterPackUnits,
        masterPackAssociatedProductId: product.masterPackAssociatedProductId,
        masterPackAssociatedProductCode: product.masterPackAssociatedProductCode,
      };
      setCart((prev) => [...prev, newItem]);
    }

    // Reset qty selector map for this product
    setQtyToAddMap((prev) => ({ ...prev, [product.id]: 1 }));
  };

  // Inclusão rápida de item pela barra inteligente
  const handleAddFastItem = () => {
    if (!fastSelectedProductId) {
      alert('Selecione um produto para incluir no pedido.');
      return;
    }
    const product = dbState.products.find((p) => p.id === fastSelectedProductId);
    if (!product) return;

    const qty = Math.max(1, fastItemQty);
    const stock = StockEngine.getBalance(dbState.stockBalances, product.id, selectedLocationId);
    const existing = cart.find((i) => i.productId === product.id);
    const currentQty = existing ? existing.quantity : 0;
    const requestedTotal = currentQty + qty;

    if (docType === 'venda' && stock.quantity < requestedTotal) {
      const proceed = window.confirm(
        `Atenção: O saldo de "${product.description}" no local selecionado é de ${formatQuantity(stock.quantity)} ${product.unit}.\nDeseja adicionar mesmo assim?`
      );
      if (!proceed) return;
    }

    const rawVal = parseFloat(fastItemAdjustmentInput.replace(',', '.')) || 0;
    const grossItem = qty * product.salePrice;
    let itemDiscVal = 0;
    let itemDiscPercent = 0;
    let itemAddVal = 0;
    let itemAddPercent = 0;

    if (rawVal > 0) {
      if (fastItemAdjustmentMode === 'desconto') {
        const maxPercent = currentUser.permissions.maxDiscountPercent;
        if (fastItemAdjustmentType === 'percent') {
          itemDiscPercent = Math.min(maxPercent, rawVal);
          itemDiscVal = (grossItem * itemDiscPercent) / 100;
        } else {
          const maxVal = (grossItem * maxPercent) / 100;
          itemDiscVal = Math.min(maxVal, rawVal);
          itemDiscPercent = grossItem > 0 ? (itemDiscVal / grossItem) * 100 : 0;
        }
      } else {
        // Acréscimo no produto
        if (fastItemAdjustmentType === 'percent') {
          itemAddPercent = rawVal;
          itemAddVal = (grossItem * itemAddPercent) / 100;
        } else {
          itemAddVal = rawVal;
          itemAddPercent = grossItem > 0 ? (itemAddVal / grossItem) * 100 : 0;
        }
      }
    }

    const netTotal = Math.max(0, grossItem + itemAddVal - itemDiscVal);

    if (existing) {
      const newQty = existing.quantity + qty;
      const newGross = newQty * existing.unitPrice;
      const combinedDiscVal = (existing.discountValue || 0) + itemDiscVal;
      const combinedDiscPercent = newGross > 0 ? (combinedDiscVal / newGross) * 100 : 0;
      const combinedAddVal = (existing.additionValue || 0) + itemAddVal;
      const combinedAddPercent = newGross > 0 ? (combinedAddVal / newGross) * 100 : 0;
      setCart((prev) =>
        prev.map((i) =>
          i.productId === product.id
            ? {
                ...i,
                quantity: newQty,
                discountValue: Math.round(combinedDiscVal * 100) / 100,
                discountPercent: Math.round(combinedDiscPercent * 100) / 100,
                additionValue: Math.round(combinedAddVal * 100) / 100,
                additionPercent: Math.round(combinedAddPercent * 100) / 100,
                totalPrice: Math.round((newGross + combinedAddVal - combinedDiscVal) * 100) / 100,
              }
            : i
        )
      );
    } else {
      const newItem: OrderItem = {
        id: 'ITEM-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
        productId: product.id,
        productCode: product.code,
        description: product.description,
        unit: product.unit,
        quantity: qty,
        unitPrice: product.salePrice,
        discountPercent: Math.round(itemDiscPercent * 100) / 100,
        discountValue: Math.round(itemDiscVal * 100) / 100,
        additionPercent: Math.round(itemAddPercent * 100) / 100,
        additionValue: Math.round(itemAddVal * 100) / 100,
        totalPrice: Math.round(netTotal * 100) / 100,
        unitCost: product.costPrice,
        locationId: selectedLocationId,
        isMasterPack: product.isMasterPack,
        masterPackUnits: product.masterPackUnits,
        masterPackAssociatedProductId: product.masterPackAssociatedProductId,
        masterPackAssociatedProductCode: product.masterPackAssociatedProductCode,
      };
      setCart((prev) => [...prev, newItem]);
    }

    // Limpa campos da barra rápida para o próximo produto
    setFastSelectedProductId('');
    setFastProductSearchTerm('');
    setFastItemQty(1);
    setFastItemAdjustmentInput('');
  };

  // Alterar quantidade de item no carrinho
  const handleUpdateItemQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.productId === productId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            const gross = newQty * item.unitPrice;
            const discVal = (gross * (item.discountPercent || 0)) / 100;
            const addVal = (gross * (item.additionPercent || 0)) / 100;
            return {
              ...item,
              quantity: newQty,
              discountValue: Math.round(discVal * 100) / 100,
              additionValue: Math.round(addVal * 100) / 100,
              totalPrice: Math.round((gross + addVal - discVal) * 100) / 100,
            };
          }
          return item;
        })
        .filter(Boolean) as OrderItem[]
    );
  };

  const handleRemoveItem = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.productId !== productId));
  };

  // Modal de Ajuste (Desconto ou Acréscimo) no Item
  const handleOpenItemDiscount = (item: OrderItem) => {
    setDiscountingItemId(item.productId);
    if (item.additionValue && item.additionValue > 0) {
      setItemAdjustmentMode('acrescimo');
      if (item.additionPercent && item.additionPercent > 0) {
        setItemDiscountType('percent');
        setItemDiscountInput(item.additionPercent.toString().replace('.', ','));
      } else {
        setItemDiscountType('value');
        setItemDiscountInput(item.additionValue.toFixed(2).replace('.', ','));
      }
    } else if (item.discountValue > 0 || item.discountPercent > 0) {
      setItemAdjustmentMode('desconto');
      if (item.discountPercent > 0) {
        setItemDiscountType('percent');
        setItemDiscountInput(item.discountPercent.toString().replace('.', ','));
      } else {
        setItemDiscountType('value');
        setItemDiscountInput(item.discountValue.toFixed(2).replace('.', ','));
      }
    } else {
      setItemAdjustmentMode('desconto');
      setItemDiscountType('percent');
      setItemDiscountInput('');
    }
    setShowItemDiscountModal(true);
  };

  const handleApplyItemDiscount = () => {
    if (!discountingItemId) return;
    const target = cart.find((i) => i.productId === discountingItemId);
    if (!target) return;

    const gross = target.quantity * target.unitPrice;
    const rawVal = parseFloat(itemDiscountInput.replace(',', '.')) || 0;
    const maxPercent = currentUser.permissions.maxDiscountPercent;

    let appliedDiscountPercent = 0;
    let appliedDiscountValue = 0;
    let appliedAdditionPercent = 0;
    let appliedAdditionValue = 0;

    if (rawVal <= 0) {
      // Zerado
    } else if (itemAdjustmentMode === 'desconto') {
      if (itemDiscountType === 'percent') {
        if (rawVal > maxPercent) {
          alert(`O desconto informado (${rawVal}%) excede o limite máximo permitido de ${maxPercent}% para seu perfil.`);
          return;
        }
        appliedDiscountPercent = Math.min(100, rawVal);
        appliedDiscountValue = (gross * appliedDiscountPercent) / 100;
      } else {
        const maxVal = (gross * maxPercent) / 100;
        if (rawVal > maxVal) {
          alert(`O desconto informado (${formatCurrency(rawVal)}) excede o limite máximo permitido de ${maxPercent}% (${formatCurrency(maxVal)}).`);
          return;
        }
        appliedDiscountValue = Math.min(gross, rawVal);
        appliedDiscountPercent = gross > 0 ? (appliedDiscountValue / gross) * 100 : 0;
      }
    } else {
      // Acréscimo
      if (itemDiscountType === 'percent') {
        appliedAdditionPercent = rawVal;
        appliedAdditionValue = (gross * appliedAdditionPercent) / 100;
      } else {
        appliedAdditionValue = rawVal;
        appliedAdditionPercent = gross > 0 ? (appliedAdditionValue / gross) * 100 : 0;
      }
    }

    const net = Math.max(0, gross + appliedAdditionValue - appliedDiscountValue);

    setCart((prev) =>
      prev.map((i) =>
        i.productId === discountingItemId
          ? {
              ...i,
              discountPercent: Math.round(appliedDiscountPercent * 100) / 100,
              discountValue: Math.round(appliedDiscountValue * 100) / 100,
              additionPercent: Math.round(appliedAdditionPercent * 100) / 100,
              additionValue: Math.round(appliedAdditionValue * 100) / 100,
              totalPrice: Math.round(net * 100) / 100,
            }
          : i
      )
    );
    setShowItemDiscountModal(false);
  };

  // Cadastro rápido de cliente
  const handleQuickRegisterCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickCustName.trim()) {
      alert('Informe o nome do cliente.');
      return;
    }

    const newCust: Customer = {
      id: 'CUST-' + Date.now(),
      companyId: currentCompany.id,
      code: 'CLI-' + String(dbState.customers.length + 1).padStart(4, '0'),
      name: quickCustName.trim(),
      type: 'PF',
      cpfCnpj: quickCustCpfCnpj.trim() || '000.000.000-00',
      phone: quickCustPhone.trim() || '',
      whatsapp: quickCustPhone.trim() || '',
      creditLimit: parseFloat(quickCustCreditLimit) || 1000,
      status: 'ativo',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const state = Database.getState();
    state.customers.push(newCust);
    Database.persist();
    Database.addAuditLog('CLIENTE_CRIADO', 'CLIENTES', newCust.id, `Cliente ${newCust.name} criado no pedido.`);

    setSelectedCustomerId(newCust.id);
    setShowQuickCustomerModal(false);
    setQuickCustName('');
    setQuickCustPhone('');
    setQuickCustCpfCnpj('');
    setQuickCustCreditLimit('1000');
    alert(`Cliente "${newCust.name}" cadastrado com sucesso e selecionado no pedido!`);
  };

  // FINALIZAR PEDIDO DE VENDA OU ORÇAMENTO COMERCIAL
  const handleFinalizeOrder = () => {
    if (cart.length === 0) {
      alert('Adicione pelo menos um produto ao pedido antes de finalizar.');
      return;
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const prefix = docType === 'venda' ? 'VD' : 'ORC';
    const orderNumber = `${prefix}-${now.getFullYear()}-${String(dbState.orders.length + 1).padStart(5, '0')}`;

    try {
      let currentBalances = [...dbState.stockBalances];
      const movements = [];

      // 1. Se for VENDA, baixar estoque
      if (docType === 'venda') {
        const loc = locations.find((l) => l.id === selectedLocationId) || locations[0];
        for (const item of cart) {
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
            notes: `Venda ${orderNumber} por ${currentUser.name}`,
          });
          currentBalances = updatedBalances;
          movements.push(createdMovement);
        }
      }

      // 2. Criar objeto do pedido
      const targetBoletoAccount = paymentMethod === 'boleto'
        ? Database.getBoletoAccounts(currentCompany.id).find((a) => a.id === selectedBoletoAccountId) || Database.getBoletoAccounts(currentCompany.id)[0]
        : undefined;

      const newOrder: Order = {
        id: 'ORD-' + Date.now(),
        number: orderNumber,
        type: docType,
        origin: 'pedidos_venda' as any,
        companyId: currentCompany.id,
        customerId: selectedCustomerId || undefined,
        customerName: selectedCustomer ? selectedCustomer.name : 'Consumidor Final (Não Identificado)',
        customerPhone: selectedCustomer?.phone || selectedCustomer?.whatsapp,
        userId: currentUser.id,
        userName: currentUser.name,
        items: cart,
        subtotal: cart.reduce((s, itm) => {
          const effUnit = (itm.additionValue && itm.additionValue > 0)
            ? ((itm.totalPrice + (itm.discountValue || 0)) / (itm.quantity || 1))
            : itm.unitPrice;
          return s + (effUnit * itm.quantity);
        }, 0),
        discountTotal: combinedDiscounts,
        total: orderTotal,
        paymentMethod,
        bankAccountId: targetBoletoAccount?.id,
        bankAccountName: targetBoletoAccount?.name,
        installmentsCount: installments,
        receivedAmount: docType === 'venda' && (paymentMethod === 'pix' || paymentMethod === 'dinheiro') ? orderTotal : 0,
        changeAmount: 0,
        status: docType === 'orcamento' ? 'aberto' : 'concluido',
        validityDate: docType === 'orcamento' ? new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0] : undefined,
        notes: (() => {
          const extraInfo = [
            `Frete: ${freightType.toUpperCase()}`,
            `Previsão: ${deliveryForecast}`,
            `Condição: ${paymentTerms.replace(/_/g, ' ').toUpperCase()}`,
            internalNotes.trim() ? `Obs Interna: ${internalNotes.trim()}` : ''
          ].filter(Boolean).join(' | ');
          return notes.trim()
            ? `${notes.trim()} (${extraInfo})`
            : `${docType === 'orcamento' ? 'Orçamento Comercial' : 'Pedido de Venda'} emitido por ${currentUser.name}. ${extraInfo}`;
        })(),
        stockDeducted: docType === 'venda',
        financialGenerated: docType === 'venda',
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      // 3. Se for venda a prazo / cartão / boleto, gerar Contas a Receber
      let updatedReceivables = [...dbState.accountsReceivable];
      if (docType === 'venda' && (paymentMethod === 'boleto' || paymentMethod === 'crediario' || installments > 1)) {
        const valParcela = Number((orderTotal / installments).toFixed(2));
        for (let i = 1; i <= installments; i++) {
          const due = new Date();
          due.setDate(due.getDate() + i * 30);
          updatedReceivables.push({
            id: 'REC-' + Date.now() + '-' + i,
            companyId: currentCompany.id,
            orderId: newOrder.id,
            orderNumber: newOrder.number,
            customerId: selectedCustomerId,
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
            paymentMethod: paymentMethod === 'boleto' ? 'Boleto Bancário' : paymentMethod === 'crediario' ? 'Crediário' : 'Cartão Crédito',
            bankAccountId: paymentMethod === 'boleto' ? targetBoletoAccount?.id : undefined,
            bankAccountName: paymentMethod === 'boleto' ? targetBoletoAccount?.name : undefined,
            bankCode: paymentMethod === 'boleto' ? targetBoletoAccount?.bankCode : undefined,
            status: 'aberto',
            receipts: [],
          });
        }
      }

      // 4. Salvar estado no banco
      const state = Database.getState();
      state.stockBalances = currentBalances;
      state.stockMovements = [...movements, ...state.stockMovements];
      state.orders = [newOrder, ...state.orders];
      state.accountsReceivable = updatedReceivables;
      Database.persist();

      Database.addAuditLog(
        'PEDIDO_EMITIDO',
        'VENDAS',
        newOrder.id,
        `${docType === 'orcamento' ? 'Orçamento' : 'Pedido de Venda'} ${orderNumber} emitido por ${currentUser.name} para ${newOrder.customerName}. Total: ${formatCurrency(orderTotal)}`
      );

      toast.success(
        `${docType === 'orcamento' ? 'Orçamento' : 'Pedido de Venda'} ${orderNumber} emitido com sucesso!`,
        'Documento Emitido'
      );

      // Reset cart and fields
      setCart([]);
      setDiscountInput('');
      setNotes('');
      setInternalNotes('');
      setFastSelectedProductId('');
      setFastProductSearchTerm('');
      setSelectedCustomerId('');

      // Open receipt modal
      setSelectedOrder(newOrder);
      setShowReceiptModal(true);
    } catch (e) {
      alert('Erro ao finalizar pedido: ' + (e as Error).message);
    }
  };

  // Atalho de Teclado F10 e Ctrl+Enter para Emitir Pedido de Venda sem Mouse
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Se qualquer modal estiver aberto, não aciona o atalho
      if (
        showReceiptModal ||
        showQuickCustomerModal ||
        showItemDiscountModal ||
        showNotesModal ||
        viewDetailsOrder ||
        editingOrder
      ) {
        return;
      }

      if (activeTab !== 'novo_pedido') return;

      if (e.key === 'F10' || ((e.ctrlKey || e.metaKey) && e.key === 'Enter')) {
        e.preventDefault();
        if (cart.length > 0) {
          handleFinalizeOrder();
        } else {
          toast.error('Adicione ao menos um produto no pedido antes de finalizar.');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    cart,
    showReceiptModal,
    showQuickCustomerModal,
    showItemDiscountModal,
    showNotesModal,
    viewDetailsOrder,
    editingOrder,
    activeTab,
    handleFinalizeOrder
  ]);

  // CONVERTER ORÇAMENTO EM VENDA (No histórico)
  const handleConvertQuoteToSale = (quote: Order) => {
    if (quote.type !== 'orcamento') {
      alert('Apenas orçamentos comerciais podem ser convertidos em venda.');
      return;
    }

    if (quote.status === 'convertido_em_venda') {
      alert('Este orçamento JÁ FOI CONVERTIDO em venda anteriormente!');
      return;
    }

    if (quote.status === 'cancelado') {
      alert('Orçamentos cancelados não podem ser convertidos em venda.');
      return;
    }

    const confirmConvert = window.confirm(
      `Deseja converter o Orçamento ${quote.number} em Pedido de Venda?\nIsso irá baixar o estoque e gerar o financeiro.`
    );
    if (!confirmConvert) return;

    try {
      let currentBalances = [...dbState.stockBalances];
      const movements = [];
      const nowIso = new Date().toISOString();
      const saleNumber = `VD-${new Date().getFullYear()}-${String(dbState.orders.length + 1).padStart(5, '0')}`;

      for (const item of quote.items) {
        const { updatedBalances, createdMovement } = StockEngine.applyMovement(currentBalances, {
          companyId: currentCompany.id,
          productId: item.productId,
          productCode: item.productCode,
          productDescription: item.description,
          locationId: item.locationId || 'loc-principal',
          locationName: 'Estoque Principal',
          type: 'saida_venda',
          quantity: item.quantity,
          unitCost: item.unitCost,
          totalCost: item.unitCost * item.quantity,
          originDocType: 'venda',
          originDocId: saleNumber,
          date: nowIso,
          userId: currentUser.id,
          userName: currentUser.name,
          notes: `Baixa por conversão de orçamento ${quote.number} em venda ${saleNumber}`,
        });
        currentBalances = updatedBalances;
        movements.push(createdMovement);
      }

      const newSaleOrder: Order = {
        id: 'ORD-' + Date.now(),
        number: saleNumber,
        type: 'venda',
        origin: quote.origin,
        companyId: currentCompany.id,
        customerId: quote.customerId,
        customerName: quote.customerName,
        customerPhone: quote.customerPhone,
        userId: currentUser.id,
        userName: currentUser.name,
        items: quote.items,
        subtotal: quote.subtotal,
        discountTotal: quote.discountTotal,
        total: quote.total,
        paymentMethod: quote.paymentMethod,
        installmentsCount: quote.installmentsCount || 1,
        receivedAmount: quote.total,
        changeAmount: 0,
        status: 'concluido',
        stockDeducted: true,
        financialGenerated: true,
        convertedFromOrderId: quote.id,
        createdAt: nowIso,
        updatedAt: nowIso,
        notes: `Convertido do Orçamento ${quote.number}. ${quote.notes || ''}`,
      };

      const updatedOrders = dbState.orders.map((o) =>
        o.id === quote.id
          ? {
              ...o,
              status: 'convertido_em_venda' as OrderStatus,
              notes: `${o.notes || ''} [Convertido em Venda ${saleNumber} em ${new Date().toLocaleString('pt-BR')}]`,
              updatedAt: nowIso,
            }
          : o
      );

      let updatedReceivables = [...dbState.accountsReceivable];
      if (quote.paymentMethod === 'boleto' || quote.paymentMethod === 'crediario' || (quote.installmentsCount || 1) > 1) {
        const installmentsCount = quote.installmentsCount || 1;
        const valParcela = Number((quote.total / installmentsCount).toFixed(2));
        for (let i = 1; i <= installmentsCount; i++) {
          const due = new Date();
          due.setDate(due.getDate() + i * 30);
          updatedReceivables.push({
            id: 'REC-' + Date.now() + '-' + i,
            companyId: currentCompany.id,
            orderId: newSaleOrder.id,
            orderNumber: newSaleOrder.number,
            customerId: quote.customerId,
            customerName: quote.customerName,
            docNumber: `${saleNumber}/${i}`,
            installmentNumber: i,
            totalInstallments: installmentsCount,
            issueDate: nowIso.split('T')[0],
            dueDate: due.toISOString().split('T')[0],
            originalValue: valParcela,
            discount: 0,
            addition: 0,
            paidValue: 0,
            balance: valParcela,
            paymentMethod: quote.paymentMethod === 'boleto' ? 'Boleto Bancário' : quote.paymentMethod === 'crediario' ? 'Crediário' : 'Cartão Crédito',
            bankAccountId: quote.paymentMethod === 'boleto' ? (quote.bankAccountId || 'acc-itau') : undefined,
            bankAccountName: quote.paymentMethod === 'boleto' ? (quote.bankAccountName || 'Itaú Unibanco - Cobrança & Boleto') : undefined,
            status: 'aberto',
            receipts: [],
          });
        }
      }

      const state = Database.getState();
      state.stockBalances = currentBalances;
      state.stockMovements = [...movements, ...state.stockMovements];
      state.orders = [newSaleOrder, ...updatedOrders];
      state.accountsReceivable = updatedReceivables;
      Database.persist();

      Database.addAuditLog(
        'CONVERSAO_ORCAMENTO_VENDA',
        'VENDAS',
        newSaleOrder.id,
        `Orçamento ${quote.number} convertido na Venda ${saleNumber} por ${currentUser.name}.`
      );

      setSelectedOrder(newSaleOrder);
      setShowReceiptModal(true);
    } catch (e) {
      alert('Erro ao converter orçamento: ' + (e as Error).message);
    }
  };

  // CANCELAR PEDIDO / ORÇAMENTO
  const handleCancelOrder = (order: Order) => {
    if (order.status === 'cancelado') {
      alert('Este documento já está cancelado.');
      return;
    }

    const reason = window.prompt(`Informe o motivo do cancelamento do documento ${order.number}:`);
    if (!reason || !reason.trim()) return;

    try {
      let currentBalances = [...dbState.stockBalances];
      const movements = [];
      const nowIso = new Date().toISOString();

      if (order.type === 'venda' && order.stockDeducted) {
        for (const item of order.items) {
          const loc = locations.find((l) => l.id === item.locationId) || locations[0];
          const { updatedBalances, createdMovement } = StockEngine.applyMovement(currentBalances, {
            companyId: currentCompany.id,
            productId: item.productId,
            productCode: item.productCode,
            productDescription: item.description,
            locationId: loc.id,
            locationName: loc.name,
            type: 'devolucao',
            quantity: item.quantity,
            unitCost: item.unitCost,
            totalCost: item.unitCost * item.quantity,
            originDocType: 'venda',
            originDocId: order.number,
            date: nowIso,
            userId: currentUser.id,
            userName: currentUser.name,
            notes: `Estorno de estoque por cancelamento do Pedido ${order.number}. Motivo: ${reason}`,
          });
          currentBalances = updatedBalances;
          movements.push(createdMovement);
        }
      }

      const updatedOrders = dbState.orders.map((o) =>
        o.id === order.id
          ? {
              ...o,
              status: 'cancelado' as OrderStatus,
              notes: `${o.notes || ''} [Cancelado em ${new Date().toLocaleString('pt-BR')}: ${reason}]`,
              updatedAt: nowIso,
            }
          : o
      );

      const updatedReceivables = dbState.accountsReceivable.map((r) =>
        r.orderId === order.id ? { ...r, status: 'cancelado' as const } : r
      );

      const state = Database.getState();
      state.stockBalances = currentBalances;
      state.stockMovements = [...movements, ...state.stockMovements];
      state.orders = updatedOrders;
      state.accountsReceivable = updatedReceivables;
      Database.persist();

      Database.addAuditLog(
        'CANCELAMENTO_PEDIDO',
        'VENDAS',
        order.id,
        `Pedido ${order.number} cancelado por ${currentUser.name}. Motivo: ${reason}`
      );

      alert(`Pedido ${order.number} cancelado e estoque regularizado!`);
    } catch (e) {
      alert('Erro ao cancelar: ' + (e as Error).message);
    }
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'concluido':
        return <span className="bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2 py-0.5 rounded-full">Concluído</span>;
      case 'aberto':
        return <span className="bg-blue-100 text-blue-800 text-[11px] font-bold px-2 py-0.5 rounded-full">Aberto</span>;
      case 'convertido_em_venda':
        return <span className="bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2 py-0.5 rounded-full">Convertido em Venda</span>;
      case 'cancelado':
        return <span className="bg-rose-100 text-rose-800 text-[11px] font-bold px-2 py-0.5 rounded-full">Cancelado</span>;
      case 'aguardando_aprovacao':
        return <span className="bg-slate-200 text-slate-800 text-[11px] font-bold px-2 py-0.5 rounded-full">Aguardando Aprov.</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 text-[11px] font-bold px-2 py-0.5 rounded-full">{status}</span>;
    }
  };

  return (
    <div className="space-y-3 max-w-[1700px] mx-auto pb-12">
      {/* Barra de Navegação Superior e Alternância Venda / Orçamento */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
            <ClipboardList size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                Pedido de Venda & Orçamentos
              </h1>
              <span className="text-[10px] font-extrabold px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full uppercase">
                {activeTab === 'novo_pedido' ? 'Emissão Ativa' : 'Histórico'}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              {activeTab === 'novo_pedido'
                ? 'Emita novos pedidos de venda e propostas de orçamento diretamente pelo retaguarda com cálculo automático'
                : 'Consulte pedidos gravados, reimprima comprovantes e converta orçamentos em venda'}
            </p>
          </div>
        </div>

        {/* Abas Superiores, Botão de Emissão Rápida e Seletor de Tipo */}
        <div className="flex items-center flex-wrap gap-2">
          {activeTab === 'novo_pedido' && (
            <button
              type="button"
              disabled={cart.length === 0}
              onClick={handleFinalizeOrder}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black text-white shadow-md transition-all cursor-pointer disabled:opacity-40 shrink-0 ${
                docType === 'venda'
                  ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950/20'
                  : 'bg-blue-600 hover:bg-blue-500 shadow-blue-950/20'
              }`}
              title="Finalizar e emitir sem usar o mouse (Pressione tecla F10 ou Ctrl+Enter)"
            >
              {docType === 'venda' ? <CheckCircle2 size={15} /> : <FileText size={15} />}
              <span>{docType === 'venda' ? 'FINALIZAR E EMITIR' : 'EMITIR ORÇAMENTO'}</span>
              <kbd className="bg-black/25 text-white text-[10px] px-1.5 py-0.5 rounded font-mono font-bold">
                F10
              </kbd>
              {cart.length > 0 && (
                <span className="font-mono text-emerald-100 bg-black/20 px-1.5 py-0.5 rounded text-[11px] font-black">
                  {formatCurrency(orderTotal)}
                </span>
              )}
            </button>
          )}

          {activeTab === 'novo_pedido' && (
            <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
              <button
                type="button"
                onClick={() => setDocType('venda')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  docType === 'venda'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CheckCircle2 size={14} />
                <span>Pedido de Venda</span>
              </button>
              <button
                type="button"
                onClick={() => setDocType('orcamento')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  docType === 'orcamento'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText size={14} />
                <span>Orçamento Comercial</span>
              </button>
            </div>
          )}

          <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
            <button
              type="button"
              onClick={() => setActiveTab('novo_pedido')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'novo_pedido'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Plus size={14} className="text-blue-600" />
              <span>Novo Pedido</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('historico')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'historico'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock size={14} className="text-slate-500" />
              <span>Histórico ({filteredOrders.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ABA 1: EMISSÃO DE NOVO PEDIDO DE VENDA / ORÇAMENTO (LAYOUT EXECUTIVO ERP) */}
      {/* ========================================================================= */}
      {activeTab === 'novo_pedido' ? (
        <div className="space-y-2.5">
          {/* 1. BARRA DE COMANDO RÁPIDO: CLIENTE, DEPÓSITO DE SAÍDA & EXPEDIÇÃO */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-3">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center">
              {/* Cliente Selecionado (5 Colunas) */}
              <div className="md:col-span-5 space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                    <UserCheck size={13} className="text-blue-600" />
                    <span>Cliente do Pedido:</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowQuickCustomerModal(true)}
                    className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 hover:underline flex items-center gap-0.5 cursor-pointer"
                  >
                    <UserPlus size={11} />
                    <span>+ Novo Cliente</span>
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className={`w-full rounded-xl py-1.5 px-2.5 text-xs font-bold transition-all truncate focus:outline-hidden ${
                      selectedCustomer
                        ? 'bg-emerald-50/90 border border-emerald-400 text-emerald-950 shadow-2xs'
                        : 'bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:ring-1 focus:ring-blue-500'
                    }`}
                  >
                    <option value="">Consumidor Final (Sem Identificação / Balcão)</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.cpfCnpj ? `• ${c.cpfCnpj}` : ''} {c.phone ? `• ${c.phone}` : ''}
                      </option>
                    ))}
                  </select>
                  {selectedCustomer && (
                    <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-1 rounded-lg shrink-0 whitespace-nowrap hidden sm:inline-block">
                      Limite: {formatCurrency(selectedCustomer.creditLimit)}
                    </span>
                  )}
                </div>
              </div>

              {/* Depósito de Saída (3 Colunas) */}
              <div className="md:col-span-3 space-y-1">
                <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                  <Warehouse size={13} className="text-blue-600" />
                  <span>Depósito de Saída:</span>
                </label>
                <select
                  value={selectedLocationId}
                  onChange={(e) => setSelectedLocationId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-2.5 text-xs font-bold text-slate-800 focus:outline-hidden focus:bg-white focus:ring-1 focus:ring-blue-500 truncate cursor-pointer"
                >
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} {loc.id === 'loc-comercial' || loc.name.toLowerCase() === 'comercial' ? '(Padrão)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Frete & Prazo (4 Colunas) */}
              <div className="md:col-span-4 grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                    <Truck size={13} className="text-slate-500" />
                    <span>Frete:</span>
                  </label>
                  <select
                    value={freightType}
                    onChange={(e) => setFreightType(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-2 text-xs font-semibold text-slate-800 focus:outline-hidden focus:bg-white truncate cursor-pointer"
                  >
                    <option value="retirada">Retirada Balcão</option>
                    <option value="entrega_propria">Entrega Própria</option>
                    <option value="cif">Transp. CIF (Pago)</option>
                    <option value="fob">Transp. FOB (Dest.)</option>
                    <option value="sem_frete">Sem Frete</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                    <Calendar size={13} className="text-slate-500" />
                    <span>Prazo de Entrega:</span>
                  </label>
                  <select
                    value={deliveryForecast}
                    onChange={(e) => setDeliveryForecast(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-2 text-xs font-semibold text-slate-800 focus:outline-hidden focus:bg-white truncate cursor-pointer"
                  >
                    <option value="Imediato">Imediato</option>
                    <option value="24 Horas">24 Horas</option>
                    <option value="3 a 5 Dias">3 a 5 Dias</option>
                    <option value="A Combinar">A Combinar</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* 2. CENTRAL DE INCLUSÃO DE PRODUTOS NO PEDIDO (VISÍVEL NO TOPO DA TELA ABERTA SEM ROLAGEM) */}
          <div className="bg-white rounded-2xl border-2 border-blue-200 shadow-xs p-3 sm:p-3.5 space-y-2.5">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Package size={14} />
                </div>
                <h2 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                  Inclusão de Produtos no Pedido
                </h2>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md hidden sm:inline-block">
                  Depósito de Saída: <strong>{selectedLocationName}</strong> (Padrão)
                </span>
              </div>

              {/* Modo de Inclusão & Ações Rápidas */}
              <div className="flex items-center gap-2">
                <div className="inline-flex rounded-xl bg-slate-100 p-0.5 border border-slate-200 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setItemsEntryMode('insercao_rapida')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all cursor-pointer text-xs ${
                      itemsEntryMode === 'insercao_rapida'
                        ? 'bg-white text-blue-700 shadow-2xs font-extrabold'
                        : 'text-slate-600 hover:text-slate-900 font-semibold'
                    }`}
                  >
                    <Sparkles size={12} />
                    <span>Linha a Linha (Rápido)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setItemsEntryMode('catalogo_grade')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all cursor-pointer text-xs ${
                      itemsEntryMode === 'catalogo_grade'
                        ? 'bg-white text-blue-700 shadow-2xs font-extrabold'
                        : 'text-slate-600 hover:text-slate-900 font-semibold'
                    }`}
                  >
                    <Package size={12} />
                    <span>Catálogo Visual</span>
                  </button>
                </div>
              </div>
            </div>

            {/* MODO A: INSERÇÃO RÁPIDA LINHA A LINHA (ALTA PRODUTIVIDADE ERP) */}
            {itemsEntryMode === 'insercao_rapida' ? (
              <div className="bg-slate-50/80 p-3.5 sm:p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  {/* Seleção do Produto (6 Colunas) */}
                  <div className="md:col-span-6 space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-slate-700 block">
                        Produto / Item Comercial:
                      </label>
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/90 px-1.5 py-0.2 rounded border border-emerald-300">
                        Depósito: <strong>{selectedLocationName}</strong>
                      </span>
                    </div>
                    <select
                      value={fastSelectedProductId}
                      onChange={(e) => setFastSelectedProductId(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl py-2 px-3 text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition-all truncate"
                    >
                      <option value="">
                        {fastEntryProducts.length === 0
                          ? `Nenhum produto com saldo no depósito "${selectedLocationName}"`
                          : `Selecione o produto (${fastEntryProducts.length} disponíveis no depósito ${selectedLocationName})...`}
                      </option>
                      {fastEntryProducts.map((p) => {
                        const stock = StockEngine.getBalance(dbState.stockBalances, p.id, selectedLocationId);
                        return (
                          <option key={p.id} value={p.id}>
                            [{p.code}] {p.description} • Saldo em {selectedLocationName}: {formatQuantity(stock.quantity)} {p.unit} • {formatCurrency(p.salePrice)}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Quantidade (2 Colunas) */}
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 block">
                      Quantidade:
                    </label>
                    <div className="inline-flex items-center w-full bg-white border border-slate-300 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setFastItemQty((prev) => Math.max(1, prev - 1))}
                        className="px-2.5 py-2 text-slate-600 hover:bg-slate-100 rounded-l-xl cursor-pointer"
                      >
                        <Minus size={12} />
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={fastItemQty}
                        onChange={(e) => setFastItemQty(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full text-center text-xs font-black text-slate-900 bg-transparent focus:outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={() => setFastItemQty((prev) => prev + 1)}
                        className="px-2.5 py-2 text-slate-600 hover:bg-slate-100 rounded-r-xl cursor-pointer"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Desconto ou Acréscimo no Item (2 Colunas) */}
                  <div className="md:col-span-2 space-y-1">
                    <div className="flex items-center justify-between">
                      <select
                        value={fastItemAdjustmentMode}
                        onChange={(e) => setFastItemAdjustmentMode(e.target.value as any)}
                        className={`text-[11px] font-black rounded-lg px-1.5 py-0.5 border cursor-pointer focus:outline-hidden transition-colors ${
                          fastItemAdjustmentMode === 'acrescimo'
                            ? 'bg-blue-50 text-blue-800 border-blue-300'
                            : 'bg-amber-50 text-amber-800 border-amber-300'
                        }`}
                        title="Selecione no mesmo campo se deseja aplicar Desconto ou Acréscimo"
                      >
                        <option value="desconto">Desconto (-)</option>
                        <option value="acrescimo">Acréscimo (+)</option>
                      </select>
                      <div className="inline-flex rounded-md bg-slate-200 p-0.5 text-[9px] font-bold">
                        <button
                          type="button"
                          onClick={() => setFastItemAdjustmentType('percent')}
                          className={`px-1.5 py-0.2 rounded cursor-pointer ${
                            fastItemAdjustmentType === 'percent' ? 'bg-blue-600 text-white' : 'text-slate-600'
                          }`}
                        >
                          %
                        </button>
                        <button
                          type="button"
                          onClick={() => setFastItemAdjustmentType('value')}
                          className={`px-1.5 py-0.2 rounded cursor-pointer ${
                            fastItemAdjustmentType === 'value' ? 'bg-blue-600 text-white' : 'text-slate-600'
                          }`}
                        >
                          R$
                        </button>
                      </div>
                    </div>
                    <input
                      type="text"
                      placeholder="0"
                      value={fastItemAdjustmentInput}
                      onChange={(e) => setFastItemAdjustmentInput(e.target.value.replace(/[^0-9.,]/g, ''))}
                      className={`w-full bg-white border rounded-xl py-2 px-2.5 text-right font-black text-xs text-slate-900 focus:outline-hidden focus:ring-2 ${
                        fastItemAdjustmentMode === 'acrescimo'
                          ? 'border-blue-300 focus:ring-blue-500'
                          : 'border-slate-300 focus:ring-amber-500'
                      }`}
                    />
                  </div>

                  {/* Botão de Adição (2 Colunas) */}
                  <div className="md:col-span-2">
                    <button
                      type="button"
                      disabled={!fastSelectedProductId}
                      onClick={handleAddFastItem}
                      className="w-full py-2.5 px-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Plus size={15} />
                      <span>Incluir Item</span>
                    </button>
                  </div>
                </div>

                {/* Prévia Informativa do Produto Selecionado */}
                {(() => {
                  const selProd = dbState.products.find((p) => p.id === fastSelectedProductId);
                  if (!selProd) return null;
                  const stock = StockEngine.getBalance(dbState.stockBalances, selProd.id, selectedLocationId);
                  const rawVal = parseFloat(fastItemAdjustmentInput.replace(',', '.')) || 0;
                  const grossItem = fastItemQty * selProd.salePrice;
                  let calculatedDisc = 0;
                  let calculatedAdd = 0;
                  if (rawVal > 0) {
                    if (fastItemAdjustmentMode === 'desconto') {
                      if (fastItemAdjustmentType === 'percent') {
                        calculatedDisc = (grossItem * Math.min(currentUser.permissions.maxDiscountPercent, rawVal)) / 100;
                      } else {
                        calculatedDisc = Math.min(grossItem, rawVal);
                      }
                    } else {
                      // Acréscimo
                      if (fastItemAdjustmentType === 'percent') {
                        calculatedAdd = (grossItem * rawVal) / 100;
                      } else {
                        calculatedAdd = rawVal;
                      }
                    }
                  }
                  const lineTotal = Math.max(0, grossItem + calculatedAdd - calculatedDisc);

                  return (
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          {selProd.code}
                        </span>
                        <span className="font-extrabold text-slate-900">{selProd.description}</span>
                        <span className="text-slate-400">•</span>
                        <span className="text-[11px] text-slate-500">
                          Estoque no local:{' '}
                          <strong className={stock.quantity <= 0 ? 'text-rose-600' : 'text-emerald-700'}>
                            {formatQuantity(stock.quantity)} {selProd.unit}
                          </strong>
                        </span>
                        <span className="text-slate-400">•</span>
                        <span className="text-[11px] text-slate-500">
                          Tabela: <strong className="text-slate-800 font-mono">{formatCurrency(selProd.salePrice)}</strong>
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-right shrink-0">
                        {calculatedDisc > 0 && (
                          <span className="text-[11px] text-amber-700 font-bold">
                            Desc: -{formatCurrency(calculatedDisc)}
                          </span>
                        )}
                        {calculatedAdd > 0 && (
                          <span className="text-[11px] text-blue-700 font-bold">
                            Acrésc: +{formatCurrency(calculatedAdd)}
                          </span>
                        )}
                        <span className="text-slate-500 text-[11px]">Subtotal da linha:</span>
                        <span className="font-black text-sm text-emerald-700 font-mono">
                          {formatCurrency(lineTotal)}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              /* MODO B: CATÁLOGO VISUAL COM FILTROS DE CATEGORIA */
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Pesquisar no catálogo por nome, código ou código de barras..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 cursor-pointer"
                  >
                    <option value="todos">Todas as Categorias</option>
                    {categories.filter((c) => c !== 'todos').map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => setFilterByLocationStock((prev) => !prev)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 ${
                      filterByLocationStock
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                    title="Alternar filtro de produtos com saldo no depósito selecionado"
                  >
                    <Warehouse size={13} className={filterByLocationStock ? 'text-emerald-600' : 'text-slate-400'} />
                    <span>Depósito: {selectedLocationName}</span>
                    <span className="text-[10px] bg-white px-1.5 py-0.2 rounded border font-mono">
                      {filteredProducts.length}
                    </span>
                  </button>
                </div>

                {/* Grade de Cards do Catálogo */}
                {filteredProducts.length === 0 ? (
                  <div className="p-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs text-slate-500 space-y-1">
                    <p className="font-bold text-slate-700">Nenhum produto com saldo encontrado no depósito "{selectedLocationName}".</p>
                    <p className="text-[11px] text-slate-400">Alterne o depósito de saída acima ou desative o filtro por depósito para consultar outros itens.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-[360px] overflow-y-auto p-1">
                    {filteredProducts.map((prod) => {
                      const stock = StockEngine.getBalance(dbState.stockBalances, prod.id, selectedLocationId);
                      const isOutOfStock = stock.quantity <= 0;
                      const itemInCart = cart.find((i) => i.productId === prod.id);

                      return (
                        <div
                          key={prod.id}
                          className="bg-white p-3 rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-xs transition-all flex flex-col justify-between gap-2"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="font-mono text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                                {prod.code}
                              </span>
                              <span className={`text-[10px] font-bold ${isOutOfStock ? 'text-rose-600' : 'text-emerald-700'}`}>
                                Saldo ({selectedLocationName}): {formatQuantity(stock.quantity)} {prod.unit}
                              </span>
                            </div>
                          <h4 className="text-xs font-extrabold text-slate-900 line-clamp-1">{prod.description}</h4>
                          <span className="text-xs font-black text-slate-900 font-mono block mt-1">
                            {formatCurrency(prod.salePrice)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-1.5 border-t border-slate-100">
                          {itemInCart ? (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              ✓ {itemInCart.quantity} no pedido
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">UN: {prod.unit}</span>
                          )}

                          <button
                            type="button"
                            onClick={() => handleAddToCart(prod, 1)}
                            className="flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                          >
                            <Plus size={13} />
                            <span>Adicionar</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

          {/* 3. BANCADA DE TRABALHO: GRADE DE ITENS (ESQUERDA) & FECHAMENTO COMERCIAL (DIREITA) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
            {/* LADO ESQUERDO (7 COLUNAS): GRADE DE ITENS DO PEDIDO */}
            <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
              <div className="px-3.5 py-2.5 flex items-center justify-between border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <ShoppingCart size={15} className="text-blue-600" />
                  <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                    Grade de Itens ({cart.length} item{cart.length === 1 ? '' : 's'} • {cart.reduce((s, i) => s + i.quantity, 0)} vol)
                  </h3>
                </div>
                {cart.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Deseja limpar todos os itens deste pedido?')) {
                        setCart([]);
                      }
                    }}
                    className="text-[11px] font-bold text-rose-600 hover:text-rose-800 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <Trash2 size={12} />
                    <span>Limpar grade</span>
                  </button>
                )}
              </div>

              {/* Tabela com scroll interno */}
              {cart.length === 0 ? (
                <div className="p-8 text-center text-slate-400 space-y-1.5">
                  <ShoppingBag size={32} className="mx-auto text-slate-300" />
                  <p className="font-extrabold text-xs text-slate-700">Nenhum produto incluído no pedido</p>
                  <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                    Selecione o produto acima e clique em "Incluir Item" para lançar os produtos diretamente nesta bancada.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto max-h-[300px] xl:max-h-[360px] overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 bg-slate-50 z-10 border-b border-slate-200 shadow-2xs">
                      <tr className="text-[10px] font-black uppercase text-slate-600">
                        <th className="py-2 px-2.5 text-center w-8">#</th>
                        <th className="py-2 px-2 w-20">Código</th>
                        <th className="py-2 px-2.5 min-w-[150px]">Descrição</th>
                        <th className="py-2 px-1 text-center w-12">UN</th>
                        <th className="py-2 px-2 text-center w-24">Qtd</th>
                        <th className="py-2 px-2 text-right w-20">Tabela</th>
                        <th className="py-2 px-2 text-right w-20">Desc./Acrésc.</th>
                        <th className="py-2 px-2 text-right w-20">Líquido</th>
                        <th className="py-2 px-2 text-right w-24">Subtotal</th>
                        <th className="py-2 px-2 text-center w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {cart.map((item, index) => {
                        const grossLine = item.quantity * item.unitPrice;
                        const discVal = item.discountValue || 0;
                        const addVal = item.additionValue || 0;
                        const netUnit = item.quantity > 0 ? (grossLine + addVal - discVal) / item.quantity : item.unitPrice;

                        return (
                          <tr key={item.id} className="hover:bg-blue-50/20 transition-colors">
                            <td className="py-2 px-2.5 text-center font-bold text-slate-400 font-mono text-[10px]">
                              {index + 1}
                            </td>
                            <td className="py-2 px-2 font-mono text-[11px] font-bold text-blue-700">
                              {item.productCode}
                            </td>
                            <td className="py-2 px-2.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-extrabold text-slate-900 text-xs block truncate max-w-[200px]" title={item.description}>
                                  {item.description}
                                </span>
                                {item.isMasterPack && (
                                  <span className="inline-flex items-center gap-1 text-[9px] bg-amber-100 text-amber-900 font-extrabold px-1.5 py-0.2 rounded border border-amber-300">
                                    <Boxes size={10} className="text-amber-700" />
                                    Master ({item.masterPackUnits} un/{item.unit})
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-2 px-1 text-center font-semibold text-slate-500 text-[10px]">
                              {item.unit}
                            </td>
                            <td className="py-2 px-2 text-center">
                              <div className="inline-flex items-center border border-slate-200 rounded-lg bg-slate-50">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateItemQty(item.productId, -1)}
                                  className="px-1 py-0.5 hover:bg-slate-200 text-slate-600 rounded-l-lg cursor-pointer"
                                >
                                  <Minus size={10} />
                                </button>
                                <span className="px-1.5 font-black font-mono text-xs text-slate-900">
                                  {item.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateItemQty(item.productId, 1)}
                                  className="px-1 py-0.5 hover:bg-slate-200 text-slate-600 rounded-r-lg cursor-pointer"
                                >
                                  <Plus size={10} />
                                </button>
                              </div>
                            </td>
                            <td className="py-2 px-2 text-right font-mono text-slate-600 text-[11px]">
                              {formatCurrency(item.unitPrice)}
                            </td>
                            <td className="py-2 px-2 text-right">
                              <button
                                type="button"
                                onClick={() => handleOpenItemDiscount(item)}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                                  addVal > 0
                                    ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                    : discVal > 0
                                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                    : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                                }`}
                                title="Editar desconto ou acréscimo deste item"
                              >
                                {addVal > 0
                                  ? `+${formatCurrency(addVal)}`
                                  : discVal > 0
                                  ? `-${formatCurrency(discVal)}`
                                  : '0,00'}
                              </button>
                            </td>
                            <td className="py-2 px-2 text-right font-mono text-slate-800 font-bold text-[11px]">
                              {formatCurrency(netUnit)}
                            </td>
                            <td className="py-2 px-2 text-right font-mono text-slate-900 font-black text-xs">
                              {formatCurrency(item.totalPrice)}
                            </td>
                            <td className="py-2 px-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(item.productId)}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                                title="Remover item da grade"
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="sticky bottom-0 bg-slate-50 border-t border-slate-200 font-bold text-slate-700">
                      <tr>
                        <td colSpan={4} className="py-2 px-2.5 text-[11px]">
                          Totais: {cart.reduce((s, i) => s + i.quantity, 0)} volumes
                        </td>
                        <td colSpan={4} className="py-2 px-2 text-right text-slate-500 text-[11px]">
                          Subtotal Itens:
                        </td>
                        <td className="py-2 px-2 text-right font-mono font-black text-slate-900 text-xs">
                          {formatCurrency(subtotalAfterItemDiscounts)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

            {/* LADO DIREITO (5 COLUNAS): CONDIÇÕES DE PAGAMENTO, DESCONTO GLOBAL & TOTAIS */}
            <div className="lg:col-span-5 space-y-2.5">
              {/* Card de Condições de Pagamento */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-3 sm:p-3.5 space-y-2.5">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <CreditCard size={15} className="text-blue-600" />
                    <span className="text-xs font-black uppercase text-slate-800 tracking-wider">
                      Pagamento & Condições
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold">Comercial</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      Prazo / Faturamento:
                    </label>
                    <select
                      value={paymentTerms}
                      onChange={(e) => setPaymentTerms(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 font-semibold text-slate-800 focus:outline-hidden focus:bg-white text-xs cursor-pointer"
                    >
                      <option value="a_vista">À Vista / Imediato</option>
                      <option value="15_dias">15 Dias Direto</option>
                      <option value="30_dias">30 Dias Faturado</option>
                      <option value="30_60_dias">30 / 60 Dias</option>
                      <option value="30_60_90_dias">30 / 60 / 90 Dias</option>
                      <option value="personalizado">Personalizado</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      Meio de Pagamento:
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as any)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 font-bold text-slate-800 focus:outline-hidden focus:bg-white text-xs cursor-pointer"
                    >
                      <option value="pix">Pix Cobrança</option>
                      <option value="boleto">Boleto Bancário</option>
                      <option value="cartao_credito">Cartão de Crédito</option>
                      <option value="cartao_debito">Cartão de Débito</option>
                      <option value="crediario">Crediário Próprio</option>
                      <option value="dinheiro">Dinheiro</option>
                    </select>
                  </div>
                </div>

                {/* Se Boleto: Banco emissor */}
                {paymentMethod === 'boleto' && (
                  <div className="bg-amber-50/80 p-2 rounded-xl border border-amber-200 space-y-1">
                    <label className="text-[10px] font-bold text-amber-900 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Barcode size={12} className="text-amber-700" />
                        Conta / Banco para Emissão:
                      </span>
                    </label>
                    <select
                      value={selectedBoletoAccountId}
                      onChange={(e) => setSelectedBoletoAccountId(e.target.value)}
                      className="w-full bg-white border border-amber-300 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 focus:outline-hidden cursor-pointer"
                    >
                      {Database.getBoletoAccounts(currentCompany.id).map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} {acc.bankCode ? `(${acc.bankCode})` : ''} - Ag: {acc.agency || '-'} C/C: {acc.accountNumber || '-'}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Parcelas se Cartão ou Boleto ou faturado */}
                {(paymentMethod === 'cartao_credito' || paymentMethod === 'boleto' || paymentMethod === 'crediario' || paymentTerms.includes('dias')) && (
                  <div className="flex items-center justify-between text-xs bg-slate-50 p-2 rounded-xl border border-slate-200">
                    <span className="font-bold text-slate-700 text-[11px]">Parcelamento:</span>
                    <select
                      value={installments}
                      onChange={(e) => setInstallments(Number(e.target.value))}
                      className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-bold text-slate-900 cursor-pointer"
                    >
                      {[1, 2, 3, 4, 5, 6, 10, 12].map((n) => (
                        <option key={n} value={n}>
                          {n}x de {formatCurrency(orderTotal / n)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Desconto Global */}
                <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-700 text-[11px]">Desconto Global:</span>
                    <div className="inline-flex rounded-md bg-slate-200 p-0.5 border border-slate-300 text-[9px]">
                      <button
                        type="button"
                        onClick={() => handleDiscountTypeChange('percent')}
                        className={`px-1.5 py-0.2 rounded cursor-pointer ${
                          discountType === 'percent' ? 'bg-blue-600 text-white font-bold' : 'text-slate-600'
                        }`}
                      >
                        %
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDiscountTypeChange('value')}
                        className={`px-1.5 py-0.2 rounded cursor-pointer ${
                          discountType === 'value' ? 'bg-blue-600 text-white font-bold' : 'text-slate-600'
                        }`}
                      >
                        R$
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      placeholder="0"
                      value={discountInput}
                      onChange={(e) => setDiscountInput(e.target.value.replace(/[^0-9.,]/g, ''))}
                      className="w-16 bg-white border border-slate-300 rounded-lg py-1 px-1.5 text-right font-black text-xs text-slate-900 focus:outline-hidden"
                    />
                    {orderDiscountVal > 0 && (
                      <span className="text-[10px] text-rose-600 font-bold font-mono">
                        -{formatCurrency(orderDiscountVal)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Observações Rápidas */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 block">
                    Observações Impressas no Pedido (opcional):
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ex: Entregar pela manhã. Contato com comprador..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs text-slate-800 focus:outline-hidden focus:bg-white"
                  />
                </div>
              </div>

              {/* Card Escuro de Totais & Emissão Oficial */}
              <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 text-white rounded-2xl p-3.5 shadow-md space-y-3">
                <div className="grid grid-cols-3 gap-1.5 text-xs font-mono pb-2.5 border-b border-slate-800/80">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Bruto:</span>
                    <span className="font-bold text-slate-200 text-xs">{formatCurrency(grossSubtotal)}</span>
                  </div>
                  <div>
                    <span className="text-blue-400 block text-[10px] uppercase">Acrésc.:</span>
                    <span className="font-bold text-blue-300 text-xs">
                      {totalItemAdditions > 0 ? `+${formatCurrency(totalItemAdditions)}` : 'R$ 0,00'}
                    </span>
                  </div>
                  <div>
                    <span className="text-amber-400 block text-[10px] uppercase">Descontos:</span>
                    <span className="font-bold text-amber-300 text-xs">
                      {combinedDiscounts > 0 ? `-${formatCurrency(combinedDiscounts)}` : 'R$ 0,00'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-emerald-400 text-xs uppercase font-extrabold">
                    {docType === 'venda' ? 'Total Pedido de Venda:' : 'Total Orçamento:'}
                  </span>
                  <span className="font-black text-xl text-emerald-400 font-mono tracking-tight">
                    {formatCurrency(orderTotal)}
                  </span>
                </div>

                <button
                  type="button"
                  disabled={cart.length === 0}
                  onClick={handleFinalizeOrder}
                  className={`w-full py-3 px-4 rounded-xl font-black text-xs sm:text-sm text-white flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-40 ${
                    docType === 'venda'
                      ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950/40'
                      : 'bg-blue-600 hover:bg-blue-500 shadow-blue-950/40'
                  }`}
                  title="Finalizar e emitir sem mouse (Pressione F10 ou Ctrl+Enter)"
                >
                  {docType === 'venda' ? <CheckCircle2 size={18} /> : <FileText size={18} />}
                  <span>
                    {docType === 'venda' ? 'FINALIZAR E EMITIR PEDIDO DE VENDA' : 'GERAR PROPOSTA DE ORÇAMENTO'}
                  </span>
                  <kbd className="bg-black/30 text-white text-[10px] px-1.5 py-0.5 rounded font-mono border border-white/20">
                    F10
                  </kbd>
                </button>
              </div>
            </div>
          </div>

          {/* BARRA FIXA DE CONCLUSÃO E EMISSÃO (SEMPRE VISÍVEL NA TELA SEM PRECISAR ROLAR) */}
          <div className="sticky bottom-0 z-30 bg-slate-900/95 backdrop-blur-md text-white p-3 sm:px-5 rounded-2xl border border-slate-700 shadow-2xl flex items-center justify-between gap-3 mt-2">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider hidden sm:inline">
                  {docType === 'venda' ? 'Total Pedido' : 'Total Orçamento'}:
                </span>
                <span className="text-emerald-400 font-mono font-black text-base sm:text-xl">
                  {formatCurrency(orderTotal)}
                </span>
              </div>
              <span className="text-xs text-slate-500 hidden sm:inline">•</span>
              <span className="text-xs text-slate-300 font-medium hidden md:inline">
                {cart.length} item{cart.length === 1 ? '' : 's'} ({cart.reduce((s, i) => s + i.quantity, 0)} volumes)
              </span>
              {totalItemAdditions > 0 && (
                <span className="text-[10px] font-bold text-blue-300 bg-blue-950/60 border border-blue-800 px-2 py-0.5 rounded hidden lg:inline">
                  Acréscimos: +{formatCurrency(totalItemAdditions)}
                </span>
              )}
              {combinedDiscounts > 0 && (
                <span className="text-[10px] font-bold text-amber-300 bg-amber-950/60 border border-amber-800 px-2 py-0.5 rounded hidden lg:inline">
                  Descontos: -{formatCurrency(combinedDiscounts)}
                </span>
              )}
            </div>

            <button
              type="button"
              disabled={cart.length === 0}
              onClick={handleFinalizeOrder}
              className={`px-4 sm:px-6 py-2.5 rounded-xl font-black text-xs sm:text-sm text-white flex items-center gap-2 shadow-lg transition-all cursor-pointer disabled:opacity-40 shrink-0 ${
                docType === 'venda'
                  ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950/40'
                  : 'bg-blue-600 hover:bg-blue-500 shadow-blue-950/40'
              }`}
              title="Atalho: Tecla F10 ou Ctrl+Enter no teclado para finalizar sem o mouse"
            >
              {docType === 'venda' ? <CheckCircle2 size={18} /> : <FileText size={18} />}
              <span>
                {docType === 'venda' ? 'FINALIZAR E EMITIR PEDIDO DE VENDA' : 'GERAR PROPOSTA DE ORÇAMENTO'}
              </span>
              <kbd className="bg-black/30 text-white text-[11px] px-2 py-0.5 rounded font-mono font-bold border border-white/20">
                F10
              </kbd>
            </button>
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* ABA 2: HISTÓRICO DE PEDIDOS E ORÇAMENTOS (CONSULTA, EDIÇÃO E CONVERSÃO)   */
        /* ========================================================================= */
        <div className="space-y-3">
          {/* Painel de Filtros Avançados */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                <Filter size={15} className="text-slate-400" />
                <span>Filtros do Histórico</span>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('novo_pedido')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
              >
                <Plus size={13} />
                <span>+ Emitir Novo Pedido</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
              {/* Tipo de Documento */}
              <div>
                <label className="block text-slate-500 font-medium mb-1">Tipo Documento:</label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium"
                >
                  <option value="todos">Todos (Vendas & Orç.)</option>
                  <option value="venda">Vendas</option>
                  <option value="orcamento">Orçamentos</option>
                </select>
              </div>

              {/* Origem da Venda */}
              <div>
                <label className="block text-slate-500 font-medium mb-1">Origem:</label>
                <select
                  value={filterOrigin}
                  onChange={(e) => setFilterOrigin(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium"
                >
                  <option value="todos">Todas as Origens</option>
                  <option value="pdv">PDV Balcão</option>
                  <option value="pedidos_venda">Pedido de Venda</option>
                  <option value="externa_celular">Venda Celular / Mobile</option>
                  <option value="ecommerce">E-commerce / Loja</option>
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-slate-500 font-medium mb-1">Status:</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium"
                >
                  <option value="todos">Todos os Status</option>
                  <option value="concluido">Concluído</option>
                  <option value="aberto">Aberto</option>
                  <option value="convertido_em_venda">Convertido em Venda</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>

              {/* Vendedor */}
              <div>
                <label className="block text-slate-500 font-medium mb-1">Vendedor:</label>
                <select
                  value={filterSeller}
                  onChange={(e) => setFilterSeller(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium"
                >
                  <option value="todos">Todos os Vendedores</option>
                  {dbState.users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Cliente */}
              <div>
                <label className="block text-slate-500 font-medium mb-1">Cliente:</label>
                <input
                  type="text"
                  placeholder="Nome do cliente..."
                  value={searchCustomer}
                  onChange={(e) => setSearchCustomer(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium"
                />
              </div>

              {/* Data Início */}
              <div>
                <label className="block text-slate-500 font-medium mb-1">A partir de:</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium"
                />
              </div>
            </div>
          </div>

          {/* Tabela de Pedidos do Histórico */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px]">
                  <tr>
                    <th className="py-3 px-3">Número</th>
                    <th className="py-3 px-3">Data / Hora</th>
                    <th className="py-3 px-3">Tipo / Origem</th>
                    <th className="py-3 px-3">Cliente</th>
                    <th className="py-3 px-3">Vendedor</th>
                    <th className="py-3 px-3">Forma Pagto</th>
                    <th className="py-3 px-3 text-right">Total</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-3 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        Nenhum pedido ou orçamento encontrado com os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((ord) => (
                      <tr key={ord.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-blue-700">
                          {ord.number}
                        </td>
                        <td className="py-3 px-3 text-slate-500">
                          {new Date(ord.createdAt).toLocaleDateString('pt-BR')} {new Date(ord.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-800 capitalize">{ord.type}</span>
                            <span className="text-[10px] text-slate-400">
                              {ord.origin === 'pdv'
                                ? 'PDV Balcão'
                                : ord.origin === 'pedidos_venda'
                                ? 'Pedido Venda'
                                : ord.origin === 'externa_celular'
                                ? 'Venda Celular'
                                : ord.origin}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-800">
                          {ord.customerName}
                        </td>
                        <td className="py-3 px-3 text-slate-600">
                          {ord.userName}
                        </td>
                        <td className="py-3 px-3 capitalize text-slate-600">
                          {ord.paymentMethod} {ord.installmentsCount > 1 ? `(${ord.installmentsCount}x)` : ''}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 text-sm">
                          {formatCurrency(ord.total)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {getStatusBadge(ord.status)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {/* Ver Detalhes */}
                            <button
                              type="button"
                              onClick={() => setViewDetailsOrder(ord)}
                              className="p-1 hover:bg-slate-100 text-slate-600 rounded transition-colors"
                              title="Visualizar Detalhes"
                            >
                              <Eye size={15} />
                            </button>

                            {/* Editar Pedido */}
                            {ord.status !== 'cancelado' && (
                              <button
                                type="button"
                                onClick={() => setEditingOrder(ord)}
                                className="p-1 hover:bg-amber-50 text-amber-600 rounded transition-colors"
                                title="Editar Pedido"
                              >
                                <Pencil size={15} />
                              </button>
                            )}

                            {/* Converter Orçamento em Venda */}
                            {ord.type === 'orcamento' && ord.status === 'aberto' && (
                              <button
                                type="button"
                                onClick={() => handleConvertQuoteToSale(ord)}
                                className="p-1 hover:bg-emerald-50 text-emerald-600 rounded transition-colors"
                                title="Converter em Venda (Baixar Estoque e Gerar Financeiro)"
                              >
                                <ArrowRightCircle size={15} />
                              </button>
                            )}

                            {/* Reimprimir Comprovante / Enviar WhatsApp */}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedOrder(ord);
                                setShowReceiptModal(true);
                              }}
                              className="p-1 hover:bg-blue-50 text-blue-600 rounded transition-colors"
                              title="Reimprimir Comprovante / WhatsApp"
                            >
                              <Printer size={15} />
                            </button>

                            {/* Cancelar Pedido */}
                            {ord.status !== 'cancelado' && (
                              <button
                                type="button"
                                onClick={() => handleCancelOrder(ord)}
                                className="p-1 hover:bg-rose-50 text-rose-600 rounded transition-colors"
                                title="Cancelar Pedido e Estornar Estoque"
                              >
                                <XCircle size={15} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CADASTRO RÁPIDO DE NOVO CLIENTE                                    */}
      {/* ========================================================================= */}
      {showQuickCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-5 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <UserPlus size={18} className="text-emerald-600" />
                <span>Novo Cliente no Pedido</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowQuickCustomerModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleQuickRegisterCustomer} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nome / Razão Social *</label>
                <input
                  type="text"
                  required
                  placeholder="Nome completo do cliente"
                  value={quickCustName}
                  onChange={(e) => setQuickCustName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-semibold text-slate-900 focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-emerald-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Telefone / WhatsApp</label>
                <input
                  type="text"
                  placeholder="(00) 00000-0000"
                  value={quickCustPhone}
                  onChange={(e) => setQuickCustPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-semibold text-slate-900 focus:outline-hidden focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">CPF ou CNPJ</label>
                <input
                  type="text"
                  placeholder="000.000.000-00"
                  value={quickCustCpfCnpj}
                  onChange={(e) => setQuickCustCpfCnpj(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-semibold text-slate-900 focus:outline-hidden focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Limite de Crédito Inicial (R$)</label>
                <input
                  type="number"
                  value={quickCustCreditLimit}
                  onChange={(e) => setQuickCustCreditLimit(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold text-slate-900 focus:outline-hidden focus:bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowQuickCustomerModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs cursor-pointer"
                >
                  Salvar e Selecionar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: AJUSTE (DESCONTO OU ACRÉSCIMO) POR ITEM NO PEDIDO                   */}
      {/* ========================================================================= */}
      {showItemDiscountModal && (() => {
        const target = cart.find((i) => i.productId === discountingItemId);
        if (!target) return null;
        const gross = target.quantity * target.unitPrice;
        const raw = parseFloat(itemDiscountInput.replace(',', '.')) || 0;
        let previewVal = 0;
        let previewPct = 0;
        if (itemDiscountType === 'percent') {
          previewPct = Math.max(0, raw);
          previewVal = (gross * previewPct) / 100;
        } else {
          previewVal = Math.max(0, raw);
          previewPct = gross > 0 ? (previewVal / gross) * 100 : 0;
        }
        const net = itemAdjustmentMode === 'desconto'
          ? Math.max(0, gross - previewVal)
          : gross + previewVal;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-sm w-full border border-slate-200 shadow-2xl p-5 space-y-3.5 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                  <Tag size={16} className={itemAdjustmentMode === 'acrescimo' ? 'text-blue-600' : 'text-amber-600'} />
                  <span>Ajuste no Produto ({itemAdjustmentMode === 'acrescimo' ? 'Acréscimo' : 'Desconto'})</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowItemDiscountModal(false)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <div className="font-bold text-slate-900">{target.description}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Bruto: {formatQuantity(target.quantity)} {target.unit} x {formatCurrency(target.unitPrice)} = <strong>{formatCurrency(gross)}</strong>
                </div>
              </div>

              {/* Seletor Desconto ou Acréscimo no mesmo campo */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="font-bold text-slate-700">Operação:</span>
                  <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setItemAdjustmentMode('desconto')}
                      className={`px-2.5 py-1 text-xs font-bold rounded cursor-pointer transition-all ${
                        itemAdjustmentMode === 'desconto' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      Desconto (-)
                    </button>
                    <button
                      type="button"
                      onClick={() => setItemAdjustmentMode('acrescimo')}
                      className={`px-2.5 py-1 text-xs font-bold rounded cursor-pointer transition-all ${
                        itemAdjustmentMode === 'acrescimo' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      Acréscimo (+)
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-slate-700">Tipo de Valor:</span>
                  <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setItemDiscountType('percent')}
                      className={`px-2 py-0.5 font-bold rounded ${
                        itemDiscountType === 'percent'
                          ? itemAdjustmentMode === 'acrescimo' ? 'bg-blue-600 text-white' : 'bg-amber-600 text-white'
                          : 'text-slate-600'
                      }`}
                    >
                      %
                    </button>
                    <button
                      type="button"
                      onClick={() => setItemDiscountType('value')}
                      className={`px-2 py-0.5 font-bold rounded ${
                        itemDiscountType === 'value'
                          ? itemAdjustmentMode === 'acrescimo' ? 'bg-blue-600 text-white' : 'bg-amber-600 text-white'
                          : 'text-slate-600'
                      }`}
                    >
                      R$
                    </button>
                  </div>
                </div>

                <input
                  type="text"
                  placeholder={itemDiscountType === 'percent' ? 'Ex: 10' : 'Ex: 15,00'}
                  value={itemDiscountInput}
                  onChange={(e) => setItemDiscountInput(e.target.value.replace(/[^0-9.,]/g, ''))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-black text-slate-900 text-right focus:outline-hidden focus:bg-white"
                  autoFocus
                />

                {itemAdjustmentMode === 'acrescimo' && (
                  <p className="text-[10px] text-blue-600 mt-1 italic">
                    * Informação de acréscimo não sairá na impressão do pedido (apenas preço final).
                  </p>
                )}
              </div>

              <div className="bg-slate-900 text-white p-2.5 rounded-xl font-mono space-y-1">
                <div className={`flex justify-between text-[11px] ${
                  itemAdjustmentMode === 'acrescimo' ? 'text-blue-400' : 'text-amber-400'
                }`}>
                  <span>{itemAdjustmentMode === 'acrescimo' ? 'Acréscimo:' : 'Desconto:'}</span>
                  <span>
                    {itemAdjustmentMode === 'acrescimo' ? '+' : '-'}
                    {formatCurrency(previewVal)} ({previewPct.toFixed(1).replace('.0', '')}%)
                  </span>
                </div>
                <div className="flex justify-between font-bold text-emerald-400 text-sm pt-1 border-t border-slate-800">
                  <span>Líquido do Item:</span>
                  <span>{formatCurrency(net)}</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowItemDiscountModal(false)}
                  className="px-3 py-1.5 text-slate-600 font-bold hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleApplyItemDiscount}
                  className={`px-4 py-1.5 text-white font-bold rounded-lg cursor-pointer transition-colors ${
                    itemAdjustmentMode === 'acrescimo' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-amber-600 hover:bg-amber-700'
                  }`}
                >
                  {itemAdjustmentMode === 'acrescimo' ? 'Aplicar Acréscimo' : 'Aplicar Desconto'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* MODAL: DETALHES DO PEDIDO DO HISTÓRICO                                    */}
      {/* ========================================================================= */}
      {viewDetailsOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl p-5 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Eye size={18} className="text-blue-600" />
                <h3 className="font-bold text-sm text-slate-900">
                  Detalhes do {viewDetailsOrder.type === 'venda' ? 'Pedido de Venda' : 'Orçamento'} {viewDetailsOrder.number}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setViewDetailsOrder(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Data</span>
                  <span className="font-bold text-slate-800">{new Date(viewDetailsOrder.createdAt).toLocaleString('pt-BR')}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Status</span>
                  <span>{getStatusBadge(viewDetailsOrder.status)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Vendedor</span>
                  <span className="font-bold text-slate-800">{viewDetailsOrder.userName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Pagamento</span>
                  <span className="font-bold text-slate-800 capitalize">{viewDetailsOrder.paymentMethod}</span>
                </div>
              </div>

              <div>
                <span className="font-bold text-slate-700 block mb-1">Cliente:</span>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex justify-between">
                  <span className="font-semibold text-slate-800">{viewDetailsOrder.customerName}</span>
                  <span className="text-slate-500">{viewDetailsOrder.customerPhone || 'Sem telefone'}</span>
                </div>
              </div>

              <div>
                <span className="font-bold text-slate-700 block mb-1">Itens ({viewDetailsOrder.items.length}):</span>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="py-2 px-3">Código</th>
                        <th className="py-2 px-3">Descrição</th>
                        <th className="py-2 px-3 text-center">Qtd</th>
                        <th className="py-2 px-3 text-right">Unitário</th>
                        <th className="py-2 px-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {viewDetailsOrder.items.map((i, idx) => (
                        <tr key={idx}>
                          <td className="py-2 px-3 font-mono text-blue-700 font-bold">{i.productCode}</td>
                          <td className="py-2 px-3">{i.description}</td>
                          <td className="py-2 px-3 text-center font-bold">{formatQuantity(i.quantity)} {i.unit}</td>
                          <td className="py-2 px-3 text-right font-mono">{formatCurrency(i.unitPrice)}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold">{formatCurrency(i.totalPrice)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-slate-900 text-white p-3 rounded-xl font-mono text-xs space-y-1">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(viewDetailsOrder.subtotal)}</span>
                </div>
                {viewDetailsOrder.discountTotal > 0 && (
                  <div className="flex justify-between text-rose-400">
                    <span>Desconto Total:</span>
                    <span>-{formatCurrency(viewDetailsOrder.discountTotal)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-emerald-400 pt-1 border-t border-slate-800">
                  <span>TOTAL:</span>
                  <span>{formatCurrency(viewDetailsOrder.total)}</span>
                </div>
              </div>

              {viewDetailsOrder.notes && (
                <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-900">
                  <span className="font-bold block text-[11px] mb-0.5">Observações:</span>
                  <p className="text-xs">{viewDetailsOrder.notes}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setSelectedOrder(viewDetailsOrder);
                  setShowReceiptModal(true);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer"
              >
                <Printer size={14} />
                <span>Reimprimir / WhatsApp</span>
              </button>
              <button
                type="button"
                onClick={() => setViewDetailsOrder(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDIÇÃO DE PEDIDO */}
      {editingOrder && (
        <EditOrderModal
          isOpen={!!editingOrder}
          order={editingOrder}
          onClose={() => setEditingOrder(null)}
          onSaved={(updated) => {
            setDbState({ ...Database.getState() });
            if (viewDetailsOrder?.id === updated.id) {
              setViewDetailsOrder(updated);
            }
          }}
        />
      )}

      {/* MODAL: COMPROVANTE TÉRMICO / WHATSAPP */}
      {selectedOrder && (
        <ReceiptModal
          order={selectedOrder}
          company={currentCompany}
          isOpen={showReceiptModal}
          onClose={() => setShowReceiptModal(false)}
        />
      )}
    </div>
  );
};
