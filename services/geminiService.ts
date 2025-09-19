import { GoogleGenAI, Modality, Type } from "@google/genai";
import type { GenerateContentResponse } from "@google/genai";
import { getNextKey, markKeyAsExhausted } from './apiKeyManager';

/**
 * A higher-order function that wraps API calls with key rotation and error handling logic.
 * It gets the next available key, creates a Gemini client, executes the provided API call,
 * and handles specific errors like rate limiting by marking the key as exhausted.
 * @param apiCall A function that takes a GoogleGenAI client and performs an API call.
 * @returns The result of the apiCall.
 * @throws An error with a user-friendly message if the API call fails.
 */
async function withErrorHandling<T>(apiCall: (ai: GoogleGenAI) => Promise<T>): Promise<T> {
    let usedApiKey: string | null = null;
    try {
        const apiKey = getNextKey(); // Throws if no valid keys are available
        usedApiKey = apiKey;
        const ai = new GoogleGenAI({ apiKey });
        return await apiCall(ai);
    } catch (error) {
        // If the error is a rate limit, mark the key as exhausted for a cooldown period.
        if (usedApiKey && error instanceof Error && (error.message.includes('429') || error.message.includes('RESOURCE_EXHAUSTED') || error.message.includes('quota'))) {
            markKeyAsExhausted(usedApiKey);
        }
        // Propagate a user-friendly error to the UI.
        handleError(error);
    }
}

/**
 * Parses known API errors and returns a user-friendly message.
 * @param error The error object caught from the API call.
 * @returns Never, as it always throws a new error.
 */
const handleError = (error: unknown): never => {
    console.error("Error calling Gemini API:", error);

    let finalMessage = "An unexpected error occurred. The app will use your next API key for the next request.";

    if (error instanceof Error) {
        const message = error.message;

        if (message.includes("No API keys set")) {
            finalMessage = "No Gemini API key found. Please add one in the API Key Manager (gear icon).";
        } else if (message.includes("All available API keys")) { // Catches the custom error from getNextKey
            finalMessage = "All your API keys seem to be rate-limited. Please add a new key or wait a minute before trying again.";
        } else if (message.includes('API key not valid') || message.includes('API_KEY')) {
            finalMessage = "The API Key is invalid and will be skipped. The app will try the next available key on your next action. Please check your keys in the manager.";
        } else if (message.includes('429') || message.includes('RESOURCE_EXHAUSTED') || message.includes('quota')) {
            finalMessage = "The current API key has exceeded its quota and has been temporarily paused. The app will automatically use the next available key on your next attempt. If this persists, all your keys may be rate-limited.";
        } else {
             finalMessage = `An unexpected error occurred: ${message}`;
        }
    }
    
    throw new Error(finalMessage);
};


const base64DataUrlToPureBase64 = (dataUrl: string): string => {
  return dataUrl.split(',')[1];
};

interface ImagePart {
  base64: string;
  mimeType: string;
}

export const generateCharacterDefinition = async (
  characterImage: ImagePart
): Promise<string> => {
    return withErrorHandling(async (ai) => {
        const prompt = "Look at the attached image and write one single short paragraph (max 35 words). Give only physical, repeatable traits for a character reference: approx age, face shape, skin tone, eye color/shape, nose shape, lips, eyebrow shape, hair color/length/style/hairline, facial hair (if any), visible wrinkles/scars, overall body build. Do NOT mention clothing, pose, expression, background, or accessories. If a detail is unclear, write ‘not visible’. Use very simple English and separate traits with commas.";

        const imagePart = {
            inlineData: {
                data: base64DataUrlToPureBase64(characterImage.base64),
                mimeType: characterImage.mimeType,
            },
        };

        const textPart = { text: prompt };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePart, textPart] },
        });
        
        return response.text.trim();
    });
};


export const editImageWithPrompt = async (
  mainImage: ImagePart,
  prompt: string,
  characterImages: ImagePart[] = [],
  maskImage: ImagePart | null = null,
): Promise<{ newBase64: string; newMimeType: string }> => {
    return withErrorHandling(async (ai) => {
        const imageEditModel = 'gemini-2.5-flash-image-preview';
        const parts: any[] = [];
        let finalPrompt = prompt;

        // Add the main image first
        parts.push({
            inlineData: {
                data: base64DataUrlToPureBase64(mainImage.base64),
                mimeType: mainImage.mimeType,
            },
        });
        
        // Add character reference images after the main image
        characterImages.forEach(charImage => {
            parts.push({
                inlineData: {
                    data: base64DataUrlToPureBase64(charImage.base64),
                    mimeType: charImage.mimeType,
                },
            });
        });

        // If a mask is provided, add it and wrap the prompt with instructions
        if (maskImage) {
            parts.push({
                inlineData: {
                    data: base64DataUrlToPureBase64(maskImage.base64),
                    mimeType: maskImage.mimeType,
                },
            });
            finalPrompt = `INSTRUCTION: You are an expert photo editor. You will be provided with a primary image, optional reference character images, a black-and-white mask image, and a user's request. Your task is to apply the user's request ONLY to the white area indicated in the mask image, modifying the primary image. The rest of the primary image (the black area in the mask) must remain completely untouched. When making the edit, it is crucial that you blend the changes seamlessly with the surrounding, unedited areas of the primary image, maintaining consistent lighting, texture, and style.
            
User Request: "${prompt}"`;
        }


        // Add the fully constructed text prompt last
        parts.push({ text: finalPrompt });

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: imageEditModel,
            contents: { parts },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });

        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData && part.inlineData.data) {
                return {
                    newBase64: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
                    newMimeType: part.inlineData.mimeType,
                };
            }
        }

        throw new Error("No image found in the AI response.");
    });
};

export const generateImageWithPrompt = async (
  prompt: string
): Promise<{ newBase64: string; newMimeType: string }> => {
    return withErrorHandling(async (ai) => {
        // This instruction wrapper enhances the user's prompt to achieve a specific cinematic and dramatic style.
        const finalPrompt = `Generate a photo, hyper-realistic cinematic still. The scene must feel like a dramatic, captured moment from a video, NOT a posed photograph. Characters must have exaggerated, theatrical expressions that immediately grab audience attention. The user's creative request is: "${prompt}", In 16:9 aspect ratio.`;

        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: finalPrompt,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/png',
                aspectRatio: '16:9',
            },
        });

        const generatedImage = response.generatedImages?.[0];
        if (generatedImage?.image?.imageBytes) {
            const mimeType = generatedImage.image.mimeType || 'image/png';
            return {
                newBase64: `data:${mimeType};base64,${generatedImage.image.imageBytes}`,
                newMimeType: mimeType,
            };
        }

        throw new Error("No image found in the AI response.");
    });
};

const suggestionJsonSchema = {
  type: Type.OBJECT,
  properties: {
    suggestions: {
      type: Type.ARRAY,
      items: {
        type: Type.STRING,
        description: "A complete, detailed prompt for an AI image editor to add text to the thumbnail."
      }
    }
  },
};

const parseSuggestions = (responseText: string): string[] => {
    try {
        const jsonString = responseText.trim();
        if (jsonString.startsWith('{') && jsonString.endsWith('}')) {
            const parsed = JSON.parse(jsonString);
            if (parsed.suggestions && Array.isArray(parsed.suggestions)) {
                return parsed.suggestions;
            }
        }
        console.warn("Failed to parse JSON suggestions, returning empty array.", jsonString);
        return [];
    } catch (e) {
        console.error("Error parsing suggestion JSON:", e);
        return [];
    }
}


export const generateTextOverlaySuggestions = async (
  image: ImagePart
): Promise<string[]> => {
  try {
    return await withErrorHandling(async (ai) => {
        const systemInstruction = "You are an expert YouTube thumbnail designer and content strategist. Your goal is to create highly engaging, clickbaity text overlays that maximize click-through rate, inspired by top YouTubers.";
        const userPrompt = `Analyze the provided thumbnail image. Generate 3 distinct suggestions for text overlays. Each suggestion must be a complete, detailed prompt for an AI image editor. Each prompt must specify:
1.  The exact text to add, in quotes. The text should be short, dramatic, and in all caps (e.g., 'SHE LOST EVERYTHING!', '"YOU'RE DONE, KAREN"').
2.  A specific, descriptive position on the image (e.g., 'top right corner', 'above the person on the right', 'centered at the bottom').
3.  Detailed styling instructions to make the text POP and be extremely prominent and readable. You MUST specify: a thick, bold, condensed sans-serif font (e.g., 'Impact', 'Bebas Neue', 'Anton'); a vibrant, high-contrast text color (e.g., 'bright yellow #FFFF00', 'vibrant red #FF0000'); a very thick, contrasting outline, usually black or white (e.g., 'with a heavy 10px black stroke'); and a subtle drop shadow to make it pop from the background. The final result should look professional and attention-grabbing.
Return the response as a JSON object with a single key 'suggestions' which is an array of strings, where each string is a complete prompt.`;

        const imagePart = {
        inlineData: {
            data: base64DataUrlToPureBase64(image.base64),
            mimeType: image.mimeType,
        },
        };

        const textPart = { text: userPrompt };

        const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [imagePart, textPart] },
        config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: suggestionJsonSchema
        }
        });

        return parseSuggestions(response.text);
    });
  } catch (error) {
    // For suggestions, we don't want to show a blocking error, just log it.
    console.error("Error generating text overlay suggestions:", error);
    return [];
  }
};

export const generateInitialTextSuggestions = async (
  sceneDescription: string
): Promise<string[]> => {
  try {
    return await withErrorHandling(async (ai) => {
        const systemInstruction = "You are an expert YouTube thumbnail designer. Based on the user's scene description, your goal is to generate 3 highly engaging, clickbaity text overlay suggestions to maximize click-through rate.";
        const userPrompt = `Based on the following scene description, generate 3 distinct suggestions for a text overlay to be included in the final image. Each suggestion must be a complete, detailed instruction for an AI.
Scene: "${sceneDescription}"

Each prompt must specify:
1.  The exact text to add, in quotes (e.g., "'VIOLATION CAUGHT!'"). Text should be short, dramatic, and in all caps.
2.  A specific, descriptive position (e.g., "in the top right corner").
3.  Detailed styling instructions to make the text POP and be extremely prominent and readable. You MUST specify: a thick, bold, condensed sans-serif font (e.g., 'Impact', 'Bebas Neue'); a vibrant, high-contrast text color (e.g., 'bright yellow #FFFF00'); a very thick, contrasting outline, usually black or white (e.g., 'with a heavy 8px black stroke'); and a subtle drop shadow to make it pop from the background. The final result should look professional and attention-grabbing.
Return the response as a JSON object with a single key 'suggestions' which is an array of strings, where each string is a complete prompt.`;

        const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: userPrompt,
        config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: suggestionJsonSchema
        }
        });

        return parseSuggestions(response.text);
    });
  } catch (error) {
     // For suggestions, we don't want to show a blocking error, just log it.
     console.error("Error generating initial text suggestions:", error);
     return [];
  }
};
