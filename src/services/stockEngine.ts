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

export class StockEngine {
  /**
   * Obtém o saldo de um produto em um local específico
   */
  public static getBalance(
    balances: ProductStockBalance[],
    productId: string,
    locationId: string
  ): ProductStockBalance {
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
   * Obtém a soma total do saldo físico e disponível de um produto em todos os locais
   */
  public static getTotalProductStock(
    balances: ProductStockBalance[],
    productId: string
  ): { physical: number; reserved: number; available: number } {
    const productBalances = balances.filter((b) => b.productId === productId);
    const physical = productBalances.reduce((sum, b) => sum + (b.quantity || 0), 0);
    const reserved = productBalances.reduce((sum, b) => sum + (b.reserved || 0), 0);
    const available = Math.max(0, physical - reserved);
    return { physical, reserved, available };
  }

  /**
   * Registra uma movimentação e atualiza a matriz de saldos
   */
  public static applyMovement(
    currentBalances: ProductStockBalance[],
    movement: Omit<StockMovement, 'id'>,
    options?: { allowNegativeStock?: boolean }
  ): {
    updatedBalances: ProductStockBalance[];
    createdMovement: StockMovement;
  } {
    const movementId = 'MOV-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
    const createdMovement: StockMovement = {
      id: movementId,
      ...movement,
    };

    let updatedBalances = [...currentBalances];

    const updateItemBalance = (prodId: string, locId: string, deltaQty: number) => {
      const idx = updatedBalances.findIndex(
        (b) => b.productId === prodId && b.locationId === locId
      );
      if (idx >= 0) {
        const current = updatedBalances[idx];
        const newQty = (current.quantity || 0) + deltaQty;
        if (newQty < 0 && !options?.allowNegativeStock) {
          throw new Error(
            `Estoque insuficiente no local selecionado. Saldo atual: ${current.quantity}, solicitado: ${Math.abs(deltaQty)}`
          );
        }
        updatedBalances[idx] = {
          ...current,
          quantity: newQty,
        };
      } else {
        if (deltaQty < 0 && !options?.allowNegativeStock) {
          throw new Error(
            `Estoque insuficiente no local. Saldo atual: 0, solicitado: ${Math.abs(deltaQty)}`
          );
        }
        updatedBalances.push({
          productId: prodId,
          locationId: locId,
          quantity: Math.max(0, deltaQty),
          reserved: 0,
          minStock: 0,
        });
      }
    };

    switch (movement.type) {
      case 'inicial':
      case 'entrada_compra':
      case 'entrada_producao':
      case 'devolucao':
      case 'transferencia_entrada':
        updateItemBalance(movement.productId, movement.locationId, movement.quantity);
        break;

      case 'saida_venda':
      case 'consumo_producao':
      case 'perda_avaria':
      case 'transferencia_saida':
        updateItemBalance(movement.productId, movement.locationId, -movement.quantity);
        break;

      case 'ajuste_inventario':
        // No ajuste, a quantidade do movimento é a diferença
        updateItemBalance(movement.productId, movement.locationId, movement.quantity);
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

    // 2. Entrada no Destino
    const enterRes = this.applyMovement(exitRes.updatedBalances, {
      companyId,
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
