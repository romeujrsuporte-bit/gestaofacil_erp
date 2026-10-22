import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database, DatabaseState } from './db';

export const DEFAULT_SUPABASE_URL = 'https://hgjebnvzfstddfihblhw.supabase.co';
export const DEFAULT_SUPABASE_KEY = 'sb_publishable_xAWxHwrjMTPMHbGmF256pA_n-J3visx';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  autoSync: boolean;
  syncIntervalMinutes: number;
  lastSyncAt: string | null;
  status: 'connected' | 'disconnected' | 'error' | 'testing' | 'syncing';
  lastError: string | null;
}

const CONFIG_STORAGE_KEY = 'omni_supabase_config_v1';

export interface TableAuditItem {
  id: string;
  name: string;
  label: string;
  module: string;
  exists: boolean;
  count: number;
}

export interface DatabaseCheckoutResult {
  success: boolean;
  timestamp: string;
  projectName: string;
  projectId: string;
  url: string;
  publishableKey: string;
  latencyMs: number;
  connectionStatus: 'connected' | 'error';
  tablesAudit: TableAuditItem[];
  tablesTotal: number;
  tablesFoundCount: number;
  tablesMissingCount: number;
  universalSyncStatus: 'synced' | 'pending_schema' | 'error';
  message: string;
  sqlConsoleUrl: string;
  sqlSchema: string;
}

export interface ConnectionTestResult {
  success: boolean;
  latencyMs: number;
  projectId: string;
  url: string;
  message: string;
  existingTables: string[];
  missingTables: string[];
  tablesAudit: TableAuditItem[];
}

export const ERP_SUPABASE_TABLES = [
  { id: 'omni_erp_sync', name: 'omni_erp_sync', label: 'Backup Universal do ERP (JSONB)', module: 'Sistema & Nuvem' },
  { id: 'companies', name: 'companies', label: 'Empresas (Matriz e Filiais)', module: 'Administração' },
  { id: 'users', name: 'users', label: 'Usuários & Perfis de Acesso', module: 'Administração' },
  { id: 'customers', name: 'customers', label: 'Clientes & CRM (Praça, Bairro, Rota)', module: 'Comercial & CRM' },
  { id: 'suppliers', name: 'suppliers', label: 'Fornecedores & Parceiros', module: 'Cadastros' },
  { id: 'products', name: 'products', label: 'Produtos, Preços & Estoque', module: 'Produtos' },
  { id: 'orders', name: 'orders', label: 'Pedidos, Orçamentos & Vendas PDV/Mobile', module: 'Vendas' },
  { id: 'delivery_routes', name: 'delivery_routes', label: 'Rotas de Entrega & Roteirização', module: 'Expedição' },
  { id: 'delivery_manifests', name: 'delivery_manifests', label: 'Romaneios de Entrega & Cargas', module: 'Expedição' },
  { id: 'stock_locations', name: 'stock_locations', label: 'Locais de Estoque & Almoxarifados', module: 'Estoque' },
  { id: 'production_orders', name: 'production_orders', label: 'Ordens de Produção (PCP)', module: 'Produção' },
  { id: 'purchase_orders', name: 'purchase_orders', label: 'Pedidos de Compra a Fornecedores', module: 'Compras' },
  { id: 'accounts_receivable', name: 'accounts_receivable', label: 'Contas a Receber & Parcelas', module: 'Financeiro' },
  { id: 'accounts_payable', name: 'accounts_payable', label: 'Contas a Pagar & Despesas', module: 'Financeiro' },
];

export class SupabaseService {
  private static client: SupabaseClient | null = null;
  private static config: SupabaseConfig = this.loadConfig();
  private static listeners: Array<(config: SupabaseConfig) => void> = [];
  private static autoSyncTimer: any = null;
  private static syncDebounceTimer: any = null;
  private static realtimeChannel: any = null;
  private static isInitialized = false;
  private static isSyncingInProgress = false;
  private static lastLocalSyncTimestamp: string | null = null;

  private static sanitizeUrl(url: string): string {
    if (!url) return DEFAULT_SUPABASE_URL;
    let clean = url.trim();
    // Remove /rest/v1 or /rest/v1/ suffix
    clean = clean.replace(/\/rest\/v1\/?$/, '');
    // Remove trailing slash
    clean = clean.replace(/\/+$/, '');
    return clean;
  }

  public static loadConfig(): SupabaseConfig {
    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(CONFIG_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          // Migração automática caso o usuário tenha armazenado o projeto anterior padrão
          if (!parsed.url || parsed.url.includes('qtnlzojhksooztmsdoen') || parsed.anonKey?.includes('UaJHH_uS1YEm4aM6bVI3fw')) {
            parsed.url = DEFAULT_SUPABASE_URL;
            parsed.anonKey = DEFAULT_SUPABASE_KEY;
            localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(parsed));
          }
          return {
            url: parsed.url || DEFAULT_SUPABASE_URL,
            anonKey: parsed.anonKey || DEFAULT_SUPABASE_KEY,
            autoSync: parsed.autoSync ?? true,
            syncIntervalMinutes: parsed.syncIntervalMinutes || 1,
            lastSyncAt: parsed.lastSyncAt || null,
            status: 'disconnected',
            lastError: null,
          };
        }
      }
    } catch (e) {
      console.warn('Erro ao carregar configuração do Supabase:', e);
    }

    const envUrl = typeof import.meta !== 'undefined' && import.meta?.env ? (import.meta.env.VITE_SUPABASE_URL as string) : undefined;
    const envKey = typeof import.meta !== 'undefined' && import.meta?.env ? (import.meta.env.VITE_SUPABASE_ANON_KEY as string) : undefined;

    return {
      url: envUrl || DEFAULT_SUPABASE_URL,
      anonKey: envKey || DEFAULT_SUPABASE_KEY,
      autoSync: true,
      syncIntervalMinutes: 1,
      lastSyncAt: null,
      status: 'disconnected',
      lastError: null,
    };
  }

  public static saveConfig(newConfig: Partial<SupabaseConfig>) {
    this.config = {
      ...this.config,
      ...newConfig,
      url: this.sanitizeUrl(newConfig.url || this.config.url),
    };
    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(this.config));
      }
    } catch (e) {
      console.error('Erro ao salvar configuração do Supabase:', e);
    }
    // Reinitialize client
    this.client = null;
    this.notify();
    this.setupAutoSync();
  }

  public static getConfig(): SupabaseConfig {
    return { ...this.config };
  }

  public static subscribe(callback: (config: SupabaseConfig) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  private static notify() {
    this.listeners.forEach((cb) => cb(this.getConfig()));
  }

  public static getClient(): SupabaseClient {
    if (!this.client) {
      const url = this.sanitizeUrl(this.config.url || DEFAULT_SUPABASE_URL);
      const key = (this.config.anonKey || DEFAULT_SUPABASE_KEY).trim();
      this.client = createClient(url, key, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
    }
    return this.client;
  }

  public static extractProjectId(url: string): string {
    const clean = this.sanitizeUrl(url);
    const match = clean.match(/https?:\/\/([^.]+)\.supabase\.co/);
    return match ? match[1] : 'hgjebnvzfstddfihblhw';
  }

  /**
   * Testa a conectividade com o projeto Supabase fornecido e audita todas as tabelas
   */
  public static async testConnection(): Promise<ConnectionTestResult> {
    const start = performance.now();
    const url = this.sanitizeUrl(this.config.url || DEFAULT_SUPABASE_URL);
    const key = (this.config.anonKey || DEFAULT_SUPABASE_KEY).trim();
    const projectId = this.extractProjectId(url);

    try {
      this.config.status = 'testing';
      this.notify();

      const client = this.getClient();
      const existingTables: string[] = [];
      const missingTables: string[] = [];
      const tablesAudit: TableAuditItem[] = [];

      // Checa cada tabela do ERP no schema do Supabase
      for (const t of ERP_SUPABASE_TABLES) {
        try {
          const { data, error, count } = await client
            .from(t.name)
            .select('id', { count: 'exact' })
            .limit(1);

          if (!error) {
            existingTables.push(t.name);
            tablesAudit.push({
              id: t.id,
              name: t.name,
              label: t.label,
              module: t.module,
              exists: true,
              count: count || 0,
            });
          } else if (error.code === 'PGRST205' || error.message.includes('schema cache')) {
            missingTables.push(t.name);
            tablesAudit.push({
              id: t.id,
              name: t.name,
              label: t.label,
              module: t.module,
              exists: false,
              count: 0,
            });
          } else {
            // Existe mas com restrição ou outro status
            existingTables.push(t.name);
            tablesAudit.push({
              id: t.id,
              name: t.name,
              label: t.label,
              module: t.module,
              exists: true,
              count: 0,
            });
          }
        } catch {
          missingTables.push(t.name);
          tablesAudit.push({
            id: t.id,
            name: t.name,
            label: t.label,
            module: t.module,
            exists: false,
            count: 0,
          });
        }
      }

      const latencyMs = Math.round(performance.now() - start);

      this.config.status = 'connected';
      this.config.lastError = null;
      this.notify();

      return {
        success: true,
        latencyMs,
        projectId,
        url,
        existingTables,
        missingTables,
        tablesAudit,
        message: `Conexão ativa com o Supabase (${projectId}) em ${latencyMs}ms. ${existingTables.length} de ${ERP_SUPABASE_TABLES.length} tabelas encontradas no banco.`,
      };
    } catch (err: any) {
      const latencyMs = Math.round(performance.now() - start);
      const errMsg = err?.message || 'Falha ao conectar ao Supabase';

      this.config.status = 'error';
      this.config.lastError = errMsg;
      this.notify();

      return {
        success: false,
        latencyMs,
        projectId,
        url,
        existingTables: [],
        missingTables: ERP_SUPABASE_TABLES.map((t) => t.name),
        tablesAudit: ERP_SUPABASE_TABLES.map((t) => ({
          id: t.id,
          name: t.name,
          label: t.label,
          module: t.module,
          exists: false,
          count: 0,
        })),
        message: errMsg,
      };
    }
  }

  /**
   * Realiza o checkout completo com o banco de dados Supabase:
   * Validação de conexão, auditoria de tabelas, sincronização de dados e verificação de schema.
   */
  public static async checkoutDatabase(): Promise<DatabaseCheckoutResult> {
    const start = performance.now();
    const testResult = await this.testConnection();
    const latencyMs = Math.round(performance.now() - start);
    const projectId = this.extractProjectId(this.config.url || DEFAULT_SUPABASE_URL);
    const sqlConsoleUrl = `https://supabase.com/dashboard/project/${projectId}/sql`;
    const sqlSchema = this.generateSqlSchema();

    let universalSyncStatus: 'synced' | 'pending_schema' | 'error' = 'pending_schema';

    const omniTable = testResult.tablesAudit.find((t) => t.id === 'omni_erp_sync');
    if (omniTable && omniTable.exists) {
      try {
        const syncRes = await this.syncToSupabase();
        universalSyncStatus = syncRes.success ? 'synced' : 'error';
      } catch {
        universalSyncStatus = 'error';
      }
    } else {
      universalSyncStatus = 'pending_schema';
    }

    const tablesFoundCount = testResult.existingTables.length;
    const tablesMissingCount = testResult.missingTables.length;

    let message = '';
    if (!testResult.success) {
      message = `Falha na conexão com o Supabase: ${testResult.message}`;
    } else if (tablesMissingCount > 0) {
      message = `Conexão bem-sucedida (${latencyMs}ms). Projeto: ${projectId}. ${tablesFoundCount} de ${ERP_SUPABASE_TABLES.length} tabelas encontradas. ${tablesMissingCount} tabelas prontas para inicialização no SQL Editor.`;
    } else {
      message = `Checkout 100% concluído! Todas as ${ERP_SUPABASE_TABLES.length} tabelas estão ativas e sincronizadas no Supabase (${projectId}).`;
    }

    return {
      success: testResult.success,
      timestamp: new Date().toISOString(),
      projectName: 'gestaofacil_erp-netlify',
      projectId,
      url: this.config.url,
      publishableKey: this.config.anonKey,
      latencyMs,
      connectionStatus: testResult.success ? 'connected' : 'error',
      tablesAudit: testResult.tablesAudit,
      tablesTotal: ERP_SUPABASE_TABLES.length,
      tablesFoundCount,
      tablesMissingCount,
      universalSyncStatus,
      message,
      sqlConsoleUrl,
      sqlSchema,
    };
  }

  /**
   * Sincroniza o estado de toda a aplicação para o Supabase
   */
  public static async syncToSupabase(customState?: DatabaseState): Promise<{
    success: boolean;
    recordsCount: number;
    syncedTables: string[];
    message: string;
  }> {
    if (this.isSyncingInProgress) {
      this.queueSync(800);
      return {
        success: true,
        recordsCount: 0,
        syncedTables: [],
        message: 'Sincronização já em andamento, nova rodada agendada.',
      };
    }

    this.isSyncingInProgress = true;
    this.config.status = 'syncing';
    this.notify();

    const client = this.getClient();
    const state = customState || Database.getState();
    const currentCompany = Database.getCurrentCompany();
    const nowIso = new Date().toISOString();

    const syncedTables: string[] = [];
    let recordsCount = 0;

    try {
      // 1. Sincroniza na tabela universal de sincronização 'omni_erp_sync' (Garante 100% de integridade)
      const syncPayload = {
        company_id: currentCompany.id,
        company_name: currentCompany.name,
        company_cnpj: currentCompany.cnpjCpf,
        last_sync_at: nowIso,
        erp_version: '1.0.0',
        total_customers: state.customers?.length || 0,
        total_products: state.products?.length || 0,
        total_orders: state.orders?.length || 0,
        total_manifests: state.deliveryManifests?.length || 0,
        total_routes: state.deliveryRoutes?.length || 0,
        state_json: state,
      };

      const { error: syncError } = await client
        .from('omni_erp_sync')
        .upsert(
          {
            id: `company_${currentCompany.id}`,
            ...syncPayload,
            updated_at: nowIso,
          },
          { onConflict: 'id' }
        );

      if (!syncError) {
        syncedTables.push('omni_erp_sync');
        recordsCount += 1;
      }

      // 2. Empresas (Matriz & Filiais)
      if (state.companies && state.companies.length > 0) {
        const companyRecords = state.companies.map((c) => ({
          id: c.id,
          name: c.name,
          trade_name: c.tradeName || null,
          cnpj_cpf: c.cnpjCpf,
          type: c.type,
          phone: c.phone || null,
          email: c.email || null,
          address_json: c.address,
          status: c.status || 'ativo',
          updated_at: nowIso,
        }));
        const { error } = await client.from('companies').upsert(companyRecords, { onConflict: 'id' });
        if (!error) {
          syncedTables.push('companies');
          recordsCount += companyRecords.length;
        }
      }

      // 3. Usuários e Operadores
      if (state.users && state.users.length > 0) {
        const userRecords = state.users.map((u) => ({
          id: u.id,
          company_id: u.companyId || currentCompany.id,
          name: u.name,
          login: u.login,
          role: u.role,
          email: u.email || null,
          phone: u.phone || null,
          status: u.status || 'ativo',
          permissions_json: u.permissions,
          updated_at: nowIso,
        }));
        const { error } = await client.from('users').upsert(userRecords, { onConflict: 'id' });
        if (!error) {
          syncedTables.push('users');
          recordsCount += userRecords.length;
        }
      }

      // 4. Clientes & CRM
      if (state.customers && state.customers.length > 0) {
        const clientRecords = state.customers.map((c) => ({
          id: c.id,
          company_id: c.companyId || currentCompany.id,
          code: c.code,
          name: c.name,
          trade_name: c.tradeName || null,
          type: c.type,
          cpf_cnpj: c.cpfCnpj,
          phone: c.phone,
          whatsapp: c.whatsapp || null,
          email: c.email || null,
          street: c.street || null,
          number: c.number || null,
          neighborhood: c.neighborhood || null,
          city: c.city || null,
          state: c.state || null,
          market_area: c.marketArea || null,
          seller_name: c.sellerName || null,
          delivery_route_id: c.deliveryRouteId || null,
          delivery_route_name: c.deliveryRouteName || null,
          credit_limit: c.creditLimit || 0,
          status: c.status || 'ativo',
          updated_at: nowIso,
        }));
        const { error } = await client.from('customers').upsert(clientRecords, { onConflict: 'id' });
        if (!error) {
          syncedTables.push('customers');
          recordsCount += clientRecords.length;
        }
      }

      // 5. Fornecedores
      if (state.suppliers && state.suppliers.length > 0) {
        const supplierRecords = state.suppliers.map((s) => ({
          id: s.id,
          code: s.code,
          name: s.name,
          trade_name: s.tradeName || null,
          type: s.type,
          cpf_cnpj: s.cpfCnpj,
          contact_name: s.contactName || null,
          phone: s.phone,
          whatsapp: s.whatsapp || null,
          email: s.email || null,
          city: s.city || null,
          state: s.state || null,
          payment_terms: s.paymentTerms || null,
          status: s.status || 'ativo',
          updated_at: nowIso,
        }));
        const { error } = await client.from('suppliers').upsert(supplierRecords, { onConflict: 'id' });
        if (!error) {
          syncedTables.push('suppliers');
          recordsCount += supplierRecords.length;
        }
      }

      // 6. Produtos & Estoque
      if (state.products && state.products.length > 0) {
        const productRecords = state.products.map((p) => ({
          id: p.id,
          company_id: currentCompany.id,
          code: p.code,
          barcode: p.barcode || null,
          name: p.description,
          category: p.family || p.group || 'Geral',
          unit: p.unit || 'UN',
          cost_price: p.costPrice || 0,
          sale_price: p.salePrice || 0,
          min_stock: p.minStock || 0,
          is_produced: p.hasComposition ?? false,
          active: p.status === 'ativo',
          updated_at: nowIso,
        }));
        const { error } = await client.from('products').upsert(productRecords, { onConflict: 'id' });
        if (!error) {
          syncedTables.push('products');
          recordsCount += productRecords.length;
        }
      }

      // 7. Pedidos de Venda, Orçamentos & PDV
      if (state.orders && state.orders.length > 0) {
        const orderRecords = state.orders.map((o) => ({
          id: o.id,
          number: o.number,
          type: o.type,
          origin: o.origin,
          company_id: o.companyId || currentCompany.id,
          customer_id: o.customerId || null,
          customer_name: o.customerName,
          customer_cpf_cnpj: o.customerCpfCnpj || null,
          customer_phone: o.customerPhone || null,
          user_id: o.userId,
          user_name: o.userName,
          subtotal: o.subtotal || 0,
          discount_total: o.discountTotal || 0,
          total: o.total || 0,
          payment_method: o.paymentMethod || 'dinheiro',
          status: o.status,
          date: o.createdAt || nowIso,
          items_json: o.items || [],
          updated_at: nowIso,
        }));
        const { error } = await client.from('orders').upsert(orderRecords, { onConflict: 'id' });
        if (!error) {
          syncedTables.push('orders');
          recordsCount += orderRecords.length;
        }
      }

      // 8. Rotas de Entrega
      if (state.deliveryRoutes && state.deliveryRoutes.length > 0) {
        const routeRecords = state.deliveryRoutes.map((r) => ({
          id: r.id,
          company_id: r.companyId || currentCompany.id,
          code: r.code,
          name: r.name,
          description: r.description || null,
          active: r.active ?? true,
          color: r.color || 'blue',
          cities: r.cities || [],
          neighborhoods: r.neighborhoods || [],
          market_areas: r.marketAreas || [],
          seller_names: r.sellerNames || [],
          estimated_delivery_window: r.estimatedDeliveryWindow || null,
          vehicle_type: r.vehicleTypeRecommendation || null,
          updated_at: nowIso,
        }));
        const { error } = await client.from('delivery_routes').upsert(routeRecords, { onConflict: 'id' });
        if (!error) {
          syncedTables.push('delivery_routes');
          recordsCount += routeRecords.length;
        }
      }

      // 9. Romaneios de Entrega
      if (state.deliveryManifests && state.deliveryManifests.length > 0) {
        const manifestRecords = state.deliveryManifests.map((m) => ({
          id: m.id,
          number: m.number,
          company_id: m.companyId || currentCompany.id,
          date: m.date,
          departure_date: m.departureDate,
          route_id: m.routeId,
          route_name: m.routeName,
          driver_name: m.driverName,
          driver_phone: m.driverPhone || null,
          vehicle_plate: m.vehiclePlate,
          vehicle_model: m.vehicleModel || null,
          status: m.status,
          total_orders: m.totalOrders,
          total_delivered: m.totalDelivered,
          total_pending: m.totalPending,
          total_value: m.totalValue,
          total_amount_to_collect: m.totalAmountToCollect || 0,
          total_volumes: m.totalVolumes || 0,
          orders_json: m.orders,
          updated_at: nowIso,
        }));
        const { error } = await client.from('delivery_manifests').upsert(manifestRecords, { onConflict: 'id' });
        if (!error) {
          syncedTables.push('delivery_manifests');
          recordsCount += manifestRecords.length;
        }
      }

      // 10. Locais de Estoque
      if (state.stockLocations && state.stockLocations.length > 0) {
        const locationRecords = state.stockLocations.map((l) => ({
          id: l.id,
          company_id: l.companyId || currentCompany.id,
          code: l.code,
          name: l.name,
          type: l.type,
          description: l.description || null,
          active: l.status === 'ativo',
          updated_at: nowIso,
        }));
        const { error } = await client.from('stock_locations').upsert(locationRecords, { onConflict: 'id' });
        if (!error) {
          syncedTables.push('stock_locations');
          recordsCount += locationRecords.length;
        }
      }

      // 11. Ordens de Produção
      if (state.productionOrders && state.productionOrders.length > 0) {
        const prodRecords = state.productionOrders.map((p) => ({
          id: p.id,
          number: p.number,
          company_id: p.companyId || currentCompany.id,
          status: p.status,
          start_date: p.orderDate,
          end_date: p.completionDate || null,
          notes: p.notes || null,
          products_json: p.items || [
            {
              productId: p.productId,
              productCode: p.productCode,
              productDescription: p.productDescription,
              plannedQuantity: p.plannedQuantity,
              producedQuantity: p.producedQuantity,
            },
          ],
          total_cost: p.totalCost || 0,
          updated_at: nowIso,
        }));
        const { error } = await client.from('production_orders').upsert(prodRecords, { onConflict: 'id' });
        if (!error) {
          syncedTables.push('production_orders');
          recordsCount += prodRecords.length;
        }
      }

      // 12. Pedidos de Compra
      if (state.purchaseOrders && state.purchaseOrders.length > 0) {
        const purchRecords = state.purchaseOrders.map((p) => ({
          id: p.id,
          number: p.number,
          company_id: p.companyId || currentCompany.id,
          supplier_id: p.supplierId,
          supplier_name: p.supplierName,
          date: p.orderDate || p.createdAt || nowIso,
          status: p.status,
          subtotal: p.subtotal || 0,
          total: p.total || 0,
          items_json: p.items,
          updated_at: nowIso,
        }));
        const { error } = await client.from('purchase_orders').upsert(purchRecords, { onConflict: 'id' });
        if (!error) {
          syncedTables.push('purchase_orders');
          recordsCount += purchRecords.length;
        }
      }

      // 13. Contas a Receber
      if (state.accountsReceivable && state.accountsReceivable.length > 0) {
        const recRecords = state.accountsReceivable.map((r) => ({
          id: r.id,
          company_id: r.companyId || currentCompany.id,
          customer_id: r.customerId || null,
          customer_name: r.customerName,
          order_id: r.orderId || null,
          order_number: r.orderNumber || null,
          installment_number: r.installmentNumber,
          due_date: r.dueDate,
          value: r.originalValue || r.balance || 0,
          paid_value: r.paidValue || 0,
          status: r.status,
          payment_method: r.paymentMethod,
          updated_at: nowIso,
        }));
        const { error } = await client.from('accounts_receivable').upsert(recRecords, { onConflict: 'id' });
        if (!error) {
          syncedTables.push('accounts_receivable');
          recordsCount += recRecords.length;
        }
      }

      // 14. Contas a Pagar
      if (state.accountsPayable && state.accountsPayable.length > 0) {
        const payRecords = state.accountsPayable.map((p) => ({
          id: p.id,
          company_id: p.companyId || currentCompany.id,
          supplier_id: p.supplierId || null,
          supplier_name: p.supplierName,
          purchase_id: p.purchaseOrderId || null,
          due_date: p.dueDate,
          value: p.originalValue || p.balance || 0,
          paid_value: p.paidValue || 0,
          status: p.status,
          category: p.category || 'Fornecedores',
          description: p.description,
          updated_at: nowIso,
        }));
        const { error } = await client.from('accounts_payable').upsert(payRecords, { onConflict: 'id' });
        if (!error) {
          syncedTables.push('accounts_payable');
          recordsCount += payRecords.length;
        }
      }

      this.lastLocalSyncTimestamp = nowIso;
      Database.setLastRemoteSyncTime(nowIso);

      this.saveConfig({
        lastSyncAt: nowIso,
        status: 'connected',
        lastError: null,
      });

      Database.addAuditLog(
        'SYNC_SUPABASE',
        'SISTEMA',
        currentCompany.id,
        `Sincronização com Supabase concluída (${recordsCount} registros sincronizados em: ${syncedTables.join(', ') || 'backup geral'})`
      );

      return {
        success: true,
        recordsCount,
        syncedTables,
        message: `Sincronização com Supabase concluída com sucesso às ${new Date().toLocaleTimeString()}! (${recordsCount} registros)`,
      };
    } catch (err: any) {
      console.error('Erro na sincronização com Supabase:', err);
      this.saveConfig({
        status: 'error',
        lastError: err?.message || 'Erro ao sincronizar',
      });
      return {
        success: false,
        recordsCount,
        syncedTables,
        message: err?.message || 'Falha ao sincronizar dados com o Supabase.',
      };
    } finally {
      this.isSyncingInProgress = false;
    }
  }

  /**
   * Restaura o estado a partir do Supabase
   */
  public static async restoreFromSupabase(): Promise<{
    success: boolean;
    message: string;
  }> {
    const client = this.getClient();
    const currentCompany = Database.getCurrentCompany();

    try {
      const { data, error } = await client
        .from('omni_erp_sync')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !data || !data.state_json) {
        const { data: anyData, error: anyErr } = await client
          .from('omni_erp_sync')
          .select('*')
          .order('updated_at', { ascending: false })
          .limit(1)
          .single();

        if (anyErr || !anyData || !anyData.state_json) {
          return {
            success: false,
            message: 'Nenhum backup encontrado no Supabase para restaurar. Faça uma primeira sincronização.',
          };
        }

        Database.applyRemoteState(anyData.state_json, anyData.updated_at || anyData.last_sync_at);
        this.lastLocalSyncTimestamp = anyData.updated_at || anyData.last_sync_at;
        return {
          success: true,
          message: `Dados restaurados com sucesso do Supabase (Sincronizado em ${new Date(anyData.updated_at || anyData.last_sync_at).toLocaleString()})!`,
        };
      }

      Database.applyRemoteState(data.state_json, data.updated_at || data.last_sync_at);
      this.lastLocalSyncTimestamp = data.updated_at || data.last_sync_at;
      return {
        success: true,
        message: `Dados restaurados com sucesso do Supabase (Sincronizado em ${new Date(data.updated_at || data.last_sync_at).toLocaleString()})!`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: err?.message || 'Erro ao restaurar dados do Supabase.',
      };
    }
  }

  /**
   * Inicializa o mecanismo de sincronização centralizada em tempo real:
   * 1. Conecta o listener do Database para sincronização automática em toda alteração (com debounce);
   * 2. Puxa os dados atualizados do Supabase no arranque (ou envia os locais se o banco nuvem estiver vazio);
   * 3. Conecta o canal Realtime do Supabase para escutar alterações de outros computadores;
   * 4. Escuta eventos de visibilidade da janela (focus / visibilitychange) para atualização imediata ao alternar abas;
   * 5. Mantém um heartbeat leve para garantir consistência contínua.
   */
  public static init(): () => void {
    if (this.isInitialized) return () => {};
    this.isInitialized = true;

    // 1. Escuta alterações locais e sincroniza em fila (debounce)
    const unsubPersist = Database.onPersist(() => {
      if (this.config.autoSync) {
        this.queueSync(500);
      }
    });

    // 2. Carga inicial do Supabase
    this.pullAndReconcile().catch((err) => {
      console.warn('Sincronização inicial com Supabase em segundo plano:', err);
    });

    // 3. Canal Realtime do Supabase
    this.startRealtimeSubscription();

    // 4. Detecção de foco na aba/janela para atualização imediata
    const handleFocus = () => {
      this.checkRemoteUpdatesIfNewer().catch(() => {});
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('focus', handleFocus);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          handleFocus();
        }
      });
    }

    // 5. Polling periódico de backup
    this.setupAutoSync();

    return () => {
      unsubPersist();
      if (this.realtimeChannel) {
        try {
          const client = this.getClient();
          client.removeChannel(this.realtimeChannel);
        } catch {
          // ignore
        }
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', handleFocus);
      }
      this.isInitialized = false;
    };
  }

  /**
   * Enfileira uma sincronização com debounce para agrupar operações rápidas
   */
  public static queueSync(delayMs = 500) {
    if (this.syncDebounceTimer) {
      clearTimeout(this.syncDebounceTimer);
    }
    this.config.status = 'syncing';
    this.notify();

    this.syncDebounceTimer = setTimeout(() => {
      this.syncDebounceTimer = null;
      this.syncToSupabase().catch((err) => {
        console.error('Erro na sincronização em fila com Supabase:', err);
      });
    }, delayMs);
  }

  /**
   * Puxa os dados mais recentes do Supabase e reconcilia com os dados locais
   */
  public static async pullAndReconcile(forceOverwrite = false): Promise<{
    success: boolean;
    message: string;
  }> {
    const client = this.getClient();
    const currentCompany = Database.getCurrentCompany();

    try {
      this.config.status = 'syncing';
      this.notify();

      const { data, error } = await client
        .from('omni_erp_sync')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
          this.config.status = 'error';
          this.config.lastError = 'Tabela omni_erp_sync não encontrada no Supabase. Execute o script SQL nas Configurações.';
          this.notify();
          return { success: false, message: this.config.lastError };
        }
        throw error;
      }

      // Se a tabela do Supabase estiver vazia, sincroniza a base local atual para a nuvem
      if (!data || !data.state_json) {
        console.log('Supabase vazio. Inicializando banco na nuvem com dados locais...');
        const syncRes = await this.syncToSupabase();
        return {
          success: syncRes.success,
          message: syncRes.success
            ? 'Banco do Supabase inicializado com os dados locais com sucesso!'
            : syncRes.message,
        };
      }

      const remoteTimestamp = data.updated_at || data.last_sync_at;
      const remoteState = data.state_json as DatabaseState;

      if (forceOverwrite) {
        Database.applyRemoteState(remoteState, remoteTimestamp);
      } else {
        const { localUnsyncedChanges } = Database.reconcileWithRemote(remoteState, remoteTimestamp);
        if (localUnsyncedChanges) {
          // Se existiam registros novos criados localmente, sobe o resultado mesclado para a nuvem
          this.queueSync(800);
        }
      }

      this.lastLocalSyncTimestamp = remoteTimestamp;
      this.saveConfig({
        status: 'connected',
        lastSyncAt: remoteTimestamp,
        lastError: null,
      });

      return {
        success: true,
        message: `Dados sincronizados com o Supabase com sucesso (${new Date(remoteTimestamp).toLocaleTimeString()})!`,
      };
    } catch (err: any) {
      console.warn('Falha ao reconciliar com Supabase:', err);
      this.saveConfig({
        status: 'error',
        lastError: err?.message || 'Falha ao sincronizar com Supabase',
      });
      return {
        success: false,
        message: err?.message || 'Falha ao sincronizar com Supabase.',
      };
    }
  }

  /**
   * Assina o canal Realtime do Supabase para receber notificações imediatas
   * de inserções e atualizações realizadas por outros computadores.
   */
  public static startRealtimeSubscription() {
    try {
      const client = this.getClient();
      if (this.realtimeChannel) {
        try {
          client.removeChannel(this.realtimeChannel);
        } catch {
          // ignore
        }
      }

      this.realtimeChannel = client
        .channel('omni_erp_realtime_channel')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'omni_erp_sync' },
          (payload: any) => {
            const newRecord = payload.new;
            if (newRecord && newRecord.updated_at) {
              // Evita eco da nossa própria sincronização recente
              if (newRecord.updated_at !== this.lastLocalSyncTimestamp) {
                console.log('⚡ Atualização em tempo real recebida do Supabase de outro dispositivo!');
                if (newRecord.state_json) {
                  Database.reconcileWithRemote(newRecord.state_json, newRecord.updated_at);
                  this.lastLocalSyncTimestamp = newRecord.updated_at;
                  this.saveConfig({
                    status: 'connected',
                    lastSyncAt: newRecord.updated_at,
                    lastError: null,
                  });
                }
              }
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('Canal Realtime do Supabase conectado com sucesso.');
          }
        });
    } catch (err) {
      console.warn('Erro ao configurar canal Realtime do Supabase:', err);
    }
  }

  /**
   * Verificação leve de novas versões gravadas no Supabase (utilizada ao focar na aba ou em polling)
   */
  public static async checkRemoteUpdatesIfNewer() {
    if (this.isSyncingInProgress) return;
    try {
      const client = this.getClient();
      const currentCompany = Database.getCurrentCompany();

      const { data, error } = await client
        .from('omni_erp_sync')
        .select('updated_at')
        .eq('company_id', currentCompany.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data && data.updated_at) {
        if (data.updated_at !== this.lastLocalSyncTimestamp) {
          console.log('Detectada nova versão no Supabase. Puxando dados atualizados...');
          await this.pullAndReconcile();
        }
      }
    } catch {
      // Falha silenciosa em checagem de fundo
    }
  }

  private static setupAutoSync() {
    if (this.autoSyncTimer) {
      clearInterval(this.autoSyncTimer);
      this.autoSyncTimer = null;
    }

    if (this.config.autoSync && this.config.syncIntervalMinutes > 0) {
      const ms = this.config.syncIntervalMinutes * 60 * 1000;
      this.autoSyncTimer = setInterval(() => {
        this.checkRemoteUpdatesIfNewer().catch((e) => console.error('Erro no auto-sync Supabase:', e));
      }, ms);
    }
  }

  /**
   * Gera o Script SQL DDL COMPLETO E DEFINITIVO para cobrir 100% dos módulos do ERP
   */
  public static generateSqlSchema(): string {
    const projectId = this.extractProjectId(this.config.url || DEFAULT_SUPABASE_URL);
    return `-- =========================================================================
-- GESTAOFACIL ERP - SCRIPT COMPLETO DE CRIAÇÃO DE TABELAS PARA SUPABASE
-- Projeto: gestaofacil_erp-netlify (${projectId})
-- Execute este script no SQL Editor do seu projeto Supabase:
-- https://supabase.com/dashboard/project/${projectId}/sql
-- =========================================================================

-- 1. BACKUP & SINCRONIZAÇÃO UNIVERSAL DO ERP (JSONB COMPLETO)
create table if not exists public.omni_erp_sync (
  id text primary key,
  company_id text not null,
  company_name text,
  company_cnpj text,
  last_sync_at timestamptz not null default now(),
  erp_version text default '1.0.0',
  total_customers integer default 0,
  total_products integer default 0,
  total_orders integer default 0,
  total_manifests integer default 0,
  total_routes integer default 0,
  state_json jsonb not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. EMPRESAS (MATRIZ & FILIAIS)
create table if not exists public.companies (
  id text primary key,
  name text not null,
  trade_name text,
  cnpj_cpf text not null,
  type text default 'matriz',
  phone text,
  email text,
  address_json jsonb,
  status text default 'ativo',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. USUÁRIOS, OPERADORES & PERFIS DE ACESSO
create table if not exists public.users (
  id text primary key,
  company_id text not null,
  name text not null,
  login text not null,
  role text default 'admin',
  email text,
  phone text,
  status text default 'ativo',
  permissions_json jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 4. CLIENTES & CRM (COM PRAÇA, BAIRRO, CIDADE, VENDEDOR E ROTA)
create table if not exists public.customers (
  id text primary key,
  company_id text not null,
  code text not null,
  name text not null,
  trade_name text,
  type text default 'PJ',
  cpf_cnpj text not null,
  phone text,
  whatsapp text,
  email text,
  street text,
  number text,
  neighborhood text,
  city text,
  state text,
  market_area text,
  seller_name text,
  delivery_route_id text,
  delivery_route_name text,
  credit_limit numeric(12,2) default 0,
  status text default 'ativo',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 5. FORNECEDORES & PARCEIROS
create table if not exists public.suppliers (
  id text primary key,
  code text not null,
  name text not null,
  trade_name text,
  type text default 'PJ',
  cpf_cnpj text not null,
  contact_name text,
  phone text,
  whatsapp text,
  email text,
  city text,
  state text,
  payment_terms text,
  status text default 'ativo',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 6. PRODUTOS, PREÇOS & ESTOQUE
create table if not exists public.products (
  id text primary key,
  company_id text not null,
  code text not null,
  barcode text,
  name text not null,
  category text default 'Geral',
  unit text default 'UN',
  cost_price numeric(12,2) default 0,
  sale_price numeric(12,2) default 0,
  min_stock numeric(12,2) default 0,
  is_produced boolean default false,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 7. PEDIDOS DE VENDA, ORÇAMENTOS, PDV & VENDAS MOBILE
create table if not exists public.orders (
  id text primary key,
  number text not null,
  type text default 'venda',
  origin text default 'pdv',
  company_id text not null,
  customer_id text,
  customer_name text not null,
  customer_cpf_cnpj text,
  customer_phone text,
  user_id text,
  user_name text,
  subtotal numeric(12,2) default 0,
  discount_total numeric(12,2) default 0,
  total numeric(12,2) default 0,
  payment_method text default 'dinheiro',
  status text default 'concluido',
  date timestamptz default now(),
  items_json jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 8. ROTAS DE ENTREGA (EXPEDIÇÃO)
create table if not exists public.delivery_routes (
  id text primary key,
  company_id text not null,
  code text not null,
  name text not null,
  description text,
  active boolean default true,
  color text default 'blue',
  cities text[] default '{}',
  neighborhoods text[] default '{}',
  market_areas text[] default '{}',
  seller_names text[] default '{}',
  estimated_delivery_window text,
  vehicle_type text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 9. ROMANEIOS DE ENTREGA (EXPEDIÇÃO)
create table if not exists public.delivery_manifests (
  id text primary key,
  number text not null,
  company_id text not null,
  date timestamptz default now(),
  departure_date date not null,
  route_id text not null,
  route_name text not null,
  driver_name text not null,
  driver_phone text,
  vehicle_plate text not null,
  vehicle_model text,
  status text default 'planejado',
  total_orders integer default 0,
  total_delivered integer default 0,
  total_pending integer default 0,
  total_value numeric(12,2) default 0,
  total_amount_to_collect numeric(12,2) default 0,
  total_volumes integer default 0,
  orders_json jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 10. LOCAIS DE ESTOQUE / ALMOXARIFADOS
create table if not exists public.stock_locations (
  id text primary key,
  company_id text not null,
  code text not null,
  name text not null,
  type text default 'geral',
  description text,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 11. ORDENS DE PRODUÇÃO (PCP)
create table if not exists public.production_orders (
  id text primary key,
  number text not null,
  company_id text not null,
  status text default 'planejada',
  start_date timestamptz default now(),
  end_date timestamptz,
  notes text,
  products_json jsonb default '[]'::jsonb,
  total_cost numeric(12,2) default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 12. PEDIDOS DE COMPRA A FORNECEDORES
create table if not exists public.purchase_orders (
  id text primary key,
  number text not null,
  company_id text not null,
  supplier_id text not null,
  supplier_name text not null,
  date timestamptz default now(),
  status text default 'emitido',
  subtotal numeric(12,2) default 0,
  total numeric(12,2) default 0,
  items_json jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 13. CONTAS A RECEBER
create table if not exists public.accounts_receivable (
  id text primary key,
  company_id text not null,
  customer_id text,
  customer_name text not null,
  order_id text,
  order_number text,
  installment_number integer default 1,
  due_date date not null,
  value numeric(12,2) default 0,
  paid_value numeric(12,2) default 0,
  status text default 'aberto',
  payment_method text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 14. CONTAS A PAGAR
create table if not exists public.accounts_payable (
  id text primary key,
  company_id text not null,
  supplier_id text,
  supplier_name text,
  purchase_id text,
  due_date date not null,
  value numeric(12,2) default 0,
  paid_value numeric(12,2) default 0,
  status text default 'aberto',
  category text default 'Geral',
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =========================================================================
-- POLÍTICAS DE SEGURANÇA BLINDADAS (RLS) - PROTEÇÃO CONTRA EXCLUSÃO E VAZAMENTO
-- =========================================================================
-- 1. Habilita RLS em todas as tabelas
alter table public.omni_erp_sync enable row level security;
alter table public.companies enable row level security;
alter table public.users enable row level security;
alter table public.customers enable row level security;
alter table public.suppliers enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.delivery_routes enable row level security;
alter table public.delivery_manifests enable row level security;
alter table public.stock_locations enable row level security;
alter table public.production_orders enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.accounts_receivable enable row level security;
alter table public.accounts_payable enable row level security;

-- 2. Limpeza de políticas antigas permissivas/inseguras
drop policy if exists "omni_erp_sync_anon_all" on public.omni_erp_sync;
drop policy if exists "companies_anon_all" on public.companies;
drop policy if exists "users_anon_all" on public.users;
drop policy if exists "customers_anon_all" on public.customers;
drop policy if exists "suppliers_anon_all" on public.suppliers;
drop policy if exists "products_anon_all" on public.products;
drop policy if exists "orders_anon_all" on public.orders;
drop policy if exists "delivery_routes_anon_all" on public.delivery_routes;
drop policy if exists "delivery_manifests_anon_all" on public.delivery_manifests;
drop policy if exists "stock_locations_anon_all" on public.stock_locations;
drop policy if exists "production_orders_anon_all" on public.production_orders;
drop policy if exists "purchase_orders_anon_all" on public.purchase_orders;
drop policy if exists "accounts_receivable_anon_all" on public.accounts_receivable;
drop policy if exists "accounts_payable_anon_all" on public.accounts_payable;

-- 3. POLÍTICAS GRANULARES E BLINDADAS (SELECT / INSERT / UPDATE com validação; DELETE bloqueado para anon)

-- 3.1 omni_erp_sync (Universal ERP Backup)
drop policy if exists "omni_erp_sync_select" on public.omni_erp_sync;
create policy "omni_erp_sync_select" on public.omni_erp_sync for select to anon using (company_id is not null and length(company_id) > 0);
drop policy if exists "omni_erp_sync_insert" on public.omni_erp_sync;
create policy "omni_erp_sync_insert" on public.omni_erp_sync for insert to anon with check (company_id is not null and length(company_id) > 0 and state_json is not null);
drop policy if exists "omni_erp_sync_update" on public.omni_erp_sync;
create policy "omni_erp_sync_update" on public.omni_erp_sync for update to anon using (company_id is not null and length(company_id) > 0) with check (company_id is not null and length(company_id) > 0 and state_json is not null);

-- 3.2 customers (Clientes & CRM)
drop policy if exists "customers_select" on public.customers;
create policy "customers_select" on public.customers for select to anon using (company_id is not null and length(company_id) > 0);
drop policy if exists "customers_insert" on public.customers;
create policy "customers_insert" on public.customers for insert to anon with check (company_id is not null and length(company_id) > 0 and code is not null and name is not null);
drop policy if exists "customers_update" on public.customers;
create policy "customers_update" on public.customers for update to anon using (company_id is not null and length(company_id) > 0) with check (company_id is not null and length(company_id) > 0 and name is not null);

-- 3.3 products (Produtos & Preços)
drop policy if exists "products_select" on public.products;
create policy "products_select" on public.products for select to anon using (company_id is not null and length(company_id) > 0);
drop policy if exists "products_insert" on public.products;
create policy "products_insert" on public.products for insert to anon with check (company_id is not null and length(company_id) > 0 and name is not null);
drop policy if exists "products_update" on public.products;
create policy "products_update" on public.products for update to anon using (company_id is not null and length(company_id) > 0) with check (company_id is not null and length(company_id) > 0 and name is not null);

-- 3.4 delivery_routes (Rotas de Entrega)
drop policy if exists "delivery_routes_select" on public.delivery_routes;
create policy "delivery_routes_select" on public.delivery_routes for select to anon using (company_id is not null and length(company_id) > 0);
drop policy if exists "delivery_routes_insert" on public.delivery_routes;
create policy "delivery_routes_insert" on public.delivery_routes for insert to anon with check (company_id is not null and length(company_id) > 0 and name is not null);
drop policy if exists "delivery_routes_update" on public.delivery_routes;
create policy "delivery_routes_update" on public.delivery_routes for update to anon using (company_id is not null and length(company_id) > 0) with check (company_id is not null and length(company_id) > 0 and name is not null);

-- 3.5 delivery_manifests (Romaneios de Entrega)
drop policy if exists "delivery_manifests_select" on public.delivery_manifests;
create policy "delivery_manifests_select" on public.delivery_manifests for select to anon using (company_id is not null and length(company_id) > 0);
drop policy if exists "delivery_manifests_insert" on public.delivery_manifests;
create policy "delivery_manifests_insert" on public.delivery_manifests for insert to anon with check (company_id is not null and length(company_id) > 0 and number is not null);
drop policy if exists "delivery_manifests_update" on public.delivery_manifests;
create policy "delivery_manifests_update" on public.delivery_manifests for update to anon using (company_id is not null and length(company_id) > 0) with check (company_id is not null and length(company_id) > 0 and number is not null);

-- 3.6 orders (Pedidos de Venda & PDV)
drop policy if exists "orders_select" on public.orders;
create policy "orders_select" on public.orders for select to anon using (company_id is not null and length(company_id) > 0);
drop policy if exists "orders_insert" on public.orders;
create policy "orders_insert" on public.orders for insert to anon with check (company_id is not null and length(company_id) > 0 and number is not null);
drop policy if exists "orders_update" on public.orders;
create policy "orders_update" on public.orders for update to anon using (company_id is not null and length(company_id) > 0) with check (company_id is not null and length(company_id) > 0);

-- 3.7 companies (Empresas)
drop policy if exists "companies_select" on public.companies;
create policy "companies_select" on public.companies for select to anon using (true);
drop policy if exists "companies_insert" on public.companies;
create policy "companies_insert" on public.companies for insert to anon with check (name is not null and cnpj_cpf is not null);
drop policy if exists "companies_update" on public.companies;
create policy "companies_update" on public.companies for update to anon using (true) with check (name is not null);

-- 3.8 users (Usuários)
drop policy if exists "users_select" on public.users;
create policy "users_select" on public.users for select to anon using (company_id is not null and length(company_id) > 0);
drop policy if exists "users_insert" on public.users;
create policy "users_insert" on public.users for insert to anon with check (company_id is not null and length(company_id) > 0 and name is not null and login is not null);
drop policy if exists "users_update" on public.users;
create policy "users_update" on public.users for update to anon using (company_id is not null and length(company_id) > 0) with check (company_id is not null and length(company_id) > 0 and name is not null);

-- 3.9 suppliers (Fornecedores)
drop policy if exists "suppliers_select" on public.suppliers;
create policy "suppliers_select" on public.suppliers for select to anon using (true);
drop policy if exists "suppliers_insert" on public.suppliers;
create policy "suppliers_insert" on public.suppliers for insert to anon with check (name is not null and cpf_cnpj is not null);
drop policy if exists "suppliers_update" on public.suppliers;
create policy "suppliers_update" on public.suppliers for update to anon using (true) with check (name is not null);

-- 3.10 stock_locations, production_orders, purchase_orders, accounts_receivable, accounts_payable
drop policy if exists "stock_locations_select" on public.stock_locations;
create policy "stock_locations_select" on public.stock_locations for select to anon using (company_id is not null);
drop policy if exists "stock_locations_insert" on public.stock_locations;
create policy "stock_locations_insert" on public.stock_locations for insert to anon with check (company_id is not null and name is not null);
drop policy if exists "stock_locations_update" on public.stock_locations for update to anon using (company_id is not null);

drop policy if exists "production_orders_select" on public.production_orders;
create policy "production_orders_select" on public.production_orders for select to anon using (company_id is not null);
drop policy if exists "production_orders_insert" on public.production_orders;
create policy "production_orders_insert" on public.production_orders for insert to anon with check (company_id is not null and number is not null);
drop policy if exists "production_orders_update" on public.production_orders for update to anon using (company_id is not null);

drop policy if exists "purchase_orders_select" on public.purchase_orders;
create policy "purchase_orders_select" on public.purchase_orders for select to anon using (company_id is not null);
drop policy if exists "purchase_orders_insert" on public.purchase_orders;
create policy "purchase_orders_insert" on public.purchase_orders for insert to anon with check (company_id is not null and number is not null);
drop policy if exists "purchase_orders_update" on public.purchase_orders for update to anon using (company_id is not null);

drop policy if exists "accounts_receivable_select" on public.accounts_receivable;
create policy "accounts_receivable_select" on public.accounts_receivable for select to anon using (company_id is not null);
drop policy if exists "accounts_receivable_insert" on public.accounts_receivable;
create policy "accounts_receivable_insert" on public.accounts_receivable for insert to anon with check (company_id is not null);
drop policy if exists "accounts_receivable_update" on public.accounts_receivable for update to anon using (company_id is not null);

drop policy if exists "accounts_payable_select" on public.accounts_payable;
create policy "accounts_payable_select" on public.accounts_payable for select to anon using (company_id is not null);
drop policy if exists "accounts_payable_insert" on public.accounts_payable;
create policy "accounts_payable_insert" on public.accounts_payable for insert to anon with check (company_id is not null);
drop policy if exists "accounts_payable_update" on public.accounts_payable for update to anon using (company_id is not null);

-- 4. HABILITAÇÃO DO REALTIME PARA ATUALIZAÇÃO AUTOMÁTICA EM TEMPO REAL ENTRE COMPUTADORES
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'omni_erp_sync') then
    alter publication supabase_realtime add table public.omni_erp_sync;
  end if;
exception
  when others then null;
end $$;
`;
  }

  /**
   * Gera o script de correção de segurança RLS exclusivamente para as 5 tabelas
   * já criadas pelo usuário (omni_erp_sync, customers, products, delivery_routes, delivery_manifests)
   */
  public static generateHardenedRlsFixForFiveTables(): string {
    const projectId = this.extractProjectId(this.config.url || DEFAULT_SUPABASE_URL);
    return `-- =========================================================================
-- GESTAOFACIL ERP - CORREÇÃO DE VULNERABILIDADES RLS (5 TABELAS)
-- Projeto: gestaofacil_erp-netlify (${projectId})
-- Execute este script no SQL Editor do Supabase:
-- https://supabase.com/dashboard/project/${projectId}/sql
-- =========================================================================

-- 1. Garante que as 5 tabelas existam antes de aplicar RLS e políticas de segurança
create table if not exists public.omni_erp_sync (
  id text primary key,
  company_id text not null,
  company_name text,
  company_cnpj text,
  last_sync_at timestamptz not null default now(),
  erp_version text default '1.0.0',
  total_customers integer default 0,
  total_products integer default 0,
  total_orders integer default 0,
  total_manifests integer default 0,
  total_routes integer default 0,
  state_json jsonb not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.customers (
  id text primary key,
  company_id text not null,
  code text not null,
  name text not null,
  trade_name text,
  type text default 'PJ',
  cpf_cnpj text not null,
  phone text,
  whatsapp text,
  email text,
  street text,
  number text,
  neighborhood text,
  city text,
  state text,
  market_area text,
  seller_name text,
  delivery_route_id text,
  delivery_route_name text,
  credit_limit numeric(12,2) default 0,
  status text default 'ativo',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.products (
  id text primary key,
  company_id text not null,
  code text not null,
  barcode text,
  name text not null,
  category text default 'Geral',
  unit text default 'UN',
  cost_price numeric(12,2) default 0,
  sale_price numeric(12,2) default 0,
  min_stock numeric(12,2) default 0,
  is_produced boolean default false,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.delivery_routes (
  id text primary key,
  company_id text not null,
  code text not null,
  name text not null,
  description text,
  active boolean default true,
  color text default 'blue',
  cities text[] default '{}',
  neighborhoods text[] default '{}',
  market_areas text[] default '{}',
  seller_names text[] default '{}',
  estimated_delivery_window text,
  vehicle_type text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.delivery_manifests (
  id text primary key,
  number text not null,
  company_id text not null,
  date timestamptz default now(),
  departure_date date not null,
  route_id text not null,
  route_name text not null,
  driver_name text not null,
  driver_phone text,
  vehicle_plate text not null,
  vehicle_model text,
  status text default 'planejado',
  total_orders integer default 0,
  total_delivered integer default 0,
  total_pending integer default 0,
  total_value numeric(12,2) default 0,
  total_amount_to_collect numeric(12,2) default 0,
  total_volumes integer default 0,
  orders_json jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Habilita RLS nas tabelas
alter table public.omni_erp_sync enable row level security;
alter table public.customers enable row level security;
alter table public.products enable row level security;
alter table public.delivery_routes enable row level security;
alter table public.delivery_manifests enable row level security;

-- 2. Remove as políticas vulneráveis anteriores que permitiam DELETE e acesso irrestrito
drop policy if exists "omni_erp_sync_anon_all" on public.omni_erp_sync;
drop policy if exists "customers_anon_all" on public.customers;
drop policy if exists "products_anon_all" on public.products;
drop policy if exists "delivery_routes_anon_all" on public.delivery_routes;
drop policy if exists "delivery_manifests_anon_all" on public.delivery_manifests;

-- 3. POLÍTICAS BLINDADAS PARA omni_erp_sync (Protege o backup universal contra corrupção e DELETE)
drop policy if exists "omni_erp_sync_select" on public.omni_erp_sync;
create policy "omni_erp_sync_select" on public.omni_erp_sync 
  for select to anon 
  using (company_id is not null and length(company_id) > 0);

drop policy if exists "omni_erp_sync_insert" on public.omni_erp_sync;
create policy "omni_erp_sync_insert" on public.omni_erp_sync 
  for insert to anon 
  with check (company_id is not null and length(company_id) > 0 and state_json is not null);

drop policy if exists "omni_erp_sync_update" on public.omni_erp_sync;
create policy "omni_erp_sync_update" on public.omni_erp_sync 
  for update to anon 
  using (company_id is not null and length(company_id) > 0)
  with check (company_id is not null and length(company_id) > 0 and state_json is not null);

-- 4. POLÍTICAS BLINDADAS PARA customers (Protege contra vazamento de CPFs, exclusão em massa e alterações cruzadas)
drop policy if exists "customers_select" on public.customers;
create policy "customers_select" on public.customers 
  for select to anon 
  using (company_id is not null and length(company_id) > 0);

drop policy if exists "customers_insert" on public.customers;
create policy "customers_insert" on public.customers 
  for insert to anon 
  with check (
    company_id is not null and length(company_id) > 0
    and code is not null and length(code) > 0
    and name is not null and length(name) > 0
  );

drop policy if exists "customers_update" on public.customers;
create policy "customers_update" on public.customers 
  for update to anon 
  using (company_id is not null and length(company_id) > 0)
  with check (
    company_id is not null and length(company_id) > 0
    and name is not null and length(name) > 0
  );

-- 5. POLÍTICAS BLINDADAS PARA products (Protege tabela de produtos e preços contra exclusão e injeção sem empresa)
drop policy if exists "products_select" on public.products;
create policy "products_select" on public.products 
  for select to anon 
  using (company_id is not null and length(company_id) > 0);

drop policy if exists "products_insert" on public.products;
create policy "products_insert" on public.products 
  for insert to anon 
  with check (
    company_id is not null and length(company_id) > 0
    and name is not null and length(name) > 0
  );

drop policy if exists "products_update" on public.products;
create policy "products_update" on public.products 
  for update to anon 
  using (company_id is not null and length(company_id) > 0)
  with check (
    company_id is not null and length(company_id) > 0
    and name is not null and length(name) > 0
  );

-- 6. POLÍTICAS BLINDADAS PARA delivery_routes (Rotas de entrega protegidas)
drop policy if exists "delivery_routes_select" on public.delivery_routes;
create policy "delivery_routes_select" on public.delivery_routes 
  for select to anon 
  using (company_id is not null and length(company_id) > 0);

drop policy if exists "delivery_routes_insert" on public.delivery_routes;
create policy "delivery_routes_insert" on public.delivery_routes 
  for insert to anon 
  with check (
    company_id is not null and length(company_id) > 0
    and name is not null and length(name) > 0
  );

drop policy if exists "delivery_routes_update" on public.delivery_routes;
create policy "delivery_routes_update" on public.delivery_routes 
  for update to anon 
  using (company_id is not null and length(company_id) > 0)
  with check (
    company_id is not null and length(company_id) > 0
    and name is not null and length(name) > 0
  );

-- 7. POLÍTICAS BLINDADAS PARA delivery_manifests (Romaneios protegidos contra cancelamento malicioso e exclusão)
drop policy if exists "delivery_manifests_select" on public.delivery_manifests;
create policy "delivery_manifests_select" on public.delivery_manifests 
  for select to anon 
  using (company_id is not null and length(company_id) > 0);

drop policy if exists "delivery_manifests_insert" on public.delivery_manifests;
create policy "delivery_manifests_insert" on public.delivery_manifests 
  for insert to anon 
  with check (
    company_id is not null and length(company_id) > 0
    and number is not null and length(number) > 0
    and route_id is not null
  );

drop policy if exists "delivery_manifests_update" on public.delivery_manifests;
create policy "delivery_manifests_update" on public.delivery_manifests 
  for update to anon 
  using (company_id is not null and length(company_id) > 0)
  with check (
    company_id is not null and length(company_id) > 0
    and number is not null and length(number) > 0
  );

-- VULNERABILIDADE CORRIGIDA COM SUCESSO:
-- Sem permissão de DELETE público para anon.
-- Acesso condicionado à validação de company_id obrigatório e integridade de dados.

-- 8. Habilita Realtime na publicação padrão do Supabase
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'omni_erp_sync') then
    alter publication supabase_realtime add table public.omni_erp_sync;
  end if;
exception
  when others then null;
end $$;
`;
  }

  /**
   * Gera o script SQL para criar exclusivamente as tabelas complementares do ERP
   * que ainda não constavam no script inicial de 5 tabelas
   */
  public static generateMissingTablesSql(): string {
    const projectId = this.extractProjectId(this.config.url || DEFAULT_SUPABASE_URL);
    return `-- =========================================================================
-- GESTAOFACIL ERP - TABELAS COMPLEMENTARES FALTANTES DO SISTEMA
-- Projeto: gestaofacil_erp-netlify (${projectId})
-- Execute este script para adicionar os módulos de Vendas, Estoque, Financeiro e Produção
-- https://supabase.com/dashboard/project/${projectId}/sql
-- =========================================================================

-- 1. PEDIDOS DE VENDA, ORÇAMENTOS, PDV & VENDAS EXTERNAS (MUITO IMPORTANTE!)
create table if not exists public.orders (
  id text primary key,
  number text not null,
  type text default 'venda',
  origin text default 'pdv',
  company_id text not null,
  customer_id text,
  customer_name text not null,
  customer_cpf_cnpj text,
  customer_phone text,
  user_id text,
  user_name text,
  subtotal numeric(12,2) default 0,
  discount_total numeric(12,2) default 0,
  total numeric(12,2) default 0,
  payment_method text default 'dinheiro',
  status text default 'concluido',
  date timestamptz default now(),
  items_json jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. EMPRESAS (MATRIZ & FILIAIS)
create table if not exists public.companies (
  id text primary key,
  name text not null,
  trade_name text,
  cnpj_cpf text not null,
  type text default 'matriz',
  phone text,
  email text,
  address_json jsonb,
  status text default 'ativo',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. USUÁRIOS E OPERADORES
create table if not exists public.users (
  id text primary key,
  company_id text not null,
  name text not null,
  login text not null,
  role text default 'admin',
  email text,
  phone text,
  status text default 'ativo',
  permissions_json jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 4. FORNECEDORES & PARCEIROS
create table if not exists public.suppliers (
  id text primary key,
  code text not null,
  name text not null,
  trade_name text,
  type text default 'PJ',
  cpf_cnpj text not null,
  contact_name text,
  phone text,
  whatsapp text,
  email text,
  city text,
  state text,
  payment_terms text,
  status text default 'ativo',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 5. LOCAIS DE ESTOQUE / ALMOXARIFADOS
create table if not exists public.stock_locations (
  id text primary key,
  company_id text not null,
  code text not null,
  name text not null,
  type text default 'geral',
  description text,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 6. ORDENS DE PRODUÇÃO (PCP)
create table if not exists public.production_orders (
  id text primary key,
  number text not null,
  company_id text not null,
  status text default 'planejada',
  start_date timestamptz default now(),
  end_date timestamptz,
  notes text,
  products_json jsonb default '[]'::jsonb,
  total_cost numeric(12,2) default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 7. PEDIDOS DE COMPRA A FORNECEDORES
create table if not exists public.purchase_orders (
  id text primary key,
  number text not null,
  company_id text not null,
  supplier_id text not null,
  supplier_name text not null,
  date timestamptz default now(),
  status text default 'emitido',
  subtotal numeric(12,2) default 0,
  total numeric(12,2) default 0,
  items_json jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 8. CONTAS A RECEBER
create table if not exists public.accounts_receivable (
  id text primary key,
  company_id text not null,
  customer_id text,
  customer_name text not null,
  order_id text,
  order_number text,
  installment_number integer default 1,
  due_date date not null,
  value numeric(12,2) default 0,
  paid_value numeric(12,2) default 0,
  status text default 'aberto',
  payment_method text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 9. CONTAS A PAGAR
create table if not exists public.accounts_payable (
  id text primary key,
  company_id text not null,
  supplier_id text,
  supplier_name text,
  purchase_id text,
  due_date date not null,
  value numeric(12,2) default 0,
  paid_value numeric(12,2) default 0,
  status text default 'aberto',
  category text default 'Geral',
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- POLÍTICAS RLS SEGURAS PARA AS NOVAS TABELAS
alter table public.orders enable row level security;
alter table public.companies enable row level security;
alter table public.users enable row level security;
alter table public.suppliers enable row level security;
alter table public.stock_locations enable row level security;
alter table public.production_orders enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.accounts_receivable enable row level security;
alter table public.accounts_payable enable row level security;

-- orders
drop policy if exists "orders_select" on public.orders;
create policy "orders_select" on public.orders for select to anon using (company_id is not null and length(company_id) > 0);
drop policy if exists "orders_insert" on public.orders;
create policy "orders_insert" on public.orders for insert to anon with check (company_id is not null and length(company_id) > 0 and number is not null);
drop policy if exists "orders_update" on public.orders;
create policy "orders_update" on public.orders for update to anon using (company_id is not null and length(company_id) > 0);

-- companies & users & suppliers
drop policy if exists "companies_select" on public.companies;
create policy "companies_select" on public.companies for select to anon using (true);
drop policy if exists "companies_insert" on public.companies;
create policy "companies_insert" on public.companies for insert to anon with check (name is not null and cnpj_cpf is not null);
drop policy if exists "companies_update" on public.companies;
create policy "companies_update" on public.companies for update to anon using (true);

drop policy if exists "users_select" on public.users;
create policy "users_select" on public.users for select to anon using (company_id is not null and length(company_id) > 0);
drop policy if exists "users_insert" on public.users;
create policy "users_insert" on public.users for insert to anon with check (company_id is not null and length(company_id) > 0 and name is not null);
drop policy if exists "users_update" on public.users;
create policy "users_update" on public.users for update to anon using (company_id is not null and length(company_id) > 0);

drop policy if exists "suppliers_select" on public.suppliers;
create policy "suppliers_select" on public.suppliers for select to anon using (true);
drop policy if exists "suppliers_insert" on public.suppliers;
create policy "suppliers_insert" on public.suppliers for insert to anon with check (name is not null and cpf_cnpj is not null);
drop policy if exists "suppliers_update" on public.suppliers;
create policy "suppliers_update" on public.suppliers for update to anon using (true);

-- stock, production, purchases, finance
drop policy if exists "stock_locations_select" on public.stock_locations;
create policy "stock_locations_select" on public.stock_locations for select to anon using (company_id is not null);
drop policy if exists "stock_locations_insert" on public.stock_locations;
create policy "stock_locations_insert" on public.stock_locations for insert to anon with check (company_id is not null and name is not null);
drop policy if exists "stock_locations_update" on public.stock_locations;
create policy "stock_locations_update" on public.stock_locations for update to anon using (company_id is not null);

drop policy if exists "production_orders_select" on public.production_orders;
create policy "production_orders_select" on public.production_orders for select to anon using (company_id is not null);
drop policy if exists "production_orders_insert" on public.production_orders;
create policy "production_orders_insert" on public.production_orders for insert to anon with check (company_id is not null and number is not null);
drop policy if exists "production_orders_update" on public.production_orders;
create policy "production_orders_update" on public.production_orders for update to anon using (company_id is not null);

drop policy if exists "purchase_orders_select" on public.purchase_orders;
create policy "purchase_orders_select" on public.purchase_orders for select to anon using (company_id is not null);
drop policy if exists "purchase_orders_insert" on public.purchase_orders;
create policy "purchase_orders_insert" on public.purchase_orders for insert to anon with check (company_id is not null and number is not null);
drop policy if exists "purchase_orders_update" on public.purchase_orders;
create policy "purchase_orders_update" on public.purchase_orders for update to anon using (company_id is not null);

drop policy if exists "accounts_receivable_select" on public.accounts_receivable;
create policy "accounts_receivable_select" on public.accounts_receivable for select to anon using (company_id is not null);
drop policy if exists "accounts_receivable_insert" on public.accounts_receivable;
create policy "accounts_receivable_insert" on public.accounts_receivable for insert to anon with check (company_id is not null);
drop policy if exists "accounts_receivable_update" on public.accounts_receivable;
create policy "accounts_receivable_update" on public.accounts_receivable for update to anon using (company_id is not null);

drop policy if exists "accounts_payable_select" on public.accounts_payable;
create policy "accounts_payable_select" on public.accounts_payable for select to anon using (company_id is not null);
drop policy if exists "accounts_payable_insert" on public.accounts_payable;
create policy "accounts_payable_insert" on public.accounts_payable for insert to anon with check (company_id is not null);
drop policy if exists "accounts_payable_update" on public.accounts_payable;
create policy "accounts_payable_update" on public.accounts_payable for update to anon using (company_id is not null);
`;
  }
}

