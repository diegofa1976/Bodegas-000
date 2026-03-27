import { GoogleGenAI, Type } from "@google/genai";
import { Wine, ImageType, FunnelState } from "../types";
 
export const analyzePerception = async (wineName: string): Promise<string> => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing. Please set it in the environment variables.");
  }
  const ai = new GoogleGenAI({ apiKey });
 
  const prompt = `Analiza la percepción pública y de expertos del vino o bodega "${wineName}" en entornos digitales (redes sociales, foros, reseñas, prensa especializada). 
  REGLA CRÍTICA: NO incluyas información del sitio web oficial de la bodega ni de sus propios canales de redes sociales. 
  Queremos saber qué dice el público "fuera de casa". 
  Devuelve un resumen de EXACTAMENTE DOS PÁRRAFOS en español.`;
 
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      }
    });
 
    let text = response.text || "No se pudo obtener información externa suficiente para realizar el análisis.";
 
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (groundingChunks) {
      const urls = groundingChunks
        .map((chunk: any) => chunk.web?.uri)
        .filter((uri: string | undefined): uri is string => !!uri);
 
      if (urls.length > 0) {
        const uniqueUrls = Array.from(new Set(urls));
        text += "\n\nFuentes consultadas:\n" + uniqueUrls.join("\n");
      }
    }
 
    return text;
  } catch (error) {
    console.error("Error analyzing perception:", error);
    return "Ocurrió un error al intentar acceder a los datos de percepción digital.";
  }
};
 
/**
 * Extracts a short display title from a concept string.
 */
export const extractConceptTitle = (concept: string): string => {
  const titleMatch = concept.match(/TÍTULO:\s*([^.]+)/i);
  if (titleMatch) return titleMatch[1].trim();
  const firstSentence = concept.split('.')[0].trim();
  if (firstSentence.length > 0 && firstSentence.length <= 80) return firstSentence;
  return concept.length > 80 ? concept.substring(0, 77) + '...' : concept;
};
 
/**
 * Reinterprets user feedback into a structured prompt for image editing.
 */
export const reinterpretEditRequest = async (userInput: string, currentConcept: string): Promise<string> => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing. Please set it in the environment variables.");
  }
  const ai = new GoogleGenAI({ apiKey });
 
  const prompt = `Eres un experto en dirección de arte y edición fotográfica publicitaria. Convierte el feedback del usuario (español) en una instrucción técnica en inglés para un modelo de edición de imagen.
    
    FEEDBACK: "${userInput}"
    CONCEPTO ACTUAL: "${currentConcept}"
    
    REGLAS:
    1. Identifica el cambio específico (luz, fondo, objeto, etiqueta, color, etc.).
    2. Sé muy concreto y técnico.
    3. Ignora cortesías o frases irrelevantes.
    4. Devuelve SOLO la descripción técnica del cambio en inglés, sin prefijos ni frases introductorias.
    
    SALIDA: Solo la descripción técnica del cambio en inglés (máximo 2 frases).
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
              description: "Instrucción técnica de edición en inglés."
            }
          },
          required: ["concepts"]
        }
      }
    });
    const parsed = JSON.parse(response.text || '{"concepts":[]}');
    return parsed.concepts?.[0]?.trim() || userInput;
  } catch (error) {
    console.error("Error reinterpreting edit request:", error);
    return userInput;
  }
};
 
/**
 * Generates visual concepts based on wine attributes and creative state.
 */
export const generateVisualConcepts = async (wine: Wine, state: FunnelState): Promise<string[]> => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing. Please set it in the environment variables.");
  }
  const ai = new GoogleGenAI({ apiKey });
  const isMuyMinimal = state.type === ImageType.BODEGON && state.selections['limpieza'] === 'Muy minimal';
 
  const prompt = `Eres un Director Creativo experto en fotografía de vinos para KingLab Bodegas. Tu tarea es generar 3 conceptos visuales que reflejen la esencia de este producto específico.
    
    PRODUCTO (CONTEXTO ACTIVO - Prioriza estos valores en el estilo):
    - Nombre: ${wine.name}
    - Carácter: ${wine.description}
    - Público Objetivo: ${wine.targetAudience}
    - Cualidades Especiales: ${wine.specialFeatures}
    ${wine.useAnalysisInCreative ? `\n- PERCEPCIÓN DIGITAL EXTERNA: ${wine.analysisResult}` : ''}
    
    TIPO DE IMAGEN: ${state.type}
    ${isMuyMinimal ? 'ESTILO ESPECÍFICO: SIMPLICIDAD EXTREMA. Bodegón "Muy minimal". Elimina cualquier elemento decorativo. Enfócate exclusivamente en la pureza de la iluminación, la composición geométrica impecable y la elegancia del vacío.' : ''}
    DETALLES ELEGIDOS: ${JSON.stringify(state.selections)}
    LUGAR: ${state.selections['donde'] || 'N/A'} ${state.locationImage ? '(Referencia visual subida)' : ''}
    CUÁNDO: ${state.timeContext || 'N/A'}
    ATMÓSFERA: ${state.contextText || 'N/A'}
    
    DIRECCIÓN DE ARTE (REGLA DE REALISMO): Las propuestas deben alejarse de la estética de catálogo genérico. Busca un naturalismo inspirado en el estilo documental o realismo cinemático. Momentos auténticos, luz natural o ambiental creíble.
    
    REGLA DE CALIDAD HUMANA: Si aparecen personas, sus atuendos deben ser de alta calidad pero con un estilismo natural y "vivido", nunca rígido o excesivamente posado.
    
    REGLAS DE SALIDA:
    - Genera 3 propuestas creativas en ESPAÑOL.
    - Cada propuesta debe tener este formato EXACTO:
      TÍTULO: [Título evocador de 3-5 palabras]
      DESCRIPCIÓN: [Descripción visual detallada de 40-60 palabras]
      ESTILO VISUAL: [Nota técnica de iluminación y atmósfera, 15-20 palabras]
    - Usa un lenguaje evocador, profesional y alineado con el perfil del vino.
    - No repitas conceptos.
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
              description: "Tres conceptos visuales creativos con formato TÍTULO/DESCRIPCIÓN/ESTILO VISUAL."
            }
          },
          required: ["concepts"]
        }
      }
    });
 
    const parsed = JSON.parse(response.text || '{}');
    return parsed.concepts || [];
  } catch (error) {
    console.error("Error generating concepts:", error);
    return [
      "TÍTULO: Silueta y Contraluz\nDESCRIPCIÓN: Una composición de alta gama enfocada en la silueta de la botella con iluminación de contorno dramática.\nESTILO VISUAL: Luz de contorno dramática, fondo oscuro neutro.",
      "TÍTULO: Raíces y Tierra\nDESCRIPCIÓN: Un entorno natural y orgánico que resalta la conexión de la etiqueta con su origen artesanal.\nESTILO VISUAL: Luz natural difusa, tonos cálidos terrosos.",
      "TÍTULO: Cristal y Profundidad\nDESCRIPCIÓN: Foco selectivo en el cristal y el color del vino, usando texturas ricas en el fondo para crear profundidad.\nESTILO VISUAL: Luz lateral marcada, bokeh suave en el fondo."
    ];
  }
};
 
/**
 * Generates the final high-quality image or edits an existing one.
 */
export const generateFinalImage = async (
  wine: Wine,
  concept: string,
  ratio: string,
  adjustment?: string,
  locationImage?: string,
  baseImage?: string
): Promise<string | null> => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing. Please set it in the environment variables.");
  }
  const ai = new GoogleGenAI({ apiKey });
 
  const wineBase64 = wine.image.split(',')[1];
  const wineMimeType = wine.image.split(';')[0].split(':')[1];
 
  const realismRule = `
    REGLA DE REALISMO Y NATURALIDAD (CRÍTICA):
    - La imagen debe sentirse REAL, natural y creíble.
    - EVITA: Estética de "stock photography", poses artificiales, perfección excesiva.
    - MANTÉN: Alta calidad técnica, buen gusto y estilismo cuidadoso.
    - TONO VISUAL: Realismo cinemático.
    - PRESENCIA HUMANA: Lenguaje corporal natural, posturas creíbles con asimetría sutil.
    - VESTUARIO: Prendas de alta calidad con estilismo natural "vivido", no de sesión de moda rígida.
  `;
 
  let contents: any[];
  let prompt: string;
 
  if (baseImage) {
    const baseB64 = baseImage.split(',')[1];
    const baseMime = baseImage.split(';')[0].split(':')[1];
 
    contents = [
      { inlineData: { data: baseB64, mimeType: baseMime } },
      { inlineData: { data: wineBase64, mimeType: wineMimeType } },
    ];
 
    prompt = `INSTRUCCIONES CRÍTICAS DE EDICIÓN: - La imagen en la PARTE 2 es tu referencia base. - MANTÉN la composición exacta, la pose de los personajes, el estilo de iluminación y el encuadre de la PARTE 2. - NO generes una imagen nueva desde cero. - La etiqueta de la botella debe seguir siendo legible y fiel a la PARTE 1. - SOLO aplica el cambio solicitado en el prompt superior.

      INSTRUCCIÓN DE EDICIÓN: ${adjustment}

      ${realismRule}
    `;
  } else {
    contents = [
      { inlineData: { data: wineBase64, mimeType: wineMimeType } },
    ];
 
    prompt = `Genera una imagen publicitaria de alta calidad basada ESTRICTAMENTE en este concepto creativo: "${concept}"
      
      DETALLES TÉCNICOS:
      - Producto: ${wine.name}
      - Objetivo: Mantener la forma exacta de la botella y la legibilidad de la etiqueta de la imagen de referencia.
      - Estilo: Fotografía publicitaria profesional de alta gama con enfoque en el naturalismo.
      
      ${realismRule}
    `;
 
    if (locationImage) {
      const locBase64 = locationImage.split(',')[1];
      const locMimeType = locationImage.split(';')[0].split(':')[1];
      contents.push({ inlineData: { data: locBase64, mimeType: locMimeType } });
      prompt += `\n\nREFERENCIA DE ENTORNO: La segunda imagen es una referencia arquitectónica/espacial. Evoca este mismo lugar de forma natural en el fondo de la composición.`;
    }
 
    if (adjustment) {
      prompt += `\n\nAJUSTE INICIAL: "${adjustment}".`;
    }
  }
 
  contents.push({ text: prompt });
 
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview',
      contents: { parts: contents },
      config: {
        imageConfig: {
          aspectRatio: ratio as any
        },
        responseModalities: ["image", "text"]
      }
    });
 
    const parts = response.candidates?.[0]?.content?.parts;
    if (parts) {
      for (const part of parts) {
        if (part.inlineData?.mimeType?.startsWith('image/')) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }
    return null;
  } catch (error) {
    console.error("Error generating/editing image:", error);
    throw error;
  }
};
