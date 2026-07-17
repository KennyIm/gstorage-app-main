import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import apiClient from '../services/api'
import logomedalla from '../assets/logomedalla.png'
import { useReactToPrint } from 'react-to-print'
import { Printer, ArrowLeft, Truck, Calendar, User, MapPin } from 'lucide-react'
import { useUI } from '../context/UIContext'

export default function OrdenEntregaPlantilla() {
    document.title = "Ordenes - GStorage"
    const { id } = useParams()
    const navigate = useNavigate()
    const componenteRef = useRef()
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [despacho, setDespacho] = useState(null)
    const [clientes, setClientes] = useState([])
    const [proveedores, setProveedores] = useState([])
    const [paginas, setPaginas] = useState([])
    const [camiones, setCamiones] = useState([])
    const [ramplas, setRamplas] = useState([])
    const [rutas, setRutas] = useState([])
    const [comunaImpresion, setComunaImpresion] = useState('TODAS')
    const [filtroRut, setFiltroRut] = useState('')
    const { showLoader, hideLoader, showToast } = useUI()

    const TASA_IVA = 0.19
    const ITEMS_POR_PAGINA = 5

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true)
                const [despachoRes, mercanciasRes, clientesRes, proveedoresRes, camionesRes, ramplasRes, rutasRes] = await Promise.all([
                    apiClient.get(`/api/inventario/despachos/${id}/`),
                    apiClient.get(`/api/inventario/mercancias/?id_despacho=${id}&page_size=200`),
                    apiClient.get('/api/inventario/clientes/'),
                    apiClient.get('/api/inventario/proveedores/'),
                    apiClient.get('/api/inventario/camiones/'),
                    apiClient.get('/api/inventario/ramplas/'),
                    apiClient.get('/api/inventario/rutas/')
                ]);

                const despachoActual = despachoRes.data
                setDespacho(despachoActual)
                const clientesData = clientesRes.data
                setClientes(clientesData)
                setProveedores(proveedoresRes.data)
                setCamiones(camionesRes.data)
                setRamplas(ramplasRes.data)
                setRutas(rutasRes.data)

                const dataNativaMercancias = mercanciasRes.data.results || mercanciasRes.data;

                const mercanciasDelViaje = dataNativaMercancias.filter(carga =>
                    String(carga.despacho) === String(id) || String(carga.id_despacho) === String(id)
                )

                const gruposPorClienteYDestino = mercanciasDelViaje.reduce((acc, carga) => {
                    const nombreCliente = carga.cliente_nombre || 'Sin Cliente'
                    const nombreDestino = carga.destino_nombre || 'No especificado'
                    const cliente = clientesData.find(c => String(c.id_cliente) === String(carga.id_cliente))

                    let esAlternativa = false
                    let dirEntrega = carga.direccion_entrega ? carga.direccion_entrega.trim().toLowerCase() : ""

                    if (cliente && dirEntrega) {
                        const dir1 = cliente.direccion ? cliente.direccion.trim().toLowerCase() : ""
                        const dir2 = cliente.direccion2 ? cliente.direccion2.trim().toLowerCase() : ""

                        if (dirEntrega !== dir1 && dirEntrega !== dir2) {
                            esAlternativa = true
                        }
                    }
                    const sufijoAlternativa = esAlternativa ? `_ALT_${carga.direccion_entrega}` : '_MAIN'
                    const claveGrupo = `${nombreCliente}_${nombreDestino}${sufijoAlternativa}`

                    if (!acc[claveGrupo]) {
                        acc[claveGrupo] = {
                            cargas: [],
                            esAlternativa: esAlternativa,
                            direccionUsada: carga.direccion_entrega
                        }
                    }
                    acc[claveGrupo].cargas.push(carga)
                    return acc
                }, {})

                const paginasCalculadas = []

                Object.keys(gruposPorClienteYDestino).forEach(claveGrupo => {
                    const infoGrupo = gruposPorClienteYDestino[claveGrupo]
                    const cargasTotales = infoGrupo.cargas
                    const cargasCliente = cargasTotales.filter(c => !c.paga_proveedor)
                    const clienteObj = clientesData.find(c => String(c.id_cliente) === String(cargasTotales[0].id_cliente)) || {}
                    const clienteNombre = cargasTotales[0].cliente_nombre || 'Sin Cliente'
                    const destino = cargasTotales[0].destino_nombre || 'No especificado'

                    const procesarChunks = (cargas, esPagaProveedor, provIdx = 0) => {
                        if (cargas.length === 0) return
                        const totalNeto = cargas.reduce((sum, c) => sum + (parseFloat(c.precio_total) || 0), 0)
                        const iva = totalNeto * TASA_IVA
                        const totalBruto = totalNeto + iva

                        for (let i = 0; i < cargas.length; i += ITEMS_POR_PAGINA) {
                            const chunkCargas = cargas.slice(i, i + ITEMS_POR_PAGINA)
                            const numPaginaActual = Math.floor(i / ITEMS_POR_PAGINA) + 1
                            const totalPaginas = Math.ceil(cargas.length / ITEMS_POR_PAGINA)

                            paginasCalculadas.push({
                                clienteNombre, clienteObj, destino,
                                cargas: chunkCargas,
                                totalNeto: totalNeto,
                                iva: iva,
                                totalBruto: totalBruto,
                                paginaActual: numPaginaActual,
                                totalPaginas: totalPaginas,
                                esUltimaPaginaDelCliente: numPaginaActual === totalPaginas,
                                esPagaProveedor: esPagaProveedor,
                                provIdx: provIdx,
                                esAlternativa: infoGrupo.esAlternativa,
                                direccionAlternativa: infoGrupo.direccionUsada,
                            })
                        }
                    }
                    procesarChunks(cargasCliente, false)
                    const cargasProveedorTodas = cargasTotales.filter(c => c.paga_proveedor)
                    const provGruposJS = {}

                    cargasProveedorTodas.forEach(carga => {
                        const pId = carga.id_proveedor_id || carga.id_proveedor || 0
                        if (!provGruposJS[pId]) provGruposJS[pId] = []
                        provGruposJS[pId].push(carga)
                    })
                    const sortedProvIds = Object.keys(provGruposJS).sort((a, b) => Number(a) - Number(b))
                    sortedProvIds.forEach((pId, index) => {
                        procesarChunks(provGruposJS[pId], true, index)
                    })
                })

                setPaginas(paginasCalculadas)
                setLoading(false)
            } catch (err) {
                setError("Hubo un error al cargar la información del despacho.")
                setLoading(false)
            }
        }
        fetchData()
    }, [id])

    const getNombreProveedor = (id) => {
        if (!id) return '-'
        const found = proveedores.find(p => Number(p.id) === Number(id))
        return found ? found.nombre_proveedor : 'Proveedor Desconocido'
    }

    const getCorreoProveedor = (id) => {
        if (!id) return '-'
        const found = proveedores.find(p => Number(p.id) === Number(id))
        return found ? found.correo : 'Sin correo'
    }

    const getRutProveedor = (id) => {
        if (!id) return ''
        const found = proveedores.find(p => Number(p.id) === Number(id))
        return found ? found.rut : ''
    }

    const formatoDinero = (valor) => Math.round(parseFloat(valor || 0)).toLocaleString('es-CL');

    const formatoFecha = (fechaHora) => {
        if (!fechaHora) return '___/___/____'
        const soloFecha = fechaHora.split('T')[0]
        const partes = soloFecha.split('-')
        if (partes.length !== 3) return soloFecha
        return `${partes[2]}/${partes[1]}/${partes[0]}`
    }

    const getPatenteCamion = (id_camion) => {
        if (!id_camion) return 'Sin Camión'
        const camionEncontrado = camiones.find(c => String(c.id_camion) === String(id_camion))
        return camionEncontrado ? camionEncontrado.patente : 'Camión Desconocido'
    }

    const getPatenteRampla = (id_rampla) => {
        if (!id_rampla) return ''
        const ramplaEncontrada = ramplas.find(r => String(r.id_rampla) === String(id_rampla))
        return ramplaEncontrada ? ` | Rampla: ${ramplaEncontrada.patente}` : ''
    }

    const getCodigoRuta = (rutaId) => {
        if (!rutaId) return 'Sin Ruta asignada'
        const rutaEncontrada = rutas.find(r => String(r.id) === String(rutaId) || String(r.id_ruta) === String(rutaId))
        if (rutaEncontrada) {
            return rutaEncontrada.codigo_ruta || rutaEncontrada.codigo || `Encontrada (Sin código)`
        }
        return `Ruta N° ${rutaId}`
    }

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
    }

    const handleUpdateCodigoOrden = async (inputElement, codigoOriginal, cargasHoja) => {
        const nuevoCodigo = inputElement.value.trim()

        const codigoActual = inputElement.getAttribute('data-actual') || codigoOriginal
        if (!nuevoCodigo || nuevoCodigo === '' || nuevoCodigo === codigoActual) return

        const idsMercancias = cargasHoja.map(m => m.id || m.id_mercancia)
        if (idsMercancias.length === 0) return

        try {
            if (typeof showLoader === 'function') showLoader()

            await apiClient.post('/api/inventario/mercancias/bulk-update-orden/', {
                ids: idsMercancias,
                nuevo_codigo_orden: nuevoCodigo
            })
            inputElement.setAttribute('data-actual', nuevoCodigo)

            if (typeof showToast === 'function') {
                showToast(`Número de orden actualizado a ${nuevoCodigo}.`, 'success')
            }

            if (typeof fetchData === 'function') fetchData()

        } catch (error) {
            console.error("Error al guardar la orden manual:", error)
            if (typeof showToast === 'function') {
                showToast('Error al conectar con el servidor de Transportes Medalla.', 'error')
            }
        } finally {
            if (typeof hideLoader === 'function') hideLoader()
        }
    }

    const generarPDF = useReactToPrint({
        contentRef: componenteRef,
        documentTitle: `Orden_Entrega_Ruta_${getCodigoRuta(id)}_${comunaImpresion}`,
        pageStyle: `
            @page { size: 210mm 277mm; margin: 0; }
            @media print { 
                html, body { 
                    background-color: #ffffff !important;
                    background: #ffffff !important;
                    visibility: visible !important;
                    -webkit-print-color-adjust: exact !important; 
                    print-color-adjust: exact !important; 
                }
                div, table, tbody, tr, td {
                    overflow: visible !important;
                    overflow-y: visible !important;
                    overflow-x: visible !important;
                }
                .hoja-pdf, .hoja-pdf * {
                    visibility: visible !important;
                    opacity: 1 !important;
                }
                .hoja-pdf h1, .hoja-pdf h2, .hoja-pdf p, .hoja-pdf span, .hoja-pdf td, .hoja-pdf th {
                    color: #0f172a !important; 
                    visibility: visible !important;
                }
                .text-blue-700 { color: #1d4ed8 !important; }
                .text-amber-700 { color: #b45309 !important; }
                .text-slate-400 { color: #94a3b8 !important; }
                .hoja-pdf {
                    width: 210mm !important;
                    height: 275mm !important;
                    background-color: #ffffff !important;
                    background: #ffffff !important;
                    margin: 0 !important;
                    box-shadow: none !important;
                    border: none !important;
                    page-break-after: always !important;
                    display: flex !important;
                    flex-direction: column !important;
                    box-sizing: border-box !important;
                }
                .saltopagina { display: none !important; }
                .border-slate-100 { border-color: #f1f5f9 !important; }
                .border-slate-200 { border-color: #e2e8f0 !important; }
                .border-slate-300 { border-color: #cbd5e1 !important; }
                .bg-slate-50 { background-color: #f8fafc !important; }
            }
        `
    })

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-200 text-slate-600 font-medium">Preparando documento...</div>;
    if (error) return <div className="min-h-screen flex items-center justify-center bg-slate-200 text-red-600 p-8 text-center">{error}</div>;
    if (paginas.length === 0) return <div className="bg-slate-200 min-h-screen p-8"><div className="max-w-4xl mx-auto bg-white p-8 text-center rounded-2xl shadow text-slate-500 font-medium">No hay mercancías asignadas a este despacho.</div></div>;

    return (
        <div className="bg-slate-200 min-h-screen p-4 sm:p-8 text-slate-900 font-sans print:p-0 print:bg-white">
            <div className="max-w-5xl mx-auto mb-6 flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-100 print:hidden">
                <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-600 hover:text-indigo-600 font-medium transition flex-shrink-0">
                    <ArrowLeft className="w-5 h-5" /> Volver al Despacho
                </button>
                <div className="flex items-center gap-2 rounded-xl px-3 py-1.5 w-full md:w-auto justify-between md:justify-start">
                    <select
                        value={comunaImpresion}
                        onChange={(e) => setComunaImpresion(e.target.value)}
                        className="text-xs font-black bg-white border border-slate-300 rounded-lg px-2 py-1 text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                    >
                        <option value="TODAS">TODAS</option>
                        <option value="SANTIAGO">SANTIAGO</option>
                        <option value="IQUIQUE">IQUIQUE</option>
                        <option value="COPIAPO">COPIAPÓ</option>
                        <option value="ZONA_ANTOFAGASTA">ZONA ANTOFAGASTA</option>
                    </select>
                    <input
                        type="text"
                        placeholder="Buscar por RUT..."
                        value={filtroRut}
                        onChange={(e) => setFiltroRut(e.target.value)}
                        className="text-xs bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none w-full sm:w-44 h-9 font-bold tracking-wide"
                    />
                </div>

                <div className="flex items-center gap-2 flex-shrink-0 w-full md:w-auto justify-end">
                    <button
                        onClick={handleGenerarOrdenes}
                        className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl shadow-md hover:bg-indigo-700 font-bold text-xs transition"
                    >
                        Generar N° de Órdenes
                    </button>
                    <button onClick={generarPDF} className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-md hover:bg-slate-800 font-bold text-xs transition">
                        <Printer className="w-4 h-4" /> Imprimir Documento
                    </button>
                </div>
            </div>
            <div ref={componenteRef} className="print:w-[210mm] mx-auto text-slate-900 print:bg-white print:text-black">
                {(() => {
                    const normalizarTexto = (text) => (text || '').toUpperCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                    const paginasFiltradas = paginas.filter(pagina => {
                        let cumpleComuna = true;
                        if (comunaImpresion !== 'TODAS') {
                            const destinoLimpio = normalizarTexto(pagina.destino);
                            if (comunaImpresion === 'ZONA_ANTOFAGASTA') {
                                cumpleComuna = ['ANTOFAGASTA', 'MEJILLONES', 'CALAMA', 'TOCOPILLA'].includes(destinoLimpio);
                            } else {
                                cumpleComuna = (destinoLimpio === normalizarTexto(comunaImpresion));
                            }
                        }
                        let cumpleRut = true;
                        if (filtroRut.trim() !== '') {
                            const terminoLimpio = filtroRut.toLowerCase().replace(/[^0-9kK]/g, '');
                            const rutCliente = pagina.clienteObj?.rut_cliente || pagina.clienteObj?.rut || pagina.cargas?.[0]?.rut_cliente || '';
                            const rutLimpio = String(rutCliente).toLowerCase().replace(/[^0-9kK]/g, '');
                            cumpleRut = rutLimpio.includes(terminoLimpio);
                        }

                        return cumpleComuna && cumpleRut;
                    });

                    if (paginasFiltradas.length === 0) {
                        return (
                            <div className="max-w-4xl mx-auto bg-white p-12 text-center rounded-2xl shadow border border-slate-200 text-slate-400 font-semibold print:hidden">
                                No se encontraron registros de carga para los criterios especificados.
                            </div>
                        );
                    }

                    return paginasFiltradas.map((pagina, index) => {
                        const codigoOrden = pagina.cargas.length > 0 ? pagina.cargas[0].numero_orden_entrega : 'Sin N/O';
                        const idUnicoHoja = pagina.cargas.length > 0 ? pagina.cargas[0].id_mercancia : index;
                        const destinoNombre = pagina.destino || '';
                        const citySecundaria = pagina.clienteObj.ciudad2 || '';
                        const ciudadMostrar = destinoNombre || 'Sin ciudad';
                        let direccionMostrar = pagina.clienteObj.direccion || 'Sin dirección';
                        if (pagina.esAlternativa && pagina.direccionAlternativa) {
                            direccionMostrar = pagina.direccionAlternativa;
                        }
                        else if (citySecundaria && destinoNombre.toLowerCase().includes(citySecundaria.toLowerCase())) {
                            direccionMostrar = pagina.clienteObj.direccion2 || direccionMostrar;
                        }

                        return (
                            <React.Fragment key={`pagina-real-${idUnicoHoja}-${pagina.paginaActual}-${pagina.esPagaProveedor ? 'prov' : 'cli'}`}>
                                {index > 0 && <div className="saltopagina" style={{ pageBreakBefore: 'always' }}></div>}

                                <div
                                    className="hoja-pdf w-[210mm] h-[277mm] flex flex-col bg-white px-8 py-6 box-border mx-auto print:shadow-none print:m-0 shadow-lg mb-8"
                                    style={{ pageBreakAfter: 'always' }}
                                >
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
                                            <div className="flex items-center gap-x-20">
                                                <div className="flex items-center justify-center shrink-0">
                                                    <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Orden de Entrega</h1>
                                                </div>
                                                <div>
                                                    <p className="mt-0.5 text-[7px] text-slate-900 font-medium leading-tight m-0 p-0 text-center whitespace-nowrap">
                                                    </p>
                                                </div>
                                            </div>
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
                                                        key={`orden-input-${idUnicoHoja}-${codigoOrden}`}
                                                        type="text"
                                                        defaultValue={codigoOrden}
                                                        placeholder="N/R"
                                                        className="w-16 h-6 bg-white border border-slate-300 rounded text-center focus:outline-none text-[10px] font-bold text-slate-900 focus:ring-2 focus:ring-red-800 transition-all"
                                                        onBlur={(e) => handleUpdateCodigoOrden(e.target, codigoOrden, pagina.cargas)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                e.target.blur();
                                                            }
                                                        }}
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
                                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 mb-3 flex justify-between items-start shrink-0 print:bg-slate-50 print:border-slate-200 print:text-black">
                                        <div className="w-3/4 pr-2">
                                            <div className="flex flex-wrap items-baseline gap-x-2 mb-1">
                                                <h2 className="text-base font-black text-slate-900 leading-tight break-words">{pagina.clienteNombre}</h2>
                                                <span className="text-[10px] font-semibold text-slate-900 whitespace-nowrap">RUT: {pagina.clienteObj?.rut_cliente || pagina.clienteObj?.rut || 'N/R'}</span>
                                                <span className="text-[10px] font-semibold text-slate-900 whitespace-nowrap">Tel: {pagina.clienteObj?.telefono_contacto || pagina.clienteObj?.celular || 'N/R'}</span>
                                            </div>
                                            <div className="flex flex-wrap items-start gap-x-4 gap-y-1 text-[10px] font-medium text-slate-600">
                                                <p className="flex items-start gap-1 flex-1 min-w-[50%]">
                                                    <MapPin className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                                                    <span className='text-slate-900 font-bold leading-tight break-words'>
                                                        {direccionMostrar}, {ciudadMostrar}
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
                                                    const precioKg = parseFloat(pagina.clienteObj?.precio_kg || 0);
                                                    const precioM3 = parseFloat(pagina.clienteObj?.precio_m3 || 0);
                                                    const costoPorPeso = peso * precioKg;
                                                    const costoPorVolumen = volumen * precioM3;
                                                    const cobroPorM3 = costoPorVolumen > costoPorPeso;

                                                    return (
                                                        <tr key={carga.id_mercancia} className="align-top hover:bg-slate-50/30 break-inside-avoid">
                                                            <td className="py-1.5 px-1 text-center font-semibold text-slate-800 align-middle">{carga.cantidad_bultos}</td>
                                                            <td className="py-1.5 px-1 text-center font-semibold text-slate-800 align-middle">{carga.tipo}</td>
                                                            <td className="py-1.5 px-1 text-center leading-tight break-words">
                                                                <p className="text-[10px] text-slate-900 font-bold ">
                                                                    {getNombreProveedor(carga.id_proveedor)}
                                                                </p>
                                                                {carga.id_proveedor && (
                                                                    <p className="text-[9px] font-medium text-slate-700 mt-0.5">
                                                                        RUT: {getRutProveedor(carga.id_proveedor) || `ID: ${carga.id_proveedor}`}
                                                                    </p>
                                                                )}
                                                                <p className="text-[9px] font-medium text-slate-700 break-all">
                                                                    {getCorreoProveedor(carga.id_proveedor)}
                                                                </p>
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
                                    <div className="mt-4 pt-4 border-t border-slate-100 shrink-0">
                                        <div className="flex justify-between items-end w-full gap-4">
                                            <div className="text-center w-72 mb-1">
                                                <div className="border-t-2 border-slate-400 pt-1.5">
                                                    <p className="font-bold text-[9px] text-slate-900 uppercase">Recibe Conforme, Nombre, RUT, Firma y Fecha</p>
                                                </div>
                                            </div>
                                            <div className="border border-slate-400 rounded-md py-1 px-2 w-72 text-[9px] text-slate-900 font-semibold bg-white mb-1 shrink-0">
                                                <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                                                    <div className="flex items-center gap-1.5 w-full">
                                                        <span className="shrink-0">Efectivo</span>
                                                        <div className="w-2.5 h-2.5 border border-slate-900 rounded-sm shrink-0"></div>
                                                        <div className="flex-1 border-b border-slate-400 h-2"></div>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 w-full">
                                                        <span className="shrink-0">Vale Vista</span>
                                                        <div className="w-2.5 h-2.5 border border-slate-900 rounded-sm shrink-0"></div>
                                                        <div className="flex-1 border-b border-slate-400 h-2"></div>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 w-full">
                                                        <span className="shrink-0">Transferencia</span>
                                                        <div className="w-2.5 h-2.5 border border-slate-900 rounded-sm shrink-0"></div>
                                                        <div className="flex-1 border-b border-slate-400 h-2"></div>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 w-full">
                                                        <span className="shrink-0">Cheque</span>
                                                        <div className="w-2.5 h-2.5 border border-slate-900 rounded-sm shrink-0"></div>
                                                        <div className="flex-1 border-b border-slate-400 h-2"></div>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 w-full">
                                                        <span className="shrink-0">Credito</span>
                                                        <div className="w-2.5 h-2.5 border border-slate-900 rounded-sm shrink-0"></div>
                                                        <div className="flex-1 border-b border-slate-400 h-2"></div>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 w-full">
                                                        <span className="shrink-0">Orden de Compra</span>
                                                        <div className="w-2.5 h-2.5 border border-slate-900 rounded-sm shrink-0"></div>
                                                        <div className="flex-1 border-b border-slate-400 h-2 min-w-[35px]"></div>
                                                    </div>

                                                </div>
                                            </div>
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
                    });
                })()}
            </div>
        </div>
    );
}