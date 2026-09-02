export const universes = [
  'meu-ceu',
  'ciclos-tempo',
  'amor-relacoes',
  'tarot-arcanos',
  'proposito-prosperidade',
  'sonhos-simbolos'
] as const;

export type UniverseSlug = (typeof universes)[number];
export type PublicationState = 'DRAFT' | 'PREPARING' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED';

export interface ProductDefinition {
  id: string;
  slug: string;
  name: string;
  universe: UniverseSlug | 'global';
  state: PublicationState;
  delivery: readonly ('web' | 'pdf' | 'svg' | 'audio' | 'club')[];
  personalized: boolean;
}

export interface PriceVersion {
  id: string;
  productId: string;
  currency: 'BRL';
  amountMinor: number;
  validFrom: string;
  validUntil?: string;
  status: 'DRAFT' | 'ACTIVE' | 'RETIRED';
}

export const productCatalog: readonly ProductDefinition[] = [
  { id: 'birth-chart', slug: 'mapa-astral', name: 'Mapa Astral', universe: 'meu-ceu', state: 'PREPARING', delivery: ['web', 'pdf', 'svg'], personalized: true },
  { id: 'three-pillars', slug: 'tres-pilares', name: 'Três Pilares', universe: 'meu-ceu', state: 'PREPARING', delivery: ['web'], personalized: true },
  { id: 'solar-return', slug: 'revolucao-solar', name: 'Revolução Solar', universe: 'ciclos-tempo', state: 'PREPARING', delivery: ['web', 'pdf'], personalized: true },
  { id: 'synastry', slug: 'sinastria', name: 'Sinastria', universe: 'amor-relacoes', state: 'PREPARING', delivery: ['web', 'pdf'], personalized: true },
  { id: 'tarot-focus', slug: 'foco-agora', name: 'Foco Agora', universe: 'tarot-arcanos', state: 'PREPARING', delivery: ['web'], personalized: true },
  { id: 'purpose-career', slug: 'mapa-proposito-carreira', name: 'Mapa de Propósito & Carreira', universe: 'proposito-prosperidade', state: 'PREPARING', delivery: ['web', 'pdf', 'audio'], personalized: true },
  { id: 'direction-journey', slug: 'jornada-direcao', name: 'Jornada de Direção', universe: 'proposito-prosperidade', state: 'PREPARING', delivery: ['web'], personalized: true },
  { id: 'dream-reading', slug: 'leitura-essencial-sonhos', name: 'Leitura Essencial de Sonhos', universe: 'sonhos-simbolos', state: 'PREPARING', delivery: ['web'], personalized: true },
  { id: 'atv-plus', slug: 'atv-plus', name: 'A Tua Vida nos Astros+', universe: 'global', state: 'PREPARING', delivery: ['web', 'club'], personalized: false }
] as const;
