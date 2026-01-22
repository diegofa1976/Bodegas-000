
import React, { useState, useEffect } from 'react';
import { Wine, ImageType, FunnelState, AspectRatio, GalleryImage } from '../types';
import { generateVisualConcepts, generateFinalImage } from '../services/geminiService';

interface CreativeFunnelProps {
  wines: Wine[];
  onFinish: () => void;
  onSaveToGallery: (img: GalleryImage) => void;
  initialData?: {
    wine: Wine;
    concept: string;
    isAdjustment?: boolean;
  };
}

const CreativeFunnel: React.FC<CreativeFunnelProps> = ({ wines, onFinish, onSaveToGallery, initialData }) => {
  const [selectedWine, setSelectedWine] = useState<Wine>(initialData?.wine || wines[0]);
  const [state, setState] = useState<FunnelState>({
    type: null,
    step: initialData ? 5 : 1,
    selections: {},
    contextText: '',
    concepts: initialData ? [initialData.concept] : [],
    selectedConceptIndex: initialData ? 0 : null,
    editingConceptIndex: null,
    imageHistory: initialData && initialData.wine.image ? [initialData.wine.image] : []
  });
  const [ratio, setRatio] = useState<AspectRatio>('1:1');
  const [loading, setLoading] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [customAdjustment, setCustomAdjustment] = useState('');

  // Handle auto-generation if started from gallery as regeneration or adjustment
  useEffect(() => {
    if (initialData && state.step === 5 && state.imageHistory.length <= 1) {
      if (!initialData.isAdjustment) {
        // Just trigger a regenerate automatically if it was "Regenerate"
        selectAndGenerate(0);
      }
    }
  }, []);

  const setType = (type: ImageType) => {
    setState(prev => ({ ...prev, type, step: 2, selections: {} }));
  };

  const handleSelection = (key: string, value: string) => {
    setState(prev => ({
      ...prev,
      selections: { ...prev.selections, [key]: value }
    }));
  };

  const nextStep = () => setState(prev => ({ ...prev, step: prev.step + 1 }));
  const prevStep = () => {
    if (state.step === 5) {
      setState(prev => ({ ...prev, step: 4 }));
    } else {
      setState(prev => ({ ...prev, step: Math.max(1, prev.step - 1) }));
    }
  };

  const startConceptGeneration = async () => {
    setLoading(true);
    const concepts = await generateVisualConcepts(selectedWine, state);
    setState(prev => ({ ...prev, concepts, step: 4 }));
    setLoading(false);
  };

  const selectAndGenerate = async (index: number, adjustment?: string) => {
    setState(prev => ({ ...prev, selectedConceptIndex: index }));
    setLoading(true);
    try {
      const img = await generateFinalImage(selectedWine, state.concepts[index], ratio, adjustment);
      if (img) {
        const galleryItem: GalleryImage = {
          id: Date.now().toString(),
          url: img,
          concept: state.concepts[index],
          wineName: selectedWine.name,
          timestamp: Date.now()
        };
        onSaveToGallery(galleryItem);
        setState(prev => ({ 
          ...prev, 
          imageHistory: [img, ...prev.imageHistory],
          step: 5 
        }));
      }
    } catch (e) {
      alert("Error al generar la imagen final.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = () => {
    if (state.editingConceptIndex !== null) {
      const newConcepts = [...state.concepts];
      newConcepts[state.editingConceptIndex] = editValue;
      setState(prev => ({ ...prev, concepts: newConcepts, editingConceptIndex: null }));
    }
  };

  const handleAdjustment = (adj: string) => {
    if (state.selectedConceptIndex !== null) {
      selectAndGenerate(state.selectedConceptIndex, adj);
    }
  };

  const handleDownload = (imgUrl: string) => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
      const win = window.open();
      if (win) {
        win.document.write(`<img src="${imgUrl}" style="width:100%"/>`);
        win.document.title = "Guardar imagen";
      }
    } else {
      const link = document.createElement('a');
      link.href = imgUrl;
      const cleanConcept = state.concepts[state.selectedConceptIndex || 0]
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .substring(0, 30);
      link.download = `${selectedWine.name.toLowerCase().replace(/\s/g, '_')}_${cleanConcept}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-stone-700">Seleccionar vino</label>
        <select 
          className="w-full px-4 py-3 rounded-lg border border-stone-200 bg-white text-black outline-none font-medium"
          value={selectedWine.id}
          onChange={(e) => setSelectedWine(wines.find(w => w.id === e.target.value)!)}
        >
          {wines.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
      </div>
      <h2 className="text-xl font-bold text-black font-serif">¿Qué tipo de imagen quieres crear?</h2>
      <div className="grid gap-3">
        {Object.values(ImageType).map(t => (
          <button 
            key={t}
            onClick={() => setType(t)}
            className="w-full py-5 rounded-xl border border-stone-200 bg-white text-stone-900 font-bold text-left px-6 hover:border-black transition-all shadow-sm active:bg-stone-50"
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  );

  const renderStep2 = () => {
    const questions: Record<ImageType, any[]> = {
      [ImageType.BODEGON]: [
        { label: "Tipo de superficie", key: "superficie", options: ["Madera", "Piedra", "Mármol", "Minimalista"] },
        { label: "Nivel de limpieza visual", key: "limpieza", options: ["Muy minimal", "Con elementos"] },
        { label: "Elementos de apoyo", key: "apoyo", options: ["Ninguno", "Copas", "Uvas", "Corchos"] },
        { label: "Fondo", key: "fondo", options: ["Neutro", "Con contexto"] }
      ],
      [ImageType.EN_USO]: [
        { label: "Sujeción", key: "mano", options: ["Mano sola", "Persona parcial"] },
        { label: "Acción", key: "accion", options: ["Servir", "Sostener", "Brindar"] },
        { label: "Cercanía al producto", key: "cercania", options: ["Primer plano", "Plano medio"] },
        { label: "Protagonismo humano", key: "protagonismo", options: ["Bajo", "Moderado"] }
      ],
      [ImageType.MOMENTO_SOCIAL]: [
        { label: "Número de personas", key: "personas", options: ["2 personas", "3 personas", "Grupo"] },
        { label: "Tipo de situación", key: "situacion", options: ["Íntima", "Celebración", "Informal"] },
        { label: "Nivel de ruido visual", key: "ruido", options: ["Limpio", "Dinámico"] },
        { label: "Foco principal", key: "foco", options: ["El vino", "La escena"] }
      ]
    };

    const currentQuestions = questions[state.type!];

    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
        <div className="flex items-center gap-2">
            <button onClick={prevStep} className="text-stone-900 hover:text-black p-2 bg-stone-100 rounded-full" aria-label="Volver">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </button>
            <h2 className="text-xl font-bold text-black font-serif">Detalles de {state.type}</h2>
        </div>
        {currentQuestions.map(q => (
          <div key={q.key} className="space-y-3">
            <label className="text-sm font-bold text-stone-800">{q.label}</label>
            <div className="grid grid-cols-2 gap-2">
              {q.options.map((opt: string) => (
                <button
                  key={opt}
                  onClick={() => handleSelection(q.key, opt)}
                  className={`py-3 rounded-lg border text-sm font-bold transition-all ${
                    state.selections[q.key] === opt ? 'bg-black text-white border-black' : 'bg-white text-stone-900 border-stone-300 active:bg-stone-50'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        ))}
        <button 
          onClick={nextStep}
          className="w-full py-4 bg-black text-white rounded-xl font-bold mt-4 shadow-lg active:scale-95 transition-all text-lg"
        >
          Continuar
        </button>
      </div>
    );
  };

  const renderStep3 = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
      <div className="flex items-center gap-2">
            <button onClick={prevStep} className="text-stone-900 hover:text-black p-2 bg-stone-100 rounded-full" aria-label="Volver">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </button>
            <h2 className="text-xl font-bold text-black font-serif">Contexto y Atmósfera</h2>
      </div>
      <div className="space-y-6">
        <div className="space-y-3">
          <label className="text-sm font-bold text-stone-800">Formato</label>
          <div className="grid grid-cols-4 gap-2">
            {['1:1', '4:5', '9:16', '16:9'].map(r => (
              <button 
                key={r} 
                onClick={() => setRatio(r as AspectRatio)}
                className={`py-3 rounded-lg border text-xs font-black ${ratio === r ? 'bg-black text-white border-black' : 'bg-white text-stone-900 border-stone-300 active:bg-stone-50'}`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <label className="text-sm font-bold text-stone-800">¿Dónde ocurre?</label>
          <div className="grid grid-cols-2 gap-2">
            {["Exterior", "Bodega", "Restaurante", "Casa"].map(opt => (
              <button key={opt} onClick={() => handleSelection('donde', opt)} className={`py-4 rounded-lg border text-sm font-bold transition-all ${state.selections['donde'] === opt ? 'bg-black text-white border-black' : 'bg-white text-stone-900 border-stone-300 active:bg-stone-50'}`}>{opt}</button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-bold text-stone-800">Matices o detalles adicionales</label>
          <textarea 
            value={state.contextText}
            onChange={(e) => setState(prev => ({ ...prev, contextText: e.target.value }))}
            className="w-full px-4 py-3 rounded-lg border border-stone-300 bg-white text-black placeholder-stone-400 outline-none h-24 font-medium focus:border-black"
            placeholder="Ej: Luz de atardecer filtrada por una ventana..."
          />
        </div>
      </div>
      <button 
        disabled={loading}
        onClick={startConceptGeneration}
        className="w-full py-5 bg-black text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-xl shadow-black/10 active:scale-95 transition-all text-lg"
      >
        {loading && <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
        Definir conceptos visuales
      </button>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-8 animate-in fade-in scale-95 duration-500">
      <div className="flex items-center gap-2">
            <button onClick={prevStep} className="text-stone-900 hover:text-black p-2 bg-stone-100 rounded-full" aria-label="Volver">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </button>
            <h2 className="text-2xl font-serif font-bold text-black">Propuestas Creativas</h2>
      </div>
      
      <div className="space-y-4">
        {state.concepts.map((concept, idx) => (
          <div key={idx} className="relative group">
            <div className={`bg-white border p-6 rounded-2xl shadow-sm transition-all ${state.editingConceptIndex === idx ? 'border-black ring-1 ring-black' : 'border-stone-200 hover:border-black'}`}>
              {state.editingConceptIndex === idx ? (
                <div className="space-y-3">
                  <textarea 
                    autoFocus
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-stone-50 text-black outline-none focus:ring-1 focus:ring-black h-32 font-medium"
                  />
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setState(prev => ({ ...prev, editingConceptIndex: null }))} className="text-xs font-bold text-stone-600 px-3 py-2 bg-stone-100 rounded-lg">Cancelar</button>
                    <button onClick={handleSaveEdit} className="bg-black text-white text-xs font-bold px-4 py-2 rounded-lg">Guardar cambios</button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-stone-900 text-sm leading-relaxed italic font-medium">"{concept}"</p>
                  <div className="mt-4 flex justify-between items-center">
                    <button 
                      onClick={() => {
                        setEditValue(concept);
                        setState(prev => ({ ...prev, editingConceptIndex: idx }));
                      }}
                      className="p-2 hover:bg-stone-100 rounded-lg transition-colors text-stone-700 hover:text-black flex items-center gap-1 text-xs font-bold"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                      Editar concepto
                    </button>
                    <button 
                      disabled={loading || state.editingConceptIndex !== null}
                      onClick={() => selectAndGenerate(idx)}
                      className="bg-black text-white px-6 py-2 rounded-full text-xs font-bold flex items-center gap-2 shadow-sm active:scale-95 transition-all"
                    >
                      {loading && state.selectedConceptIndex === idx ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Elegir concepto'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      <button 
        disabled={loading || state.editingConceptIndex !== null}
        onClick={startConceptGeneration}
        className="w-full py-4 border-2 border-black text-black rounded-xl font-black flex items-center justify-center gap-2 hover:bg-stone-50 transition-colors"
      >
        {loading ? <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>}
        Proponer otros conceptos
      </button>
    </div>
  );

  const renderStep5 = () => (
    <div className="space-y-8 animate-in zoom-in-95">
      {state.imageHistory.length > 0 && (
        <>
          <div className="relative group">
            <div className="rounded-2xl overflow-hidden border border-stone-200 shadow-2xl bg-white">
                <img src={state.imageHistory[0]} alt="Resultado final" className="w-full h-auto" />
            </div>
            {state.imageHistory.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur px-3 py-1 rounded-full text-[10px] text-white font-bold">
                    Historial: {state.imageHistory.length} versiones
                </div>
            )}
          </div>

          <div className="bg-stone-50 p-4 rounded-xl border border-stone-100 italic text-sm text-stone-800 font-medium relative">
            <p>"{state.concepts[state.selectedConceptIndex!]}"</p>
          </div>

          <div className="grid grid-cols-3 gap-3">
             <button 
                disabled={loading}
                onClick={() => selectAndGenerate(state.selectedConceptIndex!)} 
                className="flex flex-col items-center justify-center gap-1 py-3 bg-stone-100 text-stone-900 font-black rounded-xl text-xs hover:bg-stone-200 active:scale-95 transition-transform"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>
                Regenerar
            </button>
            <button 
                onClick={prevStep}
                className="flex flex-col items-center justify-center gap-1 py-3 bg-stone-100 text-stone-900 font-black rounded-xl text-xs hover:bg-stone-200 active:scale-95 transition-transform"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
                Conceptos
            </button>
            <button 
                onClick={() => handleDownload(state.imageHistory[0])} 
                className="flex flex-col items-center justify-center gap-1 py-3 bg-black text-white font-black rounded-xl text-xs active:scale-95 transition-transform"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                Descargar
            </button>
          </div>

          <div className="space-y-4 pt-4 border-t border-stone-100">
            <p className="text-sm font-black text-stone-900 uppercase tracking-wider">Ajustar esta imagen</p>
            <div className="flex flex-wrap gap-2">
              {["Más luz lateral", "Etiqueta más brillante", "Fondo más oscuro", "Aclarar colores"].map(s => (
                <button 
                    key={s} 
                    disabled={loading}
                    onClick={() => handleAdjustment(s)}
                    className="px-4 py-2 rounded-full border border-stone-300 text-xs text-stone-900 font-bold hover:border-black active:scale-95 transition-all bg-white shadow-sm"
                >
                    {s}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
                <input 
                    type="text" 
                    value={customAdjustment}
                    onChange={(e) => setCustomAdjustment(e.target.value)}
                    placeholder="Escribe otro ajuste..."
                    className="flex-1 px-4 py-3 border border-stone-300 rounded-lg text-sm bg-white text-black outline-none focus:border-black font-medium"
                />
                <button 
                    disabled={loading || !customAdjustment.trim()}
                    onClick={() => {
                        handleAdjustment(customAdjustment);
                        setCustomAdjustment('');
                    }}
                    className="bg-black text-white px-6 py-3 rounded-lg text-sm font-black active:scale-95 transition-all"
                >
                    Aplicar
                </button>
            </div>
          </div>

          {loading && (
            <div className="flex items-center justify-center gap-3 py-6 bg-stone-50 rounded-2xl animate-pulse border border-stone-100">
                <div className="w-5 h-5 border-3 border-stone-300 border-t-black rounded-full animate-spin" />
                <span className="text-sm font-black text-stone-800">Procesando ajuste creativo...</span>
            </div>
          )}
        </>
      )}
    </div>
  );

  return (
    <div className="max-w-xl mx-auto pb-12">
      {state.step === 1 && renderStep1()}
      {state.step === 2 && renderStep2()}
      {state.step === 3 && renderStep3()}
      {state.step === 4 && renderStep4()}
      {state.step === 5 && renderStep5()}
    </div>
  );
};

export default CreativeFunnel;
