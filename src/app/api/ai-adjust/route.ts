import { NextResponse } from "next/server";
import {
  applyAIPlanEdits,
  generateMonthlyPlan,
  getMeriendaCatalog,
  getRecipeCatalog,
  type AIPlanEdit,
  type MonthlyPlan,
} from "@/lib/planner";
import { getSupabaseServerClient, hasSupabaseServerConfig } from "@/lib/supabase-server";

interface AiRequest {
  month: string;
  prompt: string;
}

interface AiAdjustResponse {
  message: string;
  edits: AIPlanEdit[];
}

type MealSlot = "comida" | "cena";

const TABLE = "meal_plans";
const CHANGES_TABLE = "meal_plan_ai_changes";

const GEMINI_MODEL = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";

const stripCodeFence = (text: string) => text.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();

const parseAiJson = (text: string): AiAdjustResponse => {
  const sanitized = stripCodeFence(text);
  const parsed = JSON.parse(sanitized) as Partial<AiAdjustResponse>;

  return {
    message: parsed.message?.trim() || "Cambios aplicados al plan.",
    edits: Array.isArray(parsed.edits)
      ? parsed.edits
          .filter((item) => item && typeof item === "object")
          .map((item) => ({
            date: String(item.date ?? ""),
            meal: item.meal as AIPlanEdit["meal"],
            recipeId: typeof item.recipeId === "string" ? item.recipeId : undefined,
            meriendaId: typeof item.meriendaId === "string" ? item.meriendaId : undefined,
            reason: typeof item.reason === "string" ? item.reason : undefined,
          }))
      : [],
  };
};

const toPlanSummary = (plan: MonthlyPlan) =>
  plan.days.map((day) => `${day.date}: merienda=${day.merienda.id}; comida=${day.comida.id}; cena=${day.cena.id}`).join("\n");

const getMadridDateWithOffset = (offsetDays: number) => {
  const now = new Date();
  const madrid = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Madrid" }));
  madrid.setDate(madrid.getDate() + offsetDays);

  const year = madrid.getFullYear();
  const month = String(madrid.getMonth() + 1).padStart(2, "0");
  const day = String(madrid.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const normalizeTerm = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[.,;:!?]+$/g, "")
    .replace(/\s+/g, " ");

const parseTomorrowSwapInstruction = (prompt: string) => {
  const normalized = prompt.toLowerCase();
  if (!normalized.includes("mañana")) {
    return null;
  }

  const match = prompt.match(/no me apetece\s+([a-záéíóúñ\s]+?),?\s*c[aá]mbi[aá]melo\s+por\s+([a-záéíóúñ\s]+)/i);
  if (!match) {
    return null;
  }

  return {
    from: normalizeTerm(match[1]),
    to: normalizeTerm(match[2]),
  };
};

const recipeMatchesTerm = (
  recipe: { title: string; protein: string },
  term: string
) => {
  const title = recipe.title.toLowerCase();
  if (term.includes("pollo")) return recipe.protein === "pollo";
  if (term.includes("huevo")) return recipe.protein === "huevos";
  if (term.includes("pescado")) return recipe.protein === "pescado_azul" || recipe.protein === "pescado_blanco";
  if (term.includes("ternera")) return title.includes("ternera");
  if (term.includes("cerdo") || term.includes("lomo")) return title.includes("lomo") || title.includes("cerdo");
  if (term.includes("carne")) return recipe.protein === "carne_roja";
  return title.includes(term);
};

const buildTomorrowSwapEdits = (plan: MonthlyPlan, prompt: string): AiAdjustResponse | null => {
  const parsed = parseTomorrowSwapInstruction(prompt);
  if (!parsed) {
    return null;
  }

  const tomorrow = getMadridDateWithOffset(1);
  const tomorrowIndex = plan.days.findIndex((item) => item.date === tomorrow);
  if (tomorrowIndex < 0) {
    return null;
  }

  const tomorrowDay = plan.days[tomorrowIndex];
  const slots: MealSlot[] = ["comida", "cena"];

  for (const slot of slots) {
    const tomorrowRecipe = tomorrowDay[slot];
    if (!recipeMatchesTerm(tomorrowRecipe, parsed.from)) {
      continue;
    }

    for (let index = tomorrowIndex + 1; index < plan.days.length; index += 1) {
      const candidateDay = plan.days[index];
      const candidateRecipe = candidateDay[slot];

      if (!recipeMatchesTerm(candidateRecipe, parsed.to)) {
        continue;
      }

      return {
        message: `Hecho: cambié ${parsed.from} por ${parsed.to} para mañana y mantuve la compra total intercambiando el orden de recetas.`,
        edits: [
          {
            date: tomorrowDay.date,
            meal: slot,
            recipeId: candidateRecipe.id,
            reason: `Swap por preferencia de mañana (${parsed.from} -> ${parsed.to})`,
          },
          {
            date: candidateDay.date,
            meal: slot,
            recipeId: tomorrowRecipe.id,
            reason: "Swap compensatorio para mantener mismos ingredientes globales",
          },
        ],
      };
    }
  }

  return {
    message: `No encontré una receta de ${parsed.to} posterior para intercambiar sin alterar compra.`,
    edits: [],
  };
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AiRequest;

    if (!body.prompt?.trim()) {
      return NextResponse.json({ message: "Escribe una instrucción para ajustar recetas o compra." }, { status: 400 });
    }

    const supabase = hasSupabaseServerConfig ? getSupabaseServerClient() : null;

    let basePlan: MonthlyPlan = generateMonthlyPlan(body.month);

    if (supabase) {
      const { data: dbPlan, error: readError } = await supabase
        .from(TABLE)
        .select("payload")
        .eq("month", body.month)
        .maybeSingle();

      if (readError) {
        return NextResponse.json({ message: `No se pudo leer el plan en Supabase: ${readError.message}` }, { status: 500 });
      }

      basePlan = (dbPlan?.payload as MonthlyPlan | null) ?? basePlan;
    }

    const deterministicSwap = buildTomorrowSwapEdits(basePlan, body.prompt);
    if (deterministicSwap && deterministicSwap.edits.length > 0) {
      const updatedPlan = applyAIPlanEdits(basePlan, deterministicSwap.edits);

      if (supabase) {
        const { error: saveError } = await supabase.from(TABLE).upsert(
          {
            month: updatedPlan.month,
            payload: updatedPlan,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "month" }
        );

        if (saveError) {
          return NextResponse.json({ message: `No se pudo guardar el plan en Supabase: ${saveError.message}` }, { status: 500 });
        }

        await supabase.from(CHANGES_TABLE).insert({
          month: updatedPlan.month,
          prompt: body.prompt,
          ai_message: deterministicSwap.message,
          edits: deterministicSwap.edits,
          created_at: new Date().toISOString(),
        });
      }

      return NextResponse.json({
        message: deterministicSwap.message,
        editsApplied: deterministicSwap.edits.length,
        updatedPlan,
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      if (deterministicSwap && deterministicSwap.edits.length === 0) {
        return NextResponse.json({ message: deterministicSwap.message }, { status: 400 });
      }

      return NextResponse.json({
        message: "Configura GEMINI_API_KEY para activar la IA.",
      }, { status: 503 });
    }

    const recipes = getRecipeCatalog();
    const meriendas = getMeriendaCatalog();

    const systemPrompt = `Eres un motor de edición de planes de alimentación.\n\
Debes devolver SOLO JSON válido, sin markdown ni texto adicional.\n\
Formato de salida exacto:\n\
{\n\
  "message": "string corto en español",\n\
  "edits": [\n\
    {\n\
      "date": "YYYY-MM-DD",\n\
      "meal": "merienda|comida|cena",\n\
      "meriendaId": "solo si meal=merienda",\n\
      "recipeId": "solo si meal=comida o cena",\n\
      "reason": "opcional"\n\
    }\n\
  ]\n\
}\n\
No devuelvas IDs no listados.\n\
Mantén recetas <=30 minutos.\n\
Intenta preservar patrón semanal salvo que la instrucción lo rompa explícitamente.`;

    const userPrompt = `Mes: ${body.month}\n\nInstrucción del usuario:\n${body.prompt}\n\nPlan actual por IDs:\n${toPlanSummary(
      basePlan
    )}\n\nRecetas permitidas (comida/cena):\n${JSON.stringify(recipes)}\n\nMeriendas permitidas:\n${JSON.stringify(meriendas)}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 900 },
        }),
      }
    );

    if (!response.ok) {
      const detail = await response.text();
      return NextResponse.json({ message: `Error al consultar Gemini: ${detail}` }, { status: 502 });
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.toLowerCase().includes("application/json")) {
      const detail = (await response.text()).slice(0, 240);
      return NextResponse.json(
        {
          message:
            "Gemini devolvió una respuesta no JSON (posible bloqueo de red/proxy). Revisa acceso a generativelanguage.googleapis.com.",
          detail,
        },
        { status: 502 }
      );
    }

    let result: {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };

    try {
      result = (await response.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
    } catch {
      return NextResponse.json(
        {
          message:
            "No se pudo interpretar la respuesta de Gemini como JSON (posible bloqueo de red/proxy).",
        },
        { status: 502 }
      );
    }

    const text =
      result.candidates?.[0]?.content?.parts
        ?.map((part) => part.text ?? "")
        .join("\n")
        .trim() ?? "";

    if (!text) {
      return NextResponse.json({ message: "Gemini no devolvió contenido útil." }, { status: 502 });
    }

    let parsed: AiAdjustResponse;
    try {
      parsed = parseAiJson(text);
    } catch {
      return NextResponse.json(
        {
          message:
            "La respuesta de IA no pudo parsearse como JSON. Reintenta con una instrucción más concreta (qué día y qué comida cambiar).",
        },
        { status: 502 }
      );
    }

    const updatedPlan = applyAIPlanEdits(basePlan, parsed.edits);

    if (supabase) {
      const { error: saveError } = await supabase.from(TABLE).upsert(
        {
          month: updatedPlan.month,
          payload: updatedPlan,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "month" }
      );

      if (saveError) {
        return NextResponse.json({ message: `No se pudo guardar el plan en Supabase: ${saveError.message}` }, { status: 500 });
      }

      await supabase.from(CHANGES_TABLE).insert({
        month: updatedPlan.month,
        prompt: body.prompt,
        ai_message: parsed.message,
        edits: parsed.edits,
        created_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      message: parsed.message,
      editsApplied: parsed.edits.length,
      updatedPlan,
    });
  } catch (error) {
    return NextResponse.json({ message: (error as Error).message }, { status: 500 });
  }
}
