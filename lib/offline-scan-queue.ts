// File d'attente localStorage pour les scans QR effectués hors-ligne.
// Le scanner y stocke les scans qui n'ont pas pu aboutir (fetch failed),
// puis flushQueue() les rejoue dès que le réseau revient.

const STORAGE_KEY_PREFIX = "eventflow_offline_scans_";

export interface QueuedScan {
  id: string; // Local UUID temporaire
  eventId: string;
  scannedUrl: string;
  queuedAt: number;
}

function key(eventId: string) {
  return `${STORAGE_KEY_PREFIX}${eventId}`;
}

function readQueue(eventId: string): QueuedScan[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key(eventId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(eventId: string, queue: QueuedScan[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key(eventId), JSON.stringify(queue));
  } catch {
    // Quota excédé ou localStorage bloqué — on ignore silencieusement
  }
}

/**
 * Ajoute un scan à la file locale.
 */
export function enqueueScan(eventId: string, scannedUrl: string): QueuedScan {
  const entry: QueuedScan = {
    id: `offline_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    eventId,
    scannedUrl,
    queuedAt: Date.now(),
  };
  const queue = readQueue(eventId);
  queue.push(entry);
  writeQueue(eventId, queue);
  return entry;
}

/**
 * Retourne les scans en attente pour un event donné.
 */
export function getQueuedScans(eventId: string): QueuedScan[] {
  return readQueue(eventId);
}

/**
 * Vide la file (appelé après un flush réussi OU manuellement).
 */
export function clearQueue(eventId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(key(eventId));
}

/**
 * Flush la file : envoie chaque scan en queue à l'API. Retourne les
 * résultats { success, failed } pour feedback UI.
 */
export async function flushQueue(
  eventId: string
): Promise<{ success: number; failed: number }> {
  const queue = readQueue(eventId);
  if (queue.length === 0) return { success: 0, failed: 0 };

  let success = 0;
  let failed = 0;
  const remaining: QueuedScan[] = [];

  for (const scan of queue) {
    try {
      const res = await fetch(`/api/events/${eventId}/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scannedUrl: scan.scannedUrl }),
      });
      if (res.ok) {
        success++;
      } else {
        failed++;
        remaining.push(scan);
      }
    } catch {
      failed++;
      remaining.push(scan);
    }
  }

  writeQueue(eventId, remaining);
  return { success, failed };
}
