import { NextResponse } from "next/server";
import { generateMonthlyPlan } from "@/lib/planner";
import { getSupabaseServerClient, hasSupabaseServerConfig } from "@/lib/supabase-server";

const TABLE = "meal_plans";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month");

  if (!month) {
    return NextResponse.json({ error: "Falta parámetro month (YYYY-MM)." }, { status: 400 });
  }

  if (!hasSupabaseServerConfig) {
    return NextResponse.json({ error: "Supabase no configurado" }, { status: 503 });
  }

  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from(TABLE)
      .select("payload")
      .eq("month", month)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data?.payload) {
      return NextResponse.json({ error: "Plan no encontrado" }, { status: 404 });
    }

    return NextResponse.json(data.payload);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!hasSupabaseServerConfig) {
    return NextResponse.json({ error: "Supabase no configurado" }, { status: 503 });
  }

  try {
    const payload = (await request.json()) as { month?: string };
    if (!payload?.month) {
      return NextResponse.json({ error: "Body inválido: falta month." }, { status: 400 });
    }

    const planPayload = Array.isArray((payload as { days?: unknown }).days)
      ? payload
      : generateMonthlyPlan(payload.month);

    const supabase = getSupabaseServerClient();
    const { error } = await supabase.from(TABLE).upsert(
      {
        month: payload.month,
        payload: planPayload,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "month" }
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
