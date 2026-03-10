"use client";

import { useEffect, useMemo, useState } from "react";
import {
  buildShoppingList,
  generateMonthlyPlan,
  getCurrentMonth,
  getDailyFocus,
  getPlanWeeks,
  getRecipePortionCalories,
  getReminders,
  mealExecutionKey,
  scaleIngredientAmountForHousehold,
  type DayPlan,
  type DailyFocusResult,
  type MealExecutionState,
  type PantryItem,
  type MealType,
  type MonthlyPlan,
  type PlanWeek,
} from "@/lib/planner";

type ViewMode = "diaria" | "mensual";
type AppPage = "inicio" | "compra" | "recordatorios";

interface CustomShoppingItem {
  id: string;
  label: string;
  checked: boolean;
}

type WeeklyShoppingChecks = Record<string, Record<string, boolean>>;
type WeeklyCustomShoppingItems = Record<string, CustomShoppingItem[]>;

interface PersistedMealState {
  mealExecution: Record<string, MealExecutionState>;
  shoppingCheckedByWeek: WeeklyShoppingChecks;
  customShoppingItemsByWeek: WeeklyCustomShoppingItems;
}

interface AiResponse {
  message: string;
  updatedPlan?: MonthlyPlan;
  editsApplied?: number;
}

const mealLabel: Record<MealType, string> = {
  merienda: "Almuerzo",
  comida: "Comida",
  cena: "Cena",
};

const monthTitle = (month: string) => {
  const [yearRaw, monthRaw] = month.split("-");
  const date = new Date(Number(yearRaw), Number(monthRaw) - 1, 1);
  return new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric" }).format(date);
};

const dayLabel = (isoDate: string) =>
  new Intl.DateTimeFormat("es-ES", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(isoDate));

const weekRangeLabel = (startIso: string, endIso: string) => {
  const formatter = new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
  });

  return `${formatter.format(new Date(startIso))} - ${formatter.format(new Date(endIso))}`;
};

const getShoppingChecksStorageKey = (weekId: string) => `shopping-checks-${weekId}`;
const getCustomShoppingStorageKey = (weekId: string) => `shopping-custom-${weekId}`;
const shoppingItemKey = (name: string, unit: PantryItem["unit"]) => `${name}-${unit}`;
const pantryMapKey = (name: string, unit: PantryItem["unit"]) => `${name}__${unit}`;
const mealExecutionStorageKey = (month: string) => `meal-execution-${month}`;
const persistedStateStorageKey = (month: string) => `meal-state-${month}`;

const roundAmount = (value: number) => Math.round(value * 100) / 100;

const clonePantryMap = (source: Map<string, PantryItem>) =>
  new Map(
    [...source.entries()].map(([key, item]) => [key, { ...item }])
  );

const addPantryAmount = (pantry: Map<string, PantryItem>, item: PantryItem) => {
  const key = pantryMapKey(item.name, item.unit);
  const current = pantry.get(key);

  if (!current) {
    pantry.set(key, { ...item, amount: roundAmount(item.amount) });
    return;
  }

  current.amount = roundAmount(current.amount + item.amount);
};

const emptyPersistedMealState = (): PersistedMealState => ({
  mealExecution: {},
  shoppingCheckedByWeek: {},
  customShoppingItemsByWeek: {},
});

const getStoredState = async (month: string): Promise<PersistedMealState | null> => {
  try {
    const response = await fetch(`/api/state?month=${month}`);
    if (!response.ok) return null;
    return (await response.json()) as PersistedMealState;
  } catch {
    return null;
  }
};

const saveState = async (month: string, payload: PersistedMealState) => {
  try {
    const response = await fetch("/api/state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month, payload }),
    });

    if (!response.ok) {
      throw new Error("State API no disponible");
    }
  } catch {
    localStorage.setItem(persistedStateStorageKey(month), JSON.stringify(payload));
  }
};

const getLocalState = (month: string, weeks: PlanWeek[]): PersistedMealState => {
  if (typeof window === "undefined") {
    return emptyPersistedMealState();
  }

  const combinedRaw = localStorage.getItem(persistedStateStorageKey(month));
  if (combinedRaw) {
    try {
      return JSON.parse(combinedRaw) as PersistedMealState;
    } catch {
      localStorage.removeItem(persistedStateStorageKey(month));
    }
  }

  const mealExecutionRaw = localStorage.getItem(mealExecutionStorageKey(month));
  let mealExecution: Record<string, MealExecutionState> = {};

  try {
    mealExecution = mealExecutionRaw ? (JSON.parse(mealExecutionRaw) as Record<string, MealExecutionState>) : {};
  } catch {
    mealExecution = {};
  }

  const shoppingCheckedByWeek: WeeklyShoppingChecks = {};
  const customShoppingItemsByWeek: WeeklyCustomShoppingItems = {};

  for (const week of weeks) {
    try {
      const checksRaw = localStorage.getItem(getShoppingChecksStorageKey(week.id));
      const customRaw = localStorage.getItem(getCustomShoppingStorageKey(week.id));
      shoppingCheckedByWeek[week.id] = checksRaw ? (JSON.parse(checksRaw) as Record<string, boolean>) : {};
      customShoppingItemsByWeek[week.id] = customRaw ? (JSON.parse(customRaw) as CustomShoppingItem[]) : [];
    } catch {
      shoppingCheckedByWeek[week.id] = {};
      customShoppingItemsByWeek[week.id] = [];
    }
  }

  return {
    mealExecution,
    shoppingCheckedByWeek,
    customShoppingItemsByWeek,
  };
};

const notify = (title: string, body: string) => {
  if (typeof window === "undefined") return;
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  new Notification(title, { body });
};

const getStoredPlan = async (month: string): Promise<MonthlyPlan | null> => {
  try {
    const response = await fetch(`/api/plan?month=${month}`);
    if (!response.ok) return null;
    return (await response.json()) as MonthlyPlan;
  } catch {
    return null;
  }
};

const savePlan = async (plan: MonthlyPlan) => {
  try {
    const response = await fetch("/api/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(plan),
    });

    if (!response.ok) {
      throw new Error("Plan API no disponible");
    }
  } catch {
    localStorage.setItem(`meal-plan-${plan.month}`, JSON.stringify(plan));
  }
};

const getLocalPlan = (month: string): MonthlyPlan | null => {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(`meal-plan-${month}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as MonthlyPlan;
  } catch {
    return null;
  }
};

const toGoogleDate = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");

const buildGoogleCalendarLink = (title: string, description: string, startIso: string) => {
  const start = new Date(startIso);
  const end = new Date(start.getTime() + 15 * 60 * 1000);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    details: description,
    dates: `${toGoogleDate(start.toISOString())}/${toGoogleDate(end.toISOString())}`,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

const downloadReminderIcs = (title: string, description: string, startIso: string, id: string) => {
  const start = new Date(startIso);
  const end = new Date(start.getTime() + 15 * 60 * 1000);
  const dtStart = toGoogleDate(start.toISOString());
  const dtEnd = toGoogleDate(end.toISOString());
  const dtStamp = toGoogleDate(new Date().toISOString());
  const safeDescription = description.replace(/\n/g, "\\n");

  const content = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Stay Healthy//Meal Planner//ES",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${id}@stay-healthy`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${safeDescription}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "TRIGGER:-PT15M",
    "DESCRIPTION:Recordatorio",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${id}.ics`;
  anchor.click();
  URL.revokeObjectURL(url);
};

export function MealPlannerApp() {
  const month = getCurrentMonth();
  const [viewMode, setViewMode] = useState<ViewMode>("diaria");
  const [currentPage, setCurrentPage] = useState<AppPage>("inicio");
  const [menuOpen, setMenuOpen] = useState(false);
  const [plan, setPlan] = useState<MonthlyPlan>(() => generateMonthlyPlan(getCurrentMonth()));
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiOutput, setAiOutput] = useState("");
  const [loadingAI, setLoadingAI] = useState(false);
  const [mealExecution, setMealExecution] = useState<Record<string, MealExecutionState>>({});
  const [shoppingCheckedByWeek, setShoppingCheckedByWeek] = useState<WeeklyShoppingChecks>({});
  const [customShoppingItemsByWeek, setCustomShoppingItemsByWeek] = useState<WeeklyCustomShoppingItems>({});
  const [customItemInput, setCustomItemInput] = useState("");
  const [selectedWeekId, setSelectedWeekId] = useState("");
  const [stateHydrated, setStateHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const generated = generateMonthlyPlan(month);
      const serverPlan = await getStoredPlan(month);
      const localPlan = getLocalPlan(month);
      const data = serverPlan ?? localPlan ?? generated;
      if (!cancelled) {
        setPlan(data);
      }
      if (!serverPlan && !localPlan) {
        savePlan(generated);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [month]);

  const weeks = useMemo(() => getPlanWeeks(plan), [plan]);
  const selectedWeek = useMemo<PlanWeek | undefined>(
    () => weeks.find((week) => week.id === selectedWeekId) ?? weeks[0],
    [selectedWeekId, weeks]
  );
  const selectedWeekIndex = selectedWeek ? weeks.findIndex((week) => week.id === selectedWeek.id) : -1;
  const reminders = useMemo(() => getReminders(plan), [plan]);
  const shoppingSimulation = useMemo(() => {
    let pantryCarry = new Map<string, PantryItem>();
    const byWeek: Record<string, { shopping: ReturnType<typeof buildShoppingList> }> = {};

    for (const week of weeks) {
      const baseShopping = buildShoppingList(plan, week.days, [...pantryCarry.values()]);
      const weekChecks = shoppingCheckedByWeek[week.id] ?? {};
      const pantryWithPurchases = clonePantryMap(pantryCarry);

      for (const item of baseShopping.items) {
        if (!weekChecks[shoppingItemKey(item.name, item.requiredUnit)] || item.finalAmountPurchased <= 0) {
          continue;
        }

        addPantryAmount(pantryWithPurchases, {
          name: item.name,
          unit: item.packageUnit,
          amount: item.finalAmountPurchased,
        });
      }

      const effectiveShopping = buildShoppingList(plan, week.days, [...pantryWithPurchases.values()]);

      for (const item of effectiveShopping.items) {
        const pantryItem = pantryWithPurchases.get(pantryMapKey(item.name, item.requiredUnit));
        if (!pantryItem) {
          continue;
        }

        pantryItem.amount = roundAmount(Math.max(0, pantryItem.amount - item.requiredAmount));
        if (pantryItem.amount <= 0) {
          pantryWithPurchases.delete(pantryMapKey(item.name, item.requiredUnit));
        }
      }

      byWeek[week.id] = { shopping: effectiveShopping };
      pantryCarry = pantryWithPurchases;
    }

    return byWeek;
  }, [plan, shoppingCheckedByWeek, weeks]);
  const shopping = selectedWeek ? shoppingSimulation[selectedWeek.id]?.shopping ?? buildShoppingList(plan, selectedWeek.days) : buildShoppingList(plan, []);
  const shoppingChecked = selectedWeek ? shoppingCheckedByWeek[selectedWeek.id] ?? {} : {};
  const customShoppingItems = selectedWeek ? customShoppingItemsByWeek[selectedWeek.id] ?? [] : [];
  const shoppingItemsToBuy = shopping.items.filter((item) => item.packagesToBuy > 0);
  const shoppingItemsCovered = shopping.items.filter((item) => item.packagesToBuy === 0);

  const daily = useMemo<DailyFocusResult>(() => getDailyFocus(plan, new Date(), mealExecution), [plan, mealExecution]);
  const todayReminders = useMemo(() => {
    const now = new Date();
    return reminders.filter((item) => {
      const reminderDate = new Date(item.dateTime);
      return (
        reminderDate.getFullYear() === now.getFullYear() &&
        reminderDate.getMonth() === now.getMonth() &&
        reminderDate.getDate() === now.getDate()
      );
    });
  }, [reminders]);

  useEffect(() => {
    if (weeks.length === 0) {
      setSelectedWeekId("");
      return;
    }

    const hasSelectedWeek = weeks.some((week) => week.id === selectedWeekId);
    if (hasSelectedWeek) {
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    const currentWeek = weeks.find((week) => week.startDate <= today && week.endDate >= today) ?? weeks[0];
    setSelectedWeekId(currentWeek.id);
  }, [selectedWeekId, weeks]);

  useEffect(() => {
    let cancelled = false;

    if (weeks.length === 0) {
      setStateHydrated(false);
      return;
    }

    const loadState = async () => {
      const remoteState = await getStoredState(month);
      const nextState = remoteState ?? getLocalState(month, weeks);

      if (cancelled) {
        return;
      }

      setMealExecution(nextState.mealExecution ?? {});
      setShoppingCheckedByWeek(nextState.shoppingCheckedByWeek ?? {});
      setCustomShoppingItemsByWeek(nextState.customShoppingItemsByWeek ?? {});
      setStateHydrated(true);

      localStorage.setItem(persistedStateStorageKey(month), JSON.stringify(nextState));
    };

    loadState();

    return () => {
      cancelled = true;
    };
  }, [month, weeks]);

  useEffect(() => {
    if (!stateHydrated) {
      return;
    }

    const payload: PersistedMealState = {
      mealExecution,
      shoppingCheckedByWeek,
      customShoppingItemsByWeek,
    };

    localStorage.setItem(persistedStateStorageKey(month), JSON.stringify(payload));
    saveState(month, payload);
  }, [customShoppingItemsByWeek, mealExecution, month, shoppingCheckedByWeek, stateHydrated]);

  const requestNotifications = async () => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;
    await Notification.requestPermission();
  };

  const notifyUpcoming = () => {
    const now = Date.now();
    const next12h = now + 12 * 60 * 60 * 1000;
    const upcoming = reminders.filter((item) => {
      const time = new Date(item.dateTime).getTime();
      return time >= now && time <= next12h;
    });
    upcoming.forEach((item) => notify(item.title, item.description));
  };

  const submitAI = async () => {
    if (!aiPrompt.trim()) return;
    setLoadingAI(true);
    try {
      const response = await fetch("/api/ai-adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month: plan.month,
          prompt: aiPrompt,
        }),
      });

      const data = (await response.json()) as AiResponse;

      if (!response.ok) {
        setAiOutput(data.message ?? "No se pudo aplicar el ajuste de IA.");
        return;
      }

      if (data.updatedPlan) {
        setPlan(data.updatedPlan);
        await savePlan(data.updatedPlan);
      }

      const suffix = typeof data.editsApplied === "number" ? `\nEdiciones aplicadas: ${data.editsApplied}` : "";
      setAiOutput(`${data.message ?? "Ajustes aplicados"}${suffix}`);
    } catch {
      setAiOutput("No se pudo consultar la IA. Revisa la variable GEMINI_API_KEY.");
    } finally {
      setLoadingAI(false);
    }
  };

  const formatIngredient = (amount: number, unit: string) => {
    if (unit === "unidad") {
      const rounded = Number.isInteger(amount) ? amount.toString() : amount.toFixed(1);
      return `${rounded} ${amount === 1 ? "unidad" : "unidades"}`;
    }

    if (unit === "g" || unit === "ml") {
      const rounded = Number.isInteger(amount) ? amount.toString() : amount.toFixed(1);
      return `${rounded} ${unit}`;
    }

    return `${amount} ${unit}`;
  };

  const renderMealCard = (title: string, body: string, accent = "", controls?: React.ReactNode, note?: string) => (
    <article className={`rounded-2xl border border-black/10 bg-white p-4 shadow-sm ${accent}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-black/50">{title}</p>
      <p className="mt-2 text-sm font-medium text-black">{body}</p>
      {note ? <p className="mt-2 text-xs text-black/55">{note}</p> : null}
      {controls ? <div className="mt-3 flex flex-wrap gap-2">{controls}</div> : null}
    </article>
  );

  const renderRecipeCard = (
    title: string,
    recipe: DayPlan["comida"] | DayPlan["cena"],
    accent = "",
    controls?: React.ReactNode,
    note?: string
  ) => {
    const calories = getRecipePortionCalories(recipe);

    return (
      <article className={`rounded-2xl border border-black/10 bg-white p-4 shadow-sm ${accent}`}>
        <p className="text-xs font-semibold uppercase tracking-wide text-black/50">{title}</p>
        <h3 className="mt-2 text-base font-bold text-black">{recipe.title}</h3>
        {note ? <p className="mt-1 text-xs text-black/55">{note}</p> : null}
        <p className="mt-1 text-xs text-black/60">Tiempo estimado: {recipe.minutes} min</p>
        <p className="mt-1 text-xs text-black/60">Porciones: {calories.servings} personas (Lorena + Gigi)</p>
        <p className="mt-1 text-xs text-black/60">
          Calorías por ración: Lorena {calories.lorena.kcal} kcal · Gigi {calories.gigi.kcal} kcal
        </p>

        <h4 className="mt-3 text-sm font-semibold">Ingredientes:</h4>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-black/90">
          {recipe.ingredients.map((ingredient, index) => (
            <li key={`${recipe.id}-ing-${index}`}>
              {formatIngredient(scaleIngredientAmountForHousehold(ingredient.amount), ingredient.unit)} de {ingredient.name}
            </li>
          ))}
        </ul>

        <h4 className="mt-3 text-sm font-semibold">Pasos:</h4>
        <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm text-black/90">
          {recipe.steps.map((step, index) => (
            <li key={`${recipe.id}-step-${index}`}>{step}</li>
          ))}
        </ol>

        {controls ? <div className="mt-4 flex flex-wrap gap-2">{controls}</div> : null}
      </article>
    );
  };

  const day = daily.day as DayPlan;
  const upcomingLabel = mealLabel[daily.focus];
  const isCarryOverMeal = daily.sourceDate !== daily.scheduledDate;

  const capitalizeFirst = (text: string) => {
    if (!text) return text;
    return text.charAt(0).toUpperCase() + text.slice(1);
  };

  const formatCompactAmount = (value: number, unit: "g" | "ml" | "unidad") => {
    if (unit === "g") {
      if (value >= 1000) {
        const inKg = value / 1000;
        const formatted = Number.isInteger(inKg) ? `${inKg}` : `${inKg.toFixed(1)}`;
        return `${formatted}kg`;
      }
      return `${Math.round(value)}g`;
    }

    if (unit === "ml") {
      if (value >= 1000) {
        const inL = value / 1000;
        const formatted = Number.isInteger(inL) ? `${inL}` : `${inL.toFixed(1)}`;
        return `${formatted}L`;
      }
      return `${Math.round(value)}ml`;
    }

    return `${Math.round(value)} unidades`;
  };

  const unitByIngredient: Record<string, { gramsPerUnit: number; singular: string; plural: string }> = {
    berenjena: { gramsPerUnit: 320, singular: "Berenjena", plural: "Berenjenas" },
    brócoli: { gramsPerUnit: 300, singular: "Brócoli", plural: "Brócolis" },
    calabacín: { gramsPerUnit: 240, singular: "Calabacín", plural: "Calabacines" },
    tomate: { gramsPerUnit: 150, singular: "Tomate", plural: "Tomates" },
  };

  const formatShoppingLine = (name: string, finalAmountPurchased: number, unit: "g" | "ml" | "unidad") => {
    const normalized = name.toLowerCase();
    const product = capitalizeFirst(name);
    const byUnit = unitByIngredient[normalized];

    if (unit === "g" && byUnit) {
      const units = Math.ceil(finalAmountPurchased / byUnit.gramsPerUnit);
      const unitText = units === 1 ? byUnit.singular.toLowerCase() : byUnit.plural.toLowerCase();
      return `${product} - ${units} ${unitText}`;
    }

    return `${product} - ${formatCompactAmount(finalAmountPurchased, unit)}`;
  };

  const currentMealKey = mealExecutionKey(daily.sourceDate, daily.focus);
  const currentMealNote = isCarryOverMeal
    ? `Pendiente desde ${dayLabel(daily.sourceDate)}. Si no lo haces hoy, se moverá a mañana.`
    : `Planificado para ${dayLabel(daily.scheduledDate)}.`;

  const markMealAsCooked = () => {
    setMealExecution((previous) => ({
      ...previous,
      [currentMealKey]: {
        ...previous[currentMealKey],
        cooked: true,
        lastDeferredOn: undefined,
      },
    }));
  };

  const deferMealToTomorrow = () => {
    setMealExecution((previous) => ({
      ...previous,
      [currentMealKey]: {
        ...previous[currentMealKey],
        cooked: false,
        lastDeferredOn: daily.scheduledDate,
      },
    }));
  };

  const mealControls = (
    <>
      <button
        type="button"
        onClick={markMealAsCooked}
        className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white"
      >
        Cocinado
      </button>
      <button
        type="button"
        onClick={deferMealToTomorrow}
        className="rounded-lg border border-black/15 bg-white px-3 py-2 text-xs font-semibold text-black"
      >
        No lo cocino hoy
      </button>
    </>
  );

  const toggleShoppingCheck = (itemKey: string) => {
    if (!selectedWeek) return;

    setShoppingCheckedByWeek((previous) => ({
      ...previous,
      [selectedWeek.id]: {
        ...(previous[selectedWeek.id] ?? {}),
        [itemKey]: !(previous[selectedWeek.id] ?? {})[itemKey],
      },
    }));
  };

  const addCustomShoppingItem = () => {
    if (!selectedWeek) return;

    const label = customItemInput.trim();
    if (!label) return;
    const newItem: CustomShoppingItem = {
      id: `custom-${Date.now()}`,
      label,
      checked: false,
    };
    setCustomShoppingItemsByWeek((previous) => ({
      ...previous,
      [selectedWeek.id]: [newItem, ...(previous[selectedWeek.id] ?? [])],
    }));
    setCustomItemInput("");
  };

  const toggleCustomItem = (id: string) => {
    if (!selectedWeek) return;

    setCustomShoppingItemsByWeek((previous) => ({
      ...previous,
      [selectedWeek.id]: (previous[selectedWeek.id] ?? []).map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item
      ),
    }));
  };

  const removeCustomItem = (id: string) => {
    if (!selectedWeek) return;

    setCustomShoppingItemsByWeek((previous) => ({
      ...previous,
      [selectedWeek.id]: (previous[selectedWeek.id] ?? []).filter((item) => item.id !== id),
    }));
  };

  return (
    <main className="mx-auto min-h-screen max-w-md bg-neutral-50 px-4 py-5 text-black">
      <header className="mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Abrir menú"
              onClick={() => setMenuOpen(true)}
              className="rounded-lg border border-black/15 bg-white px-2 py-1 text-base leading-none"
            >
              ☰
            </button>
            <h1 className="text-lg font-bold">Stay Healthy</h1>
          </div>
          {currentPage === "inicio" ? (
            <button
              type="button"
              aria-label="Cambiar vista día/mes"
              onClick={() => setViewMode((previous) => (previous === "diaria" ? "mensual" : "diaria"))}
              className="relative flex h-7 w-28 items-center rounded-full bg-black/10 px-1"
            >
              <span
                className={`absolute left-1 top-1 h-5 w-[52px] rounded-full bg-white shadow transition-transform duration-200 ${
                  viewMode === "mensual" ? "translate-x-[56px]" : "translate-x-0"
                }`}
              />
              <span className="relative z-10 w-1/2 text-center text-[11px] font-semibold">Día</span>
              <span className="relative z-10 w-1/2 text-center text-[11px] font-semibold">Mes</span>
            </button>
          ) : (
            <div className="w-16" />
          )}
        </div>
      </header>

      {currentPage === "inicio" ? (
        <>
          {viewMode === "diaria" ? (
            <>
              <section className="space-y-3">
                {daily.focus === "merienda"
                  ? renderMealCard(upcomingLabel, day.merienda.title, "", mealControls, currentMealNote)
                  : daily.focus === "comida"
                    ? renderRecipeCard(upcomingLabel, day.comida, "border-l-4 border-l-emerald-500", mealControls, currentMealNote)
                    : renderRecipeCard(upcomingLabel, day.cena, "border-l-4 border-l-blue-500", mealControls, currentMealNote)}
              </section>

              <section className="mt-4 space-y-2">
                <h2 className="text-sm font-bold">Recordatorios de hoy</h2>
                {todayReminders.length === 0 ? (
                  <article className="rounded-2xl border border-black/10 bg-white p-3 text-sm text-black/60">
                    Sin recordatorios para hoy.
                  </article>
                ) : (
                  todayReminders.map((item) => (
                    <article key={item.id} className="rounded-2xl border border-black/10 bg-white p-3">
                      <p className="text-sm font-semibold">{item.title}</p>
                      <p className="text-xs text-black/60">{new Date(item.dateTime).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}</p>
                      <p className="mt-1 text-sm text-black/80">{item.description}</p>
                    </article>
                  ))
                )}
              </section>
            </>
          ) : (
            <section className="space-y-2 pb-32">
              {plan.days.map((item) => (
                <article key={item.date} className="rounded-2xl border border-black/10 bg-white p-3">
                  <p className="text-xs font-semibold text-black/60">{dayLabel(item.date)}</p>
                  <p className="mt-1 text-sm">Merienda: {item.merienda.title}</p>
                  <p className="text-sm">Comida: {item.comida.title}</p>
                  <p className="text-sm">Cena: {item.cena.title}</p>
                </article>
              ))}
            </section>
          )}

          {viewMode === "mensual" ? (
            <section className="sticky bottom-0 z-20 mt-3 space-y-2 pb-3">
              <article className="rounded-2xl border border-black/10 bg-white p-4">
                <div className="relative">
                  <textarea
                    value={aiPrompt}
                    onChange={(event) => setAiPrompt(event.target.value)}
                    rows={3}
                    placeholder="Ejemplo: quita el cerdo y súbeme pescado blanco"
                    className="w-full rounded-xl border border-black/15 px-3 py-2 pr-16 text-sm"
                  />
                  <button
                    onClick={submitAI}
                    disabled={loadingAI}
                    className="absolute bottom-2 right-2 rounded-lg bg-black px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
                  >
                    {loadingAI ? "..." : "IA"}
                  </button>
                </div>
                {aiOutput ? <pre className="mt-3 whitespace-pre-wrap rounded-xl bg-black/5 p-3 text-xs">{aiOutput}</pre> : null}
              </article>
            </section>
          ) : null}
        </>
      ) : null}

      {currentPage === "compra" ? (
        <section className="mt-2 space-y-3 pb-8">
          <div className="rounded-xl border border-black/10 bg-neutral-50 p-3">
            <h2 className="text-base font-bold">Compra semanal</h2>
            <p className="text-sm font-semibold capitalize">{monthTitle(month)}</p>
            {selectedWeek ? (
              <p className="text-sm text-black/70">
                Semana {selectedWeekIndex + 1} · {weekRangeLabel(selectedWeek.startDate, selectedWeek.endDate)}
              </p>
            ) : null}
            <p className="text-xs text-black/60">Total estimado: {shopping.totalEstimatedEur.toFixed(2)} €</p>
            <p className="mt-1 text-xs text-black/55">
              Al marcar una compra, sus sobrantes se arrastran automáticamente a las semanas siguientes.
            </p>
          </div>

          {weeks.length > 0 ? (
            <div className="flex items-center gap-2 rounded-xl border border-black/10 bg-white p-2">
              <button
                type="button"
                onClick={() => {
                  const previousWeek = weeks[selectedWeekIndex - 1];
                  if (previousWeek) setSelectedWeekId(previousWeek.id);
                }}
                disabled={selectedWeekIndex <= 0}
                className="rounded-lg border border-black/15 px-3 py-2 text-sm disabled:opacity-40"
              >
                Anterior
              </button>
              <div className="flex-1 text-center text-sm font-medium">
                {selectedWeek ? weekRangeLabel(selectedWeek.startDate, selectedWeek.endDate) : "Sin semana"}
              </div>
              <button
                type="button"
                onClick={() => {
                  const nextWeek = weeks[selectedWeekIndex + 1];
                  if (nextWeek) setSelectedWeekId(nextWeek.id);
                }}
                disabled={selectedWeekIndex === -1 || selectedWeekIndex >= weeks.length - 1}
                className="rounded-lg border border-black/15 px-3 py-2 text-sm disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          ) : null}

          <div className="rounded-xl border border-black/10 p-3">
            <p className="text-sm font-semibold">Añadir producto manual</p>
            <div className="mt-2 flex gap-2">
              <input
                value={customItemInput}
                onChange={(event) => setCustomItemInput(event.target.value)}
                placeholder="Ej: detergente"
                className="w-full rounded-lg border border-black/15 px-2 py-2 text-sm"
              />
              <button onClick={addCustomShoppingItem} className="rounded-lg bg-black px-3 text-sm text-white">
                +
              </button>
            </div>
            <p className="mt-2 text-xs text-black/55">Los checks y añadidos se guardan por semana.</p>
          </div>

          <div className="space-y-2">
            {shoppingItemsToBuy.map((item) => {
              const itemKey = `${item.name}-${item.requiredUnit}`;
              const checked = Boolean(shoppingChecked[itemKey]);
              return (
                <label key={itemKey} className="flex cursor-pointer items-start gap-2 rounded-xl border border-black/10 bg-white p-2">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleShoppingCheck(itemKey)}
                    className="mt-1 h-4 w-4"
                  />
                  <div className="text-sm">
                    <p className={`font-semibold ${checked ? "line-through text-black/50" : ""}`}>
                      {formatShoppingLine(item.name, item.finalAmountPurchased, item.packageUnit)}
                    </p>
                    {item.pantryAmountUsed > 0 ? (
                      <p className="mt-1 text-xs text-black/60">
                        Ya tienes {formatCompactAmount(item.pantryAmountUsed, item.requiredUnit)} en casa.
                      </p>
                    ) : null}
                  </div>
                </label>
              );
            })}

            {shoppingItemsToBuy.length === 0 ? (
              <article className="rounded-xl border border-black/10 bg-white p-3 text-sm text-black/60">
                Esta semana no necesitas comprar nada más para las recetas planificadas.
              </article>
            ) : null}

            {shoppingItemsCovered.length > 0 ? (
              <div className="space-y-2 pt-2">
                <p className="text-sm font-semibold">Ya lo tienes en casa</p>
                {shoppingItemsCovered.map((item) => {
                  const itemKey = `${item.name}-${item.requiredUnit}`;
                  const checked = Boolean(shoppingChecked[itemKey]);

                  return (
                    <label key={`covered-${itemKey}`} className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50/70 p-2">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleShoppingCheck(itemKey)}
                        className="mt-1 h-4 w-4"
                        disabled={!checked}
                      />
                      <div className="text-sm">
                        <p className={`font-semibold ${checked ? "text-emerald-800" : "text-black/75"}`}>
                          {capitalizeFirst(item.name)}
                        </p>
                        <p className="mt-1 text-xs text-black/60">
                          Cubre {formatCompactAmount(item.requiredAmount, item.requiredUnit)} de esta semana.
                        </p>
                        {item.pantryRemainingAfterPlanning > 0 ? (
                          <p className="text-xs text-black/60">
                            Te quedarán {formatCompactAmount(item.pantryRemainingAfterPlanning, item.requiredUnit)} después de estas recetas.
                          </p>
                        ) : null}
                      </div>
                    </label>
                  );
                })}
              </div>
            ) : null}

            {customShoppingItems.map((item) => (
              <div key={item.id} className="flex items-start gap-2 rounded-xl border border-black/10 bg-white p-2">
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={() => toggleCustomItem(item.id)}
                  className="mt-1 h-4 w-4"
                />
                <p className={`flex-1 text-sm ${item.checked ? "line-through text-black/50" : ""}`}>{item.label}</p>
                <button onClick={() => removeCustomItem(item.id)} className="text-xs text-black/60">
                  Eliminar
                </button>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {currentPage === "recordatorios" ? (
        <section className="mt-2 space-y-3 pb-8">
          <h2 className="text-base font-bold">Recordatorios</h2>
          <div className="flex gap-2">
            <button onClick={requestNotifications} className="rounded-xl bg-black px-3 py-2 text-xs text-white">
              Activar notificaciones
            </button>
            <button onClick={notifyUpcoming} className="rounded-xl border border-black/15 bg-white px-3 py-2 text-xs">
              Revisar 12h
            </button>
          </div>
          <p className="text-xs text-black/60">
            Cada evento se crea de 15 minutos y puedes añadirlo a Google Calendar o descargar ICS con aviso 15 min antes.
          </p>
          <div className="space-y-2">
            {reminders.slice(0, 40).map((item) => {
              const when = new Date(item.dateTime).toLocaleString("es-ES");
              const details = `${item.description}\n\nRecordatorio: 15 minutos antes.`;
              return (
                <div key={item.id} className="rounded-xl border border-black/10 bg-white p-3 text-sm">
                  <p className="font-semibold">{item.title}</p>
                  <p className="text-black/70">{when}</p>
                  <p className="mt-1">{item.description}</p>
                  <div className="mt-2 flex gap-2">
                    <a
                      href={buildGoogleCalendarLink(item.title, details, item.dateTime)}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border border-black/15 px-2 py-1 text-xs"
                    >
                      Gmail Calendar
                    </a>
                    <button
                      type="button"
                      onClick={() => downloadReminderIcs(item.title, details, item.dateTime, item.id)}
                      className="rounded-lg border border-black/15 px-2 py-1 text-xs"
                    >
                      Descargar .ics
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {menuOpen ? (
        <>
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={() => setMenuOpen(false)}
            className="fixed inset-0 z-30 bg-black/30"
          />
          <aside className="fixed left-0 top-0 z-40 h-full w-[88%] max-w-sm bg-white p-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold">Menú</h2>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="rounded-lg border border-black/15 px-2 py-1 text-sm"
              >
                ✕
              </button>
            </div>

            <nav className="mt-4 space-y-2">
              <button
                type="button"
                onClick={() => {
                  setCurrentPage("inicio");
                  setMenuOpen(false);
                }}
                className="w-full rounded-xl border border-black/10 px-3 py-3 text-left text-sm font-semibold"
              >
                Inicio
              </button>
              <button
                type="button"
                onClick={() => {
                  setCurrentPage("compra");
                  setMenuOpen(false);
                }}
                className="w-full rounded-xl border border-black/10 px-3 py-3 text-left text-sm font-semibold"
              >
                Compra semanal
              </button>
              <button
                type="button"
                onClick={() => {
                  setCurrentPage("recordatorios");
                  setMenuOpen(false);
                }}
                className="w-full rounded-xl border border-black/10 px-3 py-3 text-left text-sm font-semibold"
              >
                Recordatorios
              </button>
            </nav>
          </aside>
        </>
      ) : null}
    </main>
  );
}
