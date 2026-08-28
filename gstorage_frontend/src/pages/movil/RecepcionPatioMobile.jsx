import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { clearTokenEnMemoria } from '../../services/api'

const ZONAS_DESTINO = {
  TODOS: [],
  IQUIQUE: ['iquique', 'alto hospicio'],
  ANTOFAGASTA: ['antofagasta', 'mejillones', 'tocopilla', 'calama'],
  COPIAPO: ['copiapó', 'copiapo'],
}

export default function RecepcionPatioMobile() {
  document.title = "Transfer - GStorage"
  const [listaDespachos, setListaDespachos] = useState([])
  const [despachoId, setDespachoId] = useState('')
  const [despachoInfo, setDespachoInfo] = useState(null)
  const [mercancias, setMercancias] = useState([])

  const { logout } = useAuth()
  const navigate = useNavigate()

  const [filtroZonaMercancia, setFiltroZonaMercancia] = useState('TODOS')

  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [draftRestoredMsg, setDraftRestoredMsg] = useState(false)

  const [itemEnEdicion, setItemEnEdicion] = useState(null)

  useEffect(() => {
    obtenerDespachosDisponibles()
    const borradorGuardado = sessionStorage.getItem('patio_transfer_draft')
    if (borradorGuardado) {
      try {
        const draft = JSON.parse(borradorGuardado)
        if (draft.despachoInfo && draft.mercancias && draft.mercancias.length > 0) {
          setDespachoId(draft.despachoId)
          setDespachoInfo(draft.despachoInfo)
          setMercancias(draft.mercancias)
          setDraftRestoredMsg(true)
        }
      } catch (e) {
        sessionStorage.removeItem('patio_transfer_draft')
      }
    }
  }, [])

  useEffect(() => {
    if (despachoInfo && mercancias.length > 0) {
      sessionStorage.setItem('patio_transfer_draft', JSON.stringify({
        despachoId,
        despachoInfo,
        mercancias,
      }))
    }
  }, [despachoInfo, mercancias, despachoId])

  const descartarBorrador = () => {
    sessionStorage.removeItem('patio_transfer_draft')
    setDespachoInfo(null)
    setMercancias([])
    setDespachoId('')
    setDraftRestoredMsg(false)
  }

  const obtenerDespachosDisponibles = async () => {
    try {
      const res = await axios.get('/api/inventario/despachos/disponibles-patio/')
      setListaDespachos(res.data)
    } catch (err) {
      console.error('Error al cargar lista de despachos:', err)
    }
  }

  const cargarDespacho = async (id) => {
    if (!id) return
    setLoading(true)
    setErrorMsg('')
    setSuccessMsg('')
    setDraftRestoredMsg(false)
    sessionStorage.removeItem('patio_transfer_draft')

    try {
      const res = await axios.get(`/api/inventario/despachos/${id}/mercancias-patio/`)
      setDespachoInfo(res.data.despacho)

      const itemsConValidacion = res.data.mercancias.map((item) => {
        const estaEnObservacion = item.estado === 'En Observacion'
        return {
          ...item,
          bultos_recibidos: estaEnObservacion ? (item.bultos_recibidos || 0) : item.cantidad_bultos,
          kg_recibidos: estaEnObservacion ? (item.kg_recibidos || 0) : item.kg,
          m3_recibidos: estaEnObservacion ? (item.m3_recibidos || 0) : item.m3,
          tipo_recibido: item.tipo || '',
          conforme: !estaEnObservacion,
          observacion: item.motivo_baja || item.observacion || '',
          revisado: estaEnObservacion,
        }
      })

      setMercancias(itemsConValidacion)
    } catch (err) {
      console.error(err)
      setErrorMsg(
        err.response?.data?.detail || 'No se pudo cargar el despacho o no tiene mercancías pendientes.'
      )
      setDespachoInfo(null)
      setMercancias([])
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    if (!window.confirm('¿Seguro que deseas cerrar tu sesión de patio?')) return

    try {
      sessionStorage.removeItem('patio_transfer_draft')
      clearTokenEnMemoria()
      localStorage.clear()
      if (logout) {
        await logout()
      }
    } catch (err) {
      console.error("Error al cerrar sesión:", err)
    } finally {
      window.location.href = '/login-express'
    }
  }

  const marcarConforme = (id_mercancia) => {
    setMercancias((prev) =>
      prev.map((item) => {
        if (item.id_mercancia === id_mercancia) {
          return {
            ...item,
            bultos_recibidos: item.cantidad_bultos,
            kg_recibidos: item.kg,
            m3_recibidos: item.m3,
            conforme: true,
            observacion: '',
            revisado: true,
          }
        }
        return item
      })
    )
  }

  const abrirAjuste = (item) => {
    setItemEnEdicion({ ...item })
  }

  const guardarAjuste = () => {
    setMercancias((prev) =>
      prev.map((item) => {
        if (item.id_mercancia === itemEnEdicion.id_mercancia) {
          return {
            ...itemEnEdicion,
            revisado: true,
          }
        }
        return item
      })
    )
    setItemEnEdicion(null)
  }

  const mercanciasFiltradas = mercancias.filter((m) => {
    if (filtroZonaMercancia === 'TODOS') return true
    const destinoStr = (m.nombre_destino || '').toLowerCase()
    const ciudadesValidas = ZONAS_DESTINO[filtroZonaMercancia] || []
    return ciudadesValidas.some((ciudad) => destinoStr.includes(ciudad))
  })

  const revisadosFiltradosCount = mercanciasFiltradas.filter((m) => m.revisado).length
  const conformesFiltradosCount = mercanciasFiltradas.filter((m) => m.revisado && m.conforme).length
  const obsFiltradosCount = mercanciasFiltradas.filter((m) => m.revisado && !m.conforme).length

  const finalizarTransferZona = async () => {
    if (mercanciasFiltradas.length === 0) return

    const sinRevisar = mercanciasFiltradas.filter((m) => !m.revisado)
    if (sinRevisar.length > 0) {
      const msj = filtroZonaMercancia === 'TODOS'
        ? `Quedan ${sinRevisar.length} cargas sin revisar en total. ¿Deseas marcarlas como conformes y recepcionar?`
        : `Quedan ${sinRevisar.length} cargas sin revisar para la zona [${filtroZonaMercancia}]. ¿Deseas marcarlas como conformes y recepcionar?`

      if (!window.confirm(msj)) return
    }

    setSubmitting(true)
    setErrorMsg('')
    try {
      const payload = {
        items: mercanciasFiltradas.map((m) => ({
          id_mercancia: m.id_mercancia,
          bultos_recibidos: parseInt(m.bultos_recibidos || 0, 10),
          kg_recibidos: parseFloat(m.kg_recibidos || 0),
          m3_recibidos: parseFloat(m.m3_recibidos || 0),
          tipo_recibido: m.tipo_recibido,
          conforme: m.conforme,
          observacion: m.observacion,
        })),
      }

      const res = await axios.post(`/api/inventario/despachos/${despachoId}/procesar-transfer/`, payload)
      setSuccessMsg(res.data.message || `Recepción finalizada con éxito.`)
      sessionStorage.removeItem('patio_transfer_draft')
      setDraftRestoredMsg(false)

      if (res.data.despacho_finalizado) {
        setDespachoInfo(null)
        setMercancias([])
        setDespachoId('')
        obtenerDespachosDisponibles()
      } else {
        cargarDespacho(despachoId)
      }
    } catch (err) {
      console.error(err)
      setErrorMsg(err.response?.data?.message || err.response?.data?.detail || 'Ocurrió un error al procesar el transfer.')
    } finally {
      setSubmitting(false)
    }
  }
  return (
    <div className="max-w-xl mx-auto p-4 font-sans">
      <div className="bg-slate-800 text-white p-4 rounded-xl mb-4 flex justify-between items-center shadow-md">
        <button
          onClick={() => navigate('/operaciones')}
          className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
          title="Volver a Operaciones"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          <span>Volver</span>
        </button>
        <div>
          <h2 className="m-0 text-lg font-bold">Transfer / Patio</h2>
        </div>

        <button
          onClick={handleLogout}
          className="bg-red-700/20 hover:bg-red-800/30 text-red-300 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
          title="Cerrar Sesión"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
          Salir
        </button>
      </div>

      {draftRestoredMsg && (
        <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg mb-4 text-xs flex justify-between items-center">
          <span><strong>Avance restaurado:</strong> Se recuperaron los datos del Despacho #{despachoInfo?.nombre_ruta || despachoId}.</span>
          <button
            onClick={descartarBorrador}
            className="bg-blue-100 border-none px-2 py-1 rounded text-blue-800 font-bold text-xs cursor-pointer hover:bg-blue-200"
          >
            Limpiar
          </button>
        </div>
      )}
      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-300 text-red-800 rounded-lg mb-4 text-sm">
          ⚠️ {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="p-3 bg-green-50 border border-green-300 text-green-800 rounded-lg mb-4 text-sm">
          ✅ {successMsg}
        </div>
      )}

      {!despachoInfo && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4">
          <select
            value={despachoId}
            onChange={(e) => {
              const id = e.target.value;
              setDespachoId(id);
              if (id) cargarDespacho(id);
            }}
            disabled={loading}
            className="w-full p-3 text-center text-base rounded-lg border border-slate-300 bg-white text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
          >
            <option value="">-- {loading ? 'Cargando...' : 'Seleccionar Despacho'} --</option>
            {listaDespachos.map((d) => (
              <option key={d.id_despacho} value={d.id_despacho}>
                Ruta #{d.nombre_ruta} - [{d.estado || d.estado_despacho}] {d.destino !== 'Sin Destino' ? `${d.destino}` : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {despachoInfo && (
        <>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 px-4 mb-4">
            <div className="flex justify-between items-center">
              <div>
                <strong className="text-lg text-blue-800">
                  Despacho #{despachoInfo.nombre_ruta || despachoInfo.id_despacho}
                </strong>
                <div className="text-xs text-blue-700 font-medium">Destino: {despachoInfo.destino}</div>
              </div>
              <button
                onClick={descartarBorrador}
                className="bg-transparent border border-blue-300 px-3 py-1.5 rounded-md text-blue-800 text-xs cursor-pointer hover:bg-blue-100 font-semibold"
              >
                Cambiar Camión
              </button>
            </div>

            <div className="mt-3">
              <div className="flex justify-between text-xs text-slate-700 mb-1">
                <span>Progreso ({filtroZonaMercancia}): {revisadosFiltradosCount} de {mercanciasFiltradas.length}</span>
                <span>{Math.round((revisadosFiltradosCount / (mercanciasFiltradas.length || 1)) * 100)}%</span>
              </div>
              <div className="w-full bg-blue-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-blue-600 h-full transition-all duration-300"
                  style={{ width: `${(revisadosFiltradosCount / (mercanciasFiltradas.length || 1)) * 100}%` }}
                />
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-3 mb-4">
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { id: 'TODOS', label: 'Todas' },
                { id: 'COPIAPO', label: 'Copiapó' },
                { id: 'ANTOFAGASTA', label: 'Antofagasta' },
                { id: 'IQUIQUE', label: 'Iquique' },
              ].map((zona) => {
                const activo = filtroZonaMercancia === zona.id;
                return (
                  <button
                    key={zona.id}
                    onClick={() => setFiltroZonaMercancia(zona.id)}
                    className={`py-2 px-1 text-xs font-bold rounded-md border transition-colors cursor-pointer ${activo
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-slate-300 bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                  >
                    {zona.label}
                  </button>
                );
              })}
            </div>
            <div className="mt-2 text-xs text-slate-500 text-right">
              Pendientes: <strong>{mercanciasFiltradas.length}</strong> bultos
            </div>
          </div>
          <div className="flex flex-col gap-3 mb-6">
            {mercanciasFiltradas.length === 0 ? (
              <div className="text-center p-6 text-slate-400 bg-slate-50 rounded-xl">
                No hay mercancías pendientes en este despacho.
              </div>
            ) : (
              mercanciasFiltradas.map((m) => {
                const esRevisado = m.revisado;
                const esConforme = m.conforme;
                return (
                  <div
                    key={m.id_mercancia}
                    className={`border rounded-xl p-3.5 shadow-sm transition-colors ${!esRevisado
                      ? 'border-slate-200 bg-white'
                      : esConforme
                        ? 'border-green-300 bg-green-50/50'
                        : 'border-amber-300 bg-amber-50/50'
                      }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2 py-0.5 rounded">
                          CÓD: {m.codigo_interno || `#${m.id_mercancia}`}
                        </span>
                        <h4 className="m-0 mt-1 text-base font-semibold text-slate-900">{m.nombre_cliente}</h4>
                      </div>
                      {esRevisado && (
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${esConforme ? 'text-green-800 bg-green-100' : 'text-amber-800 bg-amber-100'
                          }`}>
                          {esConforme ? '✓ CONFORME' : '⚠️ EN OBSERVACIÓN'}
                        </span>
                      )}
                    </div>

                    <div className="text-xs font-bold text-blue-600 mb-1">
                      Destino: {m.nombre_destino || 'No especificado'}
                    </div>

                    <div className="text-xs text-slate-500 mb-2.5">
                      <strong>Tipo:</strong> {m.tipo || 'Carga General'} {m.descripcion_carga && `| ${m.descripcion_carga}`}
                    </div>

                    <div className="bg-white/70 rounded-lg p-2 text-xs grid grid-cols-3 gap-1 text-center mb-3 border border-slate-300">
                      <div>
                        <div className="text-slate-500 text-[10px]">Bultos</div>
                        <strong>{m.bultos_recibidos}</strong> <span className="text-[10px] text-slate-400">({m.cantidad_bultos})</span>
                      </div>
                      <div>
                        <div className="text-slate-500 text-[10px]">Kg</div>
                        <strong>{m.kg_recibidos}</strong> <span className="text-[10px] text-slate-400">({m.kg})</span>
                      </div>
                      <div>
                        <div className="text-slate-500 text-[10px]">m³</div>
                        <strong>{m.m3_recibidos}</strong> <span className="text-[10px] text-slate-400">({m.m3})</span>
                      </div>
                    </div>

                    {!esConforme && m.observacion && (
                      <div className="text-xs text-amber-900 bg-amber-100/60 p-2 rounded-lg italic mb-2.5">
                        Novedad: "{m.observacion}"
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => marcarConforme(m.id_mercancia)}
                        className={`p-2.5 text-white font-bold text-sm rounded-lg border-none cursor-pointer transition-colors ${esRevisado && esConforme ? 'bg-green-600' : 'bg-green-500 hover:bg-green-600'
                          }`}
                      >
                        Conforme
                      </button>
                      <button
                        onClick={() => abrirAjuste(m)}
                        className={`p-2.5 text-white font-bold text-sm rounded-lg border-none cursor-pointer transition-colors ${!esConforme ? 'bg-amber-600' : 'bg-slate-700 hover:bg-slate-800'
                          }`}
                      >
                        {esRevisado && !esConforme ? 'Editar Novedad' : 'Ajustar / Falta'}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="sticky bottom-4 bg-white p-3 rounded-xl shadow-lg border border-slate-200">
            <button
              onClick={finalizarTransferZona}
              disabled={submitting || mercanciasFiltradas.length === 0}
              className={`w-full p-3.5 text-white font-bold text-base rounded-lg border-none transition-colors ${mercanciasFiltradas.length === 0
                ? 'bg-slate-400 cursor-not-allowed'
                : 'bg-slate-900 hover:bg-slate-800 cursor-pointer'
                }`}
            >
              {submitting
                ? 'Procesando Recepción...'
                : `Finalizar Recepción (${conformesFiltradosCount} Conformes, ${obsFiltradosCount} Observados)`}
            </button>
          </div>
        </>
      )}

      {itemEnEdicion && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md rounded-2xl p-5 max-h-[90vh] overflow-y-auto">
            <h3 className="mt-0 text-slate-900 font-bold text-lg">
              Modificar Carga {itemEnEdicion.codigo_interno || `#${itemEnEdicion.id_mercancia}`}
            </h3>

            <div className="mb-3">
              <label className="block text-xs font-bold mb-1 text-slate-700">Bultos Recibidos:</label>
              <input
                type="number"
                value={itemEnEdicion.bultos_recibidos}
                onChange={(e) => setItemEnEdicion({ ...itemEnEdicion, bultos_recibidos: e.target.value })}
                className="w-full p-2.5 rounded-lg border border-slate-300 text-base outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div className="mb-3">
              <label className="block text-xs font-bold mb-1 text-slate-700">Kg Recibidos:</label>
              <input
                type="number"
                step="0.01"
                value={itemEnEdicion.kg_recibidos}
                onChange={(e) => setItemEnEdicion({ ...itemEnEdicion, kg_recibidos: e.target.value })}
                className="w-full p-2.5 rounded-lg border border-slate-300 text-base outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div className="mb-3">
              <label className="block text-xs font-bold mb-1 text-slate-700">m³ Recibidos:</label>
              <input
                type="number"
                step="0.001"
                value={itemEnEdicion.m3_recibidos}
                onChange={(e) => setItemEnEdicion({ ...itemEnEdicion, m3_recibidos: e.target.value })}
                className="w-full p-2.5 rounded-lg border border-slate-300 text-base outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div className="mb-3 bg-amber-50 border border-amber-200 p-2.5 rounded-lg">
              <label className="flex items-center gap-2 text-sm cursor-pointer font-bold text-amber-900">
                <input
                  type="checkbox"
                  checked={!itemEnEdicion.conforme}
                  onChange={(e) =>
                    setItemEnEdicion({
                      ...itemEnEdicion,
                      conforme: !e.target.checked,
                      bultos_recibidos: e.target.checked ? 0 : itemEnEdicion.cantidad_bultos,
                      kg_recibidos: e.target.checked ? 0 : itemEnEdicion.kg,
                      m3_recibidos: e.target.checked ? 0 : itemEnEdicion.m3,
                    })
                  }
                />
                Marcar como NO CONFORME / Carga Faltante
              </label>
            </div>

            <div className="mb-5">
              <label className="block text-xs font-bold mb-1 text-slate-700">Observación / Motivo:</label>
              <textarea
                rows="3"
                placeholder="Ej: Carga no venía en el transporte..."
                value={itemEnEdicion.observacion}
                onChange={(e) => setItemEnEdicion({ ...itemEnEdicion, observacion: e.target.value })}
                className="w-full p-2.5 rounded-lg border border-slate-300 text-sm font-sans outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setItemEnEdicion(null)}
                className="p-3 bg-slate-400 text-white border-none rounded-lg font-bold cursor-pointer hover:bg-slate-500"
              >
                Cancelar
              </button>
              <button
                onClick={guardarAjuste}
                className="p-3 bg-blue-600 text-white border-none rounded-lg font-bold cursor-pointer hover:bg-blue-700"
              >
                Guardar Ajuste
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}