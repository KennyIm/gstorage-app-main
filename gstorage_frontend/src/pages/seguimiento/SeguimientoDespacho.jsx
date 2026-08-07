import React, { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import apiClient from '../../services/api'
import { useUI } from '../../context/UIContext'
import SubirComprobanteModal from '../../components/SubirComprobanteModal'
import {
    Truck, Package, CheckCircle2, Clock, Upload, ExternalLink,
    MapPin, Loader2, ArrowLeft, FileCheck, AlertTriangle, Eye
} from 'lucide-react'

export default function SeguimientoDespacho() {
    const { id } = useParams()
    const [despacho, setDespacho] = useState(null)
    const [mercancias, setMercancias] = useState([])
    const [comprobantes, setComprobantes] = useState([])
    const [loading, setLoading] = useState(true)
    const [modalUploadOpen, setModalUploadOpen] = useState(false)
    const [selectedMercancia, setSelectedMercancia] = useState(null)
    const [previewPodUrl, setPreviewPodUrl] = useState(null)
    const { showToast } = useUI()
    const fetchDatosSeguimiento = useCallback(async () => {
        try {
            setLoading(true)
            const [despachoRes, mercanciasRes, comprobantesRes] = await Promise.all([
                apiClient.get(`/api/inventario/despachos/${id}/`),
                apiClient.get(`/api/inventario/mercancias/?id_despacho=${id}`),
                apiClient.get(`/api/seguimiento/comprobantes/?id_despacho=${id}`)
            ])

            setDespacho(despachoRes.data)
            setMercancias(mercanciasRes.data.results || mercanciasRes.data)
            setComprobantes(comprobantesRes.data.results || comprobantesRes.data)
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
    const handleAbrirUploadPOD = (mercancia) => {
        setSelectedMercancia(mercancia)
        setModalUploadOpen(true)
    }

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
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8 font-sans">
            <div className="max-w-6xl mx-auto space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3">
                            <Link to="/despachos" className="p-2 bg-white rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition">
                                <ArrowLeft className="w-4 h-4" />
                            </Link>
                            <h1 className="text-2xl font-bold text-slate-900">
                                Seguimiento Ruta {despacho.nombre_ruta}
                            </h1>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                        <h2 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                            Detalle de Cargas y Comprobantes
                        </h2>
                        <span>PODs Subidos: {comprobantes.length} / {mercancias.length}</span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                                    <th className="p-4">N° Doc / Factura</th>
                                    <th className="p-4">N° OE</th>
                                    <th className="p-4">Cliente</th>
                                    <th className="p-4">Dirección de Entrega</th>
                                    <th className="p-4 text-center">Bultos</th>
                                    <th className="p-4 text-center">Estado</th>
                                    <th className="p-4 text-center">Comprobante (POD)</th>
                                    <th className="p-4 text-center">Comprobante Scan</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700">
                                {mercancias.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="p-8 text-center text-slate-400">
                                            No hay mercancías asignadas a este despacho.
                                        </td>
                                    </tr>
                                ) : (
                                    mercancias.map((item) => {
                                        const comprobante = comprobantes.find(
                                            c => Number(c.mercancia) === Number(item.id_mercancia)
                                        )
                                        const control = item.control_entrega

                                        return (
                                            <tr key={item.id_mercancia} className="hover:bg-slate-50/80 transition">
                                                <td className="p-4 font-bold text-slate-900">
                                                    {item.tipo_documento_mercancia}: {item.factura || 'S/N'}
                                                </td>
                                                <td className="p-4 font-bold text-slate-900">
                                                    {item.numero_orden_entrega}
                                                </td>
                                                <td className="p-4">
                                                    <span className="font-medium text-slate-800">
                                                        {item.nombre_cliente || item.id_cliente?.nombre_cliente || `${item.cliente_nombre}`}
                                                    </span>
                                                </td>
                                                <td className="p-4 max-w-xs truncate">
                                                    <div className="flex items-center gap-1.5 text-slate-600">
                                                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                        <span className="truncate">{item.direccion_entrega || 'Dirección no especificada'}, {item.destino_nombre}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-center font-semibold">
                                                    {item.cantidad_bultos} {item.tipo}
                                                </td>
                                                <td className="p-4 text-center">
                                                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${comprobante || item.estado === 'Entregado'
                                                        ? 'bg-emerald-100 text-emerald-800'
                                                        : 'bg-amber-100 text-amber-800'
                                                        }`}>
                                                        {comprobante || item.estado === 'Entregado' ? (
                                                            <>
                                                                <CheckCircle2 className="w-3 h-3" /> Entregado
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Clock className="w-3 h-3" /> Pendiente
                                                            </>
                                                        )}
                                                    </span>
                                                </td>

                                                <td className="p-4 text-center">
                                                    {control ? (
                                                        <div className="flex items-center justify-center gap-2">
                                                            {control.foto_comprobante_url || control.foto_comprobante ? (
                                                                <a
                                                                    href={control.foto_comprobante_url || control.foto_comprobante}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold hover:bg-indigo-100 transition"
                                                                    title="Ver Foto del Chofer"
                                                                >
                                                                    <Camera className="w-3.5 h-3.5 text-indigo-600" />
                                                                    <span>Foto</span>
                                                                </a>
                                                            ) : null}
                                                            {control.latitud_entrega && control.longitud_entrega && (
                                                                <a
                                                                    href={`https://www.google.com/maps?q=${control.latitud_entrega},${control.longitud_entrega}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-200 transition"
                                                                    title="Ver ubicación de entrega en GPS"
                                                                >
                                                                    <MapPin className="w-3.5 h-3.5 text-rose-500" />
                                                                    <span>GPS</span>
                                                                </a>
                                                            )}
                                                            {control.observaciones && (
                                                                <span
                                                                    className="p-1 text-slate-400 hover:text-slate-600 cursor-help"
                                                                    title={`Observación: ${control.observaciones}`}
                                                                >
                                                                    <FileText className="w-4 h-4" />
                                                                </span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-400 text-[11px]">Sin evidencia</span>
                                                    )}
                                                </td>
                                                <td className="p-4 text-center">
                                                    {comprobante ? (
                                                        <div className="flex items-center justify-center gap-2">
                                                            <a
                                                                href={comprobante.url_archivo}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 font-semibold transition text-xs"
                                                                title="Ver comprobante"
                                                            >
                                                                <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
                                                                <span>Ver Scan</span>
                                                                <ExternalLink className="w-3 h-3 text-emerald-500 ml-0.5" />
                                                            </a>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setSelectedMercancia(item);
                                                                setModalUploadOpen(true);
                                                            }}
                                                            className="btn-subir-pod px-2 py-1.5 bg-red-800 text-white rounded-lg hover:bg-red-900 transition font-medium shadow-sm"
                                                        >
                                                            Subir scan
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
        </div>
    )
}