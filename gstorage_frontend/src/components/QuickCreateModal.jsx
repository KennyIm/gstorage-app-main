import React, { useState, useEffect } from 'react';
import apiClient from '../services/api';
import { X, Save, Package } from 'lucide-react';

export default function QuickCreateModal({ ubicacion, onClose, onSuccess }) {
  const [clientes, setClientes] = useState([]);
  const [destinos, setDestinos] = useState([]);
  
  const [formData, setFormData] = useState({
    id_cliente: '',
    id_destino: '',
    descripcion_carga: '',
    cantidad_bultos: 1,
    kg: '',
    m3: ''
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadCatalogs = async () => {
      try {
        const [cliRes, destRes] = await Promise.all([
          apiClient.get('/api/inventario/clientes/'),
          apiClient.get('/api/inventario/destinos/')
        ]);
        setClientes(cliRes.data);
        setDestinos(destRes.data);
      } catch (err) {
        console.error("Error cargando catálogos");
      }
    };
    loadCatalogs();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      ...formData,
      id_ubicacion_actual: ubicacion.id, 
      estado: 'En Bodega'
    };

    try {
      await apiClient.post('/api/inventario/mercancias/', payload);
      onSuccess(); 
      onClose();
    } catch (err) {
      alert("Error al crear: " + JSON.stringify(err.response?.data));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200">
        
        {/* Header */}
        <div className="bg-indigo-600 p-4 flex justify-between items-center text-white">
          <div className="flex items-center gap-2">
            <Package size={20} />
            <h5 className="m-0 font-bold">Nueva Carga en {ubicacion.codigo}</h5>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white"><X size={20} /></button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-600 uppercase">Cliente</label>
              <select name="id_cliente" className="form-select form-select-sm" onChange={handleChange} required>
                <option value="">Seleccionar...</option>
                {clientes.map(c => <option key={c.id_cliente} value={c.id_cliente}>{c.nombre_cliente}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 uppercase">Destino</label>
              <select name="id_destino" className="form-select form-select-sm" onChange={handleChange} required>
                <option value="">Seleccionar...</option>
                {destinos.map(d => <option key={d.id_destino} value={d.id_destino}>{d.nombre_ciudad}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-600 uppercase">Descripción</label>
            <input type="text" name="descripcion_carga" className="form-control form-control-sm" placeholder="Ej: Cajas de electrónicos" onChange={handleChange} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-600 uppercase">Bultos</label>
              <input type="number" name="cantidad_bultos" className="form-control form-control-sm" defaultValue="1" min="1" onChange={handleChange} required />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 uppercase">Kg</label>
              <input type="number" name="kg" className="form-control form-control-sm" step="0.1" onChange={handleChange} />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 uppercase">m³</label>
              <input type="number" name="m3" className="form-control form-control-sm" step="0.01" onChange={handleChange} />
            </div>
          </div>

          <div className="pt-2">
            <button type="submit" disabled={loading} className="btn btn-primary w-100 d-flex items-center justify-content-center gap-2">
              <Save size={16} /> {loading ? 'Creando...' : 'Crear y Ubicar'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}