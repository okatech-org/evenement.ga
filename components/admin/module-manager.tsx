"use client";

import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { MODULE_TYPES, PLAN_LIMITS } from "@/lib/config";
import type { ModuleType, Plan } from "@prisma/client";

interface ModuleItem {
  id: string;
  type: string;
  active: boolean;
  order: number;
}

interface ModuleManagerProps {
  eventId: string;
  modules: ModuleItem[];
  userPlan: string;
}

function SortableModule({
  module,
  userPlan,
  onToggle,
}: {
  module: ModuleItem;
  userPlan: string;
  onToggle: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: module.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const config = MODULE_TYPES[module.type as ModuleType];
  if (!config) return null;

  // Check if module is available for user's plan
  const planLimits = PLAN_LIMITS[userPlan as Plan];
  const isAvailable =
    planLimits?.modules === "all" ||
    (Array.isArray(planLimits?.modules) &&
      planLimits.modules.includes(module.type as ModuleType));

  const isAlwaysActive = config.alwaysActive;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-4 rounded-xl border bg-white p-4 shadow-sm transition ${
        isDragging
          ? "z-50 border-[#7A3A50] shadow-xl ring-2 ring-[#7A3A50]/20"
          : module.active
          ? "border-gray-100"
          : "border-gray-100 opacity-60"
      }`}
    >
      {/* Drag Handle */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none text-gray-300 hover:text-gray-500 active:cursor-grabbing"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
        </svg>
      </button>

      {/* Icon & Info */}
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xl">{config.icon}</span>
          <div>
            <h4 className="text-sm font-semibold text-gray-900">{config.label}</h4>
            <p className="text-xs text-gray-500">{config.description}</p>
          </div>
        </div>
      </div>

      {/* Plan Badge */}
      {!isAvailable && (
        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
          {config.planRequired}+
        </span>
      )}

      {/* Toggle */}
      {!isAlwaysActive && (
        <button
          onClick={() => isAvailable && onToggle(module.id)}
          disabled={!isAvailable}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            module.active ? "bg-[#7A3A50]" : "bg-gray-200"
          } ${!isAvailable ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
              module.active ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      )}
      {isAlwaysActive && (
        <span className="text-xs text-gray-400">Toujours actif</span>
      )}
    </div>
  );
}

export function ModuleManager({ eventId, modules, userPlan }: ModuleManagerProps) {
  const [items, setItems] = useState<ModuleItem[]>(modules);
  const [isSaving, setIsSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        const newItems = arrayMove(items, oldIndex, newIndex).map((item, i) => ({
          ...item,
          order: i + 1,
        }));
        saveModules(newItems);
        return newItems;
      });
    }
  }

  function handleToggle(id: string) {
    setItems((items) => {
      const newItems = items.map((item) =>
        item.id === id ? { ...item, active: !item.active } : item
      );
      saveModules(newItems);
      return newItems;
    });
  }

  async function saveModules(modules: ModuleItem[]) {
    setIsSaving(true);
    try {
      await fetch(`/api/events/${eventId}/modules`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modules }),
      });
    } catch (error) {
      console.error("Failed to save modules:", error);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={items} strategy={verticalListSortingStrategy}>
          {items.map((module) => (
            <SortableModule
              key={module.id}
              module={module}
              userPlan={userPlan}
              onToggle={handleToggle}
            />
          ))}
        </SortableContext>
      </DndContext>

      {isSaving && (
        <p className="text-center text-xs text-gray-400 animate-pulse">
          Sauvegarde...
        </p>
      )}
    </div>
  );
}
