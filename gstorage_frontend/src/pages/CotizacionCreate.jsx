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
    document.title = "Nueva Cotización - GStorage";
    const navigate = useNavigate();
    const { logoutUser } = useAuth();
    const { showLoader, hideLoader, showToast } = useUI();

    const [clientes, setClientes] = useState([]);
    const [proveedores, setProveedores] = useState([]);
    const [loadingInicial, setLoadingInicial] = useState(true);

    const [formData, setFormData] = useState({
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
        monto: ''
    });

    useEffect(() => {
        const fetchCatalogos = async () => {
            setLoadingInicial(true);
            try {
                const [clientesRes, provRes] = await Promise.all([
                    apiClient.get('/api/inventario/clientes/'),
                    apiClient.get('/api/inventario/proveedores/')
                ]);
                setClientes(clientesRes.data);
                setProveedores(provRes.data);
            } catch (err) {
                if (err.response && err.response.status === 401) {
                    showToast('Sesión expirada. Vuelve a iniciar sesión.', 'error');
                    logoutUser();
                } else {
                    showToast('Error al cargar listas de clientes y proveedores.', 'error');
                }
            } finally {
                setLoadingInicial(false);
            }
        };
        fetchCatalogos();
    }, [logoutUser, showToast]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.nombre_cliente) {
            showToast('Debes ingresar o seleccionar un cliente.', 'error');
            return;
        }

        showLoader();
        try {
            const payload = {
                ...formData,
                cantidad: parseInt(formData.cantidad) || 1,
                kg: formData.kg ? parseFloat(formData.kg) : null,
                m3: formData.m3 ? parseFloat(formData.m3) : null,
                estado_cotizacion: 'En proceso'
            };

            await apiClient.post('/api/inventario/cotizaciones/', payload);
            showToast('Cotización creada exitosamente', 'success');
            navigate('/cotizaciones');
        } catch (err) {
            console.error(err);
            showToast('Error al crear la cotización. Verifica los datos.', 'error');
        } finally {
            hideLoader();
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

                {/* ENCABEZADO */}
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Nueva Cotización</h1>
                        <p className="mt-2 text-sm text-gray-500">Crea una estimación de servicios aislada del inventario central.</p>
                    </div>
                    <Link to="/cotizaciones" className="hidden sm:flex items-center gap-2 text-gray-500 hover:text-red-800 transition font-medium">
                        <ArrowLeft className="w-5 h-5" /> Volver
                    </Link>
                </div>

                <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                    <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-8">

                        {/* SECCIÓN 1: CLIENTE */}
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
                                            rut: c.rut_cliente,
                                            nombre: c.nombre_cliente
                                        }))}
                                        onChange={(opt) => {
                                            if (opt) {
                                                setFormData(prev => ({ ...prev, rut_cliente: opt.rut || '', nombre_cliente: opt.nombre }));
                                            }
                                        }}
                                        className="text-sm"
                                    />
                                    <p className="text-xs text-gray-400 mt-1 italic">Selecciona uno para auto-rellenar los campos de abajo.</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Razón Social / Nombre *</label>
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

                        {/* SECCIÓN 2: PROVEEDOR */}
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

                        {/* SECCIÓN 3: ESPECIFICACIONES DE CARGA */}
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
                                            className="w-full pl-8 pr-4 py-3 bg-emerald-50 border border-emerald-200 text-emerald-900 font-black rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition"
                                        />
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-tighter">
                                        Este es el valor final que se le informará al {formData.cotiza_proveedor ? 'Proveedor' : 'Cliente'}.
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

                        {/* ACCIONES */}
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