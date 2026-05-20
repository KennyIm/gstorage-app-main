import React, { useState, useEffect, useMemo } from 'react'
import { useUI } from '../context/UIContext'
import apiClient from '../services/api'
import { Search, User, Filter, Calendar, FileText, CheckCircle, AlertTriangle, Building } from 'lucide-react'

export default function PerfilFinancieroCliente() {
    const { showToast } = useUI()

    const [clientes, setClientes] = useState([])
    const [busquedaCliente, setBusquedaCliente] = useState('')
    const [clienteSeleccionado, setClienteSeleccionado] = useState(null)
    const [datosPerfil, setDatosPerfil] = useState(null)
    const [loadingPerfil, setLoadingPerfil] = useState(false)

    const [filtroEstado, setFiltroEstado] = useState('Todos')
    const [filtroProveedor, setFiltroProveedor] = useState('')
    const [filtroBusquedaGeneral, setFiltroBusquedaGeneral] = useState('')

    const [paginaActual, setPaginaActual] = useState(1)
    const itemsPorPagina = 5


    useEffect(() => {
        const cargarClientes = async () => {
            try {
                const res = await apiClient.get('/api/inventario/clientes/');
                const listaClientes = res.data.results || res.data;

                setClientes(listaClientes.map(c => ({
                    id: c.id_cliente,
                    nombre: c.nombre_cliente,
                    rut: c.rut_cliente
                })));
            } catch (e) {
                showToast('Error al cargar el catálogo de clientes.', 'error');
            }
        };
        cargarClientes();
    }, []);

    useEffect(() => {
        setPaginaActual(1)
    }, [filtroEstado, filtroProveedor, filtroBusquedaGeneral, clienteSeleccionado]);

    useEffect(() => {
        if (!clienteSeleccionado) return
        const cargarPerfil = async () => {
            setLoadingPerfil(true)
            try {
                const res = await apiClient.get(`/api/finanzas/clientes/${clienteSeleccionado.id}/perfil-financiero/`)
                setDatosPerfil(res.data)
            } catch (e) {
                showToast('Error al cargar el perfil financiero.', 'error')
            } finally {
                setLoadingPerfil(false)
            }
        }
        cargarPerfil()
    }, [clienteSeleccionado])

    const clientesFiltrados = clientes.filter(c =>
        c.nombre.toLowerCase().includes(busquedaCliente.toLocaleLowerCase()) ||
        (c.rut && c.rut.toLowerCase().includes(busquedaCliente.toLocaleLowerCase()))
    )

    const historialFiltrado = useMemo(() => {
        if (!datosPerfil?.historial) return []
        return datosPerfil.historial.filter(item => {
            const matchEstado = filtroEstado === 'Todos' || item.estado === filtroEstado
            const matchProveedor = !filtroProveedor || item.proveedor_nombre.toLowerCase().includes(filtroProveedor.toLowerCase())
            const matchGeneral = !filtroBusquedaGeneral || String(item.numero).toLowerCase().includes(filtroBusquedaGeneral.toLowerCase())

            return matchEstado && matchProveedor && matchGeneral
        })
    }, [datosPerfil, filtroEstado, filtroProveedor, filtroBusquedaGeneral])

    const graficoProps = useMemo(() => {
        if (!datosPerfil?.metricas) return { pPagado: 0, pFacturado: 0, pSinFacturar: 0 }
        const { pagado, facturado, sin_facturar } = datosPerfil.metricas
        const total = pagado + facturado + sin_facturar
        if (total === 0) return { pPagado: 0, pFacturado: 0, pSinFacturar: 100 }
        return {
            pPagado: (pagado / total) * 100,
            pFacturado: (facturado / total) * 100,
            pSinFacturar: (sin_facturar / total) * 100,
            total
        }
    }, [datosPerfil])

    const totalPaginas = Math.ceil(historialFiltrado.length / itemsPorPagina);

    const historialPaginado = useMemo(() => {
        const inicio = (paginaActual - 1) * itemsPorPagina;
        const fin = inicio + itemsPorPagina;
        return historialFiltrado.slice(inicio, fin);
    }, [historialFiltrado, paginaActual]);

    return (
        <div className="max-w-7xl mx-auto px-4 py-6 font-sans">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-1 bg-slate-900 text-white rounded-2xl p-4 shadow-xl border border-slate-800 flex flex-col h-[calc(100vh-120px)]">
                    <div className="relative mb-4">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar cliente por RUT o Nombre..."
                            value={busquedaCliente}
                            onChange={(e) => setBusquedaCliente(e.target.value)}
                            className="w-full bg-slate-800 border-none rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500"
                        />
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-2 pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-[#960018] [&::-webkit-scrollbar-track]:rounded-r-xl [&::-webkit-scrollbar-thumb]:bg-slate-400 [&::-webkit-scrollbar-thumb]:rounded-full">
                        {clientesFiltrados.map(c => (
                            <div
                                key={c.id}
                                onClick={() => setClienteSeleccionado(c)}
                                className={`py-2 px-3 rounded-xl cursor-pointer transition-all border ${clienteSeleccionado?.id === c.id
                                    ? 'bg-red-800 border-red-500 shadow-md scale-[1.0]'
                                    : 'bg-slate-800/60 border-[#960018] hover:bg-slate-800/90'
                                    }`}
                            >
                                <div className="font-bold text-xs truncate text-slate-100">{c.nombre}</div>
                                <div className={`text-[10px] mt-0.5 ${clienteSeleccionado?.id === c.id ? 'text-emerald-100' : 'text-slate-400'}`}>{c.rut}</div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="lg:col-span-3 space-y-6">
                    {clienteSeleccionado ? (
                        loadingPerfil ? (
                            <div className="p-12 text-center text-slate-500 font-medium">Cargando expediente del cliente...</div>
                        ) : datosPerfil ? (
                            <>
                                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6 items-center">

                                    <div className="flex justify-center items-center gap-4 col-span-1">
                                        <div className="relative w-32 h-32">
                                            <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                                                <circle cx="18" cy="18" r="15.915" fill="none" stroke="#cbd5e1" strokeWidth="3.5" />
                                                <circle cx="18" cy="18" r="15.915" fill="none" stroke="#3b82f6" strokeWidth="3.5"
                                                    strokeDasharray={`${graficoProps.pFacturado + graficoProps.pPagado} ${100 - (graficoProps.pFacturado + graficoProps.pPagado)}`}
                                                />
                                                <circle cx="18" cy="18" r="15.915" fill="none" stroke="#10b981" strokeWidth="3.5"
                                                    strokeDasharray={`${graficoProps.pPagado} ${100 - graficoProps.pPagado}`}
                                                />
                                            </svg>
                                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                                                <span className="text-[10px] uppercase font-bold text-slate-400">Total</span>
                                                <span className="text-xs font-black text-slate-800">${Math.round(graficoProps.total).toLocaleString('es-CL')}</span>
                                            </div>
                                        </div>

                                        <div className="text-xs space-y-1.5">
                                            <div className="flex items-center gap-1.5 font-medium text-slate-700">
                                                <span className="w-3 h-3 rounded-full bg-emerald-500 block"></span> Pagados ({Math.round(graficoProps.pPagado)}%)
                                            </div>
                                            <div className="flex items-center gap-1.5 font-medium text-slate-700">
                                                <span className="w-3 h-3 rounded-full bg-blue-500 block"></span> Facturados ({Math.round(graficoProps.pFacturado)}%)
                                            </div>
                                            <div className="flex items-center gap-1.5 font-medium text-slate-700">
                                                <span className="w-3 h-3 rounded-full bg-slate-300 block"></span> Sin Facturar ({Math.round(graficoProps.pSinFacturar)}%)
                                            </div>
                                        </div>
                                    </div>

                                    <div className="md:col-span-2 grid grid-cols-3 gap-3 text-center">
                                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                            <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Sin Facturar</div>
                                            <div className="text-sm font-black text-slate-700">${datosPerfil.metricas.sin_facturar.toLocaleString('es-CL')}</div>
                                        </div>
                                        <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                                            <div className="text-[10px] uppercase font-bold text-blue-500 mb-1">Facturado Vivos</div>
                                            <div className="text-sm font-black text-blue-700">${datosPerfil.metricas.facturado.toLocaleString('es-CL')}</div>
                                        </div>
                                        <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                                            <div className="text-[10px] uppercase font-bold text-emerald-500 mb-1">Pagado Histórico</div>
                                            <div className="text-sm font-black text-emerald-700">${datosPerfil.metricas.pagado.toLocaleString('es-CL')}</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-4">

                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                                        {/* Input Documento */}
                                        <div className="flex flex-col space-y-1">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Identificador Operación</label>
                                            <input
                                                type="text"
                                                placeholder="N° Documento o Orden..."
                                                value={filtroBusquedaGeneral}
                                                onChange={(e) => setFiltroBusquedaGeneral(e.target.value)}
                                                className="w-full border-slate-200 bg-slate-50/50 rounded-lg text-xs focus:ring-emerald-500 focus:bg-white transition-all py-2"
                                            />
                                        </div>

                                        {/* Input Proveedor */}
                                        <div className="flex flex-col space-y-1">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Proveedor</label>
                                            <input
                                                type="text"
                                                placeholder="Buscar por Proveedor..."
                                                value={filtroProveedor}
                                                onChange={(e) => setFiltroProveedor(e.target.value)}
                                                className="w-full border-slate-200 bg-slate-50/50 rounded-lg text-xs focus:ring-emerald-500 focus:bg-white transition-all py-2"
                                            />
                                        </div>

                                        {/* Selector Estado */}
                                        <div className="flex flex-col space-y-1 sm:col-span-2 md:col-span-1">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Estado de Cobranza</label>
                                            <select
                                                value={filtroEstado}
                                                onChange={(e) => setFiltroEstado(e.target.value)}
                                                className="w-full border-slate-200 bg-slate-50/50 rounded-lg text-xs focus:ring-emerald-500 focus:bg-white transition-all py-2 cursor-pointer"
                                            >
                                                <option value="Todos">Todos los Estados</option>
                                                <option value="Sin Facturar">Sin Facturar</option>
                                                <option value="Emitido (Por Pagar)">Emitido</option>
                                                <option value="Abonado">Abonado</option>
                                                <option value="Pagado Totalmente">Pagado totalmente</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                    <table className="w-full text-xs text-left">
                                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                                            <tr>
                                                <th className="p-4">Identificador / N°</th>
                                                <th className="p-4">Proveedor Origen</th>
                                                <th className="p-4 flex items-center gap-1"><Calendar className="w-3 h-3" /> Fecha Registro</th>
                                                <th className="p-4 text-right">Monto Neto/Total</th>
                                                <th className="p-4 text-center">Estado</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {historialPaginado.length === 0 ? (
                                                <tr>
                                                    <td colSpan="5" className="text-center py-8 text-slate-400 font-medium">
                                                        No se encontraron registros que coincidan con los filtros.
                                                    </td>
                                                </tr>
                                            ) : (
                                                historialPaginado.map(item => (
                                                    <tr key={item.id_unico} className="hover:bg-slate-50/80 transition-colors">
                                                        <td className="p-4 font-bold text-slate-800">
                                                            {item.tipo_registro === 'Sin_Facturar' ? (
                                                                <span className="text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded text-[10px] font-normal mr-1.5">Orden</span>
                                                            ) : (
                                                                <span className="text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded text-[10px] font-normal mr-1.5">Doc</span>
                                                            )}
                                                            {item.numero}
                                                        </td>

                                                        <td className={`p-4 font-medium transition-colors ${item.paga_proveedor ? 'bg-blue-600/10 text-blue-700 border-x border-blue-100/40' : 'text-slate-600'}`}>
                                                            <div className="flex items-center gap-1.5">
                                                                {item.paga_proveedor && <Building className="w-3 h-3 text-blue-600 shrink-0" />}
                                                                <span className="line-clamp-1">{item.proveedor_nombre}</span>
                                                            </div>
                                                        </td>

                                                        <td className="p-4 text-slate-500 font-medium">{item.fecha}</td>
                                                        <td className="p-4 text-right font-bold text-slate-800">${Math.round(item.monto).toLocaleString('es-CL')}</td>
                                                        <td className="p-4 text-center">
                                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border ${item.estado === 'Pagado Totalmente' || item.estado === 'Pagado' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                                item.estado === 'Sin Facturar' ? 'bg-slate-100 text-slate-600 border-slate-200' :
                                                                    item.estado === 'Abonado' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                                        'bg-blue-50 text-blue-700 border-blue-200'
                                                                }`}>
                                                                {item.estado}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                {totalPaginas > 1 && (
                                    <div className="bg-slate-50 px-4 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                                        <div>
                                            Mostrando <span className="font-bold text-slate-800">{((paginaActual - 1) * itemsPorPagina) + 1}</span> al{' '}
                                            <span className="font-bold text-slate-800">
                                                {Math.min(paginaActual * itemsPorPagina, historialFiltrado.length)}
                                            </span>{' '}
                                            de <span className="font-bold text-slate-800">{historialFiltrado.length}</span> documentos.
                                        </div>

                                        <div className="flex items-center gap-1.5">
                                            <button
                                                onClick={() => setPaginaActual(prev => Math.max(prev - 1, 1))}
                                                disabled={paginaActual === 1}
                                                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-medium hover:bg-slate-50 text-slate-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed select-none"
                                            >
                                                Anterior
                                            </button>

                                            <div className="flex items-center px-2 font-semibold text-slate-700">
                                                Página {paginaActual} de {totalPaginas}
                                            </div>

                                            <button
                                                onClick={() => setPaginaActual(prev => Math.min(prev + 1, totalPaginas))}
                                                disabled={paginaActual === totalPaginas}
                                                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-medium hover:bg-slate-50 text-slate-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed select-none"
                                            >
                                                Siguiente
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : null
                    ) : (
                        <div className="bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 p-16 text-center text-slate-400">
                            <User className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                            <h3 className="font-bold text-sm text-slate-700">Ningún cliente seleccionado</h3>
                            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">Selecciona un cliente de la lista de la izquierda para desplegar su panel financiero avanzado.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
