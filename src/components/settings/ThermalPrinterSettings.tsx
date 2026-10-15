import React, { useState } from 'react';
import {
  Printer,
  Sliders,
  CheckCircle2,
  RotateCcw,
  AlignLeft,
  AlignCenter,
  Maximize2,
  FileText,
  Sparkles,
  Info,
  Check,
  Building2,
  MapPin,
  Phone,
  Scissors,
  Eye,
  Settings2,
  Boxes,
  Truck,
  Smartphone,
  CreditCard,
  DollarSign,
  Users,
  ShieldCheck,
  Calendar,
  FileCheck,
  Award,
  Wallet
} from 'lucide-react';
import { Database, DEFAULT_PRINTER_CONFIG } from '../../services/db';
import {
  ThermalPrinterConfig,
  ThermalPaperWidth,
  HeaderFormatType,
  PrintDocumentFormat,
  A4HeaderStyle,
  A4MarginType
} from '../../types';
import { formatCurrency } from '../../services/pricingEngine';
import { GestaoFacilLogo } from '../common/AppLogo';
import { A4ReportsPreviewModal, A4ReportType } from '../reports/A4ReportsPreviewModal';
import { toast } from '../../services/toast';

export const ThermalPrinterSettings: React.FC = () => {
  const currentCompany = Database.getCurrentCompany();
  const todayStr = new Date().toLocaleDateString('pt-BR');
  const [config, setConfig] = useState<ThermalPrinterConfig>(() => Database.getPrinterConfig());
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'padroes' | 'folha_a4' | 'termica' | 'relatorios_a4' | 'preview'>('padroes');

  // Modal para visualização de relatórios A4
  const [previewA4Report, setPreviewA4Report] = useState<A4ReportType | null>(null);

  // Modo de visualização do simulador ao vivo (A4 vs Térmico)
  const [simulatorMode, setSimulatorMode] = useState<'termica' | 'a4'>('termica');

  const handleUpdate = <K extends keyof ThermalPrinterConfig>(key: K, value: ThermalPrinterConfig[K]) => {
    setConfig((prev) => {
      const next = { ...prev, [key]: value };
      return next;
    });
    setSavedSuccess(false);
  };

  const handleSave = () => {
    Database.updatePrinterConfig(config);
    Database.addAuditLog(
      'CONFIG_IMPRESSAO_ATUALIZADA',
      'CONFIGURACOES',
      'IMPRESSORA',
      `Configurações de impressão salvas: Padrão Pedidos: ${config.defaultSalesOrderFormat || 'a4'}, Mobile: ${config.defaultExternalSalesFormat || 'a4'}, OP: ${config.defaultProductionOrderFormat || 'a4'}, Bobina: ${config.paperWidth}`
    );
    setSavedSuccess(true);
    toast.success('Configurações de impressão atualizadas com sucesso!', 'Salvo');
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleResetDefaults = () => {
    setConfig({ ...DEFAULT_PRINTER_CONFIG });
    Database.updatePrinterConfig(DEFAULT_PRINTER_CONFIG);
    setSavedSuccess(true);
    toast.info('Parâmetros padrão de impressão restaurados (80mm e Folha A4).', 'Padrão Restaurado');
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handlePrintThermalTest = () => {
    Database.updatePrinterConfig(config);
    setSimulatorMode('termica');
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handlePrintA4Test = () => {
    Database.updatePrinterConfig(config);
    setPreviewA4Report('pedido_modelo');
  };

  // Presets de Margens Laterais Térmica
  const applyMarginPreset = (left: number, right: number) => {
    setConfig((prev) => ({
      ...prev,
      marginLeft: left,
      marginRight: right,
    }));
    setSavedSuccess(false);
  };

  // Calcular dimensões visuais no simulador
  const previewWidthPx = config.paperWidth === '58mm' ? 245 : 325;
  const previewMarginLeftPx = Math.round(config.marginLeft * 3.8);
  const previewMarginRightPx = Math.round(config.marginRight * 3.8);

  return (
    <div className="space-y-6">
      {/* 1. BARRA DE TÍTULO E AÇÕES PRINCIPAIS */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
            <Printer size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
                Configuração de Impressão (80mm & Folha A4)
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-blue-50 text-blue-700 border border-blue-200">
                Padrão Híbrido ERP
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Defina os padrões de impressão em Folha A4 e impressoras térmicas (80mm/58mm) para Pedidos de Venda, Vendas Mobile, Ordens de Produção e Relatórios do Sistema.
            </p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
            title="Restaurar parâmetros padrão de fábrica"
          >
            <RotateCcw size={14} />
            <span>Restaurar Padrão</span>
          </button>

          <button
            type="button"
            onClick={handlePrintA4Test}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl border border-blue-200 transition-colors cursor-pointer"
            title="Abrir pré-visualização de relatório executivo em folha A4"
          >
            <FileText size={14} />
            <span>Testar Folha A4</span>
          </button>

          <button
            type="button"
            onClick={handlePrintThermalTest}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
            title="Imprimir cupom de teste na bobina térmica"
          >
            <Printer size={14} />
            <span>Testar Térmica ({config.paperWidth})</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            className={`flex items-center gap-1.5 px-4 py-2 font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer ${
              savedSuccess
                ? 'bg-emerald-600 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {savedSuccess ? <Check size={15} /> : <CheckCircle2 size={15} />}
            <span>{savedSuccess ? 'Configurações Salvas!' : 'Salvar Alterações'}</span>
          </button>
        </div>
      </div>

      {/* 2. SUB-ABAS DE NAVEGAÇÃO DA CONFIGURAÇÃO */}
      <div className="flex items-center gap-1.5 bg-slate-200/70 p-1 rounded-xl text-xs font-bold overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveSubTab('padroes')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'padroes'
              ? 'bg-white text-blue-700 shadow-xs font-extrabold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sliders size={14} />
          <span>Padrões por Módulo (A4 vs Térmica)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('folha_a4')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'folha_a4'
              ? 'bg-white text-blue-700 shadow-xs font-extrabold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileText size={14} />
          <span>Folha A4 Corporativa</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('termica')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'termica'
              ? 'bg-white text-blue-700 shadow-xs font-extrabold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Printer size={14} />
          <span>Impressora Térmica (80mm & 58mm)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('relatorios_a4')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'relatorios_a4'
              ? 'bg-white text-blue-700 shadow-xs font-extrabold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Award size={14} />
          <span>Central de Relatórios em Folha A4</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('preview')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'preview'
              ? 'bg-white text-blue-700 shadow-xs font-extrabold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Eye size={14} />
          <span>Simulador Visual ao Vivo</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* ABA 1: PADRÕES DE IMPRESSÃO POR MÓDULO (A4 VS TÉRMICA 80MM)               */}
      {/* ========================================================================= */}
      {activeSubTab === 'padroes' && (
        <div className="space-y-4">
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                  <Sliders size={18} className="text-blue-600" />
                  <span>Definição de Formato Padrão por Módulo do ERP</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Escolha qual formato (Folha A4 Oficial ou Cupom Térmico 80mm) abrirá inicialmente ao clicar no botão de impressão em cada tela do sistema. O operador poderá alternar livremente durante a visualização.
                </p>
              </div>
            </div>

            {/* Grid dos Módulos Principais Solicitados */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* 1. PEDIDOS DE VENDA */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col justify-between gap-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                      <FileCheck size={16} className="text-blue-600" />
                      Pedidos de Venda
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                      Balcão & Televendas
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 leading-snug">
                    Impressão de orçamentos comerciais, propostas e pedidos de venda com espelho completo de itens, tributos e canhoto.
                  </p>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-slate-200">
                  <label className="text-[11px] font-bold text-slate-700 block uppercase">
                    Formato Padrão ao Imprimir:
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleUpdate('defaultSalesOrderFormat', 'a4')}
                      className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                        (config.defaultSalesOrderFormat || 'a4') === 'a4'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <FileText size={13} />
                      <span>Folha A4</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdate('defaultSalesOrderFormat', 'thermal')}
                      className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                        config.defaultSalesOrderFormat === 'thermal'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <Printer size={13} />
                      <span>Térmica 80mm</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 2. VENDAS MOBILE (FORÇA DE VENDAS / CELULAR) */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col justify-between gap-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                      <Smartphone size={16} className="text-indigo-600" />
                      Vendas Mobile
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                      Força de Vendas / Rota
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 leading-snug">
                    Vendas realizadas externamente por vendedores em campo via tablet/smartphone para pronta entrega ou pedido de catálogo.
                  </p>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-slate-200">
                  <label className="text-[11px] font-bold text-slate-700 block uppercase">
                    Formato Padrão ao Imprimir:
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleUpdate('defaultExternalSalesFormat', 'a4')}
                      className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                        (config.defaultExternalSalesFormat || 'a4') === 'a4'
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <FileText size={13} />
                      <span>Folha A4</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdate('defaultExternalSalesFormat', 'thermal')}
                      className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                        config.defaultExternalSalesFormat === 'thermal'
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <Printer size={13} />
                      <span>Térmica 80mm</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 3. ORDENS DE PRODUÇÃO (PCP) */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col justify-between gap-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                      <Boxes size={16} className="text-teal-600" />
                      Ordens de Produção
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
                      Chão de Fábrica (PCP)
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 leading-snug">
                    Ficha técnica de fabricação, lista de matérias-primas (BOM), controle de qualidade e apontamento de produção.
                  </p>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-slate-200">
                  <label className="text-[11px] font-bold text-slate-700 block uppercase">
                    Formato Padrão ao Imprimir:
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleUpdate('defaultProductionOrderFormat', 'a4')}
                      className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                        (config.defaultProductionOrderFormat || 'a4') === 'a4'
                          ? 'bg-teal-600 text-white border-teal-600 shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <FileText size={13} />
                      <span>Folha A4 (PCP)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdate('defaultProductionOrderFormat', 'thermal')}
                      className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                        config.defaultProductionOrderFormat === 'thermal'
                          ? 'bg-teal-600 text-white border-teal-600 shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <Printer size={13} />
                      <span>Térmica 80mm</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 4. EXPEDIÇÃO & MANIFESTO DE CARGA */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col justify-between gap-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                      <Truck size={16} className="text-amber-600" />
                      Manifesto de Expedição
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                      Romaneio & Transporte
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 leading-snug">
                    Relação de pedidos por rota, motorista, placa do veículo e canhotos de entrega para conferência na descarga.
                  </p>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-slate-200">
                  <label className="text-[11px] font-bold text-slate-700 block uppercase">
                    Formato Padrão ao Imprimir:
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleUpdate('defaultManifestFormat', 'a4')}
                      className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                        (config.defaultManifestFormat || 'a4') === 'a4'
                          ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <FileText size={13} />
                      <span>Folha A4</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdate('defaultManifestFormat', 'thermal')}
                      className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                        config.defaultManifestFormat === 'thermal'
                          ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <Printer size={13} />
                      <span>Térmica 80mm</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 5. FRENTE DE CAIXA (PDV BALCÃO) */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col justify-between gap-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                      <CreditCard size={16} className="text-emerald-600" />
                      Frente de Caixa (PDV)
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      Emissão Rápida
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 leading-snug">
                    Cupons emitidos ao finalizar venda no PDV Caixa e comprovantes de recebimento rápido de balcão.
                  </p>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-slate-200">
                  <label className="text-[11px] font-bold text-slate-700 block uppercase">
                    Formato Padrão ao Imprimir:
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleUpdate('defaultPosFormat', 'thermal')}
                      className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                        (config.defaultPosFormat || 'thermal') === 'thermal'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <Printer size={13} />
                      <span>Térmica 80mm</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdate('defaultPosFormat', 'a4')}
                      className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                        config.defaultPosFormat === 'a4'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <FileText size={13} />
                      <span>Folha A4</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 2: CONFIGURAÇÃO DE FOLHA A4 (LAYOUT CORPORATIVO)                      */}
      {/* ========================================================================= */}
      {activeSubTab === 'folha_a4' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-7 space-y-4">
            {/* 1. ESTILO DO CABEÇALHO A4 */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="pb-2 border-b border-slate-100">
                <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 size={15} className="text-blue-600" />
                  <span>1. Estilo Visual do Cabeçalho Timbrado A4</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Formato de apresentação da identidade visual da empresa no topo dos documentos A4.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => handleUpdate('a4HeaderStyle', 'classico_timbrado')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    (config.a4HeaderStyle || 'classico_timbrado') === 'classico_timbrado'
                      ? 'border-blue-600 bg-blue-50/50 shadow-2xs ring-1 ring-blue-500/20'
                      : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                  }`}
                >
                  <span className="font-extrabold text-xs text-slate-900 block">Clássico Timbrado</span>
                  <span className="text-[10px] text-slate-500 leading-tight block mt-1">
                    Logo à esquerda com dados fiscais completos e quadro de identificação à direita.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleUpdate('a4HeaderStyle', 'moderno_minimalista')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    config.a4HeaderStyle === 'moderno_minimalista'
                      ? 'border-blue-600 bg-blue-50/50 shadow-2xs ring-1 ring-blue-500/20'
                      : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                  }`}
                >
                  <span className="font-extrabold text-xs text-slate-900 block">Moderno Minimalista</span>
                  <span className="text-[10px] text-slate-500 leading-tight block mt-1">
                    Design limpo sem divisões pesadas, ideal para propostas comerciais leves.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleUpdate('a4HeaderStyle', 'corporativo')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    config.a4HeaderStyle === 'corporativo'
                      ? 'border-blue-600 bg-blue-50/50 shadow-2xs ring-1 ring-blue-500/20'
                      : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                  }`}
                >
                  <span className="font-extrabold text-xs text-slate-900 block">Corporativo Executivo</span>
                  <span className="text-[10px] text-slate-500 leading-tight block mt-1">
                    Faixa superior institucional com destaque para CNPJ, IE e dados de registro.
                  </span>
                </button>
              </div>

              {/* Toggles de Cabeçalho */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.a4ShowLogo !== false}
                    onChange={(e) => handleUpdate('a4ShowLogo', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-xs font-semibold text-slate-700">Exibir Logotipo da Empresa</span>
                </label>

                <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.a4ShowReceiptStub !== false}
                    onChange={(e) => handleUpdate('a4ShowReceiptStub', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-xs font-semibold text-slate-700">Canhoto Destacável de Entrega</span>
                </label>
              </div>
            </div>

            {/* 2. CAMPOS OPCIONAIS DO DOCUMENTO A4 */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="pb-2 border-b border-slate-100">
                <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <FileCheck size={15} className="text-blue-600" />
                  <span>2. Seções Opcionais do Documento A4</span>
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.a4ShowFinancialSummary !== false}
                    onChange={(e) => handleUpdate('a4ShowFinancialSummary', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-xs font-semibold text-slate-700">Quadro de Resumo Financeiro</span>
                </label>

                <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.a4ShowSignatures !== false}
                    onChange={(e) => handleUpdate('a4ShowSignatures', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-xs font-semibold text-slate-700">Campos de Assinatura (Cliente/Vendedor)</span>
                </label>

                <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.a4ShowCommercialTerms !== false}
                    onChange={(e) => handleUpdate('a4ShowCommercialTerms', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-xs font-semibold text-slate-700">Termos Comerciais & Garantia</span>
                </label>
              </div>

              {/* Editor de Texto de Termos */}
              {config.a4ShowCommercialTerms !== false && (
                <div className="space-y-1 pt-2">
                  <label className="text-[11px] font-bold text-slate-700 block uppercase">
                    Texto dos Termos & Validade da Proposta:
                  </label>
                  <textarea
                    rows={3}
                    value={
                      config.a4CommercialTermsText ||
                      'Orçamento/Pedido válido por 10 dias úteis. As mercadorias devem ser conferidas no ato da entrega. Garantia legal de 90 dias conforme CDC.'
                    }
                    onChange={(e) => handleUpdate('a4CommercialTermsText', e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                    placeholder="Digite os termos de garantia e condições de entrega..."
                  />
                </div>
              )}
            </div>

            {/* 3. MARGENS E ORIENTAÇÃO A4 */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="pb-2 border-b border-slate-100">
                <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Maximize2 size={15} className="text-blue-600" />
                  <span>3. Margens e Orientação da Folha A4</span>
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block uppercase mb-1">
                    Margem da Página (@page print):
                  </label>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleUpdate('a4Margin', 'compacta')}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border cursor-pointer ${
                        config.a4Margin === 'compacta'
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      Compacta (8mm)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdate('a4Margin', 'padrao')}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border cursor-pointer ${
                        (config.a4Margin || 'padrao') === 'padrao'
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      Padrão (12mm)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdate('a4Margin', 'ampla')}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border cursor-pointer ${
                        config.a4Margin === 'ampla'
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      Ampla (18mm)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block uppercase mb-1">
                    Orientação do Papel:
                  </label>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleUpdate('a4Orientation', 'portrait')}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border cursor-pointer ${
                        (config.a4Orientation || 'portrait') === 'portrait'
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      Retrato (Vertical)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdate('a4Orientation', 'landscape')}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border cursor-pointer ${
                        config.a4Orientation === 'landscape'
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      Paisagem (Horizontal)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SIMULADOR MINIATURA A4 */}
          <div className="lg:col-span-5 space-y-3">
            <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-md space-y-3 sticky top-20">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-blue-400" />
                  <h3 className="font-extrabold text-xs uppercase tracking-wider">
                    Prévia do Layout Folha A4
                  </h3>
                </div>
                <span className="text-[10px] font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2 py-0.5 rounded-full">
                  Folha A4 (210 x 297 mm)
                </span>
              </div>

              {/* Miniatura A4 */}
              <div className="bg-white text-slate-900 rounded-xl p-4 shadow-inner space-y-3 text-[10px] select-none border border-slate-300">
                {/* Canhoto */}
                {config.a4ShowReceiptStub !== false && (
                  <div className="border-b-2 border-dashed border-slate-300 pb-2 space-y-0.5 text-[9px] text-slate-500">
                    <div className="flex justify-between font-bold text-slate-700">
                      <span>✂ CANHOTO DE RECEBIMENTO</span>
                      <span>PEDIDO Nº PV-2026-00128</span>
                    </div>
                    <div className="truncate">Recebi(emos) os produtos em conformidade.</div>
                    <div className="pt-1 flex justify-between text-[8px] text-slate-400">
                      <span>Data: ___/___/______</span>
                      <span>Assinatura: ________________________</span>
                    </div>
                  </div>
                )}

                {/* Cabeçalho */}
                <div className="flex items-start justify-between border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-2">
                    {config.a4ShowLogo !== false && <GestaoFacilLogo size={24} showSlogan={false} />}
                    <div>
                      <div className="font-extrabold text-[11px] text-slate-900">{currentCompany.tradeName || currentCompany.name}</div>
                      <div className="text-[8px] text-slate-500">CNPJ: {currentCompany.cnpjCpf}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded text-[8px] uppercase">
                      PEDIDO DE VENDA
                    </span>
                    <div className="font-mono text-[9px] text-slate-600 mt-0.5">PV-2026-00128</div>
                  </div>
                </div>

                {/* Tabela de Exemplo */}
                <div className="border border-slate-200 rounded overflow-hidden">
                  <div className="bg-slate-800 text-white font-bold text-[8px] flex justify-between px-1.5 py-1">
                    <span>ITEM / DESCRIÇÃO</span>
                    <span>TOTAL</span>
                  </div>
                  <div className="divide-y divide-slate-100 text-[8px]">
                    <div className="flex justify-between px-1.5 py-1">
                      <span>Detergente Concentrado Neutro 5L (10 UN)</span>
                      <span className="font-mono font-bold">R$ 245,00</span>
                    </div>
                    <div className="flex justify-between px-1.5 py-1">
                      <span>Desinfetante Floral 2L (15 UN)</span>
                      <span className="font-mono font-bold">R$ 210,00</span>
                    </div>
                  </div>
                </div>

                {/* Total */}
                <div className="bg-slate-900 text-white p-2 rounded flex justify-between items-center text-[10px]">
                  <span className="font-bold uppercase text-amber-400">TOTAL GERAL:</span>
                  <span className="font-mono font-black text-emerald-400">R$ 455,00</span>
                </div>

                {/* Termos */}
                {config.a4ShowCommercialTerms !== false && (
                  <div className="text-[8px] text-slate-400 border-t border-slate-200 pt-1 leading-tight">
                    Validade 10 dias. Garantia legal conforme CDC.
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handlePrintA4Test}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer size={14} />
                <span>Abrir e Imprimir Teste A4 Completo</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 3: CONFIGURAÇÃO DE IMPRESSORA TÉRMICA (80MM & 58MM)                   */}
      {/* ========================================================================= */}
      {activeSubTab === 'termica' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-7 space-y-4">
            {/* 1. SELEÇÃO DO TAMANHO DA BOBINA */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Maximize2 size={15} className="text-blue-600" />
                  <span>1. Tamanho da Bobina de Papel</span>
                </h3>
                <span className="text-[11px] font-semibold text-slate-500">
                  Largura física do papel térmico
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Opção 80mm */}
                <div
                  onClick={() => handleUpdate('paperWidth', '80mm')}
                  className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                    config.paperWidth === '80mm'
                      ? 'border-blue-600 bg-blue-50/50 shadow-xs ring-1 ring-blue-500/20'
                      : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-sm text-slate-900">Bobina 80mm</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        config.paperWidth === '80mm'
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      Padrão de Balcão
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Padrão comercial mais utilizado no Brasil (Epson TM-T20, Elgin i9, Bematech MP-4200, Daruma). Permite até 48 colunas de texto com espaço amplo.
                  </p>
                  <div className="text-[10px] font-mono font-bold text-blue-700 bg-white/80 px-2 py-1 rounded border border-slate-200 inline-block self-start">
                    Largura: 80mm (3.15 pol)
                  </div>
                </div>

                {/* Opção 58mm */}
                <div
                  onClick={() => handleUpdate('paperWidth', '58mm')}
                  className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                    config.paperWidth === '58mm'
                      ? 'border-blue-600 bg-blue-50/50 shadow-xs ring-1 ring-blue-500/20'
                      : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-sm text-slate-900">Bobina 58mm</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        config.paperWidth === '58mm'
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      Compacta / POS
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Ideal para maquininhas POS Android inteligentes, mini-impressoras térmicas Bluetooth portáteis e impressoras compactas de 58mm (32 colunas).
                  </p>
                  <div className="text-[10px] font-mono font-bold text-blue-700 bg-white/80 px-2 py-1 rounded border border-slate-200 inline-block self-start">
                    Largura: 58mm (2.28 pol)
                  </div>
                </div>
              </div>
            </div>

            {/* 2. MARGENS LATERAIS DA IMPRESSÃO */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Sliders size={15} className="text-blue-600" />
                  <span>2. Margens Laterais da Impressão (Esquerda & Direita)</span>
                </h3>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 uppercase">
                  Atalhos Rápidos de Margem:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => applyMarginPreset(0, 0)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                      config.marginLeft === 0 && config.marginRight === 0
                        ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Sem Margem (0mm / 0mm)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyMarginPreset(2, 2)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                      config.marginLeft === 2 && config.marginRight === 2
                        ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Padrão Recomendado (2mm / 2mm)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyMarginPreset(4, 4)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                      config.marginLeft === 4 && config.marginRight === 4
                        ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Margem Larga (4mm / 4mm)
                  </button>
                </div>
              </div>

              {/* Sliders Manuais de Ajuste Fino */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-700">Margem Esquerda:</span>
                    <span className="font-mono font-black text-blue-700 text-xs bg-white px-2 py-0.5 rounded border border-slate-200">
                      {config.marginLeft} mm
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    step="0.5"
                    value={config.marginLeft}
                    onChange={(e) => handleUpdate('marginLeft', parseFloat(e.target.value) || 0)}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-700">Margem Direita:</span>
                    <span className="font-mono font-black text-blue-700 text-xs bg-white px-2 py-0.5 rounded border border-slate-200">
                      {config.marginRight} mm
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    step="0.5"
                    value={config.marginRight}
                    onChange={(e) => handleUpdate('marginRight', parseFloat(e.target.value) || 0)}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* 3. CABEÇALHO DO CUPOM TÉRMICO */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 size={15} className="text-blue-600" />
                  <span>3. Formato do Cabeçalho da Empresa</span>
                </h3>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(['completo', 'simplificado', 'compacto', 'personalizado'] as HeaderFormatType[]).map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => handleUpdate('headerFormat', fmt)}
                    className={`p-2.5 rounded-xl border text-center uppercase font-bold text-xs transition-all cursor-pointer ${
                      config.headerFormat === fmt
                        ? 'border-blue-600 bg-blue-50 text-blue-800 ring-1 ring-blue-500/20'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    {fmt}
                  </button>
                ))}
              </div>

              {/* Toggles de Dados do Cabeçalho */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.showTradeName}
                    onChange={(e) => handleUpdate('showTradeName', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span>Nome Fantasia</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.showCnpj}
                    onChange={(e) => handleUpdate('showCnpj', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span>CNPJ / CPF</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.showPhone}
                    onChange={(e) => handleUpdate('showPhone', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span>Telefone de Contato</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.showAddress}
                    onChange={(e) => handleUpdate('showAddress', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span>Endereço Completo</span>
                </label>
              </div>

              {/* Mensagem de Rodapé */}
              <div className="pt-2 border-t border-slate-100 space-y-1">
                <label className="text-[11px] font-bold text-slate-600 uppercase">
                  Mensagem de Rodapé do Cupom:
                </label>
                <input
                  type="text"
                  value={config.footerMessage || ''}
                  onChange={(e) => handleUpdate('footerMessage', e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  placeholder="*** DOCUMENTO NÃO FISCAL ***"
                />
              </div>
            </div>
          </div>

          {/* SIMULADOR MINIATURA TÉRMICA */}
          <div className="lg:col-span-5 space-y-3">
            <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-md space-y-3 sticky top-20">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Eye size={16} className="text-emerald-400" />
                  <h3 className="font-extrabold text-xs uppercase tracking-wider">
                    Prévia da Bobina Térmica
                  </h3>
                </div>
                <span className="text-[10px] font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2 py-0.5 rounded-full">
                  {config.paperWidth} • Margem {config.marginLeft}mm/{config.marginRight}mm
                </span>
              </div>

              {/* Papel Térmico */}
              <div className="flex justify-center">
                <div
                  style={{
                    width: `${previewWidthPx}px`,
                    paddingLeft: `${previewMarginLeftPx + 6}px`,
                    paddingRight: `${previewMarginRightPx + 6}px`,
                    boxSizing: 'border-box',
                  }}
                  className="bg-white text-slate-900 font-mono text-[11px] leading-tight p-3 rounded-b-xl shadow-lg border-2 border-dashed border-slate-300 relative select-none"
                >
                  <div className={`pb-2 border-b border-dashed border-slate-300 ${config.headerAlignment === 'left' ? 'text-left' : 'text-center'}`}>
                    {config.showTradeName && <div className="font-extrabold text-xs">{currentCompany.tradeName || currentCompany.name}</div>}
                    {config.showCnpj && <div className="text-[10px] text-slate-600">CNPJ: {currentCompany.cnpjCpf}</div>}
                    {config.showPhone && currentCompany.phone && <div className="text-[10px] text-slate-600">Fone: {currentCompany.phone}</div>}
                  </div>
                  <div className="py-2 border-b border-dashed border-slate-300 space-y-0.5 text-[10px]">
                    <div className="flex justify-between font-bold">
                      <span>PEDIDO: PV-2026-00128</span>
                      <span>{todayStr}</span>
                    </div>
                    <div className="text-slate-700">Cliente: Supermercado Central</div>
                  </div>
                  <div className="py-2 border-b border-dashed border-slate-300 text-[10px] space-y-1">
                    <div className="flex justify-between">
                      <span>Detergente 5L (2 UN)</span>
                      <span className="font-bold">R$ 49,00</span>
                    </div>
                  </div>
                  <div className="py-2 border-b border-dashed border-slate-300 flex justify-between font-bold text-xs">
                    <span>TOTAL:</span>
                    <span>R$ 49,00</span>
                  </div>
                  <div className="pt-2 text-center text-[9px] text-slate-500 whitespace-pre-line">
                    {config.footerMessage || '*** DOCUMENTO NÃO FISCAL ***\nObrigado pela preferência!'}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handlePrintThermalTest}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer size={14} />
                <span>Testar Impressão na Bobina Térmica</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 4: CENTRAL DE RELATÓRIOS DO SISTEMA EM FOLHA A4                        */}
      {/* ========================================================================= */}
      {activeSubTab === 'relatorios_a4' && (
        <div className="space-y-4">
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                  <Award size={18} className="text-blue-600" />
                  <span>Central de Emissão de Relatórios em Folha A4</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Com base nos recursos e cadastros do ERP, foram modelados 9 relatórios executivos em papel A4 oficial com layout timbrado, prontos para impressão física e exportação em PDF.
                </p>
              </div>
            </div>

            {/* Catálogo Completo de Relatórios A4 com Ação Direta */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* 1. Pedidos de Venda */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col justify-between gap-3 hover:border-blue-300 transition-colors">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                      <FileCheck size={16} className="text-blue-600" />
                      Espelho de Pedido de Venda
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                      Vendas
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 leading-snug">
                    Layout completo com dados da empresa, cliente, itens detalhados com descontos, resumo financeiro e canhoto destacável para assinatura.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewA4Report('pedido_modelo')}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Eye size={13} />
                  <span>Visualizar & Imprimir A4</span>
                </button>
              </div>

              {/* 2. Vendas Mobile */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col justify-between gap-3 hover:border-indigo-300 transition-colors">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                      <Smartphone size={16} className="text-indigo-600" />
                      Comprovante de Venda Mobile
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                      Rota Externa
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 leading-snug">
                    Comprovante de pronta entrega com identificação do vendedor de rota, produtos entregues da van e recibo de quitação financeira.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewA4Report('venda_mobile_modelo')}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Eye size={13} />
                  <span>Visualizar & Imprimir A4</span>
                </button>
              </div>

              {/* 3. Ordem de Produção (PCP) */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col justify-between gap-3 hover:border-teal-300 transition-colors">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                      <Boxes size={16} className="text-teal-600" />
                      Ficha de Produção & PCP
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
                      Indústria / PCP
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 leading-snug">
                    Ficha de fabricação com lista de matérias-primas requeridas (BOM), lote, etapas de processo e checklist de controle de qualidade.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewA4Report('op_modelo')}
                  className="w-full py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Eye size={13} />
                  <span>Visualizar & Imprimir A4</span>
                </button>
              </div>

              {/* 4. Fechamento de Caixa */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col justify-between gap-3 hover:border-amber-300 transition-colors">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                      <Wallet size={16} className="text-amber-600" />
                      Fechamento de Caixa PDV
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                      Caixa / Auditoria
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 leading-snug">
                    Extrato de encerramento de turno com fundo de troco, sangrias, suprimentos, conferência cega por forma de pagamento e quebra de caixa.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewA4Report('fechamento_caixa')}
                  className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Eye size={13} />
                  <span>Visualizar & Imprimir A4</span>
                </button>
              </div>

              {/* 5. Inventário Físico & Estoque */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col justify-between gap-3 hover:border-blue-300 transition-colors">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                      <Boxes size={16} className="text-blue-600" />
                      Folha de Contagem de Estoque
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                      Almoxarifado
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 leading-snug">
                    Prancha de auditoria física com listagem de produtos, saldo sistêmico e colunas para 1ª e 2ª contagens manuais com assinatura.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewA4Report('inventario')}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Eye size={13} />
                  <span>Visualizar & Imprimir A4</span>
                </button>
              </div>

              {/* 6. Extrato Financeiro Gerencial */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col justify-between gap-3 hover:border-emerald-300 transition-colors">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                      <DollarSign size={16} className="text-emerald-600" />
                      Extrato Financeiro Gerencial
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      Financeiro / DRE
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 leading-snug">
                    Demonstrativo de contas a receber e a pagar em aberto, projeção de liquidez e aging de inadimplência de clientes.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewA4Report('financeiro')}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Eye size={13} />
                  <span>Visualizar & Imprimir A4</span>
                </button>
              </div>

              {/* 7. Ficha Cadastral do Cliente */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col justify-between gap-3 hover:border-purple-300 transition-colors">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                      <Users size={16} className="text-purple-600" />
                      Ficha Cadastral do Cliente
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                      Cadastro & Crédito
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 leading-snug">
                    Dossiê cadastral com dados fiscais, endereços de entrega e faturamento, limite de crédito concedido e rota logística.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewA4Report('cliente')}
                  className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Eye size={13} />
                  <span>Visualizar & Imprimir A4</span>
                </button>
              </div>

              {/* 8. Romaneio de Carga & Transporte */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col justify-between gap-3 hover:border-amber-300 transition-colors">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                      <Truck size={16} className="text-amber-600" />
                      Romaneio de Carga & Rota
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                      Expedição
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 leading-snug">
                    Ordem de carregamento e paradas de entrega do veículo com motorista, totalizador de volumes e canhotos de conferência.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewA4Report('romaneio_modelo')}
                  className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Eye size={13} />
                  <span>Visualizar & Imprimir A4</span>
                </button>
              </div>

              {/* 9. Relatório de Comissões de Vendas */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col justify-between gap-3 hover:border-emerald-300 transition-colors">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                      <Award size={16} className="text-emerald-600" />
                      Comissões & Desempenho
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      Gestão Comercial
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 leading-snug">
                    Apuração de vendas por operador, pedidos faturados, ticket médio, comissão calculada e assinaturas de homologação gerencial.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewA4Report('comissoes_vendedores')}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Eye size={13} />
                  <span>Visualizar & Imprimir A4</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 5: SIMULADOR VISUAL AO VIVO (ALTERNADOR DE FORMATO)                   */}
      {/* ========================================================================= */}
      {activeSubTab === 'preview' && (
        <div className="space-y-4">
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="pb-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                  <Eye size={18} className="text-blue-600" />
                  <span>Simulador Interativo de Impressão</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Alterne entre a visualização de Cupom Térmico (80mm/58mm) e Folha A4 para conferir os recuos, margens e diagramação antes de imprimir.
                </p>
              </div>

              {/* Alternador de Modo */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold border border-slate-200">
                <button
                  type="button"
                  onClick={() => setSimulatorMode('termica')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    simulatorMode === 'termica' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Printer size={14} />
                  <span>Cupom Térmico ({config.paperWidth})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSimulatorMode('a4')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    simulatorMode === 'a4' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileText size={14} />
                  <span>Folha A4 Oficial</span>
                </button>
              </div>
            </div>

            {/* Painel do Simulador */}
            <div className="p-4 sm:p-8 bg-slate-100/90 rounded-2xl border border-slate-200 flex justify-center">
              {simulatorMode === 'termica' ? (
                /* SIMULADOR TÉRMICO */
                <div
                  id="printable-receipt"
                  style={{
                    width: `${previewWidthPx}px`,
                    paddingLeft: `${previewMarginLeftPx + 6}px`,
                    paddingRight: `${previewMarginRightPx + 6}px`,
                    boxSizing: 'border-box',
                  }}
                  className="bg-white text-slate-900 font-mono text-[11px] leading-tight p-4 rounded-xl shadow-lg border-2 border-dashed border-slate-300 relative select-text"
                >
                  <div className={`pb-2 border-b border-dashed border-slate-300 space-y-0.5 ${config.headerAlignment === 'left' ? 'text-left' : 'text-center'}`}>
                    {config.showTradeName && <div className="font-extrabold text-xs">{currentCompany.tradeName || currentCompany.name}</div>}
                    {config.showCnpj && <div className="text-[10px] text-slate-600">CNPJ: {currentCompany.cnpjCpf}</div>}
                    {config.showPhone && currentCompany.phone && <div className="text-[10px] text-slate-600">Fone: {currentCompany.phone}</div>}
                    {config.showAddress && (
                      <div className="text-[9px] text-slate-500">
                        {currentCompany.address.street}, {currentCompany.address.number} • {currentCompany.address.city}/{currentCompany.address.state}
                      </div>
                    )}
                  </div>
                  <div className="py-2 border-b border-dashed border-slate-300 space-y-0.5 text-[10px]">
                    <div className="flex justify-between font-bold">
                      <span>PEDIDO: PV-2026-00128</span>
                      <span>{todayStr}</span>
                    </div>
                    <div>Cliente: Supermercado Central</div>
                    <div>Vendedor: Operador Balcão</div>
                  </div>
                  <div className="py-2 border-b border-dashed border-slate-300 text-[10px] space-y-1">
                    <div className="flex justify-between">
                      <span>Detergente 5L (10 UN)</span>
                      <span className="font-bold">R$ 245,00</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Desinfetante 2L (15 UN)</span>
                      <span className="font-bold">R$ 210,00</span>
                    </div>
                  </div>
                  <div className="py-2 border-b border-dashed border-slate-300 flex justify-between font-black text-xs">
                    <span>TOTAL:</span>
                    <span>R$ 455,00</span>
                  </div>
                  <div className="pt-2 text-center text-[9px] text-slate-500 whitespace-pre-line">
                    {config.footerMessage || '*** DOCUMENTO NÃO FISCAL ***\nObrigado pela preferência!'}
                  </div>
                </div>
              ) : (
                /* SIMULADOR A4 */
                <div className="w-full max-w-[760px] bg-white p-6 rounded-xl shadow-lg border border-slate-200 text-xs space-y-4">
                  {/* Canhoto */}
                  {config.a4ShowReceiptStub !== false && (
                    <div className="border-b-2 border-dashed border-slate-300 pb-2 text-[10px] space-y-1">
                      <div className="flex justify-between font-bold text-slate-700">
                        <span>✂ PROTOCOLO DE ENTREGA E CANHOTO DESTACÁVEL</span>
                        <span>PEDIDO Nº PV-2026-00128</span>
                      </div>
                      <div className="text-[9px] text-slate-500">
                        Recebi(emos) de {currentCompany.tradeName || currentCompany.name} os produtos em perfeito estado.
                      </div>
                      <div className="pt-1 flex justify-between text-[9px] text-slate-400">
                        <span>Data: ___/___/______</span>
                        <span>Assinatura do Recebedor: ________________________</span>
                      </div>
                    </div>
                  )}

                  {/* Topo */}
                  <div className="flex justify-between items-start border-b border-slate-200 pb-3">
                    <div className="flex items-center gap-3">
                      {config.a4ShowLogo !== false && <GestaoFacilLogo size={36} showSlogan={false} />}
                      <div>
                        <div className="font-black text-sm text-slate-900 uppercase">{currentCompany.tradeName || currentCompany.name}</div>
                        <div className="text-[10px] text-slate-500">CNPJ: {currentCompany.cnpjCpf} • Tel: {currentCompany.phone}</div>
                        <div className="text-[10px] text-slate-500">{currentCompany.address.city}/{currentCompany.address.state}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="bg-blue-100 text-blue-900 font-bold px-2 py-0.5 rounded text-[10px] uppercase">
                        Espelho de Pedido de Venda
                      </span>
                      <div className="font-mono font-bold text-sm text-slate-800 mt-1">PV-2026-00128</div>
                      <div className="text-[10px] text-slate-400">Emissão: {todayStr}</div>
                    </div>
                  </div>

                  {/* Itens */}
                  <div className="border border-slate-200 rounded-lg overflow-hidden text-[10px]">
                    <div className="bg-slate-900 text-white font-bold px-3 py-1.5 flex justify-between uppercase">
                      <span>Item / Descrição</span>
                      <span>Total</span>
                    </div>
                    <div className="p-3 divide-y divide-slate-100">
                      <div className="flex justify-between py-1">
                        <span>Detergente Concentrado Neutro 5L (10 UN x R$ 24,50)</span>
                        <span className="font-mono font-bold">R$ 245,00</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span>Desinfetante Floral Antibacteriano 2L (15 UN x R$ 14,00)</span>
                        <span className="font-mono font-bold">R$ 210,00</span>
                      </div>
                    </div>
                  </div>

                  {/* Resumo */}
                  <div className="bg-slate-900 text-white p-3 rounded-lg flex justify-between items-center text-xs">
                    <span className="font-bold uppercase text-amber-400">Total Geral do Pedido:</span>
                    <span className="font-mono font-black text-emerald-400 text-sm">R$ 455,00</span>
                  </div>

                  {/* Assinaturas */}
                  {config.a4ShowSignatures !== false && (
                    <div className="grid grid-cols-2 gap-8 pt-4 text-center text-[10px]">
                      <div className="border-t border-slate-400 pt-1">
                        <span className="font-bold text-slate-800 block">Vendedor Responsável</span>
                      </div>
                      <div className="border-t border-slate-400 pt-1">
                        <span className="font-bold text-slate-800 block">Cliente / Comprador</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={simulatorMode === 'termica' ? handlePrintThermalTest : handlePrintA4Test}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Printer size={15} />
                <span>Imprimir Este Modelo ({simulatorMode === 'termica' ? `Térmica ${config.paperWidth}` : 'Folha A4'})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE PREVIEW E IMPRESSÃO DE RELATÓRIOS EM FOLHA A4 */}
      {previewA4Report && (
        <A4ReportsPreviewModal
          isOpen={!!previewA4Report}
          onClose={() => setPreviewA4Report(null)}
          reportType={previewA4Report}
        />
      )}
    </div>
  );
};
