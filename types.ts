
export interface Link {
  title: string;
  url: string;
  category: 'Image' | 'Supplier' | 'Community' | 'Documentation';
}

export interface Alternative {
  term: string;
  description: string;
}

export interface TermExplanation {
  term: string;
  explanation: string;
  pros: string[];
  cons: string[];
  alternatives: Alternative[];
  links: Link[];
  timestamp: number;
}

export interface DiagramLabel {
  label: string;
  description: string;
  box_2d: [number, number, number, number]; // [ymin, xmin, ymax, xmax]
}

export interface AnalysisResult {
  key_terms: string[];
  diagram_labels: DiagramLabel[];
  original_text?: string;
  image_data?: string;
}
