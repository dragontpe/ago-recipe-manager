import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useAppStore } from "../lib/store";

interface AgoProgram {
  filename: string;
  display_name: string;
}

export function AgoPrograms() {
  const settings = useAppStore((s) => s.settings);
  const wifiStatus = useAppStore((s) => s.wifiStatus);
  const showToast = useAppStore((s) => s.showToast);
  const [programs, setPrograms] = useState<AgoProgram[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const ip = settings.ago_ip || "10.10.10.1";

  const fetchPrograms = async () => {
    setLoading(true);
    try {
      const result = await invoke<AgoProgram[]>("list_ago_programs", { ip });
      setPrograms(result);
      setLoaded(true);
    } catch (e) {
      showToast(`Failed to list programs: ${e}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (filename: string) => {
    setDeleting(filename);
    try {
      await invoke<string>("delete_ago_program", { ip, filename });
      setPrograms((prev) => prev.filter((p) => p.filename !== filename));
      showToast("Program deleted from AGO");
    } catch (e) {
      showToast(`Delete failed: ${e}`, "error");
    } finally {
      setDeleting(null);
      setDeleteConfirm(null);
    }
  };

  if (wifiStatus !== "connected") return null;

  return (
    <div className="bg-(--color-surface-secondary) border border-(--color-border) rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-medium">Programs on AGO</h3>
        <button
          onClick={fetchPrograms}
          disabled={loading}
          className="px-3 py-1.5 text-sm rounded-lg border border-(--color-border) text-(--color-text-secondary) hover:bg-(--color-surface-hover) transition-colors disabled:opacity-50"
        >
          {loading ? "Loading..." : loaded ? "Refresh" : "Load Programs"}
        </button>
      </div>

      {!loaded && !loading && (
        <p className="text-sm text-(--color-text-tertiary)">
          Load programs to see what's currently on your AGO.
        </p>
      )}

      {loaded && programs.length === 0 && (
        <p className="text-sm text-(--color-text-tertiary)">
          No custom programs found on the AGO.
        </p>
      )}

      {programs.length > 0 && (
        <div className="space-y-1.5">
          {programs.map((prog) => (
            <div
              key={prog.filename}
              className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-(--color-surface) border border-(--color-border)"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-(--color-text-primary) truncate">
                  {prog.display_name}
                </p>
                <p className="text-xs text-(--color-text-tertiary) font-mono truncate">
                  {prog.filename}
                </p>
              </div>

              {deleteConfirm === prog.filename ? (
                <div className="flex items-center gap-1.5 ml-3 shrink-0">
                  <span className="text-xs text-(--color-text-secondary)">Delete?</span>
                  <button
                    onClick={() => handleDelete(prog.filename)}
                    disabled={deleting === prog.filename}
                    className="px-2.5 py-1 text-xs rounded-md bg-(--color-danger) text-white hover:opacity-90 disabled:opacity-50"
                  >
                    {deleting === prog.filename ? "..." : "Yes"}
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="px-2.5 py-1 text-xs rounded-md border border-(--color-border) hover:bg-(--color-surface-hover)"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setDeleteConfirm(prog.filename)}
                  className="ml-3 shrink-0 p-1.5 rounded-md text-(--color-text-tertiary) hover:text-(--color-danger) hover:bg-(--color-danger)/10 transition-colors"
                  title="Delete from AGO"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
