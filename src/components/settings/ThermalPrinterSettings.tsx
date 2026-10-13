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
  Settings2
} from 'lucide-react';
import { Database, DEFAULT_PRINTER_CONFIG } from '../../services/db';
import { ThermalPrinterConfig, ThermalPaperWidth, HeaderFormatType } from '../../types';
import { formatCurrency } from '../../services/pricingEngine';

export const ThermalPrinterSettings: React.FC = () => {
  const currentCompany = Database.getCurrentCompany();
  const [config, setConfig] = useState<ThermalPrinterConfig>(() => Database.getPrinterConfig());
  const [savedSuccess, setSavedSuccess] = useState(false);

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
      'CONFIG_IMPRESSORA_ATUALIZADA',
      'CONFIGURACOES',
      'IMPRESSORA',
      `Configuração da impressora térmica atualizada: Bobina ${config.paperWidth}, Cabeçalho ${config.headerFormat}, Margens E:${config.marginLeft}mm D:${config.marginRight}mm`
    );
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleResetDefaults = () => {
    if (window.confirm('Deseja restaurar as configurações padrão da impressora térmica (80mm, margens 2mm, cabeçalho completo)?')) {
      setConfig({ ...DEFAULT_PRINTER_CONFIG });
      Database.updatePrinterConfig(DEFAULT_PRINTER_CONFIG);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    }
  };

  const handlePrintTest = () => {
    // Salva antes de imprimir para garantir persistência
    Database.updatePrinterConfig(config);
    window.print();
  };

  // Presets de Margens Laterais
  const applyMarginPreset = (left: number, right: number) => {
    setConfig((prev) => ({
      ...prev,
      marginLeft: left,
      marginRight: right,
    }));
    setSavedSuccess(false);
  };

  // Calcular largura visual no preview de tela
  // 80mm ~ 310px, 58mm ~ 230px
  const previewWidthPx = config.paperWidth === '58mm' ? 245 : 325;
  const previewMarginLeftPx = Math.round(config.marginLeft * 3.8);
  const previewMarginRightPx = Math.round(config.marginRight * 3.8);

  return (
    <div className="space-y-6">
      {/* Barra de Título e Ações Rápidas */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
            <Printer size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
                Configuração da Impressora Térmica
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-blue-50 text-blue-700 border border-blue-200">
                Bobina {config.paperWidth}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Personalize o tamanho da bobina (58mm/80mm), margens laterais e o formato do cabeçalho da empresa para cupons não fiscais.
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
            onClick={handlePrintTest}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
            title="Imprimir cupom de teste na impressora instalada"
          >
            <Printer size={14} />
            <span>Imprimir Teste</span>
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

      {/* Grid Principal: Formulário de Configuração (7 cols) + Simulador Visual ao Vivo (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* COLUNA ESQUERDA: PARÂMETROS DA IMPRESSORA (7 cols) */}
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

          {/* 2. MARGENS LATERAIS DA IMPRESSÃO (ESQUERDA & DIREITA) */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders size={15} className="text-blue-600" />
                <span>2. Margens Laterais da Impressão (Esquerda & Direita)</span>
              </h3>
              <span className="text-[11px] font-semibold text-slate-500">
                Alinhamento e recuo do papel
              </span>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Defina as margens laterais para compensar o recuo do mecanismo de avanço de papel e guilhotina da sua impressora térmica, evitando que caracteres fiquem cortados nas extremidades.
            </p>

            {/* Presets Rápidos de Margem */}
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
                  Centralizado Seguro (4mm / 4mm)
                </button>
                <button
                  type="button"
                  onClick={() => applyMarginPreset(0, 4)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                    config.marginLeft === 0 && config.marginRight === 4
                      ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Recuo à Direita (0mm / 4mm)
                </button>
              </div>
            </div>

            {/* Controles Sliders de Margem */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {/* Margem Esquerda */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-800">Margem Esquerda (mm):</span>
                  <span className="font-mono font-extrabold text-blue-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {config.marginLeft} mm
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="15"
                    step="1"
                    value={config.marginLeft}
                    onChange={(e) => handleUpdate('marginLeft', Number(e.target.value))}
                    className="flex-1 accent-blue-600 cursor-pointer"
                  />
                  <input
                    type="number"
                    min="0"
                    max="15"
                    value={config.marginLeft}
                    onChange={(e) => handleUpdate('marginLeft', Math.max(0, Math.min(15, Number(e.target.value) || 0)))}
                    className="w-14 bg-white border border-slate-200 rounded-lg p-1 text-center font-mono font-bold text-xs"
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>0mm (alinhado)</span>
                  <span>15mm (recuado)</span>
                </div>
              </div>

              {/* Margem Direita */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-800">Margem Direita (mm):</span>
                  <span className="font-mono font-extrabold text-blue-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {config.marginRight} mm
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="15"
                    step="1"
                    value={config.marginRight}
                    onChange={(e) => handleUpdate('marginRight', Number(e.target.value))}
                    className="flex-1 accent-blue-600 cursor-pointer"
                  />
                  <input
                    type="number"
                    min="0"
                    max="15"
                    value={config.marginRight}
                    onChange={(e) => handleUpdate('marginRight', Math.max(0, Math.min(15, Number(e.target.value) || 0)))}
                    className="w-14 bg-white border border-slate-200 rounded-lg p-1 text-center font-mono font-bold text-xs"
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>0mm (alinhado)</span>
                  <span>15mm (recuado)</span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. FORMATO DO CABEÇALHO DA EMPRESA */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <FileText size={15} className="text-blue-600" />
                <span>3. Formato do Cabeçalho da Empresa</span>
              </h3>
              <span className="text-[11px] font-semibold text-slate-500">
                Identificação no topo do cupom
              </span>
            </div>

            {/* Estilo do Cabeçalho */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleUpdate('headerFormat', 'completo')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  config.headerFormat === 'completo'
                    ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold shadow-2xs'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="font-bold">Completo</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Todos os dados e endereço</div>
              </button>

              <button
                type="button"
                onClick={() => handleUpdate('headerFormat', 'simplificado')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  config.headerFormat === 'simplificado'
                    ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold shadow-2xs'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="font-bold">Simplificado</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Economiza papel (sem end.)</div>
              </button>

              <button
                type="button"
                onClick={() => handleUpdate('headerFormat', 'compacto')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  config.headerFormat === 'compacto'
                    ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold shadow-2xs'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="font-bold">Compacto</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Apenas Fantasia + CNPJ</div>
              </button>

              <button
                type="button"
                onClick={() => handleUpdate('headerFormat', 'personalizado')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  config.headerFormat === 'personalizado'
                    ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold shadow-2xs'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="font-bold">Personalizado</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Com mensagem livre</div>
              </button>
            </div>

            {/* Alinhamento do Cabeçalho */}
            <div className="flex items-center justify-between pt-1">
              <label className="text-xs font-bold text-slate-700">
                Alinhamento do Cabeçalho:
              </label>
              <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200">
                <button
                  type="button"
                  onClick={() => handleUpdate('headerAlignment', 'center')}
                  className={`flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                    config.headerAlignment === 'center'
                      ? 'bg-white text-blue-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <AlignCenter size={13} />
                  <span>Centralizado</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdate('headerAlignment', 'left')}
                  className={`flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                    config.headerAlignment === 'left'
                      ? 'bg-white text-blue-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <AlignLeft size={13} />
                  <span>À Esquerda</span>
                </button>
              </div>
            </div>

            {/* Toggles de Campos Específicos */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
              <label className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.showTradeName}
                  onChange={(e) => handleUpdate('showTradeName', e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="font-medium text-slate-700">Nome Fantasia</span>
              </label>

              <label className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.showCnpj}
                  onChange={(e) => handleUpdate('showCnpj', e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="font-medium text-slate-700">CNPJ / CPF</span>
              </label>

              <label className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.showPhone}
                  onChange={(e) => handleUpdate('showPhone', e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="font-medium text-slate-700">Telefone</span>
              </label>

              <label className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.showAddress}
                  onChange={(e) => handleUpdate('showAddress', e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="font-medium text-slate-700">Endereço</span>
              </label>
            </div>

            {/* Texto Customizado do Cabeçalho */}
            <div className="space-y-1 pt-1">
              <label className="text-xs font-bold text-slate-700">
                Texto Adicional / Slogan do Cabeçalho (Opcional):
              </label>
              <input
                type="text"
                placeholder="Ex: Sua melhor escolha em atendimento e qualidade"
                value={config.customHeaderText || ''}
                onChange={(e) => handleUpdate('customHeaderText', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* 4. RODAPÉ E FINALIZAÇÃO */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Settings2 size={15} className="text-blue-600" />
                <span>4. Rodapé e Opções Adicionais</span>
              </h3>
              <span className="text-[11px] font-semibold text-slate-500">
                Mensagem final do cupom
              </span>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">
                Mensagem do Rodapé:
              </label>
              <textarea
                rows={2}
                value={config.footerMessage || ''}
                onChange={(e) => handleUpdate('footerMessage', e.target.value)}
                placeholder="*** DOCUMENTO NÃO FISCAL ***&#10;Obrigado pela preferência!"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-mono text-slate-800 focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                <Scissors size={15} className="text-slate-500" />
                <span>Emitir comando de guilhotina / corte automático ao finalizar</span>
              </label>
              <input
                type="checkbox"
                checked={config.autoCut}
                onChange={(e) => handleUpdate('autoCut', e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* COLUNA DIREITA: SIMULADOR DE IMPRESSÃO AO VIVO (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-md space-y-3 sticky top-20">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Eye size={16} className="text-emerald-400" />
                <h3 className="font-extrabold text-xs uppercase tracking-wider">
                  Pré-visualização do Cupom Térmico
                </h3>
              </div>
              <span className="text-[10px] font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2 py-0.5 rounded-full">
                {config.paperWidth} • Margem {config.marginLeft}mm/{config.marginRight}mm
              </span>
            </div>

            <p className="text-[11px] text-slate-400 leading-snug">
              Visualização exata do cupom como será impresso na bobina de <strong>{config.paperWidth}</strong> com recuos laterais aplicados.
            </p>

            {/* Régua Superior de Largura */}
            <div className="flex justify-center">
              <div
                style={{ width: `${previewWidthPx}px` }}
                className="bg-slate-800 border-x border-t border-slate-700 text-[10px] font-mono text-slate-400 flex items-center justify-between px-2 py-1 rounded-t-lg transition-all"
              >
                <span>| 0mm</span>
                <span className="text-emerald-400 font-bold">&larr; Largura da Bobina: {config.paperWidth} &rarr;</span>
                <span>{config.paperWidth} |</span>
              </div>
            </div>

            {/* Simulador de Papel Térmico */}
            <div className="flex justify-center">
              <div
                id="printable-receipt"
                style={{
                  width: `${previewWidthPx}px`,
                  paddingLeft: `${previewMarginLeftPx + 6}px`,
                  paddingRight: `${previewMarginRightPx + 6}px`,
                  boxSizing: 'border-box',
                }}
                className="bg-white text-slate-900 font-mono text-[11px] leading-tight p-3 rounded-b-xl shadow-lg border-2 border-dashed border-slate-300 relative select-none transition-all"
              >
                {/* Linhas guias de margem esquerda e direita (visuais para ajuste fino) */}
                {config.marginLeft > 0 && (
                  <div
                    style={{ left: `${previewMarginLeftPx + 6}px` }}
                    className="absolute top-0 bottom-0 w-px border-l border-dashed border-blue-400/50 pointer-events-none"
                    title={`Guia de margem esquerda: ${config.marginLeft}mm`}
                  />
                )}
                {config.marginRight > 0 && (
                  <div
                    style={{ right: `${previewMarginRightPx + 6}px` }}
                    className="absolute top-0 bottom-0 w-px border-r border-dashed border-blue-400/50 pointer-events-none"
                    title={`Guia de margem direita: ${config.marginRight}mm`}
                  />
                )}

                {/* CABEÇALHO DA EMPRESA DINÂMICO */}
                <div
                  className={`pb-2 border-b border-dashed border-slate-300 space-y-0.5 ${
                    config.headerAlignment === 'left' ? 'text-left' : 'text-center'
                  }`}
                >
                  {config.showTradeName && (
                    <div className="font-extrabold text-xs tracking-wide">
                      {currentCompany.tradeName || currentCompany.name}
                    </div>
                  )}

                  {config.headerFormat === 'completo' && currentCompany.name !== currentCompany.tradeName && (
                    <div className="text-[10px] text-slate-600 font-semibold truncate">
                      {currentCompany.name}
                    </div>
                  )}

                  {config.showCnpj && (
                    <div className="text-[10px] text-slate-600">
                      CNPJ: {currentCompany.cnpjCpf}
                    </div>
                  )}

                  {config.showPhone && currentCompany.phone && (
                    <div className="text-[10px] text-slate-600">
                      Fone: {currentCompany.phone}
                    </div>
                  )}

                  {config.showAddress && config.headerFormat === 'completo' && (
                    <div className="text-[9px] text-slate-500 leading-tight">
                      {currentCompany.address.street}, {currentCompany.address.number} - {currentCompany.address.city}/{currentCompany.address.state}
                    </div>
                  )}

                  {config.customHeaderText && (
                    <div className="text-[10px] font-bold text-slate-800 pt-0.5 border-t border-dotted border-slate-200">
                      {config.customHeaderText}
                    </div>
                  )}
                </div>

                {/* DADOS DO COMPROVANTE */}
                <div className="py-2 border-b border-dashed border-slate-300 space-y-0.5 text-[10px]">
                  <div className="flex justify-between font-bold">
                    <span>VENDA: VD-2026-00042</span>
                    <span>{new Date().toLocaleDateString('pt-BR')}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>PDV Balcão Caixa #01</span>
                    <span>{new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="text-slate-700">
                    Operador: Administrador
                  </div>
                  <div className="text-slate-700 truncate">
                    Cliente: Consumidor Final
                  </div>
                </div>

                {/* ITENS DE EXEMPLO */}
                <div className="py-2 border-b border-dashed border-slate-300 text-[10px] space-y-1">
                  <div className="flex justify-between font-bold text-slate-500 uppercase text-[9px]">
                    <span>ITEM / DESCRIÇÃO</span>
                    <span>TOTAL</span>
                  </div>

                  <div>
                    <div className="font-semibold text-slate-800 truncate">DETERGENTE NEUTRO 5L</div>
                    <div className="flex justify-between text-slate-600">
                      <span>2 UN x {formatCurrency(24.50)}</span>
                      <span className="font-bold">{formatCurrency(49.00)}</span>
                    </div>
                  </div>

                  <div>
                    <div className="font-semibold text-slate-800 truncate">DESINFETANTE LAVANDA 2L</div>
                    <div className="flex justify-between text-slate-600">
                      <span>1 UN x {formatCurrency(14.90)}</span>
                      <span className="font-bold">{formatCurrency(14.90)}</span>
                    </div>
                  </div>
                </div>

                {/* TOTAIS */}
                <div className="py-2 border-b border-dashed border-slate-300 space-y-0.5 text-[10px]">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(63.90)}</span>
                  </div>
                  <div className="flex justify-between text-rose-600">
                    <span>Desconto Concedido:</span>
                    <span>-{formatCurrency(3.90)}</span>
                  </div>
                  <div className="flex justify-between font-black text-xs pt-1 border-t border-slate-300">
                    <span>TOTAL A PAGAR:</span>
                    <span>{formatCurrency(60.00)}</span>
                  </div>
                </div>

                {/* PAGAMENTO */}
                <div className="py-2 border-b border-dashed border-slate-300 text-[10px] space-y-0.5">
                  <div className="flex justify-between">
                    <span>Forma de Pagto:</span>
                    <span className="font-bold">PIX / DINHEIRO</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Valor Recebido:</span>
                    <span>{formatCurrency(60.00)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Troco:</span>
                    <span>{formatCurrency(0.00)}</span>
                  </div>
                </div>

                {/* RODAPÉ */}
                <div className="pt-2 text-center text-[9px] text-slate-500 whitespace-pre-line leading-relaxed">
                  {config.footerMessage || '*** DOCUMENTO NÃO FISCAL ***\nObrigado pela preferência e confiança!'}
                </div>
              </div>
            </div>

            {/* Botão de Teste Direto */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handlePrintTest}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer size={15} />
                <span>Testar Impressão Agora</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
