import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import apiClient from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  ArrowLeft, Edit, Trash2, Package, MapPin, User,
  Calendar, Activity, Truck, Scale, Box, FileText,
  Loader2, AlertCircle, Info, DollarSign
} from 'lucide-react';

export default function MercanciaDetail() {
  const [mercancia, setMercancia] = useState(null);


  const [clientes, setClientes] = useState([]);
  const [destinos, setDestinos] = useState([]);
  const [ubicaciones, setUbicaciones] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { id } = useParams();
  const navigate = useNavigate();
  const { logoutUser } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const mercanciaRes = await apiClient.get(`/api/inventario/mercancias/${id}/`);
        setMercancia(mercanciaRes.data);
        const [clientesRes, destinosRes, ubicacionesRes] = await Promise.all([
          apiClient.get('/api/inventario/clientes/'),
          apiClient.get('/api/inventario/destinos/'),
          apiClient.get('/api/inventario/ubicaciones/')
        ]);

        setClientes(clientesRes.data);
        setDestinos(destinosRes.data);
        setUbicaciones(ubicacionesRes.data);

        setLoading(false);
      } catch (err) {
        if (err.response && err.response.status === 401) {
          logoutUser();
        } else {
          console.error("Error al cargar datos:", err);
          setError("No se pudo cargar la información completa.");
        }
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);
  const getNombreCliente = (id) => {
    if (!id) return 'No asignado';
    const cliente = clientes.find(c => c.id_cliente === id);
    return cliente ? cliente.nombre_cliente : `ID: ${id} (No encontrado)`;
  };

  const getNombreDestino = (id) => {
    if (!id) return 'No asignado';
    const destino = destinos.find(d => d.id_destino === id);
    return destino ? destino.nombre_ciudad : `ID: ${id}`;
  };

  const getCodigoUbicacion = (id) => {
    if (!id) return 'Sin ubicación';
    const ubicacion = ubicaciones.find(u => u.id_ubicacion === id);
    return ubicacion ? ubicacion.codigo_ubicacion : `ID: ${id}`;
  };

  const handleDelete = async () => {
    if (window.confirm(`¿Estás seguro de que deseas eliminar el Lote #${mercancia?.id_mercancia}?`)) {
      try {
        await apiClient.delete(`api/inventario/mercancias/${id}/`);
        navigate('/mercancias');
      } catch (err) {
        console.error("Error al eliminar:", err);
        setError('No se pudo eliminar la mercancía.');
      }
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-500">
        <Loader2 className="w-10 h-10 animate-spin mb-4 text-indigo-600" />
        <p>Cargando detalles del lote...</p>
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
            <button onClick={() => navigate('/mercancias')} className="mt-3 text-sm font-medium text-red-800 hover:underline">
              Volver al listado
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!mercancia) return <div className="p-8 text-center text-gray-500">No se encontró la mercancía.</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-5xl mx-auto">

        {/* Header de Navegación */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to="/mercancias" className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500 transition shadow-sm">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-gray-900">Lote #{mercancia.id_mercancia}</h1>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${mercancia.estado === 'ALMACENADO' ? 'bg-green-50 text-green-700 border-green-200' :
                    mercancia.estado === 'DESPACHADO' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                      'bg-gray-100 text-gray-600 border-gray-200'
                  }`}>
                  {mercancia.estado}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-1">Detalle completo de la carga y su ubicación.</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to={`/mercancias/${id}/editar`}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition shadow-sm"
            >
              <Edit className="w-4 h-4" /> Editar
            </Link>
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 text-red-700 font-medium rounded-lg hover:bg-red-100 transition shadow-sm"
            >
              <Trash2 className="w-4 h-4" /> Eliminar
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          <div className="lg:col-span-2 space-y-6">

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Package className="w-4 h-4 text-indigo-600" /> Datos del Lote
                </h3>
              </div>
              <div className="p-6">

                <div className="flex items-start gap-4 mb-6 p-4 bg-indigo-50/50 rounded-lg border border-indigo-100">
                  <div className="p-2 bg-white rounded-full shadow-sm text-indigo-600">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block text-xs font-medium text-gray-500 uppercase tracking-wide">Cliente Asociado</span>
                    <span className="block text-lg font-semibold text-gray-900">
                      {getNombreCliente(mercancia.id_cliente)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="p-4 border border-gray-100 rounded-lg text-center hover:border-gray-200 transition bg-white">
                    <Package className="w-5 h-5 text-gray-400 mx-auto mb-2" />
                    <span className="block text-xl font-bold text-gray-900">{mercancia.cantidad_bultos}</span>
                    <span className="text-xs text-gray-500 font-medium">Bultos</span>
                  </div>
                  <div className="p-4 border border-gray-100 rounded-lg text-center hover:border-gray-200 transition bg-white">
                    <Scale className="w-5 h-5 text-gray-400 mx-auto mb-2" />
                    <span className="block text-xl font-bold text-gray-900">{mercancia.kg || 0}</span>
                    <span className="text-xs text-gray-500 font-medium">Kg</span>
                  </div>
                  <div className="p-4 border border-gray-100 rounded-lg text-center hover:border-gray-200 transition bg-white">
                    <Box className="w-5 h-5 text-gray-400 mx-auto mb-2" />
                    <span className="block text-xl font-bold text-gray-900">{mercancia.m3 || 0}</span>
                    <span className="text-xs text-gray-500 font-medium">m³</span>
                  </div>
                  <div className="p-4 border border-emerald-100 rounded-lg text-center hover:border-emerald-200 transition bg-emerald-50">
                    <DollarSign className="w-5 h-5 text-emerald-500 mx-auto mb-2" />
                    <span className="block text-xl font-bold text-emerald-700">
                      ${parseFloat(mercancia.precio_total || 0).toFixed(2)}
                    </span>
                    <span className="text-xs text-emerald-600 font-medium">Valor Total</span>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-400" /> Descripción
                  </h4>
                  <p className="text-gray-600 text-sm leading-relaxed p-3 bg-gray-50 rounded-lg border border-gray-100">
                    {mercancia.descripcion_carga || "Sin descripción registrada."}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2 bg-gray-50/50">
                <Info className="w-4 h-4 text-gray-400" />
                <h3 className="font-semibold text-gray-700 text-sm">Información de Auditoría</h3>
              </div>
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="block text-xs text-gray-500 mb-1">Creado por</span>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500">
                      {mercancia.id_usuario_creacion}
                    </div>
                    <span className="text-gray-900">Usuario ID {mercancia.id_usuario_creacion}</span>
                  </div>
                </div>
                <div>
                  <span className="block text-xs text-gray-500 mb-1">Última Modificación</span>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-900">
                      {mercancia.fecha_creacion || "Fecha no disponible"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-indigo-600" /> Logística
                </h3>
              </div>
              <div className="p-6 space-y-6">

                <div className="relative pl-4 border-l-2 border-indigo-200">
                  <span className="block text-xs font-medium text-gray-500 uppercase mb-1">Ubicación Actual</span>
                  <div className="flex items-center gap-2 text-gray-900 font-medium">
                    <MapPin className="w-4 h-4 text-indigo-500" />
                    {getCodigoUbicacion(mercancia.id_ubicacion_actual)}
                  </div>
                </div>

                <div className="relative pl-4 border-l-2 border-orange-200">
                  <span className="block text-xs font-medium text-gray-500 uppercase mb-1">Destino Final</span>
                  <div className="flex items-center gap-2 text-gray-900 font-medium">
                    <MapPin className="w-4 h-4 text-orange-500" />
                    {getNombreDestino(mercancia.id_destino)}
                  </div>
                </div>

                <div className="relative pl-4 border-l-2 border-gray-200">
                  <span className="block text-xs font-medium text-gray-500 uppercase mb-1">Despacho</span>
                  {mercancia.id_despacho ? (
                    <div className="flex items-center gap-2 text-blue-600 font-medium">
                      <Truck className="w-4 h-4" />
                      Despacho #{mercancia.id_despacho}
                    </div>
                  ) : (
                    <span className="text-gray-400 italic text-sm">Pendiente de asignar</span>
                  )}
                </div>

              </div>
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 text-center">
                <button className="text-indigo-600 text-sm font-medium hover:text-indigo-700 transition">
                  Ver historial de movimientos
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}