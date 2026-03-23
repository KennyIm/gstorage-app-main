import React, { useState, useEffect } from 'react';
import { History, User, Package, Edit, Trash2, Plus, Filter } from 'lucide-react';
import apiClient from '../services/api';

export default function HistorialView() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await apiClient.get('/api/inventario/historial/');
        setHistory(response.data);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setError('No se pudo cargar el historial.');
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const getStyleForAction = (accion) => {
    const act = accion?.toLowerCase() || '';
    
    if (act.includes('creación') || act.includes('creacion')) 
        return { icon: Plus, color: 'text-green-600', bg: 'bg-green-100', label: 'Creación' };
    
    if (act.includes('edición') || act.includes('edicion') || act.includes('modificación')) 
        return { icon: Edit, color: 'text-blue-600', bg: 'bg-blue-100', label: 'Edición' };
    
    if (act.includes('eliminación') || act.includes('eliminacion') || act.includes('borrado')) 
        return { icon: Trash2, color: 'text-red-600', bg: 'bg-red-100', label: 'Eliminación' };
        
    return { icon: History, color: 'text-gray-600', bg: 'bg-gray-100', label: 'Movimiento' };
};

  if (loading) return <div className="p-8 text-center">Cargando historial...</div>;
  if (error) return <div className="alert alert-danger m-8">{error}</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Historial de Cambios</h1>
        <p className="text-gray-600">Registro completo de todas las modificaciones realizadas en el sistema</p>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <History className="w-6 h-6 text-indigo-600" />
            <h2 className="text-xl font-semibold text-gray-900">Actividad Reciente</h2>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm font-medium text-gray-700">
            <Filter className="w-4 h-4" />
            Filtrar
          </button>
        </div>

        <div className="space-y-6 pl-2">
          {history.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No hay actividad registrada.</p>
          ) : (
            history.map((item, index) => {
              const actionType = item.accion || item.tipo_movimiento;
              const style = getStyleForAction(actionType);
              const Icon = style.icon;
              
              return (
                <div key={item.id_historial} className="relative pl-4">
                  {index !== history.length - 1 && (
                    <div className="absolute left-[1.6rem] top-12 bottom-[-1.5rem] w-0.5 bg-gray-200"></div>
                  )}
                  
                  <div className="flex gap-4">
                    <div className={`w-12 h-12 ${style.bg} rounded-full flex items-center justify-center flex-shrink-0 shadow-sm z-10 relative`}>
                      <Icon className={`w-5 h-5 ${style.color}`} />
                    </div>
                    
                    <div className="flex-1 bg-gray-50 rounded-xl p-4 border border-gray-100 hover:shadow-sm transition">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex gap-2 items-center">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${style.bg} ${style.color}`}>
                            {style.label}
                          </span>
                          <span className="text-xs font-medium text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-200">
                            {item.modelo_afectado || 'Sistema'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400">
                          {new Date(item.fecha_hora_movimiento).toLocaleString('es-CL')}
                        </p>
                      </div>
                      
                      <p className="text-gray-900 mb-3 text-sm">
                        {item.descripcion_adicional || "Sin descripción detallada."}
                      </p>
                      
                      <div className="flex items-center gap-2 text-gray-500 text-xs">
                        <User className="w-3 h-3" />
                        <span className="font-medium">{item.usuario_nombre || 'Sistema'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}