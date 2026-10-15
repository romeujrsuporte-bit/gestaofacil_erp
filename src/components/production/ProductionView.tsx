import React, { useState, useEffect, useMemo } from 'react';
import {
  Boxes,
  Layers,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Calculator,
  ArrowRight,
  Sparkles,
  History,
  FileSpreadsheet,
  Package,
  Edit,
  X,
  Check,
  Search,
  Tag,
  Eye,
  Info,
  RefreshCw,
  Calendar,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Filter,
  Printer,
} from 'lucide-react';
import { Database } from '../../services/db';
import {
  Product,
  ComponentItem,
  ProductionOrder,
  ProductionOrderItem,
  StockMovement,
  ComponentDefinition,
  UnitOfMeasure,
} from '../../types';
import { StockEngine } from '../../services/stockEngine';
import { formatCurrency, formatQuantity } from '../../services/pricingEngine';
import { toast } from '../../services/toast';
import { ProductionOrderPrintModal } from './ProductionOrderPrintModal';

export interface OpDraftItem {
  id: string;
  productId: string;
  productCode: string;
  productDescription: string;
  quantity: number;
  destinationLocationId: string;
  unitCost: number;
  totalCost: number;
  composition: ComponentItem[];
}

export const ProductionView: React.FC<{
  initialSubTab?: 'composicao' | 'ordens' | 'componentes';
  initialCompositionSubTab?: 'ficha' | 'componentes';
}> = ({
  initialSubTab = 'composicao',
  initialCompositionSubTab = 'ficha',
}) => {
  const [dbState, setDbState] = useState(Database.getState());
  const currentCompany = Database.getCurrentCompany();
  const currentUser = Database.getCurrentUser();

  useEffect(() => {
    return Database.subscribe(() => {
      setDbState({ ...Database.getState() });
    });
  }, []);

  const [activeTab, setActiveTab] = useState<'composicao' | 'ordens'>(
    initialSubTab === 'ordens' ? 'ordens' : 'composicao'
  );

  // Sub-aba do menu Composição: 'ficha' (ficha do produto final) ou 'componentes' (recurso componente)
  const [compositionSubTab, setCompositionSubTab] = useState<'ficha' | 'componentes'>(
    initialSubTab === 'componentes' ? 'componentes' : initialCompositionSubTab
  );

  useEffect(() => {
    if (initialSubTab === 'ordens') {
      setActiveTab('ordens');
    } else if (initialSubTab === 'componentes') {
      setActiveTab('composicao');
      setCompositionSubTab('componentes');
    } else {
      setActiveTab('composicao');
      if (initialCompositionSubTab) {
        setCompositionSubTab(initialCompositionSubTab);
      }
    }
  }, [initialSubTab, initialCompositionSubTab]);

  // Estados da Composição
  const [selectedParentProductId, setSelectedParentProductId] = useState<string>('prod-detergente-500');
  const [selectedComponentId, setSelectedComponentId] = useState<string>('');
  const [componentQuantity, setComponentQuantity] = useState<string>('');

  // Estados do Recurso Componente (Modal e Gerenciamento)
  const [isComponentModalOpen, setIsComponentModalOpen] = useState<boolean>(false);
  const [editingComponent, setEditingComponent] = useState<ComponentDefinition | null>(null);
  const [compCode, setCompCode] = useState<string>('');
  const [compName, setCompName] = useState<string>('');
  const [compRawMaterialId, setCompRawMaterialId] = useState<string>('');
  const [compUnit, setCompUnit] = useState<UnitOfMeasure>('UN');
  const [compNotes, setCompNotes] = useState<string>('');
  const [compSearchTerm, setCompSearchTerm] = useState<string>('');

  // Estados da Ordem de Produção (com suporte a múltiplos produtos por OP)
  const defaultDestLocationId = useMemo(() => {
    const locs = dbState.stockLocations.filter(
      (l) => l.companyId === currentCompany.id && l.status === 'ativo'
    );
    const comercialLoc = locs.find(
      (l) => l.name.toLowerCase() === 'comercial' || l.type === 'comercial' || l.id === 'loc-comercial'
    );
    return comercialLoc?.id || locs[0]?.id || 'loc-comercial';
  }, [dbState.stockLocations, currentCompany.id]);

  const [destLocationId, setDestLocationId] = useState<string>(() => {
    const locs = Database.getState().stockLocations.filter(
      (l) => l.companyId === Database.getCurrentCompany().id && l.status === 'ativo'
    );
    const comercialLoc = locs.find(
      (l) => l.name.toLowerCase() === 'comercial' || l.type === 'comercial' || l.id === 'loc-comercial'
    );
    return comercialLoc?.id || locs[0]?.id || 'loc-comercial';
  });

  // Lista de produtos adicionados à OP atual (Múltiplos Produtos na mesma OP)
  const [opDraftItems, setOpDraftItems] = useState<OpDraftItem[]>(() => {
    const initialProd = Database.getState().products.find(
      (p) => p.id === 'prod-detergente-500' && p.hasComposition && (p.composition?.length || 0) > 0
    ) || Database.getState().products.find((p) => p.hasComposition && (p.composition?.length || 0) > 0);

    if (!initialProd) return [];
    const cost = (initialProd.composition || []).reduce((sum, c) => sum + (c.unitCost || 0) * c.quantity, 0);
    return [
      {
        id: 'draft-1',
        productId: initialProd.id,
        productCode: initialProd.code,
        productDescription: initialProd.description,
        quantity: 100,
        destinationLocationId: 'loc-comercial',
        unitCost: Number(cost.toFixed(2)),
        totalCost: Number((cost * 100).toFixed(2)),
        composition: initialProd.composition || [],
      },
    ];
  });

  // Campos para selecionar e adicionar produtos à OP
  const [addProdSelectId, setAddProdSelectId] = useState<string>('');
  const [addProdQuantity, setAddProdQuantity] = useState<string>('50');
  const [addProdLocationId, setAddProdLocationId] = useState<string>('');
  const [productionNotes, setProductionNotes] = useState<string>('');
  const [productionSuccessMsg, setProductionSuccessMsg] = useState<string | null>(null);

  // Estados de Filtro do Histórico de Ordens de Produção
  const [opSearchTerm, setOpSearchTerm] = useState<string>('');
  const [opProductFilter, setOpProductFilter] = useState<string>('todos');
  const [opStatusFilter, setOpStatusFilter] = useState<string>('todos');
  const [opPeriodFilter, setOpPeriodFilter] = useState<'todos' | 'hoje' | 'ultimos_7_dias' | 'este_mes' | 'personalizado'>('todos');
  const [opStartDate, setOpStartDate] = useState<string>('');
  const [opEndDate, setOpEndDate] = useState<string>('');
  const [expandedOpId, setExpandedOpId] = useState<string | null>(null);
  const [selectedOpDetails, setSelectedOpDetails] = useState<ProductionOrder | null>(null);
  const [selectedOpForPrint, setSelectedOpForPrint] = useState<ProductionOrder | null>(null);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState<boolean>(false);

  // Lista de Componentes cadastrados no sistema
  const registeredComponents: ComponentDefinition[] = dbState.components || Database.getComponents();
  const activeComponents = registeredComponents.filter((c) => c.status === 'ativo');

  // Produtos ativos para associação (Matérias-Primas e Insumos)
  const availableRawMaterials = dbState.products.filter(
    (p) => p.status === 'ativo' && (p.productType === 'componente' || !p.hasComposition)
  );

  // Produtos que são de fabricação própria ou acabados
  const manufacturableProducts = dbState.products.filter(
    (p) => p.status === 'ativo' && (p.hasComposition || p.productType === 'revenda')
  );

  // Produto selecionado para ver/editar composição
  const selectedProduct = dbState.products.find((p) => p.id === selectedParentProductId);
  const currentComposition: ComponentItem[] = selectedProduct?.composition || [];

  // Objeto do componente atualmente selecionado no dropdown da ficha
  const selectedComponentObj = registeredComponents.find((c) => c.id === selectedComponentId);
  const rawMaterialOfSelectedComp = selectedComponentObj
    ? dbState.products.find((p) => p.id === selectedComponentObj.rawMaterialId)
    : null;

  // Calcular Custo Total da Composição
  const totalBomCost = currentComposition.reduce((sum, item) => {
    // Buscar custo unitário mais atual do componente (através da matéria-prima associada ou produto)
    const rawMatId = item.rawMaterialId || item.componentId;
    const rawProd = dbState.products.find((p) => p.id === rawMatId) || dbState.products.find((p) => p.id === item.componentId);
    const unitCost = rawProd ? rawProd.costPrice : item.unitCost;
    return sum + unitCost * item.quantity;
  }, 0);

  // Abrir Modal de Novo Componente
  const handleOpenNewComponentModal = () => {
    setEditingComponent(null);
    const existingCodes = registeredComponents.map((c) => c.code.toUpperCase());
    let nextNum = registeredComponents.length + 1;
    let suggestedCode = `CMP-${String(nextNum).padStart(3, '0')}`;
    while (existingCodes.includes(suggestedCode)) {
      nextNum++;
      suggestedCode = `CMP-${String(nextNum).padStart(3, '0')}`;
    }
    setCompCode(suggestedCode);
    setCompName('');
    const defaultRaw = availableRawMaterials[0]?.id || '';
    setCompRawMaterialId(defaultRaw);
    const defProd = dbState.products.find((p) => p.id === defaultRaw);
    setCompUnit(defProd?.unit || 'UN');
    setCompNotes('');
    setIsComponentModalOpen(true);
  };

  // Abrir Modal de Edição de Componente
  const handleOpenEditComponentModal = (comp: ComponentDefinition) => {
    setEditingComponent(comp);
    setCompCode(comp.code);
    setCompName(comp.name);
    setCompRawMaterialId(comp.rawMaterialId);
    setCompUnit(comp.unit);
    setCompNotes(comp.notes || '');
    setIsComponentModalOpen(true);
  };

  // Salvar Componente Cadastrado / Editado
  const handleSaveComponent = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = compCode.trim().toUpperCase();
    const cleanName = compName.trim();

    if (!cleanCode) {
      toast.warning('O código do componente é obrigatório.', 'Código Obrigatório');
      return;
    }
    if (!cleanName) {
      toast.warning('O nome / descrição do componente é obrigatório.', 'Nome Obrigatório');
      return;
    }
    if (!compRawMaterialId) {
      toast.warning('O usuário deverá associar a matéria-prima ou insumo ao componente.', 'Associação Obrigatória');
      return;
    }

    // Verificar se o código já está em uso por outro componente
    const duplicateCode = registeredComponents.find(
      (c) => c.code.trim().toUpperCase() === cleanCode && c.id !== editingComponent?.id
    );
    if (duplicateCode) {
      toast.error(`O código "${cleanCode}" já está em uso pelo componente "${duplicateCode.name}". Cada componente deve ter seu próprio código único.`, 'Código Já Cadastrado');
      return;
    }

    const rawMatProd = dbState.products.find((p) => p.id === compRawMaterialId);

    const saved = Database.saveComponent({
      ...(editingComponent ? { id: editingComponent.id } : {}),
      code: cleanCode,
      name: cleanName,
      rawMaterialId: compRawMaterialId,
      rawMaterialCode: rawMatProd?.code || '',
      rawMaterialDescription: rawMatProd?.description || '',
      unit: compUnit,
      notes: compNotes.trim(),
      status: 'ativo',
    });

    const affectedCount = editingComponent
      ? dbState.products.filter(
          (p) =>
            p.composition &&
            p.composition.some(
              (item) => item.componentId === editingComponent.id || item.componentCode === editingComponent.code
            )
        ).length
      : 0;

    setIsComponentModalOpen(false);
    toast.success(
      editingComponent && affectedCount > 0
        ? `Componente "${saved.code} - ${saved.name}" atualizado! ${affectedCount} produto(s) acabado(s) com este componente tiveram suas matérias-primas e custos recalculados automaticamente.`
        : `Componente "${saved.code} - ${saved.name}" associado à matéria-prima "${rawMatProd?.description || ''}" salvo com sucesso!`,
      editingComponent ? 'Componente Atualizado' : 'Componente Cadastrado'
    );

    // Se estiver na ficha técnica, auto-seleciona o componente criado
    setSelectedComponentId(saved.id);
  };

  // Excluir Componente
  const handleDeleteComponent = (id: string) => {
    try {
      const comp = registeredComponents.find((c) => c.id === id);
      if (!confirm(`Deseja realmente excluir o componente ${comp?.code} - ${comp?.name}?`)) {
        return;
      }
      Database.deleteComponent(id);
      toast.success(`Componente ${comp?.code} removido com sucesso!`, 'Componente Excluído');
      if (selectedComponentId === id) {
        setSelectedComponentId('');
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao excluir componente.', 'Não foi possível excluir');
    }
  };

  // Adicionar Componente Selecionado à Composição do Produto
  const handleAddComponentToBOM = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParentProductId || !selectedComponentId || !componentQuantity) {
      toast.warning('Selecione o Componente e informe a quantidade necessária para fabricar 1 unidade.', 'Preencha os Campos');
      return;
    }

    const qty = parseFloat(componentQuantity);
    if (isNaN(qty) || qty <= 0) {
      toast.warning('Informe uma quantidade válida maior que zero.', 'Quantidade Inválida');
      return;
    }

    // Busca o componente selecionado no recurso Componente
    const componentDef = registeredComponents.find((c) => c.id === selectedComponentId);
    if (!componentDef) {
      toast.error('Componente selecionado não encontrado no sistema.', 'Erro');
      return;
    }

    // Busca a matéria-prima ou insumo associado ao componente
    const rawMaterialProd = dbState.products.find((p) => p.id === componentDef.rawMaterialId);
    const unitCost = rawMaterialProd ? rawMaterialProd.costPrice : 0;

    // Verificar se já existe na composição do produto
    if (currentComposition.some((i) => i.componentId === componentDef.id || i.componentCode === componentDef.code)) {
      toast.warning(`O componente "${componentDef.code} - ${componentDef.name}" já está na lista da composição. Remova-o antes se desejar alterar a quantidade.`, 'Componente Já na Ficha');
      return;
    }

    const newItem: ComponentItem = {
      componentId: componentDef.id,
      componentCode: componentDef.code,
      componentDescription: componentDef.name,
      rawMaterialId: componentDef.rawMaterialId,
      rawMaterialCode: rawMaterialProd?.code || componentDef.rawMaterialCode,
      rawMaterialDescription: rawMaterialProd?.description || componentDef.rawMaterialDescription,
      unit: componentDef.unit,
      quantity: qty,
      unitCost: unitCost,
      totalCost: unitCost * qty,
    };

    const updatedComposition = [...currentComposition, newItem];
    const newProductCost = updatedComposition.reduce((sum, item) => sum + item.unitCost * item.quantity, 0);

    const state = Database.getState();
    state.products = state.products.map((p) =>
      p.id === selectedParentProductId
        ? {
            ...p,
            hasComposition: true,
            composition: updatedComposition,
            costPrice: Number(newProductCost.toFixed(2)),
          }
        : p
    );
    Database.persist();

    Database.addAuditLog(
      'ALTERAR_COMPOSICAO',
      'PRODUCAO',
      selectedParentProductId,
      `Componente ${componentDef.code} - ${componentDef.name} (${qty} ${componentDef.unit}, MP: ${rawMaterialProd?.description}) adicionado ao produto ${selectedProduct?.description}. Novo custo unitário: ${formatCurrency(newProductCost)}`
    );

    setSelectedComponentId('');
    setComponentQuantity('');
    toast.success(
      `Componente "${componentDef.code} - ${componentDef.name}" adicionado à ficha técnica! Custo unitário recalculado para ${formatCurrency(newProductCost)}.`,
      'Composição Atualizada'
    );
  };

  // Remover Componente da Composição
  const handleRemoveComponentFromBOM = (componentId: string) => {
    const targetItem = currentComposition.find((i) => i.componentId === componentId);
    const updatedComposition = currentComposition.filter((i) => i.componentId !== componentId);
    const newProductCost = updatedComposition.reduce((sum, item) => sum + item.unitCost * item.quantity, 0);

    const state = Database.getState();
    state.products = state.products.map((p) =>
      p.id === selectedParentProductId
        ? {
            ...p,
            hasComposition: updatedComposition.length > 0,
            composition: updatedComposition,
            costPrice: Number(newProductCost.toFixed(2)),
          }
        : p
    );
    Database.persist();

    Database.addAuditLog(
      'ALTERAR_COMPOSICAO',
      'PRODUCAO',
      selectedParentProductId,
      `Componente ${targetItem?.componentCode || ''} removido da composição do produto ${selectedProduct?.description}. Novo custo unitário: ${formatCurrency(newProductCost)}`
    );
    toast.info('Componente removido da composição.', 'Composição Atualizada');
  };

  // Produtos fabricáveis que possuem composição (BOM)
  const manufacturableProductsWithBOM = useMemo(() => {
    return manufacturableProducts.filter((p) => p.hasComposition && (p.composition?.length || 0) > 0);
  }, [manufacturableProducts]);

  // Ações de Adicionar, Remover e Atualizar Produtos na Ordem de Produção (Multi-Produtos)
  const handleAddProductToOp = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const prodId = addProdSelectId || manufacturableProductsWithBOM[0]?.id;
    if (!prodId) {
      toast.warning('Selecione um produto fabricável com composição cadastrada.', 'Selecione o Produto');
      return;
    }
    const qty = parseFloat(addProdQuantity);
    if (isNaN(qty) || qty <= 0) {
      toast.warning('Informe uma quantidade válida maior que zero.', 'Quantidade Inválida');
      return;
    }

    const prod = dbState.products.find((p) => p.id === prodId);
    if (!prod) return;

    const compList = prod.composition || [];
    if (compList.length === 0) {
      toast.warning(`O produto "${prod.description}" não possui componentes em sua ficha técnica.`, 'Sem Composição');
      return;
    }

    const itemUnitCost = compList.reduce((sum, item) => {
      const rawId = item.rawMaterialId || item.componentId;
      const rawProd = dbState.products.find((p) => p.id === rawId);
      return sum + (rawProd ? rawProd.costPrice : item.unitCost) * item.quantity;
    }, 0);

    const locId = addProdLocationId || destLocationId || defaultDestLocationId;

    // Verificar se já está na lista
    const existingIndex = opDraftItems.findIndex((it) => it.productId === prod.id && it.destinationLocationId === locId);
    if (existingIndex >= 0) {
      const updated = [...opDraftItems];
      const newQty = updated[existingIndex].quantity + qty;
      updated[existingIndex] = {
        ...updated[existingIndex],
        quantity: newQty,
        unitCost: Number(itemUnitCost.toFixed(2)),
        totalCost: Number((itemUnitCost * newQty).toFixed(2)),
      };
      setOpDraftItems(updated);
      toast.info(`Quantidade de "${prod.description}" aumentada para ${formatQuantity(newQty)} un.`, 'Item Atualizado');
    } else {
      const newItem: OpDraftItem = {
        id: 'draft-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
        productId: prod.id,
        productCode: prod.code,
        productDescription: prod.description,
        quantity: qty,
        destinationLocationId: locId,
        unitCost: Number(itemUnitCost.toFixed(2)),
        totalCost: Number((itemUnitCost * qty).toFixed(2)),
        composition: compList,
      };
      setOpDraftItems([...opDraftItems, newItem]);
      toast.success(`"${prod.description}" (${formatQuantity(qty)} un) adicionado à Ordem de Produção!`, 'Produto Adicionado');
    }

    setAddProdQuantity('50');
  };

  const handleRemoveProductFromOp = (itemId: string) => {
    const target = opDraftItems.find((it) => it.id === itemId);
    setOpDraftItems((prev) => prev.filter((it) => it.id !== itemId));
    if (target) {
      toast.info(`"${target.productDescription}" removido da ordem.`, 'Item Removido');
    }
  };

  const handleUpdateProductQty = (itemId: string, newQty: number) => {
    if (newQty <= 0) return;
    setOpDraftItems((prev) =>
      prev.map((it) => {
        if (it.id !== itemId) return it;
        return {
          ...it,
          quantity: newQty,
          totalCost: Number((it.unitCost * newQty).toFixed(2)),
        };
      })
    );
  };

  const handleUpdateProductLocation = (itemId: string, newLocId: string) => {
    setOpDraftItems((prev) =>
      prev.map((it) => {
        if (it.id !== itemId) return it;
        return {
          ...it,
          destinationLocationId: newLocId,
        };
      })
    );
  };

  // Verificação Consolidada de Disponibilidade de Insumos para TODOS os produtos da Ordem
  const consolidatedComponentSufficiency = useMemo(() => {
    const map = new Map<
      string,
      {
        componentId: string;
        componentCode: string;
        componentDescription: string;
        unit: UnitOfMeasure;
        targetRawMatId: string;
        requiredTotal: number;
        unitCost: number;
        productsBreakdown: { productDescription: string; qty: number }[];
      }
    >();

    opDraftItems.forEach((item) => {
      (item.composition || []).forEach((comp) => {
        const targetRawMatId = comp.rawMaterialId || comp.componentId;
        const key = comp.componentId || targetRawMatId;
        const requiredForThisItem = comp.quantity * item.quantity;
        const existing = map.get(key);
        if (existing) {
          existing.requiredTotal += requiredForThisItem;
          existing.productsBreakdown.push({
            productDescription: item.productDescription,
            qty: requiredForThisItem,
          });
        } else {
          const rawProd =
            dbState.products.find((p) => p.id === targetRawMatId) ||
            dbState.products.find((p) => p.id === comp.componentId);
          map.set(key, {
            componentId: comp.componentId,
            componentCode: comp.componentCode,
            componentDescription: comp.componentDescription || (comp as any).description || 'Componente',
            unit: comp.unit,
            targetRawMatId,
            requiredTotal: requiredForThisItem,
            unitCost: rawProd ? rawProd.costPrice : comp.unitCost,
            productsBreakdown: [
              {
                productDescription: item.productDescription,
                qty: requiredForThisItem,
              },
            ],
          });
        }
      });
    });

    return Array.from(map.values()).map((comp) => {
      const stockInfo = StockEngine.getTotalProductStock(dbState.stockBalances, comp.targetRawMatId);
      return {
        ...comp,
        availableStock: stockInfo.available,
        hasEnough: stockInfo.available >= comp.requiredTotal,
        missingQty: Math.max(0, comp.requiredTotal - stockInfo.available),
      };
    });
  }, [opDraftItems, dbState.stockBalances, dbState.products]);

  const totalDraftUnits = opDraftItems.reduce((acc, it) => acc + it.quantity, 0);
  const totalDraftEstimatedCost = opDraftItems.reduce((acc, it) => acc + it.totalCost, 0);

  const canProduce =
    opDraftItems.length > 0 &&
    totalDraftUnits > 0 &&
    opDraftItems.every((it) => it.quantity > 0) &&
    consolidatedComponentSufficiency.length > 0 &&
    consolidatedComponentSufficiency.every((c) => c.hasEnough);

  // Executar Ordem de Produção (Multi-Produtos com baixa consolidada de insumos e entrada de cada produto acabado)
  const handleExecuteProduction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser.permissions.canAccessProduction) {
      toast.error('Seu perfil não possui autorização para confirmar ordens de produção.', 'Acesso Negado');
      return;
    }
    if (opDraftItems.length === 0) {
      toast.warning('Adicione ao menos um produto à ordem de produção.', 'Nenhum Produto');
      return;
    }
    if (!canProduce) {
      toast.error('Não é possível produzir: Saldo insuficiente de componentes ou matérias-primas nos estoques!', 'Saldo Insuficiente');
      return;
    }

    const opNumber = `OP-${new Date().getFullYear()}-${String(dbState.productionOrders.length + 1).padStart(4, '0')}`;
    const nowIso = new Date().toISOString();

    try {
      let currentBalances = [...dbState.stockBalances];
      const movements: StockMovement[] = [];
      let totalBatchCost = 0;

      // 1. Baixar cada insumo/componente consumido de acordo com a demanda consolidada
      const consumedComponentsData = consolidatedComponentSufficiency.map((comp) => {
        const rawMatProdId = comp.targetRawMatId || comp.componentId;
        const compProd =
          dbState.products.find((p) => p.id === rawMatProdId) ||
          dbState.products.find((p) => p.id === comp.componentId);
        const sourceLocId = compProd?.defaultLocationId || 'loc-mp';
        const sourceLoc = dbState.stockLocations.find((l) => l.id === sourceLocId) || dbState.stockLocations[0];
        const compUnitCost = compProd?.costPrice || comp.unitCost;
        const compTotalCost = compUnitCost * comp.requiredTotal;
        totalBatchCost += compTotalCost;

        const breakdownSummary = comp.productsBreakdown
          .map((b) => `${formatQuantity(b.qty)} ${comp.unit} p/ ${b.productDescription}`)
          .join(', ');

        const { updatedBalances, createdMovement } = StockEngine.applyMovement(currentBalances, {
          companyId: currentCompany.id,
          productId: rawMatProdId,
          productCode: compProd?.code || comp.componentCode,
          productDescription: compProd?.description || comp.componentDescription,
          locationId: sourceLoc.id,
          locationName: sourceLoc.name,
          type: 'consumo_producao',
          quantity: comp.requiredTotal,
          unitCost: compUnitCost,
          totalCost: compTotalCost,
          originDocType: 'producao',
          originDocId: opNumber,
          date: nowIso,
          userId: currentUser.id,
          userName: currentUser.name,
          notes: `Consumo de ${comp.componentCode} na OP ${opNumber} (${breakdownSummary})`,
        });

        currentBalances = updatedBalances;
        movements.push(createdMovement);

        return {
          componentId: comp.componentId,
          componentCode: comp.componentCode,
          description: comp.componentDescription,
          unit: comp.unit,
          plannedQty: comp.requiredTotal,
          actualQty: comp.requiredTotal,
          locationId: sourceLoc.id,
          unitCost: compUnitCost,
          totalCost: compTotalCost,
        };
      });

      // 2. Dar entrada em cada Produto Acabado da OP no seu local de destino
      const productionOrderItems: ProductionOrderItem[] = [];
      let totalProducedUnits = 0;

      opDraftItems.forEach((opItem) => {
        const destLoc =
          dbState.stockLocations.find((l) => l.id === (opItem.destinationLocationId || destLocationId || defaultDestLocationId)) ||
          dbState.stockLocations[0];

        // Custo do lote específico deste item
        const itemBatchCost = (opItem.composition || []).reduce((sum, c) => {
          const rawId = c.rawMaterialId || c.componentId;
          const rawProd = dbState.products.find((p) => p.id === rawId);
          return sum + (rawProd ? rawProd.costPrice : c.unitCost) * c.quantity * opItem.quantity;
        }, 0);
        const itemUnitCost = Number((itemBatchCost / opItem.quantity).toFixed(2));
        totalProducedUnits += opItem.quantity;

        const { updatedBalances: nextBalances, createdMovement: finishedGoodMovement } = StockEngine.applyMovement(
          currentBalances,
          {
            companyId: currentCompany.id,
            productId: opItem.productId,
            productCode: opItem.productCode,
            productDescription: opItem.productDescription,
            locationId: destLoc.id,
            locationName: destLoc.name,
            type: 'entrada_producao',
            quantity: opItem.quantity,
            unitCost: itemUnitCost,
            totalCost: itemBatchCost,
            originDocType: 'producao',
            originDocId: opNumber,
            date: nowIso,
            userId: currentUser.id,
            userName: currentUser.name,
            notes: `Entrada de produção concluída (OP: ${opNumber})`,
          }
        );

        currentBalances = nextBalances;
        movements.push(finishedGoodMovement);

        // Componentes consumidos especificamente por este produto
        const itemComponentsConsumed = (opItem.composition || []).map((c) => {
          const rawId = c.rawMaterialId || c.componentId;
          const rawProd = dbState.products.find((p) => p.id === rawId);
          const cost = rawProd ? rawProd.costPrice : c.unitCost;
          const reqQty = c.quantity * opItem.quantity;
          return {
            componentId: c.componentId,
            componentCode: c.componentCode,
            description: c.componentDescription || (c as any).description || 'Componente',
            unit: c.unit,
            plannedQty: reqQty,
            actualQty: reqQty,
            locationId: rawProd?.defaultLocationId || 'loc-mp',
            unitCost: cost,
            totalCost: cost * reqQty,
          };
        });

        productionOrderItems.push({
          productId: opItem.productId,
          productCode: opItem.productCode,
          productDescription: opItem.productDescription,
          plannedQuantity: opItem.quantity,
          producedQuantity: opItem.quantity,
          destinationLocationId: destLoc.id,
          unitCost: itemUnitCost,
          totalCost: itemBatchCost,
          componentsConsumed: itemComponentsConsumed,
        });
      });

      const averageUnitCost = Number((totalBatchCost / (totalProducedUnits || 1)).toFixed(2));
      const primaryProduct = opDraftItems[0];
      const isMultiProduct = opDraftItems.length > 1;

      // 3. Criar Objeto da Ordem de Produção Concluída
      const newProductionOrder: ProductionOrder = {
        id: 'OP-' + Date.now(),
        number: opNumber,
        companyId: currentCompany.id,
        productId: primaryProduct.productId,
        productCode: isMultiProduct ? `${opDraftItems.length} PRODUTOS` : primaryProduct.productCode,
        productDescription: isMultiProduct
          ? `${opDraftItems.length} Produtos: ` +
            opDraftItems.map((i) => `${i.productDescription} (${i.quantity} un)`).join(', ')
          : primaryProduct.productDescription,
        plannedQuantity: totalProducedUnits,
        producedQuantity: totalProducedUnits,
        destinationLocationId: primaryProduct.destinationLocationId || destLocationId || defaultDestLocationId,
        items: productionOrderItems,
        componentsConsumed: consumedComponentsData,
        totalCost: totalBatchCost,
        unitCost: averageUnitCost,
        status: 'concluida',
        orderDate: nowIso,
        completionDate: nowIso,
        userId: currentUser.id,
        userName: currentUser.name,
        notes:
          productionNotes ||
          (isMultiProduct
            ? `Lote multi-produto (${opDraftItems.length} produtos, ${totalProducedUnits} un) fabricado com sucesso.`
            : `Lote produzido com sucesso em ${new Date().toLocaleDateString('pt-BR')}`),
      };

      const state = Database.getState();
      state.stockBalances = currentBalances;
      state.stockMovements = [...movements, ...state.stockMovements];
      state.productionOrders.unshift(newProductionOrder);
      Database.persist();

      Database.addAuditLog(
        'PRODUCAO_CONCLUIDA',
        'PRODUCAO',
        newProductionOrder.id,
        `OP ${opNumber} executada: ${opDraftItems.length} produto(s) fabricados (${totalProducedUnits} un total). Custo total: ${formatCurrency(totalBatchCost)}`
      );

      const successSummary = isMultiProduct
        ? `Produção da ${opNumber} concluída com sucesso! Foram fabricados ${opDraftItems.length} produtos diferentes (${formatQuantity(totalProducedUnits)} un no total). Os insumos foram baixados do estoque.`
        : `Produção concluída com sucesso! ${formatQuantity(totalProducedUnits)} unidades de "${primaryProduct.productDescription}" adicionadas ao estoque. Matérias-primas baixadas automaticamente.`;

      setProductionSuccessMsg(successSummary);
      toast.success(successSummary, 'Ordem de Produção Concluída');

      // Limpar campos adicionais
      setProductionNotes('');
      setActiveTab('ordens');
    } catch (err) {
      toast.error('Erro na produção: ' + (err as Error).message, 'Falha na Produção');
    }
  };

  // Lista de produtos para o dropdown de filtro do histórico de ordens
  const opProductOptions = useMemo(() => {
    const map = new Map<string, { id: string; code: string; description: string }>();
    (dbState.productionOrders || []).forEach((op) => {
      if (op.productId && !map.has(op.productId)) {
        map.set(op.productId, {
          id: op.productId,
          code: op.productCode || 'PROD',
          description: op.productDescription || 'Produto Sem Descrição',
        });
      }
      (op.items || []).forEach((it) => {
        if (it.productId && !map.has(it.productId)) {
          map.set(it.productId, {
            id: it.productId,
            code: it.productCode || 'PROD',
            description: it.productDescription || 'Produto Sem Descrição',
          });
        }
      });
    });
    (dbState.products || []).filter((p) => p.hasComposition).forEach((p) => {
      if (!map.has(p.id)) {
        map.set(p.id, { id: p.id, code: p.code, description: p.description });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.description.localeCompare(b.description));
  }, [dbState.productionOrders, dbState.products]);

  // Ordens de Produção Filtradas
  const filteredProductionOrders = useMemo(() => {
    return (dbState.productionOrders || [])
      .filter((op) => {
        // 1. Filtro por termo de busca (Nº OP, Código, Descrição, Responsável, Notas, ou itens multi-produto)
        if (opSearchTerm.trim()) {
          const term = opSearchTerm.toLowerCase();
          const matchNumber = op.number?.toLowerCase().includes(term);
          const matchCode = op.productCode?.toLowerCase().includes(term);
          const matchDesc = op.productDescription?.toLowerCase().includes(term);
          const matchUser = op.userName?.toLowerCase().includes(term);
          const matchNotes = (op.notes || '').toLowerCase().includes(term);
          const matchItems = (op.items || []).some(
            (it) => it.productCode?.toLowerCase().includes(term) || it.productDescription?.toLowerCase().includes(term)
          );
          if (!matchNumber && !matchCode && !matchDesc && !matchUser && !matchNotes && !matchItems) {
            return false;
          }
        }

        // 2. Filtro por Produto (busca tanto no principal quanto nos itens da OP multi-produto)
        if (opProductFilter !== 'todos') {
          const matchMain = op.productId === opProductFilter;
          const matchItems = (op.items || []).some((it) => it.productId === opProductFilter);
          if (!matchMain && !matchItems) {
            return false;
          }
        }

        // 3. Filtro por Status
        if (opStatusFilter !== 'todos' && op.status !== opStatusFilter) {
          return false;
        }

        // 4. Filtro por Período
        if (op.orderDate) {
          const opDate = op.orderDate.split('T')[0];
          const now = new Date();

          if (opPeriodFilter === 'hoje') {
            const todayStr = now.toISOString().split('T')[0];
            if (opDate !== todayStr) return false;
          } else if (opPeriodFilter === 'ultimos_7_dias') {
            const limit = new Date();
            limit.setDate(now.getDate() - 7);
            const limitStr = limit.toISOString().split('T')[0];
            if (opDate < limitStr) return false;
          } else if (opPeriodFilter === 'este_mes') {
            const firstDayOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
            if (opDate < firstDayOfMonth) return false;
          } else if (opPeriodFilter === 'personalizado') {
            if (opStartDate && opDate < opStartDate) return false;
            if (opEndDate && opDate > opEndDate) return false;
          }
        }

        return true;
      })
      .sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
  }, [
    dbState.productionOrders,
    opSearchTerm,
    opProductFilter,
    opStatusFilter,
    opPeriodFilter,
    opStartDate,
    opEndDate,
  ]);

  const filteredTotalOrders = filteredProductionOrders.length;
  const filteredTotalUnitsProduced = filteredProductionOrders.reduce(
    (sum, op) => sum + (op.producedQuantity || 0),
    0
  );
  const filteredTotalCost = filteredProductionOrders.reduce(
    (sum, op) => sum + (op.totalCost || 0),
    0
  );

  const hasActiveOpFilters =
    opSearchTerm.trim() !== '' ||
    opProductFilter !== 'todos' ||
    opStatusFilter !== 'todos' ||
    opPeriodFilter !== 'todos' ||
    opStartDate !== '' ||
    opEndDate !== '';

  const handleResetOpFilters = () => {
    setOpSearchTerm('');
    setOpProductFilter('todos');
    setOpStatusFilter('todos');
    setOpPeriodFilter('todos');
    setOpStartDate('');
    setOpEndDate('');
  };

  return (
    <div className="space-y-4">
      {/* Topo / Seletor de Sub-Abas */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Boxes className="text-emerald-600" size={20} />
            <span>Produção Própria & Composição de Produtos</span>
          </h2>
          <p className="text-xs text-slate-500">
            Cadastre a ficha técnica de composição, calcule o custo real por insumo e execute ordens de produção com baixa automática.
          </p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
          <button
            onClick={() => {
              setActiveTab('composicao');
              setCompositionSubTab('ficha');
            }}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'composicao' && compositionSubTab === 'ficha'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Boxes size={14} className={activeTab === 'composicao' && compositionSubTab === 'ficha' ? 'text-emerald-600' : ''} />
            <span>Composição do Produto</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('composicao');
              setCompositionSubTab('componentes');
            }}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'composicao' && compositionSubTab === 'componentes'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Package size={14} className={activeTab === 'composicao' && compositionSubTab === 'componentes' ? 'text-emerald-600' : ''} />
            <span>Componentes ({registeredComponents.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('ordens')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'ordens' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers size={14} className={activeTab === 'ordens' ? 'text-emerald-600' : ''} />
            <span>Ordens de Produção ({dbState.productionOrders.length})</span>
          </button>
        </div>
      </div>

      {/* BANNER DE SUCESSO DE PRODUÇÃO */}
      {productionSuccessMsg && (
        <div className="p-4 bg-emerald-50 border-2 border-emerald-500 rounded-2xl flex items-start gap-3 shadow-md animate-in fade-in">
          <div className="p-2 bg-emerald-600 text-white rounded-xl shrink-0 mt-0.5">
            <CheckCircle2 size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm font-bold text-emerald-950">
                Ordem de Produção Executada com Êxito!
              </h4>
              <button
                onClick={() => setProductionSuccessMsg(null)}
                className="text-emerald-700 hover:text-emerald-900 p-1 rounded-lg"
              >
                <Trash2 size={14} />
              </button>
            </div>
            <p className="text-xs text-emerald-900 mt-1">
              {productionSuccessMsg}
            </p>
          </div>
        </div>
      )}

      {/* SUB-ABA 1: MENU COMPOSIÇÃO (FICHA TÉCNICA + RECURSO COMPONENTE) */}
      {activeTab === 'composicao' && (
        <div className="space-y-4">
          {/* Sub-navegação do Menu Composição */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setCompositionSubTab('ficha')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  compositionSubTab === 'ficha'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <FileSpreadsheet size={15} />
                <span>Ficha Técnica do Produto Final</span>
              </button>
              <button
                type="button"
                onClick={() => setCompositionSubTab('componentes')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  compositionSubTab === 'componentes'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Boxes size={15} />
                <span>Recurso Componentes ({registeredComponents.length})</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleOpenNewComponentModal}
                className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Plus size={14} className="text-emerald-700" />
                <span>Cadastrar Novo Componente</span>
              </button>
            </div>
          </div>

          {/* VISTA 1: FICHA TÉCNICA DO PRODUTO FINAL */}
          {compositionSubTab === 'ficha' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Lado Esquerdo: Seleção do Produto e Componentes (8 cols) */}
              <div className="lg:col-span-8 space-y-4">
                {/* Seletor do Produto Acabado */}
                <div className="bg-gradient-to-r from-emerald-50/80 via-emerald-50/40 to-teal-50/60 p-4 sm:p-5 rounded-2xl border-2 border-emerald-500/40 shadow-sm space-y-2.5 transition-all">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="text-xs sm:text-sm font-extrabold text-emerald-950 flex items-center gap-2">
                      <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-emerald-600 text-white shadow-xs">
                        <Boxes size={14} />
                      </span>
                      <span>Selecione o Produto Final para Configurar a Composição:</span>
                    </label>
                    {selectedProduct && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <Sparkles size={11} className="text-emerald-600" />
                        {selectedProduct.hasComposition ? 'Ficha Técnica Ativa' : 'Sem Ficha Cadastrada'}
                      </span>
                    )}
                  </div>

                  <div className="relative">
                    <select
                      value={selectedParentProductId}
                      onChange={(e) => setSelectedParentProductId(e.target.value)}
                      className="w-full bg-white border-2 border-emerald-400 hover:border-emerald-500 focus:border-emerald-600 focus:ring-3 focus:ring-emerald-500/20 rounded-xl p-3 text-xs sm:text-sm font-bold shadow-xs transition-all cursor-pointer text-slate-900"
                    >
                      {manufacturableProducts.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.code} - {p.description} {p.hasComposition ? '• (Possui Composição Ativa)' : '• (Sem composição)'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-emerald-800">
                    <div className="flex items-center gap-1.5 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      <span>Altere o produto final acima para visualizar, editar ou recalcular a lista de insumos.</span>
                    </div>
                    {selectedProduct && (
                      <div className="font-bold text-emerald-900 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                        Unidade: {selectedProduct.unit} • Preço Venda: {formatCurrency(selectedProduct.salePrice || 0)}
                      </div>
                    )}
                  </div>
                </div>

                {/* ADICIONAR MATÉRIA-PRIMA / EMBALAGEM À FICHA (SELEÇÃO DO COMPONENTE) */}
                <form
                  onSubmit={handleAddComponentToBOM}
                  className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3.5"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Plus size={15} className="text-emerald-600" />
                      <span>ADICIONAR MATÉRIA-PRIMA / EMBALAGEM À FICHA</span>
                    </h4>
                    <button
                      type="button"
                      onClick={handleOpenNewComponentModal}
                      className="text-xs font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 cursor-pointer hover:underline"
                    >
                      <Plus size={13} />
                      <span>Novo Componente</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 text-xs">
                    {/* Campo de Seleção do Componente */}
                    <div className="sm:col-span-7">
                      <label className="block font-semibold text-slate-600 mb-1">
                        Componente (associado a Matéria-Prima / Insumo) *
                      </label>
                      <select
                        required
                        value={selectedComponentId}
                        onChange={(e) => setSelectedComponentId(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-800"
                      >
                        <option value="">Selecione o Componente...</option>
                        {activeComponents.map((c) => {
                          const rawProd = dbState.products.find((p) => p.id === c.rawMaterialId);
                          const unitCost = rawProd ? rawProd.costPrice : 0;
                          return (
                            <option key={c.id} value={c.id}>
                              {c.code} - {c.name} [MP: {rawProd?.code || c.rawMaterialCode} - {rawProd?.description || c.rawMaterialDescription}] ({formatCurrency(unitCost)} / {c.unit})
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block font-semibold text-slate-600 mb-1">
                        Qtd p/ 1 {selectedProduct?.unit || 'UN'} *
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0.0001"
                        required
                        placeholder="Ex: 0.15"
                        value={componentQuantity}
                        onChange={(e) => setComponentQuantity(e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>

                    <div className="sm:col-span-2 flex items-end">
                      <button
                        type="submit"
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-3 rounded-lg text-xs shadow-xs cursor-pointer transition-colors"
                      >
                        Adicionar
                      </button>
                    </div>
                  </div>

                  {/* Informações detalhadas do Componente Selecionado */}
                  {selectedComponentObj && (
                    <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs flex flex-wrap items-center justify-between gap-3 animate-in fade-in">
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 bg-emerald-600 text-white rounded-lg text-[10px] font-mono font-bold">
                          {selectedComponentObj.code}
                        </span>
                        <div>
                          <span className="font-extrabold text-emerald-950 block">{selectedComponentObj.name}</span>
                          <span className="text-[11px] text-slate-600">
                            Matéria-Prima Vinculada: <strong>{rawMaterialOfSelectedComp?.code} - {rawMaterialOfSelectedComp?.description}</strong>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-[11px]">
                        <div>
                          <span className="text-slate-500 block text-[10px] font-bold uppercase">Custo Unitário da MP</span>
                          <span className="font-bold text-emerald-800">
                            {formatCurrency(rawMaterialOfSelectedComp?.costPrice || 0)} / {selectedComponentObj.unit}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px] font-bold uppercase">Saldo em Estoque</span>
                          <span className="font-bold text-slate-800">
                            {StockEngine.getTotalProductStock(dbState.stockBalances, selectedComponentObj.rawMaterialId).available} {selectedComponentObj.unit} disp.
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </form>

                {/* Tabela de Componentes da Ficha Técnica */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                  <div className="p-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-700 uppercase">
                      Fórmula / Ingredientes de 1 {selectedProduct?.unit} de {selectedProduct?.description}
                    </span>
                    <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                      {currentComposition.length} {currentComposition.length === 1 ? 'componente' : 'componentes'}
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50/50 text-slate-500 font-bold uppercase text-[10px]">
                        <tr>
                          <th className="p-3">Código Componente</th>
                          <th className="p-3">Nome do Componente</th>
                          <th className="p-3">Matéria-Prima / Insumo Associado</th>
                          <th className="p-3 text-right">Qtd Utilizada</th>
                          <th className="p-3 text-right">Custo Unitário</th>
                          <th className="p-3 text-right">Custo no Produto</th>
                          <th className="p-3 text-center">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {currentComposition.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="p-8 text-center text-slate-400">
                              Nenhum componente adicionado a esta composição ainda. Selecione um componente acima para compor a ficha técnica.
                            </td>
                          </tr>
                        ) : (
                          currentComposition.map((item) => {
                            const rawProdId = item.rawMaterialId || item.componentId;
                            const compProd = dbState.products.find((p) => p.id === rawProdId) || dbState.products.find((p) => p.id === item.componentId);
                            const currentUnitCost = compProd ? compProd.costPrice : item.unitCost;
                            const itemCost = currentUnitCost * item.quantity;

                            return (
                              <tr key={item.componentId} className="hover:bg-slate-50/80">
                                <td className="p-3">
                                  <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                    {item.componentCode}
                                  </span>
                                </td>
                                <td className="p-3 font-semibold text-slate-800">{item.componentDescription}</td>
                                <td className="p-3 text-slate-600 text-[11px]">
                                  {compProd ? `${compProd.code} - ${compProd.description}` : item.rawMaterialDescription || '-'}
                                </td>
                                <td className="p-3 text-right font-bold text-slate-900">
                                  {formatQuantity(item.quantity, 4)} {item.unit}
                                </td>
                                <td className="p-3 text-right text-slate-600">
                                  {formatCurrency(currentUnitCost)} / {item.unit}
                                </td>
                                <td className="p-3 text-right font-bold text-emerald-700">
                                  {formatCurrency(itemCost)}
                                </td>
                                <td className="p-3 text-center">
                                  <button
                                    onClick={() => handleRemoveComponentFromBOM(item.componentId)}
                                    className="p-1 hover:bg-rose-50 text-rose-500 rounded-md cursor-pointer transition-colors"
                                    title="Remover da Composição"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Lado Direito: Resumo de Custos e Lançamento de Ordem Rápida (4 cols) */}
              <div className="lg:col-span-4 space-y-4">
                <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-md space-y-3">
                  <div className="flex items-center gap-2 text-blue-300 font-bold text-xs uppercase tracking-wider">
                    <Calculator size={16} />
                    <span>Custo Calculado da Composição</span>
                  </div>

                  <div>
                    <div className="text-3xl font-extrabold text-emerald-400">
                      {formatCurrency(totalBomCost)}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      Custo direto de componentes por 1 {selectedProduct?.unit} acabado.
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800 space-y-1 text-xs">
                    <div className="flex justify-between text-slate-300">
                      <span>Preço de Venda Praticado:</span>
                      <span className="font-bold text-white">
                        {formatCurrency(selectedProduct?.salePrice || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Margem de Contribuição Unitária:</span>
                      <span
                        className={`font-bold ${
                          (selectedProduct?.salePrice || 0) - totalBomCost >= 0
                            ? 'text-emerald-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {formatCurrency((selectedProduct?.salePrice || 0) - totalBomCost)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card para Abrir Ordem de Produção deste Produto */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
                  <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                    Fabricar Este Produto Agora
                  </h4>
                  <p className="text-xs text-slate-500">
                    Transfira matérias-primas e produza um lote com baixa automática de estoque.
                  </p>

                  <button
                    onClick={() => {
                      setAddProdSelectId(selectedParentProductId);
                      const p = dbState.products.find((prod) => prod.id === selectedParentProductId);
                      if (p && !opDraftItems.some((it) => it.productId === p.id)) {
                        const cost = (p.composition || []).reduce((sum, c) => sum + (c.unitCost || 0) * c.quantity, 0);
                        setOpDraftItems((prev) => [
                          ...prev,
                          {
                            id: 'draft-' + Date.now(),
                            productId: p.id,
                            productCode: p.code,
                            productDescription: p.description,
                            quantity: 100,
                            destinationLocationId: destLocationId || defaultDestLocationId,
                            unitCost: Number(cost.toFixed(2)),
                            totalCost: Number((cost * 100).toFixed(2)),
                            composition: p.composition || [],
                          },
                        ]);
                      }
                      setActiveTab('ordens');
                    }}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Criar Ordem de Produção</span>
                    <ArrowRight size={15} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* VISTA 2: GESTÃO DO RECURSO COMPONENTES */}
          {compositionSubTab === 'componentes' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-4 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Boxes className="text-emerald-600" size={18} />
                    <span>Cadastro & Gestão de Componentes</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Cada componente possui seu próprio código e está associado a uma matéria-prima ou insumo para baixa de estoque.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 text-slate-400" size={14} />
                    <input
                      type="text"
                      placeholder="Buscar por código, nome ou MP..."
                      value={compSearchTerm}
                      onChange={(e) => setCompSearchTerm(e.target.value)}
                      className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 w-56 sm:w-64"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenNewComponentModal}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>Novo Componente</span>
                  </button>
                </div>
              </div>

              {/* Tabela de Componentes Cadastrados */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-3">Código Próprio</th>
                      <th className="p-3">Nome do Componente</th>
                      <th className="p-3">Matéria-Prima / Insumo Associado</th>
                      <th className="p-3">Unidade</th>
                      <th className="p-3 text-right">Custo da MP</th>
                      <th className="p-3 text-right">Saldo MP em Estoque</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {registeredComponents
                      .filter((c) => {
                        if (!compSearchTerm.trim()) return true;
                        const term = compSearchTerm.toLowerCase();
                        return (
                          c.code.toLowerCase().includes(term) ||
                          c.name.toLowerCase().includes(term) ||
                          (c.rawMaterialCode && c.rawMaterialCode.toLowerCase().includes(term)) ||
                          (c.rawMaterialDescription && c.rawMaterialDescription.toLowerCase().includes(term))
                        );
                      })
                      .map((comp) => {
                        const rawMat = dbState.products.find((p) => p.id === comp.rawMaterialId);
                        const stockInfo = StockEngine.getTotalProductStock(dbState.stockBalances, comp.rawMaterialId);

                        return (
                          <tr key={comp.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="p-3">
                              <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                {comp.code}
                              </span>
                            </td>
                            <td className="p-3 font-semibold text-slate-900">
                              {comp.name}
                              {comp.notes && (
                                <span className="block text-[10px] text-slate-400 font-normal">
                                  {comp.notes}
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-slate-700">
                              <div className="font-medium text-slate-800">
                                {rawMat ? `${rawMat.code} - ${rawMat.description}` : comp.rawMaterialDescription || '-'}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                Família: {rawMat?.family || 'Insumo'} • Grupo: {rawMat?.group || 'Matéria-Prima'}
                              </div>
                            </td>
                            <td className="p-3 font-semibold text-slate-600">
                              {comp.unit}
                            </td>
                            <td className="p-3 text-right font-bold text-emerald-700">
                              {formatCurrency(rawMat?.costPrice || 0)}
                            </td>
                            <td className="p-3 text-right">
                              <span
                                className={`font-bold ${
                                  stockInfo.available > 0 ? 'text-slate-800' : 'text-rose-600'
                                }`}
                              >
                                {formatQuantity(stockInfo.available)} {comp.unit}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                                {comp.status}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditComponentModal(comp)}
                                  className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-lg cursor-pointer transition-colors"
                                  title="Editar Componente"
                                >
                                  <Edit size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteComponent(comp.id)}
                                  className="p-1.5 hover:bg-rose-50 text-rose-500 hover:text-rose-700 rounded-lg cursor-pointer transition-colors"
                                  title="Excluir Componente"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* MODAL DE CADASTRO / EDIÇÃO DE COMPONENTE */}
          {isComponentModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
              <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
                <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Boxes size={18} className="text-emerald-400" />
                    <h3 className="font-bold text-sm">
                      {editingComponent ? 'Editar Componente' : 'Cadastrar Novo Componente'}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsComponentModalOpen(false)}
                    className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>

                <form onSubmit={handleSaveComponent} className="p-5 space-y-4 text-xs">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900">
                    <p className="font-medium">
                      Cada componente terá seu próprio código único e deverá obrigatoriamente ser associado a uma matéria-prima ou insumo do catálogo.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Código do Componente *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: CMP-007"
                        value={compCode}
                        onChange={(e) => setCompCode(e.target.value.toUpperCase())}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                      />
                      <span className="text-[10px] text-slate-500 mt-0.5 block">Identificador único do componente</span>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Unidade de Medida *
                      </label>
                      <select
                        value={compUnit}
                        onChange={(e) => setCompUnit(e.target.value as UnitOfMeasure)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                      >
                        <option value="UN">UN - Unidade</option>
                        <option value="KG">KG - Quilograma</option>
                        <option value="G">G - Grama</option>
                        <option value="L">L - Litro</option>
                        <option value="ML">ML - Mililitro</option>
                        <option value="M">M - Metro</option>
                        <option value="CX">CX - Caixa</option>
                        <option value="PCT">PCT - Pacote</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Nome / Descrição do Componente *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Tampa Flip-Top Rosca 28mm ou Base Tensoativa Líquida"
                      value={compName}
                      onChange={(e) => setCompName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Matéria-Prima ou Insumo Associado *
                    </label>
                    <select
                      required
                      value={compRawMaterialId}
                      onChange={(e) => {
                        const newId = e.target.value;
                        setCompRawMaterialId(newId);
                        const prod = dbState.products.find((p) => p.id === newId);
                        if (prod) {
                          setCompUnit(prod.unit);
                        }
                      }}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                    >
                      <option value="">Selecione a matéria-prima do catálogo...</option>
                      {availableRawMaterials.map((rm) => (
                        <option key={rm.id} value={rm.id}>
                          {rm.code} - {rm.description} (Custo: {formatCurrency(rm.costPrice)} / {rm.unit})
                        </option>
                      ))}
                    </select>
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      O estoque baixado na produção e o custo unitário serão baseados nesta matéria-prima.
                    </span>
                  </div>

                  {/* Card de Prévia da Matéria-Prima Selecionada */}
                  {compRawMaterialId && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                      {(() => {
                        const raw = dbState.products.find((p) => p.id === compRawMaterialId);
                        if (!raw) return null;
                        const stock = StockEngine.getTotalProductStock(dbState.stockBalances, raw.id);
                        return (
                          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                            <div>
                              <span className="text-slate-500 block text-[10px] font-bold uppercase">Insumo Selecionado</span>
                              <span className="font-bold text-slate-800">{raw.code} - {raw.description}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-slate-500 block text-[10px] font-bold uppercase">Custo Atual</span>
                              <span className="font-extrabold text-emerald-700">{formatCurrency(raw.costPrice)} / {raw.unit}</span>
                            </div>
                            <div className="w-full pt-1 border-t border-slate-200 text-slate-500 flex justify-between text-[10px]">
                              <span>Saldo Disponível: <strong>{formatQuantity(stock.available)} {raw.unit}</strong></span>
                              <span>Local Padrão: <strong>{raw.defaultLocationId}</strong></span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Observações / Especificações Adicionais
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Detalhes técnicos, medidas ou tolerâncias..."
                      value={compNotes}
                      onChange={(e) => setCompNotes(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => setIsComponentModalOpen(false)}
                      className="px-4 py-2 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
                    >
                      <Check size={14} />
                      <span>{editingComponent ? 'Atualizar Componente' : 'Salvar Componente'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-ABA 2: ORDENS DE PRODUÇÃO */}
      {activeTab === 'ordens' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Formulário de Execução de Produção (Multi-Produtos por OP) */}
          <div className={isHistoryExpanded ? 'hidden' : 'lg:col-span-6 space-y-4'}>
            <form
              onSubmit={handleExecuteProduction}
              className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3.5"
            >
              <div className="pb-2.5 border-b border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                    <Layers size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-800">Nova Ordem de Produção (OP)</h3>
                    <p className="text-[10px] text-slate-500">Adicione um ou múltiplos produtos ao lote de fabricação</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 rounded-full font-mono">
                    {opDraftItems.length} {opDraftItems.length === 1 ? 'produto na OP' : 'produtos na OP'}
                  </span>
                </div>
              </div>

              {/* Seção 1: Adicionar Produto à Ordem */}
              <div className="bg-slate-50/90 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex justify-between items-center flex-wrap gap-1">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Plus size={14} className="text-blue-600" />
                    <span>Adicionar Produto ao Lote</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">
                    Produtos com ficha técnica (BOM)
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Produto Fabricável *
                  </label>
                  <select
                    value={addProdSelectId || (manufacturableProductsWithBOM[0]?.id || '')}
                    onChange={(e) => setAddProdSelectId(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500 cursor-pointer truncate"
                  >
                    {manufacturableProductsWithBOM.map((p) => (
                      <option key={p.id} value={p.id}>
                        [{p.code}] {p.description} (Custo BOM: {formatCurrency(p.costPrice)})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs items-end">
                  <div className="sm:col-span-4">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Quantidade *
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={addProdQuantity}
                      onChange={(e) => setAddProdQuantity(e.target.value)}
                      placeholder="100"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-bold text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div className="sm:col-span-5">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Local de Entrada *
                    </label>
                    <select
                      value={addProdLocationId || destLocationId}
                      onChange={(e) => setAddProdLocationId(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-1.5 font-semibold text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500 cursor-pointer truncate"
                    >
                      {dbState.stockLocations
                        .filter((l) => l.companyId === currentCompany.id && l.status === 'ativo')
                        .map((loc) => (
                          <option key={loc.id} value={loc.id}>
                            {loc.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="sm:col-span-3">
                    <button
                      type="button"
                      onClick={handleAddProductToOp}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2 px-2.5 rounded-lg transition-colors flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                    >
                      <Plus size={14} />
                      <span>Adicionar</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Seção 2: Lista dos Produtos da Ordem */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[11px] font-bold text-slate-700 uppercase">
                  <span>Produtos na Ordem de Produção ({opDraftItems.length})</span>
                  {opDraftItems.length > 0 && (
                    <span className="text-emerald-700 font-mono">
                      Volume: {formatQuantity(totalDraftUnits)} UN
                    </span>
                  )}
                </div>

                {opDraftItems.length === 0 ? (
                  <div className="p-5 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-center space-y-1">
                    <Package size={24} className="mx-auto text-slate-400" />
                    <p className="text-xs font-bold text-slate-700">Nenhum produto adicionado nesta OP.</p>
                    <p className="text-[11px] text-slate-500">
                      Utilize o seletor acima para adicionar um ou mais produtos a serem fabricados em conjunto.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {opDraftItems.map((item) => {
                      const itemLoc = dbState.stockLocations.find((l) => l.id === item.destinationLocationId);
                      return (
                        <div
                          key={item.id}
                          className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs space-y-1.5"
                        >
                          <div className="flex justify-between items-start gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="font-bold text-xs text-slate-900 leading-tight">
                                <span className="font-mono text-slate-500 mr-1">[{item.productCode}]</span>
                                {item.productDescription}
                              </div>
                              <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap font-medium">
                                <span>Entrada: <strong>{itemLoc?.name || 'Estoque Comercial'}</strong></span>
                                <span>•</span>
                                <span>Custo unitário: <strong>{formatCurrency(item.unitCost)}</strong></span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveProductFromOp(item.id)}
                              className="text-slate-400 hover:text-rose-600 p-1 rounded-md transition-colors cursor-pointer"
                              title="Remover produto da ordem"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>

                          <div className="flex justify-between items-center pt-1 border-t border-slate-100 text-xs">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] text-slate-600 font-semibold">Qtd:</span>
                              <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateProductQty(item.id, Math.max(1, item.quantity - 10))}
                                  className="px-2 py-0.5 text-slate-600 hover:bg-slate-200 text-xs font-bold cursor-pointer"
                                  title="-10"
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) => handleUpdateProductQty(item.id, parseFloat(e.target.value) || 1)}
                                  className="w-16 text-center text-xs font-extrabold bg-white py-0.5 text-slate-900 border-x border-slate-200"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleUpdateProductQty(item.id, item.quantity + 10)}
                                  className="px-2 py-0.5 text-slate-600 hover:bg-slate-200 text-xs font-bold cursor-pointer"
                                  title="+10"
                                >
                                  +
                                </button>
                              </div>
                              <span className="text-[11px] font-bold text-slate-500">UN</span>
                            </div>

                            <div className="text-right font-mono">
                              <span className="text-[10px] text-slate-400 block uppercase">Subtotal</span>
                              <span className="font-extrabold text-xs text-slate-900">
                                {formatCurrency(item.totalCost)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Resumo da Ordem de Produção */}
              {opDraftItems.length > 0 && (
                <div className="grid grid-cols-3 gap-2 bg-slate-900 text-white p-2.5 rounded-xl text-xs font-mono shadow-xs">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-400 block">Itens na OP:</span>
                    <span className="font-extrabold text-blue-300">
                      {opDraftItems.length} {opDraftItems.length === 1 ? 'produto' : 'produtos'}
                    </span>
                  </div>
                  <div className="border-x border-slate-800 px-2">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block">Qtd Total:</span>
                    <span className="font-extrabold text-emerald-400">
                      {formatQuantity(totalDraftUnits)} un
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-400 block">Custo Lote:</span>
                    <span className="font-extrabold text-amber-300">
                      {formatCurrency(totalDraftEstimatedCost)}
                    </span>
                  </div>
                </div>
              )}

              {/* Seção 3: Verificação Prévia Consolidada de Suficiência de Insumos */}
              <div className="space-y-1 pt-1">
                <div className="flex justify-between items-center text-[11px] font-bold text-slate-600 uppercase">
                  <span>Verificação Prévia de Estoque dos Componentes</span>
                  <span className="text-[10px] text-slate-400 font-normal">Demanda Consolidada</span>
                </div>

                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-2 text-xs max-h-44 overflow-y-auto">
                  {consolidatedComponentSufficiency.length === 0 ? (
                    <div className="text-center text-slate-400 py-3 text-[11px]">
                      Adicione produtos à ordem para calcular a demanda consolidada dos insumos.
                    </div>
                  ) : (
                    consolidatedComponentSufficiency.map((comp) => (
                      <div key={comp.componentId} className="flex justify-between items-center text-[11px]">
                        <div className="min-w-0 pr-2">
                          <div className="font-semibold text-slate-800 leading-tight">
                            {comp.componentDescription}
                            {comp.componentCode && (
                              <span className="font-mono text-slate-400 text-[10px] ml-1">[{comp.componentCode}]</span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            Necessário: <strong>{formatQuantity(comp.requiredTotal)} {comp.unit}</strong> • Disponível: <strong>{formatQuantity(comp.availableStock)} {comp.unit}</strong>
                            {comp.productsBreakdown.length > 1 && (
                              <span className="text-slate-400 ml-1">
                                ({comp.productsBreakdown.length} produtos)
                              </span>
                            )}
                          </div>
                        </div>

                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase shrink-0 ${
                            comp.hasEnough ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {comp.hasEnough ? 'OK' : `Falta ${formatQuantity(comp.missingQty)}`}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Observações do Lote / OP</label>
                <input
                  type="text"
                  placeholder="Ex: Lote 24-B, Validade 12 meses, Turno da Tarde..."
                  value={productionNotes}
                  onChange={(e) => setProductionNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={!canProduce}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs py-3 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 size={16} />
                <span>
                  CONFIRMAR PRODUÇÃO DA OP ({opDraftItems.length} {opDraftItems.length === 1 ? 'PRODUTO' : 'PRODUTOS'} / {formatQuantity(totalDraftUnits)} UN)
                </span>
              </button>
            </form>
          </div>

          {/* Histórico de Ordens de Produção (com Filtro por Produto, Período, Busca e Métricas) */}
          <div className={`${isHistoryExpanded ? 'lg:col-span-12' : 'lg:col-span-6'} bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-5 space-y-3.5 transition-all`}>
            {/* Cabeçalho do Histórico */}
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-100 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                  <History size={17} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                    <span>Histórico de Ordens de Produção</span>
                    <span className="text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
                      {filteredTotalOrders} de {dbState.productionOrders.length}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Consulte lotes fabricados e filtre os produtos por período e datas
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {hasActiveOpFilters && (
                  <button
                    type="button"
                    onClick={handleResetOpFilters}
                    className="flex items-center gap-1 text-[11px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg border border-rose-200 transition-colors cursor-pointer"
                    title="Limpar todos os filtros aplicados"
                  >
                    <RotateCcw size={12} />
                    <span>Limpar Filtros</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
                  className="hidden lg:flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                  title={isHistoryExpanded ? 'Voltar para layout dividido' : 'Expandir histórico para tela inteira'}
                >
                  <span>{isHistoryExpanded ? 'Layout Dividido' : 'Tela Cheia'}</span>
                </button>
              </div>
            </div>

            {/* Painel de Filtros Avançados: Produto, Período, Busca e Status */}
            <div className="bg-slate-50/90 p-3 sm:p-3.5 rounded-xl border border-slate-200 space-y-2.5 text-xs">
              {/* Linha 1: Busca Textual + Seleção de Produto */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                {/* Busca Textual */}
                <div className="sm:col-span-5">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Buscar Ordem ou Lote:
                  </label>
                  <div className="relative flex items-center">
                    <Search size={14} className="absolute left-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Nº OP, código, nome ou lote..."
                      value={opSearchTerm}
                      onChange={(e) => setOpSearchTerm(e.target.value)}
                      className="w-full pl-8 pr-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                    />
                    {opSearchTerm && (
                      <button
                        type="button"
                        onClick={() => setOpSearchTerm('')}
                        className="absolute right-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Filtro por Produto Fabricado */}
                <div className="sm:col-span-7">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Filtrar por Produto:
                  </label>
                  <select
                    value={opProductFilter}
                    onChange={(e) => setOpProductFilter(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500 cursor-pointer truncate"
                  >
                    <option value="todos">Todos os Produtos Fabricados ({opProductOptions.length})</option>
                    {opProductOptions.map((prod) => (
                      <option key={prod.id} value={prod.id}>
                        [{prod.code}] {prod.description}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Linha 2: Filtro por Período e Intervalo de Datas */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                {/* Seletor Rápido de Período */}
                <div className="sm:col-span-4">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                    <Calendar size={12} className="text-blue-600" />
                    <span>Período da Produção:</span>
                  </label>
                  <select
                    value={opPeriodFilter}
                    onChange={(e) => setOpPeriodFilter(e.target.value as any)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="todos">Todo o Período</option>
                    <option value="hoje">Hoje</option>
                    <option value="ultimos_7_dias">Últimos 7 dias</option>
                    <option value="este_mes">Este Mês</option>
                    <option value="personalizado">Personalizado (De / Até)</option>
                  </select>
                </div>

                {/* Data Início */}
                <div className="sm:col-span-3">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    A partir de:
                  </label>
                  <input
                    type="date"
                    value={opStartDate}
                    onChange={(e) => {
                      setOpStartDate(e.target.value);
                      if (opPeriodFilter !== 'personalizado') setOpPeriodFilter('personalizado');
                    }}
                    className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Data Fim */}
                <div className="sm:col-span-3">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Até:
                  </label>
                  <input
                    type="date"
                    value={opEndDate}
                    onChange={(e) => {
                      setOpEndDate(e.target.value);
                      if (opPeriodFilter !== 'personalizado') setOpPeriodFilter('personalizado');
                    }}
                    className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Filtro por Status */}
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Status:
                  </label>
                  <select
                    value={opStatusFilter}
                    onChange={(e) => setOpStatusFilter(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="todos">Todos</option>
                    <option value="concluida">Concluída</option>
                    <option value="aberta">Aberta</option>
                    <option value="cancelada">Cancelada</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Métricas Rápidas das Ordens Filtradas */}
            <div className="grid grid-cols-3 gap-2 bg-slate-900 text-white p-3 rounded-xl shadow-xs text-xs">
              <div className="text-center sm:text-left">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Total de OPs:</span>
                <span className="font-mono font-extrabold text-sm sm:text-base text-blue-300">
                  {filteredTotalOrders} {filteredTotalOrders === 1 ? 'ordem' : 'ordens'}
                </span>
              </div>
              <div className="text-center sm:text-left border-x border-slate-800 px-2 sm:px-3">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Volume Fabricado:</span>
                <span className="font-mono font-extrabold text-sm sm:text-base text-emerald-400">
                  {formatQuantity(filteredTotalUnitsProduced)} un
                </span>
              </div>
              <div className="text-center sm:text-left">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Custo Total Lote:</span>
                <span className="font-mono font-extrabold text-sm sm:text-base text-amber-300">
                  {formatCurrency(filteredTotalCost)}
                </span>
              </div>
            </div>

            {/* Listagem das Ordens de Produção */}
            <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
              {filteredProductionOrders.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300 space-y-2">
                  <Layers size={32} className="mx-auto text-slate-400" />
                  <p className="text-xs font-bold text-slate-700">Nenhuma ordem de produção encontrada.</p>
                  <p className="text-[11px] text-slate-500">
                    Tente ajustar ou limpar os filtros de produto e período acima.
                  </p>
                  {hasActiveOpFilters && (
                    <button
                      type="button"
                      onClick={handleResetOpFilters}
                      className="mt-2 text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                    >
                      Limpar filtros de busca
                    </button>
                  )}
                </div>
              ) : (
                filteredProductionOrders.map((op) => {
                  const isExpanded = expandedOpId === op.id;
                  const destLoc = dbState.stockLocations.find((l) => l.id === op.destinationLocationId);

                  return (
                    <div
                      key={op.id}
                      className="bg-white hover:bg-slate-50/70 p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-2 transition-all"
                    >
                      {/* Topo do Card: Número, Status, Data e Ações */}
                      <div className="flex justify-between items-start gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-xs sm:text-sm text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                            {op.number}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                              op.status === 'concluida'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : op.status === 'cancelada'
                                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                : 'bg-blue-100 text-blue-800 border border-blue-200'
                            }`}
                          >
                            {op.status === 'concluida' ? 'Concluída' : op.status}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-slate-500">
                          <span className="flex items-center gap-1 font-mono">
                            <Calendar size={12} className="text-slate-400" />
                            {new Date(op.orderDate).toLocaleDateString('pt-BR')} às{' '}
                            {new Date(op.orderDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>

                      {/* Descrição do Produto e Quantidade Fabricada (Suporte a OP Multi-Produtos) */}
                      <div>
                        {op.items && op.items.length > 1 ? (
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
                                  Multi-Produtos ({op.items.length} itens)
                                </span>
                                <span className="text-[11px] font-bold text-emerald-700">
                                  Total: {formatQuantity(op.producedQuantity)} UN
                                </span>
                              </div>
                              <span className="text-[11px] text-slate-500">Operador: {op.userName}</span>
                            </div>

                            <div className="bg-slate-50/80 rounded-xl p-2 border border-slate-200 space-y-1">
                              <div className="text-[10px] font-bold text-slate-500 uppercase flex justify-between">
                                <span>Produtos Fabricados na OP ({op.items.length})</span>
                                <span>Qtd • Custo</span>
                              </div>
                              <div className="divide-y divide-slate-100 text-[11px]">
                                {op.items.map((it, idx) => (
                                  <div key={idx} className="py-1 flex justify-between items-center">
                                    <div className="min-w-0 pr-2">
                                      <span className="font-bold text-slate-900">{it.productDescription}</span>
                                      <span className="text-[10px] text-slate-400 font-mono ml-1.5">[{it.productCode}]</span>
                                    </div>
                                    <div className="text-right font-mono font-bold shrink-0">
                                      <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px] mr-1.5 font-bold">
                                        {formatQuantity(it.producedQuantity)} UN
                                      </span>
                                      <span className="text-slate-600 text-[10px]">{formatCurrency(it.totalCost)}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="font-extrabold text-slate-900 text-xs sm:text-sm leading-snug">
                              {op.productCode && <span className="font-mono text-slate-500 mr-1.5">[{op.productCode}]</span>}
                              {op.productDescription}
                            </div>
                            <div className="text-[11px] text-slate-600 font-semibold mt-0.5 flex items-center gap-2 flex-wrap">
                              <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-bold">
                                Quantidade: {formatQuantity(op.producedQuantity)} UN
                              </span>
                              <span>•</span>
                              <span className="text-slate-500">
                                Destino: <strong>{destLoc ? destLoc.name : 'Estoque Comercial'}</strong>
                              </span>
                              <span>•</span>
                              <span className="text-slate-500">Operador: {op.userName}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Custos e Observações */}
                      <div className="flex justify-between items-center text-[11px] pt-1.5 border-t border-slate-100 flex-wrap gap-2">
                        <div className="text-slate-600">
                          {op.notes && (
                            <span className="italic text-slate-500 block truncate max-w-xs" title={op.notes}>
                              Obs: {op.notes}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2.5">
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 block uppercase">Custo Total:</span>
                            <span className="font-mono font-black text-slate-900 text-xs sm:text-sm">
                              {formatCurrency(op.totalCost)}{' '}
                              <span className="text-[10px] font-normal text-slate-500">
                                ({formatCurrency(op.unitCost)}/un)
                              </span>
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setSelectedOpForPrint(op)}
                              className="flex items-center gap-1 text-[11px] font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 px-2.5 py-1 rounded-lg border border-teal-200 transition-colors cursor-pointer"
                              title="Imprimir Ordem de Produção em Folha A4 ou Cupom Térmico"
                            >
                              <Printer size={12} />
                              <span className="hidden sm:inline">Imprimir A4</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setSelectedOpDetails(op)}
                              className="flex items-center gap-1 text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                              title="Visualizar ficha técnica e detalhes da OP"
                            >
                              <Eye size={12} />
                              <span className="hidden sm:inline">Ficha OP</span>
                            </button>

                            {op.componentsConsumed && op.componentsConsumed.length > 0 && (
                              <button
                                type="button"
                                onClick={() => setExpandedOpId(isExpanded ? null : op.id)}
                                className="flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-200 transition-colors cursor-pointer"
                                title="Expandir/recolher matérias-primas consumidas"
                              >
                                <span>{op.componentsConsumed.length} insumos</span>
                                {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Detalhes Expansíveis de Insumos / Componentes Consumidos na OP */}
                      {isExpanded && op.componentsConsumed && (
                        <div className="pt-2 border-t border-blue-100 mt-2 bg-slate-50/90 rounded-lg p-2.5 space-y-1.5">
                          <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            <span>Matéria-Prima / Insumo Baixado</span>
                            <span>Qtd Utilizada • Custo</span>
                          </div>
                          <div className="divide-y divide-slate-200/60 text-[11px]">
                            {op.componentsConsumed.map((comp, idx) => (
                              <div key={idx} className="py-1 flex justify-between items-center">
                                <div>
                                  <span className="font-bold text-slate-800">{comp.description}</span>
                                  {comp.componentCode && (
                                    <span className="text-[10px] text-slate-400 font-mono ml-1.5">
                                      [{comp.componentCode}]
                                    </span>
                                  )}
                                </div>
                                <div className="text-right font-mono">
                                  <span className="font-bold text-slate-700">
                                    {formatQuantity(comp.actualQty || comp.plannedQty)} {comp.unit}
                                  </span>
                                  <span className="text-slate-400 text-[10px] ml-1.5">
                                    ({formatCurrency(comp.totalCost || comp.unitCost * comp.plannedQty)})
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Ficha Técnica / Detalhes Completos da Ordem de Produção */}
      {selectedOpDetails && (() => {
        const op = selectedOpDetails;
        const destLoc = dbState.stockLocations.find((l) => l.id === op.destinationLocationId);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-5 space-y-4 text-xs">
              <div className="flex justify-between items-center pb-2.5 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                    <Layers size={17} />
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-slate-900 font-mono">
                      {op.number}
                    </h3>
                    <p className="text-[10px] text-slate-500">
                      Emitida em {new Date(op.orderDate).toLocaleString('pt-BR')} por {op.userName}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                      op.status === 'concluida'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {op.status}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedOpDetails(null)}
                    className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Informações dos Produtos Fabricados */}
              {op.items && op.items.length > 1 ? (
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Produtos Fabricados nesta OP ({op.items.length} itens)
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Total: {formatQuantity(op.producedQuantity)} UN
                    </span>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100 text-slate-600 font-bold text-[10px] uppercase border-b border-slate-200">
                        <tr>
                          <th className="p-2">Produto</th>
                          <th className="p-2 text-center">Volume</th>
                          <th className="p-2 text-right">Custo Un.</th>
                          <th className="p-2 text-right">Custo Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-[11px]">
                        {op.items.map((it, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-2 font-medium text-slate-800">
                              <div>{it.productDescription}</div>
                              <span className="text-[9px] text-slate-400 font-mono">[{it.productCode}]</span>
                            </td>
                            <td className="p-2 text-center font-mono font-bold text-emerald-700">
                              {formatQuantity(it.producedQuantity)} UN
                            </td>
                            <td className="p-2 text-right font-mono text-slate-600">
                              {formatCurrency(it.unitCost)}
                            </td>
                            <td className="p-2 text-right font-mono font-bold text-slate-900">
                              {formatCurrency(it.totalCost)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Produto Fabricado
                  </span>
                  <div className="font-extrabold text-sm text-slate-900">
                    [{op.productCode}] {op.productDescription}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 text-slate-600 font-semibold">
                    <div>Volume Produzido: <strong className="text-slate-900">{formatQuantity(op.producedQuantity)} UN</strong></div>
                    <div>Estoque de Entrada: <strong className="text-slate-900">{destLoc ? destLoc.name : 'Estoque Comercial'}</strong></div>
                  </div>
                </div>
              )}

              {/* Tabela de Insumos Baixados */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                  Insumos & Matérias-Primas Consumidas ({op.componentsConsumed?.length || 0})
                </span>

                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-600 font-bold text-[10px] uppercase border-b border-slate-200">
                      <tr>
                        <th className="p-2">Componente</th>
                        <th className="p-2 text-center">Consumo</th>
                        <th className="p-2 text-right">Custo Un.</th>
                        <th className="p-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[11px]">
                      {op.componentsConsumed?.map((c: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-2 font-medium text-slate-800">
                            <div>{c.description}</div>
                            <span className="text-[9px] text-slate-400 font-mono">[{c.componentCode}]</span>
                          </td>
                          <td className="p-2 text-center font-mono font-bold text-slate-700">
                            {formatQuantity(c.actualQty || c.plannedQty)} {c.unit}
                          </td>
                          <td className="p-2 text-right font-mono text-slate-600">
                            {formatCurrency(c.unitCost)}
                          </td>
                          <td className="p-2 text-right font-mono font-bold text-slate-900">
                            {formatCurrency(c.totalCost || c.unitCost * c.plannedQty)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Resumo de Custos */}
              <div className="bg-slate-900 text-white p-3 rounded-xl font-mono flex justify-between items-center text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Custo Unitário Final:</span>
                  <span className="font-bold text-emerald-400 text-sm">{formatCurrency(op.unitCost)} / un</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block uppercase">Custo Total da OP:</span>
                  <span className="font-black text-amber-300 text-base">{formatCurrency(op.totalCost)}</span>
                </div>
              </div>

              {op.notes && (
                <div className="text-[11px] text-slate-600 bg-amber-50 p-2 rounded-lg border border-amber-200 italic">
                  <strong>Observações:</strong> {op.notes}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedOpDetails(null)}
                  className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg cursor-pointer text-xs"
                >
                  Fechar
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedOpForPrint(op)}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg cursor-pointer text-xs flex items-center gap-1.5 shadow-xs"
                  title="Abrir opções de impressão em Folha A4 ou Cupom Térmico"
                >
                  <Printer size={14} />
                  <span>Imprimir em Folha A4 / Térmica</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal de Impressão de Ordem de Produção (Folha A4 & Térmica 80mm) */}
      {selectedOpForPrint && (
        <ProductionOrderPrintModal
          order={selectedOpForPrint}
          company={currentCompany}
          isOpen={!!selectedOpForPrint}
          onClose={() => setSelectedOpForPrint(null)}
        />
      )}
    </div>
  );
};
