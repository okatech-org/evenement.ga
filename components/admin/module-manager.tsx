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
  rectSortingStrategy,
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
      className={`flex items-center gap-2.5 rounded-xl border bg-white dark:bg-gray-900 px-3 py-2.5 shadow-sm transition ${
        isDragging
          ? "z-50 border-[#7A3A50] shadow-xl ring-2 ring-[#7A3A50]/20"
          : module.active
          ? "border-gray-100 dark:border-gray-800"
          : "border-gray-100 dark:border-gray-800 opacity-60"
      }`}
    >
      {/* Drag Handle */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none text-gray-300 hover:text-gray-500 active:cursor-grabbing shrink-0"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
        </svg>
      </button>

      {/* Icon & Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-base shrink-0">{config.icon}</span>
          <div className="min-w-0">
            <h4 className="text-xs font-semibold text-gray-900 dark:text-white truncate">{config.label}</h4>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{config.description}</p>
          </div>
        </div>
      </div>

      {/* Plan Badge */}
      {!isAvailable && (
        <span className="rounded-full bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400 shrink-0">
          {config.planRequired}+
        </span>
      )}

      {/* Toggle */}
      {!isAlwaysActive && (
        <button
          onClick={() => isAvailable && onToggle(module.id)}
          disabled={!isAvailable}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0 ${
            module.active ? "bg-[#7A3A50]" : "bg-gray-200 dark:bg-gray-700"
          } ${!isAvailable ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
        >
          <span
            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform ${
              module.active ? "translate-x-[18px]" : "translate-x-0.5"
            }`}
          />
        </button>
      )}
      {isAlwaysActive && (
        <span className="text-[10px] text-gray-400 dark:text-gray-500 shrink-0">Toujours actif</span>
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
    <div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={items} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 lg:gap-3">
            {items.map((module) => (
              <SortableModule
                key={module.id}
                module={module}
                userPlan={userPlan}
                onToggle={handleToggle}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {isSaving && (
        <p className="text-center text-xs text-gray-400 animate-pulse mt-2">
          Sauvegarde...
        </p>
      )}
    </div>
  );
}
