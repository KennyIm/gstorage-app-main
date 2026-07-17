import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import apiClient from '../services/api'
import { useAuth } from '../context/AuthContext'
import logomedalla from '../assets/logomedalla.png'
import Select from 'react-select'
import { useUI } from '../context/UIContext'
import {
    Plus, ChevronDown, ChevronUp, Edit, Trash2, CheckCircle,
    Calendar, User, Truck, Package, Scale, Box, MapPin, Clock, Search, FileText,
    Phone, ChevronLeft, ChevronRight, UserPlus, X, Printer
} from 'lucide-react'

export default function CotizacionList() {
    document.title = "Cotizaciones - GStorage"
    const navigate = useNavigate()
    const { user } = useAuth()
    const { showLoader, hideLoader, showToast } = useUI()

    const [cotizaciones, setCotizaciones] = useState([])
    const [totalCotizaciones, setTotalCotizaciones] = useState(0)
    const [loadingInicial, setLoadingInicial] = useState(true)
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage, setItemsPerPage] = useState(10)
    const [searchTerm, setSearchTerm] = useState('')

    const [expandedId, setExpandedId] = useState(null)
    const [modalInvitacionOpen, setModalInvitacionOpen] = useState(false)
    const [cotizacionActivaId, setCotizacionActivaId] = useState(null)
    const [usuarioAInvitar, setUsuarioAInvitar] = useState('')
    const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null)
    const [mensajeInvitacion, setMensajeInvitacion] = useState({ tipo: '', texto: '' })
    const [usuarios, setUsuarios] = useState([])
    const [cotAImprimir, setCotAImprimir] = useState(null)

    const fetchCotizaciones = async () => {
        setLoadingInicial(true)
        try {
            const params = {
                page: currentPage,
                page_size: itemsPerPage,
                search: searchTerm
            }
            const res = await apiClient.get('/api/inventario/cotizaciones/', { params })
            setCotizaciones(res.data.results || [])
            setTotalCotizaciones(res.data.count || 0)
        } catch (err) {
            showToast('Error al cargar las cotizaciones.', 'error')
        } finally {
            setLoadingInicial(false)
        }
    }

    useEffect(() => {
        fetchCotizaciones()
    }, [currentPage, itemsPerPage, searchTerm])
    useEffect(() => {
        setCurrentPage(1)
    }, [searchTerm, itemsPerPage])
    useEffect(() => {
        if (modalInvitacionOpen && cotizacionActivaId) {
            const fetchUsuarios = async () => {
                try {
                    const cotizacionActual = cotizaciones.find(c => c.id_cotizacion === cotizacionActivaId)
                    const idsYaInvitados = cotizacionActual?.colaboradores_activos?.map(colab => String(colab.id)) || []

                    const res = await apiClient.get('/api/usuarios/users')
                    const listaUsuarios = res.data.results || res.data

                    const usuariosElegibles = listaUsuarios.filter((u) => {
                        const sucursalUsuario = u?.perfil?.sucursal_id || u?.perfil?.sucursal
                        const miSucursal = user?.perfil?.sucursal_id || user?.perfil?.sucursal
                        const esOtraSucursal = String(sucursalUsuario) !== String(miSucursal)
                        const noEstaInvitado = !idsYaInvitados.includes(String(u.id))
                        return esOtraSucursal && noEstaInvitado
                    })

                    setUsuarios(usuariosElegibles)

                    if (usuariosElegibles.length > 0) {
                        setUsuarioSeleccionado(usuariosElegibles[0])
                        setUsuarioAInvitar(`${usuariosElegibles[0].first_name} ${usuariosElegibles[0].last_name}`)
                    } else {
                        setUsuarioSeleccionado(null)
                        setUsuarioAInvitar('')
                    }
                } catch (error) {
                    console.error("Error cargando usuarios", error)
                }
            }
            fetchUsuarios()
        }
    }, [modalInvitacionOpen, cotizacionActivaId, user, cotizaciones])

    const handleToggleExpand = (id) => {
        setExpandedId(prev => prev === id ? null : id)
    }
    const handleEliminar = async (id, nombre) => {
        if (!window.confirm(`¿Seguro que deseas eliminar (lógico) la cotización de ${nombre}?`)) return
        showLoader()
        try {
            await apiClient.delete(`/api/inventario/cotizaciones/${id}/`)
            showToast('Cotización eliminada correctamente.', 'success')
            await fetchCotizaciones()
        } catch (err) {
            showToast('No se pudo eliminar la cotización.', 'error')
        } finally {
            hideLoader()
        }
    };

    const handleAbrirModalInvitacion = (id_cotizacion) => {
        setCotizacionActivaId(id_cotizacion)
        setMensajeInvitacion({ tipo: '', texto: '' })
        setUsuarioAInvitar('')
        setUsuarioSeleccionado(null)
        setModalInvitacionOpen(true)
    }
    const handleConfirmarCotizacion = async (id) => {
        if (!window.confirm('¿Confirmar esta cotización? Ya no podrás editarla una vez confirmada.')) return
        showLoader()
        try {
            await apiClient.patch(`/api/inventario/cotizaciones/${id}/`, {
                estado_cotizacion: 'Cotizado',
                fecha_confirmacion: new Date().toISOString()
            })
            showToast('¡Cotización confirmada exitosamente!', 'success')
            await fetchCotizaciones()
        } catch (err) {
            showToast('Error al confirmar la cotización.', 'error')
        } finally {
            hideLoader()
        }
    }
    const formatFecha = (fechaString) => {
        if (!fechaString) return '-'
        const date = new Date(fechaString)
        return date.toLocaleDateString('es-CL', {
            day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
        })
    }

    const formatoDinero = (valor) => Math.round(parseFloat(valor || 0)).toLocaleString('es-CL')
    const totalPages = Math.ceil(totalCotizaciones / itemsPerPage)
    const filtradas = cotizaciones
    const indexOfLastItem = currentPage * itemsPerPage
    const indexOfFirstItem = indexOfLastItem - itemsPerPage

    const handleInvitarColaboradorCotizacion = async (e) => {
        e.preventDefault()
        if (!usuarioSeleccionado) return;
        setMensajeInvitacion({ tipo: 'loading', texto: 'Procesando...' })
        try {
            const response = await apiClient.post(`/api/inventario/cotizaciones/${cotizacionActivaId}/invitar/`, {
                usuario_invitado_id: usuarioSeleccionado.id
            })
            setMensajeInvitacion({ tipo: 'success', texto: response.data.mensaje })
            setUsuarioAInvitar('')
            setUsuarioSeleccionado(null)
            setTimeout(() => {
                setModalInvitacionOpen(false)
                setMensajeInvitacion({ tipo: '', texto: '' })
            }, 2000)
        } catch (error) {
            const errorMsg = error.response?.data?.error || "Error al compartir la cotización."
            setMensajeInvitacion({ tipo: 'error', texto: errorMsg })
        }
    }

    if (loadingInicial) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
                <div className="w-10 h-10 border-4 border-red-800 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 text-gray-500 font-medium">Cargando cotizaciones...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8 font-sans">
            <div className="max-w-6xl mx-auto">

                {/* ENCABEZADO Y CONTROLES */}
                <div className="mb-8">
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8 p-4 bg-white rounded-xl shadow-sm border border-gray-100">
                    <div className="relative w-full sm:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar por cliente, RUT o estado..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-red-800 outline-none transition"
                        />
                    </div>
                    <Link
                        to="/cotizaciones/crear"
                        className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-2.5 bg-red-800 text-white rounded-lg hover:bg-red-900 transition font-bold shadow-md"
                    >
                        <Plus className="w-5 h-5" /> Crear Cotización
                    </Link>
                </div>

                {filtradas.length > 0 && (
                    <div className="flex justify-between items-center mb-4 px-2">
                        <p className="text-sm text-gray-500">
                            Mostrando <span className="font-bold text-gray-900">{indexOfFirstItem + 1}</span> a <span className="font-bold text-gray-900">{Math.min(indexOfLastItem, filtradas.length)}</span> de <span className="font-bold text-gray-900">{filtradas.length}</span> cotizaciones
                        </p>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <label htmlFor="perPage">Mostrar:</label>
                            <select
                                id="perPage"
                                value={itemsPerPage}
                                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                                className="bg-white border border-gray-300 rounded-md py-1 px-2 focus:ring-red-800 focus:border-red-800 outline-none cursor-pointer"
                            >
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                            </select>
                        </div>
                    </div>
                )}

                {/* LISTADO ESTILO ACORDEÓN */}
                <div className="space-y-3">
                    {filtradas.length === 0 ? (
                        <div className="p-8 text-center bg-white rounded-xl border border-gray-200 text-gray-500">
                            No se encontraron cotizaciones.
                        </div>
                    ) : (
                        filtradas.map(cot => {
                            const isExpanded = expandedId === cot.id_cotizacion;
                            const isCotizado = cot.estado_cotizacion === 'Cotizado';

                            const displayDate = isCotizado ? cot.fecha_confirmacion : cot.fecha_creacion;
                            const dateLabel = isCotizado ? "Confirmada" : "Creada";

                            const isCreator = user?.id === cot.id_usuario_creacion;

                            return (
                                <div key={cot.id_cotizacion} className="rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all border border-gray-800">
                                    {/* BARRA SUPERIOR */}
                                    <div
                                        onClick={() => handleToggleExpand(cot.id_cotizacion)}
                                        className={`flex flex-col sm:flex-row items-center justify-between p-4 cursor-pointer select-none transition-colors ${isExpanded ? 'bg-slate-900 text-white' : 'bg-slate-800 text-gray-100 hover:bg-slate-700'}`}
                                    >
                                        <div className="flex items-center gap-4 w-full sm:w-auto sm:mb-0">
                                            <span className={`px-3 py-1 text-xs font-black uppercase tracking-wider rounded-md border ${isCotizado ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50' : 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                                                }`}>
                                                {cot.estado_cotizacion}
                                            </span>
                                            <h3 className="font-bold text-lg truncate max-w-[250px] sm:max-w-md">
                                                Cotización {cot.nombre_cliente}
                                            </h3>
                                        </div>

                                        <div className="flex items-center justify-between w-full sm:w-auto gap-6">
                                            <div className="flex flex-col sm:items-end text-sm">
                                                <span className="text-[10px] text-gray-400 uppercase tracking-wider">{dateLabel}</span>
                                                <span className={`font-medium flex items-center gap-1.5 ${isCotizado ? 'text-emerald-400' : 'text-gray-200'}`}>
                                                    <Calendar className="w-4 h-4" /> {formatFecha(displayDate)}
                                                </span>
                                            </div>
                                            <div className="p-1.5 bg-white/10 rounded-full text-white">
                                                {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                            </div>
                                        </div>
                                    </div>

                                    {/* CUERPO EXPANDIDO */}
                                    {isExpanded && (
                                        <div className="bg-white p-6 border-t border-gray-200 animate-in slide-in-from-top-2 duration-200">
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                                                {/* Bloque Cliente */}
                                                <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                                                    <h4 className="text-xs font-bold text-red-800 uppercase mb-3 flex items-center gap-2">
                                                        Cliente
                                                    </h4>
                                                    <p className="text-sm font-semibold text-gray-900">{cot.nombre_cliente}</p>
                                                    <p className="text-xs text-gray-500 mt-1">RUT: {cot.rut_cliente}</p>
                                                    {!cot.cotiza_proveedor && (
                                                        <p className="text-xs text-indigo-600 font-bold mt-2 flex items-center gap-1">
                                                            <Phone className="w-3 h-3" /> Contacto: {cot.contacto || 'N/R'}
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Bloque Proveedor & Logística */}
                                                <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                                                    <h4 className="text-xs font-bold text-red-800 uppercase mb-3 flex items-center gap-2">
                                                        Proveedor
                                                    </h4>
                                                    <p className="text-sm font-semibold text-gray-900 truncate">{cot.proveedor || 'Sin proveedor'}</p>
                                                    <p className="text-xs text-gray-500 mt-1">RUT Prov: {cot.rut_proveedor}</p>
                                                    {cot.cotiza_proveedor && (
                                                        <p className="text-xs text-indigo-600 font-bold mt-2 flex items-center gap-1">
                                                            <Phone className="w-3 h-3" /> Contacto: {cot.contacto || 'N/R'}
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Bloque Carga*/}
                                                <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                                                    <h4 className="text-xs font-bold text-red-800 uppercase mb-3 flex items-center gap-2">
                                                        Especificaciones
                                                    </h4>
                                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                                        <div><span className="text-gray-500 text-xs">Bultos:</span> <br /><span className="font-bold">{cot.cantidad}</span></div>
                                                        <div><span className="text-gray-500 text-xs">Peso:</span> <br /><span className="font-bold">{cot.kg} Kg</span></div>
                                                        <div><span className="text-gray-500 text-xs">Medidas:</span> <br /><span className="font-bold">{cot.m3} m³</span></div>
                                                        <div><span className="text-gray-500 text-xs">Tipo:</span> <br /><span className="font-bold">{cot.tipo_bultos}</span></div>
                                                        <div className="col-span-2 mt-1 pt-2 border-t border-gray-200">
                                                            <span className="text-gray-500 text-xs uppercase">Presupuesto Cotizado:</span> <br />
                                                            <span className="text-lg font-black text-emerald-700">
                                                                ${parseFloat(cot.monto || 0).toLocaleString('es-CL')}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Tiempos de Vida */}
                                            <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-50 border border-slate-200 rounded-lg mb-6">
                                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                                    <Clock className="w-4 h-4 text-gray-400" />
                                                    <span>Creada: <strong>{formatFecha(cot.fecha_creacion)}</strong></span>
                                                </div>
                                                {cot.fecha_confirmacion && (
                                                    <div className="flex items-center gap-2 text-sm text-emerald-700">
                                                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                                                        <span>Confirmada: <strong>{formatFecha(cot.fecha_confirmacion)}</strong></span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* BOTONES DE ACCIÓN */}
                                            <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-gray-100">
                                                <button
                                                    onClick={() => {
                                                        setCotAImprimir(cot);
                                                        setTimeout(() => window.print(), 500);
                                                    }}
                                                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-blue-600 font-medium rounded-lg hover:bg-blue-50 transition shadow-sm"
                                                >
                                                    <Printer className="w-4 h-4" /> Imprimir
                                                </button>
                                                {!isCotizado && isCreator && (
                                                    <button
                                                        onClick={() => handleAbrirModalInvitacion(cot.id_cotizacion)}
                                                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-indigo-600 font-medium rounded-lg hover:bg-indigo-50 transition shadow-sm"
                                                    >
                                                        <UserPlus className="w-4 h-4" /> Compartir
                                                    </button>
                                                )}
                                                {isCreator && (
                                                    <button
                                                        onClick={() => handleEliminar(cot.id_cotizacion, cot.nombre_cliente)}
                                                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-red-600 font-medium rounded-lg hover:bg-red-50 transition shadow-sm"
                                                    >
                                                        <Trash2 className="w-4 h-4" /> Eliminar
                                                    </button>
                                                )}
                                                {!isCotizado && (
                                                    <Link
                                                        to={`/cotizaciones/editar/${cot.id_cotizacion}`}
                                                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition shadow-sm"
                                                    >
                                                        <Edit className="w-4 h-4" /> Editar
                                                    </Link>
                                                )}
                                                {!isCotizado && isCreator && (
                                                    <button
                                                        onClick={() => handleConfirmarCotizacion(cot.id_cotizacion)}
                                                        className="flex items-center gap-2 px-5 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition shadow-md"
                                                    >
                                                        <CheckCircle className="w-4 h-4" /> Confirmar y Cerrar Cotización
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
                {/* CONTROLES DE PAGINACIÓN */}
                {totalPages > 1 && (
                    <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 rounded-b-2xl">
                        <div>
                            Mostrando <span className="font-bold text-slate-800">{totalCotizaciones === 0 ? 0 : ((currentPage - 1) * itemsPerPage) + 1}</span> al{' '}
                            <span className="font-bold text-slate-800">
                                {Math.min(currentPage * itemsPerPage, totalCotizaciones)}
                            </span>{' '}
                            de <span className="font-bold text-slate-800">{totalCotizaciones}</span> cotizaciones comerciales.
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-semibold"
                            >
                                Anterior
                            </button>
                            <span className="font-semibold text-slate-700">Página {currentPage} de {totalPages}</span>
                            <button
                                type="button"
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-semibold"
                            >
                                Siguiente
                            </button>
                        </div>
                    </div>
                )}
                {/* INVITAR COLABORADOR */}
                {modalInvitacionOpen && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full flex flex-col overflow-hidden">

                            {/* Cabecera */}
                            <div className="bg-indigo-600 text-white p-5 flex items-center justify-between">
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    <UserPlus size={20} /> Compartir Cotización #{cotizacionActivaId}
                                </h2>
                                <button
                                    onClick={() => setModalInvitacionOpen(false)}
                                    className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Cuerpo */}
                            <div className="p-6 space-y-4">
                                <p className="text-sm text-slate-600">
                                    Selecciona un usuario de otra sucursal para darle acceso a editar esta cotización.
                                </p>
                                {mensajeInvitacion.texto && (
                                    <div className={`p-3 rounded-lg text-sm font-medium ${mensajeInvitacion.tipo === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                        mensajeInvitacion.tipo === 'error' ? 'bg-red-50 text-red-700 border border-red-200' :
                                            'bg-blue-50 text-blue-700 border border-blue-200'
                                        }`}>
                                        {mensajeInvitacion.texto}
                                    </div>
                                )}

                                {/* Buscador / Selector de Usuarios */}
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Usuario a invitar</label>
                                    <Select
                                        placeholder="Buscar usuario..."
                                        noOptionsMessage={() => "No hay usuarios de otras sucursales disponibles"}
                                        options={usuarios.map(u => ({
                                            value: u.id,
                                            label: `${u.first_name} ${u.last_name} (${u.username})`
                                        }))}
                                        value={usuarioSeleccionado ? {
                                            value: usuarioSeleccionado.id,
                                            label: `${usuarioSeleccionado.first_name} ${usuarioSeleccionado.last_name} (${usuarioSeleccionado.username})`
                                        } : null}
                                        onChange={(opcion) => {
                                            if (opcion) {
                                                const userObj = usuarios.find(u => u.id === opcion.value);
                                                setUsuarioSeleccionado(userObj);
                                                setUsuarioAInvitar(opcion.label);
                                            } else {
                                                setUsuarioSeleccionado(null);
                                                setUsuarioAInvitar('');
                                            }
                                        }}
                                        isClearable
                                    />
                                </div>
                            </div>

                            {/* Pie del Modal */}
                            <div className="bg-slate-50 border-t border-slate-200 p-4 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setModalInvitacionOpen(false)}
                                    className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    onClick={handleInvitarColaboradorCotizacion}
                                    disabled={!usuarioSeleccionado || mensajeInvitacion.tipo === 'loading'}
                                    className={`px-5 py-2 font-semibold rounded-lg transition-colors shadow-sm ${!usuarioSeleccionado || mensajeInvitacion.tipo === 'loading'
                                        ? 'bg-indigo-300 text-white cursor-not-allowed'
                                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
                                        }`}
                                >
                                    {mensajeInvitacion.tipo === 'loading' ? 'Enviando...' : 'Otorgar Acceso'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                {cotAImprimir && (
                    <div id="molde-cotizacion" className="print:w-[210mm] mx-auto hidden print:block">

                        {/* 🟢 SOLUCIÓN: Inyección de estilos de página limpios para remover cabeceras y pies del navegador */}
                        <style>
                            {`
                @media print {
                    @page {
                        size: auto;
                        margin: 0mm; /* 👈 Esto elimina el título, la fecha, la IP y el 1/1 */
                    }
                    body {
                        margin: 0px;
                        background-color: #ffffff;
                    }
                }
            `}
                        </style>

                        <div className="hoja-pdf w-[210mm] h-[278mm] flex flex-col bg-white px-8 py-8 box-border mx-auto print:shadow-none print:m-0 shadow-lg">

                            {/* --- ENCABEZADO PRINCIPAL --- */}
                            <div className="flex justify-between items-start w-full border-b-2 border-slate-100 pb-6 mb-6 shrink-0">
                                <div className="flex flex-col gap-4 w-[60%]">
                                    <div className="flex items-center gap-3">
                                        <div className="w-20 h-20 flex items-center justify-center shrink-0">
                                            <img src={logomedalla} alt="Logo GStorage" className="max-h-full max-w-full object-contain" />
                                        </div>
                                        <div>
                                            <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-tight">SERVICIO DE LOGISTICAS Y TRANSPORTES MEDALLA'S SPA</h2>
                                            <p className="mt-1 text-[9px] text-slate-700 font-medium leading-relaxed m-0 p-0">
                                                RUT: 77.797.573-0 <br />
                                                VIA UNO KILOMETRO 8 MANZANA 2J BAJO MOLLE, IQUIQUE.<br />
                                                AV. LO ESPEJO 01565 CALLE 10 BODEGA 1011-1013 MERSAN STGO.<br />
                                                Contacto: 988086461 - 944934272
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col items-end text-right w-[35%]">
                                    <h1 className="text-3xl font-black text-indigo-900 uppercase tracking-tighter mb-2">Cotización</h1>

                                    <div className="flex flex-col gap-1 w-full mt-2">
                                        <div className="flex items-center justify-end gap-2 text-sm font-semibold text-slate-700">
                                            <span className="text-slate-500 font-medium uppercase text-xs">N° de Cotización:</span>
                                            <span className="text-red-600 font-black text-lg">
                                                {String(cotAImprimir.id_cotizacion || '').padStart(5, '0')}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-end gap-2 text-xs font-semibold text-slate-700">
                                            <span className="text-slate-500 font-medium">Fecha Emisión:</span>
                                            <span className="text-slate-900">
                                                {cotAImprimir?.fecha_confirmacion
                                                    ? new Date(cotAImprimir.fecha_confirmacion).toLocaleDateString('es-CL')
                                                    : 'Pendiente de confirmación'}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-end gap-2 text-xs font-semibold text-slate-700 mt-1">
                                            <span className="text-slate-500 font-medium">Estado:</span>
                                            <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${cotAImprimir.estado_cotizacion === 'Cotizado' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                                                {cotAImprimir.estado_cotizacion || 'En Proceso'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* --- TARJETA DEL CLIENTE Y DESTINO --- */}
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6 flex justify-between items-start shrink-0">
                                <div className="w-1/2 pr-4 border-r border-slate-200">
                                    <h3 className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mb-2">
                                        {cotAImprimir?.cotiza_proveedor ? 'Datos del Cotizante' : 'Datos del Cliente'}
                                    </h3>
                                    <h2 className="text-sm font-black text-slate-900 leading-tight mb-1">
                                        {cotAImprimir?.cotiza_proveedor
                                            ? (cotAImprimir?.proveedor || 'Sin Nombre')
                                            : (cotAImprimir?.nombre_cliente || 'Sin Nombre')}
                                    </h2>
                                    <p className="text-xs font-semibold text-slate-700 mb-1">
                                        RUT: {cotAImprimir?.cotiza_proveedor
                                            ? (cotAImprimir?.rut_proveedor || 'N/R')
                                            : (cotAImprimir?.rut_cliente || 'N/R')}
                                    </p>
                                    {cotAImprimir?.contacto && <p className="text-xs text-slate-600">Contacto: {cotAImprimir.contacto}</p>}
                                </div>

                                <div className="w-1/2 pl-4 flex flex-col justify-between">
                                    <div>
                                        <h3 className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mb-2">Información de Destino</h3>
                                        <p className="text-xs font-bold text-slate-800 mb-1 flex items-start gap-1">
                                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                                            {cotAImprimir?.destino || 'Retiro en Bodega / No especificado'}
                                        </p>
                                    </div>

                                    <div className="mt-4 pt-3 border-t border-slate-200">
                                        <p className="text-xs text-slate-600">
                                            Cotizado por: <span className="font-semibold text-slate-800">
                                                {cotAImprimir?.usuario_creacion_nombre || `Ejecutivo ID #${cotAImprimir?.id_usuario_creacion || 'N/R'}`}
                                            </span>
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* --- DETALLE DEL SERVICIO (TABLA) --- */}
                            <div className="flex-grow overflow-hidden">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="border-b-2 border-slate-800">
                                            <th className="py-2 px-2 text-left font-bold text-slate-900 uppercase tracking-wider w-[15%]">Cantidad</th>
                                            <th className="py-2 px-2 text-left font-bold text-slate-900 uppercase tracking-wider w-[20%]">Tipo Bulto</th>
                                            <th className="py-2 px-2 text-left font-bold text-slate-900 uppercase tracking-wider w-[35%]">
                                                {cotAImprimir?.cotiza_proveedor ? 'Cliente / Destinatario' : 'Proveedor de Origen'}
                                            </th>
                                            <th className="py-2 px-2 text-center font-bold text-slate-900 uppercase tracking-wider w-[15%]">Dimensiones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        <tr className="align-top">
                                            <td className="py-3 px-2 font-semibold text-slate-800">{cotAImprimir.cantidad || 1} Unidades</td>
                                            <td className="py-3 px-2 font-medium text-slate-700">{cotAImprimir.tipo_bultos || 'Carga General'}</td>
                                            <td className="py-3 px-2">
                                                <p className="font-bold text-slate-900">
                                                    {cotAImprimir?.cotiza_proveedor
                                                        ? (cotAImprimir?.nombre_cliente || 'N/R')
                                                        : (cotAImprimir?.proveedor || 'N/R')}
                                                </p>
                                                <p className="text-[10px] text-slate-500">
                                                    RUT: {cotAImprimir?.cotiza_proveedor
                                                        ? (cotAImprimir?.rut_cliente || 'N/R')
                                                        : (cotAImprimir?.rut_proveedor || 'N/R')}
                                                </p>
                                            </td>
                                            <td className="py-3 px-2 text-center">
                                                <p className="font-bold text-slate-900">{parseFloat(cotAImprimir.kg || 0).toFixed(1)} Kg</p>
                                                <p className="text-[10px] text-slate-500">{parseFloat(cotAImprimir.m3 || 0).toFixed(2)} m³</p>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>

                                <div className="mt-8 p-3 bg-slate-50 rounded text-[10px] text-slate-600 border border-slate-100">
                                    <p className="font-bold text-slate-800 mb-1 uppercase">Condiciones del Servicio:</p>
                                    <ul className="list-disc pl-4 space-y-0.5">
                                        <li>Los valores expresados están sujetos a verificación de medidas y pesos reales al momento de la recepción.</li>
                                        <li>Cotización válida por 7 días hábiles desde su emisión.</li>
                                        <li>El servicio incluye transporte, seguros de carga y logística estándar.</li>
                                        {cotAImprimir.cotiza_proveedor && <li className="text-indigo-700 font-semibold">Nota: Esta cotización incluye cobros asociados al proveedor.</li>}
                                    </ul>
                                </div>

                                <p className="font-bold text-red-800 mt-4 uppercase">TRAER IMPRESA ESTA COTIZACIÓN JUNTO CON SU MERCADERÍA EL DÍA DE RECEPCIÓN EN BODEGA. DE NO SER ASÍ, ESTA COTIZACIÓN PIERDE SU VALOR Y SE COBRARÁ EL PRECIO NORMAL.</p>
                            </div>

                            {/* --- TOTALES COMERCIALES --- */}
                            <div className="mt-4 pt-4 border-t-2 border-slate-800 shrink-0 flex justify-between items-end">
                                <div className="w-1/2">
                                    <div className="w-48 border-t border-slate-400 pt-1 text-center mt-12 hidden">
                                        <p className="text-[9px] uppercase font-bold text-slate-600">Firma Aceptación Cliente</p>
                                    </div>
                                </div>
                                <div className="w-64 text-right">
                                    <div className="flex justify-between text-sm text-slate-600 mb-1">
                                        <span className="font-medium">Subtotal Neto:</span>
                                        <span className="font-bold text-slate-800">${formatoDinero(cotAImprimir.monto || 0)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm text-slate-600 mb-2">
                                        <span className="font-medium">IVA (19%):</span>
                                        <span className="font-bold text-slate-800">${formatoDinero((cotAImprimir.monto || 0) * 0.19)}</span>
                                    </div>
                                    <div className="flex justify-between border-t-2 border-slate-800 font-black text-lg text-slate-900 mt-1 pt-2">
                                        <span>TOTAL:</span>
                                        <span>${formatoDinero((cotAImprimir.monto || 0) * 1.19)}</span>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}