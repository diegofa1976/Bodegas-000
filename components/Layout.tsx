
import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
  title: string;
  onBack?: () => void;
  onGear?: () => void;
  onGallery?: () => void;
  showGear?: boolean;
  showGallery?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children, title, onBack, onGear, onGallery, showGear, showGallery }) => {
  return (
    <div className="min-h-screen flex flex-col max-w-2xl mx-auto bg-white shadow-xl border-x border-stone-100">
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-stone-200 px-6 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 overflow-hidden">
          {onBack && (
            <button 
              onClick={onBack}
              className="p-2 -ml-2 hover:bg-stone-100 rounded-full transition-colors flex-shrink-0 text-black"
              aria-label="Volver"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </button>
          )}
          <h1 className="text-xl font-bold text-black tracking-tight truncate">{title}</h1>
        </div>
        
        <div className="flex items-center gap-1">
          {showGallery && onGallery && (
            <button 
              onClick={onGallery}
              className="p-2 hover:bg-stone-100 rounded-full transition-colors flex-shrink-0 text-black"
              title="Ver galería"
              aria-label="Galería de imágenes"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
            </button>
          )}
          {showGear && onGear && (
            <button 
              onClick={onGear}
              className="p-2 hover:bg-stone-100 rounded-full transition-colors flex-shrink-0 text-black"
              title="Gestionar vinos"
              aria-label="Configuración de vinos"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.1a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
          )}
        </div>
      </header>
      <main className="flex-1 p-6 overflow-y-auto bg-[#fcfbf7]">
        {children}
      </main>
    </div>
  );
};

export default Layout;
