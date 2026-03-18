import { Resend } from "resend";

// ─── Configuration ──────────────────────────────────
const RESEND_API_KEY = process.env.RESEND_API_KEY;

// Use custom domain if verified, otherwise Resend's onboarding address
// Change this to "EventFlow <noreply@evenement.ga>" once domain is verified in Resend
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "EventFlow <onboarding@resend.dev>";

// Lazy-init to avoid crash at import time if key is missing
let _resend: Resend | null = null;
function getResend(): Resend {
  if (!RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured. Email sending is unavailable.");
  }
  if (!_resend) {
    _resend = new Resend(RESEND_API_KEY);
  }
  return _resend;
}

// ─── Rate limiting (in-memory per-process) ──────────
const emailRateMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 5; // max 5 emails per minute per user

export function checkEmailRateLimit(userId: string): boolean {
  const now = Date.now();
  const timestamps = emailRateMap.get(userId) || [];
  const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  emailRateMap.set(userId, recent);
  return recent.length < RATE_LIMIT_MAX;
}

export function recordEmailSent(userId: string): void {
  const timestamps = emailRateMap.get(userId) || [];
  timestamps.push(Date.now());
  emailRateMap.set(userId, timestamps);
}

// ─── Sanitization ───────────────────────────────────
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ─── Email Validation ───────────────────────────────
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email) && email.length <= 254;
}

// ─── Send Invitation Email ──────────────────────────
interface SendInvitationEmailParams {
  to: string;
  guestName: string;
  eventTitle: string;
  inviteUrl: string;
  hostName?: string;
}

export async function sendInvitationEmail({
  to,
  guestName,
  eventTitle,
  inviteUrl,
  hostName,
}: SendInvitationEmailParams) {
  // Validate email
  if (!isValidEmail(to)) {
    throw new Error(`Adresse email invalide: ${to}`);
  }

  // Validate URL
  if (!inviteUrl.startsWith("http://") && !inviteUrl.startsWith("https://")) {
    throw new Error("URL d'invitation invalide");
  }

  // Sanitize inputs for HTML template
  const safeName = escapeHtml(guestName);
  const safeTitle = escapeHtml(eventTitle);
  const safeHost = hostName ? escapeHtml(hostName) : null;
  const safeUrl = encodeURI(inviteUrl);

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f8f4f5;font-family:'Segoe UI',Roboto,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8f4f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(122,58,80,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#7A3A50 0%,#5a2538 100%);padding:36px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;letter-spacing:-0.5px;">🎉 Vous êtes invité(e) !</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 16px;color:#1a1a2e;font-size:16px;line-height:1.6;">
                Bonjour <strong>${safeName}</strong>,
              </p>
              <p style="margin:0 0 24px;color:#4a4a5a;font-size:15px;line-height:1.6;">
                ${safeHost ? `<strong>${safeHost}</strong> vous invite` : "Vous êtes invité(e)"} à <strong>${safeTitle}</strong>. 
                Découvrez votre invitation personnalisée et confirmez votre présence en cliquant sur le bouton ci-dessous.
              </p>
              <!-- CTA Button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:8px 0 32px;">
                    <a href="${safeUrl}" 
                       style="display:inline-block;background:linear-gradient(135deg,#7A3A50 0%,#9A5A70 100%);color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:10px;font-size:16px;font-weight:600;letter-spacing:0.3px;box-shadow:0 4px 16px rgba(122,58,80,0.3);">
                      Voir mon invitation →
                    </a>
                  </td>
                </tr>
              </table>
              <!-- Link fallback -->
              <p style="margin:0;padding:16px;background-color:#f8f4f5;border-radius:8px;color:#7A3A50;font-size:12px;line-height:1.5;word-break:break-all;">
                Si le bouton ne fonctionne pas, copiez ce lien :<br/>
                <a href="${safeUrl}" style="color:#7A3A50;">${safeUrl}</a>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px 28px;border-top:1px solid #f0e8eb;text-align:center;">
              <p style="margin:0;color:#b0a0a6;font-size:12px;">
                Envoyé via <strong>EventFlow</strong> — evenement.ga
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const resend = getResend();

  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `🎉 ${safeTitle} — Votre invitation personnalisée`,
    html,
  });

  if (error) {
    console.error("Resend API error:", JSON.stringify(error));
    throw new Error(error.message || "Échec de l'envoi de l'email");
  }

  return data;
}
