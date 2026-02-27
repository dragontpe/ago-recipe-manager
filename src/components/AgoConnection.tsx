import { useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { useAppStore } from "../lib/store";
import { AgoPrograms } from "./AgoPrograms";

function normalizeSsid(value: string): string {
  return value.replace(/^"+|"+$/g, "").trim().toLowerCase();
}

function isAgoSsidMatch(currentSsid: string, targetSsid: string): boolean {
  const current = normalizeSsid(currentSsid);
  const target = normalizeSsid(targetSsid);
  if (!current || !target) return false;
  return current === target || current.includes(target) || target.includes(current);
}

async function probeAgoIp(ip: string): Promise<boolean> {
  try {
    return await invoke<boolean>("wifi_probe_ago", {
      ip,
    });
  } catch {
    return false;
  }
}

export function AgoConnection() {
  const {
    wifiStatus,
    currentSsid,
    previousSsid,
    wifiInterface,
    settings,
    setWifiStatus,
    setCurrentSsid,
    setPreviousSsid,
    setWifiInterface,
    showToast,
  } = useAppStore();

  const pollRef = useRef<ReturnType<typeof setInterval>>(undefined);

  // Detect WiFi interface on mount
  useEffect(() => {
    invoke<string>("wifi_get_interface")
      .then(setWifiInterface)
      .catch(() => setWifiInterface(""));
  }, [setWifiInterface]);

  // Poll connection status. Prefer SSID check when interface is available,
  // otherwise fall back to AGO IP probe so manual joins are still recognized.
  useEffect(() => {
    const check = async () => {
      const agoIp = settings.ago_ip || "10.10.10.1";
      const agoSsid = settings.ago_ssid || "AGO";

      if (!wifiInterface) {
        const reachable = await probeAgoIp(agoIp);
        setWifiStatus(reachable ? "connected" : "disconnected");
        if (!reachable) {
          setCurrentSsid("");
        }
        return;
      }

      try {
        const ssid = await invoke<string>("wifi_get_current_network", {
          interface: wifiInterface,
        });
        setCurrentSsid(ssid);
        if (isAgoSsidMatch(ssid, agoSsid)) {
          setWifiStatus("connected");
          return;
        }

        const reachable = await probeAgoIp(agoIp);
        setWifiStatus(reachable ? "connected" : "disconnected");
      } catch {
        setCurrentSsid("");
        const reachable = await probeAgoIp(agoIp);
        setWifiStatus(reachable ? "connected" : "disconnected");
      }
    };

    check();
    pollRef.current = setInterval(check, 3000);
    return () => clearInterval(pollRef.current);
  }, [wifiInterface, settings.ago_ip, settings.ago_ssid, setCurrentSsid, setWifiStatus]);

  const handleConnect = async () => {
    const targetSsid = settings.ago_ssid || "AGO";
    const targetIp = settings.ago_ip || "10.10.10.1";

    if (!wifiInterface) {
      if (await probeAgoIp(targetIp)) {
        setWifiStatus("connected");
        showToast("AGO is reachable");
        return;
      }
      showToast("WiFi interface not found", "error");
      return;
    }

    // If user already switched manually, treat as connected.
    if (isAgoSsidMatch(currentSsid, targetSsid)) {
      setWifiStatus("connected");
      showToast("Already connected to AGO");
      return;
    }
    if (await probeAgoIp(targetIp)) {
      setWifiStatus("connected");
      showToast("AGO is reachable");
      return;
    }

    // Save current SSID before switching
    if (currentSsid && !isAgoSsidMatch(currentSsid, targetSsid)) {
      setPreviousSsid(currentSsid);
    }

    setWifiStatus("connecting");
    try {
      await invoke("wifi_connect", {
        interface: wifiInterface,
        ssid: targetSsid,
        password: settings.ago_password || "12345678",
      });
      // Polling will update status
      showToast("Connected to AGO");
    } catch (e) {
      // One more read in case connection happened but command returned a benign error.
      try {
        const ssid = await invoke<string>("wifi_get_current_network", {
          interface: wifiInterface,
        });
        setCurrentSsid(ssid);
        if (isAgoSsidMatch(ssid, targetSsid)) {
          setWifiStatus("connected");
          showToast("Connected to AGO");
          return;
        }
      } catch {
        // Ignore secondary read errors and report original failure.
      }
      if (await probeAgoIp(targetIp)) {
        setWifiStatus("connected");
        showToast("Connected to AGO");
        return;
      }
      setWifiStatus("disconnected");
      showToast(`Connection failed: ${e}`, "error");
    }
  };

  const handleDisconnect = async () => {
    if (!wifiInterface) return;

    setWifiStatus("connecting");
    try {
      const shouldAutoReconnect = settings.auto_reconnect === "true";
      if (shouldAutoReconnect && previousSsid) {
        await invoke("wifi_reconnect", {
          interface: wifiInterface,
          ssid: previousSsid,
          password: "",
        });
        showToast(`Reconnected to ${previousSsid}`);
      } else {
        showToast("Disconnected from AGO. Reconnect to your WiFi manually.", "info");
      }
    } catch {
      showToast("Failed to reconnect", "error");
    }
    setWifiStatus("disconnected");
  };

  const openAgoInterface = async () => {
    const ip = settings.ago_ip || "10.10.10.1";
    try {
      const existing = await WebviewWindow.getByLabel("ago-web");
      if (existing) {
        await existing.setFocus();
        return;
      }
    } catch {
      // Window doesn't exist, create it
    }

    new WebviewWindow("ago-web", {
      url: `http://${ip}`,
      title: "AGO Web Interface",
      width: 900,
      height: 600,
    });
  };

  return (
    <div className="max-w-xl mx-auto p-6">
      <h2 className="text-2xl font-semibold mb-6">AGO Connection</h2>

      {/* Status card */}
      <div className="bg-(--color-surface-secondary) border border-(--color-border) rounded-xl p-5 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <span
            className={`w-3 h-3 rounded-full ${
              wifiStatus === "connected"
                ? "bg-(--color-success)"
                : wifiStatus === "connecting"
                  ? "bg-(--color-warning) animate-pulse"
                  : "bg-(--color-text-tertiary)"
            }`}
          />
          <span className="text-lg font-medium">
            {wifiStatus === "connected"
              ? "Connected to AGO"
              : wifiStatus === "connecting"
                ? "Connecting..."
                : "Disconnected"}
          </span>
        </div>

        {currentSsid && (
          <p className="text-sm text-(--color-text-secondary) mb-3">
            Current network: <span className="font-mono">{currentSsid}</span>
          </p>
        )}

        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="rounded-md border border-(--color-border) bg-(--color-surface) px-2.5 py-2">
            <p className="text-[11px] uppercase tracking-wide text-(--color-text-tertiary)">AGO SSID</p>
            <p className="text-sm font-mono text-(--color-text-primary)">
              {settings.ago_ssid || "AGO"}
            </p>
          </div>
          <div className="rounded-md border border-(--color-border) bg-(--color-surface) px-2.5 py-2">
            <p className="text-[11px] uppercase tracking-wide text-(--color-text-tertiary)">AGO IP</p>
            <p className="text-sm font-mono text-(--color-text-primary)">
              {settings.ago_ip || "10.10.10.1"}
            </p>
          </div>
        </div>

        {!wifiInterface && (
          <p className="text-sm text-(--color-warning) mb-3">
            WiFi interface not detected. Make sure WiFi is enabled.
          </p>
        )}

        <div className="flex gap-3">
          {wifiStatus !== "connected" ? (
            <button
              onClick={handleConnect}
              disabled={wifiStatus === "connecting" || !wifiInterface}
              className="px-4 py-2 bg-(--color-accent) text-white rounded-lg text-sm font-medium hover:bg-(--color-accent-hover) transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Connect to AGO
            </button>
          ) : (
            <button
              onClick={handleDisconnect}
              className="px-4 py-2 bg-(--color-surface-hover) text-(--color-text-primary) border border-(--color-border) rounded-lg text-sm font-medium hover:bg-(--color-border) transition-colors"
            >
              Disconnect
            </button>
          )}
        </div>
      </div>

      {/* Warning about internet */}
      <div className="bg-(--color-warning)/10 border border-(--color-warning)/30 rounded-lg p-4 mb-6">
        <p className="text-sm text-(--color-text-primary)">
          <strong>Note:</strong> While connected to the AGO, you won't have
          internet access. The AGO creates its own local WiFi network for
          communication only.
        </p>
      </div>

      {/* AGO Web Interface */}
      <div className="bg-(--color-surface-secondary) border border-(--color-border) rounded-xl p-5">
        <h3 className="text-lg font-medium mb-2">AGO Web Interface</h3>
        <p className="text-sm text-(--color-text-secondary) mb-4">
          Open the AGO's built-in configurator to manage programs, update
          firmware, or access advanced settings.
        </p>
        <button
          onClick={openAgoInterface}
          disabled={wifiStatus !== "connected"}
          className="px-4 py-2 bg-(--color-surface-hover) text-(--color-text-primary) border border-(--color-border) rounded-lg text-sm font-medium hover:bg-(--color-border) transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Open AGO Interface
        </button>
        {wifiStatus !== "connected" && (
          <div className="mt-2 flex items-center gap-2">
            <p className="text-xs text-(--color-text-tertiary)">
              Connect to AGO WiFi first to access the web interface.
            </p>
            <button
              onClick={handleConnect}
              disabled={wifiStatus === "connecting" || !wifiInterface}
              className="px-2 py-1 text-xs rounded-md bg-(--color-accent) text-white hover:bg-(--color-accent-hover) disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Connect
            </button>
          </div>
        )}
      </div>

      {/* Programs on AGO */}
      <AgoPrograms />

      {/* Manual instructions fallback */}
      <details className="mt-6">
        <summary className="text-sm text-(--color-text-secondary) cursor-pointer hover:text-(--color-text-primary)">
          Manual connection instructions
        </summary>
        <div className="mt-2 p-4 bg-(--color-surface-secondary) rounded-lg text-sm text-(--color-text-secondary) space-y-1">
          <p>1. Enable WiFi on your AGO device</p>
          <p>
            2. On your Mac, join WiFi network:{" "}
            <span className="font-mono">{settings.ago_ssid || "AGO"}</span>
          </p>
          <p>
            3. Password:{" "}
            <span className="font-mono">
              {settings.ago_password || "12345678"}
            </span>
          </p>
          <p>
            4. Open browser to:{" "}
            <span className="font-mono">
              http://{settings.ago_ip || "10.10.10.1"}
            </span>
          </p>
        </div>
      </details>
    </div>
  );
}
