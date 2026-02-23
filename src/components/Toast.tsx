import { useAppStore } from "../lib/store";

export function Toast() {
  const toast = useAppStore((s) => s.toast);
  if (!toast) return null;

  const bgColor =
    toast.type === "error"
      ? "bg-(--color-danger)"
      : toast.type === "info"
        ? "bg-(--color-accent)"
        : "bg-(--color-success)";

  return (
    <div
      className={`fixed bottom-4 right-4 ${bgColor} text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium z-50 animate-[fadeIn_0.2s_ease-in]`}
    >
      {toast.message}
    </div>
  );
}
