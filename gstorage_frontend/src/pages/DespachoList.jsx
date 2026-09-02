import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import apiClient from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useUI } from '../context/UIContext'
import Select from 'react-select'
import { useMemo } from 'react'
import {
  Plus, Search, Eye, Edit, Truck, Map, User, Calendar,
  Clock, CheckCircle, AlertCircle, Loader2, ArrowRight,
  PlayCircle, PackageCheck, ChevronLeft, ChevronRight, ArrowLeft,
  Share2, Filter,
  X
} from 'lucide-react'

export default function DespachoList() {
  document.title = "Listado de Despachos - GStorage"
  const [despachos, setDespachos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sucursales, setSucursales] = useState([])
  const { user } = useAuth()
  const [sucursalVisualizada, setSucursalVisualizada] = useState(user?.perfil?.sucursal_id)
  const { logoutUser } = useAuth()
  const { showLoader, hideLoader, showToast } = useUI()

  const [mostrarFiltros, setMostrarFiltros] = useState(false)

  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 10

  useEffect(() => {
    setCurrentPage(1)
  }, [sucursalVisualizada, searchTerm])

  const [filtros, setFiltros] = useState({
    ruta: '',
    camion: '',
    conductor: '',
    estado: 'TODOS',
    fechaProgDesde: '',
    fechaProgHasta: '',
    fechaRealDesde: '',
    fechaRealHasta: '',
    verCompartidos: false
  })

  useEffect(() => {
    const fetchData = async () => {
      showLoader()
      setDespachos([])
      try {
        const urlDespachos = sucursalVisualizada
          ? `/api/inventario/despachos/?sucursal_id=${sucursalVisualizada}`
          : `/api/inventario/despachos/`

        const [despRes, sucurRes] = await Promise.all([
          apiClient.get(urlDespachos),
          apiClient.get('/api/usuarios/sucursales/')
        ])

        setDespachos(despRes.data)
        setSucursales(sucurRes.data)
      } catch (err) {
        console.error(err)
        showToast('Error al cargar la lista.', 'error')
      } finally {
        hideLoader()
        setLoading(false)
      }
    };

    fetchData()
  }, [sucursalVisualizada])

  const handleDateChange = async (id, newValue) => {
    setDespachos(prev => prev.map(d =>
      d.id_despacho === id ? { ...d, fecha_salida_real: newValue } : d
    ))

    try {
      let fechaFormateada = null
      if (newValue) {
        fechaFormateada = new Date(newValue).toISOString()
      }

      await apiClient.patch(`/api/inventario/despachos/${id}/`, {
        fecha_salida_real: fechaFormateada
      })

    } catch (err) {
      console.error("Detalle del Error 400 de Django:", err.response?.data || err.message)
      showToast("Error al actualizar la fecha. Revisa la consola.", 'error')

      fetchData()
    }
  }

  const formatDateForInput = (isoString) => {
    if (!isoString) return ''
    const date = new Date(isoString)
    const offset = date.getTimezoneOffset() * 60000
    return new Date(date.getTime() - offset).toISOString().slice(0, 16)
  }

  const formatDateTime = (isoString) => {
    if (!isoString) return null
    return new Date(isoString).toLocaleString('es-CL', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  }

  const getStatusBadge = (status) => {
    const styles = {
      'Programado': {
        bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300',
        icon: <Calendar className="w-3.5 h-3.5" />
      },
      'En Carga': {
        bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200',
        icon: <PackageCheck className="w-3.5 h-3.5" />
      },
      'En Tránsito': {
        bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200',
        icon: <PlayCircle className="w-3.5 h-3.5" />
      },
      'Finalizado': {
        bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200',
        icon: <CheckCircle className="w-3.5 h-3.5" />
      },
      'Eliminado': {
        bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200',
        icon: <X className='w-3.5 h-3.5' />
      }
    }

    const style = styles[status] || styles['Programado']

    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${style.bg} ${style.text} ${style.border}`}>
        {style.icon}
        {status.toUpperCase()}
      </span>
    )
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Entregado': return <CheckCircle className="w-3 h-3" />
      case 'En Ruta': return <Truck className="w-3 h-3" />
      case 'En Preparación': return <Clock className="w-3 h-3" />
      default: return <AlertCircle className="w-3 h-3" />
    }
  }

  const formatRUT = (rut) => {
    if (!rut) return 'Sin RUT'
    let value = rut.replace(/[^0-9kK]/g, '').toUpperCase()
    if (value.length <= 1) return value

    const body = value.slice(0, -1)
    const dv = value.slice(-1)

    const formattedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".")

    return `${formattedBody}-${dv}`
  }

  const uniqueRutas = [...new Set(despachos.map(d => String(d.id_ruta)).filter(Boolean))]
  const uniqueCamiones = [...new Set(despachos.map(d => String(d.id_camion)).filter(Boolean))]
  const uniqueConductores = [...new Set(despachos.map(d => String(d.id_conductor)).filter(Boolean))]

  const opcionesCamiones = uniqueCamiones.map(camion => ({ value: camion, label: camion }))

  const opcionesConductores = uniqueConductores.map(cond => ({
    value: cond,
    label: cond
  }))

  const opcionCamionSeleccionada = opcionesCamiones.find(op => op.value === filtros.camion) || null
  const opcionConductorSeleccionada = opcionesConductores.find(op => op.value === filtros.conductor) || null

  const handleFiltroChange = (e) => {
    const { name, value } = e.target
    setFiltros(prev => ({ ...prev, [name]: value }))
    setCurrentPage(1)
  }

  const limpiarFiltros = () => {
    setFiltros({
      ruta: '',
      camion: '',
      conductor: '',
      estado: 'TODOS',
      fechaProgDesde: '',
      fechaProgHasta: '',
      fechaRealDesde: '',
      fechaRealHasta: '',
      verCompartidos: false
    })
    setSearchTerm('')
    setCurrentPage(1)
  }

  const selectStyles = {
    control: (base, state) => ({
      ...base,
      backgroundColor: '#F9FAFB',
      borderColor: state.isFocused ? '#991B1B' : '#E5E7EB',
      boxShadow: state.isFocused ? '0 0 0 2px rgba(153, 27, 27, 0.2)' : 'none',
      borderRadius: '0.5rem',
      minHeight: '38px',
      '&:hover': {
        borderColor: state.isFocused ? '#991B1B' : '#D1D5DB'
      }
    }),
    menu: (base) => ({
      ...base,
      borderRadius: '0.5rem',
      overflow: 'hidden',
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
  }

  const opcionesRutas = useMemo(() => {
    if (!despachos || despachos.length === 0) return []

    const rutasUnicas = {}
    const esDueno = user?.perfil?.rol === 'DUENO'

    const despachosValidos = despachos.filter(d => {
      if (!d) return false
      if (esDueno) return !filtros.verCompartidos || Boolean(d.es_colaborador)
      return filtros.verCompartidos ? Boolean(d.es_colaborador) : !d.es_colaborador
    })

    despachosValidos.forEach(d => {
      const rutaKey = String(d.id_ruta || '')
      if (rutaKey && !rutasUnicas[rutaKey]) {
        rutasUnicas[rutaKey] = {
          value: rutaKey,
          label: d.nombre_ruta ? String(d.nombre_ruta) : `Ruta #${rutaKey}`
        }
      }
    })

    return Object.values(rutasUnicas).sort((a, b) => a.label.localeCompare(b.label))
  }, [despachos, filtros.verCompartidos, user])

  const opcionRutaSeleccionada = useMemo(() => {
    if (!filtros.ruta) return null
    return opcionesRutas.find(op => String(op.value) === String(filtros.ruta)) || null
  }, [opcionesRutas, filtros.ruta])

  const filteredDespachos = useMemo(() => {
    return despachos.filter(d => {
      if (!d) return false

      const matchRuta = filtros.ruta === '' || String(d.id_ruta || '') === filtros.ruta
      const matchCamion = filtros.camion === '' || String(d.id_camion || '') === filtros.camion
      const matchConductor = filtros.conductor === '' || String(d.id_conductor || '') === filtros.conductor
      const matchEstado = filtros.estado === 'TODOS' || d.estado_despacho === filtros.estado

      const esDueno = user?.perfil?.rol === 'DUENO'
      const matchCompartido = esDueno
        ? (!filtros.verCompartidos || Boolean(d.es_colaborador))
        : (filtros.verCompartidos ? Boolean(d.es_colaborador) : !d.es_colaborador)

      let matchFechaProg = true
      if (filtros.fechaProgDesde || filtros.fechaProgHasta) {
        if (!d.fecha_programada) {
          matchFechaProg = false
        } else {
          const itemDate = new Date(d.fecha_programada).getTime()
          if (filtros.fechaProgDesde) {
            const desde = new Date(`${filtros.fechaProgDesde}T00:00:00`).getTime()
            if (itemDate < desde) matchFechaProg = false
          }
          if (filtros.fechaProgHasta) {
            const hasta = new Date(`${filtros.fechaProgHasta}T23:59:59`).getTime()
            if (itemDate > hasta) matchFechaProg = false
          }
        }
      }

      let matchFechaReal = true
      if (filtros.fechaRealDesde || filtros.fechaRealHasta) {
        if (!d.fecha_salida_real) {
          matchFechaReal = false
        } else {
          const itemDate = new Date(d.fecha_salida_real).getTime()
          if (filtros.fechaRealDesde) {
            const desde = new Date(`${filtros.fechaRealDesde}T00:00:00`).getTime()
            if (itemDate < desde) matchFechaReal = false
          }
          if (filtros.fechaRealHasta) {
            const hasta = new Date(`${filtros.fechaRealHasta}T23:59:59`).getTime()
            if (itemDate > hasta) matchFechaReal = false
          }
        }
      }

      return matchRuta && matchCamion && matchConductor && matchEstado && matchCompartido && matchFechaProg && matchFechaReal
    })
  }, [despachos, filtros, user])
  const totalPages = Math.ceil(filteredDespachos.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const paginatedDespachos = filteredDespachos.slice(startIndex, startIndex + ITEMS_PER_PAGE)

  // --- RENDERIZADO ---

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-500">
        <Loader2 className="w-10 h-10 animate-spin mb-4 text-indigo-600" />
        <p>Cargando gestión de despachos...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="bg-red-50 border-l-4 border-red-500 p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <span className="text-red-700 font-medium">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-7xl mx-auto">

        {/* Header y Acciones */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <button
              onClick={() => setMostrarFiltros(!mostrarFiltros)}
              className={`flex items-center gap-2 px-4 py-2 font-medium rounded-lg transition shadow-sm w-full sm:w-auto justify-center border ${mostrarFiltros
                ? 'bg-gray-100 text-gray-700 border-gray-300'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
            >
              <Filter className="w-5 h-5" />
              {mostrarFiltros ? 'Ocultar Filtros' : 'Mostrar Filtros'}
            </button>
          </div>

          <Link
            to="/despachos/nuevo"
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition shadow-sm w-full sm:w-auto justify-center"
          >
            <Plus className="w-5 h-5" /> Nuevo Despacho
          </Link>
        </div>

        {mostrarFiltros && (
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 mb-6 animate-in slide-in-from-top-2 fade-in duration-200">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-100">
              <h3 className="font-bold text-gray-700 flex items-center gap-2">
                <Filter className="w-5 h-5 text-red-800" /> Filtros
              </h3>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer bg-purple-50 px-3 py-1.5 rounded-lg border border-purple-100 hover:bg-purple-100 transition">
                  <input
                    type="checkbox"
                    name="verCompartidos"
                    checked={filtros.verCompartidos}
                    onChange={(e) => {
                      setFiltros(prev => ({
                        ...prev,
                        verCompartidos: e.target.checked,
                        ruta: ''
                      }))
                      setCurrentPage(1)
                    }}
                    className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 cursor-pointer"
                  />
                  <span className="text-sm font-medium text-purple-700 flex items-center gap-1">
                    <Share2 className="w-4 h-4" /> Ver Solo Compartidos
                  </span>
                </label>
                {user?.perfil?.rol === 'DUENO' && (
                  <div className='relative w-48 md:w-64'>
                    <Select
                      placeholder="Ver sucursal..."
                      options={sucursales.map(s => ({ value: s.id, label: s.nombre }))}
                      value={sucursalVisualizada ? { value: sucursalVisualizada, label: sucursales.find(s => String(s.id) === String(sucursalVisualizada))?.nombre } : null}
                      onChange={(opt) => {
                        setSucursalVisualizada(opt ? opt.value : null);
                        setCurrentPage(1);
                      }}
                      className="text-xs"
                      isClearable={true}
                      styles={{
                        control: (base) => ({ ...base, minHeight: '32px', borderRadius: '0.5rem' })
                      }}
                    />
                  </div>
                )}

                <button
                  onClick={limpiarFiltros}
                  className="text-sm text-gray-500 hover:text-red-700 flex items-center gap-1 font-medium transition"
                >
                  <X className="w-4 h-4" /> Limpiar Todo
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

              {/* 1. Ruta */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Ruta</label>
                <Select
                  name="ruta"
                  options={opcionesRutas}
                  value={opcionRutaSeleccionada}
                  isClearable={true}
                  isSearchable={true}
                  placeholder="Buscar ruta..."
                  noOptionsMessage={() => "Sin resultados"}
                  className="text-sm"
                  onChange={(opcion) => {
                    handleFiltroChange({ target: { name: 'ruta', value: opcion ? opcion.value : '' } });
                  }}
                  styles={selectStyles}
                />
              </div>

              {/* 2. Camión */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Camión</label>
                <Select
                  name="camion"
                  options={opcionesCamiones}
                  value={opcionCamionSeleccionada}
                  isClearable={true}
                  isSearchable={true}
                  placeholder="Buscar camión..."
                  noOptionsMessage={() => "Sin resultados"}
                  className="text-sm"
                  onChange={(opcion) => {
                    handleFiltroChange({ target: { name: 'camion', value: opcion ? opcion.value : '' } });
                  }}
                  styles={selectStyles}
                />
              </div>

              {/* 3. Conductor */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Conductor</label>
                <Select
                  name="conductor"
                  options={opcionesConductores}
                  value={opcionConductorSeleccionada}
                  isClearable={true}
                  isSearchable={true}
                  placeholder="Buscar conductor..."
                  noOptionsMessage={() => "Sin resultados"}
                  className="text-sm"
                  onChange={(opcion) => {
                    handleFiltroChange({ target: { name: 'conductor', value: opcion ? opcion.value : '' } });
                  }}
                  styles={selectStyles}
                />
              </div>

              {/* 4. Estado */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Estado</label>
                <select
                  name="estado"
                  value={filtros.estado || "TODOS"}
                  onChange={handleFiltroChange}
                  className="w-full px-3 py-[7px] bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-800 outline-none transition text-sm"
                >
                  <option value="TODOS">Todos los estados</option>
                  <option value="Programado">Programado</option>
                  <option value="En Carga">En Carga</option>
                  <option value="En Tránsito">En Tránsito</option>
                  <option value="Finalizado">Finalizado</option>
                </select>
              </div>

              {/* 5. Fecha Programada */}
              <div className="lg:col-span-2">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Rango: Fecha Programada</label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    name="fechaProgDesde"
                    value={filtros.fechaProgDesde}
                    onChange={handleFiltroChange}
                    className="w-full px-3 py-[7px] bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-800 outline-none transition text-sm text-gray-600"
                  />
                  <span className="text-gray-400 font-bold">-</span>
                  <input
                    type="date"
                    name="fechaProgHasta"
                    value={filtros.fechaProgHasta}
                    onChange={handleFiltroChange}
                    className="w-full px-3 py-[7px] bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-800 outline-none transition text-sm text-gray-600"
                  />
                </div>
              </div>

              {/* 6. Fecha de Salida Real */}
              <div className="lg:col-span-2">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Rango: Salida Real</label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    name="fechaRealDesde"
                    value={filtros.fechaRealDesde}
                    onChange={handleFiltroChange}
                    className="w-full px-3 py-[7px] bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-800 outline-none transition text-sm text-gray-600"
                  />
                  <span className="text-gray-400 font-bold">-</span>
                  <input
                    type="date"
                    name="fechaRealHasta"
                    value={filtros.fechaRealHasta}
                    onChange={handleFiltroChange}
                    className="w-full px-3 py-[7px] bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-800 outline-none transition text-sm text-gray-600"
                  />
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Tabla de Resultados */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50/50 text-gray-500 font-medium border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4">Ruta</th>
                  <th className="px-6 py-4">Suc</th>
                  <th className="px-6 py-4">Transporte</th>
                  <th className="px-6 py-4">Fecha Programada</th>
                  <th className="px-6 py-4">Salida Real</th>
                  <th className="px-6 py-4 text-center">Estado</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedDespachos.length > 0 ? (
                  paginatedDespachos.map((despacho) => {
                    const sucursalObj = sucursales.find(s => s.id === despacho.sucursal_id);
                    const nombreLugar = sucursalObj ? sucursalObj.ciudad : 'Sin Asignar';
                    const iniciales = sucursalObj ? nombreLugar.substring(0, 3).toUpperCase() : '---';
                    const isReadOnly = String(sucursalVisualizada) !== String(user?.perfil?.sucursal_id)

                    return (
                      <tr key={despacho.id_despacho} className="hover:bg-gray-50/50 transition">

                        {/* ID y Ruta */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div>
                              <div className="font-semibold text-gray-900 flex items-center gap-1.5">
                                Ruta {despacho.id_ruta}
                              </div>
                              {despacho.es_colaborador && (
                                <span className="px-3 py-0.5 text-xs bg-purple-100 text-purple-700 font-bold rounded-full border border-purple-200 shadow-sm flex items-center gap-1">
                                  <Share2 className="w-3 h-3" /> Compartido
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2 text-green-700">
                              <span className="font-medium">{sucursalObj ? `${iniciales}` : 'Sin Asignar'}</span>
                            </div>
                          </div>
                        </td>

                        {/* Transporte (Camión + Conductor) */}
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2 text-gray-700">
                              <Truck className="w-3.5 h-3.5 text-gray-400" />
                              <span className="font-medium">{despacho.id_camion}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-500 text-xs">
                              <User className="w-3.5 h-3.5" />
                              <span className="font-bold text-slate-900">
                                {despacho?.nombre_conductor || 'No asignado'}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Fecha */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-gray-600">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            {despacho.fecha_programada
                              ? new Date(despacho.fecha_programada).toLocaleDateString('es-CL')
                              : 'Sin definir'}
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="relative">
                            <input
                              type="datetime-local"
                              className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-gray-700 bg-white shadow-sm cursor-pointer hover:border-gray-400 transition"
                              value={formatDateForInput(despacho.fecha_salida_real)}
                              onChange={(e) => handleDateChange(despacho.id_despacho, e.target.value)}
                            />
                            {!despacho.fecha_salida_real && (
                              <div className="absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none">
                                <span className="flex h-2 w-2 relative">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                                </span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Estado */}
                        <td className="px-6 py-4 text-center">
                          {getStatusBadge(despacho.estado_despacho)}
                        </td>

                        {/* Acciones */}
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              to={`/despachos/${despacho.id_despacho}`}
                              className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition group"
                              title="Ver Detalle"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                            {!isReadOnly && (
                              <Link
                                to={`/despachos/${despacho.id_despacho}/editar`}
                                className="p-2 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                                title="Editar"
                              >
                                <Edit className="w-4 h-4" />
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center text-gray-400">
                        <Truck className="w-12 h-12 mb-3 opacity-20" />
                        <p className="text-lg font-medium text-gray-900">No se encontraron despachos</p>
                        <p className="text-sm">Intenta ajustar tu búsqueda o crea un nuevo despacho.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {filteredDespachos.length > 0 && (
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row justify-between items-center gap-4">
              <span className="text-xs text-gray-500">
                Mostrando {startIndex + 1} a {Math.min(startIndex + ITEMS_PER_PAGE, filteredDespachos.length)} de {filteredDespachos.length} despachos
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 border border-gray-300 rounded-md hover:bg-white disabled:opacity-40 transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex gap-1">
                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`px-3 py-1 rounded-md text-xs font-semibold transition ${currentPage === i + 1
                        ? 'bg-indigo-600 text-white'
                        : 'text-gray-600 hover:bg-white border border-transparent hover:border-gray-300'
                        }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 border border-gray-300 rounded-md hover:bg-white disabled:opacity-40 transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}