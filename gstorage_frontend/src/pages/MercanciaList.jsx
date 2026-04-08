import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../services/api';
import Select from 'react-select';
import {
  Search, Filter, Package, Plus, Eye, Trash2, Truck, Check, X, FileText,
  ChevronLeft, ChevronRight, ArrowLeft
} from 'lucide-react';
import MermaModal from '../components/MermaModal';

export default function MercanciaList() {
  document.title = "Listado de Mercancias";
  const [mercancias, setMercancias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [despachos, setDespachos] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [rutas, setRutas] = useState([]);

  // --- SELECCIÓN MASIVA ---
  const [selectedIds, setSelectedIds] = useState([]); 
  const [bulkDispatchId, setBulkDispatchId] = useState('');

  const [mermaTarget, setMermaTarget] = useState(null);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [statusFilter, setStatusFilter] = useState('TODOS');
  const filterRef = useRef(null);

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 15;
  const customSelectStyles = {
    control: (base) => ({
      ...base,
      backgroundColor: '#1e293b',
      borderColor: '#475569',
      color: 'white',
      minWidth: '250px',
    }),
    menu: (base) => ({
      ...base,
      backgroundColor: '#1e293b',
      zIndex: 9999
    }),
    option: (base, { isFocused, isSelected }) => ({
      ...base,
      backgroundColor: isSelected ? '#991b1b' : isFocused ? '#334155' : '#1e293b',
      color: 'white',
      fontSize: '0.875rem',
      cursor: 'pointer',
    }),
    singleValue: (base) => ({
      ...base,
      color: 'white',
      fontSize: '0.875rem',
    }),
    input: (base) => ({
      ...base,
      color: 'white',
    }),
    placeholder: (base) => ({
      ...base,
      color: '#94a3b8',
    }),
  };

  const fetchData = useCallback(async () => {
    try {
      const [mercRes, despRes, sucurRes, rutasRes] = await Promise.all([
        apiClient.get('/api/inventario/mercancias/'),
        apiClient.get('/api/inventario/despachos/'),
        apiClient.get('/api/usuarios/sucursales/'),
        apiClient.get('/api/inventario/rutas/')
      ]);
      setMercancias(mercRes.data);
      setDespachos(despRes.data);
      setSucursales(sucurRes.data);
      setRutas(rutasRes);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  // --- LÓGICA DE SELECCIÓN ---
  const toggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === paginatedItems.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedItems.map(item => item.id_mercancia));
    }
  };

  const handleBulkAssign = async () => {
    if (!bulkDispatchId) return alert("Selecciona un despacho primero.");

    try {
      await apiClient.post('/api/inventario/mercancias/asignar_masivo/', {
        ids: selectedIds,
        id_despacho: bulkDispatchId
      });
      fetchData();
      setSelectedIds([]);
      setBulkDispatchId('');
      alert(`Éxito: ${selectedIds.length} mercancías asignadas al Despacho #${bulkDispatchId}`);
    } catch (err) {
      alert("Error al realizar la asignación masiva. Verifica los estados de las mercancías.");
    }
  };

  // --- FILTRADO Y PAGINACIÓN ---
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

  if (loading) return <div className="p-8 text-center">Cargando inventario...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative">

      {/* --- BARRA DE ACCIONES MASIVAS (FLOTANTE) --- */}
      {selectedIds.length > 0 && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-10 duration-300">
          <div className="bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex flex-wrap items-center gap-6 border border-slate-700">
            <div className="flex items-center gap-2">
              <div className="bg-red-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
                {selectedIds.length}
              </div>
              <span className="text-sm font-medium">Mercancías seleccionadas</span>
            </div>

            <div className="h-8 w-px bg-slate-700 hidden sm:block"></div>

            <div className="flex items-center gap-3">
              <Select
                styles={customSelectStyles}
                placeholder="Buscar despacho o ruta..."
                noOptionsMessage={() => "No se encontraron resultados"}
                isClearable
                options={despachos.map(d => ({
                  value: d.id_despacho,
                  label: `Despacho #${d.id_despacho} | Ruta: ${d.id_ruta || 'S/N'}`
                }))}
                value={bulkDispatchId ? {
                  value: bulkDispatchId,
                  label: `Despacho #${bulkDispatchId} | ${despachos.find(d => d.id_despacho === bulkDispatchId)?.id_ruta || 'S/N'}`
                } : null}
                onChange={(opt) => setBulkDispatchId(opt ? opt.value : '')}
              />

              <button
                onClick={handleBulkAssign}
                disabled={!bulkDispatchId}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition flex items-center gap-2 ${!bulkDispatchId ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 text-white'
                  }`}
              >
                <Check className="w-4 h-4" /> Ejecutar
              </button>
            </div>

            <button
              onClick={() => setSelectedIds([])}
              className="text-slate-400 hover:text-white text-xs font-medium"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Visualización de Mercancía</h1>
        <p className="text-gray-600">Selecciona múltiples ítems para asignarlos rápidamente a un despacho</p>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6 mb-6 border border-gray-100">
        {/* BARRA SUPERIOR IGUAL ... */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <Link to="/" className="p-2.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500 transition shadow-sm">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-800 outline-none transition"
            />
          </div>
          {/* Botones de filtro y nueva mercancía ... */}
          <Link to="/mercancias/nueva" className="flex items-center gap-2 px-4 py-2.5 bg-red-800 text-white rounded-lg hover:bg-red-900 transition font-medium shadow-sm">
            <Plus className="w-4 h-4" /> Nueva Mercancía
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                {/* CHECKBOX PARA SELECCIONAR TODO */}
                <th className="py-4 px-4 text-left">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded text-red-800 focus:ring-red-800 cursor-pointer"
                    checked={selectedIds.length === paginatedItems.length && paginatedItems.length > 0}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-gray-600">Código</th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-gray-600">Cliente</th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-gray-600">Suc</th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-gray-600">Proveedor</th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-gray-600">Valor</th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-gray-600">Despacho Actual</th>
                <th className="text-center py-4 px-4 text-sm font-semibold text-gray-600">Estado</th>
                <th className="text-right py-4 px-4 text-sm font-semibold text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedItems.map((item) => {
                const sucursalObj = sucursales.find(s => s.id === item.sucursal_id);
                const iniciales = sucursalObj ? sucursalObj.ciudad.substring(0, 3).toUpperCase() : '---';
                const isSelected = selectedIds.includes(item.id_mercancia);

                return (
                  <tr key={item.id_mercancia} className={`transition group ${isSelected ? 'bg-red-50' : 'hover:bg-gray-50'}`}>
                    {/* CHECKBOX INDIVIDUAL */}
                    <td className="py-4 px-4">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded text-red-800 focus:ring-red-800 cursor-pointer"
                        checked={isSelected}
                        onChange={() => toggleSelect(item.id_mercancia)}
                      />
                    </td>

                    <td className="py-4 px-4 font-bold text-gray-900">{item.codigo_interno}</td>

                    <td className="py-4 px-4">
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
                    </td>

                    <td className="py-4 px-4 font-bold text-green-700">{iniciales}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-bold text-blue-700 px-2 py-1">
                        {item.id_proveedor}
                      </span>
                    </td>

                    <td className="py-4 px-4">
                      <span className="text-sm font-bold text-emerald-700">${parseFloat(item.precio_total || 0).toLocaleString('es-CL')}</span>
                    </td>

                    <td className="py-4 px-4 text-center">
                      {item.id_despacho ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded border border-blue-100 text-xs font-bold">
                          <Truck className="w-3 h-3" /> #{item.id_despacho}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs italic">Sin asignar</span>
                      )}
                    </td>

                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center justify-center whitespace-nowrap px-3 py-1 rounded-full text-xs font-bold min-w-[100px] ${item.estado === 'En Bodega' ? 'bg-blue-100 text-blue-700' :
                        item.estado === 'Merma' ? 'bg-red-100 text-red-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                        {item.estado}
                      </span>
                    </td>

                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link to={`/mercancias/${item.id_mercancia}`} className="p-2 text-gray-400 hover:text-red-800 transition"><Eye size={18} /></Link>
                        <button onClick={() => setMermaTarget(item)} className="p-2 text-gray-400 hover:text-red-600 transition"><Trash2 size={18} /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        <div className="mt-6 flex justify-between items-center border-t pt-6">
          <p className="text-sm text-gray-600">Mostrando {startIndex + 1} de {filteredItems.length}</p>
          <div className="flex gap-2">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 border rounded-lg disabled:opacity-50"><ChevronLeft size={20} /></button>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2 border rounded-lg disabled:opacity-50"><ChevronRight size={20} /></button>
          </div>
        </div>
      </div>

      {mermaTarget && (
        <MermaModal mercancia={mermaTarget} onClose={() => setMermaTarget(null)} onConfirm={handleMermaConfirm} />
      )}
    </div>
  );
}