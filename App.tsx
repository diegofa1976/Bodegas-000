
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import WineList from './components/WineList';
import WineForm from './components/WineForm';
import CreativeFunnel from './components/CreativeFunnel';
import Gallery from './components/Gallery';
import { Wine, AppScreen, GalleryImage } from './types';

const App: React.FC = () => {
  const [screen, setScreen] = useState<AppScreen>(AppScreen.HOME);
  const [wines, setWines] = useState<Wine[]>(() => {
    const saved = localStorage.getItem('kinglab_wines_v2');
    return saved ? JSON.parse(saved) : [];
  });
  const [gallery, setGallery] = useState<GalleryImage[]>(() => {
    const saved = localStorage.getItem('kinglab_gallery_v2');
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedWineForEdit, setSelectedWineForEdit] = useState<Wine | null>(null);
  const [funnelConfig, setFunnelConfig] = useState<{
    wine: Wine;
    concept: string;
    isAdjustment?: boolean;
  } | undefined>(undefined);

  useEffect(() => {
    localStorage.setItem('kinglab_wines_v2', JSON.stringify(wines));
  }, [wines]);

  useEffect(() => {
    localStorage.setItem('kinglab_gallery_v2', JSON.stringify(gallery));
  }, [gallery]);

  const handleSaveWine = (wine: Wine) => {
    setWines(prev => {
      const exists = prev.find(w => w.id === wine.id);
      if (exists) {
        return prev.map(w => w.id === wine.id ? wine : w);
      }
      return [wine, ...prev];
    });
    setScreen(AppScreen.HOME);
    setSelectedWineForEdit(null);
  };

  const navigateToEdit = (wine: Wine) => {
    setSelectedWineForEdit(wine);
    setScreen(AppScreen.FORM);
  };

  const saveToGallery = (img: GalleryImage) => {
    setGallery(prev => [img, ...prev]);
  };

  const startCreativeFunnel = () => {
    setFunnelConfig(undefined);
    setScreen(AppScreen.FUNNEL);
  };

  const handleRegenerateFromGallery = (img: GalleryImage) => {
    const wine = wines.find(w => w.name === img.wineName);
    if (wine) {
      setFunnelConfig({ wine, concept: img.concept, isAdjustment: false });
      setScreen(AppScreen.FUNNEL);
    }
  };

  const handleAdjustFromGallery = (img: GalleryImage) => {
    const wine = wines.find(w => w.name === img.wineName);
    if (wine) {
      setFunnelConfig({ wine, concept: img.concept, isAdjustment: true });
      setScreen(AppScreen.FUNNEL);
    }
  };

  const getTitle = () => {
    switch (screen) {
      case AppScreen.HOME: return 'Kinglab Bodegas 202';
      case AppScreen.MANAGE: return 'Gestionar Vinos';
      case AppScreen.FORM: return selectedWineForEdit ? 'Editar vino' : 'Dar de alta un vino';
      case AppScreen.FUNNEL: return 'Director Creativo';
      case AppScreen.GALLERY: return 'Mi Galería';
      default: return 'Kinglab';
    }
  };

  const handleBack = () => {
    if (screen === AppScreen.FORM) {
      setScreen(wines.length === 0 ? AppScreen.HOME : AppScreen.MANAGE);
    } else if (screen === AppScreen.MANAGE || screen === AppScreen.FUNNEL || screen === AppScreen.GALLERY) {
      setScreen(AppScreen.HOME);
    }
    setSelectedWineForEdit(null);
    setFunnelConfig(undefined);
  };

  const showGear = wines.length > 0;
  const showGallery = gallery.length > 0;

  return (
    <Layout 
      title={getTitle()} 
      onBack={screen !== AppScreen.HOME ? handleBack : undefined}
      onGear={() => setScreen(AppScreen.MANAGE)}
      onGallery={() => setScreen(AppScreen.GALLERY)}
      showGear={showGear}
      showGallery={showGallery}
    >
      {screen === AppScreen.HOME && (
        wines.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full space-y-8 py-20 animate-in fade-in duration-700">
            <div className="text-center space-y-2 px-6">
              <h2 className="text-4xl font-serif font-bold text-black">Bienvenidos a Kinglab</h2>
              <p className="text-stone-500 font-medium max-w-sm mx-auto">Tu estudio virtual de dirección creativa para el sector vinícola.</p>
            </div>
            <button
              onClick={() => setScreen(AppScreen.FORM)}
              className="bg-black text-white px-10 py-5 rounded-full font-bold shadow-2xl shadow-black/20 flex items-center gap-3 active:scale-95 transition-all text-lg"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
              Dar de alta un vino
            </button>
          </div>
        ) : (
          <div className="space-y-12 pb-20">
            <div className="bg-white p-10 rounded-3xl border border-stone-200 text-center space-y-6 shadow-sm">
              <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto text-black">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-serif font-bold text-black">Asistente de Dirección Creativa</h3>
                <p className="text-stone-500 font-medium">Diseñamos el concepto visual antes de capturar la imagen perfecta.</p>
              </div>
              <button 
                onClick={startCreativeFunnel}
                className="w-full bg-black text-white px-8 py-5 rounded-2xl font-bold shadow-xl shadow-black/10 hover:scale-[1.02] active:scale-95 transition-all text-lg"
              >
                Comenzar proceso creativo
              </button>
            </div>

            {gallery.length > 0 && (
              <div className="space-y-6">
                <div className="flex justify-between items-center px-2">
                  <h4 className="font-serif font-bold text-xl text-black">Galería reciente</h4>
                  <button 
                    onClick={() => setScreen(AppScreen.GALLERY)}
                    className="text-black font-black text-xs uppercase tracking-widest border-b-2 border-black"
                  >
                    Ver todo
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {gallery.slice(0, 4).map(img => (
                    <div 
                      key={img.id} 
                      className="aspect-square rounded-2xl overflow-hidden border border-stone-100 shadow-sm cursor-pointer active:scale-95 transition-all"
                      onClick={() => setScreen(AppScreen.GALLERY)}
                    >
                      <img src={img.url} alt={img.wineName} className="w-full h-full object-cover" />
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
          wines={wines} 
          onFinish={() => setScreen(AppScreen.HOME)} 
          onSaveToGallery={saveToGallery}
          initialData={funnelConfig}
        />
      )}

      {screen === AppScreen.GALLERY && (
        <Gallery 
          images={gallery} 
          onBack={() => setScreen(AppScreen.HOME)}
          onRegenerate={handleRegenerateFromGallery}
          onAdjust={handleAdjustFromGallery}
        />
      )}

      {screen === AppScreen.MANAGE && (
        <WineList 
          wines={wines} 
          onEdit={navigateToEdit} 
          onAdd={() => {
            setSelectedWineForEdit(null);
            setScreen(AppScreen.FORM);
          }} 
        />
      )}

      {screen === AppScreen.FORM && (
        <WineForm 
          initialWine={selectedWineForEdit || undefined} 
          onSave={handleSaveWine} 
        />
      )}
    </Layout>
  );
};

export default App;
