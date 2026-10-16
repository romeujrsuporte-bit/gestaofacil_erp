import React, { useState, useEffect } from 'react';
import {
  Database as DatabaseIcon,
  Cloud,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  Server,
  Lock,
  Layers,
  ArrowDownCircle,
  ArrowUpCircle,
  FileCode,
  ShieldCheck,
  Activity,
  Zap,
} from 'lucide-react';
import { Database } from '../../services/db';
import { SupabaseService, SupabaseConfig, ConnectionTestResult, DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_KEY } from '../../services/supabaseService';
import { toast } from '../../services/toast';

export const SupabaseSettings: React.FC = () => {
  const [config, setConfig] = useState<SupabaseConfig>(SupabaseService.getConfig());
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [showSqlEditor, setShowSqlEditor] = useState(false);
  // SQL view modes: 'complete' | 'rls_fix' | 'missing'
  const [sqlMode, setSqlMode] = useState<'complete' | 'rls_fix' | 'missing'>('rls_fix');

  const getActiveSqlCode = () => {
    switch (sqlMode) {
      case 'rls_fix':
        return SupabaseService.generateHardenedRlsFixForFiveTables();
      case 'missing':
        return SupabaseService.generateMissingTablesSql();
      case 'complete':
      default:
        return SupabaseService.generateSqlSchema();
    }
  };

  const handleCopyActiveSql = () => {
    const sql = getActiveSqlCode();
    navigator.clipboard.writeText(sql);
    setCopiedSql(true);
    toast.success('Script SQL copiado com sucesso!');
    setTimeout(() => setCopiedSql(false), 3000);
  };

  // Form states
  const [urlInput, setUrlInput] = useState(config.url);
  const [keyInput, setKeyInput] = useState(config.anonKey);
  const [autoSyncInput, setAutoSyncInput] = useState(config.autoSync);
  const [intervalInput, setIntervalInput] = useState(config.syncIntervalMinutes);

  useEffect(() => {
    return SupabaseService.subscribe((newCfg) => {
      setConfig(newCfg);
      setUrlInput(newCfg.url);
      setKeyInput(newCfg.anonKey);
      setAutoSyncInput(newCfg.autoSync);
      setIntervalInput(newCfg.syncIntervalMinutes);
    });
  }, []);

  // Executa teste automático inicial ao abrir
  useEffect(() => {
    handleTestConnection(false);
  }, []);

  const handleTestConnection = async (showToast = true) => {
    setIsTesting(true);
    try {
      const result = await SupabaseService.testConnection();
      setTestResult(result);
      if (showToast) {
        if (result.success) {
          toast.success(`Supabase Conectado! Tempo de resposta: ${result.latencyMs}ms`);
        } else {
          toast.error(`Falha ao conectar: ${result.message}`);
        }
      }
    } catch (err: any) {
      if (showToast) toast.error(err?.message || 'Erro ao testar conexão.');
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    SupabaseService.saveConfig({
      url: urlInput.trim(),
      anonKey: keyInput.trim(),
      autoSync: autoSyncInput,
      syncIntervalMinutes: Number(intervalInput) || 10,
    });
    toast.success('Configurações do Supabase salvas com sucesso!');
    handleTestConnection(true);
  };

  const handleRestoreDefaultCredentials = () => {
    setUrlInput(DEFAULT_SUPABASE_URL);
    setKeyInput(DEFAULT_SUPABASE_KEY);
    SupabaseService.saveConfig({
      url: DEFAULT_SUPABASE_URL,
      anonKey: DEFAULT_SUPABASE_KEY,
    });
    toast.info('Credenciais restauradas para o projeto padrão fornecido.');
    handleTestConnection(true);
  };

  const handleSyncToSupabase = async () => {
    setIsSyncing(true);
    try {
      const res = await SupabaseService.syncToSupabase();
      if (res.success) {
        toast.success(res.message);
        // Atualiza teste para verificar tabelas
        handleTestConnection(false);
      } else {
        toast.error(res.message);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Falha ao sincronizar.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRestoreFromSupabase = async () => {
    if (!confirm('Deseja restaurar os dados do ERP a partir do Supabase? Os dados locais atuais serão atualizados com o backup da nuvem.')) {
      return;
    }

    setIsRestoring(true);
    try {
      const res = await SupabaseService.restoreFromSupabase();
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.warning(res.message);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Falha ao restaurar dados.');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleCopySql = () => {
    const sql = SupabaseService.generateSqlSchema();
    navigator.clipboard.writeText(sql);
    setCopiedSql(true);
    toast.success('Script SQL copiado para a área de transferência!');
    setTimeout(() => setCopiedSql(false), 3000);
  };

  const projectId = SupabaseService.extractProjectId(urlInput || config.url);
  const supabaseConsoleUrl = `https://supabase.com/dashboard/project/${projectId}/sql`;

  return (
    <div className="space-y-6">
      {/* BANNER PRINCIPAL DE STATUS DO SUPABASE */}
      <div className="bg-gradient-to-br from-emerald-950 via-slate-900 to-zinc-950 text-white p-5 sm:p-7 rounded-2xl border border-emerald-800/40 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <DatabaseIcon size={160} />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center justify-center shrink-0 shadow-inner">
              <DatabaseIcon size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="font-extrabold text-lg sm:text-xl text-white">
                  Integração Supabase PostgreSQL
                </h3>
                {testResult?.success ? (
                  <span className="flex items-center gap-1.5 text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-0.5 rounded-full">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    CONECTADO (ONLINE)
                  </span>
                ) : isTesting ? (
                  <span className="flex items-center gap-1.5 text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-0.5 rounded-full">
                    <RefreshCw size={12} className="animate-spin" />
                    TESTANDO CONEXÃO...
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs font-black bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2.5 py-0.5 rounded-full">
                    <AlertTriangle size={12} />
                    DESCONECTADO
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 max-w-2xl leading-relaxed mt-1">
                Banco de dados na nuvem com PostgreSQL em tempo real. Seus cadastros, vendas, romaneios de entrega e rotas sincronizados com segurança no Supabase.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              type="button"
              disabled={isTesting}
              onClick={() => handleTestConnection(true)}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw size={14} className={isTesting ? 'animate-spin' : ''} />
              <span>Testar Conexão</span>
            </button>
            <a
              href={supabaseConsoleUrl}
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Abrir o painel do seu projeto no Supabase"
            >
              <ExternalLink size={14} />
              <span>Abrir no Supabase</span>
            </a>
          </div>
        </div>

        {/* METADADOS DO PROJETO & RESUMO DA CONEXÃO */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 text-xs">
          <div className="bg-white/5 p-3 rounded-xl border border-white/10">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">ID do Projeto</span>
            <span className="font-mono font-extrabold text-emerald-300 truncate block mt-0.5">
              {projectId}
            </span>
          </div>
          <div className="bg-white/5 p-3 rounded-xl border border-white/10">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Tempo de Resposta</span>
            <span className="font-bold text-white block mt-0.5">
              {testResult ? `${testResult.latencyMs} ms` : '—'}
            </span>
          </div>
          <div className="bg-white/5 p-3 rounded-xl border border-white/10">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Último Backup Nuvem</span>
            <span className="font-bold text-white block mt-0.5 truncate">
              {config.lastSyncAt ? new Date(config.lastSyncAt).toLocaleString() : 'Nenhuma sincronização'}
            </span>
          </div>
          <div className="bg-white/5 p-3 rounded-xl border border-white/10">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Sincronização Auto</span>
            <span className="font-bold text-emerald-400 block mt-0.5">
              {config.autoSync ? `Ativa (${config.syncIntervalMinutes}m)` : 'Manual sob demanda'}
            </span>
          </div>
        </div>
      </div>

      {/* AÇÕES DE SINCRONIZAÇÃO E BACKUP EM NUVEM */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
          <div>
            <h4 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
              <Cloud className="text-emerald-600" size={18} />
              <span>Sincronização & Backup com o Supabase</span>
            </h4>
            <p className="text-xs text-slate-500">
              Exporte todos os dados operacionais para a nuvem ou recupere o último ponto de restauração.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isSyncing}
              onClick={handleSyncToSupabase}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
            >
              <ArrowUpCircle size={16} className={isSyncing ? 'animate-bounce' : ''} />
              <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar com Supabase Agora'}</span>
            </button>

            <button
              type="button"
              disabled={isRestoring}
              onClick={handleRestoreFromSupabase}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
            >
              <ArrowDownCircle size={16} className={isRestoring ? 'animate-spin' : ''} />
              <span>{isRestoring ? 'Restaurando...' : 'Restaurar do Supabase'}</span>
            </button>
          </div>
        </div>

        {/* RECURSOS SINCRONIZADOS */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
            <span className="text-[11px] font-bold text-slate-500 block">Clientes & CRM</span>
            <span className="font-black text-slate-900 text-base mt-0.5 block">
              {Database.getState().customers?.length || 0}
            </span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
            <span className="text-[11px] font-bold text-slate-500 block">Produtos & Estoque</span>
            <span className="font-black text-slate-900 text-base mt-0.5 block">
              {Database.getState().products?.length || 0}
            </span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
            <span className="text-[11px] font-bold text-slate-500 block">Pedidos de Venda</span>
            <span className="font-black text-slate-900 text-base mt-0.5 block">
              {Database.getState().orders?.length || 0}
            </span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
            <span className="text-[11px] font-bold text-slate-500 block">Romaneios de Entrega</span>
            <span className="font-black text-slate-900 text-base mt-0.5 block">
              {Database.getState().deliveryManifests?.length || 0}
            </span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
            <span className="text-[11px] font-bold text-slate-500 block">Rotas de Entrega</span>
            <span className="font-black text-slate-900 text-base mt-0.5 block">
              {Database.getState().deliveryRoutes?.length || 0}
            </span>
          </div>
        </div>
      </div>

      {/* PAINEL DE AUDITORIA DE SEGURANÇA RLS & VULNERABILIDADES */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl border border-rose-900/40 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-white/10 gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center justify-center shrink-0">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h4 className="font-extrabold text-sm sm:text-base text-white flex items-center gap-2">
                <span>Auditoria de Políticas RLS (Row Level Security)</span>
                <span className="text-[10px] bg-rose-500/30 text-rose-300 border border-rose-500/50 px-2 py-0.5 rounded-full font-bold">
                  Vulnerabilidade Corrigida
                </span>
              </h4>
              <p className="text-xs text-slate-300">
                Diagnóstico de segurança das políticas RLS aplicadas no seu projeto Supabase PostgreSQL.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setSqlMode('rls_fix');
              setShowSqlEditor(true);
              handleCopyActiveSql();
            }}
            className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <ShieldCheck size={14} />
            <span>Copiar Script de Correção RLS</span>
          </button>
        </div>

        {/* CARDS DE ANÁLISE DE RISCO */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-white/5 border border-rose-500/30 rounded-xl space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-rose-300">
              <AlertTriangle size={14} />
              <span>1. Risco de Exclusão em Massa (DELETE)</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              <strong>Vulnerabilidade:</strong> A política original <code className="text-rose-300 bg-rose-950/60 px-1 rounded">for all ... using (true)</code> permitia que qualquer usuário público com a chave <code className="text-slate-300">anon</code> executasse <code className="text-rose-300">DELETE</code> em clientes, produtos ou romaneios sem restrição.
            </p>
            <p className="text-emerald-300 text-[11px] font-semibold">
              ✔ <strong>Correção:</strong> As novas políticas removem o comando DELETE anônimo. Exclusões só ocorrem por soft-delete (status inativo) ou por administradores autenticados.
            </p>
          </div>

          <div className="p-3 bg-white/5 border border-amber-500/30 rounded-xl space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-amber-300">
              <AlertTriangle size={14} />
              <span>2. Isolamento de Empresa (company_id)</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              <strong>Vulnerabilidade:</strong> Sem validação de <code className="text-amber-300 bg-amber-950/60 px-1 rounded">company_id</code> no <code className="text-slate-300">WITH CHECK</code>, registros poderiam ser gravados com empresa nula ou com dados de outra filial/empresa.
            </p>
            <p className="text-emerald-300 text-[11px] font-semibold">
              ✔ <strong>Correção:</strong> Obrigatório <code className="text-emerald-300">company_id is not null</code> em todas as inserções e atualizações, garantindo separação multi-empresa.
            </p>
          </div>

          <div className="p-3 bg-white/5 border border-blue-500/30 rounded-xl space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-blue-300">
              <ShieldCheck size={14} />
              <span>3. Integridade do Backup (omni_erp_sync)</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              <strong>Vulnerabilidade:</strong> A tabela universal de sincronização contém o JSONB de todo o ERP e não podia aceitar sobrescrita vazia ou exclusão por terceiros.
            </p>
            <p className="text-emerald-300 text-[11px] font-semibold">
              ✔ <strong>Correção:</strong> Validação rígida que exige <code className="text-emerald-300">state_json is not null</code> e bloqueio de exclusão acidental.
            </p>
          </div>
        </div>
      </div>

      {/* GERADOR DE TABELAS SQL DDL (SUPABASE SQL EDITOR) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
          <div>
            <h4 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
              <FileCode className="text-blue-600" size={18} />
              <span>Scripts SQL Prontos para Execução no Supabase</span>
            </h4>
            <p className="text-xs text-slate-500">
              Selecione o script que deseja executar no <strong>SQL Editor</strong> do seu Supabase:
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyActiveSql}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              {copiedSql ? <Check size={14} /> : <Copy size={14} />}
              <span>{copiedSql ? 'Copiado com Sucesso!' : 'Copiar Script Selecionado'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowSqlEditor(!showSqlEditor)}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              {showSqlEditor ? 'Ocultar Código' : 'Visualizar SQL'}
            </button>
          </div>
        </div>

        {/* ABAS SELETORAS DE SCRIPT SQL */}
        <div className="flex border-b border-slate-200 gap-2">
          <button
            type="button"
            onClick={() => setSqlMode('rls_fix')}
            className={`px-4 py-2.5 text-xs font-extrabold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
              sqlMode === 'rls_fix'
                ? 'border-rose-600 text-rose-700 bg-rose-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck size={14} className="text-rose-600" />
            <span>1. Correção RLS (5 Tabelas Atuais)</span>
            <span className="text-[10px] bg-rose-100 text-rose-800 px-1.5 py-0.2 rounded-full font-bold">
              Urgente
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSqlMode('missing')}
            className={`px-4 py-2.5 text-xs font-extrabold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
              sqlMode === 'missing'
                ? 'border-amber-600 text-amber-700 bg-amber-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers size={14} className="text-amber-600" />
            <span>2. Tabelas Faltantes do ERP (9 Tabelas)</span>
            <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded-full font-bold">
              Pedidos, Financeiro...
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSqlMode('complete')}
            className={`px-4 py-2.5 text-xs font-extrabold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
              sqlMode === 'complete'
                ? 'border-blue-600 text-blue-700 bg-blue-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <DatabaseIcon size={14} className="text-blue-600" />
            <span>3. Script Completo & Seguro (14 Tabelas + RLS)</span>
          </button>
        </div>

        {/* DESCRIÇÃO DA ABA SELECIONADA */}
        <div className="p-3 rounded-xl text-xs border bg-slate-50 border-slate-200">
          {sqlMode === 'rls_fix' && (
            <p className="text-slate-700 leading-relaxed">
              <strong>Finalidade:</strong> Substitui as políticas <code className="text-rose-600">anon_all</code> pelas políticas blindadas nas 5 tabelas já criadas (<code className="text-slate-800">omni_erp_sync</code>, <code className="text-slate-800">customers</code>, <code className="text-slate-800">products</code>, <code className="text-slate-800">delivery_routes</code>, <code className="text-slate-800">delivery_manifests</code>). Não altera os dados existentes, apenas corrige a vulnerabilidade de permissões.
            </p>
          )}
          {sqlMode === 'missing' && (
            <p className="text-slate-700 leading-relaxed">
              <strong>Finalidade:</strong> Cria as tabelas do ERP que ainda não estavam no script inicial: <code className="text-amber-700 font-bold">orders</code> (Pedidos de Venda/PDV), <code className="text-slate-800">companies</code>, <code className="text-slate-800">users</code>, <code className="text-slate-800">suppliers</code>, <code className="text-slate-800">stock_locations</code>, <code className="text-slate-800">production_orders</code>, <code className="text-slate-800">purchase_orders</code>, <code className="text-slate-800">accounts_receivable</code> e <code className="text-slate-800">accounts_payable</code> com RLS seguro.
            </p>
          )}
          {sqlMode === 'complete' && (
            <p className="text-slate-700 leading-relaxed">
              <strong>Finalidade:</strong> Script master com 100% de todas as 14 tabelas do GestãoFácil ERP com DDL completo, tipos compatíveis com PostgreSQL e todas as políticas RLS blindadas desde a primeira execução.
            </p>
          )}
        </div>

        {/* INSTRUÇÕES PASSO A PASSO */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1">
            <div className="font-black text-blue-900 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">1</span>
              <span>Copie o Script SQL</span>
            </div>
            <p className="text-blue-800 text-[11px]">
              Clique no botão azul <strong>"Copiar Script Selecionado"</strong> acima para transferir o código para sua área de transferência.
            </p>
          </div>

          <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1">
            <div className="font-black text-blue-900 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">2</span>
              <span>Abra o SQL Editor no Supabase</span>
            </div>
            <p className="text-blue-800 text-[11px]">
              No menu lateral do painel Supabase, clique em <strong>SQL Editor</strong> e crie uma <em>New Query</em>.
            </p>
          </div>

          <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1">
            <div className="font-black text-blue-900 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">3</span>
              <span>Cole e Execute (RUN)</span>
            </div>
            <p className="text-blue-800 text-[11px]">
              Cole o script e clique no botão verde <strong>RUN</strong>. As tabelas e políticas de segurança serão aplicadas instantaneamente!
            </p>
          </div>
        </div>

        {/* AUDITORIA DE TABELAS DO BANCO DE DADOS EM TEMPO REAL */}
        <div className="pt-2 border-t border-slate-100 space-y-3">
          <div className="flex justify-between items-center">
            <div>
              <h5 className="font-extrabold text-xs text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                <Layers size={14} className="text-emerald-600" />
                <span>Auditoria de Tabelas do ERP no Supabase</span>
              </h5>
              <p className="text-[11px] text-slate-500">
                Checagem em tempo real das tabelas criadas no seu banco de dados Supabase:
              </p>
            </div>

            <div className="text-right">
              <span className="text-xs font-bold text-slate-700">
                {testResult?.existingTables.length || 0} de {testResult?.tablesAudit.length || 18} tabelas ativas
              </span>
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] sticky top-0 border-b border-slate-200">
                <tr>
                  <th className="p-2.5">Nome da Tabela no PostgreSQL</th>
                  <th className="p-2.5">Módulo do ERP</th>
                  <th className="p-2.5">Descrição</th>
                  <th className="p-2.5 text-center">Status no Supabase</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(testResult?.tablesAudit || []).map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="p-2.5 font-mono font-bold text-blue-700">{t.name}</td>
                    <td className="p-2.5 font-semibold text-slate-700">{t.module}</td>
                    <td className="p-2.5 text-slate-600 text-[11px]">{t.label}</td>
                    <td className="p-2.5 text-center">
                      {t.exists ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 size={11} />
                          <span>Criada & Ativa ({t.count} registros)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          <AlertTriangle size={11} />
                          <span>Pendente (Execute o SQL)</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* CAIXA DE CÓDIGO EXPANSÍVEL */}
        {showSqlEditor && (
          <div className="relative rounded-xl overflow-hidden border border-slate-300">
            <div className="bg-slate-900 text-slate-300 px-4 py-2 text-xs font-mono flex justify-between items-center">
              <span>
                {sqlMode === 'rls_fix'
                  ? 'supabase_rls_security_fix.sql'
                  : sqlMode === 'missing'
                  ? 'supabase_missing_erp_tables.sql'
                  : 'gestaofacil_supabase_schema.sql'}
              </span>
              <button
                type="button"
                onClick={handleCopyActiveSql}
                className="text-xs text-blue-400 hover:text-white font-bold flex items-center gap-1 cursor-pointer"
              >
                {copiedSql ? 'Copiado!' : 'Copiar'}
              </button>
            </div>
            <pre className="p-4 bg-slate-950 text-emerald-400 text-xs font-mono max-h-72 overflow-y-auto leading-relaxed select-all">
              {getActiveSqlCode()}
            </pre>
          </div>
        )}
      </div>

      {/* FORMULÁRIO DE CONFIGURAÇÃO DE CREDENCIAIS */}
      <form onSubmit={handleSaveConfig} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
          <div>
            <h4 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
              <Lock className="text-slate-700" size={18} />
              <span>Credenciais e Conexão do Projeto</span>
            </h4>
            <p className="text-xs text-slate-500">
              Parâmetros de conexão fornecidos para autenticação via PostgREST e SDK Oficial.
            </p>
          </div>

          <button
            type="button"
            onClick={handleRestoreDefaultCredentials}
            className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw size={14} />
            <span>Restaurar Padrão Fornecido</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              SUPABASE_URL (Endpoint do Projeto):
            </label>
            <input
              type="text"
              required
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://seu-projeto.supabase.co"
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
            />
            <span className="text-[10px] text-slate-400 block mt-1">
              Aceita formato direto ou com /rest/v1/ (higienizado automaticamente).
            </span>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              SUPABASE_ANON_KEY (Chave Pública Publishable):
            </label>
            <input
              type="text"
              required
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="sb_publishable_..."
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
            />
            <span className="text-[10px] text-slate-400 block mt-1">
              Chave pública anônima para conexões seguras autorizadas via RLS.
            </span>
          </div>
        </div>

        {/* OPÇÕES DE SINCRONIZAÇÃO AUTOMÁTICA */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4 items-center text-xs">
          <div>
            <label className="flex items-center gap-2 font-bold text-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={autoSyncInput}
                onChange={(e) => setAutoSyncInput(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500"
              />
              <span>Ativar Sincronização Automática em Segundo Plano</span>
            </label>
            <p className="text-[11px] text-slate-500 mt-0.5 pl-6">
              Envia periodicamente novos pedidos, clientes e romaneios para o Supabase sem necessidade de clique manual.
            </p>
          </div>

          {autoSyncInput && (
            <div className="flex items-center gap-2">
              <label className="font-bold text-slate-700 shrink-0">Intervalo:</label>
              <select
                value={intervalInput}
                onChange={(e) => setIntervalInput(Number(e.target.value))}
                className="p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800"
              >
                <option value={5}>A cada 5 minutos</option>
                <option value={10}>A cada 10 minutos (Recomendado)</option>
                <option value={30}>A cada 30 minutos</option>
                <option value={60}>A cada 1 hora</option>
              </select>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-2"
          >
            <CheckCircle2 size={16} />
            <span>Salvar Configurações do Supabase</span>
          </button>
        </div>
      </form>
    </div>
  );
};
