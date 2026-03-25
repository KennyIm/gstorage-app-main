import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import apiClient from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Save, ArrowLeft, Calendar, Clock, Truck, User, Map,
  Activity, Loader2, AlertCircle, CheckCircle
} from 'lucide-react';

export default function DespachoEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { logoutUser } = useAuth();

  const [formData, setFormData] = useState(null);
  const [camiones, setCamiones] = useState([]);
  const [conductores, setConductores] = useState([]);
  const [rutas, setRutas] = useState([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const formatDateForInput = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const offset = date.getTimezoneOffset() * 60000;
    const localISOTime = new Date(date.getTime() - offset).toISOString().slice(0, 16);
    return localISOTime;
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [camionesRes, conductoresRes, rutasRes] = await Promise.all([
          apiClient.get('/api/inventario/camiones/'),
          apiClient.get('/api/inventario/conductores/'),
          apiClient.get('/api/inventario/rutas/')
        ]);

        setCamiones(camionesRes.data);
        setConductores(conductoresRes.data);
        setRutas(rutasRes.data);
        const despachoRes = await apiClient.get(`/api/inventario/despachos/${id}/`);

        setFormData({
          fecha_programada: despachoRes.data.fecha_programada,
          fecha_salida_real: formatDateForInput(despachoRes.data.fecha_salida_real),
          id_camion: despachoRes.data.id_camion,
          id_conductor: despachoRes.data.id_conductor,
          id_ruta: despachoRes.data.id_ruta,
          estado_despacho: despachoRes.data.estado_despacho
        });

        setLoading(false);
      } catch (err) {
        if (err.response && err.response.status === 401) {
          logoutUser();
        } else {
          console.error("Error al buscar la información:", err);
          setError("No se pudo cargar la información necesaria.");
        }
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({ ...prevData, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const dataToSubmit = {
      ...formData,
      id_camion: formData.id_camion ? parseInt(formData.id_camion) : null,
      id_conductor: formData.id_conductor ? parseInt(formData.id_conductor) : null,
      id_ruta: formData.id_ruta ? parseInt(formData.id_ruta) : null,
      fecha_salida_real: formData.fecha_salida_real || null
    };

    try {
      await apiClient.put(`/api/inventario/despachos/${id}/`, dataToSubmit);
      setSubmitting(false);
      navigate(`/despachos/${id}`);
    } catch (err) {
      if (err.response?.data) {
        const serverErrors = err.response.data;
        if (serverErrors.id_camion) {
          setError(serverErrors.id_camion[0]);
        } else {
          const firstError = Object.values(serverErrors)[0];
          setError(Array.isArray(firstError) ? firstError[0] : "Error en los datos enviados.");
        }
      } else {
        setError('Error al crear el despacho. Intente nuevamente.');
      }
      setSubmitting(false);
    }
  };

  const UBICACIONES = [
    'Santiago',
    'Iquique',
    'Antofagasta',
    'Calama',
    'Copiapó',
    'Tocopilla',
    'Mejillones'
  ];

  // --- RENDERIZADO ---

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-500">
        <Loader2 className="w-10 h-10 animate-spin mb-4 text-indigo-600" />
        <p>Cargando datos de edición...</p>
      </div>
    );
  }

  if (!formData && !loading) {
    return <div className="p-8 text-center text-gray-500">No se encontraron datos para editar.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Editar Despacho #{id}</h1>
            <p className="mt-2 text-sm text-gray-600">Modifica la planificación, ruta o recursos asignados al viaje.</p>
          </div>
          <Link to={`/despachos/${id}`} className="hidden sm:flex items-center gap-2 text-gray-500 hover:text-gray-700 transition">
            <ArrowLeft className="w-4 h-4" /> Cancelar
          </Link>
        </div>

        {/* Formulario */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 m-6 mb-0 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-red-800">Error de actualización</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-8">

            {/* SECCIÓN 1: PLANIFICACIÓN */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
                <Calendar className="w-5 h-5 text-indigo-600" />
                Planificación y Tiempos
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="fecha_programada" className="block text-sm font-medium text-gray-700 mb-1">Fecha Programada</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input
                      type="date"
                      id="fecha_programada"
                      name="fecha_programada"
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"
                      value={formData.fecha_programada}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="fecha_salida_real" className="block text-sm font-medium text-gray-700 mb-1">Salida Real</label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input
                      type="datetime-local"
                      name="fecha_salida_real"
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={formData.fecha_salida_real}
                      onChange={handleChange}
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">Dejar vacío si aún no ha salido.</p>
                </div>
              </div>
            </div>

            {/* SECCIÓN 2: RUTA Y ESTADO */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
                <Map className="w-5 h-5 text-indigo-600" />
                Ruta y Estado
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="id_ruta" className="block text-sm font-medium text-gray-700 mb-1">Ruta Asignada</label>
                  <div className="relative">
                    <Map className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <select
                      id="id_ruta"
                      name="id_ruta"
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"
                      value={formData.id_ruta}
                      onChange={handleChange}
                      required
                    >
                      <option value="">Seleccionar ruta...</option>
                      {rutas.map(r => (
                        <option key={r.id_ruta} value={r.id_ruta}>{r.nombre_ruta}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="estado_despacho" className="block text-sm font-medium text-gray-700 mb-1">Estado del Viaje</label>
                  <div className="relative">
                    <Activity className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <select
                      id="estado_despacho"
                      name="estado_despacho"
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"
                      value={formData.estado_despacho}
                      onChange={handleChange}
                    >
                      <option value="Programado">Programado</option>
                      <option value="En Carga">En Carga</option>
                      <option value="En Tránsito">En Tránsito</option>
                      <option value="Finalizado">Finalizado</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Ciudad de Origen
                  </label>
                  <select
                    name="origen"
                    value={formData.origen || ''}
                    onChange={handleChange}
                    required
                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  >
                    <option value="" disabled>Seleccione el origen...</option>
                    {UBICACIONES.map((ciudad) => (
                      <option key={`origen-${ciudad}`} value={ciudad}>
                        {ciudad}
                      </option>
                    ))}
                  </select>
                </div>

                {/* --- CAMPO DESTINO --- */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Ciudad de Destino
                  </label>
                  <select
                    name="destino"
                    value={formData.destino || ''}
                    onChange={handleChange}
                    required
                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  >
                    <option value="" disabled>Seleccione el destino...</option>
                    {UBICACIONES.map((ciudad) => (
                      <option key={`destino-${ciudad}`} value={ciudad}>
                        {ciudad}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* SECCIÓN 3: RECURSOS */}
            <div className="bg-indigo-50 p-6 rounded-lg border border-indigo-100">
              <h3 className="text-lg font-semibold text-indigo-800 mb-4 flex items-center gap-2 border-b border-indigo-200 pb-2">
                <Truck className="w-5 h-5" />
                Recursos de Transporte
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="id_camion" className="block text-sm font-medium text-gray-700 mb-1">Camión</label>
                  <div className="relative">
                    <Truck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <select
                      id="id_camion"
                      name="id_camion"
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"
                      value={formData.id_camion}
                      onChange={handleChange}
                      required
                    >
                      <option value="">Seleccionar camión...</option>
                      {camiones.map(c => (
                        <option key={c.id_camion} value={c.id_camion}>{c.patente} ({c.marca})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="id_conductor" className="block text-sm font-medium text-gray-700 mb-1">Conductor</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <select
                      id="id_conductor"
                      name="id_conductor"
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"
                      value={formData.id_conductor}
                      onChange={handleChange}
                      required
                    >
                      <option value="">Seleccionar conductor...</option>
                      {conductores.map(c => (
                        <option key={c.id_conductor} value={c.id_conductor}>{c.nombre_completo}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Acciones */}
            <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-100">
              <Link
                to={`/despachos/${id}`}
                className="px-6 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition focus:ring-2 focus:ring-gray-200"
              >
                Cancelar
              </Link>

              <button
                type="submit"
                disabled={submitting}
                className={`flex items-center gap-2 px-8 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-200 transition shadow-md ${submitting ? 'opacity-75 cursor-not-allowed' : ''}`}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Guardando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" /> Actualizar Despacho
                  </>
                )}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}