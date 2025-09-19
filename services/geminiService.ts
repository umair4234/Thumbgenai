import { GoogleGenAI, Modality, Type } from "@google/genai";
import type { GenerateContentResponse } from "@google/genai";

// FIX: Per @google/genai guidelines, initialize the client once with API_KEY from environment variables.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });


/**
 * A higher-order function that wraps API calls with error handling logic.
 * @param apiCall A function that performs an API call.
 * @returns The result of the apiCall.
 * @throws An error with a user-friendly message if the API call fails.
 */
async function withErrorHandling<T>(apiCall: () => Promise<T>): Promise<T> {
    try {
        return await apiCall();
    } catch (error) {
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

    let finalMessage = "An unexpected error occurred while communicating with the Gemini API.";

    if (error instanceof Error) {
        const message = error.message;
        if (message.includes('API key not valid') || message.includes('API_KEY')) {
            finalMessage = "The Gemini API key is invalid. Please check your environment configuration.";
        } else if (message.includes('429') || message.includes('RESOURCE_EXHAUSTED') || message.includes('quota')) {
            finalMessage = "The Gemini API key has exceeded its quota. Please wait a moment before trying again.";
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
    return withErrorHandling(async () => {
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
  imageToEdit: ImagePart,
  prompt: string,
  characterImages: ImagePart[] = [],
  isMaskingEdit: boolean = false,
): Promise<{ newBase64: string; newMimeType: string }> => {
    return withErrorHandling(async () => {
        const imageEditModel = 'gemini-2.5-flash-image-preview';
        const parts: any[] = [];
        let finalPrompt = prompt;

        // The primary image is now either the original or the composite "instructional image".
        parts.push({
            inlineData: {
                data: base64DataUrlToPureBase64(imageToEdit.base64),
                mimeType: imageToEdit.mimeType,
            },
        });
        
        characterImages.forEach(charImage => {
            parts.push({
                inlineData: {
                    data: base64DataUrlToPureBase64(charImage.base64),
                    mimeType: charImage.mimeType,
                },
            });
        });

        // If it's a masking edit, use the new "Visual Instruction Fusion" prompt.
        if (isMaskingEdit) {
            finalPrompt = `You are an expert AI photo editor. The user has provided an image with numbered, semi-transparent red overlays highlighting areas to be edited. Your task is to perform the edits described in the numbered list below, applying each edit ONLY to its corresponding numbered region in the image.

**RULES:**
1.  **Strictly Adhere to Regions:** Only modify the highlighted areas. All other parts of the image must remain untouched.
2.  **Seamless Integration:** Your edits must be photorealistic and blend perfectly with the original image's lighting, shadows, and style.
3.  **Execute All Tasks:** You must complete every task in the list.
4.  **Final Output:** The final image you generate must NOT contain the red overlays or the numbers. It should only contain the completed, blended edits.

**--- EDITING TASKS ---**
${prompt}
**--- END OF TASKS ---**

Now, generate the final, edited image by following all rules precisely.`;
        }

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
    return withErrorHandling(async () => {
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
    return await withErrorHandling(async () => {
        const systemInstruction = "You are an expert YouTube thumbnail designer and content strategist. Your goal is to create highly engaging, clickbaity text overlays that maximize click-through rate, inspired by top YouTubers.";
        const userPrompt = `Analyze the provided thumbnail image. Generate 5 distinct suggestions for text overlays. Each suggestion must be a complete, detailed prompt for an AI image editor. Each prompt must specify:
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
    console.error("Error generating text overlay suggestions:", error);
    return [];
  }
};

export const generateInitialTextSuggestions = async (
  sceneDescription: string
): Promise<string[]> => {
  try {
    return await withErrorHandling(async () => {
        const systemInstruction = "You are an expert YouTube thumbnail designer. Based on the user's scene description, your goal is to generate 5 highly engaging, clickbaity text overlay suggestions to maximize click-through rate.";
        const userPrompt = `Based on the following scene description, generate 5 distinct suggestions for a text overlay to be included in the final image. Each suggestion must be a complete, detailed instruction for an AI.
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
     console.error("Error generating initial text suggestions:", error);
     return [];
  }
};