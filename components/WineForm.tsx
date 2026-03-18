
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Wine } from '../types';
import { PAIRING_OPTIONS, GRAPE_VARIETIES } from '../constants';
import { analyzePerception } from '../services/geminiService';
import { extractColorPalette } from '../services/colorExtractionService';

interface WineFormProps {
  initialWine?: Wine;
  onSave: (wine: Wine) => void;
}

const WineForm: React.FC<WineFormProps> = ({ initialWine, onSave }) => {
  const [formData, setFormData] = useState<Partial<Wine>>(() => {
    if (initialWine) {
      return {
        ...initialWine,
        consumptionMoments: initialWine.consumptionMoments || [],
      };
    }
    return {
      name: '',
      description: '',
      targetAudience: '',
      priceLevel: '', // Internal compatibility
      specialFeatures: '', // Now a string for free text
      grapeVariety: '',
      grapeImage: '',
      image: '',
      analysisResult: '',
      useAnalysisInCreative: false,
      denomination: '',
      wineType: 'Tinto',
      pricePositioning: '',
      consumptionMoments: [],
      extractedPalette: []
    };
  });

  const [analyzing, setAnalyzing] = useState(false);
  const [extractingColors, setExtractingColors] = useState(false);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [showAnalysisResult, setShowAnalysisResult] = useState(!!initialWine?.analysisResult);

  // Clear validation message after 2 seconds
  useEffect(() => {
    if (validationMessage) {
      const timer = setTimeout(() => setValidationMessage(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [validationMessage]);
  const [skippedAnalysis, setSkippedAnalysis] = useState(false);
  const [editingColorIndex, setEditingColorIndex] = useState<number | null>(null);
  const [isOtherGrape, setIsOtherGrape] = useState(() => {
    if (initialWine?.grapeVariety) {
      const type = initialWine.wineType || 'Tinto';
      const options = GRAPE_VARIETIES[type] || [];
      return !options.includes(initialWine.grapeVariety);
    }
    return false;
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const grapeImageInputRef = useRef<HTMLInputElement>(null);

  // Reset grape variety if it's not in the new list when wine type changes
  useEffect(() => {
    if (!isOtherGrape && formData.grapeVariety) {
      const options = GRAPE_VARIETIES[formData.wineType || 'Tinto'] || [];
      if (!options.includes(formData.grapeVariety)) {
        setFormData(prev => ({ ...prev, grapeVariety: '' }));
      }
    }
  }, [formData.wineType, isOtherGrape]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        setFormData(prev => ({ ...prev, image: base64 }));
        
        // Auto-extract color palette
        setExtractingColors(true);
        
        // 30 second timeout for extraction
        const extractWithTimeout = async () => {
          const timeoutPromise = new Promise<string[]>((_, reject) => 
            setTimeout(() => reject(new Error("Timeout")), 30000)
          );
          return Promise.race([extractColorPalette(base64), timeoutPromise]);
        };

        try {
          const palette = await extractWithTimeout();
          if (palette && palette.length > 0) {
            setFormData(prev => ({ 
              ...prev, 
              extractedPalette: palette 
            }));
          } else {
            setFormData(prev => ({ ...prev, extractedPalette: [] }));
            setValidationMessage("No se pudo extraer la paleta automáticamente.");
          }
        } catch (err) {
          console.error("Error auto-extracting colors or timeout:", err);
          setFormData(prev => ({ ...prev, extractedPalette: [] }));
          setValidationMessage("No se pudo extraer la paleta automáticamente.");
        } finally {
          setExtractingColors(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGrapeImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setFormData(prev => ({ ...prev, grapeImage: base64 }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStartAnalysis = async () => {
    if (!formData.name) {
      setValidationMessage("Introduce primero el nombre del vino para poder analizarlo.");
      return;
    }
    setAnalyzing(true);
    try {
      const result = await analyzePerception(formData.name);
      setFormData(prev => ({ ...prev, analysisResult: result }));
      setShowAnalysisResult(true);
      setSkippedAnalysis(false);
    } catch (e) {
      setValidationMessage("No se pudo completar el análisis en este momento.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name && formData.image) {
      onSave({
        ...formData,
        id: initialWine?.id || Date.now().toString(),
      } as Wine);
    } else {
      setValidationMessage("Por favor, completa al menos el nombre y sube una imagen.");
    }
  };

  const toggleConsumptionMoment = (moment: string) => {
    setFormData(prev => {
      const current = prev.consumptionMoments || [];
      if (current.includes(moment)) {
        return { ...prev, consumptionMoments: current.filter(m => m !== moment) };
      } else {
        return { ...prev, consumptionMoments: [...current, moment] };
      }
    });
  };

  const handleColorChange = (idx: number, newColor: string) => {
    setFormData(prev => {
      const newPalette = [...(prev.extractedPalette || [])];
      newPalette[idx] = newColor;
      return { ...prev, extractedPalette: newPalette };
    });
  };

  const removeColor = (idx: number) => {
    setFormData(prev => ({
      ...prev,
      extractedPalette: (prev.extractedPalette || []).filter((_, i) => i !== idx)
    }));
    setEditingColorIndex(null);
  };

  const addColor = () => {
    setFormData(prev => ({
      ...prev,
      extractedPalette: [...(prev.extractedPalette || []), "#000000"]
    }));
    setEditingColorIndex((formData.extractedPalette?.length || 0));
  };

  const inputClasses = "w-full px-4 py-3 rounded-lg border border-stone-200 focus:ring-2 focus:ring-black focus:border-transparent outline-none bg-white text-black placeholder-stone-400 transition-all";
  const labelClasses = "block text-sm font-semibold text-stone-700 mb-1";
  
  return (
    <form onSubmit={handleSubmit} className="space-y-10 pb-20 max-w-lg mx-auto animate-in fade-in duration-500">
      {/* BASIC INFO */}
      <section className="space-y-6">
        <h3 className="text-xl font-serif font-bold border-b border-stone-100 pb-2">Información del Producto</h3>
        
        <div>
          <label className={labelClasses}>Nombre del vino</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleTextChange}
            className={inputClasses}
            placeholder="Ej: Reserva Familiar 2020"
          />
        </div>

        <div>
          <label className={labelClasses}>Imagen de la botella</label>
          <div className="flex flex-col gap-4">
            {formData.image && (
              <img src={formData.image} alt="Preview" className="w-full h-64 object-contain rounded-xl border border-stone-100 bg-stone-50 p-4" />
            )}
            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageChange} className="hidden" />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-4 border-2 border-dashed border-stone-200 rounded-xl text-stone-700 font-bold hover:border-black hover:text-black transition-all flex items-center justify-center gap-2 bg-white"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
              {formData.image ? "Cambiar imagen" : "Subir imagen del vino"}
            </button>
          </div>
        </div>

        <div>
          <label className={labelClasses}>Tipo de Vino</label>
          <div className="grid grid-cols-2 gap-2">
            {['Tinto', 'Blanco', 'Rosado', 'Espumoso/Cava'].map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, wineType: type as any }))}
                className={`py-3 px-4 rounded-lg border text-sm font-bold transition-all ${
                  formData.wineType === type
                    ? 'bg-black text-white border-black'
                    : 'bg-white text-stone-600 border-stone-200 hover:border-stone-400'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={labelClasses}>Denominación de Origen y Varietal</label>
          <select
            name="denomination"
            value={formData.denomination}
            onChange={(e) => setFormData(prev => ({ ...prev, denomination: e.target.value }))}
            className={inputClasses}
          >
            <option value="">Selecciona una opción...</option>
            <option value="Albariño">Albariño</option>
            <option value="Ribera del Duero">Ribera del Duero</option>
            <option value="Rioja">Rioja</option>
            <option value="Cava">Cava</option>
            <option value="Priorat">Priorat</option>
            <option value="Rías Baixas">Rías Baixas</option>
            <option value="Rueda">Rueda</option>
            <option value="Jumilla">Jumilla</option>
            <option value="Otro">Otro</option>
          </select>
        </div>

        <div>
          <label className={labelClasses}>Variedad de uva</label>
          <div className="flex flex-wrap gap-2 mb-4">
            {(GRAPE_VARIETIES[formData.wineType || 'Tinto'] || []).map((grape) => (
              <button
                key={grape}
                type="button"
                onClick={() => {
                  setFormData(prev => ({ ...prev, grapeVariety: grape }));
                  setIsOtherGrape(false);
                }}
                className={`py-2 px-4 rounded-full border text-xs font-bold transition-all ${
                  formData.grapeVariety === grape && !isOtherGrape
                    ? 'bg-black text-white border-black'
                    : 'bg-stone-100 text-stone-600 border-transparent hover:bg-stone-200'
                }`}
              >
                {grape}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setIsOtherGrape(true);
                setFormData(prev => ({ ...prev, grapeVariety: '' }));
              }}
              className={`py-2 px-4 rounded-full border text-xs font-bold transition-all ${
                isOtherGrape
                  ? 'bg-black text-white border-black'
                  : 'bg-stone-100 text-stone-600 border-transparent hover:bg-stone-200'
              }`}
            >
              Otra
            </button>
          </div>

          {isOtherGrape && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <input
                type="text"
                name="grapeVariety"
                value={formData.grapeVariety}
                onChange={handleTextChange}
                className={inputClasses}
                placeholder="Escribe la variedad de uva..."
              />
              <div className="mt-2">
                <label className="block text-xs font-semibold text-stone-500 mb-2">Subir foto de la uva (opcional)</label>
                <div className="flex flex-col gap-3">
                  {formData.grapeImage && (
                    <div className="relative w-full h-32 bg-stone-50 rounded-xl border border-stone-100 overflow-hidden">
                      <img src={formData.grapeImage} alt="Grape Preview" className="w-full h-full object-contain p-2" />
                      <button 
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, grapeImage: '' }))}
                        className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full hover:bg-black transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                      </button>
                    </div>
                  )}
                  <input type="file" accept="image/*" ref={grapeImageInputRef} onChange={handleGrapeImageChange} className="hidden" />
                  <button
                    type="button"
                    onClick={() => grapeImageInputRef.current?.click()}
                    className="w-full py-3 border border-stone-200 rounded-xl text-stone-600 text-sm font-bold hover:border-stone-400 transition-all flex items-center justify-center gap-2 bg-white"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                    {formData.grapeImage ? "Cambiar foto de la uva" : "Subir foto de la uva (opcional)"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div>
          <label className={labelClasses}>Posicionamiento de Precio</label>
          <div className="grid grid-cols-2 gap-2">
            {['Nivel de entrada', 'Premium', 'Ultra-premium', 'Edición limitada'].map((pos) => (
              <button
                key={pos}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, pricePositioning: pos }))}
                className={`py-3 px-4 rounded-lg border text-sm font-bold transition-all ${
                  formData.pricePositioning === pos
                    ? 'bg-black text-white border-black'
                    : 'bg-white text-stone-600 border-stone-200 hover:border-stone-400'
                }`}
              >
                {pos}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={labelClasses}>Momento Principal de Consumo (Multi-selección)</label>
          <div className="flex flex-wrap gap-2">
            {['Verano', 'Aperitivo', 'Celebración', 'Navidad', 'Todo el año'].map((moment) => (
              <button
                key={moment}
                type="button"
                onClick={() => toggleConsumptionMoment(moment)}
                className={`py-2 px-4 rounded-full border text-xs font-bold transition-all ${
                  formData.consumptionMoments?.includes(moment)
                    ? 'bg-stone-800 text-white border-stone-800'
                    : 'bg-stone-100 text-stone-600 border-transparent hover:bg-stone-200'
                }`}
              >
                {moment}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={labelClasses}>Paleta de Colores de la Etiqueta</label>
          <div className="space-y-4">
            {extractingColors ? (
              <div className="flex items-center gap-2 text-stone-500 text-sm animate-pulse">
                <div className="w-4 h-4 border-2 border-stone-300 border-t-stone-600 rounded-full animate-spin" />
                Analizando colores de la etiqueta...
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                    {formData.image 
                      ? "Colores de la marca:" 
                      : "Sube una imagen para extraer colores"}
                  </p>
                  <button 
                    type="button" 
                    onClick={addColor}
                    className="text-[10px] font-bold text-stone-400 hover:text-black transition-colors uppercase tracking-widest flex items-center gap-1"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                    Añadir color
                  </button>
                </div>
                
                <div className="flex flex-wrap gap-3">
                  {formData.extractedPalette?.map((color, idx) => (
                    <div key={idx} className="relative group flex flex-col items-center gap-1">
                      <div 
                        className={`w-12 h-12 rounded-xl border border-stone-200 shadow-sm cursor-pointer transition-transform active:scale-95 ${editingColorIndex === idx ? 'ring-2 ring-black ring-offset-2' : ''}`} 
                        style={{ backgroundColor: color }}
                        onClick={() => setEditingColorIndex(editingColorIndex === idx ? null : idx)}
                      />
                      
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeColor(idx);
                        }}
                        className="absolute -top-1 -right-1 bg-white border border-stone-200 text-stone-400 rounded-full w-5 h-5 flex items-center justify-center hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all shadow-sm opacity-0 group-hover:opacity-100"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                      </button>

                      {editingColorIndex === idx ? (
                        <input 
                          type="text"
                          value={color}
                          onChange={(e) => handleColorChange(idx, e.target.value)}
                          onBlur={() => setEditingColorIndex(null)}
                          autoFocus
                          className="w-20 text-[10px] font-mono text-center border border-stone-200 rounded p-1 outline-none focus:border-black"
                        />
                      ) : (
                        <span className="text-[10px] font-mono text-stone-400 uppercase">{color}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div>
          <label className={labelClasses}>¿Para quién va dirigido este vino? (Target)</label>
          <input
            type="text"
            name="targetAudience"
            value={formData.targetAudience}
            onChange={handleTextChange}
            className={inputClasses}
            placeholder="Describe a tu consumidor ideal..."
          />
        </div>

        <div>
          <label className={labelClasses}>¿Qué hace especial a este vino? (Cualidades)</label>
          <textarea
            name="specialFeatures"
            rows={3}
            value={formData.specialFeatures}
            onChange={handleTextChange}
            className={inputClasses}
            placeholder="Relata qué lo diferencia: origen, proceso, historia..."
          />
        </div>

        <div>
          <label className={labelClasses}>Descripción detallada (Carácter)</label>
          <textarea
            name="description"
            rows={3}
            value={formData.description}
            onChange={handleTextChange}
            className={inputClasses}
            placeholder="Describe su personalidad, cuerpo, notas..."
          />
        </div>
      </section>

      {/* OPTIONAL PERCEPTION ANALYSIS */}
      <section className="bg-stone-50 p-6 rounded-2xl border border-stone-200 space-y-6">
        {!showAnalysisResult ? (
          <div className="space-y-4">
            <h4 className="font-bold text-stone-800">Análisis de Percepción Digital del Vino</h4>
            <p className="text-sm text-stone-600 leading-relaxed whitespace-pre-line">
              ¿Quieres saber qué percepción tienen el público y los expertos externos sobre este vino en el entorno digital?
              Analizamos redes, foros y prensa especializada, excluyendo tus propios canales.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                disabled={analyzing}
                onClick={handleStartAnalysis}
                className="flex-1 py-4 bg-black text-white rounded-xl font-bold hover:bg-stone-900 transition-all flex items-center justify-center gap-2 shadow-lg shadow-black/10"
              >
                {analyzing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-stone-300 border-t-white rounded-full animate-spin" />
                    Generando...
                  </>
                ) : (
                  "Sí, generar análisis"
                )}
              </button>
              <button
                type="button"
                disabled={analyzing}
                onClick={() => setSkippedAnalysis(true)}
                className={`flex-1 py-4 border rounded-xl font-bold transition-all ${skippedAnalysis ? 'bg-stone-200 border-stone-400 text-stone-800' : 'bg-white border-stone-300 text-stone-700 hover:border-stone-500'}`}
              >
                No, continuar sin análisis
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
            <h4 className="font-bold text-stone-800 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-600"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              Análisis de Percepción Finalizado
            </h4>
            
            <div className="bg-white p-5 rounded-xl border border-stone-100 text-base text-stone-800 leading-relaxed shadow-sm">
              {formData.analysisResult?.split('\n\n').map((para, i) => (
                <p key={i} className={i > 0 ? 'mt-4' : ''}>{para}</p>
              ))}
            </div>

            <div className="space-y-4">
              <p className="text-sm font-bold text-stone-900 leading-tight">¿Quieres que tengamos en cuenta este análisis en el proceso creativo?</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, useAnalysisInCreative: true }))}
                  className={`flex-1 py-4 rounded-xl border-2 font-bold text-sm transition-all shadow-sm ${formData.useAnalysisInCreative ? 'bg-black text-white border-black' : 'bg-white text-stone-700 border-stone-200 hover:border-stone-400'}`}
                >
                  Tenerlo en cuenta
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, useAnalysisInCreative: false }))}
                  className={`flex-1 py-4 rounded-xl border-2 font-bold text-sm transition-all shadow-sm ${!formData.useAnalysisInCreative ? 'bg-black text-white border-black' : 'bg-white text-stone-700 border-stone-200 hover:border-stone-400'}`}
                >
                  No tenerlo en cuenta
                </button>
              </div>
            </div>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => {
                  setShowAnalysisResult(false);
                  setFormData(prev => ({ ...prev, analysisResult: '', useAnalysisInCreative: false }));
                }}
                className="text-xs text-stone-500 font-bold hover:text-red-600 transition-colors uppercase tracking-wider"
              >
                Eliminar análisis y volver a preguntar
              </button>
            </div>
          </div>
        )}
      </section>

      {formData.generatedImages && formData.generatedImages.length > 0 && (
        <section className="space-y-4 pt-6 border-t border-stone-100">
          <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider">Imágenes Generadas</h3>
          <div className="grid grid-cols-3 gap-2">
            {formData.generatedImages.map((imgUrl, idx) => (
              <div key={idx} className="aspect-square rounded-lg overflow-hidden border border-stone-200 bg-stone-50">
                <img 
                  src={imgUrl} 
                  alt={`Generada ${idx + 1}`} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* SAVE ACTION */}
      <button
        type="submit"
        className="w-full bg-black text-white py-6 rounded-2xl font-bold shadow-2xl shadow-black/20 active:scale-[0.98] transition-all text-xl"
      >
        Guardar producto
      </button>

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
    </form>
  );
};

export default WineForm;
