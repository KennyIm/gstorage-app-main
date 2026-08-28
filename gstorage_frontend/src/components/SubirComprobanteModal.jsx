import React, { useState, useEffect } from 'react'
import apiClient from '../services/api'
import { useUI } from '../context/UIContext'
import {
    Upload, FileText, Image as ImageIcon, X, Loader2,
    CheckCircle2, CheckSquare, Square, Layers, User, Package
} from 'lucide-react'

export default function SubirComprobanteModal({
    mercanciaSeleccionada,
    todasLasMercancias = [],
    idDespacho,
    isOpen,
    onClose,
    onSuccess
}) {
    const [archivo, setArchivo] = useState(null)
    const [previewUrl, setPreviewUrl] = useState(null)
    const [observaciones, setObservaciones] = useState('')
    const [subiendo, setSubiendo] = useState(false)
    const [idsSeleccionados, setIdsSeleccionados] = useState([])
    const [mercanciasRelacionadas, setMercanciasRelacionadas] = useState([])
    const { showToast } = useUI()

    // 1. Obtener identificador limpio del cliente
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

    // 2. Agrupación inteligente al abrir el modal
    useEffect(() => {
        if (isOpen && mercanciaSeleccionada && Array.isArray(todasLasMercancias)) {
            // Limpieza de estados anteriores
            setArchivo(null)
            setPreviewUrl(null)

            const ordenActual = (mercanciaSeleccionada.numero_orden_entrega || '').toString().trim().toLowerCase()
            const facturaActual = (mercanciaSeleccionada.factura || '').toString().trim().toLowerCase()
            const clienteActual = getClienteKey(mercanciaSeleccionada)

            // Buscar mercancías del MISMO CLIENTE o MISMA ORDEN en este despacho
            const relacionadas = todasLasMercancias.filter(m => {
                const ordenM = (m.numero_orden_entrega || '').toString().trim().toLowerCase()
                const facturaM = (m.factura || '').toString().trim().toLowerCase()
                const clienteM = getClienteKey(m)

                // Coincidencia por N° Orden (si existe)
                const coincideOrden = ordenActual && ordenM && ordenActual === ordenM
                // Coincidencia por Factura (si existe)
                const coincideFactura = facturaActual && facturaM && facturaActual === facturaM
                // Coincidencia por Cliente
                const coincideCliente = clienteActual && clienteM && clienteActual === clienteM

                return coincideOrden || coincideFactura || coincideCliente || m.id_mercancia === mercanciaSeleccionada.id_mercancia
            })

            const listaFinal = relacionadas.length > 0 ? relacionadas : [mercanciaSeleccionada]
            setMercanciasRelacionadas(listaFinal)
            
            // Preseleccionar todas las cargas relacionadas por defecto
            setIdsSeleccionados(listaFinal.map(m => m.id_mercancia))
            
            const nombreCliente = mercanciaSeleccionada.cliente_nombre || mercanciaSeleccionada.nombre_cliente || 'Cliente'
            setObservaciones(`Recepción conforme - ${nombreCliente} (OE: ${mercanciaSeleccionada.numero_orden_entrega || mercanciaSeleccionada.factura || `#${mercanciaSeleccionada.id_mercancia}`})`)
        }
    }, [isOpen, mercanciaSeleccionada, todasLasMercancias])

    if (!isOpen || !mercanciaSeleccionada) return null

    const toggleSeleccion = (id) => {
        setIdsSeleccionados(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        )
    }

    const toggleTodos = () => {
        if (idsSeleccionados.length === mercanciasRelacionadas.length) {
            setIdsSeleccionados([])
        } else {
            setIdsSeleccionados(mercanciasRelacionadas.map(m => m.id_mercancia))
        }
    }

    const handleFileChange = (e) => {
        const file = e.target.files[0]
        if (!file) return

        const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/jpg']
        if (!validTypes.includes(file.type)) {
            showToast('Formato no permitido. Usa PDF o imágenes (JPG, PNG).', 'error')
            return
        }
        setArchivo(file)
        if (file.type.startsWith('image/')) {
            setPreviewUrl(URL.createObjectURL(file))
        } else {
            setPreviewUrl(null)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!archivo) {
            showToast('Por favor selecciona el archivo del comprobante (Scan o Foto).', 'error')
            return
        }

        if (idsSeleccionados.length === 0) {
            showToast('Debes seleccionar al menos una mercancía para asociar el comprobante.', 'error')
            return
        }

        setSubiendo(true)
        const formData = new FormData()
        formData.append('despacho', idDespacho)
        formData.append('archivo', archivo)
        if (observaciones) formData.append('observaciones', observaciones)

        // Envío de IDs de mercancía agrupados
        idsSeleccionados.forEach(id => {
            formData.append('mercancia_ids', id)
        })

        try {
            await apiClient.post('/api/seguimiento/comprobantes/subir-masivo/', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            })
            showToast(`¡Comprobante asociado a ${idsSeleccionados.length} mercancía(s) con éxito!`, 'success')
            if (onSuccess) onSuccess()
            onClose()
        } catch (err) {
            console.error('Error al subir comprobante masivo:', err)
            showToast(err.response?.data?.error || 'Error al asociar el comprobante de entrega.', 'error')
        } finally {
            setSubiendo(false)
        }
    }

    const clienteDisplay = mercanciaSeleccionada.cliente_nombre || mercanciaSeleccionada.nombre_cliente || 'Cliente no especificado'

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
                
                {/* Cabecera */}
                <div className="bg-slate-800 text-white px-5 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div>
                            <h3 className="font-bold text-sm sm:text-base m-0">Adjuntar <strong className='text-emerald-400'>OE</strong> / Scan <strong className='text-emerald-400'>Recepcionado</strong></h3>
                            <p className="text-[11px] text-slate-300 m-0">
                                Cliente: <strong className="text-white">{clienteDisplay}</strong>
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    
                    {/* Lista de Mercancías del Cliente / Orden */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-800 flex items-center gap-1.5">
                                Bultos del Cliente
                            </span>
                            <button
                                type="button"
                                onClick={toggleTodos}
                                className="text-indigo-600 hover:text-indigo-800 font-bold text-[11px] cursor-pointer"
                            >
                                {idsSeleccionados.length === mercanciasRelacionadas.length ? 'Desmarcar todos' : 'Marcar todos'}
                            </button>
                        </div>

                        <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                            {mercanciasRelacionadas.map((m) => {
                                const isChecked = idsSeleccionados.includes(m.id_mercancia)
                                return (
                                    <div
                                        key={m.id_mercancia}
                                        onClick={() => toggleSeleccion(m.id_mercancia)}
                                        className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition select-none ${
                                            isChecked
                                                ? 'bg-white border-indigo-300 text-slate-800 shadow-2xs font-medium'
                                                : 'bg-slate-100/70 border-slate-200 text-slate-400 opacity-60'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2 truncate flex-1 mr-2">
                                            {isChecked ? (
                                                <CheckSquare className="w-4 h-4 text-indigo-600 shrink-0" />
                                            ) : (
                                                <Square className="w-4 h-4 text-slate-400 shrink-0" />
                                            )}
                                            <span className="truncate">
                                                {m.numero_orden_entrega ? `OE: ${m.numero_orden_entrega} | ` : ''}
                                                {m.factura ? `Fact: ${m.factura}` : ''}
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

                    {/* Subida de Archivo */}
                    <div className="relative border-2 border-dashed border-slate-300 rounded-xl p-4 text-center hover:border-indigo-500 transition-colors bg-slate-50/50">
                        <input
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={handleFileChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        {archivo ? (
                            <div className="flex flex-col items-center gap-1.5">
                                {archivo.type === 'application/pdf' ? (
                                    <FileText className="w-10 h-10 text-red-500" />
                                ) : previewUrl ? (
                                    <img src={previewUrl} alt="Preview" className="h-20 object-contain rounded-lg border border-slate-200 shadow-2xs" />
                                ) : (
                                    <ImageIcon className="w-10 h-10 text-indigo-500" />
                                )}
                                <span className="text-xs font-bold text-slate-800 truncate max-w-[280px]">
                                    {archivo.name}
                                </span>
                                <span className="text-[10px] text-slate-400">Click para cambiar archivo</span>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-1 text-slate-500 py-2">
                                <Upload className="w-7 h-7 text-slate-400" />
                                <p className="text-xs font-medium m-0">Click para seleccionar <strong className="text-slate-800">PDF o Foto</strong></p>
                                <span className="text-[10px] text-slate-400">Comprobante de entrega firmado</span>
                            </div>
                        )}
                    </div>

                    {/* Observaciones */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Observaciones / Bitácora</label>
                        <textarea
                            rows={2}
                            value={observaciones}
                            onChange={(e) => setObservaciones(e.target.value)}
                            placeholder="Ej: Entrega conforme firmada por cliente..."
                            className="w-full p-2.5 text-xs border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 resize-none bg-white"
                        />
                    </div>

                    {/* Botones de Acción */}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={subiendo || !archivo || idsSeleccionados.length === 0}
                            className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition cursor-pointer shadow-xs"
                        >
                            {subiendo ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                            <span>Vincular a {idsSeleccionados.length} carga(s)</span>
                        </button>
                    </div>

                </form>
            </div>
        </div>
    )
}