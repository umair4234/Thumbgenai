export interface ImageVersion {
  id: string;
  base64: string;
  mimeType: string;
}

export interface ImageSet {
  id: string;
  name: string;
  versions: ImageVersion[];
}

export interface Character {
  id: 'char1' | 'char2';
  name: string;
  roleName?: string; // e.g., "HOA Woman", parsed from the prompt
  base64: string | null;
  mimeType: string | null;
  definition: string | null;
  isLoading: boolean; // For when analysis is in progress for this specific char
  isAnalyzed: boolean;
}
