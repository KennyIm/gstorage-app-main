import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import {
  Plus, Search, Eye, Edit, Truck, Map, User, Calendar,
  Clock, CheckCircle, AlertCircle, Loader2, ArrowRight,
  PlayCircle, PackageCheck, ChevronLeft, ChevronRight, ArrowLeft
} from 'lucide-react';

export default function DespachoList() {
  document.title = "Listado de Despachos";
  const [despachos, setDespachos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sucursales, setSucursales] = useState([]);
  const { logoutUser } = useAuth();
  const { showLoader, hideLoader, showToast } = useUI();

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [despRes, sucurRes] = await Promise.all([
          apiClient.get('/api/inventario/despachos/'),
          apiClient.get('/api/usuarios/sucursales/')
        ]);
        setDespachos(despRes.data);
        setSucursales(sucurRes.data);
        setLoading(false);
      } catch (err) {
        console.error(err);
        showToast('Error al cargar la lista de despachos.', 'error');
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleDateChange = async (id, newValue) => {
    setDespachos(prev => prev.map(d =>
      d.id_despacho === id ? { ...d, fecha_salida_real: newValue } : d
    ));

    try {
      await apiClient.patch(`/api/inventario/despachos/${id}/`, {
        fecha_salida_real: newValue || null
      });
    } catch (err) {
      showToast("Error al actualizar la fecha. Recargando...", 'error');
      fetchData();
    }
  };

  const formatDateForInput = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  };

  const formatDateTime = (isoString) => {
    if (!isoString) return null;
    return new Date(isoString).toLocaleString('es-CL', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    const styles = {
      'Programado': {
        bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300',
        icon: <Calendar className="w-3.5 h-3.5" />
      },
      'En Carga': {
        bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200',
        icon: <PackageCheck className="w-3.5 h-3.5" />
      },
      'En Tránsito': {
        bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200',
        icon: <PlayCircle className="w-3.5 h-3.5" />
      },
      'Finalizado': {
        bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200',
        icon: <CheckCircle className="w-3.5 h-3.5" />
      }
    };

    const style = styles[status] || styles['Programado'];

    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${style.bg} ${style.text} ${style.border}`}>
        {style.icon}
        {status.toUpperCase()}
      </span>
    );
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Entregado': return <CheckCircle className="w-3 h-3" />;
      case 'En Ruta': return <Truck className="w-3 h-3" />;
      case 'En Preparación': return <Clock className="w-3 h-3" />;
      default: return <AlertCircle className="w-3 h-3" />;
    }
  };

  const formatRUT = (rut) => {
    if (!rut) return 'Sin RUT';
    let value = rut.replace(/[^0-9kK]/g, '').toUpperCase();
    if (value.length <= 1) return value;

    const body = value.slice(0, -1);
    const dv = value.slice(-1);

    const formattedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

    return `${formattedBody}-${dv}`;
  };

  // Filtrado local simple
  const filteredDespachos = despachos.filter(d =>
    (String(d.id_ruta || '')).toLowerCase().includes(searchTerm.toLowerCase()) ||
    (String(d.id_conductor || '')).toLowerCase().includes(searchTerm.toLowerCase()) ||
    (String(d.id_camion || '')).toLowerCase().includes(searchTerm.toLowerCase())
  );
  const totalPages = Math.ceil(filteredDespachos.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedDespachos = filteredDespachos.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // --- RENDERIZADO ---

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-500">
        <Loader2 className="w-10 h-10 animate-spin mb-4 text-indigo-600" />
        <p>Cargando gestión de despachos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="bg-red-50 border-l-4 border-red-500 p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <span className="text-red-700 font-medium">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-7xl mx-auto">

        {/* Header y Acciones */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Despachos</h1>
            <p className="mt-1 text-sm text-gray-600">Planificación y seguimiento de salidas de mercancía.</p>
          </div>

          <Link
            to="/despachos/nuevo"
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition shadow-sm w-full sm:w-auto justify-center"
          >
            <Plus className="w-5 h-5" /> Nuevo Despacho
          </Link>
        </div>

        {/* Filtros y Buscador */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por ruta, conductor o camión..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Tabla de Resultados */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50/50 text-gray-500 font-medium border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4">Ruta</th>
                  <th className="px-6 py-4">Suc</th>
                  <th className="px-6 py-4">Transporte</th>
                  <th className="px-6 py-4">Fecha Programada</th>
                  <th className="px-6 py-4">Salida Real</th>
                  <th className="px-6 py-4 text-center">Estado</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedDespachos.length > 0 ? (
                  paginatedDespachos.map((despacho) => {
                    const sucursalObj = sucursales.find(s => s.id === despacho.sucursal_id);
                    const nombreLugar = sucursalObj ? sucursalObj.ciudad : 'Sin Asignar';
                    const iniciales = sucursalObj ? nombreLugar.substring(0, 3).toUpperCase() : '---';

                    return (
                      <tr key={despacho.id_despacho} className="hover:bg-gray-50/50 transition">

                        {/* ID y Ruta */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div>
                              <div className="font-semibold text-gray-900 flex items-center gap-1.5">
                                Ruta {despacho.id_ruta}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2 text-green-700">
                              <span className="font-medium">{sucursalObj ? `${iniciales}` : 'Sin Asignar'}</span>
                            </div>
                          </div>
                        </td>

                        {/* Transporte (Camión + Conductor) */}
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2 text-gray-700">
                              <Truck className="w-3.5 h-3.5 text-gray-400" />
                              <span className="font-medium">{despacho.id_camion}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-500 text-xs">
                              <User className="w-3.5 h-3.5" />
                              <span className="font-mono">{formatRUT(despacho.id_conductor)}</span>
                            </div>
                          </div>
                        </td>

                        {/* Fecha */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-gray-600">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            {despacho.fecha_programada
                              ? new Date(despacho.fecha_programada).toLocaleDateString('es-CL')
                              : 'Sin definir'}
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="relative">
                            <input
                              type="datetime-local"
                              className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-gray-700 bg-white shadow-sm cursor-pointer hover:border-gray-400 transition"
                              value={formatDateForInput(despacho.fecha_salida_real)}
                              onChange={(e) => handleDateChange(despacho.id_despacho, e.target.value)}
                            />
                            {!despacho.fecha_salida_real && (
                              <div className="absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none">
                                <span className="flex h-2 w-2 relative">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                                </span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Estado */}
                        <td className="px-6 py-4 text-center">
                          {getStatusBadge(despacho.estado_despacho)}
                        </td>

                        {/* Acciones */}
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              to={`/despachos/${despacho.id_despacho}`}
                              className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition group"
                              title="Ver Detalle"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                            <Link
                              to={`/despachos/${despacho.id_despacho}/editar`}
                              className="p-2 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                              title="Editar"
                            >
                              <Edit className="w-4 h-4" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center text-gray-400">
                        <Truck className="w-12 h-12 mb-3 opacity-20" />
                        <p className="text-lg font-medium text-gray-900">No se encontraron despachos</p>
                        <p className="text-sm">Intenta ajustar tu búsqueda o crea un nuevo despacho.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {filteredDespachos.length > 0 && (
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row justify-between items-center gap-4">
              <span className="text-xs text-gray-500">
                Mostrando {startIndex + 1} a {Math.min(startIndex + ITEMS_PER_PAGE, filteredDespachos.length)} de {filteredDespachos.length} despachos
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 border border-gray-300 rounded-md hover:bg-white disabled:opacity-40 transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex gap-1">
                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`px-3 py-1 rounded-md text-xs font-semibold transition ${currentPage === i + 1
                        ? 'bg-indigo-600 text-white'
                        : 'text-gray-600 hover:bg-white border border-transparent hover:border-gray-300'
                        }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 border border-gray-300 rounded-md hover:bg-white disabled:opacity-40 transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}