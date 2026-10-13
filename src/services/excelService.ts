/**
 * Serviço de Importação e Exportação de Planilhas Excel (.xlsx e .xls)
 * Utiliza SheetJS (xlsx) para leitura e escrita nativa nos formatos do Excel.
 */

import * as XLSX from 'xlsx';
import { Customer, Supplier, Product, StockLocation, UnitOfMeasure } from '../types';

export interface ValidationIssue {
  rowNumber: number;
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ImportPreview<T> {
  validRows: T[];
  invalidRows: { rowNumber: number; data: any; issues: ValidationIssue[] }[];
  summary: {
    totalRows: number;
    validCount: number;
    invalidCount: number;
    toInsertCount: number;
    toUpdateCount: number;
  };
}

export class ExcelService {
  /**
   * Baixa um arquivo Excel (.xlsx) no navegador
   */
  public static downloadExcel(workbook: XLSX.WorkBook, fileName: string) {
    const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Lê um arquivo Excel (.xlsx ou .xls) enviado pelo usuário
   */
  public static async parseExcelFile(file: File): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const json = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
          resolve(json);
        } catch (error) {
          reject(new Error('Erro ao processar o arquivo Excel: ' + (error as Error).message));
        }
      };
      reader.onerror = () => reject(new Error('Falha na leitura do arquivo'));
      reader.readAsArrayBuffer(file);
    });
  }

  // ==========================================
  // MODELOS OFICIAIS PARA DOWNLOAD
  // ==========================================

  public static generateCustomerTemplate(): XLSX.WorkBook {
    const wb = XLSX.utils.book_new();

    const data = [
      {
        'Codigo': 'CLI-001',
        'Nome_RazaoSocial': 'Supermercado Nova Era Ltda',
        'NomeFantasia': 'Nova Era Express',
        'Tipo': 'PJ',
        'CPF_CNPJ': '12.345.678/0001-90',
        'Telefone': '(11) 3222-1000',
        'WhatsApp': '(11) 98765-4321',
        'Email': 'contato@novaera.com.br',
        'CEP': '01001-000',
        'Logradouro': 'Praça da Sé',
        'Numero': '100',
        'Complemento': 'Bloco B',
        'Bairro': 'Sé',
        'Cidade': 'São Paulo',
        'UF': 'SP',
        'LimiteCredito': 5000.00,
        'CondicaoPagamento': '30 dias',
        'Status': 'Ativo',
        'Observacoes': 'Cliente preferencial atacado'
      },
      {
        'Codigo': 'CLI-002',
        'Nome_RazaoSocial': 'João Carlos da Silva',
        'NomeFantasia': '',
        'Tipo': 'PF',
        'CPF_CNPJ': '123.456.789-00',
        'Telefone': '(11) 2233-4455',
        'WhatsApp': '(11) 99887-6655',
        'Email': 'joao.silva@email.com',
        'CEP': '04571-010',
        'Logradouro': 'Av. Engenheiro Luís Carlos Berrini',
        'Numero': '500',
        'Complemento': 'Apto 42',
        'Bairro': 'Itaim Bibi',
        'Cidade': 'São Paulo',
        'UF': 'SP',
        'LimiteCredito': 1000.00,
        'CondicaoPagamento': 'À Vista',
        'Status': 'Ativo',
        'Observacoes': 'Consumidor final assíduo'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Clientes');
    return wb;
  }

  public static generateSupplierTemplate(): XLSX.WorkBook {
    const wb = XLSX.utils.book_new();

    const data = [
      {
        'Codigo': 'FOR-001',
        'Nome_RazaoSocial': 'Distribuidora Química Brasil S.A.',
        'NomeFantasia': 'Química Brasil',
        'Tipo': 'PJ',
        'CPF_CNPJ': '98.765.432/0001-10',
        'Contato': 'Roberto Mendes',
        'Telefone': '(19) 3888-2000',
        'WhatsApp': '(19) 97123-4567',
        'Email': 'vendas@quimicabrasil.com.br',
        'CEP': '13010-000',
        'Logradouro': 'Rodovia Anhanguera',
        'Numero': 'Km 105',
        'Complemento': 'Galpão 3',
        'Bairro': 'Distrito Industrial',
        'Cidade': 'Campinas',
        'UF': 'SP',
        'CondicoesPagamento': '28/56 dias',
        'Status': 'Ativo',
        'Observacoes': 'Fornecedor de bases e essências'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Fornecedores');
    return wb;
  }

  public static generateProductTemplate(availableLocations: StockLocation[]): XLSX.WorkBook {
    const wb = XLSX.utils.book_new();

    const defaultLoc = availableLocations[0]?.code || 'REV-01';

    const data = [
      {
        'Codigo': 'PROD-101',
        'Descricao': 'Detergente Neutro 500ml',
        'Unidade': 'UN',
        'Custo': 2.10,
        'PrecoVenda': 4.50,
        'Familia': 'Limpeza',
        'Grupo': 'Detergentes',
        'CodigoBarras': '7891234560012',
        'EstoqueMinimo': 20,
        'Tipo': 'Revenda',
        'PossuiComposicao': 'Nao',
        'CodigoLocalPadrao': defaultLoc,
        'Status': 'Ativo',
        'ImpostosPercent': 6.0,
        'DespesasOperacionaisPercent': 10.0,
        'ComissaoPercent': 3.0,
        'OutrosCustosPercent': 1.0,
        'MargemLucroDesejadaPercent': 20.0,
        'Observacoes': 'Produto de alto giro'
      },
      {
        'Codigo': 'COMP-201',
        'Descricao': 'Essência Lavanda Concentrada',
        'Unidade': 'L',
        'Custo': 45.00,
        'PrecoVenda': 0.00,
        'Familia': 'Matéria-Prima',
        'Grupo': 'Essências',
        'CodigoBarras': '7891234560099',
        'EstoqueMinimo': 5,
        'Tipo': 'Componente',
        'PossuiComposicao': 'Nao',
        'CodigoLocalPadrao': availableLocations.find(l => l.type === 'materia_prima')?.code || defaultLoc,
        'Status': 'Ativo',
        'ImpostosPercent': 0,
        'DespesasOperacionaisPercent': 0,
        'ComissaoPercent': 0,
        'OutrosCustosPercent': 0,
        'MargemLucroDesejadaPercent': 0,
        'Observacoes': 'Matéria-prima para fabricação de desinfetante'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Produtos');
    return wb;
  }

  public static generatePurchaseOrderTemplate(): XLSX.WorkBook {
    const wb = XLSX.utils.book_new();

    const data = [
      {
        'NumeroPedido': 'PC-2026-001',
        'CodigoFornecedor': 'FOR-001',
        'DataPedido': '2026-10-04',
        'DataEntregaPrevista': '2026-10-10',
        'CondicaoPagamento': '30/60 dias',
        'CodigoProduto': 'PROD-101',
        'DescricaoConferencia': 'Detergente Neutro 500ml',
        'Quantidade': 100,
        'UnidadeCompra': 'CX',
        'FatorEmbalagem': 12,
        'CustoUnitarioCompra': 24.00,
        'Desconto': 10.00,
        'FreteRateado': 25.00,
        'OutrasDespesas': 0.00,
        'CodigoLocalDestino': 'REV-01',
        'Observacoes': 'Primeira remessa semanal'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Pedido_Compra');
    return wb;
  }

  public static generateInitialStockTemplate(): XLSX.WorkBook {
    const wb = XLSX.utils.book_new();

    const data = [
      {
        'CodigoProduto': 'PROD-101',
        'CodigoLocal': 'REV-01',
        'QuantidadeInicial': 150,
        'EstoqueMinimo': 25,
        'DataReferencia': '2026-10-04',
        'Observacoes': 'Inventário de implantação do sistema'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Carga_Estoque');
    return wb;
  }

  // ==========================================
  // VALIDAÇÕES DE IMPORTAÇÃO
  // ==========================================

  public static validateProductsImport(
    rows: any[],
    existingProducts: Product[],
    locations: StockLocation[],
    mode: 'insert_only' | 'insert_update'
  ): ImportPreview<Partial<Product>> {
    const validRows: Partial<Product>[] = [];
    const invalidRows: { rowNumber: number; data: any; issues: ValidationIssue[] }[] = [];

    const existingCodes = new Set(existingProducts.map((p) => p.code.toUpperCase()));
    const existingBarcodes = new Set(existingProducts.map((p) => p.barcode).filter(Boolean));
    const locationCodes = new Map(locations.map((l) => [l.code.toUpperCase(), l.id]));

    let toInsertCount = 0;
    let toUpdateCount = 0;

    rows.forEach((row, index) => {
      const rowNumber = index + 2; // +1 cabeçalho, 1-based
      const issues: ValidationIssue[] = [];

      const code = String(row['Codigo'] || '').trim();
      const description = String(row['Descricao'] || '').trim();
      const unit = String(row['Unidade'] || '').trim().toUpperCase() as UnitOfMeasure;
      const cost = Number(row['Custo'] ?? 0);
      const salePrice = Number(row['PrecoVenda'] ?? 0);
      const barcode = String(row['CodigoBarras'] || '').trim();
      const locCode = String(row['CodigoLocalPadrao'] || '').trim().toUpperCase();
      const typeStr = String(row['Tipo'] || '').trim().toLowerCase();

      if (!code) {
        issues.push({ rowNumber, field: 'Codigo', message: 'Código interno é obrigatório.', severity: 'error' });
      }
      if (!description) {
        issues.push({ rowNumber, field: 'Descricao', message: 'Descrição do produto é obrigatória.', severity: 'error' });
      }

      const validUnits: UnitOfMeasure[] = ['UN', 'KG', 'G', 'L', 'ML', 'M', 'M²', 'M³', 'CX', 'PCT'];
      if (!unit || !validUnits.includes(unit)) {
        issues.push({ rowNumber, field: 'Unidade', message: `Unidade inválida (${unit}). Aceitas: ${validUnits.join(', ')}`, severity: 'error' });
      }

      if (isNaN(cost) || cost < 0) {
        issues.push({ rowNumber, field: 'Custo', message: 'Custo unitário inválido.', severity: 'error' });
      }

      if (isNaN(salePrice) || salePrice < 0) {
        issues.push({ rowNumber, field: 'PrecoVenda', message: 'Preço de venda inválido.', severity: 'error' });
      }

      const isUpdate = existingCodes.has(code.toUpperCase());

      if (isUpdate && mode === 'insert_only') {
        issues.push({ rowNumber, field: 'Codigo', message: `Produto com código "${code}" já existe no cadastro.`, severity: 'error' });
      }

      let matchedLocId = locations[0]?.id || '';
      if (locCode && locationCodes.has(locCode)) {
        matchedLocId = locationCodes.get(locCode)!;
      } else if (locCode) {
        issues.push({ rowNumber, field: 'CodigoLocalPadrao', message: `Local de estoque "${locCode}" não encontrado. Usando padrão.`, severity: 'warning' });
      }

      if (barcode && existingBarcodes.has(barcode) && (!isUpdate || mode === 'insert_only')) {
        issues.push({ rowNumber, field: 'CodigoBarras', message: `Código de barras "${barcode}" já cadastrado para outro produto.`, severity: 'warning' });
      }

      if (issues.some((i) => i.severity === 'error')) {
        invalidRows.push({ rowNumber, data: row, issues });
      } else {
        if (isUpdate) toUpdateCount++;
        else toInsertCount++;

        const product: Partial<Product> = {
          code,
          description,
          unit,
          costPrice: cost,
          salePrice,
          family: String(row['Familia'] || 'Geral').trim(),
          group: String(row['Grupo'] || 'Geral').trim(),
          barcode,
          minStock: Number(row['EstoqueMinimo'] || 0),
          productType: typeStr === 'componente' ? 'componente' : 'revenda',
          hasComposition: String(row['PossuiComposicao'] || '').toLowerCase().includes('s'),
          defaultLocationId: matchedLocId,
          status: String(row['Status'] || '').toLowerCase().includes('inativ') ? 'inativo' : 'ativo',
          taxPercent: Number(row['ImpostosPercent'] || 0),
          operatingExpensesPercent: Number(row['DespesasOperacionaisPercent'] || 0),
          salesCommissionPercent: Number(row['ComissaoPercent'] || 0),
          otherCostsPercent: Number(row['OutrosCustosPercent'] || 0),
          profitMarginPercent: Number(row['MargemLucroDesejadaPercent'] || 0),
          notes: String(row['Observacoes'] || '').trim(),
        };

        validRows.push(product);
      }
    });

    return {
      validRows,
      invalidRows,
      summary: {
        totalRows: rows.length,
        validCount: validRows.length,
        invalidCount: invalidRows.length,
        toInsertCount,
        toUpdateCount,
      },
    };
  }

  public static validateCustomersImport(
    rows: any[],
    existingCustomers: Customer[],
    mode: 'insert_only' | 'insert_update'
  ): ImportPreview<Partial<Customer>> {
    const validRows: Partial<Customer>[] = [];
    const invalidRows: { rowNumber: number; data: any; issues: ValidationIssue[] }[] = [];

    const existingCodes = new Set(existingCustomers.map((c) => c.code.toUpperCase()));
    let toInsertCount = 0;
    let toUpdateCount = 0;

    rows.forEach((row, index) => {
      const rowNumber = index + 2;
      const issues: ValidationIssue[] = [];

      const code = String(row['Codigo'] || '').trim();
      const name = String(row['Nome_RazaoSocial'] || '').trim();
      const typeStr = String(row['Tipo'] || 'PF').trim().toUpperCase();

      if (!code) {
        issues.push({ rowNumber, field: 'Codigo', message: 'Código do cliente é obrigatório.', severity: 'error' });
      }
      if (!name) {
        issues.push({ rowNumber, field: 'Nome_RazaoSocial', message: 'Nome ou Razão Social é obrigatório.', severity: 'error' });
      }

      const isUpdate = existingCodes.has(code.toUpperCase());
      if (isUpdate && mode === 'insert_only') {
        issues.push({ rowNumber, field: 'Codigo', message: `Cliente com código "${code}" já existe.`, severity: 'error' });
      }

      if (issues.some((i) => i.severity === 'error')) {
        invalidRows.push({ rowNumber, data: row, issues });
      } else {
        if (isUpdate) toUpdateCount++;
        else toInsertCount++;

        const customer: Partial<Customer> = {
          code,
          name,
          tradeName: String(row['NomeFantasia'] || '').trim(),
          type: typeStr === 'PJ' ? 'PJ' : 'PF',
          cpfCnpj: String(row['CPF_CNPJ'] || '').trim(),
          phone: String(row['Telefone'] || '').trim(),
          whatsapp: String(row['WhatsApp'] || '').trim(),
          email: String(row['Email'] || '').trim(),
          zipCode: String(row['CEP'] || '').trim(),
          street: String(row['Logradouro'] || '').trim(),
          number: String(row['Numero'] || '').trim(),
          complement: String(row['Complemento'] || '').trim(),
          neighborhood: String(row['Bairro'] || '').trim(),
          city: String(row['Cidade'] || '').trim(),
          state: String(row['UF'] || '').trim(),
          creditLimit: Number(row['LimiteCredito'] || 0),
          preferredPaymentMethod: String(row['CondicaoPagamento'] || '').trim(),
          status: String(row['Status'] || '').toLowerCase().includes('inativ') ? 'inativo' : 'ativo',
          notes: String(row['Observacoes'] || '').trim(),
        };

        validRows.push(customer);
      }
    });

    return {
      validRows,
      invalidRows,
      summary: {
        totalRows: rows.length,
        validCount: validRows.length,
        invalidCount: invalidRows.length,
        toInsertCount,
        toUpdateCount,
      },
    };
  }

  // ==========================================
  // EXPORTAÇÕES FORMATADAS
  // ==========================================

  public static exportProducts(products: Product[], locations: StockLocation[], fileName: string) {
    const locMap = new Map(locations.map((l) => [l.id, l.name]));

    const data = products.map((p) => ({
      'Código': p.code,
      'Descrição': p.description,
      'Unidade': p.unit,
      'Custo Unitário': p.costPrice,
      'Preço de Venda': p.salePrice,
      'Família': p.family,
      'Grupo': p.group,
      'Código de Barras': p.barcode,
      'Estoque Mínimo': p.minStock,
      'Tipo': p.productType === 'componente' ? 'Componente' : 'Revenda',
      'Local Padrão': locMap.get(p.defaultLocationId) || 'Padrão',
      'Status': p.status === 'ativo' ? 'Ativo' : 'Inativo',
      'Impostos %': p.taxPercent || 0,
      'Despesas Operacionais %': p.operatingExpensesPercent || 0,
      'Comissão %': p.salesCommissionPercent || 0,
      'Margem Lucro %': p.profitMarginPercent || 0,
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Produtos');
    this.downloadExcel(wb, fileName);
  }

  public static exportCustomers(customers: Customer[], fileName: string) {
    const data = customers.map((c) => ({
      'Código': c.code,
      'Nome / Razão Social': c.name,
      'Nome Fantasia': c.tradeName || '',
      'Tipo': c.type,
      'CPF / CNPJ': c.cpfCnpj,
      'Telefone': c.phone,
      'WhatsApp': c.whatsapp || '',
      'E-mail': c.email || '',
      'Cidade': c.city || '',
      'UF': c.state || '',
      'Limite de Crédito': c.creditLimit,
      'Status': c.status === 'ativo' ? 'Ativo' : 'Inativo',
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Clientes');
    this.downloadExcel(wb, fileName);
  }
}
