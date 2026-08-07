import React, { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useUI } from '../../context/UIContext'
import apiClient from '../../services/api'
import {
    Camera, AlertTriangle, Search, MapPin, Package, ClipboardList,
    User, Truck, LogOut, CheckCircle2, XCircle, SlidersHorizontal
} from 'lucide-react';

export default function DespachoMovil() {
    useEffect(() => {
        document.title = "Rutas de Entrega - GStorage"
    }, [])

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

    const [modalOpen, setModalOpen] = useState(false)
    const [itemParaReportar, setItemParaReportar] = useState(null)
    const [motivoRechazo, setMotivoRechazo] = useState('No_Domicilio')
    const [observaciones, setObservaciones] = useState('')

    useEffect(() => {
        const fetchDespachosIniciales = async () => {
            try {
                const res = await apiClient.get('/api/inventario/despachos/')
                const lista = res.data.results || res.data
                const activos = lista.filter(d => d.estado_despacho !== 'Finalizado' && d.estado_despacho !== 'Eliminado')
                setDespachos(activos)
                if (activos.length > 0) {
                    setSelectedDespachoId(activos[0].id_despacho)
                }
            } catch (err) {
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
                const res = await apiClient.get(`/api/inventario/mercancias/?id_despacho=${selectedDespachoId}`)
                setMercancias(res.data.results || res.data)
            } catch (err) {
                showToast("Error al cargar el detalle de la carga.", "error")
            }
        }
        fetchMercanciasDespacho()
    }, [selectedDespachoId])

    const handleProcesarEntregaExito = async (idMercancia, event) => {
        const archivoFoto = event.target.files[0]
        if (!archivoFoto) return
        showLoader()
        if (!navigator.geolocation) {
            hideLoader()
            showToast("Tu dispositivo no soporta geolocalización. Activa el GPS.", "error")
            return
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords
                try {
                    const formDataPayload = new FormData()
                    formDataPayload.append('estado_entrega', 'Entregado')
                    formDataPayload.append('latitud_entrega', latitude.toFixed(6))
                    formDataPayload.append('longitud_entrega', longitude.toFixed(6))
                    formDataPayload.append('foto_comprobante', archivoFoto)
                    await apiClient.patch(`/api/tracking/control-entrega/${idMercancia}/registrar/`, formDataPayload, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    })
                    showToast("¡Entrega registrada y geolocalizada con éxito!", "success")
                    setMercancias(prev => prev.map(m =>
                        m.id_mercancia === idMercancia ? { ...m, estado: 'Entregado' } : m
                    ));

                } catch (error) {
                    showToast("Error al procesar el servidor de tracking.", "error")
                } finally {
                    hideLoader()
                }
            },
            (error) => {
                hideLoader()
                showToast("Error de GPS: Asegúrate de otorgar permisos de ubicación en tu celular.", "error")
            },
            { enableHighAccuracy: true, timeout: 10000 }
        )
    }

    const handleAbrirModalReporte = (item) => {
        setItemParaReportar(item)
        setMotivoRechazo('No_Domicilio')
        setObservaciones('')
        setModalOpen(true)
    }

    const handleGuardarIncidencia = async (e) => {
        e.preventDefault()
        if (!itemParaReportar) return

        showLoader()
        try {
            const payload = {
                estado_entrega: motivoRechazo,
                observaciones: observaciones
            }
            await apiClient.patch(`/api/tracking/control-entrega/${itemParaReportar.id_mercancia}/incidencia/`, payload)
            showToast("Novedad registrada en la hoja de ruta.", "info")
            setMercancias(prev => prev.map(m =>
                m.id_mercancia === itemParaReportar.id_mercancia ? { ...m, estado: motivoRechazo === 'No_Domicilio' ? 'En Bodega' : 'Eliminado' } : m
            ))
            setModalOpen(false)
        } catch (err) {
            showToast("No se pudo reportar el inconveniente.", "error")
        } finally {
            hideLoader()
        }
    }
    const mercanciasFiltradas = mercancias.filter(item => { //TODO REVISAR NO FILTRA
        const destinoLimpio = (item.nombre_destino || '').toLowerCase()
        let cumpleZona = true
        if (selectedZona !== 'TODOS') {
            cumpleZona = destinoLimpio.includes(selectedZona.toLowerCase())
        }
        const cumpleOrden = (item.numero_orden_entrega || '').toLowerCase().includes(searchTerm.toLowerCase())
        return cumpleZona && cumpleOrden
    })

    if (!authContext.useAuth && !user) {
        return (
            <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
                <AlertTriangle className="w-12 h-12 text-amber-500 mb-3" />
                <h2 className="text-sm font-bold uppercase">Error de Contexto de Autenticación</h2>
                <p className="text-xs text-slate-400 mt-2 max-w-xs">
                    El sistema no puede leer el estado del usuario.
                </p>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans max-w-md mx-auto shadow-2xl">
            <header className="bg-red-800 p-4 border-b border-slate-800 flex items-center justify-between sticky top-0 z-40">
                <div className="flex items-center gap-2">
                    <div>
                        <h1 className="text-sm font-black tracking-tight uppercase text-white">Medalla Despachos</h1>
                        <p className="text-[10px] text-zinc-100 font-medium">Repartidor: {user?.username || 'Chofer'}</p>
                    </div>
                </div>
                <button onClick={logoutUser} className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-400">
                    <LogOut className="w-4 h-4 text-red-400" />
                </button>
            </header>
            <section className="bg-slate-950/80 backdrop-blur-md p-4 space-y-3 border-b border-slate-800 sticky top-[61px] z-30">
                <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Viaje / Hoja de Ruta Asignada</label>
                    <div className="relative">
                        <ClipboardList className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <select
                            value={selectedDespachoId}
                            onChange={(e) => setSelectedDespachoId(e.target.value)}
                            className="w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-semibold text-white outline-none focus:ring-2 focus:ring-red-800 appearance-none cursor-pointer"
                        >
                            {despachos.length === 0 ? (
                                <option value="">No tienes viajes activos asignados</option>
                            ) : (
                                despachos.map(d => (
                                    <option key={d.id_despacho} value={d.id_despacho}>
                                        Ruta {d.nombre_ruta || d.id_ruta} ({d.origen} ➔ {d.destino})
                                    </option>
                                ))
                            )}
                        </select>
                    </div>
                </div>
                <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <SlidersHorizontal className="w-3 h-3" /> Filtrar Zona de Destino
                    </span>
                    <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                        {['TODOS', 'Iquique', 'Antofagasta', 'Copiapo'].map(zona => (
                            <button
                                key={zona}
                                onClick={() => setSelectedZona(zona)}
                                className={`px-3 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap border shrink-0 ${selectedZona === zona
                                    ? 'bg-red-800 border-red-700 text-white shadow-md'
                                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                                    }`}
                            >
                                {zona === 'TODOS' ? 'Ver Todo' : zona}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Buscar por N° Orden de Entrega..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-red-800"
                    />
                </div>
            </section>
            <main className="flex-grow p-4 space-y-3 overflow-y-auto bg-slate-900">
                {mercanciasFiltradas.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 text-xs font-medium space-y-2">
                        <Package className="w-8 h-8 mx-auto opacity-30 text-slate-400" />
                        <p>No hay bultos pendientes con estos filtros.</p>
                    </div>
                ) : (
                    mercanciasFiltradas.map(item => {
                        const esEntregado = item.estado === 'Entregado';
                        const esNoDomicilio = item.estado === 'No Domicilio' || item.estado === 'No_Domicilio';
                        const esRechazado = item.estado === 'Rechazado';

                        return (
                            <div
                                key={item.id_mercancia}
                                className={`rounded-xl border transition-all p-4 ${esEntregado ? 'bg-emerald-950/20 border-emerald-900/50 opacity-75' :
                                    esNoDomicilio ? 'bg-amber-950/20 border-amber-900/50' :
                                        esRechazado ? 'bg-rose-950/20 border-rose-900/50' :
                                            'bg-slate-950 border-slate-800 shadow-lg'
                                    }`}
                            >
                                <div className="flex items-center justify-between border-b border-slate-800/60 pb-2.5 mb-2.5">
                                    <div className="text-xs">
                                        <span className="text-slate-400 block text-[9px] uppercase font-bold">Orden Entrega</span>
                                        <span className="font-mono font-black text-white text-sm">{item.numero_orden_entrega || 'S/N'}</span>
                                    </div>
                                    <span className={`px-2.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${esEntregado ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                        esNoDomicilio ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                            esRechazado ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                                                'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                        }`}>
                                        {item.estado}
                                    </span>
                                </div>
                                <div className="space-y-2 text-xs">
                                    <p className="flex items-start gap-2 font-medium">
                                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                                        <span><strong className="text-slate-300">Cliente:</strong> {item.cliente_nombre || 'Falta información'}</span>
                                    </p>
                                    <p className="flex items-center gap-2">
                                        <Package className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                        <span><strong className="text-slate-300">Carga:</strong> {item.cantidad_bultos} {item.tipo || 'Bultos'} ({item.kg || 0} Kg / {item.m3 || 0} m³)</span>
                                    </p>
                                    <p className="flex items-start gap-2 text-slate-300 bg-slate-900/50 p-2 rounded-lg border border-slate-800/40">
                                        <MapPin className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                                        <span className="font-medium">{item.direccion_entrega + ', ' + item.destino_nombre || 'Retiro en Bodega Principal'}</span>
                                    </p>
                                </div>

                                {!esEntregado && !esRechazado && (
                                    <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => handleAbrirModalReporte(item)}
                                            className="h-12 px-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-amber-500 flex items-center justify-center gap-1 text-xs font-bold transition shadow-sm active:scale-95"
                                        >
                                            <AlertTriangle className="w-4 h-4" /> Reportar
                                        </button>

                                        <label className="flex-grow h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex items-center justify-center gap-2 text-xs font-black uppercase tracking-wider transition shadow-md cursor-pointer active:scale-95 border border-emerald-500">
                                            <Camera className="w-5 h-5 animate-pulse" /> Tomar Foto POD
                                            <input
                                                type="file"
                                                accept="image/*"
                                                capture="environment"
                                                onChange={(e) => handleProcesarEntregaExito(item.id_mercancia, e)}
                                                className="hidden"
                                            />
                                        </label>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </main>
            {modalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-end justify-center z-50 p-4">
                    <div className="bg-slate-950 border border-slate-800 w-full max-w-sm rounded-t-2xl shadow-2xl animate-in slide-in-from-bottom duration-200">
                        <div className="p-5 space-y-4">
                            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                                <h3 className="font-black text-sm text-white uppercase tracking-tight flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4 text-amber-500" /> Reportar Incidencia
                                </h3>
                                <button onClick={() => setModalOpen(false)} className="text-slate-400 font-bold p-1 bg-slate-900 rounded-lg">✕</button>
                            </div>

                            <form onSubmit={handleGuardarIncidencia} className="space-y-4 text-xs">
                                <div>
                                    <label className="block text-slate-400 font-bold mb-1">Motivo del inconveniente</label>
                                    <select
                                        value={motivoRechazo}
                                        onChange={(e) => setMotivoRechazo(e.target.value)}
                                        className="w-full p-3 bg-slate-900 border border-slate-800 rounded-lg text-white font-semibold outline-none"
                                    >
                                        <option value="No_Domicilio">Domicilio Cerrado / No contestan</option>
                                        <option value="Rechazado">Carga Rechazada por el Cliente</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-slate-400 font-bold mb-1">Bitácora / Observación Interna</label>
                                    <textarea
                                        rows="3"
                                        placeholder="Escribe detalles (Ej: Cliente rechaza por daño en embalaje de origen o no hay moradores)..."
                                        value={observaciones}
                                        onChange={(e) => setObservaciones(e.target.value)}
                                        className="w-full p-3 bg-slate-900 border border-slate-800 rounded-lg text-white placeholder-slate-600 outline-none"
                                        required
                                    ></textarea>
                                </div>

                                <div className="flex gap-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setModalOpen(false)}
                                        className="w-1/3 py-3 bg-slate-900 hover:bg-slate-800 rounded-xl font-bold text-slate-400 border border-slate-800"
                                    >
                                        Cerrar
                                    </button>
                                    <button
                                        type="submit"
                                        className="w-2/3 py-3 bg-red-800 hover:bg-red-900 text-white rounded-xl font-black uppercase tracking-wider"
                                    >
                                        Confirmar Alerta
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}