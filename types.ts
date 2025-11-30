export enum StoryGenre {
  EDUCATIONAL = 'educational',
  FANTASY = 'fantasy',
  SCI_FI = 'sci-fi',
  FOLKTALE = 'folktale',
  MYSTERY = 'mystery',
  ADVENTURE = 'adventure',
}

export enum AgeGroup {
  CHILD = 'child',
  TEEN = 'teen',
  ADULT = 'adult',
}

export enum ImageStyle {
  DIGITAL_ART = 'digital-art',
  CARTOON = 'cartoon',
  REALISTIC = 'realistic',
  WATERCOLOR = 'watercolor',
  OIL_PAINTING = 'oil-painting',
  SKETCH = 'sketch',
  RETRO = 'retro',
}

export enum MediaType {
  TEXT_WITH_IMAGE = 'text-image',
  TEXT_ONLY = 'text-only',
  VIDEO = 'video',
}

export enum VideoFormat {
  MP4 = 'mp4',
  MOV = 'mov',
}

export interface StoryRequest {
  topic: string;
  genre: StoryGenre;
  ageGroup: AgeGroup;
  language: string;
  imageStyle: ImageStyle;
  mediaType: MediaType;
  videoFormat?: VideoFormat;
  includeHaitianCulture: boolean;
}

export interface GeneratedStory {
  title: string;
  content: string;
  imageUrl?: string;
  audioUrl?: string;
  videoUrl?: string;
  imagePrompt?: string;
  videoFormat?: VideoFormat;
  isVideoSimulated?: boolean;
}