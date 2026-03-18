
import React from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  isDanger = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div 
        className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-stone-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-8 space-y-4">
          <h3 className="text-xl font-bold font-serif text-black">{title}</h3>
          <p className="text-stone-600 text-sm leading-relaxed">
            {message}
          </p>
        </div>
        
        <div className="flex border-t border-stone-100">
          <button
            onClick={onCancel}
            className="flex-1 py-5 text-sm font-bold text-stone-500 hover:bg-stone-50 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-5 text-sm font-bold transition-colors ${
              isDanger 
                ? 'text-red-600 hover:bg-red-50' 
                : 'text-black hover:bg-stone-50'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
