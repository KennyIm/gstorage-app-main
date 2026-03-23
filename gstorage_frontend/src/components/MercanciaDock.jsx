import React from 'react';
import { Package, Truck } from 'lucide-react';

export default function MercanciaDock({ mercancias, onPickUp, selectedItem }) {
  return (
    <div className="position-absolute bottom-0 start-0 w-100 p-3 z-20">
      <div className="bg-white rounded-top shadow-lg border border-gray-200 p-3">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h6 className="m-0 fw-bold text-gray-800 flex items-center gap-2">
            <Truck size={18}/> Muelle de Recepción (Mercancía sin Ubicación)
          </h6>
          <span className="badge bg-secondary">{mercancias.length} Pendientes</span>
        </div>
        
        <div className="d-flex gap-3 overflow-auto pb-2" style={{ scrollbarWidth: 'thin' }}>
          {mercancias.length === 0 && (
            <div className="text-muted small w-100 text-center py-3">
              No hay mercancía pendiente de ubicar.
            </div>
          )}

          {mercancias.map(m => {
            const isSelected = selectedItem?.id_mercancia === m.id_mercancia;
            return (
              <div 
                key={m.id_mercancia}
                onClick={() => onPickUp(m)}
                className={`
                  border rounded p-2 cursor-pointer transition-all flex-shrink-0
                  ${isSelected ? 'bg-indigo-50 border-indigo-500 ring-2 ring-indigo-200' : 'bg-gray-50 border-gray-200 hover:bg-white hover:shadow'}
                `}
                style={{ width: '160px' }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className={`p-1 rounded ${isSelected ? 'bg-indigo-200' : 'bg-gray-200'}`}>
                    <Package size={16} className={isSelected ? 'text-indigo-700' : 'text-gray-600'} />
                  </div>
                  <span className="font-bold text-xs text-gray-700">#{m.id_mercancia}</span>
                </div>
                
                <p className="text-xs font-medium text-gray-900 truncate" title={m.cliente_nombre}>
                  {m.cliente_nombre}
                </p>
                <p className="text-xs text-gray-500 truncate" title={m.descripcion_carga}>
                  {m.descripcion_carga || "Sin descripción"}
                </p>
                
                <div className="mt-2 flex gap-1">
                  <span className="text-[10px] bg-gray-200 px-1 rounded text-gray-600">
                    {m.cantidad_bultos} Bultos
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}