import React, { useState, useEffect } from 'react';
import apiClient from '../../services/api';
import { Search, Plus, Edit, Trash2, X, Truck, AlertCircle, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function RamplaList() {
  const [ramplas, setRamplas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingRampla, setEditingRampla] = useState(null);
  const [formData, setFormData] = useState({
    patente: '',
    marca: '',
    modelo: '',
    anio: new Date().getFullYear(),
    estado_rampla: 'DISPONIBLE',
    capacidad_max_kg: '',
    capacidad_max_m3: ''
  });
  const [error, setError] = useState(null);

  const fetchRamplas = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/api/inventario/ramplas/');
      setRamplas(response.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRamplas();
  }, []);

  const filteredRamplas = ramplas.filter(rampla =>
    rampla.patente.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (rampla.marca && rampla.marca.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (rampla.modelo && rampla.modelo.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleOpenModal = (rampla = null) => {
    setError(null);
    if (rampla) {
      setEditingRampla(rampla);
      setFormData({
        patente: rampla.patente,
        marca: rampla.marca || '',
        modelo: rampla.modelo || '',
        anio: rampla.anio || new Date().getFullYear(),
        estado_rampla: rampla.estado_rampla || 'DISPONIBLE',
        capacidad_max_kg: rampla.capacidad_max_kg,
        capacidad_max_m3: rampla.capacidad_max_m3
      });
    } else {
      setEditingRampla(null);
      setFormData({
        patente: '',
        marca: '',
        modelo: '',
        anio: new Date().getFullYear(),
        estado_rampla: 'DISPONIBLE',
        capacidad_max_kg: '',
        capacidad_max_m3: ''
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingRampla(null);
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      if (editingRampla) {
        await apiClient.put(`/api/inventario/ramplas/${editingRampla.id_rampla}/`, formData);
      } else {
        await apiClient.post('/api/inventario/ramplas/', formData);
      }
      handleCloseModal();
      fetchRamplas();
    } catch (err) {
      console.error(err);
      setError("Error al guardar. Verifica que la patente no esté duplicada.");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Está seguro de eliminar esta rampla?')) {
      try {
        await apiClient.delete(`/api/inventario/ramplas/${id}/`);
        fetchRamplas();
      } catch (err) {
        alert("Error al eliminar la rampla. Puede que esté asociada a un despacho.");
      }
    }
  };

  // --- RENDERIZADO ---
  if (loading) return <div className="p-8 text-center">Cargando ramplas...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link to="/catalogos" className=" text-gray-500 transition shadow-sm">
        <ArrowLeft className="w-7 h-7" />
      </Link>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Catálogo de Ramplas</h1>
        <p className="text-gray-600">Gestiona los remolques y sus capacidades de carga</p>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
        {/* BARRA DE HERRAMIENTAS */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por placa, marca o modelo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"
            />
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium shadow-sm"
          >
            <Plus className="w-5 h-5" />
            Nueva Rampla
          </button>
        </div>

        {/* TABLA */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left py-4 px-4 text-sm font-semibold text-gray-600">Patente</th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-gray-600">Marca / Modelo</th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-gray-600">Capacidades</th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-gray-600">Año</th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-gray-600">Estado</th>
                <th className="text-right py-4 px-4 text-sm font-semibold text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredRamplas.map((rampla) => (
                <tr key={rampla.id_rampla} className="border-b border-gray-100 hover:bg-gray-50 transition">
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                        <Truck className="w-5 h-5" />
                      </div>
                      <span className="font-medium text-gray-900">{rampla.patente}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-gray-700">
                    {rampla.marca} <span className="text-gray-400">•</span> {rampla.modelo}
                  </td>
                  <td className="py-4 px-4">
                    <div className="text-sm">
                      <p><span className="font-medium">{rampla.capacidad_max_kg}</span> Kg</p>
                      <p className="text-gray-500 text-xs">{rampla.capacidad_max_m3} m³</p>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-gray-600">{rampla.anio || '-'}</td>
                  <td className="py-4 px-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${rampla.estado_rampla === 'DISPONIBLE' ? 'bg-green-100 text-green-700' :
                        rampla.estado_rampla === 'EN_USO' ? 'bg-blue-100 text-blue-700' :
                          'bg-red-100 text-red-700'
                      }`}>
                      {rampla.estado_rampla?.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleOpenModal(rampla)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title="Editar"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(rampla.id_rampla)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredRamplas.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No se encontraron ramplas.
            </div>
          )}
        </div>
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                {editingRampla ? 'Editar Rampla' : 'Nueva Rampla'}
              </h2>
              <button onClick={handleCloseModal} className="p-2 hover:bg-gray-100 rounded-full transition text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-center gap-2">
                <AlertCircle size={16} /> {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Patente (Placa)</label>
                <input
                  type="text"
                  value={formData.patente}
                  onChange={(e) => setFormData({ ...formData, patente: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="ABC-123"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Marca</label>
                  <input
                    type="text"
                    value={formData.marca}
                    onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="Tremac"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Modelo</label>
                  <input
                    type="text"
                    value={formData.modelo}
                    onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="Plana 3 Ejes"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cap. (Kg)</label>
                  <input
                    type="number"
                    value={formData.capacidad_max_kg}
                    onChange={(e) => setFormData({ ...formData, capacidad_max_kg: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    step="0.01"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cap. (m³)</label>
                  <input
                    type="number"
                    value={formData.capacidad_max_m3}
                    onChange={(e) => setFormData({ ...formData, capacidad_max_m3: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    step="0.01"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Año</label>
                  <input
                    type="number"
                    value={formData.anio}
                    onChange={(e) => setFormData({ ...formData, anio: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                  <select
                    value={formData.estado_rampla}
                    onChange={(e) => setFormData({ ...formData, estado_rampla: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                  >
                    <option value="DISPONIBLE">Disponible</option>
                    <option value="EN_USO">En Uso</option>
                    <option value="MANTENIMIENTO">Mantenimiento</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium shadow-md"
                >
                  {editingRampla ? 'Guardar Cambios' : 'Crear Rampla'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}