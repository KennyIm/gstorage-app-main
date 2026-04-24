import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import apiClient from '../services/api';
import { useAuth } from '../context/AuthContext';
import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';
import { useUI } from '../context/UIContext';
import {
  Save, ArrowLeft, User, MapPin, Map, Package, Scale, Box, FileText,
  Truck, Activity, Loader2, AlertCircle, CheckCircle, NotebookPen,
  Calculator, Info
} from 'lucide-react';

export default function MercanciaEdit() {
  document.title = "Edición de Mercancia";
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, logoutUser } = useAuth();

  const [formData, setFormData] = useState(null);

  const [clientes, setClientes] = useState([]);
  const [destinos, setDestinos] = useState([]);
  const [ubicaciones, setUbicaciones] = useState([]);
  const [despachos, setDespachos] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [sucursales, setSucursales] = useState([]);

  const [mercanciaOriginal, setMercanciaOriginal] = useState(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { showLoader, hideLoader, showToast } = useUI();
  const [direccionesSugeridas, setDireccionesSugeridas] = useState([]);

  // --- LÓGICA DE CÁLCULO DE PRECIO ---
  const calcularPrecioLogica = () => {
    if (!formData || !formData.id_cliente) return null;

    const clienteSeleccionado = clientes.find(c => String(c.id_cliente) === String(formData.id_cliente));
    if (!clienteSeleccionado) return null;

    const peso = parseFloat(String(formData.kg).replace(',', '.')) || 0;
    const volumen = parseFloat(String(formData.m3).replace(',', '.')) || 0;
    const precioKg = parseFloat(clienteSeleccionado.precio_kg) || 0;
    const precioM3 = parseFloat(clienteSeleccionado.precio_m3) || 0;

    return Math.max(peso * precioKg, volumen * precioM3).toFixed(0);
  };

  const handleRecalculate = (e) => {
    e.preventDefault();
    const nuevoTotal = calcularPrecioLogica();
    if (nuevoTotal !== null) {
      setFormData(prev => ({ ...prev, precio_total: nuevoTotal }));
    }
  };

  useEffect(() => {
    if (formData && formData.id_cliente && (formData.kg || formData.m3)) {
      const valorActual = parseFloat(formData.precio_total);

      if (!formData.precio_total || valorActual === 0 || isNaN(valorActual)) {
        const sugerido = calcularPrecioLogica();
        if (sugerido) {
          setFormData(prev => ({ ...prev, precio_total: sugerido }));
        }
      }
    }
  }, [formData?.kg, formData?.m3, formData?.id_cliente, clientes]);

  const cargarDireccionesDelCliente = async (clienteId) => {
    if (!clienteId) {
      setDireccionesSugeridas([]);
      return;
    }
    try {
      const response = await apiClient.get(`/api/inventario/clientes/${clienteId}/direcciones/`);
      const suggestions = response.data.map(dir => ({
        label: String(dir),
        value: String(dir)
      }));
      setDireccionesSugeridas(suggestions);
    } catch (err) {
      console.error("Error cargando direcciones en edición", err);
      setDireccionesSugeridas([]);
    }
  };


  // --- CARGA DE DATOS ---
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [mercanciaoriginalRes, clientesRes, destinosRes, ubicacionesRes, despachosRes, provRes, sucursalesRes] = await Promise.all([
          apiClient.get(`/api/inventario/mercancias/${id}/`),
          apiClient.get('/api/inventario/clientes/'),
          apiClient.get('/api/inventario/destinos/'),
          apiClient.get('/api/inventario/ubicaciones/'),
          apiClient.get('/api/inventario/despachos/'),
          apiClient.get('/api/inventario/proveedores/'),
          apiClient.get('/api/usuarios/sucursales/')
        ]);
        const mercanciaRes = await apiClient.get(`/api/inventario/mercancias/${id}/`);
        const currentData = mercanciaRes.data;


        const ubicacionesFiltradas = ubicacionesRes.data.filter(u =>
          !u.estado_ocupado || u.id_ubicacion === currentData.id_ubicacion_actual
        );

        setMercanciaOriginal(mercanciaoriginalRes.data);
        setClientes(clientesRes.data);
        setDestinos(destinosRes.data);
        setUbicaciones(ubicacionesFiltradas);
        setDespachos(despachosRes.data);
        setProveedores(provRes.data);
        setSucursales(sucursalesRes.data);

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
          codigo_interno: currentData.codigo_interno || '',
          direccion_entrega: currentData.direccion_entrega || ''
        });
        if (currentData.id_cliente) {
          cargarDireccionesDelCliente(currentData.id_cliente);
        }
      } catch (err) {
        if (err.response && err.response.status === 401) {
          showToast('Credenciales de autenticación no válidas, por favor ingrese de nuevo.', 'error');
          logoutUser();
        } else {
          console.error("Error al buscar la información:", err);
          showToast('No se pudo cargar la información necesaria.', 'error');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, logoutUser, showToast]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    showLoader();

    const dataToSubmit = {
      ...formData,
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
      codigo_interno: formData.codigo_interno || null,
      direccion_entrega: formData.direccion_entrega || null
    };

    try {
      await apiClient.put(`/api/inventario/mercancias/${id}/`, dataToSubmit);
      showToast('Mercancía actualizada exitosamente.', 'success');
      navigate(`/mercancias/${id}`);
    } catch (err) {
      console.error(err);
      showToast('Error al actualizar la mercancía. Por favor revisa los datos.', 'error');
    } finally {
      setSubmitting(false);
      hideLoader();
    }
  };

  const getNombreSucursal = (id) => {
    if (!id) return 'Sin sucursal';
    const sucursal = sucursales.find(s => String(s.id) === String(id));
    return sucursal ? sucursal.nombre : `Suc ${id}`
  }


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
        {user?.perfil?.sucursal_id && mercanciaOriginal?.sucursal_id && String(user.perfil.sucursal_id) !== String(mercanciaOriginal.sucursal_id) && (
          <div className="mb-6 bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg flex items-start gap-3 shadow-sm animate-fade-down animate-duration-300">
            <Info className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-amber-800 font-bold text-sm">
                Estás editando una mercancía de otra sucursal
              </h3>
              <p className="text-amber-700 text-xs mt-1">
                Ten en cuenta que esta carga no pertenece a tu sucursal actual. Todo cambio, modificación o eliminación de información quedará estrictamente registrado en la auditoría del sistema.
              </p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Mercancía #{id}</h1>
          </div>
          <Link to={`/mercancias/${id}`} className="hidden sm:flex items-center gap-2 text-gray-500 hover:text-gray-700 transition">
            <ArrowLeft className="w-4 h-4" /> Cancelar
          </Link>
        </div>

        {/* Formulario */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-8">

            {/* DATOS GENERALES */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
                <User className="w-5 h-5 text-indigo-600" />
                Asignación
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="relative z-40">
                  <label htmlFor="id_cliente" className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
                  <div className="relative">
                    <div >
                      <Select
                        inputId="id_cliente"
                        placeholder="Seleccionar cliente..."
                        noOptionsMessage={() => "No se encontró el cliente"}
                        options={clientes.map(c => ({
                          value: c.id_cliente,
                          label: c.nombre_cliente
                        }))}
                        value={
                          formData.id_cliente && clientes.find(c => String(c.id_cliente) === String(formData.id_cliente))
                            ? {
                              value: formData.id_cliente,
                              label: clientes.find(c => String(c.id_cliente) === String(formData.id_cliente)).nombre_cliente
                            }
                            : null
                        }
                        onChange={(opcion) => {
                          const nuevoId = opcion ? opcion.value : '';
                          handleChange({
                            target: { name: 'id_cliente', value: nuevoId }
                          });
                          setFormData(prev => ({ ...prev, direccion_entrega: '' }));
                          cargarDireccionesDelCliente(nuevoId);
                        }}
                        isClearable
                      />
                    </div>
                  </div>
                </div>

                {/* --- BLOQUE DESTINO --- */}
                <div className="relative z-40">
                  <label htmlFor="id_destino" className="block text-sm font-medium text-gray-700 mb-1">Destino</label>
                  <div className="relative">
                    <div>
                      <Select
                        inputId="id_destino"
                        placeholder="Seleccionar destino..."
                        noOptionsMessage={() => "No se encontró el destino"}
                        options={destinos.map(d => ({
                          value: d.id_destino,
                          label: d.nombre_ciudad
                        }))}
                        value={destinos.find(d => d.id_destino === formData.id_destino) ? {
                          value: formData.id_destino,
                          label: destinos.find(d => d.id_destino === formData.id_destino).nombre_ciudad
                        } : null}
                        onChange={(opcion) => {
                          handleChange({
                            target: {
                              name: 'id_destino',
                              value: opcion ? opcion.value : ''
                            }
                          });
                        }}
                        isClearable
                      />
                    </div>
                  </div>
                </div>

                {/* --- BLOQUE PROVEEDOR --- */}
                <div className="relative z-30">
                  <label htmlFor="id_proveedor" className="block text-sm font-medium text-gray-700 mb-1">
                    Proveedor
                  </label>
                  <div className="relative">
                    <div>
                      <Select
                        inputId="id_proveedor"
                        placeholder="Selecciona un proveedor..."
                        noOptionsMessage={() => "No se encontró el proveedor"}
                        options={proveedores.map(p => ({
                          value: p.rut,
                          label: `${p.nombre_proveedor} (RUT: ${p.rut})`
                        }))}
                        value={proveedores.find(p => p.rut === formData.id_proveedor) ? {
                          value: formData.id_proveedor,
                          label: (() => {
                            const prov = proveedores.find(p => p.rut === formData.id_proveedor);
                            return `${prov.nombre_proveedor} (RUT: ${prov.rut})`;
                          })()
                        } : null}
                        onChange={(opcion) => {
                          handleChange({
                            target: {
                              name: 'id_proveedor',
                              value: opcion ? opcion.value : ''
                            }
                          });
                        }}
                        isClearable
                      />
                    </div>
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dirección de Entrega</label>
                  <CreatableSelect
                    isClearable
                    isDisabled={!formData.id_cliente}
                    options={direccionesSugeridas}
                    value={
                      formData.direccion_entrega
                        ? { label: formData.direccion_entrega, value: formData.direccion_entrega }
                        : null
                    }
                    onChange={(opt) => {
                      setFormData({
                        ...formData,
                        direccion_entrega: opt ? opt.value : ''
                      });
                    }}
                    placeholder="Seleccione o escriba dirección..."
                    formatCreateLabel={(inputValue) => `Usar nueva dirección: "${inputValue}"`}
                    styles={{ menu: (base) => ({ ...base, zIndex: 9999 }) }}
                  />
                </div>
              </div>
            </div>

            {/* DETALLES DE CARGA */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
                <Package className="w-5 h-5 text-indigo-600" />
                Detalles de Carga
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div>
                  <label htmlFor="factura" className="block text-sm font-medium text-gray-700 mb-1">
                    N° de Factura
                  </label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-700 pointer-events-none" />
                    <input
                      type="text"
                      name="factura"
                      id="factura"
                      value={formData.factura}
                      onChange={handleChange}
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"
                      placeholder="Ej: 10293"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="tipo" className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de carga
                  </label>
                  <div className="relative">
                    <NotebookPen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-700 pointer-events-none" />
                    <input
                      type="text"
                      name="tipo"
                      id="tipo"
                      value={formData.tipo}
                      onChange={handleChange}
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"
                      placeholder="Ej: Perfil"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="cantidad_bultos" className="block text-sm font-medium text-gray-700 mb-1">Bultos</label>
                  <div className="relative">
                    <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400 pointer-events-none" />
                    <input
                      type="number"
                      name="cantidad_bultos"
                      id="cantidad_bultos"
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"
                      value={formData.cantidad_bultos}
                      onChange={handleChange}
                      min="1"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="kg" className="block text-sm font-medium text-gray-700 mb-1">Peso (Kg)</label>
                  <div className="relative">
                    <Scale className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400 pointer-events-none" />
                    <input
                      type="number"
                      name="kg"
                      id="kg"
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"
                      value={formData.kg}
                      onChange={handleChange}
                      step="0.01"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="m3" className="block text-sm font-medium text-gray-700 mb-1">Volumen (m³)</label>
                  <div className="relative">
                    <Box className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400 pointer-events-none" />
                    <input
                      type="number"
                      name="m3"
                      id="m3"
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"
                      value={formData.m3}
                      onChange={handleChange}
                      step="0.01"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="codigo_interno" className="block text-sm font-medium text-gray-700 mb-1">Código Interno</label>
                  <div className="relative">
                    <NotebookPen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-900 pointer-events-none" />
                    <input
                      type="text"
                      name="codigo_interno"
                      id="codigo_interno"
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"
                      value={formData.codigo_interno}
                      onChange={handleChange}
                      placeholder="Código Interno de Bodega"
                    />
                  </div>
                </div>

                {/* --- INPUT PRECIO TOTAL REFORMULADO --- */}
                <div className="col-span-1 md:col-span-2">
                  <label htmlFor="precio_total" className=" text-sm font-bold text-emerald-700 mb-1 flex justify-between items-center">
                    Precio Total ($)
                    <span className="text-[10px] font-normal text-slate-400 uppercase tracking-wider">Recalcular valores</span>
                  </label>
                  <div className="relative flex gap-2">
                    <div className="relative flex-grow">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600 font-bold">$</span>
                      <input
                        type="number"
                        step="1"
                        name="precio_total"
                        id="precio_total"
                        value={formData.precio_total}
                        onChange={handleChange}
                        className="w-full pl-8 pr-4 py-2 bg-emerald-50 border border-emerald-300 text-emerald-800 font-bold rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition-colors"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleRecalculate}
                      title="Recalcular según tarifas del cliente"
                      className="px-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center justify-center shadow-sm"
                    >
                      <Calculator className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="checkbox"
                    id="paga_proveedor"
                    name='paga_proveedor'
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
                <label htmlFor="descripcion_carga" className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                  <textarea
                    name="descripcion_carga"
                    id="descripcion_carga"
                    rows={3}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition resize-none"
                    value={formData.descripcion_carga}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            {/* ESTADO Y DESPACHO */}
            <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-100">
              <h3 className="text-lg font-semibold text-yellow-800 mb-4 flex items-center gap-2 border-b border-yellow-200 pb-2">
                <Activity className="w-5 h-5" />
                Estado y Logística
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="estado" className="block text-sm font-medium text-gray-700 mb-1">Estado Actual</label>
                  <div className="relative">
                    <CheckCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <select
                      name="estado"
                      id="estado"
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
                  <label htmlFor="despacho" className="block text-sm font-medium text-gray-700 mb-1">Despacho Asignado</label>
                  <div className="relative">
                    <Truck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <select
                      name="id_despacho"
                      id="despacho"
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