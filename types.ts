
export interface Wine {
  id: string;
  userId?: string;
  name: string;
  description: string;
  image: string; // base64 string
  targetAudience: string;
  priceLevel: string; // Internal, no longer in form
  specialFeatures: string; // Changed from string[] to string for free text
  analysisResult?: string;
  useAnalysisInCreative?: boolean;
  denomination?: string;
  wineType?: 'Tinto' | 'Blanco' | 'Rosado' | 'Espumoso/Cava';
  pricePositioning?: string;
  consumptionMoments?: string[];
  extractedPalette?: string[];
  suggestedPairings?: { category?: string; subCategory?: string; item: string }[];
  generatedImages?: string[];
  grapeVariety?: string;
  grapeImage?: string; // base64 string
}

export interface GalleryImage {
  id: string;
  userId?: string;
  wineId?: string;
  url: string;
  concept: string;
  wineName: string;
  sceneType?: string;
  timestamp: number;
}

export enum AppScreen {
  HOME = 'HOME',
  MANAGE = 'MANAGE',
  FORM = 'FORM',
  FUNNEL = 'FUNNEL',
  GALLERY = 'GALLERY'
}

export enum ImageType {
  BODEGON = 'Bodegón',
  EN_USO = 'En uso',
  MOMENTO_SOCIAL = 'Momento social',
  PAISAJE_TERROIR = 'Paisaje / Terroir'
}

export type AspectRatio = '1:1' | '9:16' | '16:9' | '4:5' | '4:3 / A4';

export type PaletteIntensity = 'Natural' | 'Expresivo' | 'Intenso';

export interface FunnelState {
  type: ImageType | null;
  step: number;
  selections: Record<string, any>;
  contextText: string;
  timeContext: string;
  locationImage?: string;
  concepts: string[];
  selectedConceptIndex: number | null;
  editingConceptIndex: number | null;
  imageHistory: string[];
  paletteIntensity: PaletteIntensity;
  isLoading: boolean;
  error: string | null;
}
