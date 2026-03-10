import { NextResponse } from "next/server";
import { getSupabaseServerClient, hasSupabaseServerConfig } from "@/lib/supabase-server";

const TABLE = "meal_plan_state";

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
      return NextResponse.json({ error: "Estado no encontrado" }, { status: 404 });
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
    const payload = (await request.json()) as { month?: string; payload?: unknown };
    if (!payload?.month) {
      return NextResponse.json({ error: "Body inválido: falta month." }, { status: 400 });
    }

    const statePayload = payload.payload && typeof payload.payload === "object" ? payload.payload : {};

    const supabase = getSupabaseServerClient();
    const { error } = await supabase.from(TABLE).upsert(
      {
        month: payload.month,
        payload: statePayload,
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