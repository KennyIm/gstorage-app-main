import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import apiClient from '../services/api'
import { useUI } from '../context/UIContext'
import {
    RefreshCw, ArrowUpRight, ArrowDownRight, Landmark, Building2, User2, Search,
    Fuel, Wallet, Construction, ShieldAlert, Truck, Wrench
} from 'lucide-react'

export default function DashboardGeneralFinanzas() {
    document.title = "DashboardFinanzas - GStorage"
    const navigate = useNavigate()
    const { showToast } = useUI()
    const [dbData, setDbData] = useState(null)
    const [cargando, setCargando] = useState(true)
    const [despachos, setDespachos] = useState([])
    const [mercancias, setMercancias] = useState([])
    const [gastosOperativos, setGastosOperativos] = useState([])
    const modoIva = "CON_IVA"
    const esHistorico = true
    const periodo = ""
    const [filtroDeudorRut, setFiltroDeudorRut] = useState("")
    const [paginaTabla, setPaginaTabla] = useState(1)
    const rowsPorPagina = 5
    const fetchDashboardContable = async () => {
        setCargando(true)
        try {
            const response = await apiClient.get('/api/finanzas/dashboard-consolidado/')
            const despachosRes = await apiClient.get('/api/inventario/despachos/')
            const mercanciasRes = await apiClient.get('/api/inventario/mercancias/?page_size=200')
            const gastosRes = await apiClient.get('/api/finanzas/gastos-operativos/') 
            setDbData(response.data)
            setDespachos(despachosRes.data)
            setMercancias(mercanciasRes.data.results || mercanciasRes.data)
            setGastosOperativos(gastosRes.data.results || gastosRes.data)
        } catch (error) {
            showToast('Error al conectar con el servidor contable.', 'error')
        } finally {
            setCargando(false)
        }
    }

    useEffect(() => {
        fetchDashboardContable()
    }, [])
    const { distribucionGastos, sumaTotalGastos } = useMemo(() => {
        const mapaColores = {
            'Combustible': { color: '#eab308', icon: Fuel },
            'Peaje': { color: '#22c55e', icon: Wallet },
            'Mantenimiento': { color: '#ec4899', icon: Wrench },
            'Viatico': { color: '#3b82f6', icon: User2 },
            'Servicio Externo': { color: '#a855f7', icon: Truck },
            'Administrativo': { color: '#64748b', icon: ShieldAlert }
        }

        const totales = {
            'Combustible': 0, 'Peaje': 0, 'Mantenimiento': 0,
            'Viatico': 0, 'Servicio Externo': 0, 'Administrativo': 0
        }
        let sumaTotal = 0
        const items = Array.isArray(gastosOperativos) ? gastosOperativos : []
        items.forEach(g => {
            if (g.activo && totales[g.tipo_gasto] !== undefined) {
                const monto = parseFloat(g.monto_total || 0)
                totales[g.tipo_gasto] += monto
                sumaTotal += monto
            }
        })
        const listaMapeada = Object.keys(totales).map(key => {
            const monto = totales[key]
            const pct = sumaTotal > 0 ? (monto / sumaTotal) * 100 : 0
            return {
                tipo: key,
                label: key === 'Mantenimiento' ? 'Mantenimiento / Taller' : 
                       key === 'Viatico' ? 'Viático Conductor' : 
                       key === 'Servicio Externo' ? 'Flete Externo' : key,
                monto,
                pct,
                color: mapaColores[key]?.color || '#000',
                icon: mapaColores[key]?.icon || Wallet
            }
        }).sort((a, b) => b.monto - a.monto)

        return { distribucionGastos: listaMapeada, sumaTotalGastos: sumaTotal }
    }, [gastosOperativos])
    const metricasContables = useMemo(() => {
        if (!dbData || !dbData.documentos) return { ingresosBrutos: 0, egresosBrutos: 0, resultadoNeto: 0, F29_Estimado: 0 };
        const factorIva = 1.19
        let totalVentasNeto = 0
        let totalComprasNeto = 0
        
        dbData.documentos.forEach(d => {
            if (d.tipo_documento === 'Factura' || d.subtotal > 0) {
                totalVentasNeto += d.tipo_documento === 'VENTA' || d.subtotal ? parseFloat(d.subtotal || 0) : 0;
            }
        });

        if (dbData.grafico_mensual) {
            dbData.grafico_mensual.forEach(g => {
                totalComprasNeto += (g.compras || 0) / 1.19
            });
        }

        const ingresosFinales = totalVentasNeto * factorIva
        const egresosFinales = totalComprasNeto * factorIva

        return {
            ingresosBrutos: ingresosFinales,
            egresosBrutos: egresosFinales,
            resultadoNeto: ingresosFinales - egresosFinales
        };
    }, [dbData]);

    const listadoMensual = useMemo(() => {
        if (!dbData || !dbData.grafico_mensual) return []
        return dbData.grafico_mensual.map(g => {
            const vFact = (g.ventas_facturadas || 0) * 1.19
            const vNoFact = (g.ventas_por_facturar || 0) * 1.19
            const ingresos = vFact + vNoFact
            const costos = (g.compras || 0) * 1.19
            return {
                mes: g.mes,
                ventas: ingresos,
                compras: costos,
                beneficio: ingresos - costos,
                margen: ingresos > 0 ? Math.round(((ingresos - costos) / ingresos) * 100) : 0
            };
        });
    }, [dbData])
    const maxValorEscala = 20000000

    const deudoresFiltrados = useMemo(() => {
        if (!dbData || !dbData.documentos) return []
        const termLimpio = filtroDeudorRut.replace(/[^0-9kK]/g, '').toLowerCase()

        return dbData.documentos.map(d => ({
            id: d.id,
            folio: d.numero_documento ? `F-${d.numero_documento}` : "Borrador",
            entidad: d.entidad,
            rut: d.rut,
            emision: d.fecha_emision,
            vencimiento: d.fecha_vencimiento,
            monto_total_doc: parseFloat(d.total_a_pagar || 0),
            monto_vista: parseFloat(d.saldo_pendiente || 0),
            estado: d.estado
        })).filter(d => !filtroDeudorRut || d.rut.replace(/[^0-9kK]/g, '').toLowerCase().includes(termLimpio));
    }, [dbData, filtroDeudorRut])

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
        <div className="max-w-7xl mx-auto px-4 py-5 text-slate-700 bg-slate-50 min-h-screen text-xs select-none space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between border-l-4 border-l-indigo-600">
                    <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Ingresos</span>
                        <span className="text-xl font-black text-slate-900 mt-1 block tracking-tight">
                            ${Math.round(metricasContables.ingresosBrutos).toLocaleString('es-CL')}
                        </span>
                    </div>
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><ArrowUpRight className="w-5 h-5" /></div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between border-l-4 border-l-rose-600">
                    <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Gastos</span>
                        <span className="text-xl font-black text-slate-900 mt-1 block tracking-tight">
                            ${Math.round(metricasContables.egresosBrutos).toLocaleString('es-CL')}
                        </span>
                    </div>
                    <div className="p-3 bg-rose-50 text-rose-600 rounded-xl"><ArrowDownRight className="w-5 h-5" /></div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between border-l-4 border-l-emerald-600">
                    <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Beneficio</span>
                        <span className={`text-xl font-black mt-1 block tracking-tight ${metricasContables.resultadoNeto >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            ${Math.round(metricasContables.resultadoNeto).toLocaleString('es-CL')}
                        </span>
                    </div>
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><Landmark className="w-5 h-5" /></div>
                </div>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <div className="flex gap-4 text-[10px] font-bold">
                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-indigo-500 rounded-sm" /> Ingresos</span>
                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-rose-400 rounded-sm" /> Gastos</span>
                    </div>
                </div>
                
                <div className="w-full h-44 flex items-end justify-between gap-2 pt-6 px-2 border-b border-l border-slate-200 bg-slate-50/50 relative">

                    {listadoMensual.map((m, i) => {
                        const pctVentas = (m.ventas / maxValorEscala) * 100
                        const pctCompras = (m.compras / maxValorEscala) * 100
                        const mesesTextos = { "01": "Ene", "02": "Feb", "03": "Mar", "04": "Abr", "05": "May", "06": "Jun", "07": "Jul", "08": "Ago", "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dic" }
                        const mesKey = m.mes.includes('-') ? m.mes.split('-')[1] : m.mes

                        return (
                            <div key={i} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                                <div className="flex items-end gap-1 w-full justify-center max-w-[45px]">
                                    <div style={{ height: `${Math.min(pctVentas, 100)}%` }} className="w-full bg-indigo-500 rounded-t-sm transition-all duration-500 relative">
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-slate-900 text-white text-[9px] p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 font-bold">
                                            ${Math.round(m.ventas).toLocaleString('es-CL')}
                                        </div>
                                    </div>
                                    <div style={{ height: `${Math.min(pctCompras, 100)}%` }} className="w-full bg-rose-400 rounded-t-sm transition-all duration-500 relative">
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-slate-900 text-white text-[9px] p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 font-bold">
                                            ${Math.round(m.compras).toLocaleString('es-CL')}
                                        </div>
                                    </div>
                                </div>
                                <span className="text-[9px] font-black text-slate-400 uppercase mt-2">
                                    {mesesTextos[mesKey] || m.mes}
                                </span>
                            </div>
                        )
                    })}
                </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3 lg:col-span-2">
                    <div className="overflow-x-auto rounded-lg border border-slate-200">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[9px] border-b border-slate-200">
                                <tr>
                                    <th className="p-2.5">Año</th>
                                    <th className="p-2.5">Mes</th>
                                    <th className="p-2.5 text-right">Total Ingresos</th>
                                    <th className="p-2.5 text-right">Total Gastos</th>
                                    <th className="p-2.5 text-right">Total Beneficios</th>
                                    <th className="p-2.5 text-center">% Margen</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium">
                                {listadoMensual.map((m, i) => {
                                    const mesesLargos = { "01": "Enero", "02": "Febrero", "03": "Marzo", "04": "Abril", "05": "Mayo", "06": "Junio", "07": "Julio", "08": "Agosto", "09": "Septiembre", "10": "Octubre", "11": "Noviembre", "12": "Diciembre" }
                                    const mesKey = m.mes.includes('-') ? m.mes.split('-')[1] : m.mes
                                    return (
                                        <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="p-2.5 text-slate-400">2026</td>
                                            <td className="p-2.5 font-bold text-slate-800">{mesesLargos[mesKey] || m.mes}</td>
                                            <td className="p-2.5 text-right font-semibold text-slate-600">${Math.round(m.ventas).toLocaleString('es-CL')}</td>
                                            <td className="p-2.5 text-right font-semibold text-slate-600">${Math.round(m.compras).toLocaleString('es-CL')}</td>
                                            <td className={`p-2.5 text-right font-bold ${m.beneficio >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                ${Math.round(m.beneficio).toLocaleString('es-CL')}
                                            </td>
                                            <td className="p-2.5 text-center font-black text-slate-700">{m.margen}%</td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                            <tfoot className="bg-slate-900 text-white font-bold text-right border-t-2 border-slate-700">
                                <tr>
                                    <td colSpan="2" className="p-3 text-left uppercase text-[9px] tracking-wider font-black">Total</td>
                                    <td className="p-3">${Math.round(listadoMensual.reduce((acc, m) => acc + m.ventas, 0)).toLocaleString('es-CL')}</td>
                                    <td className="p-3">${Math.round(listadoMensual.reduce((acc, m) => acc + m.compras, 0)).toLocaleString('es-CL')}</td>
                                    <td className="p-3 text-emerald-400">${Math.round(listadoMensual.reduce((acc, m) => acc + m.beneficio, 0)).toLocaleString('es-CL')}</td>
                                    <td className="p-3 text-center text-amber-400">
                                        {Math.round((listadoMensual.reduce((acc, m) => acc + m.beneficio, 0) / (listadoMensual.reduce((acc, m) => acc + m.ventas, 0) || 1)) * 100)}%
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
                    <div className="space-y-4 w-full">
                        <h3 className="text-xs font-black text-center text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
                            Distribución de Gastos
                        </h3>
                        <div className="flex items-center justify-center py-1">
                            <div className="relative w-32 h-32 flex items-center justify-center">
                                <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                                    <circle cx="18" cy="18" r="15.9155" fill="transparent" stroke="#f1f5f9" strokeWidth="3" />
                                    {(() => {
                                        let accumulatedPercent = 0
                                        return distribucionGastos.map((item, idx) => {
                                            if (item.pct === 0) return null
                                            const strokeDasharray = `${item.pct} ${100 - item.pct}`
                                            const strokeDashoffset = 100 - accumulatedPercent
                                            accumulatedPercent += item.pct
                                            return (
                                                <circle 
                                                    key={idx}
                                                    cx="18" cy="18" r="15.9155" 
                                                    fill="transparent" 
                                                    stroke={item.color} 
                                                    strokeWidth="3.5" 
                                                    strokeDasharray={strokeDasharray} 
                                                    strokeDashoffset={strokeDashoffset} 
                                                    className="transition-all duration-300"
                                                />
                                            )
                                        })
                                    })()}
                                </svg>
                                <div className="absolute text-center flex flex-col">
                                    <span className="text-[11px] font-black text-slate-800">
                                        ${Math.round(sumaTotalGastos / 1000).toLocaleString('es-CL')}k
                                    </span>
                                    <span className="text-[7px] font-bold text-slate-400 uppercase tracking-wider">Gastos Totales</span>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-1.5 overflow-y-auto max-h-40 pr-1">
                            {distribucionGastos.map((item, idx) => {
                                const Icono = item.icon
                                return (
                                    <div key={idx} className="flex items-center justify-between border-b border-slate-50 pb-1 text-[10px]">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className="p-1 rounded text-white shrink-0" style={{ backgroundColor: item.color }}>
                                                <Icono className="w-3 h-3" />
                                            </span>
                                            <span className="font-bold text-slate-600 truncate">{item.label}</span>
                                        </div>
                                        <div className="text-right flex flex-col font-medium">
                                            <span className="text-slate-800 font-bold">${Math.round(item.monto).toLocaleString('es-CL')}</span>
                                            <span className="text-[8px] text-slate-400 font-bold leading-none">{item.pct.toFixed(1)}%</span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>

            </div>

        </div>
    )
}