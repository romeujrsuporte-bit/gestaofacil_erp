import React, { useState, useEffect } from 'react';
import {
  Calculator,
  Percent,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Info,
  Layers,
  History,
  TrendingUp,
  FileCheck,
  Check,
  X,
  Clock,
  Package,
  Boxes,
  Filter,
  SlidersHorizontal,
  Search,
  Tag,
  ArrowUpRight,
  ArrowDownRight,
  ListFilter,
  CheckCheck
} from 'lucide-react';
import { Database } from '../../services/db';
import { Product } from '../../types';
import { calculateSuggestedPrice, formatCurrency } from '../../services/pricingEngine';
import { toast } from '../../services/toast';

export interface BatchUpdatedProductRecord {
  id: string;
  code: string;
  description: string;
  family?: string;
  group?: string;
  unit?: string;
  previousPrice: number;
  newPrice: number;
  priceDiff: number;
  percentDiff: number;
  previousCost: number;
  newCost: number;
  timestamp: string;
}

export const PricingView: React.FC<{ initialSubTab?: 'individual' | 'em_lote' }> = ({
  initialSubTab = 'individual',
}) => {
  const [dbState, setDbState] = useState(Database.getState());
  const currentCompany = Database.getCurrentCompany();
  const currentUser = Database.getCurrentUser();
  const canViewCosts = Database.canCurrentUserView('productCosts');
  const canViewProfitMargin = Database.canCurrentUserView('profitMargin');

  useEffect(() => {
    return Database.subscribe(() => {
      setDbState({ ...Database.getState() });
    });
  }, []);

  const [activeTab, setActiveTab] = useState<'individual' | 'em_lote'>(initialSubTab);

  // Estados da Precificação Individual
  const [selectedProductId, setSelectedProductId] = useState<string>('prod-detergente-500');
  const [costPrice, setCostPrice] = useState<number>(1.84);
  const [taxPercent, setTaxPercent] = useState<number>(6.0);
  const [operatingExpensesPercent, setOperatingExpensesPercent] = useState<number>(12.0);
  const [salesCommissionPercent, setSalesCommissionPercent] = useState<number>(3.0);
  const [otherCostsPercent, setOtherCostsPercent] = useState<number>(2.0);
  const [profitMarginPercent, setProfitMarginPercent] = useState<number>(25.0);

  // Estados de Custos Adicionais (Flag, Custo Indireto e Mão de Obra Direta)
  const [enableAdditionalCosts, setEnableAdditionalCosts] = useState<boolean>(false);
  const [indirectCostPerUnit, setIndirectCostPerUnit] = useState<number>(0);
  const [directLaborCostPerUnit, setDirectLaborCostPerUnit] = useState<number>(0);

  // Estados da Atualização em Lote (Ao abrir, os percentuais iniciam zerados em 0)
  const [batchScope, setBatchScope] = useState<'todos' | 'familia' | 'grupo' | 'familia_e_grupo'>('todos');
  const [batchTargetFamily, setBatchTargetFamily] = useState<string>('');
  const [batchTargetGroup, setBatchTargetGroup] = useState<string>('');
  const [batchTaxPercent, setBatchTaxPercent] = useState<number>(0);
  const [batchExpensesPercent, setBatchExpensesPercent] = useState<number>(0);
  const [batchCommissionPercent, setBatchCommissionPercent] = useState<number>(0);
  const [batchOtherCostsPercent, setBatchOtherCostsPercent] = useState<number>(0);
  const [batchProfitPercent, setBatchProfitPercent] = useState<number>(25.0);
  const [batchApplyToSalePrice, setBatchApplyToSalePrice] = useState<boolean>(true);
  const [batchPreviewVisible, setBatchPreviewVisible] = useState<boolean>(false);

  // Garantir que ao abrir/alternar para a tela de Atualização em Lote, os percentuais comecem zerados (0)
  useEffect(() => {
    if (activeTab === 'em_lote') {
      setBatchTaxPercent(0);
      setBatchExpensesPercent(0);
      setBatchCommissionPercent(0);
      setBatchOtherCostsPercent(0);
    }
  }, [activeTab]);

  // Estados de Custos Adicionais na Atualização em Lote (Custo Indireto e Mão de Obra Direta)
  const [batchUpdateAdditionalCosts, setBatchUpdateAdditionalCosts] = useState<boolean>(false);
  const [batchEnableAdditionalCosts, setBatchEnableAdditionalCosts] = useState<boolean>(true);
  const [batchIndirectCost, setBatchIndirectCost] = useState<number>(0);
  const [batchDirectLaborCost, setBatchDirectLaborCost] = useState<number>(0);

  // Estados de confirmação e avisos visuais
  const [saveSuccessFeedback, setSaveSuccessFeedback] = useState<{
    productDescription: string;
    oldPrice: number;
    newPrice: number;
    marginPercent: number;
    time: string;
    enableAdditionalCosts: boolean;
    baseCost: number;
    effectiveCost: number;
    indirectCost: number;
    directLaborCost: number;
  } | null>(null);
  const [isSavedRecently, setIsSavedRecently] = useState<boolean>(false);

  const [showBatchConfirmModal, setShowBatchConfirmModal] = useState<boolean>(false);
  const [batchSuccessFeedback, setBatchSuccessFeedback] = useState<{
    updatedCount: number;
    marginPercent: number;
    time: string;
    filterText?: string;
    additionalCostsNote?: string;
  } | null>(null);

  // Estados da listagem lateral na Atualização em Lote (Produtos no Filtro / Produtos Atualizados)
  const [batchRightTab, setBatchRightTab] = useState<'filtrados' | 'atualizados'>('filtrados');
  const [batchSearchTerm, setBatchSearchTerm] = useState<string>('');
  const [batchLastUpdatedList, setBatchLastUpdatedList] = useState<BatchUpdatedProductRecord[]>([]);

  // Sincronizar campos quando o produto selecionado mudar
  const selectedProduct = dbState.products.find((p) => p.id === selectedProductId);
  useEffect(() => {
    if (selectedProduct) {
      setCostPrice(selectedProduct.costPrice || 0);
      setTaxPercent(selectedProduct.taxPercent ?? 6.0);
      setOperatingExpensesPercent(selectedProduct.operatingExpensesPercent ?? 10.0);
      setSalesCommissionPercent(selectedProduct.salesCommissionPercent ?? 3.0);
      setOtherCostsPercent(selectedProduct.otherCostsPercent ?? 1.0);
      setProfitMarginPercent(selectedProduct.profitMarginPercent ?? 20.0);
      setEnableAdditionalCosts(selectedProduct.enableAdditionalCosts ?? false);
      setIndirectCostPerUnit(selectedProduct.indirectCostPerUnit ?? 0);
      setDirectLaborCostPerUnit(selectedProduct.directLaborCostPerUnit ?? 0);
      setSaveSuccessFeedback(null);
    }
  }, [selectedProductId]);

  // Cálculo Dinâmico Individual (considerando custos adicionais se habilitados)
  const calculationResult = calculateSuggestedPrice({
    costPrice,
    taxPercent,
    operatingExpensesPercent,
    salesCommissionPercent,
    otherCostsPercent,
    profitMarginPercent,
    enableAdditionalCosts,
    indirectCostPerUnit,
    directLaborCostPerUnit,
  });

  // Salvar Precificação no Produto
  const handleApplyPricingToProduct = () => {
    if (!calculationResult.isValid) {
      toast.error(calculationResult.errorMessage || 'Corrija os percentuais antes de salvar.', 'Validação de Precificação');
      return;
    }
    if (!selectedProduct) return;

    const oldPrice = selectedProduct.salePrice || 0;
    const newPrice = calculationResult.suggestedSalePrice;
    const nowTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const state = Database.getState();
    state.products = state.products.map((p) =>
      p.id === selectedProductId
        ? {
            ...p,
            costPrice,
            salePrice: newPrice,
            taxPercent,
            operatingExpensesPercent,
            salesCommissionPercent,
            otherCostsPercent,
            profitMarginPercent,
            enableAdditionalCosts,
            indirectCostPerUnit,
            directLaborCostPerUnit,
          }
        : p
    );
    Database.persist();

    const additionalCostDetail = enableAdditionalCosts
      ? ` (Custo Base: ${formatCurrency(costPrice)} + Indireto: ${formatCurrency(indirectCostPerUnit)} + MOD: ${formatCurrency(directLaborCostPerUnit)} = Custo Final: ${formatCurrency(calculationResult.effectiveCostPrice)})`
      : ` (Custo Base: ${formatCurrency(costPrice)})`;

    Database.addAuditLog(
      'PRECIFICACAO_ATUALIZADA',
      'PRECIFICACAO',
      selectedProductId,
      `Preço de venda do produto ${selectedProduct.description} atualizado de ${formatCurrency(oldPrice)} para ${formatCurrency(newPrice)} (Margem: ${profitMarginPercent}%)${additionalCostDetail}`
    );

    // Feedback visual na tela
    setSaveSuccessFeedback({
      productDescription: selectedProduct.description,
      oldPrice,
      newPrice,
      marginPercent: profitMarginPercent,
      time: nowTime,
      enableAdditionalCosts,
      baseCost: costPrice,
      effectiveCost: calculationResult.effectiveCostPrice,
      indirectCost: indirectCostPerUnit,
      directLaborCost: directLaborCostPerUnit,
    });
    setIsSavedRecently(true);
    setTimeout(() => {
      setIsSavedRecently(false);
    }, 4000);

    // Notificação Toast garantida
    toast.success(
      `O produto "${selectedProduct.description}" teve seu preço de venda atualizado para ${formatCurrency(newPrice)} (Margem: ${profitMarginPercent}%).`,
      'Preço Atualizado com Sucesso!'
    );
  };

  // Listas de famílias e grupos cadastrados no sistema
  const families = Array.from(new Set(dbState.products.map((p) => p.family).filter(Boolean))).sort();
  const allGroups = Array.from(new Set(dbState.products.map((p) => p.group).filter(Boolean))).sort();
  const availableGroups = Array.from(
    new Set(
      dbState.products
        .filter((p) => (batchScope === 'familia_e_grupo' && batchTargetFamily ? p.family === batchTargetFamily : true))
        .map((p) => p.group)
        .filter(Boolean)
    )
  ).sort();

  // Texto legível do escopo de filtro aplicado
  const getFilterText = () => {
    if (batchScope === 'todos') return 'Todos os Produtos Ativos';
    if (batchScope === 'familia') return `Família: ${batchTargetFamily || 'Todas as Famílias'}`;
    if (batchScope === 'grupo') return `Grupo: ${batchTargetGroup || 'Todos os Grupos'}`;
    if (batchScope === 'familia_e_grupo') {
      const parts = [];
      if (batchTargetFamily) parts.push(`Família: ${batchTargetFamily}`);
      if (batchTargetGroup) parts.push(`Grupo: ${batchTargetGroup}`);
      return parts.length ? parts.join(' + ') : 'Família e Grupo (Geral)';
    }
    return 'Geral';
  };

  // Produtos afetados pelo lote de acordo com os filtros de Família e Grupo
  const batchTargetProducts = dbState.products.filter((p) => {
    if (p.status !== 'ativo') return false;
    if (batchScope === 'familia') {
      if (!batchTargetFamily) return true;
      return p.family === batchTargetFamily;
    }
    if (batchScope === 'grupo') {
      if (!batchTargetGroup) return true;
      return p.group === batchTargetGroup;
    }
    if (batchScope === 'familia_e_grupo') {
      if (batchTargetFamily && p.family !== batchTargetFamily) return false;
      if (batchTargetGroup && p.group !== batchTargetGroup) return false;
      return true;
    }
    return true;
  });

  // Validação: indica se ao menos um dos percentuais de custos/despesas s/ venda foi preenchido (> 0)
  const hasBatchPercentagesFilled =
    batchTaxPercent > 0 ||
    batchExpensesPercent > 0 ||
    batchCommissionPercent > 0 ||
    batchOtherCostsPercent > 0;

  // Função auxiliar para calcular a precificação de um item no lote (considerando Custos Adicionais se habilitados)
  const getBatchProductPricing = (p: Product) => {
    const useAdditional = batchUpdateAdditionalCosts
      ? batchEnableAdditionalCosts
      : (p.enableAdditionalCosts ?? false);
    const indCost = batchUpdateAdditionalCosts
      ? (batchEnableAdditionalCosts ? batchIndirectCost : 0)
      : (p.indirectCostPerUnit ?? 0);
    const modCost = batchUpdateAdditionalCosts
      ? (batchEnableAdditionalCosts ? batchDirectLaborCost : 0)
      : (p.directLaborCostPerUnit ?? 0);

    const effectiveCost = p.costPrice + (useAdditional ? indCost + modCost : 0);

    // Se os percentuais de Impostos, Despesas, Comissão e Outros Custos estiverem zerados (0),
    // o "Novo Preço Simulado" também permanece zerado (0).
    if (!hasBatchPercentagesFilled) {
      return {
        baseCostPrice: p.costPrice,
        indirectCostPerUnit: indCost,
        directLaborCostPerUnit: modCost,
        enableAdditionalCosts: useAdditional,
        effectiveCostPrice: effectiveCost,
        costPrice: effectiveCost,
        taxPercent: 0,
        operatingExpensesPercent: 0,
        salesCommissionPercent: 0,
        otherCostsPercent: 0,
        profitMarginPercent: batchProfitPercent,
        totalPercentageDeductions: 0,
        suggestedSalePrice: 0, // Zerado (0)
        grossProfitValue: 0,
        netMarginPercent: 0,
        markupMultiplier: 0,
        markupPercent: 0,
        isValid: true,
        breakdown: [],
        useAdditional,
        indCost,
        modCost,
        additionalTotal: useAdditional ? indCost + modCost : 0,
      };
    }

    const res = calculateSuggestedPrice({
      costPrice: p.costPrice,
      taxPercent: batchTaxPercent,
      operatingExpensesPercent: batchExpensesPercent,
      salesCommissionPercent: batchCommissionPercent,
      otherCostsPercent: batchOtherCostsPercent,
      profitMarginPercent: batchProfitPercent,
      enableAdditionalCosts: useAdditional,
      indirectCostPerUnit: indCost,
      directLaborCostPerUnit: modCost,
    });

    return {
      ...res,
      useAdditional,
      indCost,
      modCost,
      additionalTotal: useAdditional ? indCost + modCost : 0,
    };
  };

  // Abrir Modal de Confirmação em Lote
  const handleOpenBatchConfirm = () => {
    if (batchTargetProducts.length === 0) {
      toast.warning('Nenhum produto encontrado no filtro selecionado.', 'Filtro Vazio');
      return;
    }
    if (!hasBatchPercentagesFilled) {
      toast.warning(
        'Os percentuais estão zerados (0%). Preencha ao menos um percentual (Impostos, Despesas Operacionais, Comissão ou Outros Custos) para calcular o Novo Preço Simulado antes de aplicar a atualização em lote.',
        'Percentuais Zerados'
      );
      return;
    }
    setShowBatchConfirmModal(true);
  };

  // Executar Atualização em Lote Confirmada
  const handleExecuteBatchUpdateConfirmed = () => {
    setShowBatchConfirmModal(false);
    const state = Database.getState();
    let updatedCount = 0;
    const updatedRecords: BatchUpdatedProductRecord[] = [];
    const nowTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    state.products = state.products.map((p) => {
      const isTarget = batchTargetProducts.some((tp) => tp.id === p.id);
      if (!isTarget) return p;

      const pricing = getBatchProductPricing(p);
      updatedCount++;

      const prevPrice = p.salePrice || 0;
      const newPrice =
        batchApplyToSalePrice && pricing.isValid && pricing.suggestedSalePrice > 0
          ? pricing.suggestedSalePrice
          : p.salePrice;

      const prevAdditional = p.enableAdditionalCosts
        ? (p.indirectCostPerUnit || 0) + (p.directLaborCostPerUnit || 0)
        : 0;
      const prevCost = p.costPrice + prevAdditional;
      const newCost = pricing.effectiveCostPrice;
      const diff = newPrice - prevPrice;
      const pct = prevPrice > 0 ? (diff / prevPrice) * 100 : 0;

      updatedRecords.push({
        id: p.id,
        code: p.code,
        description: p.description,
        family: p.family,
        group: p.group,
        unit: p.unit,
        previousPrice: prevPrice,
        newPrice: newPrice,
        priceDiff: diff,
        percentDiff: pct,
        previousCost: prevCost,
        newCost: newCost,
        timestamp: nowTime,
      });

      const updatedProduct: Product = {
        ...p,
        taxPercent: batchTaxPercent,
        operatingExpensesPercent: batchExpensesPercent,
        salesCommissionPercent: batchCommissionPercent,
        otherCostsPercent: batchOtherCostsPercent,
        profitMarginPercent: batchProfitPercent,
        salePrice: newPrice,
      };

      if (batchUpdateAdditionalCosts) {
        updatedProduct.enableAdditionalCosts = batchEnableAdditionalCosts;
        if (batchEnableAdditionalCosts) {
          updatedProduct.indirectCostPerUnit = batchIndirectCost;
          updatedProduct.directLaborCostPerUnit = batchDirectLaborCost;
        } else {
          updatedProduct.indirectCostPerUnit = 0;
          updatedProduct.directLaborCostPerUnit = 0;
        }
      }

      return updatedProduct;
    });

    Database.persist();
    setBatchLastUpdatedList(updatedRecords);
    setBatchRightTab('atualizados');

    const filterText = getFilterText();
    const additionalCostDetail = batchUpdateAdditionalCosts
      ? batchEnableAdditionalCosts
        ? ` (Custos Adicionais Atualizados: Indireto ${formatCurrency(batchIndirectCost)} + MOD ${formatCurrency(batchDirectLaborCost)} = +${formatCurrency(batchIndirectCost + batchDirectLaborCost)}/un)`
        : ' (Custos Adicionais Desabilitados)'
      : '';

    Database.addAuditLog(
      'PRECIFICACAO_EM_LOTE',
      'PRECIFICACAO',
      'LOTE',
      `Atualização em lote aplicada a ${updatedCount} produtos [${filterText}] por ${currentUser.name} (Margem: ${batchProfitPercent}%, Impostos: ${batchTaxPercent}%)${additionalCostDetail}`
    );

    // Registrar feedback e atualizar feedback em tela
    setBatchSuccessFeedback({
      updatedCount,
      marginPercent: batchProfitPercent,
      time: nowTime,
      filterText,
      additionalCostsNote: batchUpdateAdditionalCosts
        ? batchEnableAdditionalCosts
          ? `Custos Adicionais: +${formatCurrency(batchIndirectCost + batchDirectLaborCost)}/un (Indireto: ${formatCurrency(batchIndirectCost)} + MOD: ${formatCurrency(batchDirectLaborCost)})`
          : 'Custos Adicionais desabilitados no lote'
        : undefined,
    });

    toast.success(
      `Atualização em lote concluída com êxito! ${updatedCount} produtos foram atualizados no cadastro [${filterText}].`,
      'Lote Atualizado com Sucesso!'
    );
    setBatchPreviewVisible(false);
  };

  return (
    <div className="space-y-4">
      {/* Topo / Seletor de Sub-Abas */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Calculator className="text-blue-600" size={20} />
            <span>Módulo de Precificação, Custos e Margens</span>
          </h2>
          <p className="text-xs text-slate-500">
            Fórmula de margem sobre a receita líquida, memória de cálculo transparente e recálculo em lote.
          </p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
          <button
            onClick={() => setActiveTab('individual')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'individual' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calculator size={14} />
            <span>Precificação Individual</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('em_lote');
              setBatchTaxPercent(0);
              setBatchExpensesPercent(0);
              setBatchCommissionPercent(0);
              setBatchOtherCostsPercent(0);
            }}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'em_lote' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Percent size={14} />
            <span>Atualização em Lote</span>
          </button>
        </div>
      </div>

      {/* SUB-ABA 1: PRECIFICAÇÃO INDIVIDUAL COM MEMÓRIA DE CÁLCULO */}
      {activeTab === 'individual' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Lado Esquerdo: Formulário de Parâmetros (6 cols) */}
          <div className="lg:col-span-6 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            {/* DESTAQUE HARMÔNICO EM TONS DE VERDE: SELETOR DE PRODUTO E PRODUTO SELECIONADO */}
            <div className="p-4 rounded-2xl border-2 border-emerald-400 bg-linear-to-br from-emerald-50 via-emerald-50/70 to-teal-50/40 shadow-xs ring-1 ring-emerald-300/40 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-emerald-600 text-white rounded-lg shadow-2xs">
                    <Package size={16} />
                  </div>
                  <label htmlFor="product-select" className="block text-xs font-black text-emerald-950 uppercase tracking-wide">
                    Selecione o Produto para Precificar:
                  </label>
                </div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                  Item Selecionado
                </span>
              </div>

              <div className="relative">
                <select
                  id="product-select"
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full bg-white border-2 border-emerald-500 hover:border-emerald-600 focus:border-emerald-600 rounded-xl p-2.5 text-xs font-bold text-emerald-950 focus:ring-3 focus:ring-emerald-200/80 shadow-xs cursor-pointer transition-all"
                >
                  {dbState.products
                    .filter((p) => p.status === 'ativo')
                    .map((p) => (
                      <option key={p.id} value={p.id} className="text-slate-800 py-1 font-semibold">
                        {p.code} - {p.description} (Custo: {formatCurrency(p.costPrice)})
                      </option>
                    ))}
                </select>
              </div>

              {/* CARD DE DESTAQUE DO PRODUTO SELECIONADO */}
              {selectedProduct && (
                <div className="p-3 bg-white/95 rounded-xl border border-emerald-300 shadow-2xs space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-700 text-white font-mono text-[11px] font-extrabold tracking-wide shadow-2xs">
                          {selectedProduct.code}
                        </span>
                        {selectedProduct.family && (
                          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-200">
                            {selectedProduct.family}
                          </span>
                        )}
                        {selectedProduct.hasComposition && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                            <Boxes size={11} />
                            Composição Própria
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs sm:text-sm font-black text-emerald-950 mt-1 truncate">
                        {selectedProduct.description}
                      </h4>
                    </div>

                    <div className="shrink-0 text-right pl-2">
                      <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                        Preço Vigente
                      </span>
                      <span className="text-sm font-black text-emerald-900">
                        {formatCurrency(selectedProduct.salePrice || 0)}
                      </span>
                    </div>
                  </div>

                  {/* Resumo harmônico em tons de verde das métricas do produto */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-emerald-100 text-center">
                    <div className="bg-emerald-50/80 p-1.5 rounded-lg border border-emerald-200">
                      <span className="text-[10px] font-bold text-emerald-800 uppercase block">Custo Base</span>
                      <span className="text-xs font-black text-emerald-950">
                        {formatCurrency(selectedProduct.costPrice || 0)}
                      </span>
                    </div>
                    <div className="bg-emerald-50/80 p-1.5 rounded-lg border border-emerald-200">
                      <span className="text-[10px] font-bold text-emerald-800 uppercase block">Margem Alvo</span>
                      <span className="text-xs font-black text-emerald-950">
                        {selectedProduct.profitMarginPercent ?? 20}%
                      </span>
                    </div>
                    <div className="bg-emerald-50/80 p-1.5 rounded-lg border border-emerald-200">
                      <span className="text-[10px] font-bold text-emerald-800 uppercase block">Unidade</span>
                      <span className="text-xs font-black text-emerald-950 uppercase">
                        {selectedProduct.unit || 'UN'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Custo de Referência (R$) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={costPrice}
                  onChange={(e) => setCostPrice(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-900"
                />
                {selectedProduct?.hasComposition && (
                  <span className="text-[10px] text-blue-600 font-semibold block mt-0.5">
                    ✓ Custo calculado pela composição
                  </span>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Preço de Venda Atual (R$)</label>
                <input
                  type="text"
                  disabled
                  value={formatCurrency(selectedProduct?.salePrice || 0)}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg font-bold text-slate-500"
                />
              </div>
            </div>

            {/* FLAG E RECURSO DE CUSTOS ADICIONAIS (CUSTO INDIRETO E MÃO DE OBRA DIRETA) */}
            <div
              className={`p-3.5 rounded-xl border transition-all ${
                enableAdditionalCosts
                  ? 'bg-emerald-50/70 border-emerald-300 ring-1 ring-emerald-200/80 shadow-2xs'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={enableAdditionalCosts}
                    onChange={(e) => setEnableAdditionalCosts(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded-sm focus:ring-emerald-500 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <span>Custos Adicionais</span>
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                          enableAdditionalCosts
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : 'bg-slate-200 text-slate-600 border-slate-300'
                        }`}
                      >
                        {enableAdditionalCosts ? 'Habilitado' : 'Desabilitado'}
                      </span>
                    </span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      Adicione rateio de Custo Indireto e Mão de Obra Direta ao custo final do produto
                    </span>
                  </div>
                </label>
              </div>

              {enableAdditionalCosts && (
                <div className="mt-3 pt-3 border-t border-emerald-200/80 space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Custo Indireto (R$ / {selectedProduct?.unit || 'un'}) *
                      </label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-2 text-xs font-bold text-slate-400">R$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0,00"
                          value={indirectCostPerUnit}
                          onChange={(e) => setIndirectCostPerUnit(parseFloat(e.target.value) || 0)}
                          className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-lg font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        Base: R$ / {selectedProduct?.unit || 'unidade'}
                      </span>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Mão de Obra Direta (R$ / {selectedProduct?.unit || 'un'}) *
                      </label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-2 text-xs font-bold text-slate-400">R$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0,00"
                          value={directLaborCostPerUnit}
                          onChange={(e) => setDirectLaborCostPerUnit(parseFloat(e.target.value) || 0)}
                          className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-lg font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        Base: R$ / {selectedProduct?.unit || 'unidade'}
                      </span>
                    </div>
                  </div>

                  {/* Resumo do Custo Final do Produto com os adicionais */}
                  <div className="p-2.5 bg-white/95 border border-emerald-300 rounded-lg flex flex-wrap items-center justify-between gap-2 text-xs shadow-2xs">
                    <div className="text-slate-600 text-[11px] font-medium">
                      <span>Custo Base ({formatCurrency(costPrice)}) + Indireto ({formatCurrency(indirectCostPerUnit)}) + MOD ({formatCurrency(directLaborCostPerUnit)})</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="text-slate-500 font-semibold uppercase text-[10px]">Custo Final do Produto:</span>
                      <span className="font-extrabold text-emerald-800 text-sm">
                        {formatCurrency(calculationResult.effectiveCostPrice)} / {selectedProduct?.unit || 'un'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                Percentuais Incidentes sobre o Preço de Venda
              </span>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Impostos s/ Venda (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={taxPercent}
                    onChange={(e) => setTaxPercent(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Despesas Operacionais (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={operatingExpensesPercent}
                    onChange={(e) => setOperatingExpensesPercent(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Comissão de Vendas (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={salesCommissionPercent}
                    onChange={(e) => setSalesCommissionPercent(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Outros Custos / Despesas (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={otherCostsPercent}
                    onChange={(e) => setOtherCostsPercent(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block font-bold text-blue-700 mb-1">
                    Margem de Lucro Líquido Desejada (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={profitMarginPercent}
                    onChange={(e) => setProfitMarginPercent(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-blue-50/60 border border-blue-200 rounded-lg font-extrabold text-blue-900 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Aviso se a soma dos percentuais for inválida */}
            {!calculationResult.isValid && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-start gap-2 text-rose-700 text-xs">
                <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                <span>{calculationResult.errorMessage}</span>
              </div>
            )}

            {/* MENSAGEM DE CONFIRMAÇÃO VISUAL DESTACADA NA TELA */}
            {saveSuccessFeedback && (
              <div className="p-4 bg-emerald-50 border-2 border-emerald-500 rounded-2xl flex items-start gap-3 shadow-md transition-all">
                <div className="p-2 bg-emerald-600 text-white rounded-xl shrink-0 mt-0.5 shadow-xs">
                  <CheckCircle2 size={22} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-bold text-emerald-950 flex items-center gap-1.5">
                      <span>Preço Salvo e Atualizado no Cadastro com Sucesso!</span>
                    </h4>
                    <button
                      onClick={() => setSaveSuccessFeedback(null)}
                      className="text-emerald-700 hover:text-emerald-900 hover:bg-emerald-100 p-1 rounded-lg transition-colors cursor-pointer"
                      title="Fechar aviso"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <p className="text-xs text-emerald-900 mt-1 font-medium leading-relaxed">
                    O produto <span className="font-extrabold underline decoration-emerald-500">{saveSuccessFeedback.productDescription}</span> teve seu preço de venda atualizado no catálogo.
                  </p>
                  <div className="mt-2.5 p-2.5 bg-white/90 rounded-xl border border-emerald-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div>
                      <span className="text-slate-500 block text-[10px] font-semibold uppercase">Preço Anterior</span>
                      <span className="font-semibold text-slate-700">{formatCurrency(saveSuccessFeedback.oldPrice)}</span>
                    </div>
                    <ArrowRight size={14} className="text-emerald-600 hidden sm:block" />
                    <div>
                      <span className="text-emerald-800 block text-[10px] font-bold uppercase">Novo Preço Praticado</span>
                      <span className="font-extrabold text-emerald-700 text-sm">{formatCurrency(saveSuccessFeedback.newPrice)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-500 block text-[10px] font-semibold uppercase">Margem Lucro</span>
                      <span className="font-bold text-emerald-800">{saveSuccessFeedback.marginPercent}%</span>
                    </div>
                    <div className="w-full pt-2 mt-1 border-t border-emerald-100 flex flex-wrap items-center justify-between text-[11px] text-slate-600 gap-1">
                      <span>Custo Base: <strong className="text-slate-800">{formatCurrency(saveSuccessFeedback.baseCost)}</strong></span>
                      {saveSuccessFeedback.enableAdditionalCosts && (
                        <span>
                          Custos Adicionais: <strong className="text-emerald-700">+{formatCurrency(saveSuccessFeedback.indirectCost + saveSuccessFeedback.directLaborCost)}</strong> (Indireto: {formatCurrency(saveSuccessFeedback.indirectCost)} | MOD: {formatCurrency(saveSuccessFeedback.directLaborCost)})
                        </span>
                      )}
                      <span>Custo Final: <strong className="text-emerald-900">{formatCurrency(saveSuccessFeedback.effectiveCost)}</strong></span>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-emerald-700">
                    <span className="flex items-center gap-1 font-medium">
                      <Check size={13} className="text-emerald-600 stroke-[3]" />
                      <span>Gravado no banco de dados e sincronizado no catálogo</span>
                    </span>
                    <span className="text-[10px] text-emerald-700 font-mono flex items-center gap-1">
                      <Clock size={11} />
                      <span>Salvo às {saveSuccessFeedback.time}</span>
                    </span>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={handleApplyPricingToProduct}
              disabled={!calculationResult.isValid}
              className={`w-full font-bold text-xs py-3.5 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
                isSavedRecently
                  ? 'bg-emerald-700 text-white ring-2 ring-emerald-400'
                  : 'bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white'
              }`}
            >
              <CheckCircle2 size={16} />
              <span>
                {isSavedRecently ? '✓ PREÇO SALVO E ATUALIZADO NO CADASTRO!' : 'SALVAR E ATUALIZAR PREÇO NO CADASTRO'}
              </span>
            </button>
          </div>

          {/* Lado Direito: Memória de Cálculo & Comparação de Markup (6 cols) */}
          <div className="lg:col-span-6 space-y-4">
            {/* Card Principal do Preço Sugerido */}
            <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-md space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Preço de Venda Sugerido (Fórmula Técnica)
                  </span>
                  <div className="text-3xl font-extrabold text-emerald-400 mt-1">
                    {formatCurrency(calculationResult.suggestedSalePrice)}
                  </div>
                </div>

                {selectedProduct && (
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">Diferença p/ Atual:</span>
                    <span
                      className={`text-xs font-bold ${
                        calculationResult.suggestedSalePrice > selectedProduct.salePrice
                          ? 'text-emerald-400'
                          : 'text-amber-400'
                      }`}
                    >
                      {calculationResult.suggestedSalePrice > selectedProduct.salePrice ? '+' : ''}
                      {formatCurrency(calculationResult.suggestedSalePrice - selectedProduct.salePrice)}
                    </span>
                  </div>
                )}
              </div>

              {/* Informação do Custo Final Utilizado no Cálculo */}
              <div className="flex flex-wrap items-center justify-between gap-1 text-xs bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60">
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">Custo Final do Produto:</span>
                  <span className="font-extrabold text-emerald-300 text-sm">
                    {canViewCosts ? `${formatCurrency(calculationResult.effectiveCostPrice)} / ${selectedProduct?.unit || 'un'}` : '•••• (Acesso Restrito)'}
                  </span>
                </div>
                {enableAdditionalCosts ? (
                  <span className="text-[10px] bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-700/60 font-semibold">
                    {canViewCosts ? `Base (${formatCurrency(costPrice)}) + Adicionais (+${formatCurrency(indirectCostPerUnit + directLaborCostPerUnit)})` : 'Com Custos Adicionais'}
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400">
                    Custo Direto de Referência
                  </span>
                )}
              </div>

              {/* Comparativo: Margem vs Markup */}
              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-800 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">Margem s/ Preço Venda:</span>
                  <span className="font-bold text-white text-sm">
                    {canViewProfitMargin
                      ? `${profitMarginPercent.toFixed(1)}% (${formatCurrency((calculationResult.suggestedSalePrice * profitMarginPercent) / 100)})`
                      : '•••• (Oculto)'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Markup Multiplicador:</span>
                  <span className="font-bold text-blue-400 text-sm">
                    {canViewProfitMargin
                      ? `${calculationResult.markupMultiplier.toFixed(2)}x (${calculationResult.markupPercent.toFixed(1)}% s/ custo)`
                      : '•••• (Oculto)'}
                  </span>
                </div>
              </div>
            </div>

            {/* Memória de Cálculo Passo a Passo */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Info size={15} className="text-blue-600" />
                <span>Memória de Cálculo da Formação do Preço</span>
              </h4>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs font-mono text-slate-700 leading-relaxed space-y-1">
                <div>Fórmula: <strong>PV = Custo Final / (1 - Soma Percentuais)</strong></div>
                {enableAdditionalCosts ? (
                  <div className="text-[11px] text-emerald-800 font-sans font-medium bg-emerald-50/70 p-1.5 rounded-md border border-emerald-200">
                    Custo Final = Custo Base ({formatCurrency(costPrice)}) + Indireto ({formatCurrency(indirectCostPerUnit)}) + MOD ({formatCurrency(directLaborCostPerUnit)}) = <strong>{formatCurrency(calculationResult.effectiveCostPrice)}</strong>
                  </div>
                ) : (
                  <div>• Custo Unitário Base = {formatCurrency(costPrice)}</div>
                )}
                <div>PV = {formatCurrency(calculationResult.effectiveCostPrice)} / (1 - {calculationResult.totalPercentageDeductions.toFixed(2)}%)</div>
                <div>PV = {formatCurrency(calculationResult.effectiveCostPrice)} / {(1 - calculationResult.totalPercentageDeductions / 100).toFixed(4)}</div>
                <div className="font-bold text-blue-700 mt-1 pt-1 border-t border-slate-200 font-sans">
                  ➔ Preço de Venda Sugerido = <span className="text-sm font-extrabold text-blue-800">{formatCurrency(calculationResult.suggestedSalePrice)}</span>
                </div>
              </div>

              {/* Decomposição do Faturamento por Unidade */}
              <div className="divide-y divide-slate-100 text-xs">
                {calculationResult.breakdown.map((item, idx) => (
                  <div key={idx} className="py-1.5 flex justify-between items-center">
                    <span className="text-slate-600 font-medium">
                      {item.label} ({item.percent.toFixed(1)}%)
                    </span>
                    <span className="font-bold text-slate-800">{formatCurrency(item.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-ABA 2: ATUALIZAÇÃO EM LOTE */}
      {activeTab === 'em_lote' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="pb-3 border-b border-slate-100">
            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
              <Percent size={18} className="text-blue-600" />
              <span>Ferramenta de Atualização em Lote da Precificação</span>
            </h3>
            <p className="text-xs text-slate-500">
              Aplique novos percentuais fiscais, custos ou margens de lucro simultaneamente a famílias ou a todo o catálogo com prévia segura.
            </p>
          </div>

          {/* GRID PRINCIPAL: ESQUERDA (CONFIGURAÇÃO) E DIREITA (LISTAGEM DE PRODUTOS E PREÇOS) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* COLUNA ESQUERDA: PARÂMETROS E FILTROS DE ATUALIZAÇÃO EM LOTE */}
            <div className="lg:col-span-7 space-y-4">
              {/* FILTROS DE CATÁLOGO: FAMÍLIA E GRUPO */}
              <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                    <Filter size={15} className="text-blue-600" />
                    <span>Filtro de Produtos para Atualização em Lote</span>
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                    {batchTargetProducts.length} produto(s) no filtro
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Escopo do Filtro:</label>
                    <select
                      value={batchScope}
                      onChange={(e) => {
                        const val = e.target.value as any;
                        setBatchScope(val);
                        if (val === 'todos') {
                          setBatchTargetFamily('');
                          setBatchTargetGroup('');
                        } else if (val === 'familia') {
                          setBatchTargetGroup('');
                        } else if (val === 'grupo') {
                          setBatchTargetFamily('');
                        }
                      }}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="todos">Todos os Produtos Ativos</option>
                      <option value="familia">Filtrar por Família</option>
                      <option value="grupo">Filtrar por Grupo</option>
                      <option value="familia_e_grupo">Filtrar por Família e Grupo</option>
                    </select>
                  </div>

                  {(batchScope === 'familia' || batchScope === 'familia_e_grupo') && (
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Selecione a Família:</label>
                      <select
                        value={batchTargetFamily}
                        onChange={(e) => setBatchTargetFamily(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Todas as Famílias</option>
                        {families.map((f) => {
                          const count = dbState.products.filter((p) => p.status === 'ativo' && p.family === f).length;
                          return (
                            <option key={f} value={f}>
                              {f} ({count} itens)
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  )}

                  {(batchScope === 'grupo' || batchScope === 'familia_e_grupo') && (
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Selecione o Grupo:</label>
                      <select
                        value={batchTargetGroup}
                        onChange={(e) => setBatchTargetGroup(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Todos os Grupos</option>
                        {availableGroups.map((g) => {
                          const count = dbState.products.filter(
                            (p) =>
                              p.status === 'ativo' &&
                              (batchScope === 'familia_e_grupo' && batchTargetFamily ? p.family === batchTargetFamily : true) &&
                              p.group === g
                          ).length;
                          return (
                            <option key={g} value={g}>
                              {g} ({count} itens)
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Novo Lucro Desejado (%):</label>
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      value={batchProfitPercent}
                      onChange={(e) => setBatchProfitPercent(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* RECURSO DE ALTERAÇÃO EM LOTE DOS CUSTOS ADICIONAIS */}
              <div
                className={`p-4 rounded-xl border transition-all ${
                  batchUpdateAdditionalCosts
                    ? 'bg-emerald-50/70 border-emerald-300 ring-1 ring-emerald-200/80 shadow-2xs'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={batchUpdateAdditionalCosts}
                      onChange={(e) => setBatchUpdateAdditionalCosts(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded-sm focus:ring-emerald-500 cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <span>Alterar Custos Adicionais no Lote</span>
                        <span
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                            batchUpdateAdditionalCosts
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : 'bg-slate-200 text-slate-600 border-slate-300'
                          }`}
                        >
                          {batchUpdateAdditionalCosts ? 'Ativo no Lote' : 'Não Alterar Custos Adicionais'}
                        </span>
                      </span>
                      <span className="text-[11px] text-slate-500 block mt-0.5">
                        Atualize os valores de Custo Indireto e Mão de Obra Direta (MOD) para todos os produtos filtrados
                      </span>
                    </div>
                  </label>

                  {batchUpdateAdditionalCosts && (
                    <div className="flex items-center gap-2 text-xs bg-white/90 p-1.5 rounded-lg border border-emerald-200">
                      <label className="flex items-center gap-1.5 font-bold text-emerald-900 cursor-pointer text-[11px]">
                        <input
                          type="radio"
                          name="batchAdditionalMode"
                          checked={batchEnableAdditionalCosts}
                          onChange={() => setBatchEnableAdditionalCosts(true)}
                          className="text-emerald-600 focus:ring-emerald-500"
                        />
                        <span>Habilitar e aplicar valores</span>
                      </label>
                      <label className="flex items-center gap-1.5 font-bold text-rose-800 cursor-pointer text-[11px] ml-2">
                        <input
                          type="radio"
                          name="batchAdditionalMode"
                          checked={!batchEnableAdditionalCosts}
                          onChange={() => setBatchEnableAdditionalCosts(false)}
                          className="text-rose-600 focus:ring-rose-500"
                        />
                        <span>Desabilitar custos adicionais</span>
                      </label>
                    </div>
                  )}
                </div>

                {batchUpdateAdditionalCosts && batchEnableAdditionalCosts && (
                  <div className="mt-3 pt-3 border-t border-emerald-200/80 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Custo Indireto em Lote (R$ / unidade) *
                        </label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-2 text-xs font-bold text-slate-400">R$</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0,00"
                            value={batchIndirectCost}
                            onChange={(e) => setBatchIndirectCost(parseFloat(e.target.value) || 0)}
                            className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-lg font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                        <span className="text-[10px] text-slate-500 block mt-0.5">
                          Rateio de despesas indiretas para os produtos filtrados
                        </span>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Mão de Obra Direta - MOD em Lote (R$ / unidade) *
                        </label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-2 text-xs font-bold text-slate-400">R$</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0,00"
                            value={batchDirectLaborCost}
                            onChange={(e) => setBatchDirectLaborCost(parseFloat(e.target.value) || 0)}
                            className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-lg font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                        <span className="text-[10px] text-slate-500 block mt-0.5">
                          Custo de mão de obra direta para os produtos filtrados
                        </span>
                      </div>
                    </div>

                    <div className="p-2.5 bg-white/95 border border-emerald-300 rounded-lg flex flex-wrap items-center justify-between gap-2 text-xs shadow-2xs">
                      <div className="text-slate-600 text-[11px] font-medium">
                        <span>
                          Adicional Total por Unidade:{' '}
                          <strong className="text-emerald-800">
                            +{formatCurrency(batchIndirectCost + batchDirectLaborCost)}
                          </strong>{' '}
                          (Indireto: {formatCurrency(batchIndirectCost)} + MOD: {formatCurrency(batchDirectLaborCost)})
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-emerald-800 font-extrabold text-[11px] bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200">
                          ✓ O novo Preço de Venda será recalculado somando este valor ao Custo Base de cada produto
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {batchUpdateAdditionalCosts && !batchEnableAdditionalCosts && (
                  <div className="mt-2.5 p-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs font-medium">
                    ⚠️ Atenção: Os Custos Adicionais serão desativados (zerados) em todos os {batchTargetProducts.length} produto(s) filtrado(s). O Preço de Venda será calculado exclusivamente sobre o Custo Base.
                  </div>
                )}
              </div>

              <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-1 border-b border-slate-200">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Percentuais de Deduções s/ Venda
                  </span>
                  {hasBatchPercentagesFilled ? (
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 w-fit">
                      ✓ Simulação Ativa ({(batchTaxPercent + batchExpensesPercent + batchCommissionPercent + batchOtherCostsPercent).toFixed(1)}% de deduções)
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 w-fit">
                      Percentuais Zerados (0%) • Novo Preço Simulado: R$ 0,00
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Impostos s/ Venda (%)</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={batchTaxPercent}
                      onFocus={(e) => {
                        if (e.target.value === '0') e.target.select();
                      }}
                      onChange={(e) => setBatchTaxPercent(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Despesas Operacionais (%)</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={batchExpensesPercent}
                      onFocus={(e) => {
                        if (e.target.value === '0') e.target.select();
                      }}
                      onChange={(e) => setBatchExpensesPercent(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Comissão de Vendas (%)</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={batchCommissionPercent}
                      onFocus={(e) => {
                        if (e.target.value === '0') e.target.select();
                      }}
                      onChange={(e) => setBatchCommissionPercent(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Outros Custos (%)</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={batchOtherCostsPercent}
                      onFocus={(e) => {
                        if (e.target.value === '0') e.target.select();
                      }}
                      onChange={(e) => setBatchOtherCostsPercent(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {!hasBatchPercentagesFilled ? (
                  <p className="text-[11px] text-amber-800 bg-amber-50/80 p-2 rounded-lg border border-amber-200">
                    💡 O Novo Preço Simulado será calculado e exibido em tempo real na coluna à direita.
                  </p>
                ) : (
                  <p className="text-[11px] text-emerald-800 bg-emerald-50/80 p-2 rounded-lg border border-emerald-200">
                    ✓ <strong>Simulação calculada:</strong> Os novos preços simulados estão sendo exibidos dinamicamente nos produtos filtrados à direita.
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3 pt-2">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={batchApplyToSalePrice}
                    onChange={(e) => setBatchApplyToSalePrice(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded-sm"
                  />
                  <span>Recalcular e atualizar também os Preços de Venda de imediato no catálogo</span>
                </label>
              </div>

              {/* MENSAGEM DE CONFIRMAÇÃO DE LOTE DESTACADA NA TELA */}
              {batchSuccessFeedback && (
                <div className="p-4 bg-emerald-50 border-2 border-emerald-500 rounded-2xl flex items-start gap-3 shadow-md animate-in fade-in">
                  <div className="p-2 bg-emerald-600 text-white rounded-xl shrink-0 mt-0.5">
                    <CheckCircle2 size={22} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-bold text-emerald-950">
                        Atualização em Lote Aplicada com Sucesso!
                      </h4>
                      <button
                        onClick={() => setBatchSuccessFeedback(null)}
                        className="text-emerald-700 hover:text-emerald-900 p-1 rounded-lg cursor-pointer"
                        title="Fechar"
                      >
                        <X size={16} />
                      </button>
                    </div>
                    <p className="text-xs text-emerald-900 mt-1">
                      Foram atualizados <span className="font-extrabold">{batchSuccessFeedback.updatedCount} produtos</span> no filtro <span className="font-bold underline">{batchSuccessFeedback.filterText || 'Geral'}</span> com Margem de <strong className="font-extrabold">{batchSuccessFeedback.marginPercent}%</strong>.
                    </p>
                    {batchSuccessFeedback.additionalCostsNote && (
                      <p className="text-xs text-emerald-800 font-semibold mt-1">
                        ✓ {batchSuccessFeedback.additionalCostsNote}
                      </p>
                    )}
                    <div className="mt-2 flex items-center justify-between text-[11px] text-emerald-700">
                      <span className="flex items-center gap-1 font-medium">
                        <Check size={13} className="text-emerald-600 stroke-[3]" />
                        <span>Catálogo sincronizado. Veja os preços antes e depois na coluna à direita.</span>
                      </span>
                      <span className="text-[10px] text-emerald-700 font-mono">Processado às {batchSuccessFeedback.time}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Botões de Ação */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setBatchPreviewVisible(!batchPreviewVisible)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  {batchPreviewVisible ? 'Ocultar Tabela de Prévia' : `Tabela Comparativa Geral (${batchTargetProducts.length} itens)`}
                </button>

                <button
                  type="button"
                  onClick={handleOpenBatchConfirm}
                  disabled={batchTargetProducts.length === 0 || !hasBatchPercentagesFilled}
                  title={
                    !hasBatchPercentagesFilled
                      ? 'Preencha os percentuais de deduções para calcular e aplicar a atualização em lote'
                      : ''
                  }
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <FileCheck size={16} />
                  <span>Aplicar Atualização em Lote ({batchTargetProducts.length} produtos)</span>
                </button>
              </div>
            </div>

            {/* COLUNA DIREITA: LISTA DE PRODUTOS NO FILTRO (PREÇOS ATUAIS) E PRODUTOS ALTERADOS */}
            <div className="lg:col-span-5 space-y-3">
              <div className="bg-slate-50/90 rounded-2xl border border-slate-200 p-4 space-y-3 shadow-xs">
                {/* Cabeçalho do Painel Direito com Abas */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <Boxes size={18} className="text-blue-600" />
                    <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                      {batchRightTab === 'filtrados' ? 'Produtos & Preços Atuais' : 'Produtos Alterados no Lote'}
                    </h4>
                  </div>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                    {batchRightTab === 'filtrados' ? `${batchTargetProducts.length} no filtro` : `${batchLastUpdatedList.length} alterados`}
                  </span>
                </div>

                {/* Alternância de Abas: 'No Filtro' vs 'Atualizados' */}
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-200/70 rounded-xl text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setBatchRightTab('filtrados')}
                    className={`py-1.5 px-2.5 rounded-lg transition-all flex items-center justify-center gap-1.5 text-[11px] cursor-pointer ${
                      batchRightTab === 'filtrados'
                        ? 'bg-white text-blue-700 shadow-xs font-extrabold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <ListFilter size={13} />
                    <span>No Filtro ({batchTargetProducts.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBatchRightTab('atualizados')}
                    className={`py-1.5 px-2.5 rounded-lg transition-all flex items-center justify-center gap-1.5 text-[11px] cursor-pointer relative ${
                      batchRightTab === 'atualizados'
                        ? 'bg-white text-emerald-800 shadow-xs font-extrabold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <CheckCheck size={14} className={batchLastUpdatedList.length > 0 ? 'text-emerald-600' : ''} />
                    <span>Alterados ({batchLastUpdatedList.length})</span>
                    {batchLastUpdatedList.length > 0 && batchRightTab !== 'atualizados' && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-0.5" />
                    )}
                  </button>
                </div>

                {/* Campo de Busca Rápida no Painel Direito */}
                <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Filtrar por código ou descrição..."
                    value={batchSearchTerm}
                    onChange={(e) => setBatchSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-7 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-500"
                  />
                  {batchSearchTerm && (
                    <button
                      type="button"
                      onClick={() => setBatchSearchTerm('')}
                      className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                {/* Barra de Contexto do Filtro / Lote */}
                {batchRightTab === 'filtrados' ? (
                  <div className="flex items-center justify-between text-[11px] text-slate-600 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 shadow-2xs">
                    <span className="truncate">
                      Filtro: <strong className="text-slate-800">{getFilterText()}</strong>
                    </span>
                    <span className="text-[10px] text-blue-700 font-bold shrink-0 ml-2">
                      Preços Vigentes
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-[11px] bg-emerald-50 text-emerald-950 px-2.5 py-1.5 rounded-lg border border-emerald-200">
                    <span className="flex items-center gap-1 font-semibold truncate">
                      <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                      <span>{batchLastUpdatedList.length} produto(s) com preço alterado</span>
                    </span>
                    {batchLastUpdatedList.length > 0 && (
                      <span className="text-[10px] text-emerald-800 font-mono shrink-0 ml-2">
                        {batchLastUpdatedList[0].timestamp}
                      </span>
                    )}
                  </div>
                )}

                {/* LISTAGEM 1: PRODUTOS NO FILTRO COM SEUS PREÇOS ATUAIS */}
                {batchRightTab === 'filtrados' && (
                  <>
                    {(() => {
                      const filteredList = batchTargetProducts.filter((p) => {
                        if (!batchSearchTerm.trim()) return true;
                        const term = batchSearchTerm.toLowerCase();
                        return (
                          p.code.toLowerCase().includes(term) ||
                          p.description.toLowerCase().includes(term) ||
                          (p.family && p.family.toLowerCase().includes(term)) ||
                          (p.group && p.group.toLowerCase().includes(term))
                        );
                      });

                      if (filteredList.length === 0) {
                        return (
                          <div className="p-6 text-center bg-white rounded-xl border border-dashed border-slate-300 text-slate-500 space-y-1">
                            <Filter size={24} className="mx-auto text-slate-400" />
                            <p className="text-xs font-bold text-slate-700">Nenhum produto encontrado</p>
                            <p className="text-[11px] text-slate-500">
                              {batchSearchTerm
                                ? 'Nenhum item corresponde à busca informada.'
                                : 'Ajuste as opções de filtro de Família ou Grupo à esquerda.'}
                            </p>
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-2.5 max-h-[580px] overflow-y-auto pr-1">
                          {filteredList.map((p) => {
                            const pricing = getBatchProductPricing(p);
                            const diffSimulated = hasBatchPercentagesFilled ? pricing.suggestedSalePrice - p.salePrice : 0;

                            return (
                              <div
                                key={p.id}
                                className="p-3 bg-white rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-xs transition-all space-y-2 text-xs"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-mono font-bold text-[11px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                                        {p.code}
                                      </span>
                                      {p.family && (
                                        <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                                          {p.family}
                                        </span>
                                      )}
                                      {p.group && (
                                        <span className="text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                                          {p.group}
                                        </span>
                                      )}
                                    </div>
                                    <h5 className="font-bold text-slate-800 text-xs mt-1 truncate" title={p.description}>
                                      {p.description}
                                    </h5>
                                  </div>
                                </div>

                                {/* PREÇOS ATUAIS EM DESTAQUE */}
                                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/80">
                                    <span className="text-[10px] text-slate-500 block font-medium">Preço Atual de Venda</span>
                                    <span className="text-sm font-extrabold text-slate-900 block mt-0.5">
                                      {formatCurrency(p.salePrice)}
                                    </span>
                                    <span className="text-[10px] text-slate-400">/{p.unit || 'un'}</span>
                                  </div>

                                  <div
                                    className={`p-2 rounded-lg border transition-all ${
                                      hasBatchPercentagesFilled
                                        ? 'bg-emerald-50/70 border-emerald-200/80 ring-1 ring-emerald-300/30'
                                        : 'bg-slate-50 border-slate-200'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className={`text-[10px] font-bold block ${hasBatchPercentagesFilled ? 'text-emerald-800' : 'text-slate-600'}`}>
                                        Novo Preço Simulado
                                      </span>
                                      {hasBatchPercentagesFilled ? (
                                        <span className={`text-[10px] font-extrabold ${diffSimulated >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                                          {diffSimulated >= 0 ? '+' : ''}{formatCurrency(diffSimulated)}
                                        </span>
                                      ) : (
                                        <span className="text-[10px] font-semibold text-slate-400">
                                          (Zerado)
                                        </span>
                                      )}
                                    </div>
                                    <span className={`text-sm font-extrabold block mt-0.5 ${hasBatchPercentagesFilled ? 'text-emerald-900' : 'text-slate-500'}`}>
                                      {hasBatchPercentagesFilled ? formatCurrency(pricing.suggestedSalePrice) : 'R$ 0,00'}
                                    </span>
                                    <span className={`text-[10px] block ${hasBatchPercentagesFilled ? 'text-emerald-700 font-medium' : 'text-slate-400 italic'}`}>
                                      {hasBatchPercentagesFilled ? `Margem: ${batchProfitPercent}%` : 'Aguardando percentuais (0%)'}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between text-[10px] text-slate-500 px-1">
                                  <span>Custo Base: <strong className="text-slate-700">{formatCurrency(p.costPrice)}</strong></span>
                                  {pricing.useAdditional && (
                                    <span className="text-emerald-700 font-semibold">
                                      Adicionais: <strong>+{formatCurrency(pricing.additionalTotal)}</strong>
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </>
                )}

                {/* LISTAGEM 2: PRODUTOS QUE SOFRERAM ALTERAÇÃO (PREÇO ANTERIOR E PREÇO ATUAL) */}
                {batchRightTab === 'atualizados' && (
                  <>
                    {(() => {
                      const updatedFilteredList = batchLastUpdatedList.filter((r) => {
                        if (!batchSearchTerm.trim()) return true;
                        const term = batchSearchTerm.toLowerCase();
                        return (
                          r.code.toLowerCase().includes(term) ||
                          r.description.toLowerCase().includes(term) ||
                          (r.family && r.family.toLowerCase().includes(term)) ||
                          (r.group && r.group.toLowerCase().includes(term))
                        );
                      });

                      if (batchLastUpdatedList.length === 0) {
                        return (
                          <div className="p-6 text-center bg-white rounded-xl border border-dashed border-slate-300 text-slate-500 space-y-2">
                            <CheckCheck size={28} className="mx-auto text-slate-400" />
                            <p className="text-xs font-bold text-slate-700">Nenhuma alteração em lote aplicada ainda</p>
                            <p className="text-[11px] text-slate-500">
                              Configure os filtros e parâmetros à esquerda e clique em <strong>"Aplicar Atualização em Lote"</strong> para listar aqui todos os produtos alterados com seu preço anterior e o preço atual.
                            </p>
                            <button
                              type="button"
                              onClick={() => setBatchRightTab('filtrados')}
                              className="mt-2 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                            >
                              Ver Produtos no Filtro Atual
                            </button>
                          </div>
                        );
                      }

                      if (updatedFilteredList.length === 0) {
                        return (
                          <div className="p-6 text-center bg-white rounded-xl border border-dashed border-slate-300 text-slate-500 space-y-1">
                            <Search size={24} className="mx-auto text-slate-400" />
                            <p className="text-xs font-bold text-slate-700">Nenhum produto encontrado</p>
                            <p className="text-[11px] text-slate-500">
                              Nenhum item alterado corresponde à busca "{batchSearchTerm}".
                            </p>
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-2.5 max-h-[580px] overflow-y-auto pr-1">
                          {updatedFilteredList.map((item) => {
                            const isPositive = item.priceDiff > 0;
                            const isNegative = item.priceDiff < 0;

                            return (
                              <div
                                key={item.id}
                                className="p-3 bg-white rounded-xl border-2 border-emerald-300 shadow-2xs space-y-2 text-xs animate-in fade-in"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-mono font-bold text-[11px] bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded border border-slate-200">
                                        {item.code}
                                      </span>
                                      {item.family && (
                                        <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                                          {item.family}
                                        </span>
                                      )}
                                      {item.group && (
                                        <span className="text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                                          {item.group}
                                        </span>
                                      )}
                                      <span className="text-[9px] font-extrabold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded border border-emerald-200">
                                        Atualizado
                                      </span>
                                    </div>
                                    <h5 className="font-bold text-slate-900 text-xs mt-1 truncate" title={item.description}>
                                      {item.description}
                                    </h5>
                                  </div>
                                </div>

                                {/* COMPARATIVO: PREÇO ANTERIOR vs PREÇO ATUAL */}
                                <div className="p-2.5 rounded-xl bg-gradient-to-r from-slate-50 via-white to-emerald-50/70 border border-emerald-200 space-y-2">
                                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                    <span>Preço Anterior</span>
                                    <span>Preço Atual</span>
                                  </div>

                                  <div className="flex items-center justify-between gap-2">
                                    <div>
                                      <span className="text-xs font-bold text-slate-500 line-through">
                                        {formatCurrency(item.previousPrice)}
                                      </span>
                                      <span className="text-[10px] text-slate-400 block">/{item.unit || 'un'}</span>
                                    </div>

                                    <div className="flex items-center gap-1 text-emerald-600">
                                      <ArrowRight size={16} className="stroke-[2.5]" />
                                    </div>

                                    <div className="text-right">
                                      <span className="text-sm font-extrabold text-emerald-900 bg-emerald-100/90 px-2 py-0.5 rounded-md border border-emerald-300">
                                        {formatCurrency(item.newPrice)}
                                      </span>
                                      <span className="text-[10px] text-emerald-700 block mt-0.5 font-bold">Novo Preço Vigente</span>
                                    </div>
                                  </div>

                                  {/* Variação em R$ e % */}
                                  <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                                    <span className="text-slate-500 text-[10px]">Variação:</span>
                                    <span
                                      className={`font-extrabold px-2 py-0.5 rounded-md text-[11px] flex items-center gap-1 ${
                                        isPositive
                                          ? 'bg-emerald-100 text-emerald-800'
                                          : isNegative
                                          ? 'bg-rose-100 text-rose-800'
                                          : 'bg-slate-100 text-slate-600'
                                      }`}
                                    >
                                      {isPositive && <ArrowUpRight size={13} />}
                                      {isNegative && <ArrowDownRight size={13} />}
                                      <span>
                                        {isPositive ? '+' : ''}{formatCurrency(item.priceDiff)} ({item.percentDiff >= 0 ? '+' : ''}{item.percentDiff.toFixed(1)}%)
                                      </span>
                                    </span>
                                  </div>
                                </div>

                                {/* Comparativo de Custos se houver */}
                                {item.previousCost !== item.newCost && (
                                  <div className="flex items-center justify-between text-[10px] text-slate-600 bg-slate-50 px-2 py-1 rounded-md border border-slate-200">
                                    <span>Custo Final:</span>
                                    <span>
                                      <span className="text-slate-400 line-through">{formatCurrency(item.previousCost)}</span>
                                      {' → '}
                                      <strong className="text-slate-800">{formatCurrency(item.newCost)}</strong>
                                    </span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Tabela de Prévia dos Preços Calculados Antes de Confirmar */}
          {batchPreviewVisible && (
            <div className="space-y-3 pt-2 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase">
                  Prévia Comparativa: Preço Atual vs Novo Preço Calculado
                </span>
                <span className="text-[11px] text-slate-500 font-medium">
                  {batchTargetProducts.length} itens no filtro [{getFilterText()}]
                </span>
              </div>

              <div className="max-h-80 overflow-y-auto border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] sticky top-0 z-10 border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">Código</th>
                      <th className="p-2.5">Descrição</th>
                      <th className="p-2.5">Família / Grupo</th>
                      <th className="p-2.5 text-right">Custo Base</th>
                      <th className="p-2.5 text-right">Adicionais</th>
                      <th className="p-2.5 text-right">Custo Final</th>
                      <th className="p-2.5 text-right">Preço Atual</th>
                      <th className="p-2.5 text-right">Novo Preço Sugerido</th>
                      <th className="p-2.5 text-right">Diferença</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {batchTargetProducts.map((p) => {
                      const res = getBatchProductPricing(p);
                      const diff = hasBatchPercentagesFilled ? res.suggestedSalePrice - p.salePrice : 0;

                      return (
                        <tr key={p.id} className="hover:bg-slate-50/80">
                          <td className="p-2.5 font-mono font-bold text-slate-600">{p.code}</td>
                          <td className="p-2.5 font-semibold text-slate-800">{p.description}</td>
                          <td className="p-2.5 text-slate-500 text-[11px]">
                            {p.family || '-'} {p.group ? `/ ${p.group}` : ''}
                          </td>
                          <td className="p-2.5 text-right text-slate-600">{formatCurrency(p.costPrice)}</td>
                          <td className="p-2.5 text-right font-medium">
                            {res.useAdditional ? (
                              <span className="text-emerald-700 font-bold">
                                +{formatCurrency(res.additionalTotal)}
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="p-2.5 text-right font-bold text-slate-900">
                            {formatCurrency(res.effectiveCostPrice)}
                          </td>
                          <td className="p-2.5 text-right font-medium text-slate-700">{formatCurrency(p.salePrice)}</td>
                          <td className="p-2.5 text-right font-bold text-blue-700">
                            {hasBatchPercentagesFilled ? formatCurrency(res.suggestedSalePrice) : 'R$ 0,00'}
                          </td>
                          <td className={`p-2.5 text-right font-bold ${hasBatchPercentagesFilled ? (diff >= 0 ? 'text-emerald-600' : 'text-rose-600') : 'text-slate-400'}`}>
                            {hasBatchPercentagesFilled ? `${diff >= 0 ? '+' : ''}${formatCurrency(diff)}` : 'R$ 0,00'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={handleOpenBatchConfirm}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <FileCheck size={16} />
                  <span>Confirmar e Aplicar Atualização em Lote</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal de Confirmação em Lote */}
      {showBatchConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-blue-100 text-blue-700 rounded-xl shrink-0">
                <FileCheck size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  Confirmar Atualização em Lote
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Deseja realmente aplicar os novos parâmetros de precificação em{' '}
                  <span className="font-bold text-slate-800">{batchTargetProducts.length} produtos</span>?
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
              <div className="flex justify-between text-slate-600">
                <span>Filtro Selecionado:</span>
                <span className="font-bold text-slate-800">{getFilterText()}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Margem de Lucro Alvo:</span>
                <span className="font-bold text-slate-800">{batchProfitPercent}%</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Impostos Médios:</span>
                <span className="font-bold text-slate-800">{batchTaxPercent}%</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Custos Adicionais:</span>
                <span
                  className={`font-bold ${
                    batchUpdateAdditionalCosts
                      ? batchEnableAdditionalCosts
                        ? 'text-emerald-700'
                        : 'text-rose-700'
                      : 'text-slate-600'
                  }`}
                >
                  {batchUpdateAdditionalCosts
                    ? batchEnableAdditionalCosts
                      ? `Habilitar (+${formatCurrency(batchIndirectCost + batchDirectLaborCost)}/un)`
                      : 'Desabilitar custos adicionais'
                    : 'Não alterar existentes'}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Atualizar Preço de Venda:</span>
                <span className={`font-bold ${batchApplyToSalePrice ? 'text-emerald-700' : 'text-slate-600'}`}>
                  {batchApplyToSalePrice ? 'Sim (Recalcular Catálogo)' : 'Não (Apenas parâmetros)'}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                onClick={() => setShowBatchConfirmModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleExecuteBatchUpdateConfirmed}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Check size={16} />
                <span>Sim, Aplicar Atualização</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
