import React, { useState, useEffect } from 'react'
import apiClient from '../services/api'
import { useUI } from '../context/UIContext'
import { Upload, FileText, Image as ImageIcon, X, Loader2, CheckCircle2, CheckSquare, Square, Layers } from 'lucide-react'

export default function SubirComprobanteModal({ mercanciaSeleccionada, todasLasMercancias, idDespacho, isOpen, onClose, onSuccess }) {
  const [archivo, setArchivo] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [observaciones, setObservaciones] = useState('')
  const [subiendo, setSubiendo] = useState(false)
  const [idsSeleccionados, setIdsSeleccionados] = useState([])
  const [mercanciasRelacionadas, setMercanciasRelacionadas] = useState([])
  const { showToast } = useUI()
  useEffect(() => {
    if (mercanciaSeleccionada && todasLasMercancias) {
      const facturaActual = mercanciaSeleccionada.numero_orden_entrega
      const relacionadas = todasLasMercancias.filter(m => 
        facturaActual && m.numero_orden_entrega === facturaActual
      )
      const listaFinal = relacionadas.length > 0 ? relacionadas : [mercanciaSeleccionada]
      setMercanciasRelacionadas(listaFinal)
      setIdsSeleccionados(listaFinal.map(m => m.id_mercancia))
    }
  }, [mercanciaSeleccionada, todasLasMercancias])
  if (!isOpen || !mercanciaSeleccionada) return null
  const toggleSeleccion = (id) => {
    setIdsSeleccionados(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    )
  }
  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return

    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
    if (!validTypes.includes(file.type)) {
      showToast('Formato no permitido. Usa PDF o imágenes.', 'error')
      return
    }
    setArchivo(file)
    if (file.type.startsWith('image/')) {
      setPreviewUrl(URL.createObjectURL(file))
    } else {
      setPreviewUrl(null)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!archivo) {
      showToast('Por favor selecciona un archivo.', 'error')
      return
    }

    if (idsSeleccionados.length === 0) {
      showToast('Debes seleccionar al menos una mercancía para asociar el comprobante.', 'error')
      return
    }
    setSubiendo(true)
    const formData = new FormData()
    formData.append('despacho', idDespacho)
    formData.append('archivo', archivo)
    if (observaciones) formData.append('observaciones', observaciones)
    idsSeleccionados.forEach(id => {
      formData.append('mercancia_ids', id)
    })
    try {
      await apiClient.post('/api/seguimiento/comprobantes/subir-masivo/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      showToast(`Comprobante guardado y aplicado a ${idsSeleccionados.length} mercancías.`, 'success')
      if (onSuccess) onSuccess()
      onClose()
    } catch (err) {
      console.error('Error al subir comprobante masivo:', err)
      showToast('Error al asociar el comprobante de entrega.', 'error')
    } finally {
      setSubiendo(false)
    }
  }
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in duration-200">
        
        <div className="bg-slate-800 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-base">Adjuntar Comprobante</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {mercanciasRelacionadas.length > 1 && (
            <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs">
                <Layers className="w-4 h-4 text-indigo-600" />
                <span>N° de Orden {mercanciaSeleccionada.numero_orden_entrega} ({mercanciasRelacionadas.length} Ítems)</span>
              </div>
              <p className="text-[11px] text-indigo-700">
                Selecciona las mercancías que se entregaron con este comprobante:
              </p>
              <div className="max-h-36 overflow-y-auto space-y-1.5 pt-1">
                {mercanciasRelacionadas.map((m) => {
                  const isChecked = idsSeleccionados.includes(m.id_mercancia);
                  return (
                    <div
                      key={m.id_mercancia}
                      onClick={() => toggleSeleccion(m.id_mercancia)}
                      className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition ${
                        isChecked 
                          ? 'bg-white border-indigo-300 text-slate-800 shadow-2xs' 
                          : 'bg-slate-100/60 border-slate-200 text-slate-400 line-through'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-indigo-600 shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400 shrink-0" />
                        )}
                        <span className="font-semibold truncate">
                          {m.descripcion_carga || `Mercancía #${m.codigo_interno}`}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold bg-slate-100 px-2 py-0.5 rounded-md text-slate-600 shrink-0 ml-2">
                        {m.cantidad_bultos} {m.tipo}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <div className="relative border-2 border-dashed border-slate-300 rounded-xl p-4 text-center hover:border-indigo-500 transition-colors bg-slate-50">
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            {archivo ? (
              <div className="flex flex-col items-center gap-1">
                {archivo.type === 'application/pdf' ? (
                  <FileText className="w-10 h-10 text-red-500" />
                ) : previewUrl ? (
                  <img src={previewUrl} alt="Preview" className="h-24 object-contain rounded-lg border" />
                ) : (
                  <ImageIcon className="w-10 h-10 text-indigo-500" />
                )}
                <span className="text-xs font-semibold text-slate-800 truncate max-w-[250px]">{archivo.name}</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1.5 text-slate-500 py-3">
                <Upload className="w-7 h-7 text-slate-400" />
                <p className="text-xs font-medium">Click para subir <span className="font-bold text-slate-700">Foto o PDF</span> del comprobante</p>
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Observaciones</label>
            <textarea
              rows={2}
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Ej: Entrega conforme de orden completa..."
              className="w-full p-2 text-xs border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={subiendo || !archivo || idsSeleccionados.length === 0}
              className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
            >
              {subiendo ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Aplicar({idsSeleccionados.length})
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}