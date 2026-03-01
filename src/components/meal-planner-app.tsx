"use client";

import { useEffect, useMemo, useState } from "react";
import {
  buildShoppingList,
  generateMonthlyPlan,
  getCurrentMonth,
  getDailyFocus,
  getRecipePortionCalories,
  getReminders,
  scaleIngredientAmountForHousehold,
  type DayPlan,
  type MealType,
  type MonthlyPlan,
} from "@/lib/planner";

type ViewMode = "diaria" | "mensual";
type AppPage = "inicio" | "compra" | "recordatorios";

interface CustomShoppingItem {
  id: string;
  label: string;
  checked: boolean;
}

interface AiResponse {
  message: string;
  updatedPlan?: MonthlyPlan;
  editsApplied?: number;
}

const mealLabel: Record<MealType, string> = {
  merienda: "Merienda",
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
  const [shoppingChecked, setShoppingChecked] = useState<Record<string, boolean>>({});
  const [customShoppingItems, setCustomShoppingItems] = useState<CustomShoppingItem[]>([]);
  const [customItemInput, setCustomItemInput] = useState("");

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

  const shopping = useMemo(() => buildShoppingList(plan), [plan]);
  const reminders = useMemo(() => getReminders(plan), [plan]);
  const shoppingStorageKey = `shopping-checks-${month}`;
  const customStorageKey = `shopping-custom-${month}`;

  const daily = useMemo(() => getDailyFocus(plan, new Date()), [plan]);
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
    try {
      const checksRaw = localStorage.getItem(shoppingStorageKey);
      const customRaw = localStorage.getItem(customStorageKey);

      setShoppingChecked(checksRaw ? (JSON.parse(checksRaw) as Record<string, boolean>) : {});
      setCustomShoppingItems(customRaw ? (JSON.parse(customRaw) as CustomShoppingItem[]) : []);
    } catch {
      setShoppingChecked({});
      setCustomShoppingItems([]);
    }
  }, [shoppingStorageKey, customStorageKey]);

  useEffect(() => {
    localStorage.setItem(shoppingStorageKey, JSON.stringify(shoppingChecked));
  }, [shoppingChecked, shoppingStorageKey]);

  useEffect(() => {
    localStorage.setItem(customStorageKey, JSON.stringify(customShoppingItems));
  }, [customShoppingItems, customStorageKey]);

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

  const renderMealCard = (title: string, body: string, accent = "") => (
    <article className={`rounded-2xl border border-black/10 bg-white p-4 shadow-sm ${accent}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-black/50">{title}</p>
      <p className="mt-2 text-sm font-medium text-black">{body}</p>
    </article>
  );

  const renderRecipeCard = (
    title: string,
    recipe: DayPlan["comida"] | DayPlan["cena"],
    accent = ""
  ) => {
    const calories = getRecipePortionCalories(recipe);

    return (
      <article className={`rounded-2xl border border-black/10 bg-white p-4 shadow-sm ${accent}`}>
        <p className="text-xs font-semibold uppercase tracking-wide text-black/50">{title}</p>
        <h3 className="mt-2 text-base font-bold text-black">{recipe.title}</h3>
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
      </article>
    );
  };

  const day = daily.day as DayPlan;
  const upcomingLabel = mealLabel[daily.focus];

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

  const toggleShoppingCheck = (itemKey: string) => {
    setShoppingChecked((previous) => ({
      ...previous,
      [itemKey]: !previous[itemKey],
    }));
  };

  const addCustomShoppingItem = () => {
    const label = customItemInput.trim();
    if (!label) return;
    const newItem: CustomShoppingItem = {
      id: `custom-${Date.now()}`,
      label,
      checked: false,
    };
    setCustomShoppingItems((previous) => [newItem, ...previous]);
    setCustomItemInput("");
  };

  const toggleCustomItem = (id: string) => {
    setCustomShoppingItems((previous) =>
      previous.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item))
    );
  };

  const removeCustomItem = (id: string) => {
    setCustomShoppingItems((previous) => previous.filter((item) => item.id !== id));
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
                  viewMode === "mensual" ? "translate-x-[44px]" : "translate-x-0"
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
                  ? renderMealCard(upcomingLabel, day.merienda.title)
                  : daily.focus === "comida"
                    ? renderRecipeCard(upcomingLabel, day.comida, "border-l-4 border-l-emerald-500")
                    : renderRecipeCard(upcomingLabel, day.cena, "border-l-4 border-l-blue-500")}
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
            <h2 className="text-base font-bold">Compra mensual</h2>
            <p className="text-sm font-semibold capitalize">{monthTitle(month)}</p>
            <p className="text-xs text-black/60">Total estimado: {shopping.totalEstimatedEur.toFixed(2)} €</p>
          </div>

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
          </div>

          <div className="space-y-2">
            {shopping.items.map((item) => {
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
                  </div>
                </label>
              );
            })}

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
                Compra mensual
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
