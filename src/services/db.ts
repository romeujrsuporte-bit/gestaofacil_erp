/**
 * Banco de Dados Persistente Local (Local Storage + In-Memory Reactive Cache)
 * Fornece persistência imediata, integridade relacional e carga inicial completa.
 */

import {
  Company,
  User,
  UserRole,
  UserPermissions,
  Product,
  StockLocation,
  ProductStockBalance,
  StockMovement,
  Customer,
  Supplier,
  Order,
  CashRegister,
  AccountReceivable,
  AccountPayable,
  PurchaseOrder,
  PurchaseReceipt,
  ProductionOrder,
  TransferOrder,
  InventoryCount,
  AuditLog,
  ThermalPrinterConfig,
  ComponentDefinition,
  PaymentMethodRecord,
  FinancialAccountRecord,
  PaymentTermRecord,
  SidebarMenuConfig,
  DeliveryRoute,
  DeliveryManifest,
  DeliveryManifestOrder,
  DeliveryManifestOrderItem,
  MarketAreaItem,
  StateItem,
  CityItem,
  NeighborhoodItem,
  StockControlConfig,
} from '../types';

export const DEFAULT_STOCK_CONTROL_CONFIG: StockControlConfig = {
  enableStockControl: true,
  allowNegativeStock: false,
};

export const DEFAULT_PRINTER_CONFIG: ThermalPrinterConfig = {
  paperWidth: '80mm',
  headerFormat: 'completo',
  headerAlignment: 'center',
  showTradeName: true,
  showCnpj: true,
  showPhone: true,
  showAddress: true,
  customHeaderText: '',
  footerMessage: '*** DOCUMENTO NÃO FISCAL ***\nObrigado pela preferência e confiança!',
  marginLeft: 2,
  marginRight: 2,
  fontSize: 'normal',
  autoCut: true,
  a4HeaderStyle: 'classico_timbrado',
  a4ShowLogo: true,
  a4ShowReceiptStub: true,
  a4ShowFinancialSummary: true,
  a4ShowCommercialTerms: true,
  a4CommercialTermsText: 'Orçamento/Pedido válido por 10 dias úteis. As mercadorias devem ser conferidas no ato da entrega. Garantia legal de 90 dias conforme CDC.',
  a4ShowSignatures: true,
  a4Margin: 'padrao',
  a4Orientation: 'portrait',
  defaultSalesOrderFormat: 'a4',
  defaultExternalSalesFormat: 'a4',
  defaultProductionOrderFormat: 'a4',
  defaultManifestFormat: 'a4',
  defaultPosFormat: 'thermal',
};

const DB_KEY_PREFIX = 'omnicomercio_v1_';

export interface DatabaseState {
  companies: Company[];
  users: User[];
  currentCompanyId: string;
  currentUserId: string;
  stockLocations: StockLocation[];
  products: Product[];
  components?: ComponentDefinition[];
  stockBalances: ProductStockBalance[];
  stockMovements: StockMovement[];
  customers: Customer[];
  suppliers: Supplier[];
  orders: Order[];
  cashRegisters: CashRegister[];
  accountsReceivable: AccountReceivable[];
  accountsPayable: AccountPayable[];
  purchaseOrders: PurchaseOrder[];
  purchaseReceipts: PurchaseReceipt[];
  productionOrders: ProductionOrder[];
  transferOrders: TransferOrder[];
  inventoryCounts: InventoryCount[];
  auditLogs: AuditLog[];
  printerConfig?: ThermalPrinterConfig;
  hideOverdueAlert?: boolean;
  stockControlConfig?: StockControlConfig;
  paymentMethods?: PaymentMethodRecord[];
  financialAccounts?: FinancialAccountRecord[];
  paymentTermsList?: PaymentTermRecord[];
  sidebarMenuConfig?: SidebarMenuConfig;
  deliveryRoutes?: DeliveryRoute[];
  deliveryManifests?: DeliveryManifest[];
  marketAreas?: MarketAreaItem[];
  states?: StateItem[];
  cities?: CityItem[];
  neighborhoods?: NeighborhoodItem[];
}

export const DEFAULT_PAYMENT_METHODS: PaymentMethodRecord[] = [
  {
    id: 'pay-boleto',
    code: 'BOLETO',
    name: 'Boleto Bancário',
    type: 'boleto',
    feePercent: 2.49,
    daysToReceive: 1,
    defaultAccountId: 'acc-itau',
    allowInstallments: true,
    maxInstallments: 12,
    status: 'ativo',
    notes: 'Boleto registrado emitido com código de barras e QR Code Pix',
    createdAt: '2026-10-01T10:00:00.000Z',
  },
  {
    id: 'pay-pix',
    code: 'PIX',
    name: 'Pix Cobrança Instantâneo',
    type: 'pix',
    feePercent: 0,
    daysToReceive: 0,
    defaultAccountId: 'acc-bb',
    allowInstallments: false,
    maxInstallments: 1,
    status: 'ativo',
    notes: 'Recebimento instantâneo em conta corrente',
    createdAt: '2026-10-01T10:00:00.000Z',
  },
  {
    id: 'pay-dinheiro',
    code: 'DINHEIRO',
    name: 'Dinheiro em Espécie',
    type: 'dinheiro',
    feePercent: 0,
    daysToReceive: 0,
    defaultAccountId: 'acc-caixa',
    allowInstallments: false,
    maxInstallments: 1,
    status: 'ativo',
    notes: 'Recebimento direto no caixa físico',
    createdAt: '2026-10-01T10:00:00.000Z',
  },
  {
    id: 'pay-credito',
    code: 'CARTAO_CREDITO',
    name: 'Cartão de Crédito',
    type: 'cartao_credito',
    feePercent: 3.49,
    daysToReceive: 30,
    defaultAccountId: 'acc-bb',
    allowInstallments: true,
    maxInstallments: 12,
    status: 'ativo',
    notes: 'Transações via maquineta / POS ou TEF',
    createdAt: '2026-10-01T10:00:00.000Z',
  },
  {
    id: 'pay-debito',
    code: 'CARTAO_DEBITO',
    name: 'Cartão de Débito',
    type: 'cartao_debito',
    feePercent: 1.49,
    daysToReceive: 1,
    defaultAccountId: 'acc-bb',
    allowInstallments: false,
    maxInstallments: 1,
    status: 'ativo',
    notes: 'Débito na conta bancária vinculada à maquininha',
    createdAt: '2026-10-01T10:00:00.000Z',
  },
  {
    id: 'pay-crediario',
    code: 'CREDIARIO',
    name: 'Crediário Próprio',
    type: 'crediario',
    feePercent: 0,
    daysToReceive: 30,
    defaultAccountId: 'acc-caixa',
    allowInstallments: true,
    maxInstallments: 6,
    status: 'ativo',
    notes: 'Financiamento próprio emitido com carnê da loja',
    createdAt: '2026-10-01T10:00:00.000Z',
  },
];

export const DEFAULT_FINANCIAL_ACCOUNTS: FinancialAccountRecord[] = [
  {
    id: 'acc-caixa',
    companyId: 'comp-matriz',
    code: 'CX-01',
    name: 'Caixa Geral Balcão',
    type: 'caixa',
    bankName: 'Caixa Físico Interno',
    initialBalance: 1500.0,
    currentBalance: 1500.0,
    isDefault: true,
    status: 'ativo',
    notes: 'Caixa operacional diário da frente de loja',
    createdAt: '2026-10-01T10:00:00.000Z',
  },
  {
    id: 'acc-bb',
    companyId: 'comp-matriz',
    code: 'BB-01',
    name: 'Banco do Brasil - C/C Principal',
    type: 'corrente',
    bankCode: '001',
    bankName: 'Banco do Brasil S.A.',
    agency: '3456-7',
    accountNumber: '12345-6',
    initialBalance: 14850.0,
    currentBalance: 14850.0,
    isDefault: false,
    status: 'ativo',
    notes: 'Conta de movimentação comercial e recebimento Pix',
    createdAt: '2026-10-01T10:00:00.000Z',
  },
  {
    id: 'acc-itau',
    companyId: 'comp-matriz',
    code: 'ITAU-01',
    name: 'Itaú Unibanco - Cobrança & Boleto',
    type: 'corrente',
    bankCode: '341',
    bankName: 'Banco Itaú S.A.',
    agency: '0987',
    accountNumber: '54321-0',
    initialBalance: 8920.0,
    currentBalance: 8920.0,
    isDefault: false,
    status: 'ativo',
    notes: 'Conta convênio para emissão e liquidação de boletos',
    createdAt: '2026-10-01T10:00:00.000Z',
  },
];

export const DEFAULT_PAYMENT_TERMS: PaymentTermRecord[] = [
  {
    id: 'term-avista',
    companyId: 'comp-matriz',
    code: 'A_VISTA',
    name: 'À Vista (Imediato)',
    installmentsCount: 1,
    daysIntervals: '0',
    percentAdditionOrDiscount: -3,
    status: 'ativo',
    notes: '3% de desconto para liquidação à vista',
    createdAt: '2026-10-01T10:00:00.000Z',
  },
  {
    id: 'term-14d',
    companyId: 'comp-matriz',
    code: '14D',
    name: '14 Dias Direto',
    installmentsCount: 1,
    daysIntervals: '14',
    percentAdditionOrDiscount: 0,
    status: 'ativo',
    notes: 'Prazo curto faturado em 14 dias',
    createdAt: '2026-10-01T10:00:00.000Z',
  },
  {
    id: 'term-28d',
    companyId: 'comp-matriz',
    code: '28D',
    name: '28 Dias Direto',
    installmentsCount: 1,
    daysIntervals: '28',
    percentAdditionOrDiscount: 0,
    status: 'ativo',
    notes: 'Prazo padrão faturado 28 dias',
    createdAt: '2026-10-01T10:00:00.000Z',
  },
  {
    id: 'term-30d',
    companyId: 'comp-matriz',
    code: '30D',
    name: '30 Dias',
    installmentsCount: 1,
    daysIntervals: '30',
    percentAdditionOrDiscount: 0,
    status: 'ativo',
    notes: 'Vencimento direto em 30 dias',
    createdAt: '2026-10-01T10:00:00.000Z',
  },
  {
    id: 'term-30-60',
    companyId: 'comp-matriz',
    code: '30_60D',
    name: '30 / 60 Dias (2x)',
    installmentsCount: 2,
    daysIntervals: '30, 60',
    percentAdditionOrDiscount: 0,
    status: 'ativo',
    notes: 'Duas parcelas iguais em 30 e 60 dias',
    createdAt: '2026-10-01T10:00:00.000Z',
  },
  {
    id: 'term-30-60-90',
    companyId: 'comp-matriz',
    code: '30_60_90D',
    name: '30 / 60 / 90 Dias (3x)',
    installmentsCount: 3,
    daysIntervals: '30, 60, 90',
    percentAdditionOrDiscount: 2,
    status: 'ativo',
    notes: 'Três parcelas com acréscimo de 2%',
    createdAt: '2026-10-01T10:00:00.000Z',
  },
  {
    id: 'term-entrada-30-60',
    companyId: 'comp-matriz',
    code: 'ENTRADA_30_60D',
    name: 'Entrada + 30 / 60 Dias (3x)',
    installmentsCount: 3,
    daysIntervals: '0, 30, 60',
    percentAdditionOrDiscount: 0,
    status: 'ativo',
    notes: '1ª parcela à vista e as demais em 30 e 60 dias',
    createdAt: '2026-10-01T10:00:00.000Z',
  },
];

export const DEFAULT_COMPONENTS: ComponentDefinition[] = [
  {
    id: 'cmp-001',
    code: 'CMP-001',
    name: 'Base Concentrada Tensoativa',
    rawMaterialId: 'prod-comp-base',
    rawMaterialCode: 'MP-101',
    rawMaterialDescription: 'Base Detergente Tensoativa Concentrada',
    unit: 'L',
    notes: 'Insumo químico para diluição e preparo de formulação líquida',
    status: 'ativo',
    createdAt: '2026-10-01T10:00:00.000Z',
  },
  {
    id: 'cmp-002',
    code: 'CMP-002',
    name: 'Pigmento Anil Industrial',
    rawMaterialId: 'prod-comp-corante-azul',
    rawMaterialCode: 'MP-103',
    rawMaterialDescription: 'Corante Líquido Azul Anil Industrial',
    unit: 'L',
    notes: 'Corante industrial para ajuste de tonalidade',
    status: 'ativo',
    createdAt: '2026-10-01T10:00:00.000Z',
  },
  {
    id: 'cmp-003',
    code: 'CMP-003',
    name: 'Frasco PET 500ml Transparente',
    rawMaterialId: 'prod-emb-frasco-500',
    rawMaterialCode: 'EMB-201',
    rawMaterialDescription: 'Frasco PET 500ml Transparente',
    unit: 'UN',
    notes: 'Embalagem plástica transparente linha 500ml',
    status: 'ativo',
    createdAt: '2026-10-01T10:00:00.000Z',
  },
  {
    id: 'cmp-004',
    code: 'CMP-004',
    name: 'Tampa Flip-Top Rosca 28mm',
    rawMaterialId: 'prod-emb-tampa-flip',
    rawMaterialCode: 'EMB-202',
    rawMaterialDescription: 'Tampa Flip-Top Rosca 28mm Vermelha',
    unit: 'UN',
    notes: 'Tampa com vedação e bico dosador padrão 28mm',
    status: 'ativo',
    createdAt: '2026-10-01T10:00:00.000Z',
  },
  {
    id: 'cmp-005',
    code: 'CMP-005',
    name: 'Fragrância Floral Lavanda Francesa',
    rawMaterialId: 'prod-comp-essencia-lavanda',
    rawMaterialCode: 'MP-102',
    rawMaterialDescription: 'Essência Concentrada Lavanda Francesa',
    unit: 'L',
    notes: 'Fragrância hidrossolúvel para aromatização',
    status: 'ativo',
    createdAt: '2026-10-01T10:00:00.000Z',
  },
  {
    id: 'cmp-006',
    code: 'CMP-006',
    name: 'Galão PEAD 5L com Tampa e Lacre',
    rawMaterialId: 'prod-emb-galao-5l',
    rawMaterialCode: 'EMB-203',
    rawMaterialDescription: 'Galão PEAD 5L Branco com Tampa e Lacre',
    unit: 'UN',
    notes: 'Embalagem resistente para produtos químicos 5 litros',
    status: 'ativo',
    createdAt: '2026-10-01T10:00:00.000Z',
  },
];

export const DEFAULT_DELIVERY_ROUTES: DeliveryRoute[] = [
  {
    id: 'rot-01',
    companyId: 'comp-matriz',
    code: 'ROT-01',
    name: 'Rota 01 - Zona Norte & Santana',
    description: 'Atendimento comercial à Zona Norte de São Paulo e ligação com Guarulhos',
    active: true,
    color: 'blue',
    cities: ['São Paulo', 'Guarulhos'],
    neighborhoods: ['Santana', 'Vila Guilherme', 'Tucuruvi', 'Parque Novo Mundo', 'Vila Maria', 'Vila Bela'],
    marketAreas: ['Zona Norte'],
    sellerNames: ['Carlos Silva', 'Bruno Lima'],
    estimatedDeliveryWindow: 'Manhã (08h às 12h)',
    vehicleTypeRecommendation: 'Fiat Fiorino / Van',
    notes: 'Priorizar entregas em feiras e comércios de rua no primeiro horário',
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-01T10:00:00.000Z',
  },
  {
    id: 'rot-02',
    companyId: 'comp-matriz',
    code: 'ROT-02',
    name: 'Rota 02 - Centro Expandido & Paulista',
    description: 'Condomínios corporativos, restaurantes, lavanderias e centros comerciais',
    active: true,
    color: 'emerald',
    cities: ['São Paulo'],
    neighborhoods: ['Cerqueira César', 'Bela Vista', 'Consolação', 'República', 'Santa Cecília', 'Bom Retiro'],
    marketAreas: ['Centro'],
    sellerNames: ['Carlos Silva', 'Mariana Oliveira'],
    estimatedDeliveryWindow: 'Tarde (13h às 18h)',
    vehicleTypeRecommendation: 'Van de Carga / VUC',
    notes: 'Atenção às regras de rodízio municipal e vagas de carga/descarga',
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-01T10:00:00.000Z',
  },
  {
    id: 'rot-03',
    companyId: 'comp-matriz',
    code: 'ROT-03',
    name: 'Rota 03 - Zona Sul & ABC Paulista',
    description: 'Hospitais, redes automotivas, clínicas e indústrias do Grande ABC',
    active: true,
    color: 'amber',
    cities: ['São Paulo', 'Santo André', 'São Bernardo do Campo', 'São Caetano do Sul'],
    neighborhoods: ['Moema', 'Vila Mariana', 'Saúde', 'Ipiranga', 'Rudge Ramos', 'Centro'],
    marketAreas: ['Zona Sul / ABC'],
    sellerNames: ['Roberto Vendas', 'Mariana Oliveira'],
    estimatedDeliveryWindow: 'Dia Todo (08h às 17h)',
    vehicleTypeRecommendation: 'Caminhão 3/4',
    notes: 'Descarga de volumes pesados (galões de 5L e caixas master)',
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-01T10:00:00.000Z',
  },
  {
    id: 'rot-04',
    companyId: 'comp-matriz',
    code: 'ROT-04',
    name: 'Rota 04 - Interior & Campinas',
    description: 'Atendimento quinzenal à região metropolitana de Campinas e Jundiaí',
    active: true,
    color: 'purple',
    cities: ['Campinas', 'Jundiaí', 'Valinhos', 'Vinhedo'],
    neighborhoods: ['Cambuí', 'Barão Geraldo', 'Distrito Industrial', 'Centro'],
    marketAreas: ['Interior SP'],
    sellerNames: ['Bruno Lima', 'Roberto Vendas'],
    estimatedDeliveryWindow: 'Dia Todo (07h às 19h)',
    vehicleTypeRecommendation: 'Caminhão Toco / 3/4',
    notes: 'Saída antecipada da expedição às 06h30',
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-01T10:00:00.000Z',
  },
];

export const DEFAULT_STATES: StateItem[] = [
  { id: 'uf-sp', uf: 'SP', name: 'São Paulo', region: 'Sudeste', active: true, createdAt: '2026-10-01T10:00:00.000Z' },
  { id: 'uf-rj', uf: 'RJ', name: 'Rio de Janeiro', region: 'Sudeste', active: true, createdAt: '2026-10-01T10:00:00.000Z' },
  { id: 'uf-mg', uf: 'MG', name: 'Minas Gerais', region: 'Sudeste', active: true, createdAt: '2026-10-01T10:00:00.000Z' },
  { id: 'uf-es', uf: 'ES', name: 'Espírito Santo', region: 'Sudeste', active: true, createdAt: '2026-10-01T10:00:00.000Z' },
  { id: 'uf-pr', uf: 'PR', name: 'Paraná', region: 'Sul', active: true, createdAt: '2026-10-01T10:00:00.000Z' },
  { id: 'uf-sc', uf: 'SC', name: 'Santa Catarina', region: 'Sul', active: true, createdAt: '2026-10-01T10:00:00.000Z' },
  { id: 'uf-rs', uf: 'RS', name: 'Rio Grande do Sul', region: 'Sul', active: true, createdAt: '2026-10-01T10:00:00.000Z' },
  { id: 'uf-df', uf: 'DF', name: 'Distrito Federal', region: 'Centro-Oeste', active: true, createdAt: '2026-10-01T10:00:00.000Z' },
  { id: 'uf-go', uf: 'GO', name: 'Goiás', region: 'Centro-Oeste', active: true, createdAt: '2026-10-01T10:00:00.000Z' },
  { id: 'uf-mt', uf: 'MT', name: 'Mato Grosso', region: 'Centro-Oeste', active: true, createdAt: '2026-10-01T10:00:00.000Z' },
  { id: 'uf-ms', uf: 'MS', name: 'Mato Grosso do Sul', region: 'Centro-Oeste', active: true, createdAt: '2026-10-01T10:00:00.000Z' },
  { id: 'uf-ba', uf: 'BA', name: 'Bahia', region: 'Nordeste', active: true, createdAt: '2026-10-01T10:00:00.000Z' },
  { id: 'uf-pe', uf: 'PE', name: 'Pernambuco', region: 'Nordeste', active: true, createdAt: '2026-10-01T10:00:00.000Z' },
  { id: 'uf-ce', uf: 'CE', name: 'Ceará', region: 'Nordeste', active: true, createdAt: '2026-10-01T10:00:00.000Z' },
  { id: 'uf-rn', uf: 'RN', name: 'Rio Grande do Norte', region: 'Nordeste', active: true, createdAt: '2026-10-01T10:00:00.000Z' },
  { id: 'uf-pb', uf: 'PB', name: 'Paraíba', region: 'Nordeste', active: true, createdAt: '2026-10-01T10:00:00.000Z' },
  { id: 'uf-al', uf: 'AL', name: 'Alagoas', region: 'Nordeste', active: true, createdAt: '2026-10-01T10:00:00.000Z' },
  { id: 'uf-se', uf: 'SE', name: 'Sergipe', region: 'Nordeste', active: true, createdAt: '2026-10-01T10:00:00.000Z' },
  { id: 'uf-ma', uf: 'MA', name: 'Maranhão', region: 'Nordeste', active: true, createdAt: '2026-10-01T10:00:00.000Z' },
  { id: 'uf-pi', uf: 'PI', name: 'Piauí', region: 'Nordeste', active: true, createdAt: '2026-10-01T10:00:00.000Z' },
  { id: 'uf-pa', uf: 'PA', name: 'Pará', region: 'Norte', active: true, createdAt: '2026-10-01T10:00:00.000Z' },
  { id: 'uf-am', uf: 'AM', name: 'Amazonas', region: 'Norte', active: true, createdAt: '2026-10-01T10:00:00.000Z' },
  { id: 'uf-ro', uf: 'RO', name: 'Rondônia', region: 'Norte', active: true, createdAt: '2026-10-01T10:00:00.000Z' },
  { id: 'uf-to', uf: 'TO', name: 'Tocantins', region: 'Norte', active: true, createdAt: '2026-10-01T10:00:00.000Z' },
  { id: 'uf-ac', uf: 'AC', name: 'Acre', region: 'Norte', active: true, createdAt: '2026-10-01T10:00:00.000Z' },
  { id: 'uf-ap', uf: 'AP', name: 'Amapá', region: 'Norte', active: true, createdAt: '2026-10-01T10:00:00.000Z' },
  { id: 'uf-rr', uf: 'RR', name: 'Roraima', region: 'Norte', active: true, createdAt: '2026-10-01T10:00:00.000Z' },
];

export const DEFAULT_MARKET_AREAS: MarketAreaItem[] = [
  {
    id: 'pra-01',
    name: 'Zona Norte',
    description: 'Bairros da Zona Norte da capital e conexão com Guarulhos',
    defaultRouteId: 'rot-01',
    defaultRouteName: 'Rota 01 - Zona Norte & Santana',
    cities: ['São Paulo', 'Guarulhos'],
    active: true,
    createdAt: '2026-10-01T10:00:00.000Z',
  },
  {
    id: 'pra-02',
    name: 'Centro',
    description: 'Centro Expandido de SP, Avenida Paulista e polos corporativos',
    defaultRouteId: 'rot-02',
    defaultRouteName: 'Rota 02 - Centro Expandido & Paulista',
    cities: ['São Paulo'],
    active: true,
    createdAt: '2026-10-01T10:00:00.000Z',
  },
  {
    id: 'pra-03',
    name: 'Zona Sul / ABC',
    description: 'Zona Sul da capital e polos industriais do Grande ABC',
    defaultRouteId: 'rot-03',
    defaultRouteName: 'Rota 03 - Zona Sul & ABC Paulista',
    cities: ['São Paulo', 'Santo André', 'São Bernardo do Campo', 'São Caetano do Sul', 'Diadema'],
    active: true,
    createdAt: '2026-10-01T10:00:00.000Z',
  },
  {
    id: 'pra-04',
    name: 'Interior SP',
    description: 'Região metropolitana de Campinas, Jundiaí e Circuito das Frutas',
    defaultRouteId: 'rot-04',
    defaultRouteName: 'Rota 04 - Interior & Campinas',
    cities: ['Campinas', 'Jundiaí', 'Valinhos', 'Vinhedo'],
    active: true,
    createdAt: '2026-10-01T10:00:00.000Z',
  },
  {
    id: 'pra-05',
    name: 'Litoral Paulista',
    description: 'Baixada Santista e cidades litorâneas',
    cities: ['Santos', 'São Vicente', 'Praia Grande'],
    active: true,
    createdAt: '2026-10-01T10:00:00.000Z',
  },
  {
    id: 'pra-06',
    name: 'Vale do Paraíba',
    description: 'Eixo Dutra entre São José dos Campos, Taubaté e Jacareí',
    cities: ['São José dos Campos', 'Taubaté', 'Jacareí'],
    active: true,
    createdAt: '2026-10-01T10:00:00.000Z',
  },
];

export const DEFAULT_CITIES: CityItem[] = [
  { id: 'cid-01', name: 'São Paulo', stateUf: 'SP', marketAreaId: 'pra-01', marketAreaName: 'Zona Norte', defaultRouteId: 'rot-01', defaultRouteName: 'Rota 01 - Zona Norte & Santana', ibgeCode: '3550308', active: true, createdAt: '2026-10-01T10:00:00.000Z' },
  { id: 'cid-02', name: 'Guarulhos', stateUf: 'SP', marketAreaId: 'pra-01', marketAreaName: 'Zona Norte', defaultRouteId: 'rot-01', defaultRouteName: 'Rota 01 - Zona Norte & Santana', ibgeCode: '3518800', active: true, createdAt: '2026-10-01T10:00:00.000Z' },
  { id: 'cid-03', name: 'Santo André', stateUf: 'SP', marketAreaId: 'pra-03', marketAreaName: 'Zona Sul / ABC', defaultRouteId: 'rot-03', defaultRouteName: 'Rota 03 - Zona Sul & ABC Paulista', ibgeCode: '3547809', active: true, createdAt: '2026-10-01T10:00:00.000Z' },
  { id: 'cid-04', name: 'São Bernardo do Campo', stateUf: 'SP', marketAreaId: 'pra-03', marketAreaName: 'Zona Sul / ABC', defaultRouteId: 'rot-03', defaultRouteName: 'Rota 03 - Zona Sul & ABC Paulista', ibgeCode: '3548708', active: true, createdAt: '2026-10-01T10:00:00.000Z' },
  { id: 'cid-05', name: 'São Caetano do Sul', stateUf: 'SP', marketAreaId: 'pra-03', marketAreaName: 'Zona Sul / ABC', defaultRouteId: 'rot-03', defaultRouteName: 'Rota 03 - Zona Sul & ABC Paulista', ibgeCode: '3548807', active: true, createdAt: '2026-10-01T10:00:00.000Z' },
  { id: 'cid-06', name: 'Diadema', stateUf: 'SP', marketAreaId: 'pra-03', marketAreaName: 'Zona Sul / ABC', defaultRouteId: 'rot-03', defaultRouteName: 'Rota 03 - Zona Sul & ABC Paulista', ibgeCode: '3513801', active: true, createdAt: '2026-10-01T10:00:00.000Z' },
  { id: 'cid-07', name: 'Campinas', stateUf: 'SP', marketAreaId: 'pra-04', marketAreaName: 'Interior SP', defaultRouteId: 'rot-04', defaultRouteName: 'Rota 04 - Interior & Campinas', ibgeCode: '3509502', active: true, createdAt: '2026-10-01T10:00:00.000Z' },
  { id: 'cid-08', name: 'Jundiaí', stateUf: 'SP', marketAreaId: 'pra-04', marketAreaName: 'Interior SP', defaultRouteId: 'rot-04', defaultRouteName: 'Rota 04 - Interior & Campinas', ibgeCode: '3525904', active: true, createdAt: '2026-10-01T10:00:00.000Z' },
  { id: 'cid-09', name: 'Valinhos', stateUf: 'SP', marketAreaId: 'pra-04', marketAreaName: 'Interior SP', defaultRouteId: 'rot-04', defaultRouteName: 'Rota 04 - Interior & Campinas', ibgeCode: '3556206', active: true, createdAt: '2026-10-01T10:00:00.000Z' },
  { id: 'cid-10', name: 'Vinhedo', stateUf: 'SP', marketAreaId: 'pra-04', marketAreaName: 'Interior SP', defaultRouteId: 'rot-04', defaultRouteName: 'Rota 04 - Interior & Campinas', ibgeCode: '3556701', active: true, createdAt: '2026-10-01T10:00:00.000Z' },
  { id: 'cid-11', name: 'Santos', stateUf: 'SP', marketAreaId: 'pra-05', marketAreaName: 'Litoral Paulista', ibgeCode: '3548500', active: true, createdAt: '2026-10-01T10:00:00.000Z' },
  { id: 'cid-12', name: 'São José dos Campos', stateUf: 'SP', marketAreaId: 'pra-06', marketAreaName: 'Vale do Paraíba', ibgeCode: '3549904', active: true, createdAt: '2026-10-01T10:00:00.000Z' },
  { id: 'cid-13', name: 'Rio de Janeiro', stateUf: 'RJ', marketAreaName: 'Capital RJ', ibgeCode: '3304557', active: true, createdAt: '2026-10-01T10:00:00.000Z' },
  { id: 'cid-14', name: 'Belo Horizonte', stateUf: 'MG', marketAreaName: 'Grande BH', ibgeCode: '3106200', active: true, createdAt: '2026-10-01T10:00:00.000Z' },
  { id: 'cid-15', name: 'Curitiba', stateUf: 'PR', marketAreaName: 'Capital PR', ibgeCode: '4106902', active: true, createdAt: '2026-10-01T10:00:00.000Z' },
];

export const DEFAULT_NEIGHBORHOODS: NeighborhoodItem[] = [
  { id: 'bai-01', name: 'Santana', cityName: 'São Paulo', stateUf: 'SP', marketAreaName: 'Zona Norte', defaultRouteId: 'rot-01', defaultRouteName: 'Rota 01 - Zona Norte & Santana', active: true, createdAt: '2026-10-01T10:00:00.000Z' },
  { id: 'bai-02', name: 'Vila Guilherme', cityName: 'São Paulo', stateUf: 'SP', marketAreaName: 'Zona Norte', defaultRouteId: 'rot-01', defaultRouteName: 'Rota 01 - Zona Norte & Santana', active: true, createdAt: '2026-10-01T10:00:00.000Z' },
  { id: 'bai-03', name: 'Tucuruvi', cityName: 'São Paulo', stateUf: 'SP', marketAreaName: 'Zona Norte', defaultRouteId: 'rot-01', defaultRouteName: 'Rota 01 - Zona Norte & Santana', active: true, createdAt: '2026-10-01T10:00:00.000Z' },
  { id: 'bai-04', name: 'Parque Novo Mundo', cityName: 'São Paulo', stateUf: 'SP', marketAreaName: 'Zona Norte', defaultRouteId: 'rot-01', defaultRouteName: 'Rota 01 - Zona Norte & Santana', active: true, createdAt: '2026-10-01T10:00:00.000Z' },
  { id: 'bai-05', name: 'Vila Maria', cityName: 'São Paulo', stateUf: 'SP', marketAreaName: 'Zona Norte', defaultRouteId: 'rot-01', defaultRouteName: 'Rota 01 - Zona Norte & Santana', active: true, createdAt: '2026-10-01T10:00:00.000Z' },
  { id: 'bai-06', name: 'Vila Bela', cityName: 'São Paulo', stateUf: 'SP', marketAreaName: 'Zona Norte', defaultRouteId: 'rot-01', defaultRouteName: 'Rota 01 - Zona Norte & Santana', active: true, createdAt: '2026-10-01T10:00:00.000Z' },
  { id: 'bai-07', name: 'Cerqueira César', cityName: 'São Paulo', stateUf: 'SP', marketAreaName: 'Centro', defaultRouteId: 'rot-02', defaultRouteName: 'Rota 02 - Centro Expandido & Paulista', active: true, createdAt: '2026-10-01T10:00:00.000Z' },
  { id: 'bai-08', name: 'Bela Vista', cityName: 'São Paulo', stateUf: 'SP', marketAreaName: 'Centro', defaultRouteId: 'rot-02', defaultRouteName: 'Rota 02 - Centro Expandido & Paulista', active: true, createdAt: '2026-10-01T10:00:00.000Z' },
  { id: 'bai-09', name: 'Consolação', cityName: 'São Paulo', stateUf: 'SP', marketAreaName: 'Centro', defaultRouteId: 'rot-02', defaultRouteName: 'Rota 02 - Centro Expandido & Paulista', active: true, createdAt: '2026-10-01T10:00:00.000Z' },
  { id: 'bai-10', name: 'República', cityName: 'São Paulo', stateUf: 'SP', marketAreaName: 'Centro', defaultRouteId: 'rot-02', defaultRouteName: 'Rota 02 - Centro Expandido & Paulista', active: true, createdAt: '2026-10-01T10:00:00.000Z' },
  { id: 'bai-11', name: 'Santa Cecília', cityName: 'São Paulo', stateUf: 'SP', marketAreaName: 'Centro', defaultRouteId: 'rot-02', defaultRouteName: 'Rota 02 - Centro Expandido & Paulista', active: true, createdAt: '2026-10-01T10:00:00.000Z' },
  { id: 'bai-12', name: 'Moema', cityName: 'São Paulo', stateUf: 'SP', marketAreaName: 'Zona Sul / ABC', defaultRouteId: 'rot-03', defaultRouteName: 'Rota 03 - Zona Sul & ABC Paulista', active: true, createdAt: '2026-10-01T10:00:00.000Z' },
  { id: 'bai-13', name: 'Vila Mariana', cityName: 'São Paulo', stateUf: 'SP', marketAreaName: 'Zona Sul / ABC', defaultRouteId: 'rot-03', defaultRouteName: 'Rota 03 - Zona Sul & ABC Paulista', active: true, createdAt: '2026-10-01T10:00:00.000Z' },
  { id: 'bai-14', name: 'Saúde', cityName: 'São Paulo', stateUf: 'SP', marketAreaName: 'Zona Sul / ABC', defaultRouteId: 'rot-03', defaultRouteName: 'Rota 03 - Zona Sul & ABC Paulista', active: true, createdAt: '2026-10-01T10:00:00.000Z' },
  { id: 'bai-15', name: 'Ipiranga', cityName: 'São Paulo', stateUf: 'SP', marketAreaName: 'Zona Sul / ABC', defaultRouteId: 'rot-03', defaultRouteName: 'Rota 03 - Zona Sul & ABC Paulista', active: true, createdAt: '2026-10-01T10:00:00.000Z' },
  { id: 'bai-16', name: 'Rudge Ramos', cityName: 'São Bernardo do Campo', stateUf: 'SP', marketAreaName: 'Zona Sul / ABC', defaultRouteId: 'rot-03', defaultRouteName: 'Rota 03 - Zona Sul & ABC Paulista', active: true, createdAt: '2026-10-01T10:00:00.000Z' },
  { id: 'bai-17', name: 'Cambuí', cityName: 'Campinas', stateUf: 'SP', marketAreaName: 'Interior SP', defaultRouteId: 'rot-04', defaultRouteName: 'Rota 04 - Interior & Campinas', active: true, createdAt: '2026-10-01T10:00:00.000Z' },
  { id: 'bai-18', name: 'Barão Geraldo', cityName: 'Campinas', stateUf: 'SP', marketAreaName: 'Interior SP', defaultRouteId: 'rot-04', defaultRouteName: 'Rota 04 - Interior & Campinas', active: true, createdAt: '2026-10-01T10:00:00.000Z' },
  { id: 'bai-19', name: 'Centro', cityName: 'Campinas', stateUf: 'SP', marketAreaName: 'Interior SP', defaultRouteId: 'rot-04', defaultRouteName: 'Rota 04 - Interior & Campinas', active: true, createdAt: '2026-10-01T10:00:00.000Z' },
  { id: 'bai-20', name: 'Gonzaga', cityName: 'Santos', stateUf: 'SP', marketAreaName: 'Litoral Paulista', active: true, createdAt: '2026-10-01T10:00:00.000Z' },
];

export const DEFAULT_DELIVERY_MANIFESTS: DeliveryManifest[] = [
  {
    id: 'rom-001',
    number: 'ROM-2026-0001',
    companyId: 'comp-matriz',
    date: '2026-10-12T08:00:00.000Z',
    departureDate: '2026-10-12',
    routeId: 'rot-01',
    routeName: 'Rota 01 - Zona Norte & Santana',
    driverName: 'Marcos Vinicius (Motorista)',
    driverPhone: '(11) 98765-4321',
    vehiclePlate: 'BRA-2E19',
    vehicleModel: 'Fiat Fiorino 1.4 EVO',
    status: 'em_transito',
    notes: 'Carga conferida no armazém. Entregar prioritariamente o supermercado Vila Bela.',
    orders: [
      {
        orderId: 'ped-rom-1',
        orderNumber: 'PED-2026-0008',
        orderDate: '2026-10-11T14:20:00.000Z',
        customerId: 'cli-001',
        customerCode: 'CLI-001',
        customerName: 'Supermercado Vila Bela Ltda',
        customerPhone: '(11) 3991-2200',
        customerCpfCnpj: '23.456.789/0001-11',
        address: {
          street: 'Rua das Flores',
          number: '450',
          neighborhood: 'Vila Bela',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '02300-000',
        },
        marketArea: 'Zona Norte',
        sellerName: 'Carlos Silva',
        sequence: 1,
        totalValue: 840.0,
        paymentMethod: 'boleto',
        paymentStatus: 'pago_antecipado',
        amountToCollect: 0,
        deliveryStatus: 'entregue',
        deliveredAt: '2026-10-12T09:45:00.000Z',
        deliveryNotes: 'Recebido na doca 02 pelo encarregado Pedro.',
        items: [
          {
            productId: 'prod-detergente-500',
            productCode: 'PA-301',
            description: 'Detergente Líquido Neutro Concentrado 500ml',
            unit: 'UN',
            quantity: 120,
            unitPrice: 3.5,
            totalPrice: 420.0,
          },
          {
            productId: 'prod-desinfetante-5l',
            productCode: 'PA-302',
            description: 'Desinfetante Floral Imperial Profissional 5L',
            unit: 'UN',
            quantity: 20,
            unitPrice: 21.0,
            totalPrice: 420.0,
          },
        ],
        volumesCount: 14,
      },
      {
        orderId: 'ped-rom-2',
        orderNumber: 'PED-2026-0012',
        orderDate: '2026-10-11T16:40:00.000Z',
        customerId: 'cli-003',
        customerCode: 'CLI-003',
        customerName: 'Lava Rápido Brilho Estelar',
        customerPhone: '(11) 2987-6543',
        customerCpfCnpj: '34.567.890/0001-33',
        address: {
          street: 'Av. Ataliba Leonel',
          number: '2100',
          neighborhood: 'Santana',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '02040-000',
        },
        marketArea: 'Zona Norte',
        sellerName: 'Bruno Lima',
        sequence: 2,
        totalValue: 560.0,
        paymentMethod: 'dinheiro',
        paymentStatus: 'cobrar_na_entrega',
        amountToCollect: 560.0,
        deliveryStatus: 'pendente',
        items: [
          {
            productId: 'prod-detergente-500',
            productCode: 'PA-301',
            description: 'Detergente Líquido Neutro Concentrado 500ml',
            unit: 'UN',
            quantity: 80,
            unitPrice: 3.5,
            totalPrice: 280.0,
          },
          {
            productId: 'prod-pano-microfibra',
            productCode: 'REV-102',
            description: 'Pano Microfibra Alta Absorção 40x40cm',
            unit: 'UN',
            quantity: 40,
            unitPrice: 7.0,
            totalPrice: 280.0,
          },
        ],
        volumesCount: 8,
      },
      {
        orderId: 'ped-rom-3',
        orderNumber: 'PED-2026-0015',
        orderDate: '2026-10-12T07:15:00.000Z',
        customerId: 'cli-004',
        customerCode: 'CLI-004',
        customerName: 'Maria Helena dos Santos',
        customerPhone: '(11) 2233-1122',
        customerCpfCnpj: '234.567.890-12',
        address: {
          street: 'Rua Voluntários da Pátria',
          number: '890',
          neighborhood: 'Santana',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '02100-000',
        },
        marketArea: 'Zona Norte',
        sellerName: 'Carlos Silva',
        sequence: 3,
        totalValue: 185.0,
        paymentMethod: 'pix',
        paymentStatus: 'cobrar_na_entrega',
        amountToCollect: 185.0,
        deliveryStatus: 'pendente',
        items: [
          {
            productId: 'prod-vassoura-piacava',
            productCode: 'REV-101',
            description: 'Vassoura Piaçava Reforçada com Cabo 1,20m',
            unit: 'UN',
            quantity: 5,
            unitPrice: 18.0,
            totalPrice: 90.0,
          },
          {
            productId: 'prod-rodo-duplo',
            productCode: 'REV-103',
            description: 'Rodo Duplo Borracha EVA 40cm com Cabo',
            unit: 'UN',
            quantity: 5,
            unitPrice: 19.0,
            totalPrice: 95.0,
          },
        ],
        volumesCount: 2,
      },
    ],
    totalOrders: 3,
    totalDelivered: 1,
    totalPending: 2,
    totalValue: 1585.0,
    totalAmountToCollect: 745.0,
    totalVolumes: 24,
    createdAt: '2026-10-12T08:00:00.000Z',
    updatedAt: '2026-10-12T09:45:00.000Z',
  },
];

export const DEFAULT_ROLE_MENU_SECTIONS: Record<UserRole, string[]> = {
  admin: [
    'inicio',
    'vendas',
    'cadastros',
    'compras',
    'estoque',
    'producao',
    'expedicao',
    'precificacao',
    'financeiro',
    'relatorios',
    'importacao',
    'configuracoes',
  ],
  gerente: [
    'inicio',
    'vendas',
    'cadastros',
    'compras',
    'estoque',
    'producao',
    'expedicao',
    'precificacao',
    'financeiro',
    'relatorios',
    'importacao',
  ],
  balconista: ['inicio', 'vendas', 'cadastros'],
  vendedor_externo: ['inicio', 'vendas', 'cadastros'],
  financeiro: ['inicio', 'financeiro', 'cadastros', 'compras', 'relatorios'],
};

export const DEFAULT_ROLE_SUB_ITEMS: Record<UserRole, string[]> = {
  admin: [
    'dashboard',
    'pos',
    'orders',
    'orders_quotes',
    'external_sales',
    'orders_history',
    'products',
    'customers',
    'suppliers',
    'stock_locations',
    'purchases',
    'stock_transfers',
    'inventory',
    'stock_movements',
    'bom_composition',
    'components_catalog',
    'production_orders',
    'delivery_manifests',
    'delivery_routes',
    'delivery_market_areas',
    'delivery_neighborhoods',
    'delivery_cities',
    'delivery_states',
    'expedition_reports',
    'pricing_calculator',
    'batch_pricing',
    'cash_flow',
    'accounts_receivable',
    'accounts_payable',
    'cash_register',
    'payment_methods',
    'financial_accounts',
    'payment_terms',
    'financial_reports',
    'reports',
    'excel_tools',
    'settings',
    'settings_supabase',
    'settings_menus',
    'settings_preferences',
    'settings_printer',
  ],
  gerente: [
    'dashboard',
    'pos',
    'orders',
    'orders_quotes',
    'external_sales',
    'orders_history',
    'products',
    'customers',
    'suppliers',
    'stock_locations',
    'purchases',
    'stock_transfers',
    'inventory',
    'stock_movements',
    'bom_composition',
    'components_catalog',
    'production_orders',
    'delivery_manifests',
    'delivery_routes',
    'delivery_market_areas',
    'delivery_neighborhoods',
    'delivery_cities',
    'delivery_states',
    'expedition_reports',
    'pricing_calculator',
    'batch_pricing',
    'cash_flow',
    'accounts_receivable',
    'accounts_payable',
    'cash_register',
    'payment_methods',
    'financial_accounts',
    'payment_terms',
    'financial_reports',
    'reports',
    'excel_tools',
    'settings_preferences',
    'settings_printer',
  ],
  balconista: [
    'pos',
    'orders',
    'orders_quotes',
    'orders_history',
    'products',
    'customers',
  ],
  vendedor_externo: [
    'dashboard',
    'orders',
    'orders_quotes',
    'external_sales',
    'products',
    'customers',
  ],
  financeiro: [
    'dashboard',
    'cash_flow',
    'accounts_receivable',
    'accounts_payable',
    'cash_register',
    'payment_methods',
    'financial_accounts',
    'payment_terms',
    'financial_reports',
    'customers',
    'suppliers',
    'purchases',
    'reports',
  ],
};

export const DEFAULT_ROLE_FINANCIAL_PERMISSIONS: Record<
  UserRole,
  {
    canViewGrossProfit: boolean;
    canViewNetProfit: boolean;
    canViewTotalRevenue: boolean;
    canViewProfitMargin: boolean;
    canViewProductCosts: boolean;
    canViewCashBalances: boolean;
  }
> = {
  admin: {
    canViewGrossProfit: true,
    canViewNetProfit: true,
    canViewTotalRevenue: true,
    canViewProfitMargin: true,
    canViewProductCosts: true,
    canViewCashBalances: true,
  },
  gerente: {
    canViewGrossProfit: true,
    canViewNetProfit: false,
    canViewTotalRevenue: true,
    canViewProfitMargin: true,
    canViewProductCosts: true,
    canViewCashBalances: true,
  },
  balconista: {
    canViewGrossProfit: false,
    canViewNetProfit: false,
    canViewTotalRevenue: false,
    canViewProfitMargin: false,
    canViewProductCosts: false,
    canViewCashBalances: false,
  },
  vendedor_externo: {
    canViewGrossProfit: false,
    canViewNetProfit: false,
    canViewTotalRevenue: false,
    canViewProfitMargin: false,
    canViewProductCosts: false,
    canViewCashBalances: false,
  },
  financeiro: {
    canViewGrossProfit: false,
    canViewNetProfit: false,
    canViewTotalRevenue: true,
    canViewProfitMargin: false,
    canViewProductCosts: false,
    canViewCashBalances: true,
  },
};

export class Database {
  private static state: DatabaseState | null = null;
  private static listeners: Array<() => void> = [];
  private static onPersistListeners: Array<() => void> = [];

  public static subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  public static onPersist(listener: () => void): () => void {
    this.onPersistListeners.push(listener);
    return () => {
      this.onPersistListeners = this.onPersistListeners.filter((l) => l !== listener);
    };
  }

  private static notify() {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error('Erro em listener do Database:', err);
      }
    });
  }

  public static getState(): DatabaseState {
    if (!this.state) {
      this.load();
    }
    return this.state!;
  }

  public static load(): DatabaseState {
    try {
      const stored = localStorage.getItem(DB_KEY_PREFIX + 'state');
      if (stored) {
        this.state = JSON.parse(stored);
        // Garante que existam contas a receber com amostra de parcela vencida para teste
        if (this.state && (!this.state.accountsReceivable || this.state.accountsReceivable.length <= 1)) {
          const companyMatrizId = 'comp-matriz';
          const overdueSample: AccountReceivable[] = [
            {
              id: 'rec-overdue-001',
              companyId: companyMatrizId,
              orderId: 'ord-atrasada-01',
              orderNumber: 'VD-2026-0034',
              customerId: 'cli-001',
              customerName: 'Auto Posto & Conveniência Estrela do Norte',
              docNumber: 'DUP-1048/1',
              installmentNumber: 1,
              totalInstallments: 2,
              issueDate: '2026-08-25',
              dueDate: '2026-09-25',
              originalValue: 540.0,
              discount: 0,
              addition: 0,
              paidValue: 0,
              balance: 540.0,
              paymentMethod: 'Boleto Bancário',
              status: 'aberto',
              receipts: [],
            },
            {
              id: 'rec-overdue-002',
              companyId: companyMatrizId,
              orderId: 'ord-atrasada-02',
              orderNumber: 'VD-2026-0029',
              customerId: 'cli-003',
              customerName: 'Restaurante & Churrascaria Fogão Gaúcho',
              docNumber: 'DUP-1033/2',
              installmentNumber: 2,
              totalInstallments: 3,
              issueDate: '2026-08-15',
              dueDate: '2026-09-15',
              originalValue: 380.0,
              discount: 0,
              addition: 0,
              paidValue: 0,
              balance: 380.0,
              paymentMethod: 'Boleto Bancário',
              status: 'aberto',
              receipts: [],
            },
          ];
          this.state.accountsReceivable = [...(this.state.accountsReceivable || []), ...overdueSample];
          this.persist();
        }

        // Garante que existam pedidos de venda com origem 'externa_celular' para testes do módulo mobile
        if (this.state && (!this.state.orders || !this.state.orders.some((o) => o.origin === 'externa_celular' && o.type === 'venda'))) {
          const companyMatrizId = 'comp-matriz';
          const todayIso = new Date().toISOString().split('T')[0];
          const currentMonthIso = todayIso.slice(0, 7);
          const sampleExternalSales: Order[] = [
            {
              id: 'ord-venda-ext-hoje',
              number: 'PED-EXT-2026-0001',
              type: 'venda',
              origin: 'externa_celular',
              companyId: companyMatrizId,
              customerId: 'cli-004',
              customerName: 'Maria Helena dos Santos',
              userId: 'usr-vendedor-externo',
              userName: 'Bruno Lima',
              items: [
                {
                  id: 'item-ext-1',
                  productId: 'prod-detergente-500',
                  productCode: 'PA-301',
                  description: 'Detergente Líquido Neutro Imperial 500ml',
                  unit: 'UN',
                  quantity: 20,
                  unitPrice: 3.99,
                  discountPercent: 0,
                  discountValue: 0,
                  totalPrice: 79.80,
                  unitCost: 1.84,
                  locationId: 'loc-comercial',
                },
                {
                  id: 'item-ext-2',
                  productId: 'prod-desinfetante-5l',
                  productCode: 'PA-302',
                  description: 'Desinfetante Floral Imperial Profissional 5L',
                  unit: 'UN',
                  quantity: 4,
                  unitPrice: 21.50,
                  discountPercent: 0,
                  discountValue: 0,
                  totalPrice: 86.00,
                  unitCost: 9.85,
                  locationId: 'loc-comercial',
                },
              ],
              subtotal: 165.80,
              discountTotal: 0,
              total: 165.80,
              paymentMethod: 'pix',
              installmentsCount: 1,
              receivedAmount: 165.80,
              changeAmount: 0,
              status: 'concluido',
              stockDeducted: true,
              financialGenerated: true,
              createdAt: `${todayIso}T09:30:00.000Z`,
              updatedAt: `${todayIso}T09:30:00.000Z`,
            },
            {
              id: 'ord-venda-ext-mes',
              number: 'PED-EXT-2026-0002',
              type: 'venda',
              origin: 'externa_celular',
              companyId: companyMatrizId,
              customerId: 'cli-001',
              customerName: 'Auto Posto & Conveniência Estrela do Norte',
              userId: 'usr-vendedor-externo',
              userName: 'Bruno Lima',
              items: [
                {
                  id: 'item-ext-3',
                  productId: 'prod-desinfetante-5l',
                  productCode: 'PA-302',
                  description: 'Desinfetante Floral Imperial Profissional 5L',
                  unit: 'UN',
                  quantity: 25,
                  unitPrice: 21.50,
                  discountPercent: 5,
                  discountValue: 26.88,
                  totalPrice: 510.62,
                  unitCost: 9.85,
                  locationId: 'loc-comercial',
                },
              ],
              subtotal: 537.50,
              discountTotal: 26.88,
              total: 510.62,
              paymentMethod: 'boleto',
              installmentsCount: 2,
              receivedAmount: 0,
              changeAmount: 0,
              status: 'concluido',
              stockDeducted: true,
              financialGenerated: true,
              createdAt: `${currentMonthIso}-01T14:15:00.000Z`,
              updatedAt: `${currentMonthIso}-01T14:15:00.000Z`,
            },
          ];
          this.state.orders = [...sampleExternalSales, ...(this.state.orders || [])];
          this.persist();
        }

        // Garante que existam ordens de produção de amostra para testes dos filtros e histórico
        if (this.state && (!this.state.productionOrders || this.state.productionOrders.length === 0)) {
          this.state.productionOrders = [
            {
              id: 'op-001',
              number: 'OP-2026-0001',
              companyId: 'comp-matriz',
              productId: 'prod-detergente-500',
              productCode: 'PA-301',
              productDescription: 'Detergente Líquido Neutro Imperial 500ml',
              plannedQuantity: 100,
              producedQuantity: 100,
              destinationLocationId: 'loc-comercial',
              componentsConsumed: [
                {
                  componentId: 'comp-lauril-27',
                  componentCode: 'MP-001',
                  description: 'Lauril Éter Sulfato de Sódio 27%',
                  unit: 'L',
                  plannedQty: 15,
                  actualQty: 15,
                  locationId: 'loc-quimicos',
                  unitCost: 4.80,
                  totalCost: 72.00,
                },
                {
                  componentId: 'comp-amida-60',
                  componentCode: 'MP-002',
                  description: 'Amida 60 Espessante Estabilizador',
                  unit: 'L',
                  plannedQty: 0.5,
                  actualQty: 0.5,
                  locationId: 'loc-quimicos',
                  unitCost: 28.00,
                  totalCost: 14.00,
                },
                {
                  componentId: 'comp-frasco-500',
                  componentCode: 'EMB-001',
                  description: 'Frasco Plástico PET Transparente 500ml',
                  unit: 'UN',
                  plannedQty: 100,
                  actualQty: 100,
                  locationId: 'loc-embalagens',
                  unitCost: 0.65,
                  totalCost: 65.00,
                },
                {
                  componentId: 'comp-tampa-flip',
                  componentCode: 'EMB-002',
                  description: 'Tampa Flip-Top Rosca 28mm Vermelha',
                  unit: 'UN',
                  plannedQty: 100,
                  actualQty: 100,
                  locationId: 'loc-embalagens',
                  unitCost: 0.22,
                  totalCost: 22.00,
                },
              ],
              totalCost: 173.00,
              unitCost: 1.73,
              status: 'concluida',
              orderDate: new Date(Date.now() - 1 * 86400000).toISOString(),
              completionDate: new Date(Date.now() - 1 * 86400000).toISOString(),
              userId: 'usr-admin',
              userName: 'Carlos Silva (Gestor)',
              notes: 'Lote 01-A26 - Reposição de estoque comercial',
            },
            {
              id: 'op-002',
              number: 'OP-2026-0002',
              companyId: 'comp-matriz',
              productId: 'prod-desinfetante-5l',
              productCode: 'PA-302',
              productDescription: 'Desinfetante Floral Imperial Profissional 5L',
              plannedQuantity: 40,
              producedQuantity: 40,
              destinationLocationId: 'loc-comercial',
              componentsConsumed: [
                {
                  componentId: 'comp-quaternario-amonia',
                  componentCode: 'MP-003',
                  description: 'Cloreto de Benzalcônio 50% (Quaternário)',
                  unit: 'L',
                  plannedQty: 4,
                  actualQty: 4,
                  locationId: 'loc-quimicos',
                  unitCost: 22.50,
                  totalCost: 90.00,
                },
                {
                  componentId: 'comp-galao-5l',
                  componentCode: 'EMB-003',
                  description: 'Galão Bombona PEAD 5 Litros com Tampa Lacre',
                  unit: 'UN',
                  plannedQty: 40,
                  actualQty: 40,
                  locationId: 'loc-embalagens',
                  unitCost: 3.20,
                  totalCost: 128.00,
                },
              ],
              totalCost: 218.00,
              unitCost: 5.45,
              status: 'concluida',
              orderDate: new Date(Date.now() - 4 * 86400000).toISOString(),
              completionDate: new Date(Date.now() - 4 * 86400000).toISOString(),
              userId: 'usr-admin',
              userName: 'Carlos Silva (Gestor)',
              notes: 'Lote 02-B26 - Atendimento a pedidos da semana',
            },
            {
              id: 'op-003',
              number: 'OP-2026-0003',
              companyId: 'comp-matriz',
              productId: 'prod-detergente-500',
              productCode: 'PA-301',
              productDescription: 'Detergente Líquido Neutro Imperial 500ml',
              plannedQuantity: 150,
              producedQuantity: 150,
              destinationLocationId: 'loc-comercial',
              componentsConsumed: [
                {
                  componentId: 'comp-lauril-27',
                  componentCode: 'MP-001',
                  description: 'Lauril Éter Sulfato de Sódio 27%',
                  unit: 'L',
                  plannedQty: 22.5,
                  actualQty: 22.5,
                  locationId: 'loc-quimicos',
                  unitCost: 4.80,
                  totalCost: 108.00,
                },
                {
                  componentId: 'comp-frasco-500',
                  componentCode: 'EMB-001',
                  description: 'Frasco Plástico PET Transparente 500ml',
                  unit: 'UN',
                  plannedQty: 150,
                  actualQty: 150,
                  locationId: 'loc-embalagens',
                  unitCost: 0.65,
                  totalCost: 97.50,
                },
              ],
              totalCost: 205.50,
              unitCost: 1.37,
              status: 'concluida',
              orderDate: new Date(Date.now() - 15 * 86400000).toISOString(),
              completionDate: new Date(Date.now() - 15 * 86400000).toISOString(),
              userId: 'usr-admin',
              userName: 'Carlos Silva (Gestor)',
              notes: 'Lote 03-C26 - Produção quinzenal',
            },
          ];
          this.persist();
        }

        // Garante que a lista de componentes com código próprio e matérias-primas associadas exista
        if (this.state && (!this.state.components || this.state.components.length === 0)) {
          this.state.components = [...DEFAULT_COMPONENTS];
          this.persist();
        }

        // Harmoniza composições de produtos com os componentes cadastrados
        if (this.state && this.state.components && this.state.products) {
          const comps = this.state.components;
          let changed = false;
          this.state.products.forEach((p) => {
            if (p.composition && Array.isArray(p.composition)) {
              p.composition.forEach((ci) => {
                const match = comps.find(
                  (c) =>
                    c.id === ci.componentId ||
                    c.code === ci.componentCode ||
                    c.rawMaterialId === ci.componentId ||
                    c.rawMaterialId === ci.rawMaterialId
                );
                if (match) {
                  if (ci.componentId !== match.id || ci.componentCode !== match.code || ci.rawMaterialId !== match.rawMaterialId) {
                    ci.componentId = match.id;
                    ci.componentCode = match.code;
                    ci.componentDescription = match.name;
                    ci.rawMaterialId = match.rawMaterialId;
                    ci.rawMaterialCode = match.rawMaterialCode;
                    ci.rawMaterialDescription = match.rawMaterialDescription;
                    changed = true;
                  }
                }
              });
            }
          });
          if (changed) {
            this.persist();
          }
        }

        // Garante que existam formas de pagamento, contas bancárias e prazos de pagamento
        if (this.state && (!this.state.paymentMethods || this.state.paymentMethods.length === 0)) {
          this.state.paymentMethods = [...DEFAULT_PAYMENT_METHODS];
          this.persist();
        }
        if (this.state && (!this.state.financialAccounts || this.state.financialAccounts.length === 0)) {
          this.state.financialAccounts = [...DEFAULT_FINANCIAL_ACCOUNTS];
          this.persist();
        }
        if (this.state && (!this.state.paymentTermsList || this.state.paymentTermsList.length === 0)) {
          this.state.paymentTermsList = [...DEFAULT_PAYMENT_TERMS];
          this.persist();
        }

        // Unifica "Revenda" e "Produtos Acabados" em um único depósito padrão chamado "Comercial"
        if (this.state && this.state.stockLocations) {
          const locs = this.state.stockLocations;
          const oldLocIds = new Set(['loc-revenda', 'loc-acabados']);
          const hasOldLocs = locs.some(
            (l) => oldLocIds.has(l.id) || l.name === 'Revenda' || l.name === 'Revenda Balcão' || l.name === 'Produtos Acabados'
          );

          if (hasOldLocs || !locs.some((l) => l.id === 'loc-comercial' || l.name === 'Comercial')) {
            const compId = this.state.companies?.[0]?.id || 'comp-matriz';
            const filteredLocs = locs.filter(
              (l) => !oldLocIds.has(l.id) && l.name !== 'Revenda' && l.name !== 'Revenda Balcão' && l.name !== 'Produtos Acabados'
            );

            let comercialLoc = locs.find((l) => l.id === 'loc-comercial' || l.name === 'Comercial');
            if (!comercialLoc) {
              comercialLoc = {
                id: 'loc-comercial',
                code: 'COM-01',
                name: 'Comercial',
                companyId: compId,
                description: 'Estoque Comercial unificado para expedição, balcão e vendas',
                type: 'comercial',
                status: 'ativo',
              };
            } else {
              comercialLoc = {
                ...comercialLoc,
                id: 'loc-comercial',
                name: 'Comercial',
                type: 'comercial',
                status: 'ativo',
              };
            }

            this.state.stockLocations = [comercialLoc, ...filteredLocs.filter((l) => l.id !== 'loc-comercial')];

            // Migrar saldos agrupando no depósito Comercial
            if (this.state.stockBalances) {
              const balanceMap: Record<string, ProductStockBalance> = {};
              for (const bal of this.state.stockBalances) {
                const targetLocId = (bal.locationId === 'loc-revenda' || bal.locationId === 'loc-acabados')
                  ? 'loc-comercial'
                  : bal.locationId;
                const key = `${bal.productId}__${targetLocId}`;
                if (!balanceMap[key]) {
                  balanceMap[key] = {
                    ...bal,
                    locationId: targetLocId,
                  };
                } else {
                  balanceMap[key].quantity += bal.quantity;
                  balanceMap[key].reserved += bal.reserved || 0;
                  balanceMap[key].minStock = Math.max(balanceMap[key].minStock || 0, bal.minStock || 0);
                }
              }
              this.state.stockBalances = Object.values(balanceMap);
            }

            // Migrar defaultLocationId dos produtos
            if (this.state.products) {
              this.state.products = this.state.products.map((p) => {
                if (p.defaultLocationId === 'loc-revenda' || p.defaultLocationId === 'loc-acabados') {
                  return { ...p, defaultLocationId: 'loc-comercial' };
                }
                return p;
              });
            }

            // Migrar itens dos pedidos
            if (this.state.orders) {
              this.state.orders = this.state.orders.map((o) => ({
                ...o,
                items: o.items.map((it) => {
                  if (it.locationId === 'loc-revenda' || it.locationId === 'loc-acabados') {
                    return { ...it, locationId: 'loc-comercial' };
                  }
                  return it;
                }),
              }));
            }

            // Migrar movimentações de estoque
            if (this.state.stockMovements) {
              this.state.stockMovements = this.state.stockMovements.map((m) => {
                let updated = { ...m };
                if (m.locationId === 'loc-revenda' || m.locationId === 'loc-acabados') {
                  updated.locationId = 'loc-comercial';
                  updated.locationName = 'Comercial';
                }
                if (m.toLocationId === 'loc-revenda' || m.toLocationId === 'loc-acabados') {
                  updated.toLocationId = 'loc-comercial';
                  updated.toLocationName = 'Comercial';
                }
                return updated;
              });
            }

            this.persist();
          }
        }

        if (this.state) {
          let stateNeedsPersist = false;

          // Garante a existência do depósito comercial compartilhado para todas as empresas
          if (this.state.stockLocations && !this.state.stockLocations.some((l) => l.id === 'loc-comercial' || l.name.toLowerCase() === 'comercial')) {
            this.state.stockLocations.unshift({
              id: 'loc-comercial',
              code: 'COM-01',
              name: 'Comercial',
              companyId: 'comp-matriz',
              description: 'Estoque Comercial unificado e compartilhado para todas as empresas (Matriz e Filiais)',
              type: 'comercial',
              status: 'ativo',
            });
            stateNeedsPersist = true;
          }

          if (!this.state.deliveryRoutes || this.state.deliveryRoutes.length === 0) {
            this.state.deliveryRoutes = [...DEFAULT_DELIVERY_ROUTES];
            stateNeedsPersist = true;
          }
          if (!this.state.deliveryManifests || this.state.deliveryManifests.length === 0) {
            this.state.deliveryManifests = [...DEFAULT_DELIVERY_MANIFESTS];
            stateNeedsPersist = true;
          }
          if (!this.state.states || this.state.states.length === 0) {
            this.state.states = [...DEFAULT_STATES];
            stateNeedsPersist = true;
          }
          if (!this.state.marketAreas || this.state.marketAreas.length === 0) {
            this.state.marketAreas = [...DEFAULT_MARKET_AREAS];
            stateNeedsPersist = true;
          }
          if (!this.state.cities || this.state.cities.length === 0) {
            this.state.cities = [...DEFAULT_CITIES];
            stateNeedsPersist = true;
          }
          if (!this.state.neighborhoods || this.state.neighborhoods.length === 0) {
            this.state.neighborhoods = [...DEFAULT_NEIGHBORHOODS];
            stateNeedsPersist = true;
          }
          if (!this.state.stockControlConfig) {
            this.state.stockControlConfig = { ...DEFAULT_STOCK_CONTROL_CONFIG };
            stateNeedsPersist = true;
          }
          if (this.state.customers && this.state.customers.length > 0) {
            this.state.customers = this.state.customers.map((c) => {
              if (!c.deliveryRouteId || !c.marketArea || !c.sellerName) {
                stateNeedsPersist = true;
                if (c.neighborhood === 'Vila Bela' || c.neighborhood === 'Santana' || c.neighborhood === 'Parque Novo Mundo') {
                  return {
                    ...c,
                    marketArea: c.marketArea || 'Zona Norte',
                    sellerName: c.sellerName || 'Carlos Silva',
                    deliveryRouteId: c.deliveryRouteId || 'rot-01',
                    deliveryRouteName: c.deliveryRouteName || 'Rota 01 - Zona Norte & Santana',
                  };
                } else if (c.neighborhood === 'Cerqueira César' || c.neighborhood === 'Bela Vista') {
                  return {
                    ...c,
                    marketArea: c.marketArea || 'Centro',
                    sellerName: c.sellerName || 'Mariana Oliveira',
                    deliveryRouteId: c.deliveryRouteId || 'rot-02',
                    deliveryRouteName: c.deliveryRouteName || 'Rota 02 - Centro Expandido & Paulista',
                  };
                } else {
                  return {
                    ...c,
                    marketArea: c.marketArea || 'Zona Sul / ABC',
                    sellerName: c.sellerName || 'Roberto Vendas',
                    deliveryRouteId: c.deliveryRouteId || 'rot-03',
                    deliveryRouteName: c.deliveryRouteName || 'Rota 03 - Zona Sul & ABC Paulista',
                  };
                }
              }
              return c;
            });
          }

          // Migração e garantia de senhas e permissões de menus/números dos usuários
          if (this.state.users && this.state.users.length > 0) {
            this.state.users = this.state.users.map((u) => {
              let updated = false;
              let pwd = u.password;
              if (!pwd) {
                pwd = u.login === 'admin' ? 'admin' : '1234';
                updated = true;
              }

              const role = u.role || 'balconista';
              const finDefaults = DEFAULT_ROLE_FINANCIAL_PERMISSIONS[role] || DEFAULT_ROLE_FINANCIAL_PERMISSIONS.balconista;
              const menuDefaults = DEFAULT_ROLE_MENU_SECTIONS[role] || DEFAULT_ROLE_MENU_SECTIONS.balconista;
              const subItemDefaults = DEFAULT_ROLE_SUB_ITEMS[role] || DEFAULT_ROLE_SUB_ITEMS.balconista;

              let allowedSubs = u.permissions.allowedSubItems || (u.login === 'admin' ? undefined : [...subItemDefaults]);
              if (role === 'balconista' && allowedSubs) {
                allowedSubs = allowedSubs.filter((item) => item !== 'dashboard');
                if (!allowedSubs.includes('pos')) {
                  allowedSubs.unshift('pos');
                }
              }

              const isBalconista = role === 'balconista';

              const perms: UserPermissions = {
                ...u.permissions,
                canViewGrossProfit: isBalconista ? false : (
                  u.permissions.canViewGrossProfit !== undefined
                    ? u.permissions.canViewGrossProfit
                    : finDefaults.canViewGrossProfit
                ),
                canViewNetProfit: isBalconista ? false : (
                  u.permissions.canViewNetProfit !== undefined
                    ? u.permissions.canViewNetProfit
                    : finDefaults.canViewNetProfit
                ),
                canViewTotalRevenue: isBalconista ? false : (
                  u.permissions.canViewTotalRevenue !== undefined
                    ? u.permissions.canViewTotalRevenue
                    : finDefaults.canViewTotalRevenue
                ),
                canViewProfitMargin: isBalconista ? false : (
                  u.permissions.canViewProfitMargin !== undefined
                    ? u.permissions.canViewProfitMargin
                    : finDefaults.canViewProfitMargin
                ),
                canViewProductCosts: isBalconista ? false : (
                  u.permissions.canViewProductCosts !== undefined
                    ? u.permissions.canViewProductCosts
                    : (u.permissions.canViewCosts ?? finDefaults.canViewProductCosts)
                ),
                canViewCashBalances: isBalconista ? false : (
                  u.permissions.canViewCashBalances !== undefined
                    ? u.permissions.canViewCashBalances
                    : finDefaults.canViewCashBalances
                ),
                allowedMenuSections:
                  u.permissions.allowedMenuSections || (u.login === 'admin' ? undefined : [...menuDefaults]),
                allowedSubItems: allowedSubs,
              };

              if (
                u.permissions.canViewGrossProfit === undefined ||
                u.permissions.canViewNetProfit === undefined ||
                !u.permissions.allowedMenuSections ||
                !u.password ||
                (isBalconista && u.permissions.allowedSubItems?.includes('dashboard'))
              ) {
                updated = true;
              }

              if (updated) {
                stateNeedsPersist = true;
                return {
                  ...u,
                  password: pwd,
                  permissions: perms,
                };
              }
              return u;
            });
          }

          // Garante a existência do produto demonstrativo de Embalagem Master
          if (this.state.products && !this.state.products.some((p) => p.isMasterPack)) {
            const baseProd = this.state.products.find((p) => p.id === 'prod-detergente-500' || p.code === 'PA-301') || this.state.products[0];
            if (baseProd) {
              const masterPackSample: Product = {
                id: 'prod-master-detergente-cx24',
                code: 'CX-301-24',
                description: `Caixa ${baseProd.description} c/ 24 UN`,
                unit: 'CX',
                costPrice: Number((baseProd.costPrice * 24).toFixed(2)),
                salePrice: Number((baseProd.salePrice * 24 * 0.95).toFixed(2)),
                family: baseProd.family || 'Produtos Próprios',
                group: 'Embalagens Master',
                barcode: '7891112223240',
                minStock: 5,
                productType: 'revenda',
                hasComposition: false,
                defaultLocationId: baseProd.defaultLocationId || 'loc-comercial',
                status: 'ativo',
                notes: `Embalagem Master contendo 24 unidades do item ${baseProd.code} - ${baseProd.description}. Controle de estoque integrado automaticamente ao item unitário.`,
                isMasterPack: true,
                masterPackAssociatedProductId: baseProd.id,
                masterPackAssociatedProductCode: baseProd.code,
                masterPackAssociatedProductDescription: baseProd.description,
                masterPackUnits: 24,
                masterPackPackagingType: 'caixa',
              };
              this.state.products.push(masterPackSample);
              stateNeedsPersist = true;
            }
          }

          if (stateNeedsPersist) {
            this.persist();
          }
        }

        return this.state!;
      }
    } catch (e) {
      console.warn('Falha ao ler dados locais, restaurando sementes:', e);
    }

    this.state = this.getSeedData();
    this.persist();
    return this.state!;
  }

  public static persist() {
    if (this.state) {
      try {
        localStorage.setItem(DB_KEY_PREFIX + 'state', JSON.stringify(this.state));
      } catch (e) {
        console.error('Erro ao persistir banco no localStorage:', e);
      }
    }
    this.notify();
    this.onPersistListeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error('Erro ao acionar listener de persistência:', err);
      }
    });
  }

  public static resetToFactoryDefaults() {
    localStorage.removeItem(DB_KEY_PREFIX + 'state');
    this.state = this.getSeedData();
    this.persist();
  }

  public static exportDatabaseJSON(): string {
    return JSON.stringify(this.getState(), null, 2);
  }

  public static importDatabaseJSON(jsonString: string): boolean {
    try {
      const parsed = JSON.parse(jsonString) as DatabaseState;
      if (!parsed.companies || !parsed.products || !parsed.users) {
        throw new Error('Estrutura de dados inválida');
      }
      this.state = parsed;
      this.persist();
      return true;
    } catch (e) {
      console.error('Falha ao restaurar banco:', e);
      return false;
    }
  }

  public static getLastRemoteSyncTime(): string | null {
    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        return localStorage.getItem(DB_KEY_PREFIX + 'last_remote_sync');
      }
      return null;
    } catch {
      return null;
    }
  }

  public static setLastRemoteSyncTime(timeIso: string): void {
    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        localStorage.setItem(DB_KEY_PREFIX + 'last_remote_sync', timeIso);
      }
    } catch {
      // ignore
    }
  }

  /**
   * Aplica um estado remoto diretamente recebido do Supabase sem disparar onPersist
   * (evitando loop recursivo de sincronização).
   */
  public static applyRemoteState(remoteState: DatabaseState, remoteSyncTime?: string): boolean {
    try {
      if (!remoteState || !Array.isArray(remoteState.companies) || !Array.isArray(remoteState.products)) {
        return false;
      }
      this.state = remoteState;
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem(DB_KEY_PREFIX + 'state', JSON.stringify(this.state));
          if (remoteSyncTime) {
            localStorage.setItem(DB_KEY_PREFIX + 'last_remote_sync', remoteSyncTime);
          }
        } catch (e) {
          console.error('Erro ao atualizar cache local com estado do Supabase:', e);
        }
      }
      this.notify();
      return true;
    } catch (e) {
      console.error('Falha ao aplicar estado remoto do Supabase:', e);
      return false;
    }
  }

  /**
   * Reconcilia com segurança os dados locais com os dados do Supabase.
   * Preserva quaisquer registros criados localmente enquanto offline e
   * atualiza os registros existentes com as alterações da nuvem.
   */
  public static reconcileWithRemote(
    remoteState: DatabaseState,
    remoteSyncTime?: string
  ): { merged: boolean; localUnsyncedChanges: boolean } {
    try {
      if (!remoteState || !Array.isArray(remoteState.companies)) {
        return { merged: false, localUnsyncedChanges: false };
      }

      const local = this.getState();
      let hasLocalUnsynced = false;

      // Mescla coleções preservando itens locais não sincronizados por ID
      const mergeArrays = <T extends { id: string }>(
        localArr: T[] | undefined,
        remoteArr: T[] | undefined
      ): T[] => {
        const localList = localArr || [];
        const remoteList = remoteArr || [];
        const remoteMap = new Map<string, T>();
        remoteList.forEach((item) => remoteMap.set(item.id, item));

        const localOnlyItems: T[] = [];
        localList.forEach((lItem) => {
          if (!remoteMap.has(lItem.id)) {
            localOnlyItems.push(lItem);
            hasLocalUnsynced = true;
          }
        });

        return [...remoteList, ...localOnlyItems];
      };

      const mergedState: DatabaseState = {
        ...remoteState,
        currentCompanyId: local.currentCompanyId || remoteState.currentCompanyId,
        currentUserId: local.currentUserId || remoteState.currentUserId,
        companies: mergeArrays(local.companies, remoteState.companies),
        users: mergeArrays(local.users, remoteState.users),
        customers: mergeArrays(local.customers, remoteState.customers),
        suppliers: mergeArrays(local.suppliers, remoteState.suppliers),
        products: mergeArrays(local.products, remoteState.products),
        components: mergeArrays(local.components, remoteState.components),
        orders: mergeArrays(local.orders, remoteState.orders),
        deliveryRoutes: mergeArrays(local.deliveryRoutes, remoteState.deliveryRoutes),
        deliveryManifests: mergeArrays(local.deliveryManifests, remoteState.deliveryManifests),
        stockLocations: mergeArrays(local.stockLocations, remoteState.stockLocations),
        productionOrders: mergeArrays(local.productionOrders, remoteState.productionOrders),
        purchaseOrders: mergeArrays(local.purchaseOrders, remoteState.purchaseOrders),
        purchaseReceipts: mergeArrays(local.purchaseReceipts, remoteState.purchaseReceipts),
        transferOrders: mergeArrays(local.transferOrders, remoteState.transferOrders),
        inventoryCounts: mergeArrays(local.inventoryCounts, remoteState.inventoryCounts),
        accountsReceivable: mergeArrays(local.accountsReceivable, remoteState.accountsReceivable),
        accountsPayable: mergeArrays(local.accountsPayable, remoteState.accountsPayable),
        cashRegisters: mergeArrays(local.cashRegisters, remoteState.cashRegisters),
        auditLogs: mergeArrays(local.auditLogs, remoteState.auditLogs),
        stockBalances: remoteState.stockBalances || local.stockBalances,
        stockMovements: mergeArrays(local.stockMovements, remoteState.stockMovements),
        paymentMethods: remoteState.paymentMethods || local.paymentMethods,
        financialAccounts: mergeArrays(local.financialAccounts, remoteState.financialAccounts),
        paymentTermsList: mergeArrays(local.paymentTermsList, remoteState.paymentTermsList),
        marketAreas: mergeArrays(local.marketAreas, remoteState.marketAreas),
        states: mergeArrays(local.states, remoteState.states),
        cities: mergeArrays(local.cities, remoteState.cities),
        neighborhoods: mergeArrays(local.neighborhoods, remoteState.neighborhoods),
        printerConfig: remoteState.printerConfig || local.printerConfig,
        sidebarMenuConfig: remoteState.sidebarMenuConfig || local.sidebarMenuConfig,
      };

      this.state = mergedState;
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem(DB_KEY_PREFIX + 'state', JSON.stringify(this.state));
          if (remoteSyncTime) {
            localStorage.setItem(DB_KEY_PREFIX + 'last_remote_sync', remoteSyncTime);
          }
        } catch (e) {
          console.error('Erro ao salvar estado reconciliado:', e);
        }
      }
      this.notify();
      return { merged: true, localUnsyncedChanges: hasLocalUnsynced };
    } catch (e) {
      console.error('Erro na reconciliação de dados com Supabase:', e);
      return { merged: false, localUnsyncedChanges: false };
    }
  }

  public static setCurrentCompany(companyId: string) {
    if (this.state) {
      this.state.currentCompanyId = companyId;
      this.persist();
    }
  }

  public static setCurrentUser(userId: string) {
    if (this.state) {
      this.state.currentUserId = userId;
      this.persist();
    }
  }

  public static getCurrentCompany(): Company {
    const s = this.getState();
    return (
      s.companies.find((c) => c.id === s.currentCompanyId) ||
      s.companies[0] || {
        id: 'comp-matriz',
        name: 'Química & Limpeza Imperial Ltda',
        tradeName: 'Imperial Limpeza',
        cnpjCpf: '12.345.678/0001-90',
        type: 'matriz',
        phone: '(11) 3456-7890',
        email: 'contato@imperiallimpeza.com.br',
        address: {
          street: 'Av. Industrial',
          number: '1250',
          neighborhood: 'Distrito Industrial',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '04500-000',
        },
        status: 'ativo',
      }
    );
  }

  public static getCurrentUser(): User {
    const s = this.getState();
    return s.users.find((u) => u.id === s.currentUserId) || s.users[0];
  }

  public static readonly AUTH_SESSION_KEY = 'omni_erp_auth_active';
  public static readonly AUTH_REMEMBER_LOGIN_KEY = 'omni_erp_remembered_login';

  public static isSessionAuthenticated(): boolean {
    if (typeof window === 'undefined') return true;
    return sessionStorage.getItem(this.AUTH_SESSION_KEY) === 'true';
  }

  public static setSessionAuthenticated(authenticated: boolean, rememberMe: boolean = false) {
    if (typeof window === 'undefined') return;
    if (authenticated) {
      sessionStorage.setItem(this.AUTH_SESSION_KEY, 'true');
      if (rememberMe) {
        localStorage.setItem(this.AUTH_SESSION_KEY, 'true');
      } else {
        localStorage.removeItem(this.AUTH_SESSION_KEY);
      }
    } else {
      sessionStorage.removeItem(this.AUTH_SESSION_KEY);
      localStorage.removeItem(this.AUTH_SESSION_KEY);
    }
  }

  public static authenticate(
    login: string,
    password: string,
    rememberMe: boolean = false
  ): {
    success: boolean;
    user?: User;
    error?: string;
  } {
    const cleanLogin = (login || '').trim().toLowerCase();
    const cleanPass = (password || '').trim();

    if (!cleanLogin) {
      return { success: false, error: 'Por favor, informe o nome de usuário ou login.' };
    }
    if (!cleanPass) {
      return { success: false, error: 'Por favor, informe a senha.' };
    }

    const state = this.getState();
    const user = state.users.find((u) => u.login.toLowerCase() === cleanLogin);

    if (!user) {
      return { success: false, error: 'Usuário não encontrado no sistema.' };
    }

    if (user.status === 'inativo') {
      return { success: false, error: 'Este usuário está inativo. Contate o administrador.' };
    }

    const expectedPassword = user.password || (user.login === 'admin' ? 'admin' : '1234');

    if (cleanPass !== expectedPassword) {
      return { success: false, error: 'Senha incorreta para o usuário informado.' };
    }

    // Define o usuário autenticado e a sessão
    this.setCurrentUser(user.id);
    this.setSessionAuthenticated(true, rememberMe);

    // Salva o login lembrado se solicitado
    if (typeof window !== 'undefined') {
      if (rememberMe) {
        localStorage.setItem(this.AUTH_REMEMBER_LOGIN_KEY, user.login);
      } else {
        localStorage.removeItem(this.AUTH_REMEMBER_LOGIN_KEY);
      }
    }

    this.addAuditLog(
      'LOGIN_EFETUADO',
      'SEGURANCA',
      user.id,
      `Usuário ${user.name} (${user.login}) autenticado com sucesso.`
    );
    return { success: true, user };
  }

  public static changePassword(
    targetUserId: string,
    currentPassword: string,
    newPassword: string,
    requestingUserId: string
  ): { success: boolean; error?: string } {
    const state = this.getState();
    const targetUser = state.users.find((u) => u.id === targetUserId);
    if (!targetUser) {
      return { success: false, error: 'Usuário alvo não encontrado.' };
    }

    const requestingUser = state.users.find((u) => u.id === requestingUserId) || this.getCurrentUser();

    // Regra crítica: "o usuário 'admin', terá a senha padrão 'admin' e poderá ser alterada apenas pelo próprio usuário 'admin'"
    if (targetUser.login === 'admin' || targetUser.id === 'usr-admin') {
      if (requestingUser.login !== 'admin') {
        return {
          success: false,
          error: 'Apenas o próprio usuário "admin" tem autorização para alterar a senha do administrador.',
        };
      }
    }

    const expectedCurrent = targetUser.password || (targetUser.login === 'admin' ? 'admin' : '1234');
    if (currentPassword !== expectedCurrent) {
      return { success: false, error: 'A senha atual informada está incorreta.' };
    }

    const cleanNewPass = (newPassword || '').trim();
    if (!cleanNewPass || cleanNewPass.length < 3) {
      return { success: false, error: 'A nova senha deve possuir no mínimo 3 caracteres.' };
    }

    targetUser.password = cleanNewPass;
    this.persist();

    this.addAuditLog(
      'SENHA_ALTERADA',
      'SEGURANCA',
      targetUser.id,
      `Senha do usuário ${targetUser.name} (${targetUser.login}) alterada com sucesso.`
    );

    return { success: true };
  }

  public static resetPasswordToDefault(
    targetUserId: string,
    requestingUserId: string
  ): { success: boolean; error?: string } {
    const state = this.getState();
    const targetUser = state.users.find((u) => u.id === targetUserId);
    if (!targetUser) {
      return { success: false, error: 'Usuário alvo não encontrado.' };
    }

    const requestingUser = state.users.find((u) => u.id === requestingUserId) || this.getCurrentUser();

    // Regra crítica: se o usuário alvo for o admin, apenas o próprio admin pode redefinir
    if (targetUser.login === 'admin' || targetUser.id === 'usr-admin') {
      if (requestingUser.login !== 'admin') {
        return {
          success: false,
          error: 'Apenas o próprio usuário "admin" tem autorização para alterar ou redefinir a senha do administrador.',
        };
      }
      targetUser.password = 'admin';
    } else {
      targetUser.password = '1234';
    }

    this.persist();
    this.addAuditLog(
      'SENHA_REDEFINIDA_PADRAO',
      'SEGURANCA',
      targetUser.id,
      `Senha do usuário ${targetUser.name} (${targetUser.login}) redefinida para a senha padrão (${targetUser.password}).`
    );

    return { success: true };
  }

  public static logout() {
    const user = this.getCurrentUser();
    if (user) {
      this.addAuditLog('LOGOUT_EFETUADO', 'SEGURANCA', user.id, `Usuário ${user.name} desconectou do sistema.`);
    }
    this.setSessionAuthenticated(false);
    this.notify();
  }

  public static isAdmin(user?: User): boolean {
    const u = user || this.getCurrentUser();
    return u?.login === 'admin';
  }

  public static isBalconista(user?: User): boolean {
    const u = user || this.getCurrentUser();
    return u?.role === 'balconista';
  }

  public static getDefaultModuleForCurrentUser(user?: User): string {
    const u = user || this.getCurrentUser();
    if (u && u.role === 'balconista') {
      return 'pos';
    }
    return 'dashboard';
  }

  public static canCurrentUserView(
    metric: 'grossProfit' | 'netProfit' | 'totalRevenue' | 'profitMargin' | 'productCosts' | 'cashBalances'
  ): boolean {
    const user = this.getCurrentUser();
    if (user.login === 'admin') return true;

    // Regra solicitada: Balconista de PDV não deve ter acesso a números de vendas totais, lucros ou custos da empresa
    if (user.role === 'balconista') {
      return false;
    }

    const perms = user.permissions;
    const role = user.role || 'balconista';
    const finDefaults = DEFAULT_ROLE_FINANCIAL_PERMISSIONS[role] || DEFAULT_ROLE_FINANCIAL_PERMISSIONS.balconista;

    switch (metric) {
      case 'grossProfit':
        return perms.canViewGrossProfit !== undefined ? perms.canViewGrossProfit : finDefaults.canViewGrossProfit;
      case 'netProfit':
        return perms.canViewNetProfit !== undefined ? perms.canViewNetProfit : finDefaults.canViewNetProfit;
      case 'totalRevenue':
        return perms.canViewTotalRevenue !== undefined ? perms.canViewTotalRevenue : finDefaults.canViewTotalRevenue;
      case 'profitMargin':
        return perms.canViewProfitMargin !== undefined ? perms.canViewProfitMargin : finDefaults.canViewProfitMargin;
      case 'productCosts':
        return perms.canViewProductCosts !== undefined ? perms.canViewProductCosts : (perms.canViewCosts ?? finDefaults.canViewProductCosts);
      case 'cashBalances':
        return perms.canViewCashBalances !== undefined ? perms.canViewCashBalances : finDefaults.canViewCashBalances;
      default:
        return false;
    }
  }

  public static isMenuSectionAllowedForCurrentUser(sectionId: string): boolean {
    const user = this.getCurrentUser();
    if (user.login === 'admin') return true;
    if (sectionId === 'configuracoes') return false; // Apenas o admin master

    if (Array.isArray(user.permissions.allowedMenuSections)) {
      return user.permissions.allowedMenuSections.includes(sectionId);
    }
    const role = user.role || 'balconista';
    const roleDefaults = DEFAULT_ROLE_MENU_SECTIONS[role];
    if (roleDefaults) {
      return roleDefaults.includes(sectionId);
    }
    return true;
  }

  public static isSubItemAllowedForCurrentUser(subItemId: string): boolean {
    const user = this.getCurrentUser();
    if (user.login === 'admin') return true;
    if (subItemId === 'settings' || subItemId === 'settings_menus' || subItemId === 'settings_supabase') {
      return false; // Apenas o admin master
    }

    // Regra: Balconista de PDV tem como tela inicial o PDV Balcão e NÃO pode visualizar/acessar o Dashboard com indicadores
    if (subItemId === 'dashboard' && user.role === 'balconista') {
      return false;
    }

    if (Array.isArray(user.permissions.allowedSubItems)) {
      return user.permissions.allowedSubItems.includes(subItemId);
    }
    const role = user.role || 'balconista';
    const roleDefaults = DEFAULT_ROLE_SUB_ITEMS[role];
    if (roleDefaults) {
      return roleDefaults.includes(subItemId);
    }
    return true;
  }

  public static updateUserPermissions(
    targetUserId: string,
    newPermissions: Partial<UserPermissions>,
    requestingUserId: string
  ): { success: boolean; error?: string } {
    const state = this.getState();
    const requestingUser = state.users.find((u) => u.id === requestingUserId) || this.getCurrentUser();
    if (requestingUser.login !== 'admin') {
      return {
        success: false,
        error: 'Apenas o usuário "admin" tem autorização para configurar permissões de menus e números da empresa.',
      };
    }

    const targetUser = state.users.find((u) => u.id === targetUserId);
    if (!targetUser) {
      return { success: false, error: 'Usuário não encontrado.' };
    }

    targetUser.permissions = {
      ...targetUser.permissions,
      ...newPermissions,
    };

    this.addAuditLog(
      'PERMISSOES_CONFIGURADAS',
      'USUARIOS',
      targetUser.id,
      `Permissões de menus e números da empresa atualizadas pelo administrador para o usuário ${targetUser.name} (@${targetUser.login})`
    );

    this.persist();
    return { success: true };
  }

  public static addAuditLog(action: string, module: string, recordId: string, details: string) {
    const user = this.getCurrentUser();
    const company = this.getCurrentCompany();
    const newLog: AuditLog = {
      id: 'LOG-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      companyId: company.id,
      userId: user.id,
      userName: user.name,
      action,
      module,
      recordId,
      details,
      timestamp: new Date().toISOString(),
    };
    this.getState().auditLogs.unshift(newLog);
    this.persist();
  }

  public static getPrinterConfig(): ThermalPrinterConfig {
    const s = this.getState();
    if (!s.printerConfig) {
      s.printerConfig = { ...DEFAULT_PRINTER_CONFIG };
    } else {
      s.printerConfig = { ...DEFAULT_PRINTER_CONFIG, ...s.printerConfig };
    }
    return s.printerConfig;
  }

  public static updatePrinterConfig(config: Partial<ThermalPrinterConfig>): ThermalPrinterConfig {
    const s = this.getState();
    s.printerConfig = {
      ...(s.printerConfig || DEFAULT_PRINTER_CONFIG),
      ...config,
    };
    this.persist();
    return s.printerConfig;
  }

  // ==========================================
  // RECURSO DE COMPONENTES (COMPOSIÇÃO / BOM)
  // Cada Componente tem seu próprio código e
  // associa-se obrigatoriamente a uma Matéria-Prima / Insumo
  // ==========================================
  public static getComponents(): ComponentDefinition[] {
    const s = this.getState();
    if (!s.components || s.components.length === 0) {
      s.components = [...DEFAULT_COMPONENTS];
      this.persist();
    }
    return s.components;
  }

  public static saveComponent(compData: Omit<ComponentDefinition, 'id'> & { id?: string }): ComponentDefinition {
    const s = this.getState();
    if (!s.components) {
      s.components = [...DEFAULT_COMPONENTS];
    }

    const rawMaterial = s.products.find((p) => p.id === compData.rawMaterialId);
    const rawMaterialCode = rawMaterial?.code || compData.rawMaterialCode || '';
    const rawMaterialDescription = rawMaterial?.description || compData.rawMaterialDescription || '';

    let savedComp: ComponentDefinition;
    if (compData.id) {
      const index = s.components.findIndex((c) => c.id === compData.id);
      if (index >= 0) {
        savedComp = {
          ...s.components[index],
          ...compData,
          id: compData.id,
          rawMaterialCode,
          rawMaterialDescription,
        };
        s.components[index] = savedComp;
        this.addAuditLog(
          'EDITAR_COMPONENTE',
          'PRODUCAO',
          savedComp.id,
          `Componente ${savedComp.code} - ${savedComp.name} atualizado (MP Vinculada: ${rawMaterialCode} - ${rawMaterialDescription})`
        );
      } else {
        savedComp = {
          id: compData.id,
          ...compData,
          rawMaterialCode,
          rawMaterialDescription,
          createdAt: new Date().toISOString(),
        };
        s.components.push(savedComp);
        this.addAuditLog(
          'CRIAR_COMPONENTE',
          'PRODUCAO',
          savedComp.id,
          `Componente ${savedComp.code} - ${savedComp.name} cadastrado (MP Vinculada: ${rawMaterialCode} - ${rawMaterialDescription})`
        );
      }
    } else {
      const newId = 'cmp-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
      savedComp = {
        id: newId,
        ...compData,
        rawMaterialCode,
        rawMaterialDescription,
        createdAt: new Date().toISOString(),
      };
      s.components.push(savedComp);
      this.addAuditLog(
        'CRIAR_COMPONENTE',
        'PRODUCAO',
        savedComp.id,
        `Componente ${savedComp.code} - ${savedComp.name} cadastrado com sucesso (MP Vinculada: ${rawMaterialCode} - ${rawMaterialDescription})`
      );
    }

    // ATUALIZAÇÃO AUTOMÁTICA DE TODOS OS PRODUTOS ACABADOS:
    // Caso a matéria-prima ou insumo do componente seja alterada, todos os produtos acabados
    // que possuem este componente em sua composição têm a matéria-prima e custos atualizados automaticamente.
    let affectedProductsCount = 0;
    const affectedProductNames: string[] = [];
    s.products.forEach((prod) => {
      if (prod.composition && Array.isArray(prod.composition)) {
        let wasProductModified = false;
        prod.composition = prod.composition.map((item) => {
          const isTarget =
            item.componentId === savedComp.id ||
            item.componentCode === savedComp.code ||
            (compData.id && item.componentId === compData.id);

          if (isTarget) {
            wasProductModified = true;
            const newUnitCost = rawMaterial ? rawMaterial.costPrice : item.unitCost;
            return {
              ...item,
              componentId: savedComp.id,
              componentCode: savedComp.code,
              componentDescription: savedComp.name,
              rawMaterialId: savedComp.rawMaterialId,
              rawMaterialCode,
              rawMaterialDescription,
              unit: savedComp.unit,
              unitCost: newUnitCost,
              totalCost: Number((newUnitCost * item.quantity).toFixed(4)),
            };
          }
          return item;
        });

        if (wasProductModified) {
          affectedProductsCount++;
          affectedProductNames.push(prod.description);
          // Recalcular o custo de fabricação do produto acabado
          prod.costPrice = Number(
            prod.composition.reduce((sum, ci) => sum + (ci.totalCost || ci.unitCost * ci.quantity), 0).toFixed(2)
          );
        }
      }
    });

    if (affectedProductsCount > 0) {
      this.addAuditLog(
        'ATUALIZAR_PRODUTOS_COMPONENTE',
        'PRODUCAO',
        savedComp.id,
        `${affectedProductsCount} produto(s) acabado(s) (${affectedProductNames.join(', ')}) atualizados automaticamente com a nova MP e custos do componente ${savedComp.code}.`
      );
    }

    this.persist();
    return savedComp;
  }

  public static deleteComponent(id: string): boolean {
    const s = this.getState();
    if (!s.components) return false;
    const target = s.components.find((c) => c.id === id);
    if (!target) return false;

    // Verificar se algum produto ativo utiliza este componente na composição
    const usedInProduct = s.products.find(
      (p) => p.composition && p.composition.some((item) => item.componentId === id || item.componentCode === target.code)
    );
    if (usedInProduct) {
      throw new Error(`Não é possível excluir: o componente ${target.code} está sendo utilizado na ficha do produto "${usedInProduct.description}".`);
    }

    s.components = s.components.filter((c) => c.id !== id);
    this.addAuditLog(
      'EXCLUIR_COMPONENTE',
      'PRODUCAO',
      id,
      `Componente ${target.code} - ${target.name} removido do sistema`
    );
    this.persist();
    return true;
  }

  // ==========================================
  // FORMAS DE PAGAMENTO (CRUD)
  // ==========================================
  public static getPaymentMethods(): PaymentMethodRecord[] {
    const s = this.getState();
    if (!s.paymentMethods || s.paymentMethods.length === 0) {
      s.paymentMethods = [...DEFAULT_PAYMENT_METHODS];
      this.persist();
    }
    return s.paymentMethods;
  }

  public static savePaymentMethod(
    methodData: Omit<PaymentMethodRecord, 'id' | 'createdAt'> & { id?: string }
  ): PaymentMethodRecord {
    const s = this.getState();
    if (!s.paymentMethods) {
      s.paymentMethods = [...DEFAULT_PAYMENT_METHODS];
    }

    let saved: PaymentMethodRecord;
    if (methodData.id) {
      const idx = s.paymentMethods.findIndex((m) => m.id === methodData.id);
      if (idx >= 0) {
        saved = {
          ...s.paymentMethods[idx],
          ...methodData,
          id: methodData.id,
        };
        s.paymentMethods[idx] = saved;
        this.addAuditLog(
          'EDITAR_FORMA_PAGTO',
          'FINANCEIRO',
          saved.id,
          `Forma de Pagamento ${saved.code} - ${saved.name} atualizada`
        );
      } else {
        saved = {
          ...methodData,
          id: methodData.id,
          createdAt: new Date().toISOString(),
        };
        s.paymentMethods.push(saved);
        this.addAuditLog(
          'CRIAR_FORMA_PAGTO',
          'FINANCEIRO',
          saved.id,
          `Forma de Pagamento ${saved.code} - ${saved.name} cadastrada`
        );
      }
    } else {
      saved = {
        ...methodData,
        id: 'pay-' + Date.now(),
        createdAt: new Date().toISOString(),
      };
      s.paymentMethods.push(saved);
      this.addAuditLog(
        'CRIAR_FORMA_PAGTO',
        'FINANCEIRO',
        saved.id,
        `Forma de Pagamento ${saved.code} - ${saved.name} cadastrada`
      );
    }
    this.persist();
    this.notify();
    return saved;
  }

  public static deletePaymentMethod(id: string): boolean {
    const s = this.getState();
    if (!s.paymentMethods) return false;
    const target = s.paymentMethods.find((m) => m.id === id);
    if (!target) return false;

    s.paymentMethods = s.paymentMethods.filter((m) => m.id !== id);
    this.addAuditLog(
      'EXCLUIR_FORMA_PAGTO',
      'FINANCEIRO',
      id,
      `Forma de Pagamento ${target.code} - ${target.name} removida do sistema`
    );
    this.persist();
    this.notify();
    return true;
  }

  // ==========================================
  // CONTAS FINANCEIRAS / BANCÁRIAS (CRUD)
  // ==========================================
  public static getFinancialAccounts(companyId?: string): FinancialAccountRecord[] {
    const s = this.getState();
    if (!s.financialAccounts || s.financialAccounts.length === 0) {
      s.financialAccounts = [...DEFAULT_FINANCIAL_ACCOUNTS];
      this.persist();
    }
    if (companyId) {
      const filtered = s.financialAccounts.filter((a) => !a.companyId || a.companyId === companyId);
      if (filtered.length > 0) return filtered;
    }
    return s.financialAccounts;
  }

  public static getStockLocations(): StockLocation[] {
    const s = this.getState();
    if (!s.stockLocations || s.stockLocations.length === 0) {
      return [];
    }
    return s.stockLocations.filter((l) => l.status === 'ativo');
  }

  public static getBoletoAccounts(companyId?: string): FinancialAccountRecord[] {
    const accounts = this.getFinancialAccounts(companyId);
    const bankAccounts = accounts.filter(
      (a) => a.status === 'ativo' && (a.type !== 'caixa' || Boolean(a.bankName && a.bankName !== 'Caixa Físico Interno'))
    );
    if (bankAccounts.length > 0) return bankAccounts;
    return accounts.filter((a) => a.status === 'ativo');
  }

  public static saveFinancialAccount(
    accData: Omit<FinancialAccountRecord, 'id' | 'createdAt'> & { id?: string }
  ): FinancialAccountRecord {
    const s = this.getState();
    if (!s.financialAccounts) {
      s.financialAccounts = [...DEFAULT_FINANCIAL_ACCOUNTS];
    }

    if (accData.isDefault) {
      s.financialAccounts.forEach((a) => {
        if (!accData.companyId || a.companyId === accData.companyId) {
          a.isDefault = false;
        }
      });
    }

    let saved: FinancialAccountRecord;
    if (accData.id) {
      const idx = s.financialAccounts.findIndex((a) => a.id === accData.id);
      if (idx >= 0) {
        saved = {
          ...s.financialAccounts[idx],
          ...accData,
          id: accData.id,
        };
        s.financialAccounts[idx] = saved;
        this.addAuditLog(
          'EDITAR_CONTA_FINANCEIRA',
          'FINANCEIRO',
          saved.id,
          `Conta Financeira ${saved.code} - ${saved.name} atualizada`
        );
      } else {
        saved = {
          ...accData,
          id: accData.id,
          createdAt: new Date().toISOString(),
        };
        s.financialAccounts.push(saved);
        this.addAuditLog(
          'CRIAR_CONTA_FINANCEIRA',
          'FINANCEIRO',
          saved.id,
          `Conta Financeira ${saved.code} - ${saved.name} cadastrada`
        );
      }
    } else {
      saved = {
        ...accData,
        id: 'acc-' + Date.now(),
        createdAt: new Date().toISOString(),
      };
      s.financialAccounts.push(saved);
      this.addAuditLog(
        'CRIAR_CONTA_FINANCEIRA',
        'FINANCEIRO',
        saved.id,
        `Conta Financeira ${saved.code} - ${saved.name} cadastrada`
      );
    }
    this.persist();
    this.notify();
    return saved;
  }

  public static deleteFinancialAccount(id: string): boolean {
    const s = this.getState();
    if (!s.financialAccounts) return false;
    const target = s.financialAccounts.find((a) => a.id === id);
    if (!target) return false;

    s.financialAccounts = s.financialAccounts.filter((a) => a.id !== id);
    this.addAuditLog(
      'EXCLUIR_CONTA_FINANCEIRA',
      'FINANCEIRO',
      id,
      `Conta Financeira ${target.code} - ${target.name} removida`
    );
    this.persist();
    this.notify();
    return true;
  }

  // ==========================================
  // PRAZOS DE PAGAMENTO (CRUD)
  // ==========================================
  public static getPaymentTermsList(companyId?: string): PaymentTermRecord[] {
    const s = this.getState();
    if (!s.paymentTermsList || s.paymentTermsList.length === 0) {
      s.paymentTermsList = [...DEFAULT_PAYMENT_TERMS];
      this.persist();
    }
    if (companyId) {
      return s.paymentTermsList.filter((t) => !t.companyId || t.companyId === companyId);
    }
    return s.paymentTermsList;
  }

  public static savePaymentTerm(
    termData: Omit<PaymentTermRecord, 'id' | 'createdAt'> & { id?: string }
  ): PaymentTermRecord {
    const s = this.getState();
    if (!s.paymentTermsList) {
      s.paymentTermsList = [...DEFAULT_PAYMENT_TERMS];
    }

    let saved: PaymentTermRecord;
    if (termData.id) {
      const idx = s.paymentTermsList.findIndex((t) => t.id === termData.id);
      if (idx >= 0) {
        saved = {
          ...s.paymentTermsList[idx],
          ...termData,
          id: termData.id,
        };
        s.paymentTermsList[idx] = saved;
        this.addAuditLog(
          'EDITAR_PRAZO_PAGTO',
          'FINANCEIRO',
          saved.id,
          `Prazo de Pagamento ${saved.code} - ${saved.name} atualizado`
        );
      } else {
        saved = {
          ...termData,
          id: termData.id,
          createdAt: new Date().toISOString(),
        };
        s.paymentTermsList.push(saved);
        this.addAuditLog(
          'CRIAR_PRAZO_PAGTO',
          'FINANCEIRO',
          saved.id,
          `Prazo de Pagamento ${saved.code} - ${saved.name} cadastrado`
        );
      }
    } else {
      saved = {
        ...termData,
        id: 'term-' + Date.now(),
        createdAt: new Date().toISOString(),
      };
      s.paymentTermsList.push(saved);
      this.addAuditLog(
        'CRIAR_PRAZO_PAGTO',
        'FINANCEIRO',
        saved.id,
        `Prazo de Pagamento ${saved.code} - ${saved.name} cadastrado`
      );
    }
    this.persist();
    this.notify();
    return saved;
  }

  public static deletePaymentTerm(id: string): boolean {
    const s = this.getState();
    if (!s.paymentTermsList) return false;
    const target = s.paymentTermsList.find((t) => t.id === id);
    if (!target) return false;

    s.paymentTermsList = s.paymentTermsList.filter((t) => t.id !== id);
    this.addAuditLog(
      'EXCLUIR_PRAZO_PAGTO',
      'FINANCEIRO',
      id,
      `Prazo de Pagamento ${target.code} - ${target.name} removido`
    );
    this.persist();
    this.notify();
    return true;
  }


  public static isOverdueAlertHidden(): boolean {
    const s = this.getState();
    if (typeof s.hideOverdueAlert === 'boolean') {
      return s.hideOverdueAlert;
    }
    const stored = localStorage.getItem('gestaofacil_hide_overdue_alert');
    return stored === 'true';
  }

  public static setHideOverdueAlert(hidden: boolean): boolean {
    const s = this.getState();
    s.hideOverdueAlert = hidden;
    localStorage.setItem('gestaofacil_hide_overdue_alert', String(hidden));
    this.persist();
    this.notify();
    return hidden;
  }

  // ==========================================
  // CONFIGURAÇÃO DE CONTROLE DE ESTOQUE POR EMPRESA
  // Permite ativar/desativar controle e vender com saldo negativo
  // ==========================================
  public static getStockControlConfig(): StockControlConfig {
    const s = this.getState();
    if (!s.stockControlConfig) {
      s.stockControlConfig = { ...DEFAULT_STOCK_CONTROL_CONFIG };
      this.persist();
    }
    return {
      enableStockControl: s.stockControlConfig.enableStockControl !== false,
      allowNegativeStock: !!s.stockControlConfig.allowNegativeStock,
    };
  }

  public static updateStockControlConfig(config: Partial<StockControlConfig>): StockControlConfig {
    const s = this.getState();
    const current = this.getStockControlConfig();
    const updated: StockControlConfig = {
      ...current,
      ...config,
    };
    s.stockControlConfig = updated;
    this.addAuditLog(
      'CONFIG_ESTOQUE_ATUALIZADA',
      'ESTOQUE',
      'CONFIG',
      `Parâmetros de estoque: Controle ${updated.enableStockControl ? 'ATIVO' : 'DESATIVADO'}, Venda com estoque negativo ${updated.allowNegativeStock ? 'PERMITIDA' : 'BLOQUEADA'}`
    );
    this.persist();
    this.notify();
    return updated;
  }

  public static isStockControlEnabled(): boolean {
    return this.getStockControlConfig().enableStockControl;
  }

  public static canSellNegativeStock(): boolean {
    const cfg = this.getStockControlConfig();
    return !cfg.enableStockControl || cfg.allowNegativeStock;
  }

  public static getStockLocations(companyId?: string): StockLocation[] {
    const s = this.getState();
    const locs = s.stockLocations || [];
    if (!companyId) return locs;
    return locs.filter((l) => l.companyId === companyId);
  }

  public static getStockBalances(companyId?: string): ProductStockBalance[] {
    const s = this.getState();
    const balances = s.stockBalances || [];
    if (!companyId) return balances;
    const companyLocIds = new Set(
      (s.stockLocations || []).filter((l) => l.companyId === companyId).map((l) => l.id)
    );
    return balances.filter((b) => companyLocIds.has(b.locationId) || b.companyId === companyId);
  }

  public static getSidebarMenuConfig(): SidebarMenuConfig {
    const s = this.getState();
    if (s.sidebarMenuConfig && Array.isArray(s.sidebarMenuConfig.hiddenSections)) {
      return s.sidebarMenuConfig;
    }
    try {
      const stored = localStorage.getItem('gestaofacil_sidebar_menu_config');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && Array.isArray(parsed.hiddenSections)) {
          s.sidebarMenuConfig = parsed;
          return parsed;
        }
      }
    } catch (e) {
      // ignore
    }
    return { hiddenSections: [], hiddenSubItems: [] };
  }

  public static setSidebarMenuConfig(config: SidebarMenuConfig): void {
    const s = this.getState();
    s.sidebarMenuConfig = config;
    try {
      localStorage.setItem('gestaofacil_sidebar_menu_config', JSON.stringify(config));
    } catch (e) {
      // ignore
    }
    this.persist();
    this.notify();
  }

  public static resetSidebarMenuConfig(): void {
    const s = this.getState();
    s.sidebarMenuConfig = { hiddenSections: [], hiddenSubItems: [] };
    try {
      localStorage.removeItem('gestaofacil_sidebar_menu_config');
    } catch (e) {
      // ignore
    }
    this.persist();
    this.notify();
  }

  // ==========================================
  // EXPEDIÇÃO, ROTAS & ROMANEIOS DE ENTREGA
  // ==========================================

  public static getDeliveryRoutes(companyId?: string): DeliveryRoute[] {
    const s = this.getState();
    const list = s.deliveryRoutes || DEFAULT_DELIVERY_ROUTES;
    if (!companyId) return list;
    return list.filter((r) => r.companyId === companyId);
  }

  public static saveDeliveryRoute(routeData: Omit<DeliveryRoute, 'id'> & { id?: string }): DeliveryRoute {
    const s = this.getState();
    if (!s.deliveryRoutes) s.deliveryRoutes = [...DEFAULT_DELIVERY_ROUTES];

    const currentCompany = this.getCurrentCompany();
    const nowIso = new Date().toISOString();

    if (routeData.id) {
      const idx = s.deliveryRoutes.findIndex((r) => r.id === routeData.id);
      if (idx >= 0) {
        const updated: DeliveryRoute = {
          ...s.deliveryRoutes[idx],
          ...routeData,
          id: routeData.id,
          updatedAt: nowIso,
        };
        s.deliveryRoutes[idx] = updated;
        this.addAuditLog('ATUALIZAR_ROTA', 'EXPEDICAO', updated.id, `Rota ${updated.name} atualizada`);
        this.persist();
        return updated;
      }
    }

    const newRoute: DeliveryRoute = {
      id: routeData.id || `rot-${Date.now().toString(36)}`,
      companyId: routeData.companyId || currentCompany.id,
      code: routeData.code || `ROT-${(s.deliveryRoutes.length + 1).toString().padStart(2, '0')}`,
      name: routeData.name,
      description: routeData.description || '',
      active: routeData.active !== undefined ? routeData.active : true,
      color: routeData.color || 'blue',
      cities: routeData.cities || [],
      neighborhoods: routeData.neighborhoods || [],
      marketAreas: routeData.marketAreas || [],
      sellerNames: routeData.sellerNames || [],
      estimatedDeliveryWindow: routeData.estimatedDeliveryWindow || 'Dia Todo',
      vehicleTypeRecommendation: routeData.vehicleTypeRecommendation || '',
      notes: routeData.notes || '',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    s.deliveryRoutes.unshift(newRoute);
    this.addAuditLog('CRIAR_ROTA', 'EXPEDICAO', newRoute.id, `Rota ${newRoute.name} criada`);
    this.persist();
    return newRoute;
  }

  public static deleteDeliveryRoute(id: string): boolean {
    const s = this.getState();
    if (!s.deliveryRoutes) return false;
    const exists = s.deliveryRoutes.find((r) => r.id === id);
    if (!exists) return false;
    s.deliveryRoutes = s.deliveryRoutes.filter((r) => r.id !== id);
    this.addAuditLog('EXCLUIR_ROTA', 'EXPEDICAO', id, `Rota ${exists.name} excluída`);
    this.persist();
    return true;
  }

  public static getDeliveryManifests(companyId?: string): DeliveryManifest[] {
    const s = this.getState();
    const list = s.deliveryManifests || DEFAULT_DELIVERY_MANIFESTS;
    if (!companyId) return list;
    return list.filter((m) => m.companyId === companyId);
  }

  public static saveDeliveryManifest(manifestData: Omit<DeliveryManifest, 'id'> & { id?: string }): DeliveryManifest {
    const s = this.getState();
    if (!s.deliveryManifests) s.deliveryManifests = [...DEFAULT_DELIVERY_MANIFESTS];

    const currentCompany = this.getCurrentCompany();
    const nowIso = new Date().toISOString();

    const totalOrders = manifestData.orders.length;
    const totalDelivered = manifestData.orders.filter((o) => o.deliveryStatus === 'entregue').length;
    const totalPending = manifestData.orders.filter((o) => o.deliveryStatus === 'pendente').length;
    const totalValue = manifestData.orders.reduce((acc, o) => acc + (o.totalValue || 0), 0);
    const totalAmountToCollect = manifestData.orders
      .filter((o) => o.paymentStatus === 'cobrar_na_entrega')
      .reduce((acc, o) => acc + (o.amountToCollect || o.totalValue || 0), 0);
    const totalVolumes = manifestData.orders.reduce((acc, o) => acc + (o.volumesCount || 1), 0);

    if (manifestData.id) {
      const idx = s.deliveryManifests.findIndex((m) => m.id === manifestData.id);
      if (idx >= 0) {
        const updated: DeliveryManifest = {
          ...s.deliveryManifests[idx],
          ...manifestData,
          id: manifestData.id,
          totalOrders,
          totalDelivered,
          totalPending,
          totalValue,
          totalAmountToCollect,
          totalVolumes,
          updatedAt: nowIso,
        };
        s.deliveryManifests[idx] = updated;
        this.addAuditLog('ATUALIZAR_ROMANEIO', 'EXPEDICAO', updated.id, `Romaneio ${updated.number} atualizado`);
        this.persist();
        return updated;
      }
    }

    const nextNum = (s.deliveryManifests.length + 1).toString().padStart(4, '0');
    const newManifest: DeliveryManifest = {
      id: manifestData.id || `rom-${Date.now().toString(36)}`,
      number: manifestData.number || `ROM-2026-${nextNum}`,
      companyId: manifestData.companyId || currentCompany.id,
      date: manifestData.date || nowIso,
      departureDate: manifestData.departureDate || nowIso.split('T')[0],
      routeId: manifestData.routeId,
      routeName: manifestData.routeName,
      driverName: manifestData.driverName,
      driverPhone: manifestData.driverPhone,
      vehiclePlate: manifestData.vehiclePlate,
      vehicleModel: manifestData.vehicleModel,
      status: manifestData.status || 'planejado',
      notes: manifestData.notes,
      orders: manifestData.orders,
      totalOrders,
      totalDelivered,
      totalPending,
      totalValue,
      totalAmountToCollect,
      totalVolumes,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    s.deliveryManifests.unshift(newManifest);
    this.addAuditLog('CRIAR_ROMANEIO', 'EXPEDICAO', newManifest.id, `Romaneio ${newManifest.number} criado com ${totalOrders} pedidos`);
    this.persist();
    return newManifest;
  }

  public static deleteDeliveryManifest(id: string): boolean {
    const s = this.getState();
    if (!s.deliveryManifests) return false;
    const exists = s.deliveryManifests.find((m) => m.id === id);
    if (!exists) return false;
    s.deliveryManifests = s.deliveryManifests.filter((m) => m.id !== id);
    this.addAuditLog('EXCLUIR_ROMANEIO', 'EXPEDICAO', id, `Romaneio ${exists.number} excluído`);
    this.persist();
    return true;
  }

  public static updateDeliveryManifestStatus(manifestId: string, status: DeliveryManifest['status']): void {
    const s = this.getState();
    if (!s.deliveryManifests) return;
    const man = s.deliveryManifests.find((m) => m.id === manifestId);
    if (!man) return;
    man.status = status;
    man.updatedAt = new Date().toISOString();
    if (status === 'entregue') {
      man.completedAt = new Date().toISOString();
    }
    this.addAuditLog('STATUS_ROMANEIO', 'EXPEDICAO', manifestId, `Status do romaneio ${man.number} alterado para ${status}`);
    this.persist();
  }

  public static updateDeliveryOrderStatus(
    manifestId: string,
    orderId: string,
    status: 'entregue' | 'nao_entregue',
    notes?: string,
    failureReason?: string
  ): void {
    const s = this.getState();
    if (!s.deliveryManifests) return;
    const man = s.deliveryManifests.find((m) => m.id === manifestId);
    if (!man) return;
    const ord = man.orders.find((o) => o.orderId === orderId);
    if (!ord) return;

    ord.deliveryStatus = status;
    if (status === 'entregue') {
      ord.deliveredAt = new Date().toISOString();
      ord.deliveryFailureReason = undefined;
    } else {
      ord.deliveryFailureReason = failureReason || 'Ocorrência na entrega';
    }
    if (notes) ord.deliveryNotes = notes;

    man.totalDelivered = man.orders.filter((o) => o.deliveryStatus === 'entregue').length;
    man.totalPending = man.orders.filter((o) => o.deliveryStatus === 'pendente').length;
    man.updatedAt = new Date().toISOString();

    if (man.totalPending === 0 && man.orders.length > 0) {
      man.status = 'entregue';
      man.completedAt = new Date().toISOString();
    }

    this.addAuditLog('BAIXA_ENTREGA', 'EXPEDICAO', orderId, `Pedido ${ord.orderNumber} marcado como ${status} no romaneio ${man.number}`);
    this.persist();
  }

  public static batchAssignRouteToCustomers(routeId: string, routeName: string, customerIds: string[]): number {
    const s = this.getState();
    let updatedCount = 0;
    s.customers = s.customers.map((c) => {
      if (customerIds.includes(c.id)) {
        updatedCount++;
        return {
          ...c,
          deliveryRouteId: routeId,
          deliveryRouteName: routeName,
          updatedAt: new Date().toISOString(),
        };
      }
      return c;
    });

    if (updatedCount > 0) {
      this.addAuditLog(
        'ASSOCIAR_ROTA_LOTE',
        'EXPEDICAO',
        routeId,
        `${updatedCount} clientes vinculados à rota ${routeName}`
      );
      this.persist();
    }
    return updatedCount;
  }

  public static batchAssignRouteByFilters(
    routeId: string,
    routeName: string,
    filters: { city?: string; neighborhood?: string; marketArea?: string; sellerName?: string }
  ): number {
    const s = this.getState();
    let updatedCount = 0;

    s.customers = s.customers.map((c) => {
      let matches = false;

      if (filters.city && c.city && c.city.toLowerCase() === filters.city.toLowerCase()) {
        matches = true;
      }
      if (filters.neighborhood && c.neighborhood && c.neighborhood.toLowerCase() === filters.neighborhood.toLowerCase()) {
        matches = true;
      }
      if (filters.marketArea && c.marketArea && c.marketArea.toLowerCase() === filters.marketArea.toLowerCase()) {
        matches = true;
      }
      if (filters.sellerName && c.sellerName && c.sellerName.toLowerCase() === filters.sellerName.toLowerCase()) {
        matches = true;
      }

      if (matches) {
        updatedCount++;
        return {
          ...c,
          deliveryRouteId: routeId,
          deliveryRouteName: routeName,
          updatedAt: new Date().toISOString(),
        };
      }
      return c;
    });

    if (updatedCount > 0) {
      this.addAuditLog(
        'ASSOCIAR_ROTA_CRITERIO',
        'EXPEDICAO',
        routeId,
        `${updatedCount} clientes associados à rota ${routeName} por critério regional`
      );
      this.persist();
    }
    return updatedCount;
  }

  // ==========================================
  // GESTÃO DE LOCALIDADES (PRAÇAS, BAIRROS, CIDADES, ESTADOS)
  // ==========================================

  public static getStates(): StateItem[] {
    const s = this.getState();
    return s.states || DEFAULT_STATES;
  }

  public static saveStateItem(stateData: Partial<StateItem> & { uf: string; name: string }): StateItem {
    const s = this.getState();
    if (!s.states) s.states = [...DEFAULT_STATES];

    const cleanUf = stateData.uf.trim().toUpperCase();
    const existingIdx = s.states.findIndex((st) => st.uf === cleanUf || st.id === stateData.id);

    if (existingIdx >= 0) {
      const updated: StateItem = {
        ...s.states[existingIdx],
        ...stateData,
        uf: cleanUf,
      };
      s.states[existingIdx] = updated;
      this.persist();
      return updated;
    }

    const newItem: StateItem = {
      id: stateData.id || `uf-${cleanUf.toLowerCase()}`,
      uf: cleanUf,
      name: stateData.name.trim(),
      region: stateData.region || 'Sudeste',
      active: stateData.active !== undefined ? stateData.active : true,
      createdAt: new Date().toISOString(),
    };
    s.states.push(newItem);
    this.persist();
    return newItem;
  }

  public static getMarketAreas(): MarketAreaItem[] {
    const s = this.getState();
    return s.marketAreas || DEFAULT_MARKET_AREAS;
  }

  public static saveMarketArea(data: Partial<MarketAreaItem> & { name: string }): MarketAreaItem {
    const s = this.getState();
    if (!s.marketAreas) s.marketAreas = [...DEFAULT_MARKET_AREAS];
    const nowIso = new Date().toISOString();

    if (data.id) {
      const idx = s.marketAreas.findIndex((m) => m.id === data.id);
      if (idx >= 0) {
        const updated: MarketAreaItem = {
          ...s.marketAreas[idx],
          ...data,
          name: data.name.trim(),
          updatedAt: nowIso,
        };
        s.marketAreas[idx] = updated;
        this.addAuditLog('ATUALIZAR_PRACA', 'EXPEDICAO', updated.id, `Praça ${updated.name} atualizada`);
        this.persist();
        return updated;
      }
    }

    const newItem: MarketAreaItem = {
      id: data.id || `pra-${Date.now().toString(36)}`,
      name: data.name.trim(),
      description: data.description || '',
      defaultRouteId: data.defaultRouteId || '',
      defaultRouteName: data.defaultRouteName || '',
      cities: data.cities || [],
      active: data.active !== undefined ? data.active : true,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    s.marketAreas.unshift(newItem);
    this.addAuditLog('CRIAR_PRACA', 'EXPEDICAO', newItem.id, `Praça ${newItem.name} cadastrada`);
    this.persist();
    return newItem;
  }

  public static deleteMarketArea(id: string): boolean {
    const s = this.getState();
    if (!s.marketAreas) return false;
    const exists = s.marketAreas.find((m) => m.id === id);
    if (!exists) return false;
    s.marketAreas = s.marketAreas.filter((m) => m.id !== id);
    this.addAuditLog('EXCLUIR_PRACA', 'EXPEDICAO', id, `Praça ${exists.name} excluída`);
    this.persist();
    return true;
  }

  public static getCities(): CityItem[] {
    const s = this.getState();
    return s.cities || DEFAULT_CITIES;
  }

  public static saveCity(data: Partial<CityItem> & { name: string; stateUf: string }): CityItem {
    const s = this.getState();
    if (!s.cities) s.cities = [...DEFAULT_CITIES];
    const nowIso = new Date().toISOString();

    if (data.id) {
      const idx = s.cities.findIndex((c) => c.id === data.id);
      if (idx >= 0) {
        const updated: CityItem = {
          ...s.cities[idx],
          ...data,
          name: data.name.trim(),
          stateUf: data.stateUf.trim().toUpperCase(),
          updatedAt: nowIso,
        };
        s.cities[idx] = updated;
        this.addAuditLog('ATUALIZAR_CIDADE', 'EXPEDICAO', updated.id, `Cidade ${updated.name}/${updated.stateUf} atualizada`);
        this.persist();
        return updated;
      }
    }

    const newItem: CityItem = {
      id: data.id || `cid-${Date.now().toString(36)}`,
      name: data.name.trim(),
      stateUf: data.stateUf.trim().toUpperCase(),
      marketAreaId: data.marketAreaId || '',
      marketAreaName: data.marketAreaName || '',
      defaultRouteId: data.defaultRouteId || '',
      defaultRouteName: data.defaultRouteName || '',
      ibgeCode: data.ibgeCode || '',
      active: data.active !== undefined ? data.active : true,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    s.cities.unshift(newItem);
    this.addAuditLog('CRIAR_CIDADE', 'EXPEDICAO', newItem.id, `Cidade ${newItem.name}/${newItem.stateUf} cadastrada`);
    this.persist();
    return newItem;
  }

  public static deleteCity(id: string): boolean {
    const s = this.getState();
    if (!s.cities) return false;
    const exists = s.cities.find((c) => c.id === id);
    if (!exists) return false;
    s.cities = s.cities.filter((c) => c.id !== id);
    this.addAuditLog('EXCLUIR_CIDADE', 'EXPEDICAO', id, `Cidade ${exists.name} excluída`);
    this.persist();
    return true;
  }

  public static getNeighborhoods(): NeighborhoodItem[] {
    const s = this.getState();
    return s.neighborhoods || DEFAULT_NEIGHBORHOODS;
  }

  public static saveNeighborhood(data: Partial<NeighborhoodItem> & { name: string; cityName: string; stateUf: string }): NeighborhoodItem {
    const s = this.getState();
    if (!s.neighborhoods) s.neighborhoods = [...DEFAULT_NEIGHBORHOODS];
    const nowIso = new Date().toISOString();

    if (data.id) {
      const idx = s.neighborhoods.findIndex((n) => n.id === data.id);
      if (idx >= 0) {
        const updated: NeighborhoodItem = {
          ...s.neighborhoods[idx],
          ...data,
          name: data.name.trim(),
          cityName: data.cityName.trim(),
          stateUf: data.stateUf.trim().toUpperCase(),
          updatedAt: nowIso,
        };
        s.neighborhoods[idx] = updated;
        this.addAuditLog('ATUALIZAR_BAIRRO', 'EXPEDICAO', updated.id, `Bairro ${updated.name} atualizado`);
        this.persist();
        return updated;
      }
    }

    const newItem: NeighborhoodItem = {
      id: data.id || `bai-${Date.now().toString(36)}`,
      name: data.name.trim(),
      cityName: data.cityName.trim(),
      stateUf: data.stateUf.trim().toUpperCase(),
      marketAreaId: data.marketAreaId || '',
      marketAreaName: data.marketAreaName || '',
      defaultRouteId: data.defaultRouteId || '',
      defaultRouteName: data.defaultRouteName || '',
      zipCodePrefix: data.zipCodePrefix || '',
      active: data.active !== undefined ? data.active : true,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    s.neighborhoods.unshift(newItem);
    this.addAuditLog('CRIAR_BAIRRO', 'EXPEDICAO', newItem.id, `Bairro ${newItem.name} cadastrado`);
    this.persist();
    return newItem;
  }

  public static deleteNeighborhood(id: string): boolean {
    const s = this.getState();
    if (!s.neighborhoods) return false;
    const exists = s.neighborhoods.find((n) => n.id === id);
    if (!exists) return false;
    s.neighborhoods = s.neighborhoods.filter((n) => n.id !== id);
    this.addAuditLog('EXCLUIR_BAIRRO', 'EXPEDICAO', id, `Bairro ${exists.name} excluído`);
    this.persist();
    return true;
  }

  // ==========================================
  // DADOS INICIAIS REALISTAS E COMPLETOS (SEED)
  // ==========================================
  private static getSeedData(): DatabaseState {
    const companyMatrizId = 'comp-matriz';
    const companyFilialId = 'comp-filial';

    const companies: Company[] = [
      {
        id: companyMatrizId,
        name: 'Química & Limpeza Imperial Ltda',
        tradeName: 'Imperial Limpeza - Matriz SP',
        cnpjCpf: '12.345.678/0001-90',
        type: 'matriz',
        phone: '(11) 3456-7890',
        email: 'contato@imperiallimpeza.com.br',
        address: {
          street: 'Av. das Indústrias',
          number: '1500',
          neighborhood: 'Parque Novo Mundo',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '02187-010',
        },
        status: 'ativo',
      },
      {
        id: companyFilialId,
        name: 'Química & Limpeza Imperial - Filial Sul Ltda',
        tradeName: 'Imperial Limpeza - Filial Curitiba',
        cnpjCpf: '12.345.678/0002-71',
        type: 'filial',
        phone: '(41) 3344-5566',
        email: 'curitiba@imperiallimpeza.com.br',
        address: {
          street: 'Rua das Araucárias',
          number: '820',
          neighborhood: 'CIC',
          city: 'Curitiba',
          state: 'PR',
          zipCode: '81000-000',
        },
        status: 'ativo',
      },
    ];

    const users: User[] = [
      {
        id: 'usr-admin',
        name: 'Romeu Júnior',
        login: 'admin',
        password: 'admin',
        role: 'admin',
        companyId: companyMatrizId,
        status: 'ativo',
        email: 'romeujr.suporte@gmail.com',
        phone: '(11) 98888-0001',
        permissions: {
          canViewCosts: true,
          canEditProducts: true,
          canDeleteRecords: true,
          canCancelSales: true,
          canAuthorizeDiscount: true,
          maxDiscountPercent: 30,
          canAccessFinancial: true,
          canAccessProduction: true,
          canAccessPurchases: true,
          canManageUsers: true,
          canAdjustStock: true,
          canCloseCashRegister: true,
        },
      },
      {
        id: 'usr-gerente',
        name: 'Carlos Eduardo Mendes',
        login: 'gerente',
        password: '1234',
        role: 'gerente',
        companyId: companyMatrizId,
        status: 'ativo',
        email: 'carlos.gerencia@imperiallimpeza.com.br',
        phone: '(11) 98888-0002',
        permissions: {
          canViewCosts: true,
          canEditProducts: true,
          canDeleteRecords: false,
          canCancelSales: true,
          canAuthorizeDiscount: true,
          maxDiscountPercent: 20,
          canAccessFinancial: true,
          canAccessProduction: true,
          canAccessPurchases: true,
          canManageUsers: false,
          canAdjustStock: true,
          canCloseCashRegister: true,
        },
      },
      {
        id: 'usr-balconista',
        name: 'Mariana Souza',
        login: 'balcao',
        password: '1234',
        role: 'balconista',
        companyId: companyMatrizId,
        status: 'ativo',
        email: 'mariana.balcao@imperiallimpeza.com.br',
        phone: '(11) 98888-0003',
        permissions: {
          canViewCosts: false,
          canEditProducts: false,
          canDeleteRecords: false,
          canCancelSales: false,
          canAuthorizeDiscount: false,
          maxDiscountPercent: 5,
          canAccessFinancial: false,
          canAccessProduction: false,
          canAccessPurchases: false,
          canManageUsers: false,
          canAdjustStock: false,
          canCloseCashRegister: true,
        },
      },
      {
        id: 'usr-vendedor-externo',
        name: 'Bruno Lima',
        login: 'externo',
        password: '1234',
        role: 'vendedor_externo',
        companyId: companyMatrizId,
        status: 'ativo',
        email: 'bruno.vendas@imperiallimpeza.com.br',
        phone: '(11) 98888-0004',
        permissions: {
          canViewCosts: false,
          canEditProducts: false,
          canDeleteRecords: false,
          canCancelSales: false,
          canAuthorizeDiscount: false,
          maxDiscountPercent: 10,
          canAccessFinancial: false,
          canAccessProduction: false,
          canAccessPurchases: false,
          canManageUsers: false,
          canAdjustStock: false,
          canCloseCashRegister: false,
        },
      },
      {
        id: 'usr-financeiro',
        name: 'Patrícia Alves',
        login: 'financeiro',
        password: '1234',
        role: 'financeiro',
        companyId: companyMatrizId,
        status: 'ativo',
        email: 'patricia.fin@imperiallimpeza.com.br',
        phone: '(11) 98888-0005',
        permissions: {
          canViewCosts: true,
          canEditProducts: false,
          canDeleteRecords: false,
          canCancelSales: true,
          canAuthorizeDiscount: true,
          maxDiscountPercent: 15,
          canAccessFinancial: true,
          canAccessProduction: false,
          canAccessPurchases: true,
          canManageUsers: false,
          canAdjustStock: false,
          canCloseCashRegister: true,
        },
      },
    ];

    const stockLocations: StockLocation[] = [
      {
        id: 'loc-mp',
        code: 'MP-01',
        name: 'Matéria-Prima',
        companyId: companyMatrizId,
        description: 'Armazenamento de essências, bases químicas, corantes e insumos brutos',
        type: 'materia_prima',
        status: 'ativo',
      },
      {
        id: 'loc-comercial',
        code: 'COM-01',
        name: 'Comercial',
        companyId: companyMatrizId,
        description: 'Estoque Comercial unificado para vendas (balcão, externas e pedidos)',
        type: 'comercial',
        status: 'ativo',
      },
      {
        id: 'loc-almoxarifado',
        code: 'ALM-01',
        name: 'Almoxarifado & Insumos',
        companyId: companyMatrizId,
        description: 'Ferramentas, EPIs, caixas de papelão e materiais de consumo',
        type: 'almoxarifado',
        status: 'ativo',
      },
      {
        id: 'loc-embalagens',
        code: 'EMB-01',
        name: 'Embalagens & Frascos',
        companyId: companyMatrizId,
        description: 'Frascos PET 500ml, galões 5L, tampas e rótulos adesivos',
        type: 'embalagens',
        status: 'ativo',
      },
    ];

    // Produtos: Matérias-Primas, Embalagens, Produtos Fabricados e Revenda
    const products: Product[] = [
      // 1. Matérias-Primas (Componentes)
      {
        id: 'prod-comp-base',
        code: 'MP-101',
        description: 'Base Detergente Tensoativa Concentrada',
        unit: 'L',
        costPrice: 4.80,
        salePrice: 0,
        family: 'Matéria-Prima',
        group: 'Bases Tensoativas',
        barcode: '7890001001015',
        minStock: 50,
        productType: 'componente',
        hasComposition: false,
        defaultLocationId: 'loc-mp',
        status: 'ativo',
        notes: 'Insumo químico para diluição e preparo de detergente e sabão líquido',
      },
      {
        id: 'prod-comp-essencia-lavanda',
        code: 'MP-102',
        description: 'Essência Concentrada Lavanda Francesa',
        unit: 'L',
        costPrice: 65.00,
        salePrice: 0,
        family: 'Matéria-Prima',
        group: 'Essências',
        barcode: '7890001001022',
        minStock: 5,
        productType: 'componente',
        hasComposition: false,
        defaultLocationId: 'loc-mp',
        status: 'ativo',
        notes: 'Fragrância para desinfetantes e limpadores perfumados',
      },
      {
        id: 'prod-comp-corante-azul',
        code: 'MP-103',
        description: 'Corante Líquido Azul Anil Industrial',
        unit: 'L',
        costPrice: 28.00,
        salePrice: 0,
        family: 'Matéria-Prima',
        group: 'Corantes',
        barcode: '7890001001039',
        minStock: 2,
        productType: 'componente',
        hasComposition: false,
        defaultLocationId: 'loc-mp',
        status: 'ativo',
        notes: 'Alto rendimento: 1ml para cada 20 litros',
      },
      // 2. Embalagens (Componentes)
      {
        id: 'prod-emb-frasco-500',
        code: 'EMB-201',
        description: 'Frasco PET 500ml Transparente',
        unit: 'UN',
        costPrice: 0.65,
        salePrice: 0,
        family: 'Embalagens',
        group: 'Frascos PET',
        barcode: '7890001002012',
        minStock: 200,
        productType: 'componente',
        hasComposition: false,
        defaultLocationId: 'loc-embalagens',
        status: 'ativo',
        notes: 'Frasco padrão para detergente de pratos',
      },
      {
        id: 'prod-emb-tampa-flip',
        code: 'EMB-202',
        description: 'Tampa Flip-Top Rosca 28mm Vermelha',
        unit: 'UN',
        costPrice: 0.22,
        salePrice: 0,
        family: 'Embalagens',
        group: 'Tampas',
        barcode: '7890001002029',
        minStock: 200,
        productType: 'componente',
        hasComposition: false,
        defaultLocationId: 'loc-embalagens',
        status: 'ativo',
        notes: 'Tampa dosadora com lacre',
      },
      {
        id: 'prod-emb-galao-5l',
        code: 'EMB-203',
        description: 'Galão PEAD 5L Branco com Tampa e Lacre',
        unit: 'UN',
        costPrice: 3.50,
        salePrice: 0,
        family: 'Embalagens',
        group: 'Galões',
        barcode: '7890001002036',
        minStock: 40,
        productType: 'componente',
        hasComposition: false,
        defaultLocationId: 'loc-embalagens',
        status: 'ativo',
        notes: 'Para embalar desinfetante profissional de 5L',
      },
      // 3. Produtos Prontos de Fabricação Própria (com composição)
      {
        id: 'prod-detergente-500',
        code: 'PA-301',
        description: 'Detergente Líquido Neutro Imperial 500ml',
        unit: 'UN',
        costPrice: 1.84, // Custo calculado da composição (0.15L * 4.80 = 0.72 + 0.005L * 28 = 0.14 + 0.11 essência + 0.65 frasco + 0.22 tampa = 1.84)
        salePrice: 3.99,
        family: 'Produtos Próprios',
        group: 'Detergentes',
        barcode: '7891112223011',
        minStock: 60,
        productType: 'revenda',
        hasComposition: true,
        composition: [
          {
            componentId: 'prod-comp-base',
            componentCode: 'MP-101',
            componentDescription: 'Base Detergente Tensoativa Concentrada',
            unit: 'L',
            quantity: 0.15,
            unitCost: 4.80,
            totalCost: 0.72,
          },
          {
            componentId: 'prod-comp-corante-azul',
            componentCode: 'MP-103',
            componentDescription: 'Corante Líquido Azul Anil Industrial',
            unit: 'L',
            quantity: 0.005,
            unitCost: 28.00,
            totalCost: 0.14,
          },
          {
            componentId: 'prod-emb-frasco-500',
            componentCode: 'EMB-201',
            componentDescription: 'Frasco PET 500ml Transparente',
            unit: 'UN',
            quantity: 1,
            unitCost: 0.65,
            totalCost: 0.65,
          },
          {
            componentId: 'prod-emb-tampa-flip',
            componentCode: 'EMB-202',
            componentDescription: 'Tampa Flip-Top Rosca 28mm Vermelha',
            unit: 'UN',
            quantity: 1,
            unitCost: 0.22,
            totalCost: 0.22,
          },
          {
            componentId: 'prod-comp-essencia-lavanda',
            componentCode: 'MP-102',
            componentDescription: 'Essência Concentrada Lavanda Francesa',
            unit: 'L',
            quantity: 0.0017,
            unitCost: 65.00,
            totalCost: 0.11,
          },
        ],
        defaultLocationId: 'loc-comercial',
        status: 'ativo',
        taxPercent: 6.0,
        operatingExpensesPercent: 12.0,
        salesCommissionPercent: 3.0,
        otherCostsPercent: 2.0,
        profitMarginPercent: 25.0,
        notes: 'Nosso produto carro-chefe de fabricação própria',
      },
      {
        id: 'prod-desinfetante-5l',
        code: 'PA-302',
        description: 'Desinfetante Floral Imperial Profissional 5L',
        unit: 'UN',
        costPrice: 9.85,
        salePrice: 22.90,
        family: 'Produtos Próprios',
        group: 'Desinfetantes',
        barcode: '7891112223028',
        minStock: 25,
        productType: 'revenda',
        hasComposition: true,
        composition: [
          {
            componentId: 'prod-comp-base',
            componentCode: 'MP-101',
            componentDescription: 'Base Detergente Tensoativa Concentrada',
            unit: 'L',
            quantity: 0.6,
            unitCost: 4.80,
            totalCost: 2.88,
          },
          {
            componentId: 'prod-comp-essencia-lavanda',
            componentCode: 'MP-102',
            componentDescription: 'Essência Concentrada Lavanda Francesa',
            unit: 'L',
            quantity: 0.05,
            unitCost: 65.00,
            totalCost: 3.25,
          },
          {
            componentId: 'prod-comp-corante-azul',
            componentCode: 'MP-103',
            componentDescription: 'Corante Líquido Azul Anil Industrial',
            unit: 'L',
            quantity: 0.008,
            unitCost: 28.00,
            totalCost: 0.22,
          },
          {
            componentId: 'prod-emb-galao-5l',
            componentCode: 'EMB-203',
            componentDescription: 'Galão PEAD 5L Branco com Tampa e Lacre',
            unit: 'UN',
            quantity: 1,
            unitCost: 3.50,
            totalCost: 3.50,
          },
        ],
        defaultLocationId: 'loc-comercial',
        status: 'ativo',
        taxPercent: 6.0,
        operatingExpensesPercent: 12.0,
        salesCommissionPercent: 4.0,
        otherCostsPercent: 2.0,
        profitMarginPercent: 28.0,
        notes: 'Galão para condomínios, clínicas e comércios',
      },
      // 4. Produtos de Revenda Direta
      {
        id: 'prod-vassoura-piacava',
        code: 'REV-401',
        description: 'Vassoura Piaçava Master com Cabo Madeira 1,20m',
        unit: 'UN',
        costPrice: 8.50,
        salePrice: 17.50,
        family: 'Revenda',
        group: 'Vassouras e Rodos',
        barcode: '7892223334015',
        minStock: 15,
        productType: 'revenda',
        hasComposition: false,
        defaultLocationId: 'loc-comercial',
        status: 'ativo',
        taxPercent: 6.0,
        operatingExpensesPercent: 10.0,
        salesCommissionPercent: 3.0,
        otherCostsPercent: 1.0,
        profitMarginPercent: 25.0,
        notes: 'Revenda de acessórios para limpeza pesada',
      },
      {
        id: 'prod-rodo-duplo',
        code: 'REV-402',
        description: 'Rodo Alumínio Duplo 40cm com Cabo Reforçado',
        unit: 'UN',
        costPrice: 11.20,
        salePrice: 24.00,
        family: 'Revenda',
        group: 'Vassouras e Rodos',
        barcode: '7892223334022',
        minStock: 10,
        productType: 'revenda',
        hasComposition: false,
        defaultLocationId: 'loc-comercial',
        status: 'ativo',
        taxPercent: 6.0,
        operatingExpensesPercent: 10.0,
        salesCommissionPercent: 3.0,
        otherCostsPercent: 1.0,
        profitMarginPercent: 25.0,
        notes: 'Borracha dupla flexível de alta durabilidade',
      },
      {
        id: 'prod-luva-latex',
        code: 'REV-403',
        description: 'Luva de Látex Amarela Multiuso Tamanho M (Par)',
        unit: 'PAR' as any,
        costPrice: 3.20,
        salePrice: 7.90,
        family: 'Revenda',
        group: 'EPIs e Acessórios',
        barcode: '7892223334039',
        minStock: 20,
        productType: 'revenda',
        hasComposition: false,
        defaultLocationId: 'loc-comercial',
        status: 'ativo',
        taxPercent: 6.0,
        operatingExpensesPercent: 10.0,
        salesCommissionPercent: 3.0,
        otherCostsPercent: 1.0,
        profitMarginPercent: 25.0,
        notes: 'Proteção para lavagem e faxina em geral',
      },
      {
        id: 'prod-pano-microfibra',
        code: 'REV-404',
        description: 'Pano Microfibra Multiuso 40x40cm (Pacote com 5 unid)',
        unit: 'PCT',
        costPrice: 9.00,
        salePrice: 19.90,
        family: 'Revenda',
        group: 'Panos e Fibras',
        barcode: '7892223334046',
        minStock: 15,
        productType: 'revenda',
        hasComposition: false,
        defaultLocationId: 'loc-comercial',
        status: 'ativo',
        taxPercent: 6.0,
        operatingExpensesPercent: 10.0,
        salesCommissionPercent: 3.0,
        otherCostsPercent: 1.0,
        profitMarginPercent: 25.0,
        notes: 'Não solta fiapos, ideal para vidros e bancadas',
      },
      // 5. Exemplo de Embalagem Master (Venda por Atacado / Caixa com 24 unidades)
      {
        id: 'prod-master-detergente-cx24',
        code: 'CX-301-24',
        description: 'Caixa Detergente Líquido Neutro 500ml c/ 24 UN',
        unit: 'CX',
        costPrice: 44.16, // 1.84 * 24
        salePrice: 89.90, // Desconto atacado (unidade avulsa sai a 3.75)
        family: 'Produtos Próprios',
        group: 'Embalagens Master',
        barcode: '7891112223240',
        minStock: 5,
        productType: 'revenda',
        hasComposition: false,
        defaultLocationId: 'loc-comercial',
        status: 'ativo',
        taxPercent: 6.0,
        operatingExpensesPercent: 12.0,
        salesCommissionPercent: 3.0,
        otherCostsPercent: 2.0,
        profitMarginPercent: 25.0,
        notes: 'Embalagem Master contendo 24 frascos de Detergente Neutro 500ml. A baixa de estoque é realizada diretamente nas unidades do produto associado PA-301.',
        isMasterPack: true,
        masterPackAssociatedProductId: 'prod-detergente-500',
        masterPackAssociatedProductCode: 'PA-301',
        masterPackAssociatedProductDescription: 'Detergente Líquido Neutro Imperial 500ml',
        masterPackUnits: 24,
        masterPackPackagingType: 'caixa',
      },
    ];

    // Saldos por Local de Estoque (com vinculação explícita por empresa)
    const stockBalances: ProductStockBalance[] = [
      // Matérias-Primas no galpão MP
      { productId: 'prod-comp-base', locationId: 'loc-mp', quantity: 240, reserved: 0, minStock: 50, companyId: companyMatrizId },
      { productId: 'prod-comp-essencia-lavanda', locationId: 'loc-mp', quantity: 18.5, reserved: 0, minStock: 5, companyId: companyMatrizId },
      { productId: 'prod-comp-corante-azul', locationId: 'loc-mp', quantity: 8.2, reserved: 0, minStock: 2, companyId: companyMatrizId },
      // Embalagens no estoque de embalagens
      { productId: 'prod-emb-frasco-500', locationId: 'loc-embalagens', quantity: 850, reserved: 0, minStock: 200, companyId: companyMatrizId },
      { productId: 'prod-emb-tampa-flip', locationId: 'loc-embalagens', quantity: 920, reserved: 0, minStock: 200, companyId: companyMatrizId },
      { productId: 'prod-emb-galao-5l', locationId: 'loc-embalagens', quantity: 110, reserved: 0, minStock: 40, companyId: companyMatrizId },
      // Produtos Fabricados e Revenda no Estoque Comercial unificado
      { productId: 'prod-detergente-500', locationId: 'loc-comercial', quantity: 245, reserved: 0, minStock: 60, companyId: companyMatrizId },
      { productId: 'prod-desinfetante-5l', locationId: 'loc-comercial', quantity: 57, reserved: 0, minStock: 20, companyId: companyMatrizId },
      { productId: 'prod-vassoura-piacava', locationId: 'loc-comercial', quantity: 38, reserved: 0, minStock: 15, companyId: companyMatrizId },
      { productId: 'prod-rodo-duplo', locationId: 'loc-comercial', quantity: 24, reserved: 0, minStock: 10, companyId: companyMatrizId },
      { productId: 'prod-luva-latex', locationId: 'loc-comercial', quantity: 72, reserved: 0, minStock: 20, companyId: companyMatrizId },
      { productId: 'prod-pano-microfibra', locationId: 'loc-comercial', quantity: 44, reserved: 0, minStock: 15, companyId: companyMatrizId },
    ];

    // Clientes
    const customers: Customer[] = [
      {
        id: 'cli-001',
        code: 'CLI-001',
        name: 'Supermercado Vila Bela Ltda',
        tradeName: 'Super Vila Bela',
        type: 'PJ',
        cpfCnpj: '23.456.789/0001-11',
        phone: '(11) 3991-2200',
        whatsapp: '(11) 97711-2233',
        email: 'compras@supervilabela.com.br',
        zipCode: '02300-000',
        street: 'Rua das Flores',
        number: '450',
        neighborhood: 'Vila Bela',
        city: 'São Paulo',
        state: 'SP',
        creditLimit: 8000.0,
        preferredPaymentMethod: 'Boleto 30 dias',
        status: 'ativo',
        notes: 'Cliente corporativo com compras quinzenais',
      },
      {
        id: 'cli-002',
        code: 'CLI-002',
        name: 'Condomínio Edifício Mirante do Vale',
        tradeName: 'Condomínio Mirante',
        type: 'PJ',
        cpfCnpj: '45.678.910/0001-22',
        phone: '(11) 3255-8800',
        whatsapp: '(11) 98122-3344',
        email: 'administracao@mirantedovale.com.br',
        zipCode: '01415-000',
        street: 'Alameda Santos',
        number: '1800',
        neighborhood: 'Cerqueira César',
        city: 'São Paulo',
        state: 'SP',
        creditLimit: 5000.0,
        preferredPaymentMethod: 'Pix',
        status: 'ativo',
        notes: 'Compra galões de 5L e material de limpeza pesada',
      },
      {
        id: 'cli-003',
        code: 'CLI-003',
        name: 'Lava Rápido Brilho Estelar',
        tradeName: 'Brilho Estelar Auto Care',
        type: 'PJ',
        cpfCnpj: '34.567.890/0001-33',
        phone: '(11) 2987-6543',
        whatsapp: '(11) 99344-5566',
        email: 'contato@brilhoestelar.com.br',
        zipCode: '02040-000',
        street: 'Av. Ataliba Leonel',
        number: '2100',
        neighborhood: 'Santana',
        city: 'São Paulo',
        state: 'SP',
        creditLimit: 3000.0,
        preferredPaymentMethod: 'Cartão de Crédito',
        status: 'ativo',
        notes: 'Consumo constante de detergente e panos microfibra',
      },
      {
        id: 'cli-004',
        code: 'CLI-004',
        name: 'Maria Helena dos Santos',
        tradeName: '',
        type: 'PF',
        cpfCnpj: '234.567.890-12',
        phone: '(11) 2233-1122',
        whatsapp: '(11) 98765-1122',
        email: 'maria.helena@gmail.com',
        zipCode: '02100-000',
        street: 'Rua Voluntários da Pátria',
        number: '890',
        neighborhood: 'Santana',
        city: 'São Paulo',
        state: 'SP',
        creditLimit: 500.0,
        preferredPaymentMethod: 'Dinheiro',
        status: 'ativo',
        notes: 'Cliente do balcão, compra produtos de uso doméstico',
      },
    ];

    // Fornecedores
    const suppliers: Supplier[] = [
      {
        id: 'for-001',
        code: 'FOR-001',
        name: 'Distribuidora Química Brasil S.A.',
        tradeName: 'Química Brasil',
        type: 'PJ',
        cpfCnpj: '98.765.432/0001-10',
        contactName: 'Engenheiro Fernando Costa',
        phone: '(19) 3888-2000',
        whatsapp: '(19) 97123-4567',
        email: 'vendas@quimicabrasil.com.br',
        zipCode: '13010-000',
        street: 'Rodovia Anhanguera',
        number: 'Km 105',
        neighborhood: 'Distrito Industrial',
        city: 'Campinas',
        state: 'SP',
        paymentTerms: '28/56 dias',
        status: 'ativo',
        notes: 'Fornecedor de matérias-primas e bases tensoativas',
      },
      {
        id: 'for-002',
        code: 'FOR-002',
        name: 'Plásticos & Embalagens Paulista Ltda',
        tradeName: 'Embalagens Paulista',
        type: 'PJ',
        cpfCnpj: '87.654.321/0001-20',
        contactName: 'Juliana Prado',
        phone: '(11) 4567-8900',
        whatsapp: '(11) 96543-2100',
        email: 'pedidos@embalagenspaulista.com.br',
        zipCode: '07100-000',
        street: 'Av. Monteiro Lobato',
        number: '3400',
        neighborhood: 'Cumbica',
        city: 'Guarulhos',
        state: 'SP',
        paymentTerms: '30 dias',
        status: 'ativo',
        notes: 'Fornecedor de frascos PET, galões e tampas',
      },
      {
        id: 'for-003',
        code: 'FOR-003',
        name: 'Indústria de Artefatos de Madeira e Piaçava Sul Ltda',
        tradeName: 'Vassouras & Rodos do Sul',
        type: 'PJ',
        cpfCnpj: '76.543.210/0001-30',
        contactName: 'Marcos Vinícius',
        phone: '(47) 3433-1122',
        whatsapp: '(47) 98877-6655',
        email: 'contato@vassourasdosul.com.br',
        zipCode: '89200-000',
        street: 'Rua XV de Novembro',
        number: '1200',
        neighborhood: 'Centro',
        city: 'Joinville',
        state: 'SC',
        paymentTerms: '15/30/45 dias',
        status: 'ativo',
        notes: 'Fornecedor de vassouras, rodos e cabos para revenda',
      },
    ];

    const todayStr = new Date().toISOString().split('T')[0];

    // Caixa PDV Aberto
    const cashRegisters: CashRegister[] = [
      {
        id: 'cx-hoje',
        companyId: companyMatrizId,
        userId: 'usr-balconista',
        userName: 'Mariana Souza',
        openedAt: `${todayStr}T08:00:00.000Z`,
        initialBalance: 200.0,
        status: 'aberto',
        movements: [
          {
            id: 'mov-suprimento-01',
            type: 'suprimento',
            amount: 50.0,
            description: 'Reforço de troco para notas de 2 e 5',
            timestamp: `${todayStr}T08:30:00.000Z`,
            userId: 'usr-balconista',
          },
        ],
      },
    ];

    // Pedidos e Vendas de Exemplo
    const orders: Order[] = [
      {
        id: 'ord-venda-001',
        number: 'VD-2026-0001',
        type: 'venda',
        origin: 'pdv',
        companyId: companyMatrizId,
        customerId: 'cli-004',
        customerName: 'Maria Helena dos Santos',
        userId: 'usr-balconista',
        userName: 'Mariana Souza',
        items: [
          {
            id: 'item-1',
            productId: 'prod-detergente-500',
            productCode: 'PA-301',
            description: 'Detergente Líquido Neutro Imperial 500ml',
            unit: 'UN',
            quantity: 3,
            unitPrice: 3.99,
            discountPercent: 0,
            discountValue: 0,
            totalPrice: 11.97,
            unitCost: 1.84,
            locationId: 'loc-comercial',
          },
          {
            id: 'item-2',
            productId: 'prod-pano-microfibra',
            productCode: 'REV-404',
            description: 'Pano Microfibra Multiuso 40x40cm (Pacote com 5 unid)',
            unit: 'PCT',
            quantity: 1,
            unitPrice: 19.90,
            discountPercent: 0,
            discountValue: 0,
            totalPrice: 19.90,
            unitCost: 9.00,
            locationId: 'loc-comercial',
          },
        ],
        subtotal: 31.87,
        discountTotal: 0,
        total: 31.87,
        paymentMethod: 'pix',
        installmentsCount: 1,
        receivedAmount: 31.87,
        changeAmount: 0,
        status: 'concluido',
        stockDeducted: true,
        financialGenerated: true,
        createdAt: `${todayStr}T09:15:00.000Z`,
        updatedAt: `${todayStr}T09:15:00.000Z`,
      },
      {
        id: 'ord-orcamento-002',
        number: 'ORC-2026-0002',
        type: 'orcamento',
        origin: 'externa_celular',
        companyId: companyMatrizId,
        customerId: 'cli-001',
        customerName: 'Supermercado Vila Bela Ltda',
        userId: 'usr-vendedor-externo',
        userName: 'Bruno Lima',
        items: [
          {
            id: 'item-3',
            productId: 'prod-detergente-500',
            productCode: 'PA-301',
            description: 'Detergente Líquido Neutro Imperial 500ml',
            unit: 'UN',
            quantity: 120,
            unitPrice: 3.80,
            discountPercent: 4.76,
            discountValue: 22.80,
            totalPrice: 456.00,
            unitCost: 1.84,
            locationId: 'loc-comercial',
          },
          {
            id: 'item-4',
            productId: 'prod-desinfetante-5l',
            productCode: 'PA-302',
            description: 'Desinfetante Floral Imperial Profissional 5L',
            unit: 'UN',
            quantity: 20,
            unitPrice: 21.50,
            discountPercent: 6.11,
            discountValue: 28.00,
            totalPrice: 430.00,
            unitCost: 9.85,
            locationId: 'loc-comercial',
          },
        ],
        subtotal: 908.00,
        discountTotal: 50.80,
        total: 886.00,
        paymentMethod: 'boleto',
        installmentsCount: 2,
        receivedAmount: 0,
        changeAmount: 0,
        status: 'aberto',
        validityDate: '2026-10-15',
        notes: 'Orçamento com condição especial de atacado para 28 dias',
        stockDeducted: false,
        financialGenerated: false,
        createdAt: `${todayStr}T10:00:00.000Z`,
        updatedAt: `${todayStr}T10:00:00.000Z`,
      },
      {
        id: 'ord-venda-ext-hoje',
        number: 'PED-EXT-2026-0001',
        type: 'venda',
        origin: 'externa_celular',
        companyId: companyMatrizId,
        customerId: 'cli-004',
        customerName: 'Maria Helena dos Santos',
        userId: 'usr-vendedor-externo',
        userName: 'Bruno Lima',
        items: [
          {
            id: 'item-ext-1',
            productId: 'prod-detergente-500',
            productCode: 'PA-301',
            description: 'Detergente Líquido Neutro Imperial 500ml',
            unit: 'UN',
            quantity: 20,
            unitPrice: 3.99,
            discountPercent: 0,
            discountValue: 0,
            totalPrice: 79.80,
            unitCost: 1.84,
            locationId: 'loc-comercial',
          },
          {
            id: 'item-ext-2',
            productId: 'prod-desinfetante-5l',
            productCode: 'PA-302',
            description: 'Desinfetante Floral Imperial Profissional 5L',
            unit: 'UN',
            quantity: 4,
            unitPrice: 21.50,
            discountPercent: 0,
            discountValue: 0,
            totalPrice: 86.00,
            unitCost: 9.85,
            locationId: 'loc-comercial',
          },
        ],
        subtotal: 165.80,
        discountTotal: 0,
        total: 165.80,
        paymentMethod: 'pix',
        installmentsCount: 1,
        receivedAmount: 165.80,
        changeAmount: 0,
        status: 'concluido',
        stockDeducted: true,
        financialGenerated: true,
        createdAt: `${todayStr}T09:30:00.000Z`,
        updatedAt: `${todayStr}T09:30:00.000Z`,
      },
      {
        id: 'ord-venda-ext-mes',
        number: 'PED-EXT-2026-0002',
        type: 'venda',
        origin: 'externa_celular',
        companyId: companyMatrizId,
        customerId: 'cli-001',
        customerName: 'Auto Posto & Conveniência Estrela do Norte',
        userId: 'usr-vendedor-externo',
        userName: 'Bruno Lima',
        items: [
          {
            id: 'item-ext-3',
            productId: 'prod-desinfetante-5l',
            productCode: 'PA-302',
            description: 'Desinfetante Floral Imperial Profissional 5L',
            unit: 'UN',
            quantity: 25,
            unitPrice: 21.50,
            discountPercent: 5,
            discountValue: 26.88,
            totalPrice: 510.62,
            unitCost: 9.85,
            locationId: 'loc-comercial',
          },
        ],
        subtotal: 537.50,
        discountTotal: 26.88,
        total: 510.62,
        paymentMethod: 'boleto',
        installmentsCount: 2,
        receivedAmount: 0,
        changeAmount: 0,
        status: 'concluido',
        stockDeducted: true,
        financialGenerated: true,
        createdAt: `${todayStr.slice(0, 7)}-01T14:15:00.000Z`,
        updatedAt: `${todayStr.slice(0, 7)}-01T14:15:00.000Z`,
      },
    ];

    // Contas a Receber
    const accountsReceivable: AccountReceivable[] = [
      {
        id: 'rec-001',
        companyId: companyMatrizId,
        orderId: 'ord-venda-antiga',
        orderNumber: 'VD-2026-0000',
        customerId: 'cli-002',
        customerName: 'Condomínio Edifício Mirante do Vale',
        docNumber: 'DUP-1042',
        installmentNumber: 1,
        totalInstallments: 1,
        issueDate: '2026-09-20',
        dueDate: '2026-10-20',
        originalValue: 640.0,
        discount: 0,
        addition: 0,
        paidValue: 0,
        balance: 640.0,
        paymentMethod: 'Boleto',
        status: 'aberto',
        receipts: [],
      },
      {
        id: 'rec-overdue-001',
        companyId: companyMatrizId,
        orderId: 'ord-atrasada-01',
        orderNumber: 'VD-2026-0034',
        customerId: 'cli-001',
        customerName: 'Auto Posto & Conveniência Estrela do Norte',
        docNumber: 'DUP-1048/1',
        installmentNumber: 1,
        totalInstallments: 2,
        issueDate: '2026-08-25',
        dueDate: '2026-09-25',
        originalValue: 540.0,
        discount: 0,
        addition: 0,
        paidValue: 0,
        balance: 540.0,
        paymentMethod: 'Boleto Bancário',
        status: 'aberto',
        receipts: [],
      },
      {
        id: 'rec-overdue-002',
        companyId: companyMatrizId,
        orderId: 'ord-atrasada-02',
        orderNumber: 'VD-2026-0029',
        customerId: 'cli-003',
        customerName: 'Restaurante & Churrascaria Fogão Gaúcho',
        docNumber: 'DUP-1033/2',
        installmentNumber: 2,
        totalInstallments: 3,
        issueDate: '2026-08-15',
        dueDate: '2026-09-15',
        originalValue: 380.0,
        discount: 0,
        addition: 0,
        paidValue: 0,
        balance: 380.0,
        paymentMethod: 'Boleto Bancário',
        status: 'aberto',
        receipts: [],
      },
    ];

    // Contas a Pagar
    const accountsPayable: AccountPayable[] = [
      {
        id: 'pag-001',
        companyId: companyMatrizId,
        supplierId: 'for-001',
        supplierName: 'Distribuidora Química Brasil S.A.',
        description: 'Compra de Base Tensoativa Lote 24',
        category: 'fornecedores',
        docNumber: 'NF-89210',
        installmentNumber: 1,
        totalInstallments: 2,
        issueDate: '2026-09-15',
        dueDate: '2026-10-15',
        originalValue: 1200.0,
        discount: 0,
        addition: 0,
        paidValue: 0,
        balance: 1200.0,
        status: 'aberto',
        payments: [],
        notes: 'Primeira parcela da compra de insumos',
      },
      {
        id: 'pag-002',
        companyId: companyMatrizId,
        supplierName: 'Imobiliária Parque Novo Mundo',
        description: 'Aluguel do Galpão Industrial SP',
        category: 'aluguel',
        docNumber: 'ALUG-10/26',
        installmentNumber: 1,
        totalInstallments: 1,
        issueDate: '2026-10-01',
        dueDate: '2026-10-10',
        originalValue: 2800.0,
        discount: 0,
        addition: 0,
        paidValue: 0,
        balance: 2800.0,
        status: 'aberto',
        payments: [],
      },
    ];

    // Pedidos de Compra de Exemplo
    const purchaseOrders: PurchaseOrder[] = [
      {
        id: 'pc-001',
        number: 'PC-2026-0001',
        companyId: companyMatrizId,
        supplierId: 'for-002',
        supplierName: 'Plásticos & Embalagens Paulista Ltda',
        orderDate: '2026-10-02',
        expectedDeliveryDate: '2026-10-08',
        paymentTerms: '30 dias',
        installmentsCount: 1,
        status: 'aguardando_entrega',
        items: [
          {
            productId: 'prod-emb-frasco-500',
            productCode: 'EMB-201',
            description: 'Frasco PET 500ml Transparente',
            buyUnit: 'CX',
            saleUnit: 'UN',
            packageFactor: 100,
            buyQuantity: 10, // 10 caixas x 100 = 1000 un
            unitCost: 65.0, // R$ 65 por caixa (R$ 0,65 por un)
            discount: 20.0,
            freightApportioned: 30.0,
            otherExpensesApportioned: 0,
            totalCost: 660.0,
            receivedQuantity: 0,
            pendingQuantity: 1000,
            destinationLocationId: 'loc-embalagens',
          },
        ],
        subtotal: 650.0,
        discountTotal: 20.0,
        freightTotal: 30.0,
        otherExpensesTotal: 0,
        total: 660.0,
        userId: 'usr-admin',
        userName: 'Romeu Júnior',
        createdAt: '2026-10-02T14:30:00.000Z',
      },
    ];

    // Auditoria Inicial
    const auditLogs: AuditLog[] = [
      {
        id: 'log-init-1',
        companyId: companyMatrizId,
        userId: 'usr-admin',
        userName: 'Romeu Júnior',
        action: 'INICIALIZACAO_SISTEMA',
        module: 'SISTEMA',
        recordId: 'SISTEMA',
        details: 'Implantação inicial do GestãoFácil ERP com banco integrado e multi-local',
        timestamp: new Date().toISOString(),
      },
    ];

    return {
      companies,
      users,
      currentCompanyId: companyMatrizId,
      currentUserId: 'usr-admin',
      stockLocations,
      products,
      stockBalances,
      stockMovements: [],
      customers,
      suppliers,
      orders,
      cashRegisters,
      accountsReceivable,
      accountsPayable,
      purchaseOrders,
      purchaseReceipts: [],
      productionOrders: [],
      transferOrders: [],
      inventoryCounts: [],
      auditLogs,
      components: [...DEFAULT_COMPONENTS],
      paymentMethods: [...DEFAULT_PAYMENT_METHODS],
      financialAccounts: [...DEFAULT_FINANCIAL_ACCOUNTS],
      paymentTermsList: [...DEFAULT_PAYMENT_TERMS],
      deliveryRoutes: [...DEFAULT_DELIVERY_ROUTES],
      deliveryManifests: [...DEFAULT_DELIVERY_MANIFESTS],
      states: [...DEFAULT_STATES],
      marketAreas: [...DEFAULT_MARKET_AREAS],
      cities: [...DEFAULT_CITIES],
      neighborhoods: [...DEFAULT_NEIGHBORHOODS],
      stockControlConfig: { ...DEFAULT_STOCK_CONTROL_CONFIG },
    };
  }
}
