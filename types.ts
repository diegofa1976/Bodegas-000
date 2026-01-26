
export interface Wine {
  id: string;
  name: string;
  description: string;
  image: string; // base64 string
  targetAudience: string;
  priceLevel: string;
  specialFeatures: string[];
}

export interface GalleryImage {
  id: string;
  url: string;
  concept: string;
  wineName: string;
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
  MOMENTO_SOCIAL = 'Momento social'
}

export type AspectRatio = '1:1' | '3:4' | '4:3' | '9:16' | '16:9';

export interface FunnelState {
  type: ImageType | null;
  step: number;
  selections: Record<string, any>;
  contextText: string;
  concepts: string[];
  selectedConceptIndex: number | null;
  editingConceptIndex: number | null;
  imageHistory: string[];
  isLoading: boolean;
  error: string | null;
}
