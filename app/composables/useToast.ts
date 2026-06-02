export type ToastVariant = 'success' | 'error' | 'info'

export interface Toast {
  id: number
  message: string
  variant: ToastVariant
}

/**
 * Global, non-blocking toast notifications. State is shared via useState so any
 * component can push a toast and the single <ToastHost> renders them. Toasts are
 * only created from client-side handlers, so the auto-dismiss timer is client-only.
 */
export function useToast() {
  const toasts = useState<Toast[]>('toasts', () => [])
  const seq = useState<number>('toast-seq', () => 0)

  function dismiss(id: number) {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }

  function push(message: string, variant: ToastVariant, timeout: number) {
    const id = ++seq.value
    toasts.value = [...toasts.value, { id, message, variant }]
    if (import.meta.client && timeout > 0) {
      window.setTimeout(() => dismiss(id), timeout)
    }
    return id
  }

  return {
    toasts,
    dismiss,
    success: (message: string, timeout = 3000) => push(message, 'success', timeout),
    error: (message: string, timeout = 5000) => push(message, 'error', timeout),
    info: (message: string, timeout = 3500) => push(message, 'info', timeout),
  }
}
