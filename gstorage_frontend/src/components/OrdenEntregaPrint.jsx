import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../services/api';
import logomedalla from '../assets/logomedalla.png';
import { useReactToPrint } from 'react-to-print';
import { Printer, ArrowLeft, Truck, Calendar, User, MapPin } from 'lucide-react';

export default function OrdenEntregaPlantilla() {
    const { id } = useParams();
    const navigate = useNavigate();

    const componenteRef = useRef();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [despacho, setDespacho] = useState(null);
    const [clientes, setClientes] = useState([]);
    const [proveedores, setProveedores] = useState([]);
    const [paginas, setPaginas] = useState([]);
    const [camiones, setCamiones] = useState([]);
    const [ramplas, setRamplas] = useState([]);
    const [rutas, setRutas] = useState([]);

    const TASA_IVA = 0.19;
    const ITEMS_POR_PAGINA = 5;

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [despachoRes, mercanciasRes, clientesRes, proveedoresRes, camionesRes, ramplasRes, rutasRes] = await Promise.all([
                    apiClient.get(`/api/inventario/despachos/${id}/`),
                    apiClient.get('/api/inventario/mercancias/'),
                    apiClient.get('/api/inventario/clientes/'),
                    apiClient.get('/api/inventario/proveedores/'),
                    apiClient.get('/api/inventario/camiones/'),
                    apiClient.get('/api/inventario/ramplas/'),
                    apiClient.get('/api/inventario/rutas/')
                ]);

                const despachoActual = despachoRes.data;
                setDespacho(despachoActual);
                const clientesData = clientesRes.data;
                setClientes(clientesData);
                setProveedores(proveedoresRes.data);
                setCamiones(camionesRes.data);
                setRamplas(ramplasRes.data);
                setRutas(rutasRes.data);

                const mercanciasDelViaje = mercanciasRes.data.filter(carga =>
                    String(carga.despacho) === String(id) || String(carga.id_despacho) === String(id)
                );

                const gruposPorClienteYDestino = mercanciasDelViaje.reduce((acc, carga) => {
                    const nombreCliente = carga.cliente_nombre || 'Sin Cliente';
                    const nombreDestino = carga.destino_nombre || 'No especificado';
                    const claveGrupo = `${nombreCliente}_${nombreDestino}`;

                    if (!acc[claveGrupo]) acc[claveGrupo] = [];
                    acc[claveGrupo].push(carga);
                    return acc;
                }, {});
                const paginasCalculadas = [];

                Object.keys(gruposPorClienteYDestino).forEach(claveGrupo => {
                    const cargasTotales = gruposPorClienteYDestino[claveGrupo];
                    const cargasCliente = cargasTotales.filter(c => !c.paga_proveedor);
                    const cargasProveedor = cargasTotales.filter(c => c.paga_proveedor);

                    const clienteObj = clientesData.find(c => String(c.id_cliente) === String(cargasTotales[0].id_cliente)) || {};
                    const clienteNombre = cargasTotales[0].cliente_nombre || 'Sin Cliente';
                    const destino = cargasTotales[0].destino_nombre || 'No especificado';
                    const procesarChunks = (cargas, esPagaProveedor) => {
                        if (cargas.length === 0) return;

                        const totalNeto = cargas.reduce((sum, c) => sum + (parseFloat(c.precio_total) || 0), 0);
                        const iva = totalNeto * TASA_IVA;
                        const totalBruto = totalNeto + iva;

                        for (let i = 0; i < cargas.length; i += ITEMS_POR_PAGINA) {
                            const chunkCargas = cargas.slice(i, i + ITEMS_POR_PAGINA);
                            const numPaginaActual = Math.floor(i / ITEMS_POR_PAGINA) + 1;
                            const totalPaginas = Math.ceil(cargas.length / ITEMS_POR_PAGINA);

                            paginasCalculadas.push({
                                clienteNombre, clienteObj, destino,
                                cargas: chunkCargas,
                                totalNeto: totalNeto,
                                iva: iva,
                                totalBruto: totalBruto,
                                paginaActual: numPaginaActual,
                                totalPaginas: totalPaginas,
                                esUltimaPaginaDelCliente: numPaginaActual === totalPaginas,
                                esPagaProveedor: esPagaProveedor
                            });
                        }
                    };
                    procesarChunks(cargasCliente, false);
                    procesarChunks(cargasProveedor, true);
                });

                setPaginas(paginasCalculadas);
                setLoading(false);
            } catch (err) {
                setError("Hubo un error al cargar la información del despacho.");
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    const getNombreProveedor = (id) => {
        if (!id) return '-';
        const found = proveedores.find(p => String(p.rut) === String(id));
        return found ? found.nombre_proveedor : 'Proveedor Desconocido';
    };

    const getCorreoProveedor = (id) => {
        if (!id) return '-';
        const found = proveedores.find(p => String(p.rut) === String(id));
        return found ? found.correo : 'Sin correo';
    };

    const formatoDinero = (valor) => Math.round(parseFloat(valor || 0)).toLocaleString('es-CL');

    const formatoFecha = (fechaHora) => {
        if (!fechaHora) return '___/___/____';
        const soloFecha = fechaHora.split('T')[0];
        const partes = soloFecha.split('-');
        if (partes.length !== 3) return soloFecha;
        return `${partes[2]}/${partes[1]}/${partes[0]}`;
    };

    const getPatenteCamion = (id_camion) => {
        if (!id_camion) return 'Sin Camión';
        const camionEncontrado = camiones.find(c => String(c.id_camion) === String(id_camion));
        return camionEncontrado ? camionEncontrado.patente : 'Camión Desconocido';
    };

    const getPatenteRampla = (id_rampla) => {
        if (!id_rampla) return '';
        const ramplaEncontrada = ramplas.find(r => String(r.id_rampla) === String(id_rampla));
        return ramplaEncontrada ? ` | Rampla: ${ramplaEncontrada.patente}` : '';
    };

    const getCodigoRuta = (rutaId) => {
        if (!rutaId) return 'Sin Ruta asignada';
        const rutaEncontrada = rutas.find(r => String(r.id) === String(rutaId) || String(r.id_ruta) === String(rutaId));

        if (rutaEncontrada) {
            return rutaEncontrada.codigo_ruta || rutaEncontrada.codigo || `Encontrada (Sin código)`;
        }

        return `Ruta N° ${rutaId}`;
    };

    const handleGenerarOrdenes = async () => {
        if (!window.confirm("¿Seguro que deseas fijar los Números de Orden para este despacho? Una vez generados, quedarán guardados.")) return;

        try {
            setLoading(true);
            await apiClient.post(`/api/inventario/despachos/${id}/generar-ordenes/`);
            alert("¡Números de Orden generados con éxito!");
            window.location.reload();
        } catch (err) {
            console.error(err);
            alert("Hubo un error al generar las órdenes.");
            setLoading(false);
        }
    };

    const generarPDF = useReactToPrint({
        contentRef: componenteRef,
        documentTitle: `Orden_Entrega_Ruta_${getCodigoRuta(id)}`,
        pageStyle: `
            @page { size: 210mm 275mm; margin: 0; }
            @media print { 
                body { 
                    -webkit-print-color-adjust: exact; 
                    print-color-adjust: exact; 
                }
                .hoja-pdf {
                    margin-bottom: 0 !important;
                    box-shadow: none !important;
                    border: none !important;
                    page-break-after: always;
                }
                .saltopagina {
                    display: none !important; 
                }
            }
        `
    });

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-200 text-slate-600 font-medium">Preparando documento...</div>;
    if (error) return <div className="min-h-screen flex items-center justify-center bg-slate-200 text-red-600 p-8 text-center">{error}</div>;

    if (paginas.length === 0) return <div className="bg-slate-200 min-h-screen p-8"><div className="max-w-4xl mx-auto bg-white p-8 text-center rounded-2xl shadow text-slate-500 font-medium">No hay mercancías asignadas a este despacho.</div></div>;

    return (
        <div className="bg-slate-200 min-h-screen p-4 sm:p-8 text-slate-900 font-sans print:p-0 print:bg-white">

            {/* BARRA DE HERRAMIENTAS */}
            <div className="max-w-4xl mx-auto mb-6 flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-100 print:hidden">
                <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-600 hover:text-indigo-600 font-medium transition">
                    <ArrowLeft className="w-5 h-5" /> Volver al Despacho
                </button>
                <button
                    onClick={handleGenerarOrdenes}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl shadow-md hover:bg-indigo-700 font-bold transition"
                >
                    Generar N° de Órdenes
                </button>
                <button onClick={generarPDF} className="flex items-center gap-2 bg-slate-900 text-white px-6 py-2.5 rounded-xl shadow-md hover:bg-slate-800 font-bold transition">
                    <Printer className="w-5 h-5" /> Imprimir Documento
                </button>
            </div>

            {/* CONTENEDOR */}
            <div ref={componenteRef} className="print:w-[210mm] mx-auto">
                {paginas.map((pagina, index) => {
                    const isLastPageGlobal = index === paginas.length - 1;
                    const codigoOrden = pagina.cargas.length > 0 ? pagina.cargas[0].numero_orden_entrega : 'Sin N/O';
                    return (
                        <React.Fragment key={`pagina-wrapper-${index}`}>
                            {index > 0 && <div className="saltopagina" style={{ pageBreakBefore: 'always' }}></div>}

                            <div
                                className="hoja-pdf w-[210mm] h-[275mm] flex flex-col bg-white px-8 py-6 box-border mx-auto print:shadow-none print:m-0 shadow-lg mb-8"
                                style={{ pageBreakAfter: 'always' }}
                            >

                                {/* --- ENCABEZADO PRINCIPAL --- */}
                                <div className="flex justify-between items-start w-full border-b-2 border-slate-100 pb-4 mb-4 shrink-0">
                                    <div className="flex flex-col gap-4 w-[65%]">
                                        <div className="flex items-center gap-2">
                                            <div className="w-20 h-20 flex items-center justify-center shrink-0">
                                                <img src={logomedalla} alt="Logo GStorage" className="max-h-full max-w-full object-contain" />
                                            </div>
                                            <div>
                                                <h2 className="text-[10px] font-black text-slate-900 uppercase tracking-tight text-center">SERVICIO DE LOGISTICAS Y TRANSPORTES MEDALLA'S SPA</h2>
                                                <p className="mt-0.5 text-[8px] sm:text-[9px] text-slate-900 font-medium leading-tight m-0 p-0 text-center">
                                                    RUT: 77.797.573-0 <br />
                                                    VIA UNO KILOMETRO 8 MANZANA 2J BAJO MOLLE, IQUIQUE. FONO 5725233535 CEL 988086461<br />
                                                    AGUAS CALIENTES 13572 / AV. H. DE LA CONCEPCION. CEL 944934271<br />
                                                    AV. LO ESPEJO 01565 CALLE 10 BODEGA 1011-1013 MERSAN STGO. CEL 944934272-944934273
                                                </p>
                                            </div>
                                        </div>
                                        <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Orden de Entrega</h1>
                                    </div>

                                    <div className="flex flex-col items-end text-right w-[35%]">
                                        <div className="p-1 w-full">
                                            {pagina.totalPaginas > 1 && (
                                                <div className="text-[10px] font-bold text-slate-400 mb-2">
                                                    Hoja {pagina.paginaActual} de {pagina.totalPaginas}
                                                </div>
                                            )}
                                            <div className="flex items-center justify-end gap-2 text-xs font-semibold text-slate-700 mb-1">
                                                <span className="text-slate-900 font-medium">Ruta N°</span>
                                                <span className="text-slate-900">{getCodigoRuta(despacho?.id_ruta)}</span>
                                            </div>
                                            <div className="flex items-center justify-end gap-2 text-xs font-semibold text-slate-700 mb-1">
                                                <span className="text-slate-900 font-medium">N°</span>
                                                <input
                                                    type="text"
                                                    defaultValue={codigoOrden}
                                                    placeholder="N/R"
                                                    className="w-16 h-6 bg-white border border-slate-300 rounded text-center focus:outline-none text-[11px] font-bold text-slate-900"
                                                />
                                            </div>
                                            <div className="flex items-center justify-end gap-1.5 text-xs font-semibold text-slate-900 pt-1 mt-1">
                                                <User className="w-3.5 h-3.5 text-slate-900 shrink-0" />
                                                <span className="text-slate-900">{despacho?.nombre_conductor || 'No asignado'}</span>
                                            </div>
                                            <div className="flex items-center justify-end gap-1.5 text-[10px] font-semibold text-slate-700 mt-1">
                                                <Truck className="w-3.5 h-3.5 text-slate-900 shrink-0" />
                                                <span className="text-slate-900">
                                                    {getPatenteCamion(despacho?.id_camion)}
                                                    {getPatenteRampla(despacho?.id_rampla)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* --- TARJETA DEL CLIENTE --- */}
                                <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 mb-3 flex justify-between items-start shrink-0 print:bg-slate-50 print:border-slate-200 print:text-black">
                                    <div className="w-3/4 pr-2">
                                        <div className="flex flex-wrap items-baseline gap-x-2 mb-1">
                                            <h2 className="text-base font-black text-slate-900 leading-tight break-words">{pagina.clienteNombre}</h2>
                                            <span className="text-[10px] font-semibold text-slate-900 whitespace-nowrap">RUT: {pagina.clienteObj.rut_cliente || 'N/R'}</span>
                                            <span className="text-[10px] font-semibold text-slate-900 whitespace-nowrap">Tel: {pagina.clienteObj.telefono_contacto || pagina.clienteObj.celular || 'N/R'}</span>
                                        </div>
                                        <div className="flex flex-wrap items-start gap-x-4 gap-y-1 text-[10px] font-medium text-slate-600">
                                            <p className="flex items-start gap-1 flex-1 min-w-[50%]">
                                                <MapPin className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                                                <span className='text-slate-900 font-bold leading-tight break-words'>
                                                    {pagina.clienteObj.direccion ? `${pagina.clienteObj.direccion}, ` : ''}{pagina.clienteObj.ciudad}
                                                </span>
                                            </p>
                                        </div>
                                    </div>
                                    <div className="w-1/4 text-right shrink-0">
                                        <p className="text-[8px] font-bold text-slate-900 uppercase tracking-widest mb-0.5">Fecha</p>
                                        <p className="text-xs font-bold text-slate-900 flex items-center justify-end gap-1">
                                            <Calendar className="w-3.5 h-3.5 text-slate-900" />
                                            {formatoFecha(despacho?.fecha_salida_real)}
                                        </p>
                                    </div>
                                </div>

                                {/* --- TABLA DE MERCANCÍAS --- */}
                                <div className="flex-grow overflow-hidden">
                                    <table className="w-full text-[10px]">
                                        <thead>
                                            <tr className="border-y border-slate-300 bg-slate-50/50 print:bg-slate-50">
                                                <th className="py-1.5 px-1 text-center font-bold text-slate-900 uppercase tracking-wider w-[4%]">Cantidad</th>
                                                <th className="py-1.5 px-1 text-center font-bold text-slate-900 uppercase tracking-wider w-[4%]">Tipo</th>
                                                <th className="py-1.5 px-1 text-center font-bold text-slate-900 uppercase tracking-wider w-[35%]">Proveedor</th>
                                                <th className="py-1.5 px-1 text-center font-bold text-slate-900 uppercase tracking-wider w-[12%]">Paga Prov</th>
                                                <th className="py-1.5 px-1 text-center font-bold text-slate-900 uppercase tracking-wider w-[15%]">Factura</th>
                                                <th className="py-1.5 px-1 text-center font-bold text-slate-900 uppercase tracking-wider w-[15%]">Medidas</th>
                                                <th className="py-1.5 px-1 text-right font-bold text-slate-900 uppercase tracking-wider w-[15%]">Valor Neto</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {pagina.cargas.map((carga) => {
                                                const peso = parseFloat(carga.kg || 0);
                                                const volumen = parseFloat(carga.m3 || 0);
                                                const precioKg = parseFloat(pagina.clienteObj.precio_kg || 0);
                                                const precioM3 = parseFloat(pagina.clienteObj.precio_m3 || 0);
                                                const costoPorPeso = peso * precioKg;
                                                const costoPorVolumen = volumen * precioM3;
                                                const cobroPorM3 = costoPorVolumen > costoPorPeso;

                                                return (
                                                    <tr key={carga.id_mercancia} className="align-top hover:bg-slate-50/30 break-inside-avoid">
                                                        <td className="py-1.5 px-1 text-center font-semibold text-slate-800 align-middle">{carga.cantidad_bultos}</td>
                                                        <td className="py-1.5 px-1 text-center font-semibold text-slate-800 align-middle">{carga.tipo}</td>
                                                        <td className="py-1.5 px-1 text-center leading-tight break-words">
                                                            <p className="text-[10px] text-slate-900 font-bold ">{getNombreProveedor(carga.id_proveedor)}</p>
                                                            {carga.id_proveedor && <p className="text-[9px] font-medium text-slate-700 mt-0.5">RUT: {carga.id_proveedor}</p>}
                                                            <p className="text-[9px] font-medium text-slate-700 break-all">{getCorreoProveedor(carga.id_proveedor)}</p>
                                                        </td>
                                                        <td className="py-1.5 px-1 text-center align-middle">
                                                            <input
                                                                type="checkbox"
                                                                className="w-3.5 h-3.5 text-indigo-600 rounded"
                                                                checked={carga.paga_proveedor || false}
                                                                readOnly
                                                            />
                                                        </td>
                                                        <td className="py-1.5 px-1 text-center font-medium text-slate-700 align-middle">{carga.factura || '-'}</td>
                                                        <td className="py-1.5 px-1 text-center leading-tight align-middle">
                                                            {cobroPorM3 ? (
                                                                <>
                                                                    <p className="text-[11px] font-black text-slate-900">{volumen.toFixed(2)} m³</p>
                                                                    <p className="text-[9px] font-medium text-slate-900">{peso.toFixed(1)} Kg</p>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <p className="text-[11px] font-black text-slate-900">{peso.toFixed(1)} Kg</p>
                                                                    <p className="text-[9px] font-medium text-slate-900">{volumen.toFixed(2)} m³</p>
                                                                </>
                                                            )}
                                                        </td>
                                                        <td className="py-1.5 px-1 text-right font-bold text-slate-900 align-middle">${formatoDinero(carga.precio_total)}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {/* --- TOTALES Y FIRMAS --- */}
                                <div className="mt-4 pt-4 border-t border-slate-100 shrink-0">
                                    <div className="flex justify-between items-end w-full">
                                        <div className="text-center w-72 mb-1">
                                            <div className="border-t-2 border-slate-400 pt-1.5">
                                                <p className="font-bold text-[9px] text-slate-900 uppercase">Recibe Conforme, Nombre, RUT, Firma y Fecha</p>
                                            </div>
                                        </div>

                                        {/* Los totales solo se muestran en la última página del cliente */}
                                        <div className="w-48 text-right">
                                            {pagina.esUltimaPaginaDelCliente ? (
                                                <div className="border-t border-slate-200 pt-2">
                                                    <div className="flex justify-between text-[10px] text-slate-600">
                                                        <span>Subtotal Neto</span><span>${formatoDinero(pagina.totalNeto)}</span>
                                                    </div>
                                                    <div className="flex justify-between text-[10px] text-slate-600">
                                                        <span>IVA (19%)</span><span>${formatoDinero(pagina.iva)}</span>
                                                    </div>
                                                    <div className="flex justify-between border-t border-slate-900 font-black text-sm text-slate-900 mt-1 pt-1">
                                                        <span>TOTAL</span><span>${formatoDinero(pagina.totalBruto)}</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="text-[10px] font-bold text-slate-400 italic">
                                                    Pág. {pagina.paginaActual} de {pagina.totalPaginas} - Sigue...
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                            </div>
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
}