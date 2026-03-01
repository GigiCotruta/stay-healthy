# Stay Healthy

Web app mobile-first para planificar meriendas, comidas y cenas del mes, con lista de compra redondeada por formato de venta y recordatorios semanales.

## Stack

- Next.js (App Router, TypeScript)
- Tailwind CSS
- Supabase (persistencia de plan mensual)
- Gemini API (asistente para ajustar recetas y compra)
- Despliegue: Vercel

## Reglas del planificador

- Recetas de máximo 30 minutos.
- Patrón semanal de proteína:
	- 2x carne roja (ternera o cerdo)
	- 3x pescado azul
	- 3x huevos (2 huevos por ingesta)
	- 3x pollo
	- 2x pescado blanco
- Acompañamientos semanales:
	- 2x patata/batata
	- 1x arroz
	- 1x pasta/couscous
	- 1x garbanzos
	- 1x lentejas
	- 1x habas
- Incluye crema de alcachofa con 2 huevos y crema de espárragos con 2 huevos.

## Setup local

1. Instala dependencias:

```bash
npm install
```

2. Crea tu entorno desde `.env.example`:

```bash
cp .env.example .env.local
```

3. Ejecuta el esquema en Supabase SQL Editor:

- `supabase/schema.sql`

4. Inicia en local:

```bash
npm run dev
```

## Variables de entorno

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY`

## Funcionalidades implementadas

- Vista diaria enfocada automáticamente en la próxima comida.
- Vista mensual completa con toggle diaria/mensual.
- Lista de compra mensual con redondeo por paquete (ej. arroz por kilo).
- Recordatorios de descongelado, compra semanal y batch cooking.
- Consulta a Gemini para aplicar ajustes reales sobre recetas y guardar automáticamente en Supabase.

## API endpoints

- `GET /api/plan?month=YYYY-MM` obtiene plan desde Supabase.
- `POST /api/plan` guarda/actualiza plan mensual en Supabase.
- `POST /api/ai-adjust` consulta Gemini, aplica ediciones al plan y persiste el resultado en Supabase.

## Historial de cambios IA

- Cada ajuste aplicado por IA se guarda en `meal_plan_ai_changes` con:
	- `month`
	- `prompt`
	- `ai_message`
	- `edits` (JSON)
	- `created_at`

## Modo desarrollo sin BBDD

- Si Supabase no está configurado, la app sigue mostrando interfaz, recetas y estimación de compra.
- En ese modo, el plan se mantiene en memoria/localStorage para pruebas de UI.

## Despliegue en Vercel

1. Importa el repositorio en Vercel.
2. Configura las variables de entorno.
3. Deploy.

Cuando el proyecto esté en producción, la app mantiene el plan mensual y te permite ajustar con IA el menú y la compra.
