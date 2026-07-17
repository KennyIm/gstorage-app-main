import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import apiClient from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import Select from 'react-select';
import {
    Save, ArrowLeft, User, MapPin, Package, Scale, Box, Truck, FileText, CheckSquare,
    Phone
} from 'lucide-react';

export default function CotizacionCreate() {
    document.title = "Nueva Cotización - GStorage"
    const navigate = useNavigate()
    const { logoutUser } = useAuth()
    const { showLoader, hideLoader, showToast } = useUI()

    const [clientes, setClientes] = useState([])
    const [proveedores, setProveedores] = useState([])
    const [loadingInicial, setLoadingInicial] = useState(true)

    const [formData, setFormData] = useState({
        id_cliente: '',
        rut_cliente: '',
        nombre_cliente: '',
        rut_proveedor: '',
        proveedor: '',
        contacto: '',
        destino: '',
        cantidad: 1,
        tipo_bultos: '',
        kg: '',
        m3: '',
        cotiza_proveedor: false,
        monto: '',
        precio_kg_cliente: null,
        precio_m3_cliente: null
    })
    const TARIFAS_LOGISTICAS = {
        iquique: { kg: 400, m3: 90000 },
        mejillones: { kg: 450, m3: 90000 },
        tocopilla: { kg: 450, m3: 97000 },
        calama: { kg: 450, m3: 97000 },
        antofagasta: { kg: 350, m3: 80000 },
        copiapo: { kg: 300, m3: 65000 },
        santiago: { kg: 400, m3: 90000 }
    }

    useEffect(() => {
        const fetchCatalogos = async () => {
            setLoadingInicial(true)
            try {
                const [clientesRes, provRes] = await Promise.all([
                    apiClient.get('/api/inventario/clientes/'),
                    apiClient.get('/api/inventario/proveedores/')
                ])
                setClientes(clientesRes.data)
                setProveedores(provRes.data)
            } catch (err) {
                if (err.response && err.response.status === 401) {
                    showToast('Sesión expirada. Vuelve a iniciar sesión.', 'error')
                    logoutUser()
                } else {
                    showToast('Error al cargar listas de clientes y proveedores.', 'error')
                }
            } finally {
                setLoadingInicial(false)
            }
        };
        fetchCatalogos();
    }, [logoutUser, showToast])

    useEffect(() => {
        const kilos = parseFloat(formData.kg) || 0
        const volumen = parseFloat(formData.m3) || 0
        let tarifaKg = 0
        let tarifaM3 = 0
        if (formData.id_cliente && (parseFloat(formData.precio_kg_cliente) > 0 || parseFloat(formData.precio_m3_cliente) > 0)) {
            tarifaKg = parseFloat(formData.precio_kg_cliente) || 0
            tarifaM3 = parseFloat(formData.precio_m3_cliente) || 0
        }
        else {
            const destino = formData.destino || ''
            const partes = destino.split(',')

            if (partes.length > 1) {
                const ciudad = partes[partes.length - 1].trim().toLowerCase()
                const tarifaZona = TARIFAS_LOGISTICAS[ciudad]

                if (tarifaZona) {
                    tarifaKg = tarifaZona.kg
                    tarifaM3 = tarifaZona.m3
                }
            }
        }

        if (tarifaKg > 0 || tarifaM3 > 0) {
            const cobroPeso = kilos * tarifaKg
            const cobroVolumen = volumen * tarifaM3
            const totalCalculado = Math.max(cobroPeso, cobroVolumen)

            setFormData(prev => ({
                ...prev,
                monto: Math.round(totalCalculado)
            }))
        }
    }, [formData.destino, formData.kg, formData.m3, formData.id_cliente, formData.precio_kg_cliente, formData.precio_m3_cliente])

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }))
    }

    const handleClienteChange = (e) => {
        const clienteId = e.target.value

        if (!clienteId) {
            setFormData(prev => ({
                ...prev,
                id_cliente: '',
                nombre_cliente: '',
                rut_cliente: '',
                destino: '',
                contacto: '',
                precio_kg_cliente: null,
                precio_m3_cliente: null,
                monto: ''
            }))
            return
        }
        const clienteSeleccionado = clientes.find(c => String(c.id_cliente) === String(clienteId))

        if (clienteSeleccionado) {
            setFormData(prev => ({
                ...prev,
                id_cliente: clienteId,
                nombre_cliente: clienteSeleccionado.nombre_cliente,
                rut_cliente: clienteSeleccionado.rut_cliente || '',
                destino: clienteSeleccionado.destino || '',
                contacto: clienteSeleccionado.contacto || '',
                precio_kg_cliente: clienteSeleccionado.precio_kg,
                precio_m3_cliente: clienteSeleccionado.precio_m3
            }))
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!formData.nombre_cliente) {
            showToast('Debes ingresar o seleccionar un cliente.', 'error')
            return
        }
        showLoader()
        try {
            const { precio_kg_cliente, precio_m3_cliente, ...datosEnvio } = formData

            const payload = {
                ...datosEnvio,
                cantidad: parseInt(formData.cantidad) || 1,
                kg: formData.kg ? parseFloat(formData.kg) : null,
                m3: formData.m3 ? parseFloat(formData.m3) : null,
                estado_cotizacion: 'En proceso'
            }

            await apiClient.post('/api/inventario/cotizaciones/', payload)
            showToast('Cotización creada exitosamente', 'success')
            navigate('/cotizaciones')
        } catch (err) {
            console.error(err)
            showToast('Error al crear la cotización. Verifica los datos.', 'error')
        } finally {
            hideLoader()
        }
    }

    const formatearRUT = (rut) => {
        if (!rut) return ''
        let valor = rut.replace(/\./g, '').replace(/-/g, '').trim()

        if (valor.length < 2) return valor
        const cuerpo = valor.slice(0, -1)
        const dv = valor.slice(-1).toUpperCase()
        const cuerpoFormateado = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
        return `${cuerpoFormateado}-${dv}`
    }

    if (loadingInicial) {
        return (
            <div className="flex justify-center items-center h-screen bg-gray-50">
                <div className="w-10 h-10 border-4 border-red-800 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8 font-sans">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Nueva Cotización</h1>
                    </div>
                    <Link to="/cotizaciones" className="hidden sm:flex items-center gap-2 text-gray-500 hover:text-red-800 transition font-medium">
                        <ArrowLeft className="w-5 h-5" /> Volver
                    </Link>
                </div>

                <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                    <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-8">
                        <div>
                            <h3 className="text-sm font-bold text-red-800 uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
                                <User className="w-5 h-5" /> Datos del Cliente
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Buscar Cliente Existente (Opcional)</label>
                                    <Select
                                        placeholder="Escribe para autocompletar cliente..."
                                        isClearable
                                        options={clientes.map(c => ({
                                            value: c.id_cliente,
                                            label: `${c.nombre_cliente} (${c.rut_cliente || 'Sin RUT'})`,
                                            id_cliente: c.id_cliente,
                                            nombre: c.nombre_cliente,
                                            rut: c.rut_cliente,
                                            destino: c.destino,      
                                            contacto: c.contacto,   
                                            precio_kg: c.precio_kg,
                                            precio_m3: c.precio_m3
                                        }))}
                                        onChange={(opt) => {
                                            if (opt) {
                                                setFormData(prev => ({
                                                    ...prev,
                                                    id_cliente: opt.id_cliente,
                                                    nombre_cliente: opt.nombre,
                                                    rut_cliente: opt.rut || '',
                                                    destino: opt.destino || '',    
                                                    contacto: opt.contacto || '',
                                                    precio_kg_cliente: opt.precio_kg,
                                                    precio_m3_cliente: opt.precio_m3
                                                }));
                                            } else {
                                                setFormData(prev => ({
                                                    ...prev,
                                                    id_cliente: '',
                                                    nombre_cliente: '',
                                                    rut_cliente: '',
                                                    destino: '',
                                                    contacto: '',
                                                    precio_kg_cliente: null,
                                                    precio_m3_cliente: null,
                                                    monto: '' 
                                                }));
                                            }
                                        }}
                                        className="text-sm"
                                    />
                                    <p className="text-xs text-gray-400 mt-1 italic">Selecciona uno para auto-rellenar los campos de abajo o déjalo vacío para un cliente nuevo.</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Razón Social / Nombre</label>
                                    <input
                                        type="text"
                                        name="nombre_cliente"
                                        value={formData.nombre_cliente}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-red-800 outline-none transition"
                                        placeholder="Ej. Comercializadora Sur"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">RUT Cliente</label>
                                    <input
                                        type="text"
                                        name="rut_cliente"
                                        value={formatearRUT(formData.rut_cliente)}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-red-800 outline-none transition"
                                        placeholder="12.345.678-9"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Contacto</label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="text"
                                            name="contacto"
                                            value={formData.contacto}
                                            onChange={handleChange}
                                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-red-800 outline-none transition"
                                            placeholder="Número | Correo"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Dirección de Destino</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="text"
                                            name="destino"
                                            value={formData.destino}
                                            onChange={handleChange}
                                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-red-800 outline-none transition"
                                            placeholder="Ej. Los heroes 231, Iquique"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-red-800 uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
                                <Truck className="w-5 h-5" /> Datos del Proveedor
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Buscar Proveedor Existente (Opcional)</label>
                                    <Select
                                        placeholder="Escribe para autocompletar proveedor..."
                                        isClearable
                                        options={proveedores.map(p => ({
                                            value: p.rut,
                                            label: `${p.nombre_proveedor} (${p.rut})`,
                                            rut: p.rut,
                                            nombre: p.nombre_proveedor
                                        }))}
                                        onChange={(opt) => {
                                            if (opt) {
                                                setFormData(prev => ({ ...prev, rut_proveedor: opt.rut || '', proveedor: opt.nombre }));
                                            }
                                        }}
                                        className="text-sm"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre Proveedor</label>
                                    <input
                                        type="text"
                                        name="proveedor"
                                        value={formData.proveedor}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-red-800 outline-none transition"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">RUT Proveedor</label>
                                    <input
                                        type="text"
                                        name="rut_proveedor"
                                        value={formData.rut_proveedor}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-red-800 outline-none transition"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-slate-200 pb-2">
                                <Package className="w-5 h-5" /> Especificaciones de la Carga
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Bultos</label>
                                    <input
                                        type="number"
                                        name="cantidad"
                                        value={formData.cantidad}
                                        onChange={handleChange}
                                        min="1"
                                        className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-800 outline-none"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Tipo</label>
                                    <input
                                        type="text"
                                        name="tipo_bultos"
                                        value={formData.tipo_bultos}
                                        onChange={handleChange}
                                        placeholder="Ej. Pallet"
                                        className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-800 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Peso (Kg)</label>
                                    <div className="relative">
                                        <Scale className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="number"
                                            step="0.01"
                                            name="kg"
                                            value={formData.kg}
                                            onChange={handleChange}
                                            placeholder="0.0"
                                            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-800 outline-none"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Volumen (m³)</label>
                                    <div className="relative">
                                        <Box className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="number"
                                            step="0.001"
                                            name="m3"
                                            value={formData.m3}
                                            onChange={handleChange}
                                            placeholder="0.000"
                                            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-800 outline-none"
                                        />
                                    </div>
                                </div>
                                <div className="sm:col-span-2 lg:col-span-4">
                                    <label className="block text-sm font-bold text-emerald-700 mb-1">
                                        Monto Total a Cotizar
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600 font-bold">$</span>
                                        <input
                                            type="number"
                                            name="monto"
                                            value={formData.monto}
                                            onChange={handleChange}
                                            placeholder="Ej: 150000"
                                            className="w-full pl-8 pr-4 py-3 bg-emerald-50 border border-emerald-200 text-emerald-900 font-black rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition animate-pulse-once"
                                        />
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-tighter flex justify-between">
                                        <span>Este es el valor final que se le informará al {formData.cotiza_proveedor ? 'Proveedor' : 'Cliente'}.</span>
                                        {(!formData.id_cliente && formData.destino?.includes(',')) && (
                                            <span className="text-emerald-600 font-bold">Tarifa automática por zona</span>
                                        )}
                                    </p>
                                </div>

                                <div className="lg:col-span-4 mt-2">
                                    <label className="flex items-center gap-3 cursor-pointer p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition">
                                        <div className="relative flex items-center">
                                            <input
                                                type="checkbox"
                                                name="cotiza_proveedor"
                                                checked={formData.cotiza_proveedor}
                                                onChange={handleChange}
                                                className="w-5 h-5 cursor-pointer accent-red-800 rounded border-gray-300"
                                            />
                                        </div>
                                        <div>
                                            <span className="text-sm font-bold text-gray-900 flex items-center gap-1">¿El proveedor cotiza?</span>
                                            <p className="text-xs text-gray-500">Marca esta casilla encaso de que la cotización la realice el proveedor en lugar del cliente.</p>
                                        </div>
                                    </label>
                                </div>

                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-200">
                            <Link
                                to="/cotizaciones"
                                className="px-6 py-2.5 border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-100 transition"
                            >
                                Cancelar
                            </Link>
                            <button
                                type="submit"
                                className="flex items-center gap-2 px-8 py-2.5 bg-slate-900 text-white font-bold rounded-lg hover:bg-black focus:ring-4 focus:ring-slate-300 transition shadow-lg"
                            >
                                <Save className="w-5 h-5" /> Guardar Borrador
                            </button>
                        </div>

                    </form>
                </div>
            </div>
        </div>
    );
}