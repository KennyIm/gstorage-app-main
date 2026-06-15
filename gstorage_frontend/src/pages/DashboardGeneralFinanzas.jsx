import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import apiClient from '../services/api'
import { useUI } from '../context/UIContext'
import {
    TrendingUp, AlertTriangle, Layers, Search, Calendar,
    RefreshCw, FileSpreadsheet, ArrowUpRight, ArrowDownRight, CircleDot,
    Building2, User2, BarChart3, Users, BarChart, Landmark, Eye, Receipt,
    ChartSpline,
    ChartPie
} from 'lucide-react'

export default function DashboardGeneralFinanzas() {

    document.title = "DashboardFinanzas - GStorage"
    
    const navigate = useNavigate()
    const { showToast } = useUI();
    const [vistaGrafico, setVistaGrafico] = useState('curva')
    const [filtroGrafico, setFiltroGrafico] = useState('mensual')
    const [periodo, setPeriodo] = useState(new Date().toISOString().split('T')[0].substring(0, 7))
    const [esHistorico, setEsHistorico] = useState(false)
    const [modoIva, setModoIva] = useState("CON_IVA")
    const [filtroDeudorRut, setFiltroDeudorRut] = useState("")
    const [paginaTabla, setPaginaTabla] = useState(1)
    const rowsPorPagina = 5
    const [dbData, setDbData] = useState(null)
    const [cargando, setCargando] = useState(true)
    const [despachos, setDespachos] = useState()
    const [mercancias, setMercancias] = useState()

    const fetchDashboardContable = async () => {
        setCargando(true)
        try {
            const response = await apiClient.get('/api/finanzas/dashboard-consolidado/')
            const despachosRes = await apiClient.get('/api/inventario/despachos/')
            const mercanciasRes = await apiClient.get('/api/inventario/mercancias/')
            setDbData(response.data)
            setDespachos(despachosRes.data)
            setMercancias(mercanciasRes.data)
        } catch (error) {
            showToast('Error al conectar con el servidor contable.', 'error')
        } finally {
            setCargando(false)
        }
    }

    useEffect(() => {
        fetchDashboardContable()
    }, [])

    useEffect(() => {
        setPaginaTabla(1)
    }, [periodo, esHistorico, filtroDeudorRut, modoIva])

    const metricasContables = useMemo(() => {
        if (!dbData || !dbData.documentos) return { ingresosBrutos: 0, egresosBrutos: 0, cuentasPorCobrar: 0, cuentasPorPagar: 0, resultadoNeto: 0, ivaDebito: 0, ivaCredito: 0, F29_Estimado: 0, aging: { alDia: 0, v1_30: 0, v30_60: 0 } };

        const esConIva = modoIva === "CON_IVA"
        const factorIva = esConIva ? 1.19 : 1.0
        let totalVentasNeto = 0
        let totalComprasNeto = 0
        let cuentasPorCobrar = 0
        let agingAlDia = 0
        let agingVencido1_30 = 0
        let agingVencido30_60 = 0
        const hoy = new Date()
        dbData.documentos.forEach(d => {
            const cumpleFiltroTiempo = esHistorico ? true : d.fecha_emision.startsWith(periodo)
            const deudadoDoc = parseFloat(d.saldo_pendiente || 0) * (esConIva ? 1.0 : (1 / 1.19))

            if (cumpleFiltroTiempo) {
                if (d.tipo_documento === 'Factura' || d.subtotal > 0) {
                    totalVentasNeto += d.tipo_documento === 'VENTA' || d.subtotal ? parseFloat(d.subtotal || 0) : 0;
                }
                if (String(d.folio).startsWith('FE') || d.entidad) {
                    if (!d.tipo_documento || d.tipo_documento === 'Factura') {
                        totalVentasNeto += parseFloat(d.subtotal || 0)
                    }
                }
            }

            if (d.estado !== 'Pagado' && d.estado !== 'Anulado') {
                cuentasPorCobrar += deudadoDoc
                const fechaVence = new Date(d.fecha_vencimiento);
                const diasDiferencia = Math.floor((hoy - fechaVence) / (1000 * 60 * 60 * 24));

                if (diasDiferencia <= 0) agingAlDia += deudadoDoc
                else if (diasDiferencia <= 30) agingVencido1_30 += deudadoDoc
                else agingVencido30_60 += deudadoDoc
            }
        });

        if (dbData.grafico_mensual) {
            dbData.grafico_mensual.forEach(g => {
                if (esHistorico || g.mes === periodo) {
                    totalComprasNeto += (g.compras || 0) / 1.19
                }
            });
        }

        const ivaDebito = totalVentasNeto * 0.19
        const ivaCredito = totalComprasNeto * 0.19
        const cuentasPorPagarReal = (dbData.cuentas_por_pagar_exigible || 0) * factorIva

        const ingresosFinales = totalVentasNeto * factorIva
        const egresosFinales = totalComprasNeto * factorIva

        return {
            ingresosBrutos: ingresosFinales,
            egresosBrutos: egresosFinales,
            cuentasPorCobrar,
            cuentasPorPagar: cuentasPorPagarReal,
            resultadoNeto: ingresosFinales - egresosFinales,
            ivaDebito,
            ivaCredito,
            F29_Estimado: Math.max(0, ivaDebito - ivaCredito),
            aging: { alDia: agingAlDia, v1_30: agingVencido1_30, v30_60: agingVencido30_60 }
        };
    }, [dbData, modoIva, periodo, esHistorico]);

    const { listadoMensual, maxValorEscala, yAxisTicks } = useMemo(() => {
        if (!dbData || !dbData.grafico_mensual) return { listadoMensual: [], maxValorEscala: 1, yAxisTicks: [] }
        const factor = modoIva === "CON_IVA" ? 1.19 : 1.0

        const listado = dbData.grafico_mensual.map(g => {
            const vFact = (g.ventas_facturadas || 0) * factor
            const vNoFact = (g.ventas_por_facturar || 0) * factor
            return {
                mes: g.mes,
                ventas: vFact + vNoFact,
                compras: (g.compras || 0) * factor
            };
        }).filter(g => g.ventas > 0 || g.compras > 0);

        const peak = Math.max(...listado.map(m => Math.max(m.ventas, m.compras)), 1);

        let intervalo = 100000;
        if (peak > 500000000) intervalo = 100000000
        else if (peak > 100000000) intervalo = 20000000
        else if (peak > 50000000) intervalo = 10000000
        else if (peak > 10000000) intervalo = 2000000
        else if (peak > 5000000) intervalo = 1000000
        else if (peak > 1000000) intervalo = 200000
        const maxValorEscala = Math.ceil(peak / intervalo) * intervalo
        const ticks = []
        for (let valor = 0; valor <= maxValorEscala; valor += intervalo) {
            ticks.push(valor)
        }

        return { listadoMensual: listado, maxValorEscala, yAxisTicks: ticks };
    }, [dbData, modoIva])

    const flujoClientesData = useMemo(() => {
        if (!dbData || !dbData.documentos) return []
        const esConIva = modoIva === "CON_IVA"
        const factor = esConIva ? 1.19 : 1.0
        const mapa = {}

        dbData.documentos.forEach(d => {
            if (!mapa[d.entidad]) {
                mapa[d.entidad] = { nombre: d.entidad, rut: d.rut, totalFacturado: 0, totalPagado: 0 }
            }
            const totalDoc = parseFloat(esConIva ? d.total_a_pagar : d.subtotal || 0)
            const pendienteDoc = parseFloat(d.saldo_pendiente || 0) * (esConIva ? 1.0 : (1 / 1.19))
            mapa[d.entidad].totalFacturado += totalDoc
            mapa[d.entidad].totalPagado += (totalDoc - pendienteDoc)
        });

        return Object.values(mapa).sort((a, b) => b.totalFacturado - a.totalFacturado).slice(0, 5);
    }, [dbData, modoIva])
    const deudoresFiltrados = useMemo(() => {
        if (!dbData || !dbData.documentos) return []
        const esConIva = modoIva === "CON_IVA"
        const termLimpio = filtroDeudorRut.replace(/[^0-9kK]/g, '').toLowerCase()

        return dbData.documentos
            .filter(d => esHistorico ? true : d.fecha_emision.startsWith(periodo))
            .map(d => ({
                id: d.id,
                folio: d.numero_documento ? `F-${d.numero_documento}` : "Borrador",
                entidad: d.entidad,
                rut: d.rut,
                emision: d.fecha_emision,
                vencimiento: d.fecha_vencimiento,
                monto_total_doc: parseFloat(esConIva ? d.total_a_pagar : d.subtotal || 0),
                monto_vista: parseFloat(d.saldo_pendiente || 0) * (esConIva ? 1.0 : (1 / 1.19)),
                estado: d.estado
            }))
            .filter(d => !filtroDeudorRut || d.rut.replace(/[^0-9kK]/g, '').toLowerCase().includes(termLimpio));
    }, [dbData, filtroDeudorRut, modoIva, periodo, esHistorico])

    const totalPaginasTabla = Math.ceil(deudoresFiltrados.length / rowsPorPagina)
    const deudoresPaginados = useMemo(() => {
        const inicio = (paginaTabla - 1) * rowsPorPagina
        return deudoresFiltrados.slice(inicio, inicio + rowsPorPagina)
    }, [deudoresFiltrados, paginaTabla]);

    if (cargando) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-slate-400 gap-3">
                <RefreshCw className="w-7 h-7 animate-spin text-indigo-600" />
                <span className="font-bold text-xs tracking-wider uppercase">Sincronizando balances con AWS...</span>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-5 text-slate-700 bg-slate-50 min-h-screen text-xs select-none">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 mb-4">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded text-[10px] uppercase border border-indigo-200">Dashboard Financiero</span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="bg-slate-100 p-0.5 rounded-lg border border-slate-200 flex">
                        <button
                            onClick={() => setEsHistorico(false)}
                            className={`px-3 py-1.5 rounded-md font-bold text-[11px] transition-all ${!esHistorico ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}
                        >
                            Filtro Mensual
                        </button>
                        <button
                            onClick={() => setEsHistorico(true)}
                            className={`px-3 py-1.5 rounded-md font-bold text-[11px] transition-all ${esHistorico ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}
                        >
                            Historial Completo
                        </button>
                    </div>

                    {!esHistorico && (
                        <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200 animate-fadeIn">
                            <Calendar className="w-3.5 h-3.5 text-slate-500" />
                            <input type="month" value={periodo} onChange={(e) => setPeriodo(e.target.value)} className="bg-transparent border-none p-0 text-xs text-slate-700 focus:ring-0 font-bold cursor-pointer" />
                        </div>
                    )}

                    <div className="bg-slate-100 p-0.5 rounded-lg border border-slate-200 flex">
                        <button onClick={() => setModoIva("CON_IVA")} className={`px-3 py-1.5 rounded-md font-bold transition-all text-[11px] ${modoIva === "CON_IVA" ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Con IVA</button>
                        <button onClick={() => setModoIva("NETO")} className={`px-3 py-1.5 rounded-md font-bold transition-all text-[11px] ${modoIva === "NETO" ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-400 hover:text-slate-700'}`}>Monto Neto</button>
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Resultado del Período</span>
                        <span className={`text-base font-black mt-1 block tracking-tight ${metricasContables.resultadoNeto >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            ${Math.round(metricasContables.resultadoNeto).toLocaleString('es-CL')}
                        </span>
                        <span className="text-[9px] text-slate-400 font-medium block mt-0.5">Margen operativo</span>
                    </div>
                    <div className={`p-2.5 rounded-lg border ${metricasContables.resultadoNeto >= 0 ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-rose-50 border-rose-100 text-rose-600'}`}><Landmark className="w-4 h-4" /></div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Ingresos Facturados</span>
                        <span className="text-base font-black text-indigo-600 mt-1 block tracking-tight">${Math.round(metricasContables.ingresosBrutos).toLocaleString('es-CL')}</span>
                        <span className="text-[9px] text-slate-400 font-medium block mt-0.5">{esHistorico ? 'Ventas históricas acumuladas' : 'Ventas emitidas en el mes'}</span>
                    </div>
                    <div className="p-2.5 bg-indigo-50 rounded-lg border border-indigo-100 text-indigo-600"><ArrowUpRight className="w-4 h-4" /></div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Compras / Egresos</span>
                        <span className="text-base font-black text-rose-600 mt-1 block tracking-tight">${Math.round(metricasContables.egresosBrutos).toLocaleString('es-CL')}</span>
                        <span className="text-[9px] text-slate-400 font-medium block mt-0.5">Combustibles, talleres y viáticos</span>
                    </div>
                    <div className="p-2.5 bg-rose-50 rounded-lg border border-rose-100 text-rose-600"><ArrowDownRight className="w-4 h-4" /></div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Retención Estimada</span>
                        <span className="text-base font-black text-amber-600 mt-1 block tracking-tight">
                            {modoIva === "CON_IVA" ? `$${Math.round(metricasContables.F29_Estimado).toLocaleString('es-CL')}` : 'N/A'}
                        </span>
                        <span className="text-[9px] text-slate-500 font-medium block mt-0.5">Débito IVA: ${Math.round(metricasContables.ivaDebito).toLocaleString('es-CL')}</span>
                    </div>
                    <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-100 text-amber-600"><FileSpreadsheet className="w-4 h-4" /></div>
                </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                            {vistaGrafico === 'curva' ? 'Curva Histórica de Flujos' : 'Distribución de Cobranza'}
                        </h3>
                        <button
                            onClick={() => setVistaGrafico(vistaGrafico === 'curva' ? 'torta' : 'curva')}
                            className="flex items-center gap-1 bg-slate-100 hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 px-2 py-1 rounded-md border border-slate-200 hover:border-indigo-100 transition-all text-[9px] font-black uppercase tracking-tight"
                        >
                            {vistaGrafico === 'curva' ? (
                                <><ChartPie className="w-4 h-4 text-indigo-800" /></>
                            ) : (
                                <><ChartSpline className="w-4 h-4 text-green-800" /></>
                            )}
                        </button>
                    </div>
                    {vistaGrafico === 'curva' ? (
                        <>
                            <div className="flex gap-2 pt-2">
                                <div className="h-44 flex flex-col justify-between text-right text-[9px] font-bold text-slate-400 w-16 select-none pr-1.5 pb-6 relative">
                                    {yAxisTicks.slice().reverse().map((tick, index) => (
                                        <span key={index} className="truncate">${tick.toLocaleString('es-CL')}</span>
                                    ))}
                                </div>
                                <div className="h-44 flex-1 border-l border-b border-slate-200 relative bg-slate-50/30">
                                    {yAxisTicks.map((tick, index) => {
                                        const pctBottom = (tick / maxValorEscala) * 100;
                                        return (
                                            <div
                                                key={index}
                                                style={{ bottom: `${pctBottom}%` }}
                                                className="absolute inset-x-0 border-t border-slate-100 w-full pointer-events-none z-0"
                                            />
                                        );
                                    })}
                                    {listadoMensual.length > 0 && (
                                        <svg
                                            viewBox="0 0 500 180"
                                            className="absolute inset-0 w-full h-full p-2 overflow-visible z-10"
                                            preserveAspectRatio="none"
                                        >
                                            {(() => {
                                                const width = 500;
                                                const height = 145;
                                                const getX = (i) => listadoMensual.length > 1 ? (i * (width / (listadoMensual.length - 1))) : width / 2;
                                                const getY = (val) => height - ((val / maxValorEscala) * height);
                                                const pathVentas = listadoMensual.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.ventas)}`).join(' ');
                                                const pathCompras = listadoMensual.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.compras)}`).join(' ');
                                                const formatMesTexto = (mesStr) => {
                                                    const nombres = {
                                                        "01": "Ene", "02": "Feb", "03": "Mar", "04": "Abr", "05": "May", "06": "Jun",
                                                        "07": "Jul", "08": "Ago", "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dic"
                                                    };
                                                    return nombres[mesStr.split('-')[1]] || mesStr;
                                                };

                                                return (
                                                    <>
                                                        <path d={pathVentas} fill="none" stroke="#4f46e5" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                                                        <path d={pathCompras} fill="none" stroke="#f43f5e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                                                        {listadoMensual.map((d, i) => (
                                                            <g key={i} className="cursor-pointer">
                                                                <text x={getX(i)} y={height + 45} textAnchor="middle" className="fill-red-800 font-black text-[11px] uppercase tracking-wider select-none">
                                                                    {formatMesTexto(d.mes)}
                                                                </text>
                                                                <circle cx={getX(i)} cy={getY(d.ventas)} r="4" fill="#ffffff" stroke="#4f46e5" strokeWidth="2.5" />
                                                                <circle cx={getX(i)} cy={getY(d.ventas)} r="12" fill="transparent" className="peer focus:outline-none" tabIndex="0" />
                                                                <foreignObject x={getX(i) - 65} y={getY(d.ventas) - 45} width="130" height="40" className="opacity-0 peer-hover:opacity-100 peer-focus:opacity-100 hover:opacity-100 transition-opacity pointer-events-none">
                                                                    <div className="bg-slate-900 text-white text-[9px] font-bold px-2 py-1 rounded shadow-xl border border-slate-700 text-center leading-tight">
                                                                        <span className="block text-slate-400 text-[8px] uppercase font-black">{d.mes}</span>
                                                                        Ventas: ${Math.round(d.ventas).toLocaleString('es-CL')}
                                                                    </div>
                                                                </foreignObject>
                                                                <circle cx={getX(i)} cy={getY(d.compras)} r="4" fill="#ffffff" stroke="#f43f5e" strokeWidth="2.5" />
                                                                <circle cx={getX(i)} cy={getY(d.compras)} r="12" fill="transparent" className="peer focus:outline-none" tabIndex="0" />
                                                                <foreignObject x={getX(i) - 65} y={getY(d.compras) - 45} width="130" height="40" className="opacity-0 peer-hover:opacity-100 peer-focus:opacity-100 hover:opacity-100 transition-opacity pointer-events-none">
                                                                    <div className="bg-slate-900 text-white text-[9px] font-bold px-2 py-1 rounded shadow-xl border border-slate-700 text-center leading-tight">
                                                                        <span className="block text-slate-400 text-[8px] uppercase font-black">{d.mes}</span>
                                                                        Costos: ${Math.round(d.compras).toLocaleString('es-CL')}
                                                                    </div>
                                                                </foreignObject>
                                                            </g>
                                                        ))}
                                                    </>
                                                );
                                            })()}
                                        </svg>
                                    )}
                                </div>
                            </div>
                            <div className="flex justify-center gap-6 text-[10px] text-slate-400 font-semibold pt-3">
                                <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-indigo-600 inline-block border-t border-indigo-600"></span> Ingresos Totales</span>
                                <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-rose-500 inline-block border-t border-rose-500"></span> Costos de Operación</span>
                            </div>
                        </>
                    ) : (
                        (() => {
                            const mercanciasFiltradas = (mercancias || []).filter(m => {
                                if (esHistorico) return true
                                return m.fecha_ingreso && m.fecha_ingreso.startsWith(periodo)
                            })
                            let countPendiente = 0
                            let countEnProceso = 0
                            let countPagado = 0

                            mercanciasFiltradas.forEach(m => {
                                const docAsociado = dbData?.documentos?.find(d =>
                                    m.factura && String(d.numero_documento) === String(m.factura)
                                )
                                if (!m.factura || !docAsociado) {
                                    countPendiente++;
                                } else if (docAsociado.estado === 'Pagado') {
                                    countPagado++;
                                } else {
                                    countEnProceso++;
                                }
                            });

                            const totalItems = mercanciasFiltradas.length || 1;
                            const rings = [
                                { id: 'Pendiente', count: countPendiente, color: '#f43f5e', r: 52, c: 2 * Math.PI * 52, label: 'Pendiente' },
                                { id: 'En_Proceso', count: countEnProceso, color: '#3b82f6', r: 40, c: 2 * Math.PI * 40, label: 'Facturado' },
                                { id: 'Pagado', count: countPagado, color: '#10b981', r: 28, c: 2 * Math.PI * 28, label: 'Pagado' }
                            ];

                            return (
                                <>
                                    <div className="flex items-center justify-around h-44 py-1">
                                        <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
                                            <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90 transform overflow-visible">
                                                {rings.map((ring) => {
                                                    const porcentaje = (ring.count / totalItems) * 100;
                                                    const strokeDashoffset = ring.c - (porcentaje / 100) * ring.c;
                                                    const tieneData = mercanciasFiltradas.length > 0;

                                                    return (
                                                        <g key={ring.id}>
                                                            <circle cx="70" cy="70" r={ring.r} fill="transparent" stroke="#e2e8f0" strokeWidth="7" className="opacity-40" />
                                                            <circle
                                                                cx="70"
                                                                cy="70"
                                                                r={ring.r}
                                                                fill="transparent"
                                                                stroke={ring.color}
                                                                strokeWidth="7"
                                                                strokeDasharray={ring.c}
                                                                strokeDashoffset={tieneData ? strokeDashoffset : ring.c}
                                                                strokeLinecap="round"
                                                                className="transition-all duration-1000 ease-out"
                                                            />
                                                        </g>
                                                    );
                                                })}
                                            </svg>
                                            <div className="absolute text-center select-none">
                                                <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Muestra</span>
                                                <span className="text-xl font-black text-slate-800 leading-tight">{mercanciasFiltradas.length}</span>
                                                <span className="block text-[8px] font-bold text-slate-400 uppercase leading-none">Lotes</span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col justify-center space-y-2 w-[45%]">
                                            {rings.map((ring) => {
                                                const pct = mercanciasFiltradas.length > 0 ? ((ring.count / totalItems) * 100).toFixed(1) : "0.0";
                                                return (
                                                    <div key={ring.id} className="flex items-center justify-between border-b border-slate-50 pb-1">
                                                        <div className="flex items-center gap-1.5 min-w-0">
                                                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: ring.color }} />
                                                            <span className="text-[10px] font-bold text-slate-600 truncate">{ring.label}</span>
                                                        </div>
                                                        <div className="text-right flex flex-col shrink-0">
                                                            <span className="text-[11px] font-black text-slate-800 leading-tight">{ring.count}</span>
                                                            <span className="text-[8px] font-bold text-slate-400 leading-none">{pct}%</span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    <div className="text-center text-[9px] font-bold text-slate-400 bg-slate-50 p-1.5 rounded-lg border border-slate-100 uppercase tracking-wider select-none">
                                        Filtro Activo: <span className="text-slate-700 font-extrabold">{esHistorico ? 'Historial Consolidado' : `Mes Actual (${periodo})`}</span>
                                    </div>
                                </>
                            );
                        })()
                    )}
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                            <span className="p-1 bg-emerald-50 text-emerald-600 rounded"></span> Concentración Histórica de Clientes
                        </h3>
                    </div>

                    <div className="space-y-3 h-44 overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full">
                        {flujoClientesData.map((client, index) => {
                            const totalFact = client.totalFacturado || 1;
                            const porcPago = (client.totalPagado / totalFact) * 100;
                            const porcPendiente = 100 - porcPago;

                            return (
                                <div key={index} className="space-y-1 bg-slate-50/60 p-2 rounded-lg border border-slate-100">
                                    <div className="flex justify-between items-center text-[10px]">
                                        <div className="flex items-center gap-1.5">
                                            <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-600 font-black text-[9px] flex items-center justify-center">{index + 1}</span>
                                            <span className="text-slate-700 font-bold truncate max-w-[150px]">{client.nombre}</span>
                                        </div>
                                        <div className="text-slate-400 font-bold">
                                            Recaudado: <span className="text-emerald-600 font-extrabold">${Math.round(client.totalPagado).toLocaleString('es-CL')}</span>
                                            <span className="text-slate-300 mx-1">/</span>
                                            Total: <span className="text-slate-800 font-extrabold">${Math.round(client.totalFacturado).toLocaleString('es-CL')}</span>
                                        </div>
                                    </div>

                                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden flex">
                                        <div style={{ width: `${porcPago}%` }} className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-full"></div>
                                        <div style={{ width: `${porcPendiente}%` }} className="bg-gradient-to-r from-indigo-500 to-indigo-400 h-full"></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
                <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between lg:col-span-1">
                    <div className="space-y-4">
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center justify-between border-b border-slate-100 pb-2">
                            <div className="flex items-center gap-1.5">
                                Últimos Despachos y Cobranza
                            </div>
                        </h3>

                        <div className="space-y-2">
                            {despachos && despachos.length > 0 ? (
                                [...despachos]
                                    .sort((a, b) => Number(b.id_despacho) - Number(a.id_despacho))
                                    .slice(0, 3)
                                    .map((d) => {
                                        const cargasDelDespacho = mercancias.filter(m => Number(m.id_despacho) === Number(d.id_despacho));
                                        const noFacturadas = cargasDelDespacho.filter(m => m.estado_cobranza === 'Pendiente').length;
                                        const facturadas = cargasDelDespacho.filter(m => m.estado_cobranza === 'En_Proceso').length;
                                        const pagadas = cargasDelDespacho.filter(m => m.estado_cobranza === 'Pagado').length;

                                        return (
                                            <div
                                                key={d.id_despacho}
                                                className="flex items-center justify-between p-2 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition"
                                            >
                                                <div className="flex flex-col gap-0.5 w-[35%]">
                                                    <span className="text-xs font-bold text-slate-900">
                                                        Ruta {d.id_ruta.split('-')[0].trim()}
                                                    </span>
                                                    <span className="text-[10px] text-slate-500 font-medium truncate">
                                                        {d.nombre_conductor || 'Sin Conductor'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1.5 justify-center w-[45%]">
                                                    <span
                                                        className={`flex items-center justify-center min-w-[22px] h-5 px-1 rounded text-[10px] font-black border ${noFacturadas > 0
                                                            ? 'bg-rose-50 border-rose-100 text-rose-600'
                                                            : 'bg-slate-50 border-slate-200 text-slate-400 opacity-60'
                                                            }`}
                                                        title="Pendiente de Cobro"
                                                    >
                                                        {noFacturadas}
                                                    </span>
                                                    <span
                                                        className={`flex items-center justify-center min-w-[22px] h-5 px-1 rounded text-[10px] font-black border ${facturadas > 0
                                                            ? 'bg-blue-50 border-blue-100 text-blue-600'
                                                            : 'bg-slate-50 border-slate-200 text-slate-400 opacity-60'
                                                            }`}
                                                        title="En Proceso (Facturado)"
                                                    >
                                                        {facturadas}
                                                    </span>
                                                    <span
                                                        className={`flex items-center justify-center min-w-[22px] h-5 px-1 rounded text-[10px] font-black border ${pagadas > 0
                                                            ? 'bg-emerald-50 border-emerald-100 text-emerald-600'
                                                            : 'bg-slate-50 border-slate-200 text-slate-400 opacity-60'
                                                            }`}
                                                        title="Pagado"
                                                    >
                                                        {pagadas}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })
                            ) : (
                                <div className="text-center py-6 text-slate-400 italic text-[11px]">
                                    No hay despachos operativos registrados.
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100">
                        <button
                            onClick={() => navigate('../despachos-cobranza')}
                            className="w-full flex items-center justify-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-4 py-2.5 rounded-xl text-xs font-black tracking-tight uppercase border border-indigo-100 hover:border-indigo-200 transition"
                        >
                            Ver todos los despachos y su estado de facturación
                        </button>
                    </div>
                </div>
                <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm space-y-4 lg:col-span-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-2">
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                            {esHistorico ? "Libro de Ventas" : `Libro de Ventas`}
                        </h3>

                        <div className="relative w-full sm:w-60">
                            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Filtrar por RUT deudor..."
                                value={filtroDeudorRut}
                                onChange={(e) => setFiltroDeudorRut(e.target.value)}
                                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-700 placeholder-slate-400 focus:ring-1 focus:ring-indigo-500 transition-all font-medium"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto rounded-lg border border-slate-200">
                        <table className="w-full text-xs text-left">
                            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[9px] border-b border-slate-200">
                                <tr>
                                    <th className="p-3">Folio</th>
                                    <th className="p-3">Entidad Deudora</th>
                                    <th className="p-3">Emisión / Vence</th>
                                    <th className="p-3 text-right">Total Doc</th>
                                    <th className="p-3 text-right">Saldo Deuda</th>
                                    <th className="p-3 text-center">Estado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {deudoresPaginados.length === 0 ? (
                                    <tr><td colSpan="6" className="text-center py-6 text-slate-400 font-medium">No se registran operaciones comerciales en este rango de selección.</td></tr>
                                ) : (
                                    deudoresPaginados.map(doc => (
                                        <tr key={doc.id} className="hover:bg-slate-50/60 transition-colors">
                                            <td className="p-3 font-black text-slate-700 tracking-wider">{doc.folio}</td>
                                            <td className="p-3">
                                                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                                                    {doc.entidad?.includes('S.A.') || doc.entidad?.includes('Ltda') ? <Building2 className="w-3 h-3 text-amber-500 shrink-0" /> : <User2 className="w-3 h-3 text-indigo-500 shrink-0" />}
                                                    <span className="truncate max-w-[150px]">{doc.entidad}</span>
                                                </div>
                                                <div className="text-[10px] text-slate-400 font-medium mt-0.5">RUT: {doc.rut}</div>
                                            </td>
                                            <td className="p-3 text-slate-500">
                                                <div className="font-medium">{doc.emision}</div>
                                                <div className="text-[10px] text-slate-400 mt-0.5">Vence: {doc.vencimiento}</div>
                                            </td>
                                            <td className="p-3 text-right font-semibold text-slate-500">${Math.round(doc.monto_total_doc).toLocaleString('es-CL')}</td>
                                            <td className="p-3 text-right font-black text-slate-800">${Math.round(doc.monto_vista).toLocaleString('es-CL')}</td>
                                            <td className="p-3 text-center">
                                                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${doc.estado === 'Pagado' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                    doc.estado === 'Abonado' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                        'bg-blue-50 text-blue-700 border-blue-200'
                                                    }`}>{doc.estado}</span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    {totalPaginasTabla > 1 && (
                        <div className="bg-slate-50 px-3 py-2 flex items-center justify-between text-[11px] text-slate-500 rounded-lg border border-slate-100">
                            <div>
                                Registros <span className="font-bold text-slate-700">{((paginaTabla - 1) * rowsPorPagina) + 1}</span> al{' '}
                                <span className="font-bold text-slate-700">{Math.min(paginaTabla * rowsPorPagina, deudoresFiltrados.length)}</span> de{' '}
                                <span className="font-bold text-slate-700">{deudoresFiltrados.length}</span> activos.
                            </div>
                            <div className="flex items-center gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => setPaginaTabla(prev => Math.max(prev - 1, 1))}
                                    disabled={paginaTabla === 1}
                                    className="px-2.5 py-1 bg-white border border-slate-200 rounded-md hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-colors"
                                >
                                    Anterior
                                </button>
                                <span className="font-semibold text-slate-700">Página {paginaTabla} de {totalPaginasTabla}</span>
                                <button
                                    type="button"
                                    onClick={() => setPaginaTabla(prev => Math.min(prev + 1, totalPaginasTabla))}
                                    disabled={paginaTabla === totalPaginasTabla}
                                    className="px-2.5 py-1 bg-white border border-slate-200 rounded-md hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-colors"
                                >
                                    Siguiente
                                </button>
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}