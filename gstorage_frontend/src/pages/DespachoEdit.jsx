import React, { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import apiClient from '../services/api'
import Select from 'react-select'
import { useUI } from '../context/UIContext'
import { useAuth } from '../context/AuthContext'
import {
  Save, ArrowLeft, Calendar, Clock, Truck, User, Map,
  Activity, Loader2, AlertCircle, CheckCircle, PencilRuler, ShieldAlert
} from 'lucide-react'

export default function DespachoEdit() {
  document.title = "Editor de Despachos - GStorage"
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, logoutUser } = useAuth()
  const [formData, setFormData] = useState(null)
  const [camiones, setCamiones] = useState([])
  const [conductores, setConductores] = useState([])
  const [rutas, setRutas] = useState([])
  const [ramplas, setRamplas] = useState([])
  const [isReadOnly, setIsReadOnly] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const { showLoader, hideLoader, showToast } = useUI()

  const formatDateForInput = (isoString) => {
    if (!isoString) return ''
    const date = new Date(isoString)
    const offset = date.getTimezoneOffset() * 60000
    const localISOTime = new Date(date.getTime() - offset).toISOString().slice(0, 16)
    return localISOTime
  }

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const [camionesRes, conductoresRes, rutasRes, ramplasRes, despachoRes] = await Promise.all([
          apiClient.get('/api/inventario/camiones/'),
          apiClient.get('/api/inventario/conductores/'),
          apiClient.get('/api/inventario/rutas/'),
          apiClient.get('/api/inventario/ramplas/'),
          apiClient.get(`/api/inventario/despachos/${id}/`)
        ])
        setCamiones(camionesRes.data)
        setConductores(conductoresRes.data)
        setRutas(rutasRes.data)
        setRamplas(ramplasRes.data)

        const sucursalDespacho = despachoRes.data.sucursal_id || despachoRes.data.sucursal?.id || despachoRes.data.sucursal
        const sucursalUsuario = user?.perfil?.sucursal_id || user?.perfil?.sucursal?.id || user?.perfil?.sucursal
        const esDueno = user?.perfil?.rol === 'DUENO'
        const esMismaSucursal = Boolean(
          sucursalDespacho && 
          sucursalUsuario && 
          String(sucursalDespacho) === String(sucursalUsuario)
        )
        const soloLectura = !esDueno && !esMismaSucursal
        setIsReadOnly(soloLectura)

        setFormData({
          fecha_programada: despachoRes.data.fecha_programada,
          fecha_salida_real: formatDateForInput(despachoRes.data.fecha_salida_real),
          id_camion: despachoRes.data.id_camion || '',
          id_conductor: despachoRes.data.id_conductor || '',
          id_rampla: despachoRes.data.id_rampla || '',
          id_ruta: despachoRes.data.id_ruta || '',
          origen: despachoRes.data.origen,
          destino: despachoRes.data.destino,
          estado_despacho: despachoRes.data.estado_despacho
        })

      } catch (err) {
        if (err.response && err.response.status === 401) {
          logoutUser()
        } else {
          console.error("Error al buscar la información:", err)
          showToast("No se pudo cargar la información necesaria.", 'error')
        }
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [id, user])

  const handleChange = (e) => {
    if (isReadOnly) return
    const { name, value } = e.target
    setFormData(prevData => ({ ...prevData, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (isReadOnly) {
      showToast("No tienes permisos para modificar este despacho.", "error")
      return
    }
    setError(null)
    setSubmitting(true)
    showLoader()
    setLoading(true)

    const dataToSubmit = {
      ...formData,
      id_camion: formData.id_camion ? parseInt(formData.id_camion) : null,
      id_conductor: formData.id_conductor ? parseInt(formData.id_conductor) : null,
      id_rampla: formData.id_rampla ? parseInt(formData.id_rampla) : null,
      id_ruta: formData.id_ruta ? parseInt(formData.id_ruta) : null,
      fecha_salida_real: formData.fecha_salida_real || null
    }
    try {
      await apiClient.put(`/api/inventario/despachos/${id}/`, dataToSubmit)
      hideLoader()
      setSubmitting(false)
      showToast("Despacho actualizado exitosamente.", "success")
      navigate(`/despachos/${id}`)
    } catch (err) {
      if (err.response?.data) {
        const serverErrors = err.response.data
        if (serverErrors.id_camion) {
          setError(serverErrors.id_camion[0])
        } else {
          const firstError = Object.values(serverErrors)[0]
          setError(Array.isArray(firstError) ? firstError[0] : "Error en los datos enviados.")
        }
      } else {
        showToast('Error al actualizar el despacho. Intente nuevamente.', 'error')
      }
    } finally {
      hideLoader()
      setSubmitting(false)
      setLoading(false)
    }
  }

  const UBICACIONES = [
    'Santiago',
    'Iquique',
    'Antofagasta',
    'Calama',
    'Copiapo',
    'Tocopilla',
    'Mejillones'
  ]

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

        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Despacho #{id}</h1>
          </div>
          <Link to={`/despachos/${id}`} className="hidden sm:flex items-center gap-2 text-gray-500 hover:text-gray-700 transition">
            <ArrowLeft className="w-4 h-4" /> Volver al Detalle
          </Link>
        </div>

        {isReadOnly && (
          <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-6 rounded-r-xl shadow-sm flex items-center gap-3">
            <div>
              <p className="text-sm font-bold text-amber-900">Modo de Solo Lectura</p>
              <p className="text-xs text-amber-700">
                Estás visualizando un despacho de otra sucursal. No dispones de privilegios para modificar su planificación ni sus recursos.
              </p>
            </div>
          </div>
        )}

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
                      disabled={isReadOnly}
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
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
                      disabled={isReadOnly}
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                      value={formData.fecha_salida_real}
                      onChange={handleChange}
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">Dejar vacío si aún no ha salido.</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
                <Map className="w-5 h-5 text-indigo-600" />
                Ruta y Estado
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="relative z-[40]">
                  <label htmlFor="id_ruta" className="block text-sm font-medium text-gray-700 mb-1">Ruta Asignada</label>
                  <Select
                    inputId="id_ruta"
                    isDisabled={isReadOnly}
                    placeholder="Seleccionar ruta..."
                    options={rutas.map(r => ({ value: r.id_ruta, label: r.nombre_ruta }))}
                    value={rutas.find(r => r.id_ruta === formData.id_ruta) ? {
                      value: formData.id_ruta,
                      label: rutas.find(r => r.id_ruta === formData.id_ruta).nombre_ruta
                    } : null}
                    onChange={(opcion) => handleChange({ target: { name: 'id_ruta', value: opcion ? opcion.value : '' } })}
                    isClearable
                    required
                  />
                </div>

                <div className="relative z-40">
                  <label htmlFor="estado_despacho" className="block text-sm font-medium text-gray-700 mb-1">Estado del Viaje</label>
                  <Select
                    inputId="estado_despacho"
                    isDisabled={isReadOnly}
                    options={[
                      { value: 'Programado', label: 'Programado' },
                      { value: 'En Carga', label: 'En Carga' },
                      { value: 'En Tránsito', label: 'En Tránsito' },
                      { value: 'Finalizado', label: 'Finalizado' }
                    ]}
                    value={formData.estado_despacho ? { value: formData.estado_despacho, label: formData.estado_despacho } : null}
                    onChange={(opcion) => handleChange({ target: { name: 'estado_despacho', value: opcion ? opcion.value : '' } })}
                  />
                </div>

                <div className="relative z-30">
                  <label htmlFor="origen" className="block text-sm font-semibold text-slate-700 mb-1">Ciudad de Origen</label>
                  <Select
                    inputId="origen"
                    isDisabled={isReadOnly}
                    placeholder="Seleccione el origen..."
                    options={UBICACIONES.map(ciudad => ({ value: ciudad, label: ciudad }))}
                    value={formData.origen ? { value: formData.origen, label: formData.origen } : null}
                    onChange={(opcion) => handleChange({ target: { name: 'origen', value: opcion ? opcion.value : '' } })}
                    isClearable
                    required
                  />
                </div>

                <div className="relative z-30">
                  <label htmlFor="destino" className="block text-sm font-semibold text-slate-700 mb-1">Ciudad de Destino</label>
                  <Select
                    inputId="destino"
                    isDisabled={isReadOnly}
                    placeholder="Seleccione el destino..."
                    options={UBICACIONES.map(ciudad => ({ value: ciudad, label: ciudad }))}
                    value={formData.destino ? { value: formData.destino, label: formData.destino } : null}
                    onChange={(opcion) => handleChange({ target: { name: 'destino', value: opcion ? opcion.value : '' } })}
                    isClearable
                    required
                  />
                </div>
              </div>
            </div>

            <div className="bg-indigo-50 p-6 rounded-lg border border-indigo-100">
              <h3 className="text-lg font-semibold text-indigo-800 mb-4 flex items-center gap-2 border-b border-indigo-200 pb-2">
                <Truck className="w-5 h-5" />
                Recursos de Transporte
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="relative z-[20]">
                  <label htmlFor="id_camion" className="block text-sm font-medium text-gray-700 mb-1">Camión</label>
                  <Select
                    inputId="id_camion"
                    isDisabled={isReadOnly}
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
                    onChange={(opcion) => handleChange({
                      target: { name: 'id_camion', value: opcion ? opcion.value : '' }
                    })}
                    isClearable
                    required
                  />
                </div>

                <div className="relative z-[20]">
                  <label htmlFor="id_rampla" className="block text-sm font-medium text-gray-700 mb-1">Rampla</label>
                  <Select
                    inputId="id_rampla"
                    isDisabled={isReadOnly}
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
                    onChange={(opcion) => handleChange({
                      target: { name: 'id_rampla', value: opcion ? opcion.value : '' }
                    })}
                    isClearable
                    required
                  />
                </div>

                <div className="relative z-[10] md:col-span-2">
                  <label htmlFor="id_conductor" className="block text-sm font-medium text-gray-700 mb-1">Conductor</label>
                  <Select
                    inputId="id_conductor"
                    isDisabled={isReadOnly}
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
                    onChange={(opcion) => handleChange({
                      target: { name: 'id_conductor', value: opcion ? opcion.value : '' }
                    })}
                    isClearable
                    required
                  />
                </div>
              </div>
            </div>

            {/* Acciones */}
            <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-100">
              <Link
                to={`/despachos/${id}`}
                className="px-6 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition focus:ring-2 focus:ring-gray-200 text-sm"
              >
                {isReadOnly ? "Volver" : "Cancelar"}
              </Link>

              {!isReadOnly && (
                <button
                  type="submit"
                  disabled={submitting}
                  className={`flex items-center gap-2 px-8 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-200 transition shadow-md text-sm ${submitting ? 'opacity-75 cursor-not-allowed' : ''}`}
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
              )}
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}