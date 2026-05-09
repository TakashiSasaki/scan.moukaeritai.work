import { getFunctions, httpsCallable } from "firebase/functions";

// Get the Firebase Functions instance
// You can pass the app instance here if needed, but it's usually initialized globally
function getFn() {
  return getFunctions();
}

export async function identifyMatches(searchImageBase64: string, items: any[]) {
  try {
    const identifyMatchesFn = httpsCallable(getFn(), "identifyMatches");
    const result = await identifyMatchesFn({ searchImageBase64, items });
    return result.data as string[];
  } catch (error) {
    console.error("Gemini Search Error:", error);
    return [];
  }
}

export async function describeImage(imageBase64: string) {
  try {
    const describeImageFn = httpsCallable(getFn(), "describeImage");
    const result = await describeImageFn({ imageBase64 });
    return result.data as string;
  } catch (error) {
    console.error("Gemini Describe Error:", error);
    return "";
  }
}
