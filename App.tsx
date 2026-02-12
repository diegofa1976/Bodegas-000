
import React, { useState, useEffect, useCallback } from 'react';
import Layout from './components/Layout';
import WineList from './components/WineList';
import WineForm from './components/WineForm';
import CreativeFunnel from './components/CreativeFunnel';
import Gallery from './components/Gallery';
import ErrorBoundary from './components/ErrorBoundary';
import { Wine, AppScreen, GalleryImage } from './types';

// Hard limits for localStorage persistence to avoid 5MB quota crashes
const MAX_PERSISTED_GALLERY_IMAGES = 8;
const MAX_PERSISTED_WINES = 15;

const App: React.FC = () => {
  const [screen, setScreen] = useState<AppScreen>(AppScreen.HOME);
  const [funnelKey, setFunnelKey] = useState(0);
  
  // Initial state from localStorage
  const [wines, setWines] = useState<Wine[]>(() => {
    try {
      const saved = localStorage.getItem('kinglab_wines_v2');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.warn("Could not load wines from storage", e);
      return [];
    }
  });

  const [gallery, setGallery] = useState<GalleryImage[]>(() => {
    try {
      const saved = localStorage.getItem('kinglab_gallery_v3');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.warn("Could not load gallery from storage", e);
      return [];
    }
  });

  const [selectedWineForEdit, setSelectedWineForEdit] = useState<Wine | null>(null);
  const [funnelConfig, setFunnelConfig] = useState<{
    wine: Wine;
    concept: string;
    isAdjustment?: boolean;
    imageUrl?: string;
  } | undefined>(undefined);

  // Manual persistence helper to avoid race conditions and quota errors
  const persistWines = (currentWines: Wine[]) => {
    try {
      const limited = currentWines.slice(0, MAX_PERSISTED_WINES);
      localStorage.setItem('kinglab_wines_v2', JSON.stringify(limited));
    } catch (e) {
      console.error("Storage Error (Wines):", e);
    }
  };

  const persistGallery = (currentGallery: GalleryImage[]) => {
    try {
      // We only persist the N most recent to stay under 5MB limit
      const limited = currentGallery.slice(0, MAX_PERSISTED_GALLERY_IMAGES);
      localStorage.setItem('kinglab_gallery_v3', JSON.stringify(limited));
    } catch (e) {
      console.error("Storage Error (Gallery): Quota exceeded. Only keeping most recent images.", e);
      // If it still fails, try clearing old items or storing even fewer
      try {
        localStorage.setItem('kinglab_gallery_v3', JSON.stringify(currentGallery.slice(0, 3)));
      } catch (e2) {}
    }
  };

  const handleSaveWine = (wine: Wine) => {
    const nextWines = wines.find(w => w.id === wine.id)
      ? wines.map(w => w.id === wine.id ? wine : w)
      : [wine, ...wines];
    
    setWines(nextWines);
    persistWines(nextWines);
    setScreen(AppScreen.HOME);
    setSelectedWineForEdit(null);
  };

  const handleSaveToGallery = useCallback((img: GalleryImage) => {
    setGallery(prev => {
      const nextGallery = [img, ...prev];
      // Fire-and-forget persistence
      setTimeout(() => persistGallery(nextGallery), 0);
      return nextGallery;
    });
  }, []);

  const handleBack = () => {
    if (screen === AppScreen.FORM) setScreen(wines.length === 0 ? AppScreen.HOME : AppScreen.MANAGE);
    else setScreen(AppScreen.HOME);
    setSelectedWineForEdit(null);
    setFunnelConfig(undefined);
  };

  const startNewSession = () => {
    setFunnelConfig(undefined);
    setFunnelKey(prev => prev + 1);
    setScreen(AppScreen.FUNNEL);
  };

  const startFromGallery = (img: GalleryImage, isAdjustment: boolean) => {
    const wine = wines.find(w => w.name === img.wineName);
    if (wine) {
      setFunnelConfig({ 
        wine, 
        concept: img.concept, 
        isAdjustment, 
        imageUrl: img.url 
      });
      setFunnelKey(prev => prev + 1);
      setScreen(AppScreen.FUNNEL);
    }
  };

  const getTitle = () => {
    if (screen === AppScreen.HOME) return 'KingLab Bodegas';
    if (screen === AppScreen.FUNNEL) return 'Nueva Propuesta Creativa';
    if (screen === AppScreen.MANAGE) return 'Gestionar Vinos';
    if (screen === AppScreen.GALLERY) return 'Galería';
    if (screen === AppScreen.FORM) return selectedWineForEdit ? 'Editar Vino' : 'Añadir Vino';
    return screen;
  };

  return (
    <ErrorBoundary>
      <Layout 
        title={getTitle()} 
        onBack={screen !== AppScreen.HOME ? handleBack : undefined}
        onGear={() => setScreen(AppScreen.MANAGE)}
        onGallery={() => setScreen(AppScreen.GALLERY)}
        showGear={wines.length > 0}
        showGallery={gallery.length > 0}
      >
        {screen === AppScreen.HOME && (
          wines.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-24 text-center space-y-10 animate-in fade-in duration-700">
              <div className="space-y-3 px-8">
                <h2 className="text-5xl font-serif font-bold text-black">KingLab</h2>
                <p className="text-stone-400 font-medium italic text-lg leading-relaxed">Asistente Inteligente de Dirección de Arte para Bodegas</p>
              </div>
              <button onClick={() => setScreen(AppScreen.FORM)} className="bg-black text-white px-12 py-6 rounded-full font-bold shadow-2xl active:scale-90 transition-all text-xl">
                Dar de alta un vino
              </button>
            </div>
          ) : (
            <div className="space-y-12 py-10">
              <div className="bg-white p-12 rounded-[2.5rem] border-2 border-stone-100 text-center space-y-8 shadow-sm">
                <div className="w-16 h-16 bg-stone-50 rounded-full flex items-center justify-center mx-auto text-black border border-stone-100">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                </div>
                <div className="space-y-3">
                  <h3 className="text-3xl font-serif font-bold">Mesa de Dirección Creativa</h3>
                  <p className="text-stone-400 font-medium text-lg">Inicia una sesión de dirección creativa para tus vinos</p>
                </div>
                <button onClick={startNewSession} className="w-full bg-black text-white px-8 py-6 rounded-3xl font-bold shadow-2xl active:scale-95 transition-all text-xl">
                  Comenzar proceso
                </button>
              </div>
              {gallery.length > 0 && (
                <div className="space-y-6">
                  <div className="flex justify-between items-end px-4">
                    <h4 className="font-serif font-bold text-2xl text-black">Recientes</h4>
                    <button onClick={() => setScreen(AppScreen.GALLERY)} className="text-black font-black text-[10px] uppercase tracking-widest border-b-2 border-black pb-1 active:opacity-50">Explorar todo</button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {gallery.slice(0, 4).map(img => (
                      <div key={img.id} onClick={() => setScreen(AppScreen.GALLERY)} className="aspect-square rounded-3xl overflow-hidden border border-stone-100 shadow-sm cursor-pointer active:scale-95 transition-all">
                        <img src={img.url} className="w-full h-full object-cover" alt={img.wineName} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        )}
        
        {screen === AppScreen.FUNNEL && wines.length > 0 && (
          <CreativeFunnel 
            key={funnelKey}
            wines={wines} 
            onFinish={() => setScreen(AppScreen.HOME)} 
            onSaveToGallery={handleSaveToGallery} 
            initialData={funnelConfig} 
          />
        )}

        {screen === AppScreen.GALLERY && (
          <Gallery images={gallery} onBack={() => setScreen(AppScreen.HOME)} onRegenerate={(img) => startFromGallery(img, false)} onAdjust={(img) => startFromGallery(img, true)} />
        )}

        {screen === AppScreen.MANAGE && (
          <WineList wines={wines} onEdit={(w) => { setSelectedWineForEdit(w); setScreen(AppScreen.FORM); }} onAdd={() => { setSelectedWineForEdit(null); setScreen(AppScreen.FORM); }} />
        )}

        {screen === AppScreen.FORM && (
          <WineForm initialWine={selectedWineForEdit || undefined} onSave={handleSaveWine} />
        )}
      </Layout>
    </ErrorBoundary>
  );
};

export default App;
