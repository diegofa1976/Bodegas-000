
import { Type, GoogleGenAI } from "@google/genai";

/**
 * ISOLATED MODULE: COLOR EXTRACTION SERVICE
 * This module is independent and handles only the extraction of colors from wine labels.
 * DO NOT MODIFY this file unless explicitly requested.
 */

export const extractColorPalette = async (imageBase64: string): Promise<string[]> => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing. Please set it in the environment variables.");
  }
  const ai = new GoogleGenAI({ apiKey });
  
  const base64Data = imageBase64.split(',')[1];
  const mimeType = imageBase64.split(';')[0].split(':')[1];

  const prompt = `Analiza con extrema precisión la imagen de esta botella de vino. Tu objetivo es identificar los 5 colores más representativos y dominantes que definen la identidad visual de la marca en la ETIQUETA y el BRANDING.

  INSTRUCCIONES DE EXTRACCIÓN (CRÍTICAS):
  1. LECTURA DE PÍXELES REALES: Analiza los colores reales presentes en la etiqueta. Busca rojos intensos, granates, dorados metálicos, verdes botella, cremas, etc.
  2. PROHIBIDO EL GRIS: No devuelvas una paleta monótona, grisácea o desaturada a menos que la etiqueta sea 100% blanco y negro. Si hay un solo píxel de color relevante, DEBES extraerlo.
  3. IGNORA EL ENTORNO: Ignora completamente el fondo (blanco, gris, sombras) y el cristal de la botella (transparente o negro genérico).
  4. FOCO EN LA ETIQUETA: Concéntrate exclusivamente en el diseño gráfico, logotipos y textos de la etiqueta frontal.
  5. PRECISIÓN HEXADECIMAL: Devuelve el código hexadecimal exacto (#RRGGBB) que mejor represente cada uno de los 5 colores detectados.

  REGLA DE SALIDA:
  - Devuelve ÚNICAMENTE un array JSON de strings con los 5 códigos hexadecimales.
  - Ejemplo: ["#800020", "#D4AF37", "#F5F5DC", "#004225", "#2F2F2F"]`;

  const tryExtraction = async (model: string): Promise<string[]> => {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout: Color extraction took too long for model ${model}`)), 30000)
    );

    const response = await Promise.race([
      ai.models.generateContent({
        model: model,
        contents: {
          parts: [
            { inlineData: { data: base64Data, mimeType } },
            { text: prompt }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.STRING,
              description: "Hexadecimal color code (#RRGGBB).",
            },
          },
        },
      }),
      timeoutPromise
    ]);

    const text = response.text || '[]';
    const colors = JSON.parse(text);
    return Array.isArray(colors) ? colors : [];
  };

  try {
    // 1) Use 'gemini-3-flash-preview'
    try {
      return await tryExtraction('gemini-3-flash-preview');
    } catch (error) {
      console.error("Color extraction model failed:", error);
      // 2) if that fails, return an empty array
      return [];
    }
  } catch (error) {
    console.error("All color extraction models failed:", error);
    // 3) if that also fails, return an empty array
    return [];
  }
};
