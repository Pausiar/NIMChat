export type DesignBackground = "white" | "gray" | "dark" | "transparent";

export type DesignViewport = "mobile" | "tablet" | "desktop";

export interface DesignGeneration {
  id: string;
  prompt: string;
  code: string;
  timestamp: number;
  thumbnail?: string;
}

export interface DesignState {
  currentCode: string;
  currentPrompt: string;
  history: DesignGeneration[];
  isGenerating: boolean;
  selectedBackground: DesignBackground;
  selectedViewport: DesignViewport;
}