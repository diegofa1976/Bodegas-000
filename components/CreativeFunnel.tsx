
import React, { useState, useEffect, useMemo } from 'react';
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
    imageHistory: [],
    isLoading: false,
    error: null
  });
  
  const [ratio, setRatio] = useState<AspectRatio>('1:1');
  const [customAdjustment, setCustomAdjustment] = useState('');
  const [editValue, setEditValue] = useState('');

  // Top-level hooks strictly at the top level to avoid hook violations (Error #310)
  const conceptText = useMemo(() => {
    if (state.selectedConceptIndex !== null && state.concepts[state.selectedConceptIndex]) {
      return state.concepts[state.selectedConceptIndex];
    }
    return initialData?.concept || state.concepts[0] || "Captura publicitaria profesional.";
  }, [state.selectedConceptIndex, state.concepts, initialData]);

  // Auto-trigger generation if coming from gallery (not for adjustments)
  useEffect(() => {
    if (initialData && !initialData.isAdjustment && state.step === 5 && state.imageHistory.length === 0 && !state.isLoading) {
      selectAndGenerate(0);
    }
  }, []);

  const setType = (type: ImageType) => setState(prev => ({ ...prev, type, step: 2, selections: {} }));
  
  const handleSelection = (key: string, value: string) => 
    setState(prev => ({ ...prev, selections: { ...prev.selections, [key]: value } }));
  
  const nextStep = () => setState(prev => ({ ...prev, step: prev.step + 1 }));
  
  const prevStep = () => setState(prev => ({ 
    ...prev, 
    error: null,
    step: prev.step === 5 ? 4 : Math.max(1, prev.step - 1) 
  }));

  const startConceptGeneration = async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const concepts = await generateVisualConcepts(selectedWine, state);
      setState(prev => ({ 
        ...prev, 
        concepts: (Array.isArray(concepts) && concepts.length > 0) ? concepts : prev.concepts, 
        step: 4, 
        editingConceptIndex: null,
        isLoading: false
      }));
    } catch (e) {
      setState(prev => ({ ...prev, error: "No se pudieron generar conceptos.", isLoading: false }));
    }
  };

  const selectAndGenerate = async (index: number, adjustment?: string) => {
    if (state.isLoading) return;
    
    // Set loading and step atomically
    setState(prev => ({ ...prev, isLoading: true, error: null, selectedConceptIndex: index, step: 5 }));
    
    try {
      const conceptToUse = state.concepts[index] || (index === 0 ? initialData?.concept : '') || '';
      const img = await generateFinalImage(selectedWine, String(conceptToUse), ratio, adjustment);
      
      if (img) {
        setState(prev => ({ 
          ...prev, 
          imageHistory: [img, ...prev.imageHistory],
          isLoading: false,
          error: null
        }));

        const galleryItem: GalleryImage = {
          id: Date.now().toString(),
          url: img,
          concept: String(conceptToUse),
          wineName: selectedWine.name,
          timestamp: Date.now()
        };
        onSaveToGallery(galleryItem);
      } else {
        setState(prev => ({ ...prev, error: "La IA no devolvió ninguna imagen.", isLoading: false }));
      }
    } catch (e) {
      console.error("Funnel Generation Error:", e);
      setState(prev => ({ ...prev, error: "Error crítico durante la generación.", isLoading: false }));
    }
  };

  const startEdit = (idx: number, concept: string) => {
    setEditValue(concept);
    setState(prev => ({ ...prev, editingConceptIndex: idx }));
  };

  const handleSaveEdit = () => {
    if (state.editingConceptIndex !== null) {
      const newConcepts = [...state.concepts];
      newConcepts[state.editingConceptIndex] = editValue;
      setState(prev => ({ ...prev, concepts: newConcepts, editingConceptIndex: null }));
      setEditValue('');
    }
  };

  const handleAdjustment = (adj: string) => {
    if (state.selectedConceptIndex !== null) {
      selectAndGenerate(state.selectedConceptIndex, adj);
    }
  };

  const handleDownload = (imgUrl: string) => {
    const link = document.createElement('a');
    link.href = imgUrl;
    link.download = `kinglab_${selectedWine.name.toLowerCase().replace(/\s/g, '_')}_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const btnSecondary = "py-4 rounded-xl border border-stone-300 bg-white text-stone-900 font-bold hover:border-black active:bg-stone-50 transition-all text-center px-4";
  const btnPrimary = "w-full py-5 bg-black text-white rounded-2xl font-bold shadow-xl shadow-black/10 active:scale-95 transition-all text-lg flex items-center justify-center gap-3";

  const renderStep1 = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
      <div className="space-y-3">
        <label className="text-sm font-bold text-stone-800 uppercase tracking-wide">Seleccionar vino</label>
        <select 
          className="w-full px-4 py-4 rounded-xl border-2 border-stone-100 bg-white text-black outline-none font-bold text-lg focus:border-black transition-colors"
          value={selectedWine.id}
          onChange={(e) => setSelectedWine(wines.find(w => w.id === e.target.value)!)}
        >
          {wines.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
      </div>
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-black font-serif">¿Qué tipo de imagen quieres crear?</h2>
        <div className="grid gap-3">
          {Object.values(ImageType).map(t => (
            <button key={t} onClick={() => setType(t)} className="w-full py-6 rounded-2xl border-2 border-stone-100 bg-white text-stone-900 font-bold text-left px-8 hover:border-black transition-all shadow-sm active:bg-stone-50 flex justify-between items-center group">
              {t}
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="opacity-0 group-hover:opacity-100 transition-opacity"><path d="m9 18 6-6-6-6"/></svg>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => {
    const questions: Record<ImageType, any[]> = {
      [ImageType.BODEGON]: [
        { label: "Tipo de superficie", key: "superficie", options: ["Madera", "Piedra", "Mármol", "Minimalista"] },
        { label: "Nivel de limpieza visual", key: "limpieza", options: ["Muy minimal", "Con elementos"] },
        { label: "Apoyo", key: "apoyo", options: ["Ninguno", "Copas", "Uvas", "Corchos"] },
        { label: "Fondo", key: "fondo", options: ["Neutro", "Con contexto"] }
      ],
      [ImageType.EN_USO]: [
        { label: "Sujeción", key: "mano", options: ["Mano sola", "Persona parcial"] },
        { label: "Acción", key: "accion", options: ["Servir", "Sostener", "Brindar"] },
        { label: "Cercanía", key: "cercania", options: ["Primer plano", "Plano medio"] },
        { label: "Humano", key: "protagonismo", options: ["Bajo", "Moderado"] }
      ],
      [ImageType.MOMENTO_SOCIAL]: [
        { label: "Personas", key: "personas", options: ["2 personas", "3 personas", "Grupo"] },
        { label: "Situación", key: "situacion", options: ["Íntima", "Celebración", "Informal"] },
        { label: "Ruido visual", key: "ruido", options: ["Limpio", "Dinámico"] },
        { label: "Foco principal", key: "foco", options: ["El vino", "La escena"] }
      ]
    };
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
        <h2 className="text-2xl font-bold text-black font-serif">Detalles de {state.type}</h2>
        <div className="space-y-6">
          {questions[state.type!].map(q => (
            <div key={q.key} className="space-y-3">
              <label className="text-xs font-black text-stone-400 uppercase tracking-widest">{q.label}</label>
              <div className="grid grid-cols-2 gap-3">
                {q.options.map((opt: string) => (
                  <button key={opt} onClick={() => handleSelection(q.key, opt)} className={`py-4 rounded-xl border-2 font-bold transition-all ${state.selections[q.key] === opt ? 'bg-black text-white border-black' : 'bg-white text-stone-900 border-stone-100 hover:border-stone-300'}`}>
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <button onClick={nextStep} className={btnPrimary}>Continuar</button>
      </div>
    );
  };

  const renderStep3 = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
      <h2 className="text-2xl font-bold text-black font-serif">Atmósfera</h2>
      <div className="space-y-6">
        <div className="space-y-3">
          <label className="text-xs font-black text-stone-400 uppercase tracking-widest">Formato</label>
          <div className="grid grid-cols-5 gap-2">
            {['1:1', '3:4', '4:3', '9:16', '16:9'].map(r => (
              <button key={r} onClick={() => setRatio(r as AspectRatio)} className={`py-3 rounded-lg border-2 font-black text-[10px] ${ratio === r ? 'bg-black text-white border-black' : 'bg-white text-stone-900 border-stone-100'}`}>{r}</button>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <label className="text-xs font-black text-stone-400 uppercase tracking-widest">¿Dónde ocurre?</label>
          <div className="grid grid-cols-2 gap-3">
            {["Exterior", "Bodega", "Restaurante", "Casa"].map(opt => (
              <button key={opt} onClick={() => handleSelection('donde', opt)} className={`py-4 rounded-xl border-2 font-bold ${state.selections['donde'] === opt ? 'bg-black text-white border-black' : 'bg-white text-stone-900 border-stone-100'}`}>{opt}</button>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <label className="text-xs font-black text-stone-400 uppercase tracking-widest">Detalles adicionales</label>
          <textarea value={state.contextText} onChange={(e) => setState(prev => ({ ...prev, contextText: e.target.value }))} className="w-full px-5 py-4 rounded-2xl border-2 border-stone-100 bg-white text-black placeholder-stone-300 outline-none h-32 font-medium focus:border-stone-400 transition-all shadow-sm" placeholder="Ej: Luz de tarde filtrada..." />
        </div>
      </div>
      <button disabled={state.isLoading} onClick={startConceptGeneration} className={btnPrimary}>
        {state.isLoading && <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
        Crear propuestas
      </button>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-8 animate-in fade-in scale-95 duration-500">
      <h2 className="text-2xl font-serif font-bold text-black text-center">Propuestas Creativas</h2>
      <div className="space-y-4">
        {state.concepts.map((concept, idx) => (
          <div key={idx} className={`bg-white border-2 p-6 rounded-3xl shadow-sm transition-all ${state.editingConceptIndex === idx ? 'border-black ring-2 ring-black/5' : 'border-stone-100 hover:border-black'}`}>
            {state.editingConceptIndex === idx ? (
              <div className="space-y-4">
                <textarea 
                  autoFocus 
                  value={editValue} 
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-stone-100 rounded-xl text-stone-900 bg-stone-50 outline-none h-32 font-medium" 
                />
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setState(prev => ({ ...prev, editingConceptIndex: null }))} className="px-5 py-2 text-sm font-bold text-stone-500">Cancelar</button>
                  <button onClick={handleSaveEdit} className="bg-black text-white px-6 py-2 rounded-xl text-sm font-bold shadow-lg">Guardar</button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-stone-900 font-medium italic text-lg leading-relaxed">"{concept}"</p>
                <div className="flex justify-between items-center pt-2">
                  <button onClick={() => startEdit(idx, concept)} className="text-stone-400 hover:text-black font-bold text-xs uppercase tracking-widest transition-colors flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                    Editar
                  </button>
                  <button disabled={state.isLoading} onClick={() => selectAndGenerate(idx)} className="bg-black text-white px-8 py-3 rounded-xl font-bold active:scale-95 transition-all text-sm shadow-xl shadow-black/5">Elegir concepto</button>
                </div>
              </div>
            )}
          </div>
        ))}
        <button disabled={state.isLoading} onClick={startConceptGeneration} className="w-full py-5 border-2 border-dashed border-stone-300 text-stone-500 rounded-3xl font-bold flex items-center justify-center gap-2 hover:border-black hover:text-black transition-all mt-4">Proponer otros conceptos</button>
      </div>
    </div>
  );

  const renderStep5 = () => {
    // latestImage extracted from state, ensuring no hooks inside this conditional render branch
    const latestImage = state.imageHistory && state.imageHistory.length > 0 ? state.imageHistory[0] : null;

    return (
      <div className="space-y-8 animate-in zoom-in-95 duration-500 min-h-[500px]">
        {state.isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-8">
            <div className="w-16 h-16 border-4 border-stone-100 border-t-black rounded-full animate-spin" />
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-bold text-black font-serif">Procesando imagen...</h3>
              <p className="text-stone-400 font-medium animate-pulse italic">Generando fotografía de alta resolución.</p>
            </div>
            {latestImage && (
               <div className="opacity-20 blur-[1px] grayscale max-w-[200px] mx-auto rounded-2xl overflow-hidden shadow-inner border border-stone-200">
                 <img src={latestImage} alt="Previo" className="w-full" />
               </div>
            )}
          </div>
        ) : state.error ? (
          <div className="py-20 text-center space-y-6">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
               <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12.01" y1="16" y2="16"/><path d="M12 8v4"/></svg>
            </div>
            <p className="text-red-600 font-bold px-8">{state.error}</p>
            {latestImage && (
               <div className="max-w-[150px] mx-auto opacity-50 mb-4">
                 <img src={latestImage} alt="Last valid" className="rounded-xl border" />
               </div>
            )}
            <button onClick={() => selectAndGenerate(state.selectedConceptIndex || 0)} className="bg-black text-white px-10 py-4 rounded-2xl font-bold active:scale-95 transition-all shadow-lg">Reintentar</button>
          </div>
        ) : latestImage ? (
          <div className="space-y-8 animate-in fade-in duration-700">
            <div className="rounded-[2.5rem] overflow-hidden border border-stone-100 shadow-2xl bg-white aspect-square relative group">
              <img src={latestImage} alt="Resultado Final" className="w-full h-full object-cover" />
            </div>
            <div className="bg-stone-50 p-6 rounded-3xl border border-stone-100 italic text-stone-700 font-medium text-center shadow-sm">
              "{String(conceptText)}"
            </div>
            <div className="grid grid-cols-3 gap-3">
              <button onClick={() => selectAndGenerate(state.selectedConceptIndex || 0)} className={btnSecondary} title="Regenerar">
                 <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>
                 <span className="block mt-1 text-[10px] uppercase tracking-tighter">Regenerar</span>
              </button>
              <button onClick={prevStep} className={btnSecondary} title="Volver a conceptos">
                 <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
                 <span className="block mt-1 text-[10px] uppercase tracking-tighter">Variantes</span>
              </button>
              <button onClick={() => handleDownload(latestImage)} className="py-4 rounded-xl bg-black text-white font-bold active:scale-95 transition-all text-center px-4 shadow-xl shadow-black/10" title="Descargar">
                 <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                 <span className="block mt-1 text-[10px] uppercase tracking-tighter">Descargar</span>
              </button>
            </div>
            <div className="pt-6 border-t border-stone-100 space-y-4">
              <h4 className="text-sm font-black text-stone-900 uppercase tracking-widest text-center">Post-Producción Creativa</h4>
              <div className="flex flex-wrap justify-center gap-2">
                {["Luz lateral dramática", "Etiqueta iluminada", "Fondo oscuro mate", "Estilo vintage", "Contraste vibrante"].map(s => (
                  <button key={s} onClick={() => handleAdjustment(s)} className="px-4 py-2.5 rounded-full border border-stone-200 text-[11px] font-bold text-stone-800 hover:border-black transition-all bg-white shadow-sm active:scale-95">{s}</button>
                ))}
              </div>
              <div className="flex gap-2">
                <input type="text" value={customAdjustment} onChange={(e) => setCustomAdjustment(e.target.value)} placeholder="Ej: Añade una copa de cristal tallado..." className="flex-1 px-5 py-3 border-2 border-stone-100 rounded-2xl text-sm outline-none focus:border-stone-300 font-medium transition-colors" />
                <button disabled={!customAdjustment.trim() || state.isLoading} onClick={() => { handleAdjustment(customAdjustment); setCustomAdjustment(''); }} className="bg-black text-white px-8 py-3 rounded-2xl text-sm font-bold active:scale-95 transition-all shadow-lg">Aplicar</button>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-32 text-center space-y-4 animate-in fade-in">
            <p className="text-stone-400 italic font-medium">Preparando revelado fotográfico...</p>
            <button onClick={prevStep} className="text-black font-bold underline underline-offset-4 text-sm">Volver a propuestas</button>
          </div>
        )}
      </div>
    );
  };

  const renderCurrentStep = () => {
    switch (state.step) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      case 5: return renderStep5();
      default: return renderStep5();
    }
  };

  return (
    <div className="max-w-xl mx-auto pb-20">
      {renderCurrentStep()}
    </div>
  );
};

export default CreativeFunnel;
