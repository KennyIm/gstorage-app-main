import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom'; // Descomentar en producción
import apiClient from '../services/api'; // Descomentar en producción
import { useAuth } from '../context/AuthContext'; // Descomentar en producción
import {
  Save, ArrowLeft, User, MapPin, Map, Package, Scale, Box, FileText,
  Truck, Activity, Loader2, AlertCircle, CheckCircle,NotebookPen
} from 'lucide-react';


export default function MercanciaEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { logoutUser } = useAuth();

  // Estado para el formulario
  const [formData, setFormData] = useState(null);
  const [precioSugerido, setPrecioSugerido] = useState(null);

  // Estados para los menús desplegables
  const [clientes, setClientes] = useState([]);
  const [destinos, setDestinos] = useState([]);
  const [ubicaciones, setUbicaciones] = useState([]);
  const [despachos, setDespachos] = useState([]);
  const [proveedores, setProveedores] = useState([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (formData && formData.id_cliente && formData.kg && formData.m3 && (!formData.precio_total || parseFloat(formData.precio_total) === 0)) {
      const clienteSeleccionado = clientes.find(c => String(c.id_cliente) === String(formData.id_cliente));

      if (clienteSeleccionado) {
        const pesoLimpio = String(formData.kg).replace(',', '.');
        const volumenLimpio = String(formData.m3).replace(',', '.');

        const peso = parseFloat(pesoLimpio) || 0;
        const volumen = parseFloat(volumenLimpio) || 0;

        const precioKg = parseFloat(clienteSeleccionado.precio_kg) || 0;
        const precioM3 = parseFloat(clienteSeleccionado.precio_m3) || 0;

        const costoPorPeso = peso * precioKg;
        const costoPorVolumen = volumen * precioM3;

        const totalCalculado = Math.max(costoPorPeso, costoPorVolumen);

        setPrecioSugerido(totalCalculado.toFixed(0));
        setFormData(prev => ({
          ...prev,
          precio_total: totalCalculado.toFixed(0)
        }));
      }
    }
  }, [formData?.kg, formData?.m3, formData?.id_cliente, formData?.precio_total, clientes]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [clientesRes, destinosRes, ubicacionesRes, despachosRes, provRes] = await Promise.all([
          apiClient.get('/api/inventario/clientes/'),
          apiClient.get('/api/inventario/destinos/'),
          apiClient.get('/api/inventario/ubicaciones/'),
          apiClient.get('/api/inventario/despachos/'),
          apiClient.get('/api/inventario/proveedores/')
        ]);
        const mercanciaRes = await apiClient.get(`/api/inventario/mercancias/${id}/`);
        const currentData = mercanciaRes.data;

        const ubicacionesFiltradas = ubicacionesRes.data.filter(u =>
          !u.estado_ocupado || u.id_ubicacion === currentData.id_ubicacion_actual
        );

        setClientes(clientesRes.data);
        setDestinos(destinosRes.data);
        setUbicaciones(ubicacionesFiltradas);
        setDespachos(despachosRes.data);
        setProveedores(provRes.data);

        setFormData({
          id_cliente: currentData.id_cliente,
          id_destino: currentData.id_destino,
          id_ubicacion_actual: currentData.id_ubicacion_actual,
          cantidad_bultos: currentData.cantidad_bultos,
          kg: currentData.kg || '',
          m3: currentData.m3 || '',
          precio_total: currentData.precio_total || '',
          descripcion_carga: currentData.descripcion_carga || '',
          estado: currentData.estado,
          id_despacho: currentData.id_despacho || '',
          id_proveedor: currentData.id_proveedor || '',
          factura: currentData.factura || '',
          tipo: currentData.tipo || '',
          paga_proveedor: currentData.paga_proveedor || false,
          codigo_interno: currentData.codigo_interno || ''
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
    const { name, value, type, checked } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const dataToSubmit = {
      ...formData,
      // Sanitización de datos
      id_cliente: formData.id_cliente ? parseInt(formData.id_cliente) : null,
      id_destino: formData.id_destino ? parseInt(formData.id_destino) : null,
      id_ubicacion_actual: formData.id_ubicacion_actual ? parseInt(formData.id_ubicacion_actual) : null,
      cantidad_bultos: parseInt(formData.cantidad_bultos) || 0,
      kg: formData.kg ? parseFloat(formData.kg) : null,
      m3: formData.m3 ? parseFloat(formData.m3) : null,
      precio_total: formData.precio_total ? parseFloat(formData.precio_total) : 0,
      id_despacho: formData.id_despacho ? parseInt(formData.id_despacho) : null,
      id_proveedor: formData.id_proveedor || null,
      factura: formData.factura || null,
      tipo: formData.tipo || null,
      paga_proveedor: formData.paga_proveedor || false,
      codigo_interno: formData.codigo_interno || null
    };

    try {
      await apiClient.put(`/api/inventario/mercancias/${id}/`, dataToSubmit);
      setSubmitting(false);
      navigate(`/mercancias/${id}`);
    } catch (err) {
      console.error(err);
      setError('Error al actualizar la mercancía. Por favor revisa los datos.');
      setSubmitting(false);
      console.log("Motivo del rechazo de Django:", err.response?.data);
    }
  };

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
            <h1 className="text-3xl font-bold text-gray-900">Editar Mercancía #{id}</h1>
            <p className="mt-2 text-sm text-gray-600">Modifica los detalles de la carga o actualiza su estado logístico.</p>
          </div>
          <Link to={`/mercancias/${id}`} className="hidden sm:flex items-center gap-2 text-gray-500 hover:text-gray-700 transition">
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

            {/* SECCIÓN 1: DATOS GENERALES */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
                <User className="w-5 h-5 text-indigo-600" />
                Asignación
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="id_cliente" className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-400 pointer-events-none" />
                    <select
                      name="id_cliente"
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"
                      value={formData.id_cliente}
                      onChange={handleChange}
                      required
                    >
                      <option value="">Seleccionar cliente...</option>
                      {clientes.map(c => (
                        <option key={c.id_cliente} value={c.id_cliente}>{c.nombre_cliente}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="id_destino" className="block text-sm font-medium text-gray-700 mb-1">Destino</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-400 pointer-events-none" />
                    <select
                      name="id_destino"
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"
                      value={formData.id_destino}
                      onChange={handleChange}
                      required
                    >
                      <option value="">Seleccionar destino...</option>
                      {destinos.map(d => (
                        <option key={d.id_destino} value={d.id_destino}>{d.nombre_ciudad}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="mt-6">
                  <label htmlFor="id_proveedor" className="block text-sm font-medium text-gray-700 mb-1">
                    Proveedor
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400 pointer-events-none" />
                    <select
                      name="id_proveedor"
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition appearance-none cursor-pointer"
                      value={formData.id_proveedor}
                      onChange={handleChange}
                    >
                      <option value="">Selecciona un proveedor...</option>
                      {proveedores.map(p => (
                        <option key={p.rut} value={p.rut}>{p.nombre_proveedor} (RUT: {p.rut})</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* SECCIÓN 2: ALMACENAMIENTO 
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
                <Map className="w-5 h-5 text-indigo-600" />
                Ubicación
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-1">
                  <label htmlFor="id_ubicacion_actual" className="block text-sm font-medium text-gray-700 mb-1">Ubicación Actual</label>
                  <div className="relative">
                    <Box className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <select
                      name="id_ubicacion_actual"
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"
                      value={formData.id_ubicacion_actual}
                      onChange={handleChange}
                      required
                    >
                      <option value="">Seleccionar ubicación...</option>
                      {ubicaciones.map(u => (
                        <option key={u.id_ubicacion} value={u.id_ubicacion}>
                          {u.codigo_ubicacion} {u.id_ubicacion === formData.id_ubicacion_actual ? '(Actual)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">Mostrando solo ubicaciones libres y la actual.</p>
                </div>
              </div>
            </div>*/}

            {/* SECCIÓN 3: DETALLES DE CARGA */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
                <Package className="w-5 h-5 text-indigo-600" />
                Detalles de Carga
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    N° de Factura
                  </label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-700 pointer-events-none" />
                    <input
                      type="text"
                      name="factura"
                      value={formData.factura}
                      onChange={handleChange}
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"
                      placeholder="Ej: 10293"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de carga
                  </label>
                  <div className="relative">
                    <NotebookPen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-700 pointer-events-none" />
                    <input
                      type="text"
                      name="tipo"
                      value={formData.tipo}
                      onChange={handleChange}
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"
                      placeholder="Ej: Perfil"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bultos</label>
                  <div className="relative">
                    <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400 pointer-events-none" />
                    <input
                      type="number"
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Peso (Kg)</label>
                  <div className="relative">
                    <Scale className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400 pointer-events-none" />
                    <input
                      type="number"
                      name="kg"
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"
                      value={formData.kg}
                      onChange={handleChange}
                      step="0.01"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Volumen (m³)</label>
                  <div className="relative">
                    <Box className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400 pointer-events-none" />
                    <input
                      type="number"
                      name="m3"
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"
                      value={formData.m3}
                      onChange={handleChange}
                      step="0.01"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Volumen (m³)</label>
                  <div className="relative">
                    <NotebookPen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-900 pointer-events-none" />
                    <input
                      type="text"
                      name="codigo_interno"
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"
                      value={formData.codigo_interno}
                      onChange={handleChange}
                      placeholder="Código Interno de Bodega"
                    />
                  </div>
                </div>
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-bold text-emerald-700 mb-1">
                    Precio Total ($)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600 font-bold">$</span>
                    <input
                      type="number"
                      step="1"
                      name="precio_total"
                      value={formData.precio_total}
                      onChange={handleChange}
                      className="w-full pl-8 pr-4 py-2 bg-emerald-50 border border-emerald-300 text-emerald-800 font-bold rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition-colors"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="checkbox"
                    name="paga_proveedor"
                    checked={formData.paga_proveedor}
                    onChange={handleChange}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <label htmlFor="paga_proveedor" className="text-sm font-semibold text-slate-700">
                    El cobro de este bulto lo paga el Proveedor
                  </label>
                </div>
              </div>

              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                  <textarea
                    name="descripcion_carga"
                    rows={3}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition resize-none"
                    value={formData.descripcion_carga}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            {/* SECCIÓN 4: ESTADO Y DESPACHO */}
            <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-100">
              <h3 className="text-lg font-semibold text-yellow-800 mb-4 flex items-center gap-2 border-b border-yellow-200 pb-2">
                <Activity className="w-5 h-5" />
                Estado y Logística
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estado Actual</label>
                  <div className="relative">
                    <CheckCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <select
                      name="estado"
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"
                      value={formData.estado || ''} 
                      onChange={handleChange}
                    >
                      <option value="" disabled hidden>Seleccione estado...</option>
                      
                      <option value="En Bodega">En Bodega</option>
                      <option value="Asignado">Asignado a Despacho</option>
                      <option value="En Tránsito">En Tránsito</option>
                      <option value="Entregado">Entregado</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Despacho Asignado</label>
                  <div className="relative">
                    <Truck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <select
                      name="id_despacho"
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"
                      value={formData.id_despacho}
                      onChange={handleChange}
                    >
                      <option value="">(Ninguno / Pendiente)</option>
                      {despachos.map(d => (
                        <option key={d.id_despacho} value={d.id_despacho}>
                          Despacho #{d.id_despacho} ({d.fecha_programada})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Acciones */}
            <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-100">
              <Link
                to={`/mercancias/${id}`}
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
                    <Save className="w-4 h-4" /> Actualizar Mercancía
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