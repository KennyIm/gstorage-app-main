import React, { useState, useEffect } from 'react';
import apiClient from '../../services/api';
import { Link } from 'react-router-dom';
import { useUI } from '../../context/UIContext';
import { Search, Plus, Edit, Trash2, X, Truck, AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';

export default function CamionList() {
  document.title = "Gestión de Camiones - GStorage";
  const [trucks, setTrucks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { showLoader, hideLoader, showToast } = useUI();

  const [showModal, setShowModal] = useState(false);
  const [editingTruck, setEditingTruck] = useState(null);
  const [formData, setFormData] = useState({
    patente: '',
    marca: '',
    modelo: '',
    anio: new Date().getFullYear(),
    estado_camion: 'DISPONIBLE',
  });
  const [error, setError] = useState(null);

  const fetchTrucks = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/api/inventario/camiones/');
      setTrucks(response.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      showToast('Error al cargar los datos', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrucks();
  }, []);

  const filteredTrucks = trucks.filter(truck =>
    truck.patente.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (truck.marca && truck.marca.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (truck.modelo && truck.modelo.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleOpenModal = (truck = null) => {
    setError(null);
    if (truck) {
      setEditingTruck(truck);
      setFormData({
        patente: truck.patente,
        marca: truck.marca || '',
        modelo: truck.modelo || '',
        anio: truck.anio || new Date().getFullYear(),
        estado_camion: truck.estado_camion || 'DISPONIBLE',
      });
    } else {
      setEditingTruck(null);
      setFormData({
        patente: '',
        marca: '',
        modelo: '',
        anio: new Date().getFullYear(),
        estado_camion: 'DISPONIBLE',
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingTruck(null);
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    showLoader();
    try {
      if (editingTruck) {
        await apiClient.put(`/api/inventario/camiones/${editingTruck.id_camion}/`, formData);
        showToast('Registro actualizado con éxito', 'success');
      } else {
        await apiClient.post('/api/inventario/camiones/', formData);
        showToast('Registro creado con éxito', 'success');
      }
      handleCloseModal();
      fetchTrucks();
    } catch (err) {
      console.error(err);
      showToast('Error al guardar. Revisa los datos.', 'error');
    } finally {
      hideLoader();
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Está seguro de eliminar este camión?')) {
      try {
        await apiClient.delete(`/api/inventario/camiones/${id}/`);
        showToast('Registro eliminado', 'success');
        fetchTrucks();
      } catch (err) {
        showToast('No se pudo eliminar.', 'error');
      } finally {
        hideLoader();
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-500">
        <Loader2 className="w-10 h-10 animate-spin mb-4 text-indigo-600" />
        <p>Cargando camiones...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Camiones</h1>
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
            Nuevo Camión
          </button>
        </div>

        {/* TABLA */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left py-4 px-4 text-sm font-semibold text-gray-600">Placa</th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-gray-600">Marca / Modelo</th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-gray-600">Año</th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-gray-600">Estado</th>
                <th className="text-right py-4 px-4 text-sm font-semibold text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredTrucks.map((truck) => (
                <tr key={truck.id_camion} className="border-b border-gray-100 hover:bg-gray-50 transition">
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                        <Truck className="w-5 h-5" />
                      </div>
                      <span className="font-medium text-gray-900">{truck.patente}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-gray-700">
                    {truck.marca} <span className="text-gray-400">•</span> {truck.modelo}
                  </td>
                  <td className="py-4 px-4 text-gray-600">{truck.anio || '-'}</td>
                  <td className="py-4 px-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${truck.estado_camion === 'DISPONIBLE' ? 'bg-green-100 text-green-700' :
                      truck.estado_camion === 'EN_USO' ? 'bg-blue-100 text-blue-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                      {truck.estado_camion?.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleOpenModal(truck)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title="Editar"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(truck.id_camion)}
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

          {filteredTrucks.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No se encontraron camiones.
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
                {editingTruck ? 'Editar Camión' : 'Nuevo Camión'}
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
                    placeholder="Volvo"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Modelo</label>
                  <input
                    type="text"
                    value={formData.modelo}
                    onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="FH16"
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
                    value={formData.estado_camion}
                    onChange={(e) => setFormData({ ...formData, estado_camion: e.target.value })}
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
                  {editingTruck ? 'Guardar Cambios' : 'Crear Camión'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}