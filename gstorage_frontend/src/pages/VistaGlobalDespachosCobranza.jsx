import React, { useState, useEffect, useMemo } from 'react'
import { useUI } from '../context/UIContext'
import apiClient from '../services/api'
import { Search, Truck, Calendar, Building, Receipt, Eye, Map, User } from 'lucide-react'

export default function VistaGlobalDespachosCobranza() {

    document.title = "DespachosFacturas - GStorage"

    const { showToast } = useUI()
    const [despachos, setDespachos] = useState([])
    const [mercancias, setMercancias] = useState([])
    const [documentosCobro, setDocumentosCobro] = useState([])
    const [proveedores, setProveedores] = useState([])
    const [busquedaRuta, setBusquedaRuta] = useState('')
    const [despachoSeleccionado, setDespachoSeleccionado] = useState(null)
    const [loadingDatos, setLoadingDatos] = useState(true)
    const [filtroEstado, setFiltroEstado] = useState('Todos')
    const [filtroProveedor, setFiltroProveedor] = useState('')
    const [filtroBusquedaGeneral, setFiltroBusquedaGeneral] = useState('')

    const [paginaActual, setPaginaActual] = useState(1)
    const itemsPorPagina = 5

    useEffect(() => {
        const cargarInformacionInicial = async () => {
            try {
                setLoadingDatos(true);
                const [despachosRes, finanzasRes, provRes] = await Promise.all([
                    apiClient.get('/api/inventario/despachos/'),
                    apiClient.get('/api/finanzas/dashboard-consolidado/'),
                    apiClient.get('/api/inventario/proveedores/')
                ]);

                setDespachos(despachosRes.data);
                setDocumentosCobro(finanzasRes.data?.documentos || []);

                const listaProv = provRes.data.results || provRes.data;
                setProveedores(listaProv.map(p => ({
                    id: p.id_proveedor || p.id,
                    nombre_proveedor: p.nombre_proveedor,
                    rut: p.rut
                })));
            } catch (e) {
                console.error("Error en dashboard:", e);
                showToast('Error al cargar catálogos iniciales.', 'error')
            } finally {
                setLoadingDatos(false)
            }
        }
        cargarInformacionInicial()
    }, [])

    const refrescarMercanciasDelDespacho = async () => {
        if (!despachoSeleccionado) return;
        try {
            const response = await apiClient.get(`/api/inventario/mercancias/?id_despacho=${despachoSeleccionado.id_despacho}&page_size=1000`)
            setMercancias(response.data.results || response.data)
        } catch (error) {
            console.log("Error al actualizar mercancías del viaje:", error)
            if (typeof showToast === 'function') {
                showToast('Error al actualizar mercancías del viaje:', 'error')
            }
        }
    }

    useEffect(() => {
        refrescarMercanciasDelDespacho();
    }, [despachoSeleccionado])

    useEffect(() => {
        setPaginaActual(1)
    }, [filtroEstado, filtroProveedor, filtroBusquedaGeneral, despachoSeleccionado])

    const despachosFiltrados = useMemo(() => {
        return despachos.filter(d => {
            const codigoRutaStr = d.id_ruta ? String(d.id_ruta).toLowerCase() : 's/n'
            return codigoRutaStr.includes(busquedaRuta.toLowerCase())
        }).sort((a, b) => Number(b.id_despacho) - Number(a.id_despacho))
    }, [despachos, busquedaRuta])

    const cargasDelDespachoClasificadas = useMemo(() => {
        if (!despachoSeleccionado) return []

        const misCargas = mercancias.filter(m => Number(m.id_despacho) === Number(despachoSeleccionado.id_despacho))

        return misCargas.map(m => {
            const docAsociado = documentosCobro.find(d =>
                m.factura && String(d.numero_documento) === String(m.factura)
            )

            let estadoDeterminado = 'Sin Facturar'
            if (m.factura && docAsociado) {
                estadoDeterminado = docAsociado.estado === 'Pagado' ? 'Pagado Totalmente' : 'En Proceso (Facturado)'
            }

            const provObj = proveedores.find(p => Number(p.id) === Number(m.id_proveedor))
            return {
                id_unico: m.id_mercancia,
                codigo_interno: m.codigo_interno || 'S/N',
                cliente_nombre: m.cliente_nombre || 'S/N',
                proveedor_nombre: provObj ? provObj.nombre_proveedor : 'Proveedor Desconocido',
                factura: m.factura || 'S/N',
                codigo_ruta: despachoSeleccionado.id_ruta || 'S/N',
                fecha: m.fecha_ingreso ? m.fecha_ingreso.split('T')[0] : 'S/F',
                monto: parseFloat(m.precio_total || 0),
                estado: estadoDeterminado,
                tipo_registro: m.factura ? 'Facturado' : 'Sin_Facturar',
                paga_proveedor: m.paga_proveedor
            }
        })
    }, [despachoSeleccionado, mercancias, documentosCobro, proveedores])

    const historialFiltrado = useMemo(() => {
        return cargasDelDespachoClasificadas.filter(item => {
            const matchEstado = filtroEstado === 'Todos' ||
                (filtroEstado === 'Sin Facturar' && item.estado === 'Sin Facturar') ||
                (filtroEstado === 'Emitido' && item.estado === 'En Proceso (Facturado)') ||
                (filtroEstado === 'Pagado' && item.estado === 'Pagado Totalmente')

            const matchProveedor = !filtroProveedor || String(item.proveedor_nombre).toLowerCase().includes(filtroProveedor.toLowerCase())
            const matchGeneral = !filtroBusquedaGeneral ||
                String(item.factura).toLowerCase().includes(filtroBusquedaGeneral.toLowerCase()) ||
                String(item.codigo_interno).toLowerCase().includes(filtroBusquedaGeneral.toLowerCase()) ||
                String(item.cliente_nombre).toLowerCase().includes(filtroBusquedaGeneral.toLowerCase())

            return matchEstado && matchProveedor && matchGeneral;
        })
    }, [cargasDelDespachoClasificadas, filtroEstado, filtroProveedor, filtroBusquedaGeneral])

    const metricsDespacho = useMemo(() => {
        const cargas = cargasDelDespachoClasificadas
        const sin_facturar = cargas.filter(c => c.estado === 'Sin Facturar').reduce((sum, c) => sum + c.monto, 0)
        const facturado = cargas.filter(c => c.estado === 'En Proceso (Facturado)').reduce((sum, c) => sum + c.monto, 0)
        const pagado = cargas.filter(c => c.estado === 'Pagado Totalmente').reduce((sum, c) => sum + c.monto, 0)
        const total = sin_facturar + facturado + pagado

        if (total === 0) return { pPagado: 0, pFacturado: 0, pSinFacturar: 0, total: 0, sin_facturar: 0, facturado: 0, pagado: 0 }

        return {
            pPagado: (pagado / total) * 100,
            pFacturado: (facturado / total) * 100,
            pSinFacturar: (sin_facturar / total) * 100,
            total, sin_facturar, facturado, pagado
        }
    }, [cargasDelDespachoClasificadas])
    const totalPaginas = Math.ceil(historialFiltrado.length / itemsPorPagina)
    const historialPaginado = useMemo(() => {
        const inicio = (paginaActual - 1) * itemsPorPagina;
        return historialFiltrado.slice(inicio, inicio + itemsPorPagina)
    }, [historialFiltrado, paginaActual])

    const handleDescargarExcel = async () => {
        if (!despachoSeleccionado) {
            if (typeof showToast === 'function') {
                showToast('Por favor, selecciona un despacho primero.', 'error')
            }
            return
        }

        try {
            if (typeof showLoader === 'function') showLoader()

            const response = await apiClient.get(
                `/api/finanzas/despachos-cobranza/${despachoSeleccionado.id_despacho}/exportar-excel/`,
                { responseType: 'blob' }
            );
            const urlBlob = window.URL.createObjectURL(new Blob([response.data]))
            const linkDescarga = document.createElement('a')
            linkDescarga.href = urlBlob
            const codigoRuta = despachoSeleccionado.id_ruta || 'Sin_Ruta';
            linkDescarga.setAttribute('download', `Facturacion_Despacho_Ruta_${codigoRuta}.xlsx`)
            document.body.appendChild(linkDescarga)
            linkDescarga.click()

            document.body.removeChild(linkDescarga)
            window.URL.revokeObjectURL(urlBlob)

            if (typeof showToast === 'function') {
                showToast('Excel contable descargado con éxito.', 'success')
            }
        } catch (error) {
            console.error("Error al obtener el reporte Excel de AWS:", error)
            if (typeof showToast === 'function') {
                showToast('Error al conectar con el servidor contable.', 'error')
            }
        } finally {
            if (typeof hideLoader === 'function') hideLoader()
        }
    }

    if (loadingDatos) {
        return <div className="min-h-screen flex items-center justify-center bg-slate-100 text-slate-600 font-medium">Sincronizando flujos de despacho globales...</div>
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-6 font-sans">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

                <div className="lg:col-span-1 bg-slate-900 text-white rounded-2xl p-4 shadow-xl border border-slate-800 flex flex-col h-[calc(100vh-120px)]">
                    <div className="relative mb-4">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar por Código de Ruta..."
                            value={busquedaRuta}
                            onChange={(e) => setBusquedaRuta(e.target.value)}
                            className="w-full bg-slate-800 border-none rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-2 pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-slate-950 [&::-webkit-scrollbar-track]:rounded-r-xl [&::-webkit-scrollbar-thumb]:bg-slate-600 [&::-webkit-scrollbar-thumb]:rounded-full">
                        {despachosFiltrados.map(d => (
                            <div
                                key={d.id_despacho}
                                onClick={() => setDespachoSeleccionado(d)}
                                className={`py-2.5 px-3 rounded-xl cursor-pointer transition-all border ${despachoSeleccionado?.id_despacho === d.id_despacho
                                    ? 'bg-red-800 border-red-500 shadow-md scale-[1.0]'
                                    : 'bg-slate-800/60 border-red-950/40 hover:bg-slate-800/90'
                                    }`}
                            >
                                <div className="font-bold text-xs text-slate-100 flex justify-between items-center">
                                    <span className="flex items-center gap-1">
                                        {d.id_ruta || 'S/N'}
                                    </span>
                                    <span className="text-[9px] bg-slate-900/60 px-1.5 py-0.5 rounded text-slate-300 font-normal">Viaje #{d.id_despacho}</span>
                                </div>
                                <div className="text-[10px] mt-1.5 flex items-center gap-1 text-slate-400">
                                    <User className="w-3 h-3 shrink-0 text-red-500" />
                                    <span className="truncate text-red-500">{d.nombre_conductor || 'Sin Conductor'}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="lg:col-span-3 space-y-6">
                    {despachoSeleccionado ? (
                        <>
                            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                                <div className="flex justify-center items-center gap-4 col-span-1">
                                    <div className="relative w-32 h-32 shrink-0">
                                        <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                                            <circle cx="18" cy="18" r="15.915" fill="none" stroke="#cbd5e1" strokeWidth="3.5" />
                                            <circle cx="18" cy="18" r="15.915" fill="none" stroke="#3b82f6" strokeWidth="3.5" strokeDasharray={`${metricsDespacho.pFacturado + metricsDespacho.pPagado} ${100 - (metricsDespacho.pFacturado + metricsDespacho.pPagado)}`} />
                                            <circle cx="18" cy="18" r="15.915" fill="none" stroke="#10b981" strokeWidth="3.5" strokeDasharray={`${metricsDespacho.pPagado} ${100 - metricsDespacho.pPagado}`} />
                                        </svg>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-2">
                                            <span className="text-[9px] uppercase font-black text-slate-400 leading-none">Total Viaje</span>
                                            <span className="text-xs font-black text-slate-800 mt-0.5">${Math.round(metricsDespacho.total).toLocaleString('es-CL')}</span>
                                        </div>
                                    </div>
                                    <div className="text-xs space-y-1.5 w-full">
                                        <div className="flex items-center gap-1.5 font-bold text-slate-700"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block shrink-0" /> Recaudado ({Math.round(metricsDespacho.pPagado)}%)</div>
                                        <div className="flex items-center gap-1.5 font-bold text-slate-700"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 block shrink-0" /> Facturado ({Math.round(metricsDespacho.pFacturado)}%)</div>
                                        <div className="flex items-center gap-1.5 font-bold text-slate-700"><span className="w-2.5 h-2.5 rounded-full bg-slate-300 block shrink-0" /> Retenido ({Math.round(metricsDespacho.pSinFacturar)}%)</div>
                                    </div>
                                </div>
                                <div className="md:col-span-2 grid grid-cols-3 gap-3 text-center">
                                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                        <div className="text-[9px] uppercase font-black text-slate-400 mb-1">Pendiente Factura</div>
                                        <div className="text-xs font-black text-slate-700">${Math.round(metricsDespacho.sin_facturar).toLocaleString('es-CL')}</div>
                                    </div>
                                    <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                                        <div className="text-[9px] uppercase font-black text-blue-500 mb-1">En Proceso Cobro</div>
                                        <div className="text-xs font-black text-blue-700">${Math.round(metricsDespacho.facturado).toLocaleString('es-CL')}</div>
                                    </div>
                                    <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                                        <div className="text-[9px] uppercase font-black text-emerald-500 mb-1">Liquidado Exitoso</div>
                                        <div className="text-xs font-black text-emerald-700">${Math.round(metricsDespacho.pagado).toLocaleString('es-CL')}</div>
                                    </div>
                                    <div className="flex justify-end items-center mt-1">
                                        <button
                                            onClick={handleDescargarExcel}
                                            disabled={!despachoSeleccionado || loadingDatos}
                                            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm transition-all"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" /><path d="M8 13h2" /><path d="M14 13h2" /><path d="M8 17h2" /><path d="M14 17h2" /><path d="M10 11v8" /><path d="M14 11v8" /></svg>
                                            Descargar Excel
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                                    <div className="flex flex-col space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Búsqueda General</label>
                                        <input
                                            type="text"
                                            placeholder="Buscar por Factura, Cliente o Cód..."
                                            value={filtroBusquedaGeneral}
                                            onChange={(e) => setFiltroBusquedaGeneral(e.target.value)}
                                            className="w-full border-slate-200 bg-slate-50/50 rounded-lg text-xs focus:ring-red-500 focus:bg-white transition-all py-2"
                                        />
                                    </div>
                                    <div className="flex flex-col space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Proveedor</label>
                                        <input
                                            type="text"
                                            placeholder="Filtrar por Proveedor..."
                                            value={filtroProveedor}
                                            onChange={(e) => setFiltroProveedor(e.target.value)}
                                            className="w-full border-slate-200 bg-slate-50/50 rounded-lg text-xs focus:ring-red-500 focus:bg-white transition-all py-2"
                                        />
                                    </div>
                                    <div className="flex flex-col space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Filtrar Estado</label>
                                        <select
                                            value={filtroEstado}
                                            onChange={(e) => setFiltroEstado(e.target.value)}
                                            className="w-full border-slate-200 bg-slate-50/50 rounded-lg text-xs focus:ring-red-500 focus:bg-white transition-all py-2 cursor-pointer"
                                        >
                                            <option value="Todos">Todos los Estados</option>
                                            <option value="Sin Facturar">Pendiente (Sin Facturar)</option>
                                            <option value="Emitido">En Proceso (Facturado)</option>
                                            <option value="Pagado">Pagado totalmente</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                                        <tr>
                                            <th className="p-4 w-[15%]">Cód. Interno</th>
                                            <th className="p-4 w-[20%]">Cliente Destino</th>
                                            <th className="p-4 w-[20%]">Proveedor Origen</th>
                                            <th className="p-4 w-[18%]">N° Factura / Ruta</th>
                                            <th className="p-4 flex items-center gap-1 w-[12%]"><Calendar className="w-3 h-3" /> Fecha</th>
                                            <th className="p-4 text-right w-[15%]">Monto</th>
                                            <th className="p-4 text-center w-[15%]">Estado</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {historialPaginado.length === 0 ? (
                                            <tr>
                                                <td colSpan="7" className="text-center py-8 text-slate-400 font-medium">
                                                    No se encontraron mercancías asignadas bajo este filtro.
                                                </td>
                                            </tr>
                                        ) : (
                                            historialPaginado.map(item => (
                                                <tr key={item.id_unico} className="hover:bg-slate-50/80 transition-colors align-top">
                                                    <td className="p-4 font-bold text-slate-800">{item.codigo_interno}</td>

                                                    <td className="p-4 text-slate-700 font-medium truncate max-w-[140px]" title={item.cliente_nombre}>
                                                        {item.cliente_nombre}
                                                    </td>

                                                    <td className={`p-4 font-medium ${item.paga_proveedor ? 'bg-blue-600/5 text-blue-700' : 'text-slate-600'}`}>
                                                        <div className="flex items-center gap-1">
                                                            {item.paga_proveedor && <Building className="w-3 h-3 text-blue-600 shrink-0" />}
                                                            <span className="text-xs font-bold text-blue-700 px-2 py-1">
                                                                {item.proveedor_nombre}
                                                            </span>
                                                        </div>
                                                    </td>

                                                    <td className="p-4 leading-tight">
                                                        <div className="flex flex-col">
                                                            <span className={`text-[10px] font-black ${item.factura !== 'S/N' ? 'text-blue-600' : 'text-slate-400'}`}>
                                                                Fact: {item.factura}
                                                            </span>
                                                            <span className="text-[9px] font-bold text-slate-500 mt-0.5">
                                                                Ruta: {item.codigo_ruta}
                                                            </span>
                                                        </div>
                                                    </td>

                                                    <td className="p-4 text-slate-500 font-medium whitespace-nowrap">{item.fecha}</td>

                                                    <td className="p-4 text-right font-bold text-slate-800">${Math.round(item.monto).toLocaleString('es-CL')}</td>

                                                    <td className="p-4 text-center">
                                                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border block text-center ${item.state === 'Pagado Totalmente' || item.estado === 'Pagado Totalmente'
                                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                            item.estado === 'Sin Facturar'
                                                                ? 'bg-rose-50 text-rose-700 border-rose-100' :
                                                                'bg-blue-50 text-blue-700 border-blue-200'
                                                            }`}>
                                                            {item.estado === 'En Proceso (Facturado)' ? 'Facturado' : item.estado}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {totalPaginas > 1 && (
                                <div className="bg-slate-50 px-4 py-3 rounded-2xl border border-slate-200 flex items-center justify-between text-xs text-slate-600 shadow-sm">
                                    <div>
                                        Mostrando <span className="font-bold text-slate-800">{((paginaActual - 1) * itemsPorPagina) + 1}</span> al{' '}
                                        <span className="font-bold text-slate-800">
                                            {Math.min(paginaActual * itemsPorPagina, historialFiltrado.length)}
                                        </span>{' '}
                                        de <span className="font-bold text-slate-800">{historialFiltrado.length}</span> ítems.
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <button onClick={() => setPaginaActual(prev => Math.max(prev - 1, 1))} disabled={paginaActual === 1} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-medium hover:bg-slate-50 text-slate-700 disabled:opacity-40">Anterior</button>
                                        <div className="flex items-center px-2 font-semibold text-slate-700">Página {paginaActual} de {totalPaginas}</div>
                                        <button onClick={() => setPaginaActual(prev => Math.min(prev + 1, totalPaginas))} disabled={paginaActual === totalPaginas} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-medium hover:bg-slate-50 text-slate-700 disabled:opacity-40">Siguiente</button>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 p-16 text-center text-slate-400">
                            <Truck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                            <h3 className="font-bold text-sm text-slate-700">Ningún viaje seleccionado</h3>
                            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">Selecciona una ruta de la lista de la izquierda para desplegar el desglose operativo de su facturación.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}