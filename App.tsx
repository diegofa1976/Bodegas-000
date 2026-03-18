
import React, { useState, useEffect, useCallback } from 'react';
import { Brain } from 'lucide-react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { 
  collection, 
  doc, 
  setDoc, 
  onSnapshot, 
  query, 
  where,
  updateDoc,
  deleteDoc,
  arrayUnion,
  serverTimestamp
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { storageService } from './services/storageService';
import { uploadImageToStorage } from './services/uploadService';
import Layout from './components/Layout';
import WineList from './components/WineList';
import WineForm from './components/WineForm';
import CreativeFunnel from './components/CreativeFunnel';
import Gallery from './components/Gallery';
import AuthScreen from './components/AuthScreen';
import ErrorBoundary from './components/ErrorBoundary';
import { Wine, AppScreen, GalleryImage } from './types';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [screen, setScreen] = useState<AppScreen>(AppScreen.HOME);
  const [funnelKey, setFunnelKey] = useState(0);
  const [wines, setWines] = useState<Wine[]>(() => storageService.getWines());
  const [gallery, setGallery] = useState<GalleryImage[]>(() => storageService.getGallery());
  const [firestoreError, setFirestoreError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch Gemini API Key from server environment
    fetch('/api/config')
      .then(res => res.json())
      .then(config => {
        if (config.GEMINI_API_KEY) {
          (window as any).GEMINI_API_KEY = config.GEMINI_API_KEY;
          console.log('[App] Gemini API Key loaded from server');
        }
      })
      .catch(err => console.error('[App] Failed to load config:', err));
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Sync wines from Firestore
  useEffect(() => {
    if (!user) {
      setWines([]);
      return;
    }

    const winesPath = `users/${user.uid}/wines`;
    const q = query(collection(db, winesPath));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedWines = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Wine[];
      setWines(fetchedWines);
      storageService.saveWines(fetchedWines);
      setFirestoreError(null);
    }, (error) => {
      console.error('Firestore Wines Sync Error:', error);
      setFirestoreError('Error al sincronizar los vinos. Comprueba tu conexión.');
    });

    return () => unsubscribe();
  }, [user]);

  // Sync gallery from Firestore
  useEffect(() => {
    if (!user) {
      setGallery([]);
      return;
    }

    const galleryPath = `users/${user.uid}/gallery`;
    const q = query(collection(db, galleryPath));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedGallery = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as GalleryImage[];
      
      // Sort by timestamp descending
      fetchedGallery.sort((a, b) => b.timestamp - a.timestamp);
      
      setGallery(fetchedGallery);
      storageService.saveGallery(fetchedGallery);
      setFirestoreError(null);
    }, (error) => {
      console.error('Firestore Gallery Sync Error:', error);
      setFirestoreError('Error al sincronizar la galería. Comprueba tu conexión.');
    });

    return () => unsubscribe();
  }, [user]);

  const [selectedWineForEdit, setSelectedWineForEdit] = useState<Wine | null>(null);
  const [funnelConfig, setFunnelConfig] = useState<{
    wine: Wine;
    concept: string;
    isAdjustment?: boolean;
    imageUrl?: string;
  } | undefined>(undefined);

  const handleSaveWine = async (wine: Wine) => {
    if (!user) return;

    const winesPath = `users/${user.uid}/wines`;
    const wineDocRef = doc(db, winesPath, wine.id);

    try {
      await setDoc(wineDocRef, {
        ...wine,
        userId: user.uid,
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      setScreen(AppScreen.HOME);
      setSelectedWineForEdit(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${winesPath}/${wine.id}`);
    }
  };

  const handleSaveToGallery = useCallback(async (img: GalleryImage) => {
    if (!user) return;

    const galleryPath = `users/${user.uid}/gallery`;
    const imgDocRef = doc(db, galleryPath, img.id);

    try {
      // 1. Upload base64 to Storage
      const storageUrl = await uploadImageToStorage(
        user.uid, 
        img.wineName, 
        img.sceneType || 'imagen', 
        img.url,
        img.timestamp
      );
      
      // 2. Save to Gallery collection with Storage URL
      const updatedImg = {
        ...img,
        url: storageUrl,
        userId: user.uid,
        timestamp: Date.now()
      };
      
      await setDoc(imgDocRef, updatedImg);

      // 3. Update Wine document with the new image URL
      if (img.wineId) {
        const wineDocRef = doc(db, `users/${user.uid}/wines`, img.wineId);
        await updateDoc(wineDocRef, {
          generatedImages: arrayUnion(storageUrl)
        });
      }
    } catch (error) {
      console.error('Error in handleSaveToGallery:', error);
      handleFirestoreError(error, OperationType.WRITE, `${galleryPath}/${img.id}`);
    }
  }, [user]);

  const handleBack = () => {
    if (screen === AppScreen.FORM) setScreen(wines.length === 0 ? AppScreen.HOME : AppScreen.MANAGE);
    else setScreen(AppScreen.HOME);
    setSelectedWineForEdit(null);
    setFunnelConfig(undefined);
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!user) return;
    const galleryPath = `users/${user.uid}/gallery`;
    const imgDocRef = doc(db, galleryPath, imageId);
    try {
      await deleteDoc(imgDocRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${galleryPath}/${imageId}`);
    }
  };

  const startNewSession = () => {
    setFunnelConfig(undefined);
    setFunnelKey(prev => prev + 1);
    setScreen(AppScreen.FUNNEL);
  };

  const startFromGallery = (img: GalleryImage, isAdjustment: boolean) => {
    const wine = wines.find(w => w.id === img.wineId) || wines.find(w => w.name === img.wineName);
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

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fcfbf7]">
        <div className="w-12 h-12 border-4 border-stone-200 border-t-black rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <ErrorBoundary>
      <Layout 
        title={getTitle()} 
        onBack={screen !== AppScreen.HOME ? handleBack : undefined}
        onGear={() => setScreen(AppScreen.MANAGE)}
        onGallery={() => setScreen(AppScreen.GALLERY)}
        onLogout={() => signOut(auth)}
        showGear={wines.length > 0}
        showGallery={gallery.length > 0}
      >
        {firestoreError && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700 font-medium">{firestoreError}</p>
              </div>
            </div>
          </div>
        )}
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
                  <Brain size={32} strokeWidth={1.5} />
                </div>
                <div className="space-y-3">
                  <h3 className="text-4xl font-serif font-bold text-black tracking-tight">Mesa de Dirección Creativa</h3>
                  <p className="text-black font-serif font-bold text-xl italic opacity-80">Inicia una sesión de dirección creativa para tus vinos</p>
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
          <Gallery 
            images={gallery} 
            onBack={() => setScreen(AppScreen.HOME)} 
            onRegenerate={(img) => startFromGallery(img, false)} 
            onAdjust={(img) => startFromGallery(img, true)}
            onDelete={handleDeleteImage}
          />
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
