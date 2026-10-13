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

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFamily, setSelectedFamily] = useState('todos');
  const [selectedType, setSelectedType] = useState('todos');
  const [selectedStatus, setSelectedStatus] = useState('todos');

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
  });

  const locations = dbState.stockLocations.filter((l) => l.companyId === currentCompany.id);

  const families = ['todos', ...Array.from(new Set(dbState.products.map((p) => p.family).filter(Boolean)))];

  const filteredProducts = dbState.products.filter((p) => {
    const matchesSearch =
      searchTerm === '' ||
      p.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.barcode.includes(searchTerm);
    const matchesFamily = selectedFamily === 'todos' || p.family === selectedFamily;
    const matchesType = selectedType === 'todos' || p.productType === selectedType;
    const matchesStatus = selectedStatus === 'todos' || p.status === selectedStatus;
    return matchesSearch && matchesFamily && matchesType && matchesStatus;
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
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({ ...product });
    setIsModalOpen(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.code?.trim() || !formData.description?.trim()) {
      alert('Código e Descrição são campos obrigatórios.');
      return;
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

    if (editingProduct) {
      // Atualizar existente
      state.products = state.products.map((p) =>
        p.id === editingProduct.id
          ? ({
              ...p,
              ...formData,
              costPrice: Number(formData.costPrice || 0),
              salePrice: Number(formData.salePrice || 0),
              minStock: Number(formData.minStock || 0),
            } as Product)
          : p
      );
      Database.addAuditLog('ATUALIZAR_PRODUTO', 'CADASTROS', editingProduct.id, `Produto ${formData.description} atualizado`);
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

      Database.addAuditLog('CRIAR_PRODUTO', 'CADASTROS', newProd.id, `Produto ${newProd.description} cadastrado`);
    }

    Database.persist();
    setIsModalOpen(false);
  };

  // Excluir ou Inativar respeitando integridade histórica
  const handleDeleteOrInactivate = (product: Product) => {
    // Checar se o produto tem vendas ou compras
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
            onClick={handleOpenNew}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-xs transition-colors"
          >
            <Plus size={15} />
            <span>Novo Produto</span>
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-2.5">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-xs">
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Buscar por código, descrição ou código de barras..."
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
                        <div className="font-semibold text-slate-800">{p.description}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2">
                          <span>Unidade: {p.unit}</span>
                          {p.barcode && <span>• EAN: {p.barcode}</span>}
                          {p.hasComposition && (
                            <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded-sm border border-blue-200 font-semibold">
                              Fabricação Própria
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
                        {currentUser.permissions.canViewCosts ? formatCurrency(p.costPrice) : '••••'}
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
                          <button
                            onClick={() => handleOpenEdit(p)}
                            className="p-1.5 hover:bg-slate-100 rounded-md text-slate-600 hover:text-slate-900"
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
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.costPrice}
                  onChange={(e) => setFormData({ ...formData, costPrice: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold"
                />
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
