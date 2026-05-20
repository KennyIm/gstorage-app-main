import React, { useState, useEffect, useMemo } from "react";
import { useUI } from '../context/UIContext';
import apiClient from "../services/api";
import {
    FileText, DollarSign, Search, CheckCircle, Clock, AlertCircle,
    Building, User, Filter
} from 'lucide-react';


export default function DocumentosEmitidos() {
    document.title = "Documentos Emitidos - GStorage"

    const { showLoader, hideLoader, showToast } = useUI()

    const [documentos, setDocumentos] = useState([])
    const [loading, setLoading] = useState(true)
    const [filtroEstado, setFiltroEstado] = useState('Todos')
    const [busqueda, setBusqueda] = useState('')

    const [modalOpen, setModalOpen] = useState(false)
    const [docSeleccionado, setDocSeleccionado] = useState(null)
    const [formPago, setFormPago] = useState({ monto: '', medio: 'Transferencia', operacion: '' })
    const [procesando, setProcesando] = useState(false)
    const [comprobanteFile, setComprobanteFile] = useState(null)

    const [filtroDeudor, setFiltroDeudor] = useState('');
    const [filtroNumeroDoc, setFiltroNumeroDoc] = useState('');
    const [emisionDesde, setEmisionDesde] = useState('');
    const [emisionHasta, setEmisionHasta] = useState('');
    const [venceDesde, setVenceDesde] = useState('');
    const [venceHasta, setVenceHasta] = useState('');

    const fetchDocumentos = async () => {
        setLoading(true)
        try {
            const response = await apiClient.get('/api/finanzas/documentos/')
            setDocumentos(response.data.results || response.data)
        } catch (error) {
            showToast('Error al cargar los documentos.', 'error')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchDocumentos()
    }, [])

    const documentosFiltrados = useMemo(() => {
        return documentos.filter(doc => {
            const matchEstado = filtroEstado === 'Todos' || doc.estado === filtroEstado;
            const deudorTexto = (doc.cliente_nombre || doc.proveedor_nombre || '').toLowerCase();
            const matchDeudor = !filtroDeudor || deudorTexto.includes(filtroDeudor.toLowerCase());
            const matchNumero = !filtroNumeroDoc ||
                String(doc.numero_documento || '').toLowerCase().includes(filtroNumeroDoc.toLowerCase());
            const matchEmisionDesde = !emisionDesde || doc.fecha_emision >= emisionDesde;
            const matchEmisionHasta = !emisionHasta || doc.fecha_emision <= emisionHasta;
            const matchVenceDesde = !venceDesde || doc.fecha_vencimiento >= venceDesde;
            const matchVenceHasta = !venceHasta || doc.fecha_vencimiento <= venceHasta;
            return matchEstado && matchDeudor && matchNumero &&
                matchEmisionDesde && matchEmisionHasta &&
                matchVenceDesde && matchVenceHasta;
        });
    }, [documentos, filtroEstado, filtroDeudor, filtroNumeroDoc, emisionDesde, emisionHasta, venceDesde, venceHasta]);

    const limpiarTodosLosFiltros = () => {
        setFiltroEstado('Todos');
        setFiltroDeudor('');
        setFiltroNumeroDoc('');
        setEmisionDesde('');
        setEmisionHasta('');
        setVenceDesde('');
        setVenceHasta('');
    };

    const getEstadoBadge = (estado, fechaVencimiento) => {
        if (estado === 'Pagado') return <span className="px-2.5 py-1 text-[10px] uppercase font-bold rounded-full bg-emerald-100 text-emerald-700">Pagado</span>
        if (estado === 'Anulado') return <span className="px-2.5 p-1 text-[10px] uppercase font-bold rounded-full bg-slate-50 text-slate-700">Anulado</span>

        const hoy = new Date().setHours(0, 0, 0, 0)
        const vence = new Date(fechaVencimiento).setHours(0, 0, 0, 0)

        if (vence < hoy) return <span className="px-2.5 py-1 text-[10px] uppercase font-bold rounded-full bg-red-100 text-red-700 border border-red-200">Vencido</span>
        if (estado === 'Abonado') return <span className="px-2.5 py-1 text-[10px] uppercase font-bold rounded-full bg-amber-100 text-amber-700">Abonado</span>
        return <span className="px-2.5 py-1 text-[10px] uppercase font-bold rounded-full bg-blue-100 text-blue-700">Emitido</span>
    }

    const abrirModalPago = (doc) => {
        setDocSeleccionado(doc)
        setFormPago({ monto: doc.saldo_pendiente, medio: 'Transferencia', operacion: '' })
        setModalOpen(true)
    }

    const handleRegistrarPago = async (e) => {
        e.preventDefault()
        if (parseFloat(formPago.monto) <= 0) {
            showToast('El monto debe ser mayor a 0.', 'warning'); return;
        }
        if (parseFloat(formPago.monto) > parseFloat(docSeleccionado.saldo_pendiente)) {
            showToast('El monto no puede superar el saldo pendiente.', 'error'); return;
        }

        setProcesando(true)
        showLoader()
        try {
            const formData = new FormData()
            formData.append('documento_id', docSeleccionado.id)
            formData.append('monto_pagado', formPago.monto)
            formData.append('medio_pago', formPago.medio)
            formData.append('numero_operacion_banco', formPago.operacion)

            if (comprobanteFile) {
                formData.append('comprobante_banco', comprobanteFile)
            }
            await apiClient.post('/api/finanzas/registrar-pago/', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            })
            showToast('Pago registrado correctamente.', 'success')
            setModalOpen(false)
            setComprobanteFile(null)
            await fetchDocumentos()
        } catch (error) {
            const msg = error.response?.data?.error || 'Error al registrar el pago.'
            showToast(msg, 'error')
        } finally {
            setProcesando(false)
            hideLoader()
        }
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs text-slate-700">

                {/* Encabezado del panel + botón de reset */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-1.5 font-bold text-slate-800 text-sm">
                        <Filter className="w-4 h-4 text-blue-600" /> Filtros de Busqueda
                    </div>
                    {(filtroEstado !== 'Todos' || filtroDeudor || filtroNumeroDoc || emisionDesde || emisionHasta || venceDesde || venceHasta) && (
                        <button
                            type="button"
                            onClick={limpiarTodosLosFiltros}
                            className="text-blue-600 hover:text-blue-800 font-semibold transition-colors text-[11px]"
                        >
                            Limpiar Filtros ×
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="flex flex-col space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Estado del Documento</label>
                        <select
                            value={filtroEstado}
                            onChange={(e) => setFiltroEstado(e.target.value)}
                            className="w-full border-slate-300 rounded-lg text-xs focus:ring-blue-500 focus:border-blue-500 py-2 cursor-pointer bg-slate-50/40"
                        >
                            <option value="Todos">Todos los Estados</option>
                            <option value="Emitido">Emitidos (Por Pagar)</option>
                            <option value="Abonado">Abonados (Parcial)</option>
                            <option value="Pagado">Pagados (Cerrados)</option>
                        </select>
                    </div>

                    <div className="flex flex-col space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Deudor</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Ej. Juan Carlos o Gasco..."
                                value={filtroDeudor}
                                onChange={(e) => setFiltroDeudor(e.target.value)}
                                className="w-full pl-9 border-slate-300 rounded-lg text-xs focus:ring-blue-500 focus:border-blue-500 py-2"
                            />
                        </div>
                    </div>

                    <div className="flex flex-col space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">N° de Folio o Documento</label>
                        <input
                            type="text"
                            placeholder="Ej. FACT-450"
                            value={filtroNumeroDoc}
                            onChange={(e) => setFiltroNumeroDoc(e.target.value)}
                            className="w-full border-slate-300 rounded-lg text-xs focus:ring-blue-500 focus:border-blue-500 py-2"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">

                    <div className="p-3 bg-slate-50/60 border border-slate-100 rounded-xl space-y-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Período de Emisión</span>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="flex items-center gap-1">
                                <span className="text-[10px] font-medium text-slate-400 w-9">Desde:</span>
                                <input
                                    type="date"
                                    value={emisionDesde}
                                    onChange={(e) => setEmisionDesde(e.target.value)}
                                    className="w-full border-slate-300 rounded-md text-[11px] py-1 focus:ring-blue-500"
                                />
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="text-[10px] font-medium text-slate-400 w-9">Hasta:</span>
                                <input
                                    type="date"
                                    value={emisionHasta}
                                    onChange={(e) => setEmisionHasta(e.target.value)}
                                    className="w-full border-slate-300 rounded-md text-[11px] py-1 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="p-3 bg-slate-50/60 border border-slate-100 rounded-xl space-y-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Límite de Vencimiento</span>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="flex items-center gap-1">
                                <span className="text-[10px] font-medium text-slate-400 w-9">Desde:</span>
                                <input
                                    type="date"
                                    value={venceDesde}
                                    onChange={(e) => setVenceDesde(e.target.value)}
                                    className="w-full border-slate-300 rounded-md text-[11px] py-1 focus:ring-blue-500"
                                />
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="text-[10px] font-medium text-slate-400 w-9">Hasta:</span>
                                <input
                                    type="date"
                                    value={venceHasta}
                                    onChange={(e) => setVenceHasta(e.target.value)}
                                    className="w-full border-slate-300 rounded-md text-[11px] py-1 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                    </div>

                </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-bold border-b border-slate-200">
                            <tr>
                                <th className="p-4">Documento</th>
                                <th className="p-4">Deudor</th>
                                <th className="p-4">Emisión / Vence</th>
                                <th className="p-4 text-right">Total Facturado</th>
                                <th className="p-4 text-right">Saldo Pendiente</th>
                                <th className="p-4 text-center">Estado</th>
                                <th className="p-4 text-center">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan="7" className="text-center py-8 text-slate-500">Cargando documentos...</td></tr>
                            ) : documentosFiltrados.length === 0 ? (
                                <tr><td colSpan="7" className="text-center py-8 text-slate-500">No se encontraron documentos.</td></tr>
                            ) : (
                                documentosFiltrados.map(doc => {
                                    const esProveedor = doc.proveedor_nombre !== 'N/A'
                                    const deudor = esProveedor ? doc.proveedor_nombre : doc.cliente_nombre
                                    return (
                                        <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="p-4">
                                                <div className="font-bold text-slate-800">{doc.tipo_documento.replace('_', '')}</div>
                                                <div className="text-xs text-slate-500">{doc.numero_documento ? `Folio #${doc.numero_documento}` : 'Borrador Interno'}</div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    {esProveedor ? <Building className="w-3.5 h-3.5 text-amber-600" /> : <User className="w-3.5 h-3.5 text-indigo-600" />}
                                                    <span className="font-medium text-slate-700">{deudor}</span>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="text-slate-700">{new Date(doc.fecha_emision).toLocaleDateString('es-CL')}</div>
                                                <div className="text-xs font-medium text-slate-400 mt-0.5 flex items-center gap-1">
                                                    <Clock className="w-3 h-3" /> Vence: {new Date(doc.fecha_vencimiento).toLocaleDateString('es-CL')}
                                                </div>
                                            </td>
                                            <td className="p-4 text-right font-medium text-slate-600">
                                                ${parseFloat(doc.total_a_pagar).toLocaleString('es-CL')}
                                            </td>
                                            <td className="p-4 text-right font-bold text-slate-800">
                                                ${parseFloat(doc.saldo_pendiente).toLocaleString('es-CL')}
                                            </td>
                                            <td className="p-4 text-center">
                                                {getEstadoBadge(doc.estado, doc.fecha_vencimiento)}
                                            </td>
                                            <td className="p-4 text-center">
                                                {doc.saldo_pendiente > 0 ? (
                                                    <button onClick={() => abrirModalPago(doc)}
                                                        className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold py-1.5 px-3 rounded-lg text-xs transition-colors border border-emerald-200"
                                                    >
                                                        Recibir Pago
                                                    </button>
                                                ) : (
                                                    <span className="text-emerald-500"><CheckCircle className="w-5 h-5 mx-auto" /></span>
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

            {modalOpen && docSeleccionado && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="bg-emerald-600 p-4 text-white flex justify-between items-center">
                            <h3 className="font-bold flex items-center gap-2">
                                <DollarSign className="w-5 h-5" /> Ingresar Pago en Banco
                            </h3>
                            <button onClick={() => setModalOpen(false)} className="text-white/80 hover:text-white">&times;</button>
                        </div>
                        <form onSubmit={handleRegistrarPago} className="p-6 space-y-4">
                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-sm">
                                <p className="text-slate-500">Abonando a:</p>
                                <p className="font-bold text-slate-800">{docSeleccionado.tipo_documento.replace('_', ' ')} {docSeleccionado.numero_documento && `#${docSeleccionado.numero_documento}`}</p>
                                <p className="text-emerald-700 font-bold mt-1">Saldo Actual: ${parseFloat(docSeleccionado.saldo_pendiente).toLocaleString('es-CL')}</p>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Monto a pagar ($)</label>
                                <input
                                    type="number"
                                    max={docSeleccionado.saldo_pendiente}
                                    required
                                    value={formPago.monto}
                                    onChange={(e) => setFormPago({ ...formPago, monto: e.target.value })}
                                    className="mt-1 w-full border-slate-300 rounded-md text-sm focus:ring-emerald-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">Medio de Pago</label>
                                    <select
                                        value={formPago.medio}
                                        onChange={(e) => setFormPago({ ...formPago, medio: e.target.value })}
                                        className="mt-1 w-full border-slate-300 rounded-md text-sm focus:ring-emerald-500"
                                    >
                                        <option value="Transferencia">Transferencia</option>
                                        <option value="Efectivo">Efectivo</option>
                                        <option value="Cheque_Dia">Cheque al Día</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">{
                                        formPago.medio === 'Efectivo' ? 'N° Recibo Caja' :
                                            formPago.medio === 'Transferencia' ? 'N° Operación Banco' :
                                                'N° Serie del Cheque'
                                    }</label>
                                    <input
                                        type="text"
                                        placeholder={formPago.medio === 'Efectivo' ? 'Se generará automático' : 'Ej. 0004213'}
                                        value={formPago.operacion}
                                        onChange={(e) => setFormPago({ ...formPago, operacion: e.target.value })}
                                        disabled={formPago.medio === 'Efectivo'}
                                        required={formPago.medio !== 'Efectivo'}
                                        className="mt-1 w-full border-slate-300 rounded-md text-sm focus:ring-emerald-500 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed cursor-text transition-colors"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Comprobante de Transferencia (imagen o PDF)</label>
                                <input type="file"
                                    accept=".pdf, image/jpeg, image/png"
                                    onChange={(e) => setComprobanteFile(e.target.files[0])}
                                    className="mt-1 w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-500 hover:file:bg-blue-100" />
                                <p className="text-[10px] text-slate-400 mt-1">Este archivo se guardará de forma exclusiva para este abono específico.</p>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-2.5 border border-slate-300 text-slate-600 rounded-lg font-bold text-sm hover:bg-slate-50">Cancelar</button>
                                <button type="submit" disabled={procesando} className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-sm transition-colors disabled:opacity-50">
                                    {procesando ? 'Guardando...' : 'Confirmar Ingreso'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}