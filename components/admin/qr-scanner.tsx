"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import {
  Camera,
  CameraOff,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Users,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  enqueueScan,
  flushQueue,
  getQueuedScans,
} from "@/lib/offline-scan-queue";

interface ScanResult {
  status: string;
  message: string;
  color: string;
  scannedAt?: string;
  guest?: {
    firstName: string;
    lastName: string;
    group?: string | null;
    adultCount?: number;
    childrenCount?: number;
    menuChoice?: string | null;
    allergies?: string[];
    status?: string;
  };
}

interface ScanHistory {
  id: string;
  guestName: string;
  group: string | null;
  adultCount: number;
  childrenCount: number;
  menuChoice: string | null;
  scannedAt: string;
  status: string;
}

interface ScanStats {
  scanned: number;
  totalConfirmed: number;
  remaining: number;
}

export function QRScanner({ eventId }: { eventId: string }) {
  const [scanning, setScanning] = useState(false);
  const [lastResult, setLastResult] = useState<ScanResult | null>(null);
  const [history, setHistory] = useState<ScanHistory[]>([]);
  const [stats, setStats] = useState<ScanStats | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [processing, setProcessing] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastScannedRef = useRef<string>("");
  const cooldownRef = useRef(false);
  const [offlineCount, setOfflineCount] = useState(0);
  const [syncingOffline, setSyncingOffline] = useState(false);

  // Load scan history
  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/scan`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setHistory(data.data.scans);
          setStats(data.data.stats);
        }
      }
    } catch {
      // silent
    }
  }, [eventId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Process a scanned QR code
  const processScan = useCallback(async (decodedText: string) => {
    if (cooldownRef.current) return;
    if (decodedText === lastScannedRef.current) return;

    cooldownRef.current = true;
    lastScannedRef.current = decodedText;
    setProcessing(true);

    // Détection offline préventive : si navigator signale offline, on met direct en queue
    const isOffline = typeof navigator !== "undefined" && navigator.onLine === false;

    if (isOffline) {
      enqueueScan(eventId, decodedText);
      setOfflineCount(getQueuedScans(eventId).length);
      setLastResult({
        status: "QUEUED",
        message: "📡 Hors-ligne — scan sauvegardé localement. Sera synchronisé au retour du réseau.",
        color: "orange",
      });
      setProcessing(false);
      setTimeout(() => {
        cooldownRef.current = false;
        lastScannedRef.current = "";
      }, 3000);
      return;
    }

    try {
      const res = await fetch(`/api/events/${eventId}/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scannedUrl: decodedText }),
      });

      if (res.ok) {
        const data = await res.json();
        setLastResult(data.scan);
        // Refresh history
        loadHistory();
      } else {
        setLastResult({
          status: "ERROR",
          message: "Erreur lors du scan",
          color: "red",
        });
      }
    } catch {
      // Fetch failed → réseau coupé ou serveur inaccessible. On queue.
      enqueueScan(eventId, decodedText);
      setOfflineCount(getQueuedScans(eventId).length);
      setLastResult({
        status: "QUEUED",
        message: "📡 Réseau indisponible — scan sauvegardé. Sync auto au retour.",
        color: "orange",
      });
    } finally {
      setProcessing(false);
      // Cooldown to avoid duplicate scans
      setTimeout(() => {
        cooldownRef.current = false;
        lastScannedRef.current = "";
      }, 3000);
    }
  }, [eventId, loadHistory]);

  // Sync la file offline
  const syncOffline = useCallback(async () => {
    const pending = getQueuedScans(eventId);
    if (pending.length === 0) return;
    setSyncingOffline(true);
    try {
      const { success, failed } = await flushQueue(eventId);
      setOfflineCount(getQueuedScans(eventId).length);
      if (success > 0) {
        setLastResult({
          status: "SYNCED",
          message: `✅ ${success} scan${success > 1 ? "s" : ""} synchronisé${success > 1 ? "s" : ""}${failed > 0 ? ` · ${failed} échec${failed > 1 ? "s" : ""}` : ""}`,
          color: "green",
        });
        loadHistory();
      }
    } finally {
      setSyncingOffline(false);
    }
  }, [eventId, loadHistory]);

  // Au mount + à chaque événement "online", on flush
  useEffect(() => {
    setOfflineCount(getQueuedScans(eventId).length);
    if (typeof window === "undefined") return;
    const handler = () => syncOffline();
    window.addEventListener("online", handler);
    // Flush immédiat si des scans sont déjà en queue
    if (navigator.onLine && getQueuedScans(eventId).length > 0) {
      syncOffline();
    }
    return () => window.removeEventListener("online", handler);
  }, [eventId, syncOffline]);

  // Start camera
  async function startScanning() {
    if (!containerRef.current) return;

    try {
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 280, height: 280 },
          aspectRatio: 1,
        },
        (decodedText) => {
          processScan(decodedText);
        },
        () => {
          // Scan failure — ignored (means no QR found yet)
        }
      );

      setScanning(true);
    } catch (err) {
      console.error("Camera error:", err);
      setLastResult({
        status: "ERROR",
        message: "Impossible d'accéder à la caméra. Vérifiez les permissions.",
        color: "red",
      });
    }
  }

  // Stop camera
  async function stopScanning() {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch {
        // ignore
      }
      scannerRef.current = null;
    }
    setScanning(false);
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const statusIcon = (status: string) => {
    switch (status) {
      case "VALID":
        return <CheckCircle2 className="h-8 w-8 text-green-500" />;
      case "ALREADY_SCANNED":
      case "NOT_CONFIRMED":
        return <AlertTriangle className="h-8 w-8 text-amber-500" />;
      case "INVALID":
      case "DECLINED":
      case "ERROR":
        return <XCircle className="h-8 w-8 text-red-500" />;
      default:
        return null;
    }
  };

  const statusBg = (color: string) => {
    switch (color) {
      case "green":
        return "bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800";
      case "orange":
        return "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800";
      case "red":
        return "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800";
      default:
        return "bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700";
    }
  };

  return (
    <div className="space-y-6">
      {/* Offline queue banner */}
      {offlineCount > 0 && (
        <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 px-4 py-3 flex items-center gap-3">
          <span className="text-lg">📡</span>
          <div className="flex-1 min-w-0 text-xs text-amber-800 dark:text-amber-300">
            <p className="font-semibold">
              {offlineCount} scan{offlineCount > 1 ? "s" : ""} en attente de synchronisation
            </p>
            <p className="opacity-80">Seront envoyés automatiquement au retour du réseau.</p>
          </div>
          <button
            type="button"
            onClick={syncOffline}
            disabled={syncingOffline}
            className="shrink-0 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
          >
            {syncingOffline ? "Sync…" : "Synchroniser"}
          </button>
        </div>
      )}

      {/* Stats bar */}
      {stats && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-green-50 dark:bg-green-900/20 p-4 text-center">
            <p className="text-2xl font-bold text-green-700 dark:text-green-400">{stats.scanned}</p>
            <p className="text-[11px] font-medium text-green-600 dark:text-green-500">Scannés</p>
          </div>
          <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 p-4 text-center">
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{stats.totalConfirmed}</p>
            <p className="text-[11px] font-medium text-blue-600 dark:text-blue-500">Confirmés</p>
          </div>
          <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 p-4 text-center">
            <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{stats.remaining}</p>
            <p className="text-[11px] font-medium text-amber-600 dark:text-amber-500">Restants</p>
          </div>
        </div>
      )}

      {/* Camera area */}
      <div className="rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-black overflow-hidden relative">
        <div
          id="qr-reader"
          ref={containerRef}
          className={`w-full ${scanning ? "" : "hidden"}`}
          style={{ minHeight: scanning ? "350px" : "0" }}
        />

        {!scanning && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="rounded-full bg-white/10 p-6 mb-4">
              <Camera className="h-12 w-12 text-white/60" />
            </div>
            <p className="text-white/70 text-sm mb-6">
              Pointez la caméra vers le QR code de l&apos;invité
            </p>
            <button
              onClick={startScanning}
              className="inline-flex items-center gap-2 rounded-xl bg-[#88734C] px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-[#6b5a3a]"
            >
              <Camera className="h-5 w-5" />
              Activer le scanner
            </button>
          </div>
        )}

        {scanning && (
          <div className="absolute top-3 right-3 z-10">
            <button
              onClick={stopScanning}
              className="rounded-xl bg-red-500/90 backdrop-blur-sm px-3 py-2 text-sm font-medium text-white hover:bg-red-600 transition"
            >
              <CameraOff className="h-4 w-4 inline mr-1.5" />
              Arrêter
            </button>
          </div>
        )}

        {/* Processing indicator */}
        {processing && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
            <div className="flex items-center gap-2 rounded-xl bg-white px-5 py-3 shadow-xl">
              <RefreshCw className="h-5 w-5 animate-spin text-[#88734C]" />
              <span className="text-sm font-medium text-gray-900">Vérification...</span>
            </div>
          </div>
        )}
      </div>

      {/* Scan Result */}
      {lastResult && (
        <div className={`rounded-2xl border-2 p-6 transition-all ${statusBg(lastResult.color)}`}>
          <div className="flex items-start gap-4">
            {statusIcon(lastResult.status)}
            <div className="flex-1 min-w-0">
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {lastResult.message}
              </p>

              {/* Guest details */}
              {lastResult.guest && (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {lastResult.guest.group && (
                    <div className="rounded-xl bg-white/80 dark:bg-gray-800/80 px-4 py-2.5">
                      <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">Groupe</p>
                      <p className="font-semibold text-gray-900 dark:text-white">{lastResult.guest.group}</p>
                    </div>
                  )}
                  {(lastResult.guest.adultCount || lastResult.guest.childrenCount) && (
                    <div className="rounded-xl bg-white/80 dark:bg-gray-800/80 px-4 py-2.5">
                      <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">Places</p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        <Users className="h-4 w-4 inline mr-1" />
                        {lastResult.guest.adultCount || 0} adulte{(lastResult.guest.adultCount || 0) > 1 ? "s" : ""}
                        {(lastResult.guest.childrenCount || 0) > 0 && ` + ${lastResult.guest.childrenCount} enfant${lastResult.guest.childrenCount! > 1 ? "s" : ""}`}
                      </p>
                    </div>
                  )}
                  {lastResult.guest.menuChoice && (
                    <div className="rounded-xl bg-white/80 dark:bg-gray-800/80 px-4 py-2.5">
                      <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">Menu</p>
                      <p className="font-semibold text-gray-900 dark:text-white capitalize">🍽️ {lastResult.guest.menuChoice}</p>
                    </div>
                  )}
                  {lastResult.guest.allergies && lastResult.guest.allergies.length > 0 && (
                    <div className="rounded-xl bg-red-50/80 dark:bg-red-950/30 px-4 py-2.5 border border-red-100 dark:border-red-800">
                      <p className="text-[11px] font-medium uppercase tracking-wider text-red-400">⚠️ Allergies</p>
                      <p className="font-semibold text-red-700 dark:text-red-300">{lastResult.guest.allergies.join(", ")}</p>
                    </div>
                  )}
                </div>
              )}

              {lastResult.scannedAt && (
                <p className="mt-3 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(lastResult.scannedAt).toLocaleTimeString("fr-FR")}
                </p>
              )}
            </div>
          </div>

          {/* Dismiss */}
          <button
            onClick={() => setLastResult(null)}
            className="mt-4 w-full rounded-xl bg-gray-900/10 dark:bg-white/10 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-900/20 dark:hover:bg-white/20 transition"
          >
            Scanner le suivant
          </button>
        </div>
      )}

      {/* Scan History */}
      <div>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="flex w-full items-center justify-between rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 px-5 py-3 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition"
        >
          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            Historique des scans ({history.length})
          </span>
          {showHistory ? (
            <ChevronUp className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          )}
        </button>

        {showHistory && history.length > 0 && (
          <div className="mt-2 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm divide-y divide-gray-50 dark:divide-gray-800">
            {history.map((scan) => (
              <div key={scan.id} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-green-500 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {scan.guestName}
                    </p>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500">
                      {scan.group && `${scan.group} · `}
                      {scan.adultCount}A{scan.childrenCount > 0 ? ` + ${scan.childrenCount}E` : ""}
                      {scan.menuChoice && ` · ${scan.menuChoice}`}
                    </p>
                  </div>
                </div>
                <span className="text-[11px] text-gray-400 dark:text-gray-500">
                  {new Date(scan.scannedAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ))}
          </div>
        )}

        {showHistory && history.length === 0 && (
          <div className="mt-2 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-8 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">Aucun scan enregistré</p>
          </div>
        )}
      </div>
    </div>
  );
}
