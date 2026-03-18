"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Users,
  Clock,
  RefreshCw,
  Shield,
  ShieldCheck,
  Camera,
  CameraOff,
} from "lucide-react";

interface EventInfo {
  title: string;
  type: string;
  date: string;
}

interface ControllerInfo {
  label: string;
  permission: "VERIFY" | "SCAN";
}

interface Stats {
  totalGuests: number;
  totalConfirmed: number;
  totalScanned: number;
  remaining: number;
}

interface VerifyResult {
  status: string;
  message: string;
  color: string;
  recorded?: boolean;
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

export default function VerifyPage({ token }: { token: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [event, setEvent] = useState<EventInfo | null>(null);
  const [controller, setController] = useState<ControllerInfo | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [query, setQuery] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load event info
  const loadEventInfo = useCallback(async () => {
    try {
      const res = await fetch(`/api/verify/${token}`);
      const data = await res.json();

      if (!data.success) {
        setError(data.error || "Lien invalide");
        return;
      }

      setEvent(data.data.event);
      setController(data.data.controller);
      setStats(data.data.stats);
    } catch {
      setError("Erreur de connexion");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadEventInfo();
  }, [loadEventInfo]);

  // Refresh stats every 15 seconds
  useEffect(() => {
    if (!event) return;
    const interval = setInterval(loadEventInfo, 15000);
    return () => clearInterval(interval);
  }, [event, loadEventInfo]);

  // Verify / scan a guest
  async function handleVerify(searchQuery?: string, action?: string) {
    const q = searchQuery || query;
    if (!q.trim()) return;

    setVerifying(true);
    setResult(null);

    try {
      const res = await fetch(`/api/verify/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: q.trim(),
          action: action || (controller?.permission === "SCAN" ? "scan" : "verify"),
        }),
      });

      const data = await res.json();

      if (data.success) {
        setResult(data.result);
        // Refresh stats after scan
        loadEventInfo();
      } else {
        setResult({
          status: "ERROR",
          message: data.error || "Erreur de vérification",
          color: "red",
        });
      }
    } catch {
      setResult({
        status: "ERROR",
        message: "Erreur de connexion",
        color: "red",
      });
    } finally {
      setVerifying(false);
    }
  }

  // QR scanner using native camera
  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setScanning(true);

      // Start scanning loop using BarcodeDetector if available, otherwise just capture frames
      if ("BarcodeDetector" in window) {
        // @ts-expect-error BarcodeDetector is not in all TS types
        const detector = new BarcodeDetector({ formats: ["qr_code"] });
        scanIntervalRef.current = setInterval(async () => {
          if (!videoRef.current) return;
          try {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes.length > 0) {
              const value = barcodes[0].rawValue;
              if (value) {
                stopCamera();
                setQuery(value);
                handleVerify(value);
              }
            }
          } catch {
            // Detection failed, continue
          }
        }, 500);
      }
    } catch {
      setResult({
        status: "ERROR",
        message: "Impossible d'accéder à la caméra. Vérifiez les permissions.",
        color: "red",
      });
    }
  }

  function stopCamera() {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setScanning(false);
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statusIcon = (status: string) => {
    switch (status) {
      case "VALID":
        return <CheckCircle2 className="h-10 w-10 text-green-500" />;
      case "ALREADY_SCANNED":
      case "NOT_CONFIRMED":
        return <AlertTriangle className="h-10 w-10 text-amber-500" />;
      case "INVALID":
      case "DECLINED":
      case "ERROR":
        return <XCircle className="h-10 w-10 text-red-500" />;
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

  // ── Loading state ──
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="flex items-center gap-3 text-gray-500">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span className="text-sm font-medium">Chargement...</span>
        </div>
      </div>
    );
  }

  // ── Error state ──
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
        <div className="max-w-md w-full rounded-2xl border-2 border-red-200 dark:border-red-800 bg-white dark:bg-gray-900 p-8 text-center shadow-xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/30 mb-4">
            <XCircle className="h-8 w-8 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Lien invalide
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  // ── Main verification UI ──
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900">
      <div className="mx-auto max-w-lg px-4 py-6 space-y-5">
        {/* Header */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#7A3A50] to-[#C48B90] shadow-lg shadow-[#7A3A50]/20">
              {controller?.permission === "SCAN" ? (
                <ShieldCheck className="h-5 w-5 text-white" />
              ) : (
                <Shield className="h-5 w-5 text-white" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-gray-900 dark:text-white truncate">
                {event?.title}
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {controller?.label} ·{" "}
                <span className={`font-medium ${
                  controller?.permission === "SCAN"
                    ? "text-green-600 dark:text-green-400"
                    : "text-blue-600 dark:text-blue-400"
                }`}>
                  {controller?.permission === "SCAN" ? "Scan + Enregistrement" : "Vérification seule"}
                </span>
              </p>
            </div>
          </div>

          {event?.date && (
            <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {new Date(event.date).toLocaleDateString("fr-FR", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          )}
        </div>

        {/* Live Stats */}
        {stats && (
          <div className="grid grid-cols-3 gap-2.5">
            <div className="rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/50 p-3 text-center">
              <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                {stats.totalScanned}
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-green-600 dark:text-green-500 mt-0.5">
                Arrivés
              </p>
            </div>
            <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 p-3 text-center">
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                {stats.totalConfirmed}
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-500 mt-0.5">
                Confirmés
              </p>
            </div>
            <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/50 p-3 text-center">
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                {stats.remaining}
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-500 mt-0.5">
                Restants
              </p>
            </div>
          </div>
        )}

        {/* Camera area */}
        <div className="rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-black overflow-hidden relative">
          {scanning ? (
            <>
              <video
                ref={videoRef}
                className="w-full"
                style={{ minHeight: "280px", objectFit: "cover" }}
                playsInline
                muted
              />
              <canvas ref={canvasRef} className="hidden" />
              <div className="absolute top-3 right-3 z-10">
                <button
                  onClick={stopCamera}
                  className="rounded-xl bg-red-500/90 backdrop-blur-sm px-3 py-2 text-sm font-medium text-white hover:bg-red-600 transition"
                >
                  <CameraOff className="h-4 w-4 inline mr-1.5" />
                  Arrêter
                </button>
              </div>
              {/* Scan overlay guide */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="h-52 w-52 rounded-2xl border-2 border-white/40" />
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <div className="rounded-full bg-white/10 p-5 mb-3">
                <Camera className="h-10 w-10 text-white/60" />
              </div>
              <p className="text-white/70 text-sm mb-5">
                Scannez le QR code de l&apos;invité
              </p>
              <button
                onClick={startCamera}
                className="inline-flex items-center gap-2 rounded-xl bg-[#7A3A50] px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-[#6A2A40] active:scale-95"
              >
                <Camera className="h-5 w-5" />
                Activer la caméra
              </button>
            </div>
          )}

          {verifying && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
              <div className="flex items-center gap-2 rounded-xl bg-white px-5 py-3 shadow-xl">
                <RefreshCw className="h-5 w-5 animate-spin text-[#7A3A50]" />
                <span className="text-sm font-medium text-gray-900">Vérification...</span>
              </div>
            </div>
          )}
        </div>

        {/* Manual Search */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2.5">
            Recherche manuelle
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleVerify();
            }}
            className="flex gap-2"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Nom de l'invité ou code..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 pl-10 pr-4 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:border-[#7A3A50] focus:ring-2 focus:ring-[#7A3A50]/20"
              />
            </div>
            <button
              type="submit"
              disabled={verifying || !query.trim()}
              className="rounded-xl bg-[#7A3A50] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#6A2A40] transition disabled:opacity-50 active:scale-95"
            >
              {verifying ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                "Vérifier"
              )}
            </button>
          </form>
        </div>

        {/* Result */}
        {result && (
          <div className={`rounded-2xl border-2 p-5 transition-all animate-slide-up ${statusBg(result.color)}`}>
            <div className="flex items-start gap-4">
              {statusIcon(result.status)}
              <div className="flex-1 min-w-0">
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {result.message}
                </p>

                {result.recorded && (
                  <p className="mt-1 text-xs font-medium text-green-600 dark:text-green-400">
                    ✓ Entrée enregistrée
                  </p>
                )}

                {result.guest && (
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {result.guest.group && (
                      <div className="rounded-xl bg-white/80 dark:bg-gray-800/80 px-3.5 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Groupe</p>
                        <p className="font-semibold text-sm text-gray-900 dark:text-white">{result.guest.group}</p>
                      </div>
                    )}
                    {(result.guest.adultCount || result.guest.childrenCount) && (
                      <div className="rounded-xl bg-white/80 dark:bg-gray-800/80 px-3.5 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Places</p>
                        <p className="font-semibold text-sm text-gray-900 dark:text-white">
                          <Users className="h-3.5 w-3.5 inline mr-1" />
                          {result.guest.adultCount || 0} adulte{(result.guest.adultCount || 0) > 1 ? "s" : ""}
                          {(result.guest.childrenCount || 0) > 0 && ` + ${result.guest.childrenCount} enfant${result.guest.childrenCount! > 1 ? "s" : ""}`}
                        </p>
                      </div>
                    )}
                    {result.guest.menuChoice && (
                      <div className="rounded-xl bg-white/80 dark:bg-gray-800/80 px-3.5 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Menu</p>
                        <p className="font-semibold text-sm text-gray-900 dark:text-white capitalize">🍽️ {result.guest.menuChoice}</p>
                      </div>
                    )}
                    {result.guest.allergies && result.guest.allergies.length > 0 && (
                      <div className="rounded-xl bg-red-50/80 dark:bg-red-950/30 px-3.5 py-2 border border-red-100 dark:border-red-800">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-red-400">⚠️ Allergies</p>
                        <p className="font-semibold text-sm text-red-700 dark:text-red-300">{result.guest.allergies.join(", ")}</p>
                      </div>
                    )}
                  </div>
                )}

                {result.scannedAt && (
                  <p className="mt-3 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Scanné à {new Date(result.scannedAt).toLocaleTimeString("fr-FR")}
                  </p>
                )}
              </div>
            </div>

            <button
              onClick={() => {
                setResult(null);
                setQuery("");
              }}
              className="mt-4 w-full rounded-xl bg-gray-900/10 dark:bg-white/10 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-900/20 dark:hover:bg-white/20 transition"
            >
              Vérifier un autre invité
            </button>
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-[11px] text-gray-400 dark:text-gray-600">
          Propulsé par <span className="font-semibold">EventFlow</span>
        </p>
      </div>
    </div>
  );
}
