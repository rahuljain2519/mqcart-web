"use client";

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-5">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-surface p-5">
        <p className="font-medium text-lg">{title}</p>
        <p className="text-sm text-muted mt-2">{message}</p>
        <div className="flex gap-3 mt-5">
          <button
            onClick={onConfirm}
            className="flex-1 rounded-full bg-accent text-white px-4 py-2 text-sm font-medium hover:bg-accent/90 transition-colors"
          >
            {confirmLabel}
          </button>
          <button
            onClick={onCancel}
            className="flex-1 rounded-full border border-line px-4 py-2 text-sm font-medium hover:border-ink/40"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
