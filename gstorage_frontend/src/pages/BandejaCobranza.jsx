import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useUI } from '../context/UIContext'
import apiClient from '../services/api'
import { FileText, CheckSquare, DollarSign, Search, Calculator, AlertCircle, ChevronDown } from 'lucide-react'

export default function BandejaCobranza() {
    document.title = "Facturar - GStorage"

    const { showLoader, hideLoader, showToast } = useUI()

    const [pendientes, setPendientes] = useState([])
    const [loading, setLoading] = useState(true)

    const [clienteSeleccionado, setClienteSeleccionado] = useState('')
    const [clienteBusqueda, setClienteBusqueda] = useState('')
    const [mostrarDropdown, setMostrarDropdown] = useState(false)
    const [seleccionados, setSeleccionados] = useState([])

    const [filtroOrden, setFiltroOrden] = useState('')
    const [filtroDespacho, setFiltroDespacho] = useState('')
    const [filtroDestino, setFiltroDestino] = useState('')

    const [tipoDocumento, setTipoDocumento] = useState('Factura')
    const [condicionPago, setCondicionPago] = useState('Dias_30')
    const [numeroDocumento, setNumeroDocumento] = useState('')
    const [archivoPdf, setArchivoPdf] = useState(null)
    const [procesando, setProcesando] = useState(false)

    const dropdownRef = useRef(null)

    const fetchPendientes = async () => {
        setLoading(true)
        try {
            const response = await apiClient.get('/api/finanzas/pendientes/')
            setPendientes(response.data.results || response.data)
        } catch (error) {
            showToast('Error al cargar la bandeja de pendientes.', 'error')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchPendientes()

        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setMostrarDropdown(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    const clientesConDeuda = useMemo(() => {
        const mapa = new Map()
        pendientes.forEach(m => {
            if (!mapa.has(m.id_cliente)) {
                mapa.set(m.id_cliente, { id: m.id_cliente, nombre: m.cliente_nombre, rut: m.cliente_rut })
            }
        })
        return Array.from(mapa.values())
    }, [pendientes])

    const clientesFiltrados = useMemo(() => {
        if (!clienteBusqueda) return clientesConDeuda
        const term = clienteBusqueda.toLowerCase()

        return clientesConDeuda.filter(c =>
            c.nombre.toLowerCase().includes(term) ||
            (c.rut && c.rut.toLowerCase().includes(term))
        );
    }, [clientesConDeuda, clienteBusqueda])

    const mercanciasVisibles = useMemo(() => {
        if (!clienteSeleccionado) return []
        
        return pendientes.filter(m => {
            const perteneceAlCliente = String(m.id_cliente) === String(clienteSeleccionado);
            const cumpleOrden = !filtroOrden || 
                String(m.numero_orden_entrega || '').toLowerCase().includes(filtroOrden.toLowerCase());
            const cumpleDespacho = !filtroDespacho || 
                String(m.codigo_ruta || '').toLowerCase().includes(filtroDespacho.toLowerCase());
            const cumpleDestino = !filtroDestino || 
                String(m.destino_nombre || '').toLowerCase().includes(filtroDestino.toLowerCase());
            return perteneceAlCliente && cumpleOrden && cumpleDespacho && cumpleDestino;
        })
    }, [pendientes, clienteSeleccionado, filtroOrden, filtroDespacho, filtroDestino])

    useEffect(() => {
        setSeleccionados([])
        setFiltroOrden('')
        setFiltroDespacho('')
        setFiltroDestino('')
    }, [clienteSeleccionado])

    const resumenCobro = useMemo(() => {
        const items = mercanciasVisibles.filter(m => seleccionados.includes(m.id_mercancia))
        const subtotal = items.reduce((sum, item) => sum + parseFloat(item.precio_total || 0), 0)
        const iva = tipoDocumento === 'Factura' ? subtotal * 0.19 : 0
        return { subtotal, iva, total: subtotal + iva, cantidad: items.length }
    }, [mercanciasVisibles, seleccionados, tipoDocumento])

    const toggleSeleccion = (id) => {
        setSeleccionados(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        )
    }

    const toggleTodos = () => {
        if (seleccionados.length === mercanciasVisibles.length) {
            setSeleccionados([])
        } else {
            setSeleccionados(mercanciasVisibles.map(m => m.id_mercancia))
        }
    }

    const handleGenerarCobro = async () => {
        if (seleccionados.length === 0) {
            showToast('Selecciona al menos una mercancía para cobrar.', 'warning')
            return
        }

        if (tipoDocumento === 'Factura' && !numeroDocumento) {
            showToast('Ingrese el N° de folio de la Factura.', 'warning')
            return
        }

        setProcesando(true)
        showLoader()

        try {

            const formData = new FormData()
            formData.append('cliente_id', parseInt(clienteSeleccionado))
            formData.append('tipo_documento', tipoDocumento)
            formData.append('condicion_pago', condicionPago)

            if (numeroDocumento) formData.append('numero_documento', numeroDocumento)
            if (archivoPdf) formData.append('pdf_documento', archivoPdf)

            seleccionados.forEach(id => formData.append('mercancias_ids', id))
            await apiClient.post('/api/finanzas/generar-cobro/', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            })

            showToast('Documento de cobro generado exitosamente.', 'success')
            setSeleccionados([])
            setNumeroDocumento('')
            setArchivoPdf(null)
            await fetchPendientes()
        } catch (error) {
            const msg = error.response?.data?.error || 'Error al generar el cobro.'
            showToast(msg, 'error')
        } finally {
            hideLoader()
            setProcesando(false)
        }
    }

    if (loading) return <div className="p-8 text-center text-slate-500">Cargando bandeja...</div>

    return (
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
            <div className='mb-8'>
                <h2 className='text-2xl font-bold text-slate-800 flex items-center gap-2'>
                    <DollarSign className='w-6 h-6 text-emerald-600' />
                    Facturación
                </h2>
            </div>
            <div className='grid grid-cols-1 lg:grid-cols-3 gap-8'>
                <div className='lg:col-span-2 space-y-4'>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center gap-4 relative z-20">
                        <label className="text-sm font-bold text-slate-700 whitespace-nowrap">Facturar a:</label>
                        <div className="relative w-full" ref={dropdownRef}>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar cliente por nombre..."
                                    value={clienteBusqueda}
                                    onChange={(e) => {
                                        setClienteBusqueda(e.target.value);
                                        setMostrarDropdown(true);
                                        if (e.target.value === '') {
                                            setClienteSeleccionado('');
                                            setFiltroOrden('');
                                            setFiltroDespacho('');
                                            setFiltroDestino('');
                                        }
                                    }}
                                    onFocus={() => setMostrarDropdown(true)}
                                    className="w-full pl-9 pr-10 py-2 border-slate-300 rounded-lg text-sm focus:ring-emerald-500 focus:border-emerald-500"
                                />
                                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 cursor-pointer" onClick={() => setMostrarDropdown(!mostrarDropdown)} />
                            </div>

                            {mostrarDropdown && (
                                <ul className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 max-h-60 overflow-y-auto rounded-lg shadow-xl divide-y divide-slate-100 z-30">
                                    {clientesFiltrados.map(c => (
                                        <li
                                            key={c.id}
                                            className={`px-4 py-2.5 text-sm cursor-pointer transition-colors flex flex-col ${String(clienteSeleccionado) === String(c.id)
                                                ? 'bg-emerald-50 text-emerald-700 font-semibold'
                                                : 'text-slate-700 hover:bg-slate-50'
                                                }`}
                                            onClick={() => {
                                                setClienteSeleccionado(c.id);
                                                setClienteBusqueda(c.nombre);
                                                setMostrarDropdown(false);
                                                setFiltroOrden('');
                                                setFiltroDespacho('');
                                                setFiltroDestino('');
                                            }}
                                        >
                                            <span>{c.nombre}</span>
                                            {c.rut && <span className="text-[10px] text-slate-400 font-normal">{c.rut}</span>}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>

                    {clienteSeleccionado && (
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-inner grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fadeIn">
                            <div className="flex flex-col space-y-1">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">N° Orden Entrega</span>
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Ej. S23-10I"
                                        value={filtroOrden}
                                        onChange={(e) => setFiltroOrden(e.target.value)}
                                        className="w-full border-slate-300 rounded-lg text-xs py-2 pl-3 pr-8 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                                    />
                                    {filtroOrden && (
                                        <button onClick={() => setFiltroOrden('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 font-bold text-xs">&times;</button>
                                    )}
                                </div>
                            </div>
                            <div className="flex flex-col space-y-1">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">N° Ruta</span>
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Ej. 55"
                                        value={filtroDespacho}
                                        onChange={(e) => setFiltroDespacho(e.target.value)}
                                        className="w-full border-slate-300 rounded-lg text-xs py-2 pl-3 pr-8 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                                    />
                                    {filtroDespacho && (
                                        <button onClick={() => setFiltroDespacho('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 font-bold text-xs">&times;</button>
                                    )}
                                </div>
                            </div>
                            <div className="flex flex-col space-y-1">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ciudad Destino</span>
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Ej. Antofagasta"
                                        value={filtroDestino}
                                        onChange={(e) => setFiltroDestino(e.target.value)}
                                        className="w-full border-slate-300 rounded-lg text-xs py-2 pl-3 pr-8 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                                    />
                                    {filtroDestino && (
                                        <button onClick={() => setFiltroDestino('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 font-bold text-xs">&times;</button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                    {clienteSeleccionado ? (
                        <div className='bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden'>
                            <div className='overflow-x-auto'>
                                <table className='w-full text-sm text-left'>
                                    <thead className='bg-slate-50 text-slate-600 text-xs uppercase font-bold border-b border-slate-200'>
                                        <tr>
                                            <th className='p-4 w-12'>
                                                <input
                                                    type='checkbox'
                                                    checked={seleccionados.length === mercanciasVisibles.length && mercanciasVisibles.length > 0}
                                                    onChange={toggleTodos}
                                                    className='rounded text-emerald-600 focus:ring-emerald-500'
                                                />
                                            </th>
                                            <th className='p-4'>N° Orden</th>
                                            <th className='p-4'>Despacho</th>
                                            <th className='p-4'>Destino</th>
                                            <th className='p-4 text-right'>Monto</th>
                                        </tr>
                                    </thead>
                                    <tbody className='divide-y divide-slate-100'>
                                        {mercanciasVisibles.map(item => (
                                            <tr key={item.id_mercancia}
                                                className={`hover:bg-slate-50 transition-colors cursor-pointer ${seleccionados.includes(item.id_mercancia) ? 'bg-emerald-50/50' : ''}`}
                                                onClick={() => toggleSeleccion(item.id_mercancia)}
                                            >
                                                <td className='p-4' onClick={(e) => e.stopPropagation()}>
                                                    <input
                                                        type="checkbox"
                                                        checked={seleccionados.includes(item.id_mercancia)}
                                                        onChange={() => toggleSeleccion(item.id_mercancia)}
                                                        className='rounded text-emerald-600 focus:ring-emerald-500'
                                                    />
                                                </td>
                                                <td className="p-4 font-medium text-slate-800">
                                                    {item.numero_orden_entrega ? `${item.numero_orden_entrega}` : `Interno #${item.id_mercancia}`}
                                                </td>
                                                <td className="p-4 text-slate-600">
                                                    {item.codigo_ruta ? (
                                                        <span className="font-semibold text-indigo-600">Ruta {item.codigo_ruta}</span>
                                                    ) : item.despacho_id ? (
                                                        <span>Despacho {item.despacho_id}</span>
                                                    ) : (
                                                        <span className="text-slate-400 italic">Sin asignar</span>
                                                    )}
                                                </td>
                                                <td className='p-4 text-slate-600'>{item.destino_nombre}</td>
                                                <td className='p-4 text-right font-bold text-slate-800'>${parseFloat(item.precio_total).toLocaleString('es-CL')}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <div className='bg-slate-50 rounded-xl border border-dashed border-slate-300 p-12 text-center text-slate-500'>
                            <CheckSquare className='w-12 h-12 text-slate-300 mx-auto mb-3' />
                            <p>Selecciona un cliente para cargar sus órdenes de entrega.</p>
                        </div>
                    )}
                </div>
                <div className='lg:col-span-1'>
                    <div className='bg-white rounded-xl border border-emerald-100 shadow-md p-6 sticky top-6'>
                        <h3 className='text-lg font-bold text-slate-800 flex items-center gap-2 mb-4 border-b border-slate-100 pb-4'>
                            <Calculator className='w-5 h-5 text-emerald-600' />
                            Resumen de Cobro
                        </h3>
                        {seleccionados.length === 0 ? (
                            <div className='text-sm text-slate-500 text-center py-6 flex flex-col items-center gap-2'>
                                <AlertCircle className='w-6 h-6 text-slate-300' />
                                No hay mercancías seleccionadas
                            </div>
                        ) : (
                            <div className='space-y-6'>
                                <div className='space-y-4'>
                                    <div>
                                        <label className='text-xs font-bold text-slate-500 uppercase'>Tipo de Documento</label>
                                        <select
                                            value={tipoDocumento}
                                            onChange={(e) => setTipoDocumento(e.target.value)}
                                            className='mt-1 w-full border-slate-300 rounded-md text-sm focus:ring-emerald-500'
                                        >
                                            <option value="Factura">Factura Electrónica (+IVA)</option>
                                            <option value="Guia_Cobro">Guía / Sin Factura</option>
                                        </select>
                                    </div>
                                    {tipoDocumento === 'Factura' && (
                                        <div>
                                            <label className='text-xs font-bold text-slate-500 uppercase'>N° Folio SII</label>
                                            <input type="number"
                                                value={numeroDocumento}
                                                onChange={(e) => setNumeroDocumento(e.target.value)}
                                                placeholder='Ej. 1045'
                                                className='mt-1 w-full border-slate-300 rounded-md text-sm focus:ring-emerald-500'
                                            />
                                        </div>
                                    )}
                                    <div>
                                        <label className='text-xs font-bold text-slate-500 uppercase'>Respaldo (PDF)</label>
                                        <input type="file"
                                            accept='.pdf, image/jpeg, image/png'
                                            onChange={(e) => setArchivoPdf(e.target.files[0])}
                                            className='mt-1 w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100' />
                                    </div>
                                    <div>
                                        <label className='text-xs font-bold text-slate-500 uppercase'>Condición de Pago</label>
                                        <select
                                            value={condicionPago}
                                            onChange={(e) => setCondicionPago(e.target.value)}
                                            className='mt-1 w-full border-slate-300 rounded-md text-sm focus:ring-emerald-500'
                                        >
                                            <option value="Contra_Entrega">Al Contado / Contra Entrega</option>
                                            <option value="Dias_15">15 Días</option>
                                            <option value="Dias_30">30 Días</option>
                                            <option value="Dias_45">45 Días</option>
                                            <option value="Dias_60">60 Días</option>
                                        </select>
                                    </div>
                                </div>
                                <div className='bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-2'>
                                    <div className='flex justify-between text-sm text-slate-600'>
                                        <span>Subtotal ({resumenCobro.cantidad} items): </span>
                                        <span className='font-medium'>${resumenCobro.subtotal.toLocaleString('es-CL')}</span>
                                    </div>
                                    {tipoDocumento === 'Factura' && (
                                        <div className='flex justify-between text-sm text-slate-600'>
                                            <span>IVA (19%): </span>
                                            <span className='font-medium'>${resumenCobro.iva.toLocaleString('es-CL')}</span>
                                        </div>
                                    )}
                                    <div className='flex justify-between text-lg text-slate-800 font-black border-t border-slate-200 pt-2 mt-2'>
                                        <span>Total a Cobrar:</span>
                                        <span className='text-emerald-700'>${resumenCobro.total.toLocaleString('es-CL')}</span>
                                    </div>
                                </div>
                                <button
                                    onClick={handleGenerarCobro}
                                    disabled={procesando}
                                    className='w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50'
                                >
                                    <FileText className='w-4 h-4' />
                                    {procesando ? 'Procesando...' : 'Generar Documento'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )


}