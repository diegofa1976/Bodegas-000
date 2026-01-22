
import React, { useState, useRef } from 'react';
import { Wine } from '../types';

interface WineFormProps {
  initialWine?: Wine;
  onSave: (wine: Wine) => void;
}

const AUDIENCES = ["Jóvenes", "Expertos", "Regalo", "Casual"];
const PRICE_LEVELS = ["Económico", "Medio", "Premium", "Lujo"];
const SPECIAL_FEATURES = ["Orgánico", "Edición Limitada", "Artesanal", "Sostenible", "Añejo"];

const WineForm: React.FC<WineFormProps> = ({ initialWine, onSave }) => {
  const [formData, setFormData] = useState<Partial<Wine>>(initialWine || {
    name: '',
    description: '',
    targetAudience: '',
    priceLevel: '',
    specialFeatures: [],
    image: ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    // Direct update to local state - minimal logic as per core principles.
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

  const toggleFeature = (feature: string) => {
    setFormData(prev => {
      const current = prev.specialFeatures || [];
      if (current.includes(feature)) {
        return { ...prev, specialFeatures: current.filter(f => f !== feature) };
      }
      if (current.length < 2) {
        return { ...prev, specialFeatures: [...current, feature] };
      }
      return prev;
    });
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
  const btnClasses = (selected: boolean) => `px-4 py-3 rounded-lg border text-sm font-medium transition-all ${
    selected ? 'bg-black text-white border-black' : 'bg-white text-stone-600 border-stone-200 hover:border-stone-400'
  }`;

  return (
    <form onSubmit={handleSubmit} className="space-y-8 pb-10">
      {/* TEXT FIELDS */}
      <div className="space-y-4">
        <div>
          <label className={labelClasses}>Nombre del vino</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleTextChange}
            className={inputClasses}
            placeholder="Ej: Reserva Familiar"
          />
        </div>

        <div>
          <label className={labelClasses}>Descripción del vino</label>
          <textarea
            name="description"
            rows={4}
            value={formData.description}
            onChange={handleTextChange}
            className={inputClasses}
            placeholder="Cuerpo, aroma, notas de cata..."
          />
        </div>
      </div>

      {/* IMAGE UPLOAD */}
      <div>
        <label className={labelClasses}>Imagen del producto</label>
        <div className="flex flex-col gap-4">
          {formData.image && (
            <img src={formData.image} alt="Preview" className="w-full h-48 object-contain rounded-lg border border-stone-100 bg-stone-50 p-2" />
          )}
          <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageChange} className="hidden" />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-4 border-2 border-dashed border-stone-200 rounded-lg text-stone-500 hover:border-black hover:text-black transition-all flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7"/><line x1="16" x2="22" y1="5" y2="5"/><line x1="19" x2="19" y1="2" y2="8"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
            {formData.image ? "Cambiar imagen" : "Subir imagen"}
          </button>
        </div>
      </div>

      {/* BUTTON BASED SELECTIONS */}
      <div className="space-y-6">
        <div>
          <label className={labelClasses}>¿Para quién es este vino?</label>
          <div className="grid grid-cols-2 gap-2">
            {AUDIENCES.map(a => (
              <button
                key={a}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, targetAudience: a }))}
                className={btnClasses(formData.targetAudience === a)}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={labelClasses}>Nivel de precio percibido</label>
          <div className="grid grid-cols-2 gap-2">
            {PRICE_LEVELS.map(p => (
              <button
                key={p}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, priceLevel: p }))}
                className={btnClasses(formData.priceLevel === p)}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={labelClasses}>¿Qué lo hace especial? (Máx. 2)</label>
          <div className="grid grid-cols-2 gap-2">
            {SPECIAL_FEATURES.map(s => (
              <button
                key={s}
                type="button"
                onClick={() => toggleFeature(s)}
                className={btnClasses(formData.specialFeatures?.includes(s) || false)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ACTION BUTTON */}
      <button
        type="submit"
        className="w-full bg-black text-white py-5 rounded-xl font-bold shadow-lg shadow-black/10 active:scale-[0.98] transition-all"
      >
        Guardar vino
      </button>
    </form>
  );
};

export default WineForm;
