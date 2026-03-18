"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const error = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(
    error === "CredentialsSignin" ? "Email ou mot de passe incorrect" : ""
  );

  // WhatsApp OTP state
  const [showWhatsApp, setShowWhatsApp] = useState(false);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [waLoading, setWaLoading] = useState(false);
  const [waError, setWaError] = useState("");

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
    <div className="w-full max-w-md">
      {/* Logo */}
      <div className="mb-8 text-center">
        <Link href="/" className="inline-flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#7A3A50] to-[#C48B90]">
            <span className="text-xl font-bold text-white">E</span>
          </div>
          <span className="text-2xl font-bold tracking-tight text-gray-900">
            Event<span className="text-[#7A3A50]">Flow</span>
          </span>
        </Link>
      </div>

      {/* Card */}
      <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-xl shadow-gray-100/50">
        <h1 className="text-2xl font-bold text-gray-900">Connexion</h1>
        <p className="mt-1 text-sm text-gray-500">
          Accédez à votre espace organisateur
        </p>

        {/* OAuth Buttons */}
        <div className="mt-6 space-y-3">
          {/* Google */}
          <button
            type="button"
            onClick={() => signIn("google", { callbackUrl })}
            className="flex w-full items-center justify-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 hover:shadow"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continuer avec Google
          </button>

          {/* Apple */}
          <button
            type="button"
            onClick={() => signIn("apple", { callbackUrl })}
            className="flex w-full items-center justify-center gap-3 rounded-lg border border-gray-200 bg-black px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-gray-900 hover:shadow"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
            </svg>
            Continuer avec Apple
          </button>

          {/* WhatsApp */}
          <button
            type="button"
            onClick={() => {
              setShowWhatsApp(!showWhatsApp);
              setWaError("");
            }}
            className="flex w-full items-center justify-center gap-3 rounded-lg border border-gray-200 bg-[#25D366] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[#1da851] hover:shadow"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Continuer avec WhatsApp
          </button>
        </div>

        {/* WhatsApp OTP Flow */}
        {showWhatsApp && (
          <div className="mt-4 rounded-lg border border-[#25D366]/30 bg-[#25D366]/5 p-4">
            {waError && (
              <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                {waError}
              </div>
            )}

            {!otpSent ? (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  Numéro WhatsApp
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+241 07 XX XX XX"
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-[#25D366] focus:ring-2 focus:ring-[#25D366]/20"
                />
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={waLoading || !phone}
                  className="w-full rounded-lg bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#25D366]/25 transition hover:bg-[#1da851] disabled:opacity-50"
                >
                  {waLoading ? "Envoi en cours..." : "Envoyer le code"}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  Code de vérification
                </label>
                <p className="text-xs text-gray-500">
                  Un code à 6 chiffres a été envoyé sur votre WhatsApp
                </p>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="000000"
                  maxLength={6}
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-center text-lg tracking-[0.5em] outline-none transition focus:border-[#25D366] focus:ring-2 focus:ring-[#25D366]/20"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setOtpSent(false);
                      setOtp("");
                      setWaError("");
                    }}
                    className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
                  >
                    Retour
                  </button>
                  <button
                    type="button"
                    onClick={handleVerifyOtp}
                    disabled={waLoading || otp.length !== 6}
                    className="flex-1 rounded-lg bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#25D366]/25 transition hover:bg-[#1da851] disabled:opacity-50"
                  >
                    {waLoading ? "Vérification..." : "Vérifier"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-3 text-gray-400">ou</span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMsg && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
              {errorMsg}
            </div>
          )}

          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-[#7A3A50] focus:ring-2 focus:ring-[#7A3A50]/20"
              placeholder="vous@email.com"
            />
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label htmlFor="password" className="text-sm font-medium text-gray-700">
                Mot de passe
              </label>
              <a href="#" className="text-xs text-[#7A3A50] hover:underline">
                Mot de passe oublié ?
              </a>
            </div>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-[#7A3A50] focus:ring-2 focus:ring-[#7A3A50]/20"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg bg-[#7A3A50] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#7A3A50]/25 transition hover:bg-[#6A2A40] disabled:opacity-50"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Connexion...
              </span>
            ) : (
              "Se connecter"
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Pas encore de compte ?{" "}
          <Link href="/register" className="font-semibold text-[#7A3A50] hover:underline">
            Créer un compte
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#FFFDF9] via-white to-[#FFF0F3] px-4">
      <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-[#7A3A50] border-t-transparent" /></div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
