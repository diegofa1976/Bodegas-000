
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Wine, ImageType, FunnelState, AspectRatio, GalleryImage, PaletteIntensity } from '../types';
import { PAIRING_OPTIONS } from '../constants';
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

const GENERAL_TIME_CATEGORIES = {
  "Estaciones": ["Primavera", "Verano", "Otoño", "Invierno"]
};

const CreativeFunnel: React.FC<CreativeFunnelProps> = ({ wines, onFinish, onSaveToGallery, initialData }) => {
  const [selectedWine, setSelectedWine] = useState<Wine>(() => {
    if (initialData?.wine) return initialData.wine;
    if (wines && wines.length > 0) return wines[0];
    // Fallback to avoid crash, though App.tsx should prevent this
    return { id: 'temp', name: 'Vino', description: '', image: '', targetAudience: '', priceLevel: '', specialFeatures: '' };
  });
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
    paletteIntensity: 'Natural',
    isLoading: false,
    error: null
  });
  
  const [ratio, setRatio] = useState<AspectRatio>('1:1');
  const [customAdjustment, setCustomAdjustment] = useState('');
  const [editValue, setEditValue] = useState('');
  const [showMoreActions, setShowMoreActions] = useState(false);
  const [showMoreAtmosphere, setShowMoreAtmosphere] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  // Clear validation message after 2 seconds
  useEffect(() => {
    if (validationMessage) {
      const timer = setTimeout(() => setValidationMessage(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [validationMessage]);

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
    const day = now.getDate();
    let suggestions: string[] = [];
    
    // Estación actual
    if (month === 11 || month <= 1) suggestions.push("Invierno");
    else if (month >= 2 && month <= 4) suggestions.push("Primavera");
    else if (month >= 5 && month <= 7) suggestions.push("Verano");
    else if (month >= 8 && month <= 10) suggestions.push("Otoño");
    
    // Navidad: Dec 1 to Jan 6
    if (month === 11 || (month === 0 && day <= 6)) {
      suggestions.push("Navidad");
    }
    
    // San Valentín: Feb 1 to Feb 14
    if (month === 1 && day <= 14) {
      suggestions.push("San Valentín");
    }
    
    // Carnaval: Feb 1 to March 5
    if (month === 1 || (month === 2 && day <= 5)) {
      suggestions.push("Carnaval");
    }
    
    // Semana de esquí: Jan 15 to March 15
    if ((month === 0 && day >= 15) || month === 1 || (month === 2 && day <= 15)) {
      suggestions.push("Semana de esquí");
    }
    
    // Semana Santa: March 15 to April 15
    if ((month === 2 && day >= 15) || (month === 3 && day <= 15)) {
      suggestions.push("Semana Santa");
    }
    
    if (month >= 5 && month <= 7) suggestions.push("Atardecer en terraza");
    if (month >= 8 && month <= 10) suggestions.push("Vendimia");
    
    // Ensure we have at least 2-3 suggestions
    if (suggestions.length < 2) {
      suggestions.push("Atardecer dorado", "Celebración íntima");
    }
    
    return Array.from(new Set(suggestions)).slice(0, 3);
  }, []);

  useEffect(() => {
    if (initialData && !initialData.isAdjustment && state.step === 6 && state.imageHistory.length === 0 && !state.isLoading) {
      selectAndGenerate(0);
    }
  }, []);

  const setType = (type: ImageType) => {
    setValidationMessage(null);
    setState(prev => ({ ...prev, type }));
    setShowMoreActions(false);
  };
  
  const handleSelection = (key: string, value: any) => {
    setValidationMessage(null);
    if (key === 'accion' && value === 'Más opciones') {
      setShowMoreActions(true);
      return;
    }
    if (key === 'atmosfera_btn' && value === 'Más opciones') {
      setShowMoreAtmosphere(true);
      return;
    }
    
    if (key === 'maridaje_item') {
      const currentItems = state.selections['maridaje_items'] || [];
      const nextItems = currentItems.includes(value)
        ? currentItems.filter((i: string) => i !== value)
        : [...currentItems, value];
      
      setState(prev => ({
        ...prev,
        selections: {
          ...prev.selections,
          maridaje_items: nextItems
        }
      }));
      return;
    }

    setState(prev => ({
      ...prev,
      selections: {
        ...prev.selections,
        [key]: value
      }
    }));
  };

  const handleTimeContextChange = (value: string) => {
    setValidationMessage(null);
    setState(prev => ({ ...prev, timeContext: value }));
  };

  const handleRatioChange = (r: AspectRatio) => {
    setValidationMessage(null);
    setRatio(r);
  };

  const handleContextTextChange = (value: string) => {
    setValidationMessage(null);
    setState(prev => ({ ...prev, contextText: value }));
  };

  const handleIntensityChange = (intensity: PaletteIntensity) => {
    setValidationMessage(null);
    setState(prev => ({ ...prev, paletteIntensity: intensity }));
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
    if (!validateStep()) return;
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    setLoadingMessage("Estamos generando tus propuestas creativas...");
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
    if (state.type === ImageType.PAISAJE_TERROIR) return true;
    if (state.type !== ImageType.BODEGON) return false;
    if (state.selections['limpieza'] === 'Muy minimal') return true;
    if (state.selections['fondo'] === 'Neutro') return true;
    return false;
  };

  const validateStep = () => {
    if (state.step === 1) {
      if (!state.type) {
        setValidationMessage("¡Casi! Elige el tipo de escena para que podamos crear algo especial para ti");
        return false;
      }
    }

    if (state.step === 2) {
      const selections = state.selections;
      const hasSavedPairings = selectedWine.suggestedPairings && selectedWine.suggestedPairings.length > 0;

      if (state.type === ImageType.PAISAJE_TERROIR) {
        if (!selections['entorno']) {
          setValidationMessage("¿Dónde ocurre la magia? Elige un entorno para continuar");
          return false;
        }
        if (!state.timeContext) {
          setValidationMessage("¿En qué momento quieres situar tu vino? Elige una estación para continuar");
          return false;
        }
        if (!selections['iluminacion_paisaje']) {
          setValidationMessage("Elige la iluminación ideal para capturar la esencia del paisaje");
          return false;
        }
        if (!selections['foco_paisaje']) {
          setValidationMessage("Dinos qué quieres destacar en esta toma natural");
          return false;
        }
      } else if (state.type === ImageType.EN_USO) {
        if (!selections['mano']) {
          setValidationMessage("Cuéntanos quién va a disfrutar el vino en esta escena");
          return false;
        }
        if (selections['mano'] !== 'Mano sola' && !selections['rango_edad']) {
          setValidationMessage("Dinos el rango de edad para que la escena sea perfecta");
          return false;
        }
        if (!selections['valor_plano']) {
          setValidationMessage("Elige el encuadre ideal para tu composición");
          return false;
        }
        if (!selections['accion']) {
          setValidationMessage("¿Qué está pasando en la escena? Elige una acción");
          return false;
        }
        if (!selections['protagonismo']) {
          setValidationMessage("Dinos cuánto protagonismo quieres que tenga la persona");
          return false;
        }
        if (!selections['maridaje_toggle']) {
          setValidationMessage("¿Acompañamos el vino con algo de comer? Elige una opción");
          return false;
        }
        if (selections['maridaje_toggle'] === 'Con maridaje') {
          if (!selections['maridaje_cat']) {
            setValidationMessage("Elige una categoría de maridaje");
            return false;
          }
          if (!selections['maridaje_sub']) {
            setValidationMessage("Elige el tipo de maridaje");
            return false;
          }
          if (!(selections['maridaje_items'] && selections['maridaje_items'].length > 0)) {
            setValidationMessage("Elige al menos un plato específico para el maridaje");
            return false;
          }
        }
      } else if (state.type === ImageType.MOMENTO_SOCIAL) {
        if (!selections['personas']) {
          setValidationMessage("Cuéntanos quién va a disfrutar el vino en esta escena");
          return false;
        }
        if (!selections['rango_edad']) {
          setValidationMessage("Dinos el rango de edad para que la escena sea perfecta");
          return false;
        }
        if (!selections['situacion']) {
          setValidationMessage("Define el ambiente de este momento social");
          return false;
        }
        if (!selections['foco']) {
          setValidationMessage("Dinos qué quieres que sea lo más importante en la imagen");
          return false;
        }
        if (!selections['maridaje_toggle']) {
          setValidationMessage("¿Acompañamos el vino con algo de comer? Elige una opción");
          return false;
        }
        if (selections['maridaje_toggle'] === 'Con maridaje') {
          if (!selections['maridaje_cat']) {
            setValidationMessage("Elige una categoría de maridaje");
            return false;
          }
          if (!selections['maridaje_sub']) {
            setValidationMessage("Elige el tipo de maridaje");
            return false;
          }
          if (!(selections['maridaje_items'] && selections['maridaje_items'].length > 0)) {
            setValidationMessage("Elige al menos un plato específico para el maridaje");
            return false;
          }
        }
      } else if (state.type === ImageType.BODEGON) {
        if (!selections['superficie']) {
          setValidationMessage("Elige una superficie elegante para presentar tu vino");
          return false;
        }
        if (selections['superficie'] === 'Minimalista' && !selections['limpieza']) {
          setValidationMessage("Dinos qué nivel de minimalismo prefieres para el bodegón");
          return false;
        }
        
        const isMinimal = selections['superficie'] === 'Minimalista' && selections['limpieza'] === 'Muy minimal';
        
        if (!isMinimal) {
          if (!selections['apoyo']) {
            setValidationMessage("Elige si quieres algún elemento de apoyo en la composición");
            return false;
          }
        }
        
        if (!selections['fondo']) {
          setValidationMessage("Dinos qué fondo prefieres para resaltar la botella");
          return false;
        }
      }
    }

    if (state.step === 3) {
      if (!ratio) {
        setValidationMessage("Solo falta elegir el formato y estaremos listos para crear tu imagen");
        return false;
      }
    }

    if (state.step === 4) {
      if (!state.selections['donde']) {
        setValidationMessage("¿Dónde ocurre la magia? Elige un entorno para continuar");
        return false;
      }
      if (!state.timeContext) {
        setValidationMessage("¿En qué momento quieres situar tu vino? Elige una estación para continuar");
        return false;
      }
      if (!state.selections['atmosfera']) {
        setValidationMessage("Elige una atmósfera para darle el toque final a la escena");
        return false;
      }
    }

    return true;
  };

  const nextStep = () => {
    if (!validateStep()) return;

    if (state.step === 1) {
      setState(prev => ({ ...prev, step: 2, selections: {} }));
    } else if (state.step === 3) {
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
      
      if (!selectedWine || !selectedWine.name) {
        throw new Error("No hay un vino seleccionado válido.");
      }

      // REINTERPRETATION LAYER for EDIT MODE feedback
      if (isEditMode && adjustment) {
        setLoadingMessage("Interpretando instrucciones...");
        finalAdjustment = await reinterpretEditRequest(adjustment, currentConceptText);
      }
      
      setLoadingMessage(isEditMode ? "Aplicando cambios..." : "Generando imagen en alta resolución");
      
      const conceptToUse = state.concepts[index] || (index === 0 ? initialData?.concept : '') || '';
      
      if (!conceptToUse && !isEditMode) {
        throw new Error("No se ha definido un concepto visual.");
      }

      const img = await generateFinalImage(selectedWine, String(conceptToUse), ratio, finalAdjustment, state.locationImage, baseImage);
      
      if (img) {
        const galleryItem: GalleryImage = {
          id: Date.now().toString(),
          url: img,
          concept: String(conceptToUse),
          wineName: selectedWine.name,
          wineId: selectedWine.id,
          sceneType: state.type || 'Imagen',
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

  const handleDownload = async (imgUrl: string) => {
    const wineName = selectedWine.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    const sceneType = (state.type || 'imagen').toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    const timestamp = Date.now();
    const fileName = `${wineName}-${sceneType}-${timestamp}.png`;

    try {
      // If it's already a base64 string, we can use it directly
      if (imgUrl.startsWith('data:')) {
        const link = document.createElement('a');
        link.href = imgUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }

      // If it's a URL (e.g. from Firebase Storage), fetch as blob to force filename
      const response = await fetch(imgUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Error downloading image:', error);
      // Fallback
      const link = document.createElement('a');
      link.href = imgUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const btnSecondary = "py-4 rounded-xl border border-stone-300 bg-white text-stone-900 font-bold hover:border-black active:bg-stone-50 transition-all text-center px-4";
  const btnPrimary = "w-full py-5 bg-black text-white rounded-2xl font-bold shadow-xl shadow-black/10 active:scale-95 transition-all text-lg flex items-center justify-center gap-3";

  const getAspectClass = (r: AspectRatio) => {
    switch (r) {
      case '1:1': return 'aspect-square';
      case '9:16': return 'aspect-[9/16]';
      case '16:9': return 'aspect-[16/9]';
      case '4:5': return 'aspect-[4/5]';
      case '4:3 / A4': return 'aspect-[4/3]';
      default: return 'aspect-square';
    }
  };

  const SCENE_DESCRIPTIONS: Record<string, string> = {
    [ImageType.BODEGON]: "El producto como protagonista absoluto, sin personas",
    [ImageType.EN_USO]: "Una persona sirve o disfruta el vino",
    [ImageType.MOMENTO_SOCIAL]: "Grupo de personas celebrando o compartiendo",
    [ImageType.PAISAJE_TERROIR]: "El vino integrado en el viñedo, la bodega o el entorno natural de origen"
  };

  const renderStep1 = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
      <div className="space-y-4">
        <label className="text-xs font-black text-stone-400 uppercase tracking-widest">
          {wines.length > 1 && !initialData ? 'Selecciona el producto para esta sesión' : 'Producto Seleccionado'}
        </label>
        
        {wines.length > 1 && !initialData ? (
          <div className="grid grid-cols-1 gap-3 max-h-[320px] overflow-y-auto pr-2 custom-scrollbar">
            {wines.map(w => (
              <button 
                key={w.id} 
                onClick={() => setSelectedWine(w)}
                className={`flex items-center gap-4 p-5 rounded-[2rem] border-2 transition-all text-left group relative ${selectedWine.id === w.id ? 'border-black bg-stone-50 shadow-md' : 'border-stone-100 bg-white hover:border-stone-300'}`}
              >
                <div className="relative w-16 h-16 bg-stone-50 rounded-2xl p-1 flex-shrink-0 overflow-hidden border border-stone-100">
                  <img src={w.image} alt={w.name} className="w-full h-full object-contain" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-black truncate text-lg">{w.name}</h4>
                  <p className="text-xs text-stone-400 truncate font-medium">
                    {w.wineType} {w.denomination ? `· ${w.denomination}` : ''}
                  </p>
                  <div className="flex gap-1.5 mt-2">
                    {w.extractedPalette?.slice(0, 5).map((c, i) => (
                      <div key={i} className="w-3.5 h-3.5 rounded-full border border-stone-200 shadow-sm" style={{ backgroundColor: c }} />
                    ))}
                  </div>
                </div>
                {selectedWine.id === w.id && (
                  <div className="bg-black text-white p-1.5 rounded-full shadow-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                  </div>
                )}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-5 bg-white p-6 rounded-[2.5rem] border-2 border-stone-100 shadow-sm">
            <div className="w-20 h-20 bg-stone-50 rounded-2xl p-1 flex-shrink-0 border border-stone-100">
              <img src={selectedWine.image} alt={selectedWine.name} className="w-full h-full object-contain" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-black text-xl">{selectedWine.name}</h4>
              <p className="text-sm text-stone-400 font-medium">{selectedWine.wineType} {selectedWine.denomination ? `· ${selectedWine.denomination}` : ''}</p>
              <p className="text-xs text-stone-400 line-clamp-1 mt-1 italic">"{selectedWine.description}"</p>
            </div>
          </div>
        )}
      </div>
      <div className="space-y-5 pt-6 border-t border-stone-100">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-black font-serif">Tipo de Escena</h2>
          <p className="text-stone-500 font-medium text-sm">Define el propósito visual de esta sesión</p>
        </div>
        <div className="grid gap-3">
          {Object.values(ImageType).map(t => (
            <button 
              key={t} 
              onClick={() => setType(t)} 
              className={`w-full py-6 rounded-3xl border-2 font-bold text-left px-8 transition-all shadow-sm flex justify-between items-center group ${state.type === t ? 'bg-black text-white border-black shadow-xl shadow-black/10' : 'bg-white text-stone-900 border-stone-100 hover:border-black'}`}
            >
              <div className="flex flex-col gap-1">
                <span className="text-lg">{t}</span>
                <span className={`text-xs font-medium ${state.type === t ? 'text-stone-400' : 'text-stone-400'}`}>{SCENE_DESCRIPTIONS[t]}</span>
              </div>
              <div className={`p-2 rounded-full transition-all ${state.type === t ? 'bg-white/20' : 'bg-stone-50 group-hover:bg-black group-hover:text-white'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
              </div>
            </button>
          ))}
        </div>
      </div>
      <button onClick={nextStep} className={btnPrimary}>Continuar</button>
    </div>
  );

  const PAISAJE_TIME_CATEGORIES = {
    "Estaciones": ["Primavera", "Verano", "Otoño", "Invierno"]
  };

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
        { label: "Rango de edad", key: "rango_edad", options: ["Jóvenes (20-35)", "Adultos (35-50)", "Senior (50+)", "Mixto"] },
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
        { label: "¿Qué nivel de protagonismo humano quieres en la escena?", key: "protagonismo", options: ["Baja", "Moderada", "Alta"] },
        { label: "Maridaje", key: "maridaje_toggle", options: ["Con maridaje", "Sin maridaje"] },
        { 
          label: "Categoría de Maridaje", 
          key: "maridaje_cat", 
          options: () => Object.keys(PAIRING_OPTIONS[selectedWine.wineType || 'Tinto'] || {}) 
        },
        { 
          label: "Tipo de Maridaje", 
          key: "maridaje_sub", 
          options: (selections: any) => Object.keys(PAIRING_OPTIONS[selectedWine.wineType || 'Tinto']?.[selections['maridaje_cat']] || {})
        },
        { 
          label: "Plato específico", 
          key: "maridaje_item", 
          options: (selections: any) => PAIRING_OPTIONS[selectedWine.wineType || 'Tinto']?.[selections['maridaje_cat']]?.[selections['maridaje_sub']] || []
        }
      ],
      [ImageType.MOMENTO_SOCIAL]: [
        { label: "Número de personas", key: "personas", options: ["Pareja", "Grupo pequeño (3-4 personas)", "Grupo grande"] },
        { label: "Rango de edad", key: "rango_edad", options: ["Jóvenes (20-35)", "Adultos (35-50)", "Senior (50+)", "Mixto"] },
        { 
          label: "Situación / Estado de ánimo", 
          key: "situacion", 
          options: ["Íntima y sofisticada", "Animada e informal", "Elegante y formal", "Relajada y tranquila"]
        },
        { label: "Foco principal", key: "foco", options: ["El vino", "La escena"] },
        { label: "Maridaje", key: "maridaje_toggle", options: ["Con maridaje", "Sin maridaje"] },
        { 
          label: "Categoría de Maridaje", 
          key: "maridaje_cat", 
          options: () => Object.keys(PAIRING_OPTIONS[selectedWine.wineType || 'Tinto'] || {}) 
        },
        { 
          label: "Tipo de Maridaje", 
          key: "maridaje_sub", 
          options: (selections: any) => Object.keys(PAIRING_OPTIONS[selectedWine.wineType || 'Tinto']?.[selections['maridaje_cat']] || {})
        },
        { 
          label: "Plato específico", 
          key: "maridaje_item", 
          options: (selections: any) => PAIRING_OPTIONS[selectedWine.wineType || 'Tinto']?.[selections['maridaje_cat']]?.[selections['maridaje_sub']] || []
        }
      ],
      [ImageType.PAISAJE_TERROIR]: [
        { label: "TIPO DE ENTORNO", key: "entorno", options: ["Viñedo", "Bodega", "Paisaje natural", "Zona vinícola"] },
        { label: "¿CUÁNDO OCURRE?", key: "timeContext", type: "date-selector" },
        { label: "MOMENTO DEL DÍA", key: "iluminacion_paisaje", options: ["Amanecer", "Mañana", "Mediodía", "Atardecer", "Noche"] },
        { label: "FOCO PRINCIPAL", key: "foco_paisaje", options: ["Botella protagonista", "Paisaje protagonista", "Equilibrado"] },
        { label: "IMAGEN DE REFERENCIA", key: "locationImage", type: "image-upload" }
      ]
    };

    const activeQuestions = questions[state.type!].filter(q => {
      const selections = state.selections;
      
      if (state.type === ImageType.PAISAJE_TERROIR) return true;

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
        if (q.key === 'rango_edad' && mano === 'Mano sola') return false;
        if (q.key === 'maridaje_toggle') return !!selections['protagonismo'];
        
        if (q.key === 'maridaje_cat') return selections['maridaje_toggle'] === 'Con maridaje';
        if (q.key === 'maridaje_sub') return !!selections['maridaje_cat'];
        if (q.key === 'maridaje_item') return !!selections['maridaje_sub'];
        return true;
      }

      if (state.type === ImageType.MOMENTO_SOCIAL) {
        if (q.key === 'personas') return true;
        if (!selections['personas']) return false;
        if (q.key === 'maridaje_toggle') return !!selections['foco'];
        
        if (q.key === 'maridaje_cat') return selections['maridaje_toggle'] === 'Con maridaje';
        if (q.key === 'maridaje_sub') return !!selections['maridaje_cat'];
        if (q.key === 'maridaje_item') return !!selections['maridaje_sub'];
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
      if (state.type === ImageType.EN_USO) return "¿Quién está en la escena?";
      if (state.type === ImageType.MOMENTO_SOCIAL) return "¿Quién está en la escena?";
      if (state.type === ImageType.PAISAJE_TERROIR) return "Dirección de Arte: Paisaje & Terroir";
      return `Dirección de Arte: ${state.type}`;
    };

    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
        <h2 className="text-2xl font-bold text-black font-serif">{getHeader()}</h2>
        <div className="space-y-6">
          {activeQuestions.map(q => (
            <div key={q.key} className="space-y-3">
              <label className="text-xs font-black text-stone-400 uppercase tracking-widest">{q.label}</label>
              
              {q.type === 'date-selector' ? (
                <div className="space-y-4">
                  {state.type === ImageType.PAISAJE_TERROIR ? (
                    <div className="space-y-6">
                      {Object.entries(PAISAJE_TIME_CATEGORIES).map(([category, options]) => (
                        <div key={category} className="space-y-3">
                          <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{category}</label>
                          <div className="grid grid-cols-2 gap-2">
                            {options.map(t => (
                              <button 
                                key={t} 
                                onClick={() => handleTimeContextChange(t)} 
                                className={`py-3 rounded-xl border-2 font-bold text-sm transition-all ${state.timeContext === t ? 'bg-black text-white border-black' : 'bg-white text-stone-900 border-stone-100 hover:border-stone-300'}`}
                              >
                                {t}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                      <div className="space-y-3 pt-2">
                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">¿Hay algo especial en este momento?</label>
                        <input 
                          type="text" 
                          value={state.timeContext} 
                          onChange={(e) => handleTimeContextChange(e.target.value)} 
                          className="w-full px-4 py-3 rounded-xl border-2 border-stone-100 outline-none focus:border-black transition-all font-medium text-sm" 
                          placeholder="Ej: vendimia, primeras lluvias, amanecer con niebla..." 
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {Object.entries(GENERAL_TIME_CATEGORIES).map(([category, options]) => (
                        <div key={category} className="space-y-3">
                          <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{category}</label>
                          <div className="grid grid-cols-2 gap-2">
                            {options.map(t => (
                              <button 
                                key={t} 
                                onClick={() => handleTimeContextChange(t)} 
                                className={`py-3 rounded-xl border-2 font-bold text-sm transition-all ${state.timeContext === t ? 'bg-black text-white border-black' : 'bg-white text-stone-900 border-stone-100 hover:border-stone-300'}`}
                              >
                                {t}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}

                      <div className="space-y-3 pt-2">
                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">¿Hay una ocasión especial?</label>
                        <input 
                          type="text" 
                          value={state.timeContext} 
                          onChange={(e) => handleTimeContextChange(e.target.value)} 
                          className="w-full px-4 py-3 rounded-xl border-2 border-stone-100 outline-none focus:border-black transition-all font-medium text-sm" 
                          placeholder="Ej: Navidad, San Valentín, cumpleaños, semana de esquí..." 
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : q.type === 'image-upload' ? (
                <div className="flex flex-col gap-3">
                  {state.locationImage && (
                    <div className="relative w-full h-32 rounded-xl overflow-hidden border border-stone-200">
                      <img src={state.locationImage} alt="Referencia" className="w-full h-full object-cover" />
                      <button onClick={() => setState(prev => ({ ...prev, locationImage: undefined }))} className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                      </button>
                    </div>
                  )}
                  <input type="file" accept="image/*" ref={locationFileRef} onChange={handleLocationImageChange} className="hidden" />
                  <button type="button" onClick={() => locationFileRef.current?.click()} className="w-full py-4 border-2 border-dashed border-stone-200 rounded-xl text-stone-500 font-bold text-sm hover:border-black transition-all bg-white">
                    {state.locationImage ? "Cambiar foto de referencia" : "Subir foto de tu viñedo o bodega"}
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {getOptions(q).map((opt: string) => {
                    const isSelected = q.key === 'maridaje_item' 
                      ? (state.selections['maridaje_items'] || []).includes(opt)
                      : state.selections[q.key] === opt;
                    
                    return (
                      <button 
                        key={opt} 
                        onClick={() => handleSelection(q.key, opt)} 
                        className={`relative py-4 rounded-xl border-2 font-bold transition-all ${isSelected ? 'bg-black text-white border-black' : 'bg-white text-stone-900 border-stone-100 hover:border-stone-300'}`}
                      >
                        {opt}
                        {isOptionSuggested(q.key, opt) && (
                          <span className="absolute -top-2 -right-1 bg-stone-100 text-stone-500 text-[8px] px-1.5 py-0.5 rounded-full border border-stone-200 uppercase tracking-tighter">Sugerido</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {q.key === 'maridaje_item' && (
                <div className="space-y-3 pt-4 border-t border-stone-100 animate-in fade-in slide-in-from-top-2">
                  <label className="text-xs font-black text-stone-400 uppercase tracking-widest">¿Quieres añadir algo más?</label>
                  <input 
                    type="text" 
                    value={state.selections['maridaje_extra'] || ''} 
                    onChange={(e) => handleSelection('maridaje_extra', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border-2 border-stone-100 outline-none focus:border-black transition-all font-medium text-sm" 
                    placeholder="Ej: percebes de Galicia, jamón de bellota 5J..." 
                  />
                </div>
              )}
            </div>
          ))}
        </div>
        <button 
          onClick={nextStep} 
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
        <div className="space-y-4">
          <label className="text-xs font-black text-stone-400 uppercase tracking-widest">¿En qué formato quieres la imagen final?</label>
          <div className="grid grid-cols-1 gap-3">
            {[
              { ratio: '1:1', desc: "Ideal para Instagram Feed y LinkedIn" },
              { ratio: '9:16', desc: "Perfecto para Stories, Reels y TikTok" },
              { ratio: '16:9', desc: "Recomendado para web, presentaciones y banners" },
              { ratio: '4:5', desc: "Óptimo para Instagram Feed vertical" },
              { ratio: '4:3 / A4', desc: "Para impresión, catálogos y punto de venta" }
            ].map(({ ratio: r, desc }) => (
              <button 
                key={r} 
                onClick={() => handleRatioChange(r as AspectRatio)} 
                className={`flex flex-col items-start p-4 rounded-xl border-2 transition-all ${ratio === r ? 'bg-black text-white border-black' : 'bg-white text-stone-900 border-stone-100 hover:border-stone-200'}`}
              >
                <span className="font-black text-lg">{r}</span>
                <span className={`text-[11px] font-medium ${ratio === r ? 'text-stone-400' : 'text-stone-500'}`}>{desc}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex gap-1">
              {selectedWine.extractedPalette?.map((c, i) => (
                <div key={i} className="w-4 h-4 rounded-full border border-white/20 shadow-sm" style={{ backgroundColor: c }} />
              ))}
            </div>
            <span className="text-sm font-bold text-stone-700">Intensidad de la paleta de color</span>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { id: 'Natural', label: 'Natural', desc: 'Sutil, solo en luz y atmósfera' },
              { id: 'Expresivo', label: 'Expresivo', desc: 'En objetos, fondos y texturas' },
              { id: 'Intenso', label: 'Intenso', desc: 'Dominante, editorial y audaz' }
            ].map((opt) => (
              <button
                key={opt.id}
                onClick={() => handleIntensityChange(opt.id as PaletteIntensity)}
                className={`flex flex-col items-start p-4 rounded-xl border-2 transition-all text-left ${
                  state.paletteIntensity === opt.id 
                    ? 'bg-black text-white border-black' 
                    : 'bg-white text-stone-900 border-stone-100 hover:border-stone-200'
                }`}
              >
                <span className="font-bold text-sm">{opt.label}</span>
                <span className={`text-[10px] leading-tight mt-1 ${state.paletteIntensity === opt.id ? 'text-stone-400' : 'text-stone-500'}`}>
                  {opt.desc}
                </span>
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

          <div className="space-y-6 pt-4 border-t border-stone-100">
            <label className="text-xs font-black text-stone-400 uppercase tracking-widest">¿Cuándo ocurre?</label>
            
            <div className="space-y-6">
              {Object.entries(GENERAL_TIME_CATEGORIES).map(([category, options]) => (
                <div key={category} className="space-y-3">
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{category}</label>
                  <div className="grid grid-cols-2 gap-2">
                    {options.map(t => (
                      <button 
                        key={t} 
                        onClick={() => handleTimeContextChange(t)} 
                        className={`py-3 rounded-xl border-2 font-bold text-sm transition-all ${state.timeContext === t ? 'bg-black text-white border-black' : 'bg-white text-stone-900 border-stone-100 hover:border-stone-300'}`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              <div className="space-y-3 pt-2">
                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">¿Hay una ocasión especial?</label>
                <input 
                  type="text" 
                  value={state.timeContext} 
                  onChange={(e) => handleTimeContextChange(e.target.value)} 
                  className="w-full px-4 py-3 rounded-xl border-2 border-stone-100 outline-none focus:border-black transition-all font-medium text-sm" 
                  placeholder="Ej: Navidad, San Valentín, cumpleaños, semana de esquí..." 
                />
              </div>
            </div>
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
            <textarea value={state.contextText} onChange={(e) => handleContextTextChange(e.target.value)} className="w-full px-5 py-4 rounded-2xl border-2 border-stone-100 bg-white text-black placeholder-stone-300 outline-none h-24 font-medium focus:border-stone-400 transition-all shadow-sm" placeholder="Describe la atmósfera o iluminación que imaginas para esta escena" />
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
    if (state.isLoading && state.step < 6) {
      return (
        <div className="flex flex-col items-center justify-center py-32 space-y-8 animate-in fade-in duration-300">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-stone-100 border-t-black rounded-full animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-10 h-10 bg-stone-50 rounded-full flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-black animate-pulse"><path d="M12 2v4"/><path d="m16.2 7.8 2.9-2.9"/><path d="M18 12h4"/><path d="m16.2 16.2 2.9 2.9"/><path d="M12 18v4"/><path d="m4.9 19.1 2.9-2.9"/><path d="M2 12h4"/><path d="m4.9 4.9 2.9 2.9"/></svg>
              </div>
            </div>
          </div>
          <div className="text-center space-y-3">
            <h3 className="text-2xl font-bold text-black font-serif">
              {loadingMessage || "Estamos generando tus propuestas creativas..."}
            </h3>
            <p className="text-stone-400 font-medium animate-pulse italic">
              Esto puede tardar unos segundos...
            </p>
          </div>
        </div>
      );
    }
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
    <div className="max-w-xl mx-auto relative">
      {validationMessage && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
          onClick={() => setValidationMessage(null)}
        >
          <div className="bg-black text-white px-8 py-6 rounded-2xl shadow-2xl max-w-[85%] text-center animate-in zoom-in-95 duration-300 border border-white/10">
            <p className="text-base font-bold tracking-tight leading-relaxed">{validationMessage}</p>
          </div>
        </div>
      )}
      {renderCurrentStep()}
    </div>
  );
};

export default CreativeFunnel;
