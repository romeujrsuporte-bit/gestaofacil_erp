/**
 * Motor de Precificação Técnica e Formação de Preço de Venda
 * Implementa a metodologia baseada em margem sobre o preço de venda:
 * PV = Custo Total / (1 - (Impostos + Despesas + Comissão + Outros + Margem de Lucro))
 */

import { UnitOfMeasure } from '../types';

export interface PricingInput {
  costPrice: number;
  taxPercent: number;
  operatingExpensesPercent: number;
  salesCommissionPercent: number;
  otherCostsPercent: number;
  profitMarginPercent: number;
  enableAdditionalCosts?: boolean;
  indirectCostPerUnit?: number;
  directLaborCostPerUnit?: number;
}

export interface PricingResult {
  baseCostPrice: number;
  indirectCostPerUnit: number;
  directLaborCostPerUnit: number;
  enableAdditionalCosts: boolean;
  effectiveCostPrice: number;
  costPrice: number;
  taxPercent: number;
  operatingExpensesPercent: number;
  salesCommissionPercent: number;
  otherCostsPercent: number;
  profitMarginPercent: number;
  totalPercentageDeductions: number;
  suggestedSalePrice: number;
  grossProfitValue: number;
  netMarginPercent: number;
  markupMultiplier: number;
  markupPercent: number;
  isValid: boolean;
  errorMessage?: string;
  breakdown: {
    label: string;
    percent: number;
    value: number;
  }[];
}

export function calculateSuggestedPrice(input: PricingInput): PricingResult {
  const {
    costPrice: baseCostPrice,
    taxPercent = 0,
    operatingExpensesPercent = 0,
    salesCommissionPercent = 0,
    otherCostsPercent = 0,
    profitMarginPercent = 0,
    enableAdditionalCosts = false,
    indirectCostPerUnit = 0,
    directLaborCostPerUnit = 0,
  } = input;

  const additionalCostsTotal = enableAdditionalCosts
    ? (Number(indirectCostPerUnit) || 0) + (Number(directLaborCostPerUnit) || 0)
    : 0;

  const effectiveCostPrice = Number((baseCostPrice + additionalCostsTotal).toFixed(4));
  const costPrice = effectiveCostPrice;

  const totalPercentageDeductions =
    taxPercent + operatingExpensesPercent + salesCommissionPercent + otherCostsPercent + profitMarginPercent;

  if (baseCostPrice < 0 || indirectCostPerUnit < 0 || directLaborCostPerUnit < 0) {
    return {
      baseCostPrice,
      indirectCostPerUnit,
      directLaborCostPerUnit,
      enableAdditionalCosts,
      effectiveCostPrice,
      costPrice,
      taxPercent,
      operatingExpensesPercent,
      salesCommissionPercent,
      otherCostsPercent,
      profitMarginPercent,
      totalPercentageDeductions,
      suggestedSalePrice: 0,
      grossProfitValue: 0,
      netMarginPercent: 0,
      markupMultiplier: 0,
      markupPercent: 0,
      isValid: false,
      errorMessage: 'Os valores de custo unitário não podem ser negativos.',
      breakdown: [],
    };
  }

  if (totalPercentageDeductions >= 100) {
    return {
      baseCostPrice,
      indirectCostPerUnit,
      directLaborCostPerUnit,
      enableAdditionalCosts,
      effectiveCostPrice,
      costPrice,
      taxPercent,
      operatingExpensesPercent,
      salesCommissionPercent,
      otherCostsPercent,
      profitMarginPercent,
      totalPercentageDeductions,
      suggestedSalePrice: 0,
      grossProfitValue: 0,
      netMarginPercent: 0,
      markupMultiplier: 0,
      markupPercent: 0,
      isValid: false,
      errorMessage: `A soma dos percentuais (${totalPercentageDeductions.toFixed(2)}%) atinge ou ultrapassa 100%, impossibilitando a formação de preço saudável. Ajuste as margens.`,
      breakdown: [],
    };
  }

  const denominator = 1 - totalPercentageDeductions / 100;
  const suggestedSalePrice = denominator > 0 ? costPrice / denominator : 0;
  const grossProfitValue = suggestedSalePrice - costPrice;
  const markupMultiplier = costPrice > 0 ? suggestedSalePrice / costPrice : 0;
  const markupPercent = costPrice > 0 ? ((suggestedSalePrice - costPrice) / costPrice) * 100 : 0;

  const breakdown = [
    ...(enableAdditionalCosts
      ? [
          {
            label: 'Custo de Referência (Base)',
            percent: suggestedSalePrice > 0 ? (baseCostPrice / suggestedSalePrice) * 100 : 0,
            value: baseCostPrice,
          },
          {
            label: 'Custo Indireto (R$/un)',
            percent: suggestedSalePrice > 0 ? (indirectCostPerUnit / suggestedSalePrice) * 100 : 0,
            value: indirectCostPerUnit,
          },
          {
            label: 'Mão de Obra Direta (R$/un)',
            percent: suggestedSalePrice > 0 ? (directLaborCostPerUnit / suggestedSalePrice) * 100 : 0,
            value: directLaborCostPerUnit,
          },
        ]
      : [
          {
            label: 'Custo do Produto (Base)',
            percent: suggestedSalePrice > 0 ? (costPrice / suggestedSalePrice) * 100 : 0,
            value: costPrice,
          },
        ]),
    {
      label: 'Impostos s/ Venda',
      percent: taxPercent,
      value: (suggestedSalePrice * taxPercent) / 100,
    },
    {
      label: 'Despesas Operacionais',
      percent: operatingExpensesPercent,
      value: (suggestedSalePrice * operatingExpensesPercent) / 100,
    },
    {
      label: 'Comissão de Vendas',
      percent: salesCommissionPercent,
      value: (suggestedSalePrice * salesCommissionPercent) / 100,
    },
    {
      label: 'Outros Custos / Despesas',
      percent: otherCostsPercent,
      value: (suggestedSalePrice * otherCostsPercent) / 100,
    },
    {
      label: 'Lucro Líquido Desejado',
      percent: profitMarginPercent,
      value: (suggestedSalePrice * profitMarginPercent) / 100,
    },
  ];

  return {
    baseCostPrice,
    indirectCostPerUnit,
    directLaborCostPerUnit,
    enableAdditionalCosts,
    effectiveCostPrice,
    costPrice,
    taxPercent,
    operatingExpensesPercent,
    salesCommissionPercent,
    otherCostsPercent,
    profitMarginPercent,
    totalPercentageDeductions,
    suggestedSalePrice: Number(suggestedSalePrice.toFixed(2)),
    grossProfitValue: Number(grossProfitValue.toFixed(2)),
    netMarginPercent: profitMarginPercent,
    markupMultiplier: Number(markupMultiplier.toFixed(3)),
    markupPercent: Number(markupPercent.toFixed(2)),
    isValid: true,
    breakdown,
  };
}

/**
 * Conversão de Unidades de Medida
 * Converte quantidade de unidade de compra/origem para unidade de venda/consumo
 */
export function convertUnitQuantity(
  quantity: number,
  fromUnit: UnitOfMeasure,
  toUnit: UnitOfMeasure,
  packageFactor: number = 1
): number {
  if (fromUnit === toUnit) {
    return quantity * (packageFactor > 0 ? packageFactor : 1);
  }

  // Litro para Mililitro
  if (fromUnit === 'L' && toUnit === 'ML') return quantity * 1000;
  if (fromUnit === 'ML' && toUnit === 'L') return quantity / 1000;

  // Quilograma para Grama
  if (fromUnit === 'KG' && toUnit === 'G') return quantity * 1000;
  if (fromUnit === 'G' && toUnit === 'KG') return quantity / 1000;

  // Caixa ou Pacote para Unidade
  if ((fromUnit === 'CX' || fromUnit === 'PCT') && toUnit === 'UN') {
    return quantity * (packageFactor > 0 ? packageFactor : 1);
  }

  // Metro para Centímetro ou compatíveis
  return quantity * (packageFactor > 0 ? packageFactor : 1);
}

/**
 * Formatação padrão de moeda brasileira (R$)
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);
}

/**
 * Formatação de quantidade numérica
 */
export function formatQuantity(value: number, decimals: number = 2): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(value || 0);
}
