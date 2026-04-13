import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import apiClient from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import {
    Plus, ChevronDown, ChevronUp, Edit, Trash2, CheckCircle,
    Calendar, User, Truck, Package, Scale, Box, MapPin, Clock, Search, FileText,
    Phone, ChevronLeft, ChevronRight
} from 'lucide-react';

export default function CotizacionList() {
    document.title = "Cotizaciones | GStorage";
    const navigate = useNavigate();
    const { user } = useAuth();
    const { showLoader, hideLoader, showToast } = useUI();

    const [cotizaciones, setCotizaciones] = useState([]);
    const [loadingInicial, setLoadingInicial] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedId, setExpandedId] = useState(null);

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // --- CARGA DE DATOS ---

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, itemsPerPage]);

    useEffect(() => {
        fetchCotizaciones();
    }, []);

    const fetchCotizaciones = async () => {
        setLoadingInicial(true);
        try {
            const res = await apiClient.get('/api/inventario/cotizaciones/');
            setCotizaciones(res.data);
        } catch (err) {
            showToast('Error al cargar las cotizaciones.', 'error');
        } finally {
            setLoadingInicial(false);
        }
    };

    // --- ACCIONES ---
    const handleToggleExpand = (id) => {
        setExpandedId(prev => prev === id ? null : id);
    };

    const handleEliminar = async (id, nombre) => {
        if (!window.confirm(`¿Seguro que deseas eliminar (lógico) la cotización de ${nombre}?`)) return;

        showLoader();
        try {
            await apiClient.delete(`/api/inventario/cotizaciones/${id}/`);
            showToast('Cotización eliminada correctamente.', 'success');
            fetchCotizaciones();
        } catch (err) {
            showToast('No se pudo eliminar la cotización.', 'error');
        } finally {
            hideLoader();
        }
    };

    const handleConfirmarCotizacion = async (id) => {
        if (!window.confirm('¿Confirmar esta cotización? Ya no podrás editarla una vez confirmada.')) return;

        showLoader();
        try {
            await apiClient.patch(`/api/inventario/cotizaciones/${id}/`, {
                estado_cotizacion: 'Cotizado',
                fecha_confirmacion: new Date().toISOString()
            });
            showToast('¡Cotización confirmada exitosamente!', 'success');
            fetchCotizaciones();
        } catch (err) {
            showToast('Error al confirmar la cotización.', 'error');
        } finally {
            hideLoader();
        }
    };

    // --- UTILIDADES ---
    const formatFecha = (fechaString) => {
        if (!fechaString) return '-';
        const date = new Date(fechaString);
        return date.toLocaleDateString('es-CL', {
            day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    const filtradas = cotizaciones.filter(cot => {
        const term = searchTerm.toLowerCase();
        return (
            cot.nombre_cliente?.toLowerCase().includes(term) ||
            cot.rut_cliente?.toLowerCase().includes(term) ||
            cot.estado_cotizacion?.toLowerCase().includes(term)
        );
    });

    const totalPages = Math.ceil(filtradas.length / itemsPerPage);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filtradas.slice(indexOfFirstItem, indexOfLastItem);

    // --- RENDERIZADO ---
    if (loadingInicial) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
                <div className="w-10 h-10 border-4 border-red-800 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 text-gray-500 font-medium">Cargando cotizaciones...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8 font-sans">
            <div className="max-w-6xl mx-auto">

                {/* ENCABEZADO Y CONTROLES */}
                <div className="mb-8">
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Cotizaciones</h1>
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8 p-4 bg-white rounded-xl shadow-sm border border-gray-100">
                    <div className="relative w-full sm:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar por cliente, RUT o estado..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-red-800 outline-none transition"
                        />
                    </div>
                    <Link
                        to="/cotizaciones/crear"
                        className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-2.5 bg-red-800 text-white rounded-lg hover:bg-red-900 transition font-bold shadow-md"
                    >
                        <Plus className="w-5 h-5" /> Crear Cotización
                    </Link>
                </div>

                {filtradas.length > 0 && (
                    <div className="flex justify-between items-center mb-4 px-2">
                        <p className="text-sm text-gray-500">
                            Mostrando <span className="font-bold text-gray-900">{indexOfFirstItem + 1}</span> a <span className="font-bold text-gray-900">{Math.min(indexOfLastItem, filtradas.length)}</span> de <span className="font-bold text-gray-900">{filtradas.length}</span> cotizaciones
                        </p>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <label htmlFor="perPage">Mostrar:</label>
                            <select
                                id="perPage"
                                value={itemsPerPage}
                                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                                className="bg-white border border-gray-300 rounded-md py-1 px-2 focus:ring-red-800 focus:border-red-800 outline-none cursor-pointer"
                            >
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                            </select>
                        </div>
                    </div>
                )}

                {/* LISTADO ESTILO ACORDEÓN */}
                <div className="space-y-3">
                    {filtradas.length === 0 ? (
                        <div className="p-8 text-center bg-white rounded-xl border border-gray-200 text-gray-500">
                            No se encontraron cotizaciones.
                        </div>
                    ) : (
                        filtradas.map(cot => {
                            const isExpanded = expandedId === cot.id_cotizacion;
                            const isCotizado = cot.estado_cotizacion === 'Cotizado';

                            const displayDate = isCotizado ? cot.fecha_confirmacion : cot.fecha_creacion;
                            const dateLabel = isCotizado ? "Confirmada" : "Creada";

                            const isCreator = user?.id === cot.id_usuario_creacion;

                            return (
                                <div key={cot.id_cotizacion} className="rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all border border-gray-800">
                                    {/* BARRA SUPERIOR */}
                                    <div
                                        onClick={() => handleToggleExpand(cot.id_cotizacion)}
                                        className={`flex flex-col sm:flex-row items-center justify-between p-4 cursor-pointer select-none transition-colors ${isExpanded ? 'bg-slate-900 text-white' : 'bg-slate-800 text-gray-100 hover:bg-slate-700'}`}
                                    >
                                        <div className="flex items-center gap-4 w-full sm:w-auto sm:mb-0">
                                            <span className={`px-3 py-1 text-xs font-black uppercase tracking-wider rounded-md border ${isCotizado ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50' : 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                                                }`}>
                                                {cot.estado_cotizacion}
                                            </span>
                                            <h3 className="font-bold text-lg truncate max-w-[250px] sm:max-w-md">
                                                Cotización {cot.nombre_cliente}
                                            </h3>
                                        </div>

                                        <div className="flex items-center justify-between w-full sm:w-auto gap-6">
                                            <div className="flex flex-col sm:items-end text-sm">
                                                <span className="text-[10px] text-gray-400 uppercase tracking-wider">{dateLabel}</span>
                                                <span className={`font-medium flex items-center gap-1.5 ${isCotizado ? 'text-emerald-400' : 'text-gray-200'}`}>
                                                    <Calendar className="w-4 h-4" /> {formatFecha(displayDate)}
                                                </span>
                                            </div>
                                            <div className="p-1.5 bg-white/10 rounded-full text-white">
                                                {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                            </div>
                                        </div>
                                    </div>

                                    {/* CUERPO EXPANDIDO */}
                                    {isExpanded && (
                                        <div className="bg-white p-6 border-t border-gray-200 animate-in slide-in-from-top-2 duration-200">
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                                                {/* Bloque Cliente */}
                                                <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                                                    <h4 className="text-xs font-bold text-red-800 uppercase mb-3 flex items-center gap-2">
                                                        Cliente
                                                    </h4>
                                                    <p className="text-sm font-semibold text-gray-900">{cot.nombre_cliente}</p>
                                                    <p className="text-xs text-gray-500 mt-1">RUT: {cot.rut_cliente}</p>
                                                    {!cot.cotiza_proveedor && (
                                                        <p className="text-xs text-indigo-600 font-bold mt-2 flex items-center gap-1">
                                                            <Phone className="w-3 h-3" /> Contacto: {cot.contacto || 'N/R'}
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Bloque Proveedor & Logística */}
                                                <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                                                    <h4 className="text-xs font-bold text-red-800 uppercase mb-3 flex items-center gap-2">
                                                        Proveedor
                                                    </h4>
                                                    <p className="text-sm font-semibold text-gray-900 truncate">{cot.proveedor || 'Sin proveedor'}</p>
                                                    <p className="text-xs text-gray-500 mt-1">RUT Prov: {cot.rut_proveedor}</p>
                                                    {cot.cotiza_proveedor && (
                                                        <p className="text-xs text-indigo-600 font-bold mt-2 flex items-center gap-1">
                                                            <Phone className="w-3 h-3" /> Contacto: {cot.contacto || 'N/R'}
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Bloque Carga*/}
                                                <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                                                    <h4 className="text-xs font-bold text-red-800 uppercase mb-3 flex items-center gap-2">
                                                        Especificaciones
                                                    </h4>
                                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                                        <div><span className="text-gray-500 text-xs">Bultos:</span> <br /><span className="font-bold">{cot.cantidad}</span></div>
                                                        <div><span className="text-gray-500 text-xs">Peso:</span> <br /><span className="font-bold">{cot.kg} Kg</span></div>
                                                        <div><span className="text-gray-500 text-xs">Medidas:</span> <br /><span className="font-bold">{cot.m3} m³</span></div>
                                                        <div><span className="text-gray-500 text-xs">Tipo:</span> <br /><span className="font-bold">{cot.tipo_bultos}</span></div>
                                                        <div className="col-span-2 mt-1 pt-2 border-t border-gray-200">
                                                            <span className="text-gray-500 text-xs uppercase">Presupuesto Cotizado:</span> <br />
                                                            <span className="text-lg font-black text-emerald-700">
                                                                ${parseFloat(cot.monto || 0).toLocaleString('es-CL')}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Tiempos de Vida */}
                                            <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-50 border border-slate-200 rounded-lg mb-6">
                                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                                    <Clock className="w-4 h-4 text-gray-400" />
                                                    <span>Creada: <strong>{formatFecha(cot.fecha_creacion)}</strong></span>
                                                </div>
                                                {cot.fecha_confirmacion && (
                                                    <div className="flex items-center gap-2 text-sm text-emerald-700">
                                                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                                                        <span>Confirmada: <strong>{formatFecha(cot.fecha_confirmacion)}</strong></span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* BOTONES DE ACCIÓN */}
                                            <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-gray-100">
                                                {isCreator && (
                                                <button
                                                    onClick={() => handleEliminar(cot.id_cotizacion, cot.nombre_cliente)}
                                                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-red-600 font-medium rounded-lg hover:bg-red-50 transition shadow-sm"
                                                >
                                                    <Trash2 className="w-4 h-4" /> Eliminar
                                                </button>
                                                )}
                                                {!isCotizado && (
                                                    <Link
                                                        to={`/cotizaciones/editar/${cot.id_cotizacion}`}
                                                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition shadow-sm"
                                                    >
                                                        <Edit className="w-4 h-4" /> Editar
                                                    </Link>
                                                )}
                                                {!isCotizado && isCreator && (
                                                    <button
                                                        onClick={() => handleConfirmarCotizacion(cot.id_cotizacion)}
                                                        className="flex items-center gap-2 px-5 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition shadow-md"
                                                    >
                                                        <CheckCircle className="w-4 h-4" /> Confirmar y Cerrar Cotización
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
                {/* CONTROLES DE PAGINACIÓN */}
                {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-2 mt-8">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className="p-2 border border-gray-300 rounded-lg bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
                            title="Página anterior"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>

                        <div className="flex items-center gap-1">
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(number => {
                                if (
                                    totalPages <= 7 ||
                                    number === 1 ||
                                    number === totalPages ||
                                    (number >= currentPage - 1 && number <= currentPage + 1)
                                ) {
                                    return (
                                        <button
                                            key={number}
                                            onClick={() => setCurrentPage(number)}
                                            className={`w-10 h-10 flex items-center justify-center rounded-lg font-medium transition shadow-sm ${currentPage === number
                                                    ? 'bg-red-800 text-white border border-red-800'
                                                    : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                                                }`}
                                        >
                                            {number}
                                        </button>
                                    );
                                } else if (
                                    (number === currentPage - 2 && currentPage > 3) ||
                                    (number === currentPage + 2 && currentPage < totalPages - 2)
                                ) {
                                    return <span key={number} className="px-1 text-gray-400">...</span>;
                                }
                                return null;
                            })}
                        </div>

                        <button
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className="p-2 border border-gray-300 rounded-lg bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
                            title="Página siguiente"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                )}

            </div>
        </div>
    );
}