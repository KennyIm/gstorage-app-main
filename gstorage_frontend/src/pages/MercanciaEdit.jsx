import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import apiClient from '../services/api'
import { useAuth } from '../context/AuthContext'
import Select from 'react-select'
import CreatableSelect from 'react-select/creatable'
import { useUI } from '../context/UIContext'
import {
  Save, ArrowLeft, Package, Scale, Box, FileText,
  Loader2, CheckCircle, NotebookPen, Calculator, Info,
  ImagePlus, Trash2, Eye, X, ExternalLink
} from 'lucide-react'

const detectarConfiguracionSucursal = (d) => {
  if (!d) return { letra: '?', badgeClass: 'bg-slate-100 text-slate-700 border-slate-300' }

  const origenStr = String(
    d.origen ||
    d.nombre_origen ||
    d.sucursal_origen ||
    d.sucursal_nombre ||
    d.sucursal?.nombre ||
    d.sucursal?.ciudad ||
    d.sucursal ||
    ''
  ).toLowerCase()

  if (origenStr.includes('antof')) {
    return { letra: 'A', badgeClass: 'bg-purple-100 text-purple-700 border-purple-300' }
  }
  if (origenStr.includes('iqui')) {
    return { letra: 'I', badgeClass: 'bg-yellow-100 text-yellow-800 border-yellow-300' }
  }
  if (origenStr.includes('sant') || origenStr.includes('stgo')) {
    return { letra: 'S', badgeClass: 'bg-blue-100 text-blue-700 border-blue-300' }
  }

  return { letra: 'D', badgeClass: 'bg-slate-100 text-slate-700 border-slate-300' }
}

export default function MercanciaEdit() {
  document.title = "Edición de Mercancia - GStorage"
  const { id } = useParams()
  const navigate = useNavigate();
  const { user, logoutUser } = useAuth()

  const [formData, setFormData] = useState(null)

  const [clientes, setClientes] = useState([])
  const [destinos, setDestinos] = useState([])
  const [ubicaciones, setUbicaciones] = useState([])
  const [despachos, setDespachos] = useState([])
  const [proveedores, setProveedores] = useState([])
  const [sucursales, setSucursales] = useState([])

  const [mercanciaOriginal, setMercanciaOriginal] = useState(null)

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const { showLoader, hideLoader, showToast } = useUI()
  const [direccionesSugeridas, setDireccionesSugeridas] = useState([])
  const [showPricing, setShowPricing] = useState(false)

  // Estados para manejo y visor de imagen
  const [imagenExistenteUrl, setImagenExistenteUrl] = useState(null)
  const [imagenArchivo, setImagenArchivo] = useState(null)
  const [imagenPreview, setImagenPreview] = useState(null)
  const [eliminarImagenExistente, setEliminarImagenExistente] = useState(false)
  const [showImageModal, setShowImageModal] = useState(false)
  const fileInputRef = useRef(null)

  const imagenActivaUrl = imagenPreview || (!eliminarImagenExistente ? imagenExistenteUrl : null)

  const calcularPrecioLogica = (tipoTarifa = formData?.tipo_tarifa || 'base') => {
    if (!formData || !formData.id_cliente) return null

    const clienteSeleccionado = clientes.find(c => String(c.id_cliente) === String(formData.id_cliente))
    if (!clienteSeleccionado) return null

    const peso = parseFloat(String(formData.kg).replace(',', '.')) || 0
    const volumen = parseFloat(String(formData.m3).replace(',', '.')) || 0
    let precioKg = parseFloat(clienteSeleccionado.precio_kg) || 0
    let precioM3 = parseFloat(clienteSeleccionado.precio_m3) || 0
    if (tipoTarifa === 'tarifa_2') {
      precioKg = parseFloat(clienteSeleccionado.precio_kg_2) || 0
      precioM3 = parseFloat(clienteSeleccionado.precio_m3_2) || 0
    } else if (tipoTarifa === 'tarifa_3') {
      precioKg = parseFloat(clienteSeleccionado.precio_kg_3) || 0
      precioM3 = parseFloat(clienteSeleccionado.precio_m3_3) || 0
    }

    return Math.max(peso * precioKg, volumen * precioM3).toFixed(0)
  }

  const handleRecalculate = (e) => {
    if (e) e.preventDefault()
    const nuevoTotal = calcularPrecioLogica()
    if (nuevoTotal !== null) {
      setFormData(prev => ({ ...prev, precio_total: nuevoTotal }))
    }
  }

  const opcionesDespachosEdicion = useMemo(() => {
    const listaBase = [{ value: '', label: '(Ninguno / Pendiente)', isNullOption: true }]
    if (!despachos || despachos.length === 0) return listaBase

    const opciones = despachos.map((d) => {
      const rutaRaw = d.nombre_ruta || d.ruta_nombre || d.id_ruta || 'S/N'
      const rutaCorta = String(rutaRaw).split('-')[0].trim()
      const textoRuta = rutaCorta.toLowerCase().includes('ruta') ? rutaCorta : `Ruta ${rutaCorta}`
      const config = detectarConfiguracionSucursal(d)

      return {
        value: String(d.id_despacho || d.id),
        label: `[${config.letra}] ${textoRuta} (Despacho #${d.id_despacho || d.id})`,
        letra: config.letra,
        textoRuta,
        badgeClass: config.badgeClass,
        idDespacho: d.id_despacho || d.id,
      }
    })

    return [...listaBase, ...opciones]
  }, [despachos])

  const opcionDespachoSeleccionada = useMemo(() => {
    if (!formData?.id_despacho) return opcionesDespachosEdicion[0]
    return opcionesDespachosEdicion.find(
      (op) => String(op.value) === String(formData.id_despacho)
    ) || null
  }, [opcionesDespachosEdicion, formData?.id_despacho])

  useEffect(() => {
    apiClient.get('/api/inventario/despachos/')
      .then((res) => setDespachos(res.data.results || res.data || []))
      .catch((err) => console.error("Error cargando despachos:", err))
  }, [])

  useEffect(() => {
    if (formData && formData.id_cliente && (formData.kg || formData.m3)) {
      const valorActual = parseFloat(formData.precio_total)

      if (!formData.precio_total || valorActual === 0 || isNaN(valorActual)) {
        const sugerido = calcularPrecioLogica()
        if (sugerido) {
          setFormData(prev => ({ ...prev, precio_total: sugerido }))
        }
      }
    }
  }, [formData?.kg, formData?.m3, formData?.id_cliente, formData?.tipo_tarifa, clientes])

  useEffect(() => {
    return () => {
      if (imagenPreview) URL.revokeObjectURL(imagenPreview)
    }
  }, [imagenPreview])

  const cargarDireccionesDelCliente = async (clienteId) => {
    if (!clienteId) {
      setDireccionesSugeridas([])
      return
    }
    try {
      const response = await apiClient.get(`/api/inventario/clientes/${clienteId}/direcciones/`)
      const suggestions = response.data.map(dir => ({
        label: String(dir),
        value: String(dir)
      }))
      setDireccionesSugeridas(suggestions);
    } catch (err) {
      console.error("Error cargando direcciones en edición", err)
      setDireccionesSugeridas([])
    }
  }

  // --- CARGA DE DATOS ---
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const [mercanciaRes, clientesRes, destinosRes, ubicacionesRes, despachosRes, provRes, sucursalesRes] = await Promise.all([
          apiClient.get(`/api/inventario/mercancias/${id}/`),
          apiClient.get('/api/inventario/clientes/'),
          apiClient.get('/api/inventario/destinos/'),
          apiClient.get('/api/inventario/ubicaciones/'),
          apiClient.get('/api/inventario/despachos/'),
          apiClient.get('/api/inventario/proveedores/'),
          apiClient.get('/api/usuarios/sucursales/')
        ])
        const currentData = mercanciaRes.data;

        const ubicacionesFiltradas = ubicacionesRes.data.filter(u =>
          !u.estado_ocupado || u.id_ubicacion === currentData.id_ubicacion_actual
        )

        setMercanciaOriginal(currentData)
        setImagenExistenteUrl(currentData.imagen || null)
        setClientes(clientesRes.data)
        setDestinos(destinosRes.data)
        setUbicaciones(ubicacionesFiltradas)
        setDespachos(despachosRes.data)
        setProveedores(provRes.data)
        setSucursales(sucursalesRes.data)

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
          tipo_documento_mercancia: currentData.tipo_documento_mercancia || '',
          tipo: currentData.tipo || '',
          paga_proveedor: currentData.paga_proveedor || false,
          codigo_interno: currentData.codigo_interno || '',
          direccion_entrega: currentData.direccion_entrega || '',
          tipo_tarifa: currentData.tipo_tarifa || 'base'
        })
        if (currentData.id_cliente) {
          cargarDireccionesDelCliente(currentData.id_cliente)
        }
      } catch (err) {
        if (err.response && err.response.status === 401) {
          showToast('Credenciales de autenticación no válidas, por favor ingrese de nuevo.', 'error')
          logoutUser()
        } else {
          console.error("Error al buscar la información:", err)
          showToast('No se pudo cargar la información necesaria.', 'error')
        }
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [id, logoutUser, showToast])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prevData => ({
      ...prevData,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleImageChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      showToast('Selecciona un archivo de imagen válido (JPG, PNG, WebP).', 'error')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('La imagen no puede superar los 5 MB.', 'error')
      return
    }

    if (imagenPreview) URL.revokeObjectURL(imagenPreview)
    setImagenArchivo(file)
    setImagenPreview(URL.createObjectURL(file))
    setEliminarImagenExistente(false)
  }

  const handleRemoveImage = () => {
    if (imagenPreview) URL.revokeObjectURL(imagenPreview)
    setImagenArchivo(null)
    setImagenPreview(null)
    if (imagenExistenteUrl) {
      setEliminarImagenExistente(true)
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    showLoader()

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
      tipo_documento_mercancia: formData.tipo_documento_mercancia || null,
      tipo: formData.tipo || null,
      paga_proveedor: formData.paga_proveedor || false,
      codigo_interno: formData.codigo_interno || null,
      direccion_entrega: formData.direccion_entrega || null,
      tipo_tarifa: formData.tipo_tarifa || 'base'
    }

    try {
      if (imagenArchivo) {
        const multipartData = new FormData()
        Object.entries(dataToSubmit).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            multipartData.append(key, value)
          }
        })
        multipartData.append('imagen', imagenArchivo)

        await apiClient.patch(`/api/inventario/mercancias/${id}/`, multipartData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
      } else {
        if (eliminarImagenExistente) {
          dataToSubmit.imagen = null
        }
        await apiClient.patch(`/api/inventario/mercancias/${id}/`, dataToSubmit)
      }

      showToast('Mercancía actualizada exitosamente.', 'success')
      navigate(`/mercancias/${id}`)
    } catch (err) {
      console.error(err)
      showToast('Error al actualizar la mercancía. Por favor revisa los datos.', 'error')
    } finally {
      setSubmitting(false)
      hideLoader()
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-500">
        <Loader2 className="w-10 h-10 animate-spin mb-4 text-indigo-600" />
        <p>Cargando datos de edición...</p>
      </div>
    )
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
              <h3 className="text-lg font-semibold justify-between text-gray-900 mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
                Asignación
                <button
                  type='button'
                  onClick={() => setShowPricing(true)}
                  className="flex items-center gap-2 px-2 bg-amber-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-lg"
                >
                  <Info size={20} />
                  Tarifas
                </button>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                <div className="relative z-40">
                  <label htmlFor="id_cliente" className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
                  <div className="relative">
                    <div>
                      <Select
                        inputId="id_cliente"
                        placeholder="Seleccionar cliente..."
                        noOptionsMessage={() => "No se encontró el cliente"}
                        options={clientes.map(c => ({
                          value: c.id_cliente,
                          label: `${c.nombre_cliente} (RUT:${c.rut_cliente})`
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
                          setFormData(prev => ({ ...prev, direccion_entrega: '', tipo_tarifa: 'base' }));
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
                          value: p.id,
                          label: `${p.nombre_proveedor} (RUT: ${p.rut})`
                        }))}
                        value={(() => {
                          if (!formData.id_proveedor) return null;
                          const provObj = proveedores.find(p => Number(p.id) === Number(formData.id_proveedor));

                          return provObj ? {
                            value: provObj.id,
                            label: `${provObj.nombre_proveedor} (RUT: ${provObj.rut})`
                          } : null;
                        })()}
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

              {/* SELECTOR DE TARIFA DEL CLIENTE */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-3">
                <div className="col-span-1 sm:col-span-3 bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <label htmlFor="tipo_tarifa" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Tarifa del Cliente
                    </label>
                  </div>

                  <select
                    id="tipo_tarifa"
                    name="tipo_tarifa"
                    value={formData.tipo_tarifa || 'base'}
                    onChange={(e) => {
                      const nuevaTarifa = e.target.value;
                      setFormData(prev => ({ ...prev, tipo_tarifa: nuevaTarifa }));
                      const nuevoTotal = calcularPrecioLogica(nuevaTarifa);
                      if (nuevoTotal !== null) {
                        setFormData(prev => ({ ...prev, tipo_tarifa: nuevaTarifa, precio_total: nuevoTotal }));
                      }
                    }}
                    disabled={!formData.id_cliente}
                    className="py-2 px-3 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none transition disabled:opacity-50 min-w-[240px]"
                  >
                    {(() => {
                      const cliente = clientes.find(c => String(c.id_cliente) === String(formData.id_cliente))
                      if (!cliente) return <option value="base">Sin cliente seleccionado</option>

                      const opciones = [
                        <option key="base" value="base">
                          ${cliente.precio_kg || 0}/Kg ----- ${cliente.precio_m3 || 0}/m³
                        </option>
                      ]
                      if (cliente.nombre_tarifa_2 || parseFloat(cliente.precio_kg_2) > 0 || parseFloat(cliente.precio_m3_2) > 0) {
                        opciones.push(
                          <option key="tarifa_2" value="tarifa_2">
                            {cliente.nombre_tarifa_2 || 'Tarifa 2'} (${cliente.precio_kg_2 || 0}/Kg - ${cliente.precio_m3_2 || 0}/m³)
                          </option>
                        )
                      }
                      if (cliente.nombre_tarifa_3 || parseFloat(cliente.precio_kg_3) > 0 || parseFloat(cliente.precio_m3_3) > 0) {
                        opciones.push(
                          <option key="tarifa_3" value="tarifa_3">
                            {cliente.nombre_tarifa_3 || 'Tarifa 3'} (${cliente.precio_kg_3 || 0}/Kg - ${cliente.precio_m3_3 || 0}/m³)
                          </option>
                        )
                      }

                      return opciones
                    })()}
                  </select>
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
                  <label htmlFor="tipo_documento_mercancia" className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Documento
                  </label>
                  <div className="relative">
                    <select
                      id="tipo_documento_mercancia"
                      name="tipo_documento_mercancia"
                      value={formData.tipo_documento_mercancia || 'Factura'}
                      onChange={handleChange}
                      className="w-full h-[46px] px-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition cursor-pointer text-sm"
                    >
                      <option value="Factura">Factura Electrónica</option>
                      <option value="Boleta">Boleta</option>
                      <option value="Guia">Guía de Despacho</option>
                      <option value="DUS">Aduana (DUS)</option>
                      <option value="Solicitud Envio">Solicitud de envió</option>
                      <option value="DIN">Declaración de Ingreso(DIN)</option>
                      <option value="DIPS">Declaración de Ingreso Simplificada(DIPS)</option>
                      <option value="MFTO">Manifiesto(MFTO)</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label htmlFor="factura" className="block text-sm font-medium text-gray-700 mb-1">
                    N° de {formData.tipo_documento_mercancia || 'Documento'}
                  </label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-700 pointer-events-none" />
                    <input
                      type="text"
                      id="factura"
                      name='factura'
                      value={formData.factura}
                      onChange={handleChange}
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"
                      placeholder={
                        formData.tipo_documento_mercancia === 'Factura' ? "Ej: 10293" :
                          formData.tipo_documento_mercancia === 'Guia' ? "Ej: 88234" :
                            "Ej: Número o Folio"
                      }
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
                      step="1"
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

                {/* INPUT PRECIO TOTAL */}
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

              {/* FOTOGRAFÍA DEL BULTO */}
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Fotografía del Bulto <span className="text-xs text-gray-400 font-normal">(Opcional)</span>
                </label>

                <input
                  ref={fileInputRef}
                  id="imagen_mercancia_edit"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />

                {!imagenActivaUrl ? (
                  <label
                    htmlFor="imagen_mercancia_edit"
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer bg-slate-50/70 hover:bg-indigo-50/40 hover:border-indigo-400 transition"
                  >
                    <div className="flex flex-col items-center justify-center py-4 text-center px-4">
                      <ImagePlus className="w-7 h-7 text-indigo-500 mb-1.5" />
                      <p className="text-sm font-medium text-gray-700">
                        Haz clic para subir o reemplazar foto del bulto
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">JPG, PNG o WebP</p>
                    </div>
                  </label>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setShowImageModal(true)}
                      className="relative group w-24 h-24 rounded-lg overflow-hidden border border-gray-200 shrink-0 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      title="Ampliar imagen"
                    >
                      <img
                        src={imagenActivaUrl}
                        alt="Fotografía del bulto"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <span className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                        <Eye className="w-5 h-5" />
                      </span>
                    </button>

                    <div className="flex-grow min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">
                        {imagenArchivo ? imagenArchivo.name : 'Imagen registrada del bulto'}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {imagenArchivo
                          ? `${(imagenArchivo.size / (1024 * 1024)).toFixed(2)} MB (Nueva imagen por guardar)`
                          : 'Almacenada en el inventario'}
                      </p>

                      <div className="mt-2.5 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setShowImageModal(true)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Ver imagen
                        </button>

                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition"
                        >
                          <ImagePlus className="w-3.5 h-3.5" />
                          Cambiar foto
                        </button>

                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Quitar
                        </button>
                      </div>
                    </div>
                  </div>
                )}
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start ">
              <div>
                <label htmlFor="estado" className="block text-sm font-medium text-gray-700 mb-1">
                  Estado Actual
                </label>
                <div className="relative">
                  <CheckCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <select
                    name="estado"
                    id="estado"
                    className="w-full pl-10 pr-4 h-[42px] bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition text-sm font-medium text-slate-700"
                    value={formData.estado || ''}
                    onChange={handleChange}
                  >
                    <option value="" disabled hidden>Seleccione estado...</option>
                    <option value="En Bodega">En Bodega</option>
                    <option value="Asignado">Asignado a Despacho</option>
                    <option value="En Tránsito">En Tránsito</option>
                    <option value="En Observacion">En Observación</option>
                    <option value="Entregado">Entregado</option>
                    <option value="Recibido">Recibido</option>
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="despacho" className="block text-sm font-medium text-gray-700 mb-1">
                  Despacho Asignado
                </label>
                <Select
                  inputId="despacho"
                  name="id_despacho"
                  options={opcionesDespachosEdicion}
                  value={opcionDespachoSeleccionada}
                  isClearable={true}
                  isSearchable={true}
                  placeholder="Seleccionar despacho..."
                  noOptionsMessage={() => "No se encontraron despachos"}
                  className="text-sm"
                  menuPlacement="bottom"
                  maxMenuHeight={185}
                  menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                  onChange={(opcion) => {
                    handleChange({
                      target: {
                        name: 'id_despacho',
                        value: opcion ? opcion.value : '',
                      },
                    })
                  }}
                  formatOptionLabel={(option) => {
                    if (option.isNullOption || !option.value) {
                      return <span className="text-gray-400 italic text-sm">(Ninguno / Pendiente)</span>
                    }
                    return (
                      <div className="flex items-center gap-2 py-0.5">
                        <span className={`w-5 h-5 flex items-center justify-center text-[11px] font-black rounded border shrink-0 uppercase ${option.badgeClass}`}>
                          {option.letra?.toUpperCase()}
                        </span>
                        <span className="font-semibold text-slate-800 text-sm">
                          {option.textoRuta}
                        </span>
                        <span className="text-gray-400 text-xs font-normal">
                          (#{option.idDespacho})
                        </span>
                      </div>
                    )
                  }}
                  styles={{
                    control: (base, state) => ({
                      ...base,
                      backgroundColor: '#FFFFFF',
                      borderColor: state.isFocused ? '#6366F1' : '#D1D5DB',
                      boxShadow: state.isFocused ? '0 0 0 2px rgba(99, 102, 241, 0.2)' : 'none',
                      borderRadius: '0.5rem',
                      height: '42px',
                      minHeight: '42px',
                      '&:hover': {
                        borderColor: state.isFocused ? '#6366F1' : '#9CA3AF',
                      },
                    }),
                    valueContainer: (base) => ({
                      ...base,
                      height: '42px',
                      padding: '0 8px',
                    }),
                    indicatorsContainer: (base) => ({
                      ...base,
                      height: '42px',
                    }),
                    menuPortal: (base) => ({
                      ...base,
                      zIndex: 9999,
                    }),
                    menu: (base) => ({
                      ...base,
                      borderRadius: '0.5rem',
                      marginTop: '4px',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                    }),
                    menuList: (base) => ({
                      ...base,
                      maxHeight: '185px',
                      padding: '4px',
                    }),
                    option: (base, state) => ({
                      ...base,
                      backgroundColor: state.isSelected ? '#EEF2FF' : state.isFocused ? '#F8FAFC' : 'white',
                      color: '#374151',
                      borderRadius: '0.375rem',
                      padding: '8px 10px',
                      cursor: 'pointer',
                      '&:active': {
                        backgroundColor: '#E0E7FF',
                      },
                    }),
                  }}
                />
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

        {/* MODAL VISOR DE IMAGEN */}
        {showImageModal && imagenActivaUrl && (
          <div
            onClick={() => setShowImageModal(false)}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-slate-50">
                <h3 className="font-bold text-slate-800 text-sm sm:text-base">
                  Fotografía — Mercancía #{id}
                </h3>
                <div className="flex items-center gap-2">
                  <a
                    href={imagenActivaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Abrir original
                  </a>
                  <button
                    type="button"
                    onClick={() => setShowImageModal(false)}
                    className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200/70 rounded-lg transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="p-4 bg-slate-900 flex items-center justify-center overflow-auto">
                <img
                  src={imagenActivaUrl}
                  alt={`Mercancía #${id}`}
                  className="max-h-[75vh] w-auto object-contain rounded-lg"
                />
              </div>
            </div>
          </div>
        )}

        {/* MODAL TARIFAS GENERALES */}
        {showPricing && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">

              <div className="bg-blue-600 text-white p-5 flex items-center justify-between shrink-0">
                <h2 className="text-xl font-bold">Tarifas y Precios</h2>
              </div>

              <div className="p-6 space-y-6 overflow-y-auto">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 mb-3">Valores por Caja</h3>
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 divide-y divide-slate-200">
                    <div className="grid grid-cols-5 gap-2 py-2 first:pt-0 text-[10px] sm:text-xs">
                      <span className="font-bold text-slate-900 text-left text-sm">Destino</span>
                      <span className="font-bold text-slate-900 text-center text-sm">Hasta 5Kg</span>
                      <span className="font-bold text-slate-900 text-center text-sm">Hasta 15kg/0.10m³</span>
                      <span className="font-bold text-slate-900 text-center text-sm">Hasta 25Kg/0.20m³</span>
                      <span className="font-bold text-slate-900 text-center text-sm">Hasta 40Kg/0.30m³</span>
                    </div>
                    {[
                      { ciudad: 'Iquique', p1: '$19.500', p2: '$32.500', p3: '$45.500', p4: '$58.500' },
                      { ciudad: 'Antofagasta', p1: '$13.000', p2: '$26.000', p3: '$39.000', p4: '$45.500' },
                      { ciudad: 'Tocopilla', p1: '$19.500', p2: '$32.500', p3: '$45.500', p4: '$58.500' },
                      { ciudad: 'Mejillones', p1: '$13.000', p2: '$26.000', p3: '$39.000', p4: '$45.500' },
                      { ciudad: 'Calama', p1: '$19.500', p2: '$32.500', p3: '$45.500', p4: '$58.500' },
                      { ciudad: 'Copiapo', p1: '$13.000', p2: '$26.000', p3: '$39.000', p4: '$45.500' },
                    ].map((fila, index) => (
                      <div
                        key={index}
                        className="grid grid-cols-5 gap-2 py-2.5 items-center hover:bg-slate-100 transition-colors"
                      >
                        <span className="text-slate-900 font-medium text-sm">{fila.ciudad}</span>
                        <span className="text-slate-600 text-center text-sm">{fila.p1}</span>
                        <span className="text-slate-600 text-center text-sm">{fila.p2}</span>
                        <span className="text-slate-600 text-center text-sm">{fila.p3}</span>
                        <span className="text-slate-600 text-center text-sm">{fila.p4}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-slate-800 mb-3">Adicionales por Embalaje</h3>
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col gap-3">
                    <div className="grid grid-cols-4 gap-2">
                      <div className="col-span-1 flex items-center text-slate-900 font-medium text-sm pr-2">
                        Cajones (Maquinaria)
                      </div>
                      <div className="col-span-1 bg-white border border-slate-200 rounded-lg p-2 flex flex-col items-center justify-center text-center shadow-sm">
                        <span className="text-[10px] sm:text-xs text-slate-500 mb-0.5">Hasta 1m³</span>
                        <span className="font-bold text-slate-900">$75.000</span>
                      </div>
                      <div className="col-span-1 bg-white border border-slate-200 rounded-lg p-2 flex flex-col items-center justify-center text-center shadow-sm">
                        <span className="text-[10px] sm:text-xs text-slate-500 mb-0.5">1m³ - 3m³</span>
                        <span className="font-bold text-slate-900">$130.000</span>
                      </div>
                      <div className="col-span-1 bg-white border border-slate-200 rounded-lg p-2 flex flex-col items-center justify-center text-center shadow-sm">
                        <span className="text-[10px] sm:text-xs text-slate-500 mb-0.5">Mayor 3m³</span>
                        <span className="font-bold text-slate-900">$190.000</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      <div className="col-span-1 flex items-center text-slate-900 font-medium text-sm pr-2">
                        Jaulas/Javas
                      </div>
                      <div className="col-span-3 bg-white border border-slate-200 rounded-lg p-2 flex flex-col items-center justify-center text-center shadow-sm">
                        <span className="font-bold text-slate-900">+1 m³</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      <div className="col-span-1 flex items-center text-slate-900 font-medium text-sm pr-2 leading-tight">
                        Bultos largos/indivisibles
                      </div>
                      <div className="col-span-1 bg-white border border-slate-200 rounded-lg p-2 flex flex-col items-center justify-center text-center shadow-sm">
                        <span className="text-[10px] sm:text-xs text-slate-500 mb-0.5">Hasta 3m de largo</span>
                        <span className="font-bold text-emerald-600">+20%</span>
                      </div>
                      <div className="col-span-1 bg-white border border-slate-200 rounded-lg p-2 flex flex-col items-center justify-center text-center shadow-sm">
                        <span className="text-[10px] sm:text-xs text-slate-500 mb-0.5">Entre 3 y 5.99m</span>
                        <span className="font-bold text-emerald-600">+40%</span>
                      </div>
                      <div className="col-span-1 bg-white border border-slate-200 rounded-lg p-2 flex flex-col items-center justify-center text-center shadow-sm">
                        <span className="text-[10px] sm:text-xs text-slate-500 mb-0.5">Mayor a 6m</span>
                        <span className="font-bold text-emerald-600">+60%</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl">
                  <h3 className="text-lg font-bold text-amber-900 mb-1">Precio Mínimo</h3>
                  <p className="text-amber-800 mb-2">
                    El cargo mínimo por ingreso de mercadería es de <span className="font-black text-xl">1m³</span>
                  </p>
                  <p className="text-xs text-amber-700 leading-relaxed">
                    Este monto se aplica cuando una carga no cumple con los <span className="font-black">Kg</span> mínimos ni con los <span className="font-black">m³</span> mínimos.
                  </p>
                </div>

                <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4">
                  <h4 className="font-bold text-blue-900 mb-2">Información Adicional</h4>
                  <ul className="text-sm text-blue-800 space-y-1.5">
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span> Los precios no incluyen IVA.</li>
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span> La mercadería de lujo y/o alto valor se debe cobrar un adicional de 2% a 5% del monto de la factura.</li>
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span> Cuando coincidan dos criterios adicionales se aplicará el más alto.</li>
                  </ul>
                </div>
              </div>
              <div className="bg-slate-50 border-t border-slate-200 p-4 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowPricing(false)}
                  className="w-full bg-slate-800 text-white py-2.5 rounded-xl hover:bg-slate-900 transition-colors font-semibold shadow-sm"
                >
                  Cerrar
                </button>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  )
}