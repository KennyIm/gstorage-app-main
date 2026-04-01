import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../services/api';
import { Search, Filter, Package, Plus, Eye, Trash2, Truck, MapPin, Check, X, FileText,
  ChevronLeft, ChevronRight
 } from 'lucide-react';
import MermaModal from '../components/MermaModal';

export default function MercanciaList() {
  const [mercancias, setMercancias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [despachos, setDespachos] = useState([]);
  const [ubicaciones, setUbicaciones] = useState([]);
  const [sucursales, setSucursales] = useState([]);

  const [mermaTarget, setMermaTarget] = useState(null);

  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [statusFilter, setStatusFilter] = useState('TODOS');
  const filterRef = useRef(null);

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 15;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setShowFilterMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [mercRes, despRes, ubicRes, sucurRes] = await Promise.all([
          apiClient.get('/api/inventario/mercancias/'),
          apiClient.get('/api/inventario/despachos/'),
          apiClient.get('/api/inventario/ubicaciones/'),
          apiClient.get('/api/usuarios/sucursales/')
        ]);
        setMercancias(mercRes.data);
        setDespachos(despRes.data);
        setUbicaciones(ubicRes.data);
        setSucursales(sucurRes.data);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleQuickUpdate = async (id, field, value) => {
    const originalData = [...mercancias];
    setMercancias(prev => prev.map(m =>
      m.id_mercancia === id ? { ...m, [field]: value } : m
    ));

    try {
      await apiClient.patch(`/api/inventario/mercancias/${id}/`, {
        [field]: value || null
      });
      const res = await apiClient.get('/api/inventario/mercancias/');
      setMercancias(res.data);

    } catch (err) {
      alert("Error al actualizar. Verifica que la ubicación no esté ocupada por otro lote.");
      setMercancias(originalData);
    }
  };

  const handleMermaConfirm = async (id, motivo) => {
    try {
      await apiClient.patch(`/api/inventario/mercancias/${id}/`, {
        motivo_baja: motivo,
        estado: 'Merma'
      });
      const res = await apiClient.get('/api/inventario/mercancias/');
      setMercancias(res.data);

      setMermaTarget(null);
    } catch (err) {
      alert("Error al registrar la baja.");
    }
  };

  const filteredItems = mercancias.filter(item => {
    if (!item) return false;
    const term = searchTerm.toLowerCase();
    const matchesSearch = 
      (item.cliente_nombre?.toLowerCase() || '').includes(term) || 
      (item.descripcion_carga?.toLowerCase() || '').includes(term) || 
      (String(item.codigo_interno || '')).includes(term) || 
      (item.factura?.toLowerCase() || '').includes(term);
    
    const matchesStatus = statusFilter === 'TODOS' || item.estado === statusFilter;
    return matchesSearch && matchesStatus;
  });



  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedItems = filteredItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  const filterOptions = ['TODOS', 'En Bodega', 'Asignado', 'En Tránsito', 'Entregado', 'Merma'];

  if (loading) return <div className="p-8 text-center">Cargando inventario...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Visualización de Mercancía</h1>
        <p className="text-gray-600">Gestiona y consulta el inventario completo del almacén</p>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6 mb-6 border border-gray-100">
        {/* BARRA SUPERIOR */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">

          {/* Buscador */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por ID, cliente o descripción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"
            />
          </div>
          <div className="relative" ref={filterRef}>
            <button
              onClick={() => setShowFilterMenu(!showFilterMenu)}
              className={`flex items-center gap-2 px-4 py-2.5 border rounded-lg transition font-medium ${statusFilter !== 'TODOS'
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                : 'border-gray-300 hover:bg-gray-50 text-gray-700'
                }`}
            >
              <Filter className="w-4 h-4" />
              {statusFilter === 'TODOS' ? 'Filtros' : statusFilter}
              {statusFilter !== 'TODOS' && (
                <X
                  className="w-3 h-3 ml-1 p-0.5 bg-indigo-200 rounded-full hover:bg-indigo-300 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setStatusFilter('TODOS');
                  }}
                />
              )}
            </button>

            {/* Dropdown Menu */}
            {showFilterMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50 animate-in fade-in zoom-in duration-200">
                <div className="px-4 py-2 border-b border-gray-50">
                  <span className="text-xs font-semibold text-gray-500 uppercase">Filtrar por Estado</span>
                </div>
                {filterOptions.map(option => (
                  <button
                    key={option}
                    onClick={() => {
                      setStatusFilter(option);
                      setShowFilterMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center justify-between"
                  >
                    {option === 'TODOS' ? 'Todos los estados' : option}
                    {statusFilter === option && <Check className="w-4 h-4 text-indigo-600" />}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Link to="/mercancias/nueva" className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium shadow-sm">
            <Plus className="w-4 h-4" />
            Nueva Mercancía
          </Link>
        </div>

        {/* TABLA */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left py-4 px-4 text-sm font-semibold text-gray-600">Código</th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-gray-600">Cliente / Descripción</th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-gray-600">Suc</th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-gray-600">RUT del Proveedor</th>
                {/*<th className="text-left py-4 px-4 text-sm font-semibold text-gray-600">Ubicación</th>*/}
                <th className="text-left py-4 px-4 text-sm font-semibold text-gray-600">Valor</th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-gray-600">Despacho</th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-gray-600">Estado</th>
                <th className="text-right py-4 px-4 text-sm font-semibold text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedItems.map((item) => {
                const sucursalObj = sucursales.find(s => s.id === item.sucursal_id);
                const nombreLugar = sucursalObj ? sucursalObj.ciudad : 'Sin Asignar';
                const iniciales = sucursalObj ? nombreLugar.substring(0, 3).toUpperCase() : '---';
                return (
                  <tr key={item.id_mercancia} className="hover:bg-gray-50 transition group">

                    <td className="py-4 px-4 font-medium text-gray-900 text-[15px]">{item.codigo_interno}</td>

                    <td className="py-4 px-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600 mt-1">
                          <Package className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col">
                          <p className="font-semibold text-gray-900">{item.cliente_nombre}</p>

                          {/* Descripción y Factura */}
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs text-gray-500 line-clamp-1 max-w-[200px]" title={item.descripcion_carga}>
                              {item.descripcion_carga || 'Sin descripción'}
                            </span>

                            {/* Factura */}
                            {item.factura && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                <FileText className="w-3 h-3" /> {item.factura}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Ubicación (Editable) 
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <select 
                        className="bg-transparent border border-gray-200 rounded text-sm text-gray-700 font-medium focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer hover:text-indigo-600 w-full max-w-[140px]"
                        value={item.id_ubicacion_actual || ''} 
                        onChange={(e) => handleQuickUpdate(item.id_mercancia, 'id_ubicacion_actual', e.target.value)}
                      >
                        <option value="">Sin Ubicación</option>
                        {ubicaciones.map(u => (
                           <option key={u.id_ubicacion} value={u.id_ubicacion}>
                             {u.codigo_ubicacion}
                           </option>
                        ))}
                      </select>
                    </div>
                  </td>
                  */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-bold text-green-700 px-2 py-1">
                        {sucursalObj ? `${iniciales}` : 'Sin Asignar'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-bold text-blue-700 px-2 py-1">
                        {item.id_proveedor}
                      </span>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                        ${parseFloat(item.precio_total || 0).toLocaleString('es-CL')}
                      </span>
                    </td>

                    {/* Despacho (Editable) */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <select
                          className="bg-transparent border border-gray-200 rounded text-sm text-gray-700 font-medium focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer hover:text-indigo-600 w-full max-w-[160px]"
                          value={item.id_despacho || ''}
                          onChange={(e) => handleQuickUpdate(item.id_mercancia, 'id_despacho', e.target.value)}
                        >
                          <option value="">Sin Asignar</option>
                          {despachos.map(d => (
                            <option key={d.id_despacho} value={d.id_despacho}>
                              Despacho #{d.id_despacho}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${item.estado === 'En Bodega' ? 'bg-blue-100 text-blue-700' :
                        item.estado === 'Asignado' ? 'bg-amber-100 text-amber-700' :
                          item.estado === 'Merma' ? 'bg-red-100 text-red-700 border border-red-200' : // <-- ROJO PARA MERMA
                            'bg-green-100 text-green-700'
                        }`}>
                        {item.estado}
                      </span>
                    </td>

                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/mercancias/${item.id_mercancia}`}
                          className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                          title="Ver Detalle"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>

                        <button
                          onClick={() => setMermaTarget(item)}
                          className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Dar de Baja"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          </div>
        {filteredItems.length > 0 && (
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-100 pt-6">
            <p className="text-sm text-gray-600">
              Mostrando <span className="font-semibold">{startIndex + 1}</span> a{' '}
              <span className="font-semibold">
                {Math.min(startIndex + ITEMS_PER_PAGE, filteredItems.length)}
              </span> de{' '}
              <span className="font-semibold">{filteredItems.length}</span> mercancías
            </p>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-1">
                {[...Array(totalPages)].map((_, i) => {
                   if (totalPages > 5 && Math.abs(currentPage - (i + 1)) > 2) return null;
                   return (
                    <button
                      key={i + 1}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`w-10 h-10 rounded-lg text-sm font-medium transition ${
                        currentPage === i + 1
                          ? 'bg-indigo-600 text-white'
                          : 'text-gray-600 hover:bg-indigo-50'
                      }`}
                    >
                      {i + 1}
                    </button>
                   );
                })}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {filteredItems.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No se encontraron mercancías.
          </div>
        )}
      </div>

      {mermaTarget && (
        <MermaModal
          mercancia={mermaTarget}
          onClose={() => setMermaTarget(null)}
          onConfirm={handleMermaConfirm}
        />
      )}
    </div>
  );
}