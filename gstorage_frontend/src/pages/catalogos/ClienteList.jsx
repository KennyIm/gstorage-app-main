import React, { useState, useEffect } from 'react'
import apiClient, { limpiarCacheCatalogos } from '../../services/api'
import { Link } from 'react-router-dom'
import { useUI } from '../../context/UIContext'
import {
  Search, Plus, Edit, Briefcase, X, Users, Mail, Phone,
  CreditCard, User, MapPin, Building, AlertCircle, CheckCircle,
  XCircle, DollarSign, ChevronLeft, ChevronRight, ArrowLeft, Loader2
} from 'lucide-react'

import {
  normalizeRUT,
  normalizePhone,
  normalizeCity,
  normalizeEmail,
  normalizeName
} from '../../utils/normalization'

export default function ClientsCatalog() {
  document.title = "Gestión de Clientes - GStorage"
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [error, setError] = useState(null)
  const { showLoader, hideLoader, showToast } = useUI()
  const [showModal, setShowModal] = useState(false)
  const [editingClient, setEditingClient] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 10
  const [sinRut, setSinRut] = useState(false)

  const [formData, setFormData] = useState({
    nombre_cliente: '',
    rut_cliente: '',
    email_contacto: '',
    telefono_contacto: '',
    precio_kg: '',
    precio_m3: '',
    nombre_contacto: '',
    direccion: '',
    ciudad: '',
    direccion2: '',
    ciudad2: '',
    activo: true
  })


  // --- CARGA DE DATOS ---
  const fetchClients = async () => {
    setLoading(true)
    try {
      const response = await apiClient.get('/api/inventario/clientes/')
      setClients(response.data)
      setError(null)
    } catch (err) {
      console.error(err)
      showToast('Error al cargar los datos', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchClients()
  }, [])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm])

  // --- FILTRADO ---
  const filteredClients = clients.filter(client => {
    const term = searchTerm.toLowerCase()
    return (
      client.nombre_cliente?.toLowerCase().includes(term) ||
      client.rut_cliente?.toLowerCase().includes(term) ||
      client.email_contacto?.toLowerCase().includes(term) ||
      client.nombre_contacto?.toLowerCase().includes(term) ||
      client.ciudad?.toLowerCase().includes(term)
    )
  })

  const totalPages = Math.ceil(filteredClients.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const paginatedClients = filteredClients.slice(startIndex, startIndex + ITEMS_PER_PAGE)

  // --- HANDLERS ---
  const handleOpenModal = (client = null) => {
    setError(null)
    if (client) {
      setEditingClient(client)
      const tieneRutVacio = !client.rut_cliente || client.rut_cliente.trim() === ''
      setSinRut(tieneRutVacio)

      setFormData({
        nombre_cliente: client.nombre_cliente,
        rut_cliente: client.rut_cliente || '',
        email_contacto: client.email_contacto || '',
        telefono_contacto: client.telefono_contacto || '',
        precio_kg: client.precio_kg || '',
        precio_m3: client.precio_m3 || '',
        nombre_contacto: client.nombre_contacto || '',
        direccion: client.direccion || '',
        direccion2: client.direccion2 || '',
        ciudad2: client.ciudad2 || '',
        ciudad: client.ciudad || '',
        activo: client.activo !== undefined ? client.activo : true
      })
    } else {
      setEditingClient(null)
      setSinRut(false)
      setFormData({
        nombre_cliente: '',
        rut_cliente: '',
        email_contacto: '',
        telefono_contacto: '',
        precio_kg: '',
        precio_m3: '',
        nombre_contacto: '',
        direccion: '',
        ciudad: '',
        direccion2: '',
        ciudad2: '',
        activo: true
      })
    }
    setShowModal(true)
  }

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
      nombre_contacto: '',
      direccion: '',
      ciudad: '',
      direccion2: '',
      ciudad2: '',
      activo: true
    });
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!sinRut && !isValidRUT(formData.rut_cliente)) {
      setError('El RUT ingresado no es válido')
      return
    }

    showLoader()
    const cleanData = {
      ...formData,
      nombre_cliente: normalizeName(formData.nombre_cliente),
      rut_cliente: sinRut ? "" : normalizeRUT(formData.rut_cliente),
      email_contacto: normalizeEmail(formData.email_contacto),
      telefono_contacto: formData.telefono_contacto,
      ciudad: normalizeCity(formData.ciudad),
      ciudad2: normalizeCity(formData.ciudad2),
      nombre_contacto: normalizeName(formData.nombre_contacto)
    }
    setError(null)

    try {
      let res;
      if (editingClient) {
        res = await apiClient.put(`/api/inventario/clientes/${editingClient.id_cliente}/`, cleanData);
        showToast('Registro actualizado con éxito', 'success');

        setClients(prev => prev.map(c => c.id_cliente === editingClient.id_cliente ? res.data : c));
      } else {
        res = await apiClient.post('/api/inventario/clientes/', cleanData);
        showToast('Registro creado con éxito', 'success');

        setClients(prev => [res.data, ...prev]);
      }
      handleCloseModal();
    } catch (err) {
      console.error(err);
      const errorData = err.response?.data;
      const esRutDuplicado = errorData?.rut_cliente || errorData?.rut_hash || errorData?.non_field_errors;

      showToast(
        esRutDuplicado
          ? 'El RUT ingresado ya existe en el sistema.'
          : 'Error al guardar el cliente.',
        'error'
      );
    } finally {
      hideLoader();
    }
  };

  // --- LÓGICA DE ESTADO ---
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
      showToast('Error al cambiar el estado.', 'error');
    }
  };

  const formatearRUT = (rut) => {
    if (!rut) return 'Sin RUT';
    let valor = rut.replace(/\./g, '').replace(/-/g, '').trim();

    if (valor.length < 2) return valor;
    const cuerpo = valor.slice(0, -1);
    const dv = valor.slice(-1).toUpperCase();
    const cuerpoFormateado = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return `${cuerpoFormateado}-${dv}`;
  };

  const formatRUT = (rut) => {
    let value = rut.replace(/[^0-9kK]/g, '').toUpperCase();
    if (value.length <= 1) return value;
    const body = value.slice(0, -1);
    const dv = value.slice(-1);
    const formattedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return `${formattedBody}-${dv}`;
  };

  const isValidRUT = (rut) => {
    const cleanRUT = rut.replace(/[^0-9kK]/g, '').toUpperCase();
    if (cleanRUT.length < 7) return false;
    const body = cleanRUT.slice(0, -1);
    const dv = cleanRUT.slice(-1);
    let sum = 0;
    let multiplier = 2;
    for (let i = body.length - 1; i >= 0; i--) {
      sum += parseInt(body.charAt(i)) * multiplier;
      multiplier = multiplier === 7 ? 2 : multiplier + 1;
    }
    const expectedDV = 11 - (sum % 11);
    const finalDV = expectedDV === 11 ? '0' : expectedDV === 10 ? 'K' : expectedDV.toString();
    return dv === finalDV;
  };

  const getVisiblePages = (current, total) => {
    if (total <= 5) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    if (current <= 3) {
      return [1, 2, 3, 4, 5];
    }
    if (current >= total - 2) {
      return [total - 4, total - 3, total - 2, total - 1, total];
    }
    return [current - 2, current - 1, current, current + 1, current + 2];
  };

  // --- RENDER ---
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-500">
        <Loader2 className="w-10 h-10 animate-spin mb-4 text-indigo-600" />
        <p>Cargando clientes...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Clientes</h1>
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
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Ubicación</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Precio Kg</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Precio m³</th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-gray-600">Contacto</th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-gray-600">Estado</th>
                <th className="text-right py-4 px-4 text-sm font-semibold text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginatedClients.map((client) => {
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
                          <p className="text-xs text-gray-500">{formatearRUT(client.rut_cliente) || 'Sin RUT'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col items-start gap-1">
                        {client.ciudad ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                            <MapPin className="w-3 h-3" /> {client.ciudad}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Sin ciudad</span>
                        )}
                        <span className="text-xs text-gray-500 mt-0.5 truncate max-w-[150px]" title={client.direccion}>
                          {client.direccion || 'Sin dirección registrada'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-semibold ${precioKg === 0 ? 'text-red-600 bg-red-50 px-2 py-1 rounded' : 'text-gray-900'}`}>
                        ${precioKg.toFixed(0)}
                      </span>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-semibold ${precioM3 === 0 ? 'text-red-600 bg-red-50 px-2 py-1 rounded' : 'text-gray-900'}`}>
                        ${precioM3.toFixed(0)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 text-sm font-medium text-gray-900">
                          <User className="w-3.5 h-3.5 text-indigo-500" />
                          {client.nombre_contacto || <span className="text-gray-400 italic font-normal">Sin contacto</span>}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <Phone className="w-3.5 h-3.5" />
                          {client.telefono_contacto || '-'}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <Mail className="w-3.5 h-3.5" />
                          {client.email_contacto || '-'}
                        </div>
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
        </div>

        {/* --- CONTROLES DE PAGINACIÓN --- */}
        {filteredClients.length > 0 && (
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-100 pt-6">
            <p className="text-sm text-gray-600">
              Mostrando <span className="font-semibold">{startIndex + 1}</span> a{' '}
              <span className="font-semibold">
                {Math.min(startIndex + ITEMS_PER_PAGE, filteredClients.length)}
              </span> de{' '}
              <span className="font-semibold">{filteredClients.length}</span> clientes
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="flex gap-1">
                {getVisiblePages(currentPage, totalPages).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-10 h-10 rounded-lg text-sm font-bold transition ${currentPage === page
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-gray-600 hover:bg-indigo-50'
                      }`}
                  >
                    {page}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
      {/* MODAL FORMULARIO */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full transform scale-100 transition-all overflow-hidden flex flex-col max-h-[90vh]">

            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-indigo-600" />
                {editingClient ? 'Editar Cliente' : 'Nuevo Cliente'}
              </h2>
              <button onClick={handleCloseModal} className="p-2 hover:bg-gray-200 rounded-full transition text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar">
              {error && (
                <div className="mb-6 p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-center gap-2 border border-red-100">
                  <AlertCircle size={16} /> {error}
                </div>
              )}

              <form id="clienteForm" onSubmit={handleSubmit} className="space-y-8">
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider border-b border-gray-100 pb-2">
                    Información Principal
                  </h3>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo / Razón Social</label>
                    <div className="relative">
                      <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={formData.nombre_cliente}
                        onBlur={(e) => setFormData({ ...formData, nombre_cliente: normalizeName(e.target.value) })}
                        onChange={(e) => setFormData({ ...formData, nombre_cliente: e.target.value })}
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
                        placeholder="Ej. Distribuidora Central Ltda."
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-sm font-medium text-gray-700">RUT</label>
                        <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer select-none font-medium hover:text-indigo-600 transition">
                          <input
                            type="checkbox"
                            checked={sinRut}
                            onChange={(e) => {
                              setSinRut(e.target.checked);
                              if (e.target.checked) {
                                setFormData({ ...formData, rut_cliente: '' });
                              }
                            }}
                            className="rounded text-indigo-600 focus:ring-indigo-500 border-gray-300 w-3.5 h-3.5 cursor-pointer"
                          />
                          Sin RUT
                        </label>
                      </div>

                      <div className="relative">
                        <CreditCard className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${sinRut ? 'text-gray-300' : 'text-gray-400'}`} />
                        <input
                          type="text"
                          value={formData.rut_cliente}
                          onChange={(e) => {
                            const rutFormateado = formatRUT(e.target.value);
                            setFormData({ ...formData, rut_cliente: rutFormateado });
                          }}
                          maxLength={12}
                          disabled={sinRut}
                          className={`w-full pl-10 pr-4 py-2 border rounded-lg outline-none transition text-sm ${sinRut
                            ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed select-none'
                            : 'bg-gray-50 border-gray-300 text-gray-900 focus:bg-white focus:ring-2 focus:ring-indigo-500'
                            }`}
                          placeholder={sinRut ? "No requiere identificación" : "12.345.678-9"}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Persona de Contacto</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={formData.nombre_contacto}
                          onBlur={(e) => setFormData({ ...formData, nombre_contacto: normalizeName(e.target.value) })}
                          onChange={(e) => setFormData({ ...formData, nombre_contacto: e.target.value })}
                          className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
                          placeholder="Ej: Juan Pérez"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider border-b border-gray-100 pb-2">
                    Contacto y Ubicación
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="tel"
                          value={formData.telefono_contacto}
                          onChange={(e) => setFormData({ ...formData, telefono_contacto: e.target.value })}
                          className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
                          placeholder="+56 9 1234 5678"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="email"
                          value={formData.email_contacto}
                          onBlur={(e) => setFormData({ ...formData, email_contacto: normalizeEmail(e.target.value) })}
                          onChange={(e) => setFormData({ ...formData, email_contacto: e.target.value })}
                          className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
                          placeholder="contacto@empresa.com"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={formData.direccion}
                          onChange={(e) => setFormData({ ...formData, direccion: e.target.value.toUpperCase() })}
                          className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
                          placeholder="Ej: Av. Los Leones 123"
                        />
                      </div>
                    </div>
                    <div className="sm:col-span-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad / Comuna</label>
                      <div className="relative">
                        <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={formData.ciudad}
                          onBlur={(e) => setFormData({ ...formData, ciudad: normalizeCity(e.target.value) })}
                          onChange={(e) => setFormData({ ...formData, ciudad: e.target.value })}
                          className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
                          placeholder="Ej: Santiago"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Dirección Alternativa</label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={formData.direccion2}
                          onChange={(e) => setFormData({ ...formData, direccion2: e.target.value.toUpperCase() })}
                          className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
                          placeholder="Ej: Av. Prat 123"
                        />
                      </div>
                    </div>
                    <div className="sm:col-span-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad Alternativa</label>
                      <div className="relative">
                        <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={formData.ciudad2}
                          onBlur={(e) => setFormData({ ...formData, ciudad2: normalizeCity(e.target.value) })}
                          onChange={(e) => setFormData({ ...formData, ciudad2: e.target.value })}
                          className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
                          placeholder="Ej: Iquique"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-emerald-50/50 p-5 rounded-xl border border-emerald-100">
                  <h3 className="text-sm font-semibold text-emerald-800 flex items-center gap-2 mb-4">
                    <DollarSign className="w-5 h-5 text-emerald-600" /> Tarifas
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-emerald-700 mb-1">Precio por Kg</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600 font-bold">$</span>
                        <input
                          type="number"
                          step="0"
                          value={formData.precio_kg}
                          onChange={(e) => setFormData({ ...formData, precio_kg: e.target.value })}
                          className="w-full pl-8 pr-4 py-2 bg-white border border-emerald-200 text-emerald-900 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition"
                          placeholder="0"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-emerald-700 mb-1">Precio por m³</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600 font-bold">$</span>
                        <input
                          type="number"
                          step="0"
                          value={formData.precio_m3}
                          onChange={(e) => setFormData({ ...formData, precio_m3: e.target.value })}
                          className="w-full pl-8 pr-4 py-2 bg-white border border-emerald-200 text-emerald-900 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition"
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>
                </div>

              </form>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex gap-3 justify-end rounded-b-2xl">
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-white transition font-medium"
              >Cancelar
              </button>
              <button
                type="submit"
                form="clienteForm"
                className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium shadow-sm flex items-center gap-2"
              >
                {editingClient ? 'Guardar Cambios' : 'Crear Cliente'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}