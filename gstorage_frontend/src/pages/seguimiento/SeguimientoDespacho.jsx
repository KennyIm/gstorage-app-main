import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import apiClient from '../../services/api'
import { useUI } from '../../context/UIContext'
import SubirComprobanteModal from '../../components/SubirComprobanteModal'
import {
    Truck, Package, CheckCircle2, Clock, Upload, ExternalLink,
    MapPin, Loader2, ArrowLeft, FileCheck, AlertTriangle, Eye,
    Camera, FileText, X, AlertCircle, Search, ArrowUpDown, ArrowUp, ArrowDown,
    Filter
} from 'lucide-react'

export default function SeguimientoDespacho() {
    const { id } = useParams()
    const [despacho, setDespacho] = useState(null)
    const [mercancias, setMercancias] = useState([])
    const [comprobantes, setComprobantes] = useState([])
    const [loading, setLoading] = useState(true)

    const [searchTerm, setSearchTerm] = useState('')
    const [filterEstado, setFilterEstado] = useState('TODOS')
    const [sortBy, setSortBy] = useState('orden')
    const [sortOrder, setSortOrder] = useState('asc')

    const [modalUploadOpen, setModalUploadOpen] = useState(false)
    const [selectedMercancia, setSelectedMercancia] = useState(null)
    const [previewPodUrl, setPreviewPodUrl] = useState(null)
    const { showToast } = useUI()
    const fetchDatosSeguimiento = useCallback(async () => {
        try {
            setLoading(true)
            const [despachoRes, mercanciasRes, comprobantesRes] = await Promise.all([
                apiClient.get(`/api/inventario/despachos/${id}/`),
                apiClient.get(`/api/seguimiento/despachos/${id}/seguimiento-mercancias/`),
                apiClient.get(`/api/seguimiento/comprobantes/?id_despacho=${id}`)
            ])

            setDespacho(despachoRes.data)
            setMercancias(Array.isArray(mercanciasRes.data) ? mercanciasRes.data : (mercanciasRes.data.results || []))
            setComprobantes(Array.isArray(comprobantesRes.data) ? comprobantesRes.data : (comprobantesRes.data.results || []))
        } catch (err) {
            console.error("Error al cargar seguimiento:", err)
            showToast("No se pudo obtener el detalle del seguimiento.", "error")
        } finally {
            setLoading(false)
        }
    }, [id, showToast])

    useEffect(() => {
        if (id) {
            fetchDatosSeguimiento()
        }
    }, [id, fetchDatosSeguimiento])

    const handleSortChange = (criterio) => {
        if (sortBy === criterio) {
            setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))
        } else {
            setSortBy(criterio)
            setSortOrder('asc')
        }
    }
    const mercanciasProcesadas = useMemo(() => {
        let resultado = [...mercancias]
        if (filterEstado !== 'TODOS') {
            if (filterEstado === 'En Observacion') {
                resultado = resultado.filter(m => m.estado === 'En Observacion' || m.estado === 'En Observación')
            } else {
                resultado = resultado.filter(m => m.estado === filterEstado)
            }
        }
        if (searchTerm.trim() !== '') {
            const term = searchTerm.toLowerCase()
            resultado = resultado.filter(item => {
                const cliente = (item.cliente_nombre || item.nombre_cliente || '').toLowerCase()
                const factura = (item.factura || '').toString().toLowerCase()
                const orden = (item.numero_orden_entrega || '').toString().toLowerCase()
                const codigo = (item.codigo_interno || '').toString().toLowerCase()

                return cliente.includes(term) || factura.includes(term) || orden.includes(term) || codigo.includes(term)
            })
        }
        resultado.sort((a, b) => {
            let valA = ''
            let valB = ''

            if (sortBy === 'orden') {
                valA = a.numero_orden_entrega || ''
                valB = b.numero_orden_entrega || ''
            } else if (sortBy === 'codigo') {
                valA = a.codigo_interno || ''
                valB = b.codigo_interno || ''
            }

            const comp = String(valA).localeCompare(String(valB), undefined, { numeric: true, sensitivity: 'base' })
            return sortOrder === 'asc' ? comp : -comp
        })

        return resultado
    }, [mercancias, filterEstado, searchTerm, sortBy, sortOrder])
    const conteoRecibidos = mercancias.filter(m => m.estado === 'Recibido').length
    const conteoObservacion = mercancias.filter(m => m.estado === 'En Observacion' || m.estado === 'En Observación').length
    const conteoEntregados = mercancias.filter(m => m.estado === 'Entregado').length

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-500">
                <Loader2 className="w-10 h-10 animate-spin mb-3 text-indigo-600" />
                <p className="text-sm font-medium">Cargando módulo de seguimiento...</p>
            </div>
        )
    }

    if (!despacho) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
                <AlertTriangle className="w-12 h-12 text-amber-500 mb-2" />
                <h2 className="text-lg font-bold text-slate-800">Despacho no encontrado</h2>
                <Link to="/despachos" className="mt-4 text-indigo-600 hover:underline text-sm font-semibold">
                    Volver a la lista de despachos
                </Link>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8 font-sans">
            <div className="max-w-6xl mx-auto space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Link
                            to={`/despachos/${despacho?.id_despacho || id}`}
                            className="p-2 bg-white rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition shadow-xs"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">
                                Seguimiento Ruta #{despacho.nombre_ruta || despacho.id_despacho}
                            </h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-semibold">
                        <span className="px-3 py-1.5 bg-blue-50 text-blue-800 border border-blue-200 rounded-lg">
                            Total Cargas: {mercancias.length}
                        </span>
                        <span className="px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg">
                            PODs Fotos: {mercancias.filter(m => m.control_entrega?.foto_comprobante || m.control_entrega?.foto_comprobante_url).length}
                        </span>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 space-y-3">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-3">
                        <div className="relative w-full md:w-96">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Buscar por Cliente, N° Factura u Orden..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                        {[
                            { id: 'TODOS', label: 'Todos', count: mercancias.length, color: 'slate' },
                            { id: 'Recibido', label: 'Recibidos', count: conteoRecibidos, color: 'emerald' },
                            { id: 'En Observacion', label: 'En Observación', count: conteoObservacion, color: 'amber' },
                            { id: 'Entregado', label: 'En Reparto', count: conteoEntregados, color: 'blue' },
                        ].map(toggle => {
                            const activo = filterEstado === toggle.id
                            return (
                                <button
                                    key={toggle.id}
                                    type="button"
                                    onClick={() => setFilterEstado(toggle.id)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${activo
                                            ? toggle.color === 'emerald'
                                                ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                                                : toggle.color === 'amber'
                                                    ? 'bg-amber-600 border-amber-600 text-white shadow-xs'
                                                    : toggle.color === 'blue'
                                                        ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                                                        : 'bg-slate-800 border-slate-800 text-white shadow-xs'
                                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                                        }`}
                                >
                                    <span>{toggle.label}</span>
                                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activo ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
                                        {toggle.count}
                                    </span>
                                </button>
                            )
                        })}
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <h2 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                            <Package className="w-4 h-4 text-indigo-600" /> Detalle de Cargas ({mercanciasProcesadas.length} mostradas)
                        </h2>
                        <span className="text-xs text-slate-500 font-medium">
                            Scans Guía: <strong>{comprobantes.length}</strong> de {mercancias.length}
                        </span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 select-none">
                                    <th className="p-4">N° Doc / Factura</th>
                                    <th
                                        className="p-4 cursor-pointer hover:text-indigo-600 transition"
                                        onClick={() => handleSortChange('orden')}
                                    >
                                        <div className="flex items-center gap-1">
                                            <span>N° Orden</span>
                                            {sortBy === 'orden' ? (
                                                sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                                            ) : (
                                                <ArrowUpDown className="w-3.5 h-3.5 text-slate-300" />
                                            )}
                                        </div>
                                    </th>
                                    <th
                                        className="p-4 cursor-pointer hover:text-indigo-600 transition"
                                        onClick={() => handleSortChange('codigo')}
                                    >
                                        <div className="flex items-center gap-1">
                                            <span>Cód. Interno</span>
                                            {sortBy === 'codigo' ? (
                                                sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                                            ) : (
                                                <ArrowUpDown className="w-3.5 h-3.5 text-slate-300" />
                                            )}
                                        </div>
                                    </th>
                                    <th className="p-4">Cliente</th>
                                    <th className="p-4 text-center">Bultos</th>
                                    <th className="p-4 text-center">Estado</th>
                                    <th className="p-4 text-center">Foto POD</th>
                                    <th className="p-4 text-center">Guía Scan</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700">
                                {mercanciasProcesadas.length === 0 ? (
                                    <tr>
                                        <td colSpan="9" className="p-8 text-center text-slate-400">
                                            No se encontraron cargas con los filtros o búsqueda especificada.
                                        </td>
                                    </tr>
                                ) : (
                                    mercanciasProcesadas.map((item) => {
                                        const comprobante = comprobantes.find(
                                            c => Number(c.mercancia) === Number(item.id_mercancia) || Number(c.mercancia_id) === Number(item.id_mercancia)
                                        )
                                        const control = item.control_entrega
                                        const fotoPodUrl = control?.foto_comprobante || control?.foto_comprobante_url

                                        const esRecibido = item.estado === 'Recibido'
                                        const esObservacion = item.estado === 'En Observacion' || item.estado === 'En Observación'

                                        return (
                                            <tr key={item.id_mercancia} className="hover:bg-slate-50/80 transition">
                                                {/* Documento / Factura */}
                                                <td className="p-4 font-bold text-slate-900">
                                                    <span className="text-[10px] text-slate-400 uppercase block font-semibold">
                                                        {item.tipo_documento_mercancia || 'Doc'}
                                                    </span>
                                                    {item.factura || 'S/N'}
                                                </td>

                                                {/* N° Orden */}
                                                <td className="p-4 font-mono font-bold text-slate-900">
                                                    {item.numero_orden_entrega || '-'}
                                                </td>

                                                {/* Código Interno */}
                                                <td className="p-4 font-mono text-slate-600 font-semibold">
                                                    {item.codigo_interno || '-'}
                                                </td>

                                                {/* Cliente */}
                                                <td className="p-4">
                                                    <span className="font-semibold text-slate-800">
                                                        {item.cliente_nombre || item.nombre_cliente || 'No especificado'}
                                                    </span>
                                                </td>

                                                {/* Bultos */}
                                                <td className="p-4 text-center font-semibold">
                                                    {item.cantidad_bultos} <span className="text-[10px] text-slate-400 font-normal">{item.tipo || 'Bultos'}</span>
                                                </td>

                                                {/* Estado */}
                                                <td className="p-4 text-center">
                                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${esRecibido
                                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                            : esObservacion
                                                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                                                : 'bg-blue-50 text-blue-700 border-blue-200'
                                                        }`}>
                                                        {esRecibido ? (
                                                            <><CheckCircle2 className="w-3 h-3 text-emerald-600" /> Recibido</>
                                                        ) : esObservacion ? (
                                                            <><AlertCircle className="w-3 h-3 text-amber-600" /> Observación</>
                                                        ) : (
                                                            <><Clock className="w-3 h-3 text-blue-600" /> {item.estado || 'Pendiente'}</>
                                                        )}
                                                    </span>
                                                </td>

                                                {/* Foto POD (Conductor) */}
                                                <td className="p-4 text-center">
                                                    {fotoPodUrl ? (
                                                        <div className="flex items-center justify-center gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => setPreviewPodUrl(fotoPodUrl)}
                                                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold transition shadow-2xs cursor-pointer active:scale-95"
                                                                title="Ver foto tomada por el chofer"
                                                            >
                                                                <span>Ver POD</span>
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-400 text-[11px] italic">Sin foto</span>
                                                    )}
                                                </td>

                                                {/* Guía Scan*/}
                                                <td className="p-4 text-center">
                                                    {comprobante ? (
                                                        <a
                                                            href={comprobante.url_archivo}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 font-bold transition text-xs shadow-2xs no-underline"
                                                            title="Ver documento escaneado"
                                                        >
                                                            <span>Ver Scan</span>
                                                        </a>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setSelectedMercancia(item)
                                                                setModalUploadOpen(true)
                                                            }}
                                                            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition font-medium text-xs shadow-xs cursor-pointer"
                                                        >
                                                            Subir Scan
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        )
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {selectedMercancia && (
                <SubirComprobanteModal
                    mercanciaSeleccionada={selectedMercancia}
                    todasLasMercancias={mercancias}
                    idDespacho={despacho.id_despacho || id}
                    isOpen={modalUploadOpen}
                    onClose={() => {
                        setModalUploadOpen(false)
                        setSelectedMercancia(null)
                    }}
                    onSuccess={() => {
                        fetchDatosSeguimiento()
                    }}
                />
            )}

            {previewPodUrl && (
                <div
                    className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade"
                    onClick={() => setPreviewPodUrl(null)}
                >
                    <div
                        className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl p-4 space-y-3"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                            <span className="text-xs font-bold text-slate-200 uppercase flex items-center gap-1.5">
                                <Camera className="w-4 h-4 text-indigo-400" /> Evidencia Fotográfica (POD)
                            </span>
                            <button
                                onClick={() => setPreviewPodUrl(null)}
                                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex justify-center bg-black rounded-xl overflow-hidden max-h-[70vh]">
                            <img
                                src={previewPodUrl}
                                alt="Comprobante POD"
                                className="object-contain w-full h-full max-h-[70vh]"
                            />
                        </div>

                        <div className="flex justify-end pt-2">
                            <a
                                href={previewPodUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5"
                            >
                                <ExternalLink className="w-4 h-4" /> Abrir original
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}