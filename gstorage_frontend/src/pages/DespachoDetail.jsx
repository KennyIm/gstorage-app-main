import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom'; 
import apiClient from '../services/api'; 
import { useAuth } from '../context/AuthContext'; 
import { 
  ArrowLeft, Edit, Trash2, Truck, MapPin, User, Calendar, 
  Clock, Package, CheckCircle, AlertCircle, Loader2, Map 
} from 'lucide-react';

export default function DespachoDetail() {
  const [despacho, setDespacho] = useState(null);
  const [mercancias, setMercancias] = useState([]);
  
  // Estados para catálogos (Diccionarios)
  const [rutas, setRutas] = useState([]);
  const [camiones, setCamiones] = useState([]);
  const [conductores, setConductores] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const { id } = useParams();
  const navigate = useNavigate();
  const { logoutUser } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Carga paralela de TODO lo necesario para mostrar nombres en lugar de IDs
        const [despachoRes, mercanciasRes, rutasRes, camionesRes, conductoresRes] = await Promise.all([
          apiClient.get(`/api/inventario/despachos/${id}/`),
          apiClient.get(`/api/inventario/mercancias/?id_despacho=${id}`),
          apiClient.get('/api/inventario/rutas/'),
          apiClient.get('/api/inventario/camiones/'),
          apiClient.get('/api/inventario/conductores/')
        ]);
        
        setDespacho(despachoRes.data);
        setMercancias(mercanciasRes.data);
        setRutas(rutasRes.data);
        setCamiones(camionesRes.data);
        setConductores(conductoresRes.data);
        
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
    return found ? found.nombre_ruta : `Ruta ID: ${id}`;
  };

  const getInfoCamion = (id) => {
    const found = camiones.find(c => c.id_camion === id);
    return found ? `${found.marca} - ${found.patente}` : `Camión ID: ${id}`;
  };

  const getNombreConductor = (id) => {
    const found = conductores.find(c => c.id_conductor === id);
    return found ? found.nombre_completo : `Conductor ID: ${id}`;
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
      <div className="max-w-6xl mx-auto">
        
        {/* Header de Navegación */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to="/despachos" className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500 transition shadow-sm">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">Despacho #{despacho.id_despacho}</h1>
                <span className={`px-3 py-0.5 rounded-full text-xs font-medium border ${getStatusStyle(despacho.estado_despacho)}`}>
                  {despacho.estado_despacho}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-1">Detalles de logística y carga asignada.</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link 
              to={`/despachos/${id}/editar`} 
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
                      {despacho.fecha_programada || 'Sin definir'}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Salida Real</label>
                    {despacho.fecha_salida_real ? (
                      <div className="flex items-center gap-2 text-blue-700 bg-blue-50 w-fit px-2 py-1 rounded">
                        <Clock className="w-4 h-4" />
                        {despacho.fecha_salida_real.replace('T', ' ')}
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
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-xs font-bold text-indigo-600">Lote #{m.id_mercancia}</span>
                          <Link to={`/mercancias/${m.id_mercancia}`} className="text-gray-400 hover:text-indigo-600">
                            <ArrowLeft className="w-4 h-4 rotate-180" />
                          </Link>
                        </div>
                        <h4 className="text-sm font-medium text-gray-900 line-clamp-1">Cliente ID: {m.id_cliente}</h4>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{m.descripcion_carga || 'Sin descripción'}</p>
                        <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
                          <Package className="w-3 h-3" /> {m.cantidad_bultos} bultos
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400">
                    <Package className="w-12 h-12 mb-2 opacity-20" />
                    <p className="text-sm">No hay mercancía asignada a este despacho.</p>
                  </div>
                )}
              </div>
              
              <div className="p-4 border-t border-gray-100 bg-gray-50">
                <Link 
                  to="/mercancias" 
                  className="block w-full py-2 text-center text-sm text-indigo-600 font-medium hover:bg-indigo-50 rounded-lg border border-dashed border-indigo-200 transition"
                >
                  + Asignar más carga
                </Link>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}