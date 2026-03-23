import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';

export default function MermaModal({ mercancia, onClose, onConfirm }) {
  const [motivo, setMotivo] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm(mercancia.id_mercancia, motivo);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-center gap-3 mb-4 text-red-600">
          <AlertTriangle className="w-8 h-8" />
          <h3 className="text-lg font-bold text-gray-900">Registrar Baja / Merma</h3>
        </div>
        
        <p className="text-gray-600 mb-4">
          Estás a punto de dar de baja el <strong>Lote #{mercancia.id_mercancia}</strong>. 
          Esta acción liberará la ubicación y registrará la salida.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Motivo de la baja (Obligatorio)</label>
            <textarea
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none resize-none"
              rows="3"
              placeholder="Ej: Producto dañado, caducado, error de ingreso..."
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              required
            ></textarea>
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-2 border rounded-lg hover:bg-gray-50 text-gray-700 font-medium">
              Cancelar
            </button>
            <button type="submit" className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium">
              Confirmar Baja
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}