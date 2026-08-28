import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import apiClient from '../services/api'
import Select from 'react-select'
import {
  Search, Filter, Package, Plus, Eye, Trash2, Truck, Check, X, FileText,
  ChevronLeft, ChevronRight, ArrowLeft, Share2
} from 'lucide-react'
import MermaModal from '../components/MermaModal'
import { useUI } from '../context/UIContext'

export default function MercanciaList() {
  document.title = "Listado de Mercancias - GStorage"
  const [mercancias, setMercancias] = useState([])
  const { showLoader, hideLoader, showToast } = useUI()
  const [despachos, setDespachos] = useState([])
  const [proveedores, setProveedores] = useState([])
  const [sucursales, setSucursales] = useState([])
  const [rutas, setRutas] = useState([])
  const [clientes, setClientes] = useState([])

  const [totalItems, setTotalItems] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [mostrarFiltros, setMostrarFiltros] = useState(false)
  const [showFilterMenu, setShowFilterMenu] = useState(false)
  const filterRef = useRef(null)

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('TODOS')
  const [filtros, setFiltros] = useState({
    cliente: '',
    estado: 'TODOS',
    fechaDesde: '',
    fechaHasta: '',
    codigoInterno: '',
    destino: '',
    despacho: '',
    factura: '',
    proveedor: '',
    verCompartidos: false // 👈 Estado de filtro para compartidos
  })
  const [selectedIds, setSelectedIds] = useState([])
  const [bulkDispatchId, setBulkDispatchId] = useState('')
  const [mermaTarget, setMermaTarget] = useState(null)

  const customSelectStyles = {
    control: (base) => ({ ...base, backgroundColor: '#1e293b', borderColor: '#475569', color: 'white', minWidth: '250px' }),
    menu: (base) => ({ ...base, backgroundColor: '#1e293b', zIndex: 9999 }),
    option: (base, { isFocused, isSelected }) => ({ ...base, backgroundColor: isSelected ? '#991b1b' : isFocused ? '#334155' : '#1e293b', color: 'white', fontSize: '0.875rem', cursor: 'pointer' }),
    singleValue: (base) => ({ ...base, color: 'white', fontSize: '0.875rem' }),
    input: (base) => ({ ...base, color: 'white' }),
    placeholder: (base) => ({ ...base, color: '#94a3b8' }),
  }

  const handleFiltroChange = (e) => {
    const { name, value } = e.target
    setFiltros(prev => ({ ...prev, [name]: value }))
    setCurrentPage(1)
  }

  useEffect(() => {
    const cargarCatalogosEstaticos = async () => {
      try {
        const [despRes, sucurRes, rutasRes, provRes, clientesRes] = await Promise.all([
          apiClient.get('/api/inventario/despachos/'),
          apiClient.get('/api/usuarios/sucursales/'),
          apiClient.get('/api/inventario/rutas/'),
          apiClient.get('/api/inventario/proveedores/'),
          apiClient.get('/api/inventario/clientes/')
        ]);
        setDespachos(despRes.data);
        setSucursales(sucurRes.data);
        setRutas(rutasRes.data);
        setProveedores(provRes.data);
        setClientes(clientesRes.data.results || clientesRes.data)
      } catch (err) {
        console.error("Error al cargar catálogos estáticos:", err)
      }
    }
    cargarCatalogosEstaticos();
  }, [])

  const fetchData = useCallback(async () => {
    if (typeof showLoader === 'function') showLoader()

    try {
      const mercanciasParams = new URLSearchParams({
        page: currentPage || 1,
        page_size: 100,
      })

      if (searchTerm) mercanciasParams.append('search', searchTerm)

      const estadoReal = filtros.estado !== 'TODOS' ? filtros.estado : statusFilter
      if (estadoReal && estadoReal !== 'TODOS') mercanciasParams.append('estado', estadoReal)

      if (filtros.cliente) mercanciasParams.append('cliente', filtros.cliente)
      if (filtros.codigoInterno) mercanciasParams.append('codigo_interno', filtros.codigoInterno)
      if (filtros.destino) mercanciasParams.append('destino', filtros.destino)
      if (filtros.factura) mercanciasParams.append('factura', filtros.factura)
      if (filtros.despacho) mercanciasParams.append('despacho', filtros.despacho)
      if (filtros.fechaDesde) mercanciasParams.append('fechaDesde', filtros.fechaDesde)
      if (filtros.fechaHasta) mercanciasParams.append('fechaHasta', filtros.fechaHasta)
      if (filtros.proveedor) mercanciasParams.append('proveedor', filtros.proveedor)

      mercanciasParams.append('ver_compartidos', filtros.verCompartidos ? 'true' : 'false')

      const mercRes = await apiClient.get(`/api/inventario/mercancias/?${mercanciasParams.toString()}`)
      setMercancias(mercRes.data.results || mercRes.data)
      setTotalItems(mercRes.data.count || 0)

    } catch (err) {
      console.error("Error al cargar mercancías:", err)
      if (typeof showToast === 'function') showToast('No se pudieron cargar las mercancías.', 'error')
    } finally {
      if (typeof hideLoader === 'function') hideLoader()
    }
  }, [currentPage, searchTerm, statusFilter, filtros])

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchData();
    }, 450);

    return () => clearTimeout(delayDebounceFn);
  }, [fetchData]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchTerm, statusFilter, filtros.cliente, filtros.estado,
    filtros.codigoInterno, filtros.destino, filtros.factura,
    filtros.proveedor, filtros.despacho, filtros.fechaDesde, filtros.fechaHasta,
    filtros.verCompartidos
  ])

  const handleBulkAssign = async () => {
    if (!bulkDispatchId) return showToast('Selecciona un despacho primero.', 'info')
    showLoader()
    try {
      await apiClient.post('/api/inventario/mercancias/asignar_masivo/', {
        ids: selectedIds,
        id_despacho: bulkDispatchId
      })
      fetchData()
      setSelectedIds([])
      setBulkDispatchId('')
      showToast(`Éxito: ${selectedIds.length} mercancías asignadas al Despacho #${bulkDispatchId}`, 'success')
    } catch (err) {
      showToast('Error al realizar la asignación masiva.', 'error')
    } finally {
      hideLoader()
    }
  }

  const limpiarFiltros = () => {
    setFiltros({
      cliente: '',
      estado: 'TODOS',
      fechaDesde: '',
      fechaHasta: '',
      codigoInterno: '',
      destino: '',
      despacho: '',
      factura: '',
      proveedor: '',
      verCompartidos: false
    })
    setSearchTerm('')
    setStatusFilter('TODOS')
    setCurrentPage(1)
  }

  const uniqueClientes = [...new Set(mercancias.map(m => m.cliente_nombre).filter(Boolean))]
  const uniqueDestinos = [...new Set(mercancias.map(m => m.destino_nombre).filter(Boolean))]

  const opcionesClientes = useMemo(() => {
    return clientes.map(c => {
      const nombre = c.nombre_cliente || 'Cliente Desconocido'
      return {
        value: nombre,
        label: c.rut ? `${nombre} - ${c.rut}` : nombre
      }
    })
  }, [clientes])

  const opcionesDespachos = [
    { value: 'null', label: 'Sin Despacho Asignado' },
    ...despachos.map(d => ({
      value: d.id_despacho || d.id,
      label: `${d.ruta_nombre || d.id_ruta || 'Sin Ruta'} (Despacho #${d.id_despacho || d.id})`
    }))
  ]

  const opcionSeleccionadaDespach = opcionesDespachos.find(op => String(op.value) === String(filtros.despacho)) || null
  const opcionSeleccionada = opcionesClientes.find(op => op.value === filtros.cliente) || null

  const filteredItems = useMemo(() => {
    return mercancias.filter(item => {
      if (!filtros.proveedor) return true;

      const provAsociado = proveedores.find(p =>
        String(p.id || p.id_proveedor) === String(item.id_proveedor || item.proveedor)
      );

      if (!provAsociado) return false;

      const termino = filtros.proveedor.toLowerCase();
      const nombreMatches = String(provAsociado.nombre_proveedor || '').toLowerCase().includes(termino);
      const rutMatches = String(provAsociado.rut_desencriptado || provAsociado.rut || provAsociado.rut_hash || '').toLowerCase().includes(termino);

      return nombreMatches || rutMatches;
    })
  }, [mercancias, filtros.proveedor, proveedores])

  const paginatedItems = filteredItems
  const startIndex = (currentPage - 1) * 100
  const totalPages = Math.ceil(totalItems / 100)

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id])
  }

  const isAllCurrentPageSelected = paginatedItems.length > 0 && paginatedItems.every(item => selectedIds.includes(item.id_mercancia))

  const toggleSelectAll = () => {
    const currentPageIds = paginatedItems.map(item => item.id_mercancia)
    if (isAllCurrentPageSelected) {
      setSelectedIds(prev => prev.filter(id => !currentPageIds.includes(id)))
    } else {
      setSelectedIds(prev => {
        const nuevosIds = currentPageIds.filter(id => !prev.includes(id))
        return [...prev, ...nuevosIds];
      })
    }
  }

  const ESTILOS_ESTADO = {
    'En Bodega': 'bg-blue-100 text-blue-700',
    'En Observacion': 'bg-amber-100 text-amber-700',
    'En Observación': 'bg-amber-100 text-amber-700',
    'Merma': 'bg-red-100 text-red-700',
    'Entregado': 'bg-emerald-100 text-emerald-700',
    'En Tránsito': 'bg-purple-100 text-purple-700',
    'En Transito': 'bg-purple-100 text-purple-700',
    'Asignado': 'bg-sky-100 text-sky-700',
    'Recibido': 'bg-green-100 text-indigo-700'
  }

  const getLetraOrigen = (desp) => {
    if (!desp) return ''

    const suc = sucursales.find(s => s.id === desp.sucursal_id || s.id === desp.sucursal)
    const lugar = (suc?.ciudad || suc?.nombre || desp.origen || '').toLowerCase()

    if (lugar.includes('santiago')) return 'S'
    if (lugar.includes('iquique')) return 'I'
    if (lugar.includes('antofagasta')) return 'A'

    return lugar ? lugar.charAt(0).toUpperCase() : ''
  }

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

      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Link to="/" className="p-2.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500 transition shadow-sm">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={() => setMostrarFiltros(!mostrarFiltros)}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition shadow-sm border w-full md:w-auto ${mostrarFiltros
              ? 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
          >
            <Filter className={`w-4 h-4 ${mostrarFiltros ? 'text-red-800' : 'text-gray-400'}`} />
            {mostrarFiltros ? 'Ocultar Filtros' : 'Filtros Avanzados'}
          </button>

          <Link to="/mercancias/nueva" className="flex items-center justify-center gap-2 w-full md:w-auto px-5 py-2.5 bg-red-800 text-white rounded-lg hover:bg-red-900 transition font-medium shadow-sm whitespace-nowrap">
            <Plus className="w-5 h-5" /> Nueva Mercancía
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6 mb-6 border border-gray-100">
        {mostrarFiltros && (
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 mb-6 animate-in slide-in-from-top-2 fade-in duration-200">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-100">
              <h3 className="font-bold text-gray-700 flex items-center gap-2">
                <Filter className="w-5 h-5 text-red-800" /> Filtros de Búsqueda
              </h3>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer bg-purple-50 px-3 py-1.5 rounded-lg border border-purple-100 hover:bg-purple-100 transition">
                  <input
                    type="checkbox"
                    name="verCompartidos"
                    checked={filtros.verCompartidos}
                    onChange={(e) => {
                      setFiltros(prev => ({ ...prev, verCompartidos: e.target.checked }));
                      setCurrentPage(1);
                    }}
                    className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-purple-700 flex items-center gap-1">
                    <Share2 className="w-3.5 h-3.5" /> Ver Solo Compartidas
                  </span>
                </label>

                <button
                  onClick={limpiarFiltros}
                  className="text-sm text-gray-500 hover:text-red-700 flex items-center gap-1 font-medium transition"
                >
                  <X className="w-4 h-4" /> Limpiar Filtros
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Factura</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    name="factura"
                    placeholder="N° de Factura"
                    value={filtros.factura}
                    onChange={handleFiltroChange}
                    className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-800 outline-none transition text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Código Interno</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    name="codigoInterno"
                    placeholder="Buscar código..."
                    value={filtros.codigoInterno}
                    onChange={handleFiltroChange}
                    className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-800 outline-none transition text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Proveedor</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    name="proveedor"
                    placeholder="RUT o Nombre..."
                    value={filtros.proveedor}
                    onChange={handleFiltroChange}
                    className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-800 outline-none transition text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cliente</label>
                <Select
                  name="cliente"
                  options={opcionesClientes}
                  value={opcionSeleccionada}
                  isClearable={true}
                  isSearchable={true}
                  placeholder="Todos los clientes..."
                  noOptionsMessage={() => "No se encontraron clientes"}
                  className="text-sm"
                  onChange={(opcion) => {
                    handleFiltroChange({
                      target: {
                        name: 'cliente',
                        value: opcion ? opcion.value : ''
                      }
                    });
                  }}
                  styles={{
                    control: (base, state) => ({
                      ...base,
                      backgroundColor: '#F9FAFB',
                      borderColor: state.isFocused ? '#991B1B' : '#E5E7EB',
                      boxShadow: state.isFocused ? '0 0 0 2px rgba(153, 27, 27, 0.2)' : 'none',
                      borderRadius: '0.5rem',
                      padding: '1px',
                      '&:hover': {
                        borderColor: state.isFocused ? '#991B1B' : '#D1D5DB'
                      }
                    }),
                    menu: (base) => ({
                      ...base,
                      borderRadius: '0.5rem',
                      overflow: 'hidden',
                      zIndex: 50
                    })
                  }}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Estado</label>
                <select
                  name="estado"
                  value={filtros.estado}
                  onChange={handleFiltroChange}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-800 outline-none transition text-sm"
                >
                  <option value="TODOS">Todos los estados</option>
                  <option value="En Bodega">En Bodega</option>
                  <option value="Asignado">Asignado</option>
                  <option value="Transito">En Tránsito</option>
                  <option value="En Observacion">En Observación</option>
                  <option value="Entregado">Entregado</option>
                  <option value="Recibido">Recibido</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Destino</label>
                <select
                  name="destino"
                  value={filtros.destino}
                  onChange={handleFiltroChange}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-800 outline-none transition text-sm"
                >
                  <option value="">Todos los destinos</option>
                  {uniqueDestinos.map((dest, idx) => (
                    <option key={idx} value={dest}>{dest}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Ruta</label>
                <Select
                  name="despacho"
                  options={opcionesDespachos}
                  value={opcionSeleccionadaDespach}
                  isClearable={true}
                  isSearchable={true}
                  placeholder="Cualquier despacho..."
                  noOptionsMessage={() => "No se encontraron despachos"}
                  className="text-sm"
                  onChange={(opcion) => {
                    handleFiltroChange({
                      target: {
                        name: 'despacho',
                        value: opcion ? opcion.value : ''
                      }
                    });
                  }}
                  styles={{
                    control: (base, state) => ({
                      ...base,
                      backgroundColor: '#F9FAFB',
                      borderColor: state.isFocused ? '#991B1B' : '#E5E7EB',
                      boxShadow: state.isFocused ? '0 0 0 2px rgba(153, 27, 27, 0.2)' : 'none',
                      borderRadius: '0.5rem',
                      padding: '1px',
                      '&:hover': {
                        borderColor: state.isFocused ? '#991B1B' : '#D1D5DB'
                      }
                    }),
                    menu: (base) => ({
                      ...base,
                      borderRadius: '0.5rem',
                      zIndex: 50
                    }),
                    option: (base, state) => ({
                      ...base,
                      backgroundColor: state.isSelected ? '#991B1B' : state.isFocused ? '#FEF2F2' : 'white',
                      color: state.isSelected ? 'white' : '#374151',
                      '&:active': {
                        backgroundColor: '#991B1B'
                      }
                    })
                  }}
                />
              </div>

              <div className="lg:col-span-2">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Rango de Ingreso</label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    name="fechaDesde"
                    value={filtros.fechaDesde}
                    onChange={handleFiltroChange}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-800 outline-none transition text-sm text-gray-600"
                  />
                  <span className="text-gray-400 font-bold">-</span>
                  <input
                    type="date"
                    name="fechaHasta"
                    value={filtros.fechaHasta}
                    onChange={handleFiltroChange}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-800 outline-none transition text-sm text-gray-600"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="py-4 px-4 text-left">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded text-red-800 focus:ring-red-800 cursor-pointer"
                    checked={isAllCurrentPageSelected}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-gray-600">Código</th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-gray-600">Cliente</th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-gray-600">Suc</th>
                <th className="text-center py-4 px-4 text-sm font-semibold text-gray-600">Proveedor</th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-gray-600">Valor</th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-gray-600">Despacho</th>
                <th className="text-center py-4 px-4 text-sm font-semibold text-gray-600">Estado</th>
                <th className="text-right py-4 px-4 text-sm font-semibold text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedItems.map((item) => {
                const sucursalObj = sucursales.find(s => s.id === item.sucursal_id);
                const iniciales = sucursalObj ? sucursalObj.ciudad.substring(0, 3).toUpperCase() : '---';
                const isSelected = selectedIds.includes(item.id_mercancia);
                const despObj = despachos.find(d => String(d.id_despacho || d.id) === String(item.id_despacho));
                const esCompartido = Boolean(item.es_colaborador || despObj?.es_colaborador);
                return (
                  <tr key={item.id_mercancia} className={`transition group ${isSelected ? 'bg-red-50' : 'hover:bg-gray-50'}`}>
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
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-gray-500 line-clamp-1 max-w-[200px]" title={item.descripcion_carga}>
                            {item.descripcion_carga || 'Sin descripción'}
                          </span>

                          {item.factura && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                              <FileText className="w-3 h-3" /> {item.factura}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4 font-bold text-green-700">{iniciales}</td>

                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-blue-700 px-2 py-1">
                          {(() => {
                            const provObj = proveedores.find(p => Number(p.id) === Number(item.id_proveedor));
                            return provObj ? provObj.nombre_proveedor : "Proveedor Desconocido";
                          })()}
                        </span>

                        <span className="text-xs font-bold text-amber-700 px-2 py-1">
                          {(() => {
                            const provObj = proveedores.find(p => Number(p.id) === Number(item.id_proveedor));
                            return provObj ? provObj.rut : `ID: ${item.id_proveedor}`;
                          })()}
                        </span>
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <span className="text-sm font-bold text-emerald-700">${parseFloat(item.precio_total || 0).toLocaleString('es-CL')}</span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      {item.id_despacho ? (
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-bold ${esCompartido
                              ? 'bg-purple-50 text-purple-700 border-purple-200 shadow-sm'
                              : 'bg-blue-50 text-blue-700 border-blue-100'
                            }`}
                          title={`ID de Despacho: ${item.id_despacho}`}
                        >
                          {(() => {
                            let textoRuta = `Viaje #${item.id_despacho}`
                            if (despObj?.id_ruta) {
                              const rutaCorta = String(despObj.id_ruta).split('-')[0].trim();
                              textoRuta = rutaCorta.toLowerCase().includes('ruta') ? rutaCorta : `${rutaCorta}`
                            }
                            if (esCompartido) {
                              const letra = getLetraOrigen(despObj)
                              return (
                                <span className="flex items-center gap-1">
                                  {letra && (
                                    <span className="text-yellow-500 rounded text-[15px] font-black">
                                      {letra}
                                    </span>
                                  )}
                                  {textoRuta}
                                </span>
                              )
                            }
                            return textoRuta;
                          })()}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs italic">Sin asignar</span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center justify-center whitespace-nowrap px-3 py-1 rounded-full text-xs font-bold min-w-[100px] ${ESTILOS_ESTADO[item.estado] || 'bg-slate-100 text-slate-700'}`}>
                        {item.estado}
                      </span>
                    </td>

                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link to={`/mercancias/${item.id_mercancia}`} className="p-2 text-gray-400 hover:text-red-800 transition">
                          <Eye size={18} />
                        </Link>
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
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 border rounded-lg disabled:opacity-50">
              <ChevronLeft size={20} />
            </button>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2 border rounded-lg disabled:opacity-50">
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>

      {mermaTarget && (
        <MermaModal mercancia={mermaTarget} onClose={() => setMermaTarget(null)} onConfirm={handleMermaConfirm} />
      )}
    </div>
  );
}