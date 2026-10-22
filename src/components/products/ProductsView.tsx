import React, { useState, useEffect } from 'react';
import {
  Package,
  Search,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  Boxes,
  Barcode,
  Eye,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  Filter,
  Layers,
  ArrowRight
} from 'lucide-react';
import { Database } from '../../services/db';
import { Product, ProductType, UnitOfMeasure, StockLocation } from '../../types';
import { StockEngine } from '../../services/stockEngine';
import { formatCurrency, formatQuantity } from '../../services/pricingEngine';
import { ExcelService } from '../../services/excelService';

export const ProductsView: React.FC = () => {
  const [dbState, setDbState] = useState(Database.getState());
  const currentCompany = Database.getCurrentCompany();
  const currentUser = Database.getCurrentUser();

  useEffect(() => {
    return Database.subscribe(() => {
      setDbState({ ...Database.getState() });
    });
  }, []);

  const canViewCosts = Database.canCurrentUserView('productCosts');

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFamily, setSelectedFamily] = useState('todos');
  const [selectedType, setSelectedType] = useState('todos');
  const [selectedStatus, setSelectedStatus] = useState('todos');
  const [selectedMasterPackFilter, setSelectedMasterPackFilter] = useState<'todos' | 'master_only' | 'unit_only'>('todos');

  // Modal de Cadastro / Edição
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Modal de Detalhes de Estoque por Local
  const [viewStockProduct, setViewStockProduct] = useState<Product | null>(null);

  // Formulário
  const [formData, setFormData] = useState<Partial<Product>>({
    code: '',
    description: '',
    unit: 'UN',
    costPrice: 0,
    salePrice: 0,
    family: 'Geral',
    group: 'Geral',
    barcode: '',
    minStock: 10,
    productType: 'revenda',
    hasComposition: false,
    defaultLocationId: 'loc-comercial',
    status: 'ativo',
    notes: '',
    isMasterPack: false,
    masterPackAssociatedProductId: '',
    masterPackAssociatedProductCode: '',
    masterPackAssociatedProductDescription: '',
    masterPackUnits: 10,
    masterPackPackagingType: 'caixa',
  });

  const locations = dbState.stockLocations.filter((l) => l.companyId === currentCompany.id);

  const families = ['todos', ...Array.from(new Set(dbState.products.map((p) => p.family).filter(Boolean)))];

  // Produtos unitários disponíveis para vincular à Embalagem Master
  const availableUnitProducts = dbState.products.filter(
    (p) => p.status === 'ativo' && !p.isMasterPack && p.id !== editingProduct?.id
  );

  const filteredProducts = dbState.products.filter((p) => {
    const matchesSearch =
      searchTerm === '' ||
      p.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.barcode.includes(searchTerm) ||
      (p.masterPackAssociatedProductCode && p.masterPackAssociatedProductCode.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.masterPackAssociatedProductDescription && p.masterPackAssociatedProductDescription.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesFamily = selectedFamily === 'todos' || p.family === selectedFamily;
    const matchesType = selectedType === 'todos' || p.productType === selectedType;
    const matchesStatus = selectedStatus === 'todos' || p.status === selectedStatus;
    const matchesMaster =
      selectedMasterPackFilter === 'todos' ||
      (selectedMasterPackFilter === 'master_only' && p.isMasterPack) ||
      (selectedMasterPackFilter === 'unit_only' && !p.isMasterPack);
    return matchesSearch && matchesFamily && matchesType && matchesStatus && matchesMaster;
  });

  const handleOpenNew = () => {
    const newCode = 'PROD-' + String(dbState.products.length + 101);
    setEditingProduct(null);
    setFormData({
      code: newCode,
      description: '',
      unit: 'UN',
      costPrice: 0,
      salePrice: 0,
      family: 'Geral',
      group: 'Geral',
      barcode: '',
      minStock: 10,
      productType: 'revenda',
      hasComposition: false,
      defaultLocationId: locations.find((l) => l.name.toLowerCase() === 'comercial' || l.id === 'loc-comercial')?.id || locations[0]?.id || 'loc-comercial',
      status: 'ativo',
      notes: '',
      isMasterPack: false,
      masterPackAssociatedProductId: '',
      masterPackAssociatedProductCode: '',
      masterPackAssociatedProductDescription: '',
      masterPackUnits: 10,
      masterPackPackagingType: 'caixa',
    });
    setIsModalOpen(true);
  };

  const handleOpenNewMasterPack = () => {
    const newCode = 'CX-' + String(dbState.products.length + 101);
    const defaultAssoc = availableUnitProducts[0];
    setEditingProduct(null);
    setFormData({
      code: newCode,
      description: defaultAssoc ? `Caixa ${defaultAssoc.description} c/ 10 UN` : 'Caixa c/ 10 UN',
      unit: 'CX',
      costPrice: defaultAssoc ? Number((defaultAssoc.costPrice * 10).toFixed(2)) : 0,
      salePrice: defaultAssoc ? Number((defaultAssoc.salePrice * 10).toFixed(2)) : 0,
      family: defaultAssoc?.family || 'Geral',
      group: 'Embalagens Master',
      barcode: '',
      minStock: 5,
      productType: 'revenda',
      hasComposition: false,
      defaultLocationId: defaultAssoc?.defaultLocationId || locations[0]?.id || 'loc-comercial',
      status: 'ativo',
      notes: defaultAssoc
        ? `Embalagem Master contendo 10 unidades de ${defaultAssoc.code} - ${defaultAssoc.description}. O estoque é controlado automaticamente no produto associado.`
        : 'Embalagem Master. O estoque é controlado automaticamente no produto unitário associado.',
      isMasterPack: true,
      masterPackAssociatedProductId: defaultAssoc?.id || '',
      masterPackAssociatedProductCode: defaultAssoc?.code || '',
      masterPackAssociatedProductDescription: defaultAssoc?.description || '',
      masterPackUnits: 10,
      masterPackPackagingType: 'caixa',
    });
    setIsModalOpen(true);
  };

  const handleCreateMasterPackFromProduct = (product: Product, units: number = 10) => {
    const cleanCode = product.code.replace(/[^A-Za-z0-9]/g, '');
    const newCode = `CX-${cleanCode}-${units}`;
    setEditingProduct(null);
    setFormData({
      code: newCode,
      description: `Caixa ${product.description} c/ ${units} UN`,
      unit: 'CX',
      costPrice: Number((product.costPrice * units).toFixed(2)),
      salePrice: Number((product.salePrice * units).toFixed(2)),
      family: product.family || 'Geral',
      group: 'Embalagens Master',
      barcode: '',
      minStock: 5,
      productType: 'revenda',
      hasComposition: false,
      defaultLocationId: product.defaultLocationId || locations[0]?.id || 'loc-comercial',
      status: 'ativo',
      notes: `Embalagem Master contendo ${units} unidades do produto ${product.code} - ${product.description}. Toda venda desta caixa baixa automaticamente ${units} unidades do produto unitário no estoque.`,
      isMasterPack: true,
      masterPackAssociatedProductId: product.id,
      masterPackAssociatedProductCode: product.code,
      masterPackAssociatedProductDescription: product.description,
      masterPackUnits: units,
      masterPackPackagingType: 'caixa',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      ...product,
      isMasterPack: !!product.isMasterPack,
      masterPackAssociatedProductId: product.masterPackAssociatedProductId || '',
      masterPackAssociatedProductCode: product.masterPackAssociatedProductCode || '',
      masterPackAssociatedProductDescription: product.masterPackAssociatedProductDescription || '',
      masterPackUnits: product.masterPackUnits || 10,
      masterPackPackagingType: product.masterPackPackagingType || 'caixa',
    });
    setIsModalOpen(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.code?.trim() || !formData.description?.trim()) {
      alert('Código e Descrição são campos obrigatórios.');
      return;
    }

    // Validações do recurso Embalagem Master
    if (formData.isMasterPack) {
      if (!formData.masterPackAssociatedProductId) {
        alert('Por favor, selecione o Produto Unitário Associado que será vendido nesta Embalagem Master.');
        return;
      }
      if (!formData.masterPackUnits || Number(formData.masterPackUnits) <= 0) {
        alert('A quantidade de unidades por Embalagem Master deve ser maior que zero (ex: 10, 20 ou 30 unidades).');
        return;
      }
      if (formData.masterPackAssociatedProductId === editingProduct?.id) {
        alert('A Embalagem Master não pode ser associada a ela mesma.');
        return;
      }
    }

    // Verificar unicidade do código
    const existingWithCode = dbState.products.find(
      (p) => p.code.toUpperCase() === formData.code?.toUpperCase() && p.id !== editingProduct?.id
    );
    if (existingWithCode) {
      alert(`Já existe um produto com o código "${formData.code}". Utilize outro código.`);
      return;
    }

    const state = Database.getState();
    const assocProd = formData.isMasterPack
      ? state.products.find((p) => p.id === formData.masterPackAssociatedProductId)
      : null;

    const masterPackData = {
      isMasterPack: !!formData.isMasterPack,
      masterPackAssociatedProductId: formData.isMasterPack ? formData.masterPackAssociatedProductId : undefined,
      masterPackAssociatedProductCode: formData.isMasterPack ? (assocProd?.code || formData.masterPackAssociatedProductCode) : undefined,
      masterPackAssociatedProductDescription: formData.isMasterPack ? (assocProd?.description || formData.masterPackAssociatedProductDescription) : undefined,
      masterPackUnits: formData.isMasterPack ? Number(formData.masterPackUnits || 10) : undefined,
      masterPackPackagingType: formData.isMasterPack ? (formData.masterPackPackagingType || 'caixa') : undefined,
    };

    if (editingProduct) {
      // Atualizar existente
      state.products = state.products.map((p) =>
        p.id === editingProduct.id
          ? ({
              ...p,
              ...formData,
              ...masterPackData,
              costPrice: Number(formData.costPrice || 0),
              salePrice: Number(formData.salePrice || 0),
              minStock: Number(formData.minStock || 0),
            } as Product)
          : p
      );
      Database.addAuditLog('ATUALIZAR_PRODUTO', 'CADASTROS', editingProduct.id, `Produto ${formData.description} atualizado ${formData.isMasterPack ? '(Embalagem Master)' : ''}`);
    } else {
      // Criar novo produto
      const newProd: Product = {
        id: 'PROD-' + Date.now(),
        code: formData.code!.trim(),
        description: formData.description!.trim(),
        unit: formData.unit || 'UN',
        costPrice: Number(formData.costPrice || 0),
        salePrice: Number(formData.salePrice || 0),
        family: formData.family || 'Geral',
        group: formData.group || 'Geral',
        barcode: formData.barcode || '',
        minStock: Number(formData.minStock || 0),
        productType: formData.productType || 'revenda',
        hasComposition: !!formData.hasComposition,
        defaultLocationId: formData.defaultLocationId || locations[0]?.id || 'loc-comercial',
        status: formData.status || 'ativo',
        notes: formData.notes || '',
        ...masterPackData,
      };
      state.products.unshift(newProd);

      // Criar registro de saldo inicial zerado no local padrão
      state.stockBalances.push({
        productId: newProd.id,
        locationId: newProd.defaultLocationId,
        quantity: 0,
        reserved: 0,
        minStock: newProd.minStock,
      });

      Database.addAuditLog('CRIAR_PRODUTO', 'CADASTROS', newProd.id, `Produto ${newProd.description} cadastrado ${newProd.isMasterPack ? '(Embalagem Master)' : ''}`);
    }

    Database.persist();
    setIsModalOpen(false);
  };

  // Excluir ou Inativar respeitando integridade histórica
  const handleDeleteOrInactivate = (product: Product) => {
    // 1. Checar se este produto é base associada de alguma Embalagem Master ativa
    const masterPacksUsingThis = dbState.products.filter(
      (p) => p.isMasterPack && p.masterPackAssociatedProductId === product.id && p.status === 'ativo'
    );
    if (masterPacksUsingThis.length > 0) {
      const names = masterPacksUsingThis.map((m) => `${m.code} - ${m.description}`).join('\n• ');
      alert(
        `Este produto NÃO pode ser excluído ou inativado pois está associado como produto unitário base para as seguintes Embalagens Master ativas:\n• ${names}\n\nDesvincule ou inative as Embalagens Master antes de prosseguir.`
      );
      return;
    }

    // 2. Checar se o produto tem vendas ou compras
    const hasOrders = dbState.orders.some((o) => o.items.some((i) => i.productId === product.id));
    const hasMovements = dbState.stockMovements.some((m) => m.productId === product.id);

    if (hasOrders || hasMovements) {
      const confirmInactivate = window.confirm(
        `O produto "${product.description}" já possui vendas ou movimentações no histórico e NÃO pode ser excluído fisicamente para preservar a integridade contábil.\n\nDeseja alterar o status para INATIVO?`
      );
      if (confirmInactivate) {
        Database.getState().products = Database.getState().products.map((p) =>
          p.id === product.id ? { ...p, status: 'inativo' as const } : p
        );
        Database.persist();
        Database.addAuditLog('INATIVAR_PRODUTO', 'CADASTROS', product.id, `Produto ${product.code} inativado`);
        alert('Produto inativado com sucesso!');
      }
      return;
    }

    const confirmDelete = window.confirm(`Deseja excluir permanentemente o produto "${product.description}"?`);
    if (confirmDelete) {
      Database.getState().products = Database.getState().products.filter((p) => p.id !== product.id);
      Database.getState().stockBalances = Database.getState().stockBalances.filter((b) => b.productId !== product.id);
      Database.persist();
      Database.addAuditLog('EXCLUIR_PRODUTO', 'CADASTROS', product.id, `Produto ${product.code} excluído`);
      alert('Produto excluído.');
    }
  };

  const handleExportToExcel = () => {
    ExcelService.exportProducts(filteredProducts, locations, `Produtos_${currentCompany.tradeName || 'Catalogo'}.xlsx`);
  };

  return (
    <div className="space-y-4">
      {/* Topo / Barra de Ações */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Package className="text-blue-600" size={20} />
            <span>Cadastro Geral de Produtos & Insumos</span>
          </h2>
          <p className="text-xs text-slate-500">
            Gerencie mercadorias para revenda, matérias-primas e componentes de produção própria.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportToExcel}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition-colors"
            title="Exportar catálogo filtrado para Excel (.xlsx)"
          >
            <FileSpreadsheet size={15} className="text-emerald-600" />
            <span>Exportar Excel</span>
          </button>

          <button
            onClick={handleOpenNewMasterPack}
            className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs rounded-lg shadow-xs transition-all cursor-pointer"
            title="Cadastrar uma nova Embalagem Master (Caixa ou Pacote com 10, 20 ou 30 unidades vinculada a um produto unitário)"
          >
            <Boxes size={15} />
            <span>Nova Embalagem Master</span>
          </button>

          <button
            onClick={handleOpenNew}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Plus size={15} />
            <span>Novo Produto</span>
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-2.5">
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5 text-xs">
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Buscar por código, descrição ou produto associado..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
            />
          </div>

          <div>
            <select
              value={selectedFamily}
              onChange={(e) => setSelectedFamily(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-medium"
            >
              {families.map((f) => (
                <option key={f} value={f}>
                  Família: {f === 'todos' ? 'Todas' : f}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-medium"
            >
              <option value="todos">Tipo: Todos</option>
              <option value="revenda">Revenda / Acabado</option>
              <option value="componente">Componente / Matéria-Prima</option>
            </select>
          </div>

          <div>
            <select
              value={selectedMasterPackFilter}
              onChange={(e) => setSelectedMasterPackFilter(e.target.value as any)}
              className="w-full bg-slate-50 border border-amber-200 text-slate-800 rounded-lg p-2 text-xs font-semibold"
            >
              <option value="todos">Embalagem: Todas</option>
              <option value="master_only">📦 Apenas Embalagens Master</option>
              <option value="unit_only">Produtos Unitários / Simples</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabela de Produtos */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-3">Código</th>
                <th className="p-3">Descrição do Produto</th>
                <th className="p-3">Tipo</th>
                <th className="p-3">Família / Grupo</th>
                <th className="p-3 text-right">Custo Unit.</th>
                <th className="p-3 text-right">Preço Venda</th>
                <th className="p-3 text-center">Saldo Total</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">
                    Nenhum produto cadastrado com os critérios selecionados.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const stock = StockEngine.getTotalProductStock(dbState.stockBalances, p.id);
                  const isLow = stock.available <= p.minStock;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 font-mono font-bold text-blue-700">{p.code}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-slate-800">{p.description}</span>
                          {p.isMasterPack && (
                            <span className="inline-flex items-center gap-1 text-[10px] bg-amber-100 text-amber-900 font-extrabold px-2 py-0.5 rounded-full border border-amber-300 shadow-2xs">
                              <Boxes size={12} className="text-amber-700" />
                              Embalagem Master ({p.masterPackUnits} un/{p.unit})
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 flex-wrap mt-0.5">
                          <span>Unidade: {p.unit}</span>
                          {p.barcode && <span>• EAN: {p.barcode}</span>}
                          {p.hasComposition && (
                            <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded-sm border border-blue-200 font-semibold">
                              Fabricação Própria
                            </span>
                          )}
                          {p.isMasterPack && p.masterPackAssociatedProductId && (
                            <span className="text-[11px] text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-medium">
                              Vinculado ao unitário: <strong className="font-mono text-amber-800">{p.masterPackAssociatedProductCode}</strong> {p.masterPackAssociatedProductDescription ? `- ${p.masterPackAssociatedProductDescription}` : ''}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                            p.productType === 'componente'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {p.productType}
                        </span>
                      </td>
                      <td className="p-3 text-slate-600">
                        {p.family} <span className="text-slate-400">/ {p.group}</span>
                      </td>
                      <td className="p-3 text-right font-medium text-slate-600">
                        {canViewCosts ? formatCurrency(p.costPrice) : '••••'}
                      </td>
                      <td className="p-3 text-right font-bold text-slate-900">
                        {p.salePrice > 0 ? formatCurrency(p.salePrice) : '—'}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => setViewStockProduct(p)}
                          className={`px-2 py-0.5 rounded-md font-bold text-[11px] hover:ring-2 hover:ring-blue-300 transition-all ${
                            stock.available === 0
                              ? 'bg-rose-100 text-rose-700'
                              : isLow
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                          title="Clique para ver detalhe por local"
                        >
                          {formatQuantity(stock.available)} {p.unit}
                        </button>
                        {p.isMasterPack && p.masterPackUnits && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            ({formatQuantity(stock.available * p.masterPackUnits)} un unitárias)
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            p.status === 'ativo' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-center gap-1.5">
                          {!p.isMasterPack && p.status === 'ativo' && (
                            <button
                              onClick={() => handleCreateMasterPackFromProduct(p, 10)}
                              className="p-1.5 hover:bg-amber-100/80 bg-amber-50/60 rounded-md text-amber-800 hover:text-amber-950 transition-colors cursor-pointer border border-amber-200"
                              title={`Criar Embalagem Master para "${p.description}" (Vender Caixa/Pacote c/ 10, 20 ou 30 unidades)`}
                            >
                              <Boxes size={14} />
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenEdit(p)}
                            className="p-1.5 hover:bg-slate-100 rounded-md text-slate-600 hover:text-slate-900 cursor-pointer"
                            title="Editar Dados do Produto"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            onClick={() => handleDeleteOrInactivate(p)}
                            className="p-1.5 hover:bg-rose-50 rounded-md text-rose-500 hover:text-rose-700"
                            title="Excluir ou Inativar"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Cadastro / Edição */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <form
            onSubmit={handleSaveProduct}
            className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-800">
                {editingProduct ? 'Editar Produto' : 'Novo Produto'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Código Interno *</label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">Descrição do Produto *</label>
                <input
                  type="text"
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Ex: Detergente Líquido 500ml"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Unidade de Medida</label>
                <select
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value as UnitOfMeasure })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold"
                >
                  <option value="UN">UN - Unidade</option>
                  <option value="KG">KG - Quilograma</option>
                  <option value="G">G - Grama</option>
                  <option value="L">L - Litro</option>
                  <option value="ML">ML - Mililitro</option>
                  <option value="M">M - Metro</option>
                  <option value="M²">M² - Metro Quadrado</option>
                  <option value="M³">M³ - Metro Cúbico</option>
                  <option value="CX">CX - Caixa</option>
                  <option value="PCT">PCT - Pacote</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Tipo de Produto</label>
                <select
                  value={formData.productType}
                  onChange={(e) => setFormData({ ...formData, productType: e.target.value as ProductType })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold"
                >
                  <option value="revenda">Revenda Comercial</option>
                  <option value="componente">Componente / Matéria-Prima</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Código de Barras (EAN)</label>
                <input
                  type="text"
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                  placeholder="789..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Família</label>
                <input
                  type="text"
                  value={formData.family}
                  onChange={(e) => setFormData({ ...formData, family: e.target.value })}
                  placeholder="Ex: Limpeza"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Grupo</label>
                <input
                  type="text"
                  value={formData.group}
                  onChange={(e) => setFormData({ ...formData, group: e.target.value })}
                  placeholder="Ex: Detergentes"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Local Padrão</label>
                <select
                  value={formData.defaultLocationId}
                  onChange={(e) => setFormData({ ...formData, defaultLocationId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold"
                >
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Custo Unitário (R$)</label>
                {canViewCosts ? (
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.costPrice}
                    onChange={(e) => setFormData({ ...formData, costPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold"
                  />
                ) : (
                  <div className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg font-mono text-slate-400 font-bold select-none cursor-not-allowed">
                    •••• (Acesso Restrito)
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Preço de Venda (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.salePrice}
                  onChange={(e) => setFormData({ ...formData, salePrice: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-blue-700"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Estoque Mínimo</label>
                <input
                  type="number"
                  min="0"
                  value={formData.minStock}
                  onChange={(e) => setFormData({ ...formData, minStock: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold"
                />
              </div>

              {/* SEÇÃO ESPECIAL: RECURSO EMBALAGEM MASTER */}
              <div className="sm:col-span-3 bg-gradient-to-br from-amber-50/80 via-orange-50/40 to-amber-50/80 border border-amber-300 rounded-xl p-4 space-y-3 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200/80 pb-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Boxes size={18} />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-amber-950 uppercase tracking-wide flex items-center gap-1.5">
                        <span>Recurso: Embalagem Master</span>
                        <span className="text-[10px] font-bold bg-amber-200/80 text-amber-900 px-1.5 py-0.2 rounded">
                          Atacado / Caixas / Fardos
                        </span>
                      </h4>
                      <p className="text-[11px] text-amber-800">
                        Venda caixas ou pacotes com 10, 20 ou 30 unidades vinculadas diretamente ao produto unitário.
                      </p>
                    </div>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-amber-300 shadow-2xs hover:bg-amber-100/60 transition-colors shrink-0">
                    <input
                      type="checkbox"
                      checked={!!formData.isMasterPack}
                      onChange={(e) => {
                        const isChecked = e.target.checked;
                        const defaultAssoc = availableUnitProducts[0];
                        setFormData({
                          ...formData,
                          isMasterPack: isChecked,
                          unit: isChecked && (formData.unit === 'UN' || !formData.unit) ? 'CX' : formData.unit,
                          masterPackUnits: formData.masterPackUnits || 10,
                          masterPackPackagingType: formData.masterPackPackagingType || 'caixa',
                          masterPackAssociatedProductId: isChecked
                            ? formData.masterPackAssociatedProductId || defaultAssoc?.id || ''
                            : '',
                          masterPackAssociatedProductCode: isChecked
                            ? formData.masterPackAssociatedProductCode || defaultAssoc?.code || ''
                            : '',
                          masterPackAssociatedProductDescription: isChecked
                            ? formData.masterPackAssociatedProductDescription || defaultAssoc?.description || ''
                            : '',
                          description: isChecked && (!formData.description || formData.description.trim() === '') && defaultAssoc
                            ? `Caixa ${defaultAssoc.description} c/ 10 UN`
                            : formData.description,
                        });
                      }}
                      className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-amber-950 select-none">
                      {formData.isMasterPack ? '✓ Embalagem Master Habilitada' : 'Habilitar Embalagem Master'}
                    </span>
                  </label>
                </div>

                {formData.isMasterPack && (
                  <div className="space-y-3 pt-1 animate-fadeIn">
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      {/* 1. Produto Unitário Associado */}
                      <div className="sm:col-span-2">
                        <label className="block font-bold text-amber-950 text-xs mb-1">
                          Produto Unitário Associado (Vende apenas 1 unidade) *
                        </label>
                        <select
                          value={formData.masterPackAssociatedProductId || ''}
                          onChange={(e) => {
                            const selectedId = e.target.value;
                            const target = dbState.products.find((p) => p.id === selectedId);
                            const units = formData.masterPackUnits || 10;
                            const packTypeLabel = formData.masterPackPackagingType === 'pacote' ? 'Pacote' : formData.masterPackPackagingType === 'fardo' ? 'Fardo' : 'Caixa';
                            setFormData({
                              ...formData,
                              masterPackAssociatedProductId: selectedId,
                              masterPackAssociatedProductCode: target?.code || '',
                              masterPackAssociatedProductDescription: target?.description || '',
                              description: target
                                ? `${packTypeLabel} ${target.description} c/ ${units} UN`
                                : formData.description,
                            });
                          }}
                          className="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                        >
                          <option value="">Selecione o produto unitário associado...</option>
                          {availableUnitProducts.map((p) => (
                            <option key={p.id} value={p.id}>
                              [{p.code}] {p.description} • Unidade: {p.unit} (Custo: {formatCurrency(p.costPrice)} | Venda: {formatCurrency(p.salePrice)})
                            </option>
                          ))}
                        </select>
                        <span className="text-[10px] text-amber-900/80 mt-0.5 block">
                          Toda venda desta Embalagem Master deduzirá automaticamente o estoque do produto unitário selecionado acima.
                        </span>
                      </div>

                      {/* 2. Tipo de Embalagem */}
                      <div>
                        <label className="block font-bold text-amber-950 text-xs mb-1">
                          Tipo de Embalagem
                        </label>
                        <select
                          value={formData.masterPackPackagingType || 'caixa'}
                          onChange={(e) => {
                            const newPackType = e.target.value as any;
                            const assoc = dbState.products.find((p) => p.id === formData.masterPackAssociatedProductId);
                            const units = formData.masterPackUnits || 10;
                            const packPrefix = newPackType === 'pacote' ? 'Pacote' : newPackType === 'fardo' ? 'Fardo' : newPackType === 'display' ? 'Display' : newPackType === 'kit' ? 'Kit' : 'Caixa';
                            const newUnit: UnitOfMeasure = newPackType === 'pacote' ? 'PCT' : 'CX';
                            setFormData({
                              ...formData,
                              masterPackPackagingType: newPackType,
                              unit: newUnit,
                              description: assoc
                                ? `${packPrefix} ${assoc.description} c/ ${units} UN`
                                : formData.description,
                            });
                          }}
                          className="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                        >
                          <option value="caixa">Caixa (CX)</option>
                          <option value="pacote">Pacote (PCT)</option>
                          <option value="fardo">Fardo (FARDO)</option>
                          <option value="display">Display</option>
                          <option value="kit">Kit / Conjunto</option>
                          <option value="outro">Outro</option>
                        </select>
                      </div>

                      {/* 3. Quantidade de Unidades por Embalagem Master */}
                      <div>
                        <label className="block font-bold text-amber-950 text-xs mb-1">
                          Unidades p/ Embalagem *
                        </label>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          required={formData.isMasterPack}
                          value={formData.masterPackUnits || 10}
                          onChange={(e) => {
                            const units = Math.max(1, parseInt(e.target.value) || 1);
                            const assoc = dbState.products.find((p) => p.id === formData.masterPackAssociatedProductId);
                            const packPrefix = formData.masterPackPackagingType === 'pacote' ? 'Pacote' : formData.masterPackPackagingType === 'fardo' ? 'Fardo' : 'Caixa';
                            setFormData({
                              ...formData,
                              masterPackUnits: units,
                              description: assoc
                                ? `${packPrefix} ${assoc.description} c/ ${units} UN`
                                : formData.description,
                            });
                          }}
                          className="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg text-xs font-mono font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                        />
                        {/* Botões de atalho rápido */}
                        <div className="flex items-center gap-1 mt-1 flex-wrap">
                          <span className="text-[10px] text-amber-900 font-bold mr-0.5">Sugestões:</span>
                          {[10, 12, 20, 24, 30, 50].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => {
                                const assoc = dbState.products.find((p) => p.id === formData.masterPackAssociatedProductId);
                                const packPrefix = formData.masterPackPackagingType === 'pacote' ? 'Pacote' : formData.masterPackPackagingType === 'fardo' ? 'Fardo' : 'Caixa';
                                setFormData({
                                  ...formData,
                                  masterPackUnits: preset,
                                  description: assoc
                                    ? `${packPrefix} ${assoc.description} c/ ${preset} UN`
                                    : formData.description,
                                });
                              }}
                              className={`px-1.5 py-0.5 text-[10px] rounded font-bold border transition-colors cursor-pointer ${
                                formData.masterPackUnits === preset
                                  ? 'bg-amber-600 text-white border-amber-700'
                                  : 'bg-white text-amber-950 border-amber-300 hover:bg-amber-100'
                              }`}
                            >
                              {preset}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Resumo Dinâmico com Estoque do Associado e Sugestões de Preço */}
                    {(() => {
                      const assoc = dbState.products.find((p) => p.id === formData.masterPackAssociatedProductId);
                      if (!assoc) return null;
                      const units = formData.masterPackUnits || 10;
                      const calculatedCost = Number((assoc.costPrice * units).toFixed(2));
                      const calculatedSale = Number((assoc.salePrice * units).toFixed(2));
                      const assocStock = StockEngine.getTotalProductStock(dbState.stockBalances, assoc.id);
                      const availablePacks = Math.floor(assocStock.available / units);

                      return (
                        <div className="bg-white/95 border border-amber-300 rounded-xl p-3 text-xs space-y-2 shadow-2xs">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-bold text-slate-800 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                              Produto associado: <span className="text-blue-700 font-mono font-extrabold">{assoc.code}</span> - {assoc.description}
                            </span>
                            <span className="text-[11px] font-black bg-emerald-100 text-emerald-900 px-2.5 py-0.5 rounded-full border border-emerald-300">
                              Estoque Disponível da Caixa: {availablePacks} {formData.unit || 'CX'} ({assocStock.available} {assoc.unit} no unitário)
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-100 text-[11px]">
                            <div className="flex items-center justify-between bg-slate-50 p-2 rounded-lg border border-slate-200">
                              <span>
                                Custo Sugerido ({formatCurrency(assoc.costPrice)} x {units}): <strong className="text-slate-800">{formatCurrency(calculatedCost)}</strong>
                              </span>
                              <button
                                type="button"
                                onClick={() => setFormData({ ...formData, costPrice: calculatedCost })}
                                className="text-[10px] font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded border border-blue-200 cursor-pointer transition-colors"
                              >
                                Aplicar Custo
                              </button>
                            </div>
                            <div className="flex items-center justify-between bg-slate-50 p-2 rounded-lg border border-slate-200">
                              <span>
                                Venda Sugerida ({formatCurrency(assoc.salePrice)} x {units}): <strong className="text-slate-800">{formatCurrency(calculatedSale)}</strong>
                              </span>
                              <button
                                type="button"
                                onClick={() => setFormData({ ...formData, salePrice: calculatedSale })}
                                className="text-[10px] font-bold text-emerald-800 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200 cursor-pointer transition-colors"
                              >
                                Aplicar Venda
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              <div className="sm:col-span-3 flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={formData.hasComposition}
                    onChange={(e) => setFormData({ ...formData, hasComposition: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded-sm"
                  />
                  <span>Produto de Fabricação Própria (Possui Composição)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={formData.status === 'ativo'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.checked ? 'ativo' : 'inativo' })}
                    className="w-4 h-4 text-blue-600 rounded-sm"
                  />
                  <span>Cadastro Ativo</span>
                </label>
              </div>

              <div className="sm:col-span-3">
                <label className="block font-bold text-slate-700 mb-1">Observações Técnicas</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Informações adicionais, lote padrão ou instruções de manuseio..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-xs"
              >
                Salvar Produto
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal de Detalhamento de Estoque por Local */}
      {viewStockProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-5 space-y-4">
            <div className="flex justify-between items-start pb-2 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-sm text-slate-800">
                  Distribuição de Estoque por Local
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {viewStockProduct.code} - {viewStockProduct.description}
                </p>
              </div>
              <button
                onClick={() => setViewStockProduct(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            {viewStockProduct.isMasterPack && (
              <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 text-xs text-amber-950 flex items-start gap-2.5 shadow-2xs">
                <Boxes size={18} className="text-amber-700 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <div className="font-extrabold text-amber-900">
                    Embalagem Master ({viewStockProduct.masterPackUnits} unidades por {viewStockProduct.unit})
                  </div>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    O estoque desta embalagem é controlado e sincronizado diretamente através do produto unitário <strong className="font-mono text-amber-950">[{viewStockProduct.masterPackAssociatedProductCode}]</strong> ({viewStockProduct.masterPackAssociatedProductDescription}). Cada caixa vendida deduz {viewStockProduct.masterPackUnits} unidades no local da operação.
                  </p>
                </div>
              </div>
            )}

            <div className="divide-y divide-slate-100 text-xs">
              {locations.map((loc) => {
                const bal = StockEngine.getBalance(dbState.stockBalances, viewStockProduct.id, loc.id);
                return (
                  <div key={loc.id} className="py-2.5 flex justify-between items-center">
                    <div>
                      <div className="font-bold text-slate-700">{loc.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{loc.code} ({loc.type})</div>
                    </div>
                    <div className="text-right">
                      <div className="font-extrabold text-sm text-slate-900">
                        {formatQuantity(bal.quantity)} {viewStockProduct.unit}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Reservado: {formatQuantity(bal.reserved)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-between items-center font-bold text-xs bg-slate-50 p-2.5 rounded-lg">
              <span className="text-slate-700">Saldo Total Consolidado:</span>
              <span className="text-blue-700 text-sm">
                {formatQuantity(StockEngine.getTotalProductStock(dbState.stockBalances, viewStockProduct.id).physical)} {viewStockProduct.unit}
              </span>
            </div>

            <div className="flex justify-end pt-1">
              <button
                onClick={() => setViewStockProduct(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
