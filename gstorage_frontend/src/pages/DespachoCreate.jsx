import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import apiClient from '../services/api';
import { useAuth } from '../context/AuthContext';
import Select from 'react-select';
import {
  Save, ArrowLeft, Calendar, Truck, User, Map,
  Activity, Loader2, AlertCircle, CheckCircle, PencilRuler
} from 'lucide-react';

export default function DespachoCreate() {
  document.title = "Creación de Despachos";
  const [formData, setFormData] = useState({
    fecha_programada: '',
    id_camion: '',
    id_rampla: '',
    id_conductor: '',
    id_ruta: '',
    estado_despacho: 'Programado',
    origen: '',
    destino: '',
  });

  const [camiones, setCamiones] = useState([]);
  const [conductores, setConductores] = useState([]);
  const [rutas, setRutas] = useState([]);
  const [ramplas, setRamplas] = useState([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const navigate = useNavigate();
  const { logoutUser } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [camionesRes, conductoresRes, rutasRes, ramplasRes] = await Promise.all([
          apiClient.get('/api/inventario/camiones/'),
          apiClient.get('/api/inventario/conductores/'),
          apiClient.get('/api/inventario/rutas/'),
          apiClient.get('/api/inventario/ramplas/')
        ]);

        setCamiones(camionesRes.data);
        setConductores(conductoresRes.data);
        setRutas(rutasRes.data);
        setRamplas(ramplasRes.data);
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
  }, []);

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
      id_rampla: formData.id_rampla ? parseInt(formData.id_rampla) : null,
      id_ruta: formData.id_ruta ? parseInt(formData.id_ruta) : null,
    };

    try {
      await apiClient.post('/api/inventario/despachos/', dataToSubmit);
      setSubmitting(false);
      navigate('/despachos');
    } catch (err) {
      console.error(err);

      // --- MANEJO DE ERRORES ---
      if (err.response?.data) {
        const serverErrors = err.response.data;
        if (serverErrors.id_camion) {
          setError(serverErrors.id_camion[0]);
        } else if (serverErrors.id_conductor) {
          setError(serverErrors.id_conductor[0]);
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

  // --- RENDERIZADO ---

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-500">
        <Loader2 className="w-10 h-10 animate-spin mb-4 text-indigo-600" />
        <p>Cargando formulario...</p>
      </div>
    );
  }
  const UBICACIONES = [
    'Santiago',
    'Iquique',
    'Antofagasta',
    'Calama',
    'Copiapo',
    'Tocopilla',
    'Mejillones'
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Crear Nuevo Despacho</h1>
            <p className="mt-2 text-sm text-gray-600">Planifica un nuevo viaje asignando ruta y recursos.</p>
          </div>
          <Link to="/despachos" className="hidden sm:flex items-center gap-2 text-gray-500 hover:text-gray-700 transition">
            <ArrowLeft className="w-4 h-4" /> Volver al listado
          </Link>
        </div>

        {/* Formulario */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 m-6 mb-0 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-red-800">Error de creación</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-8">

            {/* SECCIÓN 1: PLANIFICACIÓN */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
                <Calendar className="w-5 h-5 text-indigo-600" />
                Planificación
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="fecha_programada" className="block text-sm font-medium text-gray-700 mb-1">Fecha Programada *</label>
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
                  <label htmlFor="estado_despacho" className="block text-sm font-medium text-gray-700 mb-1">Estado Inicial</label>
                  <div className="relative">
                    <Activity className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <select
                      id="estado_despacho"
                      name="estado_despacho"
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition cursor-not-allowed opacity-75"
                      value={formData.estado_despacho}
                      onChange={handleChange}
                      disabled
                    >
                      <option value="Programado">Programado</option>
                      <option value="En Carga">En Carga</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* SECCIÓN 2: RUTA */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
                <Map className="w-5 h-5 text-indigo-600" />
                Ruta
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2 relative z-40">
                  <label htmlFor="id_ruta" className="block text-sm font-medium text-gray-700 mb-1">Ruta Asignada *</label>
                  <div className="relative">
                    <div>
                      <Select
                        inputId="id_ruta"
                        placeholder="Seleccionar ruta..."
                        noOptionsMessage={() => "No se encontró la ruta"}
                        options={rutas.map(r => ({
                          value: r.id_ruta,
                          label: r.nombre_ruta
                        }))}
                        value={rutas.find(r => r.id_ruta === formData.id_ruta) ? {
                          value: formData.id_ruta,
                          label: rutas.find(r => r.id_ruta === formData.id_ruta).nombre_ruta
                        } : null}
                        onChange={(opcion) => {
                          handleChange({
                            target: { name: 'id_ruta', value: opcion ? opcion.value : '' }
                          });
                        }}
                        isClearable
                      />
                    </div>
                  </div>
                </div>
                <div className="relative z-30">
                  <label htmlFor="origen" className="block text-sm font-semibold text-slate-700 mb-1">
                    Ciudad de Origen
                  </label>
                  <Select
                    inputId="origen"
                    placeholder="Seleccione el origen..."
                    options={UBICACIONES.map(ciudad => ({
                      value: ciudad,
                      label: ciudad
                    }))}
                    value={formData.origen ? { value: formData.origen, label: formData.origen } : null}
                    onChange={(opcion) => {
                      handleChange({
                        target: { name: 'origen', value: opcion ? opcion.value : '' }
                      });
                    }}
                    isClearable
                  />
                </div>

                {/* --- CAMPO DESTINO --- */}
                <div className="relative z-30">
                  <label htmlFor="destino" className="block text-sm font-semibold text-slate-700 mb-1">
                    Ciudad de Destino
                  </label>
                  <Select
                    inputId="destino"
                    placeholder="Seleccione el destino..."
                    options={UBICACIONES.map(ciudad => ({
                      value: ciudad,
                      label: ciudad
                    }))}
                    value={formData.destino ? { value: formData.destino, label: formData.destino } : null}
                    onChange={(opcion) => {
                      handleChange({
                        target: { name: 'destino', value: opcion ? opcion.value : '' }
                      });
                    }}
                    isClearable
                  />
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
                  {/* --- SELECTOR CAMIÓN --- */}
                  <div className="relative z-20">
                    <label htmlFor="id_camion" className="block text-sm font-medium text-gray-700 mb-1">Camión *</label>
                    <div className="relative">
                      <div className="">
                        <Select
                          inputId="id_camion"
                          placeholder="Seleccionar camión..."
                          noOptionsMessage={() => "No se encontró el camión"}
                          options={camiones.map(c => ({
                            value: c.id_camion,
                            label: `${c.patente} (${c.marca})`
                          }))}
                          value={camiones.find(c => c.id_camion === formData.id_camion) ? {
                            value: formData.id_camion,
                            label: (() => {
                              const c = camiones.find(cam => cam.id_camion === formData.id_camion);
                              return `${c.patente} (${c.marca})`;
                            })()
                          } : null}
                          onChange={(opcion) => {
                            handleChange({
                              target: { name: 'id_camion', value: opcion ? opcion.value : '' }
                            });
                          }}
                          isClearable
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* --- SELECTOR RAMPLA --- */}
                  <div className="relative z-20">
                    <label htmlFor="id_rampla" className="block text-sm font-medium text-gray-700 mb-1">Rampla *</label>
                    <div className="relative">
                      <div className="">
                        <Select
                          inputId="id_rampla"
                          placeholder="Seleccionar rampla..."
                          noOptionsMessage={() => "No se encontró la rampla"}
                          options={ramplas.map(r => ({
                            value: r.id_rampla,
                            label: `${r.patente} (${r.modelo})`
                          }))}
                          value={ramplas.find(r => r.id_rampla === formData.id_rampla) ? {
                            value: formData.id_rampla,
                            label: (() => {
                              const r = ramplas.find(ram => ram.id_rampla === formData.id_rampla);
                              return `${r.patente} (${r.modelo})`;
                            })()
                          } : null}
                          onChange={(opcion) => {
                            handleChange({
                              target: { name: 'id_rampla', value: opcion ? opcion.value : '' }
                            });
                          }}
                          isClearable
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* --- SELECTOR CONDUCTOR --- */}
                  <div className="relative z-10">
                    <label htmlFor="id_conductor" className="block text-sm font-medium text-gray-700 mb-1">Conductor *</label>
                    <div className="relative">
                      <div className="">
                        <Select
                          inputId="id_conductor"
                          placeholder="Seleccionar conductor..."
                          noOptionsMessage={() => "No se encontró el conductor"}
                          options={conductores.map(c => ({
                            value: c.id_conductor,
                            label: c.nombre_completo
                          }))}
                          value={conductores.find(c => c.id_conductor === formData.id_conductor) ? {
                            value: formData.id_conductor,
                            label: conductores.find(c => c.id_conductor === formData.id_conductor).nombre_completo
                          } : null}
                          onChange={(opcion) => {
                            handleChange({
                              target: { name: 'id_conductor', value: opcion ? opcion.value : '' }
                            });
                          }}
                          isClearable
                          required
                        />
                      </div>
                    </div>
                  </div>
              </div>
            </div>

            {/* Acciones */}
            <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-100">
              <Link
                to="/despachos"
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
                    <Save className="w-4 h-4" /> Crear Despacho
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