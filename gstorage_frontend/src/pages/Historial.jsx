import React, { useState, useEffect } from 'react';
import { useUI } from '../context/UIContext';
import { History, User, Edit, Trash2, Plus, Filter, Search, MapPin, Loader2 } from 'lucide-react';
import apiClient from '../services/api';

export default function HistorialView() {
  document.title = "Historial de cambios - GStorage";
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sucursales, setSucursales] = useState([]);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('Todos');
  const [showFilters, setShowFilters] = useState(false);
  const { showLoader, hideLoader, showToast } = useUI();

  const [nextPageUrl, setNextPageUrl] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [historyRes, sucursalesRes] = await Promise.all([
          apiClient.get('/api/inventario/historial/'),
          apiClient.get('/api/usuarios/sucursales/')
        ]);

        setHistory(historyRes.data.results || historyRes.data);
        setNextPageUrl(historyRes.data.next || null);
        setSucursales(sucursalesRes.data);
        setLoading(false);
      } catch (err) {
        if (err.response) {

          if (err.response.status === 403) {
            const mensajePermiso = err.response.data.detail || 'No tienes permisos para realizar esta acción.';
            showToast(mensajePermiso, 'error');
          } else if (err.response.status === 401) {
            showToast('Sesión caducada, ingresa nuevamente.', 'error');
          } else {
            showToast('No se pudo cargar el historial.', 'error');
            console.error(err);
          }

        } else {
          showToast('Error de conexión con el servidor.', 'error');
        }
      }
    };
    fetchData();
  }, []);

  const loadMore = async () => {
    if (!nextPageUrl) return;
    setLoadingMore(true);
    try {
      const response = await apiClient.get(nextPageUrl);
      setHistory(prevHistory => [...prevHistory, ...(response.data.results || [])]);
      setNextPageUrl(response.data.next || null);
      setLoadingMore(false);
    } catch (err) {
      console.error("Error al cargar más historial:", err);
      setLoadingMore(false);
    }
  };

  const getNombreSucursal = (id) => {
    if (!id) return 'General / Sin Sucursal';
    const sucursal = sucursales.find(s => String(s.id) === String(id));
    return sucursal ? sucursal.nombre : `Suc. ${id}`;
  };

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

  const filteredHistory = history.filter(item => {
    const term = searchTerm.toLowerCase();
    const textoFila = `
      ${item.descripcion_adicional || ''} 
      ${item.usuario_nombre || ''} 
      ${item.modelo_afectado || ''} 
      ${item.accion || item.tipo_movimiento || ''} 
      ${getNombreSucursal(item.sucursal || item.sucursal_id)}
    `.toLowerCase();
    const matchesSearch = !searchTerm || textoFila.includes(term);

    const actionType = item.accion || item.tipo_movimiento;
    const style = getStyleForAction(actionType);
    const matchesFilter = filterType === 'Todos' || style.label === filterType;

    return matchesSearch && matchesFilter;
  });

  if (loading) return <div className="p-8 text-center flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>;
  if (error) return <div className="alert alert-danger m-8 text-red-600">{error}</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">


      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <History className="w-6 h-6 text-indigo-600" />
            <h2 className="text-xl font-semibold text-gray-900">Actividad Reciente</h2>
          </div>

          <div className="flex items-center gap-3 relative">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar registro..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500 w-full sm:w-64"
              />
            </div>

            <div className="relative">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition text-sm font-medium ${filterType !== 'Todos' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
              >
                <Filter className="w-4 h-4" />
                {filterType === 'Todos' ? 'Filtrar' : filterType}
              </button>

              {showFilters && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-100 rounded-lg shadow-lg z-20 py-1">
                  {['Todos', 'Creación', 'Movimiento', 'Edición', 'Eliminación'].map(type => (
                    <button
                      key={type}
                      onClick={() => {
                        setFilterType(type);
                        setShowFilters(false);
                      }}
                      className={`block w-full text-left px-4 py-2 text-sm transition-colors ${filterType === type ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-gray-700 hover:bg-gray-50'}`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>

        <div className="space-y-6 pl-2">
          {filteredHistory.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No hay actividad registrada o no coincide con los filtros actuales.</p>
          ) : (
            filteredHistory.map((item, index) => {
              const actionType = item.accion || item.tipo_movimiento;
              const style = getStyleForAction(actionType);
              const Icon = style.icon;

              return (
                <div key={item.id_historial} className="relative pl-4">
                  {index !== filteredHistory.length - 1 && (
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

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-gray-500 text-xs">
                          <User className="w-3 h-3" />
                          <span className="font-medium">{item.usuario_nombre || 'Sistema'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-indigo-600 text-xs font-semibold">
                          <MapPin className="w-3.5 h-3.5" />
                          <span>{getNombreSucursal(item.sucursal || item.sucursal_id)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {nextPageUrl && !searchTerm && filterType === 'Todos' && (
          <div className="mt-8 flex justify-center pt-4 border-t border-gray-100">
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="flex items-center gap-2 px-6 py-2 bg-white border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
            >
              {loadingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : <History className="w-4 h-4" />}
              {loadingMore ? 'Cargando más movimientos...' : 'Cargar historial anterior'}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}