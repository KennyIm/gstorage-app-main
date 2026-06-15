import React, { useState, useEffect, useMemo } from 'react'
import { useUI } from '../context/UIContext'
import apiClient from '../services/api'
import { DollarSign, FileText, Calendar, Truck, User, Layers, Receipt, Filter, Search, Eye } from 'lucide-react'

export default function IngresoGastos() {
  document.title = "Gastos Operativos - Transportes Medalla"
  const { showLoader, hideLoader, showToast } = useUI()

  const [proveedores, setProveedores] = useState([])
  const [camiones, setCamiones] = useState([])
  const [conductores, setConductores] = useState([])
  const [gastos, setGastos] = useState([])
  const [loading, setLoading] = useState(true)


  const [proveedorBusqueda, setProveedorBusqueda] = useState('')
  const [mostrarDropdownProv, setMostrarDropdownProv] = useState(false)
  const provDropdownRef = React.useRef(null)

  const [mostrarModalProv, setMostrarModalProv] = useState(false)
  const [nuevoProv, setNuevoProv] = useState({ nombre_proveedor: '', rut_proveedor: '' })
  const [creandoProv, setCreandoProv] = useState(false)

  const [filtroBusqueda, setFiltroBusqueda] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('Todos')
  const [filtroEstado, setFiltroEstado] = useState('Todos')

  const [mostrarModalPagar, setMostrarModalPagar] = useState(false)
  const [gastoAPagarId, setGastoAPagarId] = useState(null)
  const [comprobantePago, setComprobantePago] = useState(null)
  const [liquidandoGasto, setLiquidandoGasto] = useState(false)

  const [form, setForm] = useState({
    tipo_gasto: 'Combustible',
    descripcion: '',
    proveedor: '',
    camion_asociado: '',
    conductor_asociado: '',
    despacho_asociado: '',
    numero_documento: '',
    fecha_gasto: new Date().toISOString().split('T')[0],
    monto_total: '',
    estado: 'Pendiente'
  })
  const [comprobante, setComprobante] = useState(null)
  const [guardando, setGuardando] = useState(false)

  const cargarDatos = async () => {
    setLoading(true)
    try {
      const [resProv, resCam, resCond, resGastos] = await Promise.all([
        apiClient.get('/api/finanzas/proveedores-gastos/selector/').catch(() => ({ data: [] })),
        apiClient.get('/api/inventario/camiones/').catch(() => ({ data: [] })),
        apiClient.get('/api/inventario/conductores/').catch(() => ({ data: [] })),
        apiClient.get('/api/finanzas/gastos-operativos/')
      ]);

      setProveedores(resProv.data.results || resProv.data)
      setCamiones(resCam.data.results || resCam.data)
      setConductores(resCond.data.results || resCond.data)
      setGastos(resGastos.data.results || resGastos.data)
    } catch (error) {
      showToast('Error al sincronizar catálogos operativos.', 'error')
    } finally {
      setLoading(false)
    }
  };

  useEffect(() => {
    cargarDatos()
  }, [])

  const proveedoresFiltrados = useMemo(() => {
    if (!proveedorBusqueda) return proveedores
    const term = proveedorBusqueda.toLowerCase()
    return proveedores.filter(p =>
      p.nombre_proveedor.toLowerCase().includes(term) ||
      (p.rut_proveedor && p.rut_proveedor.toLowerCase().includes(term))
    );
  }, [proveedores, proveedorBusqueda])


  const gastosFiltrados = useMemo(() => {
    return gastos.filter(g => {
      const matchTipo = filtroTipo === 'Todos' || g.tipo_gasto === filtroTipo
      const matchEstado = filtroEstado === 'Todos' || g.estado === filtroEstado
      const matchBusqueda = !filtroBusqueda ||
        g.descripcion.toLowerCase().includes(filtroBusqueda.toLowerCase()) ||
        String(g.numero_documento || '').toLowerCase().includes(filtroBusqueda.toLowerCase()) ||
        g.proveedor_nombre.toLowerCase().includes(filtroBusqueda.toLowerCase())

      return matchTipo && matchEstado && matchBusqueda
    })
  }, [gastos, filtroBusqueda, filtroTipo, filtroEstado])

  const handleChange = (e) => {
    const { name, value } = e.target

    if (name === 'estado' && value === 'Pendiente') {
      setComprobante(null)
    }

    setForm({ ...form, [name]: value });
  };

  const handleCrearProveedorRapido = async (e) => {
    e.preventDefault()
    if (!nuevoProv.nombre_proveedor.trim()) return;

    setCreandoProv(true)
    try {
      const res = await apiClient.post('/api/finanzas/proveedores-gastos/selector/', nuevoProv)
      showToast('Proveedor registrado e inyectado con éxito.', 'success')

      const nuevoObjeto = res.data

      setProveedores(prev => [...prev, nuevoObjeto].sort((a, b) =>
        a.nombre_proveedor.localeCompare(b.nombre_proveedor)
      ))
      setForm(prev => ({ ...prev, proveedor: nuevoObjeto.id }))
      setProveedorBusqueda(nuevoObjeto.nombre_proveedor)

      setNuevoProv({ nombre_proveedor: '', rut_proveedor: '' })
      setMostrarModalProv(false)
    } catch (error) {
      showToast('Error al registrar el proveedor rápido.', 'error')
    } finally {
      setCreandoProv(false)
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (parseFloat(form.monto_total) <= 0) {
      showToast('El monto total debe ser mayor a 0.', 'warning')
      return
    }

    setGuardando(true)
    showLoader()

    try {
      const formData = new FormData()

      const datosAEnviar = { ...form }
      if (!['Combustible', 'Peaje', 'Mantenimiento'].includes(form.tipo_gasto)) datosAEnviar.camion_asociado = ''
      if (form.tipo_gasto !== 'Viatico') datosAEnviar.conductor_asociado = ''

      Object.keys(datosAEnviar).forEach(key => {
        if (datosAEnviar[key]) formData.append(key, datosAEnviar[key])
      })

      if (comprobante) formData.append('comprobante_adjunto', comprobante)

      await apiClient.post('/api/finanzas/gastos-operativos/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      showToast('Gasto operativo registrado con éxito.', 'success')

      setForm({
        ...form,
        descripcion: '',
        proveedor: '',
        camion_asociado: '',
        conductor_asociado: '',
        despacho_asociado: '',
        numero_documento: '',
        monto_total: ''
      })
      setComprobante(null)
      const resGastos = await apiClient.get('/api/finanzas/gastos-operativos/')
      setGastos(resGastos.data.results || resGastos.data)

    } catch (error) {
      const msg = error.response?.data?.error || 'Error al guardar el egreso.'
      showToast(msg, 'error')
    } finally {
      setGuardando(false)
      hideLoader()
    }
  };

  const handleConfirmarPagoGasto = async (e) => {
    e.preventDefault()
    if (!gastoAPagarId) return

    setLiquidandoGasto(true)
    showLoader()

    try {
      const formData = new FormData()
      if (comprobantePago) {
        formData.append('comprobante_adjunto', comprobantePago)
      }

      await apiClient.patch(`/api/finanzas/gastos-operativos/${gastoAPagarId}/pagar/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      showToast('Gasto liquidado y cerrado con éxito.', 'success')

      setMostrarModalPagar(false)
      setGastoAPagarId(null)
      setComprobantePago(null)

      const resGastos = await apiClient.get('/api/finanzas/gastos-operativos/')
      setGastos(resGastos.data.results || resGastos.data)
    } catch (error) {
      const msg = error.response?.data?.error || 'No se pudo liquidar el gasto.'
      showToast(msg, 'error')
    } finally {
      setLiquidandoGasto(false)
      hideLoader()
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (provDropdownRef.current && !provDropdownRef.current.contains(event.target)) {
        setMostrarDropdownProv(false)
      }
    };
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 text-slate-700">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Layers className="w-5 h-5 text-indigo-600" />
          Módulo de Gastos Operativos
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="flex flex-col space-y-1 sm:col-span-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Search className="w-3 h-3" /> Buscar
              </label>
              <input
                type="text"
                placeholder="Glosa, proveedor, folio..."
                value={filtroBusqueda}
                onChange={(e) => setFiltroBusqueda(e.target.value)}
                className="border-slate-200 rounded-lg text-xs focus:ring-indigo-500 py-1.5"
              />
            </div>

            <div className="flex flex-col space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tipo Gasto</label>
              <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} className="border-slate-200 rounded-lg text-xs focus:ring-indigo-500 py-1.5">
                <option value="Todos">Todos los tipos</option>
                <option value="Combustible">Combustible</option>
                <option value="Peaje">Peaje</option>
                <option value="Mantenimiento">Mantenimiento</option>
                <option value="Viatico">Viático</option>
                <option value="Servicio Externo">Servicio Externo</option>
                <option value="Administrativo">Administrativo</option>
              </select>
            </div>

            <div className="flex flex-col space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Estado Liquidación</label>
              <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className="border-slate-200 rounded-lg text-xs focus:ring-indigo-500 py-1.5">
                <option value="Todos">Todos los estados</option>
                <option value="Pendiente">Pendiente de Pago</option>
                <option value="Pagado">Pagado</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-3.5">Fecha / Doc</th>
                    <th className="p-3.5">Clasificación</th>
                    <th className="p-3.5">Descripción</th>
                    <th className="p-3.5 text-center">Asociación</th>
                    <th className="p-3.5 text-right">Monto</th>
                    <th className="p-3.5 text-center">Estado</th>
                    <th className="p-3.5 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr><td colSpan="6" className="text-center py-8 text-slate-400">Cargando maestro de gastos...</td></tr>
                  ) : gastosFiltrados.length === 0 ? (
                    <tr><td colSpan="6" className="text-center py-8 text-slate-400">No se encontraron registros de gastos.</td></tr>
                  ) : (
                    gastosFiltrados.map(g => (
                      <tr key={g.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3.5">
                          <div className="font-bold text-slate-700">{g.fecha_gasto}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{g.numero_documento || 'S/F Folio'}</div>
                        </td>
                        <td className="p-3.5 font-semibold text-slate-600">{g.tipo_gasto}</td>
                        <td className="p-3.5">
                          <div className="font-medium text-slate-800 line-clamp-1">{g.descripcion}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">Prov: {g.proveedor_nombre}</div>
                        </td>
                        <td className="p-3.5 text-center">
                          {g.camion_patente && g.camion_patente !== 'N/A' && (
                            <span className="inline-block bg-amber-50 text-amber-800 font-bold px-2 py-0.5 rounded text-[10px] border border-amber-200">🚛 {g.camion_patente}</span>
                          )}
                          {g.nombre_completo && g.nombre_completo !== 'N/A' && (
                            <span className="inline-block bg-indigo-50 text-indigo-800 font-bold px-2 py-0.5 rounded text-[10px] border border-indigo-200">👤 {g.nombre_completo.split(' ')[0]}</span>
                          )}
                          {g.camion_patente === 'N/A' && g.nombre_completo === 'N/A' && (
                            <span className="text-slate-300 font-medium">-</span>
                          )}
                        </td>
                        <td className="p-3.5 text-right font-bold text-slate-900">${parseInt(g.monto_total).toLocaleString('es-CL')}</td>
                        <td className="p-3.5 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border ${g.estado === 'Pagado' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                            {g.estado}
                          </span>
                        </td>
                        <td className="p-3.5 text-center">
                          {g.estado === 'Pendiente' ? (
                            <button
                              type="button"
                              onClick={() => {
                                setGastoAPagarId(g.id);
                                setComprobantePago(null);
                                setMostrarModalPagar(true);
                              }}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-md text-[10px] shadow-sm transition-colors uppercase tracking-wider"
                            >
                              Pagar
                            </button>
                          ) : (
                            <span className="text-slate-400 italic text-[10px] font-medium">Cerrado</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="border-b border-slate-100 pb-2">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              Registro de Egreso
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex flex-col space-y-1">
              <label className="font-bold text-slate-500 uppercase tracking-wider">Clasificación</label>
              <select name="tipo_gasto" value={form.tipo_gasto} onChange={handleChange} className="border-slate-300 rounded-lg text-xs focus:ring-indigo-500 py-2">
                <option value="Combustible">⛽ Combustible</option>
                <option value="Peaje">🛣️ Peaje / TAG</option>
                <option value="Mantenimiento">🔧 Mantenimiento / Taller</option>
                <option value="Viatico">🥪 Viático de Conductor</option>
                <option value="Servicio Externo">🤝 Flete Externo / Proveedor</option>
                <option value="Administrativo">🏢 Gasto Administrativo</option>
              </select>
            </div>

            <div className="flex flex-col space-y-1">
              <label className="font-bold text-slate-500 uppercase tracking-wider">Fecha Movimiento</label>
              <input type="date" name="fecha_gasto" value={form.fecha_gasto} onChange={handleChange} className="border-slate-300 rounded-lg text-xs focus:ring-indigo-500 py-2" />
            </div>

            <div className="flex flex-col space-y-1">
              <label className="font-bold text-slate-500 uppercase tracking-wider">Monto ($)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">$</span>
                <input type="number" name="monto_total" placeholder="0" value={form.monto_total} onChange={handleChange} required className="w-full pl-7 border-slate-300 rounded-lg text-xs focus:ring-indigo-500 py-2 font-bold text-slate-800" />
              </div>
            </div>

            <div className="flex flex-col space-y-1">
              <label className="font-bold text-slate-500 uppercase tracking-wider">N° Documento (Folio)</label>
              <input type="text" name="numero_documento" placeholder="Ej. FACT-204" value={form.numero_documento} onChange={handleChange} className="border-slate-300 rounded-lg text-xs focus:ring-indigo-500 py-2" />
            </div>

            <div className="flex flex-col space-y-1">
              <label className="font-bold text-slate-500 uppercase tracking-wider">Glosa descriptiva</label>
              <textarea name="descripcion" placeholder="Detalle del gasto..." value={form.descripcion} onChange={handleChange} required rows="2" className="border-slate-300 rounded-lg text-xs focus:ring-indigo-500 py-2 resize-none" />
            </div>

            <div className="flex flex-col space-y-1 relative" ref={provDropdownRef}>
              <label className="font-bold text-slate-500">Proveedor / Emisor del Gasto</label>

              <div className="flex gap-1.5 items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar proveedor..."
                    value={proveedorBusqueda}
                    onChange={(e) => {
                      setProveedorBusqueda(e.target.value);
                      setMostrarDropdownProv(true);
                      if (e.target.value === '') setForm({ ...form, proveedor: '' });
                    }}
                    onFocus={() => setMostrarDropdownProv(true)}
                    className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-xs focus:ring-indigo-500 focus:border-indigo-500 bg-white font-medium"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setMostrarModalProv(true)}
                  className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg border border-indigo-200 transition-colors font-black text-xs shrink-0"
                  title="Registrar Proveedor Nuevo"
                >
                  +
                </button>
              </div>

              {mostrarDropdownProv && (
                <ul className="absolute left-0 right-10 top-[100%] mt-1 bg-white border border-slate-200 max-h-48 overflow-y-auto rounded-lg shadow-xl divide-y divide-slate-100 z-50">
                  {proveedoresFiltrados.length === 0 ? (
                    <li className="px-4 py-3 text-slate-400 text-center font-medium">No hay resultados.</li>
                  ) : (
                    proveedoresFiltrados.map(p => (
                      <li
                        key={p.id}
                        className={`px-4 py-2 text-xs cursor-pointer transition-colors flex flex-col ${String(form.proveedor) === String(p.id) ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-700 hover:bg-slate-50'}`}
                        onClick={() => {
                          setForm({ ...form, proveedor: p.id });
                          setProveedorBusqueda(p.nombre_proveedor);
                          setMostrarDropdownProv(false);
                        }}
                      >
                        <span className="truncate">{p.nombre_proveedor}</span>
                        {p.rut_proveedor && <span className="text-[9px] text-slate-400 font-normal mt-0.5">RUT: {p.rut_proveedor}</span>}
                      </li>
                    ))
                  )}
                </ul>
              )}
            </div>

            <div className="flex flex-col space-y-1">
              <label className="font-bold text-slate-500">Estado de Liquidación</label>
              <select name="estado" value={form.estado} onChange={handleChange} className="border-slate-300 rounded-lg text-xs bg-white py-1.5 font-semibold text-slate-700">
                <option value="Pendiente">❌ Por Pagar / Crédito</option>
                <option value="Pagado">✅ Pagado Inmediato</option>
              </select>
            </div>


            {['Combustible', 'Peaje', 'Mantenimiento'].includes(form.tipo_gasto) && (
              <div className="flex flex-col space-y-1 p-2.5 rounded-xl bg-amber-50 border border-amber-200 animate-fadeIn">
                <label className="font-bold text-amber-800 flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5" /> Vincular a Camión
                </label>
                <select name="camion_asociado" value={form.camion_asociado} onChange={handleChange} required className="border-slate-300 rounded-lg text-xs bg-white py-1.5 mt-1">
                  <option value="">-- Seleccionar Patente --</option>
                  {camiones.map(c => <option key={c.id_camion} value={c.id_camion}>{c.patente} ({c.modelo})</option>)}
                </select>
              </div>
            )}

            {form.tipo_gasto === 'Viatico' && (
              <div className="flex flex-col space-y-1 p-2.5 rounded-xl bg-indigo-50 border border-indigo-200 animate-fadeIn">
                <label className="font-bold text-indigo-800 flex items-center gap-1">
                  <User className="w-3.5 h-3.5" /> Conductor Beneficiario
                </label>
                <select name="conductor_asociado" value={form.conductor_asociado} onChange={handleChange} required className="border-slate-300 rounded-lg text-xs bg-white py-1.5 mt-1">
                  <option value="">-- Seleccionar Conductor --</option>
                  {conductores.map(c => <option key={c.id_conductor} value={c.id_conductor}>{c.nombre_completo}</option>)}
                </select>
              </div>
            )}

            <div className="flex flex-col space-y-1 pt-1">
              <label className={`font-bold uppercase tracking-wider ${form.estado !== 'Pagado' ? 'text-slate-300' : 'text-slate-500'}`}>
                Comprobante / Boleta Digital
              </label>
              <input
                type="file"
                accept=".pdf, image/*"
                disabled={form.estado !== 'Pagado'}
                onChange={(e) => setComprobante(e.target.files[0])}
                className="w-full text-[11px] text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              />
              {form.estado !== 'Pagado' && (
                <p className="text-[10px] text-amber-600 font-medium mt-0.5">Bloqueado: Solo se adjunta respaldo en pagos inmediatos.</p>
              )}
            </div>
          </div>

          <div className="pt-2">
            <button type="submit" disabled={guardando} className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-xs transition-colors disabled:opacity-50 tracking-wide uppercase shadow-sm">
              {guardando ? 'Guardando Egreso...' : 'Registrar Gasto'}
            </button>
          </div>
        </form>

      </div>
      {mostrarModalProv && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[100] animate-fadeIn">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl p-3 w-full max-w-xs space-y-4 text-xs">

            <div className="border-b border-slate-100 pb-2 text-center">
              <h4 className="text-sm font-bold text-slate-800">Proveedor de Gasto</h4>
              <p className="text-[10px] text-slate-400 mt-0.5">Crea entidades como Gasco, Copec o Talleres.</p>
            </div>

            <div className="space-y-3">
              <div className="flex flex-col space-y-1">
                <label className="font-bold text-slate-800 uppercase tracking-wider">Nombre / Razón Social</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Autopista Central"
                  value={nuevoProv.nombre_proveedor}
                  onChange={(e) => setNuevoProv({ ...nuevoProv, nombre_proveedor: e.target.value })}
                  className="border-slate-300 rounded-lg text-xs py-1.5 focus:ring-indigo-500 bg-slate-200 text-slate-800"
                />
              </div>

              <div className="flex flex-col space-y-1">
                <label className="font-bold text-slate-800 uppercase tracking-wider">RUT</label>
                <input
                  type="text"
                  placeholder="Ej. 96.918.220-3"
                  value={nuevoProv.rut_proveedor}
                  onChange={(e) => setNuevoProv({ ...nuevoProv, rut_proveedor: e.target.value })}
                  className="border-slate-300 rounded-lg text-xs py-1.5 focus:ring-indigo-500 bg-slate-200"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-1">
              <button
                type="button"
                onClick={() => {
                  setMostrarModalProv(false);
                  setNuevoProv({ nombre_proveedor: '', rut_proveedor: '' });
                }}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg font-bold text-slate-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={creandoProv || !nuevoProv.nombre_proveedor.trim()}
                onClick={handleCrearProveedorRapido}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold transition-colors disabled:opacity-40"
              >
                {creandoProv ? 'Guardando...' : 'Añadir'}
              </button>
            </div>

          </div>
        </div>
      )}

      {mostrarModalPagar && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[100] animate-fadeIn">
          <form onSubmit={handleConfirmarPagoGasto} className="bg-white rounded-xl border border-slate-200 shadow-2xl p-5 w-full max-w-sm space-y-4 text-xs">

            <div className="border-b border-slate-100 pb-2">
              <h4 className="text-sm font-bold text-slate-800">Confirmar Liquidación de Gasto</h4>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-800 leading-relaxed">
              Puedes adjuntar la transferencia bancaria o el recibo de caja. Si no dispones del archivo, presiona continuar; el registro se cerrará igualmente.
            </div>

            <div className="flex flex-col space-y-1">
              <label className="font-bold text-slate-500 uppercase tracking-wider">Comprobante de Pago (Opcional)</label>
              <input
                type="file"
                accept=".pdf, image/*"
                onChange={(e) => setComprobantePago(e.target.files[0])}
                className="w-full text-[11px] text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100 cursor-pointer"
              />
            </div>

            <div className="flex gap-2 justify-end pt-2 border-t border-slate-50">
              <button
                type="button"
                onClick={() => {
                  setMostrarModalPagar(false);
                  setGastoAPagarId(null);
                  setComprobantePago(null);
                }}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg font-bold text-slate-600 transition-colors"
              >
                Cerrar
              </button>
              <button
                type="submit"
                disabled={liquidandoGasto}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition-colors disabled:opacity-40 uppercase text-[10px] tracking-wider"
              >
                {liquidandoGasto ? 'Procesando...' : 'Confirmar Liquidación'}
              </button>
            </div>

          </form>
        </div>
      )}
    </div>
  );
}