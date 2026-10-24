/**
 * Motor de Gestão de Estoque Multi-Local
 * Controla saldos, reservas, transferências e integridade transacional
 */

import {
  Product,
  StockLocation,
  ProductStockBalance,
  StockMovement,
  MovementType,
} from '../types';
import { Database } from './db';

export class StockEngine {
  /**
   * Obtém o saldo de um produto em um local específico
   * Se o produto for uma Embalagem Master, calcula o saldo correspondente a partir do produto unitário associado
   */
  public static getBalance(
    balances: ProductStockBalance[],
    productId: string,
    locationId: string,
    productsList?: Product[]
  ): ProductStockBalance {
    const products = productsList || Database?.getState?.()?.products || [];
    const prod = products.find((p) => p.id === productId);

    // Se for Embalagem Master vinculada a produto unitário
    if (prod?.isMasterPack && prod.masterPackAssociatedProductId && (prod.masterPackUnits || 1) > 0) {
      const multiplier = prod.masterPackUnits || 1;
      const assocBal = this.getBalance(balances, prod.masterPackAssociatedProductId, locationId, products);
      const directBal = balances.find((b) => b.productId === productId && b.locationId === locationId);
      const directQty = directBal?.quantity || 0;
      const directRes = directBal?.reserved || 0;

      const convertedQty = Math.floor(assocBal.quantity / multiplier);
      const convertedRes = Math.ceil(assocBal.reserved / multiplier);

      return {
        productId,
        locationId,
        quantity: convertedQty + directQty,
        reserved: convertedRes + directRes,
        minStock: prod.minStock || 0,
      };
    }

    const found = balances.find(
      (b) => b.productId === productId && b.locationId === locationId
    );
    if (found) return found;
    return {
      productId,
      locationId,
      quantity: 0,
      reserved: 0,
      minStock: 0,
    };
  }

  /**
   * Obtém a soma total do saldo físico e disponível de um produto em todos os locais (ou filtrado por empresa)
   * Se for Embalagem Master, reflete proporcionalmente a disponibilidade do produto associado
   */
  public static getTotalProductStock(
    balances: ProductStockBalance[],
    productId: string,
    productsList?: Product[],
    companyId?: string
  ): { physical: number; reserved: number; available: number } {
    const products = productsList || Database?.getState?.()?.products || [];
    const prod = products.find((p) => p.id === productId);

    // Se houver filtro de empresa, filtra apenas depósitos dessa empresa
    let effectiveBalances = balances;
    if (companyId) {
      const stateLocs = Database?.getState?.()?.stockLocations || [];
      const companyLocIds = new Set(stateLocs.filter((l) => l.companyId === companyId).map((l) => l.id));
      effectiveBalances = balances.filter(
        (b) => companyLocIds.has(b.locationId) || (b.companyId && b.companyId === companyId)
      );
    }

    // Se for Embalagem Master vinculada a produto unitário
    if (prod?.isMasterPack && prod.masterPackAssociatedProductId && (prod.masterPackUnits || 1) > 0) {
      const multiplier = prod.masterPackUnits || 1;
      const assocStock = this.getTotalProductStock(effectiveBalances, prod.masterPackAssociatedProductId, products, companyId);
      
      const directBalances = effectiveBalances.filter((b) => b.productId === productId);
      const directPhysical = directBalances.reduce((sum, b) => sum + (b.quantity || 0), 0);
      const directReserved = directBalances.reduce((sum, b) => sum + (b.reserved || 0), 0);

      const convertedPhysical = Math.floor(assocStock.physical / multiplier);
      const convertedReserved = Math.ceil(assocStock.reserved / multiplier);
      const convertedAvailable = Math.floor(assocStock.available / multiplier);

      return {
        physical: convertedPhysical + directPhysical,
        reserved: convertedReserved + directReserved,
        available: Math.max(0, convertedAvailable + Math.max(0, directPhysical - directReserved)),
      };
    }

    const productBalances = effectiveBalances.filter((b) => b.productId === productId);
    const physical = productBalances.reduce((sum, b) => sum + (b.quantity || 0), 0);
    const reserved = productBalances.reduce((sum, b) => sum + (b.reserved || 0), 0);
    const available = physical - reserved; // Mantém saldo negativo visível se o estoque estiver negativo
    return { physical, reserved, available };
  }

  /**
   * Registra uma movimentação e atualiza a matriz de saldos
   * Se o produto for Embalagem Master, a baixa/entrada é convertida e aplicada no produto unitário associado
   */
  public static applyMovement(
    currentBalances: ProductStockBalance[],
    movement: Omit<StockMovement, 'id'>,
    options?: { allowNegativeStock?: boolean; products?: Product[] }
  ): {
    updatedBalances: ProductStockBalance[];
    createdMovement: StockMovement;
  } {
    const products = options?.products || Database?.getState?.()?.products || [];
    const masterProduct = products.find((p) => p.id === movement.productId);
    const isMaster = !!(
      masterProduct?.isMasterPack &&
      masterProduct.masterPackAssociatedProductId &&
      (masterProduct.masterPackUnits || 1) > 0
    );

    const multiplier = isMaster ? (masterProduct!.masterPackUnits || 1) : 1;
    const targetProductId = isMaster ? masterProduct!.masterPackAssociatedProductId! : movement.productId;
    const associatedProduct = isMaster ? products.find((p) => p.id === targetProductId) : null;
    const effectiveQuantity = movement.quantity * multiplier;

    const movementId = 'MOV-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
    
    // Anotação clara sobre a Embalagem Master
    let movementNotes = movement.notes || '';
    if (isMaster) {
      const packLabel = masterProduct!.unit || 'CX';
      const unitLabel = associatedProduct?.unit || 'UN';
      const packName = masterProduct!.description;
      const assocName = associatedProduct?.description || masterProduct!.masterPackAssociatedProductDescription || '';
      movementNotes = `${movementNotes ? movementNotes + ' • ' : ''}[Embalagem Master: ${movement.quantity} ${packLabel} de "${packName}" (${multiplier} un/emb = Baixa de ${effectiveQuantity} ${unitLabel} de "${assocName}")]`;
    }

    const createdMovement: StockMovement = {
      id: movementId,
      ...movement,
      productId: isMaster ? targetProductId : movement.productId,
      productCode: isMaster ? (associatedProduct?.code || movement.productCode) : movement.productCode,
      productDescription: isMaster ? (associatedProduct?.description || movement.productDescription) : movement.productDescription,
      quantity: effectiveQuantity,
      unitCost: isMaster ? (associatedProduct?.costPrice || (movement.unitCost / multiplier)) : movement.unitCost,
      totalCost: isMaster ? ((associatedProduct?.costPrice || (movement.unitCost / multiplier)) * effectiveQuantity) : movement.totalCost,
      notes: movementNotes,
      isMasterPackMovement: isMaster,
      masterPackProductId: isMaster ? masterProduct!.id : undefined,
      masterPackProductCode: isMaster ? masterProduct!.code : undefined,
      masterPackUnitsMultiplier: isMaster ? multiplier : undefined,
    };

    let updatedBalances = [...currentBalances];

    // Política de permitir estoque negativo configurada no sistema ou passada nas opções
    const allowNegative =
      options?.allowNegativeStock !== undefined
        ? options.allowNegativeStock
        : Database.canSellNegativeStock();

    const updateItemBalance = (prodId: string, locId: string, deltaQty: number) => {
      const idx = updatedBalances.findIndex(
        (b) => b.productId === prodId && b.locationId === locId
      );
      if (idx >= 0) {
        const current = updatedBalances[idx];
        const newQty = (current.quantity || 0) + deltaQty;
        if (newQty < 0 && !allowNegative) {
          if (isMaster) {
            const availPacks = Math.floor(current.quantity / multiplier);
            throw new Error(
              `Estoque insuficiente para a Embalagem Master "${masterProduct?.description}". Saldo atual do produto unitário associado "${associatedProduct?.description}": ${current.quantity} ${associatedProduct?.unit || 'UN'} (equivale a ${availPacks} caixas/pacotes), solicitado: ${movement.quantity} (${effectiveQuantity} ${associatedProduct?.unit || 'UN'}).`
            );
          }
          throw new Error(
            `Estoque insuficiente no local selecionado. Saldo atual: ${current.quantity}, solicitado: ${Math.abs(deltaQty)}`
          );
        }
        updatedBalances[idx] = {
          ...current,
          quantity: newQty,
          companyId: current.companyId || movement.companyId,
        };
      } else {
        if (deltaQty < 0 && !allowNegative) {
          if (isMaster) {
            throw new Error(
              `Estoque insuficiente. O produto unitário associado "${associatedProduct?.description}" possui saldo 0 no local selecionado.`
            );
          }
          throw new Error(
            `Estoque insuficiente no local. Saldo atual: 0, solicitado: ${Math.abs(deltaQty)}`
          );
        }
        updatedBalances.push({
          productId: prodId,
          locationId: locId,
          quantity: deltaQty,
          reserved: 0,
          minStock: 0,
          companyId: movement.companyId,
        });
      }
    };

    switch (movement.type) {
      case 'inicial':
      case 'entrada_compra':
      case 'entrada_producao':
      case 'devolucao':
      case 'transferencia_entrada':
        updateItemBalance(targetProductId, movement.locationId, effectiveQuantity);
        break;

      case 'saida_venda':
      case 'consumo_producao':
      case 'perda_avaria':
      case 'transferencia_saida':
        updateItemBalance(targetProductId, movement.locationId, -effectiveQuantity);
        break;

      case 'ajuste_inventario':
        // No ajuste, a quantidade do movimento é a diferença
        updateItemBalance(targetProductId, movement.locationId, effectiveQuantity);
        break;
    }

    return { updatedBalances, createdMovement };
  }

  /**
   * Realiza transferência atômica entre dois locais de estoque
   */
  public static transferBetweenLocations(
    currentBalances: ProductStockBalance[],
    product: Product,
    originLocation: StockLocation,
    destLocation: StockLocation,
    quantity: number,
    userId: string,
    userName: string,
    companyId: string,
    notes?: string
  ): {
    updatedBalances: ProductStockBalance[];
    movements: StockMovement[];
  } {
    const originBal = this.getBalance(currentBalances, product.id, originLocation.id);
    if (originBal.quantity < quantity) {
      throw new Error(
        `Saldo insuficiente no local de origem "${originLocation.name}". Disponível: ${originBal.quantity}, Solicitado: ${quantity}`
      );
    }

    const docId = 'TRANSF-' + Date.now();
    const now = new Date().toISOString();

    // 1. Saída da Origem
    const exitRes = this.applyMovement(currentBalances, {
      companyId,
      productId: product.id,
      productCode: product.code,
      productDescription: product.description,
      locationId: originLocation.id,
      locationName: originLocation.name,
      toLocationId: destLocation.id,
      toLocationName: destLocation.name,
      type: 'transferencia_saida',
      quantity,
      unitCost: product.costPrice,
      totalCost: product.costPrice * quantity,
      originDocType: 'transferencia',
      originDocId: docId,
      date: now,
      userId,
      userName,
      notes: notes || `Transferência para ${destLocation.name}`,
    });

    // 2. Entrada no Destino (utiliza a empresa do local de destino se for transferência inter-empresas)
    const enterRes = this.applyMovement(exitRes.updatedBalances, {
      companyId: destLocation.companyId || companyId,
      productId: product.id,
      productCode: product.code,
      productDescription: product.description,
      locationId: destLocation.id,
      locationName: destLocation.name,
      toLocationId: originLocation.id,
      toLocationName: originLocation.name,
      type: 'transferencia_entrada',
      quantity,
      unitCost: product.costPrice,
      totalCost: product.costPrice * quantity,
      originDocType: 'transferencia',
      originDocId: docId,
      date: now,
      userId,
      userName,
      notes: notes || `Recebido por transferência de ${originLocation.name}`,
    });

    return {
      updatedBalances: enterRes.updatedBalances,
      movements: [exitRes.createdMovement, enterRes.createdMovement],
    };
  }
}
