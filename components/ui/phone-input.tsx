"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  FRANCOPHONE_COUNTRIES,
  type FrancophoneCountry,
  detectCountryFromNumber,
} from "@/lib/francophone-countries";

interface PhoneInputProps {
  id?: string;
  value: string;
  onChange: (fullNumber: string) => void;
  defaultCountry?: string; // ISO code, default "GA"
  className?: string;
  disabled?: boolean;
}

/**
 * Champ téléphone avec sélecteur de pays francophones.
 * Affiche le drapeau + indicatif et gère la concaténation
 * indicatif + numéro local.
 */
export default function PhoneInput({
  id,
  value,
  onChange,
  defaultCountry = "GA",
  className = "",
  disabled = false,
}: PhoneInputProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<FrancophoneCountry>(
    () =>
      FRANCOPHONE_COUNTRIES.find((c) => c.code === defaultCountry) ??
      FRANCOPHONE_COUNTRIES[0]
  );
  const [localNumber, setLocalNumber] = useState(() => {
    // Si value contient déjà un indicatif, extraire la partie locale
    if (value) {
      const detected = detectCountryFromNumber(value);
      if (detected) {
        return value.slice(detected.dialCode.length).trim();
      }
    }
    return value.replace(/^\+\d+\s*/, "");
  });

  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Sync from parent value on mount
  useEffect(() => {
    if (value) {
      const detected = detectCountryFromNumber(value);
      if (detected) {
        setSelectedCountry(detected);
        setLocalNumber(value.slice(detected.dialCode.length).trim());
      }
    }
    // Intentionally run only on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      // Focus search when dropdown opens
      setTimeout(() => searchRef.current?.focus(), 50);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const emitChange = useCallback(
    (country: FrancophoneCountry, local: string) => {
      const cleaned = local.replace(/[^\d]/g, "");
      if (cleaned) {
        onChange(`${country.dialCode}${cleaned}`);
      } else {
        onChange("");
      }
    },
    [onChange]
  );

  function handleLocalChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setLocalNumber(val);
    emitChange(selectedCountry, val);
  }

  function handleSelectCountry(country: FrancophoneCountry) {
    setSelectedCountry(country);
    setOpen(false);
    setSearch("");
    emitChange(country, localNumber);
  }

  const filteredCountries = search
    ? FRANCOPHONE_COUNTRIES.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.dialCode.includes(search) ||
          c.code.toLowerCase().includes(search.toLowerCase())
      )
    : FRANCOPHONE_COUNTRIES;

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div className="flex rounded-xl border border-gray-200 bg-white transition-all focus-within:border-[#25D366] focus-within:ring-2 focus-within:ring-[#25D366]/20">
        {/* ── Country Selector Button ── */}
        <button
          type="button"
          onClick={() => !disabled && setOpen(!open)}
          disabled={disabled}
          className="flex shrink-0 items-center gap-1.5 rounded-l-xl border-r border-gray-200 bg-gray-50/50 px-3 text-sm transition-colors hover:bg-gray-100 disabled:opacity-50"
          aria-label="Sélectionner un pays"
        >
          <span className="text-base leading-none">{selectedCountry.flag}</span>
          <span className="font-medium text-gray-600">{selectedCountry.dialCode}</span>
          <svg
            className={`h-3.5 w-3.5 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>

        {/* ── Phone Number Input ── */}
        <input
          id={id}
          type="tel"
          value={localNumber}
          onChange={handleLocalChange}
          disabled={disabled}
          placeholder={selectedCountry.placeholder}
          className="w-full rounded-r-xl bg-transparent py-2.5 pl-3 pr-4 text-sm outline-none"
        />
      </div>

      {/* ── Dropdown ── */}
      {open && (
        <div className="absolute left-0 z-50 mt-1.5 w-full min-w-[280px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl shadow-gray-200/50">
          {/* Search */}
          <div className="border-b border-gray-100 p-2">
            <div className="relative">
              <svg
                className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                />
              </svg>
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un pays..."
                className="w-full rounded-lg bg-gray-50 py-2 pl-8 pr-3 text-sm outline-none placeholder:text-gray-400 focus:bg-gray-100"
              />
            </div>
          </div>

          {/* Country List */}
          <div className="max-h-[240px] overflow-y-auto overscroll-contain">
            {filteredCountries.length === 0 ? (
              <p className="px-4 py-3 text-center text-sm text-gray-400">
                Aucun pays trouvé
              </p>
            ) : (
              filteredCountries.map((country) => (
                <button
                  key={country.code}
                  type="button"
                  onClick={() => handleSelectCountry(country)}
                  className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-[#25D366]/5 ${
                    country.code === selectedCountry.code
                      ? "bg-[#25D366]/10 font-medium text-[#128C7E]"
                      : "text-gray-700"
                  }`}
                >
                  <span className="text-base leading-none">{country.flag}</span>
                  <span className="flex-1 truncate">{country.name}</span>
                  <span className="shrink-0 text-xs tabular-nums text-gray-400">
                    {country.dialCode}
                  </span>
                  {country.code === selectedCountry.code && (
                    <svg
                      className="h-4 w-4 shrink-0 text-[#25D366]"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
