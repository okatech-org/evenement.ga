"use client";

import { Suspense, useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import PhoneInput from "@/components/ui/phone-input";

/* ─── Animated Background Particles ────────────────────────── */
function FloatingParticles() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full opacity-20"
          style={{
            background: `radial-gradient(circle, ${
              i % 2 === 0 ? "#7A3A50" : "#C48B90"
            } 0%, transparent 70%)`,
            width: `${120 + i * 60}px`,
            height: `${120 + i * 60}px`,
            top: `${10 + i * 14}%`,
            left: `${5 + i * 16}%`,
            animation: `float-${i % 3} ${18 + i * 4}s ease-in-out infinite`,
            animationDelay: `${i * 2}s`,
          }}
        />
      ))}
    </div>
  );
}

/* ─── Login Form ───────────────────────────────────────────── */
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const error = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState(
    error === "CredentialsSignin"
      ? "Email ou mot de passe incorrect"
      : error === "OAuthAccountNotLinked"
      ? "Un compte avec cet email existe déjà. Connectez-vous avec votre méthode d'origine."
      : error === "OAuthCallbackError"
      ? "Erreur lors de la connexion avec ce fournisseur. Veuillez réessayer."
      : error
      ? "Erreur de connexion. Veuillez réessayer."
      : ""
  );
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Available OAuth providers (dynamically detected)
  const [providers, setProviders] = useState<{
    google: boolean;
    apple: boolean;
    whatsapp: boolean;
  }>({ google: false, apple: false, whatsapp: true });

  // WhatsApp OTP state
  const [showWhatsApp, setShowWhatsApp] = useState(false);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [waLoading, setWaLoading] = useState(false);
  const [waError, setWaError] = useState("");

  useEffect(() => {
    setMounted(true);
    // Fetch available providers
    fetch("/api/auth/providers-status")
      .then((res) => res.json())
      .then((data) => setProviders(data))
      .catch(() => {/* silent — fallback to defaults */});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setErrorMsg("Email ou mot de passe incorrect");
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setErrorMsg("Une erreur est survenue");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleOAuthSignIn(provider: string) {
    setLoadingProvider(provider);
    try {
      await signIn(provider, { callbackUrl });
    } catch {
      setLoadingProvider(null);
    }
  }

  async function handleSendOtp() {
    setWaLoading(true);
    setWaError("");
    try {
      const res = await fetch("/api/auth/whatsapp/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) {
        setWaError(data.error || "Erreur lors de l'envoi");
        return;
      }
      setOtpSent(true);
      // In dev mode, auto-fill the OTP
      if (data.devCode) {
        setOtp(data.devCode);
      }
    } catch {
      setWaError("Erreur réseau");
    } finally {
      setWaLoading(false);
    }
  }

  async function handleVerifyOtp() {
    setWaLoading(true);
    setWaError("");
    try {
      const result = await signIn("whatsapp-otp", {
        phone,
        otp,
        redirect: false,
      });
      if (result?.error) {
        setWaError("Code OTP invalide ou expiré");
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setWaError("Erreur réseau");
    } finally {
      setWaLoading(false);
    }
  }

  return (
    <div
      className={`w-full max-w-[420px] transition-all duration-700 ${
        mounted ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
      }`}
    >
      {/* ── Branding ── */}
      <div className="mb-8 text-center">
        <Link href="/" className="group inline-flex items-center gap-3">
          <div className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#7A3A50] to-[#C48B90] shadow-lg shadow-[#7A3A50]/30 transition-all duration-300 group-hover:shadow-xl group-hover:shadow-[#7A3A50]/40">
            <span className="text-2xl font-bold text-white">E</span>
            <div className="absolute inset-0 bg-white/10 opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
          <span className="text-[1.7rem] font-bold tracking-tight text-gray-900">
            Event<span className="bg-gradient-to-r from-[#7A3A50] to-[#C48B90] bg-clip-text text-transparent">Flow</span>
          </span>
        </Link>
      </div>

      {/* ── Glass Card ── */}
      <div className="relative rounded-3xl border border-white/60 bg-white/70 p-8 shadow-2xl shadow-gray-200/60 backdrop-blur-xl sm:p-10">
        {/* Subtle gradient overlay */}
        <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-br from-white/50 via-transparent to-[#FFF0F3]/30" />

        <div className="relative">
          <h1 className="text-[1.65rem] font-bold leading-tight text-gray-900">
            Connexion
          </h1>
          <p className="mt-1.5 text-[0.9rem] text-gray-500">
            Accédez à votre espace organisateur
          </p>

          {/* ── Error Banner ── */}
          {errorMsg && (
            <div className="mt-4 flex items-center gap-2.5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 ring-1 ring-red-100">
              <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              {errorMsg}
            </div>
          )}

          {/* ── OAuth Providers ── */}
          <div className="mt-7 space-y-3">
            {/* Google */}
            {providers.google && (
            <button
              type="button"
              id="login-google-btn"
              onClick={() => handleOAuthSignIn("google")}
              disabled={!!loadingProvider}
              className="group flex w-full items-center justify-center gap-3 rounded-xl border border-gray-200/80 bg-white px-4 py-3 text-[0.9rem] font-medium text-gray-700 shadow-sm transition-all duration-200 hover:border-gray-300 hover:bg-gray-50 hover:shadow-md disabled:opacity-60"
            >
              {loadingProvider === "google" ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-[#4285F4]" />
              ) : (
                <svg className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
              )}
              Continuer avec Google
            </button>
            )}

            {/* Apple */}
            {providers.apple && (
            <button
              type="button"
              id="login-apple-btn"
              onClick={() => handleOAuthSignIn("apple")}
              disabled={!!loadingProvider}
              className="group flex w-full items-center justify-center gap-3 rounded-xl bg-gray-900 px-4 py-3 text-[0.9rem] font-medium text-white shadow-sm transition-all duration-200 hover:bg-black hover:shadow-md disabled:opacity-60"
            >
              {loadingProvider === "apple" ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-600 border-t-white" />
              ) : (
                <svg className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                </svg>
              )}
              Continuer avec Apple
            </button>
            )}

            {/* WhatsApp */}
            <button
              type="button"
              id="login-whatsapp-btn"
              onClick={() => {
                setShowWhatsApp(!showWhatsApp);
                setWaError("");
              }}
              className={`group flex w-full items-center justify-center gap-3 rounded-xl px-4 py-3 text-[0.9rem] font-medium shadow-sm transition-all duration-200 hover:shadow-md ${
                showWhatsApp
                  ? "border-2 border-[#25D366] bg-[#25D366]/5 text-[#128C7E]"
                  : "bg-[#25D366] text-white hover:bg-[#1EB954]"
              }`}
            >
              <svg className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Continuer avec WhatsApp
            </button>
          </div>

          {/* ── WhatsApp OTP Flow ── */}
          <div
            className={`grid transition-all duration-300 ease-in-out ${
              showWhatsApp ? "mt-4 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
            }`}
          >
            <div className="overflow-hidden">
              <div className="rounded-2xl border border-[#25D366]/20 bg-gradient-to-br from-[#25D366]/5 to-[#128C7E]/5 p-5">
                {waError && (
                  <div className="mb-3 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 ring-1 ring-red-100">
                    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                    </svg>
                    {waError}
                  </div>
                )}

                {!otpSent ? (
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Numéro WhatsApp
                    </label>
                    <PhoneInput
                      id="whatsapp-phone-input"
                      value={phone}
                      onChange={setPhone}
                      defaultCountry="GA"
                    />
                    <button
                      type="button"
                      id="send-otp-btn"
                      onClick={handleSendOtp}
                      disabled={waLoading || !phone}
                      className="w-full rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#25D366]/25 transition-all hover:bg-[#1EB954] hover:shadow-xl disabled:opacity-50"
                    >
                      {waLoading ? (
                        <span className="flex items-center justify-center gap-2">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                          Envoi en cours...
                        </span>
                      ) : (
                        "Envoyer le code"
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Code de vérification
                    </label>
                    <p className="flex items-center gap-1.5 text-xs text-gray-500">
                      <svg className="h-3.5 w-3.5 text-[#25D366]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Code à 6 chiffres envoyé sur votre WhatsApp
                    </p>
                    <input
                      id="otp-code-input"
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                      placeholder="000000"
                      maxLength={6}
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-center text-xl font-semibold tracking-[0.5em] text-gray-800 outline-none transition-all focus:border-[#25D366] focus:ring-2 focus:ring-[#25D366]/20"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setOtpSent(false);
                          setOtp("");
                          setWaError("");
                        }}
                        className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-600 transition-all hover:bg-gray-50"
                      >
                        ← Retour
                      </button>
                      <button
                        type="button"
                        id="verify-otp-btn"
                        onClick={handleVerifyOtp}
                        disabled={waLoading || otp.length !== 6}
                        className="flex-1 rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#25D366]/25 transition-all hover:bg-[#1EB954] disabled:opacity-50"
                      >
                        {waLoading ? (
                          <span className="flex items-center justify-center gap-2">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                            Vérification...
                          </span>
                        ) : (
                          "Vérifier"
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Divider ── */}
          <div className="relative my-7">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-200/80" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white/70 px-4 font-medium tracking-wider text-gray-400 backdrop-blur-sm">
                ou par email
              </span>
            </div>
          </div>

          {/* ── Email / Password Form ── */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="mb-1.5 block text-sm font-medium text-gray-700">
                Email
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                  <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                  </svg>
                </div>
                <input
                  id="login-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-[#7A3A50] focus:ring-2 focus:ring-[#7A3A50]/20"
                  placeholder="vous@email.com"
                />
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="login-password" className="text-sm font-medium text-gray-700">
                  Mot de passe
                </label>
                <a href="#" className="text-xs font-medium text-[#7A3A50]/80 transition-colors hover:text-[#7A3A50]">
                  Mot de passe oublié ?
                </a>
              </div>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                  <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                </div>
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-10 text-sm outline-none transition-all focus:border-[#7A3A50] focus:ring-2 focus:ring-[#7A3A50]/20"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-gray-400 transition-colors hover:text-gray-600"
                >
                  {showPassword ? (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              id="login-submit-btn"
              disabled={isLoading}
              className="w-full rounded-xl bg-gradient-to-r from-[#7A3A50] to-[#9B5068] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-[#7A3A50]/30 transition-all duration-200 hover:from-[#6A2A40] hover:to-[#8A4058] hover:shadow-xl hover:shadow-[#7A3A50]/40 disabled:opacity-50"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Connexion...
                </span>
              ) : (
                "Se connecter"
              )}
            </button>
          </form>

          {/* ── Footer ── */}
          <p className="mt-7 text-center text-sm text-gray-500">
            Pas encore de compte ?{" "}
            <Link href="/register" className="font-semibold text-[#7A3A50] transition-colors hover:text-[#9B5068]">
              Créer un compte
            </Link>
          </p>
        </div>
      </div>

      {/* ── Trust badges ── */}
      <div className="mt-6 flex items-center justify-center gap-4 text-xs text-gray-400">
        <span className="flex items-center gap-1">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
          </svg>
          Connexion sécurisée
        </span>
        <span className="text-gray-300">•</span>
        <span>Données protégées</span>
      </div>
    </div>
  );
}

/* ─── Page Wrapper ─────────────────────────────────────────── */
export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-[#FAF7F5] via-white to-[#FFF0F3] px-4">
      {/* Animated background */}
      <FloatingParticles />

      {/* Decorative shapes */}
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-[#7A3A50]/5 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-[#C48B90]/8 blur-3xl" />

      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-[#7A3A50]/20 border-t-[#7A3A50]" />
          </div>
        }
      >
        <LoginForm />
      </Suspense>

      {/* CSS Animations */}
      <style jsx global>{`
        @keyframes float-0 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -30px) scale(1.05); }
          66% { transform: translate(-20px, 20px) scale(0.95); }
        }
        @keyframes float-1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-40px, 20px) scale(1.08); }
          66% { transform: translate(20px, -40px) scale(0.92); }
        }
        @keyframes float-2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(20px, 40px) scale(0.96); }
          66% { transform: translate(-30px, -20px) scale(1.04); }
        }
      `}</style>
    </div>
  );
}
