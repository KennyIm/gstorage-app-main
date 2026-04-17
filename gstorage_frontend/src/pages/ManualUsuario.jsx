import React, { useState } from 'react';
import { BookOpen, Package, Truck, Shield, Search, Info, MapPin, Box, TriangleAlert } from 'lucide-react';

export default function ManualUsuario() {
    const [seccionActiva, setSeccionActiva] = useState('introduccion');
    const [subSeccionActiva, setSubSeccionActiva] = useState(null);

    const secciones = [
        { id: 'introduccion', titulo: 'Introducción', icono: <BookOpen className="w-5 h-5" /> },
        {
            id: 'mercancias',
            titulo: 'Gestión de Mercancías',
            icono: <Package className="w-5 h-5" />,
            subsecciones: [
                { id: 'ingreso', titulo: 'Ingreso de Mercancía' },
                { id: 'detalle', titulo: 'Ver Detalles' },
                { id: 'edicion', titulo: 'Edición' },
                { id: 'eliminacion', titulo: 'Eliminación' },
                { id: 'filtrado', titulo: 'Filtrado' }
            ]
        },
        { id: 'despachos', titulo: 'Rutas y Despachos', icono: <Truck className="w-5 h-5" /> },
        { id: 'seguridad', titulo: 'Permisos y Sucursales', icono: <Shield className="w-5 h-5" /> },
    ];


    const renderContenido = () => {
        if (seccionActiva === 'mercancias') {
            switch (subSeccionActiva) {
                case 'ingreso':
                    return (
                        <div className="space-y-6 animate-fade-down animate-duration-300">
                            <h2 className="text-2xl font-bold text-red-800 border-b pb-2">Gestión de Mercancías</h2>

                            <div>
                                <p className="text-gray-600 mb-2">
                                    Este módulo permite el control total de la carga que ingresa al inventario, desde su registro inicial hasta su visualización,
                                    edición y baja del sistema. Es el núcleo operativo para el seguimiento de los bultos en la bodega.
                                </p>
                                <h3 className="text-lg font-bold text-gray-700 mb-2 flex items-center gap-2">
                                    Ingreso de Nueva Mercancía
                                </h3>
                                <p className="text-gray-600 mb-2">
                                    Esta sección detalla el procedimiento para registrar nueva carga en el sistema. Para acceder, diríjase al listado de mercancías y haga clic en el botón "Nueva Mercancía".
                                </p>
                                <h4 className="text-base font-bold text-gray-700 mb-2 flex items-center gap-2">
                                    Requisitos Previos Operacionales
                                </h4>
                                <p className="text-gray-600 mb-2">
                                    Para garantizar la integridad de los datos y el correcto cálculo de tarifas, <strong>antes de iniciar el registro</strong> asegúrese de contar con la siguiente información en el sistema:
                                </p>
                                <ul className="list-disc pl-5 space-y-1 text-gray-600">
                                    <li><strong>Cliente Creado:</strong> El cliente propietario de la carga debe estar registrado previamente, incluyendo sus datos de contacto generales y, obligatoriamente, sus tarifas asignadas.</li>
                                    <li><strong>Proveedor Creado:</strong> Debe existir el registro del proveedor con sus datos respectivos.</li>
                                </ul>
                                <p className="text-gray-600 mb-2">
                                    Para más información sobre cómo crear estos registros, consulte la sección<strong> Datos Catálogo</strong>.
                                </p>
                                <h4 className="text-base font-bold text-gray-700 mb-2 flex items-center gap-2">
                                    Pasos para el Llenado del Formulario
                                </h4>
                                <p className="text-red-800 font-bold mb-2">
                                    Asignación y Destino
                                </p>
                                <ul className="list-disc pl-5 space-y-1 text-gray-600">
                                    <li><strong>Cliente:</strong> Utilice el buscador para seleccionar al cliente propietario de la carga.</li>
                                    <li><strong>Destino:</strong> Seleccione el punto de destino final de la mercancía.</li>
                                    <li><strong>Proveedor:</strong> Seleccione el proveedor asociado a la carga.</li>
                                </ul>
                                <p className="text-red-800 font-bold mb-2">
                                    Detalles de Carga
                                </p>
                                <ul className="list-disc pl-5 space-y-1 text-gray-600">
                                    <li><strong>N° de Factura:</strong> Ingrese el número del documento tributario asociado.</li>
                                    <li><strong>Tipo de Carga:</strong> Describa brevemente el tipo de mercancía (ej: Perfil, Cajas, maquinaria, etc.).</li>
                                    <li><strong>Cantidad Bultos:</strong> Ingrese el número total de bultos.</li>
                                    <li><strong>Código Interno:</strong> Ingrese el código identificador interno de bodega para esta carga.</li>
                                </ul>
                                <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
                                    <h3 className="text-amber-800 font-bold mb-2 flex items-center gap-2 text-lg">
                                        <Shield className="w-5 h-5" /> Reglas Críticas de Formateo Numérico (Peso y Volumen)
                                    </h3>
                                    <div className='columns-2 text-center rounded-sm'>
                                        <p className="text-amber-700 text-sm">Números Enteros <p>Ingrese el número directo sin puntos ni comas para miles.</p></p>
                                        <p className="text-amber-700 text-sm">Números Decimales<p>Utilice PUNTO (.) como separador decimal. NUNCA use coma (,).</p></p>
                                    </div>
                                </div>
                                <ul className="list-disc pl-5 space-y-1 text-gray-600">
                                    <li><strong>Peso total (Kg):</strong> Ingrese el peso total utilizando punto para decimales.</li>
                                    <li><strong>Volumen (m³):</strong> Ingrese los metros cúbicos utilizando punto para decimales.</li>
                                </ul>
                                <p className="text-red-800 font-bold mb-2">
                                    Precio y Notas
                                </p>
                                <ul className="list-disc pl-5 space-y-1 text-gray-600">
                                    <li><strong>Precio Total Calculado:</strong> Este valor se calcula <strong>automáticamente</strong> en base a la tarifa previamente configurada para el cliente seleccionado.</li>
                                    <div className="bg-sky-50 border border-l-sky-200 p-4 rounded-lg">
                                        <div className='text-center rounded-sm'>
                                            <p className="text-sky-700 text-sm"><strong>Nota:</strong> Para que el cálculo sea exitoso, es necesario que los campos de Peso y Volumen contengan datos (incluso si son 0),
                                                ya que el sistema utiliza ambos valores en su fórmula de cobro, sin importar si la tarifa del cliente discrimina uno de ellos.
                                                Este valor es editable manualmente en caso de excepciones operacionales.</p>
                                        </div>
                                    </div>
                                    <li><strong>Checkbox Proveedor:</strong> Marque la casilla "El cobro de este bulto lo paga el Proveedor" si aplica esta condición.</li>
                                    <li><strong>Descripción / Notas Adicionales:</strong> Campo opcional para ingresar detalles sobre el contenido, fragilidad o instrucciones de manejo.</li>
                                </ul>
                                <h4 className="text-base font-bold text-gray-700 mb-2 flex items-center gap-2">
                                    Finalizar Registro
                                </h4>
                                <p className="text-gray-600 mb-2">
                                    Una vez completados todos los campos obligatorios y verificados los datos, haga clic en el botón <strong>Guardar Mercancía</strong>. La carga quedará ingresada en el inventario.
                                </p>
                            </div>
                        </div>
                    );
                case 'detalle':
                    return <div>{
                        <div>
                            <h3 className="text-lg font-bold text-red-800 mb-2 flex items-center gap-2">
                                Detalles de Mercancía
                            </h3>
                            <ul className="list-disc pl-5 space-y-1 text-gray-600">
                                <li><strong>Acesso:</strong> Desde el listado general de mercancías, haga clic en la fila del registro o en el icono de "Ojo" (Detalle).</li>
                                <li><strong>Contenido:</strong> Se presentará una vista de solo lectura que reúne todos los datos ingresados durante el proceso de Ingreso: asignación, destino, todos los detalles numéricos de la carga (con su formateo correcto), el precio final calculado y las notas adicionales.</li>
                                <li><strong>Uso:</strong> Utilice esta vista para auditoría, confirmación de datos antes de un despacho o para responder consultas de clientes.</li>
                            </ul>
                            <p className="text-gray-600 mb-2">
                                Está vista cuenta con 2 botones en su parte superior <strong>Editar</strong> y <strong>Eliminar</strong> para encontrar mas información sobre como utilizarlos ver las secciones <strong>Edición y Eliminación</strong>.
                            </p>
                        </div>
                    }</div>;
                case 'edicion':
                    return <div>{
                        <div>
                            <h3 className="text-lg font-bold text-red-800 mb-2 flex items-center gap-2">
                                Edición de Mercancía
                            </h3>
                            <ul className="list-disc pl-5 space-y-1 text-gray-600">
                                <li><strong>Acesso:</strong> Desde la vista de detalle, haga clic en el botón <strong>Editar</strong> del registro correspondiente.</li>
                                <li><strong>Procedimiento:</strong> Se abrirá un formulario prácticamente idéntico al de <strong>Ingreso</strong>, precargado todos los datos existentes actuales de la mercancía.</li>
                                <li><strong>Consideraciones:</strong> Puede modificar cualquier campo, incluyendo Cliente, Destino o las medidas de Peso/Volumen.</li>
                            </ul>
                            <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg mt-6">
                                <div className="flex items-center gap-2 text-amber-800 font-bold mb-1">
                                    <TriangleAlert className="w-5 h-5" /> Importante
                                </div>
                                <p className="text-amber-700 text-sm">
                                    Si modifica el <strong>Cliente</strong> o las medidas de <strong>Peso/Volumen</strong>, el campo <strong>"Precio Total Calculado ($)"</strong> se tendra que <strong>recalcular nuevamente con el botón verde al lado de la casilla basándose en las tarifas del nuevo cliente</strong>. Verifique este valor antes de guardar.
                                </p>
                            </div>
                            <p className="text-gray-600 mb-2">
                                Para cambiar el despacho y el estado de la carga existe un apartado llamado <strong>Estado y Logística</strong> (ubicado al final de la página), tener en consideración que <strong>cambiar estos valores puede afectar tanto a las Ordenes de entrega, cómo a la Logística interna</strong>.
                            </p>
                        </div>
                    }</div>;
                case 'eliminacion':
                    return <div>{
                        <div>
                            <h3 className="text-lg font-bold text-red-800 mb-2 flex items-center gap-2">
                                Eliminación de Mercancía
                            </h3>
                            <p className="text-gray-600 mb-2">
                                Si bien existe una forma de eliminar mercancía se recomienda no utilizarla, ya que esto puede generar inconcordancia en las cuentas internas y se puede llegar a confundir con un extravío físico de la mercancía.
                            </p>
                            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg mt-6">
                                <div className="flex items-center gap-2 text-red-800 font-bold mb-1">
                                    <TriangleAlert className="w-5 h-5" /> Importante
                                </div>
                                <p className="text-red-700 text-sm">
                                    Si decides utilizar esta función, primero revisa de que la mercancía no pertenezca a un despacho activo o finalizado, además de notificar a los demás administrativos para que estén al tanto de esta eliminación. (Considera editar no eliminar)
                                </p>
                            </div>
                        </div>
                        }</div>;
                case 'filtrado':
                    return <div>{
                        <div>
                            <h3 className="text-lg font-bold text-gray-700 mb-2 flex items-center gap-2">
                                <Search className="w-5 h-5 text-red-800" /> Filtros Avanzados
                            </h3>
                            <p className="text-gray-600 mb-2">
                                En la vista principal de mercancías, puedes usar el botón de <strong>"Filtros Avanzados"</strong> para encontrar rápidamente una carga específica. Puedes filtrar por:
                            </p>
                            <ul className="list-disc pl-5 space-y-1 text-gray-600">
                                <li><strong>Código Interno:</strong> Búsqueda exacta por el ID de la carga.</li>
                                <li><strong>Cliente y Destino:</strong> Ideal para armar camiones hacia una ciudad específica.</li>
                                <li><strong>Estado:</strong> Filtra entre carga "En Bodega", "En Tránsito" o "Entregada".</li>
                                <li><strong>Rango de Fechas:</strong> Busca mercancía ingresada en un periodo de tiempo.</li>
                            </ul>
                        </div>
                    }</div>;
                default:
                    return <div>Selecciona un tema de mercancías.</div>;
            }
        }
        switch (seccionActiva) {
            case 'introduccion':
                return (
                    <div className="space-y-4 animate-fade-down animate-duration-300">
                        <h2 className="text-2xl font-bold text-gray-800 border-b pb-2">Bienvenido a GStorage</h2>
                        <p className="text-gray-600 leading-relaxed">
                            Este manual te guiará a través de las funciones principales del sistema de gestión logística.
                            GStorage está diseñado para controlar el flujo completo de la carga: desde que ingresa a la bodega
                            hasta que es entregada en su destino final a través de nuestras rutas.
                        </p>
                        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg mt-6">
                            <div className="flex items-center gap-2 text-blue-800 font-bold mb-1">
                                <Info className="w-5 h-5" /> Tip de Navegación
                            </div>
                            <p className="text-blue-700 text-sm">
                                Utiliza el menú lateral izquierdo para saltar directamente al módulo en el que necesitas ayuda.
                            </p>
                        </div>
                    </div>
                );
            case 'despachos':
                return (
                    <div className="space-y-6 animate-fade-down animate-duration-300">
                        <h2 className="text-2xl font-bold text-gray-800 border-b pb-2">Rutas y Despachos</h2>

                        <div>
                            <h3 className="text-lg font-bold text-gray-700 mb-2 flex items-center gap-2">
                                <MapPin className="w-5 h-5 text-red-800" /> Checkouts por Parada
                            </h3>
                            <p className="text-gray-600 mb-3">
                                Cuando un camión está "En Tránsito", pasará por diferentes ciudades. El sistema permite descargar carga por tramos:
                            </p>
                            <ol className="list-decimal pl-5 space-y-2 text-gray-600">
                                <li>Abre el detalle de un despacho que esté en curso.</li>
                                <li>Verás botones para <strong>"Registrar Llegada"</strong> a las distintas ciudades de destino.</li>
                                <li>Al presionar el botón de una ciudad, el sistema automáticamente descargará <strong>solo las mercancías</strong> que van a ese destino, liberando el espacio en el camión.</li>
                                <li>El despacho se cerrará automáticamente cuando no quede carga a bordo.</li>
                            </ol>
                        </div>
                    </div>
                );
            case 'seguridad':
                return (
                    <div className="space-y-6 animate-fade-down animate-duration-300">
                        <h2 className="text-2xl font-bold text-gray-800 border-b pb-2">Permisos y Sucursales</h2>

                        <p className="text-gray-600">
                            El sistema está diseñado para que la información fluya entre sucursales de manera segura.
                        </p>

                        <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
                            <h3 className="text-amber-800 font-bold mb-2 flex items-center gap-2">
                                <Shield className="w-5 h-5" /> El Modo Consulta
                            </h3>
                            <p className="text-amber-700 text-sm">
                                Si buscas información (como un despacho o una mercancía) que pertenece a <strong>otra sucursal</strong> distinta a la tuya,
                                el sistema te permitirá ver toda la información (Modo Lectura), pero los botones de edición y eliminación estarán bloqueados.
                                Esto garantiza que nadie modifique los registros de otra bodega por error.
                            </p>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row gap-8">
                <div className="w-full md:w-64 flex-shrink-0">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden sticky top-6">
                        <div className="p-4 bg-gray-50 border-b border-gray-200 font-bold text-gray-700 uppercase text-xs tracking-wider">
                            Temas de Ayuda
                        </div>
                        <nav className="p-2 space-y-1">
                            {secciones.map((seccion) => (
                                <div key={seccion.id}>
                                    <button
                                        onClick={() => {
                                            setSeccionActiva(seccion.id);
                                            if (seccion.subsecciones) setSubSeccionActiva(seccion.subsecciones[0].id);
                                            else setSubSeccionActiva(null);
                                        }}
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition text-left font-medium text-sm ${seccionActiva === seccion.id
                                            ? 'bg-red-50 text-red-800'
                                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                            }`}
                                    >
                                        <span className={`${seccionActiva === seccion.id ? 'text-red-700' : 'text-gray-400'}`}>
                                            {seccion.icono}
                                        </span>
                                        {seccion.titulo}
                                    </button>
                                    {seccionActiva === seccion.id && seccion.subsecciones && (
                                        <div className="mt-1 ml-9 space-y-1 border-l-2 border-red-100">
                                            {seccion.subsecciones.map((sub) => (
                                                <button
                                                    key={sub.id}
                                                    onClick={() => setSubSeccionActiva(sub.id)}
                                                    className={`w-full text-left px-4 py-1.5 text-xs font-medium transition rounded-r-md ${subSeccionActiva === sub.id
                                                        ? 'text-red-800 bg-red-50/50 border-l-2 border-red-800 -ml-[2px]'
                                                        : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                                                        }`}
                                                >
                                                    {sub.titulo}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </nav>
                    </div>
                </div>
                <div className="flex-1 bg-white p-6 md:p-8 rounded-xl shadow-sm border border-gray-200 min-h-[500px]">
                    {renderContenido()}
                </div>
            </div>
        </div>
    );
}