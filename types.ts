export interface IdeaPromptPair {
  idea: string;
  prompt: string;
  generatedImageBase64?: string;
  imageFileName?: string;
  imageError?: string;
}

export interface AspectRatioOption {
  label: string;
  value: string; // e.g., "1:1", "16:9"
}
