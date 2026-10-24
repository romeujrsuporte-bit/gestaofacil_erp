import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Search,
  Plus,
  Minus,
  Trash2,
  Send,
  UserPlus,
  FileCheck,
  CheckCircle,
  Share2,
  Wifi,
  WifiOff,
  ShoppingBag,
  Clock,
  ChevronRight,
  Filter,
  Check,
  AlertCircle,
  AlertTriangle,
  Users,
  DollarSign,
  TrendingUp,
  CreditCard,
  MessageCircle,
  Calendar,
  CheckCircle2,
  ShieldAlert,
  ArrowRight,
  Eye,
  EyeOff,
  FileText,
  User,
  Sparkles,
  Phone,
  X,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Receipt,
  ArrowUpDown,
  Barcode,
  Warehouse,
  Tag,
  Boxes,
} from 'lucide-react';
import { Database } from '../../services/db';
import { Product, Customer, Order, OrderItem } from '../../types';
import { StockEngine } from '../../services/stockEngine';
import { formatCurrency, formatQuantity } from '../../services/pricingEngine';
import { ReceiptModal } from '../common/ReceiptModal';
import { SaleConfirmationModal } from '../common/SaleConfirmationModal';
import { toast } from '../../services/toast';

export const ExternalSalesView: React.FC = () => {
  const [dbState, setDbState] = useState(Database.getState());
  const currentCompany = Database.getCurrentCompany();
  const currentUser = Database.getCurrentUser();

  useEffect(() => {
    return Database.subscribe(() => {
      setDbState({ ...Database.getState() });
    });
  }, []);

  // Modos de visualização na tela do celular: INICIA NO 'historico' (conforme solicitado pelo usuário)
  const [activeTab, setActiveTab] = useState<'historico' | 'catalogo' | 'carrinho' | 'novo_cliente'>('historico');

  // Sub-aba dentro do Histórico: INICIA EM 'pedidos' (Histórico de Vendas dos Últimos Pedidos com Filtros)
  const [historySubTab, setHistorySubTab] = useState<'pedidos' | 'analise_financeira'>('pedidos');

  // Recurso para o usuário ocultar ou exibir o Alerta de Inadimplência no Vendas Mobile
  const [showOverdueAlert, setShowOverdueAlert] = useState<boolean>(() => {
    return localStorage.getItem('omni_mobile_hide_overdue_alert') !== 'true';
  });

  const toggleOverdueAlert = () => {
    setShowOverdueAlert((prev) => {
      const next = !prev;
      localStorage.setItem('omni_mobile_hide_overdue_alert', String(!next));
      return next;
    });
  };

  // Filtros da Lista de Histórico de Vendas dos Últimos Pedidos
  const [orderSearchTerm, setOrderSearchTerm] = useState('');
  const [orderTypeFilter, setOrderTypeFilter] = useState<'todos' | 'venda' | 'orcamento'>('todos');
  const [orderStatusFilter, setOrderStatusFilter] = useState<'todos' | 'concluido' | 'aberto' | 'cancelado'>('todos');
  const [orderPeriodFilter, setOrderPeriodFilter] = useState<'todos' | 'hoje' | 'mes_atual' | 'personalizado'>('hoje');
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [orderPaymentFilter, setOrderPaymentFilter] = useState<string>('todos');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  // Sub-aba de Análise de Clientes & Financeiro
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [clientFilter, setClientFilter] = useState<'todos' | 'vencidos' | 'em_dia' | 'top_compradores'>('todos');
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');

  // Tipo de documento: Pedido de Venda ou Orçamento
  const [docType, setDocType] = useState<'venda' | 'orcamento'>('venda');

  // Carrinho e Cliente
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');

  // Tipo de ajuste (Desconto ou Acréscimo), e unidade (% ou R$)
  const [globalAdjustmentMode, setGlobalAdjustmentMode] = useState<'desconto' | 'acrescimo'>('desconto');
  const [discountType, setDiscountType] = useState<'percent' | 'value'>(() => {
    return (localStorage.getItem('omni_discount_type') as 'percent' | 'value') || 'percent';
  });
  const [discountInput, setDiscountInput] = useState<string>('');

  const handleDiscountTypeChange = (newType: 'percent' | 'value') => {
    setDiscountType(newType);
    localStorage.setItem('omni_discount_type', newType);
  };

  // Modal de Ajuste (Desconto ou Acréscimo) no Item
  const [showItemAdjustmentModal, setShowItemAdjustmentModal] = useState<boolean>(false);
  const [adjustingItemId, setAdjustingItemId] = useState<string | null>(null);
  const [itemAdjustmentMode, setItemAdjustmentMode] = useState<'desconto' | 'acrescimo'>('desconto');
  const [itemAdjustmentType, setItemAdjustmentType] = useState<'percent' | 'value'>('percent');
  const [itemAdjustmentInput, setItemAdjustmentInput] = useState<string>('');

  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'dinheiro' | 'cartao_credito' | 'boleto'>('pix');
  const [paymentTerm, setPaymentTerm] = useState<string>('a_vista');
  const [showSaleConfirmationModal, setShowSaleConfirmationModal] = useState<boolean>(false);
  const [selectedBoletoAccountId, setSelectedBoletoAccountId] = useState<string>(() => {
    const boletoMethod = Database.getPaymentMethods().find((m) => m.type === 'boleto');
    if (boletoMethod?.defaultAccountId) return boletoMethod.defaultAccountId;
    const boletoAccs = Database.getBoletoAccounts();
    return boletoAccs[0]?.id || '';
  });
  const [installments, setInstallments] = useState<number>(1);
  const [selectedLocationId, setSelectedLocationId] = useState<string>(() => {
    const locs = Database.getState().stockLocations.filter((l) => l.status === 'ativo');
    const comercialLoc = locs.find(
      (l) => l.name.toLowerCase() === 'comercial' || l.type === 'comercial' || l.id === 'loc-comercial'
    );
    return comercialLoc?.id || locs[0]?.id || 'loc-comercial';
  });
  const [notes, setNotes] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Recibo/Compartilhamento
  const [finishedOrder, setFinishedOrder] = useState<Order | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // Formulário de Cadastro Rápido de Cliente
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientCpfCnpj, setNewClientCpfCnpj] = useState('');
  const [newClientCity, setNewClientCity] = useState('');

  // Monitorar conectividade
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Categorias únicas
  const categories = ['todos', ...Array.from(new Set(dbState.products.map((p) => p.family).filter(Boolean)))];

  // Produtos filtrados
  const filteredProducts = dbState.products.filter((p) => {
    const matchesSearch =
      searchTerm === '' ||
      p.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'todos' || p.family === selectedCategory;
    return p.status === 'ativo' && p.salePrice > 0 && matchesSearch && matchesCategory;
  });

  // Clientes
  const customers = dbState.customers.filter((c) => c.status === 'ativo');
  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  // Depósitos de Estoque (compartilhados entre todas as empresas)
  const locations = dbState.stockLocations.filter((l) => l.status === 'ativo');
  const selectedLocation = locations.find((l) => l.id === selectedLocationId) ||
    locations.find((l) => l.id === 'loc-comercial') ||
    locations[0] ||
    { id: 'loc-comercial', code: 'COM-01', name: 'Comercial', type: 'comercial', status: 'ativo', companyId: currentCompany.id };
  const selectedLocationName = selectedLocation?.name || 'Comercial';

  // Histórico de pedidos realizados exclusivamente no Vendas Mobile
  const myOrders = dbState.orders.filter(
    (o) =>
      o.companyId === currentCompany.id &&
      o.origin === 'externa_celular' &&
      (currentUser.role === 'admin' || o.userId === currentUser.id)
  );

  // ==========================================
  // RECURSO DE ANÁLISE COMPLETA DO HISTÓRICO DE VENDAS E FINANCEIRO DOS CLIENTES
  // ==========================================
  const todayIso = new Date().toISOString().split('T')[0];

  const customersAnalysis = customers.map((cust) => {
    // Pedidos do cliente realizados no Vendas Mobile
    const custOrders = dbState.orders.filter(
      (o) =>
        o.companyId === currentCompany.id &&
        o.origin === 'externa_celular' &&
        (o.customerId === cust.id || o.customerName === cust.name)
    );
    const validOrders = custOrders.filter((o) => o.type === 'venda' && o.status !== 'cancelado');
    const totalSpent = validOrders.reduce((s, o) => s + o.total, 0);
    const orderCount = validOrders.length;
    const avgTicket = orderCount > 0 ? totalSpent / orderCount : 0;

    const sortedOrders = [...custOrders].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    const lastOrder = sortedOrders[0];
    const lastPurchaseDate = lastOrder ? lastOrder.createdAt.split('T')[0] : null;

    // Contas a receber deste cliente
    const custReceivables = dbState.accountsReceivable.filter(
      (r) => r.companyId === currentCompany.id && (r.customerId === cust.id || r.customerName === cust.name)
    );
    const openReceivables = custReceivables.filter((r) => r.status === 'aberto');
    const overdueReceivables = openReceivables.filter((r) => r.dueDate < todayIso);
    const pendingFutureReceivables = openReceivables.filter((r) => r.dueDate >= todayIso);

    const totalOpenBalance = openReceivables.reduce((s, r) => s + r.balance, 0);
    const totalOverdueBalance = overdueReceivables.reduce((s, r) => s + r.balance, 0);
    const totalPendingFutureBalance = pendingFutureReceivables.reduce((s, r) => s + r.balance, 0);

    let maxDaysOverdue = 0;
    if (overdueReceivables.length > 0) {
      overdueReceivables.forEach((r) => {
        const diffMs = new Date(todayIso).getTime() - new Date(r.dueDate).getTime();
        const diffDays = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
        if (diffDays > maxDaysOverdue) maxDaysOverdue = diffDays;
      });
    }

    const hasOverdue = overdueReceivables.length > 0;
    const creditAvailable = Math.max(0, cust.creditLimit - totalOpenBalance);

    return {
      customer: cust,
      totalSpent,
      orderCount,
      avgTicket,
      lastPurchaseDate,
      custOrders: sortedOrders,
      openReceivables,
      overdueReceivables,
      pendingFutureReceivables,
      totalOpenBalance,
      totalOverdueBalance,
      totalPendingFutureBalance,
      hasOverdue,
      maxDaysOverdue,
      creditAvailable,
    };
  });

  // Métricas consolidadas
  const totalRevenueExternal = myOrders.filter((o) => o.type === 'venda').reduce((s, o) => s + o.total, 0);
  const totalOverdueExternal = customersAnalysis.reduce((s, c) => s + c.totalOverdueBalance, 0);
  const customersWithOverdue = customersAnalysis.filter((c) => c.hasOverdue);
  const customersInGoodStanding = customersAnalysis.filter((c) => !c.hasOverdue && c.totalSpent > 0);

  // Filtragem da lista de clientes na tela
  const filteredCustomersAnalysis = customersAnalysis
    .filter((item) => {
      const q = clientSearchTerm.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.customer.name.toLowerCase().includes(q) ||
        (item.customer.cpfCnpj && item.customer.cpfCnpj.includes(q)) ||
        (item.customer.phone && item.customer.phone.includes(q)) ||
        (item.customer.city && item.customer.city.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      if (clientFilter === 'vencidos') return item.hasOverdue;
      if (clientFilter === 'em_dia') return !item.hasOverdue;
      if (clientFilter === 'top_compradores') return item.totalSpent > 0;

      return true;
    })
    .sort((a, b) => {
      if (clientFilter === 'top_compradores') return b.totalSpent - a.totalSpent;
      if (clientFilter === 'vencidos') return b.totalOverdueBalance - a.totalOverdueBalance;
      // Padrão: prioriza os com débitos vencidos no topo para alertar o vendedor!
      if (a.hasOverdue && !b.hasOverdue) return -1;
      if (!a.hasOverdue && b.hasOverdue) return 1;
      return b.totalSpent - a.totalSpent;
    });

  // Ações Rápidas por Cliente
  const handleStartOrderForCustomer = (customerId: string) => {
    setSelectedCustomerId(customerId);
    setActiveTab('catalogo');
  };

  const handleSendWhatsAppNotice = (
    customerName: string,
    phone: string,
    overdueAmount: number,
    days: number,
    docNum?: string
  ) => {
    const cleanPhone = (phone || '').replace(/\D/g, '');
    const greeting = `Olá ${customerName}, tudo bem?`;
    let message = '';
    if (overdueAmount > 0) {
      message = `${greeting} Aqui é da ${currentCompany.tradeName || currentCompany.name}. Constatamos em aberto o título ${docNum ? `(${docNum})` : ''} no valor de ${formatCurrency(overdueAmount)} com vencimento há ${days} dia(s). Caso já tenha efetuado o pagamento, por favor nos envie o comprovante. Deseja que enviemos a 2ª via ou a chave Pix?`;
    } else {
      message = `${greeting} Aqui é da ${currentCompany.tradeName || currentCompany.name}. Estamos com condições especiais e pronta-entrega para o seu negócio! Gostaria de verificar reposição de estoque hoje?`;
    }
    const url = `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  // ==========================================
  // FILTRAGEM E MÉTRICAS DO HISTÓRICO DE VENDAS (ÚLTIMOS PEDIDOS)
  // ==========================================
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const filteredOrders = myOrders
    .filter((ord) => {
      // Busca textual
      if (orderSearchTerm.trim()) {
        const q = orderSearchTerm.toLowerCase().trim();
        const matchNumber = ord.number.toLowerCase().includes(q);
        const matchCustomer = ord.customerName.toLowerCase().includes(q);
        const matchPhone = (ord.customerPhone || '').includes(q);
        const matchItem = ord.items.some(
          (i) =>
            i.description.toLowerCase().includes(q) ||
            i.productCode.toLowerCase().includes(q)
        );
        if (!matchNumber && !matchCustomer && !matchPhone && !matchItem) return false;
      }

      // Tipo de documento
      if (orderTypeFilter !== 'todos' && ord.type !== orderTypeFilter) {
        return false;
      }

      // Status
      if (orderStatusFilter !== 'todos' && ord.status !== orderStatusFilter) {
        return false;
      }

      // Período
      const orderDate = (ord.createdAt || '').slice(0, 10);
      if (orderPeriodFilter === 'hoje') {
        if (orderDate !== todayStr) return false;
      } else if (orderPeriodFilter === 'mes_atual') {
        if (!orderDate.startsWith(currentMonthStr)) return false;
      } else if (orderPeriodFilter === 'personalizado') {
        const [start, end] =
          customStartDate && customEndDate && customStartDate > customEndDate
            ? [customEndDate, customStartDate]
            : [customStartDate, customEndDate];
        if (start && orderDate < start) return false;
        if (end && orderDate > end) return false;
      }

      // Forma de pagamento
      if (orderPaymentFilter !== 'todos' && ord.paymentMethod !== orderPaymentFilter) {
        return false;
      }

      return true;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Métricas dos pedidos filtrados
  const filteredSalesTotal = filteredOrders
    .filter((o) => o.type === 'venda' && o.status !== 'cancelado')
    .reduce((s, o) => s + o.total, 0);
  const filteredQuotesTotal = filteredOrders
    .filter((o) => o.type === 'orcamento')
    .reduce((s, o) => s + o.total, 0);
  const filteredSalesCount = filteredOrders.filter((o) => o.type === 'venda').length;
  const filteredQuotesCount = filteredOrders.filter((o) => o.type === 'orcamento').length;
  const avgFilteredTicket =
    filteredSalesCount > 0 ? filteredSalesTotal / filteredSalesCount : 0;

  const hasActiveOrderFilters =
    orderSearchTerm.trim() !== '' ||
    orderTypeFilter !== 'todos' ||
    orderStatusFilter !== 'todos' ||
    orderPeriodFilter !== 'hoje' ||
    orderPaymentFilter !== 'todos';

  const resetOrderFilters = () => {
    setOrderSearchTerm('');
    setOrderTypeFilter('todos');
    setOrderStatusFilter('todos');
    setOrderPeriodFilter('hoje');
    setOrderPaymentFilter('todos');
    const d = new Date();
    setCustomStartDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`);
    setCustomEndDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  };

  const handleSendOrderWhatsApp = (order: Order) => {
    const cleanPhone = (order.customerPhone || '').replace(/\D/g, '');
    const greeting = `Olá ${order.customerName}, tudo bem?`;
    const itemsList = order.items
      .map((i) => {
        const effUnit = (i.additionValue && i.additionValue > 0)
          ? ((i.totalPrice + (i.discountValue || 0)) / (i.quantity || 1))
          : i.unitPrice;
        return `• ${formatQuantity(i.quantity)} ${i.unit} - ${i.description} (${formatCurrency(effUnit)}${i.discountValue > 0 ? ` [desc. -${formatCurrency(i.discountValue)}]` : ''} = ${formatCurrency(i.totalPrice)})`;
      })
      .join('\n');
    const msg = `${greeting}\n\nAqui é da ${currentCompany.tradeName || currentCompany.name}.\nConfirmamos o seu pedido *${order.number}* (${order.type === 'orcamento' ? 'Orçamento' : 'Venda'}):\n\n${itemsList}\n\n*Total: ${formatCurrency(order.total)}*${order.discountTotal > 0 ? `\nDesconto Total: -${formatCurrency(order.discountTotal)}` : ''}\nForma de Pagto: ${order.paymentMethod.toUpperCase()}${order.installmentsCount > 1 ? ` (${order.installmentsCount}x)` : ''}\n\nObrigado pela preferência! Caso tenha alguma dúvida, estamos à disposição.`;
    const url = cleanPhone ? `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  // Adicionar ao carrinho
  const handleAddToCart = (product: Product) => {
    const totalStock = StockEngine.getTotalProductStock(dbState.stockBalances, product.id);
    const existing = cart.find((i) => i.productId === product.id);
    const currentQty = existing ? existing.quantity : 0;

    if (docType === 'venda' && totalStock.available <= currentQty) {
      alert(`Atenção: Saldo insuficiente de "${product.description}". Saldo disponível: ${totalStock.available}`);
      return;
    }

    if (existing) {
      setCart(
        cart.map((item) => {
          if (item.productId === product.id) {
            const newQty = item.quantity + 1;
            const gross = newQty * item.unitPrice;
            const disc = (gross * (item.discountPercent || 0)) / 100;
            const add = (gross * (item.additionPercent || 0)) / 100;
            return {
              ...item,
              quantity: newQty,
              discountValue: Math.round(disc * 100) / 100,
              additionValue: Math.round(add * 100) / 100,
              totalPrice: Math.round((gross + add - disc) * 100) / 100,
            };
          }
          return item;
        })
      );
    } else {
      const newItem: OrderItem = {
        id: 'ITM-' + Date.now(),
        productId: product.id,
        productCode: product.code,
        description: product.description,
        unit: product.unit,
        quantity: 1,
        unitPrice: product.salePrice,
        discountPercent: 0,
        discountValue: 0,
        additionPercent: 0,
        additionValue: 0,
        totalPrice: product.salePrice,
        unitCost: product.costPrice,
        locationId: selectedLocationId || product.defaultLocationId || 'loc-comercial',
        isMasterPack: product.isMasterPack,
        masterPackUnits: product.masterPackUnits,
        masterPackAssociatedProductId: product.masterPackAssociatedProductId,
        masterPackAssociatedProductCode: product.masterPackAssociatedProductCode,
      };
      setCart([...cart, newItem]);
    }
  };

  const handleUpdateQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.productId === productId) {
            const newQty = i.quantity + delta;
            if (newQty <= 0) return null;
            const gross = newQty * i.unitPrice;
            const disc = (gross * (i.discountPercent || 0)) / 100;
            const add = (gross * (i.additionPercent || 0)) / 100;
            return {
              ...i,
              quantity: newQty,
              discountValue: Math.round(disc * 100) / 100,
              additionValue: Math.round(add * 100) / 100,
              totalPrice: Math.round((gross + add - disc) * 100) / 100,
            };
          }
          return i;
        })
        .filter(Boolean) as OrderItem[]
    );
  };

  // Funções para Ajuste (Desconto ou Acréscimo) por Item
  const handleOpenItemAdjustment = (item: OrderItem) => {
    setAdjustingItemId(item.productId);
    if (item.additionValue && item.additionValue > 0) {
      setItemAdjustmentMode('acrescimo');
      if (item.additionPercent && item.additionPercent > 0) {
        setItemAdjustmentType('percent');
        setItemAdjustmentInput(item.additionPercent.toString().replace('.', ','));
      } else {
        setItemAdjustmentType('value');
        setItemAdjustmentInput(item.additionValue.toFixed(2).replace('.', ','));
      }
    } else if (item.discountValue > 0 || item.discountPercent > 0) {
      setItemAdjustmentMode('desconto');
      if (item.discountPercent > 0) {
        setItemAdjustmentType('percent');
        setItemAdjustmentInput(item.discountPercent.toString().replace('.', ','));
      } else {
        setItemAdjustmentType('value');
        setItemAdjustmentInput(item.discountValue.toFixed(2).replace('.', ','));
      }
    } else {
      setItemAdjustmentMode('desconto');
      setItemAdjustmentType('percent');
      setItemAdjustmentInput('');
    }
    setShowItemAdjustmentModal(true);
  };

  const handleApplyItemAdjustment = () => {
    if (!adjustingItemId) return;
    const target = cart.find((i) => i.productId === adjustingItemId);
    if (!target) return;

    const gross = target.quantity * target.unitPrice;
    const rawVal = parseFloat(itemAdjustmentInput.replace(',', '.')) || 0;
    const maxPercent = currentUser.permissions.maxDiscountPercent;

    let appliedDiscountPercent = 0;
    let appliedDiscountValue = 0;
    let appliedAdditionPercent = 0;
    let appliedAdditionValue = 0;

    if (rawVal <= 0) {
      // Zerado
    } else if (itemAdjustmentMode === 'desconto') {
      if (itemAdjustmentType === 'percent') {
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
      if (itemAdjustmentType === 'percent') {
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
        i.productId === adjustingItemId
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
    setShowItemAdjustmentModal(false);
  };

  const handleSaveQuickCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim() || !newClientPhone.trim()) {
      alert('Nome e Telefone são obrigatórios.');
      return;
    }

    const newCust: Customer = {
      id: 'CLI-' + Date.now(),
      companyId: currentCompany.id,
      code: 'CLI-' + String(dbState.customers.length + 1).padStart(4, '0'),
      name: newClientName.trim(),
      type: 'PF',
      cpfCnpj: newClientCpfCnpj.trim() || '000.000.000-00',
      phone: newClientPhone.trim(),
      whatsapp: newClientPhone.trim(),
      city: newClientCity.trim() || 'São Paulo',
      state: 'SP',
      creditLimit: 1500,
      status: 'ativo',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const s = Database.getState();
    s.customers.push(newCust);
    Database.persist();

    setSelectedCustomerId(newCust.id);
    setNewClientName('');
    setNewClientPhone('');
    setNewClientCpfCnpj('');
    setNewClientCity('');
    setActiveTab('carrinho');
    toast.success(`Cliente "${newCust.name}" cadastrado com sucesso!`, 'Cliente Salvo');
  };

  // Pré-finalizar Pedido ou Orçamento Mobile (Validação de campos obrigatórios e abertura da tela de confirmação)
  const handlePreFinalizeExternalOrder = () => {
    if (cart.length === 0) {
      alert('Adicione itens antes de finalizar.');
      return;
    }
    if (!selectedCustomerId) {
      alert('Selecione ou cadastre um cliente para o pedido externo.');
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

  // Finalizar Pedido ou Orçamento Mobile (após confirmação na tela)
  const handleFinalizeExternalOrder = () => {
    setShowSaleConfirmationModal(false);

    if (cart.length === 0) {
      alert('Adicione itens antes de finalizar.');
      return;
    }
    if (!selectedCustomerId) {
      alert('Selecione ou cadastre um cliente para o pedido externo.');
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

    const subtotal = cart.reduce((s, i) => s + i.totalPrice, 0);
    const itemDiscounts = cart.reduce((s, i) => s + (i.discountValue || 0), 0);
    const itemAdditions = cart.reduce((s, i) => s + (i.additionValue || 0), 0);

    const parsedDiscountNum = Math.max(0, parseFloat(discountInput.replace(',', '.')) || 0);
    const maxAllowedDiscountPercent = currentUser.permissions.maxDiscountPercent;

    let discountVal = 0;
    let additionVal = 0;

    if (globalAdjustmentMode === 'desconto') {
      if (discountType === 'percent') {
        const safePercent = Math.min(maxAllowedDiscountPercent, parsedDiscountNum);
        discountVal = (subtotal * safePercent) / 100;
      } else {
        const maxVal = (subtotal * maxAllowedDiscountPercent) / 100;
        discountVal = Math.min(subtotal, Math.min(maxVal, parsedDiscountNum));
      }
    } else {
      // Acréscimo
      if (discountType === 'percent') {
        additionVal = (subtotal * parsedDiscountNum) / 100;
      } else {
        additionVal = parsedDiscountNum;
      }
    }

    const total = Math.max(0, subtotal + additionVal - discountVal);

    const prefix = docType === 'orcamento' ? 'ORC' : 'PED';
    const orderNumber = `${prefix}-EXT-${new Date().getFullYear()}-${String(dbState.orders.length + 1).padStart(4, '0')}`;
    const nowIso = new Date().toISOString();

    try {
      let currentBalances = [...dbState.stockBalances];
      const movements = [];

      if (docType === 'venda') {
        for (const item of cart) {
          const { updatedBalances, createdMovement } = StockEngine.applyMovement(currentBalances, {
            companyId: currentCompany.id,
            productId: item.productId,
            productCode: item.productCode,
            productDescription: item.description,
            locationId: item.locationId || selectedLocationId || 'loc-comercial',
            locationName: selectedLocationName || 'Comercial',
            type: 'saida_venda',
            quantity: item.quantity,
            unitCost: item.unitCost,
            totalCost: item.unitCost * item.quantity,
            originDocType: 'venda',
            originDocId: orderNumber,
            date: nowIso,
            userId: currentUser.id,
            userName: currentUser.name,
            notes: `Venda Externa Mobile ${orderNumber}`,
          });
          currentBalances = updatedBalances;
          movements.push(createdMovement);
        }
      }

      const boletoAccounts = Database.getBoletoAccounts(currentCompany.id);
      const targetBoletoAccount = paymentMethod === 'boleto'
        ? boletoAccounts.find((a) => a.id === selectedBoletoAccountId) || boletoAccounts[0] || Database.getBoletoAccounts()[0]
        : undefined;

      const newOrder: Order = {
        id: 'ORD-' + Date.now(),
        number: orderNumber,
        type: docType,
        origin: 'externa_celular',
        companyId: currentCompany.id,
        customerId: selectedCustomerId,
        customerName: selectedCustomer ? selectedCustomer.name : 'Cliente Externo',
        customerPhone: selectedCustomer ? selectedCustomer.phone : '',
        userId: currentUser.id,
        userName: currentUser.name,
        items: cart,
        subtotal: cart.reduce((s, itm) => {
          const effUnit = (itm.additionValue && itm.additionValue > 0)
            ? ((itm.totalPrice + (itm.discountValue || 0)) / (itm.quantity || 1))
            : itm.unitPrice;
          return s + (effUnit * itm.quantity);
        }, 0) + additionVal,
        discountTotal: discountVal + itemDiscounts,
        total,
        paymentMethod,
        bankAccountId: targetBoletoAccount?.id,
        bankAccountName: targetBoletoAccount?.name,
        installmentsCount: installments,
        receivedAmount: docType === 'venda' && (paymentMethod === 'pix' || paymentMethod === 'dinheiro') ? total : 0,
        changeAmount: 0,
        status: docType === 'orcamento' ? 'aberto' : 'concluido',
        validityDate:
          docType === 'orcamento' ? new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0] : undefined,
        notes: (notes ? `${notes} | ` : '') + `Prazo: ${paymentTerm.replace(/_/g, ' ').toUpperCase()}${installments > 1 ? ` (${installments}x)` : ''}`,
        stockDeducted: docType === 'venda',
        financialGenerated: docType === 'venda',
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      let updatedReceivables = [...dbState.accountsReceivable];
      if (docType === 'venda' && (paymentMethod === 'boleto' || installments > 1)) {
        const valParcela = Number((total / installments).toFixed(2));
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

      const state = Database.getState();
      state.stockBalances = currentBalances;
      state.stockMovements = [...movements, ...state.stockMovements];
      state.orders = [newOrder, ...state.orders];
      state.accountsReceivable = updatedReceivables;
      Database.persist();

      Database.addAuditLog(
        'PEDIDO_EXTERNO_EMITIDO',
        'VENDAS_EXTERNAS',
        newOrder.id,
        `${docType === 'orcamento' ? 'Orçamento' : 'Venda'} ${orderNumber} criada por ${currentUser.name} para ${newOrder.customerName}. Total: ${formatCurrency(total)}`
      );

      toast.success(
        `${docType === 'orcamento' ? 'Orçamento' : 'Venda'} ${orderNumber} emitido com sucesso!`,
        'Documento Emitido'
      );

      setFinishedOrder(newOrder);
      setShowReceiptModal(true);
      setCart([]);
      setDiscountInput('');
      setNotes('');
      setActiveTab('historico');
    } catch (e) {
      alert('Erro ao finalizar pedido: ' + (e as Error).message);
    }
  };

  const grossSubtotal = cart.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const totalItemDiscounts = cart.reduce((s, i) => s + (i.discountValue || 0), 0);
  const totalItemAdditions = cart.reduce((s, i) => s + (i.additionValue || 0), 0);
  const cartSubtotal = cart.reduce((s, i) => s + i.totalPrice, 0);

  const parsedCartAdjustmentNum = Math.max(0, parseFloat(discountInput.replace(',', '.')) || 0);
  const maxAllowedCartDiscountPercent = currentUser.permissions.maxDiscountPercent;

  let cartGlobalDiscount = 0;
  let cartGlobalAddition = 0;

  if (globalAdjustmentMode === 'desconto') {
    if (discountType === 'percent') {
      const safePercent = Math.min(maxAllowedCartDiscountPercent, parsedCartAdjustmentNum);
      cartGlobalDiscount = (cartSubtotal * safePercent) / 100;
    } else {
      const maxAllowedVal = (cartSubtotal * maxAllowedCartDiscountPercent) / 100;
      cartGlobalDiscount = Math.min(cartSubtotal, Math.min(maxAllowedVal, parsedCartAdjustmentNum));
    }
  } else {
    // Acréscimo
    if (discountType === 'percent') {
      cartGlobalAddition = (cartSubtotal * parsedCartAdjustmentNum) / 100;
    } else {
      cartGlobalAddition = parsedCartAdjustmentNum;
    }
  }

  const combinedCartDiscounts = totalItemDiscounts + cartGlobalDiscount;
  const cartTotal = Math.max(0, cartSubtotal + cartGlobalAddition - cartGlobalDiscount);

  return (
    <div className="max-w-3xl mx-auto space-y-4 pb-20 px-1 sm:px-0">
      {/* BANNER SUPERIOR ESTILO APP MOBILE - TEMA VERDE E PRETO ELEGANTE */}
      <div className="bg-gradient-to-r from-slate-950 via-zinc-900 to-slate-950 rounded-2xl p-4 sm:p-5 text-white shadow-lg border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600/25 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shadow-xs shrink-0">
              <Smartphone size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                  Vendas Mobile
                </h2>
                <span className="text-xs font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Campo & Rua
                </span>
              </div>
              <div className="text-xs sm:text-sm text-slate-300 flex items-center gap-2 mt-1 flex-wrap">
                <span>Vendedor: <strong>{currentUser.name.split(' ')[0]}</strong></span>
                <span className="text-slate-600">•</span>
                <span className="flex items-center gap-1.5 text-xs bg-slate-800/90 px-2.5 py-1 rounded-full border border-slate-700">
                  {isOnline ? <Wifi size={14} className="text-emerald-400" /> : <WifiOff size={14} className="text-rose-400" />}
                  <span className={isOnline ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                    {isOnline ? 'Sincronizado' : 'Offline'}
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Alternador Venda vs Orçamento */}
          <div className="flex items-center gap-1.5 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 self-stretch sm:self-auto justify-center">
            <button
              type="button"
              onClick={() => setDocType('venda')}
              className={`flex-1 sm:flex-initial text-xs sm:text-sm font-black px-4 py-2.5 rounded-xl transition-all cursor-pointer ${
                docType === 'venda'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Venda
            </button>
            <button
              type="button"
              onClick={() => setDocType('orcamento')}
              className={`flex-1 sm:flex-initial text-xs sm:text-sm font-black px-4 py-2.5 rounded-xl transition-all cursor-pointer ${
                docType === 'orcamento'
                  ? 'bg-slate-800 text-emerald-400 border border-emerald-500/40 shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Orçamento
            </button>
          </div>
        </div>
      </div>

      {/* BARRA DE NAVEGAÇÃO POR ABAS MOBILE (INICIA NO HISTÓRICO) */}
      <div className="grid grid-cols-4 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-xs gap-1.5">
        <button
          type="button"
          onClick={() => setActiveTab('historico')}
          className={`py-3 px-1 sm:px-2 rounded-xl transition-all flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 cursor-pointer relative ${
            activeTab === 'historico'
              ? 'bg-slate-950 text-emerald-400 border border-emerald-500/30 shadow-xs font-black'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-bold'
          }`}
        >
          <Clock size={18} />
          <span className="text-xs sm:text-sm truncate">Histórico</span>
          {customersWithOverdue.length > 0 && (
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse absolute top-1.5 right-1.5 sm:static sm:w-2 sm:h-2" title="Clientes com débitos vencidos" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('catalogo')}
          className={`py-3 px-1 sm:px-2 rounded-xl transition-all flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 cursor-pointer ${
            activeTab === 'catalogo'
              ? 'bg-emerald-600 text-white shadow-xs font-black'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-bold'
          }`}
        >
          <ShoppingBag size={18} />
          <span className="text-xs sm:text-sm truncate">Produtos</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('carrinho')}
          className={`py-3 px-1 sm:px-2 rounded-xl transition-all flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 relative cursor-pointer ${
            activeTab === 'carrinho'
              ? 'bg-emerald-600 text-white shadow-xs font-black'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-bold'
          }`}
        >
          <CheckCircle size={18} />
          <span className="text-xs sm:text-sm truncate">Pedido</span>
          {cart.length > 0 && (
            <span className="absolute -top-1 -right-1 sm:static sm:ml-1 w-5 h-5 bg-slate-950 text-emerald-400 border border-emerald-400 text-xs font-black rounded-full flex items-center justify-center shadow-xs">
              {cart.reduce((s, i) => s + i.quantity, 0)}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('novo_cliente')}
          className={`py-3 px-1 sm:px-2 rounded-xl transition-all flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 cursor-pointer ${
            activeTab === 'novo_cliente'
              ? 'bg-emerald-600 text-white shadow-xs font-black'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-bold'
          }`}
        >
          <UserPlus size={18} />
          <span className="text-xs sm:text-sm truncate">+ Cliente</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* ABA PRINCIPAL 1: HISTÓRICO & ANÁLISE DE VENDAS E FINANCEIRO DOS CLIENTES  */}
      {/* ========================================================================= */}
      {activeTab === 'historico' && (
        <div className="space-y-4">
          {/* ALERTA DE INADIMPLÊNCIA COM RECURSO DE OCULTAR / EXIBIR */}
          {customersWithOverdue.length > 0 ? (
            showOverdueAlert ? (
              <div className="bg-gradient-to-r from-slate-950 via-rose-950/40 to-slate-900 text-white p-4 sm:p-5 rounded-2xl border-2 border-rose-500/60 shadow-md space-y-3 transition-all">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs animate-pulse">
                      <AlertTriangle size={22} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-black uppercase bg-rose-500/20 text-rose-300 px-2.5 py-0.5 rounded-full border border-rose-500/30">
                          Alerta de Inadimplência
                        </span>
                        <span className="text-xs sm:text-sm font-bold text-rose-200">
                          {customersWithOverdue.length} cliente(s) com parcelas vencidas
                        </span>
                      </div>
                      <h4 className="text-sm sm:text-base font-black text-white mt-1">
                        Total em Atraso: <span className="text-rose-400 font-mono">{formatCurrency(totalOverdueExternal)}</span>
                      </h4>
                    </div>
                  </div>

                  {/* Botão de Fechar / Ocultar Alerta */}
                  <button
                    type="button"
                    onClick={toggleOverdueAlert}
                    className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
                    title="Ocultar Alerta de Inadimplência"
                  >
                    <X size={18} />
                  </button>
                </div>

                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Atenção antes de emitir novos pedidos faturados ou liberar limite de crédito. Utilize a Análise Financeira para verificar parcelas e negociar via WhatsApp.
                </p>

                <div className="flex items-center justify-between pt-2 border-t border-rose-500/20 gap-2.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      setHistorySubTab('analise_financeira');
                      setClientFilter('vencidos');
                    }}
                    className="inline-flex items-center gap-2 text-xs sm:text-sm font-black text-rose-300 hover:text-white bg-rose-950/70 hover:bg-rose-900 px-3.5 py-2.5 rounded-xl border border-rose-500/40 transition-colors cursor-pointer"
                  >
                    <ShieldAlert size={16} />
                    <span>Ver Clientes Inadimplentes ({customersWithOverdue.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={toggleOverdueAlert}
                    className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-400 hover:text-slate-200 transition-colors cursor-pointer ml-auto py-1.5"
                  >
                    <EyeOff size={15} />
                    <span>Ocultar Alerta</span>
                  </button>
                </div>
              </div>
            ) : (
              /* BARRA COMPACTA QUANDO O ALERTA ESTÁ OCULTO */
              <div className="bg-gradient-to-r from-slate-950 via-zinc-900 to-slate-950 p-3 sm:px-4 rounded-2xl border border-rose-500/40 shadow-xs flex items-center justify-between gap-2.5 text-white">
                <div className="flex items-center gap-2 text-xs sm:text-sm flex-wrap">
                  <AlertTriangle size={16} className="text-rose-400 shrink-0 animate-pulse" />
                  <span className="font-extrabold text-rose-300">Alerta de Inadimplência:</span>
                  <span className="text-slate-300">
                    {customersWithOverdue.length} cliente(s) com parcelas vencidas
                  </span>
                  <span className="font-mono font-black text-rose-400">
                    ({formatCurrency(totalOverdueExternal)})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={toggleOverdueAlert}
                  className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-black bg-rose-600/30 hover:bg-rose-600/50 text-rose-200 hover:text-white px-3 py-1.5 rounded-xl border border-rose-500/40 transition-colors cursor-pointer shrink-0"
                >
                  <Eye size={15} />
                  <span>Exibir Alerta</span>
                </button>
              </div>
            )
          ) : (
            <div className="bg-emerald-950/20 border border-emerald-500/30 text-emerald-900 p-3.5 sm:p-4 rounded-2xl flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5 text-xs sm:text-sm">
                <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                <span className="font-extrabold text-emerald-950">Carteira 100% em Dia:</span>
                <span className="text-emerald-800 text-xs sm:text-sm font-medium">Nenhum cliente com parcelas vencidas no momento.</span>
              </div>
            </div>
          )}

          {/* Seletor de Sub-Aba dentro do Histórico */}
          <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 text-xs sm:text-sm font-black gap-1.5">
            <button
              type="button"
              onClick={() => setHistorySubTab('pedidos')}
              className={`flex-1 py-3 px-2 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                historySubTab === 'pedidos'
                  ? 'bg-slate-950 text-emerald-400 shadow-xs border border-emerald-500/30 font-black'
                  : 'text-slate-600 hover:text-slate-900 font-bold'
              }`}
            >
              <Clock size={16} className={historySubTab === 'pedidos' ? 'text-emerald-400' : 'text-slate-500'} />
              <span>Histórico de Pedidos ({myOrders.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setHistorySubTab('analise_financeira')}
              className={`flex-1 py-3 px-2 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                historySubTab === 'analise_financeira'
                  ? 'bg-slate-950 text-emerald-400 shadow-xs border border-emerald-500/30 font-black'
                  : 'text-slate-600 hover:text-slate-900 font-bold'
              }`}
            >
              <TrendingUp size={16} className={historySubTab === 'analise_financeira' ? 'text-emerald-400' : 'text-emerald-600'} />
              <span>
                <span className="hidden sm:inline">Análise de Clientes & Financeiro</span>
                <span className="sm:hidden">Análise Financeira</span>
              </span>
              {customersWithOverdue.length > 0 && (
                <span className="px-2 py-0.5 bg-rose-600 text-white text-xs rounded-full font-mono font-black">
                  {customersWithOverdue.length}
                </span>
              )}
            </button>
          </div>

          {/* ========================================================================= */}
          {/* SUB-ABA 1: HISTÓRICO DE VENDAS DOS ÚLTIMOS PEDIDOS COM FILTROS COMPLETOS   */}
          {/* ========================================================================= */}
          {historySubTab === 'pedidos' && (
            <div className="space-y-3.5">
              {/* Cabeçalho da Seção de Pedidos */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h3 className="font-black text-sm sm:text-base text-slate-900 flex items-center gap-2 flex-wrap">
                    <span>Histórico de Vendas dos Últimos Pedidos</span>
                    <span className="text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full font-extrabold">
                      {filteredOrders.length} {filteredOrders.length === 1 ? 'pedido' : 'pedidos'}
                    </span>
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1">
                    Consulte, filtre e compartilhe comprovantes de vendas e orçamentos externos
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('catalogo')}
                  className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-black shadow-xs transition-colors cursor-pointer"
                >
                  <Plus size={16} />
                  <span>+ Novo Pedido</span>
                </button>
              </div>

              {/* Barra de Filtros Completos dos Pedidos */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3.5">
                {/* Campo de Busca Textual */}
                <div className="relative">
                  <Search size={18} className="absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar por nº pedido, cliente, telefone ou produto..."
                    value={orderSearchTerm}
                    onChange={(e) => setOrderSearchTerm(e.target.value)}
                    className="w-full pl-11 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm sm:text-base font-medium text-slate-800 focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                  />
                  {orderSearchTerm && (
                    <button
                      type="button"
                      onClick={() => setOrderSearchTerm('')}
                      className="absolute right-3 top-3 p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>

                {/* Filtros por Tipo de Documento */}
                <div className="space-y-1.5">
                  <span className="text-xs font-extrabold uppercase text-slate-500 block">Tipo de Documento:</span>
                  <div className="flex gap-2 overflow-x-auto pb-1 text-xs sm:text-sm">
                    {[
                      { id: 'todos', label: `Todos (${myOrders.length})` },
                      { id: 'venda', label: `🛒 Vendas (${myOrders.filter((o) => o.type === 'venda').length})` },
                      { id: 'orcamento', label: `📝 Orçamentos (${myOrders.filter((o) => o.type === 'orcamento').length})` },
                    ].map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setOrderTypeFilter(f.id as any)}
                        className={`px-3.5 py-2.5 rounded-xl font-black whitespace-nowrap text-xs sm:text-sm transition-all cursor-pointer ${
                          orderTypeFilter === f.id
                            ? 'bg-slate-950 text-emerald-400 border border-emerald-500/30 shadow-xs'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Linha de Filtros: Período e Status */}
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-extrabold uppercase text-slate-500 block">Período:</label>
                      {orderPeriodFilter === 'mes_atual' && (
                        <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold">
                          Mês Atual ({new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })})
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs sm:text-sm">
                      {[
                        { id: 'hoje', label: 'Hoje' },
                        { id: 'mes_atual', label: 'Mês Atual' },
                        { id: 'personalizado', label: 'Personalizado' },
                        { id: 'todos', label: 'Todos' },
                      ].map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setOrderPeriodFilter(p.id as any)}
                          className={`px-3 py-2.5 rounded-xl text-center text-xs sm:text-sm font-extrabold transition-all cursor-pointer truncate ${
                            orderPeriodFilter === p.id
                              ? 'bg-emerald-600 text-white shadow-2xs'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>

                    {/* Bloco de Pesquisa Personalizada */}
                    {orderPeriodFilter === 'personalizado' && (
                      <div className="mt-2.5 p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                            <Calendar size={15} className="text-emerald-600" />
                            Intervalo de Datas
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div>
                            <label className="text-xs font-bold uppercase text-slate-600 block mb-1">
                              Data Inicial:
                            </label>
                            <input
                              type="date"
                              value={customStartDate}
                              onChange={(e) => setCustomStartDate(e.target.value)}
                              className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-bold uppercase text-slate-600 block mb-1">
                              Data Final:
                            </label>
                            <input
                              type="date"
                              value={customEndDate}
                              onChange={(e) => setCustomEndDate(e.target.value)}
                              className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-extrabold uppercase text-slate-500 block mb-1.5">Status:</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs sm:text-sm">
                      {[
                        { id: 'todos', label: 'Todos' },
                        { id: 'concluido', label: 'Concluído' },
                        { id: 'aberto', label: 'Aberto' },
                        { id: 'cancelado', label: 'Cancelado' },
                      ].map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setOrderStatusFilter(s.id as any)}
                          className={`px-3 py-2.5 rounded-xl text-center text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
                            orderStatusFilter === s.id
                              ? 'bg-emerald-600 text-white shadow-2xs'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-extrabold uppercase text-slate-500 block mb-1.5">Forma de Pagto:</label>
                    <div className="flex gap-1.5 overflow-x-auto pb-0.5 text-xs sm:text-sm">
                      {[
                        { id: 'todos', label: 'Todas' },
                        { id: 'boleto', label: 'Boleto' },
                        { id: 'pix', label: 'Pix' },
                        { id: 'dinheiro', label: 'Dinheiro' },
                        { id: 'cartao_credito', label: 'Cartão' },
                      ].map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setOrderPaymentFilter(m.id)}
                          className={`px-3.5 py-2.5 rounded-xl text-center text-xs sm:text-sm font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                            orderPaymentFilter === m.id
                              ? 'bg-emerald-600 text-white shadow-2xs'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Botão de Limpar Filtros quando ativo */}
                {hasActiveOrderFilters && (
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={resetOrderFilters}
                      className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-rose-600 hover:text-rose-800 hover:underline cursor-pointer py-1"
                    >
                      <RotateCcw size={14} />
                      <span>Limpar Filtros</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Indicadores Consolidados dos Pedidos Filtrados */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
                  <span className="text-xs font-bold uppercase text-slate-500 block truncate">
                    {orderPeriodFilter === 'mes_atual'
                      ? 'Pedidos do Mês'
                      : orderPeriodFilter === 'hoje'
                      ? 'Pedidos Hoje'
                      : orderPeriodFilter === 'personalizado'
                      ? 'Pedidos no Período'
                      : 'Pedidos Filtrados'}
                  </span>
                  <span className="text-base sm:text-xl font-black text-slate-900 font-mono mt-0.5 block">{filteredOrders.length}</span>
                </div>
                <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
                  <span className="text-xs font-bold uppercase text-slate-500 block truncate">
                    {orderPeriodFilter === 'mes_atual'
                      ? 'Total Vendas Mês'
                      : orderPeriodFilter === 'hoje'
                      ? 'Total Vendas Hoje'
                      : orderPeriodFilter === 'personalizado'
                      ? 'Total Vendas Período'
                      : 'Total em Vendas'}
                  </span>
                  <span className="text-base sm:text-xl font-black text-emerald-700 font-mono mt-0.5 block">
                    {formatCurrency(filteredSalesTotal)}
                  </span>
                </div>
                <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
                  <span className="text-xs font-bold uppercase text-slate-500 block truncate">
                    {orderPeriodFilter === 'mes_atual'
                      ? 'Orçamentos do Mês'
                      : orderPeriodFilter === 'hoje'
                      ? 'Orçamentos Hoje'
                      : orderPeriodFilter === 'personalizado'
                      ? 'Orçamentos Período'
                      : 'Orçamentos'}
                  </span>
                  <span className="text-base sm:text-xl font-black text-amber-600 font-mono mt-0.5 block">
                    {formatCurrency(filteredQuotesTotal)}
                  </span>
                </div>
                <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
                  <span className="text-xs font-bold uppercase text-slate-500 block truncate">Ticket Médio</span>
                  <span className="text-base sm:text-xl font-black text-slate-800 font-mono mt-0.5 block">
                    {formatCurrency(avgFilteredTicket)}
                  </span>
                </div>
              </div>

              {/* Lista dos Cards de Histórico dos Pedidos */}
              <div className="space-y-2.5">
                {filteredOrders.length === 0 ? (
                  <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 space-y-2">
                    <Clock size={32} className="mx-auto text-slate-300" />
                    <p className="font-bold text-xs text-slate-600">Nenhum pedido encontrado com os filtros atuais.</p>
                    {hasActiveOrderFilters && (
                      <button
                        type="button"
                        onClick={resetOrderFilters}
                        className="text-xs font-bold text-emerald-600 hover:underline cursor-pointer"
                      >
                        Limpar todos os filtros
                      </button>
                    )}
                  </div>
                ) : (
                  filteredOrders.map((ord) => {
                    const isExpanded = expandedOrderId === ord.id;
                    const itemsCount = ord.items.reduce((s, i) => s + i.quantity, 0);

                    return (
                      <div
                        key={ord.id}
                        className="bg-white rounded-2xl border border-slate-200 hover:border-emerald-400 transition-all p-3.5 space-y-3 shadow-2xs"
                      >
                        {/* Topo do Card: Número, Data e Badges */}
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-black text-xs sm:text-sm text-slate-900 font-mono">
                                {ord.number}
                              </span>
                              <span
                                className={`text-[10px] px-2 py-0.2 rounded-full font-black uppercase ${
                                  ord.type === 'orcamento'
                                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                    : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                }`}
                              >
                                {ord.type}
                              </span>
                              <span
                                className={`text-[10px] px-2 py-0.2 rounded-full font-bold uppercase ${
                                  ord.status === 'concluido'
                                    ? 'bg-slate-900 text-emerald-400'
                                    : ord.status === 'cancelado'
                                    ? 'bg-rose-100 text-rose-700'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {ord.status}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                              <Calendar size={12} />
                              <span>{new Date(ord.createdAt).toLocaleString('pt-BR')}</span>
                              <span>•</span>
                              <span>{ord.userName.split(' ')[0]}</span>
                            </div>
                          </div>

                          {/* Valor do Pedido */}
                          <div className="text-right">
                            <div className="font-black text-sm sm:text-base text-slate-900 font-mono">
                              {formatCurrency(ord.total)}
                            </div>
                            <div className="text-[10px] text-slate-500 font-medium">
                              {ord.paymentMethod.toUpperCase()}
                              {ord.installmentsCount > 1 ? ` (${ord.installmentsCount}x)` : ''}
                            </div>
                          </div>
                        </div>

                        {/* Dados do Cliente */}
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center shrink-0">
                              <User size={14} />
                            </div>
                            <div>
                              <div className="text-xs font-bold text-slate-800 leading-tight">
                                {ord.customerName}
                              </div>
                              {ord.customerPhone && (
                                <div className="text-[11px] text-slate-500">{ord.customerPhone}</div>
                              )}
                            </div>
                          </div>

                          <div className="text-right text-[11px] text-slate-500">
                            <span>{ord.items.length} itens ({itemsCount} volumes)</span>
                          </div>
                        </div>

                        {/* Resumo ou Lista de Itens do Pedido */}
                        <div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-[11px] font-bold text-slate-500">
                              {ord.items.slice(0, 2).map((i) => `${i.quantity}x ${i.description}`).join(' • ')}
                              {ord.items.length > 2 ? ` (+${ord.items.length - 2} itens)` : ''}
                            </span>
                            <button
                              type="button"
                              onClick={() => setExpandedOrderId(isExpanded ? null : ord.id)}
                              className="text-xs font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 cursor-pointer shrink-0"
                            >
                              <span>{isExpanded ? 'Ocultar itens' : 'Ver itens'}</span>
                              {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                            </button>
                          </div>

                          {isExpanded && (
                            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs space-y-1.5 mt-2">
                              <span className="font-bold text-[11px] text-slate-600 block">Itens deste Pedido:</span>
                              <div className="divide-y divide-slate-200">
                                {ord.items.map((itm) => (
                                  <div key={itm.id} className="py-1.5 flex items-center justify-between gap-2 text-xs">
                                    <div>
                                      <div className="font-bold text-slate-800">{itm.description}</div>
                                      <div className="text-[10px] text-slate-400 font-mono">
                                        {formatCurrency(itm.unitPrice)} x {itm.quantity} {itm.unit}
                                      </div>
                                    </div>
                                    <div className="font-black text-slate-900 font-mono">
                                      {formatCurrency(itm.totalPrice)}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Barra de Ações Rápidas do Pedido */}
                        <div className="flex items-center justify-between pt-1 border-t border-slate-100 gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCustomerId(ord.customerId || '');
                              setActiveTab('catalogo');
                            }}
                            className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
                          >
                            <ShoppingBag size={13} className="text-emerald-600" />
                            <span>+ Novo Pedido p/ este Cliente</span>
                          </button>

                          <div className="flex items-center gap-1.5 ml-auto">
                            {ord.customerPhone && (
                              <button
                                type="button"
                                onClick={() => handleSendOrderWhatsApp(ord)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                                title="Enviar confirmação pelo WhatsApp"
                              >
                                <MessageCircle size={13} />
                                <span>WhatsApp</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                setFinishedOrder(ord);
                                setShowReceiptModal(true);
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-950 hover:bg-black text-emerald-400 border border-emerald-500/20 rounded-xl text-xs font-black shadow-xs transition-colors cursor-pointer"
                              title="Ver comprovante e imprimir"
                            >
                              <Share2 size={13} />
                              <span>Comprovante</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SUB-ABA 2: ANÁLISE DO HISTÓRICO DE VENDAS E FINANCEIRO DOS CLIENTES        */}
          {/* ========================================================================= */}
          {historySubTab === 'analise_financeira' && (
            <div className="space-y-3">
              {/* Resumo de Indicadores da Carteira de Clientes */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
                  <span className="text-xs font-bold uppercase text-slate-500 block">Clientes Cadastrados</span>
                  <span className="text-base sm:text-xl font-black text-slate-900 font-mono mt-0.5 block">{customers.length}</span>
                </div>
                <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
                  <span className="text-xs font-bold uppercase text-slate-500 block">Total Comprado</span>
                  <span className="text-base sm:text-xl font-black text-emerald-700 font-mono mt-0.5 block">
                    {formatCurrency(totalRevenueExternal)}
                  </span>
                </div>
                <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
                  <span className="text-xs font-bold uppercase text-slate-500 block">Em Aberto a Receber</span>
                  <span className="text-base sm:text-xl font-black text-slate-800 font-mono mt-0.5 block">
                    {formatCurrency(customersAnalysis.reduce((s, c) => s + c.totalOpenBalance, 0))}
                  </span>
                </div>
                <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
                  <span className="text-xs font-bold uppercase text-rose-500 block">Total Vencido</span>
                  <span className="text-base sm:text-xl font-black text-rose-600 font-mono mt-0.5 block">
                    {formatCurrency(totalOverdueExternal)}
                  </span>
                </div>
              </div>

              {/* Barra de Busca e Filtros de Análise */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <div className="relative">
                  <Search size={18} className="absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Pesquisar cliente por nome, CNPJ/CPF, telefone ou cidade..."
                    value={clientSearchTerm}
                    onChange={(e) => setClientSearchTerm(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm sm:text-base font-medium text-slate-800 focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                  />
                </div>

                <div className="flex gap-2 overflow-x-auto pb-1 text-xs sm:text-sm">
                  {[
                    { id: 'todos', label: `Todos (${customersAnalysis.length})` },
                    { id: 'vencidos', label: `⚠️ Parcela Vencida (${customersWithOverdue.length})` },
                    { id: 'em_dia', label: `🟢 Em Dia (${customersInGoodStanding.length})` },
                    { id: 'top_compradores', label: '⭐ Mais Compradores' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setClientFilter(f.id as any)}
                      className={`px-4 py-2.5 rounded-xl font-black whitespace-nowrap text-xs sm:text-sm transition-all cursor-pointer ${
                        clientFilter === f.id
                          ? 'bg-slate-950 text-emerald-400 border border-emerald-500/30 shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Lista dos Dossiês dos Clientes */}
              <div className="space-y-2.5">
                {filteredCustomersAnalysis.length === 0 ? (
                  <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 space-y-1">
                    <Users size={32} className="mx-auto text-slate-300" />
                    <p className="font-bold text-xs text-slate-600">Nenhum cliente encontrado neste filtro.</p>
                  </div>
                ) : (
                  filteredCustomersAnalysis.map((item) => {
                    const isExpanded = expandedClientId === item.customer.id;

                    return (
                      <div
                        key={item.customer.id}
                        className={`bg-white rounded-2xl border transition-all p-3.5 space-y-3 ${
                          item.hasOverdue
                            ? 'border-rose-400/80 shadow-xs bg-rose-50/10 ring-1 ring-rose-200/50'
                            : 'border-slate-200 hover:border-emerald-300 shadow-2xs'
                        }`}
                      >
                        {/* Topo do Card do Cliente */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-xs sm:text-sm font-black text-slate-900">
                                {item.customer.name}
                              </h4>
                              {item.customer.city && (
                                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                                  {item.customer.city}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-2 flex-wrap">
                              <span>Doc: <strong>{item.customer.cpfCnpj || 'Não informado'}</strong></span>
                              <span>•</span>
                              <span>Tel: <strong>{item.customer.phone || item.customer.whatsapp || 'Sem tel'}</strong></span>
                            </div>
                          </div>

                          {/* Badge de Alerta Financeiro */}
                          <div>
                            {item.hasOverdue ? (
                              <div className="inline-flex items-center gap-1.5 bg-rose-600 text-white px-2.5 py-1 rounded-xl text-xs font-black shadow-xs">
                                <AlertTriangle size={13} />
                                <span>VENCIDA: {formatCurrency(item.totalOverdueBalance)}</span>
                                <span className="text-[10px] bg-rose-800/80 px-1.5 py-0.2 rounded">
                                  {item.maxDaysOverdue}d atraso
                                </span>
                              </div>
                            ) : item.totalPendingFutureBalance > 0 ? (
                              <div className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-2 py-0.5 rounded-lg text-[11px] font-bold">
                                <span>A Vencer: {formatCurrency(item.totalPendingFutureBalance)}</span>
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-lg text-[11px] font-black">
                                <Check size={12} />
                                <span>100% Em Dia</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Grade Resumida de Vendas & Crédito */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs">
                          <div>
                            <span className="text-[10px] text-slate-400 block font-semibold">Total Comprado:</span>
                            <span className="font-extrabold text-slate-900 font-mono">
                              {formatCurrency(item.totalSpent)}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block font-semibold">Pedidos Realizados:</span>
                            <span className="font-extrabold text-slate-800 font-mono">
                              {item.orderCount} pedido{item.orderCount === 1 ? '' : 's'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block font-semibold">Ticket Médio:</span>
                            <span className="font-extrabold text-slate-800 font-mono">
                              {formatCurrency(item.avgTicket)}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block font-semibold">Limite Disponível:</span>
                            <span className={`font-mono font-black ${item.creditAvailable <= 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                              {formatCurrency(item.creditAvailable)}
                            </span>
                          </div>
                        </div>

                        {/* Se tiver títulos vencidos, lista detalhada de parcelas em atraso */}
                        {item.hasOverdue && (
                          <div className="bg-rose-50/70 p-2.5 rounded-xl border border-rose-200/80 text-xs space-y-1.5">
                            <span className="text-[11px] font-black uppercase text-rose-900 block flex items-center gap-1">
                              <AlertCircle size={13} className="text-rose-600" />
                              Parcelas Vencidas em Aberto deste Cliente:
                            </span>
                            <div className="space-y-1">
                              {item.overdueReceivables.map((r) => {
                                const diffMs = new Date(todayIso).getTime() - new Date(r.dueDate).getTime();
                                const diffDays = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
                                return (
                                  <div
                                    key={r.id}
                                    className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-rose-200 text-xs"
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono font-bold text-slate-800">{r.docNumber}</span>
                                      <span className="text-[11px] text-rose-600">
                                        Venceu em {new Date(r.dueDate).toLocaleDateString('pt-BR')} ({diffDays} dias atrás)
                                      </span>
                                    </div>
                                    <span className="font-black text-rose-700 font-mono">
                                      {formatCurrency(r.balance)}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Ações Rápidas de Vendedor */}
                        <div className="flex items-center justify-between pt-1 border-t border-slate-100 gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => setExpandedClientId(isExpanded ? null : item.customer.id)}
                            className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                          >
                            <Eye size={13} />
                            <span>{isExpanded ? 'Ocultar Pedidos' : `Ver Histórico (${item.custOrders.length})`}</span>
                          </button>

                          <div className="flex items-center gap-2">
                            {item.customer.phone && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleSendWhatsAppNotice(
                                    item.customer.name,
                                    item.customer.phone,
                                    item.totalOverdueBalance,
                                    item.maxDaysOverdue,
                                    item.overdueReceivables[0]?.docNumber
                                  )
                                }
                                className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                                  item.hasOverdue
                                    ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs'
                                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                                }`}
                                title="Notificar cliente pelo WhatsApp"
                              >
                                <MessageCircle size={14} />
                                <span>{item.hasOverdue ? 'Cobrar WhatsApp' : 'WhatsApp'}</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleStartOrderForCustomer(item.customer.id)}
                              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-950 hover:bg-black text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-black shadow-xs transition-colors cursor-pointer"
                            >
                              <ShoppingBag size={14} />
                              <span>Novo Pedido</span>
                            </button>
                          </div>
                        </div>

                        {/* Histórico expandido de pedidos deste cliente */}
                        {isExpanded && (
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-2 mt-2">
                            <span className="font-black text-slate-700 block">
                              Pedidos Realizados por {item.customer.name}:
                            </span>
                            {item.custOrders.length === 0 ? (
                              <p className="text-slate-400 text-[11px]">Nenhum pedido registrado para este cliente.</p>
                            ) : (
                              <div className="divide-y divide-slate-200">
                                {item.custOrders.map((ord) => (
                                  <div key={ord.id} className="py-2 flex items-center justify-between gap-2">
                                    <div>
                                      <div className="font-bold text-slate-800 flex items-center gap-1.5">
                                        <span>{ord.number}</span>
                                        <span className={`text-[9px] px-1.5 py-0.2 rounded uppercase font-bold ${
                                          ord.type === 'orcamento' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                                        }`}>
                                          {ord.type}
                                        </span>
                                      </div>
                                      <div className="text-[10px] text-slate-400">
                                        {new Date(ord.createdAt).toLocaleDateString('pt-BR')} • {ord.items.length} itens • {ord.status}
                                      </div>
                                    </div>
                                    <div className="text-right flex items-center gap-2">
                                      <span className="font-black font-mono text-slate-900">{formatCurrency(ord.total)}</span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setFinishedOrder(ord);
                                          setShowReceiptModal(true);
                                        }}
                                        className="p-1.5 bg-white text-emerald-700 hover:bg-emerald-50 rounded-lg border border-slate-200"
                                        title="Ver comprovante"
                                      >
                                        <Share2 size={13} />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA PRINCIPAL 2: CATÁLOGO DE PRODUTOS PARA VENDA EXTERNA                  */}
      {/* ========================================================================= */}
      {activeTab === 'catalogo' && (
        <div className="space-y-3.5">
          {/* Busca e Filtros de Categoria */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="relative">
              <Search className="absolute left-3.5 top-3.5 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Buscar produto por nome ou código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm sm:text-base text-slate-800 focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-emerald-500 shadow-2xs"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 text-xs sm:text-sm">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2.5 rounded-xl font-black whitespace-nowrap capitalize transition-colors cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Lista de Itens do Catálogo */}
          <div className="space-y-2.5">
            {filteredProducts.map((p) => {
              const locStock = StockEngine.getBalance(dbState.stockBalances, p.id, selectedLocationId);
              const availableQty = locStock?.quantity || 0;
              const inCart = cart.find((i) => i.productId === p.id);

              return (
                <div
                  key={p.id}
                  className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-emerald-300 shadow-xs flex items-center justify-between gap-3.5 transition-all"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                        {p.code}
                      </span>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                          availableQty > 0
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-rose-50 text-rose-800 border border-rose-200'
                        }`}
                      >
                        Estoque: {formatQuantity(availableQty)} {p.unit}
                      </span>
                      {p.isMasterPack && (
                        <span className="inline-flex items-center gap-1 text-[11px] bg-amber-100 text-amber-900 font-extrabold px-2 py-0.5 rounded-md border border-amber-300">
                          <Boxes size={12} className="text-amber-700" />
                          Master ({p.masterPackUnits} un/{p.unit})
                        </span>
                      )}
                    </div>
                    <div className="font-extrabold text-sm sm:text-base text-slate-900 mt-1.5 leading-snug">
                      {p.description}
                    </div>
                    <div className="text-emerald-700 font-black text-base sm:text-lg mt-1 font-mono">
                      {formatCurrency(p.salePrice)}
                    </div>
                  </div>

                  {/* Ação de Adicionar ou Contador */}
                  {inCart ? (
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 p-1.5 rounded-2xl">
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(p.id, -1)}
                          className="w-9 h-9 sm:w-10 sm:h-10 bg-white text-emerald-800 rounded-xl font-black text-sm flex items-center justify-center shadow-xs cursor-pointer hover:bg-slate-100 active:scale-95 transition-all"
                        >
                          <Minus size={16} />
                        </button>
                        <span className="w-8 text-center text-sm font-black text-emerald-950 font-mono">
                          {inCart.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleAddToCart(p)}
                          className="w-9 h-9 sm:w-10 sm:h-10 bg-emerald-600 text-white rounded-xl font-black text-sm flex items-center justify-center shadow-xs cursor-pointer hover:bg-emerald-700 active:scale-95 transition-all"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleOpenItemAdjustment(inCart)}
                        className={`text-xs font-bold px-2.5 py-1 rounded-lg border transition-colors cursor-pointer flex items-center gap-1 ${
                          inCart.additionValue && inCart.additionValue > 0
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : inCart.discountValue > 0
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'text-slate-600 bg-slate-50 border-slate-200 hover:bg-slate-100'
                        }`}
                        title="Ajustar desconto ou acréscimo neste produto"
                      >
                        <Tag size={12} />
                        <span>
                          {inCart.additionValue && inCart.additionValue > 0
                            ? `+Acrésc: ${formatCurrency(inCart.additionValue)}`
                            : inCart.discountValue > 0
                            ? `-Desc: ${formatCurrency(inCart.discountValue)}`
                            : 'Desc / Acrésc'}
                        </span>
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleAddToCart(p)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm px-4 py-3 rounded-2xl shadow-xs flex items-center gap-1.5 shrink-0 cursor-pointer transition-colors active:scale-95"
                    >
                      <Plus size={16} />
                      <span>Adicionar</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Barra Flutuante de Ver Carrinho */}
          {cart.length > 0 && (
            <div className="fixed bottom-3 left-4 right-4 max-w-3xl mx-auto z-20">
              <button
                type="button"
                onClick={() => setActiveTab('carrinho')}
                className="w-full bg-slate-950 hover:bg-black text-white p-3.5 rounded-2xl shadow-xl border border-emerald-500/30 flex items-center justify-between cursor-pointer transition-all"
              >
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 text-xs font-black flex items-center justify-center">
                    {cart.reduce((s, i) => s + i.quantity, 0)}
                  </span>
                  <span className="font-bold text-xs sm:text-sm">Ver Carrinho do Pedido</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-sm text-emerald-400 font-mono">
                    {formatCurrency(cartSubtotal)}
                  </span>
                  <ChevronRight size={18} />
                </div>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA PRINCIPAL 3: FECHAMENTO DO PEDIDO / CARRINHO                          */}
      {/* ========================================================================= */}
      {activeTab === 'carrinho' && (
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
            <h3 className="font-black text-sm sm:text-base uppercase text-slate-800 tracking-wider">
              {docType === 'orcamento' ? 'Orçamento Comercial Externo' : 'Pedido de Venda Direta Externa'}
            </h3>
            <span className="text-xs font-black bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-full uppercase">
              {docType}
            </span>
          </div>

          {/* Selecionar Cliente */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-sm font-extrabold text-slate-800">Cliente *</label>
              <button
                type="button"
                onClick={() => setActiveTab('novo_cliente')}
                className="text-xs sm:text-sm text-emerald-700 font-extrabold hover:underline cursor-pointer py-0.5"
              >
                + Cadastrar Novo
              </button>
            </div>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm sm:text-base font-bold text-slate-800 focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-emerald-500 truncate shadow-2xs"
            >
              <option value="">Selecione o cliente atendido...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.phone || c.city})
                </option>
              ))}
            </select>
          </div>

          {/* Depósito de Saída */}
          <div>
            <label className="text-sm font-extrabold text-slate-800 mb-1.5 flex items-center gap-1.5">
              <Warehouse size={15} className="text-emerald-700" />
              <span>Depósito de Saída (Padrão: Comercial)</span>
            </label>
            <select
              value={selectedLocationId}
              onChange={(e) => setSelectedLocationId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm sm:text-base font-bold text-slate-800 focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-emerald-500 truncate shadow-2xs"
            >
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name} {loc.id === 'loc-comercial' || loc.name.toLowerCase() === 'comercial' ? '(Padrão)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Grade de Itens Selecionados */}
          <div className="space-y-2.5">
            <span className="text-xs sm:text-sm font-black text-slate-600 uppercase tracking-wider block">
              Itens do Pedido ({cart.length} itens • {cart.reduce((s, i) => s + i.quantity, 0)} volumes)
            </span>
            {cart.length === 0 ? (
              <p className="text-sm text-slate-400 py-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                Nenhum item adicionado ainda ao pedido.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 bg-slate-50/50 rounded-2xl border border-slate-100 px-3 py-1">
                {cart.map((item) => (
                  <div key={item.id} className="py-3 flex items-center justify-between gap-2.5 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm sm:text-base font-extrabold text-slate-900 leading-snug flex items-center gap-1.5 flex-wrap">
                        <span>{item.description}</span>
                        {item.isMasterPack && (
                          <span className="inline-flex items-center gap-1 text-[11px] bg-amber-100 text-amber-900 font-extrabold px-2 py-0.5 rounded-md border border-amber-300">
                            <Boxes size={12} className="text-amber-700" />
                            Master ({item.masterPackUnits} un/{item.unit})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs sm:text-sm text-slate-500 font-mono font-medium">
                          {formatCurrency(item.unitPrice)} x {item.quantity} {item.unit}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleOpenItemAdjustment(item)}
                          className={`text-xs font-bold px-2 py-0.5 rounded-md border transition-colors cursor-pointer ${
                            item.additionValue && item.additionValue > 0
                              ? 'bg-blue-50 text-blue-800 border-blue-300'
                              : item.discountValue > 0
                              ? 'bg-amber-50 text-amber-800 border-amber-300'
                              : 'text-slate-600 bg-white border-slate-200 hover:bg-slate-100'
                          }`}
                          title="Ajustar desconto ou acréscimo neste item"
                        >
                          {item.additionValue && item.additionValue > 0
                            ? `+Acrésc: ${formatCurrency(item.additionValue)}`
                            : item.discountValue > 0
                            ? `-Desc: ${formatCurrency(item.discountValue)}`
                            : '+ Desc./Acrésc.'}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(item.productId, -1)}
                        className="w-8 h-8 sm:w-9 sm:h-9 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl flex items-center justify-center text-sm font-bold cursor-pointer shadow-2xs active:scale-95 transition-all"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-7 text-center text-sm font-black font-mono">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(item.productId, 1)}
                        className="w-8 h-8 sm:w-9 sm:h-9 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl flex items-center justify-center text-sm font-bold cursor-pointer shadow-2xs active:scale-95 transition-all"
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    <div className="font-black text-sm sm:text-base text-slate-900 min-w-[80px] text-right font-mono">
                      {formatCurrency(item.totalPrice)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Condições Comerciais */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-extrabold text-slate-800">Forma de Pagto: *</label>
                  <span className="text-[10px] font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    OBRIGATÓRIO
                  </span>
                </div>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm sm:text-base font-bold text-slate-800 shadow-2xs"
                >
                  <option value="pix">Pix Cobrança</option>
                  <option value="dinheiro">Dinheiro</option>
                  <option value="cartao_credito">Cartão de Crédito</option>
                  <option value="boleto">Boleto Bancário</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-extrabold text-slate-800">Prazo de Pagto: *</label>
                  <span className="text-[10px] font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    OBRIGATÓRIO
                  </span>
                </div>
                <select
                  value={paymentTerm}
                  onChange={(e) => setPaymentTerm(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm sm:text-base font-bold text-slate-800 shadow-2xs"
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
            </div>

              <div>
                <div className="flex items-center justify-between mb-1.5 gap-1 flex-wrap">
                  {/* Seletor Desconto ou Acréscimo no mesmo campo */}
                  <div className="inline-flex rounded-xl bg-slate-100 p-0.5 border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setGlobalAdjustmentMode('desconto')}
                      className={`px-3 py-1 text-xs font-black rounded-lg cursor-pointer transition-all ${
                        globalAdjustmentMode === 'desconto'
                          ? 'bg-amber-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Desconto (-)
                    </button>
                    <button
                      type="button"
                      onClick={() => setGlobalAdjustmentMode('acrescimo')}
                      className={`px-3 py-1 text-xs font-black rounded-lg cursor-pointer transition-all ${
                        globalAdjustmentMode === 'acrescimo'
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Acréscimo (+)
                    </button>
                  </div>

                  {/* Alternador % / R$ */}
                  <div className="inline-flex rounded-lg bg-slate-200 p-0.5 border border-slate-300">
                    <button
                      type="button"
                      onClick={() => handleDiscountTypeChange('percent')}
                      className={`px-2.5 py-1 text-xs font-black rounded-md cursor-pointer transition-all ${
                        discountType === 'percent'
                          ? globalAdjustmentMode === 'acrescimo' ? 'bg-blue-600 text-white shadow-2xs' : 'bg-emerald-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      %
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDiscountTypeChange('value')}
                      className={`px-2.5 py-1 text-xs font-black rounded-md cursor-pointer transition-all ${
                        discountType === 'value'
                          ? globalAdjustmentMode === 'acrescimo' ? 'bg-blue-600 text-white shadow-2xs' : 'bg-emerald-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      R$
                    </button>
                  </div>
                </div>

                <div className="relative flex items-center">
                  {discountType === 'value' && (
                    <span className="absolute left-3 text-sm font-bold text-slate-500">R$</span>
                  )}
                  <input
                    type="text"
                    inputMode="decimal"
                    value={discountInput}
                    onChange={(e) => setDiscountInput(e.target.value.replace(/[^0-9.,]/g, ''))}
                    placeholder="0"
                    className={`w-full bg-slate-50 border rounded-xl p-3 font-bold text-right text-sm sm:text-base focus:outline-hidden focus:bg-white focus:ring-2 shadow-2xs ${
                      globalAdjustmentMode === 'acrescimo'
                        ? 'border-blue-300 focus:ring-blue-500'
                        : 'border-slate-200 focus:ring-emerald-500'
                    } ${discountType === 'value' ? 'pl-9' : ''}`}
                  />
                </div>
                {parsedCartAdjustmentNum > 0 && (
                  <div className="text-xs text-right font-semibold mt-1">
                    {globalAdjustmentMode === 'desconto' ? (
                      <span className="text-amber-700 font-bold">- Desconto Geral: {formatCurrency(cartGlobalDiscount)}</span>
                    ) : (
                      <span className="text-blue-700 font-bold">+ Acréscimo Geral: {formatCurrency(cartGlobalAddition)}</span>
                    )}
                  </div>
                )}
              </div>

            {paymentMethod === 'boleto' && (
              <div className="bg-amber-50/70 p-3 rounded-2xl border border-amber-200 space-y-1.5">
                <label className="block text-xs sm:text-sm text-amber-900 font-extrabold mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Barcode size={15} className="text-amber-700" />
                    Conta / Banco Emissor do Boleto:
                  </span>
                  <span className="text-xs text-amber-800 font-bold bg-amber-100 px-2 py-0.5 rounded-full">
                    Cobrança
                  </span>
                </label>
                <select
                  value={selectedBoletoAccountId}
                  onChange={(e) => setSelectedBoletoAccountId(e.target.value)}
                  className="w-full bg-white border border-amber-300 rounded-xl p-3 text-sm sm:text-base font-bold text-slate-800 cursor-pointer shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                >
                  {Database.getBoletoAccounts(currentCompany.id).map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} {acc.bankCode ? `(${acc.bankCode})` : ''} - Ag: {acc.agency || '-'} C/C: {acc.accountNumber || '-'}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {(paymentMethod === 'cartao_credito' || paymentMethod === 'boleto') && (
              <div>
                <label className="block text-sm font-extrabold text-slate-800 mb-1.5">
                  {paymentMethod === 'boleto' ? 'Parcelas Boleto:' : 'Parcelas:'}
                </label>
                <select
                  value={installments}
                  onChange={(e) => setInstallments(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm sm:text-base font-bold text-slate-800 shadow-2xs"
                >
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <option key={n} value={n}>
                      {n}x de {formatCurrency(cartTotal / n)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-extrabold text-slate-800 mb-1.5">Observações da Entrega:</label>
              <input
                type="text"
                placeholder="Ex: Entregar pela manhã, deixar com responsável..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm sm:text-base font-medium shadow-2xs focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Resumo e Botão de Confirmação */}
          <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-zinc-950 text-white p-4 sm:p-5 rounded-2xl space-y-2 border border-slate-800">
            <div className="flex justify-between text-xs sm:text-sm text-slate-400 font-mono">
              <span>Subtotal Itens:</span>
              <span>{formatCurrency(cartSubtotal)}</span>
            </div>
            {cartGlobalDiscount > 0 && (
              <div className="flex justify-between text-xs sm:text-sm text-rose-400 font-mono">
                <span>Desconto Geral:</span>
                <span>-{formatCurrency(cartGlobalDiscount)}</span>
              </div>
            )}
            {cartGlobalAddition > 0 && (
              <div className="flex justify-between text-xs sm:text-sm text-blue-400 font-mono">
                <span>Acréscimo Geral:</span>
                <span>+{formatCurrency(cartGlobalAddition)}</span>
              </div>
            )}
            <div className="flex justify-between text-base sm:text-lg font-black pt-2.5 border-t border-slate-800 items-baseline">
              <span className="text-slate-300">TOTAL DO PEDIDO:</span>
              <span className="text-emerald-400 font-mono text-xl sm:text-2xl">{formatCurrency(cartTotal)}</span>
            </div>
          </div>

          <button
            type="button"
            disabled={cart.length === 0 || !selectedCustomerId}
            onClick={handlePreFinalizeExternalOrder}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-black text-sm sm:text-base py-4 px-4 rounded-2xl shadow-lg shadow-emerald-950/20 flex items-center justify-center gap-2.5 transition-all cursor-pointer active:scale-98"
          >
            <Send size={20} />
            <span>
              {docType === 'orcamento' ? 'GERAR E COMPARTILHAR ORÇAMENTO' : 'CONFIRMAR PEDIDO DE VENDA'}
            </span>
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA PRINCIPAL 4: CADASTRO RÁPIDO DE NOVO CLIENTE NA RUA                  */}
      {/* ========================================================================= */}
      {activeTab === 'novo_cliente' && (
        <form onSubmit={handleSaveQuickCustomer} className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="pb-3 border-b border-slate-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
              <UserPlus size={20} />
            </div>
            <div>
              <h3 className="font-black text-sm sm:text-base uppercase text-slate-800 tracking-wider">Cadastro Rápido de Cliente (Na Rua)</h3>
              <p className="text-xs text-slate-400">Cadastre o cliente para vincular imediatamente ao pedido</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-extrabold text-slate-800 mb-1.5">Nome Completo ou Razão Social *</label>
            <input
              type="text"
              required
              value={newClientName}
              onChange={(e) => setNewClientName(e.target.value)}
              placeholder="Ex: Mercadinho São Pedro"
              className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm sm:text-base font-medium focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-emerald-500 shadow-2xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-extrabold text-slate-800 mb-1.5">Telefone / WhatsApp *</label>
              <input
                type="text"
                required
                value={newClientPhone}
                onChange={(e) => setNewClientPhone(e.target.value)}
                placeholder="(11) 98765-4321"
                className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm sm:text-base font-medium focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-emerald-500 shadow-2xs"
              />
            </div>
            <div>
              <label className="block text-sm font-extrabold text-slate-800 mb-1.5">CPF ou CNPJ</label>
              <input
                type="text"
                value={newClientCpfCnpj}
                onChange={(e) => setNewClientCpfCnpj(e.target.value)}
                placeholder="Opcional"
                className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm sm:text-base font-medium focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-emerald-500 shadow-2xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-extrabold text-slate-800 mb-1.5">Cidade</label>
            <input
              type="text"
              value={newClientCity}
              onChange={(e) => setNewClientCity(e.target.value)}
              placeholder="São Paulo"
              className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm sm:text-base font-medium focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-emerald-500 shadow-2xs"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm sm:text-base py-4 rounded-2xl shadow-xs transition-colors cursor-pointer active:scale-98"
          >
            Salvar Cliente e Voltar ao Pedido
          </button>
        </form>
      )}

      {/* Modal de Ajuste (Desconto ou Acréscimo) por Item no Pedido Externo */}
      {showItemAdjustmentModal && (() => {
        const target = cart.find((i) => i.productId === adjustingItemId);
        if (!target) return null;
        const gross = target.quantity * target.unitPrice;
        const raw = parseFloat(itemAdjustmentInput.replace(',', '.')) || 0;
        let previewVal = 0;
        let previewPct = 0;
        if (itemAdjustmentType === 'percent') {
          previewPct = Math.max(0, raw);
          previewVal = (gross * previewPct) / 100;
        } else {
          previewVal = Math.max(0, raw);
          previewPct = gross > 0 ? (previewVal / gross) * 100 : 0;
        }
        const net = itemAdjustmentMode === 'desconto'
          ? Math.max(0, gross - previewVal)
          : gross + previewVal;

        const effUnitPrice = target.quantity > 0 ? net / target.quantity : target.unitPrice;

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
                  onClick={() => setShowItemAdjustmentModal(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <div className="font-bold text-slate-900 truncate">{target.description}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Preço Base: {formatQuantity(target.quantity)} {target.unit} x {formatCurrency(target.unitPrice)} = <strong>{formatCurrency(gross)}</strong>
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
                        itemAdjustmentMode === 'desconto' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Desconto (-)
                    </button>
                    <button
                      type="button"
                      onClick={() => setItemAdjustmentMode('acrescimo')}
                      className={`px-2.5 py-1 text-xs font-bold rounded cursor-pointer transition-all ${
                        itemAdjustmentMode === 'acrescimo' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Acréscimo (+)
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-slate-700">Tipo de Ajuste:</span>
                  <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setItemAdjustmentType('percent')}
                      className={`px-2.5 py-0.5 font-bold rounded cursor-pointer ${
                        itemAdjustmentType === 'percent'
                          ? itemAdjustmentMode === 'acrescimo' ? 'bg-blue-600 text-white' : 'bg-amber-600 text-white'
                          : 'text-slate-600'
                      }`}
                    >
                      %
                    </button>
                    <button
                      type="button"
                      onClick={() => setItemAdjustmentType('value')}
                      className={`px-2.5 py-0.5 font-bold rounded cursor-pointer ${
                        itemAdjustmentType === 'value'
                          ? itemAdjustmentMode === 'acrescimo' ? 'bg-blue-600 text-white' : 'bg-amber-600 text-white'
                          : 'text-slate-600'
                      }`}
                    >
                      R$
                    </button>
                  </div>
                </div>

                <div className="relative flex items-center">
                  {itemAdjustmentType === 'value' && (
                    <span className="absolute left-2.5 text-xs font-bold text-slate-500">R$</span>
                  )}
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder={itemAdjustmentType === 'percent' ? 'Ex: 10' : '0,00'}
                    value={itemAdjustmentInput}
                    onChange={(e) => setItemAdjustmentInput(e.target.value.replace(/[^0-9.,]/g, ''))}
                    className={`w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-black text-slate-900 text-right focus:outline-hidden focus:bg-white focus:ring-1 ${
                      itemAdjustmentMode === 'acrescimo' ? 'focus:ring-blue-500' : 'focus:ring-amber-500'
                    } ${itemAdjustmentType === 'value' ? 'pl-8' : ''}`}
                    autoFocus
                  />
                </div>

                {itemAdjustmentMode === 'acrescimo' && (
                  <p className="text-[10px] text-blue-700 bg-blue-50 border border-blue-200 rounded-lg p-1.5 mt-2">
                    ℹ️ <strong>Nota Fiscal / Impressão:</strong> O acréscimo é incorporado ao preço unitário praticado ({formatCurrency(effUnitPrice)}) e <u>não sairá</u> discriminado como taxa ou acréscimo na impressão do pedido.
                  </p>
                )}
                {itemAdjustmentMode === 'desconto' && (
                  <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-1.5 mt-2">
                    ℹ️ O desconto será concedido no item e aparecerá discriminado no comprovante impresso.
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
                <div className="flex justify-between text-[11px] text-slate-300">
                  <span>Preço Unit. Efetivo:</span>
                  <span>{formatCurrency(effUnitPrice)}</span>
                </div>
                <div className="flex justify-between font-bold text-emerald-400 text-sm pt-1 border-t border-slate-800">
                  <span>Subtotal Final Item:</span>
                  <span>{formatCurrency(net)}</span>
                </div>
              </div>

              <div className="flex justify-between items-center gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setItemAdjustmentInput('');
                    handleApplyItemAdjustment();
                  }}
                  className="px-2.5 py-1.5 text-rose-600 font-bold hover:bg-rose-50 rounded-lg cursor-pointer text-[11px]"
                >
                  Limpar
                </button>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setShowItemAdjustmentModal(false)}
                    className="px-3 py-1.5 text-slate-600 font-bold hover:bg-slate-100 rounded-lg cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyItemAdjustment}
                    className={`px-4 py-1.5 text-white font-bold rounded-lg cursor-pointer transition-colors ${
                      itemAdjustmentMode === 'acrescimo' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-amber-600 hover:bg-amber-700'
                    }`}
                  >
                    {itemAdjustmentMode === 'acrescimo' ? 'Aplicar Acréscimo' : 'Aplicar Desconto'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL: TELA DE CONFIRMAÇÃO DA VENDA (NOME DO CLIENTE, TOTAL, FORMA E PRAZO DE PAGTO) */}
      <SaleConfirmationModal
        isOpen={showSaleConfirmationModal}
        onClose={() => setShowSaleConfirmationModal(false)}
        onConfirm={handleFinalizeExternalOrder}
        modality="Venda Mobile"
        customerName={selectedCustomer ? selectedCustomer.name : 'Cliente Externo'}
        customerDocument={selectedCustomer?.cpfCnpj}
        customerPhone={selectedCustomer?.phone || selectedCustomer?.whatsapp}
        totalAmount={cartTotal}
        paymentMethod={paymentMethod || 'pix'}
        paymentTerm={paymentTerm || 'a_vista'}
        installments={installments}
        itemsCount={cart.reduce((s, i) => s + i.quantity, 0)}
        locationName={selectedLocationName}
      />

      {/* Modal de Comprovante & Compartilhamento WhatsApp */}
      {finishedOrder && (
        <ReceiptModal
          order={finishedOrder}
          company={currentCompany}
          isOpen={showReceiptModal}
          onClose={() => setShowReceiptModal(false)}
        />
      )}
    </div>
  );
};
