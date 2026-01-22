
import React, { useState } from 'react';
import { GalleryImage } from '../types';

interface GalleryProps {
  images: GalleryImage[];
  onBack: () => void;
  onRegenerate: (img: GalleryImage) => void;
  onAdjust: (img: GalleryImage) => void;
}

const Gallery: React.FC<GalleryProps> = ({ images, onBack, onRegenerate, onAdjust }) => {
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);

  const handleDownload = (img: GalleryImage) => {
    // Check if it's mobile for specific behavior (though a.download works on modern mobile too)
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    if (isMobile) {
      // On mobile, opening in a new tab allows for native "Save Image" long-press context menu
      const win = window.open();
      if (win) {
        win.document.write(`<img src="${img.url}" style="width:100%"/>`);
        win.document.title = "Guardar imagen";
      }
    } else {
      const link = document.createElement('a');
      link.href = img.url;
      const cleanConcept = img.concept
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .substring(0, 30);
      link.download = `${img.wineName.toLowerCase().replace(/\s/g, '_')}_${cleanConcept}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (selectedImage) {
    return (
      <div className="space-y-8 animate-in zoom-in-95 duration-300 pb-20">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setSelectedImage(null)}
            className="p-2 bg-stone-100 rounded-full text-black hover:bg-stone-200 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <h2 className="text-xl font-bold font-serif text-black">Detalle de Imagen</h2>
        </div>

        <div className="bg-white rounded-3xl overflow-hidden border border-stone-200 shadow-2xl">
          <img 
            src={selectedImage.url} 
            alt={selectedImage.concept} 
            className="w-full h-auto"
          />
        </div>

        <div className="space-y-4">
          <div className="bg-stone-50 p-6 rounded-2xl border border-stone-100">
            <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">Vino: {selectedImage.wineName}</span>
            <p className="text-sm text-stone-900 font-medium italic mt-2 leading-relaxed">"{selectedImage.concept}"</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => onRegenerate(selectedImage)}
              className="flex flex-col items-center justify-center gap-2 py-4 bg-stone-100 text-stone-900 font-black rounded-xl text-xs hover:bg-stone-200 active:scale-95 transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>
              Regenerar
            </button>
            <button 
              onClick={() => onAdjust(selectedImage)}
              className="flex flex-col items-center justify-center gap-2 py-4 bg-stone-100 text-stone-900 font-black rounded-xl text-xs hover:bg-stone-200 active:scale-95 transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3 1.912 5.813a2 2 0 0 1 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 1-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 1-1.275-1.275L3 12l5.813-1.912a2 2 0 0 1 1.275-1.275L12 3Z"/></svg>
              Ajustar
            </button>
          </div>

          <button 
            onClick={() => handleDownload(selectedImage)}
            className="w-full py-5 bg-black text-white rounded-2xl font-bold flex items-center justify-center gap-3 text-lg shadow-xl shadow-black/10 active:scale-95 transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
            Descargar Imagen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-serif font-bold text-black">Galería de Imágenes</h2>
      </div>

      {images.length === 0 ? (
        <div className="py-20 text-center space-y-4 bg-stone-50 rounded-3xl border border-dashed border-stone-200">
          <p className="text-stone-500 font-medium">Aún no has generado ninguna imagen.</p>
          <button 
            onClick={onBack}
            className="text-black font-bold underline"
          >
            Comenzar proceso creativo
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {images.map(img => (
            <div 
              key={img.id} 
              className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm group cursor-pointer active:scale-95 transition-all"
              onClick={() => setSelectedImage(img)}
            >
              <div className="aspect-square bg-stone-100 relative overflow-hidden">
                <img 
                  src={img.url} 
                  alt={img.concept} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
              </div>
              <div className="p-3 bg-white">
                <p className="text-[10px] font-black uppercase text-stone-400 truncate">{img.wineName}</p>
                <p className="text-xs text-stone-900 font-medium line-clamp-2 mt-1 italic">"{img.concept}"</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Gallery;
