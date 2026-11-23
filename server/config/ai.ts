import { GoogleGenAI, Type } from '@google/genai';
import { GEMINI_API_KEY } from './env';

export const ai = new GoogleGenAI({
  apiKey: GEMINI_API_KEY,
});

export { Type };
