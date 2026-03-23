import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom'; // Descomentar en producción
import apiClient from '../services/api'; // Descomentar en producción
import { useAuth } from '../context/AuthContext'; // Descomentar en producción
import {
  Save, X, User, MapPin, Map, Package, Scale, Box, FileText, AlertCircle, Loader2, ArrowLeft
} from 'lucide-react';



export default function MercanciaCreate() {
  const [formData, setFormData] = useState({
    id_cliente: '',
    id_destino: '',
    id_ubicacion_actual: '',
    cantidad_bultos: 1,
    kg: '',
    m3: '',
    precio_total: '',
    descripcion_carga: ''
  });

  const { logoutUser } = useAuth();

  const [clientes, setClientes] = useState([]);
  const [destinos, setDestinos] = useState([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    apiClient.get('/api/inventario/clientes/')
      .then(res => setClientes(res.data))
      .catch(err => console.error(err));
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Solo pedimos Clientes y Destinos. ¡Mucho más rápido!
        const [clientesRes, destinosRes] = await Promise.all([
          apiClient.get('/api/inventario/clientes/'),
          apiClient.get('/api/inventario/destinos/')
        ]);

        setClientes(clientesRes.data);
        setDestinos(destinosRes.data);
        setLoading(false);
      } catch (err) {
        if (err.response && err.response.status === 401) {
          logoutUser();
        } else {
          console.error("Error al buscar la información:", err);
          setError("No se pudo cargar la información necesaria para el formulario.");
        }
        setLoading(false);
      }
    };
    
    fetchData();
  }, [logoutUser]);

  // --- CÁLCULO DE PRECIO EN VIVO (Modo Detective) ---
  useEffect(() => {
    if (formData.id_cliente && formData.kg && formData.m3) {
      
      console.log("1. Buscando al cliente con ID:", formData.id_cliente);
      console.log("2. Lista de clientes disponibles:", clientes);

      const clienteSeleccionado = clientes.find(c => String(c.id_cliente) === String(formData.id_cliente));

      console.log("3. Resultado de la búsqueda:", clienteSeleccionado);

      if (clienteSeleccionado) {
        const pesoLimpio = String(formData.kg).replace(',', '.');
        const volumenLimpio = String(formData.m3).replace(',', '.');

        const peso = parseFloat(pesoLimpio) || 0;
        const volumen = parseFloat(volumenLimpio) || 0;
        
        const precioKg = parseFloat(clienteSeleccionado.precio_kg) || 0;
        const precioM3 = parseFloat(clienteSeleccionado.precio_m3) || 0;

        console.log(`4. MATEMÁTICA: (${peso} kg * $${precioKg}) + (${volumen} m3 * $${precioM3})`);

        const totalCalculado = (peso * precioKg) + (volumen * precioM3);

        setFormData(prev => ({
          ...prev,
          precio_total: totalCalculado.toFixed(2)
        }));
      } else {
        console.warn("⚠️ ERROR: No pude encontrar al cliente.");
      }
    }
  }, [formData.kg, formData.m3, formData.id_cliente, clientes]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const payload = {
      ...formData,
      id_cliente: formData.id_cliente ? parseInt(formData.id_cliente.toString()) : null,
      id_destino: formData.id_destino ? parseInt(formData.id_destino.toString()) : null,
      id_ubicacion_actual: null, 
      
      cantidad_bultos: parseInt(formData.cantidad_bultos?.toString()) || 1,
      kg: formData.kg ? parseFloat(formData.kg.toString()) : 0,
      m3: formData.m3 ? parseFloat(formData.m3.toString()) : 0,
      
      precio_total: formData.precio_total ? parseFloat(formData.precio_total.toString()) : 0,
    };

    try {
      await apiClient.post('/api/inventario/mercancias/', payload);
      setSubmitting(false);
      navigate('/mercancias'); 
    } catch (err) {
      console.error(err);
      setError('Error al guardar la mercancía. Revisa los campos e intenta nuevamente.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-500">
        <Loader2 className="w-10 h-10 animate-spin mb-4 text-indigo-600" />
        <p>Cargando formulario de registro...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto">

        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Registrar Mercancía</h1>
            <p className="mt-2 text-sm text-gray-600">Ingresa los detalles de la nueva carga para ingresarla al inventario.</p>
          </div>
          <Link to="/mercancias" className="hidden sm:flex items-center gap-2 text-gray-500 hover:text-gray-700 transition">
            <ArrowLeft className="w-4 h-4" /> Volver al listado
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 m-6 mb-0 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-red-800">Error en el registro</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-8">

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
                <User className="w-5 h-5 text-indigo-600" />
                Asignación y Destino
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="relative">
                  <label htmlFor="id_cliente" className="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <select
                      id="id_cliente"
                      name="id_cliente"
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition appearance-none cursor-pointer"
                      value={formData.id_cliente}
                      onChange={handleChange}
                      required
                    >
                      <option value="">Selecciona un cliente...</option>
                      {clientes.map(c => (
                        <option key={c.id_cliente} value={c.id_cliente}>{c.nombre_cliente}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="relative">
                  <label htmlFor="id_destino" className="block text-sm font-medium text-gray-700 mb-1">Destino *</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <select
                      id="id_destino"
                      name="id_destino"
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition appearance-none cursor-pointer"
                      value={formData.id_destino}
                      onChange={handleChange}
                      required
                    >
                      <option value="">Selecciona un destino...</option>
                      {destinos.map(d => (
                        <option key={d.id_destino} value={d.id_destino}>{d.nombre_ciudad}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
                <Package className="w-5 h-5 text-indigo-600" />
                Detalles de Carga
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div>
                  <label htmlFor="cantidad_bultos" className="block text-sm font-medium text-gray-700 mb-1">Cantidad Bultos *</label>
                  <div className="relative">
                    <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input
                      type="number"
                      id="cantidad_bultos"
                      name="cantidad_bultos"
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"
                      value={formData.cantidad_bultos}
                      onChange={handleChange}
                      min="1"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="kg" className="block text-sm font-medium text-gray-700 mb-1">Peso Total (Kg)</label>
                  <div className="relative">
                    <Scale className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input
                      type="number"
                      id="kg"
                      name="kg"
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"
                      value={formData.kg}
                      onChange={handleChange}
                      step="0.01"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="m3" className="block text-sm font-medium text-gray-700 mb-1">Volumen (m³)</label>
                  <div className="relative">
                    <Box className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input
                      type="number"
                      id="m3"
                      name="m3"
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"
                      value={formData.m3}
                      onChange={handleChange}
                      step="0.01"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                {/* PRECIO TOTAL */}
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-bold text-emerald-700 mb-1">
                    Precio Total Calculado ($)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600 font-bold">$</span>
                    <input
                      type="number"
                      step="0.01"
                      name="precio_total"
                      value={formData.precio_total}
                      onChange={(e) => setFormData({ ...formData, precio_total: e.target.value })}
                      className="w-full pl-8 pr-4 py-2 bg-emerald-50 border border-emerald-300 text-emerald-800 font-bold rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition-colors"
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500 italic">
                    * Se calcula automáticamente según las tarifas del cliente, pero puedes editarlo manualmente.
                  </p>
                </div>
              </div>

              <div className="mt-6">
                <label htmlFor="descripcion_carga" className="block text-sm font-medium text-gray-700 mb-1">Descripción / Notas Adicionales</label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                  <textarea
                    id="descripcion_carga"
                    name="descripcion_carga"
                    rows={4}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition resize-none"
                    value={formData.descripcion_carga}
                    onChange={handleChange}
                    placeholder="Detalles sobre el contenido, fragilidad, instrucciones de manejo..."
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-100">
              <Link
                to="/mercancias"
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
                    <Save className="w-4 h-4" /> Guardar Mercancía
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