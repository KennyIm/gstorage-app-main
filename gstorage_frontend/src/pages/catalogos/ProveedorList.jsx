import React, { useState, useEffect } from 'react'
import apiClient, { limpiarCacheCatalogos } from '../../services/api'
import { Link } from 'react-router-dom'
import { useUI } from '../../context/UIContext'
import {
    Search, Plus, Edit, Trash2, User, Building,
    Mail, Phone, X, Briefcase, CreditCard, AlertCircle
    , ChevronLeft, ChevronRight, ArrowLeft, CheckCircle,
    XCircle, Loader2
} from 'lucide-react'

import {
    normalizePhone,
    normalizeEmail,
    normalizeName
} from '../../utils/normalization'

const formatRUT = (rut) => {
    let value = rut.replace(/[^0-9kK]/g, '').toUpperCase()
    if (value.length <= 1) return value
    const body = value.slice(0, -1)
    const dv = value.slice(-1)
    const formattedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
    return `${formattedBody}-${dv}`
}

const isValidRUT = (rut) => {
    const cleanRUT = rut.replace(/[^0-9kK]/g, '').toUpperCase()
    if (cleanRUT.length < 7) return false
    const body = cleanRUT.slice(0, -1)
    const dv = cleanRUT.slice(-1)
    let sum = 0
    let multiplier = 2
    for (let i = body.length - 1; i >= 0; i--) {
        sum += parseInt(body.charAt(i)) * multiplier
        multiplier = multiplier === 7 ? 2 : multiplier + 1
    }
    const expectedDV = 11 - (sum % 11)
    const finalDV = expectedDV === 11 ? '0' : expectedDV === 10 ? 'K' : expectedDV.toString()
    return dv === finalDV
}

export default function Proveedores() {

    document.title = "Gestión de Proveedores - GStorage"
    const [proveedores, setProveedores] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [searchTerm, setSearchTerm] = useState('')
    const { showLoader, hideLoader, showToast } = useUI()
    const [sinRut, setSinRut] = useState(false)


    const [currentPage, setCurrentPage] = useState(1)
    const ITEMS_PER_PAGE = 10

    useEffect(() => {
        setCurrentPage(1)
    }, [searchTerm])

    const [showModal, setShowModal] = useState(false)
    const [editingProveedor, setEditingProveedor] = useState(null)
    const [submitting, setSubmitting] = useState(false)

    const [formData, setFormData] = useState({
        rut: '',
        nombre_proveedor: '',
        contacto: '',
        correo: '',
        telefono: '',
        activo: true
    })

    const fetchProveedores = async () => {
        setLoading(true)
        try {
            const response = await apiClient.get('/api/inventario/proveedores/')
            setProveedores(response.data)
            setError(null)
        } catch (err) {
            console.error(err)
            showToast('Error al cargar la lista de proveedores.', 'error')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchProveedores()
    }, [])

    const filteredProveedores = proveedores.filter(prov => {
        const term = searchTerm.toLowerCase()
        return (
            prov.nombre_proveedor?.toLowerCase().includes(term) ||
            prov.rut?.toLowerCase().includes(term) ||
            prov.contacto?.toLowerCase().includes(term)
        )
    })

    const totalPages = Math.ceil(filteredProveedores.length / ITEMS_PER_PAGE)
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    const paginatedProveedores = filteredProveedores.slice(startIndex, startIndex + ITEMS_PER_PAGE)

    const handleOpenModal = (proveedor = null) => {
        setError(null)
        if (proveedor) {
            setEditingProveedor(proveedor)
            const tieneRutVacio = !proveedor.rut || proveedor.rut.trim() === ''
            setSinRut(tieneRutVacio)
            setFormData({
                rut: proveedor.rut || '',
                nombre_proveedor: proveedor.nombre_proveedor,
                contacto: proveedor.contacto || '',
                correo: proveedor.correo || '',
                telefono: proveedor.telefono || '',
                activo: proveedor.activo
            })
        } else {
            setEditingProveedor(null)
            setSinRut(false)
            setFormData({
                rut: '',
                nombre_proveedor: '',
                contacto: '',
                correo: '',
                telefono: '',
                activo: true
            })
        }
        setShowModal(true)
    }

    const handleCloseModal = () => {
        setShowModal(false)
        setEditingProveedor(null)
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!sinRut && !isValidRUT(formData.rut)) {
            setError('El RUT ingresado no es válido.')
            return
        }
        showLoader()
        setSubmitting(true)

        const cleanData = {
            ...formData,
            rut: sinRut ? "" : formData.rut,
            nombre_proveedor: normalizeName(formData.nombre_proveedor),
            contacto: normalizeName(formData.contacto),
            correo: normalizeEmail(formData.correo),
            telefono: formData.telefono,
        }

        try {
            if (editingProveedor) {
                await apiClient.put(`/api/inventario/proveedores/${editingProveedor.id}/`, cleanData);
                showToast('Registro actualizado con éxito', 'success');
            } else {
                await apiClient.post('/api/inventario/proveedores/', cleanData);
                showToast('Registro creado con éxito', 'success');
            }
            limpiarCacheCatalogos() 
            await fetchProveedores()
            handleCloseModal()
        } catch (err) {
            console.error(err)
            const errorData = err.response?.data
            const esRutDuplicado = errorData?.rut || errorData?.rut_hash || errorData?.non_field_errors
            showToast(
                esRutDuplicado
                    ? 'El RUT ingresado ya existe en el sistema.'
                    : 'Error al guardar el proveedor.',
                'error'
            )
        } finally {
            setSubmitting(false)
            hideLoader()
        }
    }

    const handleToggleStatus = async (proveedor) => {
        const action = proveedor.activo ? 'DESACTIVAR' : 'ACTIVAR'
        if (!window.confirm(`¿Seguro que deseas ${action} a ${proveedor.nombre_proveedor}?`)) return
        try {
            if (proveedor.activo) {
                await apiClient.delete(`/api/inventario/proveedores/${proveedor.rut}/`)
            } else {
                await apiClient.patch(`/api/inventario/proveedores/${proveedor.rut}/`, { activo: true })
            }
            fetchProveedores()
        } catch (err) {
            console.error(err)
            showToast('Error al cambiar el estado.', 'error')
        }
    }

    const getVisiblePages = (current, total) => {
        if (total <= 5) {
            return Array.from({ length: total }, (_, i) => i + 1)
        }
        if (current <= 3) {
            return [1, 2, 3, 4, 5]
        }
        if (current >= total - 2) {
            return [total - 4, total - 3, total - 2, total - 1, total]
        }
        return [current - 2, current - 1, current, current + 1, current + 2]
    }

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-500">
                <Loader2 className="w-10 h-10 animate-spin mb-4 text-indigo-600" />
                <p>Cargando proveedores...</p>
            </div>
        )
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 font-sans">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Proveedores</h1>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-gray-100 flex flex-col sm:flex-row gap-4 justify-between items-center">
                <div className="relative w-full sm:max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, RUT o contacto..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
                    />
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium shadow-sm"
                >
                    <Plus className="w-5 h-5" /> Nuevo Proveedor
                </button>
            </div>

            {/* TABLA DE PROVEEDORES */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-gray-500">Cargando proveedores...</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Proveedor / RUT</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Contacto Principal</th>
                                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {paginatedProveedores.length > 0 ? (
                                    paginatedProveedores.map((prov) => (
                                        <tr key={prov.rut} className="hover:bg-gray-50 transition group">

                                            {/* EMPRESA Y RUT */}
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-start gap-3">
                                                    <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600 mt-0.5">
                                                        <Building className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-gray-900">{prov.nombre_proveedor}</p>
                                                        <p className="text-xs text-gray-500 font-medium">RUT: {prov.rut}</p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* CONTACTO */}
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-1.5 text-sm font-medium text-gray-900">
                                                        <User className="w-3.5 h-3.5 text-emerald-500" />
                                                        {prov.contacto || <span className="text-gray-400 italic font-normal">Sin contacto</span>}
                                                    </div>
                                                    {(prov.telefono || prov.correo) && (
                                                        <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                                                            {prov.telefono && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {prov.telefono}</span>}
                                                            {prov.correo && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {prov.correo}</span>}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>

                                            {/* BOTONES DE ACCIÓN */}
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleOpenModal(prov)}
                                                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                                                        title="Editar Proveedor"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleToggleStatus(prov)}
                                                        className={`p-2 rounded-lg transition ${prov.activo
                                                            ? 'text-red-600 hover:bg-red-50'
                                                            : 'text-green-600 hover:bg-green-50'
                                                            }`}
                                                        title={prov.activo ? 'Desactivar' : 'Activar'}
                                                    >
                                                        {prov.activo ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="3" className="px-6 py-8 text-center text-gray-500">
                                            No se encontraron proveedores activos.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                )}
                {filteredProveedores.length > 0 && (
                    <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row justify-between items-center gap-4">
                        <p className="text-xs text-gray-500">
                            Mostrando {startIndex + 1} a {Math.min(startIndex + ITEMS_PER_PAGE, filteredProveedores.length)} de {filteredProveedores.length}
                        </p>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                                disabled={currentPage === 1}
                                className="p-1.5 border rounded-lg disabled:opacity-40"
                            >
                                <ChevronLeft size={20} />
                            </button>

                            <div className="flex gap-1">
                                {getVisiblePages(currentPage, totalPages).map((page) => (
                                    <button
                                        key={page}
                                        onClick={() => setCurrentPage(page)}
                                        className={`w-9 h-9 rounded-lg text-xs font-bold transition ${currentPage === page
                                            ? 'bg-indigo-600 text-white shadow-sm'
                                            : 'text-gray-600 hover:bg-white border border-transparent'
                                            }`}
                                    >
                                        {page}
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="p-1.5 border rounded-lg disabled:opacity-40"
                            >
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* --- MODAL FORMULARIO --- */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full transform scale-100 transition-all overflow-hidden flex flex-col max-h-[90vh]">

                        {/* Header Modal */}
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <Briefcase className="w-5 h-5 text-indigo-600" />
                                {editingProveedor ? 'Editar Proveedor' : 'Nuevo Proveedor'}
                            </h2>
                            <button onClick={handleCloseModal} className="p-2 hover:bg-gray-200 rounded-full transition text-gray-500">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Body Modal */}
                        <div className="p-6 overflow-y-auto custom-scrollbar">
                            {error && (
                                <div className="mb-6 p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-center gap-2 border border-red-100">
                                    <AlertCircle size={16} /> {error}
                                </div>
                            )}

                            <form id="proveedorForm" onSubmit={handleSubmit} className="space-y-6">

                                {/* Bloque Empresa */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider border-b border-gray-100 pb-2">
                                        Datos de la Empresa
                                    </h3>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div className="sm:col-span-1">
                                            <div className="flex justify-between items-center mb-1">
                                                <label className="block text-sm font-medium text-gray-700">RUT {!sinRut && '*'}</label>
                                                <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer select-none font-medium hover:text-indigo-600 transition">
                                                    <input
                                                        type="checkbox"
                                                        checked={sinRut}
                                                        disabled={!!editingProveedor} 
                                                        onChange={(e) => {
                                                            setSinRut(e.target.checked);
                                                            if (e.target.checked) {
                                                                setFormData({ ...formData, rut: '' })
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
                                                    value={formData.rut}
                                                    onChange={(e) => {
                                                        const rutFormateado = formatRUT(e.target.value)
                                                        setFormData({ ...formData, rut: rutFormateado })
                                                    }}
                                                    maxLength={12}
                                                    disabled={sinRut || !!editingProveedor}
                                                    className={`w-full pl-10 pr-4 py-2 border rounded-lg outline-none transition text-sm ${sinRut || !!editingProveedor
                                                            ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed select-none'
                                                            : 'bg-gray-50 border-gray-300 text-gray-900 focus:bg-white focus:ring-2 focus:ring-indigo-500'
                                                        }`}
                                                    placeholder={sinRut ? "No requiere identificación" : "12.345.678-9"}
                                                    required={!sinRut}
                                                />
                                            </div>
                                        </div>
                                        <div className="sm:col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre / Razón Social</label>
                                            <div className="relative">
                                                <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                <input
                                                    type="text"
                                                    value={formData.nombre_proveedor}
                                                    onBlur={(e) => setFormData({ ...formData, nombre_proveedor: normalizeName(e.target.value) })}
                                                    onChange={(e) => setFormData({ ...formData, nombre_proveedor: e.target.value })}
                                                    className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
                                                    placeholder="Ej. Comercializadora Sur SPA"
                                                    required
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Bloque Contacto */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider border-b border-gray-100 pb-2">
                                        Información de Contacto
                                    </h3>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Persona de Contacto</label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            <input
                                                type="text"
                                                value={formData.contacto}
                                                onBlur={(e) => setFormData({ ...formData, contacto: normalizeName(e.target.value) })}
                                                onChange={(e) => setFormData({ ...formData, contacto: e.target.value })}
                                                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
                                                placeholder="Ej: María Gómez"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                                            <div className="relative">
                                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                <input
                                                    type="tel"
                                                    value={formData.telefono}
                                                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                                                    className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
                                                    placeholder="+56 9 1234 5678"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico</label>
                                            <div className="relative">
                                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                <input
                                                    type="email"
                                                    value={formData.correo}
                                                    onBlur={(e) => setFormData({ ...formData, correo: normalizeEmail(e.target.value) })}
                                                    onChange={(e) => setFormData({ ...formData, correo: e.target.value })}
                                                    className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
                                                    placeholder="contacto@empresa.cl"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                            </form>
                        </div>

                        {/* Footer Modal */}
                        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex gap-3 justify-end rounded-b-2xl">
                            <button
                                type="button"
                                onClick={handleCloseModal}
                                className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-white transition font-medium"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                form="proveedorForm"
                                disabled={submitting}
                                className={`px-6 py-2.5 bg-indigo-600 text-white rounded-lg transition font-medium shadow-sm flex items-center gap-2 ${submitting ? 'opacity-75 cursor-not-allowed' : 'hover:bg-indigo-700'}`}
                            >
                                {submitting ? 'Guardando...' : editingProveedor ? 'Guardar Cambios' : 'Crear Proveedor'}
                            </button>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
}