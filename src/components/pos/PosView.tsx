import React, { useState, useEffect, useRef } from 'react';
import {
  Barcode,
  Search,
  Plus,
  Minus,
  Trash2,
  DollarSign,
  CreditCard,
  QrCode,
  User,
  AlertCircle,
  CheckCircle2,
  Printer,
  X,
  Lock,
  ArrowRight,
  Receipt,
  RotateCcw,
  Sparkles,
  FileText,
  Keyboard,
  Coins,
  Warehouse,
  ShoppingBag,
  ShoppingCart,
  UserPlus,
  ExternalLink,
  PanelLeftClose,
  PanelLeftOpen,
  Eye,
  EyeOff,
  TrendingUp,
  Smartphone,
  AlertTriangle,
  Scale,
  Calculator,
  Tag,
  Boxes,
} from 'lucide-react';
import { Database } from '../../services/db';
import { Product, Customer, Order, OrderItem, CashRegister } from '../../types';
import { StockEngine } from '../../services/stockEngine';
import { formatCurrency, formatQuantity } from '../../services/pricingEngine';
import { ReceiptModal } from '../common/ReceiptModal';
import { CashRegisterIcon } from '../common/icons/CashRegisterIcon';
import { toast } from '../../services/toast';

export interface PosViewProps {
  isSidebarMinimized?: boolean;
  onToggleSidebarMinimize?: () => void;
  hideDashboardKpis?: boolean;
  onToggleDashboardKpis?: () => void;
  cart?: OrderItem[];
  setCart?: React.Dispatch<React.SetStateAction<OrderItem[]>>;
}

export const PosView: React.FC<PosViewProps> = ({
  isSidebarMinimized = false,
  onToggleSidebarMinimize,
  hideDashboardKpis: propHideDashboardKpis,
  onToggleDashboardKpis,
  cart: propCart,
  setCart: propSetCart,
}) => {
  const [dbState, setDbState] = useState(Database.getState());
  const currentCompany = Database.getCurrentCompany();
  const currentUser = Database.getCurrentUser();

  const [internalHideKpis, setInternalHideKpis] = useState(true);
  const isKpisHidden = propHideDashboardKpis !== undefined ? propHideDashboardKpis : internalHideKpis;
  const toggleKpis = onToggleDashboardKpis || (() => setInternalHideKpis((prev) => !prev));

  // Escuta alterações do banco
  useEffect(() => {
    return Database.subscribe(() => {
      setDbState({ ...Database.getState() });
    });
  }, []);

  // Caixa ativo
  const activeCashRegister = dbState.cashRegisters.find(
    (c) => c.companyId === currentCompany.id && c.status === 'aberto'
  );

  // Estados do PDV (usa carrinho compartilhado com App para alertar perda de dados em navegação)
  const [internalCart, setInternalCart] = useState<OrderItem[]>([]);
  const cart = propCart !== undefined ? propCart : internalCart;
  const setCart = propSetCart || setInternalCart;
  const [barcodeInput, setBarcodeInput] = useState('');
  const [quantityInput, setQuantityInput] = useState<string>('1');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');

  // Tipo de desconto (% ou R$), persistido no localStorage para ser o padrão selecionado pelo usuário
  const [discountType, setDiscountType] = useState<'percent' | 'value'>(() => {
    return (localStorage.getItem('omni_discount_type') as 'percent' | 'value') || 'percent';
  });
  const [discountInput, setDiscountInput] = useState<string>('');

  const handleDiscountTypeChange = (newType: 'percent' | 'value') => {
    setDiscountType(newType);
    localStorage.setItem('omni_discount_type', newType);
  };

  const [paymentMethod, setPaymentMethod] = useState<'dinheiro' | 'pix' | 'cartao_debito' | 'cartao_credito' | 'boleto' | 'crediario'>('pix');
  const [selectedBoletoAccountId, setSelectedBoletoAccountId] = useState<string>(() => {
    const boletoMethod = Database.getPaymentMethods().find((m) => m.type === 'boleto');
    if (boletoMethod?.defaultAccountId) return boletoMethod.defaultAccountId;
    const boletoAccs = Database.getBoletoAccounts();
    return boletoAccs[0]?.id || '';
  });
  const [receivedAmount, setReceivedAmount] = useState<string>('');
  const [installments, setInstallments] = useState<number>(1);
  const [selectedLocationId, setSelectedLocationId] = useState<string>(() => {
    const locs = Database.getState().stockLocations.filter((l) => l.status === 'ativo');
    const comercialLoc = locs.find(
      (l) => l.name.toLowerCase() === 'comercial' || l.type === 'comercial' || l.id === 'loc-comercial'
    );
    return comercialLoc?.id || locs[0]?.id || 'loc-comercial';
  });
  const [lastAddedItem, setLastAddedItem] = useState<OrderItem | null>(null);

  // Feedback sonoro e visual em tempo real para leitura de código de barras e digitação
  const [feedbackMessage, setFeedbackMessage] = useState<{
    type: 'success' | 'error' | 'warning';
    text: string;
  } | null>(null);

  useEffect(() => {
    if (feedbackMessage) {
      const timer = setTimeout(() => {
        setFeedbackMessage(null);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [feedbackMessage]);

  const playBeep = (type: 'success' | 'error' = 'success') => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'success') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1174.66, ctx.currentTime); // Tom agudo agradável (D6)
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.08);
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, ctx.currentTime); // Tom grave de alerta
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.22);
      }
    } catch {
      // Ignora restrições do navegador se áudio não for permitido
    }
  };

  // Modais
  const [lastFinishedOrder, setLastFinishedOrder] = useState<Order | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showOpenRegisterModal, setShowOpenRegisterModal] = useState(false);
  const [openRegisterAmount, setOpenRegisterAmount] = useState('200,00');
  const [showProductLookupModal, setShowProductLookupModal] = useState(false);
  const [productLookupSearch, setProductLookupSearch] = useState('');
  const [showRecentSalesModal, setShowRecentSalesModal] = useState(false);

  // Modal de Cadastro Rápido de Cliente [F3]
  const [showQuickCustomerModal, setShowQuickCustomerModal] = useState(false);
  const [quickCustName, setQuickCustName] = useState('');
  const [quickCustCpfCnpj, setQuickCustCpfCnpj] = useState('');
  const [quickCustPhone, setQuickCustPhone] = useState('');
  const [quickCustEmail, setQuickCustEmail] = useState('');
  const [quickCustCity, setQuickCustCity] = useState('São Paulo');
  const [quickCustState, setQuickCustState] = useState('SP');
  const [quickCustType, setQuickCustType] = useState<'PF' | 'PJ'>('PF');
  const [quickCustCreditLimit, setQuickCustCreditLimit] = useState('1000');

  // Cancelamento de venda recente
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  // Modal de Desconto por Produto
  const [showItemDiscountModal, setShowItemDiscountModal] = useState<boolean>(false);
  const [discountingItemId, setDiscountingItemId] = useState<string | null>(null);
  const [itemDiscountType, setItemDiscountType] = useState<'percent' | 'value'>('percent');
  const [itemDiscountInput, setItemDiscountInput] = useState<string>('');
  const itemDiscountInputRef = useRef<HTMLInputElement>(null);

  const handleOpenItemDiscountModal = (item: OrderItem) => {
    setDiscountingItemId(item.productId);
    if (item.discountValue > 0 || item.discountPercent > 0) {
      if (item.discountPercent > 0) {
        setItemDiscountType('percent');
        setItemDiscountInput(item.discountPercent.toFixed(2).replace(/\.?0+$/, '').replace('.', ','));
      } else {
        setItemDiscountType('value');
        setItemDiscountInput(item.discountValue.toFixed(2).replace('.', ','));
      }
    } else {
      setItemDiscountType('percent');
      setItemDiscountInput('');
    }
    setShowItemDiscountModal(true);
    setTimeout(() => {
      itemDiscountInputRef.current?.focus();
      itemDiscountInputRef.current?.select();
    }, 50);
  };

  const handleApplyItemDiscount = () => {
    if (!discountingItemId) return;
    const targetItem = cart.find((i) => i.productId === discountingItemId);
    if (!targetItem) {
      setShowItemDiscountModal(false);
      return;
    }

    const gross = targetItem.quantity * targetItem.unitPrice;
    const rawNum = Math.max(0, parseFloat(itemDiscountInput.replace(',', '.')) || 0);
    const maxPercent = currentUser.permissions.maxDiscountPercent;

    let finalPercent = 0;
    let finalValue = 0;

    if (rawNum <= 0) {
      finalPercent = 0;
      finalValue = 0;
    } else if (itemDiscountType === 'percent') {
      if (rawNum > maxPercent) {
        alert(`O desconto informado (${rawNum}%) excede o limite máximo permitido de ${maxPercent}% para seu perfil.`);
        return;
      }
      finalPercent = Math.min(100, rawNum);
      finalValue = (gross * finalPercent) / 100;
    } else {
      const maxVal = (gross * maxPercent) / 100;
      if (rawNum > maxVal) {
        alert(`O desconto informado (${formatCurrency(rawNum)}) excede o limite máximo permitido de ${maxPercent}% (${formatCurrency(maxVal)}).`);
        return;
      }
      finalValue = Math.min(gross, rawNum);
      finalPercent = gross > 0 ? (finalValue / gross) * 100 : 0;
    }

    const finalTotal = Math.max(0, gross - finalValue);

    setCart((prev) =>
      prev.map((i) =>
        i.productId === discountingItemId
          ? {
              ...i,
              discountPercent: Math.round(finalPercent * 100) / 100,
              discountValue: Math.round(finalValue * 100) / 100,
              totalPrice: Math.round(finalTotal * 100) / 100,
            }
          : i
      )
    );

    if (lastAddedItem && lastAddedItem.productId === discountingItemId) {
      setLastAddedItem({
        ...lastAddedItem,
        discountPercent: Math.round(finalPercent * 100) / 100,
        discountValue: Math.round(finalValue * 100) / 100,
        totalPrice: Math.round(finalTotal * 100) / 100,
      });
    }

    setShowItemDiscountModal(false);
    setTimeout(() => barcodeInputRef.current?.focus(), 50);
  };

  const handleRemoveItemDiscount = () => {
    if (!discountingItemId) return;
    setCart((prev) =>
      prev.map((i) => {
        if (i.productId === discountingItemId) {
          const gross = i.quantity * i.unitPrice;
          return {
            ...i,
            discountPercent: 0,
            discountValue: 0,
            totalPrice: gross,
          };
        }
        return i;
      })
    );

    if (lastAddedItem && lastAddedItem.productId === discountingItemId) {
      const gross = lastAddedItem.quantity * lastAddedItem.unitPrice;
      setLastAddedItem({
        ...lastAddedItem,
        discountPercent: 0,
        discountValue: 0,
        totalPrice: gross,
      });
    }

    setShowItemDiscountModal(false);
    setTimeout(() => barcodeInputRef.current?.focus(), 50);
  };

  // Modal de Quantidade Fracionada [F12] (até 3 casas decimais com recálculo automático do Total Líquido)
  const [showFractionalQtyModal, setShowFractionalQtyModal] = useState<boolean>(false);
  const [fractionalProductId, setFractionalProductId] = useState<string>('');
  const [fractionalQtyInput, setFractionalQtyInput] = useState<string>('1,000');
  const fractionalInputRef = useRef<HTMLInputElement>(null);

  const handleOpenFractionalModal = (targetProductId?: string) => {
    if (targetProductId) {
      setFractionalProductId(targetProductId);
      const item = cart.find((i) => i.productId === targetProductId);
      if (item) {
        setFractionalQtyInput(item.quantity.toFixed(3).replace('.', ','));
      }
    } else if (cart.length > 0) {
      const targetId = lastAddedItem?.productId || cart[cart.length - 1].productId;
      setFractionalProductId(targetId);
      const item = cart.find((i) => i.productId === targetId);
      if (item) {
        setFractionalQtyInput(item.quantity.toFixed(3).replace('.', ','));
      }
    } else {
      setFractionalProductId('');
      const currentMultiplier = parseFloat((quantityInput || '1').replace(',', '.')) || 1;
      setFractionalQtyInput(currentMultiplier.toFixed(3).replace('.', ','));
    }
    setShowFractionalQtyModal(true);
    setTimeout(() => {
      fractionalInputRef.current?.focus();
      fractionalInputRef.current?.select();
    }, 50);
  };

  const handleQtyInputChange = (val: string) => {
    // Permite dígitos e apenas uma vírgula ou ponto, com até 3 casas decimais
    const sanitized = val.replace(/[^0-9,\.]/g, '');
    const parts = sanitized.split(/[,\.]/);
    if (parts.length > 2) return;
    if (parts[1] && parts[1].length > 3) {
      setFractionalQtyInput(`${parts[0]},${parts[1].slice(0, 3)}`);
      return;
    }
    setFractionalQtyInput(sanitized);
  };

  const handleAddFraction = (delta: number) => {
    const current = parseFloat(fractionalQtyInput.replace(',', '.')) || 0;
    const next = Math.max(0.001, Math.round((current + delta) * 1000) / 1000);
    setFractionalQtyInput(next.toFixed(3).replace('.', ','));
  };

  const handleSetPreset = (val: number) => {
    setFractionalQtyInput(val.toFixed(3).replace('.', ','));
  };

  const handleConfirmFractionalQty = () => {
    const rawVal = fractionalQtyInput.replace(',', '.');
    const parsedQty = parseFloat(rawVal);
    if (isNaN(parsedQty) || parsedQty <= 0) {
      alert('Informe uma quantidade válida maior que zero.');
      return;
    }
    // Arredonda para até 3 casas decimais após a vírgula
    const roundedQty = Math.round(parsedQty * 1000) / 1000;

    if (fractionalProductId) {
      const bal = StockEngine.getBalance(dbState.stockBalances, fractionalProductId, selectedLocationId);
      if (bal && bal.quantity !== undefined && roundedQty > bal.quantity) {
        const proceed = confirm(
          `Atenção: A quantidade informada (${roundedQty.toFixed(3).replace('.', ',')}) é superior ao saldo em estoque atual (${bal.quantity.toFixed(3).replace('.', ',')}). Deseja prosseguir com a venda mesmo assim?`
        );
        if (!proceed) return;
      }
      setCart((prev) =>
        prev.map((item) => {
          if (item.productId === fractionalProductId) {
            const gross = roundedQty * item.unitPrice;
            const discVal = (gross * (item.discountPercent || 0)) / 100;
            return {
              ...item,
              quantity: roundedQty,
              discountValue: Math.round(discVal * 100) / 100,
              totalPrice: Math.round((gross - discVal) * 100) / 100,
            };
          }
          return item;
        })
      );
      if (lastAddedItem && lastAddedItem.productId === fractionalProductId) {
        const gross = roundedQty * lastAddedItem.unitPrice;
        const discVal = (gross * (lastAddedItem.discountPercent || 0)) / 100;
        setLastAddedItem({
          ...lastAddedItem,
          quantity: roundedQty,
          discountValue: Math.round(discVal * 100) / 100,
          totalPrice: Math.round((gross - discVal) * 100) / 100,
        });
      }
    } else {
      setQuantityInput(roundedQty.toString().replace('.', ','));
    }

    setShowFractionalQtyModal(false);
    setTimeout(() => barcodeInputRef.current?.focus(), 50);
  };

  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const discountInputRef = useRef<HTMLInputElement>(null);
  const customerSelectRef = useRef<HTMLSelectElement>(null);

  // Clientes
  const customers = dbState.customers.filter((c) => c.status === 'ativo');
  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  // Locais de estoque (compartilhados entre todas as empresas)
  const locations = dbState.stockLocations.filter((l) => l.status === 'ativo');

  // Autocomplete de produtos conforme digitação
  const searchResults = dbState.products.filter(
    (p) =>
      p.status === 'ativo' &&
      p.salePrice > 0 &&
      barcodeInput.trim() !== '' &&
      (p.description.toLowerCase().includes(barcodeInput.toLowerCase()) ||
        p.code.toLowerCase().includes(barcodeInput.toLowerCase()) ||
        p.barcode.includes(barcodeInput))
  );

  // Produtos para a busca F2
  const lookupFilteredProducts = dbState.products.filter(
    (p) =>
      p.status === 'ativo' &&
      p.salePrice > 0 &&
      (productLookupSearch === '' ||
        p.description.toLowerCase().includes(productLookupSearch.toLowerCase()) ||
        p.code.toLowerCase().includes(productLookupSearch.toLowerCase()) ||
        p.barcode.includes(productLookupSearch))
  );

  // Métricas do Dashboard Informativo (Faturamento Vendas, Canais de Venda, Previsões Financeiras, Estoque Crítico)
  const companyOrders = dbState.orders.filter(
    (o) => o.companyId === currentCompany.id && o.type === 'venda' && o.status !== 'cancelado'
  );
  const totalRevenue = companyOrders.reduce((s, o) => s + o.total, 0);
  const avgTicket = companyOrders.length > 0 ? totalRevenue / companyOrders.length : 0;
  const pdvSales = companyOrders.filter((o) => o.origin === 'pdv');
  const externalSales = companyOrders.filter((o) => o.origin === 'externa_celular');

  const openReceivables = dbState.accountsReceivable
    .filter((r) => r.companyId === currentCompany.id && r.status !== 'recebido' && r.status !== 'cancelado')
    .reduce((s, r) => s + r.balance, 0);

  const openPayables = dbState.accountsPayable
    .filter((p) => p.companyId === currentCompany.id && p.status !== 'pago' && p.status !== 'cancelado')
    .reduce((s, p) => s + p.balance, 0);

  const lowStockProducts = dbState.products.filter((p) => {
    const stock = StockEngine.getTotalProductStock(dbState.stockBalances, p.id);
    return p.status === 'ativo' && stock.available <= p.minStock;
  });

  // Busca inteligente de produto por Código Interno, Código de Barras (EAN), variação sem pontuação ou Descrição
  const findProductByCodeOrBarcode = (query: string): Product | null => {
    const clean = query.trim();
    if (!clean) return null;

    const cleanUpper = clean.toUpperCase();
    const cleanDigits = clean.replace(/\D/g, '');
    const cleanAlphanumeric = clean.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

    // Permite buscar todos os produtos ativos do catálogo
    const activeProducts = dbState.products.filter((p) => p.status === 'ativo');

    // 1. Código de barras exato (EAN-13, EAN-8, Code 128)
    let found = activeProducts.find((p) => p.barcode && p.barcode.trim() === clean);
    if (found) return found;

    // 2. Código de barras numérico (sem formatação ou espaços)
    if (cleanDigits.length >= 4) {
      found = activeProducts.find(
        (p) => p.barcode && p.barcode.replace(/\D/g, '') === cleanDigits
      );
      if (found) return found;
    }

    // 3. Código interno do produto exato (case-insensitive) - ex: "PA-301" ou "pa-301"
    found = activeProducts.find((p) => p.code && p.code.trim().toUpperCase() === cleanUpper);
    if (found) return found;

    // 4. Código interno alfanumérico (sem hífens, pontos, espaços) - ex: "PA301" para "PA-301"
    found = activeProducts.find(
      (p) => p.code && p.code.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() === cleanAlphanumeric
    );
    if (found) return found;

    // 5. Código numérico simplificado - ex: digitou "301" e o produto é "PA-301"
    if (cleanDigits.length >= 2) {
      found = activeProducts.find((p) => {
        const codeDigits = p.code.replace(/\D/g, '');
        return codeDigits === cleanDigits || p.code.toUpperCase().endsWith('-' + cleanDigits);
      });
      if (found) return found;
    }

    // 6. Prefixo comum PA- com número digitado - ex: "301" -> "PA-301"
    found = activeProducts.find((p) => p.code.toUpperCase() === `PA-${cleanUpper}`);
    if (found) return found;

    // 7. Descrição idêntica (case-insensitive)
    found = activeProducts.find(
      (p) => p.description && p.description.trim().toLowerCase() === clean.toLowerCase()
    );
    if (found) return found;

    // 8. Busca parcial no catálogo ativo
    const matches = activeProducts.filter(
      (p) =>
        p.description.toLowerCase().includes(clean.toLowerCase()) ||
        p.code.toLowerCase().includes(clean.toLowerCase()) ||
        (p.barcode && p.barcode.includes(clean))
    );

    if (matches.length > 0) {
      const startsWith = matches.find(
        (p) =>
          p.code.toLowerCase().startsWith(clean.toLowerCase()) ||
          p.description.toLowerCase().startsWith(clean.toLowerCase())
      );
      return startsWith || matches[0];
    }

    return null;
  };

  // Adicionar produto ao carrinho e contar 1 unidade (ou quantidade especificada)
  const handleAddToCart = (product: Product, quantityToAdd: number = 1) => {
    if (quantityToAdd <= 0) quantityToAdd = 1;

    const stockBalance = StockEngine.getBalance(dbState.stockBalances, product.id, selectedLocationId);
    const existingInCart = cart.find((i) => i.productId === product.id);
    const currentCartQty = existingInCart ? existingInCart.quantity : 0;
    const requestedTotal = currentCartQty + quantityToAdd;

    // Avisa se o saldo for menor, mas não bloqueia a venda no balcão da loja física
    if (stockBalance.quantity < requestedTotal) {
      setFeedbackMessage({
        type: 'warning',
        text: `Atenção: Saldo de "${product.description}" no estoque local é de ${stockBalance.quantity} ${product.unit}. Venda liberada no balcão.`,
      });
    }

    let updatedCart: OrderItem[];
    let affectedItem: OrderItem;

    if (existingInCart) {
      const newQty = existingInCart.quantity + quantityToAdd;
      const newGross = newQty * existingInCart.unitPrice;
      const newDiscVal = (newGross * (existingInCart.discountPercent || 0)) / 100;
      affectedItem = {
        ...existingInCart,
        quantity: newQty,
        discountValue: Math.round(newDiscVal * 100) / 100,
        totalPrice: Math.round((newGross - newDiscVal) * 100) / 100,
      };
      updatedCart = cart.map((item) => (item.productId === product.id ? affectedItem : item));
    } else {
      affectedItem = {
        id: 'ITEM-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
        productId: product.id,
        productCode: product.code,
        description: product.description,
        unit: product.unit,
        quantity: quantityToAdd,
        unitPrice: product.salePrice,
        discountPercent: 0,
        discountValue: 0,
        totalPrice: quantityToAdd * product.salePrice,
        unitCost: product.costPrice,
        locationId: selectedLocationId,
        isMasterPack: product.isMasterPack,
        masterPackUnits: product.masterPackUnits,
        masterPackAssociatedProductId: product.masterPackAssociatedProductId,
        masterPackAssociatedProductCode: product.masterPackAssociatedProductCode,
      };
      updatedCart = [...cart, affectedItem];
    }

    setCart(updatedCart);
    setLastAddedItem(affectedItem);
    setBarcodeInput('');
    setQuantityInput('1');

    playBeep('success');

    setFeedbackMessage({
      type: 'success',
      text: `✓ +${quantityToAdd} ${product.unit}: "${product.description}" inserido! (${formatQuantity(affectedItem.quantity, 3)} ${product.unit} no cupom)`,
    });

    setTimeout(() => {
      if (barcodeInputRef.current) {
        barcodeInputRef.current.focus();
      }
    }, 20);
  };

  // Processa leitura de código de barras ou digitação do código do produto
  const handleProcessBarcodeOrCode = (rawQuery: string, forcedQty?: number) => {
    const query = (rawQuery || barcodeInput).trim();
    if (!query) return;

    let qty = 1;
    let cleanCode = query;

    // Suporte para quantidade multiplicadora no formato: "2*PA-301" ou "3*789..."
    if (query.includes('*')) {
      const parts = query.split('*');
      const parsedQty = parseFloat(parts[0].replace(',', '.'));
      if (!isNaN(parsedQty) && parsedQty > 0) {
        qty = parsedQty;
        cleanCode = parts[1].trim();
      }
    } else if (forcedQty !== undefined && forcedQty > 0) {
      qty = forcedQty;
    } else {
      const currentMultiplier = parseFloat((quantityInput || '1').replace(',', '.'));
      if (!isNaN(currentMultiplier) && currentMultiplier > 0) {
        qty = currentMultiplier;
      } else {
        qty = 1;
      }
    }

    const matched = findProductByCodeOrBarcode(cleanCode);

    if (matched) {
      handleAddToCart(matched, qty);
    } else {
      playBeep('error');
      setFeedbackMessage({
        type: 'error',
        text: `Produto com código ou barras "${cleanCode}" não foi encontrado no cadastro.`,
      });
      if (barcodeInputRef.current) {
        barcodeInputRef.current.focus();
        barcodeInputRef.current.select();
      }
    }
  };

  // Entrada pelo campo de leitor / código ao teclar Enter
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleProcessBarcodeOrCode(barcodeInput);
  };

  const handleUpdateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.productId === productId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;

            const bal = StockEngine.getBalance(dbState.stockBalances, productId, selectedLocationId);
            if (newQty > bal.quantity) {
              alert(`Quantidade solicitada (${newQty}) excede o saldo disponível (${bal.quantity}).`);
              return item;
            }

            const gross = newQty * item.unitPrice;
            const discVal = (gross * (item.discountPercent || 0)) / 100;
            return {
              ...item,
              quantity: newQty,
              discountValue: Math.round(discVal * 100) / 100,
              totalPrice: Math.round((gross - discVal) * 100) / 100,
            };
          }
          return item;
        })
        .filter(Boolean) as OrderItem[]
    );
  };

  const handleSetDirectQuantity = (productId: string, qty: number) => {
    if (isNaN(qty) || qty <= 0) return;
    const bal = StockEngine.getBalance(dbState.stockBalances, productId, selectedLocationId);
    if (qty > bal.quantity) {
      alert(`Quantidade solicitada (${qty}) excede o saldo disponível (${bal.quantity}).`);
      return;
    }
    setCart((prev) =>
      prev.map((item) => {
        if (item.productId === productId) {
          const gross = qty * item.unitPrice;
          const discVal = (gross * (item.discountPercent || 0)) / 100;
          return {
            ...item,
            quantity: qty,
            discountValue: Math.round(discVal * 100) / 100,
            totalPrice: Math.round((gross - discVal) * 100) / 100,
          };
        }
        return item;
      })
    );
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart(cart.filter((i) => i.productId !== productId));
  };

  const handleClearCart = () => {
    if (cart.length === 0) return;
    if (window.confirm('Deseja realmente limpar todos os itens da venda atual?')) {
      setCart([]);
      setDiscountInput('');
      setReceivedAmount('');
      setLastAddedItem(null);
      if (barcodeInputRef.current) barcodeInputRef.current.focus();
    }
  };

  // Cálculos do Carrinho com suporte a Desconto por Produto e Desconto Geral no Pedido [F4]
  const grossSubtotal = cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const totalItemDiscounts = cart.reduce((sum, item) => sum + (item.discountValue || 0), 0);
  const subtotalAfterItemDiscounts = cart.reduce((sum, item) => sum + item.totalPrice, 0);
  const subtotal = grossSubtotal;

  const parsedDiscountNum = Math.max(0, parseFloat(discountInput.replace(',', '.')) || 0);
  const maxAllowedDiscountPercent = currentUser.permissions.maxDiscountPercent;
  const maxAllowedDiscountVal = (subtotalAfterItemDiscounts * maxAllowedDiscountPercent) / 100;

  let discountVal = 0;
  if (discountType === 'percent') {
    const safePercent = Math.min(maxAllowedDiscountPercent, parsedDiscountNum);
    discountVal = (subtotalAfterItemDiscounts * safePercent) / 100;
  } else {
    // Modo R$
    discountVal = Math.min(subtotalAfterItemDiscounts, parsedDiscountNum);
  }
  const effectiveDiscountPercent = subtotalAfterItemDiscounts > 0 ? (discountVal / subtotalAfterItemDiscounts) * 100 : 0;
  const total = Math.max(0, subtotalAfterItemDiscounts - discountVal);

  const numericReceived = (() => {
    if (!receivedAmount || receivedAmount.trim() === '') return 0;
    const clean = receivedAmount.trim();
    if (clean.includes(',')) {
      const normalized = clean.replace(/\./g, '').replace(',', '.');
      const n = parseFloat(normalized);
      return isNaN(n) ? 0 : n;
    }
    if (clean.includes('.')) {
      const n = parseFloat(clean);
      return isNaN(n) ? 0 : n;
    }
    const n = parseFloat(clean);
    return isNaN(n) ? 0 : n;
  })();
  const change = paymentMethod === 'dinheiro' && numericReceived > total ? numericReceived - total : 0;

  // Cálculos em tempo real para o Modal de Quantidade Fracionada [F12]
  const previewFractionalParsed = Math.max(0, parseFloat(fractionalQtyInput.replace(',', '.')) || 0);
  const previewFractionalRounded = Math.round(previewFractionalParsed * 1000) / 1000;

  const selectedFractionalItem = cart.find((i) => i.productId === fractionalProductId);
  const selectedFractionalBal = fractionalProductId
    ? StockEngine.getBalance(dbState.stockBalances, fractionalProductId, selectedLocationId)
    : null;
  const itemUnitPrice = selectedFractionalItem?.unitPrice || 0;
  const itemDiscountPercent = selectedFractionalItem?.discountPercent || 0;
  const previewItemNetTotal = previewFractionalRounded * itemUnitPrice * (1 - itemDiscountPercent / 100);

  // Simulação do TOTAL LÍQUIDO da venda inteira recalculado automaticamente
  const simulatedSubtotal = fractionalProductId
    ? cart.reduce((sum, item) => {
        if (item.productId === fractionalProductId) {
          return sum + previewFractionalRounded * item.unitPrice;
        }
        return sum + item.quantity * item.unitPrice;
      }, 0)
    : subtotal;

  let simulatedDiscountVal = 0;
  if (discountType === 'percent') {
    const safePercent = Math.min(maxAllowedDiscountPercent, parsedDiscountNum);
    simulatedDiscountVal = (simulatedSubtotal * safePercent) / 100;
  } else {
    simulatedDiscountVal = Math.min(simulatedSubtotal, parsedDiscountNum);
  }
  const simulatedTotalLiquido = Math.max(0, simulatedSubtotal - simulatedDiscountVal);

  // Foco inicial automático no campo do leitor
  useEffect(() => {
    barcodeInputRef.current?.focus();
  }, []);

  // Buffer global para captura de leitor de código de barras físico (HID)
  const barcodeScanBufferRef = useRef<string>('');
  const lastScanKeyTimeRef = useRef<number>(0);

  // Atalhos de teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showProductLookupModal || showReceiptModal || showOpenRegisterModal || cancellingOrderId || showQuickCustomerModal) {
        return;
      }

      // Captura de leitor de código de barras caso o foco não esteja no input principal
      const activeEl = document.activeElement as HTMLElement | null;
      const isInputFocused =
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.tagName === 'SELECT' ||
          activeEl.isContentEditable);

      if (!isInputFocused) {
        const now = Date.now();
        const diff = now - lastScanKeyTimeRef.current;
        lastScanKeyTimeRef.current = now;

        if (diff > 120) {
          barcodeScanBufferRef.current = '';
        }

        if (e.key === 'Enter') {
          if (barcodeScanBufferRef.current.length >= 2) {
            e.preventDefault();
            const scanned = barcodeScanBufferRef.current.trim();
            barcodeScanBufferRef.current = '';
            handleProcessBarcodeOrCode(scanned, 1);
            return;
          }
        } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
          barcodeScanBufferRef.current += e.key;
        }
      }

      // Se o modal de desconto por produto estiver aberto
      if (showItemDiscountModal) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setShowItemDiscountModal(false);
          barcodeInputRef.current?.focus();
        } else if (e.key === 'Enter') {
          e.preventDefault();
          handleApplyItemDiscount();
        }
        return;
      }

      // Se o modal de quantidade fracionada estiver aberto
      if (showFractionalQtyModal) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setShowFractionalQtyModal(false);
          barcodeInputRef.current?.focus();
        } else if (e.key === 'Enter') {
          e.preventDefault();
          handleConfirmFractionalQty();
        }
        return;
      }

      if (e.key === 'F12') {
        e.preventDefault();
        handleOpenFractionalModal();
      } else if (e.key === 'F2') {
        e.preventDefault();
        setShowProductLookupModal(true);
      } else if (e.key === 'F3') {
        e.preventDefault();
        if (e.shiftKey) {
          setShowQuickCustomerModal(true);
        } else {
          customerSelectRef.current?.focus();
        }
      } else if (e.key === 'F4') {
        e.preventDefault();
        discountInputRef.current?.focus();
        discountInputRef.current?.select();
      } else if (e.key === 'F9') {
        e.preventDefault();
        if (cart.length > 0) {
          handleFinalizeSale();
        }
      } else if (e.key === 'Escape') {
        if (barcodeInput) {
          setBarcodeInput('');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    cart,
    discountType,
    discountInput,
    paymentMethod,
    receivedAmount,
    selectedCustomerId,
    showProductLookupModal,
    showReceiptModal,
    showQuickCustomerModal,
    showFractionalQtyModal,
    showItemDiscountModal,
    itemDiscountInput,
    fractionalQtyInput,
    fractionalProductId,
    lastAddedItem,
    selectedLocationId,
    dbState,
    quantityInput,
    barcodeInput
  ]);

  // Cadastrar Cliente Rapidamente no Balcão
  const handleQuickRegisterCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickCustName.trim()) {
      alert('Informe obrigatoriamente o Nome do Cliente.');
      return;
    }

    const state = Database.getState();
    const nextNum = state.customers.length + 1;
    const autoCode = `CLI-${String(nextNum).padStart(4, '0')}`;

    const newCust: Customer = {
      id: 'CLI-' + Date.now(),
      code: autoCode,
      name: quickCustName.trim(),
      type: quickCustType,
      cpfCnpj: quickCustCpfCnpj.trim(),
      phone: quickCustPhone.trim(),
      email: quickCustEmail.trim() || undefined,
      city: quickCustCity.trim() || 'São Paulo',
      state: quickCustState.trim() || 'SP',
      creditLimit: parseFloat(quickCustCreditLimit) || 1000,
      status: 'ativo',
      notes: 'Cadastrado no balcão do PDV',
    };

    state.customers.unshift(newCust);
    Database.persist();

    Database.addAuditLog(
      'CRIAR_CLIENTE_PDV',
      'PDV',
      newCust.id,
      `Cliente ${newCust.name} (${newCust.code}) cadastrado no PDV Balcão por ${currentUser.name}`
    );

    // Seleciona imediatamente o cliente recém-cadastrado no PDV
    setSelectedCustomerId(newCust.id);

    toast.success(`Cliente "${newCust.name}" cadastrado e selecionado com sucesso no PDV!`, 'Cliente Cadastrado');

    // Limpa formulário e fecha modal
    setQuickCustName('');
    setQuickCustCpfCnpj('');
    setQuickCustPhone('');
    setQuickCustEmail('');
    setQuickCustCreditLimit('1000');
    setShowQuickCustomerModal(false);
  };

  // Finalizar Venda
  const handleFinalizeSale = () => {
    if (!activeCashRegister) {
      alert('É necessário ter um caixa aberto para registrar vendas.');
      setShowOpenRegisterModal(true);
      return;
    }

    if (cart.length === 0) {
      alert('Adicione pelo menos um produto antes de finalizar a venda.');
      return;
    }

    if (discountVal > maxAllowedDiscountVal + 0.01) {
      alert(
        `Desconto não autorizado! Seu perfil permite no máximo ${currentUser.permissions.maxDiscountPercent}% (${formatCurrency(maxAllowedDiscountVal)}).`
      );
      return;
    }

    if (paymentMethod === 'dinheiro' && numericReceived > 0 && numericReceived < total) {
      alert(`O valor em dinheiro informado (${formatCurrency(numericReceived)}) é menor que o total a pagar (${formatCurrency(total)}).`);
      return;
    }

    const orderNumber = `VD-${new Date().getFullYear()}-${String(dbState.orders.length + 1).padStart(5, '0')}`;
    const nowIso = new Date().toISOString();

    try {
      let currentBalances = [...dbState.stockBalances];
      const movements = [];

      for (const item of cart) {
        const loc = locations.find((l) => l.id === selectedLocationId) ||
          locations.find((l) => l.id === 'loc-comercial') ||
          locations[0] ||
          { id: 'loc-comercial', name: 'Comercial' };

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
          notes: `Venda no PDV Balcão ${orderNumber} (${currentCompany.tradeName || currentCompany.name})`,
        });

        currentBalances = updatedBalances;
        movements.push(createdMovement);
      }

      const boletoAccounts = Database.getBoletoAccounts(currentCompany.id);
      const targetBoletoAccount = paymentMethod === 'boleto'
        ? boletoAccounts.find((a) => a.id === selectedBoletoAccountId) || boletoAccounts[0] || Database.getBoletoAccounts()[0]
        : undefined;

      const newOrder: Order = {
        id: 'ORD-' + Date.now(),
        number: orderNumber,
        type: 'venda',
        origin: 'pdv',
        companyId: currentCompany.id,
        customerId: selectedCustomerId || undefined,
        customerName: selectedCustomer ? selectedCustomer.name : 'Consumidor Final (Não Identificado)',
        customerPhone: selectedCustomer?.phone || selectedCustomer?.whatsapp,
        userId: currentUser.id,
        userName: currentUser.name,
        items: cart,
        subtotal: grossSubtotal,
        discountTotal: totalItemDiscounts + discountVal,
        total,
        paymentMethod,
        bankAccountId: targetBoletoAccount?.id,
        bankAccountName: targetBoletoAccount?.name,
        installmentsCount: installments,
        receivedAmount: paymentMethod === 'dinheiro' && numericReceived > 0 ? numericReceived : total,
        changeAmount: change,
        status: 'concluido',
        stockDeducted: true,
        financialGenerated: true,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      const cashMovementType =
        paymentMethod === 'dinheiro'
          ? 'venda_dinheiro'
          : paymentMethod === 'pix'
          ? 'venda_pix'
          : paymentMethod === 'boleto'
          ? 'venda_outros'
          : 'venda_cartao';

      const updatedCashRegisters = dbState.cashRegisters.map((reg) => {
        if (reg.id === activeCashRegister.id) {
          return {
            ...reg,
            movements: [
              ...reg.movements,
              {
                id: 'MOV-' + Date.now(),
                type: cashMovementType as any,
                amount: total,
                description: `Venda ${orderNumber} - ${newOrder.customerName}`,
                timestamp: nowIso,
                userId: currentUser.id,
                orderId: newOrder.id,
              },
            ],
          };
        }
        return reg;
      });

      let updatedReceivables = [...dbState.accountsReceivable];
      if (paymentMethod === 'crediario' || paymentMethod === 'boleto') {
        const installmentValue = Number((total / installments).toFixed(2));
        for (let i = 1; i <= installments; i++) {
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + i * 30);

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
            dueDate: dueDate.toISOString().split('T')[0],
            originalValue: installmentValue,
            discount: 0,
            addition: 0,
            paidValue: 0,
            balance: installmentValue,
            paymentMethod: paymentMethod === 'boleto' ? 'Boleto Bancário' : 'Crediário Próprio',
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
      state.cashRegisters = updatedCashRegisters;
      state.accountsReceivable = updatedReceivables;
      Database.persist();

      Database.addAuditLog(
        'FINALIZAR_VENDA_PDV',
        'VENDAS',
        newOrder.id,
        `Venda PDV ${orderNumber} finalizada com sucesso. Total: ${formatCurrency(total)} via ${paymentMethod}`
      );

      setLastFinishedOrder(newOrder);
      setShowReceiptModal(true);
      setCart([]);
      setDiscountInput('');
      setReceivedAmount('');
      setSelectedCustomerId('');
      setLastAddedItem(null);
    } catch (error) {
      alert('Erro ao finalizar venda: ' + (error as Error).message);
    }
  };

  // Abrir Caixa
  const handleOpenCashRegister = () => {
    const initBalance = parseFloat(openRegisterAmount.replace(/\D/g, '')) / 100 || 0;
    const newRegister: CashRegister = {
      id: 'CX-' + Date.now(),
      companyId: currentCompany.id,
      userId: currentUser.id,
      userName: currentUser.name,
      openedAt: new Date().toISOString(),
      initialBalance: initBalance,
      status: 'aberto',
      movements: [],
    };
    Database.getState().cashRegisters.unshift(newRegister);
    Database.persist();
    Database.addAuditLog(
      'ABERTURA_CAIXA',
      'FINANCEIRO',
      newRegister.id,
      `Caixa aberto por ${currentUser.name} com fundo de troco de ${formatCurrency(initBalance)}`
    );
    setShowOpenRegisterModal(false);
  };

  // Cancelar Venda
  const handleConfirmCancelSale = (order: Order) => {
    if (!currentUser.permissions.canCancelSales) {
      alert('Acesso negado: Seu perfil não possui permissão para cancelar vendas.');
      return;
    }
    if (!cancelReason.trim()) {
      alert('Informe obrigatoriamente a justificativa para o cancelamento.');
      return;
    }

    try {
      let currentBalances = [...dbState.stockBalances];
      const movements = [];
      const nowIso = new Date().toISOString();

      for (const item of order.items) {
        const { updatedBalances, createdMovement } = StockEngine.applyMovement(currentBalances, {
          companyId: currentCompany.id,
          productId: item.productId,
          productCode: item.productCode,
          productDescription: item.description,
          locationId: item.locationId || 'loc-comercial',
          locationName: 'Comercial',
          type: 'devolucao',
          quantity: item.quantity,
          unitCost: item.unitCost,
          totalCost: item.unitCost * item.quantity,
          originDocType: 'venda',
          originDocId: order.number,
          date: nowIso,
          userId: currentUser.id,
          userName: currentUser.name,
          notes: `Estorno por cancelamento: ${cancelReason}`,
        });
        currentBalances = updatedBalances;
        movements.push(createdMovement);
      }

      const updatedOrders = dbState.orders.map((o) =>
        o.id === order.id
          ? {
              ...o,
              status: 'cancelado' as const,
              notes: `${o.notes || ''} [Cancelado em ${new Date().toLocaleString('pt-BR')}: ${cancelReason}]`,
            }
          : o
      );

      const updatedReceivables = dbState.accountsReceivable.map((rec) =>
        rec.orderId === order.id ? { ...rec, status: 'cancelado' as const } : rec
      );

      const state = Database.getState();
      state.stockBalances = currentBalances;
      state.stockMovements = [...movements, ...state.stockMovements];
      state.orders = updatedOrders;
      state.accountsReceivable = updatedReceivables;
      Database.persist();

      Database.addAuditLog(
        'CANCELAMENTO_VENDA',
        'VENDAS',
        order.id,
        `Venda ${order.number} cancelada por ${currentUser.name}. Motivo: ${cancelReason}`
      );

      setCancellingOrderId(null);
      setCancelReason('');
      alert(`Venda ${order.number} cancelada com sucesso. Estoque devidamente estornado!`);
    } catch (e) {
      alert('Erro ao cancelar: ' + (e as Error).message);
    }
  };

  const recentOrders = dbState.orders
    .filter((o) => o.companyId === currentCompany.id && o.origin === 'pdv')
    .slice(0, 10);

  const handleQuickBill = (billValue: number) => {
    setReceivedAmount(billValue.toFixed(2).replace('.', ','));
  };

  return (
    <div className="flex flex-col h-full min-h-0 space-y-2 overflow-hidden">
      {/* Alerta de Caixa Fechado */}
      {!activeCashRegister && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 flex items-center justify-between gap-2 shadow-xs shrink-0">
          <div className="flex items-center gap-2.5">
            <Lock className="text-amber-600 shrink-0" size={18} />
            <div>
              <span className="font-bold text-amber-900 text-xs mr-2">Caixa PDV Fechado:</span>
              <span className="text-[11px] text-amber-700 hidden sm:inline">
                Abra o caixa informando o fundo de troco inicial para registrar vendas.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowOpenRegisterModal(true)}
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-3 py-1 rounded-lg transition-colors shadow-xs shrink-0 cursor-pointer"
          >
            Abrir Caixa Agora
          </button>
        </div>
      )}

      {/* Barra de Status e Controles Exclusivos do PDV: GestãoFácil ERP Layout */}
      <div className="bg-white border border-slate-200 px-3 py-2 rounded-xl shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
        {/* Lado Esquerdo: Ícone Verde Redondo + Título PDV Balcão + Badge Ativo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
            <CashRegisterIcon size={20} />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-extrabold text-slate-900 leading-tight">
                PDV Balcão
              </span>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                Ativo
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-medium">
              Venda rápida e prática no balcão da sua loja
            </div>
          </div>
        </div>

        {/* Lado Direito: Empresa, Ações Rápidas, Controles de Menu e Dashboard */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Seletor Empresa */}
          <div className="hidden md:flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
            <Warehouse size={15} className="text-slate-400 shrink-0" />
            <div className="text-left">
              <span className="block text-[9px] uppercase font-bold text-slate-400 leading-none">
                Empresa
              </span>
              <span className="text-xs font-semibold text-slate-800 truncate max-w-[160px] block">
                {currentCompany.tradeName || currentCompany.name}
              </span>
            </div>
          </div>

          {/* Botão de Minimizar Menu Lateral */}
          {onToggleSidebarMinimize && (
            <button
              type="button"
              onClick={onToggleSidebarMinimize}
              className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer ${
                isSidebarMinimized
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 shadow-2xs font-bold'
                  : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
              }`}
              title={isSidebarMinimized ? 'Expandir Menu Completo' : 'Minimizar Menu (Apenas Ícones)'}
            >
              {isSidebarMinimized ? (
                <PanelLeftOpen size={14} className="text-emerald-700" />
              ) : (
                <PanelLeftClose size={14} className="text-slate-500" />
              )}
              <span className="hidden sm:inline">{isSidebarMinimized ? 'Menu: Ícones' : 'Minimizar Menu'}</span>
            </button>
          )}

          {/* Botão para Ocultar/Exibir Dashboard Informativo */}
          <button
            type="button"
            onClick={toggleKpis}
            className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer ${
              isKpisHidden
                ? 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200 font-bold'
            }`}
            title={isKpisHidden ? 'Exibir cards de indicadores no PDV' : 'Ocultar cards de indicadores no PDV'}
          >
            {isKpisHidden ? (
              <Eye size={14} className="text-slate-500" />
            ) : (
              <EyeOff size={14} className="text-emerald-600" />
            )}
            <span className="hidden sm:inline">{isKpisHidden ? 'Mostrar Dashboard' : 'Ocultar Dashboard'}</span>
          </button>

          {/* Atalhos Rápidos */}
          <button
            type="button"
            onClick={() => setShowRecentSalesModal(true)}
            className="flex items-center gap-1 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200 transition-colors cursor-pointer"
            title="Ver últimas vendas do turno"
          >
            <Receipt size={14} className="text-slate-500" />
            <span>Últimas ({recentOrders.length})</span>
          </button>
        </div>
      </div>

      {/* DASHBOARD INFORMATIVO NO PDV: Faturamento Vendas, Canais de Venda, Previsões Financeiras e Estoque Crítico */}
      {!isKpisHidden && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200 shrink-0">
          {/* 1. Faturamento Vendas */}
          <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 text-[10px] font-semibold">
              <span>Faturamento Vendas</span>
              <DollarSign size={13} className="text-emerald-600" />
            </div>
            <div className="text-base sm:text-lg font-extrabold text-slate-900 mt-0.5">
              {formatCurrency(totalRevenue)}
            </div>
            <div className="text-[10px] text-slate-400 flex justify-between">
              <span>{companyOrders.length} pedidos</span>
              <span className="text-emerald-700 font-bold">Ticket: {formatCurrency(avgTicket)}</span>
            </div>
          </div>

          {/* 2. Canais de Venda */}
          <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 text-[10px] font-semibold">
              <span>Canais de Venda</span>
              <Smartphone size={13} className="text-blue-600" />
            </div>
            <div className="text-[11px] font-bold text-slate-800 mt-1">
              Balcão: <strong className="text-emerald-700">{pdvSales.length}</strong> ({formatCurrency(pdvSales.reduce((s, o) => s + o.total, 0))})
            </div>
            <div className="text-[10px] font-bold text-blue-700">
              Mobile: <strong>{externalSales.length}</strong> ({formatCurrency(externalSales.reduce((s, o) => s + o.total, 0))})
            </div>
          </div>

          {/* 3. Previsões Financeiras */}
          <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 text-[10px] font-semibold">
              <span>Previsões Financeiras</span>
              <TrendingUp size={13} className="text-blue-600" />
            </div>
            <div className="text-[10px] font-semibold text-emerald-700 mt-1">
              A Receber: <strong className="font-extrabold">{formatCurrency(openReceivables)}</strong>
            </div>
            <div className="text-[10px] font-semibold text-rose-600">
              A Pagar: <strong className="font-extrabold">{formatCurrency(openPayables)}</strong>
            </div>
          </div>

          {/* 4. Estoque Crítico */}
          <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 text-[10px] font-semibold">
              <span>Estoque Crítico</span>
              <AlertTriangle size={13} className="text-amber-600" />
            </div>
            <div className="text-base sm:text-lg font-extrabold text-amber-600 mt-0.5">
              {lowStockProducts.length} itens
            </div>
            <div className="text-[10px] text-slate-400">
              Abaixo do estoque mínimo
            </div>
          </div>
        </div>
      )}

      {/* Barra de Entrada Rápida de Produtos (Leitor de Código de Barras / Digitação) */}
      <form
        onSubmit={handleBarcodeSubmit}
        className="bg-white p-2 sm:p-2.5 rounded-xl border border-slate-200 shadow-xs relative shrink-0"
      >
        <div className="flex flex-col sm:flex-row items-stretch gap-2">
          {/* Seletor do Local de Saída */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 shrink-0">
            <Warehouse size={14} className="text-slate-500" />
            <span className="text-[10px] font-bold text-slate-500 whitespace-nowrap">Saída:</span>
            <select
              value={selectedLocationId}
              onChange={(e) => setSelectedLocationId(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-hidden cursor-pointer"
            >
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name} {loc.id === 'loc-comercial' || loc.name.toLowerCase() === 'comercial' ? '(Padrão)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Campo Quantidade Multiplicadora */}
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 shrink-0 w-24">
            <span className="text-[10px] font-bold text-slate-500 mr-1">Qtd:</span>
            <input
              type="text"
              value={quantityInput}
              onChange={(e) => setQuantityInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  barcodeInputRef.current?.focus();
                  barcodeInputRef.current?.select();
                }
              }}
              className="w-full bg-transparent text-xs font-extrabold text-slate-900 text-center focus:outline-hidden"
              title="Quantidade a adicionar ao escanear ou teclar Enter (Padrão: 1 unidade)"
            />
          </div>

          {/* Input Principal: Código de Barras / Código Interno / Descrição */}
          <div className="relative flex-1">
            <Barcode className="absolute left-2.5 top-2 text-slate-400" size={18} />
            <input
              ref={barcodeInputRef}
              type="text"
              placeholder="Bipar leitor ou digitar código / barras (ex: PA-301 ou 789...) e teclar Enter..."
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.stopPropagation();
                  handleProcessBarcodeOrCode(barcodeInput);
                }
              }}
              className="w-full pl-8 pr-24 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              autoFocus
            />

            {/* Botão submit invisível para assegurar envio nativo do formulário com Enter em qualquer navegador */}
            <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />

            {/* Botão de Busca F2 dentro do input */}
            <button
              type="button"
              onClick={() => setShowProductLookupModal(true)}
              className="absolute right-1 top-1 bottom-1 px-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md text-[11px] font-bold flex items-center gap-1 transition-colors border border-blue-200 cursor-pointer"
            >
              <Search size={12} />
              <span>Buscar [F2]</span>
            </button>
          </div>
        </div>

        {/* Feedback Visual de Confirmação da Leitura / Contagem de Unidade */}
        {feedbackMessage && (
          <div
            className={`mt-2 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center justify-between animate-fadeIn transition-all ${
              feedbackMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs'
                : feedbackMessage.type === 'error'
                ? 'bg-rose-50 text-rose-800 border border-rose-300 shadow-2xs'
                : 'bg-amber-50 text-amber-800 border border-amber-300 shadow-2xs'
            }`}
          >
            <div className="flex items-center gap-2 truncate">
              {feedbackMessage.type === 'success' ? (
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              ) : feedbackMessage.type === 'error' ? (
                <AlertCircle size={16} className="text-rose-600 shrink-0" />
              ) : (
                <AlertTriangle size={16} className="text-amber-600 shrink-0" />
              )}
              <span className="truncate">{feedbackMessage.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedbackMessage(null)}
              className="text-slate-400 hover:text-slate-700 p-0.5 rounded cursor-pointer shrink-0 ml-2"
              title="Fechar notificação"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Autocomplete Dropdown ao digitar */}
        {searchResults.length > 0 && barcodeInput.trim() !== '' && (
          <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-30 max-h-56 overflow-y-auto divide-y divide-slate-100">
            {searchResults.slice(0, 6).map((prod) => {
              const stock = StockEngine.getBalance(dbState.stockBalances, prod.id, selectedLocationId);
              return (
                <div
                  key={prod.id}
                  onClick={() => {
                    handleAddToCart(prod, parseFloat(quantityInput) || 1);
                  }}
                  className="p-2.5 hover:bg-blue-50/70 cursor-pointer flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                      {prod.code}
                    </span>
                    <div>
                      <div className="font-bold text-xs text-slate-900">{prod.description}</div>
                      <div className="text-[10px] text-slate-400">
                        {prod.barcode ? `EAN: ${prod.barcode} • ` : ''}
                        Estoque no local: <strong className={stock.quantity <= 0 ? 'text-rose-600' : 'text-emerald-600'}>{formatQuantity(stock.quantity)} {prod.unit}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-extrabold text-xs sm:text-sm text-slate-900">{formatCurrency(prod.salePrice)}</div>
                    <span className="text-[9px] text-blue-600 font-bold">Clique ou Enter p/ Inserir</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </form>

      {/* Grid Principal do PDV: Cupom/Tabela de Itens (Esquerda) + Cockpit de Pagamento (Direita) */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-2.5 overflow-hidden">
        {/* Painel Esquerdo: Cupom Eletrônico de Balcão */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col h-full min-h-0 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Cabeçalho da Tabela de Itens */}
          <div className="bg-slate-50/90 px-3.5 py-2.5 border-b border-slate-200 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-blue-600" />
              <span className="font-extrabold text-sm sm:text-base uppercase tracking-wider text-slate-800">
                Itens da Venda ({cart.reduce((s, i) => s + i.quantity, 0)} volumes)
              </span>
            </div>
            <span className="text-xs sm:text-sm font-bold text-slate-600 font-mono">
              {cart.length} produto(s) adicionado(s)
            </span>
          </div>

          {/* Tabela de Itens Tipo Ticket Fiscal / Ledger */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-100/90 text-slate-700 font-extrabold uppercase text-[11px] sm:text-xs sticky top-0 border-b border-slate-200 z-10">
                <tr>
                  <th className="py-2.5 px-2.5 w-10 text-center">#</th>
                  <th className="py-2.5 px-2.5">Código</th>
                  <th className="py-2.5 px-3">Descrição do Produto</th>
                  <th className="py-2.5 px-2.5 text-center">Qtd</th>
                  <th className="py-2.5 px-2 text-center">UN</th>
                  <th className="py-2.5 px-3 text-right">Unitário</th>
                  <th className="py-2.5 px-3 text-right">Total Líquido</th>
                  <th className="py-2.5 px-2 text-center w-20">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {cart.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center">
                      <div className="max-w-xs mx-auto space-y-2 text-slate-400">
                        <Barcode size={44} className="mx-auto text-slate-300" />
                        <div className="font-extrabold text-slate-800 text-base">Nenhum item na venda</div>
                        <div className="text-xs text-slate-500">
                          Passe o código de barras no leitor, digite acima ou tecle <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono text-slate-700 font-bold">F2</kbd> para consultar.
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  cart.map((item, idx) => (
                    <tr
                      key={item.id}
                      className={`hover:bg-blue-50/50 transition-colors ${
                        lastAddedItem?.id === item.id ? 'bg-amber-50/70' : ''
                      }`}
                    >
                      <td className="py-2 px-2.5 text-center text-slate-400 font-mono text-xs font-semibold">
                        {String(idx + 1).padStart(2, '0')}
                      </td>
                      <td className="py-2 px-2.5 font-mono font-extrabold text-blue-700 whitespace-nowrap text-xs sm:text-sm">
                        {item.productCode}
                      </td>
                      <td className="py-2 px-3 font-bold text-slate-900 leading-snug text-sm sm:text-base">
                        <div className="flex items-center flex-wrap gap-1">
                          <span>{item.description}</span>
                          {item.isMasterPack && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
                              <Boxes size={11} className="text-amber-700" />
                              Master ({item.masterPackUnits} un/{item.unit})
                            </span>
                          )}
                          {item.discountValue > 0 && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-black uppercase px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-300">
                              <Tag size={10} />
                              Desc: -{formatCurrency(item.discountValue)} {item.discountPercent > 0 ? `(${item.discountPercent.toFixed(1).replace('.0', '')}%)` : ''}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-2.5 text-center">
                        <div className="inline-flex items-center border border-slate-300 rounded-lg bg-slate-50 shadow-2xs">
                          <button
                            type="button"
                            onClick={() => handleUpdateQuantity(item.productId, -1)}
                            className="px-1.5 py-1 hover:bg-slate-200 text-slate-600 rounded-l cursor-pointer"
                            title="Diminuir quantidade (-1)"
                          >
                            <Minus size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenFractionalModal(item.productId)}
                            className="px-2 py-0.5 text-center text-xs sm:text-sm font-black text-slate-900 hover:text-emerald-700 hover:bg-emerald-50 font-mono transition-colors cursor-pointer"
                            title="Clique para alterar quantidade fracionada (até 3 casas decimais)"
                          >
                            {formatQuantity(item.quantity, 3)}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateQuantity(item.productId, 1)}
                            className="px-1.5 py-1 hover:bg-slate-200 text-slate-600 rounded-r cursor-pointer"
                            title="Aumentar quantidade (+1)"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      </td>
                      <td className="py-2 px-2 text-center text-slate-600 font-bold font-mono text-xs">
                        {item.unit}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-semibold text-slate-600 text-xs sm:text-sm">
                        {formatCurrency(item.unitPrice)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono">
                        {item.discountValue > 0 ? (
                          <div>
                            <span className="block text-[11px] text-slate-400 line-through">
                              {formatCurrency(item.quantity * item.unitPrice)}
                            </span>
                            <span className="block font-black text-slate-900 text-sm sm:text-base">
                              {formatCurrency(item.totalPrice)}
                            </span>
                          </div>
                        ) : (
                          <span className="font-black text-slate-900 text-sm sm:text-base">
                            {formatCurrency(item.totalPrice)}
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-2 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          {/* Botão de Desconto por Produto ao lado de Remover Item */}
                          <button
                            type="button"
                            onClick={() => handleOpenItemDiscountModal(item)}
                            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                              item.discountValue > 0 || item.discountPercent > 0
                                ? 'bg-amber-100 text-amber-800 hover:bg-amber-200 ring-1 ring-amber-400 font-bold shadow-2xs'
                                : 'hover:bg-amber-50 text-slate-400 hover:text-amber-600'
                            }`}
                            title={
                              item.discountValue > 0 || item.discountPercent > 0
                                ? `Desconto no produto: -${formatCurrency(item.discountValue)} (${item.discountPercent.toFixed(1).replace('.0', '')}%). Clique para editar`
                                : 'Aplicar desconto neste produto (% ou R$)'
                            }
                          >
                            <Tag size={14} />
                          </button>

                          {/* Botão Remover Item */}
                          <button
                            type="button"
                            onClick={() => handleRemoveFromCart(item.productId)}
                            className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                            title="Remover Item"
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

          {/* Rodapé Informativo do Cupom: Último Item Escaneado */}
          {lastAddedItem && (
            <div className="bg-slate-900 text-white px-3.5 py-2 text-xs sm:text-sm flex items-center justify-between border-t border-slate-800 shrink-0">
              <div className="flex items-center gap-2 truncate">
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                <span className="text-slate-400 text-xs font-bold uppercase">Último Item:</span>
                <span className="font-bold truncate text-sm sm:text-base text-white">{lastAddedItem.description}</span>
                <span className="text-emerald-300 font-mono text-xs sm:text-sm">({formatQuantity(lastAddedItem.quantity)} {lastAddedItem.unit} x {formatCurrency(lastAddedItem.unitPrice)})</span>
                {lastAddedItem.discountValue > 0 && (
                  <span className="text-amber-300 text-xs font-bold font-mono">
                    [-{formatCurrency(lastAddedItem.discountValue)}]
                  </span>
                )}
              </div>
              <span className="font-black text-sm sm:text-lg text-emerald-400 font-mono shrink-0 ml-3">
                {formatCurrency(lastAddedItem.totalPrice)}
              </span>
            </div>
          )}
        </div>

        {/* Painel Direito: Cockpit Financeiro & Finalização Fixado na Tela */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col h-full min-h-0 justify-between gap-1.5 overflow-hidden">
          {/* Identificação do Cliente: Somente o seletor e o botão + Novo Cliente */}
          <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-xs shrink-0">
            <div className="flex items-center gap-1.5">
              <select
                ref={customerSelectRef}
                value={selectedCustomerId}
                onChange={(e) => {
                  if (e.target.value === '__NOVO_CLIENTE__') {
                    setShowQuickCustomerModal(true);
                  } else {
                    setSelectedCustomerId(e.target.value);
                  }
                }}
                className="flex-1 min-w-0 bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-2 text-xs font-semibold text-slate-800 focus:outline-hidden focus:bg-white truncate"
              >
                <option value="">Consumidor Final (Não Identificado)</option>
                <option value="__NOVO_CLIENTE__" className="font-bold text-emerald-700 bg-emerald-50">
                  ➕ Cadastrar Novo Cliente no Balcão...
                </option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.cpfCnpj ? `(${c.cpfCnpj})` : ''}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => setShowQuickCustomerModal(true)}
                className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1.5 rounded-lg border border-emerald-200 transition-colors cursor-pointer shrink-0 shadow-2xs"
                title="Cadastrar novo cliente no balcão [Shift+F3]"
              >
                <UserPlus size={13} />
                <span className="whitespace-nowrap">+ Novo Cliente</span>
              </button>
            </div>
          </div>

          {/* Painel LED de Total a Pagar do PDV */}
          <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-white px-3.5 py-2 sm:py-2.5 rounded-xl shadow-md border border-slate-800 shrink-0 space-y-1">
            {/* Subtotal em destaque legível de longe */}
            <div className="flex justify-between items-center font-mono text-xs sm:text-sm">
              <span className="font-bold tracking-wider text-slate-400 uppercase">
                SUBTOTAL ({cart.reduce((s, i) => s + i.quantity, 0)} ITENS):
              </span>
              <span className="text-sm sm:text-base font-black text-slate-100">
                {formatCurrency(grossSubtotal)}
              </span>
            </div>

            {totalItemDiscounts > 0 && (
              <div className="flex justify-between items-center text-amber-400 font-mono text-xs sm:text-sm">
                <span className="font-bold">
                  DESC. PRODUTOS:
                </span>
                <span className="font-extrabold">-{formatCurrency(totalItemDiscounts)}</span>
              </div>
            )}

            {discountVal > 0 && (
              <div className="flex justify-between items-center text-rose-400 font-mono text-xs sm:text-sm">
                <span className="font-bold">
                  DESCONTO PEDIDO [F4] ({discountType === 'percent' ? `${effectiveDiscountPercent.toFixed(1).replace('.0', '')}%` : `R$ ${formatCurrency(discountVal)}`}):
                </span>
                <span className="font-extrabold">-{formatCurrency(discountVal)}</span>
              </div>
            )}

            {/* Total Líquido Gigante em estilo LED Balcão */}
            <div className="pt-1.5 border-t border-slate-800/90 flex items-baseline justify-between gap-2">
              <div>
                <span className="block text-xs sm:text-sm font-black text-emerald-400 uppercase tracking-widest font-mono">
                  TOTAL LÍQUIDO
                </span>
                <span className="text-[10px] text-slate-400 font-mono hidden sm:block">
                  Cálculo automático
                </span>
              </div>
              <div className="text-2xl sm:text-3xl lg:text-[36px] font-black text-emerald-400 font-mono tracking-tight leading-none drop-shadow-xs">
                {formatCurrency(total)}
              </div>
            </div>
          </div>

          {/* Formas de Pagamento e Desconto com Botão Finalizar Fixado */}
          <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200 shadow-xs flex-1 min-h-0 flex flex-col justify-between overflow-hidden">
            <div className="space-y-1.5 overflow-hidden">
              {/* Desconto com Alternância entre % e R$ */}
              <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-100 gap-1">
                <div className="flex items-center gap-1">
                  <span className="font-bold text-slate-700 text-[11px]">Desconto [F4]:</span>
                  <div className="inline-flex rounded-md bg-slate-100 p-0.5 border border-slate-200">
                    <button
                      type="button"
                      onClick={() => handleDiscountTypeChange('percent')}
                      className={`px-1.5 py-0.5 text-[10px] font-bold rounded cursor-pointer transition-all ${
                        discountType === 'percent'
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                      title="Desconto Percentual (%)"
                    >
                      %
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDiscountTypeChange('value')}
                      className={`px-1.5 py-0.5 text-[10px] font-bold rounded cursor-pointer transition-all ${
                        discountType === 'value'
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                      title="Desconto em Reais (R$)"
                    >
                      R$
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <div className="relative flex items-center">
                    {discountType === 'value' && (
                      <span className="absolute left-1.5 text-[10px] font-bold text-slate-400">R$</span>
                    )}
                    <input
                      ref={discountInputRef}
                      type="text"
                      inputMode="decimal"
                      value={discountInput}
                      onChange={(e) => setDiscountInput(e.target.value.replace(/[^0-9.,]/g, ''))}
                      placeholder="0"
                      className={`w-14 py-0.5 bg-slate-50 border border-slate-200 rounded-md text-right font-extrabold text-slate-900 text-xs focus:outline-hidden focus:bg-white focus:ring-1 focus:ring-emerald-500 ${
                        discountType === 'value' ? 'pl-5 pr-1' : 'px-1'
                      }`}
                    />
                  </div>
                  <span className="text-slate-400 font-semibold text-[10px] whitespace-nowrap">
                    {discountType === 'percent' ? (
                      <>(Máx: {currentUser.permissions.maxDiscountPercent}%)</>
                    ) : (
                      <>(Máx: {formatCurrency((subtotalAfterItemDiscounts * currentUser.permissions.maxDiscountPercent) / 100)})</>
                    )}
                  </span>
                </div>
              </div>

              {/* Seleção da Forma de Pagamento */}
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-700 block">Forma de Pagamento:</span>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1">
                  {[
                    { id: 'pix', label: 'Pix', icon: <QrCode size={12} /> },
                    { id: 'dinheiro', label: 'Dinheiro', icon: <DollarSign size={12} /> },
                    { id: 'cartao_debito', label: 'Débito', icon: <CreditCard size={12} /> },
                    { id: 'cartao_credito', label: 'Crédito', icon: <CreditCard size={12} /> },
                    { id: 'boleto', label: 'Boleto', icon: <Barcode size={12} /> },
                    { id: 'crediario', label: 'Crediário', icon: <FileText size={12} /> },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPaymentMethod(p.id as any)}
                      className={`flex flex-col items-center justify-center gap-0.5 py-1 px-0.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                        paymentMethod === p.id
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {p.icon}
                      <span className="truncate">{p.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Painel Específico: Dinheiro (Valor Recebido e Troco Ampliados, Harmônicos e com Botão Finalizar Fixo) */}
              {paymentMethod === 'dinheiro' && (
                <div className="bg-gradient-to-br from-emerald-50/80 via-slate-50 to-emerald-50/40 p-2 sm:p-2.5 rounded-xl border border-emerald-300 shadow-2xs space-y-1.5 animate-fadeIn">
                  <div className="grid grid-cols-2 gap-2 sm:gap-2.5 items-stretch">
                    {/* Campo Valor Recebido Ampliado */}
                    <div className="bg-white p-2 rounded-xl border border-emerald-200 shadow-2xs flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-1">
                        <span className="block text-[11px] font-black text-slate-700 uppercase tracking-wide">
                          Valor Recebido:
                        </span>
                        <span className="text-[10px] font-bold text-emerald-700 font-mono bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200">
                          R$
                        </span>
                      </div>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400 select-none">
                          R$
                        </span>
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder="0,00"
                          value={receivedAmount}
                          onChange={(e) => setReceivedAmount(e.target.value.replace(/[^0-9.,]/g, ''))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (cart.length > 0) {
                                handleFinalizeSale();
                              }
                            }
                          }}
                          className="w-full pl-9 pr-2 py-2 bg-slate-50 hover:bg-white focus:bg-white border-2 border-emerald-500 focus:border-emerald-600 rounded-lg text-right font-black text-slate-900 text-xl sm:text-2xl font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-400 shadow-inner transition-all"
                        />
                      </div>
                    </div>

                    {/* Informação do Troco Ampliada e Harmônica */}
                    <div className={`p-2 rounded-xl border-2 flex flex-col justify-between text-right transition-all shadow-2xs ${
                      change > 0
                        ? 'bg-emerald-50 border-emerald-500'
                        : numericReceived > 0 && numericReceived < total
                        ? 'bg-amber-50 border-amber-300'
                        : 'bg-white border-slate-200'
                    }`}>
                      <div className="flex items-center justify-between mb-1">
                        {change > 0 ? (
                          <span className="text-[10px] font-black uppercase text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded-md">
                            Devolver
                          </span>
                        ) : numericReceived > 0 && numericReceived < total ? (
                          <span className="text-[10px] font-black uppercase text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded-md">
                            Pendente
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-400">
                            Status
                          </span>
                        )}
                        <span className="block text-[11px] font-black text-slate-700 uppercase tracking-wide">
                          Troco:
                        </span>
                      </div>
                      <div className="flex flex-col items-end justify-center py-0.5">
                        <span className={`text-xl sm:text-2xl lg:text-[26px] font-black font-mono leading-none tracking-tight ${
                          change > 0
                            ? 'text-emerald-600'
                            : numericReceived > 0 && numericReceived < total
                            ? 'text-amber-700'
                            : 'text-slate-400'
                        }`}>
                          {formatCurrency(change)}
                        </span>
                        {numericReceived > 0 && numericReceived < total && (
                          <span className="text-[10px] font-bold text-amber-700 font-mono mt-0.5">
                            Falta {formatCurrency(total - numericReceived)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Cédulas Rápidas e Exato em linha harmoniosa */}
                  <div className="flex items-center justify-between gap-1 pt-1 border-t border-emerald-200/60 text-[10px]">
                    <span className="text-slate-500 font-extrabold text-[10px] hidden sm:inline">Atalhos:</span>
                    <div className="flex items-center gap-1 w-full sm:w-auto justify-between sm:justify-end">
                      {[10, 20, 50, 100].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => handleQuickBill(val)}
                          className="flex-1 sm:flex-initial px-2 py-0.5 bg-white hover:bg-emerald-100 hover:text-emerald-900 border border-slate-300 font-black text-slate-700 rounded-md shadow-2xs transition-colors cursor-pointer text-center text-[11px]"
                        >
                          R${val}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => handleQuickBill(total)}
                        className="flex-1 sm:flex-initial px-2.5 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-md shadow-2xs transition-colors cursor-pointer text-center text-[11px]"
                        title="Valor Exato da Venda"
                      >
                        Exato
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Painel Específico: Boleto Bancário (Conta/Banco Vinculado para Emissão) */}
              {paymentMethod === 'boleto' && (
                <div className="bg-amber-50/80 p-1.5 rounded-lg border border-amber-300 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-amber-900 flex items-center gap-1">
                      <Barcode size={12} className="text-amber-700" />
                      Conta / Banco Vinculado ao Boleto:
                    </span>
                    <span className="text-[9px] font-bold text-amber-700 bg-amber-100 px-1 rounded">
                      Cobrança
                    </span>
                  </div>
                  <select
                    value={selectedBoletoAccountId}
                    onChange={(e) => setSelectedBoletoAccountId(e.target.value)}
                    className="w-full bg-white border border-amber-300 rounded-md px-2 py-1 text-xs font-bold text-slate-800 cursor-pointer focus:outline-hidden focus:ring-1 focus:ring-amber-500 shadow-2xs"
                  >
                    {Database.getBoletoAccounts(currentCompany.id).map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} {acc.bankCode ? `(${acc.bankCode})` : ''} - Ag: {acc.agency || '-'} C/C: {acc.accountNumber || '-'}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Painel Específico: Cartão de Crédito, Boleto ou Crediário (Parcelamento) */}
              {(paymentMethod === 'cartao_credito' || paymentMethod === 'crediario' || paymentMethod === 'boleto') && (
                <div className="flex justify-between items-center text-xs bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                  <span className="font-bold text-slate-700 text-[11px]">
                    {paymentMethod === 'boleto' ? 'Parcelas Boleto:' : 'Parcelamento:'}
                  </span>
                  <select
                    value={installments}
                    onChange={(e) => setInstallments(Number(e.target.value))}
                    className="bg-white border border-slate-300 rounded-md px-2 py-0.5 text-xs font-bold text-slate-900 cursor-pointer"
                  >
                    {[1, 2, 3, 4, 5, 6, 10, 12].map((n) => (
                      <option key={n} value={n}>
                        {n}x de {formatCurrency(total / n)}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Botão FINALIZAR VENDA (F9) - Sempre visível e fixado na tela sem scroll */}
            <button
              type="button"
              disabled={cart.length === 0}
              onClick={handleFinalizeSale}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-extrabold text-sm sm:text-base py-2.5 sm:py-3 rounded-xl shadow-md hover:shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0 mt-1.5"
            >
              <CheckCircle2 size={18} />
              <span>FINALIZAR VENDA (F9)</span>
            </button>
          </div>
        </div>
      </div>

      {/* MODAL: CONSULTA / BUSCA RÁPIDA DE PRODUTOS [F2] */}
      {showProductLookupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl p-5 space-y-3.5 max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Search size={18} className="text-blue-600" />
                <h3 className="font-bold text-sm text-slate-900">Consulta de Produtos & Preços [F2]</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowProductLookupModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Pesquisar por descrição, código de barras ou família..."
                value={productLookupSearch}
                onChange={(e) => setProductLookupSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:bg-white"
                autoFocus
              />
            </div>

            {/* Lista dos Produtos com Preço e Estoque */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 text-xs border border-slate-100 rounded-xl">
              {lookupFilteredProducts.length === 0 ? (
                <div className="p-8 text-center text-slate-400">Nenhum produto encontrado.</div>
              ) : (
                lookupFilteredProducts.map((p) => {
                  const stock = StockEngine.getBalance(dbState.stockBalances, p.id, selectedLocationId);
                  const totalStock = StockEngine.getTotalProductStock(dbState.stockBalances, p.id);

                  return (
                    <div
                      key={p.id}
                      onClick={() => {
                        handleAddToCart(p, parseFloat(quantityInput) || 1);
                        setShowProductLookupModal(false);
                      }}
                      className="p-3 hover:bg-blue-50/60 cursor-pointer flex items-center justify-between transition-colors group"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                            {p.code}
                          </span>
                          <span className="font-bold text-slate-800 text-xs sm:text-sm group-hover:text-blue-600">
                            {p.description}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2">
                          {p.barcode && <span>EAN: {p.barcode} • </span>}
                          <span>Família: {p.family} • </span>
                          <span className={stock.quantity <= 0 ? 'text-rose-600 font-bold' : 'text-emerald-700 font-semibold'}>
                            Estoque Local: {formatQuantity(stock.quantity)} {p.unit} (Total: {formatQuantity(totalStock.physical)})
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="font-extrabold text-sm text-slate-900">{formatCurrency(p.salePrice)}</div>
                        <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                          + Adicionar à Venda
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setShowProductLookupModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl"
              >
                Fechar [ESC]
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: QUANTIDADE FRACIONADA [F12] (ATÉ 3 CASAS DECIMAIS COM RECÁLCULO AUTOMÁTICO DO TOTAL LÍQUIDO) */}
      {showFractionalQtyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-5 space-y-4 max-h-[90vh] flex flex-col">
            {/* Cabeçalho */}
            <div className="flex justify-between items-start pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-700 shrink-0">
                  <Scale size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-base text-slate-900">Quantidade Fracionada</h3>
                    <kbd className="px-2 py-0.5 bg-emerald-100 border border-emerald-300 text-emerald-800 text-[11px] font-mono font-bold rounded">
                      F12
                    </kbd>
                  </div>
                  <p className="text-xs text-slate-500">
                    Até 3 casas decimais após a vírgula com cálculo automático do Total Líquido.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowFractionalQtyModal(false);
                  barcodeInputRef.current?.focus();
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                title="Fechar [Esc]"
              >
                <X size={18} />
              </button>
            </div>

            {/* Informações do Produto Selecionado ou Seletor */}
            {selectedFractionalItem ? (
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                    Produto Selecionado no Cupom:
                  </span>
                  <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    {selectedFractionalItem.productCode}
                  </span>
                </div>
                <div className="font-bold text-slate-900 text-sm sm:text-base leading-snug">
                  {selectedFractionalItem.description}
                </div>
                <div className="flex items-center justify-between text-xs text-slate-600 pt-1 border-t border-slate-200/70">
                  <span>
                    Preço Unitário:{' '}
                    <strong className="text-slate-900 font-mono">{formatCurrency(selectedFractionalItem.unitPrice)}</strong>
                    {' / '}{selectedFractionalItem.unit}
                  </span>
                  {selectedFractionalBal && (
                    <span className="text-[11px] text-slate-500">
                      Estoque no local:{' '}
                      <strong className={selectedFractionalBal.quantity <= 0 ? 'text-rose-600' : 'text-emerald-700'}>
                        {formatQuantity(selectedFractionalBal.quantity, 3)} {selectedFractionalItem.unit}
                      </strong>
                    </span>
                  )}
                </div>

                {/* Se houver mais de 1 item no carrinho, permitir alternar facilmente */}
                {cart.length > 1 && (
                  <div className="pt-2 border-t border-slate-200/70">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      Alternar Item do Cupom:
                    </label>
                    <select
                      value={fractionalProductId}
                      onChange={(e) => handleOpenFractionalModal(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                    >
                      {cart.map((it) => (
                        <option key={it.productId} value={it.productId}>
                          {it.productCode} - {it.description} (Atual: {formatQuantity(it.quantity, 3)} {it.unit})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 space-y-1">
                <span className="font-bold block">Definir Quantidade Multiplicadora para a Próxima Leitura</span>
                <p className="text-blue-700">
                  Nenhum item adicionado ao carrinho ainda. O valor informado será aplicado automaticamente ao próximo produto escaneado.
                </p>
              </div>
            )}

            {/* Formulário / Campo da Quantidade Fracionada */}
            <form onSubmit={(e) => { e.preventDefault(); handleConfirmFractionalQty(); }} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Quantidade Fracionada ({selectedFractionalItem?.unit || 'UN / KG / MT'}):
                </label>
                <div className="relative">
                  <input
                    ref={fractionalInputRef}
                    type="text"
                    inputMode="decimal"
                    placeholder="0,000"
                    value={fractionalQtyInput}
                    onChange={(e) => handleQtyInputChange(e.target.value)}
                    className="w-full pl-4 pr-16 py-3 bg-slate-50 border-2 border-emerald-500/80 rounded-xl text-2xl font-black text-center text-slate-900 font-mono focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-emerald-400 focus:border-emerald-600 transition-all shadow-inner"
                    autoFocus
                  />
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 font-mono font-bold text-xs text-slate-500 bg-slate-200 px-2 py-1 rounded">
                    {selectedFractionalItem?.unit || 'UN'}
                  </div>
                </div>
                <span className="block text-[11px] text-slate-500 mt-1">
                  Digite com vírgula ou ponto (máx. 3 casas decimais, ex: <strong>0,350</strong> ou <strong>1,275</strong>)
                </span>
              </div>

              {/* Botões Rápidos de Incremento / Atalhos de Peso / Metragem */}
              <div>
                <span className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Adicionar Fracionamento Rápido:
                </span>
                <div className="grid grid-cols-5 gap-1.5">
                  {[0.05, 0.1, 0.25, 0.5, 1.0].map((step) => (
                    <button
                      key={step}
                      type="button"
                      onClick={() => handleAddFraction(step)}
                      className="px-2 py-1.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200 hover:border-emerald-300 rounded-lg text-xs font-bold font-mono transition-colors cursor-pointer text-slate-700"
                    >
                      +{step.toFixed(3).replace('.', ',')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Botões de Valores Prontos (Presets) */}
              <div>
                <span className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Valores Prontos Comuns:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[0.1, 0.25, 0.5, 0.75, 1.0, 1.5, 2.0, 5.0].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleSetPreset(preset)}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold font-mono text-slate-700 transition-colors cursor-pointer"
                    >
                      {preset.toFixed(3).replace('.', ',')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Painel do Cálculo Automático do Total Líquido em Tempo Real */}
              <div className="p-3.5 bg-slate-900 rounded-xl text-white border border-slate-800 shadow-md space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1.5 font-bold text-emerald-400">
                    <Calculator size={14} />
                    Cálculo Automático do Total Líquido
                  </span>
                  <span className="font-mono text-[11px] text-slate-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                    {previewFractionalRounded.toFixed(3).replace('.', ',')} × {formatCurrency(itemUnitPrice)}
                  </span>
                </div>

                {selectedFractionalItem && (
                  <div className="flex items-center justify-between text-xs text-slate-300 pt-1 border-t border-slate-800">
                    <span>Subtotal deste item:</span>
                    <span className="font-mono font-bold text-white text-sm">
                      {formatCurrency(previewItemNetTotal)}
                    </span>
                  </div>
                )}

                <div className="flex items-baseline justify-between pt-2 border-t border-slate-800">
                  <div>
                    <span className="text-xs font-black tracking-wider text-emerald-400 uppercase font-mono block">
                      TOTAL LÍQUIDO DA VENDA
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Recalculado instantaneamente
                    </span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono tracking-tight drop-shadow-xs">
                    {formatCurrency(simulatedTotalLiquido)}
                  </div>
                </div>
              </div>

              {/* Ações / Botões */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowFractionalQtyModal(false);
                    barcodeInputRef.current?.focus();
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar [Esc]
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 size={16} />
                  <span>Confirmar Quantidade [Enter]</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DESCONTO POR PRODUTO */}
      {showItemDiscountModal && (() => {
        const itemUnderDiscount = cart.find((i) => i.productId === discountingItemId);
        if (!itemUnderDiscount) return null;
        const itemGrossTotal = itemUnderDiscount.quantity * itemUnderDiscount.unitPrice;
        const rawInput = parseFloat(itemDiscountInput.replace(',', '.')) || 0;
        let previewDiscVal = 0;
        let previewDiscPct = 0;
        if (itemDiscountType === 'percent') {
          previewDiscPct = Math.min(100, Math.max(0, rawInput));
          previewDiscVal = (itemGrossTotal * previewDiscPct) / 100;
        } else {
          previewDiscVal = Math.min(itemGrossTotal, Math.max(0, rawInput));
          previewDiscPct = itemGrossTotal > 0 ? (previewDiscVal / itemGrossTotal) * 100 : 0;
        }
        const previewNetTotal = Math.max(0, itemGrossTotal - previewDiscVal);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-fadeIn">
            <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-5 space-y-4 max-h-[90vh] flex flex-col">
              {/* Cabeçalho */}
              <div className="flex justify-between items-start pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700 shrink-0">
                    <Tag size={20} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900">Desconto por Produto</h3>
                    <p className="text-xs text-slate-500">
                      Aplicar desconto exclusivo para este item no cupom
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowItemDiscountModal(false);
                    barcodeInputRef.current?.focus();
                  }}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Fechar [Esc]"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Resumo do Produto Selecionado */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    {itemUnderDiscount.productCode}
                  </span>
                  <span className="text-[11px] font-bold text-slate-500">
                    {formatQuantity(itemUnderDiscount.quantity)} {itemUnderDiscount.unit} x {formatCurrency(itemUnderDiscount.unitPrice)}
                  </span>
                </div>
                <div className="font-bold text-slate-900 text-sm sm:text-base leading-snug">
                  {itemUnderDiscount.description}
                </div>
                <div className="flex justify-between items-center text-xs pt-1.5 border-t border-slate-200/80">
                  <span className="text-slate-500 font-semibold">Valor Bruto do Item:</span>
                  <span className="font-extrabold text-slate-800 font-mono text-sm">
                    {formatCurrency(itemGrossTotal)}
                  </span>
                </div>
              </div>

              {/* Formulário de Desconto */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleApplyItemDiscount();
                }}
                className="space-y-3.5"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700">Tipo de Desconto:</label>
                    <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200">
                      <button
                        type="button"
                        onClick={() => setItemDiscountType('percent')}
                        className={`px-3 py-1 text-xs font-bold rounded-md cursor-pointer transition-all ${
                          itemDiscountType === 'percent'
                            ? 'bg-amber-600 text-white shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        % Percentual
                      </button>
                      <button
                        type="button"
                        onClick={() => setItemDiscountType('value')}
                        className={`px-3 py-1 text-xs font-bold rounded-md cursor-pointer transition-all ${
                          itemDiscountType === 'value'
                            ? 'bg-amber-600 text-white shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        R$ Reais
                      </button>
                    </div>
                  </div>

                  <div className="relative">
                    {itemDiscountType === 'value' && (
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400 select-none">
                        R$
                      </span>
                    )}
                    <input
                      ref={itemDiscountInputRef}
                      type="text"
                      inputMode="decimal"
                      placeholder={itemDiscountType === 'percent' ? 'Ex: 10' : 'Ex: 5,00'}
                      value={itemDiscountInput}
                      onChange={(e) => setItemDiscountInput(e.target.value.replace(/[^0-9.,]/g, ''))}
                      className={`w-full py-2.5 bg-slate-50 border-2 border-slate-200 focus:border-amber-500 rounded-xl text-right font-black text-slate-900 text-xl font-mono focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-amber-400/40 transition-all ${
                        itemDiscountType === 'value' ? 'pl-10 pr-3' : 'pl-3 pr-10'
                      }`}
                    />
                    {itemDiscountType === 'percent' && (
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400 select-none">
                        %
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                    <span>Limite do operador: <strong>{currentUser.permissions.maxDiscountPercent}%</strong></span>
                    {itemDiscountType === 'value' && (
                      <span className="text-slate-400">
                        (Máx: {formatCurrency((itemGrossTotal * currentUser.permissions.maxDiscountPercent) / 100)})
                      </span>
                    )}
                  </div>
                </div>

                {/* Botões de Atalho Rápido de % */}
                {itemDiscountType === 'percent' && (
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Atalhos:</span>
                    {[5, 10, 15, 20]
                      .filter((p) => p <= currentUser.permissions.maxDiscountPercent)
                      .map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => setItemDiscountInput(pct.toString())}
                          className="px-2 py-0.5 bg-slate-100 hover:bg-amber-100 hover:text-amber-900 text-slate-700 font-extrabold text-xs rounded-md border border-slate-200 cursor-pointer transition-colors"
                        >
                          {pct}%
                        </button>
                      ))}
                    <button
                      type="button"
                      onClick={() => setItemDiscountInput('0')}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-md border border-slate-200 cursor-pointer transition-colors ml-auto"
                    >
                      Zerar
                    </button>
                  </div>
                )}

                {/* Pré-visualização ao Vivo do Item */}
                <div className="p-3 bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-xl space-y-1 font-mono text-xs border border-slate-800">
                  <div className="flex justify-between text-slate-400">
                    <span>Bruto do Item:</span>
                    <span>{formatCurrency(itemGrossTotal)}</span>
                  </div>
                  <div className="flex justify-between text-amber-400 font-bold">
                    <span>Desconto a Aplicar:</span>
                    <span>-{formatCurrency(previewDiscVal)} {previewDiscPct > 0 ? `(${previewDiscPct.toFixed(1).replace('.0', '')}%)` : ''}</span>
                  </div>
                  <div className="flex items-baseline justify-between pt-1.5 border-t border-slate-800">
                    <span className="text-xs uppercase font-extrabold text-emerald-400">
                      Novo Total do Item:
                    </span>
                    <span className="text-xl font-black text-emerald-400">
                      {formatCurrency(previewNetTotal)}
                    </span>
                  </div>
                </div>

                {/* Botões de Ação */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 gap-2">
                  <div>
                    {itemUnderDiscount.discountValue > 0 && (
                      <button
                        type="button"
                        onClick={handleRemoveItemDiscount}
                        className="px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer border border-rose-200"
                      >
                        Remover Desconto
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowItemDiscountModal(false);
                        barcodeInputRef.current?.focus();
                      }}
                      className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                    >
                      Cancelar [Esc]
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 text-xs font-extrabold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 size={15} />
                      <span>Aplicar Desconto [Enter]</span>
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* MODAL: ÚLTIMAS VENDAS DO TURNO COM REIMPRESSÃO E CANCELAMENTO */}
      {showRecentSalesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl p-5 space-y-3.5 max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Receipt size={18} className="text-blue-600" />
                <h3 className="font-bold text-sm text-slate-900">Vendas Recentes no Balcão</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRecentSalesModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 text-xs">
              {recentOrders.length === 0 ? (
                <div className="p-8 text-center text-slate-400">Nenhuma venda registrada ainda no balcão hoje.</div>
              ) : (
                recentOrders.map((ord) => (
                  <div key={ord.id} className="py-2.5 flex items-center justify-between gap-2">
                    <div>
                      <div className="font-bold text-slate-900 flex items-center gap-2">
                        <span>{ord.number}</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold uppercase ${
                          ord.status === 'cancelado' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {ord.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 truncate max-w-xs mt-0.5">
                        {ord.customerName} • {new Date(ord.createdAt).toLocaleTimeString('pt-BR')} • {ord.items.length} itens ({ord.paymentMethod.toUpperCase()})
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-slate-900">{formatCurrency(ord.total)}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setLastFinishedOrder(ord);
                          setShowReceiptModal(true);
                        }}
                        className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg"
                        title="Reimprimir Comprovante"
                      >
                        <Printer size={15} />
                      </button>

                      {ord.status !== 'cancelado' && currentUser.permissions.canCancelSales && (
                        <button
                          type="button"
                          onClick={() => setCancellingOrderId(ord.id)}
                          className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg"
                          title="Cancelar Venda e Estornar Estoque"
                        >
                          <RotateCcw size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setShowRecentSalesModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ABERTURA DE CAIXA PDV */}
      {showOpenRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full border border-slate-200 shadow-2xl space-y-3">
            <h3 className="font-bold text-slate-900 text-base">Abertura de Caixa do Balcão</h3>
            <p className="text-xs text-slate-500">
              Informe o valor de suprimento inicial (fundo de troco em moedas e notas) para abrir o caixa do turno.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Fundo de Troco Inicial (R$)</label>
              <input
                type="text"
                value={openRegisterAmount}
                onChange={(e) => setOpenRegisterAmount(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-extrabold text-slate-900 focus:outline-hidden"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowOpenRegisterModal(false)}
                className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleOpenCashRegister}
                className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-xs"
              >
                Confirmar Abertura
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CANCELAMENTO DE VENDA COM JUSTIFICATIVA AUDITADA */}
      {cancellingOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full border border-slate-200 shadow-2xl space-y-3">
            <h3 className="font-bold text-slate-900 text-base text-rose-600 flex items-center gap-1.5">
              <RotateCcw size={18} />
              <span>Confirmar Cancelamento de Venda</span>
            </h3>
            <p className="text-xs text-slate-500">
              Esta ação irá estornar automaticamente as quantidades vendidas para o estoque e anular os recebimentos financeiros.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Motivo do Cancelamento (Obrigatório para Auditoria):
              </label>
              <textarea
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Ex: Cliente desistiu da compra / Erro de digitação na quantidade..."
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-hidden"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setCancellingOrderId(null);
                  setCancelReason('');
                }}
                className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={() => {
                  const ord = dbState.orders.find((o) => o.id === cancellingOrderId);
                  if (ord) handleConfirmCancelSale(ord);
                }}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-xs"
              >
                Confirmar Estorno
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CADASTRO RÁPIDO DE CLIENTE NO BALCÃO [F3] */}
      {showQuickCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-5 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <UserPlus size={18} />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900">Novo Cliente no Balcão</h3>
                  <p className="text-[11px] text-slate-500">Cadastre e vincule imediatamente à venda em andamento</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickCustomerModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleQuickRegisterCustomer} className="space-y-3 flex-1 overflow-y-auto pr-1">
              {/* Tipo de Pessoa */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Tipo de Cliente</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setQuickCustType('PF')}
                    className={`py-1.5 px-3 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                      quickCustType === 'PF'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Pessoa Física (CPF)
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickCustType('PJ')}
                    className={`py-1.5 px-3 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                      quickCustType === 'PJ'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Pessoa Jurídica (CNPJ)
                  </button>
                </div>
              </div>

              {/* Nome / Razão Social */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Nome Completo / Razão Social <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={quickCustType === 'PF' ? "Ex: João da Silva Sauro" : "Ex: GestãoFácil Comércio e Serviços Ltda"}
                  value={quickCustName}
                  onChange={(e) => setQuickCustName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-emerald-500"
                  autoFocus
                />
              </div>

              {/* CPF/CNPJ e Telefone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {quickCustType === 'PF' ? 'CPF' : 'CNPJ'}
                  </label>
                  <input
                    type="text"
                    placeholder={quickCustType === 'PF' ? "000.000.000-00" : "00.000.000/0001-00"}
                    value={quickCustCpfCnpj}
                    onChange={(e) => setQuickCustCpfCnpj(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Telefone / WhatsApp
                  </label>
                  <input
                    type="text"
                    placeholder="(00) 00000-0000"
                    value={quickCustPhone}
                    onChange={(e) => setQuickCustPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* E-mail */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  E-mail para Envio de Recibo (Opcional)
                </label>
                <input
                  type="email"
                  placeholder="cliente@exemplo.com"
                  value={quickCustEmail}
                  onChange={(e) => setQuickCustEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Cidade / UF e Limite de Crédito */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Cidade / UF</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <input
                      type="text"
                      placeholder="Cidade"
                      value={quickCustCity}
                      onChange={(e) => setQuickCustCity(e.target.value)}
                      className="col-span-2 px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-hidden focus:bg-white"
                    />
                    <input
                      type="text"
                      placeholder="UF"
                      maxLength={2}
                      value={quickCustState}
                      onChange={(e) => setQuickCustState(e.target.value.toUpperCase())}
                      className="px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 text-center uppercase focus:outline-hidden focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Limite Crédito (R$)</label>
                  <input
                    type="number"
                    step="50"
                    min="0"
                    placeholder="1000"
                    value={quickCustCreditLimit}
                    onChange={(e) => setQuickCustCreditLimit(e.target.value)}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 text-right focus:outline-hidden focus:bg-white"
                  />
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowQuickCustomerModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 size={15} />
                  <span>Cadastrar e Selecionar</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: COMPROVANTE TÉRMICO / WHATSAPP */}
      {lastFinishedOrder && (
        <ReceiptModal
          order={lastFinishedOrder}
          company={currentCompany}
          isOpen={showReceiptModal}
          onClose={() => setShowReceiptModal(false)}
        />
      )}
    </div>
  );
};
