"use client";

import { useState } from "react";

interface ConfigData {
  maintenanceMode: boolean;
  newRegistrations: boolean;
  demoEnabled: boolean;
  maintenanceMessage: string | null;
}

export function ConfigForm({ config }: { config: ConfigData }) {
  const [data, setData] = useState(config);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/superadmin/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        setMessage("✅ Configuration sauvegardée avec succès !");
      } else {
        const err = await res.json();
        setMessage(`❌ ${err.error || "Erreur lors de la sauvegarde."}`);
      }
    } catch {
      setMessage("❌ Erreur de connexion au serveur.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toggles */}
      <div className="rounded-xl border border-[#30363D] bg-[#161B22] p-6">
        <h3 className="mb-5 text-sm font-semibold text-white">
          Interrupteurs Système
        </h3>
        <div className="space-y-5">
          {[
            {
              key: "maintenanceMode" as const,
              label: "Mode Maintenance",
              desc: "Affiche une page de maintenance pour tout le site",
              danger: true,
            },
            {
              key: "newRegistrations" as const,
              label: "Nouvelles inscriptions",
              desc: "Autorise les nouveaux utilisateurs à créer un compte",
              danger: false,
            },
            {
              key: "demoEnabled" as const,
              label: "Mode démo",
              desc: "Active la page de démonstration et les comptes démo",
              danger: false,
            },
          ].map((toggle) => (
            <div key={toggle.key} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#E6EDF3]">{toggle.label}</p>
                <p className="text-xs text-[#484F58]">{toggle.desc}</p>
              </div>
              <button
                onClick={() =>
                  setData((prev) => ({ ...prev, [toggle.key]: !prev[toggle.key] }))
                }
                className={`relative h-6 w-11 rounded-full transition-colors ${
                  data[toggle.key]
                    ? toggle.danger ? "bg-red-500" : "bg-emerald-500"
                    : "bg-[#484F58]"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                    data[toggle.key] ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Maintenance message */}
      <div className="rounded-xl border border-[#30363D] bg-[#161B22] p-6">
        <h3 className="mb-5 text-sm font-semibold text-white">
          Message de maintenance
        </h3>
        <textarea
          value={data.maintenanceMessage || ""}
          onChange={(e) =>
            setData((prev) => ({
              ...prev,
              maintenanceMessage: e.target.value || null,
            }))
          }
          className="w-full rounded-lg border border-[#30363D] bg-[#0F1117] px-3 py-2 text-sm text-[#E6EDF3] focus:border-[#b59e5e] focus:outline-none resize-none"
          rows={3}
          placeholder="Message affiché pendant le mode maintenance (optionnel)"
        />
      </div>

      {/* Save button */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-gradient-to-r from-[#88734C] to-[#b59e5e] px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50"
        >
          {saving ? "Enregistrement..." : "Sauvegarder les modifications"}
        </button>
        {message && <span className="text-sm text-[#8B949E]">{message}</span>}
      </div>
    </div>
  );
}
