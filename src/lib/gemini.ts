import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function identifyMatches(searchImageBase64: string, items: any[]) {
  // Format the item list for the model
  const itemsContext = items.map(item => ({
    id: item.id,
    name: item.name,
    description: item.description
  }));

  const prompt = `
    You are a visual search assistant. The user has uploaded an image (enclosed in the request).
    The user also has a catalog of items they track.
    Your task is to identify which items from the catalog below most likely match the object in the uploaded photo.
    
    Catalog Items:
    ${JSON.stringify(itemsContext, null, 2)}
    
    Return a list of IDs of the matching items, in order of relevance.
    If no item clearly matches, suggest 0 or more IDs that are most similar.
    If you see a new item not in the catalog, mention that too.
    
    Response format: JUST a JSON array of item IDs.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: searchImageBase64
            }
          },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json"
      }
    });

    const result = JSON.parse(response.text);
    return result as string[];
  } catch (error) {
    console.error("Gemini Search Error:", error);
    return [];
  }
}

export async function describeImage(imageBase64: string) {
  const prompt = `
    Describe this object concisely for a search engine. Include:
    1. What the object is.
    2. Color, material, and distinctive features.
    3. Any text visible on it.
    4. Possible categories (e.g. tools, electronics, kitchenware).
    
    Return as a short string of keywords.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: imageBase64
            }
          },
          { text: prompt }
        ]
      }
    });

    return response.text;
  } catch (error) {
    console.error("Gemini Describe Error:", error);
    return "";
  }
}
