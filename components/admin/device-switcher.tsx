"use client";

import { Monitor, Smartphone, Tablet } from "lucide-react";
import { DEVICE_PRESETS, type DevicePreset } from "./device-preview-frame";

interface DeviceSwitcherProps {
  selected: DevicePreset;
  onSelect: (device: DevicePreset) => void;
  showDesktop?: boolean;
  isDesktop?: boolean;
  onToggleDesktop?: () => void;
}

export function DeviceSwitcher({
  selected,
  onSelect,
  showDesktop,
  isDesktop,
  onToggleDesktop,
}: DeviceSwitcherProps) {
  return (
    <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800/60 rounded-xl border border-gray-200/60 dark:border-gray-700/40">
      {/* Desktop toggle */}
      {showDesktop && (
        <>
          <button
            type="button"
            onClick={onToggleDesktop}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-medium transition-all duration-200 ${
              isDesktop
                ? "bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-700/50"
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            Plein écran
          </button>
          <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-0.5" />
        </>
      )}

      {/* Device presets */}
      {DEVICE_PRESETS.map((device) => {
        const isActive = !isDesktop && selected.id === device.id;
        const DeviceIcon = device.id === "ipad" ? Tablet : Smartphone;

        return (
          <button
            key={device.id}
            type="button"
            onClick={() => onSelect(device)}
            title={`${device.label} (${device.width}×${device.height})`}
            className={`flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-lg text-xs font-medium transition-all duration-200 ${
              isActive
                ? "bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-700/50"
            }`}
          >
            <DeviceIcon className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">{device.label.split(" ").slice(-1)[0]}</span>
          </button>
        );
      })}
    </div>
  );
}
