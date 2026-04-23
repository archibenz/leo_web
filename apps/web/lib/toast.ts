export type ToastKind = 'info' | 'error' | 'success';

export type Toast = {
  id: string;
  kind: ToastKind;
  messageKey?: string;
  message?: string;
  duration: number;
};

type Listener = (toasts: readonly Toast[]) => void;

let activeToasts: Toast[] = [];
const listeners = new Set<Listener>();

function notify(): void {
  const snapshot = [...activeToasts];
  for (const listener of listeners) listener(snapshot);
}

export function subscribeToasts(listener: Listener): () => void {
  listeners.add(listener);
  listener([...activeToasts]);
  return () => {
    listeners.delete(listener);
  };
}

export type ShowToastInput = {
  kind?: ToastKind;
  messageKey?: string;
  message?: string;
  duration?: number;
};

export function showToast(input: ShowToastInput): string {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const toast: Toast = {
    id,
    kind: input.kind ?? 'info',
    messageKey: input.messageKey,
    message: input.message,
    duration: input.duration ?? 5000,
  };
  activeToasts = [...activeToasts, toast];
  notify();
  if (toast.duration > 0 && typeof window !== 'undefined') {
    window.setTimeout(() => dismissToast(id), toast.duration);
  }
  return id;
}

export function dismissToast(id: string): void {
  const next = activeToasts.filter(t => t.id !== id);
  if (next.length === activeToasts.length) return;
  activeToasts = next;
  notify();
}
