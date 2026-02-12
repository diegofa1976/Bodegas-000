
import React, { useState, useRef } from 'react';
import { Wine } from '../types';
import { analyzePerception } from '../services/geminiService';

interface WineFormProps {
  initialWine?: Wine;
  onSave: (wine: Wine) => void;
}

const WineForm: React.FC<WineFormProps> = ({ initialWine, onSave }) => {
  const [formData, setFormData] = useState<Partial<Wine>>(initialWine || {
    name: '',
    description: '',
    targetAudience: '',
    priceLevel: '', // Internal compatibility
    specialFeatures: '', // Now a string for free text
    image: '',
    analysisResult: '',
    useAnalysisInCreative: false
  });

  const [analyzing, setAnalyzing] = useState(false);
  const [showAnalysisResult, setShowAnalysisResult] = useState(!!initialWine?.analysisResult);
  const [skippedAnalysis, setSkippedAnalysis] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, image: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStartAnalysis = async () => {
    if (!formData.name) {
      alert("Introduce primero el nombre del vino para poder analizarlo.");
      return;
    }
    setAnalyzing(true);
    try {
      const result = await analyzePerception(formData.name);
      setFormData(prev => ({ ...prev, analysisResult: result }));
      setShowAnalysisResult(true);
      setSkippedAnalysis(false);
    } catch (e) {
      alert("No se pudo completar el análisis en este momento.");
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
      alert("Por favor, completa al menos el nombre y sube una imagen.");
    }
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

      {/* SAVE ACTION */}
      <button
        type="submit"
        className="w-full bg-black text-white py-6 rounded-2xl font-bold shadow-2xl shadow-black/20 active:scale-[0.98] transition-all text-xl"
      >
        Guardar producto
      </button>
    </form>
  );
};

export default WineForm;
