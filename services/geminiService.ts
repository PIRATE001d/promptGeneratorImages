import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import type { IdeaPromptPair } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.error("API_KEY environment variable not set. Please set it before running the application.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! }); 

const TEXT_MODEL_NAME = "gemini-2.5-flash-preview-04-17";
const IMAGE_MODEL_NAME = "imagen-3.0-generate-002";

export const generateIdeas = async (category: string, count: number): Promise<string[]> => {
  if (!API_KEY) return Promise.reject("API Key not configured.");
  try {
    const prompt = `Generate ${count} distinct image ideas or sub-themes related to the category '${category}'. Present them as a simple list, with each idea on a new line. Do not number them or add any extra formatting. Each idea should be concise and clear.`;
    
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: TEXT_MODEL_NAME,
      contents: prompt,
    });

    const text = response.text;
    if (!text) {
      return [];
    }
    return text.split('\n').map(idea => idea.trim()).filter(idea => idea.length > 0);
  } catch (error) {
    console.error("Error generating ideas:", error);
    throw error;
  }
};

export const generateCreativePrompt = async (idea: string): Promise<string> => {
  if (!API_KEY) return Promise.reject("API Key not configured.");
  try {
    const prompt = `Create a unique and artistic image generation prompt for the theme: '${idea}'. The prompt should inspire a creative and unconventional approach, distinct from typical stock photography. The prompt should be imaginative and detailed, suitable for an advanced image generation model. Do not repeat the theme in the prompt itself, focus on the visual description. The output should be only the prompt itself.`;

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: TEXT_MODEL_NAME,
      contents: prompt,
    });
    
    return response.text.trim() || `Failed to generate prompt for: ${idea}`;
  } catch (error) {
    console.error(`Error generating creative prompt for "${idea}":`, error);
    throw error;
  }
};

export const generateImageFromPrompt = async (prompt: string, aspectRatio: string): Promise<string> => {
  if (!API_KEY) return Promise.reject("API Key not configured.");
  try {
    const response = await ai.models.generateImages({
      model: IMAGE_MODEL_NAME,
      prompt: prompt,
      config: { 
        numberOfImages: 1, 
        outputMimeType: 'image/jpeg',
        aspectRatio: aspectRatio 
      },
    });

    if (response.generatedImages && response.generatedImages.length > 0 && response.generatedImages[0].image?.imageBytes) {
      return response.generatedImages[0].image.imageBytes;
    } else {
      throw new Error("No image data received from API.");
    }
  } catch (error) {
    console.error(`Error generating image for prompt "${prompt}" with aspect ratio ${aspectRatio}:`, error);
    throw error;
  }
};
