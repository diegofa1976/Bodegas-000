
import React from 'react';
import { Wine } from '../types';

interface WineListProps {
  wines: Wine[];
  onEdit: (wine: Wine) => void;
  onAdd: () => void;
}

const WineList: React.FC<WineListProps> = ({ wines, onEdit, onAdd }) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-stone-800">Gestionar Vinos</h2>
        <button 
          onClick={onAdd}
          className="bg-black text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-stone-900 transition-colors"
        >
          + Añadir nuevo
        </button>
      </div>
      
      {wines.length === 0 ? (
        <div className="py-10 text-center text-stone-500 bg-stone-50 rounded-xl border border-dashed border-stone-200">
          No hay vinos registrados.
        </div>
      ) : (
        <div className="grid gap-3">
          {wines.map(wine => (
            <div key={wine.id} className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm flex items-center gap-4">
              <img 
                src={wine.image} 
                alt={wine.name} 
                className="w-14 h-14 object-contain bg-stone-50 rounded-lg p-1 border border-stone-100" 
              />
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-stone-900 truncate">{wine.name}</h3>
                <div className="flex gap-1 overflow-hidden">
                  <span className="text-[10px] bg-stone-100 px-1.5 py-0.5 rounded text-stone-600">{wine.priceLevel || 'N/A'}</span>
                  <span className="text-[10px] bg-stone-100 px-1.5 py-0.5 rounded text-stone-600 truncate">{wine.targetAudience || 'N/A'}</span>
                </div>
              </div>
              <button
                onClick={() => onEdit(wine)}
                className="bg-stone-100 text-stone-700 px-4 py-2 rounded-lg text-xs font-bold hover:bg-stone-200 transition-colors"
              >
                Editar
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WineList;
