import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  RotateCcw,
  Sparkles,
  Info,
  Layers,
  ArrowRight
} from 'lucide-react';
import { Database } from '../../services/db';
import { ExcelService, ImportPreview } from '../../services/excelService';
import { Product, Customer } from '../../types';
import { formatCurrency } from '../../services/pricingEngine';

export const ExcelToolsView: React.FC = () => {
  const dbState = Database.getState();
  const currentCompany = Database.getCurrentCompany();
  const currentUser = Database.getCurrentUser();

  const [importType, setImportType] = useState<'produtos' | 'clientes'>('produtos');
  const [importMode, setImportMode] = useState<'insert_only' | 'insert_update'>('insert_update');
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [parsedPreview, setParsedPreview] = useState<ImportPreview<any> | null>(null);
  const [importedSuccessMsg, setImportedSuccessMsg] = useState<string | null>(null);

  // Downloads dos Modelos Oficiais em Excel (.xlsx)
  const handleDownloadTemplate = (type: 'produtos' | 'clientes' | 'fornecedores' | 'compras' | 'estoque') => {
    switch (type) {
      case 'produtos':
        ExcelService.downloadExcel(
          ExcelService.generateProductTemplate(dbState.stockLocations),
          'Modelo_Oficial_Importacao_Produtos.xlsx'
        );
        break;
      case 'clientes':
        ExcelService.downloadExcel(
          ExcelService.generateCustomerTemplate(),
          'Modelo_Oficial_Importacao_Clientes.xlsx'
        );
        break;
      case 'fornecedores':
        ExcelService.downloadExcel(
          ExcelService.generateSupplierTemplate(),
          'Modelo_Oficial_Importacao_Fornecedores.xlsx'
        );
        break;
      case 'compras':
        ExcelService.downloadExcel(
          ExcelService.generatePurchaseOrderTemplate(),
          'Modelo_Oficial_Importacao_Pedidos_Compra.xlsx'
        );
        break;
      case 'estoque':
        ExcelService.downloadExcel(
          ExcelService.generateInitialStockTemplate(),
          'Modelo_Oficial_Carga_Inicial_Estoque.xlsx'
        );
        break;
    }
  };

  // Leitura do Arquivo Excel Enviado
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoadingFile(true);
    setImportedSuccessMsg(null);

    try {
      const rows = await ExcelService.parseExcelFile(file);

      if (rows.length === 0) {
        alert('A planilha enviada está vazia ou não possui linhas de dados.');
        setIsLoadingFile(false);
        return;
      }

      if (importType === 'produtos') {
        const preview = ExcelService.validateProductsImport(
          rows,
          dbState.products,
          dbState.stockLocations,
          importMode
        );
        setParsedPreview(preview);
      } else if (importType === 'clientes') {
        const preview = ExcelService.validateCustomersImport(
          rows,
          dbState.customers,
          importMode
        );
        setParsedPreview(preview);
      }
    } catch (err) {
      alert('Erro ao carregar arquivo Excel: ' + (err as Error).message);
    } finally {
      setIsLoadingFile(false);
    }
  };

  // Efetivar Importação
  const handleConfirmImport = () => {
    if (!parsedPreview || parsedPreview.validRows.length === 0) {
      alert('Não há registros válidos para importar.');
      return;
    }

    const state = Database.getState();

    if (importType === 'produtos') {
      const validProds = parsedPreview.validRows as Partial<Product>[];

      validProds.forEach((prodData) => {
        const existingIdx = state.products.findIndex((p) => p.code.toUpperCase() === prodData.code?.toUpperCase());

        if (existingIdx >= 0 && importMode === 'insert_update') {
          // Atualizar
          state.products[existingIdx] = {
            ...state.products[existingIdx],
            ...prodData,
          } as Product;
        } else if (existingIdx < 0) {
          // Inserir
          const newProd: Product = {
            id: 'PROD-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
            code: prodData.code!,
            description: prodData.description!,
            unit: prodData.unit || 'UN',
            costPrice: prodData.costPrice || 0,
            salePrice: prodData.salePrice || 0,
            family: prodData.family || 'Geral',
            group: prodData.group || 'Geral',
            barcode: prodData.barcode || '',
            minStock: prodData.minStock || 0,
            productType: prodData.productType || 'revenda',
            hasComposition: !!prodData.hasComposition,
            defaultLocationId: prodData.defaultLocationId || dbState.stockLocations[0]?.id || 'loc-comercial',
            status: prodData.status || 'ativo',
            taxPercent: prodData.taxPercent || 0,
            operatingExpensesPercent: prodData.operatingExpensesPercent || 0,
            salesCommissionPercent: prodData.salesCommissionPercent || 0,
            otherCostsPercent: prodData.otherCostsPercent || 0,
            profitMarginPercent: prodData.profitMarginPercent || 0,
            notes: prodData.notes || '',
          };
          state.products.unshift(newProd);

          // Saldo inicial no local
          state.stockBalances.push({
            productId: newProd.id,
            locationId: newProd.defaultLocationId,
            quantity: 0,
            reserved: 0,
            minStock: newProd.minStock,
          });
        }
      });

      Database.addAuditLog(
        'IMPORTACAO_PLANILHA_PRODUTOS',
        'IMPORTACAO',
        'PRODUTOS',
        `Importação de ${validProds.length} produtos concluída por ${currentUser.name} (Modo: ${importMode})`
      );
    } else if (importType === 'clientes') {
      const validCusts = parsedPreview.validRows as Partial<Customer>[];

      validCusts.forEach((custData) => {
        const existingIdx = state.customers.findIndex((c) => c.code.toUpperCase() === custData.code?.toUpperCase());

        if (existingIdx >= 0 && importMode === 'insert_update') {
          state.customers[existingIdx] = {
            ...state.customers[existingIdx],
            ...custData,
          } as Customer;
        } else if (existingIdx < 0) {
          const newCust: Customer = {
            id: 'CLI-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
            code: custData.code!,
            name: custData.name!,
            tradeName: custData.tradeName || '',
            type: custData.type || 'PF',
            cpfCnpj: custData.cpfCnpj || '',
            phone: custData.phone || '',
            whatsapp: custData.whatsapp || '',
            email: custData.email || '',
            zipCode: custData.zipCode || '',
            street: custData.street || '',
            number: custData.number || '',
            neighborhood: custData.neighborhood || '',
            city: custData.city || 'São Paulo',
            state: custData.state || 'SP',
            creditLimit: custData.creditLimit || 0,
            preferredPaymentMethod: custData.preferredPaymentMethod || 'À Vista',
            status: custData.status || 'ativo',
            notes: custData.notes || '',
          };
          state.customers.unshift(newCust);
        }
      });

      Database.addAuditLog(
        'IMPORTACAO_PLANILHA_CLIENTES',
        'IMPORTACAO',
        'CLIENTES',
        `Importação de ${validCusts.length} clientes concluída por ${currentUser.name}`
      );
    }

    Database.persist();

    setImportedSuccessMsg(
      `Importação concluída com êxito! ${parsedPreview.summary.validCount} registro(s) processados (${parsedPreview.summary.toInsertCount} inseridos, ${parsedPreview.summary.toUpdateCount} atualizados).`
    );
    setParsedPreview(null);
  };

  return (
    <div className="space-y-4">
      {/* Topo */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <FileSpreadsheet className="text-emerald-600" size={20} />
            <span>Central de Importação e Exportação por Planilhas Excel (.xlsx / .xls)</span>
          </h2>
          <p className="text-xs text-slate-500">
            Baixe modelos padronizados, importe cadastros em massa com validação linha por linha e evite duplicidades.
          </p>
        </div>
      </div>

      {/* Modelos Oficiais para Download */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
          <Download size={15} className="text-blue-600" />
          <span>Modelos Oficiais de Planilha para Preenchimento</span>
        </h3>
        <p className="text-xs text-slate-500">
          Utilize as planilhas modelo oficiais para garantir a correspondência correta das colunas, unidades de medida e códigos de estoque.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 pt-1">
          <button
            onClick={() => handleDownloadTemplate('produtos')}
            className="p-3 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-xl text-left transition-all group"
          >
            <FileSpreadsheet size={20} className="text-emerald-600 mb-1 group-hover:scale-110 transition-transform" />
            <div className="font-bold text-xs text-slate-800">Modelo Produtos</div>
            <div className="text-[10px] text-slate-400">Preços, custos e locais</div>
          </button>

          <button
            onClick={() => handleDownloadTemplate('clientes')}
            className="p-3 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-xl text-left transition-all group"
          >
            <FileSpreadsheet size={20} className="text-emerald-600 mb-1 group-hover:scale-110 transition-transform" />
            <div className="font-bold text-xs text-slate-800">Modelo Clientes</div>
            <div className="text-[10px] text-slate-400">PF/PJ, limites e contatos</div>
          </button>

          <button
            onClick={() => handleDownloadTemplate('fornecedores')}
            className="p-3 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-xl text-left transition-all group"
          >
            <FileSpreadsheet size={20} className="text-emerald-600 mb-1 group-hover:scale-110 transition-transform" />
            <div className="font-bold text-xs text-slate-800">Modelo Fornecedores</div>
            <div className="text-[10px] text-slate-400">Prazos e dados bancários</div>
          </button>

          <button
            onClick={() => handleDownloadTemplate('compras')}
            className="p-3 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-xl text-left transition-all group"
          >
            <FileSpreadsheet size={20} className="text-emerald-600 mb-1 group-hover:scale-110 transition-transform" />
            <div className="font-bold text-xs text-slate-800">Modelo Ped. Compra</div>
            <div className="text-[10px] text-slate-400">Linhas de itens e custos</div>
          </button>

          <button
            onClick={() => handleDownloadTemplate('estoque')}
            className="p-3 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-xl text-left transition-all group"
          >
            <FileSpreadsheet size={20} className="text-emerald-600 mb-1 group-hover:scale-110 transition-transform" />
            <div className="font-bold text-xs text-slate-800">Carga Inicial Estoque</div>
            <div className="text-[10px] text-slate-400">Saldos por local</div>
          </button>
        </div>
      </div>

      {/* Área de Importação e Envio de Arquivo */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
          <Upload size={15} className="text-blue-600" />
          <span>Importar Planilha Preenchida</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Tipo de Cadastro a Importar:</label>
            <select
              value={importType}
              onChange={(e) => {
                setImportType(e.target.value as any);
                setParsedPreview(null);
                setImportedSuccessMsg(null);
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-semibold"
            >
              <option value="produtos">Cadastro de Produtos & Insumos</option>
              <option value="clientes">Cadastro de Clientes</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Modo de Importação:</label>
            <select
              value={importMode}
              onChange={(e) => setImportMode(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-semibold"
            >
              <option value="insert_update">Incluir Novos e Atualizar Existentes (Recomendado)</option>
              <option value="insert_only">Somente Incluir (Rejeitar Códigos Duplicados)</option>
            </select>
          </div>
        </div>

        {/* Input de Arquivo */}
        <div className="border-2 border-dashed border-slate-300 hover:border-blue-400 rounded-2xl p-6 text-center bg-slate-50 hover:bg-blue-50/20 transition-all cursor-pointer">
          <input
            type="file"
            id="excel-file-input"
            accept=".xlsx, .xls"
            onChange={handleFileUpload}
            className="hidden"
          />
          <label htmlFor="excel-file-input" className="cursor-pointer block">
            <Upload size={32} className="mx-auto text-blue-600 mb-2" />
            <span className="font-bold text-sm text-slate-800 block">
              {isLoadingFile ? 'Processando e Validando Planilha...' : 'Clique para selecionar o arquivo Excel (.xlsx ou .xls)'}
            </span>
            <span className="text-xs text-slate-400 mt-1 block">
              O sistema irá ler as linhas e apresentar a prévia de validação antes de qualquer alteração no banco.
            </span>
          </label>
        </div>

        {/* Mensagem de Sucesso */}
        {importedSuccessMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-center gap-2 text-xs font-semibold">
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            <span>{importedSuccessMsg}</span>
          </div>
        )}

        {/* Prévia e Relatório de Validação Linha por Linha */}
        {parsedPreview && (
          <div className="space-y-4 pt-3 border-t border-slate-200">
            {/* Resumo da Validação */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center text-xs">
              <div className="bg-slate-100 p-3 rounded-xl border border-slate-200">
                <span className="text-slate-500 block text-[10px]">Total de Linhas</span>
                <span className="font-extrabold text-slate-900 text-base">{parsedPreview.summary.totalRows}</span>
              </div>
              <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                <span className="text-emerald-700 block text-[10px]">Registros Válidos</span>
                <span className="font-extrabold text-emerald-800 text-base">{parsedPreview.summary.validCount}</span>
              </div>
              <div className="bg-blue-50 p-3 rounded-xl border border-blue-200">
                <span className="text-blue-700 block text-[10px]">Inclusões / Atualizações</span>
                <span className="font-extrabold text-blue-800 text-base">
                  {parsedPreview.summary.toInsertCount} novos / {parsedPreview.summary.toUpdateCount} atualiz.
                </span>
              </div>
              <div className="bg-rose-50 p-3 rounded-xl border border-rose-200">
                <span className="text-rose-700 block text-[10px]">Linhas com Erro / Rejeitadas</span>
                <span className="font-extrabold text-rose-800 text-base">{parsedPreview.summary.invalidCount}</span>
              </div>
            </div>

            {/* Relatório de Erros Linha a Linha (se houver) */}
            {parsedPreview.invalidRows.length > 0 && (
              <div className="bg-rose-50/80 border border-rose-200 rounded-xl p-4 space-y-2 text-xs">
                <div className="font-bold text-rose-800 flex items-center gap-1.5">
                  <AlertTriangle size={16} />
                  <span>Relatório de Inconsistências na Planilha (Corrija antes ou prossiga com os válidos):</span>
                </div>

                <div className="max-h-40 overflow-y-auto divide-y divide-rose-200/60">
                  {parsedPreview.invalidRows.map((inv, idx) => (
                    <div key={idx} className="py-1.5 text-rose-900">
                      <strong>Linha {inv.rowNumber}:</strong>{' '}
                      {inv.issues.map((iss) => `${iss.field} - ${iss.message}`).join(' | ')}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Prévia dos Dados Válidos */}
            <div className="border border-slate-200 rounded-xl overflow-hidden text-xs max-h-56 overflow-y-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] sticky top-0">
                  <tr>
                    <th className="p-2.5">Código</th>
                    <th className="p-2.5">Descrição / Nome</th>
                    <th className="p-2.5">Unidade / Tipo</th>
                    <th className="p-2.5 text-right">Custo / Limite</th>
                    <th className="p-2.5 text-right">Preço Venda</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {parsedPreview.validRows.slice(0, 15).map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80">
                      <td className="p-2.5 font-mono font-bold text-slate-600">{row.code}</td>
                      <td className="p-2.5 font-semibold text-slate-800">{row.description || row.name}</td>
                      <td className="p-2.5 text-slate-600">{row.unit || row.type}</td>
                      <td className="p-2.5 text-right font-mono text-slate-600">
                        {formatCurrency(row.costPrice || row.creditLimit || 0)}
                      </td>
                      <td className="p-2.5 text-right font-bold text-blue-700">
                        {formatCurrency(row.salePrice || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Botão de Confirmação */}
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setParsedPreview(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Descartar Prévia
              </button>
              <button
                disabled={parsedPreview.validRows.length === 0}
                onClick={handleConfirmImport}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
              >
                <FileCheck size={16} />
                <span>Confirmar Importação de {parsedPreview.summary.validCount} Registro(s)</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
