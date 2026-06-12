import { ToastMessage } from '../types';

type ToastViewportProps = {
  messages: ToastMessage[];
};

export function ToastViewport({ messages }: ToastViewportProps) {
  return (
    <div className="toast-region" aria-live="polite" aria-atomic="true">
      {messages.map((toast) => (
        <div className={`toast toast-${toast.tone ?? 'info'}`} key={toast.id} role="status">
          {toast.message}
        </div>
      ))}
    </div>
  );
}
