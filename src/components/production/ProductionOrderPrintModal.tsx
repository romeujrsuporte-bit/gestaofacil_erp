import React, { useState } from 'react';
import {
  Printer,
  X,
  FileText,
  Boxes,
  Calendar,
  CheckCircle2,
  Clock,
  Layers,
  Sparkles,
  ClipboardCheck,
  Building2,
  MapPin,
  Warehouse,
  AlertTriangle,
  User as UserIcon,
  Check
} from 'lucide-react';
import { ProductionOrder, Company } from '../../types';
import { formatCurrency, formatQuantity } from '../../services/pricingEngine';
import { Database } from '../../services/db';
import { GestaoFacilLogo } from '../common/AppLogo';

interface ProductionOrderPrintModalProps {
  order: ProductionOrder;
  company: Company;
  isOpen: boolean;
  onClose: () => void;
  initialFormat?: 'a4' | 'thermal';
}

export const ProductionOrderPrintModal: React.FC<ProductionOrderPrintModalProps> = ({
  order,
  company,
  isOpen,
  onClose,
  initialFormat,
}) => {
  const printerConfig = Database.getPrinterConfig();
  const [printFormat, setPrintFormat] = useState<'a4' | 'thermal'>(() => {
    if (initialFormat) return initialFormat;
    return printerConfig.defaultProductionOrderFormat || 'a4';
  });

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const destinationLocation = Database.getState().stockLocations?.find(
    (l) => l.id === order.destinationLocationId
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      {/* CSS para Impressão Perfeita de Ordem de Produção */}
      <style>{`
        @media print {
          @page {
            size: ${printFormat === 'a4' ? 'A4 portrait' : 'auto'};
            margin: ${printFormat === 'a4' ? '10mm 12mm 12mm 12mm' : '0mm'};
          }
          body * {
            visibility: hidden !important;
          }
          .printable-op-container, .printable-op-container * {
            visibility: visible !important;
          }
          .printable-op-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div
        className={`bg-white rounded-2xl shadow-2xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh] ${
          printFormat === 'a4' ? 'max-w-4xl' : 'max-w-md'
        }`}
      >
        {/* TOPO DO MODAL COM SELETOR DE FORMATO */}
        <div className="bg-slate-900 text-white px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 shrink-0 no-print">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center text-white shadow-xs">
              <Boxes size={16} />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base leading-tight">
                Ordem de Produção & Ficha Técnica (PCP)
              </h3>
              <span className="text-[11px] text-slate-400 font-mono">
                {order.number} • {order.productDescription}
              </span>
            </div>
          </div>

          {/* Seletor de Formato */}
          <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs font-bold">
            <button
              type="button"
              onClick={() => setPrintFormat('a4')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                printFormat === 'a4'
                  ? 'bg-teal-600 text-white shadow-sm font-extrabold'
                  : 'text-slate-300 hover:text-white'
              }`}
              title="Ficha completa de fabricação e BOM em Folha A4 para chão de fábrica"
            >
              <FileText size={14} />
              <span>Folha A4 Oficial</span>
            </button>
            <button
              type="button"
              onClick={() => setPrintFormat('thermal')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                printFormat === 'thermal'
                  ? 'bg-teal-600 text-white shadow-sm font-extrabold'
                  : 'text-slate-300 hover:text-white'
              }`}
              title="Etiqueta/cupom resumido para identificação de lote e pallet"
            >
              <Printer size={14} />
              <span>Cupom Térmico (80mm)</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* ÁREA DE VISUALIZAÇÃO E IMPRESSÃO */}
        <div className="flex-1 p-3 sm:p-6 bg-slate-100/80 overflow-y-auto flex justify-center">
          {printFormat === 'a4' ? (
            /* ========================================================= */
            /* FICHA DE PRODUÇÃO EM FOLHA A4 (PCP & CHÃO DE FÁBRICA)     */
            /* ========================================================= */
            <div
              id="printable-a4-op"
              className="printable-op-container w-full max-w-[794px] bg-white p-6 sm:p-8 rounded-xl shadow-md border border-slate-200 text-slate-800 text-xs leading-normal select-text space-y-4"
            >
              {/* 1. CABEÇALHO TIMBRADO DA INDÚSTRIA */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-200">
                <div className="flex items-start gap-3">
                  <GestaoFacilLogo size={42} showSlogan={false} />
                  <div>
                    <h1 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-tight">
                      {company.tradeName || company.name}
                    </h1>
                    <p className="text-[11px] text-slate-600 font-medium">{company.name}</p>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      CNPJ: <strong className="font-mono text-slate-700">{company.cnpjCpf}</strong> • Unidade Fabril / Matriz
                    </div>
                  </div>
                </div>

                <div className="text-right sm:border-l sm:border-slate-200 sm:pl-4 space-y-0.5 shrink-0">
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-100 text-teal-900 border border-teal-300">
                    Ordem de Produção (PCP)
                  </span>
                  <div className="text-lg font-black font-mono text-slate-900">
                    {order.number}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Emissão: <strong className="text-slate-700 font-mono">{new Date(order.orderDate).toLocaleString('pt-BR')}</strong>
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Previsão: <strong className="text-slate-700 font-mono">{order.completionDate ? new Date(order.completionDate).toLocaleDateString('pt-BR') : 'Imediato'}</strong>
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Status: <strong className="uppercase text-teal-700 font-bold">{order.status}</strong>
                  </div>
                </div>
              </div>

              {/* 2. DADOS DO PRODUTO ACABADO A PRODUZIR */}
              <div className="bg-teal-50/50 border border-teal-200 rounded-xl p-3.5 space-y-2">
                <div className="text-[11px] font-black uppercase text-teal-950 tracking-wider flex items-center justify-between pb-1 border-b border-teal-200">
                  <span className="flex items-center gap-1.5">
                    <Boxes size={14} className="text-teal-700" />
                    <span>Produto Acabado a Fabricar</span>
                  </span>
                  <span className="font-mono text-[10px] bg-white px-2 py-0.5 rounded border border-teal-200 text-teal-800">
                    Cód: {order.productCode}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-[11px]">
                  <div className="sm:col-span-6">
                    <span className="text-slate-500 block text-[10px]">Descrição do Produto:</span>
                    <strong className="text-slate-900 text-sm block">{order.productDescription}</strong>
                  </div>
                  <div className="sm:col-span-3">
                    <span className="text-slate-500 block text-[10px]">Quantidade Planejada:</span>
                    <strong className="text-base text-teal-900 font-black font-mono block">
                      {formatQuantity(order.plannedQuantity)} UN
                    </strong>
                  </div>
                  <div className="sm:col-span-3">
                    <span className="text-slate-500 block text-[10px]">Depósito de Destino:</span>
                    <strong className="text-slate-800 block">
                      {destinationLocation?.name || 'Estoque Comercial'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* 3. LISTA DE MATÉRIAS-PRIMAS E COMPONENTES (BOM) */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <Layers size={14} className="text-teal-700" />
                    <span>Lista de Matérias-Primas, Embalagens e Componentes Requisitados</span>
                  </h4>
                  <span className="text-[10px] text-slate-500">
                    Total de Insumos: <strong>{order.componentsConsumed?.length || 0}</strong>
                  </span>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead>
                      <tr className="bg-slate-900 text-white font-extrabold text-[10px] uppercase tracking-wider">
                        <th className="py-2 px-2.5 text-center w-10">#</th>
                        <th className="py-2 px-2.5 w-24">Código</th>
                        <th className="py-2 px-2.5">Matéria-Prima / Insumo</th>
                        <th className="py-2 px-2 text-center w-12">UN</th>
                        <th className="py-2 px-2.5 text-right w-24">Consumo Unit.</th>
                        <th className="py-2 px-2.5 text-right w-24">Qtd Requisitada</th>
                        <th className="py-2 px-2.5 text-right w-24">Custo Unit.</th>
                        <th className="py-2 px-3 text-right w-24">Custo Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {order.componentsConsumed?.map((comp, idx) => {
                        const unitConsumption = comp.plannedQty / (order.plannedQuantity || 1);
                        return (
                          <tr key={comp.componentId || idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                            <td className="py-1.5 px-2.5 text-center text-slate-400 font-mono text-[10px]">{idx + 1}</td>
                            <td className="py-1.5 px-2.5 font-mono font-bold text-slate-600 text-[10px]">{comp.componentCode}</td>
                            <td className="py-1.5 px-2.5 font-medium text-slate-800">{comp.description}</td>
                            <td className="py-1.5 px-2 text-center text-slate-500 font-semibold">{comp.unit}</td>
                            <td className="py-1.5 px-2.5 text-right font-mono text-slate-600">
                              {unitConsumption < 1 ? unitConsumption.toFixed(3) : unitConsumption.toFixed(2)}
                            </td>
                            <td className="py-1.5 px-2.5 text-right font-bold text-slate-900 font-mono">
                              {formatQuantity(comp.plannedQty)}
                            </td>
                            <td className="py-1.5 px-2.5 text-right font-mono text-slate-600">
                              {formatCurrency(comp.unitCost)}
                            </td>
                            <td className="py-1.5 px-3 text-right font-bold font-mono text-slate-900">
                              {formatCurrency(comp.totalCost)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 4. QUADRO DE CUSTOS ESTIMADOS */}
              <div className="bg-slate-900 text-white rounded-xl p-3 flex flex-wrap items-center justify-between gap-4">
                <div className="text-xs text-slate-300">
                  Responsável Técnico / Gestor: <strong className="text-white">{order.userName || 'Engenharia de Produção'}</strong>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block uppercase">Custo Unitário Estimado:</span>
                    <span className="font-mono text-sm font-bold text-amber-400">{formatCurrency(order.unitCost)}</span>
                  </div>
                  <div className="text-right border-l border-slate-700 pl-6">
                    <span className="text-[10px] text-slate-400 block uppercase">Custo Total de Fabricação:</span>
                    <span className="font-mono text-base font-black text-emerald-400">{formatCurrency(order.totalCost)}</span>
                  </div>
                </div>
              </div>

              {/* 5. INSTRUÇÕES OPERACIONAIS */}
              {order.notes && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-950 space-y-0.5">
                  <span className="font-bold flex items-center gap-1 text-amber-900">
                    <AlertTriangle size={13} className="text-amber-600" />
                    <span>Instruções e Observações Técnicas do Lote:</span>
                  </span>
                  <p className="italic">{order.notes}</p>
                </div>
              )}

              {/* 6. APONTAMENTO DE CHÃO DE FÁBRICA & CONTROLE DE QUALIDADE (PREENCHIMENTO MANUAL) */}
              <div className="border border-slate-300 rounded-xl p-3.5 space-y-3 bg-slate-50/50">
                <div className="text-[11px] font-black uppercase text-slate-800 tracking-wider flex items-center justify-between pb-1 border-b border-slate-200">
                  <span className="flex items-center gap-1.5">
                    <ClipboardCheck size={14} className="text-teal-700" />
                    <span>Apontamento de Chão de Fábrica & Liberação da Qualidade (Preenchimento Manual)</span>
                  </span>
                  <span className="text-[10px] text-slate-400">Via de Produção</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[10px]">
                  <div className="border-b border-slate-400 pb-1">
                    <span className="text-slate-500 block">Início Real da Produção:</span>
                    <span className="font-mono text-slate-700">___/___/______ __:__</span>
                  </div>
                  <div className="border-b border-slate-400 pb-1">
                    <span className="text-slate-500 block">Término Real da Produção:</span>
                    <span className="font-mono text-slate-700">___/___/______ __:__</span>
                  </div>
                  <div className="border-b border-slate-400 pb-1">
                    <span className="text-slate-500 block">Qtd Efetivamente Produzida:</span>
                    <span className="font-mono text-slate-700">______________ UN</span>
                  </div>
                  <div className="border-b border-slate-400 pb-1">
                    <span className="text-slate-500 block">Perdas / Refugos:</span>
                    <span className="font-mono text-slate-700">______________ UN</span>
                  </div>
                </div>

                {/* Checklist da Qualidade */}
                <div className="pt-1 text-[10px] space-y-1">
                  <span className="font-bold text-slate-700 block">Checklist de Liberação de Lote:</span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-600">
                    <label className="flex items-center gap-1.5">
                      <span className="w-3.5 h-3.5 border border-slate-400 rounded-xs inline-block" />
                      <span>Inspeção Visual e Cor</span>
                    </label>
                    <label className="flex items-center gap-1.5">
                      <span className="w-3.5 h-3.5 border border-slate-400 rounded-xs inline-block" />
                      <span>Volume / Peso Padrão</span>
                    </label>
                    <label className="flex items-center gap-1.5">
                      <span className="w-3.5 h-3.5 border border-slate-400 rounded-xs inline-block" />
                      <span>Rótulo e Lote Impresso</span>
                    </label>
                    <label className="flex items-center gap-1.5">
                      <span className="w-3.5 h-3.5 border border-slate-400 rounded-xs inline-block" />
                      <span>Lacre e Tampa Vedada</span>
                    </label>
                  </div>
                </div>

                {/* Assinaturas */}
                {printerConfig.a4ShowSignatures !== false && (
                  <div className="grid grid-cols-2 gap-8 pt-6 pb-1 text-center text-[10px]">
                    <div className="border-t border-slate-400 pt-1">
                      <span className="text-slate-400 block text-[9px]">Operador Responsável pela Fabricação:</span>
                      <span className="font-bold text-slate-800">Assinatura / Matrícula</span>
                    </div>
                    <div className="border-t border-slate-400 pt-1">
                      <span className="text-slate-400 block text-[9px]">Supervisor / Inspetor de Qualidade:</span>
                      <span className="font-bold text-slate-800">Visto de Liberação de Estoque</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* ========================================================= */
            /* CUPOM TÉRMICO COMPACTO (80MM)                             */
            /* ========================================================= */
            <div
              id="printable-thermal-op"
              style={{
                width: '100%',
                maxWidth: '330px',
                boxSizing: 'border-box',
              }}
              className="printable-op-container w-full bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-slate-800 font-mono text-xs leading-relaxed"
            >
              <div className="text-center pb-2 border-b border-dashed border-slate-300">
                <div className="font-bold text-sm">{company.tradeName || company.name}</div>
                <div className="text-[10px] text-slate-500">PCP • ORDEM DE PRODUÇÃO</div>
                <div className="text-sm font-black mt-1">{order.number}</div>
                <div className="text-[10px] text-slate-500">{new Date(order.orderDate).toLocaleString('pt-BR')}</div>
              </div>

              <div className="py-2 border-b border-dashed border-slate-300 space-y-1 text-[11px]">
                <div className="font-bold text-slate-900">{order.productDescription}</div>
                <div className="flex justify-between">
                  <span>Código:</span>
                  <span>{order.productCode}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Qtd Planejada:</span>
                  <span>{formatQuantity(order.plannedQuantity)} UN</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Status:</span>
                  <span className="uppercase">{order.status}</span>
                </div>
              </div>

              <div className="py-2 border-b border-dashed border-slate-300 space-y-1 text-[11px]">
                <div className="font-bold text-[10px] text-slate-500 uppercase">MATÉRIAS-PRIMAS:</div>
                {order.componentsConsumed?.map((c, i) => (
                  <div key={i} className="flex justify-between text-[10px]">
                    <span className="truncate pr-2">{c.description}</span>
                    <span className="font-bold shrink-0">{formatQuantity(c.plannedQty)} {c.unit}</span>
                  </div>
                ))}
              </div>

              <div className="py-2 border-b border-dashed border-slate-300 space-y-0.5 text-[11px]">
                <div className="flex justify-between font-bold">
                  <span>Custo Total:</span>
                  <span>{formatCurrency(order.totalCost)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Custo Unitário:</span>
                  <span>{formatCurrency(order.unitCost)}</span>
                </div>
              </div>

              <div className="pt-2 text-center text-[9px] text-slate-400">
                GestãoFácil ERP • Módulo PCP & Indústria
              </div>
            </div>
          )}
        </div>

        {/* BARRA INFERIOR DE AÇÕES */}
        <div className="p-4 bg-white border-t border-slate-200 flex justify-end items-center gap-3 no-print shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            Fechar
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-xs shadow-md shadow-teal-500/20 transition-all cursor-pointer"
          >
            <Printer size={16} />
            <span>Imprimir {printFormat === 'a4' ? 'Folha A4 (Ficha PCP)' : 'Cupom Térmico'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
