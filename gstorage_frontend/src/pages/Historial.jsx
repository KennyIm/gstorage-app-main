import React, { useState, useEffect } from 'react';
import { useUI } from '../context/UIContext';
import { History, User, Edit, Trash2, Plus, Filter, Search, MapPin, Loader2, ChevronDown, ChevronUp, XCircle } from 'lucide-react';
import apiClient from '../services/api';

export default function HistorialView() {
  document.title = "Historial de cambios - GStorage";
  
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sucursales, setSucursales] = useState([]);
  const [error, setError] = useState(null);
  const [expandedItemId, setExpandedItemId] = useState(null);
  const { showLoader, hideLoader, showToast } = useUI();
  const [nextPageUrl, setNextPageUrl] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterType, setFilterType] = useState('Todos');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (debouncedSearch) params.append('search', debouncedSearch);
        if (filterType !== 'Todos') params.append('accion', filterType);
        if (fechaDesde) params.append('fecha_desde', fechaDesde);
        if (fechaHasta) params.append('fecha_hasta', fechaHasta);

        const [historyRes, sucursalesRes] = await Promise.all([
          apiClient.get(`/api/inventario/historial/?${params.toString()}`),
          apiClient.get('/api/usuarios/sucursales/')
        ]);

        setHistory(historyRes.data.results || historyRes.data);
        setNextPageUrl(historyRes.data.next || null);
        setSucursales(sucursalesRes.data);
      } catch (err) {
        if (err.response && err.response.status === 401) {
          showToast('Sesión caducada, ingresa nuevamente.', 'error');
        } else {
          showToast('Error al filtrar el historial.', 'error');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [debouncedSearch, filterType, fechaDesde, fechaHasta]);

  const loadMore = async () => {
    if (!nextPageUrl) return;
    setLoadingMore(true);
    try {
      const response = await apiClient.get(nextPageUrl);
      setHistory(prevHistory => [...prevHistory, ...(response.data.results || [])]);
      setNextPageUrl(response.data.next || null);
    } catch (err) {
      console.error("Error al cargar más historial:", err);
    } finally {
      setLoadingMore(false);
    }
  };

  const limpiarFiltros = () => {
    setSearchTerm('');
    setFilterType('Todos');
    setFechaDesde('');
    setFechaHasta('');
    setExpandedItemId(null);
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

  const renderDetalles = (item) => {
    const detallesRaw = item.detalles || item.datos_json || item.cambios;

    if (!detallesRaw) {
      return <p className="text-sm text-gray-500 italic mt-2">No hay datos técnicos registrados para este movimiento.</p>;
    }

    let datos = detallesRaw;
    if (typeof detallesRaw === 'string') {
      try { datos = JSON.parse(detallesRaw); } catch (e) { return <p className="text-sm text-gray-700 mt-2">{detallesRaw}</p>; }
    }
    if (datos.es_diff) {
      const cambios = datos.cambios || {};
      if (Object.keys(cambios).length === 0) {
        return <p className="text-sm text-gray-500 italic mt-2">Se registró la acción, pero no hubo cambios en los datos técnicos.</p>;
      }

      return (
        <div className="mt-4 bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-amber-50 px-4 py-2 border-b border-gray-200">
            <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider">Cambios Realizados</h4>
          </div>
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            {Object.entries(cambios).map(([key, valores]) => {
              const oldVal = valores.viejo === null || valores.viejo === undefined ? '-' : String(valores.viejo);
              const newVal = valores.nuevo === null || valores.nuevo === undefined ? '-' : String(valores.nuevo);
              
              return (
                <div key={key} className="flex flex-col border-b border-gray-100 pb-2 mb-1">
                  <span className="text-xs font-bold text-slate-700 capitalize mb-1">{key.replace(/_/g, ' ')}</span>
                  <div className="flex flex-col gap-0.5 text-xs bg-slate-50 p-2 rounded border border-slate-100">
                    <span className="line-through text-red-500 font-medium">De: {oldVal}</span>
                    <span className="text-emerald-600 font-bold">A: {newVal}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return (
      <div className="mt-4 bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-slate-50 px-4 py-2 border-b border-gray-200">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Datos Registrados</h4>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
          {Object.entries(datos).map(([key, value]) => {
            const valFormateado = value === null || value === undefined ? '-' : typeof value === 'object' ? JSON.stringify(value) : String(value);
            return (
              <div key={key} className="flex flex-col border-b border-gray-100 pb-1 last:border-0">
                <span className="text-xs font-medium text-gray-500 capitalize">{key.replace(/_/g, ' ')}</span>
                <span className="font-semibold text-gray-800 truncate">{valFormateado}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (error) return <div className="alert alert-danger m-8 text-red-600">{error}</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">

        {/* --- PANEL DE FILTROS SUPERIOR --- */}
        <div className="flex flex-col gap-4 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <History className="w-6 h-6 text-indigo-600" />
              <h2 className="text-xl font-semibold text-gray-900">Auditoría de Movimientos</h2>
              {loading && <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />}
            </div>
            
            {/* Buscador General */}
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por descripción, usuario..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500 w-full sm:w-80"
              />
            </div>
          </div>

          {/* Fila de Filtros Avanzados */}
          <div className="flex flex-wrap items-end gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tipo de Acción</label>
              <select 
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="text-sm border border-gray-300 rounded-md focus:ring-indigo-500 py-1.5 px-3 bg-white"
              >
                {['Todos', 'Creación', 'Edición', 'Eliminación', 'Reubicación'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Desde Fecha</label>
              <input 
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="text-sm border border-gray-300 rounded-md focus:ring-indigo-500 py-1.5 px-3 bg-white"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Hasta Fecha</label>
              <input 
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="text-sm border border-gray-300 rounded-md focus:ring-indigo-500 py-1.5 px-3 bg-white"
              />
            </div>
            {(fechaDesde || fechaHasta || filterType !== 'Todos' || searchTerm) && (
              <button 
                onClick={limpiarFiltros}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-red-600 transition-colors ml-auto pb-2"
              >
                <XCircle className="w-4 h-4" />
                Limpiar Filtros
              </button>
            )}
          </div>
        </div>
        <div className="space-y-6 pl-2">
          {history.length === 0 && !loading ? (
            <div className="text-center py-12 bg-slate-50 rounded-lg border border-dashed border-slate-300">
               <History className="w-8 h-8 text-slate-300 mx-auto mb-3" />
               <p className="text-slate-500 font-medium">No se encontraron movimientos con los filtros actuales.</p>
            </div>
          ) : (
            history.map((item, index) => {
              const actionType = item.accion || item.tipo_movimiento;
              const style = getStyleForAction(actionType);
              const Icon = style.icon;
              const isExpanded = expandedItemId === item.id_historial;

              return (
                <div key={item.id_historial} className="relative pl-4">
                  {index !== history.length - 1 && (
                    <div className="absolute left-[1.6rem] top-12 bottom-[-1.5rem] w-0.5 bg-gray-200"></div>
                  )}

                  <div className="flex gap-4">
                    <div className={`w-12 h-12 ${style.bg} rounded-full flex items-center justify-center flex-shrink-0 shadow-sm z-10 relative border-2 border-white`}>
                      <Icon className={`w-5 h-5 ${style.color}`} />
                    </div>

                    <div 
                      className={`flex-1 rounded-xl p-4 border transition-all duration-200 cursor-pointer ${isExpanded ? 'bg-white border-indigo-200 shadow-md ring-1 ring-indigo-50' : 'bg-white border-gray-100 hover:shadow-sm hover:border-gray-200 shadow-sm'}`}
                      onClick={() => setExpandedItemId(isExpanded ? null : item.id_historial)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex gap-2 items-center flex-wrap">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${style.bg} ${style.color}`}>
                            {actionType}
                          </span>
                          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {item.modelo_afectado || 'Sistema'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <p className="text-xs font-medium text-slate-400">
                            {new Date(item.fecha_hora_movimiento).toLocaleString('es-CL')}
                          </p>
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                        </div>
                      </div>

                      <p className="text-slate-800 mb-3 text-sm">
                        {item.descripcion_adicional || "Sin descripción detallada."}
                      </p>

                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                          <User className="w-3.5 h-3.5" />
                          <span className="font-medium">{item.usuario_nombre || 'Sistema'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-indigo-600 text-xs font-semibold">
                          <MapPin className="w-3.5 h-3.5" />
                          <span>{getNombreSucursal(item.sucursal || item.sucursal_id)}</span>
                        </div>
                      </div>
                      <div className={`grid transition-all duration-300 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100 mt-4' : 'grid-rows-[0fr] opacity-0'}`}>
                        <div className="overflow-hidden">
                           <div className="pt-4 border-t border-gray-100" onClick={(e) => e.stopPropagation()}>
                              {renderDetalles(item)}
                           </div>
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* --- CARGAR MÁS --- */}
        {nextPageUrl && (
          <div className="mt-8 flex justify-center pt-4 border-t border-gray-100">
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="flex items-center gap-2 px-6 py-2 bg-white border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
            >
              {loadingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : <History className="w-4 h-4" />}
              {loadingMore ? 'Cargando...' : 'Cargar movimientos anteriores'}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}