import React, { useState, useEffect, useMemo } from 'react';
import {
  Truck,
  MapPin,
  Calendar,
  Search,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Printer,
  FileText,
  User,
  Users,
  Building,
  RotateCcw,
  Eye,
  Edit2,
  Trash2,
  X,
  ChevronDown,
  ChevronUp,
  ArrowUp,
  ArrowDown,
  Filter,
  CheckSquare,
  Square,
  Package,
  Layers,
  Sparkles,
  Phone,
  DollarSign,
  FileSpreadsheet,
  Navigation,
  Compass,
} from 'lucide-react';
import { Database } from '../../services/db';
import {
  DeliveryRoute,
  DeliveryManifest,
  DeliveryManifestOrder,
  DeliveryManifestOrderItem,
  Customer,
  Order,
} from '../../types';
import { formatCurrency, formatQuantity } from '../../services/pricingEngine';
import { toast } from '../../services/toast';

interface ExpeditionViewProps {
  initialTab?: 'romaneios' | 'rotas' | 'relatorios';
}

export const ExpeditionView: React.FC<ExpeditionViewProps> = ({ initialTab = 'romaneios' }) => {
  const currentCompany = Database.getCurrentCompany();
  const [dbState, setDbState] = useState(Database.getState());

  useEffect(() => {
    return Database.subscribe(() => {
      setDbState({ ...Database.getState() });
    });
  }, []);

  const [activeTab, setActiveTab] = useState<'romaneios' | 'rotas' | 'relatorios'>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Rotas e Romaneios da empresa atual
  const routes = useMemo(() => {
    return (dbState.deliveryRoutes || []).filter((r) => r.companyId === currentCompany.id);
  }, [dbState.deliveryRoutes, currentCompany.id]);

  const manifests = useMemo(() => {
    return (dbState.deliveryManifests || []).filter((m) => m.companyId === currentCompany.id);
  }, [dbState.deliveryManifests, currentCompany.id]);

  const customers = useMemo(() => {
    return dbState.customers || [];
  }, [dbState.customers]);

  const orders = useMemo(() => {
    return (dbState.orders || []).filter(
      (o) => o.companyId === currentCompany.id && o.type === 'venda' && o.status !== 'cancelado'
    );
  }, [dbState.orders, currentCompany.id]);

  // ==========================================
  // ESTADOS - ABA ROMANEIOS DE ENTREGA
  // ==========================================
  const [manifestSearchTerm, setManifestSearchTerm] = useState('');
  const [manifestRouteFilter, setManifestRouteFilter] = useState('todos');
  const [manifestStatusFilter, setManifestStatusFilter] = useState<'todos' | 'planejado' | 'em_transito' | 'entregue' | 'cancelado'>('todos');
  const [manifestPeriodFilter, setManifestPeriodFilter] = useState<'todos' | 'hoje' | 'ultimos_7_dias' | 'este_mes' | 'personalizado'>('todos');
  const [manifestStartDate, setManifestStartDate] = useState('');
  const [manifestEndDate, setManifestEndDate] = useState('');

  // Modais de Romaneio
  const [isNewManifestModalOpen, setIsNewManifestModalOpen] = useState(false);
  const [editingManifest, setEditingManifest] = useState<DeliveryManifest | null>(null);
  const [viewingManifestDetails, setViewingManifestDetails] = useState<DeliveryManifest | null>(null);
  const [printManifest, setPrintManifest] = useState<DeliveryManifest | null>(null);
  const [printManifestScope, setPrintManifestScope] = useState<'all' | 'roteiro' | 'conferencia'>('all');

  // Form de Criação/Edição de Romaneio
  const [formDepartureDate, setFormDepartureDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formRouteId, setFormRouteId] = useState('');
  const [formDriverName, setFormDriverName] = useState('Marcos Vinicius (Motorista)');
  const [formDriverPhone, setFormDriverPhone] = useState('(11) 98765-4321');
  const [formVehiclePlate, setFormVehiclePlate] = useState('BRA-2E19');
  const [formVehicleModel, setFormVehicleModel] = useState('Fiat Fiorino 1.4 EVO');
  const [formNotes, setFormNotes] = useState('');
  const [selectedOrderIdsForManifest, setSelectedOrderIdsForManifest] = useState<string[]>([]);
  const [manifestOrdersDraft, setManifestOrdersDraft] = useState<DeliveryManifestOrder[]>([]);

  // Filtros internos na seleção de pedidos para novo romaneio
  const [orderSelectionFilterOnlyRoute, setOrderSelectionFilterOnlyRoute] = useState(true);
  const [orderSelectionSearch, setOrderSelectionSearch] = useState('');

  // ==========================================
  // ESTADOS - ABA ROTAS DE ENTREGA
  // ==========================================
  const [routeSearchTerm, setRouteSearchTerm] = useState('');
  const [isRouteModalOpen, setIsRouteModalOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<DeliveryRoute | null>(null);
  const [routeFormCode, setRouteFormCode] = useState('');
  const [routeFormName, setRouteFormName] = useState('');
  const [routeFormDescription, setRouteFormDescription] = useState('');
  const [routeFormColor, setRouteFormColor] = useState('blue');
  const [routeFormDeliveryWindow, setRouteFormDeliveryWindow] = useState('Dia Todo (08h às 17h)');
  const [routeFormVehicleType, setRouteFormVehicleType] = useState('Fiat Fiorino / Van');
  const [routeFormCities, setRouteFormCities] = useState('');
  const [routeFormNeighborhoods, setRouteFormNeighborhoods] = useState('');
  const [routeFormMarketAreas, setRouteFormMarketAreas] = useState('');
  const [routeFormSellers, setRouteFormSellers] = useState('');

  // Estados de Associação em Lote de Clientes
  const [batchTargetRouteId, setBatchTargetRouteId] = useState('');
  const [batchCriterionType, setBatchCriterionType] = useState<'city' | 'neighborhood' | 'marketArea' | 'sellerName'>('neighborhood');
  const [batchCriterionValue, setBatchCriterionValue] = useState('');
  const [batchSelectedCustomerIds, setBatchSelectedCustomerIds] = useState<string[]>([]);
  const [customerFilterRoute, setCustomerFilterRoute] = useState('todos');
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');

  // ==========================================
  // ESTADOS - ABA RELATÓRIOS DE EXPEDIÇÃO
  // ==========================================
  const [reportType, setReportType] = useState<'produtos_consolidados' | 'entregas_por_cliente' | 'desempenho_romaneios'>('entregas_por_cliente');
  const [reportRouteFilter, setReportRouteFilter] = useState('todos');
  const [reportManifestFilter, setReportManifestFilter] = useState('todos');
  const [reportPeriodFilter, setReportPeriodFilter] = useState<'todos' | 'hoje' | 'ultimos_7_dias' | 'este_mes' | 'personalizado'>('este_mes');
  const [reportStartDate, setReportStartDate] = useState('');
  const [reportEndDate, setReportEndDate] = useState('');
  const [reportSearchTerm, setReportSearchTerm] = useState('');

  // ==========================================
  // FILTRAGEM DE ROMANEIOS
  // ==========================================
  const filteredManifests = useMemo(() => {
    return manifests.filter((m) => {
      if (manifestRouteFilter !== 'todos' && m.routeId !== manifestRouteFilter) {
        return false;
      }
      if (manifestStatusFilter !== 'todos' && m.status !== manifestStatusFilter) {
        return false;
      }

      // Período
      if (manifestPeriodFilter !== 'todos') {
        const manDate = (m.departureDate || m.date || '').split('T')[0];
        const todayIso = new Date().toISOString().split('T')[0];

        if (manifestPeriodFilter === 'hoje' && manDate !== todayIso) {
          return false;
        }
        if (manifestPeriodFilter === 'ultimos_7_dias') {
          const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
          if (manDate < sevenDaysAgo || manDate > todayIso) return false;
        }
        if (manifestPeriodFilter === 'este_mes') {
          const curMonth = todayIso.substring(0, 7);
          if (!manDate.startsWith(curMonth)) return false;
        }
        if (manifestPeriodFilter === 'personalizado') {
          if (manifestStartDate && manDate < manifestStartDate) return false;
          if (manifestEndDate && manDate > manifestEndDate) return false;
        }
      }

      // Busca textual
      if (manifestSearchTerm.trim()) {
        const term = manifestSearchTerm.toLowerCase();
        const matchNum = m.number.toLowerCase().includes(term);
        const matchDriver = m.driverName.toLowerCase().includes(term);
        const matchPlate = m.vehiclePlate.toLowerCase().includes(term);
        const matchRoute = (m.routeName || '').toLowerCase().includes(term);
        const matchOrder = m.orders.some(
          (o) =>
            o.orderNumber.toLowerCase().includes(term) ||
            o.customerName.toLowerCase().includes(term) ||
            (o.address.city && o.address.city.toLowerCase().includes(term)) ||
            (o.address.neighborhood && o.address.neighborhood.toLowerCase().includes(term))
        );
        if (!matchNum && !matchDriver && !matchPlate && !matchRoute && !matchOrder) {
          return false;
        }
      }

      return true;
    });
  }, [
    manifests,
    manifestRouteFilter,
    manifestStatusFilter,
    manifestPeriodFilter,
    manifestStartDate,
    manifestEndDate,
    manifestSearchTerm,
  ]);

  // Indicadores de Resumo da Expedição
  const summaryMetrics = useMemo(() => {
    const totalRomaneios = manifests.length;
    const emTransito = manifests.filter((m) => m.status === 'em_transito').length;
    const planejados = manifests.filter((m) => m.status === 'planejado').length;
    const entreguesTotal = manifests.reduce((acc, m) => acc + m.totalDelivered, 0);
    const pendentesTotal = manifests.reduce((acc, m) => acc + m.totalPending, 0);
    const valorTotalCarga = manifests.reduce((acc, m) => acc + m.totalValue, 0);
    const valorCobrarNaRota = manifests.reduce((acc, m) => acc + m.totalAmountToCollect, 0);

    return {
      totalRomaneios,
      emTransito,
      planejados,
      entreguesTotal,
      pendentesTotal,
      valorTotalCarga,
      valorCobrarNaRota,
    };
  }, [manifests]);

  // ==========================================
  // PEDIDOS DISPONÍVEIS PARA NOVO ROMANEIO
  // ==========================================
  const availableOrdersForDelivery = useMemo(() => {
    // Pedidos já alocados em romaneios em trânsito ou planejados
    const allocatedOrderIds = new Set<string>();
    manifests.forEach((m) => {
      if (m.status !== 'cancelado') {
        m.orders.forEach((o) => {
          if (editingManifest && m.id === editingManifest.id) {
            // Se estiver editando, não bloqueia os pedidos do próprio romaneio
            return;
          }
          allocatedOrderIds.add(o.orderId);
        });
      }
    });

    return orders.filter((o) => !allocatedOrderIds.has(o.id));
  }, [orders, manifests, editingManifest]);

  // ==========================================
  // CRIAÇÃO E MONTAGEM DE NOVO ROMANEIO
  // ==========================================
  const handleOpenNewManifestModal = () => {
    setEditingManifest(null);
    setFormDepartureDate(new Date().toISOString().split('T')[0]);
    setFormRouteId(routes[0]?.id || '');
    setFormDriverName('Marcos Vinicius (Motorista)');
    setFormDriverPhone('(11) 98765-4321');
    setFormVehiclePlate('BRA-2E19');
    setFormVehicleModel('Fiat Fiorino 1.4 EVO');
    setFormNotes('');
    setManifestOrdersDraft([]);
    setSelectedOrderIdsForManifest([]);
    setOrderSelectionFilterOnlyRoute(true);
    setOrderSelectionSearch('');
    setIsNewManifestModalOpen(true);
  };

  const handleEditManifest = (man: DeliveryManifest) => {
    setEditingManifest(man);
    setFormDepartureDate(man.departureDate || new Date().toISOString().split('T')[0]);
    setFormRouteId(man.routeId || '');
    setFormDriverName(man.driverName);
    setFormDriverPhone(man.driverPhone || '');
    setFormVehiclePlate(man.vehiclePlate);
    setFormVehicleModel(man.vehicleModel || '');
    setFormNotes(man.notes || '');
    setManifestOrdersDraft([...man.orders]);
    setSelectedOrderIdsForManifest(man.orders.map((o) => o.orderId));
    setIsNewManifestModalOpen(true);
  };

  // Pedidos elegíveis filtrados no modal de montagem
  const eligibleOrdersForDraft = useMemo(() => {
    const selectedRoute = routes.find((r) => r.id === formRouteId);

    return availableOrdersForDelivery.filter((ord) => {
      // Se já está no rascunho do romaneio, não lista na seleção de disponíveis
      if (manifestOrdersDraft.some((d) => d.orderId === ord.id)) {
        return false;
      }

      const client = customers.find((c) => c.id === ord.customerId || c.name === ord.customerName);

      // Filtro por rota selecionada
      if (orderSelectionFilterOnlyRoute && selectedRoute) {
        const matchesClientRoute = client?.deliveryRouteId === selectedRoute.id;
        const matchesCity = client?.city && selectedRoute.cities.some((c) => c.toLowerCase() === client.city?.toLowerCase());
        const matchesNeighborhood =
          client?.neighborhood &&
          selectedRoute.neighborhoods.some((n) => n.toLowerCase() === client.neighborhood?.toLowerCase());
        const matchesMarketArea =
          client?.marketArea &&
          selectedRoute.marketAreas.some((m) => m.toLowerCase() === client.marketArea?.toLowerCase());

        if (!matchesClientRoute && !matchesCity && !matchesNeighborhood && !matchesMarketArea) {
          return false;
        }
      }

      // Busca interna
      if (orderSelectionSearch.trim()) {
        const term = orderSelectionSearch.toLowerCase();
        const matchNum = ord.number.toLowerCase().includes(term);
        const matchCust = ord.customerName.toLowerCase().includes(term);
        const matchCity = client?.city?.toLowerCase().includes(term);
        const matchNeigh = client?.neighborhood?.toLowerCase().includes(term);
        if (!matchNum && !matchCust && !matchCity && !matchNeigh) {
          return false;
        }
      }

      return true;
    });
  }, [
    availableOrdersForDelivery,
    manifestOrdersDraft,
    formRouteId,
    routes,
    customers,
    orderSelectionFilterOnlyRoute,
    orderSelectionSearch,
  ]);

  // Adicionar pedidos selecionados ao rascunho do romaneio
  const handleAddOrdersToDraft = (ordersToAdd: Order[]) => {
    if (ordersToAdd.length === 0) return;

    const newDraftItems: DeliveryManifestOrder[] = ordersToAdd.map((ord, idx) => {
      const client = customers.find((c) => c.id === ord.customerId || c.name === ord.customerName);

      const items: DeliveryManifestOrderItem[] = ord.items.map((it) => ({
        productId: it.productId,
        productCode: it.productCode,
        description: it.description,
        unit: it.unit,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        totalPrice: it.totalPrice,
      }));

      const isPaid = ord.paymentMethod !== 'dinheiro' && ord.financialGenerated;
      const paymentStatus: 'pago_antecipado' | 'cobrar_na_entrega' =
        ord.paymentMethod === 'dinheiro' || ord.paymentMethod === 'multiplo'
          ? 'cobrar_na_entrega'
          : 'pago_antecipado';

      return {
        orderId: ord.id,
        orderNumber: ord.number,
        orderDate: ord.createdAt,
        customerId: client?.id || ord.customerId || 'cli-generic',
        customerCode: client?.code || 'CLI',
        customerName: ord.customerName,
        customerPhone: client?.phone || ord.customerPhone || '',
        customerCpfCnpj: client?.cpfCnpj || ord.customerCpfCnpj || '',
        address: {
          street: client?.street || 'Endereço Comercial Cadastrado',
          number: client?.number || 'S/N',
          neighborhood: client?.neighborhood || 'Centro',
          city: client?.city || 'São Paulo',
          state: client?.state || 'SP',
          zipCode: client?.zipCode || '',
          complement: client?.complement || '',
        },
        marketArea: client?.marketArea || 'Geral',
        sellerName: client?.sellerName || ord.userName || 'Carlos Silva',
        sequence: manifestOrdersDraft.length + idx + 1,
        totalValue: ord.total,
        paymentMethod: ord.paymentMethod,
        paymentStatus,
        amountToCollect: paymentStatus === 'cobrar_na_entrega' ? ord.total : 0,
        deliveryStatus: 'pendente',
        items,
        volumesCount: Math.max(1, Math.ceil(items.reduce((acc, it) => acc + it.quantity, 0) / 10)),
      };
    });

    setManifestOrdersDraft((prev) => [...prev, ...newDraftItems]);
    setSelectedOrderIdsForManifest([]);
    toast.success(`${ordersToAdd.length} pedido(s) adicionado(s) à rota do romaneio.`);
  };

  // Remover pedido do rascunho
  const handleRemoveOrderFromDraft = (orderId: string) => {
    setManifestOrdersDraft((prev) =>
      prev
        .filter((o) => o.orderId !== orderId)
        .map((o, idx) => ({ ...o, sequence: idx + 1 }))
    );
  };

  // Reordenar sequência da rota (subir / descer)
  const handleMoveOrderSequence = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === manifestOrdersDraft.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const newItems = [...manifestOrdersDraft];
    const temp = newItems[index];
    newItems[index] = newItems[targetIndex];
    newItems[targetIndex] = temp;

    // Atualiza sequências
    const updated = newItems.map((item, idx) => ({ ...item, sequence: idx + 1 }));
    setManifestOrdersDraft(updated);
  };

  // Salvar Romaneio
  const handleSaveManifest = (e: React.FormEvent) => {
    e.preventDefault();

    if (manifestOrdersDraft.length === 0) {
      toast.error('Adicione ao menos 1 pedido para criar o romaneio de entrega.');
      return;
    }

    const routeObj = routes.find((r) => r.id === formRouteId);

    const manifestData: Omit<DeliveryManifest, 'id'> & { id?: string } = {
      id: editingManifest ? editingManifest.id : undefined,
      number: editingManifest ? editingManifest.number : '',
      companyId: currentCompany.id,
      date: editingManifest ? editingManifest.date : new Date().toISOString(),
      departureDate: formDepartureDate,
      routeId: formRouteId,
      routeName: routeObj ? routeObj.name : 'Rota Padrão',
      driverName: formDriverName.trim(),
      driverPhone: formDriverPhone.trim(),
      vehiclePlate: formVehiclePlate.trim().toUpperCase(),
      vehicleModel: formVehicleModel.trim(),
      status: editingManifest ? editingManifest.status : 'planejado',
      notes: formNotes.trim(),
      orders: manifestOrdersDraft,
      totalOrders: manifestOrdersDraft.length,
      totalDelivered: manifestOrdersDraft.filter((o) => o.deliveryStatus === 'entregue').length,
      totalPending: manifestOrdersDraft.filter((o) => o.deliveryStatus === 'pendente').length,
      totalValue: manifestOrdersDraft.reduce((acc, o) => acc + o.totalValue, 0),
      totalAmountToCollect: manifestOrdersDraft
        .filter((o) => o.paymentStatus === 'cobrar_na_entrega')
        .reduce((acc, o) => acc + (o.amountToCollect || o.totalValue), 0),
      totalVolumes: manifestOrdersDraft.reduce((acc, o) => acc + (o.volumesCount || 1), 0),
      createdAt: editingManifest ? editingManifest.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const saved = Database.saveDeliveryManifest(manifestData);
    setDbState({ ...Database.getState() });
    setIsNewManifestModalOpen(false);
    toast.success(
      editingManifest
        ? `Romaneio ${saved.number} atualizado com sucesso.`
        : `Romaneio ${saved.number} criado com sucesso com ${saved.totalOrders} entregas.`
    );
  };

  // Alterar Status do Romaneio
  const handleChangeManifestStatus = (man: DeliveryManifest, newStatus: DeliveryManifest['status']) => {
    Database.updateDeliveryManifestStatus(man.id, newStatus);
    setDbState({ ...Database.getState() });
    toast.success(`Status do Romaneio ${man.number} atualizado para "${newStatus.toUpperCase()}".`);
  };

  // Baixa / Alteração de status de pedido no Romaneio
  const handleUpdateOrderStatus = (
    manifestId: string,
    orderId: string,
    status: 'entregue' | 'nao_entregue',
    failureReason?: string
  ) => {
    Database.updateDeliveryOrderStatus(manifestId, orderId, status, undefined, failureReason);
    setDbState({ ...Database.getState() });

    // Atualiza estado do modal de detalhes se estiver aberto
    const updatedManifests = Database.getDeliveryManifests(currentCompany.id);
    const updated = updatedManifests.find((m) => m.id === manifestId);
    if (updated) {
      setViewingManifestDetails(updated);
    }

    toast.success(
      status === 'entregue'
        ? 'Entrega confirmada com sucesso!'
        : `Ocorrência registrada: ${failureReason || 'Não entregue'}`
    );
  };

  // Excluir Romaneio
  const handleDeleteManifest = (man: DeliveryManifest) => {
    if (confirm(`Deseja realmente excluir o romaneio ${man.number}? Esta ação liberará os pedidos.`)) {
      Database.deleteDeliveryManifest(man.id);
      setDbState({ ...Database.getState() });
      toast.info(`Romaneio ${man.number} excluído com sucesso.`);
    }
  };

  // ==========================================
  // GESTÃO DE ROTAS & ASSOCIAÇÃO EM LOTE
  // ==========================================
  const handleOpenNewRouteModal = () => {
    setEditingRoute(null);
    setRouteFormCode(`ROT-${(routes.length + 1).toString().padStart(2, '0')}`);
    setRouteFormName('');
    setRouteFormDescription('');
    setRouteFormColor('blue');
    setRouteFormDeliveryWindow('Dia Todo (08h às 17h)');
    setRouteFormVehicleType('Fiat Fiorino / Van');
    setRouteFormCities('São Paulo');
    setRouteFormNeighborhoods('');
    setRouteFormMarketAreas('');
    setRouteFormSellers('');
    setIsRouteModalOpen(true);
  };

  const handleEditRoute = (rot: DeliveryRoute) => {
    setEditingRoute(rot);
    setRouteFormCode(rot.code);
    setRouteFormName(rot.name);
    setRouteFormDescription(rot.description || '');
    setRouteFormColor(rot.color || 'blue');
    setRouteFormDeliveryWindow(rot.estimatedDeliveryWindow || 'Dia Todo');
    setRouteFormVehicleType(rot.vehicleTypeRecommendation || '');
    setRouteFormCities(rot.cities.join(', '));
    setRouteFormNeighborhoods(rot.neighborhoods.join(', '));
    setRouteFormMarketAreas(rot.marketAreas.join(', '));
    setRouteFormSellers(rot.sellerNames.join(', '));
    setIsRouteModalOpen(true);
  };

  const handleSaveRoute = (e: React.FormEvent) => {
    e.preventDefault();
    if (!routeFormName.trim()) {
      toast.error('Informe o nome da rota de entrega.');
      return;
    }

    const routeData: Omit<DeliveryRoute, 'id'> & { id?: string } = {
      id: editingRoute ? editingRoute.id : undefined,
      companyId: currentCompany.id,
      code: routeFormCode.trim().toUpperCase(),
      name: routeFormName.trim(),
      description: routeFormDescription.trim(),
      active: true,
      color: routeFormColor,
      cities: routeFormCities.split(',').map((c) => c.trim()).filter(Boolean),
      neighborhoods: routeFormNeighborhoods.split(',').map((n) => n.trim()).filter(Boolean),
      marketAreas: routeFormMarketAreas.split(',').map((m) => m.trim()).filter(Boolean),
      sellerNames: routeFormSellers.split(',').map((s) => s.trim()).filter(Boolean),
      estimatedDeliveryWindow: routeFormDeliveryWindow,
      vehicleTypeRecommendation: routeFormVehicleType,
      createdAt: editingRoute ? editingRoute.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    Database.saveDeliveryRoute(routeData);
    setDbState({ ...Database.getState() });
    setIsRouteModalOpen(false);
    toast.success(
      editingRoute
        ? `Rota "${routeData.name}" atualizada com sucesso.`
        : `Rota "${routeData.name}" cadastrada com sucesso.`
    );
  };

  const handleDeleteRoute = (rot: DeliveryRoute) => {
    if (confirm(`Deseja excluir a rota "${rot.name}"?`)) {
      Database.deleteDeliveryRoute(rot.id);
      setDbState({ ...Database.getState() });
      toast.info(`Rota "${rot.name}" excluída.`);
    }
  };

  // Associação em Lote por Critério (Cidade, Praça, Bairro ou Vendedor)
  const handleApplyBatchCriterion = () => {
    if (!batchTargetRouteId) {
      toast.error('Selecione a rota de destino para associação.');
      return;
    }
    if (!batchCriterionValue.trim()) {
      toast.error('Informe o valor do critério (cidade, praça, bairro ou vendedor).');
      return;
    }

    const targetRoute = routes.find((r) => r.id === batchTargetRouteId);
    if (!targetRoute) return;

    const filters: { city?: string; neighborhood?: string; marketArea?: string; sellerName?: string } = {};
    filters[batchCriterionType] = batchCriterionValue.trim();

    const count = Database.batchAssignRouteByFilters(targetRoute.id, targetRoute.name, filters);
    setDbState({ ...Database.getState() });

    if (count > 0) {
      toast.success(
        `Sucesso: ${count} cliente(s) associado(s) à rota "${targetRoute.name}" em lote!`
      );
      setBatchCriterionValue('');
    } else {
      toast.warning('Nenhum cliente encontrado com os critérios informados.');
    }
  };

  // Associação em Lote por Seleção Manual de Checkboxes
  const handleApplyBatchSelectedCustomers = () => {
    if (!batchTargetRouteId) {
      toast.error('Selecione a rota de destino para associação.');
      return;
    }
    if (batchSelectedCustomerIds.length === 0) {
      toast.error('Selecione ao menos 1 cliente na tabela para associar.');
      return;
    }

    const targetRoute = routes.find((r) => r.id === batchTargetRouteId);
    if (!targetRoute) return;

    const count = Database.batchAssignRouteToCustomers(
      targetRoute.id,
      targetRoute.name,
      batchSelectedCustomerIds
    );
    setDbState({ ...Database.getState() });
    setBatchSelectedCustomerIds([]);
    toast.success(`${count} cliente(s) vinculado(s) à rota "${targetRoute.name}" com sucesso!`);
  };

  // Lista de clientes filtrados na aba de rotas
  const filteredCustomersForRoutes = useMemo(() => {
    return customers.filter((c) => {
      if (customerFilterRoute === 'sem_rota' && c.deliveryRouteId) return false;
      if (customerFilterRoute !== 'todos' && customerFilterRoute !== 'sem_rota' && c.deliveryRouteId !== customerFilterRoute) {
        return false;
      }
      if (customerSearchTerm.trim()) {
        const term = customerSearchTerm.toLowerCase();
        const matchName = c.name.toLowerCase().includes(term);
        const matchCode = c.code.toLowerCase().includes(term);
        const matchCity = (c.city || '').toLowerCase().includes(term);
        const matchNeigh = (c.neighborhood || '').toLowerCase().includes(term);
        const matchMarket = (c.marketArea || '').toLowerCase().includes(term);
        const matchSeller = (c.sellerName || '').toLowerCase().includes(term);
        if (!matchName && !matchCode && !matchCity && !matchNeigh && !matchMarket && !matchSeller) {
          return false;
        }
      }
      return true;
    });
  }, [customers, customerFilterRoute, customerSearchTerm]);

  // ==========================================
  // RELATÓRIOS CONSOLIDADOS
  // ==========================================
  // 1. Produtos consolidados para carregamento do caminhão
  const consolidatedReportProducts = useMemo(() => {
    const productMap = new Map<
      string,
      {
        productId: string;
        productCode: string;
        description: string;
        unit: string;
        quantity: number;
        totalValue: number;
        customerCount: Set<string>;
      }
    >();

    filteredManifests.forEach((m) => {
      if (reportManifestFilter !== 'todos' && m.id !== reportManifestFilter) return;

      m.orders.forEach((o) => {
        o.items.forEach((it) => {
          if (reportSearchTerm.trim()) {
            const term = reportSearchTerm.toLowerCase();
            const matchCode = it.productCode.toLowerCase().includes(term);
            const matchDesc = it.description.toLowerCase().includes(term);
            if (!matchCode && !matchDesc) return;
          }

          const existing = productMap.get(it.productId);
          if (existing) {
            existing.quantity += it.quantity;
            existing.totalValue += it.totalPrice;
            existing.customerCount.add(o.customerName);
          } else {
            productMap.set(it.productId, {
              productId: it.productId,
              productCode: it.productCode,
              description: it.description,
              unit: it.unit,
              quantity: it.quantity,
              totalValue: it.totalPrice,
              customerCount: new Set([o.customerName]),
            });
          }
        });
      });
    });

    return Array.from(productMap.values()).sort((a, b) => b.quantity - a.quantity);
  }, [filteredManifests, reportManifestFilter, reportSearchTerm]);

  // 2. Entregas e produtos separados por cliente
  const clientDeliveriesReport = useMemo(() => {
    const list: Array<{
      manifestNumber: string;
      manifestDate: string;
      routeName: string;
      driverName: string;
      vehiclePlate: string;
      order: DeliveryManifestOrder;
    }> = [];

    filteredManifests.forEach((m) => {
      if (reportManifestFilter !== 'todos' && m.id !== reportManifestFilter) return;

      m.orders.forEach((o) => {
        if (reportSearchTerm.trim()) {
          const term = reportSearchTerm.toLowerCase();
          const matchCust = o.customerName.toLowerCase().includes(term);
          const matchOrder = o.orderNumber.toLowerCase().includes(term);
          const matchCity = o.address.city.toLowerCase().includes(term);
          const matchNeigh = o.address.neighborhood.toLowerCase().includes(term);
          const matchMarket = (o.marketArea || '').toLowerCase().includes(term);
          const matchSeller = (o.sellerName || '').toLowerCase().includes(term);
          const matchProduct = o.items.some(
            (it) => it.description.toLowerCase().includes(term) || it.productCode.toLowerCase().includes(term)
          );
          if (!matchCust && !matchOrder && !matchCity && !matchNeigh && !matchMarket && !matchSeller && !matchProduct) {
            return;
          }
        }

        list.push({
          manifestNumber: m.number,
          manifestDate: m.departureDate,
          routeName: m.routeName || 'Rota',
          driverName: m.driverName,
          vehiclePlate: m.vehiclePlate,
          order: o,
        });
      });
    });

    return list;
  }, [filteredManifests, reportManifestFilter, reportSearchTerm]);

  // Helper para impressão rápida
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-16">
      {/* CABEÇALHO PRINCIPAL DA EXPEDIÇÃO */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shrink-0">
            <Truck size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                Expedição & Logística de Entregas
              </h1>
              <span className="text-[11px] font-bold bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full border border-blue-200">
                {manifests.length} romaneios cadastrados
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Crie romaneios de entrega por rota, organize pedidos, despache cargas e associe clientes em lote por região.
            </p>
          </div>
        </div>

        {/* NAVEGAÇÃO DE ABAS */}
        <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold gap-1 self-start md:self-center">
          <button
            onClick={() => setActiveTab('romaneios')}
            className={`px-3.5 py-2 rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'romaneios'
                ? 'bg-white text-blue-700 shadow-xs font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Truck size={15} />
            <span>Romaneios de Entrega</span>
          </button>
          <button
            onClick={() => setActiveTab('rotas')}
            className={`px-3.5 py-2 rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'rotas'
                ? 'bg-white text-blue-700 shadow-xs font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Navigation size={15} />
            <span>Rotas de Entrega & Lote</span>
          </button>
          <button
            onClick={() => setActiveTab('relatorios')}
            className={`px-3.5 py-2 rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'relatorios'
                ? 'bg-white text-blue-700 shadow-xs font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText size={15} />
            <span>Relatórios de Entrega</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ABA 1: ROMANEIOS DE ENTREGA */}
      {/* ========================================================================= */}
      {activeTab === 'romaneios' && (
        <div className="space-y-4">
          {/* BARRA DE KPIS RÁPIDOS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1.5">
                <Truck size={13} className="text-blue-600" />
                <span>Em Trânsito / Na Rua</span>
              </span>
              <p className="text-xl font-extrabold text-blue-700 mt-1">
                {summaryMetrics.emTransito} <span className="text-xs font-normal text-slate-500">cargas</span>
              </p>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-emerald-600" />
                <span>Entregas Realizadas</span>
              </span>
              <p className="text-xl font-extrabold text-emerald-700 mt-1">
                {summaryMetrics.entreguesTotal}{' '}
                <span className="text-xs font-normal text-slate-500">
                  / {summaryMetrics.entreguesTotal + summaryMetrics.pendentesTotal}
                </span>
              </p>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1.5">
                <DollarSign size={13} className="text-indigo-600" />
                <span>Valor Total Transportado</span>
              </span>
              <p className="text-xl font-extrabold text-slate-900 font-mono mt-1">
                {formatCurrency(summaryMetrics.valorTotalCarga)}
              </p>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1.5">
                <DollarSign size={13} className="text-amber-600" />
                <span>A Cobrar na Rota</span>
              </span>
              <p className="text-xl font-extrabold text-amber-700 font-mono mt-1">
                {formatCurrency(summaryMetrics.valorCobrarNaRota)}
              </p>
            </div>
          </div>

          {/* PAINEL DE CONTROLE: BOTÃO NOVO ROMANEIO + FILTROS */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-extrabold text-sm sm:text-base text-slate-800 flex items-center gap-2">
                  <span>Romaneios Cadastrados</span>
                  <span className="text-[11px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 rounded-full">
                    {filteredManifests.length} de {manifests.length}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Consulte os despachos emitidos, motoristas, veículos e atualize o status das entregas.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setActiveTab('rotas')}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-colors cursor-pointer shrink-0"
                >
                  <Navigation size={14} className="text-blue-600" />
                  <span>Rotas de Entrega & Lote</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('relatorios')}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-colors cursor-pointer shrink-0"
                >
                  <FileText size={14} className="text-blue-600" />
                  <span>Relatórios de Entrega</span>
                </button>
                <button
                  type="button"
                  onClick={handleOpenNewManifestModal}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
                >
                  <Plus size={16} />
                  <span>NOVO ROMANEIO DE ENTREGA</span>
                </button>
              </div>
            </div>

            {/* FILTROS DE PESQUISA */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end text-xs">
              <div className="sm:col-span-4 relative">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Buscar Romaneio:</label>
                <div className="relative flex items-center">
                  <Search size={14} className="absolute left-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Nº ROM, motorista, placa, pedido ou cliente..."
                    value={manifestSearchTerm}
                    onChange={(e) => setManifestSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-7 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-blue-500"
                  />
                  {manifestSearchTerm && (
                    <button
                      type="button"
                      onClick={() => setManifestSearchTerm('')}
                      className="absolute right-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>

              <div className="sm:col-span-3">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Filtrar por Rota:</label>
                <select
                  value={manifestRouteFilter}
                  onChange={(e) => setManifestRouteFilter(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
                >
                  <option value="todos">Todas as Rotas ({routes.length})</option>
                  {routes.map((r) => (
                    <option key={r.id} value={r.id}>
                      [{r.code}] {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Status da Carga:</label>
                <select
                  value={manifestStatusFilter}
                  onChange={(e) => setManifestStatusFilter(e.target.value as any)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
                >
                  <option value="todos">Todos os Status</option>
                  <option value="planejado">Planejado</option>
                  <option value="em_transito">Em Trânsito</option>
                  <option value="entregue">Concluído</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>

              <div className="sm:col-span-3">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Período de Saída:</label>
                <select
                  value={manifestPeriodFilter}
                  onChange={(e) => setManifestPeriodFilter(e.target.value as any)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
                >
                  <option value="todos">Todo o Histórico</option>
                  <option value="hoje">Hoje</option>
                  <option value="ultimos_7_dias">Últimos 7 dias</option>
                  <option value="este_mes">Este Mês</option>
                  <option value="personalizado">Personalizado (De / Até)</option>
                </select>
              </div>
            </div>

            {manifestPeriodFilter === 'personalizado' && (
              <div className="flex items-center gap-3 pt-2 border-t border-slate-100 flex-wrap text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-600">De:</span>
                  <input
                    type="date"
                    value={manifestStartDate}
                    onChange={(e) => setManifestStartDate(e.target.value)}
                    className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-600">Até:</span>
                  <input
                    type="date"
                    value={manifestEndDate}
                    onChange={(e) => setManifestEndDate(e.target.value)}
                    className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>
            )}
          </div>

          {/* LISTA DE ROMANEIOS EM CARDS ELEGANTES */}
          {filteredManifests.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
              <Truck size={40} className="mx-auto text-slate-300" />
              <h4 className="font-bold text-slate-700 text-sm">Nenhum romaneio de entrega encontrado</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Não há romaneios correspondentes aos filtros selecionados. Crie um novo romaneio adicionando os pedidos da rota estabelecida.
              </p>
              <button
                type="button"
                onClick={handleOpenNewManifestModal}
                className="mt-2 px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl shadow-xs"
              >
                Criar Primeiro Romaneio
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredManifests.map((man) => {
                const route = routes.find((r) => r.id === man.routeId);
                const progressPct = man.totalOrders > 0 ? Math.round((man.totalDelivered / man.totalOrders) * 100) : 0;

                return (
                  <div
                    key={man.id}
                    className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center font-bold text-sm shrink-0">
                          <Truck size={20} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-sm sm:text-base text-slate-900 font-mono">
                              {man.number}
                            </span>
                            <span
                              className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                                man.status === 'entregue'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : man.status === 'em_transito'
                                  ? 'bg-blue-50 text-blue-800 border-blue-200'
                                  : man.status === 'cancelado'
                                  ? 'bg-rose-50 text-rose-800 border-rose-200'
                                  : 'bg-amber-50 text-amber-800 border-amber-200'
                              }`}
                            >
                              {man.status === 'em_transito'
                                ? 'Em Trânsito'
                                : man.status === 'entregue'
                                ? 'Entregas Concluídas'
                                : man.status === 'planejado'
                                ? 'Planejado'
                                : 'Cancelado'}
                            </span>
                            <span className="text-xs text-slate-500 flex items-center gap-1">
                              <Calendar size={12} />
                              <span>Saída: {man.departureDate}</span>
                            </span>
                          </div>
                          <p className="text-xs font-bold text-slate-700 mt-0.5">
                            Rota: <span className="text-blue-700">{man.routeName || 'Rota Padrão'}</span>
                          </p>
                        </div>
                      </div>

                      {/* BOTÕES DE AÇÃO DO ROMANEIO */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => setViewingManifestDetails(man)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                          title="Abrir detalhes e dar baixa nas entregas"
                        >
                          <Eye size={13} />
                          <span>Baixa / Ficha</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setPrintManifest(man)}
                          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                          title="Imprimir manifesto de carga e fichas de entrega por cliente"
                        >
                          <Printer size={13} />
                          <span>Imprimir Ficha</span>
                        </button>

                        {/* Mudar Status Rápido */}
                        {man.status === 'planejado' && (
                          <button
                            type="button"
                            onClick={() => handleChangeManifestStatus(man, 'em_transito')}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                          >
                            Despachar Veículo
                          </button>
                        )}

                        {man.status === 'em_transito' && (
                          <button
                            type="button"
                            onClick={() => handleChangeManifestStatus(man, 'entregue')}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                          >
                            Concluir Romaneio
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleEditManifest(man)}
                          className="p-1.5 hover:bg-slate-100 text-slate-500 rounded-lg"
                          title="Editar Romaneio"
                        >
                          <Edit2 size={14} />
                        </button>

                        {man.status === 'planejado' && (
                          <button
                            type="button"
                            onClick={() => handleDeleteManifest(man)}
                            className="p-1.5 hover:bg-rose-50 text-rose-500 rounded-lg"
                            title="Excluir Romaneio"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* DADOS LOGÍSTICOS E MÉTRICAS DO ROMANEIO */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                      <div>
                        <span className="text-[11px] font-bold text-slate-500 uppercase block">Motorista & Veículo</span>
                        <div className="font-bold text-slate-800 mt-0.5">{man.driverName}</div>
                        <div className="text-slate-500 font-mono text-[11px]">
                          Placa: {man.vehiclePlate} {man.vehicleModel ? `(${man.vehicleModel})` : ''}
                        </div>
                      </div>

                      <div>
                        <span className="text-[11px] font-bold text-slate-500 uppercase block">Progresso das Paradas</span>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                            <div
                              className="bg-emerald-500 h-full rounded-full transition-all"
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                          <span className="font-extrabold text-slate-800 shrink-0 font-mono text-[11px]">
                            {man.totalDelivered}/{man.totalOrders} ({progressPct}%)
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {man.totalPending} entrega(s) pendente(s)
                        </div>
                      </div>

                      <div>
                        <span className="text-[11px] font-bold text-slate-500 uppercase block">Valor Total da Carga</span>
                        <div className="font-extrabold text-slate-900 text-sm font-mono mt-0.5">
                          {formatCurrency(man.totalValue)}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {man.totalVolumes} volumes carregados
                        </div>
                      </div>

                      <div>
                        <span className="text-[11px] font-bold text-slate-500 uppercase block">Cobrança na Entrega</span>
                        <div className="font-extrabold text-amber-700 text-sm font-mono mt-0.5">
                          {formatCurrency(man.totalAmountToCollect)}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {man.orders.filter((o) => o.paymentStatus === 'cobrar_na_entrega').length} pedido(s) a receber
                        </div>
                      </div>
                    </div>

                    {/* MINI LISTA DE PARADAS DO ROMANEIO */}
                    <div className="pt-1">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
                        <span>Roteiro de Paradas ({man.orders.length} clientes na rota):</span>
                        <span className="text-slate-400 font-normal text-[11px]">Ordem das entregas definida</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {man.orders.map((ord) => (
                          <div
                            key={ord.orderId}
                            className={`p-2.5 rounded-xl border text-xs flex items-start justify-between gap-2 ${
                              ord.deliveryStatus === 'entregue'
                                ? 'bg-emerald-50/60 border-emerald-200'
                                : ord.deliveryStatus === 'nao_entregue'
                                ? 'bg-rose-50/60 border-rose-200'
                                : 'bg-white border-slate-200'
                            }`}
                          >
                            <div className="space-y-0.5 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-black text-[10px] flex items-center justify-center shrink-0">
                                  {ord.sequence}º
                                </span>
                                <span className="font-extrabold text-slate-800 truncate block">
                                  {ord.customerName}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-500 truncate pl-6">
                                {ord.address.street}, {ord.address.number} - {ord.address.neighborhood}
                              </div>
                              <div className="text-[11px] font-mono text-slate-700 pl-6 flex items-center gap-2">
                                <span>{ord.orderNumber}</span>
                                <span>•</span>
                                <span className="font-bold">{formatCurrency(ord.totalValue)}</span>
                              </div>
                            </div>

                            <span
                              className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md shrink-0 border ${
                                ord.deliveryStatus === 'entregue'
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                  : ord.deliveryStatus === 'nao_entregue'
                                  ? 'bg-rose-100 text-rose-800 border-rose-300'
                                  : 'bg-slate-100 text-slate-600 border-slate-200'
                              }`}
                            >
                              {ord.deliveryStatus === 'entregue'
                                ? 'Entregue'
                                : ord.deliveryStatus === 'nao_entregue'
                                ? 'Ocorrência'
                                : 'Pendente'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 2: ROTAS DE ENTREGA & ASSOCIAÇÃO EM LOTE */}
      {/* ========================================================================= */}
      {activeTab === 'rotas' && (
        <div className="space-y-4">
          {/* BANNER DE ASSOCIAÇÃO EM LOTE (RECURSO CHAVE SOLICITADO) */}
          <div className="bg-gradient-to-br from-blue-900 via-slate-900 to-indigo-950 text-white p-5 sm:p-6 rounded-2xl shadow-lg border border-blue-800/60 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-white/10">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-2xl bg-blue-500/20 text-blue-300 border border-blue-400/30 flex items-center justify-center shrink-0">
                  <Compass size={24} />
                </div>
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg text-white flex items-center gap-2">
                    <span>Associação de Rotas em Lote</span>
                    <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-0.5 rounded-full">
                      Roteirização Rápida
                    </span>
                  </h3>
                  <p className="text-xs text-blue-200 max-w-3xl leading-relaxed mt-0.5">
                    Vincule dezenas ou centenas de clientes à rota comercial de uma só vez, sem precisar entrar de um em um no cadastro individual.
                    Selecione por <strong>Cidade</strong>, <strong>Bairro</strong>, <strong>Praça Comercial</strong> ou <strong>Vendedor</strong>.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleOpenNewRouteModal}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
              >
                <Plus size={16} />
                <span>NOVA ROTA DE ENTREGA</span>
              </button>
            </div>

            {/* FORMULÁRIO DE APLICAÇÃO EM LOTE POR CRITÉRIO */}
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/15 space-y-3 text-xs">
              <span className="font-bold text-white text-xs block">
                1. Aplicar Associação Automática por Região ou Vendedor:
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                <div className="sm:col-span-4">
                  <label className="block text-[11px] font-bold text-blue-200 mb-1">
                    Rota de Entrega Destino:
                  </label>
                  <select
                    value={batchTargetRouteId}
                    onChange={(e) => setBatchTargetRouteId(e.target.value)}
                    className="w-full p-2.5 bg-slate-900 border border-white/20 rounded-lg text-xs font-bold text-white focus:outline-hidden focus:ring-1 focus:ring-blue-400"
                  >
                    <option value="">Selecione a rota para vincular...</option>
                    {routes.map((r) => (
                      <option key={r.id} value={r.id}>
                        [{r.code}] {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-[11px] font-bold text-blue-200 mb-1">
                    Vincular Clientes Por:
                  </label>
                  <select
                    value={batchCriterionType}
                    onChange={(e) => setBatchCriterionType(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-900 border border-white/20 rounded-lg text-xs font-bold text-white focus:outline-hidden focus:ring-1 focus:ring-blue-400"
                  >
                    <option value="neighborhood">Bairro</option>
                    <option value="marketArea">Praça / Região</option>
                    <option value="city">Cidade</option>
                    <option value="sellerName">Vendedor Responsável</option>
                  </select>
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-[11px] font-bold text-blue-200 mb-1">
                    Nome do {batchCriterionType === 'neighborhood' ? 'Bairro' : batchCriterionType === 'marketArea' ? 'Praça' : batchCriterionType === 'city' ? 'Cidade' : 'Vendedor'}:
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Santana, Centro, Carlos..."
                    value={batchCriterionValue}
                    onChange={(e) => setBatchCriterionValue(e.target.value)}
                    className="w-full p-2.5 bg-slate-900 border border-white/20 rounded-lg text-xs text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-400"
                  />
                </div>

                <div className="sm:col-span-2">
                  <button
                    type="button"
                    onClick={handleApplyBatchCriterion}
                    className="w-full py-2.5 px-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-lg shadow-md transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 size={15} />
                    <span>Vincular em Lote</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* LISTA DE ROTAS CADASTRADAS */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
              <div>
                <h3 className="font-extrabold text-sm sm:text-base text-slate-800">
                  Rotas Comerciais Ativas ({routes.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Rotas cadastradas com abrangência por municípios, bairros e motoristas recomendados.
                </p>
              </div>

              <div className="w-full sm:w-64 relative">
                <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar rota..."
                  value={routeSearchTerm}
                  onChange={(e) => setRouteSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {routes
                .filter(
                  (r) =>
                    !routeSearchTerm ||
                    r.name.toLowerCase().includes(routeSearchTerm.toLowerCase()) ||
                    r.code.toLowerCase().includes(routeSearchTerm.toLowerCase())
                )
                .map((rot) => {
                  const clientCount = customers.filter((c) => c.deliveryRouteId === rot.id).length;

                  return (
                    <div
                      key={rot.id}
                      className="p-4 rounded-xl border border-slate-200 hover:border-blue-300 bg-white transition-all space-y-3 shadow-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 font-black text-xs flex items-center justify-center border border-blue-200 shrink-0">
                            {rot.code}
                          </div>
                          <div>
                            <h4 className="font-extrabold text-sm text-slate-900 leading-snug">
                              {rot.name}
                            </h4>
                            <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">
                              {rot.description || 'Sem descrição cadastrada.'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleEditRoute(rot)}
                            className="p-1 hover:bg-slate-100 text-slate-600 rounded"
                            title="Editar Rota"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRoute(rot)}
                            className="p-1 hover:bg-rose-50 text-rose-500 rounded"
                            title="Excluir Rota"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {/* DETALHES DE ASSOCIAÇÃO DA ROTA */}
                      <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Cidades</span>
                          <span className="font-semibold text-slate-700 truncate block">
                            {rot.cities.length > 0 ? rot.cities.join(', ') : 'Não informado'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Bairros</span>
                          <span className="font-semibold text-slate-700 truncate block">
                            {rot.neighborhoods.length > 0 ? rot.neighborhoods.join(', ') : 'Não informado'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Praças</span>
                          <span className="font-semibold text-slate-700 truncate block">
                            {rot.marketAreas.length > 0 ? rot.marketAreas.join(', ') : 'Geral'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Vendedores</span>
                          <span className="font-semibold text-slate-700 truncate block">
                            {rot.sellerNames.length > 0 ? rot.sellerNames.join(', ') : 'Equipe geral'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                        <span className="text-slate-500">
                          Horário: <strong>{rot.estimatedDeliveryWindow || 'Dia Todo'}</strong>
                        </span>
                        <span className="font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                          {clientCount} clientes vinculados
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* TABELA DE CLIENTES COM SELEÇÃO MANUAL EM MASSA */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
              <div>
                <h3 className="font-extrabold text-sm sm:text-base text-slate-800 flex items-center gap-2">
                  <span>Clientes e Rota Vinculada</span>
                  <span className="text-xs font-normal text-slate-500">
                    ({filteredCustomersForRoutes.length} clientes listados)
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  Marque múltiplos clientes abaixo para vinculá-los à rota de sua escolha simultaneamente.
                </p>
              </div>

              {/* BARRA DE AÇÃO EM LOTE PARA SELEÇÃO */}
              {batchSelectedCustomerIds.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 p-2.5 rounded-xl flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-blue-900">
                    {batchSelectedCustomerIds.length} selecionado(s):
                  </span>
                  <select
                    value={batchTargetRouteId}
                    onChange={(e) => setBatchTargetRouteId(e.target.value)}
                    className="p-1.5 bg-white border border-blue-300 rounded-lg text-xs font-bold text-slate-800"
                  >
                    <option value="">Vincular à Rota...</option>
                    {routes.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleApplyBatchSelectedCustomers}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                  >
                    Aplicar aos Selecionados
                  </button>
                  <button
                    type="button"
                    onClick={() => setBatchSelectedCustomerIds([])}
                    className="text-xs text-slate-500 hover:text-slate-700"
                  >
                    Limpar
                  </button>
                </div>
              )}
            </div>

            {/* FILTROS DA TABELA DE CLIENTES */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs items-center">
              <div className="sm:col-span-6 relative">
                <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filtrar por nome, bairro, cidade, praça ou vendedor..."
                  value={customerSearchTerm}
                  onChange={(e) => setCustomerSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="sm:col-span-4">
                <select
                  value={customerFilterRoute}
                  onChange={(e) => setCustomerFilterRoute(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
                >
                  <option value="todos">Todos os Clientes</option>
                  <option value="sem_rota">Apenas Sem Rota Definida</option>
                  {routes.map((r) => (
                    <option key={r.id} value={r.id}>
                      Clientes da {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2 text-right">
                <button
                  type="button"
                  onClick={() => {
                    if (batchSelectedCustomerIds.length === filteredCustomersForRoutes.length) {
                      setBatchSelectedCustomerIds([]);
                    } else {
                      setBatchSelectedCustomerIds(filteredCustomersForRoutes.map((c) => c.id));
                    }
                  }}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
                >
                  {batchSelectedCustomerIds.length === filteredCustomersForRoutes.length
                    ? 'Desmarcar Todos'
                    : 'Marcar Todos'}
                </button>
              </div>
            </div>

            {/* TABELA DE CLIENTES */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={
                            filteredCustomersForRoutes.length > 0 &&
                            batchSelectedCustomerIds.length === filteredCustomersForRoutes.length
                          }
                          onChange={(e) => {
                            if (e.target.checked) {
                              setBatchSelectedCustomerIds(filteredCustomersForRoutes.map((c) => c.id));
                            } else {
                              setBatchSelectedCustomerIds([]);
                            }
                          }}
                        />
                      </th>
                      <th className="p-3">Código / Cliente</th>
                      <th className="p-3">Bairro</th>
                      <th className="p-3">Cidade / UF</th>
                      <th className="p-3">Praça</th>
                      <th className="p-3">Vendedor</th>
                      <th className="p-3">Rota Atual de Entrega</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredCustomersForRoutes.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-400">
                          Nenhum cliente encontrado.
                        </td>
                      </tr>
                    ) : (
                      filteredCustomersForRoutes.map((c) => {
                        const isSelected = batchSelectedCustomerIds.includes(c.id);

                        return (
                          <tr
                            key={c.id}
                            className={`hover:bg-slate-50/80 transition-colors ${
                              isSelected ? 'bg-blue-50/50' : ''
                            }`}
                          >
                            <td className="p-3 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setBatchSelectedCustomerIds((prev) => [...prev, c.id]);
                                  } else {
                                    setBatchSelectedCustomerIds((prev) => prev.filter((id) => id !== c.id));
                                  }
                                }}
                              />
                            </td>
                            <td className="p-3">
                              <div className="font-bold text-slate-900">{c.name}</div>
                              <div className="text-[10px] text-blue-700 font-mono">{c.code}</div>
                            </td>
                            <td className="p-3 text-slate-700 font-medium">
                              {c.neighborhood || <span className="text-slate-400 italic">Não informado</span>}
                            </td>
                            <td className="p-3 text-slate-700 font-medium">
                              {c.city ? `${c.city}/${c.state || 'SP'}` : '—'}
                            </td>
                            <td className="p-3 text-slate-700">
                              {c.marketArea ? (
                                <span className="font-semibold text-slate-800">{c.marketArea}</span>
                              ) : (
                                <span className="text-slate-400 italic">—</span>
                              )}
                            </td>
                            <td className="p-3 text-slate-700">
                              {c.sellerName || <span className="text-slate-400 italic">—</span>}
                            </td>
                            <td className="p-3">
                              {c.deliveryRouteName ? (
                                <span className="inline-flex items-center gap-1 font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200 text-[11px]">
                                  <Truck size={11} />
                                  <span>{c.deliveryRouteName}</span>
                                </span>
                              ) : (
                                <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 text-[10px] font-bold">
                                  Sem rota vinculada
                                </span>
                              )}
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
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 3: RELATÓRIOS DE EXPEDIÇÃO */}
      {/* ========================================================================= */}
      {activeTab === 'relatorios' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
              <div>
                <h3 className="font-extrabold text-sm sm:text-base text-slate-800 flex items-center gap-2">
                  <FileText className="text-blue-600" size={18} />
                  <span>Relatórios de Expedição e Entregas</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Emita o mapa consolidado de produtos para separação no armazém e a lista detalhada de entregas por cliente.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer size={15} />
                  <span>Imprimir Relatório</span>
                </button>
              </div>
            </div>

            {/* SELEÇÃO DO TIPO DE RELATÓRIO E FILTROS */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs items-end">
              <div className="sm:col-span-4">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Tipo de Relatório:</label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value as any)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-blue-700"
                >
                  <option value="entregas_por_cliente">1. Entregas e Produtos Separados por Cliente</option>
                  <option value="produtos_consolidados">2. Mapa de Carga (Produtos Consolidados para Separação)</option>
                  <option value="desempenho_romaneios">3. Extrato Consolidado de Romaneios</option>
                </select>
              </div>

              <div className="sm:col-span-3">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Filtrar Romaneio:</label>
                <select
                  value={reportManifestFilter}
                  onChange={(e) => setReportManifestFilter(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
                >
                  <option value="todos">Todos os Romaneios</option>
                  {manifests.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.number} ({m.departureDate} - {m.routeName})
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-3">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Filtrar por Rota:</label>
                <select
                  value={reportRouteFilter}
                  onChange={(e) => setReportRouteFilter(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
                >
                  <option value="todos">Todas as Rotas</option>
                  {routes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <div className="relative">
                  <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar no relatório..."
                    value={reportSearchTerm}
                    onChange={(e) => setReportSearchTerm(e.target.value)}
                    className="w-full pl-7 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* RELATÓRIO 1: MAPA CONSOLIDADO DE PRODUTOS */}
          {reportType === 'produtos_consolidados' && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 print:shadow-none print:border-none">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100 flex-wrap gap-2">
                <div>
                  <h4 className="font-extrabold text-sm text-slate-800">
                    Mapa de Carga e Separação de Produtos (Caminhão)
                  </h4>
                  <p className="text-xs text-slate-500">
                    Soma consolidada de todos os produtos para retirada no estoque e conferência de carregamento.
                  </p>
                </div>
                <div className="text-right text-xs">
                  <span className="font-bold text-slate-700">Total de Itens Distintos: </span>
                  <span className="font-extrabold text-blue-700">{consolidatedReportProducts.length} produtos</span>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-3">Código</th>
                      <th className="p-3">Produto / Descrição</th>
                      <th className="p-3 text-center">Unidade</th>
                      <th className="p-3 text-right">Qtd Total para Carregar</th>
                      <th className="p-3 text-center">Clientes Atendidos</th>
                      <th className="p-3 text-right">Valor Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {consolidatedReportProducts.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-400">
                          Nenhum produto encontrado para os filtros selecionados.
                        </td>
                      </tr>
                    ) : (
                      consolidatedReportProducts.map((p) => (
                        <tr key={p.productId} className="hover:bg-slate-50/80">
                          <td className="p-3 font-mono font-bold text-blue-700">{p.productCode}</td>
                          <td className="p-3 font-semibold text-slate-800">{p.description}</td>
                          <td className="p-3 text-center font-bold text-slate-600">{p.unit}</td>
                          <td className="p-3 text-right font-black text-slate-900 text-sm">
                            {formatQuantity(p.quantity)} {p.unit}
                          </td>
                          <td className="p-3 text-center">
                            <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                              {p.customerCount.size} cliente(s)
                            </span>
                          </td>
                          <td className="p-3 text-right font-extrabold text-slate-900 font-mono">
                            {formatCurrency(p.totalValue)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* RELATÓRIO 2: ENTREGAS SEPARADAS POR CLIENTE (COM PRODUTOS) */}
          {reportType === 'entregas_por_cliente' && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 print:shadow-none print:border-none">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100 flex-wrap gap-2">
                <div>
                  <h4 className="font-extrabold text-sm text-slate-800">
                    Relação Detalhada de Entregas e Produtos por Cliente
                  </h4>
                  <p className="text-xs text-slate-500">
                    Lista organizada por cliente com endereço completo, pedidos, insumos entregues e valores a receber.
                  </p>
                </div>
                <div className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                  {clientDeliveriesReport.length} entregas listadas
                </div>
              </div>

              {clientDeliveriesReport.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  Nenhuma entrega encontrada para os critérios selecionados.
                </div>
              ) : (
                <div className="space-y-4">
                  {clientDeliveriesReport.map((entry, idx) => {
                    const ord = entry.order;

                    return (
                      <div
                        key={ord.orderId + idx}
                        className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3"
                      >
                        {/* CABEÇALHO DO CLIENTE */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-200 gap-2">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-black text-sm text-slate-900">
                                {ord.sequence}º Parada: {ord.customerName}
                              </span>
                              <span className="text-[10px] font-mono text-slate-500 font-bold">
                                [{ord.customerCode || 'CLI'}]
                              </span>
                              <span
                                className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                                  ord.deliveryStatus === 'entregue'
                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                    : ord.deliveryStatus === 'nao_entregue'
                                    ? 'bg-rose-100 text-rose-800 border-rose-200'
                                    : 'bg-amber-100 text-amber-800 border-amber-200'
                                }`}
                              >
                                {ord.deliveryStatus.toUpperCase()}
                              </span>
                            </div>

                            <p className="text-xs text-slate-600 mt-0.5">
                              {ord.address.street}, {ord.address.number} - {ord.address.neighborhood},{' '}
                              {ord.address.city}/{ord.address.state} • Praça: <strong>{ord.marketArea || 'Geral'}</strong>
                            </p>
                          </div>

                          <div className="text-right text-xs">
                            <div className="font-extrabold text-slate-900 font-mono text-sm">
                              {formatCurrency(ord.totalValue)}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {ord.paymentStatus === 'cobrar_na_entrega' ? (
                                <span className="text-amber-700 font-bold">
                                  Cobrar na entrega ({formatCurrency(ord.amountToCollect || ord.totalValue)})
                                </span>
                              ) : (
                                <span className="text-emerald-700 font-bold">Pago antecipado</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* TABELA DE PRODUTOS ENTREGUES AO CLIENTE */}
                        <div className="bg-white rounded-lg border border-slate-200/80 overflow-hidden">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-100 text-slate-600 font-bold text-[10px] uppercase">
                              <tr>
                                <th className="p-2">Código</th>
                                <th className="p-2">Produto Entregue</th>
                                <th className="p-2 text-center">Unidade</th>
                                <th className="p-2 text-right">Qtd</th>
                                <th className="p-2 text-right">Unitário</th>
                                <th className="p-2 text-right">Total</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {ord.items.map((it) => (
                                <tr key={it.productId}>
                                  <td className="p-2 font-mono text-blue-700 font-bold">{it.productCode}</td>
                                  <td className="p-2 font-medium text-slate-800">{it.description}</td>
                                  <td className="p-2 text-center font-bold text-slate-500">{it.unit}</td>
                                  <td className="p-2 text-right font-black text-slate-900">
                                    {formatQuantity(it.quantity)}
                                  </td>
                                  <td className="p-2 text-right text-slate-600">{formatCurrency(it.unitPrice)}</td>
                                  <td className="p-2 text-right font-extrabold text-slate-900 font-mono">
                                    {formatCurrency(it.totalPrice)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* RODAPÉ DO CLIENTE (VENDEDOR, ROMANEIO E MOTORISTA) */}
                        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                          <div>
                            Romaneio: <strong>{entry.manifestNumber}</strong> • Rota: <strong>{entry.routeName}</strong>
                          </div>
                          <div>
                            Motorista: <strong>{entry.driverName}</strong> ({entry.vehiclePlate}) • Vendedor:{' '}
                            <strong>{ord.sellerName || 'Geral'}</strong>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* RELATÓRIO 3: DESEMPENHO DOS ROMANEIOS */}
          {reportType === 'desempenho_romaneios' && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h4 className="font-extrabold text-sm text-slate-800">
                Extrato Analítico de Romaneios e Cargas
              </h4>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-3">Romaneio</th>
                      <th className="p-3">Data Saída</th>
                      <th className="p-3">Rota</th>
                      <th className="p-3">Motorista / Placa</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3 text-center">Entregas</th>
                      <th className="p-3 text-right">Valor Total Carga</th>
                      <th className="p-3 text-right">A Cobrar na Rota</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredManifests.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50/80">
                        <td className="p-3 font-mono font-bold text-blue-700">{m.number}</td>
                        <td className="p-3 text-slate-700">{m.departureDate}</td>
                        <td className="p-3 font-semibold text-slate-800">{m.routeName}</td>
                        <td className="p-3 text-slate-700">
                          {m.driverName} ({m.vehiclePlate})
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                              m.status === 'entregue'
                                ? 'bg-emerald-100 text-emerald-800'
                                : m.status === 'em_transito'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {m.status}
                          </span>
                        </td>
                        <td className="p-3 text-center font-extrabold text-slate-800">
                          {m.totalDelivered} / {m.totalOrders}
                        </td>
                        <td className="p-3 text-right font-extrabold text-slate-900 font-mono">
                          {formatCurrency(m.totalValue)}
                        </td>
                        <td className="p-3 text-right font-bold text-amber-700 font-mono">
                          {formatCurrency(m.totalAmountToCollect)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: NOVO / EDITAR ROMANEIO DE ENTREGA (COM MONTAGEM PRÁTICA) */}
      {/* ========================================================================= */}
      {isNewManifestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <form
            onSubmit={handleSaveManifest}
            className="bg-white rounded-2xl max-w-4xl w-full border border-slate-200 shadow-2xl p-5 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                  <Truck size={18} />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">
                    {editingManifest ? `Editar Romaneio ${editingManifest.number}` : 'Novo Romaneio de Entrega'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Preencha os dados da viagem e adicione os pedidos para a rota de entrega.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsNewManifestModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={18} />
              </button>
            </div>

            {/* SEÇÃO 1: CABEÇALHO DO ROMANEIO (ROTA, DATA, MOTORISTA, VEÍCULO) */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 text-xs">
              <span className="font-bold text-slate-700 text-xs block uppercase tracking-wide">
                1. Informações da Carga e Transporte:
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Data de Saída Prevista *</label>
                  <input
                    type="date"
                    required
                    value={formDepartureDate}
                    onChange={(e) => setFormDepartureDate(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block font-bold text-slate-700">Rota Comercial de Entrega *</label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsNewManifestModalOpen(false);
                        setActiveTab('rotas');
                      }}
                      className="text-[10px] text-blue-600 hover:text-blue-800 font-bold underline cursor-pointer"
                      title="Abrir submenu Rotas de Entrega para associar clientes em lote"
                    >
                      + Configurar Rotas / Lote
                    </button>
                  </div>
                  <select
                    required
                    value={formRouteId}
                    onChange={(e) => setFormRouteId(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-blue-700"
                  >
                    <option value="">Selecione uma Rota...</option>
                    {routes.map((r) => (
                      <option key={r.id} value={r.id}>
                        [{r.code}] {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Motorista / Entregador *</label>
                  <input
                    type="text"
                    required
                    value={formDriverName}
                    onChange={(e) => setFormDriverName(e.target.value)}
                    placeholder="Nome do motorista"
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Placa & Modelo do Veículo *</label>
                  <input
                    type="text"
                    required
                    value={formVehiclePlate}
                    onChange={(e) => setFormVehiclePlate(e.target.value.toUpperCase())}
                    placeholder="Placa (ex: BRA-2E19)"
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Telefone do Motorista (WhatsApp)</label>
                  <input
                    type="text"
                    value={formDriverPhone}
                    onChange={(e) => setFormDriverPhone(e.target.value)}
                    placeholder="(11) 98765-4321"
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Observações da Carga</label>
                  <input
                    type="text"
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder="Instruções de entrega, docas ou conferência..."
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>
            </div>

            {/* SEÇÃO 2: SELEÇÃO DE PEDIDOS DISPONÍVEIS DA ROTA */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-1 border-b border-slate-100 gap-2">
                <div>
                  <span className="font-extrabold text-xs text-slate-800 uppercase block">
                    2. Selecionar Pedidos Disponíveis para a Rota:
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {eligibleOrdersForDraft.length} pedido(s) apto(s) para entrega
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={orderSelectionFilterOnlyRoute}
                      onChange={(e) => setOrderSelectionFilterOnlyRoute(e.target.checked)}
                      className="rounded"
                    />
                    <span className="font-bold">Apenas da Rota Selecionada</span>
                  </label>

                  <input
                    type="text"
                    placeholder="Buscar pedido ou cliente..."
                    value={orderSelectionSearch}
                    onChange={(e) => setOrderSelectionSearch(e.target.value)}
                    className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs w-48"
                  />
                </div>
              </div>

              {eligibleOrdersForDraft.length === 0 ? (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500">
                  Nenhum pedido pendente de entrega encontrado para esta rota no momento. Desmarque o filtro de rota acima para ver pedidos de outras regiões.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl max-h-48 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] sticky top-0">
                      <tr>
                        <th className="p-2.5 w-8 text-center">
                          <input
                            type="checkbox"
                            checked={
                              selectedOrderIdsForManifest.length === eligibleOrdersForDraft.length &&
                              eligibleOrdersForDraft.length > 0
                            }
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedOrderIdsForManifest(eligibleOrdersForDraft.map((o) => o.id));
                              } else {
                                setSelectedOrderIdsForManifest([]);
                              }
                            }}
                          />
                        </th>
                        <th className="p-2.5">Pedido</th>
                        <th className="p-2.5">Cliente</th>
                        <th className="p-2.5">Bairro / Cidade</th>
                        <th className="p-2.5 text-center">Itens</th>
                        <th className="p-2.5 text-right">Valor</th>
                        <th className="p-2.5 text-center">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {eligibleOrdersForDraft.map((ord) => {
                        const client = customers.find((c) => c.id === ord.customerId || c.name === ord.customerName);
                        const isChecked = selectedOrderIdsForManifest.includes(ord.id);

                        return (
                          <tr key={ord.id} className="hover:bg-slate-50">
                            <td className="p-2.5 text-center">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedOrderIdsForManifest((prev) => [...prev, ord.id]);
                                  } else {
                                    setSelectedOrderIdsForManifest((prev) => prev.filter((id) => id !== ord.id));
                                  }
                                }}
                              />
                            </td>
                            <td className="p-2.5 font-mono font-bold text-blue-700">{ord.number}</td>
                            <td className="p-2.5 font-semibold text-slate-800">{ord.customerName}</td>
                            <td className="p-2.5 text-slate-600">
                              {client?.neighborhood || 'Centro'}, {client?.city || 'São Paulo'}
                            </td>
                            <td className="p-2.5 text-center font-bold text-slate-700">
                              {ord.items.reduce((s, it) => s + it.quantity, 0)} un
                            </td>
                            <td className="p-2.5 text-right font-extrabold text-slate-900 font-mono">
                              {formatCurrency(ord.total)}
                            </td>
                            <td className="p-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => handleAddOrdersToDraft([ord])}
                                className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] rounded cursor-pointer"
                              >
                                + Adicionar
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {selectedOrderIdsForManifest.length > 0 && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      const toAdd = eligibleOrdersForDraft.filter((o) =>
                        selectedOrderIdsForManifest.includes(o.id)
                      );
                      handleAddOrdersToDraft(toAdd);
                    }}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs"
                  >
                    Adicionar {selectedOrderIdsForManifest.length} Pedido(s) Selecionado(s)
                  </button>
                </div>
              )}
            </div>

            {/* SEÇÃO 3: PEDIDOS INCLUSOS NO ROMANEIO (SEQUÊNCIA DA ROTA) */}
            <div className="space-y-2.5 pt-2 border-t border-slate-100">
              <div className="flex justify-between items-center">
                <div>
                  <span className="font-extrabold text-xs text-slate-900 uppercase block">
                    3. Roteiro e Ordem das Paradas ({manifestOrdersDraft.length} pedidos no romaneio):
                  </span>
                  <p className="text-[11px] text-slate-500">
                    Use os botões de subir e descer para ordenar a sequência que o motorista fará a entrega.
                  </p>
                </div>

                <div className="text-right text-xs">
                  <span className="font-bold text-slate-600">Carga Total: </span>
                  <span className="font-black text-slate-900 font-mono text-sm">
                    {formatCurrency(manifestOrdersDraft.reduce((s, o) => s + o.totalValue, 0))}
                  </span>
                </div>
              </div>

              {manifestOrdersDraft.length === 0 ? (
                <div className="p-6 bg-amber-50 border border-amber-200 rounded-xl text-center text-xs text-amber-800">
                  Nenhum pedido adicionado ao romaneio ainda. Selecione os pedidos acima para montar a rota.
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {manifestOrdersDraft.map((ord, idx) => (
                    <div
                      key={ord.orderId}
                      className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                          {ord.sequence}º
                        </div>
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-slate-900 truncate block">
                              {ord.customerName}
                            </span>
                            <span className="font-mono text-blue-700 font-bold">[{ord.orderNumber}]</span>
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">
                            {ord.address.street}, {ord.address.number} - {ord.address.neighborhood}, {ord.address.city}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <div className="font-extrabold text-slate-900 font-mono">
                            {formatCurrency(ord.totalValue)}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {ord.paymentStatus === 'cobrar_na_entrega' ? 'Cobrar na entrega' : 'Pago antecipado'}
                          </div>
                        </div>

                        {/* Controles de Sequência */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveOrderSequence(idx, 'up')}
                            className="p-1 hover:bg-slate-100 disabled:opacity-30 rounded cursor-pointer"
                            title="Subir ordem da entrega"
                          >
                            <ArrowUp size={14} />
                          </button>
                          <button
                            type="button"
                            disabled={idx === manifestOrdersDraft.length - 1}
                            onClick={() => handleMoveOrderSequence(idx, 'down')}
                            className="p-1 hover:bg-slate-100 disabled:opacity-30 rounded cursor-pointer"
                            title="Descer ordem da entrega"
                          >
                            <ArrowDown size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveOrderFromDraft(ord.orderId)}
                            className="p-1 hover:bg-rose-50 text-rose-500 rounded cursor-pointer ml-1"
                            title="Remover deste romaneio"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* BOTÕES DE FINALIZAÇÃO */}
            <div className="flex justify-between items-center pt-3 border-t border-slate-100">
              <div className="text-xs text-slate-500">
                Total de volumes estimados:{' '}
                <strong>{manifestOrdersDraft.reduce((acc, o) => acc + (o.volumesCount || 1), 0)} caixas/volumes</strong>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewManifestModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={manifestOrdersDraft.length === 0}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  {editingManifest ? 'SALVAR ALTERAÇÕES' : 'CONFIRMAR E GERAR ROMANEIO'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: DETALHES DO ROMANEIO & BAIXA DAS ENTREGAS */}
      {/* ========================================================================= */}
      {viewingManifestDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full border border-slate-200 shadow-2xl p-5 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-base text-slate-900">
                    Ficha & Baixa de Entregas: {viewingManifestDetails.number}
                  </h3>
                  <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200">
                    {viewingManifestDetails.routeName}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Motorista: <strong>{viewingManifestDetails.driverName}</strong> • Placa: {viewingManifestDetails.vehiclePlate}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setViewingManifestDetails(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={18} />
              </button>
            </div>

            {/* LISTA DE PARADAS PARA BAIXA */}
            <div className="space-y-3">
              {viewingManifestDetails.orders.map((ord) => (
                <div
                  key={ord.orderId}
                  className={`p-4 rounded-xl border text-xs space-y-2.5 transition-all ${
                    ord.deliveryStatus === 'entregue'
                      ? 'bg-emerald-50/70 border-emerald-200'
                      : ord.deliveryStatus === 'nao_entregue'
                      ? 'bg-rose-50/70 border-rose-200'
                      : 'bg-white border-slate-200 shadow-xs'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-slate-900 text-white font-black text-xs flex items-center justify-center shrink-0">
                        {ord.sequence}º
                      </div>
                      <div>
                        <div className="font-extrabold text-sm text-slate-900">
                          {ord.customerName}{' '}
                          <span className="font-mono text-blue-700 text-xs font-bold">[{ord.orderNumber}]</span>
                        </div>
                        <div className="text-slate-600">
                          {ord.address.street}, {ord.address.number} - {ord.address.neighborhood}, {ord.address.city}/{ord.address.state}
                        </div>
                        {ord.customerPhone && (
                          <div className="text-slate-500 text-[11px] flex items-center gap-1 mt-0.5">
                            <Phone size={11} />
                            <span>{ord.customerPhone}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-extrabold text-slate-900 font-mono text-sm">
                        {formatCurrency(ord.totalValue)}
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                          ord.deliveryStatus === 'entregue'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : ord.deliveryStatus === 'nao_entregue'
                            ? 'bg-rose-100 text-rose-800 border-rose-300'
                            : 'bg-amber-100 text-amber-800 border-amber-300'
                        }`}
                      >
                        {ord.deliveryStatus === 'entregue'
                          ? 'Entregue com Sucesso'
                          : ord.deliveryStatus === 'nao_entregue'
                          ? `Ocorrência: ${ord.deliveryFailureReason || 'Não entregue'}`
                          : 'Aguardando Entrega'}
                      </span>
                    </div>
                  </div>

                  {/* ITENS DESTE PEDIDO */}
                  <div className="bg-white/80 p-2.5 rounded-lg border border-slate-200/80 text-[11px]">
                    <span className="font-bold text-slate-500 uppercase text-[9px] block mb-1">
                      Mercadorias a entregar:
                    </span>
                    <div className="space-y-1">
                      {ord.items.map((it) => (
                        <div key={it.productId} className="flex justify-between items-center text-slate-700">
                          <span>
                            {formatQuantity(it.quantity)} {it.unit} • {it.description}
                          </span>
                          <span className="font-mono font-semibold">{formatCurrency(it.totalPrice)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* BOTÕES DE BAIXA / CONFIRMAÇÃO */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 flex-wrap gap-2">
                    <div className="text-[11px] text-slate-500">
                      {ord.deliveredAt ? (
                        <span>Concluído em: {new Date(ord.deliveredAt).toLocaleTimeString()}</span>
                      ) : (
                        <span>Pendente de baixa</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateOrderStatus(viewingManifestDetails.id, ord.orderId, 'entregue')
                        }
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-xs flex items-center gap-1 cursor-pointer"
                      >
                        <CheckCircle2 size={13} />
                        <span>Confirmar Entrega</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const reason = prompt('Informe o motivo da não entrega:', 'Cliente Ausente');
                          if (reason !== null) {
                            handleUpdateOrderStatus(
                              viewingManifestDetails.id,
                              ord.orderId,
                              'nao_entregue',
                              reason || 'Cliente ausente'
                            );
                          }
                        }}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs rounded-lg flex items-center gap-1 cursor-pointer"
                      >
                        <AlertTriangle size={13} />
                        <span>Registrar Ocorrência</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end items-center gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPrintManifest(viewingManifestDetails)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
                title="Imprimir ficha de expedição deste manifesto"
              >
                <Printer size={15} />
                <span>Imprimir Ficha</span>
              </button>
              <button
                type="button"
                onClick={() => setViewingManifestDetails(null)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                Fechar Ficha
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: IMPRESSÃO DE ROMANEIO (MANIFESTO + FICHA DE CLIENTES COM CANHOTO) */}
      {/* ========================================================================= */}
      {printManifest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto printable-expedition-modal-root">
          {/* CSS para Impressão com Quebra de Página entre Roteiro e Conferência do Armazém */}
          <style>{`
            @media print {
              @page {
                size: A4 portrait;
                margin: 10mm 12mm 12mm 12mm;
              }
              html, body {
                height: auto !important;
                min-height: 100% !important;
                overflow: visible !important;
                background: white !important;
                margin: 0 !important;
                padding: 0 !important;
              }
              body * {
                visibility: hidden !important;
              }
              .printable-expedition-modal-root,
              .printable-expedition-modal-root * {
                visibility: visible !important;
              }
              .printable-expedition-modal-root {
                position: static !important;
                padding: 0 !important;
                margin: 0 !important;
                background: white !important;
                overflow: visible !important;
                display: block !important;
                height: auto !important;
                max-height: none !important;
              }
              .printable-expedition-modal-card {
                position: static !important;
                max-width: 100% !important;
                width: 100% !important;
                border: none !important;
                box-shadow: none !important;
                padding: 0 !important;
                margin: 0 !important;
                overflow: visible !important;
                max-height: none !important;
                display: block !important;
              }
              .printable-expedition-manifest {
                position: static !important;
                width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                background: white !important;
                display: block !important;
              }
              .print-hidden {
                display: none !important;
              }
              .manifest-page-1 {
                page-break-after: always !important;
                break-after: page !important;
                display: block !important;
              }
              .manifest-page-2 {
                page-break-before: always !important;
                break-before: page !important;
                clear: both !important;
                display: block !important;
                padding-top: 5mm !important;
              }
            }
          `}</style>

          <div className="bg-white rounded-2xl max-w-4xl w-full border border-slate-200 shadow-2xl p-6 sm:p-8 space-y-6 max-h-[94vh] overflow-y-auto printable-expedition-modal-card">
            {/* AÇÕES DE IMPRESSÃO */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 pb-4 border-b border-slate-200 print-hidden">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                  <Printer size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">
                    Ficha de Expedição & Manifesto de Carga
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    Página 1: Roteiro por Cliente • Página 2: Conferência Consolidada do Armazém
                  </span>
                </div>
              </div>

              {/* Seletor de Escopo de Impressão */}
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setPrintManifestScope('all')}
                  className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    printManifestScope === 'all'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Imprime o Roteiro e a Conferência do Armazém em páginas A4 separadas"
                >
                  📄 Ficha Completa (2 Págs)
                </button>
                <button
                  type="button"
                  onClick={() => setPrintManifestScope('roteiro')}
                  className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    printManifestScope === 'roteiro'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Imprime apenas a Página 1: Roteiro de Entregas por Cliente"
                >
                  📍 Somente Roteiro
                </button>
                <button
                  type="button"
                  onClick={() => setPrintManifestScope('conferencia')}
                  className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    printManifestScope === 'conferencia'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Imprime apenas a Página 2: Relação Consolidada para Carregamento (Armazém)"
                >
                  📦 Somente Armazém
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
                  title="Imprimir com quebra de página automática em folha A4"
                >
                  <Printer size={15} />
                  <span>
                    {printManifestScope === 'all'
                      ? 'Imprimir Ficha Completa'
                      : printManifestScope === 'roteiro'
                      ? 'Imprimir Roteiro'
                      : 'Imprimir Armazém'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setPrintManifest(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>

            {/* AVISO DE CONFIGURAÇÃO DE QUEBRA DE PÁGINA (NA TELA) */}
            {printManifestScope === 'all' && (
              <div className="print-hidden bg-blue-50/80 border border-blue-200 text-blue-900 p-3 rounded-xl text-xs flex items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-blue-600 shrink-0" />
                  <span>
                    <strong>Páginas Separadas:</strong> A <em>Relação Consolidada de Produtos para Carregamento (Conferência Armazém)</em> sairá automaticamente em uma página separada após o <em>Roteiro de Entregas por Cliente</em>.
                  </span>
                </div>
                <span className="hidden sm:inline-block text-[11px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md shrink-0">
                  Formato A4 • 2 Páginas
                </span>
              </div>
            )}

            {/* CONTEÚDO PRONTO PARA IMPRESSÃO */}
            <div className="printable-expedition-manifest space-y-6 text-slate-900 font-sans">
              {/* ========================================================================= */}
              {/* PÁGINA 1: CABEÇALHO, TRANSPORTE & ROTEIRO DE ENTREGAS POR CLIENTE         */}
              {/* ========================================================================= */}
              {printManifestScope !== 'conferencia' && (
                <div className={`space-y-5 ${printManifestScope === 'all' ? 'manifest-page-1' : ''}`}>
                  {/* CABEÇALHO DO MANIFESTO */}
                  <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-start">
                    <div>
                      <h2 className="text-lg font-black tracking-tight uppercase">
                        {currentCompany.tradeName || currentCompany.name}
                      </h2>
                      <p className="text-xs text-slate-600">
                        CNPJ: {currentCompany.cnpjCpf} • Telefone: {currentCompany.phone}
                      </p>
                      <p className="text-xs text-slate-600">
                        {currentCompany.address.street}, {currentCompany.address.number} - {currentCompany.address.city}/{currentCompany.address.state}
                      </p>
                    </div>

                    <div className="text-right">
                      <div className="text-lg font-mono font-black text-blue-700">
                        {printManifest.number}
                      </div>
                      <div className="text-xs font-bold uppercase text-slate-700">
                        MANIFESTO DE CARGA & ROTEIRO DE ENTREGAS
                      </div>
                      <div className="text-xs text-slate-500">
                        Data de Saída: {printManifest.departureDate}
                      </div>
                    </div>
                  </div>

                  {/* DADOS DA ROTA E TRANSPORTE */}
                  <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                    <div>
                      <span className="font-bold text-slate-500 uppercase block text-[10px]">Rota de Entrega:</span>
                      <span className="font-extrabold text-slate-900">{printManifest.routeName}</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-500 uppercase block text-[10px]">Motorista:</span>
                      <span className="font-extrabold text-slate-900">{printManifest.driverName}</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-500 uppercase block text-[10px]">Veículo / Placa:</span>
                      <span className="font-extrabold text-slate-900 font-mono">
                        {printManifest.vehiclePlate} ({printManifest.vehicleModel || 'Veículo Próprio'})
                      </span>
                    </div>
                  </div>

                  {/* 1. ROTEIRO DE ENTREGAS POR CLIENTE (COM CANHOTO DE ASSINATURA) */}
                  <div className="space-y-3 pt-1">
                    <div className="flex justify-between items-center border-b border-slate-300 pb-1">
                      <h4 className="font-extrabold text-xs uppercase text-slate-900">
                        1. Roteiro de Entregas por Cliente (Ordem da Rota):
                      </h4>
                      <span className="text-[10px] text-slate-500 font-semibold">
                        Total: {printManifest.orders.length} paradas
                      </span>
                    </div>

                    <div className="space-y-4">
                      {printManifest.orders.map((ord) => (
                        <div
                          key={ord.orderId}
                          className="border border-slate-300 p-3 rounded-lg space-y-2 text-xs break-inside-avoid"
                        >
                          <div className="flex justify-between items-start border-b border-slate-200 pb-1.5">
                            <div>
                              <div className="font-black text-sm text-slate-900">
                                {ord.sequence}ª PARADA: {ord.customerName}
                              </div>
                              <div className="text-slate-600">
                                {ord.address.street}, {ord.address.number} - {ord.address.neighborhood}, {ord.address.city}/{ord.address.state}
                              </div>
                              <div className="text-slate-500 text-[11px]">
                                Pedido: <strong>{ord.orderNumber}</strong> • Telefone: {ord.customerPhone || '—'} • Vendedor: {ord.sellerName || '—'}
                              </div>
                            </div>

                            <div className="text-right">
                              <div className="font-black text-sm font-mono text-slate-900">
                                {formatCurrency(ord.totalValue)}
                              </div>
                              <div className="text-[11px] font-bold text-slate-700">
                                {ord.paymentStatus === 'cobrar_na_entrega' ? (
                                  <span className="text-rose-700">COBRAR NA ENTREGA ({ord.paymentMethod.toUpperCase()})</span>
                                ) : (
                                  <span className="text-emerald-700">PAGO / FATURADO</span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* ITENS DESTE CLIENTE */}
                          <div className="text-[11px] text-slate-700">
                            <span className="font-bold">Itens do pedido: </span>
                            {ord.items.map((it, i) => (
                              <span key={it.productId}>
                                {formatQuantity(it.quantity)}x {it.description}
                                {i < ord.items.length - 1 ? '; ' : ''}
                              </span>
                            ))}
                          </div>

                          {/* CANHOTO DE RECEBIMENTO */}
                          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200 text-[10px] text-slate-600 items-end">
                            <div>
                              <span>Data / Hora Recebimento: ____/____/________ ____:____</span>
                            </div>
                            <div>
                              <span>Nome do Recebedor (Legível): __________________________</span>
                            </div>
                            <div className="text-right">
                              <span>Assinatura: ____________________________________</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* TOTAIS E ASSINATURA DO MOTORISTA */}
                  <div className="pt-4 border-t-2 border-slate-900 flex justify-between items-center text-xs break-inside-avoid">
                    <div>
                      <p>
                        Total de Entregas: <strong>{printManifest.totalOrders} clientes</strong>
                      </p>
                      <p>
                        Total da Carga: <strong>{formatCurrency(printManifest.totalValue)}</strong> • A Receber: <strong>{formatCurrency(printManifest.totalAmountToCollect)}</strong>
                      </p>
                    </div>

                    <div className="text-center">
                      <div className="w-56 border-b border-slate-900 mb-1" />
                      <span className="text-[10px] text-slate-600 font-bold">Assinatura do Motorista / Transportador</span>
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* DIVISOR VISUAL NA TELA + QUEBRA DE PÁGINA PARA IMPRESSÃO                  */}
              {/* ========================================================================= */}
              {printManifestScope === 'all' && (
                <div className="print-hidden py-4">
                  <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-2.5 rounded-xl text-xs font-bold flex flex-col sm:flex-row sm:items-center justify-between gap-1 shadow-2xs">
                    <span className="flex items-center gap-1.5">
                      <span className="text-amber-600 font-black">📄 [QUEBRA DE PÁGINA]</span>
                      <span>Fim do Roteiro de Entregas — A próxima seção será impressa em uma folha A4 separada</span>
                    </span>
                    <span className="text-[11px] text-amber-800 font-medium">
                      Página 2: Relação Consolidada de Carregamento & Conferência Armazém
                    </span>
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* PÁGINA 2: RELAÇÃO CONSOLIDADA PARA CARREGAMENTO (CONFERÊNCIA ARMAZÉM)      */}
              {/* ========================================================================= */}
              {printManifestScope !== 'roteiro' && (
                <div
                  className={`space-y-5 ${
                    printManifestScope === 'all'
                      ? 'manifest-page-2 pt-6 border-t-2 border-dashed border-slate-300 print:border-none print:pt-0'
                      : ''
                  }`}
                >
                  {/* CABEÇALHO DA PÁGINA DE CARREGAMENTO */}
                  <div className="border-b-2 border-slate-900 pb-3 flex justify-between items-start">
                    <div>
                      <h2 className="text-lg font-black tracking-tight uppercase">
                        {currentCompany.tradeName || currentCompany.name}
                      </h2>
                      <p className="text-xs text-slate-600">
                        CNPJ: {currentCompany.cnpjCpf} • Telefone: {currentCompany.phone}
                      </p>
                      <p className="text-xs text-slate-600">
                        {currentCompany.address.street}, {currentCompany.address.number} - {currentCompany.address.city}/{currentCompany.address.state}
                      </p>
                    </div>

                    <div className="text-right">
                      <div className="text-lg font-mono font-black text-blue-700">
                        {printManifest.number}
                      </div>
                      <div className="text-xs font-bold uppercase text-slate-700">
                        MAPA DE SEPARAÇÃO & CARREGAMENTO (ARMAZÉM)
                      </div>
                      <div className="text-xs text-slate-500">
                        Data da Carga: {printManifest.departureDate}
                      </div>
                    </div>
                  </div>

                  {/* DADOS DA ROTA E TRANSPORTE (PARA CONFERÊNCIA DO ALMOXARIFADO) */}
                  <div className="grid grid-cols-4 gap-2.5 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                    <div>
                      <span className="font-bold text-slate-500 uppercase block text-[10px]">Rota de Destino:</span>
                      <span className="font-extrabold text-slate-900">{printManifest.routeName}</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-500 uppercase block text-[10px]">Motorista Responsável:</span>
                      <span className="font-extrabold text-slate-900">{printManifest.driverName}</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-500 uppercase block text-[10px]">Veículo / Placa:</span>
                      <span className="font-extrabold text-slate-900 font-mono">
                        {printManifest.vehiclePlate} ({printManifest.vehicleModel || 'Veículo Próprio'})
                      </span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-500 uppercase block text-[10px]">Total de Paradas:</span>
                      <span className="font-extrabold text-blue-800 font-mono">
                        {printManifest.totalOrders} clientes
                      </span>
                    </div>
                  </div>

                  {/* RELAÇÃO CONSOLIDADA DE PRODUTOS PARA CARREGAMENTO */}
                  <div className="space-y-2">
                    <div className="border-b border-slate-300 pb-1 flex justify-between items-baseline">
                      <h4 className="font-extrabold text-xs uppercase text-slate-900">
                        2. Relação Consolidada de Produtos para Carregamento (Conferência Armazém):
                      </h4>
                      <span className="text-[10px] text-slate-500 font-semibold">
                        Separação e conferência física no estoque antes da saída do caminhão
                      </span>
                    </div>

                    {(() => {
                      const aggregatedItems = new Map<string, { code: string; desc: string; unit: string; qty: number }>();
                      printManifest.orders.forEach((o) => {
                        o.items.forEach((it) => {
                          const ex = aggregatedItems.get(it.productId);
                          if (ex) {
                            ex.qty += it.quantity;
                          } else {
                            aggregatedItems.set(it.productId, {
                              code: it.productCode,
                              desc: it.description,
                              unit: it.unit,
                              qty: it.quantity,
                            });
                          }
                        });
                      });

                      const itemsList = Array.from(aggregatedItems.values());
                      const totalItemsCount = itemsList.length;
                      const totalUnitsSum = itemsList.reduce((s, it) => s + it.qty, 0);

                      return (
                        <div className="space-y-3">
                          <table className="w-full text-left text-xs border border-slate-300">
                            <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] border-b border-slate-300">
                              <tr>
                                <th className="p-2 w-12 text-center">#</th>
                                <th className="p-2 w-20">Código</th>
                                <th className="p-2">Descrição da Mercadoria / Produto</th>
                                <th className="p-2 text-center w-16">Unid</th>
                                <th className="p-2 text-right w-28">Qtd a Carregar</th>
                                <th className="p-2 text-center w-24">Conferido [ ✓ ]</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                              {itemsList.map((p, idx) => (
                                <tr key={p.code} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                                  <td className="p-2 text-center font-mono text-slate-400 text-[10px]">{idx + 1}</td>
                                  <td className="p-2 font-mono font-bold text-slate-800">{p.code}</td>
                                  <td className="p-2 font-medium text-slate-900">{p.desc}</td>
                                  <td className="p-2 text-center text-slate-600 font-semibold">{p.unit}</td>
                                  <td className="p-2 text-right font-black font-mono text-slate-900 text-xs">
                                    {formatQuantity(p.qty)}
                                  </td>
                                  <td className="p-2 text-center">
                                    <span className="inline-block w-4 h-4 border border-slate-400 rounded-sm" />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="bg-slate-100 font-extrabold text-xs border-t-2 border-slate-300">
                                <td colSpan={3} className="p-2 uppercase text-slate-700">
                                  Total Consolidado da Carga ({totalItemsCount} produtos distintos):
                                </td>
                                <td className="p-2 text-center text-slate-500 text-[10px]">VOL</td>
                                <td className="p-2 text-right font-black font-mono text-blue-800 text-xs">
                                  {formatQuantity(totalUnitsSum)}
                                </td>
                                <td className="p-2 text-center font-bold text-[10px] text-slate-600">
                                  100% OK
                                </td>
                              </tr>
                            </tfoot>
                          </table>

                          {/* ASSINATURAS DO CARREGAMENTO E ALMOXARIFADO */}
                          <div className="grid grid-cols-2 gap-8 pt-8 text-center text-xs break-inside-avoid">
                            <div>
                              <div className="w-64 mx-auto border-b border-slate-900 mb-1" />
                              <span className="font-bold text-slate-900 block">Conferente / Almoxarife do Estoque</span>
                              <span className="text-[10px] text-slate-500">Declaro que a carga acima foi conferida e liberada do armazém</span>
                            </div>

                            <div>
                              <div className="w-64 mx-auto border-b border-slate-900 mb-1" />
                              <span className="font-bold text-slate-900 block">Motorista Responsável pelo Embarque</span>
                              <span className="text-[10px] text-slate-500">Conferi e recebi a totalidade das mercadorias relacionadas</span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: CADASTRO / EDIÇÃO DE ROTA DE ENTREGA */}
      {/* ========================================================================= */}
      {isRouteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <form
            onSubmit={handleSaveRoute}
            className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl p-6 space-y-3.5 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-extrabold text-base text-slate-800">
                {editingRoute ? 'Editar Rota de Entrega' : 'Nova Rota de Entrega'}
              </h3>
              <button
                type="button"
                onClick={() => setIsRouteModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Código da Rota *</label>
                <input
                  type="text"
                  required
                  value={routeFormCode}
                  onChange={(e) => setRouteFormCode(e.target.value.toUpperCase())}
                  placeholder="ROT-01"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nome da Rota *</label>
                <input
                  type="text"
                  required
                  value={routeFormName}
                  onChange={(e) => setRouteFormName(e.target.value)}
                  placeholder="Ex: Rota 01 - Zona Norte"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-bold"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">Descrição / Abrangência</label>
                <input
                  type="text"
                  value={routeFormDescription}
                  onChange={(e) => setRouteFormDescription(e.target.value)}
                  placeholder="Ex: Atendimento a comércios e supermercados da Zona Norte"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Cidades Atendidas (separar por vírgula)</label>
                <input
                  type="text"
                  value={routeFormCities}
                  onChange={(e) => setRouteFormCities(e.target.value)}
                  placeholder="Ex: São Paulo, Guarulhos"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Bairros Atendidos (separar por vírgula)</label>
                <input
                  type="text"
                  value={routeFormNeighborhoods}
                  onChange={(e) => setRouteFormNeighborhoods(e.target.value)}
                  placeholder="Ex: Santana, Tucuruvi, Vila Maria"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Praças Comerciais</label>
                <input
                  type="text"
                  value={routeFormMarketAreas}
                  onChange={(e) => setRouteFormMarketAreas(e.target.value)}
                  placeholder="Ex: Zona Norte, Centro"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Vendedores Atendidos</label>
                <input
                  type="text"
                  value={routeFormSellers}
                  onChange={(e) => setRouteFormSellers(e.target.value)}
                  placeholder="Ex: Carlos Silva, Bruno Lima"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Janela de Horário Recomendada</label>
                <input
                  type="text"
                  value={routeFormDeliveryWindow}
                  onChange={(e) => setRouteFormDeliveryWindow(e.target.value)}
                  placeholder="Ex: Manhã (08h às 12h)"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Tipo de Veículo Recomendado</label>
                <input
                  type="text"
                  value={routeFormVehicleType}
                  onChange={(e) => setRouteFormVehicleType(e.target.value)}
                  placeholder="Ex: Fiorino, Van, Caminhão 3/4"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsRouteModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-xs"
              >
                Salvar Rota
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
