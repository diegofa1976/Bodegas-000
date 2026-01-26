
import React, { useState } from 'react';
import { Wine, ImageType, AspectRatio } from '../types';
// Fixed: Using generateFinalImage as generateWineImage does not exist in geminiService.ts
import { generateFinalImage } from '../services/geminiService';

interface ImageGeneratorProps {
  wines: Wine[];
  initialSelectedWine?: Wine;
}

const ImageGenerator: React.FC<ImageGeneratorProps> = ({ wines, initialSelectedWine }) => {
  const [selectedWine, setSelectedWine] = useState<Wine | null>(initialSelectedWine || wines[0] || null);
  const [ratio, setRatio] = useState<AspectRatio>('1:1');
  const [type, setType] = useState<ImageType>(ImageType.BODEGON);
  const [context, setContext] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!selectedWine) return;
    setLoading(true);
    try {
      // Fixed: Removed GenerationConfig dependency and call generateFinalImage with a constructed concept
      const concept = context.trim() || `Fotografía publicitaria profesional de ${selectedWine.name}, estilo ${type}.`;
      const result = await generateFinalImage(selectedWine, concept, ratio);
      setGeneratedImage(result);
    } catch (error) {
      alert("Error al generar la imagen. Verifica tu conexión o API Key.");
    } finally {
      setLoading(false);
    }
  };

  // Fix: changed '4:5' to '3:4' to match AspectRatio type definition in types.ts (allowed values: '1:1' | '3:4' | '4:3' | '9:16' | '16:9')
  const ratios: AspectRatio[] = ['1:1', '3:4', '9:16', '16:9'];
  const types = Object.values(ImageType);

  const labelClasses = "block text-sm font-semibold text-stone-700 mb-2";

  return (
    <div className="space-y-8 pb-10">
      {!generatedImage ? (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {/* WINE SELECTOR */}
          <div>
            <label className={labelClasses}>Seleccionar vino</label>
            <select
              className="w-full px-4 py-3 rounded-lg border border-stone-200 focus:ring-2 focus:ring-black outline-none bg-white text-black"
              value={selectedWine?.id || ''}
              onChange={(e) => setSelectedWine(wines.find(w => w.id === e.target.value) || null)}
            >
              {wines.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>

          {/* RATIO BUTTONS */}
          <div className="space-y-3">
            <label className={labelClasses}>Formato de imagen</label>
            <div className="grid grid-cols-4 gap-2">
              {ratios.map(r => (
                <button
                  key={r}
                  onClick={() => setRatio(r)}
                  className={`py-3 rounded-lg border text-sm font-medium transition-all ${
                    ratio === r 
                    ? 'bg-black text-white border-black shadow-md' 
                    : 'bg-white text-stone-600 border-stone-200 hover:border-stone-400'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* TYPE BUTTONS */}
          <div className="space-y-3">
            <label className={labelClasses}>Tipo de imagen</label>
            <div className="grid grid-cols-1 gap-2">
              {types.map(t => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`py-4 rounded-xl border text-left px-5 font-semibold transition-all ${
                    type === t 
                    ? 'bg-black text-white border-black shadow-md' 
                    : 'bg-white text-stone-600 border-stone-200 hover:border-stone-400'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* OPTIONAL CONTEXT */}
          <div className="space-y-2">
            <label className={labelClasses}>Idea o contexto (opcional)</label>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-stone-200 focus:ring-2 focus:ring-black outline-none bg-white text-black placeholder-stone-400 transition-all"
              placeholder="Ej: Bodega antigua con barricas al fondo..."
              rows={3}
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading || !selectedWine}
            className={`w-full py-5 rounded-2xl font-bold text-white shadow-xl flex items-center justify-center gap-3 transition-all ${
              loading ? 'bg-stone-400 cursor-not-allowed' : 'bg-black shadow-black/10 active:scale-[0.98]'
            }`}
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Generando arte...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
                Generar imagen
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="space-y-6 animate-in zoom-in-95 duration-500">
          <div className="relative group overflow-hidden rounded-2xl border border-stone-200 shadow-2xl bg-white">
            <img src={generatedImage} alt="Generated result" className="w-full h-auto" />
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => setGeneratedImage(null)}
              className="flex-1 bg-stone-100 text-stone-700 py-4 rounded-xl font-bold hover:bg-stone-200 transition-all"
            >
              Volver
            </button>
            <a
              href={generatedImage}
              download={`kinglab-${selectedWine?.name || 'vin'}-${Date.now()}.png`}
              className="flex-1 bg-black text-white py-4 rounded-xl font-bold text-center shadow-lg shadow-black/10 hover:bg-stone-900 transition-all"
            >
              Descargar
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageGenerator;
