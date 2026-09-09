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
  { id: 'ascendant', slug: 'ascendente', name: 'Ascendente', universe: 'meu-ceu', state: 'PREPARING', delivery: ['web', 'svg'], personalized: true },
  { id: 'life-atlas', slug: 'atlas-da-vida-360', name: 'Atlas da Vida 360', universe: 'meu-ceu', state: 'PREPARING', delivery: ['web', 'pdf', 'svg'], personalized: true },
  { id: 'horoscope', slug: 'horoscopo', name: 'Horóscopo', universe: 'ciclos-tempo', state: 'PREPARING', delivery: ['web'], personalized: true },
  { id: 'date-reading', slug: 'leitura-da-data', name: 'Leitura da Data', universe: 'ciclos-tempo', state: 'PREPARING', delivery: ['web'], personalized: true },
  { id: 'week-reading', slug: 'semana', name: 'Semana', universe: 'ciclos-tempo', state: 'PREPARING', delivery: ['web'], personalized: true },
  { id: 'personal-calendar', slug: 'calendario-pessoal', name: 'Calendário pessoal', universe: 'ciclos-tempo', state: 'PREPARING', delivery: ['web', 'pdf'], personalized: true },
  { id: 'solar-return', slug: 'revolucao-solar', name: 'Revolução Solar', universe: 'ciclos-tempo', state: 'PREPARING', delivery: ['web', 'pdf'], personalized: true },
  { id: 'synastry', slug: 'sinastria', name: 'Sinastria', universe: 'amor-relacoes', state: 'PREPARING', delivery: ['web', 'pdf'], personalized: true },
  { id: 'pair-preview', slug: 'preview-do-par', name: 'Preview do par', universe: 'amor-relacoes', state: 'PREPARING', delivery: ['web'], personalized: true },
  { id: 'couple-dossier', slug: 'dossie-do-casal', name: 'Dossiê do Casal', universe: 'amor-relacoes', state: 'PREPARING', delivery: ['web', 'pdf'], personalized: true },
  { id: 'daily-card', slug: 'carta-do-dia', name: 'Carta do Dia', universe: 'tarot-arcanos', state: 'PREPARING', delivery: ['web'], personalized: true },
  { id: 'tarot-yes-no', slug: 'sim-nao-responsavel', name: 'Sim/Não responsável', universe: 'tarot-arcanos', state: 'PREPARING', delivery: ['web'], personalized: true },
  { id: 'three-questions', slug: 'tres-perguntas', name: 'Três Perguntas', universe: 'tarot-arcanos', state: 'PREPARING', delivery: ['web'], personalized: true },
  { id: 'tarot-journey', slug: 'jornada-tarot', name: 'Jornada de Tarot', universe: 'tarot-arcanos', state: 'PREPARING', delivery: ['web'], personalized: true },
  { id: 'tarot-focus', slug: 'foco-agora', name: 'Foco Agora', universe: 'tarot-arcanos', state: 'PREPARING', delivery: ['web'], personalized: true },
  { id: 'purpose-career', slug: 'mapa-proposito-carreira', name: 'Mapa de Propósito & Carreira', universe: 'proposito-prosperidade', state: 'PREPARING', delivery: ['web', 'pdf', 'audio'], personalized: true },
  { id: 'midheaven', slug: 'meio-do-ceu', name: 'Meio do Céu', universe: 'proposito-prosperidade', state: 'PREPARING', delivery: ['web'], personalized: true },
  { id: 'career-compass', slug: 'bussola-de-carreira', name: 'Bússola de Carreira', universe: 'proposito-prosperidade', state: 'PREPARING', delivery: ['web'], personalized: true },
  { id: 'direction-journey', slug: 'jornada-direcao', name: 'Jornada de Direção', universe: 'proposito-prosperidade', state: 'PREPARING', delivery: ['web'], personalized: true },
  { id: 'dream-reading', slug: 'leitura-essencial-sonhos', name: 'Leitura Essencial de Sonhos', universe: 'sonhos-simbolos', state: 'PREPARING', delivery: ['web'], personalized: true },
  { id: 'dream-journal', slug: 'registro-de-sonho', name: 'Registro de sonho', universe: 'sonhos-simbolos', state: 'PREPARING', delivery: ['web'], personalized: true },
  { id: 'dream-dossier', slug: 'dossie-do-sonho', name: 'Dossiê do Sonho', universe: 'sonhos-simbolos', state: 'PREPARING', delivery: ['web', 'pdf'], personalized: true },
  { id: 'dream-atlas', slug: 'atlas-dos-sonhos', name: 'Atlas dos Sonhos', universe: 'sonhos-simbolos', state: 'PREPARING', delivery: ['web', 'pdf'], personalized: true },
  { id: 'atv-plus', slug: 'atv-plus', name: 'A Tua Vida nos Astros+', universe: 'global', state: 'PREPARING', delivery: ['web', 'club'], personalized: false }
] as const;
