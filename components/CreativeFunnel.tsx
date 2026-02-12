
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Wine, ImageType, FunnelState, AspectRatio, GalleryImage } from '../types';
import { generateVisualConcepts, generateFinalImage, reinterpretEditRequest } from '../services/geminiService';

interface CreativeFunnelProps {
  wines: Wine[];
  onFinish: () => void;
  onSaveToGallery: (img: GalleryImage) => void;
  initialData?: {
    wine: Wine;
    concept: string;
    isAdjustment?: boolean;
    imageUrl?: string;
  };
}

const CreativeFunnel: React.FC<CreativeFunnelProps> = ({ wines, onFinish, onSaveToGallery, initialData }) => {
  const [selectedWine, setSelectedWine] = useState<Wine>(initialData?.wine || wines[0]);
  const locationFileRef = useRef<HTMLInputElement>(null);
  
  const [state, setState] = useState<FunnelState>({
    type: null,
    step: initialData ? 6 : 1,
    selections: {},
    contextText: '',
    timeContext: '',
    locationImage: undefined,
    concepts: initialData ? [initialData.concept] : [],
    selectedConceptIndex: initialData ? 0 : null,
    editingConceptIndex: null,
    imageHistory: (initialData?.isAdjustment && initialData.imageUrl) ? [initialData.imageUrl] : [],
    isLoading: false,
    error: null
  });
  
  const [ratio, setRatio] = useState<AspectRatio>('1:1');
  const [customAdjustment, setCustomAdjustment] = useState('');
  const [editValue, setEditValue] = useState('');
  const [showMoreActions, setShowMoreActions] = useState(false);
  const [showMoreAtmosphere, setShowMoreAtmosphere] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);

  const isPremium = useMemo(() => {
    const text = (selectedWine.description + selectedWine.specialFeatures + selectedWine.name).toLowerCase();
    return /premium|exclusivo|reserva|limitada|lujo|alta gama|noble|sofisticado|añejo|crianza/.test(text);
  }, [selectedWine]);

  const isSocial = useMemo(() => {
    const text = (selectedWine.description + selectedWine.specialFeatures + selectedWine.targetAudience).toLowerCase();
    return /social|amigos|fiesta|diario|fresco|joven|compartir|picnic|terraza|informal/.test(text);
  }, [selectedWine]);

  const currentConceptText = useMemo(() => {
    if (state.selectedConceptIndex !== null && state.concepts[state.selectedConceptIndex]) {
      return state.concepts[state.selectedConceptIndex];
    }
    return state.concepts[0] || initialData?.concept || "Captura publicitaria profesional.";
  }, [state.selectedConceptIndex, state.concepts, initialData]);

  const seasonalSuggestions = useMemo(() => {
    const now = new Date();
    const month = now.getMonth();
    let suggestions: string[] = [];
    if (month === 11 || month <= 1) suggestions.push("Invierno");
    else if (month >= 2 && month <= 4) suggestions.push("Primavera");
    else if (month >= 5 && month <= 7) suggestions.push("Verano");
    else if (month >= 8 && month <= 10) suggestions.push("Otoño");
    if (month === 0) suggestions.push("San Valentín", "Escena acogedora");
    else if (month === 1) suggestions.push("San Valentín", "Luz de chimenea");
    else if (month >= 5 && month <= 7) suggestions.push("Atardecer en terraza", "Picnic");
    else if (month >= 8 && month <= 10) suggestions.push("Vendimia", "Luz dorada");
    return Array.from(new Set(suggestions)).slice(0, 4);
  }, []);

  useEffect(() => {
    if (initialData && !initialData.isAdjustment && state.step === 6 && state.imageHistory.length === 0 && !state.isLoading) {
      selectAndGenerate(0);
    }
  }, []);

  const setType = (type: ImageType) => {
    setState(prev => ({ ...prev, type, step: 2, selections: {} }));
    setShowMoreActions(false);
  };
  
  const handleSelection = (key: string, value: string) => {
    if (key === 'accion' && value === 'Más opciones') {
      setShowMoreActions(true);
      return;
    }
    if (key === 'atmosfera_btn' && value === 'Más opciones') {
      setShowMoreAtmosphere(true);
      return;
    }
    if (key === 'atmosfera') {
       setState(prev => ({ ...prev, selections: { ...prev.selections, [key]: value } }));
       return;
    }
    setState(prev => ({ ...prev, selections: { ...prev.selections, [key]: value } }));
  };

  const handleLocationImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setState(prev => ({ ...prev, locationImage: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };
  
  const startConceptGeneration = async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    setLoadingMessage("Generando propuestas creativas...");
    try {
      const concepts = await generateVisualConcepts(selectedWine, state);
      setState(prev => ({ 
        ...prev, 
        concepts: (Array.isArray(concepts) && concepts.length > 0) ? concepts : prev.concepts, 
        step: 5, 
        editingConceptIndex: null,
        isLoading: false
      }));
    } catch (e) {
      setState(prev => ({ ...prev, error: "No se pudieron generar conceptos.", isLoading: false }));
    } finally {
      setLoadingMessage(null);
    }
  };

  const shouldSkipAtmosphere = () => {
    if (state.type !== ImageType.BODEGON) return false;
    if (state.selections['limpieza'] === 'Muy minimal') return true;
    if (state.selections['fondo'] === 'Neutro') return true;
    return false;
  };

  const nextStep = () => {
    if (state.step === 3) {
      if (shouldSkipAtmosphere()) {
        startConceptGeneration();
      } else {
        setState(prev => ({ ...prev, step: 4 }));
      }
    } else {
      setState(prev => ({ ...prev, step: prev.step + 1 }));
    }
  };
  
  const prevStep = () => setState(prev => {
    let targetStep = prev.step - 1;
    if (prev.step === 5) {
      if (shouldSkipAtmosphere()) targetStep = 3;
      else targetStep = 4;
    }
    if (prev.step === 6) targetStep = 5;
    return { ...prev, error: null, step: Math.max(1, targetStep) };
  });

  const selectAndGenerate = async (index: number, adjustment?: string) => {
    if (state.isLoading) return;
    
    // IMAGE EDIT MODE check: current step 6 with history OR adjustment from gallery seeded it
    const isEditMode = state.step === 6 && state.imageHistory.length > 0;
    const baseImage = isEditMode ? state.imageHistory[0] : undefined;
    
    setState(prev => ({ ...prev, isLoading: true, error: null, selectedConceptIndex: index, step: 6 }));
    
    try {
      let finalAdjustment = adjustment;
      
      // REINTERPRETATION LAYER for EDIT MODE feedback
      if (isEditMode && adjustment) {
        setLoadingMessage("Interpretando instrucciones...");
        finalAdjustment = await reinterpretEditRequest(adjustment, currentConceptText);
      }
      
      setLoadingMessage(isEditMode ? "Aplicando cambios..." : "Generando imagen en alta resolución");
      
      const conceptToUse = state.concepts[index] || (index === 0 ? initialData?.concept : '') || '';
      const img = await generateFinalImage(selectedWine, String(conceptToUse), ratio, finalAdjustment, state.locationImage, baseImage);
      
      if (img) {
        const galleryItem: GalleryImage = {
          id: Date.now().toString(),
          url: img,
          concept: String(conceptToUse),
          wineName: selectedWine.name,
          timestamp: Date.now()
        };
        setState(prev => ({ 
          ...prev, 
          imageHistory: [img, ...prev.imageHistory],
          isLoading: false,
          error: null
        }));
        onSaveToGallery(galleryItem);
      } else {
        setState(prev => ({ ...prev, error: "La IA no devolvió ninguna imagen válida.", isLoading: false }));
      }
    } catch (e) {
      setState(prev => ({ ...prev, error: "No se pudieron aplicar los cambios. Inténtalo con una instrucción más sencilla.", isLoading: false }));
    } finally {
      setLoadingMessage(null);
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
    if (state.isLoading) return;
    const index = state.selectedConceptIndex !== null ? state.selectedConceptIndex : 0;
    selectAndGenerate(index, adj);
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

  const getAspectClass = (r: AspectRatio) => {
    switch (r) {
      case '1:1': return 'aspect-square';
      case '3:4': return 'aspect-[3/4]';
      case '4:3': return 'aspect-[4/3]';
      case '9:16': return 'aspect-[9/16]';
      case '16:9': return 'aspect-[16/9]';
      default: return 'aspect-square';
    }
  };

  const renderStep1 = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
      <div className="space-y-3">
        <label className="text-sm font-bold text-stone-800 uppercase tracking-wide">Producto Actual</label>
        <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-stone-100 shadow-sm">
          <img src={selectedWine.image} alt={selectedWine.name} className="w-16 h-16 object-contain bg-stone-50 rounded-lg p-1" />
          <div>
            <h4 className="font-bold text-black">{selectedWine.name}</h4>
            <p className="text-xs text-stone-400 line-clamp-1">{selectedWine.description}</p>
          </div>
        </div>
      </div>
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-black font-serif">Tipo de Escena</h2>
        <p className="text-stone-500 font-medium text-sm">Elige el tipo de escena que quieres crear</p>
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
        { label: "SUPERFICIE", key: "superficie", options: ["Madera", "Piedra", "Mármol", "Minimalista"] },
        { label: "Nivel de limpieza visual", key: "limpieza", options: ["Muy minimal", "Con elementos"] },
        { label: "¿Quieres añadir algún elemento en la escena?", key: "apoyo", options: ["Ninguno", "Copas", "Uvas", "Corchos"] },
        { label: "Fondo", key: "fondo", options: ["Neutro", "Con contexto"] }
      ],
      [ImageType.EN_USO]: [
        { label: "Tipo de presencia", key: "mano", options: ["Mano sola", "Persona parcial", "Persona completa"] },
        { 
          label: "Valor de plano", 
          key: "valor_plano", 
          options: (selections: any) => {
            if (selections['mano'] === "Mano sola") return ["Macro", "Primer plano", "Plano medio"];
            if (selections['mano'] === "Persona parcial") return ["Primer plano", "Plano medio", "Plano americano"];
            if (selections['mano'] === "Persona completa") return ["Plano medio", "Plano general"];
            return [];
          }
        },
        { 
          label: "Acción", 
          key: "accion", 
          options: showMoreActions 
            ? ["Sostener", "Servir", "Brindar", "Beber", "Descorchar", "Girar la copa", "Oler"] 
            : ["Sostener", "Servir", "Brindar", "Beber", "Más opciones"] 
        },
        { label: "¿Qué nivel de protagonismo humano quieres en la escena?", key: "protagonismo", options: ["Baja", "Moderada", "Alta"] }
      ],
      [ImageType.MOMENTO_SOCIAL]: [
        { label: "Personas", key: "personas", options: ["2 personas", "3 personas", "Grupo"] },
        { 
          label: "Situación", 
          key: "situacion", 
          options: (selections: any) => {
            const base = ["Celebración", "Encuentro informal", "Reunión social", "Afterwork", "Cena especial"];
            if (selections['personas'] === "2 personas") {
              return ["Íntima", ...base];
            }
            return base;
          }
        },
        { label: "Foco principal", key: "foco", options: ["El vino", "La escena"] }
      ]
    };

    const activeQuestions = questions[state.type!].filter(q => {
      const selections = state.selections;
      
      if (state.type === ImageType.BODEGON) {
        const superficie = selections['superficie'];
        const limpieza = selections['limpieza'];
        const apoyo = selections['apoyo'];

        if (q.key === 'superficie') return true;
        if (q.key === 'limpieza') return superficie === 'Minimalista';
        if (q.key === 'apoyo') {
          if (!superficie) return false;
          if (superficie === 'Minimalista') return limpieza === 'Con elementos';
          return true;
        }
        if (q.key === 'fondo') {
          if (!superficie) return false;
          if (superficie === 'Minimalista') {
            if (limpieza === 'Muy minimal') return true;
            return !!apoyo;
          }
          return !!apoyo;
        }
      }

      if (state.type === ImageType.EN_USO) {
        const mano = selections['mano'];
        if (q.key === 'mano') return true;
        if (!mano) return false;
        return true;
      }

      if (state.type === ImageType.MOMENTO_SOCIAL) {
        if (q.key === 'personas') return true;
        if (!selections['personas']) return false;
        return true;
      }

      return true;
    });

    const isOptionSuggested = (key: string, opt: string) => {
      if (state.type === ImageType.BODEGON && key === 'superficie') {
        if (isPremium && (opt === 'Piedra' || opt === 'Mármol')) return true;
        if (isSocial && opt === 'Madera') return true;
      }
      return false;
    };

    const getOptions = (q: any) => {
      if (typeof q.options === 'function') {
        return q.options(state.selections);
      }
      return q.options;
    };

    const getHeader = () => {
      if (state.type === ImageType.BODEGON) return "Dirección de Arte: Bodegón";
      if (state.type === ImageType.EN_USO) return "Dirección de Arte: En uso";
      if (state.type === ImageType.MOMENTO_SOCIAL) return "Dirección de Arte: Momento social";
      return `Dirección de Arte: ${state.type}`;
    };

    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
        <h2 className="text-2xl font-bold text-black font-serif">{getHeader()}</h2>
        <div className="space-y-6">
          {activeQuestions.map(q => (
            <div key={q.key} className="space-y-3">
              <label className="text-xs font-black text-stone-400 uppercase tracking-widest">{q.label}</label>
              <div className="grid grid-cols-2 gap-3">
                {getOptions(q).map((opt: string) => (
                  <button 
                    key={opt} 
                    onClick={() => handleSelection(q.key, opt)} 
                    className={`relative py-4 rounded-xl border-2 font-bold transition-all ${state.selections[q.key] === opt ? 'bg-black text-white border-black' : 'bg-white text-stone-900 border-stone-100 hover:border-stone-300'}`}
                  >
                    {opt}
                    {isOptionSuggested(q.key, opt) && (
                      <span className="absolute -top-2 -right-1 bg-stone-100 text-stone-500 text-[8px] px-1.5 py-0.5 rounded-full border border-stone-200 uppercase tracking-tighter">Sugerido</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <button 
          onClick={nextStep} 
          disabled={activeQuestions.some(q => !state.selections[q.key])}
          className={btnPrimary}
        >
          Continuar
        </button>
      </div>
    );
  };

  const renderStep3 = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
      <h2 className="text-2xl font-bold text-black font-serif">Formato final de la imagen</h2>
      <div className="space-y-6">
        <div className="space-y-3">
          <label className="text-xs font-black text-stone-400 uppercase tracking-widest">¿En qué formato quieres la imagen final?</label>
          <div className="grid grid-cols-5 gap-2">
            {['1:1', '3:4', '4:3', '9:16', '16:9'].map(r => (
              <button 
                key={r} 
                onClick={() => setRatio(r as AspectRatio)} 
                className={`py-3 rounded-lg border-2 font-black text-[10px] transition-all ${ratio === r ? 'bg-black text-white border-black' : 'bg-white text-stone-900 border-stone-100'}`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>
      <button onClick={nextStep} className={btnPrimary}>Continuar</button>
    </div>
  );

  const renderStep4 = () => {
    const coreAtmosphere = ["Luz natural", "Luz suave / difusa", "Contraluz", "Iluminación dramática", "Ambiente cálido", "Ambiente frío / neutro"];
    const extraAtmosphere = ["Golden hour", "Luz lateral marcada", "Iluminación nocturna", "Ambiente íntimo", "Estética editorial", "Luz técnica / de estudio"];
    
    const isAtmosferaSelected = (opt: string) => {
      return state.selections['atmosfera'] === opt;
    };

    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
        <h2 className="text-2xl font-bold text-black font-serif">Iluminación y atmósfera de la escena</h2>
        <div className="space-y-8">
          <div className="space-y-4">
            <label className="text-xs font-black text-stone-400 uppercase tracking-widest">¿Dónde ocurre?</label>
            <div className="grid grid-cols-2 gap-3">
              {["Exterior", "Bodega", "Restaurante", "Casa", "Viñedos"].map(opt => (
                <button key={opt} onClick={() => handleSelection('donde', opt)} className={`py-4 rounded-xl border-2 font-bold transition-all ${state.selections['donde'] === opt ? 'bg-black text-white border-black' : 'bg-white text-stone-900 border-stone-100'}`}>{opt}</button>
              ))}
            </div>
            <div className="mt-4">
              <label className="text-xs font-black text-stone-400 uppercase tracking-widest block mb-2">Referencia de lugar (Opcional)</label>
              <div className="flex flex-col gap-3">
                {state.locationImage && (
                  <div className="relative w-full h-32 rounded-xl overflow-hidden border border-stone-200">
                    <img src={state.locationImage} alt="Referencia" className="w-full h-full object-cover" />
                    <button onClick={() => setState(prev => ({ ...prev, locationImage: undefined }))} className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>
                  </div>
                )}
                <input type="file" accept="image/*" ref={locationFileRef} onChange={handleLocationImageChange} className="hidden" />
                <button type="button" onClick={() => locationFileRef.current?.click()} className="w-full py-4 border-2 border-dashed border-stone-200 rounded-xl text-stone-500 font-bold text-sm hover:border-black transition-all bg-white">
                  {state.locationImage ? "Cambiar foto de referencia" : "Subir foto de tu viñedo o bodega"}
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-stone-100">
            <label className="text-xs font-black text-stone-400 uppercase tracking-widest">¿Cuándo ocurre?</label>
            <div className="grid grid-cols-2 gap-3">
              {seasonalSuggestions.map(t => (
                <button 
                  key={t} 
                  onClick={() => setState(prev => ({ ...prev, timeContext: t }))} 
                  className={`py-4 rounded-xl border-2 font-bold transition-all ${state.timeContext === t ? 'bg-black text-white border-black' : 'bg-white text-stone-900 border-stone-100 hover:border-stone-300'}`}
                >
                  {t}
                </button>
              ))}
            </div>
            <input type="text" value={state.timeContext} onChange={(e) => setState(prev => ({ ...prev, timeContext: e.target.value }))} className="w-full px-4 py-3 rounded-xl border-2 border-stone-100 outline-none focus:border-black transition-all font-medium text-sm" placeholder="O describe el momento en tus palabras..." />
          </div>

          <div className="space-y-4 pt-4 border-t border-stone-100">
            <label className="text-xs font-black text-stone-400 uppercase tracking-widest">Iluminación y atmósfera de la escena</label>
            <div className="grid grid-cols-2 gap-3">
              {coreAtmosphere.map(opt => (
                <button 
                  key={opt} 
                  onClick={() => handleSelection('atmosfera', opt)} 
                  className={`py-4 rounded-xl border-2 font-bold transition-all ${isAtmosferaSelected(opt) ? 'bg-black text-white border-black' : 'bg-white text-stone-900 border-stone-100 hover:border-stone-300'}`}
                >
                  {opt}
                </button>
              ))}
              {!showMoreAtmosphere && (
                <button 
                  onClick={() => handleSelection('atmosfera_btn', 'Más opciones')} 
                  className="py-4 rounded-xl border-2 border-dashed border-stone-200 text-stone-500 font-bold text-sm hover:border-black transition-all bg-white"
                >
                  Más opciones
                </button>
              )}
            </div>
            {showMoreAtmosphere && (
              <div className="grid grid-cols-2 gap-3 mt-3 animate-in fade-in slide-in-from-top-2">
                {extraAtmosphere.map(opt => (
                  <button 
                    key={opt} 
                    onClick={() => handleSelection('atmosfera', opt)} 
                    className={`py-4 rounded-xl border-2 font-bold transition-all ${isAtmosferaSelected(opt) ? 'bg-black text-white border-black' : 'bg-white text-stone-900 border-stone-100 hover:border-stone-300'}`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3 pt-4 border-t border-stone-100">
            <label className="text-xs font-black text-stone-400 uppercase tracking-widest">¿Quieres añadir algún matiz adicional?</label>
            <textarea value={state.contextText} onChange={(e) => setState(prev => ({ ...prev, contextText: e.target.value }))} className="w-full px-5 py-4 rounded-2xl border-2 border-stone-100 bg-white text-black placeholder-stone-300 outline-none h-24 font-medium focus:border-stone-400 transition-all shadow-sm" placeholder="Describe la atmósfera o iluminación que imaginas para esta escena" />
          </div>
        </div>
        <button disabled={state.isLoading} onClick={startConceptGeneration} className={btnPrimary}>
          {state.isLoading && <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
          Crear propuestas
        </button>
      </div>
    );
  };

  const renderStep5 = () => (
    <div className="space-y-8 animate-in fade-in scale-95 duration-500">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-serif font-bold text-black">Propuestas Creativas</h2>
        <p className="text-stone-500 font-medium text-sm">Crea tres propuestas gráficas en menos de un minuto</p>
      </div>
      <div className="space-y-4">
        {state.concepts.map((concept, idx) => (
          <div key={idx} className={`bg-white border-2 p-6 rounded-3xl shadow-sm transition-all ${state.editingConceptIndex === idx ? 'border-black ring-2 ring-black/5' : 'border-stone-100 hover:border-black'}`}>
            {state.editingConceptIndex === idx ? (
              <div className="space-y-4">
                <textarea autoFocus value={editValue} onChange={(e) => setEditValue(e.target.value)} className="w-full px-4 py-3 border-2 border-stone-100 rounded-xl text-stone-900 bg-stone-50 outline-none h-32 font-medium" />
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
                  <button disabled={state.isLoading} onClick={() => selectAndGenerate(idx)} className="bg-black text-white px-8 py-3 rounded-xl font-bold active:scale-95 transition-all text-sm shadow-xl shadow-black/5">Elige una propuesta</button>
                </div>
              </div>
            )}
          </div>
        ))}
        <button disabled={state.isLoading} onClick={startConceptGeneration} className="w-full py-5 border-2 border-dashed border-stone-300 text-stone-500 rounded-3xl font-bold flex items-center justify-center gap-2 hover:border-black hover:text-black transition-all mt-4">Proponer nuevas propuestas</button>
      </div>
    </div>
  );

  const renderStep6 = () => {
    const latestImage = (state.imageHistory && state.imageHistory.length > 0) ? state.imageHistory[0] : null;
    if (state.isLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-20 space-y-8 animate-in fade-in duration-300">
          <div className="w-16 h-16 border-4 border-stone-100 border-t-black rounded-full animate-spin" />
          <div className="text-center space-y-2">
            <h3 className="text-2xl font-bold text-black font-serif">
              Procesando imagen…
            </h3>
            <p className="text-stone-400 font-medium animate-pulse italic">
              {loadingMessage || "Generando imagen en alta resolución"}
            </p>
          </div>
          {latestImage && (
             <div className={`opacity-20 blur-[2px] grayscale max-w-full mx-auto rounded-2xl overflow-hidden shadow-inner border border-stone-200 ${getAspectClass(ratio)}`}>
               <img src={latestImage} alt="Previo" className="w-full h-full object-cover" />
             </div>
          )}
        </div>
      );
    }
    if (state.error) {
      return (
        <div className="py-20 text-center space-y-6 animate-in fade-in duration-300">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
             <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12.01" y1="16" y2="16"/><path d="M12 8v4"/></svg>
          </div>
          <p className="text-red-600 font-bold px-8 leading-relaxed">{state.error}</p>
          <div className="flex flex-col gap-3 max-w-xs mx-auto">
            <button onClick={() => selectAndGenerate(state.selectedConceptIndex || 0)} className="bg-black text-white px-10 py-4 rounded-2xl font-bold active:scale-95 transition-all shadow-lg">Reintentar</button>
            <button onClick={prevStep} className="text-stone-400 font-bold text-sm hover:text-black transition-colors">Volver a las propuestas</button>
          </div>
        </div>
      );
    }
    if (!latestImage) {
      return (
        <div className="py-32 text-center space-y-6 animate-in fade-in">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-2 border-stone-200 border-t-stone-800 rounded-full animate-spin" />
            <p className="text-stone-500 italic font-medium">Finalizando revelado...</p>
          </div>
          <button onClick={prevStep} className="text-black font-bold underline underline-offset-4 text-sm mt-4">Volver a las propuestas</button>
        </div>
      );
    }
    return (
      <div className="space-y-8 animate-in fade-in duration-700 pb-20">
        <div className={`rounded-[2.5rem] overflow-hidden border border-stone-100 shadow-2xl bg-white relative group ${getAspectClass(ratio)}`}>
          <img src={latestImage} alt="Resultado Final" className="w-full h-full object-cover transition-opacity duration-500" />
        </div>
        <div className="bg-stone-50 p-6 rounded-3xl border border-stone-100 italic text-stone-700 font-medium text-center shadow-sm">
          "{String(currentConceptText)}"
        </div>
        <div className="grid grid-cols-3 gap-3">
          <button onClick={() => selectAndGenerate(state.selectedConceptIndex || 0)} className={btnSecondary} title="Generar otra versión de esta propuesta">
             <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>
             <span className="block mt-1 text-[10px] uppercase tracking-tighter">Regenerar</span>
          </button>
          <button onClick={prevStep} className={btnSecondary} title="Volver a las propuestas">
             <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
             <span className="block mt-1 text-[10px] uppercase tracking-tighter">Variantes</span>
          </button>
          <button onClick={() => handleDownload(latestImage)} className="py-4 rounded-xl bg-black text-white font-bold active:scale-95 transition-all text-center px-4 shadow-xl shadow-black/10" title="Descargar">
             <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
             <span className="block mt-1 text-[10px] uppercase tracking-tighter">Descargar</span>
          </button>
        </div>
        <div className="pt-6 border-t border-stone-100 space-y-4">
          <h4 className="text-sm font-black text-stone-900 uppercase tracking-widest text-center">Ajustes creativos</h4>
          <div className="flex flex-wrap justify-center gap-2">
            {["Luz lateral dramática", "Etiqueta iluminada", "Fondo oscuro mate", "Estilo vintage", "Contraste vibrante"].map(s => (
              <button key={s} disabled={state.isLoading} onClick={() => handleAdjustment(s)} className="px-4 py-2.5 rounded-full border border-stone-200 text-[11px] font-bold text-stone-800 hover:border-black transition-all bg-white shadow-sm active:scale-95 disabled:opacity-50">{s}</button>
            ))}
          </div>
          <div className="flex gap-2">
            <input type="text" value={customAdjustment} onChange={(e) => setCustomAdjustment(e.target.value)} placeholder="¿Qué te gustaría ajustar de esta imagen?" className="flex-1 px-5 py-3 border-2 border-stone-100 rounded-2xl text-sm outline-none focus:border-stone-300 font-medium transition-colors" />
            <button disabled={!customAdjustment.trim() || state.isLoading} onClick={() => { handleAdjustment(customAdjustment); setCustomAdjustment(''); }} className="bg-black text-white px-8 py-3 rounded-2xl text-sm font-bold active:scale-95 transition-all shadow-lg disabled:bg-stone-400">Aplicar</button>
          </div>
        </div>
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
      case 6: return renderStep6();
      default: return renderStep6();
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      {renderCurrentStep()}
    </div>
  );
};

export default CreativeFunnel;
