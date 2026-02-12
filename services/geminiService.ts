
import { GoogleGenAI, Type } from "@google/genai";
import { Wine, ImageType, FunnelState } from "../types";

export const analyzePerception = async (wineName: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
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
 * Reinterprets user feedback into a structured English prompt for image editing.
 */
export const reinterpretEditRequest = async (userInput: string, currentConcept: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    Eres un experto en dirección de arte y edición fotográfica publicitaria.
    Convierte el feedback del usuario (español) en una instrucción técnica en inglés para un modelo de edición de imagen.
    
    FEEDBACK: "${userInput}"
    CONCEPTO ACTUAL: "${currentConcept}"
    
    REGLAS:
    1. Identifica el cambio específico (luz, fondo, objeto, etiqueta, etc.).
    2. Ignora cortesías o frases irrelevantes.
    3. Devuelve el prompt EXACTAMENTE con este formato:
       "Starting from the existing image, keep the same composition, characters, style, lighting and framing. Do NOT create a new image. Do NOT change anything else. Only apply the following change: [TECHNICAL_DESCRIPTION_OF_CHANGE]"
    
    SALIDA: Solo el texto en inglés.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text?.trim() || `Starting from the existing image, keep everything the same and only apply the following change: ${userInput}`;
  } catch (error) {
    console.error("Error reinterpreting edit request:", error);
    return `Starting from the existing image, keep everything the same and only apply the following change: ${userInput}`;
  }
};

/**
 * Generates visual concepts based on wine attributes and creative state.
 */
export const generateVisualConcepts = async (wine: Wine, state: FunnelState): Promise<string[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const isMuyMinimal = state.type === ImageType.BODEGON && state.selections['limpieza'] === 'Muy minimal';

  const prompt = `
    Eres un Director Creativo experto en fotografía de vinos para KingLab Bodegas.
    Tu tarea es generar 3 conceptos visuales que reflejen la esencia de este producto específico.
    
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
    - Cada propuesta debe ser un párrafo de 30-40 palabras.
    - Usa un lenguaje evocador, profesional y alineado con el perfil del vino.
    - No repitas conceptos.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            concepts: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Tres conceptos visuales creativos."
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
      "Una composición de alta gama enfocada en la silueta de la botella con iluminación de contorno dramática.",
      "Un entorno natural y orgánico que resalta la conexión de la etiqueta con su origen artesanal.",
      "Foco selectivo en el cristal y el color del vino, usando texturas ricas en el fondo para crear profundidad."
    ];
  }
};

/**
 * Generates the final high-quality image or edits an existing one using nano banana models.
 */
export const generateFinalImage = async (
  wine: Wine, 
  concept: string, 
  ratio: string, 
  adjustment?: string,
  locationImage?: string,
  baseImage?: string 
): Promise<string | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const wineBase64 = wine.image.split(',')[1];
  const wineMimeType = wine.image.split(';')[0].split(':')[1];

  const contents: any[] = [
    { inlineData: { data: wineBase64, mimeType: wineMimeType } }
  ];

  let prompt = "";
  
  const realismRule = `
      REGLA DE REALISMO Y NATURALIDAD (CRÍTICA):
      - La imagen debe sentirse REAL, natural y creíble.
      - EVITA: Estética de "stock photography", poses artificiales de catálogo, moda sobre-estilizada o perfección excesiva que se sienta preparada.
      - MANTÉN: Alta calidad técnica, buen gusto y estilismo cuidadoso.
      - TONO VISUAL: Realismo cinemático y naturalismo de inspiración documental. La imagen debe parecer un "momento real" capturado de forma natural.
      - PRESENCIA HUMANA: Lenguaje corporal natural, posturas imperfectas pero creíbles y asimetría sutil que se sienta humana.
      - VESTUARIO: Prendas de alta calidad, materiales nobles y en perfecto estado (sin manchas ni desgaste), pero con un estilismo natural y "vivido" (lived-in look), no como una sesión de moda rígida.
  `;

  if (baseImage) {
    const baseB64 = baseImage.split(',')[1];
    const baseMime = baseImage.split(';')[0].split(':')[1];
    contents.push({ inlineData: { data: baseB64, mimeType: baseMime } });
    
    prompt = `
      ${adjustment}
      
      INSTRUCCIONES CRÍTICAS DE EDICIÓN:
      - La imagen en la PARTE 2 es tu referencia base.
      - MANTÉN la composición exacta, la pose de los personajes, el estilo de iluminación y el encuadre de la PARTE 2.
      - NO generes una imagen nueva desde cero.
      - La etiqueta de la botella debe seguir siendo legible y fiel a la PARTE 1.
      - SOLO aplica el cambio solicitado en el prompt superior.
      
      ${realismRule}
    `;
  } else {
    prompt = `
      Genera una imagen publicitaria de alta calidad basada ESTRICTAMENTE en este concepto creativo:
      "${concept}"
      
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
      prompt += `\n\nREFERENCIA DE ENTORNO: La segunda imagen es una referencia arquitectónica/espacial. Evoca este mismo lugar en el fondo de la composición de forma natural.`;
    }

    if (adjustment) {
      prompt += `\n\nAJUSTE INICIAL: "${adjustment}".`;
    }
  }

  contents.push({ text: prompt });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: contents },
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
    console.error("Error generating/editing image:", error);
    throw error;
  }
};
