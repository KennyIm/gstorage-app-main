import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useUI } from '../../context/UIContext'
import apiClient from '../../services/api'
import {
    Camera, AlertTriangle, Search, MapPin, Package,
    AlertCircle, CheckCircle2, CheckSquare, Square, X,
    Loader2, Layers, User
} from 'lucide-react'

export default function DespachoMovil() {
    useEffect(() => {
        document.title = "Rutas de Entrega - GStorage"
    }, [])

    const navigate = useNavigate()
    const authContext = useAuth() || {}
    const uiContext = useUI() || {}
    const user = authContext.user
    const logoutUser = authContext.logoutUser
    const showLoader = uiContext.showLoader || (() => { })
    const hideLoader = uiContext.hideLoader || (() => { })
    const showToast = uiContext.showToast || ((msg) => console.log(msg))
    const [despachos, setDespachos] = useState([])
    const [selectedDespachoId, setSelectedDespachoId] = useState('')
    const [selectedZona, setSelectedZona] = useState('TODOS')
    const [searchTerm, setSearchTerm] = useState('')
    const [mercancias, setMercancias] = useState([])
    const [modalIncidenciaOpen, setModalIncidenciaOpen] = useState(false)
    const [itemParaReportar, setItemParaReportar] = useState(null)
    const [motivoRechazo, setMotivoRechazo] = useState('No_Domicilio')
    const [observacionesIncidencia, setObservacionesIncidencia] = useState('')
    const [modalPodOpen, setModalPodOpen] = useState(false)
    const [podFile, setPodFile] = useState(null)
    const [podPreviewUrl, setPodPreviewUrl] = useState(null)
    const [itemBasePod, setItemBasePod] = useState(null)
    const [mercanciasClientePod, setMercanciasClientePod] = useState([])
    const [idsSeleccionadosPod, setIdsSeleccionadosPod] = useState([])
    const [subiendoPod, setSubiendoPod] = useState(false)

    const getClienteKey = (m) => {
        if (!m) return ''
        if (typeof m.id_cliente === 'object' && m.id_cliente !== null) {
            return String(m.id_cliente.id_cliente || m.id_cliente.nombre_cliente || '').trim().toLowerCase()
        }
        if (m.id_cliente) return String(m.id_cliente).trim().toLowerCase()
        if (m.cliente_nombre) return String(m.cliente_nombre).trim().toLowerCase()
        if (m.nombre_cliente) return String(m.nombre_cliente).trim().toLowerCase()
        return ''
    }

    useEffect(() => {
        const fetchDespachosIniciales = async () => {
            try {
                const res = await apiClient.get('/api/seguimiento/despachos-movil/')
                const lista = Array.isArray(res.data) ? res.data : (res.data.results || [])
                setDespachos(lista)
                if (lista.length > 0) {
                    setSelectedDespachoId(lista[0].id_despacho)
                }
            } catch (err) {
                console.error("Error cargando despachos:", err)
                showToast("Error al cargar las hojas de despacho.", "error")
            }
        }
        fetchDespachosIniciales()
    }, [])

    useEffect(() => {
        if (!selectedDespachoId) {
            setMercancias([])
            return
        }
        const fetchMercanciasDespacho = async () => {
            try {
                const res = await apiClient.get(`/api/seguimiento/despachos-movil/${selectedDespachoId}/mercancias/`)
                const data = Array.isArray(res.data) ? res.data : (res.data.results || [])
                setMercancias(data)
            } catch (err) {
                showToast("Error al cargar el detalle de la carga.", "error")
            }
        }
        fetchMercanciasDespacho()
    }, [selectedDespachoId])

    const handleSeleccionarFotoPOD = (itemBase, event) => {
        const archivoFoto = event.target.files[0]
        if (!archivoFoto) return

        if (!checkEsAptaParaPOD(itemBase)) {
            showToast("Esta mercancía ya fue recibida o está en observación.", "warning")
            event.target.value = ''
            return
        }

        const clienteActual = getClienteKey(itemBase)

        const cargasAptas = mercancias.filter(m => {
            const esMismoCliente = clienteActual && getClienteKey(m) === clienteActual
            const esMismoItem = m.id_mercancia === itemBase.id_mercancia
            return (esMismoCliente || esMismoItem) && checkEsAptaParaPOD(m)
        })

        if (cargasAptas.length === 0) {
            showToast("No hay bultos pendientes aptos para entrega para este cliente.", "warning")
            event.target.value = ''
            return
        }

        setPodFile(archivoFoto)
        setPodPreviewUrl(URL.createObjectURL(archivoFoto))
        setItemBasePod(itemBase)
        setMercanciasClientePod(cargasAptas)
        setIdsSeleccionadosPod(cargasAptas.map(m => m.id_mercancia))
        setModalPodOpen(true)
        event.target.value = ''
    }
    const toggleSeleccionItemPod = (id) => {
        setIdsSeleccionadosPod(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        )
    }

    const toggleTodosItemsPod = () => {
        if (idsSeleccionadosPod.length === mercanciasClientePod.length) {
            setIdsSeleccionadosPod([])
        } else {
            setIdsSeleccionadosPod(mercanciasClientePod.map(m => m.id_mercancia))
        }
    }
    const handleConfirmarEntregaPOD = async () => {
        if (!podFile || idsSeleccionadosPod.length === 0) return
        setSubiendoPod(true)
        try {
            const formData = new FormData()
            formData.append('estado_entrega', 'Recibido')
            formData.append('foto_comprobante', podFile)
            idsSeleccionadosPod.forEach(id => formData.append('mercancia_ids', id))
            const itemPrincipalId = itemBasePod ? itemBasePod.id_mercancia : idsSeleccionadosPod[0]
            await apiClient.patch(`/api/seguimiento/control-entrega/${itemPrincipalId}/registrar/`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            })
            showToast(`¡Entrega confirmada para ${idsSeleccionadosPod.length} carga(s)!`, "success")
            setMercancias(prev => prev.map(m =>
                idsSeleccionadosPod.includes(m.id_mercancia)
                    ? { ...m, estado: 'Recibido', control_entrega: { ...(m.control_entrega || {}), foto_comprobante: podPreviewUrl } }
                    : m
            ))

            setModalPodOpen(false)
            setPodFile(null)
            setPodPreviewUrl(null)
            setItemBasePod(null)
            setMercanciasClientePod([])
            setIdsSeleccionadosPod([])

        } catch (error) {
            console.error("Error al registrar entrega:", error)
            showToast(error.response?.data?.error || "Error al procesar el comprobante de entrega.", "error")
        } finally {
            setSubiendoPod(false)
        }
    }
    const handleAbrirModalReporte = (item) => {
        setItemParaReportar(item)
        setMotivoRechazo('No_Domicilio')
        setObservacionesIncidencia('')
        setModalIncidenciaOpen(true)
    }
    const handleGuardarIncidencia = async (e) => {
        e.preventDefault()
        if (!itemParaReportar) return
        showLoader()
        try {
            const payload = {
                estado_entrega: motivoRechazo,
                observaciones: observacionesIncidencia
            }
            await apiClient.patch(`/api/seguimiento/control-entrega/${itemParaReportar.id_mercancia}/incidencia/`, payload)
            showToast("Novedad registrada en la hoja de ruta.", "info")
            setMercancias(prev => prev.map(m =>
                m.id_mercancia === itemParaReportar.id_mercancia
                    ? { ...m, estado: 'En Observacion' }
                    : m
            ))
            setModalIncidenciaOpen(false)
        } catch (err) {
            showToast("No se pudo reportar el inconveniente.", "error")
        } finally {
            hideLoader()
        }
    }
    const mercanciasFiltradas = mercancias.filter(item => {
        const destinoLimpio = (
            item.destino_nombre || item.nombre_destino || item.destino || item.direccion_entrega || ''
        ).toLowerCase()

        let cumpleZona = true
        if (selectedZona !== 'TODOS') {
            cumpleZona = destinoLimpio.includes(selectedZona.toLowerCase())
        }
        const ordenLimpia = (item.numero_orden_entrega || '').toString().toLowerCase()
        const codigoInternoLimpio = (item.codigo_interno || '').toString().toLowerCase()
        const clienteLimpio = (item.cliente_nombre || item.nombre_cliente || '').toLowerCase()
        const term = searchTerm.toLowerCase()
        const cumpleBusqueda = ordenLimpia.includes(term) || codigoInternoLimpio.includes(term) || clienteLimpio.includes(term)
        return cumpleZona && cumpleBusqueda
    })
    const checkEsObservacion = (item) => {
        if (!item || !item.estado) return false
        const estadoNorm = item.estado.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        return estadoNorm.includes('observacion')
    }
    const checkEsRecibido = (item) => {
        if (!item) return false
        if (item.estado === 'Recibido') return true
        if (item.control_entrega?.foto_comprobante || item.control_entrega?.foto_comprobante_url) {
            if (!checkEsObservacion(item)) {
                return true
            }
        }
        return false
    }
    const checkEsAptaParaPOD = (item) => {
        return !checkEsRecibido(item) && !checkEsObservacion(item)
    }

    const recibidosCount = mercanciasFiltradas.filter(checkEsRecibido).length
    const incidenciasCount = mercanciasFiltradas.filter(checkEsObservacion).length
    const porcentajeEntrega = mercanciasFiltradas.length > 0
        ? Math.round((recibidosCount / mercanciasFiltradas.length) * 100)
        : 0

    const despachoSeleccionado = despachos.find(d => String(d.id_despacho) === String(selectedDespachoId))
    if (!user) {
        return (
            <div className="max-w-xl mx-auto p-6 text-center min-h-[60vh] flex flex-col items-center justify-center">
                <AlertTriangle className="w-12 h-12 text-amber-500 mb-3" />
                <h2 className="text-base font-bold text-slate-800 uppercase">Sesión no detectada</h2>
                <button
                    onClick={() => navigate('/login-express')}
                    className="mt-3 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-xs font-bold cursor-pointer"
                >
                    Ir al Login Express
                </button>
            </div>
        )
    }

    return (
        <div className="max-w-xl mx-auto p-4 font-sans">
            <div className="bg-slate-800 text-white p-4 rounded-xl mb-4 flex justify-between items-center shadow-md">
                <button
                    onClick={() => navigate('/operaciones')}
                    className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                    Volver
                </button>
                <div className="text-center">
                    <h2 className="m-0 text-base font-bold">Despacho Móvil</h2>
                    <p className="text-[11px] text-slate-300 m-0">Chofer: <strong>{user?.nombre || user?.username || 'Conductor'}</strong></p>
                </div>
                <button
                    onClick={logoutUser}
                    className="bg-red-700/30 hover:bg-red-800/40 text-red-300 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer"
                >
                    Salir
                </button>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 shadow-xs">
                <label className="text-[10px] font-bold text-blue-800 uppercase tracking-wider block mb-1">
                    Hoja de Ruta / Despacho Activo
                </label>
                <select
                    value={selectedDespachoId}
                    onChange={(e) => setSelectedDespachoId(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-blue-300 bg-white text-slate-800 text-xs font-bold outline-none cursor-pointer"
                >
                    {despachos.length === 0 ? (
                        <option value="">No tienes viajes asignados</option>
                    ) : (
                        despachos.map(d => (
                            <option key={d.id_despacho} value={d.id_despacho}>
                                Ruta #{d.nombre_ruta || d.id_ruta || d.id_despacho} {d.destino ? `(${d.destino})` : ''}
                            </option>
                        ))
                    )}
                </select>

                {despachoSeleccionado && (
                    <div className="mt-3 pt-3 border-t border-blue-200/60">
                        <div className="flex justify-between text-xs text-slate-700 mb-1.5 font-medium">
                            <span>Entregados: <strong>{recibidosCount}</strong> de {mercanciasFiltradas.length}</span>
                            <span className="font-bold text-blue-800">{porcentajeEntrega}%</span>
                        </div>
                        <div className="w-full bg-blue-200/60 h-2 rounded-full overflow-hidden">
                            <div className="bg-blue-600 h-full transition-all duration-300" style={{ width: `${porcentajeEntrega}%` }} />
                        </div>
                    </div>
                )}
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-3 mb-4 shadow-xs space-y-3">
                <div className="grid grid-cols-4 gap-1.5">
                    {['TODOS', 'Copiapó', 'Antofagasta', 'Iquique'].map(zona => (
                        <button
                            key={zona}
                            onClick={() => setSelectedZona(zona)}
                            className={`py-2 px-1 text-xs font-bold rounded-lg border transition cursor-pointer ${selectedZona.toLowerCase() === zona.toLowerCase()
                                ? 'border-blue-600 bg-blue-600 text-white shadow-xs'
                                : 'border-slate-300 bg-slate-50 text-slate-600 hover:bg-slate-100'
                                }`}
                        >
                            {zona === 'TODOS' ? 'Todas' : zona}
                        </button>
                    ))}
                </div>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar por N° Orden, Código o Cliente..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                    />
                </div>
            </div>
            <div className="flex flex-col gap-3 mb-6">
                {mercanciasFiltradas.length === 0 ? (
                    <div className="text-center p-8 text-slate-400 bg-slate-50 border border-slate-200 rounded-xl">
                        <Package className="w-8 h-8 mx-auto opacity-40 mb-1" />
                        <p className="text-xs font-medium m-0">No hay cargas disponibles con estos filtros.</p>
                    </div>
                ) : (
                    mercanciasFiltradas.map(item => {
                        const esRecibido = checkEsRecibido(item)
                        const esObservacion = item.estado === 'En Observacion' || item.estado === 'En Observación'

                        return (
                            <div
                                key={item.id_mercancia}
                                className={`border rounded-xl p-3.5 shadow-xs transition ${esRecibido
                                    ? 'border-green-300 bg-green-50/50'
                                    : esObservacion
                                        ? 'border-amber-300 bg-amber-50/50'
                                        : 'border-slate-200 bg-white'
                                    }`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <div className="flex flex-wrap gap-1.5 mb-1">
                                            {item.numero_orden_entrega && (
                                                <span className="text-emerald-700 bg-emerald-100/70 border border-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded">
                                                    ORDEN: {item.numero_orden_entrega}
                                                </span>
                                            )}
                                            {item.codigo_interno && (
                                                <span className="text-sky-700 bg-sky-100/70 border border-sky-300 text-[10px] font-bold px-2 py-0.5 rounded">
                                                    CÓD: {item.codigo_interno}
                                                </span>
                                            )}
                                        </div>
                                        <h4 className="m-0 text-base font-semibold text-slate-900">
                                            {item.cliente_nombre || item.nombre_cliente || 'Cliente no especificado'}
                                        </h4>
                                    </div>

                                    <span
                                        className={`text-xs font-bold px-2.5 py-1 rounded-full border shrink-0 ${esRecibido
                                            ? 'text-green-800 bg-green-100 border-green-200'
                                            : esObservacion
                                                ? 'text-amber-800 bg-amber-100 border-amber-200'
                                                : 'text-blue-800 bg-blue-100 border-blue-200'
                                            }`}
                                    >
                                        {esRecibido ? '✓ RECIBIDO' : esObservacion ? '⚠️ EN OBSERVACIÓN' : 'PENDIENTE'}
                                    </span>
                                </div>

                                <div className="text-xs font-bold text-blue-600 mb-1 flex items-center gap-1.5">
                                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                                    <span>{item.destino_nombre || item.nombre_destino || 'Destino en Bodega'}</span>
                                </div>

                                {item.direccion_entrega && (
                                    <div className="text-xs text-slate-600 mb-2 bg-slate-50 p-2 rounded-lg border border-slate-200">
                                        <strong>Dir:</strong> {item.direccion_entrega}
                                    </div>
                                )}

                                <div className="bg-white/80 rounded-lg p-2 text-xs grid grid-cols-3 gap-1 text-center mb-2 border border-slate-300">
                                    <div>
                                        <div className="text-slate-500 text-[10px]">Bultos</div>
                                        <strong className="text-slate-800">{item.cantidad_bultos || 1}</strong>
                                    </div>
                                    <div>
                                        <div className="text-slate-500 text-[10px]">Kg</div>
                                        <strong className="text-slate-800">{item.kg || 0}</strong>
                                    </div>
                                    <div>
                                        <div className="text-slate-500 text-[10px]">m³</div>
                                        <strong className="text-slate-800">{item.m3 || 0}</strong>
                                    </div>
                                </div>

                                {/* Botones */}
                                {!esRecibido && !esObservacion && (
                                    <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-200">
                                        <button
                                            type="button"
                                            onClick={() => handleAbrirModalReporte(item)}
                                            className="p-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                                        >
                                            <AlertTriangle className="w-4 h-4 text-amber-600" />
                                            Reportar
                                        </button>

                                        <label className="p-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs active:scale-95 border-none">
                                            <Camera className="w-4 h-4" />
                                            Foto POD
                                            <input
                                                type="file"
                                                accept="image/*"
                                                capture="environment"
                                                onChange={(e) => handleSeleccionarFotoPOD(item, e)}
                                                className="hidden"
                                            />
                                        </label>
                                    </div>
                                )}

                                {esObservacion && (
                                    <div className="mt-2 p-2.5 bg-amber-100 border border-amber-300 rounded-lg text-amber-900 text-xs flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                                        <span>En revisión administrativa (POD bloqueado).</span>
                                    </div>
                                )}
                            </div>
                        )
                    })
                )}
            </div>
            {modalPodOpen && itemBasePod && (
                <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade">
                    <div className="bg-white w-full max-w-md rounded-2xl p-5 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2">
                                <div>
                                    <h3 className="m-0 font-bold text-slate-900 text-base">Confirmar <strong className='text-emerald-600'>POD</strong></h3>
                                    <p className="text-[11px] text-slate-500 m-0 truncate max-w-[240px]">
                                        Cliente: <strong className="text-slate-800">{itemBasePod.cliente_nombre || itemBasePod.nombre_cliente || 'Cliente'}</strong>
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setModalPodOpen(false)}
                                className="text-slate-400 hover:text-slate-600 font-bold p-1 cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex justify-center bg-slate-900 rounded-xl overflow-hidden max-h-44 border border-slate-800 shadow-inner">
                            {podPreviewUrl && (
                                <img src={podPreviewUrl} alt="Vista previa POD" className="object-contain max-h-44" />
                            )}
                        </div>
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                            <div className="flex items-center justify-between text-xs">
                                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                                    Cargas Pendientes del Cliente
                                </span>
                                {mercanciasClientePod.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={toggleTodosItemsPod}
                                        className="text-indigo-600 hover:text-indigo-800 font-bold text-[11px] cursor-pointer"
                                    >
                                        {idsSeleccionadosPod.length === mercanciasClientePod.length ? 'Desmarcar todas' : 'Marcar todas'}
                                    </button>
                                )}
                            </div>
                            <p className="text-[11px] text-slate-500 m-0">
                                Se aplicará la foto a las siguientes cargas pendientes:
                            </p>
                            <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 pt-1">
                                {mercanciasClientePod.map((m) => {
                                    const isChecked = idsSeleccionadosPod.includes(m.id_mercancia)
                                    return (
                                        <div
                                            key={m.id_mercancia}
                                            onClick={() => toggleSeleccionItemPod(m.id_mercancia)}
                                            className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition select-none ${isChecked
                                                ? 'bg-white border-green-300 text-slate-800 shadow-2xs font-semibold'
                                                : 'bg-slate-100/70 border-slate-200 text-slate-400 opacity-60'
                                                }`}
                                        >
                                            <div className="flex items-center gap-2 truncate flex-1 mr-2">
                                                {isChecked ? (
                                                    <CheckSquare className="w-4 h-4 text-green-600 shrink-0" />
                                                ) : (
                                                    <Square className="w-4 h-4 text-slate-400 shrink-0" />
                                                )}
                                                <span className="truncate">
                                                    {m.codigo_interno ? `COD: ${m.codigo_interno} | ` : ''}
                                                    {m.factura ? `Fact: ${m.factura} ` : ''}
                                                </span>
                                            </div>

                                            <span className="text-[10px] font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-600 shrink-0">
                                                {m.cantidad_bultos || 1} {m.tipo}
                                            </span>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-1">
                            <button
                                type="button"
                                onClick={() => setModalPodOpen(false)}
                                disabled={subiendoPod}
                                className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition cursor-pointer"
                            >
                                Reintentar Foto
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmarEntregaPOD}
                                disabled={subiendoPod || idsSeleccionadosPod.length === 0}
                                className="p-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                            >
                                {subiendoPod ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                <span>Confirmar ({idsSeleccionadosPod.length})</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {modalIncidenciaOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fade">
                    <div className="bg-white w-full max-w-md rounded-2xl p-5 shadow-2xl space-y-4">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                            <h3 className="m-0 text-slate-900 font-bold text-base flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-amber-500" />
                                Reportar Incidencia
                            </h3>
                            <button onClick={() => setModalIncidenciaOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer">
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleGuardarIncidencia} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold mb-1 text-slate-700">Motivo del inconveniente:</label>
                                <select
                                    value={motivoRechazo}
                                    onChange={(e) => setMotivoRechazo(e.target.value)}
                                    className="w-full p-2.5 rounded-lg border border-slate-300 text-sm font-semibold outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                                >
                                    <option value="No_Domicilio">Domicilio Cerrado / No contestan</option>
                                    <option value="Rechazado">Carga Rechazada por el Cliente</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold mb-1 text-slate-700">Bitácora / Observaciones:</label>
                                <textarea
                                    rows="3"
                                    placeholder="Detalla lo sucedido en terreno..."
                                    value={observacionesIncidencia}
                                    onChange={(e) => setObservacionesIncidencia(e.target.value)}
                                    className="w-full p-2.5 rounded-lg border border-slate-300 text-sm outline-none focus:ring-2 focus:ring-amber-500"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setModalIncidenciaOpen(false)}
                                    className="p-3 bg-slate-200 text-slate-700 rounded-lg font-bold text-xs cursor-pointer hover:bg-slate-300 transition"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="p-3 bg-red-700 hover:bg-red-800 text-white rounded-lg font-bold text-xs cursor-pointer transition"
                                >
                                    Confirmar Reporte
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}