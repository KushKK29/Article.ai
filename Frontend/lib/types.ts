export type KeywordBundle = {
  primary_keyword: string;
  secondary_keywords: string[];
  long_tail_keywords: string[];
  lsi_keywords: string[];
  search_intent?: string;
};

export type StructureNode = {
  h3: string;
  h4_tags: string[];
};

export type StructureSection = {
  h2: string;
  subsections: StructureNode[];
};

export type ArticleStructure = {
  h1: string;
  sections: StructureSection[];
};

export type ImageItem = {
  heading: string;
  url: string;
  alt: string;
  caption: string;
};

export type ContentBlock = {
  heading: string;
  level: number;
  content: string;
  image?: {
    url?: string;
    alt?: string;
    source?: string;
    credit?: string;
    credit_url?: string;
  };
};

export type GenerateApiResponse = {
  keywords: KeywordBundle;
  structure: ArticleStructure;
  content: string;
  images: ImageItem[];
  blocks: ContentBlock[];
  meta: Record<string, unknown>;
};

export type ToastType = "success" | "error" | "info";

export type ToastMessage = {
  id: string;
  title: string;
  description?: string;
  type: ToastType;
};
