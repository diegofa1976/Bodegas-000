
import { GoogleGenAI, Type } from "@google/genai";
import { Wine, ImageType, FunnelState } from "../types";

export const generateVisualConcepts = async (wine: Wine, state: FunnelState): Promise<string[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    Eres un Director Creativo experto en fotografía de vinos para Kinglab Bodegas 202.
    Analiza la siguiente información y genera 3 conceptos visuales distintos, creativos y profesionales en ESPAÑOL.
    
    PRODUCTO:
    - Nombre: ${wine.name}
    - Perfil: ${wine.description}
    - Público: ${wine.targetAudience}
    - Nivel: ${wine.priceLevel}
    - Especial: ${wine.specialFeatures.join(', ')}
    
    TIPO DE IMAGEN: ${state.type}
    DETALLES ELEGIDOS: ${JSON.stringify(state.selections)}
    CONTEXTO ADICIONAL: ${state.contextText || 'Ninguno'}
    
    REGLAS:
    - Los conceptos deben ser cortos (un párrafo de 30-40 palabras cada uno).
    - Lenguaje editorial, elegante y descriptivo.
    - Cada concepto debe ser único en su enfoque visual.
    - Idioma: Español.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            concepts: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Tres párrafos descriptivos de conceptos visuales."
            }
          },
          required: ["concepts"]
        }
      }
    });

    const data = JSON.parse(response.text || '{}');
    return data.concepts || [];
  } catch (error) {
    console.error("Error generating concepts:", error);
    return [
      "Una toma elegante resaltando la botella con luz lateral dramática y sombras suaves.",
      "Un entorno orgánico y rústico que resalta la conexión con la tierra y el viñedo.",
      "Composición minimalista de alta gama centrada en la silueta y reflejos del cristal."
    ];
  }
};

export const generateFinalImage = async (
  wine: Wine, 
  concept: string, 
  ratio: string, 
  adjustment?: string
): Promise<string | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const base64Data = wine.image.split(',')[1];
  const mimeType = wine.image.split(';')[0].split(':')[1];

  let prompt = `
    Genera una imagen publicitaria de alta calidad basada ESTRICTAMENTE en este concepto creativo:
    "${concept}"
    
    DETALLES TÉCNICOS:
    - Producto: ${wine.name}
    - Objetivo: Mantener la forma exacta de la botella y la legibilidad de la etiqueta de la imagen de referencia.
    - Estilo: Fotografía publicitaria profesional de alta gama.
  `;

  if (adjustment) {
    prompt += `\n\nAPLICA ESTE AJUSTE ESPECÍFICO: "${adjustment}" manteniendo el resto de la composición.`;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { data: base64Data, mimeType } },
          { text: prompt }
        ]
      },
      config: {
        imageConfig: {
          aspectRatio: ratio as any
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error("Error generating final image:", error);
    throw error;
  }
};
