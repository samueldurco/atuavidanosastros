import { tarotMethods } from "./tarot-methods.ts";

export const universes = [
  "meu-ceu",
  "ciclos-tempo",
  "amor-relacoes",
  "tarot-arcanos",
  "proposito-prosperidade",
  "sonhos-simbolos",
] as const;

export type UniverseSlug = (typeof universes)[number];
export type PublicationState =
  "DRAFT" | "PREPARING" | "ACTIVE" | "PAUSED" | "ARCHIVED";

export interface ProductDefinition {
  id: string;
  slug: string;
  name: string;
  universe: UniverseSlug | "global";
  state: PublicationState;
  delivery: readonly ("web" | "pdf" | "svg" | "audio" | "club")[];
  personalized: boolean;
}

export interface PriceVersion {
  id: string;
  productId: string;
  currency: "BRL";
  amountMinor: number;
  validFrom: string;
  validUntil?: string;
  status: "DRAFT" | "ACTIVE" | "RETIRED";
}

/** Internal historical definitions, excluded from every visible catalog. */
export const retiredTarotProducts: readonly ProductDefinition[] = [
  {
    id: "daily-card",
    slug: "carta-do-dia",
    name: "Carta do Dia",
    universe: "tarot-arcanos",
    state: "PREPARING",
    delivery: ["web"],
    personalized: true,
  },
  {
    id: "tarot-yes-no",
    slug: "sim-nao-responsavel",
    name: "Tarot Sim ou Não",
    universe: "tarot-arcanos",
    state: "PREPARING",
    delivery: ["web"],
    personalized: true,
  },
  {
    id: "three-questions",
    slug: "tres-perguntas",
    name: "Três Perguntas",
    universe: "tarot-arcanos",
    state: "PREPARING",
    delivery: ["web"],
    personalized: true,
  },
  {
    id: "tarot-journey",
    slug: "jornada-tarot",
    name: "Jornada de Tarot",
    universe: "tarot-arcanos",
    state: "PREPARING",
    delivery: ["web"],
    personalized: true,
  },
  {
    id: "tarot-focus",
    slug: "foco-agora",
    name: "Foco Agora",
    universe: "tarot-arcanos",
    state: "PREPARING",
    delivery: ["web"],
    personalized: true,
  },
];

const tarotOfferPresentation: Record<string, { slug: string; name: string }> = {
  "tarot-situation-challenge-advice": {
    slug: "tarot-3-cartas",
    name: "Tarot — 3 Cartas (Situação, Desafio e Conselho)",
  },
  "tarot-peladan-cross": {
    slug: "tarot-5-cartas-cruz-peladan",
    name: "Tarot — 5 Cartas (Cruz Péladan)",
  },
  "tarot-celtic-cross": {
    slug: "tarot-10-cartas-cruz-celta",
    name: "Tarot — 10 Cartas (Cruz Celta)",
  },
  "tarot-aphrodite-temple": {
    slug: "tarot-relacionamentos-7-cartas",
    name: "Tarot Relacionamentos — 7 Cartas (Templo de Afrodite)",
  },
  "tarot-astrological-mandala": {
    slug: "tarot-12-areas-da-vida",
    name: "Tarot — 12 Áreas da Vida (Mandala Astrológica)",
  },
};

/** Stable execution IDs include historical and free experiences; use productOffers for discovery. */
export const productCatalog: readonly ProductDefinition[] = [
  {
    id: "birth-chart",
    slug: "mapa-astral-completo",
    name: "Mapa Astral Completo",
    universe: "meu-ceu",
    state: "PREPARING",
    delivery: ["web", "pdf", "svg"],
    personalized: true,
  },
  {
    id: "three-pillars",
    slug: "sol-lua-e-ascendente",
    name: "Sol, Lua e Ascendente",
    universe: "meu-ceu",
    state: "PREPARING",
    delivery: ["web"],
    personalized: true,
  },
  {
    id: "ascendant",
    slug: "ascendente",
    name: "Ascendente",
    universe: "meu-ceu",
    state: "PREPARING",
    delivery: ["web", "svg"],
    personalized: true,
  },
  {
    id: "life-atlas",
    slug: "mapa-astral-por-temas",
    name: "Mapa Astral por Temas",
    universe: "meu-ceu",
    state: "PREPARING",
    delivery: ["web", "pdf", "svg"],
    personalized: true,
  },
  {
    id: "horoscope",
    slug: "horoscopo",
    name: "Horóscopo",
    universe: "ciclos-tempo",
    state: "PREPARING",
    delivery: ["web"],
    personalized: true,
  },
  {
    id: "date-reading",
    slug: "horoscopo-data-especial",
    name: "Horóscopo para uma Data Especial",
    universe: "ciclos-tempo",
    state: "PREPARING",
    delivery: ["web"],
    personalized: true,
  },
  {
    id: "week-reading",
    slug: "horoscopo-semanal-pessoal",
    name: "Horóscopo Semanal Pessoal",
    universe: "ciclos-tempo",
    state: "PREPARING",
    delivery: ["web", "pdf"],
    personalized: true,
  },
  {
    id: "personal-calendar",
    slug: "calendario-previsoes-30-dias",
    name: "Calendário de Previsões — Próximos 30 Dias",
    universe: "ciclos-tempo",
    state: "PREPARING",
    delivery: ["web", "pdf"],
    personalized: true,
  },
  {
    id: "solar-return",
    slug: "mapa-do-seu-ano",
    name: "Mapa do Seu Ano — Revolução Solar",
    universe: "ciclos-tempo",
    state: "PREPARING",
    delivery: ["web", "pdf"],
    personalized: true,
  },
  {
    id: "synastry",
    slug: "analise-astral-do-casal",
    name: "Análise Astral do Casal",
    universe: "amor-relacoes",
    state: "PREPARING",
    delivery: ["web", "pdf"],
    personalized: true,
  },
  {
    id: "pair-preview",
    slug: "preview-do-par",
    name: "Combinação do Casal",
    universe: "amor-relacoes",
    state: "PREPARING",
    delivery: ["web"],
    personalized: true,
  },
  {
    id: "couple-dossier",
    slug: "aprofundamento-astral-do-casal",
    name: "Aprofundamento Astral do Casal",
    universe: "amor-relacoes",
    state: "PREPARING",
    delivery: ["web", "pdf"],
    personalized: true,
  },
  ...tarotMethods.map((method): ProductDefinition => ({
    id: method.id,
    slug: tarotOfferPresentation[method.id]?.slug ?? method.slug,
    name: tarotOfferPresentation[method.id]?.name ?? method.name,
    universe: "tarot-arcanos",
    state: "PREPARING",
    delivery: ["web", "pdf"],
    personalized: true,
  })),
  {
    id: "purpose-career",
    slug: "mapa-astral-dinheiro-carreira",
    name: "Mapa Astral de Dinheiro e Carreira",
    universe: "proposito-prosperidade",
    state: "PREPARING",
    delivery: ["web", "pdf", "audio"],
    personalized: true,
  },
  {
    id: "career-forecast-30d",
    slug: "previsoes-dinheiro-carreira-30-dias",
    name: "Previsões de Dinheiro e Carreira — Próximos 30 Dias",
    universe: "proposito-prosperidade",
    state: "PREPARING",
    delivery: ["web", "pdf"],
    personalized: true,
  },
  {
    id: "midheaven",
    slug: "meio-do-ceu",
    name: "Meio do Céu",
    universe: "proposito-prosperidade",
    state: "PREPARING",
    delivery: ["web"],
    personalized: true,
  },
  {
    id: "career-compass",
    slug: "bussola-de-carreira",
    name: "Bússola de Carreira",
    universe: "proposito-prosperidade",
    state: "PREPARING",
    delivery: ["web"],
    personalized: true,
  },
  {
    id: "direction-journey",
    slug: "jornada-direcao",
    name: "Jornada de Carreira",
    universe: "proposito-prosperidade",
    state: "PREPARING",
    delivery: ["web"],
    personalized: true,
  },
  {
    id: "dream-reading",
    slug: "interpretacao-do-sonho",
    name: "Interpretação do Sonho",
    universe: "sonhos-simbolos",
    state: "PREPARING",
    delivery: ["web"],
    personalized: true,
  },
  {
    id: "dream-journal",
    slug: "registro-de-sonho",
    name: "Registro de sonho",
    universe: "sonhos-simbolos",
    state: "PREPARING",
    delivery: ["web"],
    personalized: true,
  },
  {
    id: "dream-dossier",
    slug: "interpretacao-aprofundada-do-sonho",
    name: "Interpretação Aprofundada do Sonho",
    universe: "sonhos-simbolos",
    state: "PREPARING",
    delivery: ["web", "pdf"],
    personalized: true,
  },
  {
    id: "dream-atlas",
    slug: "diario-sonhos-30-dias",
    name: "Diário de Sonhos — 30 Dias",
    universe: "sonhos-simbolos",
    state: "PREPARING",
    delivery: ["web", "pdf"],
    personalized: true,
  },
  {
    id: "atv-plus",
    slug: "atv-plus",
    name: "ATV+",
    universe: "global",
    state: "PREPARING",
    delivery: ["web", "club"],
    personalized: false,
  },
] as const;

/** Decode immutable historical deliveries without publishing or authorizing them. */
export function productDefinitionFor(
  id: string,
): ProductDefinition | undefined {
  return (
    productCatalog.find((product) => product.id === id) ??
    retiredTarotProducts.find((product) => product.id === id)
  );
}

/** The approved public offer, independent of publication and private evaluation rights. */
export const offeredProductIds = [
  "birth-chart",
  "three-pillars",
  "life-atlas",
  "week-reading",
  "personal-calendar",
  "date-reading",
  "solar-return",
  "synastry",
  "couple-dossier",
  "purpose-career",
  "career-forecast-30d",
  "tarot-situation-challenge-advice",
  "tarot-peladan-cross",
  "tarot-celtic-cross",
  "tarot-aphrodite-temple",
  "tarot-astrological-mandala",
  "dream-reading",
  "dream-dossier",
  "dream-atlas",
] as const;

export type OfferedProductId = (typeof offeredProductIds)[number];

export const productOffers: readonly ProductDefinition[] =
  offeredProductIds.map((id) =>
    productCatalog.find((product) => product.id === id)!,
  );

/** Commercial aliases only: saved readings continue resolving by their original product ID. */
export const productSlugAliases: Readonly<Record<string, string>> = {
  "mapa-astral": "birth-chart",
  "tres-pilares": "three-pillars",
  "atlas-da-vida-360": "life-atlas",
  semana: "week-reading",
  "calendario-pessoal": "personal-calendar",
  "leitura-da-data": "date-reading",
  "revolucao-solar": "solar-return",
  sinastria: "synastry",
  "dossie-do-casal": "couple-dossier",
  "mapa-proposito-carreira": "purpose-career",
  "jornada-direcao": "career-forecast-30d",
  "situacao-desafio-conselho": "tarot-situation-challenge-advice",
  "cruz-peladan": "tarot-peladan-cross",
  "cruz-celta": "tarot-celtic-cross",
  "templo-afrodite": "tarot-aphrodite-temple",
  "mandala-astrologica": "tarot-astrological-mandala",
  "leitura-essencial-sonhos": "dream-reading",
  "dossie-do-sonho": "dream-dossier",
  "atlas-dos-sonhos": "dream-atlas",
};

export function productDefinitionForSlug(
  slug: string,
): ProductDefinition | undefined {
  const alias = Object.hasOwn(productSlugAliases, slug)
    ? productSlugAliases[slug]
    : undefined;
  return alias
    ? productDefinitionFor(alias)
    : productCatalog.find((product) => product.slug === slug);
}
