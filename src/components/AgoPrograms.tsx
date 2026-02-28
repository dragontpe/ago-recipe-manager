import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useAppStore } from "../lib/store";
import {
  fetchAgoUploads,
  deleteAgoUpload,
  deleteAgoUploadsByFilename,
  type AgoUpload,
} from "../lib/db";

interface AgoDeviceProgram {
  filename: string;
  name: string;
  expandedTitle?: string;
  expanded_title?: string;
}

interface AgoProgramRow extends AgoUpload {
  local_id?: string;
}

function formatProgramDisplayName(program: AgoDeviceProgram, fallback: string): string {
  const base = (program.name || "").trim();
  const expanded = (program.expandedTitle ?? program.expanded_title ?? "").trim();

  if (base && expanded) {
    if (expanded.startsWith("-")) {
      return `${base} ${expanded.slice(1).trim()}`.trim();
    }
    return `${base} ${expanded}`.trim();
  }

  return base || fallback;
}

export function AgoPrograms() {
  const settings = useAppStore((s) => s.settings);
  const wifiStatus = useAppStore((s) => s.wifiStatus);
  const showToast = useAppStore((s) => s.showToast);
  const [uploads, setUploads] = useState<AgoProgramRow[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [deviceListError, setDeviceListError] = useState<string | null>(null);

  const ip = settings.ago_ip || "10.10.10.1";

  useEffect(() => {
    let cancelled = false;

    async function loadPrograms() {
      setLoading(true);
      setDeviceListError(null);

      try {
        const localUploads = await fetchAgoUploads();

        if (wifiStatus === "connected") {
          try {
            const devicePrograms = await invoke<AgoDeviceProgram[]>("list_ago_programs", { ip });
            if (cancelled) return;

            const localByFilename = new Map(localUploads.map((u) => [u.filename, u]));
            const rows: AgoProgramRow[] = devicePrograms.map((program) => {
              const local = localByFilename.get(program.filename);
              return {
                id: program.filename,
                recipe_id: local?.recipe_id ?? null,
                filename: program.filename,
                display_name: formatProgramDisplayName(
                  program,
                  local?.display_name || program.filename
                ),
                uploaded_at: local?.uploaded_at ?? "",
                local_id: local?.id,
              };
            });

            setUploads(rows);
            return;
          } catch (e) {
            if (cancelled) return;
            setDeviceListError(String(e));
          }
        }

        if (!cancelled) {
          setUploads(localUploads.map((u) => ({ ...u, local_id: u.id })));
        }
      } catch (e) {
        if (!cancelled) {
          setUploads([]);
          setDeviceListError(String(e));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadPrograms();
    return () => {
      cancelled = true;
    };
  }, [ip, wifiStatus]);

  const handleDelete = async (upload: AgoProgramRow) => {
    setDeleting(upload.id);
    try {
      if (wifiStatus === "connected") {
        await invoke<string>("delete_ago_program", {
          ip,
          filename: upload.filename,
        });
        await deleteAgoUploadsByFilename(upload.filename);
        setUploads((prev) => prev.filter((u) => u.id !== upload.id));
        showToast("Program deleted from AGO");
      } else {
        if (upload.local_id) {
          await deleteAgoUpload(upload.local_id);
        }
        setUploads((prev) => prev.filter((u) => u.id !== upload.id));
        showToast("Removed from local list");
      }
    } catch (e) {
      showToast(`Delete failed: ${e}`, "error");
    } finally {
      setDeleting(null);
      setDeleteConfirm(null);
    }
  };

  return (
    <div className="bg-(--color-surface-secondary) border border-(--color-border) rounded-xl p-5">
      <h3 className="text-lg font-medium mb-3">Uploaded Programs</h3>
      <p className="text-sm text-(--color-text-tertiary) mb-3">
        {wifiStatus === "connected"
          ? "All custom programs currently on the AGO device."
          : "Offline view: recent programs uploaded from this app."}
      </p>
      {deviceListError && wifiStatus === "connected" && (
        <p className="text-xs text-(--color-text-tertiary) mb-3">
          Could not read full AGO list, showing local records only.
        </p>
      )}
      <div className="space-y-1.5">
        {loading && uploads.length === 0 && (
          <p className="text-sm text-(--color-text-tertiary)">Loading programs...</p>
        )}
        {uploads.map((upload) => (
          <div
            key={upload.id}
            className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-(--color-surface) border border-(--color-border)"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-(--color-text-primary) truncate">
                {upload.display_name}
              </p>
              <p className="text-xs text-(--color-text-tertiary) font-mono truncate">
                {upload.filename}
                {upload.uploaded_at ? (
                  <span className="ml-2 font-sans">
                    {new Date(upload.uploaded_at).toLocaleDateString()}
                  </span>
                ) : (
                  <span className="ml-2 font-sans">On device</span>
                )}
              </p>
            </div>

            {deleteConfirm === upload.id ? (
              <div className="flex items-center gap-1.5 ml-3 shrink-0">
                <span className="text-xs text-(--color-text-secondary)">
                  {wifiStatus === "connected" ? "Delete from AGO?" : "Remove from list?"}
                </span>
                <button
                  onClick={() => handleDelete(upload)}
                  disabled={deleting === upload.id}
                  className="px-2.5 py-1 text-xs rounded-md bg-(--color-danger) text-white hover:opacity-90 disabled:opacity-50"
                >
                  {deleting === upload.id ? "..." : "Yes"}
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
                onClick={() => setDeleteConfirm(upload.id)}
                className="ml-3 shrink-0 p-1.5 rounded-md text-(--color-text-tertiary) hover:text-(--color-danger) hover:bg-(--color-danger)/10 transition-colors"
                title={wifiStatus === "connected" ? "Delete from AGO" : "Remove from list"}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
