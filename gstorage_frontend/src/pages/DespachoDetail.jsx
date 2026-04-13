import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import apiClient from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  ArrowLeft, Edit, Trash2, Truck, MapPin, User, Calendar,
  Clock, Package, CheckCircle, AlertCircle, Loader2, Map, Printer
} from 'lucide-react';

export default function DespachoDetail() {
  document.title = "Detalles Despacho";
  const [despacho, setDespacho] = useState(null);
  const [mercancias, setMercancias] = useState([]);

  const [rutas, setRutas] = useState([]);
  const [camiones, setCamiones] = useState([]);
  const [conductores, setConductores] = useState([]);
  const [clientes, setClientes] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { logoutUser } = useAuth();

  const isReadOnly =
    user?.perfil?.rol !== 'DUENO' &&
    String(despacho?.sucursal_id) !== String(user?.perfil?.sucursal_id);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [despachoRes, mercanciasRes, rutasRes, camionesRes, conductoresRes, clientesRes] = await Promise.all([
          apiClient.get(`/api/inventario/despachos/${id}/`),
          apiClient.get(`/api/inventario/mercancias/?id_despacho=${id}`),
          apiClient.get('/api/inventario/rutas/'),
          apiClient.get('/api/inventario/camiones/'),
          apiClient.get('/api/inventario/conductores/'),
          apiClient.get('/api/inventario/clientes/'),
        ]);

        setDespacho(despachoRes.data);
        setMercancias(mercanciasRes.data);
        setRutas(rutasRes.data);
        setCamiones(camionesRes.data);
        setConductores(conductoresRes.data);
        setClientes(clientesRes.data);

        setLoading(false);
      } catch (err) {
        if (err.response && err.response.status === 401) {
          logoutUser();
        } else {
          console.error("Error al buscar la información:", err);
          setError("No se pudo cargar la información completa del despacho.");
        }
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  // --- Helpers para obtener Nombres ---
  const getNombreRuta = (id) => {
    const found = rutas.find(r => r.id_ruta === id);
    return found ? found.codigo_ruta : `Ruta ID: ${id}`;
  };

  const getInfoCamion = (id) => {
    const found = camiones.find(c => c.id_camion === id);
    return found ? `${found.marca} - ${found.patente}` : `Camión ID: ${id}`;
  };

  const getNombreConductor = (id) => {
    const found = conductores.find(c => c.id_conductor === id);
    return found ? found.nombre_completo : `Conductor ID: ${id}`;
  };

  const getNombreCliente = (id) => {
    const found = clientes.find(c => String(c.id_cliente) === String(id));
    return found ? found.nombre_cliente : `Cliente Desconocido`;
  };

  const getDireccionCliente = (id) => {
    const found = clientes.find(c => String(c.id_cliente) === String(id));
    return found ? found.direccion : `Dirección no registrada`;
  };


  const handleDelete = async () => {
    if (window.confirm(`¿Estás seguro de que deseas eliminar el Despacho #${id}? Esto puede desasignar mercancías.`)) {
      try {
        await apiClient.delete(`/api/inventario/despachos/${id}/`);
        navigate('/despachos');
      } catch (err) {
        setError('No se pudo eliminar el despacho.');
      }
    }
  };

  // Helper para colores de estado
  const getStatusStyle = (status) => {
    switch (status) {
      case 'Entregado': return 'bg-green-100 text-green-800 border-green-200';
      case 'En Ruta': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'En Carga': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'Programado': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleDescargarExcel = async (idDespacho) => {
    try {
      const response = await apiClient.get(`/api/inventario/despachos/${idDespacho}/excel/`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Hoja_de_Ruta_${getNombreRuta(idDespacho)}.xlsx`);
      document.body.appendChild(link);
      link.click();

      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error al descargar el Excel", err);
      alert("Hubo un problema al generar la hoja de ruta.");
    }
  };

  // --- RENDERIZADO ---

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-500">
        <Loader2 className="w-10 h-10 animate-spin mb-4 text-indigo-600" />
        <p>Cargando detalles del despacho...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <div className="bg-red-50 border-l-4 border-red-500 p-4 flex items-start gap-3 rounded-r-lg">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
            <button onClick={() => navigate('/despachos')} className="mt-3 text-sm font-medium text-red-800 hover:underline">
              Volver al listado
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!despacho) return <div className="p-8 text-center text-gray-500">No se encontró el despacho.</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8 font-sans">
      {isReadOnly && (
                <div className="bg-amber-100 text-amber-800 p-3 mb-4 rounded-lg border border-amber-200 font-bold text-center">
                  Estás visualizando un despacho de otra sucursal. No tienes permisos para editarlo.
                </div>
              )}
      <div className="max-w-6xl mx-auto">

        {/* Header de Navegación */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to="/despachos" className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500 transition shadow-sm">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">Despacho #{id}</h1>
                <span className={`px-3 py-0.5 rounded-full text-xs font-medium border ${getStatusStyle(despacho.estado_despacho)}`}>
                  {despacho.estado_despacho}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {!isReadOnly && (
            <Link
              to={`/despachos/${id}/editar`}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition shadow-sm"
            >
              <Edit className="w-4 h-4" /> Editar
            </Link>
            )}
            {!isReadOnly && (
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 text-red-700 font-medium rounded-lg hover:bg-red-100 transition shadow-sm"
            >
              <Trash2 className="w-4 h-4" /> Eliminar
            </button>
            )}
            <button
              onClick={() => navigate(`/despachos/${id}/imprimir-plantilla`)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 text-blue-700 font-medium rounded-lg hover:bg-blue-100 transition shadow-sm"
            >
              <Printer className="w-5 h-5" />
              Imprimir Órdenes
            </button>
            <button
              onClick={() => handleDescargarExcel(despacho.id_despacho)}
              className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-blue-200 text-green-700 font-medium rounded-lg hover:bg-green-100 transition shadow-sm"
            >
              Descargar Excel
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* COLUMNA IZQUIERDA: INFORMACIÓN PRINCIPAL */}
          <div className="lg:col-span-2 space-y-6">

            {/* Tarjeta de Ruta y Tiempos */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2 bg-gray-50/50">
                <Map className="w-4 h-4 text-indigo-600" />
                <h3 className="font-semibold text-gray-900">Información del Viaje</h3>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Ruta Asignada</label>
                  <div className="flex items-center gap-2 text-gray-900 font-medium">
                    <MapPin className="w-4 h-4 text-indigo-500" />
                    {getNombreRuta(despacho.id_ruta)}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Fecha Programada</label>
                    <div className="flex items-center gap-2 text-gray-700">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      {despacho.fecha_programada
                        ? new Date(despacho.fecha_programada).toLocaleDateString('es-CL')
                        : 'Sin definir'}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Salida Real</label>
                    {despacho.fecha_salida_real ? (
                      <div className="flex items-center gap-2 text-blue-700 bg-blue-50 w-fit px-2 py-1 rounded">
                        <Clock className="w-4 h-4" />
                        {despacho.fecha_salida_real
                          ? new Date(despacho.fecha_salida_real).toLocaleString('es-CL', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                          : 'Sin definir'}
                      </div>
                    ) : (
                      <span className="text-gray-400 italic text-sm flex items-center gap-2">
                        <Clock className="w-4 h-4" /> Sin registrar
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Tarjeta de Transporte */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2 bg-gray-50/50">
                <Truck className="w-4 h-4 text-indigo-600" />
                <h3 className="font-semibold text-gray-900">Recursos de Transporte</h3>
              </div>
              <div className="p-6 flex flex-col sm:flex-row gap-6">
                <div className="flex-1 p-4 bg-gray-50 rounded-lg border border-gray-100 flex items-start gap-3">
                  <div className="p-2 bg-white rounded-full shadow-sm text-gray-600">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block text-xs font-medium text-gray-500">Vehículo</span>
                    <span className="block text-sm font-semibold text-gray-900">
                      {getInfoCamion(despacho.id_camion)}
                    </span>
                  </div>
                </div>

                <div className="flex-1 p-4 bg-gray-50 rounded-lg border border-gray-100 flex items-start gap-3">
                  <div className="p-2 bg-white rounded-full shadow-sm text-gray-600">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block text-xs font-medium text-gray-500">Conductor</span>
                    <span className="block text-sm font-semibold text-gray-900">
                      {getNombreConductor(despacho.id_conductor)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* COLUMNA DERECHA: MERCANCÍAS */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden h-full flex flex-col">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Package className="w-4 h-4 text-indigo-600" /> Carga Asignada
                </h3>
                <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded-full">
                  {mercancias.length}
                </span>
              </div>

              <div className="p-4 flex-1 overflow-y-auto max-h-[500px]">
                {mercancias.length > 0 ? (
                  <div className="space-y-3">
                    {mercancias.map(m => (
                      <div key={m.id_mercancia} className="group relative bg-white border border-gray-200 rounded-lg p-3 hover:border-indigo-300 hover:shadow-sm transition-all">

                        {/* ENCABEZADO DE LA TARJETA */}
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex flex-col">
                            <span className="text-xs font-black text-indigo-600">Lote #{m.id_mercancia}</span>
                            <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                              Factura: {m.factura || 'S/N'}
                            </span>
                          </div>

                          <Link to={`/mercancias/${m.id_mercancia}`} className="text-gray-400 hover:text-indigo-600 bg-gray-50 p-1 rounded-md transition-colors">
                            <ArrowLeft className="w-4 h-4 rotate-180" />
                          </Link>
                        </div>

                        <h4 className="text-sm font-bold text-gray-900 line-clamp-1 truncate">
                          {getNombreCliente(m.id_cliente)}
                        </h4>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                          <span className="truncate">{getDireccionCliente(m.id_cliente)}</span>
                        </p>

                        <p className="text-xs text-gray-600 mt-2 bg-gray-50 p-2 rounded line-clamp-2 italic border border-gray-100">
                          "{m.descripcion_carga || 'Sin descripción'}"
                        </p>

                        {/* PIE DE LA TARJETA: Bultos */}
                        <div className="mt-2 flex items-center justify-between text-xs font-semibold text-gray-600 pt-2 border-t border-gray-100">
                          <div className="flex items-center gap-1.5">
                            <Package className="w-3.5 h-3.5 text-indigo-400" />
                            <span>{m.cantidad_bultos} bultos</span>
                          </div>
                          <span>{m.kg} kg / {m.m3} m³</span>
                        </div>

                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400">
                    <Package className="w-12 h-12 mb-2 opacity-20" />
                    <p className="text-sm font-medium">No hay mercancía asignada a este despacho.</p>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-gray-100 bg-gray-50">
                <Link
                  to="/mercancias"
                  className="block w-full py-2.5 text-center text-sm text-indigo-600 font-bold hover:bg-indigo-50 rounded-lg border border-dashed border-indigo-300 hover:border-indigo-400 transition"
                >
                  Asignar más carga
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}