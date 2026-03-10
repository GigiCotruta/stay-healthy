export type MealType = "merienda" | "comida" | "cena";

export type ProteinType =
  | "carne_roja"
  | "pescado_azul"
  | "huevos"
  | "pollo"
  | "pescado_blanco"
  | "vegetal";

export type SideType =
  | "patata_batata"
  | "arroz"
  | "pasta_couscous"
  | "garbanzos"
  | "lentejas"
  | "habas"
  | "ensalada_verduras";

export type IngredientUnit = "g" | "ml" | "unidad";

export interface Ingredient {
  name: string;
  amount: number;
  unit: IngredientUnit;
  mercadonaUrl?: string;
}

export interface Recipe {
  id: string;
  title: string;
  mealType: "comida" | "cena";
  protein: ProteinType;
  side: SideType;
  minutes: number;
  ingredients: Ingredient[];
  steps: string[];
  freezerProtein: boolean;
}

export interface DailyCalorieTarget {
  min: number;
  max: number;
}

export interface RecipePortionCalories {
  servings: 2;
  lorena: { kcal: number; portionFactor: number; target: DailyCalorieTarget };
  gigi: { kcal: number; portionFactor: number; target: DailyCalorieTarget };
}

export interface Merienda {
  id: string;
  title: string;
  ingredients: Ingredient[];
}

export interface DayPlan {
  date: string;
  merienda: Merienda;
  comida: Recipe;
  cena: Recipe;
}

export interface MonthlyPlan {
  month: string;
  days: DayPlan[];
}

export interface PlanWeek {
  id: string;
  month: string;
  startDate: string;
  endDate: string;
  days: DayPlan[];
}

export interface ReminderItem {
  id: string;
  dateTime: string;
  title: string;
  description: string;
}

export interface MealExecutionState {
  cooked?: boolean;
  lastDeferredOn?: string;
}

export interface DailyFocusResult {
  day: DayPlan;
  focus: MealType;
  scheduledDate: string;
  sourceDate: string;
}

interface PackageRule {
  unit: IngredientUnit;
  packageSize: number;
  pricePerPackageEur: number;
  mercadonaUrl?: string;
}

export interface ShoppingLine {
  name: string;
  requiredAmount: number;
  requiredUnit: IngredientUnit;
  pantryAmountUsed: number;
  netAmountNeeded: number;
  packageSize: number;
  packageUnit: IngredientUnit;
  packagesToBuy: number;
  finalAmountPurchased: number;
  pantryRemainingAfterPlanning: number;
  estimatedTotalEur: number;
  mercadonaUrl?: string;
}

export interface PantryItem {
  name: string;
  unit: IngredientUnit;
  amount: number;
}

export interface ShoppingList {
  month: string;
  startDate: string;
  endDate: string;
  totalEstimatedEur: number;
  items: ShoppingLine[];
}

export interface AIPlanEdit {
  date: string;
  meal: MealType;
  recipeId?: string;
  meriendaId?: string;
  reason?: string;
}

export const DAILY_CALORIE_TARGETS = {
  lorena: { min: 1700, max: 1800 },
  gigi: { min: 2500, max: 2700 },
} as const;

export const HOUSEHOLD_PORTION_FACTORS = {
  lorena: 0.8,
  gigi: 1.2,
} as const;

export const HOUSEHOLD_TOTAL_PORTION_FACTOR =
  HOUSEHOLD_PORTION_FACTORS.lorena + HOUSEHOLD_PORTION_FACTORS.gigi;

const MERCADONA_SEARCH = "https://tienda.mercadona.es/search-results?query=";

const link = (name: string) => `${MERCADONA_SEARCH}${encodeURIComponent(name)}`;

const WEEKLY_MAIN_SLOTS: Array<{ comida: string[]; cena: string[] }> = [
  {
    comida: ["pollo_arroz_ensalada", "pollo_arroz_calabacin_limon"],
    cena: ["salmon_brocoli_airfryer", "salmon_calabacin_limon_sesamo"],
  },
  { comida: ["ternera_patata_airfryer"], cena: ["crema_alcachofa_2_huevos"] },
  {
    comida: ["merluza_lentejas_ensalada"],
    cena: ["pollo_couscous_berenjena", "nuggets_pollo_coliflor_queso_couscous"],
  },
  {
    comida: ["caballa_garbanzos_ensalada", "caballa_garbanzos_mozzarella_manzana"],
    cena: ["lomo_batata_coliflor"],
  },
  { comida: ["pollo_habas_ensalada"], cena: ["crema_esparragos_2_huevos"] },
  {
    comida: ["bacalao_ensalada_grande", "bacalao_ensalada_yogur_limon"],
    cena: ["sardinas_berenjena_brocoli"],
  },
  {
    comida: ["tortilla_2_huevos_ensalada", "tortilla_espinacas_requeson"],
    cena: ["verduras_airfryer_completa"],
  },
];

const MERIENDAS: Merienda[] = [
  {
    id: "yogur_mas_fruta",
    title: "Yogur natural/soja/coco + 1 fruta",
    ingredients: [
      { name: "yogur natural", amount: 1, unit: "unidad", mercadonaUrl: link("yogur natural") },
      { name: "manzana", amount: 1, unit: "unidad", mercadonaUrl: link("manzana") },
    ],
  },
  {
    id: "queso_fresco_mas_fruta",
    title: "Queso fresco batido/tarrina + 1 fruta",
    ingredients: [
      { name: "queso fresco batido", amount: 1, unit: "unidad", mercadonaUrl: link("queso fresco batido") },
      { name: "pera", amount: 1, unit: "unidad", mercadonaUrl: link("pera") },
    ],
  },
  {
    id: "frutos_secos_mas_fruta",
    title: "Puñado de frutos secos sin sal + 1 fruta",
    ingredients: [
      { name: "manzana", amount: 1, unit: "unidad", mercadonaUrl: link("manzana") },
      { name: "nueces", amount: 25, unit: "g", mercadonaUrl: link("nueces") },
    ],
  },
  {
    id: "batido_fruta_vegetal",
    title: "Batido de fruta con leche vegetal",
    ingredients: [
      { name: "plátano", amount: 1, unit: "unidad", mercadonaUrl: link("platano") },
      { name: "leche vegetal", amount: 250, unit: "ml", mercadonaUrl: link("leche vegetal") },
    ],
  },
  {
    id: "batido_vegetales",
    title: "Batido de vegetales + 1 fruta",
    ingredients: [
      { name: "espinacas frescas", amount: 60, unit: "g", mercadonaUrl: link("espinacas") },
      { name: "pepino", amount: 120, unit: "g", mercadonaUrl: link("pepino") },
      { name: "manzana", amount: 1, unit: "unidad", mercadonaUrl: link("manzana") },
    ],
  },
  {
    id: "compota_nueces_canela",
    title: "Compota de manzana/pera con nueces y canela",
    ingredients: [
      { name: "compota de manzana", amount: 150, unit: "g", mercadonaUrl: link("compota manzana") },
      { name: "nueces", amount: 20, unit: "g", mercadonaUrl: link("nueces") },
      { name: "canela", amount: 2, unit: "g", mercadonaUrl: link("canela") },
    ],
  },
  {
    id: "crudites_hummus",
    title: "Crudités con hummus/guacamole/tzatziki + 1 fruta",
    ingredients: [
      { name: "pepino", amount: 80, unit: "g", mercadonaUrl: link("pepino") },
      { name: "zanahoria", amount: 100, unit: "g", mercadonaUrl: link("zanahoria") },
      { name: "hummus", amount: 60, unit: "g", mercadonaUrl: link("hummus") },
      { name: "mandarina", amount: 1, unit: "unidad", mercadonaUrl: link("mandarina") },
    ],
  },
  {
    id: "encurtidos_aceitunas",
    title: "Cuenco de encurtidos y aceitunas + 1 fruta",
    ingredients: [
      { name: "encurtidos", amount: 80, unit: "g", mercadonaUrl: link("encurtidos") },
      { name: "aceitunas", amount: 40, unit: "g", mercadonaUrl: link("aceitunas") },
      { name: "pera", amount: 1, unit: "unidad", mercadonaUrl: link("pera") },
    ],
  },
  {
    id: "fruta_deshidratada",
    title: "Fruta deshidratada sin azúcar + 1 fruta",
    ingredients: [
      { name: "fruta deshidratada", amount: 30, unit: "g", mercadonaUrl: link("fruta deshidratada") },
      { name: "manzana", amount: 1, unit: "unidad", mercadonaUrl: link("manzana") },
    ],
  },
  {
    id: "palomitas_caseras",
    title: "Cuenco de palomitas caseras + 1 fruta",
    ingredients: [
      { name: "maíz para palomitas", amount: 40, unit: "g", mercadonaUrl: link("maiz palomitas") },
      { name: "manzana", amount: 1, unit: "unidad", mercadonaUrl: link("manzana") },
    ],
  },
  {
    id: "chocolate_mas_fruta",
    title: "Chocolate negro 85% + 1 fruta",
    ingredients: [
      { name: "chocolate negro 85%", amount: 20, unit: "g", mercadonaUrl: link("chocolate negro 85") },
      { name: "plátano", amount: 1, unit: "unidad", mercadonaUrl: link("platano") },
    ],
  },
];

const RECIPES: Recipe[] = [
  {
    id: "pollo_arroz_ensalada",
    title: "Pollo a la plancha con arroz y ensalada",
    mealType: "comida",
    protein: "pollo",
    side: "arroz",
    minutes: 25,
    freezerProtein: true,
    ingredients: [
      { name: "pechuga de pollo", amount: 180, unit: "g", mercadonaUrl: link("pechuga de pollo") },
      { name: "arroz redondo", amount: 80, unit: "g", mercadonaUrl: link("arroz") },
      { name: "lechuga", amount: 100, unit: "g", mercadonaUrl: link("lechuga") },
      { name: "tomate", amount: 120, unit: "g", mercadonaUrl: link("tomate") },
      { name: "aceite de oliva virgen extra", amount: 10, unit: "ml", mercadonaUrl: link("aceite de oliva") },
    ],
    steps: [
      "Lavar el arroz y cocerlo en agua con sal durante 15 minutos.",
      "Escurrir el arroz y reservarlo caliente.",
      "Cocinar la pechuga de pollo a la plancha 6-7 minutos por lado.",
      "Lavar y cortar lechuga y tomate para preparar una ensalada abundante.",
      "Aliñar la ensalada con AOVE, sal y pimienta, y servir junto al arroz y pollo.",
    ],
  },
  {
    id: "salmon_brocoli_airfryer",
    title: "Salmón con brócoli cocido y airfryer",
    mealType: "cena",
    protein: "pescado_azul",
    side: "ensalada_verduras",
    minutes: 20,
    freezerProtein: true,
    ingredients: [
      { name: "lomo de salmón", amount: 180, unit: "g", mercadonaUrl: link("salmon") },
      { name: "brócoli", amount: 220, unit: "g", mercadonaUrl: link("brocoli") },
      { name: "aceite de oliva virgen extra", amount: 10, unit: "ml", mercadonaUrl: link("aceite de oliva") },
    ],
    steps: [
      "Cortar los tallos del brócoli y lavar bien los ramilletes.",
      "Hervir el brócoli 8 minutos en agua con sal y escurrir.",
      "Pasar el brócoli a un bol, sazonar y añadir media cucharada de AOVE.",
      "Meter el brócoli en la airfryer 15 minutos a 200ºC.",
      "Marcar el salmón 3-4 minutos por lado en plancha y servir junto al brócoli.",
    ],
  },
  {
    id: "salmon_calabacin_limon_sesamo",
    title: "Salmón con calabacín, limón y sésamo",
    mealType: "cena",
    protein: "pescado_azul",
    side: "ensalada_verduras",
    minutes: 22,
    freezerProtein: true,
    ingredients: [
      { name: "lomo de salmón", amount: 180, unit: "g", mercadonaUrl: link("salmon") },
      { name: "calabacín", amount: 220, unit: "g", mercadonaUrl: link("calabacin") },
      { name: "limón", amount: 60, unit: "g", mercadonaUrl: link("limon") },
      { name: "semillas de sésamo", amount: 8, unit: "g", mercadonaUrl: link("sesamo") },
      { name: "aceite de oliva virgen extra", amount: 8, unit: "ml", mercadonaUrl: link("aceite de oliva") },
    ],
    steps: [
      "Cortar el calabacín en medias lunas finas y saltear 6-7 minutos con una pizca de sal.",
      "Rallar un poco de limón y exprimir la mitad para preparar un aliño rápido.",
      "Cocinar el salmón a la plancha 3-4 minutos por lado.",
      "Añadir el limón y el sésamo al calabacín justo al final para que quede aromático.",
      "Servir el salmón sobre el calabacín y terminar con unas gotas de AOVE.",
    ],
  },
  {
    id: "ternera_patata_airfryer",
    title: "Ternera con patata en airfryer",
    mealType: "comida",
    protein: "carne_roja",
    side: "patata_batata",
    minutes: 28,
    freezerProtein: true,
    ingredients: [
      { name: "ternera filetes", amount: 180, unit: "g", mercadonaUrl: link("ternera filetes") },
      { name: "patata", amount: 250, unit: "g", mercadonaUrl: link("patata") },
      { name: "ensalada mezcla", amount: 80, unit: "g", mercadonaUrl: link("ensalada") },
      { name: "aceite de oliva virgen extra", amount: 8, unit: "ml", mercadonaUrl: link("aceite de oliva") },
    ],
    steps: [
      "Pelar y cortar la patata en dados medianos.",
      "Hervir la patata 8 minutos para ablandar y escurrir.",
      "Sazonar la patata con AOVE y especias y meterla en airfryer 12-15 minutos a 200ºC.",
      "Hacer los filetes de ternera vuelta y vuelta 2-3 minutos por lado.",
      "Acompañar con ensalada fresca aliñada.",
    ],
  },
  {
    id: "crema_alcachofa_2_huevos",
    title: "Crema de alcachofa con 2 huevos",
    mealType: "cena",
    protein: "huevos",
    side: "ensalada_verduras",
    minutes: 22,
    freezerProtein: false,
    ingredients: [
      { name: "bote de alcachofa cocida", amount: 1, unit: "unidad", mercadonaUrl: link("alcachofa") },
      { name: "huevos", amount: 2, unit: "unidad", mercadonaUrl: link("huevos") },
      { name: "aceite de oliva virgen extra", amount: 10, unit: "ml", mercadonaUrl: link("aceite de oliva") },
      { name: "vinagre", amount: 10, unit: "ml", mercadonaUrl: link("vinagre") },
    ],
    steps: [
      "Verter el bote de alcachofa escurrido en un vaso batidor.",
      "Hervir 2 huevos durante 10 minutos y enfriar.",
      "Añadir al vaso batidor los huevos cocidos cortados en trozos grandes.",
      "Incorporar una cucharada de AOVE y una cucharada de vinagre.",
      "Triturar hasta obtener consistencia de crema y sazonar con sal y pimienta.",
    ],
  },
  {
    id: "merluza_lentejas_ensalada",
    title: "Merluza con lentejas y ensalada",
    mealType: "comida",
    protein: "pescado_blanco",
    side: "lentejas",
    minutes: 24,
    freezerProtein: true,
    ingredients: [
      { name: "filete de merluza", amount: 180, unit: "g", mercadonaUrl: link("merluza") },
      { name: "lentejas cocidas", amount: 180, unit: "g", mercadonaUrl: link("lentejas cocidas") },
      { name: "pimiento", amount: 80, unit: "g", mercadonaUrl: link("pimiento") },
      { name: "cebolla", amount: 60, unit: "g", mercadonaUrl: link("cebolla") },
    ],
    steps: [
      "Escurrir y enjuagar las lentejas cocidas.",
      "Picar cebolla y pimiento y saltear 6 minutos con poco AOVE.",
      "Añadir las lentejas y cocinar 3 minutos más para integrar sabores.",
      "Hacer la merluza a la plancha 3 minutos por lado.",
      "Servir la merluza con la base de lentejas templadas.",
    ],
  },
  {
    id: "pollo_couscous_berenjena",
    title: "Pollo con couscous y berenjena",
    mealType: "cena",
    protein: "pollo",
    side: "pasta_couscous",
    minutes: 25,
    freezerProtein: true,
    ingredients: [
      { name: "muslo de pollo deshuesado", amount: 180, unit: "g", mercadonaUrl: link("muslo de pollo") },
      { name: "couscous", amount: 80, unit: "g", mercadonaUrl: link("couscous") },
      { name: "berenjena", amount: 220, unit: "g", mercadonaUrl: link("berenjena") },
    ],
    steps: [
      "Cortar la berenjena en medias lunas, salar y dejar reposar 5 minutos.",
      "Secar y meter la berenjena en airfryer 14 minutos a 200ºC.",
      "Hervir agua y verterla sobre el couscous; tapar 5 minutos y soltar con tenedor.",
      "Hacer el pollo en plancha caliente 5 minutos por lado.",
      "Servir pollo sobre couscous con berenjena al lado.",
    ],
  },
  {
    id: "caballa_garbanzos_ensalada",
    title: "Caballa con garbanzos y ensalada",
    mealType: "comida",
    protein: "pescado_azul",
    side: "garbanzos",
    minutes: 18,
    freezerProtein: false,
    ingredients: [
      { name: "caballa en filetes", amount: 170, unit: "g", mercadonaUrl: link("caballa") },
      { name: "garbanzos cocidos", amount: 180, unit: "g", mercadonaUrl: link("garbanzos cocidos") },
      { name: "rúcula", amount: 70, unit: "g", mercadonaUrl: link("rucula") },
      { name: "tomate cherry", amount: 100, unit: "g", mercadonaUrl: link("tomate cherry") },
    ],
    steps: [
      "Enjuagar y escurrir los garbanzos cocidos.",
      "Mezclar garbanzos con rúcula y tomate cherry cortado a la mitad.",
      "Aliñar con AOVE, vinagre, sal y pimienta.",
      "Marcar la caballa 3 minutos por lado en plancha.",
      "Servir la ensalada templada con la caballa por encima.",
    ],
  },
  {
    id: "caballa_garbanzos_mozzarella_manzana",
    title: "Caballa con garbanzos salteados, mozzarella, pepino y manzana",
    mealType: "comida",
    protein: "pescado_azul",
    side: "garbanzos",
    minutes: 20,
    freezerProtein: false,
    ingredients: [
      { name: "caballa en filetes", amount: 170, unit: "g", mercadonaUrl: link("caballa") },
      { name: "garbanzos cocidos", amount: 180, unit: "g", mercadonaUrl: link("garbanzos cocidos") },
      { name: "mozzarella fresca", amount: 80, unit: "g", mercadonaUrl: link("mozzarella") },
      { name: "pepino", amount: 120, unit: "g", mercadonaUrl: link("pepino") },
      { name: "manzana", amount: 80, unit: "g", mercadonaUrl: link("manzana") },
      { name: "limón", amount: 40, unit: "g", mercadonaUrl: link("limon") },
    ],
    steps: [
      "Escurrir los garbanzos y saltearlos 4 minutos hasta que queden dorados por fuera.",
      "Rallar la manzana y mezclarla con pepino en cubos pequeños y zumo de limón.",
      "Desmenuzar la mozzarella con las manos para que se reparta mejor en la ensalada.",
      "Marcar la caballa 3 minutos por lado en plancha bien caliente.",
      "Montar el plato con garbanzos calientes, la mezcla fresca por encima y la caballa al final.",
    ],
  },
  {
    id: "lomo_batata_coliflor",
    title: "Cinta de lomo vuelta y vuelta con brócoli airfryer",
    mealType: "cena",
    protein: "carne_roja",
    side: "patata_batata",
    minutes: 30,
    freezerProtein: true,
    ingredients: [
      { name: "cinta de lomo", amount: 180, unit: "g", mercadonaUrl: link("lomo de cerdo") },
      { name: "brócoli", amount: 240, unit: "g", mercadonaUrl: link("brocoli") },
      { name: "batata", amount: 180, unit: "g", mercadonaUrl: link("batata") },
    ],
    steps: [
      "Cortar los tallos del brócoli, lavar y separar ramilletes.",
      "Hervir el brócoli 8 minutos en agua con sal y escurrir bien.",
      "Sazonar el brócoli en un bol y meter en airfryer 15 minutos a 200ºC.",
      "Cortar la batata en cubos y hacerla 12 minutos en airfryer para acompañar.",
      "Hacer la cinta de lomo vuelta y vuelta 2-3 minutos por lado y servir con el brócoli.",
    ],
  },
  {
    id: "pollo_habas_ensalada",
    title: "Pollo salteado con habas y ensalada",
    mealType: "comida",
    protein: "pollo",
    side: "habas",
    minutes: 25,
    freezerProtein: true,
    ingredients: [
      { name: "pechuga de pollo", amount: 180, unit: "g", mercadonaUrl: link("pechuga de pollo") },
      { name: "habas congeladas", amount: 180, unit: "g", mercadonaUrl: link("habas congeladas") },
      { name: "ensalada mezcla", amount: 100, unit: "g", mercadonaUrl: link("ensalada") },
    ],
    steps: [
      "Cocer las habas congeladas 8 minutos en agua con sal y escurrir.",
      "Cortar la pechuga en tiras y cocinar en plancha 8-10 minutos.",
      "Añadir las habas al pollo 2 minutos para integrar.",
      "Acompañar con ensalada crujiente aliñada al gusto.",
    ],
  },
  {
    id: "crema_esparragos_2_huevos",
    title: "Crema de espárragos con 2 huevos",
    mealType: "cena",
    protein: "huevos",
    side: "ensalada_verduras",
    minutes: 22,
    freezerProtein: false,
    ingredients: [
      { name: "bote de espárragos", amount: 1, unit: "unidad", mercadonaUrl: link("esparragos") },
      { name: "huevos", amount: 2, unit: "unidad", mercadonaUrl: link("huevos") },
      { name: "aceite de oliva virgen extra", amount: 10, unit: "ml", mercadonaUrl: link("aceite de oliva") },
      { name: "vinagre", amount: 10, unit: "ml", mercadonaUrl: link("vinagre") },
    ],
    steps: [
      "Verter el bote de espárragos escurrido en un vaso batidor.",
      "Hervir los 2 huevos durante 10 minutos, enfriar y pelar.",
      "Introducir los huevos cocidos cortados en trozos grandes en el vaso batidor.",
      "Añadir una cucharada de AOVE y una cucharada de vinagre.",
      "Triturar hasta conseguir consistencia de crema y sazonar con sal y pimienta.",
    ],
  },
  {
    id: "bacalao_ensalada_grande",
    title: "Bacalao con ensalada grande",
    mealType: "comida",
    protein: "pescado_blanco",
    side: "ensalada_verduras",
    minutes: 18,
    freezerProtein: true,
    ingredients: [
      { name: "lomos de bacalao", amount: 180, unit: "g", mercadonaUrl: link("bacalao") },
      { name: "lechuga", amount: 120, unit: "g", mercadonaUrl: link("lechuga") },
      { name: "pepino", amount: 100, unit: "g", mercadonaUrl: link("pepino") },
      { name: "tomate", amount: 120, unit: "g", mercadonaUrl: link("tomate") },
    ],
    steps: [
      "Secar bien los lomos de bacalao para que doren mejor.",
      "Marcar en plancha 3-4 minutos por lado con poco aceite.",
      "Preparar una ensalada grande con lechuga, pepino y tomate.",
      "Aliñar al gusto y servir junto al bacalao caliente.",
    ],
  },
  {
    id: "bacalao_ensalada_yogur_limon",
    title: "Bacalao con ensalada crujiente y yogur al limón",
    mealType: "comida",
    protein: "pescado_blanco",
    side: "ensalada_verduras",
    minutes: 20,
    freezerProtein: true,
    ingredients: [
      { name: "lomos de bacalao", amount: 180, unit: "g", mercadonaUrl: link("bacalao") },
      { name: "pepino", amount: 120, unit: "g", mercadonaUrl: link("pepino") },
      { name: "zanahoria", amount: 90, unit: "g", mercadonaUrl: link("zanahoria") },
      { name: "yogur natural", amount: 1, unit: "unidad", mercadonaUrl: link("yogur natural") },
      { name: "limón", amount: 40, unit: "g", mercadonaUrl: link("limon") },
      { name: "lechuga", amount: 100, unit: "g", mercadonaUrl: link("lechuga") },
    ],
    steps: [
      "Rallar la zanahoria y cortar el pepino fino para una ensalada muy crujiente.",
      "Mezclar el yogur con limón, sal y pimienta para una salsa ligera.",
      "Hacer el bacalao a la plancha 3-4 minutos por lado con poco aceite.",
      "Combinar lechuga, zanahoria y pepino, y aliñar con la salsa de yogur al limón.",
      "Servir el bacalao recién hecho sobre la ensalada fría.",
    ],
  },
  {
    id: "sardinas_berenjena_brocoli",
    title: "Sardinas con berenjena y brócoli airfryer",
    mealType: "cena",
    protein: "pescado_azul",
    side: "ensalada_verduras",
    minutes: 26,
    freezerProtein: true,
    ingredients: [
      { name: "sardinas limpias", amount: 190, unit: "g", mercadonaUrl: link("sardinas") },
      { name: "berenjena", amount: 180, unit: "g", mercadonaUrl: link("berenjena") },
      { name: "brócoli", amount: 180, unit: "g", mercadonaUrl: link("brocoli") },
    ],
    steps: [
      "Cortar berenjena y preparar ramilletes de brócoli.",
      "Hervir el brócoli 6-8 minutos y escurrir para acelerar el cocinado final.",
      "Sazonar berenjena y brócoli y llevar a la airfryer 14-15 minutos a 200ºC.",
      "Hacer las sardinas a la plancha 4 minutos por lado.",
      "Servir las sardinas con las verduras calientes.",
    ],
  },
  {
    id: "tortilla_2_huevos_ensalada",
    title: "Tortilla de 2 huevos con ensalada",
    mealType: "comida",
    protein: "huevos",
    side: "ensalada_verduras",
    minutes: 15,
    freezerProtein: false,
    ingredients: [
      { name: "huevos", amount: 2, unit: "unidad", mercadonaUrl: link("huevos") },
      { name: "calabacín", amount: 120, unit: "g", mercadonaUrl: link("calabacin") },
      { name: "ensalada mezcla", amount: 100, unit: "g", mercadonaUrl: link("ensalada") },
    ],
    steps: [
      "Lavar y cortar el calabacín en dados pequeños.",
      "Saltear el calabacín 4 minutos hasta que quede tierno.",
      "Batir 2 huevos, añadir el calabacín y cuajar la tortilla 3 minutos por lado.",
      "Acompañar con ensalada aliñada y servir.",
    ],
  },
  {
    id: "verduras_airfryer_completa",
    title: "Bandeja de verduras en airfryer",
    mealType: "cena",
    protein: "vegetal",
    side: "ensalada_verduras",
    minutes: 22,
    freezerProtein: false,
    ingredients: [
      { name: "coliflor", amount: 180, unit: "g", mercadonaUrl: link("coliflor") },
      { name: "berenjena", amount: 180, unit: "g", mercadonaUrl: link("berenjena") },
      { name: "brócoli", amount: 180, unit: "g", mercadonaUrl: link("brocoli") },
      { name: "aceite de oliva virgen extra", amount: 12, unit: "ml", mercadonaUrl: link("aceite de oliva") },
    ],
    steps: [
      "Lavar y cortar todas las verduras en trozos similares.",
      "Hervir coliflor y brócoli 6 minutos para dejarlos al dente.",
      "Escurrir bien, mezclar con berenjena cruda, AOVE y especias.",
      "Cocinar en airfryer 18-20 minutos a 200ºC, removiendo a mitad de tiempo.",
      "Servir caliente como cena ligera o acompañamiento.",
    ],
  },
  {
    id: "tortilla_espinacas_requeson",
    title: "Tortilla jugosa de espinacas y requesón con ensalada",
    mealType: "comida",
    protein: "huevos",
    side: "ensalada_verduras",
    minutes: 16,
    freezerProtein: false,
    ingredients: [
      { name: "huevos", amount: 2, unit: "unidad", mercadonaUrl: link("huevos") },
      { name: "espinacas frescas", amount: 80, unit: "g", mercadonaUrl: link("espinacas") },
      { name: "requesón", amount: 70, unit: "g", mercadonaUrl: link("requeson") },
      { name: "ensalada mezcla", amount: 100, unit: "g", mercadonaUrl: link("ensalada") },
    ],
    steps: [
      "Saltear las espinacas 2-3 minutos hasta que bajen de volumen.",
      "Batir los huevos y mezclar con el requesón para que la tortilla quede más cremosa.",
      "Añadir las espinacas y cuajar la mezcla 2-3 minutos por cada lado.",
      "Preparar una ensalada rápida para acompañar.",
      "Servir la tortilla recién hecha con la ensalada al lado.",
    ],
  },
  {
    id: "pollo_arroz_calabacin_limon",
    title: "Pollo al limón con arroz y calabacín",
    mealType: "comida",
    protein: "pollo",
    side: "arroz",
    minutes: 24,
    freezerProtein: true,
    ingredients: [
      { name: "pechuga de pollo", amount: 180, unit: "g", mercadonaUrl: link("pechuga de pollo") },
      { name: "arroz redondo", amount: 80, unit: "g", mercadonaUrl: link("arroz") },
      { name: "calabacín", amount: 180, unit: "g", mercadonaUrl: link("calabacin") },
      { name: "limón", amount: 50, unit: "g", mercadonaUrl: link("limon") },
      { name: "aceite de oliva virgen extra", amount: 10, unit: "ml", mercadonaUrl: link("aceite de oliva") },
    ],
    steps: [
      "Cocer el arroz en agua con sal durante 15 minutos y escurrir.",
      "Cortar el calabacín en medias lunas y saltearlo 5-6 minutos.",
      "Hacer la pechuga a la plancha 6 minutos por lado hasta que quede dorada.",
      "Añadir zumo y ralladura de limón al pollo y al calabacín al final.",
      "Servir el pollo con el arroz y el calabacín templado.",
    ],
  },
  {
    id: "nuggets_pollo_coliflor_queso_couscous",
    title: "Nuggets de pollo, huevo, coliflor y queso con couscous",
    mealType: "cena",
    protein: "pollo",
    side: "pasta_couscous",
    minutes: 28,
    freezerProtein: true,
    ingredients: [
      { name: "muslo de pollo deshuesado", amount: 180, unit: "g", mercadonaUrl: link("muslo de pollo") },
      { name: "huevos", amount: 1, unit: "unidad", mercadonaUrl: link("huevos") },
      { name: "coliflor", amount: 180, unit: "g", mercadonaUrl: link("coliflor") },
      { name: "queso rallado", amount: 35, unit: "g", mercadonaUrl: link("queso rallado") },
      { name: "couscous", amount: 70, unit: "g", mercadonaUrl: link("couscous") },
    ],
    steps: [
      "Picar el pollo muy fino o triturarlo unos segundos para formar una masa rápida.",
      "Rallar la coliflor y mezclarla con el pollo, el huevo y el queso rallado.",
      "Formar nuggets con una cuchara y cocinarlos en airfryer 12-14 minutos a 190ºC, girando a mitad.",
      "Hidratar el couscous con agua caliente 5 minutos y soltar con un tenedor.",
      "Servir los nuggets con el couscous caliente y especias al gusto.",
    ],
  },
];

const KCAL_PER_100_G_OR_ML: Record<string, number> = {
  "aceite de oliva virgen extra": 884,
  "arroz redondo": 360,
  couscous: 376,
  "pechuga de pollo": 165,
  "muslo de pollo deshuesado": 190,
  "ternera filetes": 210,
  "cinta de lomo": 220,
  "lomo de salmón": 208,
  "filete de merluza": 90,
  "caballa en filetes": 205,
  "lomos de bacalao": 82,
  "sardinas limpias": 208,
  "lentejas cocidas": 116,
  "garbanzos cocidos": 164,
  "habas congeladas": 88,
  patata: 77,
  batata: 86,
  berenjena: 25,
  brócoli: 34,
  coliflor: 25,
  calabacín: 17,
  tomate: 18,
  "tomate cherry": 18,
  limón: 29,
  lechuga: 15,
  "ensalada mezcla": 16,
  rúcula: 25,
  pepino: 15,
  "mozzarella fresca": 250,
  requesón: 160,
  "queso rallado": 380,
  "semillas de sésamo": 573,
  pimiento: 31,
  cebolla: 40,
  "compota de manzana": 85,
  nueces: 654,
  canela: 247,
  hummus: 166,
  aceitunas: 145,
  encurtidos: 20,
  "fruta deshidratada": 280,
  "chocolate negro 85%": 600,
  "maíz para palomitas": 380,
  "espinacas frescas": 23,
  "leche vegetal": 40,
};

const KCAL_PER_UNIT: Record<string, number> = {
  huevos: 78,
  manzana: 80,
  pera: 85,
  plátano: 105,
  mandarina: 45,
  "yogur natural": 90,
  "queso fresco batido": 85,
  "bote de alcachofa cocida": 120,
  "bote de espárragos": 70,
};

const ingredientCalories = (ingredient: Ingredient) => {
  if (ingredient.unit === "unidad") {
    const perUnit = KCAL_PER_UNIT[ingredient.name.toLowerCase()];
    if (typeof perUnit === "number") {
      return perUnit * ingredient.amount;
    }
    return 80 * ingredient.amount;
  }

  const kcalPer100 = KCAL_PER_100_G_OR_ML[ingredient.name.toLowerCase()];
  if (typeof kcalPer100 === "number") {
    return (ingredient.amount / 100) * kcalPer100;
  }

  return (ingredient.amount / 100) * 80;
};

const getRecipeBaseCalories = (recipe: Recipe) => {
  const total = recipe.ingredients.reduce((sum, item) => sum + ingredientCalories(item), 0);
  return Math.max(150, Math.round(total));
};

export const scaleIngredientAmountForHousehold = (amount: number) => amount * HOUSEHOLD_TOTAL_PORTION_FACTOR;

export const getRecipePortionCalories = (recipe: Recipe): RecipePortionCalories => {
  const base = getRecipeBaseCalories(recipe);
  return {
    servings: 2,
    lorena: {
      kcal: Math.round(base * HOUSEHOLD_PORTION_FACTORS.lorena),
      portionFactor: HOUSEHOLD_PORTION_FACTORS.lorena,
      target: DAILY_CALORIE_TARGETS.lorena,
    },
    gigi: {
      kcal: Math.round(base * HOUSEHOLD_PORTION_FACTORS.gigi),
      portionFactor: HOUSEHOLD_PORTION_FACTORS.gigi,
      target: DAILY_CALORIE_TARGETS.gigi,
    },
  };
};

const PACKAGE_RULES: Record<string, PackageRule> = {
  "arroz redondo": { unit: "g", packageSize: 1000, pricePerPackageEur: 1.6, mercadonaUrl: link("arroz") },
  couscous: { unit: "g", packageSize: 500, pricePerPackageEur: 1.45, mercadonaUrl: link("couscous") },
  "pechuga de pollo": {
    unit: "g",
    packageSize: 500,
    pricePerPackageEur: 4.25,
    mercadonaUrl: link("pechuga de pollo"),
  },
  "muslo de pollo deshuesado": {
    unit: "g",
    packageSize: 500,
    pricePerPackageEur: 3.95,
    mercadonaUrl: link("muslo de pollo"),
  },
  "ternera filetes": {
    unit: "g",
    packageSize: 500,
    pricePerPackageEur: 6.95,
    mercadonaUrl: link("ternera filetes"),
  },
  "lomo de cerdo": {
    unit: "g",
    packageSize: 500,
    pricePerPackageEur: 4.5,
    mercadonaUrl: link("lomo de cerdo"),
  },
  "lomo de salmón": {
    unit: "g",
    packageSize: 400,
    pricePerPackageEur: 6.8,
    mercadonaUrl: link("salmon"),
  },
  "filete de merluza": {
    unit: "g",
    packageSize: 400,
    pricePerPackageEur: 5.35,
    mercadonaUrl: link("merluza"),
  },
  "caballa en filetes": {
    unit: "g",
    packageSize: 250,
    pricePerPackageEur: 3.4,
    mercadonaUrl: link("caballa"),
  },
  "lomos de bacalao": {
    unit: "g",
    packageSize: 400,
    pricePerPackageEur: 6.4,
    mercadonaUrl: link("bacalao"),
  },
  "sardinas limpias": {
    unit: "g",
    packageSize: 500,
    pricePerPackageEur: 4.5,
    mercadonaUrl: link("sardinas"),
  },
  huevos: { unit: "unidad", packageSize: 12, pricePerPackageEur: 2.3, mercadonaUrl: link("huevos") },
  patata: { unit: "g", packageSize: 3000, pricePerPackageEur: 3.1, mercadonaUrl: link("patata") },
  batata: { unit: "g", packageSize: 1000, pricePerPackageEur: 2.1, mercadonaUrl: link("batata") },
  "garbanzos cocidos": {
    unit: "g",
    packageSize: 570,
    pricePerPackageEur: 0.9,
    mercadonaUrl: link("garbanzos cocidos"),
  },
  "lentejas cocidas": {
    unit: "g",
    packageSize: 570,
    pricePerPackageEur: 0.9,
    mercadonaUrl: link("lentejas cocidas"),
  },
  "habas congeladas": {
    unit: "g",
    packageSize: 450,
    pricePerPackageEur: 1.9,
    mercadonaUrl: link("habas congeladas"),
  },
  "frutos rojos congelados": {
    unit: "g",
    packageSize: 300,
    pricePerPackageEur: 2.95,
    mercadonaUrl: link("frutos rojos"),
  },
  "aceite de oliva virgen extra": {
    unit: "ml",
    packageSize: 1000,
    pricePerPackageEur: 8.7,
    mercadonaUrl: link("aceite de oliva"),
  },
  vinagre: {
    unit: "ml",
    packageSize: 500,
    pricePerPackageEur: 0.85,
    mercadonaUrl: link("vinagre"),
  },
};

const round = (value: number) => Math.round(value * 100) / 100;

const getRecipeById = (id: string) => {
  const recipe = RECIPES.find((item) => item.id === id);
  if (!recipe) {
    throw new Error(`Recipe not found: ${id}`);
  }
  return recipe;
};

const getMeriendaByDayIndex = (index: number) => MERIENDAS[index % MERIENDAS.length];

const getMeriendaById = (id: string) => {
  const merienda = MERIENDAS.find((item) => item.id === id);
  if (!merienda) {
    throw new Error(`Merienda not found: ${id}`);
  }
  return merienda;
};

const getSlotRecipeId = (options: string[], weekIndex: number) => options[weekIndex % options.length];

const formatMonth = (year: number, monthIndex0Based: number) => {
  const month = String(monthIndex0Based + 1).padStart(2, "0");
  return `${year}-${month}`;
};

export const getCurrentMonth = () => {
  const now = new Date();
  return formatMonth(now.getFullYear(), now.getMonth());
};

export const generateMonthlyPlan = (month: string): MonthlyPlan => {
  const [yearRaw, monthRaw] = month.split("-");
  const year = Number(yearRaw);
  const monthIndex = Number(monthRaw) - 1;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  const days: DayPlan[] = Array.from({ length: daysInMonth }).map((_, dayIndex) => {
    const date = new Date(year, monthIndex, dayIndex + 1);
    const slotIndex = dayIndex % WEEKLY_MAIN_SLOTS.length;
    const weekIndex = Math.floor(dayIndex / WEEKLY_MAIN_SLOTS.length);
    const weekSlot = WEEKLY_MAIN_SLOTS[slotIndex];

    return {
      date: date.toISOString().slice(0, 10),
      merienda: getMeriendaByDayIndex(dayIndex),
      comida: getRecipeById(getSlotRecipeId(weekSlot.comida, weekIndex)),
      cena: getRecipeById(getSlotRecipeId(weekSlot.cena, weekIndex)),
    };
  });

  return { month, days };
};

const sortByDateAscending = (items: ReminderItem[]) =>
  [...items].sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());

const getWeekStartDate = (isoDate: string) => {
  const date = new Date(isoDate);
  const day = date.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
};

export const mealExecutionKey = (date: string, meal: MealType) => `${date}__${meal}`;

const proteinReminderLabel = (recipe: Recipe) => {
  if (recipe.protein === "pollo") return "pollo";
  if (recipe.protein === "carne_roja") {
    if (recipe.title.toLowerCase().includes("ternera")) return "ternera";
    if (recipe.title.toLowerCase().includes("lomo") || recipe.title.toLowerCase().includes("cerdo")) return "lomo";
    return "carne";
  }
  if (recipe.protein === "pescado_azul" || recipe.protein === "pescado_blanco") return "pescado";
  if (recipe.protein === "huevos") return "huevos";
  return "proteína";
};

const formatAmountForReminder = (amount: number, unit: IngredientUnit) => {
  if (unit === "g") {
    return `${Math.round(amount)}g`;
  }
  if (unit === "ml") {
    return `${Math.round(amount)}ml`;
  }
  if (unit === "unidad") {
    return `${Math.round(amount)} ${Math.round(amount) === 1 ? "unidad" : "unidades"}`;
  }
  return `${amount} ${unit}`;
};

const getProteinIngredient = (recipe: Recipe) => {
  const first = recipe.ingredients[0];
  if (!first) return undefined;

  const keywords = ["pollo", "ternera", "lomo", "cerdo", "salmón", "salmon", "merluza", "bacalao", "sardina", "caballa", "huevo"];
  const byKeyword = recipe.ingredients.find((item) =>
    keywords.some((keyword) => item.name.toLowerCase().includes(keyword))
  );

  return byKeyword ?? first;
};

export const getReminders = (plan: MonthlyPlan): ReminderItem[] => {
  const reminders: ReminderItem[] = [];

  for (let dayIndex = 0; dayIndex < plan.days.length; dayIndex += 1) {
    const current = plan.days[dayIndex];
    const currentDate = new Date(current.date);

    if (current.comida.freezerProtein) {
      const thawDate = new Date(currentDate);
      thawDate.setDate(thawDate.getDate() - 1);
      thawDate.setHours(21, 0, 0, 0);
      const proteinIngredient = getProteinIngredient(current.comida);
      const quantityText = proteinIngredient
        ? `Saca ${formatAmountForReminder(scaleIngredientAmountForHousehold(proteinIngredient.amount), proteinIngredient.unit)} de ${proteinIngredient.name}. `
        : "";

      reminders.push({
        id: `thaw-comida-${current.date}`,
        dateTime: thawDate.toISOString(),
        title: `Sacar ${proteinReminderLabel(current.comida)}`,
        description: `${quantityText}Descongela para mañana al mediodía: ${current.comida.title}`,
      });
    }

    if (current.cena.freezerProtein) {
      currentDate.setHours(10, 0, 0, 0);
      const proteinIngredient = getProteinIngredient(current.cena);
      const quantityText = proteinIngredient
        ? `Saca ${formatAmountForReminder(scaleIngredientAmountForHousehold(proteinIngredient.amount), proteinIngredient.unit)} de ${proteinIngredient.name}. `
        : "";
      reminders.push({
        id: `thaw-cena-${current.date}`,
        dateTime: currentDate.toISOString(),
        title: `Sacar ${proteinReminderLabel(current.cena)}`,
        description: `${quantityText}Descongela para esta noche: ${current.cena.title}`,
      });
    }

    if (new Date(current.date).getDay() === 6) {
      const shopping = new Date(current.date);
      shopping.setHours(10, 0, 0, 0);
      reminders.push({
        id: `shopping-${current.date}`,
        dateTime: shopping.toISOString(),
        title: "Día de compra",
        description: "Haz la compra semanal y revisa faltantes.",
      });
    }

    if (new Date(current.date).getDay() === 0) {
      const batch = new Date(current.date);
      batch.setHours(18, 0, 0, 0);
      reminders.push({
        id: `batch-${current.date}`,
        dateTime: batch.toISOString(),
        title: "Batch cooking",
        description: "Cocina huevos hervidos y deja bases listas de verduras.",
      });
    }
  }

  return sortByDateAscending(reminders);
};

const ingredientKey = (name: string, unit: IngredientUnit) => `${name}__${unit}`;

export const getPlanWeeks = (plan: MonthlyPlan): PlanWeek[] => {
  const weeks = new Map<string, PlanWeek>();

  for (const day of plan.days) {
    const weekId = getWeekStartDate(day.date);
    const current = weeks.get(weekId);

    if (!current) {
      weeks.set(weekId, {
        id: weekId,
        month: plan.month,
        startDate: day.date,
        endDate: day.date,
        days: [day],
      });
      continue;
    }

    current.days.push(day);
    current.endDate = day.date;
  }

  return [...weeks.values()].sort((a, b) => a.startDate.localeCompare(b.startDate));
};

export const buildShoppingList = (plan: MonthlyPlan, days = plan.days, pantry: PantryItem[] = []): ShoppingList => {
  const totals = new Map<string, { name: string; unit: IngredientUnit; amount: number; mercadonaUrl?: string }>();
  const pantryMap = new Map<string, number>();

  for (const item of pantry) {
    pantryMap.set(ingredientKey(item.name, item.unit), item.amount);
  }

  for (const day of days) {
    const grouped = [day.merienda.ingredients, day.comida.ingredients, day.cena.ingredients];
    for (const list of grouped) {
      for (const item of list) {
        const key = ingredientKey(item.name, item.unit);
        const current = totals.get(key);
        if (!current) {
          totals.set(key, {
            name: item.name,
            unit: item.unit,
            amount: scaleIngredientAmountForHousehold(item.amount),
            mercadonaUrl: item.mercadonaUrl,
          });
        } else {
          current.amount += scaleIngredientAmountForHousehold(item.amount);
        }
      }
    }
  }

  const shoppingLines: ShoppingLine[] = [];

  for (const entry of totals.values()) {
    const packageRule = PACKAGE_RULES[entry.name];
    const packageSize = packageRule?.packageSize ?? entry.amount;
    const packageUnit = packageRule?.unit ?? entry.unit;
    const availableFromPantry = pantryMap.get(ingredientKey(entry.name, entry.unit)) ?? 0;
    const pantryAmountUsed = Math.min(entry.amount, availableFromPantry);
    const pantryRemainingAfterPlanning = Math.max(0, availableFromPantry - pantryAmountUsed);
    const netAmountNeeded = Math.max(0, entry.amount - pantryAmountUsed);

    const packagesToBuy = netAmountNeeded > 0 ? Math.ceil(netAmountNeeded / packageSize) : 0;
    const finalAmountPurchased = packagesToBuy * packageSize;
    const price = packageRule?.pricePerPackageEur ?? 0;

    shoppingLines.push({
      name: entry.name,
      requiredAmount: round(entry.amount),
      requiredUnit: entry.unit,
      pantryAmountUsed: round(pantryAmountUsed),
      netAmountNeeded: round(netAmountNeeded),
      packageSize,
      packageUnit,
      packagesToBuy,
      finalAmountPurchased,
      pantryRemainingAfterPlanning: round(pantryRemainingAfterPlanning),
      estimatedTotalEur: round(packagesToBuy * price),
      mercadonaUrl: packageRule?.mercadonaUrl ?? entry.mercadonaUrl,
    });
  }

  const items = shoppingLines.sort((a, b) => a.name.localeCompare(b.name, "es"));
  const totalEstimatedEur = round(items.reduce((sum, item) => sum + item.estimatedTotalEur, 0));
  const startDate = days[0]?.date ?? `${plan.month}-01`;
  const endDate = days[days.length - 1]?.date ?? startDate;

  return {
    month: plan.month,
    startDate,
    endDate,
    totalEstimatedEur,
    items,
  };
};

const nextMealType = (now: Date): MealType => {
  const minutesSinceMidnight = now.getHours() * 60 + now.getMinutes();

  if (minutesSinceMidnight >= 16 * 60 && minutesSinceMidnight < 19 * 60) return "merienda";
  if (minutesSinceMidnight >= 21 * 60 && minutesSinceMidnight < 23 * 60) return "cena";
  return "comida";
};

const MEAL_ORDER: MealType[] = ["comida", "merienda", "cena"];

const getPendingOccurrenceForDateAndMeal = (
  plan: MonthlyPlan,
  targetDate: string,
  meal: MealType,
  execution: Record<string, MealExecutionState>
) => {
  for (const day of plan.days) {
    if (day.date > targetDate) {
      break;
    }

    const state = execution[mealExecutionKey(day.date, meal)];
    if (state?.cooked) {
      continue;
    }

    if (state?.lastDeferredOn === targetDate) {
      return null;
    }

    return {
      day,
      sourceDate: day.date,
      scheduledDate: targetDate,
      focus: meal,
    } satisfies DailyFocusResult;
  }

  return null;
};

export const getDailyFocus = (
  plan: MonthlyPlan,
  now = new Date(),
  execution: Record<string, MealExecutionState> = {}
): DailyFocusResult => {
  const today = now.toISOString().slice(0, 10);
  const fallback = plan.days[0];
  const todayIndex = Math.max(
    0,
    plan.days.findIndex((item) => item.date === today)
  );
  const currentMeal = nextMealType(now);
  const startMealIndex = MEAL_ORDER.indexOf(currentMeal);

  for (let dayIndex = todayIndex; dayIndex < plan.days.length; dayIndex += 1) {
    const scheduledDay = plan.days[dayIndex];
    const mealStartIndex = dayIndex === todayIndex ? startMealIndex : 0;

    for (let mealIndex = mealStartIndex; mealIndex < MEAL_ORDER.length; mealIndex += 1) {
      const focus = MEAL_ORDER[mealIndex];
      const occurrence = getPendingOccurrenceForDateAndMeal(plan, scheduledDay.date, focus, execution);
      if (occurrence) {
        return occurrence;
      }
    }
  }

  return {
    day: fallback,
    focus: currentMeal,
    scheduledDate: fallback.date,
    sourceDate: fallback.date,
  };
};

export const summarizePlanForAI = (plan: MonthlyPlan) => {
  return plan.days.map((day) => `${day.date}: comida=${day.comida.title}; cena=${day.cena.title}`).join("\n");
};

export const getRecipeCatalog = () => RECIPES.map((item) => ({
  id: item.id,
  title: item.title,
  mealType: item.mealType,
  protein: item.protein,
  side: item.side,
  minutes: item.minutes,
  calories: getRecipePortionCalories(item),
}));

export const getMeriendaCatalog = () =>
  MERIENDAS.map((item) => ({
    id: item.id,
    title: item.title,
  }));

export const applyAIPlanEdits = (plan: MonthlyPlan, edits: AIPlanEdit[]): MonthlyPlan => {
  if (!Array.isArray(edits) || edits.length === 0) {
    return plan;
  }

  const days = plan.days.map((item) => ({
    ...item,
    merienda: { ...item.merienda, ingredients: [...item.merienda.ingredients] },
    comida: { ...item.comida, ingredients: [...item.comida.ingredients], steps: [...item.comida.steps] },
    cena: { ...item.cena, ingredients: [...item.cena.ingredients], steps: [...item.cena.steps] },
  }));

  for (const edit of edits) {
    const day = days.find((item) => item.date === edit.date);
    if (!day) {
      continue;
    }

    if (edit.meal === "merienda") {
      if (!edit.meriendaId) {
        continue;
      }
      day.merienda = getMeriendaById(edit.meriendaId);
      continue;
    }

    if (!edit.recipeId) {
      continue;
    }

    const recipe = getRecipeById(edit.recipeId);
    if (recipe.mealType !== edit.meal) {
      continue;
    }

    if (edit.meal === "comida") {
      day.comida = recipe;
    }

    if (edit.meal === "cena") {
      day.cena = recipe;
    }
  }

  return {
    ...plan,
    days,
  };
};
