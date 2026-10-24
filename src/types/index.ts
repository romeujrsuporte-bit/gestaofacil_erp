/**
 * Definições de Tipos do Sistema GestãoFácil ERP
 */

export type UserRole = 'admin' | 'gerente' | 'balconista' | 'vendedor_externo' | 'financeiro';

export interface UserPermissions {
  canViewCosts: boolean;
  canEditProducts: boolean;
  canDeleteRecords: boolean;
  canCancelSales: boolean;
  canAuthorizeDiscount: boolean;
  maxDiscountPercent: number;
  canAccessFinancial: boolean;
  canAccessProduction: boolean;
  canAccessPurchases: boolean;
  canManageUsers: boolean;
  canAdjustStock: boolean;
  canCloseCashRegister: boolean;

  // VISIBILIDADE DE INFORMAÇÕES & NÚMEROS DA EMPRESA (KPIS FINANCEIROS)
  canViewGrossProfit?: boolean;    // Visualizar Lucro Bruto (R$ e Margem Bruta)
  canViewNetProfit?: boolean;      // Visualizar Lucro Líquido & DRE (R$)
  canViewTotalRevenue?: boolean;   // Visualizar Faturamento / Receita Total da Empresa
  canViewProfitMargin?: boolean;   // Visualizar Margem de Lucro (%) & Markup
  canViewProductCosts?: boolean;   // Visualizar Custos de Aquisição & CMV dos Produtos
  canViewCashBalances?: boolean;   // Visualizar Saldos Bancários, Caixa e Previsões (A Pagar/Receber)

  // CONTROLE GRANULAR DE MENUS E SUBMENUS PERMITIDOS
  allowedMenuSections?: string[];  // IDs das seções/menus principais permitidos para o usuário
  allowedSubItems?: string[];      // IDs dos submódulos permitidos para o usuário
}

export interface User {
  id: string;
  name: string;
  login: string;
  password?: string;
  role: UserRole;
  companyId: string;
  status: 'ativo' | 'inativo';
  permissions: UserPermissions;
  email?: string;
  phone?: string;
}

export interface Company {
  id: string;
  name: string;
  tradeName: string;
  cnpjCpf: string;
  ie?: string;
  type: 'matriz' | 'filial';
  phone: string;
  email: string;
  address: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
  };
  status: 'ativo' | 'inativo';
}

export type ProductType = 'revenda' | 'componente';
export type UnitOfMeasure = 'UN' | 'KG' | 'G' | 'L' | 'ML' | 'M' | 'M²' | 'M³' | 'CX' | 'PCT';

export interface ComponentDefinition {
  id: string;
  code: string; // Código próprio e único do componente
  name: string; // Nome / Descrição do componente
  rawMaterialId: string; // ID da matéria-prima ou insumo associado
  rawMaterialCode?: string;
  rawMaterialDescription?: string;
  unit: UnitOfMeasure;
  notes?: string;
  status: 'ativo' | 'inativo';
  createdAt?: string;
}

export interface ComponentItem {
  componentId: string;
  componentCode: string;
  componentDescription: string;
  rawMaterialId?: string;
  rawMaterialCode?: string;
  rawMaterialDescription?: string;
  unit: UnitOfMeasure;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

export interface Product {
  id: string;
  code: string;
  description: string;
  unit: UnitOfMeasure;
  costPrice: number;
  salePrice: number;
  family: string;
  group: string;
  barcode: string;
  minStock: number;
  productType: ProductType;
  hasComposition: boolean;
  composition?: ComponentItem[];
  defaultLocationId: string;
  status: 'ativo' | 'inativo';
  notes?: string;
  supplierId?: string;
  supplierCode?: string;
  taxPercent?: number;
  operatingExpensesPercent?: number;
  salesCommissionPercent?: number;
  otherCostsPercent?: number;
  profitMarginPercent?: number;
  enableAdditionalCosts?: boolean;
  indirectCostPerUnit?: number;
  directLaborCostPerUnit?: number;

  // RECURSO SOLICITADO: EMBALAGEM MASTER
  isMasterPack?: boolean;
  masterPackAssociatedProductId?: string;
  masterPackAssociatedProductCode?: string;
  masterPackAssociatedProductDescription?: string;
  masterPackUnits?: number;
  masterPackPackagingType?: 'caixa' | 'pacote' | 'fardo' | 'display' | 'kit' | 'outro';
}

export interface StockLocation {
  id: string;
  code: string;
  name: string;
  companyId: string;
  description: string;
  type: 'materia_prima' | 'revenda' | 'acabados' | 'comercial' | 'almoxarifado' | 'embalagens' | 'outros';
  status: 'ativo' | 'inativo';
}

export interface ProductStockBalance {
  productId: string;
  locationId: string;
  quantity: number;
  reserved: number;
  minStock: number;
  companyId?: string;
}

export type MovementType = 
  | 'inicial'
  | 'entrada_compra'
  | 'saida_venda'
  | 'consumo_producao'
  | 'entrada_producao'
  | 'ajuste_inventario'
  | 'perda_avaria'
  | 'devolucao'
  | 'transferencia_saida'
  | 'transferencia_entrada';

export interface StockMovement {
  id: string;
  companyId: string;
  productId: string;
  productCode: string;
  productDescription: string;
  locationId: string;
  locationName: string;
  toLocationId?: string;
  toLocationName?: string;
  type: MovementType;
  quantity: number;
  unitCost: number;
  totalCost: number;
  originDocType: 'venda' | 'compra' | 'producao' | 'inventario' | 'transferencia' | 'avulso';
  originDocId: string;
  date: string;
  userId: string;
  userName: string;
  notes?: string;
  isMasterPackMovement?: boolean;
  masterPackProductId?: string;
  masterPackProductCode?: string;
  masterPackUnitsMultiplier?: number;
}

export interface Customer {
  id: string;
  companyId?: string;
  code: string;
  name: string;
  tradeName?: string;
  type: 'PF' | 'PJ';
  cpfCnpj: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  zipCode?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  marketArea?: string; // Praça / Região comercial
  sellerId?: string; // ID do Vendedor
  sellerName?: string; // Nome do Vendedor responsável
  deliveryRouteId?: string; // ID da Rota de Entrega
  deliveryRouteName?: string; // Nome da Rota de Entrega
  creditLimit: number;
  preferredPaymentMethod?: string;
  status: 'ativo' | 'inativo';
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Supplier {
  id: string;
  code: string;
  name: string;
  tradeName?: string;
  type: 'PF' | 'PJ';
  cpfCnpj: string;
  contactName?: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  zipCode?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  paymentTerms?: string;
  status: 'ativo' | 'inativo';
  notes?: string;
}

export type OrderType = 'venda' | 'orcamento';
export type OrderOrigin = 'pdv' | 'externa_celular' | 'balcao' | 'retaguarda_pedido' | 'pedidos_venda';
export type OrderStatus = 
  | 'em_elaboracao'
  | 'aberto'
  | 'aguardando_aprovacao'
  | 'aprovado'
  | 'convertido_em_venda'
  | 'concluido'
  | 'cancelado';

export interface OrderItem {
  id: string;
  productId: string;
  productCode: string;
  code?: string;
  description: string;
  unit: UnitOfMeasure;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  discountValue: number;
  additionPercent?: number;
  additionValue?: number;
  totalPrice: number;
  unitCost: number;
  locationId: string;
  isMasterPack?: boolean;
  masterPackUnits?: number;
  masterPackAssociatedProductId?: string;
  masterPackAssociatedProductCode?: string;
}

export interface PaymentInstallment {
  installmentNumber: number;
  dueDate: string;
  value: number;
  status: 'aberto' | 'pago';
}

export interface Order {
  id: string;
  number: string;
  type: OrderType;
  origin: OrderOrigin;
  companyId: string;
  customerId?: string;
  customerName: string;
  customerCpfCnpj?: string;
  customerPhone?: string;
  userId: string;
  userName: string;
  items: OrderItem[];
  subtotal: number;
  discountTotal: number;
  freightTotal?: number;
  additionTotal?: number;
  total: number;
  paymentMethod: 'dinheiro' | 'pix' | 'cartao_debito' | 'cartao_credito' | 'boleto' | 'crediario' | 'multiplo';
  multiplePayments?: {
    method: string;
    amount: number;
  }[];
  bankAccountId?: string;
  bankAccountName?: string;
  installmentsCount: number;
  installments?: PaymentInstallment[];
  receivedAmount: number;
  changeAmount: number;
  status: OrderStatus;
  validityDate?: string;
  notes?: string;
  stockDeducted: boolean;
  financialGenerated: boolean;
  convertedFromOrderId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CashMovement {
  id: string;
  type: 'suprimento' | 'sangria' | 'venda_dinheiro' | 'venda_pix' | 'venda_cartao' | 'venda_outros';
  amount: number;
  description: string;
  timestamp: string;
  userId: string;
  orderId?: string;
}

export interface CashRegister {
  id: string;
  companyId: string;
  userId: string;
  userName: string;
  terminalNumber?: string;
  openedAt: string;
  closedAt?: string;
  initialBalance: number;
  status: 'aberto' | 'fechado';
  movements: CashMovement[];
  reportedBalance?: {
    dinheiro: number;
    pix: number;
    cartao: number;
    outros: number;
  };
  expectedBalance?: {
    dinheiro: number;
    pix: number;
    cartao: number;
    outros: number;
  };
  difference?: number;
  closingNotes?: string;
}

export interface AccountReceivable {
  id: string;
  companyId: string;
  orderId?: string;
  orderNumber?: string;
  customerId?: string;
  customerName: string;
  docNumber: string;
  installmentNumber: number;
  totalInstallments: number;
  issueDate: string;
  dueDate: string;
  originalValue: number;
  discount: number;
  addition: number;
  paidValue: number;
  balance: number;
  paymentMethod: string;
  bankAccountId?: string;
  bankAccountName?: string;
  bankCode?: string;
  status: 'aberto' | 'parcial' | 'recebido' | 'vencido' | 'cancelado';
  receipts: {
    date: string;
    amount: number;
    method: string;
    userId: string;
    notes?: string;
  }[];
}

export interface AccountPayable {
  id: string;
  companyId: string;
  purchaseOrderId?: string;
  purchaseOrderNumber?: string;
  supplierId?: string;
  supplierName: string;
  description: string;
  category: 'fornecedores' | 'aluguel' | 'energia' | 'agua' | 'internet_telefone' | 'salarios' | 'impostos' | 'administrativo' | 'outros';
  docNumber: string;
  installmentNumber: number;
  totalInstallments: number;
  issueDate: string;
  dueDate: string;
  originalValue: number;
  discount: number;
  addition: number;
  paidValue: number;
  balance: number;
  status: 'aberto' | 'parcial' | 'pago' | 'vencido' | 'cancelado';
  payments: {
    date: string;
    amount: number;
    method: string;
    userId: string;
    notes?: string;
  }[];
  notes?: string;
}

export interface PurchaseOrderItem {
  productId: string;
  productCode: string;
  description: string;
  buyUnit: UnitOfMeasure;
  saleUnit: UnitOfMeasure;
  packageFactor: number;
  buyQuantity: number;
  unitCost: number;
  discount: number;
  freightApportioned: number;
  otherExpensesApportioned: number;
  totalCost: number;
  receivedQuantity: number;
  pendingQuantity: number;
  destinationLocationId: string;
}

export interface PurchaseOrder {
  id: string;
  number: string;
  companyId: string;
  supplierId: string;
  supplierName: string;
  orderDate: string;
  expectedDeliveryDate: string;
  paymentTerms: string;
  installmentsCount: number;
  status: 'rascunho' | 'aguardando_entrega' | 'parcialmente_recebido' | 'concluido' | 'cancelado';
  items: PurchaseOrderItem[];
  subtotal: number;
  discountTotal: number;
  freightTotal: number;
  otherExpensesTotal: number;
  total: number;
  notes?: string;
  userId: string;
  userName: string;
  createdAt: string;
}

export interface PurchaseReceipt {
  id: string;
  purchaseOrderId: string;
  purchaseOrderNumber: string;
  companyId: string;
  receiptDate: string;
  invoiceNumber?: string;
  userId: string;
  userName: string;
  items: {
    productId: string;
    productCode: string;
    description: string;
    receivedQuantity: number;
    locationId: string;
    effectiveUnitCost: number;
  }[];
  notes?: string;
  accountsPayableGenerated: boolean;
}

export interface ProductionOrderItem {
  productId: string;
  productCode: string;
  productDescription: string;
  plannedQuantity: number;
  producedQuantity: number;
  destinationLocationId?: string;
  unitCost: number;
  totalCost: number;
  componentsConsumed?: {
    componentId: string;
    componentCode: string;
    description: string;
    unit: UnitOfMeasure;
    plannedQty: number;
    actualQty: number;
    locationId: string;
    unitCost: number;
    totalCost: number;
  }[];
}

export interface ProductionOrder {
  id: string;
  number: string;
  companyId: string;
  productId: string;
  productCode: string;
  productDescription: string;
  unit?: string;
  startDate?: string;
  dueDate?: string;
  plannedQuantity: number;
  producedQuantity: number;
  destinationLocationId: string;
  items?: ProductionOrderItem[];
  componentsConsumed: {
    componentId: string;
    componentCode: string;
    description: string;
    unit: UnitOfMeasure;
    plannedQty: number;
    actualQty: number;
    locationId: string;
    unitCost: number;
    totalCost: number;
  }[];
  totalCost: number;
  unitCost: number;
  status: 'aberta' | 'concluida' | 'cancelada';
  orderDate: string;
  completionDate?: string;
  userId: string;
  userName: string;
  notes?: string;
}

export interface TransferOrder {
  id: string;
  number: string;
  companyId: string;
  date: string;
  originLocationId: string;
  destinationLocationId: string;
  productId: string;
  productCode: string;
  productDescription: string;
  quantity: number;
  userId: string;
  userName: string;
  notes?: string;
  status: 'concluida' | 'cancelada';
}

export interface InventoryCount {
  id: string;
  companyId: string;
  date: string;
  locationId: string;
  locationName: string;
  userId: string;
  userName: string;
  status: 'rascunho' | 'concluido';
  items: {
    productId: string;
    productCode: string;
    description: string;
    systemQuantity: number;
    countedQuantity: number;
    difference: number;
    reason?: string;
  }[];
  notes?: string;
}

export interface AuditLog {
  id: string;
  companyId: string;
  userId: string;
  userName: string;
  action: string;
  module: string;
  recordId: string;
  details: string;
  timestamp: string;
}

export type ThermalPaperWidth = '58mm' | '80mm';
export type HeaderFormatType = 'completo' | 'simplificado' | 'compacto' | 'personalizado';
export type PrintDocumentFormat = 'a4' | 'thermal';
export type A4HeaderStyle = 'classico_timbrado' | 'moderno_minimalista' | 'corporativo';
export type A4MarginType = 'compacta' | 'padrao' | 'ampla';

export interface ThermalPrinterConfig {
  // Configurações de Impressora Térmica
  paperWidth: ThermalPaperWidth;
  headerFormat: HeaderFormatType;
  headerAlignment: 'center' | 'left';
  showTradeName: boolean;
  showCnpj: boolean;
  showPhone: boolean;
  showAddress: boolean;
  customHeaderText?: string;
  footerMessage?: string;
  marginLeft: number; // in mm
  marginRight: number; // in mm
  fontSize: 'pequena' | 'normal' | 'grande';
  autoCut: boolean;

  // Configurações de Impressão em Folha A4
  a4HeaderStyle?: A4HeaderStyle;
  a4ShowLogo?: boolean;
  a4ShowReceiptStub?: boolean; // Canhoto de recebimento/entrega para assinatura
  a4ShowFinancialSummary?: boolean; // Quadro de resumo financeiro e condições
  a4ShowCommercialTerms?: boolean; // Termos de garantia e validade da proposta
  a4CommercialTermsText?: string;
  a4ShowSignatures?: boolean;
  a4Margin?: A4MarginType;
  a4Orientation?: 'portrait' | 'landscape';

  // Padrão de Impressão por Módulo do ERP (A4 vs Térmico 80mm)
  defaultSalesOrderFormat?: PrintDocumentFormat;
  defaultExternalSalesFormat?: PrintDocumentFormat;
  defaultProductionOrderFormat?: PrintDocumentFormat;
  defaultManifestFormat?: PrintDocumentFormat;
  defaultPosFormat?: PrintDocumentFormat;
}

export type PaymentMethodType = 'dinheiro' | 'pix' | 'cartao_credito' | 'cartao_debito' | 'boleto' | 'crediario' | 'outro';

export interface PaymentMethodRecord {
  id: string;
  companyId?: string;
  code: string;
  name: string;
  type: PaymentMethodType;
  feePercent: number;
  daysToReceive: number;
  defaultAccountId?: string;
  allowInstallments: boolean;
  maxInstallments?: number;
  status: 'ativo' | 'inativo';
  notes?: string;
  createdAt: string;
}

export type FinancialAccountType = 'caixa' | 'corrente' | 'poupanca' | 'investimento' | 'outra';

export interface FinancialAccountRecord {
  id: string;
  companyId: string;
  code: string;
  name: string;
  type: FinancialAccountType;
  bankCode?: string;
  bankName?: string;
  agency?: string;
  accountNumber?: string;
  initialBalance: number;
  currentBalance: number;
  isDefault: boolean;
  status: 'ativo' | 'inativo';
  notes?: string;
  createdAt: string;
}

export interface PaymentTermRecord {
  id: string;
  companyId: string;
  code: string;
  name: string;
  installmentsCount: number;
  daysIntervals: string;
  percentAdditionOrDiscount: number;
  minOrderValue?: number;
  status: 'ativo' | 'inativo';
  notes?: string;
  createdAt: string;
}

export interface SidebarMenuConfig {
  hiddenSections: string[];
  hiddenSubItems: string[];
}

// ==========================================
// MÓDULO DE EXPEDIÇÃO & ROTAS DE ENTREGA
// ==========================================

export interface DeliveryRoute {
  id: string;
  companyId: string;
  code: string;
  name: string;
  description?: string;
  active: boolean;
  color?: string; // Cor visual (ex: blue, emerald, amber, purple, rose)
  cities: string[]; // Cidades associadas
  neighborhoods: string[]; // Bairros associados
  marketAreas: string[]; // Praças associadas
  sellerNames: string[]; // Vendedores associados
  estimatedDeliveryWindow?: string; // Ex: "Manhã (08h às 12h)", "Tarde (13h às 18h)"
  vehicleTypeRecommendation?: string; // Ex: "Fiorino / Van", "Caminhão 3/4"
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryManifestOrderItem {
  productId: string;
  productCode: string;
  description: string;
  unit: UnitOfMeasure;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface DeliveryManifestOrder {
  orderId: string;
  orderNumber: string;
  orderDate?: string;
  customerId: string;
  customerCode?: string;
  customerName: string;
  customerPhone?: string;
  customerCpfCnpj?: string;
  address: {
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode?: string;
    complement?: string;
  };
  marketArea?: string; // Praça
  sellerName?: string; // Vendedor
  sequence: number; // Ordem da entrega (1ª, 2ª, 3ª...)
  totalValue: number;
  paymentMethod: string;
  paymentStatus: 'pago_antecipado' | 'cobrar_na_entrega';
  amountToCollect?: number; // Valor em aberto para cobrar na entrega
  deliveryStatus: 'pendente' | 'entregue' | 'nao_entregue';
  deliveryFailureReason?: string; // Motivo da não entrega
  deliveredAt?: string;
  deliveryNotes?: string;
  items: DeliveryManifestOrderItem[];
  volumesCount?: number;
}

export interface DeliveryManifest {
  id: string;
  number: string; // Ex: ROM-2026-0001
  companyId: string;
  date: string; // Data de criação
  departureDate: string; // Data de saída prevista
  routeId?: string;
  routeName?: string;
  driverName: string; // Motorista / Entregador
  driverPhone?: string;
  vehiclePlate: string; // Placa do veículo
  vehicleModel?: string; // Modelo (ex: Fiat Fiorino, VW Delivery)
  status: 'planejado' | 'em_transito' | 'entregue' | 'cancelado';
  notes?: string;
  orders: DeliveryManifestOrder[];
  // Totais consolidados
  totalOrders: number;
  totalDelivered: number;
  totalPending: number;
  totalValue: number;
  totalAmountToCollect: number;
  totalVolumes: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

// ==========================================
// CADASTRO DE LOCALIDADES (PRAÇA, BAIRRO, CIDADE, ESTADO)
// ==========================================

export interface MarketAreaItem {
  id: string;
  name: string; // Ex: "Zona Norte", "Centro Expandido", "Zona Sul / ABC"
  description?: string;
  defaultRouteId?: string; // ID da Rota de Entrega vinculada
  defaultRouteName?: string; // Nome da Rota vinculada
  cities?: string[]; // Nomes de cidades atendidas
  active: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface StateItem {
  id: string;
  uf: string; // Ex: "SP", "RJ", "MG"
  name: string; // Ex: "São Paulo", "Rio de Janeiro"
  region: 'Sudeste' | 'Sul' | 'Centro-Oeste' | 'Nordeste' | 'Norte';
  active: boolean;
  createdAt: string;
}

export interface CityItem {
  id: string;
  name: string; // Ex: "São Paulo", "Campinas", "Guarulhos"
  stateUf: string; // Ex: "SP"
  marketAreaId?: string; // ID da Praça vinculada
  marketAreaName?: string; // Nome da Praça vinculada (ex: "Zona Sul / ABC")
  defaultRouteId?: string; // Rota padrão de entrega
  defaultRouteName?: string;
  ibgeCode?: string;
  active: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface NeighborhoodItem {
  id: string;
  name: string; // Ex: "Santana", "Pinheiros", "Moema"
  cityName: string; // Ex: "São Paulo"
  stateUf: string; // Ex: "SP"
  marketAreaId?: string; // ID da Praça vinculada
  marketAreaName?: string; // Nome da Praça vinculada
  defaultRouteId?: string; // Rota padrão de entrega
  defaultRouteName?: string;
  zipCodePrefix?: string; // Prefixo CEP (ex: "020", "014")
  active: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface StockControlConfig {
  enableStockControl: boolean; // Se ativado, o sistema gerencia o estoque; se desativado, permite vender livremente
  allowNegativeStock: boolean; // Se ativado, permite concluir vendas no PDV, Pedido e Mobile mesmo com estoque negativo/zerado
}


