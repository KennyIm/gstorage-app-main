import React, { useState, useEffect } from 'react';
import apiClient from '../../services/api';
import { Search, Plus, Edit, Trash2, X, Users, Mail, Phone, Power, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

export default function ClientsCatalog() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);

  // Estados del Modal
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);

  const [formData, setFormData] = useState({
    nombre_cliente: '',
    rut_cliente: '',
    email_contacto: '',
    telefono_contacto: '',
    precio_kg: '',
    precio_m3: '',
    activo: true
  });

  // --- CARGA DE DATOS ---
  const fetchClients = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/api/inventario/clientes/');
      setClients(response.data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Error al cargar la lista de clientes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  // --- FILTRADO ---
  const filteredClients = clients.filter(client => {
    const term = searchTerm.toLowerCase();
    return (
      client.nombre_cliente.toLowerCase().includes(term) ||
      (client.rut_cliente && client.rut_cliente.toLowerCase().includes(term)) ||
      (client.email_contacto && client.email_contacto.toLowerCase().includes(term))
    );
  });

  // --- HANDLERS (MODAL) ---
  const handleOpenModal = (client = null) => {
    setError(null);
    if (client) {
      setEditingClient(client);
      setFormData({
        nombre_cliente: client.nombre_cliente,
        rut_cliente: client.rut_cliente || '',
        email_contacto: client.email_contacto || '',
        telefono_contacto: client.telefono_contacto || '',
        precio_kg: client.precio_kg || '',
        precio_m3: client.precio_m3 || '',
        activo: client.activo !== undefined ? client.activo : true
      });
    } else {
      setEditingClient(null);
      setFormData({
        nombre_cliente: '',
        rut_cliente: '',
        email_contacto: '',
        telefono_contacto: '',
        precio_kg: '',
        precio_m3: '',
        activo: true
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingClient(null);
    setFormData({
      nombre_cliente: '',
      rut_cliente: '',
      email_contacto: '',
      telefono_contacto: '',
      precio_kg: '',
      precio_m3: '',
      activo: true
    });
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      if (editingClient) {
        await apiClient.put(`/api/inventario/clientes/${editingClient.id_cliente}/`, formData);
      } else {
        await apiClient.post('/api/inventario/clientes/', formData);
      }
      handleCloseModal();
      fetchClients();
    } catch (err) {
      console.error(err);
      setError("Error al guardar el cliente. Verifique los datos.");
    }
  };

  // --- LÓGICA DE ESTADO (ADAPTADA) ---
  const handleToggleStatus = async (client) => {
    const action = client.activo ? 'DESACTIVAR' : 'ACTIVAR';
    if (!window.confirm(`¿Seguro que deseas ${action} a ${client.nombre_cliente}?`)) return;
    try {
      if (client.activo) {
        await apiClient.delete(`/api/inventario/clientes/${client.id_cliente}/`);
      } else {
        await apiClient.patch(`/api/inventario/clientes/${client.id_cliente}/`, { activo: true });
      }
      fetchClients();
    } catch (err) {
      console.error(err);
      alert("Error al cambiar el estado.");
    }
  };

  // --- RENDER ---
  if (loading) return <div className="p-8 text-center text-gray-500">Cargando cartera de clientes...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Catálogo de Clientes</h1>
        <p className="text-gray-600">Administra la información y estado de tus clientes.</p>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, RUT o email..."
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
            Nuevo Cliente
          </button>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left py-4 px-4 text-sm font-semibold text-gray-600">Cliente / RUT</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Precio Kg</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Precio m³</th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-gray-600">Contacto</th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-gray-600">Estado</th>
                <th className="text-right py-4 px-4 text-sm font-semibold text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.map((client) => {
                const precioKg = parseFloat(client.precio_kg) || 0;
                const precioM3 = parseFloat(client.precio_m3) || 0;

                return (
                  <tr
                    key={client.id_cliente} className={`border-b border-gray-100 transition ${!client.activo ? 'bg-gray-50/50 opacity-60' : 'hover:bg-gray-50'}`}
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${client.activo ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-200 text-gray-500'}`}>
                          <Users className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{client.nombre_cliente}</p>
                          <p className="text-xs text-gray-500">{client.rut_cliente || 'Sin RUT'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-semibold ${precioKg === 0 ? 'text-red-600 bg-red-50 px-2 py-1 rounded' : 'text-gray-900'}`}>
                        ${precioKg.toFixed(2)}
                      </span>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-semibold ${precioM3 === 0 ? 'text-red-600 bg-red-50 px-2 py-1 rounded' : 'text-gray-900'}`}>
                        ${precioM3.toFixed(2)}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-col gap-1 text-sm">
                        {client.email_contacto && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <Mail className="w-3.5 h-3.5" /> {client.email_contacto}
                          </div>
                        )}
                        {client.telefono_contacto && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <Phone className="w-3.5 h-3.5" /> {client.telefono_contacto}
                          </div>
                        )}
                        {!client.email_contacto && !client.telefono_contacto && (
                          <span className="text-gray-400 italic">Sin datos de contacto</span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${client.activo
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                        }`}>
                        {client.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-end gap-2">

                        <button
                          onClick={() => handleOpenModal(client)}
                          disabled={!client.activo}
                          className={`p-2 rounded-lg transition ${client.activo ? 'text-blue-600 hover:bg-blue-50' : 'text-gray-300 cursor-not-allowed'}`}
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        {/* Botón Toggle Status */}
                        <button
                          onClick={() => handleToggleStatus(client)}
                          className={`p-2 rounded-lg transition ${client.activo
                            ? 'text-red-600 hover:bg-red-50'
                            : 'text-green-600 hover:bg-green-50'
                            }`}
                          title={client.activo ? 'Desactivar' : 'Activar'}
                        >
                          {client.activo ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                        </button>

                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {filteredClients.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No se encontraron clientes registrados.
            </div>
          )}
        </div>
      </div>

      {/* MODAL FORMULARIO */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 transform scale-100 transition-all">

            <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
              <h2 className="text-xl font-bold text-gray-900">
                {editingClient ? 'Editar Cliente' : 'Nuevo Cliente'}
              </h2>
              <button onClick={handleCloseModal} className="p-2 hover:bg-gray-100 rounded-full transition text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-center gap-2 border border-red-100">
                <AlertCircle size={16} /> {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo / Razón Social *</label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={formData.nombre_cliente}
                    onChange={(e) => setFormData({ ...formData, nombre_cliente: e.target.value })}
                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="Ej. Distribuidora Central Ltda."
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">RUT</label>
                <input
                  type="text"
                  value={formData.rut_cliente}
                  onChange={(e) => setFormData({ ...formData, rut_cliente: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="12.345.678-9"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      value={formData.email_contacto}
                      onChange={(e) => setFormData({ ...formData, email_contacto: e.target.value })}
                      className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="contacto@empresa.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="tel"
                      value={formData.telefono_contacto}
                      onChange={(e) => setFormData({ ...formData, telefono_contacto: e.target.value })}
                      className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="+56 9 1234 5678"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Precio por Kg</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.precio_kg}
                      onChange={(e) => setFormData({ ...formData, precio_kg: e.target.value })}
                      className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="Ej: 1500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Precio por m³</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.precio_m3}
                      onChange={(e) => setFormData({ ...formData, precio_m3: e.target.value })}
                      className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="Ej: 5000"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-100 mt-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium shadow-sm"
                >
                  {editingClient ? 'Guardar Cambios' : 'Crear Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}