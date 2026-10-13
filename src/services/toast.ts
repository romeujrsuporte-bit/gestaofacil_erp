// Sistema Global de Notificações / Toast
export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  createdAt: number;
}

type ToastListener = (toasts: ToastItem[]) => void;

class ToastService {
  private toasts: ToastItem[] = [];
  private listeners: Set<ToastListener> = new Set();
  private isInitialized = false;

  constructor() {
    this.initAlertInterceptor();
  }

  public subscribe(listener: ToastListener): () => void {
    this.listeners.add(listener);
    listener([...this.toasts]);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const list = [...this.toasts];
    this.listeners.forEach((listener) => {
      try {
        listener(list);
      } catch (e) {
        console.error('Error notifying toast listener:', e);
      }
    });
  }

  public show(options: {
    type?: ToastType;
    title?: string;
    message?: string;
    duration?: number;
  }): string {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const duration = options.duration ?? (options.type === 'error' ? 7000 : 5000);

    const type = options.type || 'info';
    let title = options.title;

    if (!title) {
      switch (type) {
        case 'success':
          title = 'Sucesso!';
          break;
        case 'error':
          title = 'Atenção / Erro';
          break;
        case 'warning':
          title = 'Aviso do Sistema';
          break;
        default:
          title = 'Notificação';
      }
    }

    const newToast: ToastItem = {
      id,
      type,
      title,
      message: options.message,
      duration,
      createdAt: Date.now(),
    };

    // Adiciona e mantém no máximo 4 toasts simultâneos
    this.toasts = [newToast, ...this.toasts.slice(0, 3)];
    this.notify();

    if (duration > 0) {
      setTimeout(() => {
        this.dismiss(id);
      }, duration);
    }

    return id;
  }

  public success(message: string, title?: string, duration?: number): string {
    return this.show({ type: 'success', title: title || 'Operação Concluída com Sucesso', message, duration });
  }

  public error(message: string, title?: string, duration?: number): string {
    return this.show({ type: 'error', title: title || 'Atenção / Erro', message, duration });
  }

  public warning(message: string, title?: string, duration?: number): string {
    return this.show({ type: 'warning', title: title || 'Aviso do Sistema', message, duration });
  }

  public info(message: string, title?: string, duration?: number): string {
    return this.show({ type: 'info', title: title || 'Informação do Sistema', message, duration });
  }

  public dismiss(id: string) {
    this.toasts = this.toasts.filter((t) => t.id !== id);
    this.notify();
  }

  public clearAll() {
    this.toasts = [];
    this.notify();
  }

  /**
   * Substitui window.alert para garantir que avisos e confirmações nunca sejam
   * suprimidos em ambientes sandbox/iframe ou bloqueados pelo navegador.
   */
  public initAlertInterceptor() {
    if (this.isInitialized || typeof window === 'undefined') return;
    this.isInitialized = true;

    try {
      const originalAlert = window.alert;
      window.alert = (message?: any) => {
        const text = String(message ?? '');
        const lower = text.toLowerCase();

        let type: ToastType = 'info';
        let defaultTitle = 'Notificação do Sistema';

        if (
          lower.includes('sucesso') ||
          lower.includes('concluíd') ||
          lower.includes('atualizado') ||
          lower.includes('salvo') ||
          lower.includes('gravado') ||
          lower.includes('êxito')
        ) {
          type = 'success';
          defaultTitle = 'Ação Concluída com Sucesso';
        } else if (
          lower.includes('erro') ||
          lower.includes('falha') ||
          lower.includes('inválid') ||
          lower.includes('negado') ||
          lower.includes('insuficiente')
        ) {
          type = 'error';
          defaultTitle = 'Atenção';
        } else if (
          lower.includes('aviso') ||
          lower.includes('atenção') ||
          lower.includes('obrigatório') ||
          lower.includes('preencha') ||
          lower.includes('informe') ||
          lower.includes('selecione')
        ) {
          type = 'warning';
          defaultTitle = 'Aviso Importante';
        }

        // Se o texto tiver múltiplas linhas, usa a primeira como título se fizer sentido
        const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
        if (lines.length > 1) {
          this.show({
            type,
            title: lines[0],
            message: lines.slice(1).join(' '),
          });
        } else {
          this.show({
            type,
            title: defaultTitle,
            message: text,
          });
        }

        // Tenta chamar o alert original apenas se não bloquear, sem propagar erro se falhar em iframe
        try {
          // Em iframes com sandbox, originalAlert pode gerar erro ou travar. Apenas logamos no console.
          console.log(`[OmniNotification] (${type}):`, text);
        } catch {
          // ignora
        }
      };
    } catch (e) {
      console.warn('Could not intercept window.alert:', e);
    }
  }
}

export const toast = new ToastService();
