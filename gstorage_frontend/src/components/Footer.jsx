import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, Github, Twitter, Linkedin } from 'lucide-react';
import logoImg from '../assets/logo.png';
import { Modal } from './Modal';

export function Footer() {
    const currentYear = new Date().getFullYear();
    const [activeModal, setActiveModal] = useState(null);
    const openModal = (modalId) => setActiveModal(modalId);
    const closeModal = () => setActiveModal(null);

    const modalContents = {
        'ayuda': {
            title: 'Centro de Ayuda',
            content: (
                <div className="space-y-4 text-gray-600">
                    <p>El sistema de soporte técnico se encuentra disponible de lunes a viernes de 09:00 a 18:00 horas del día, los 5 días de la semana, con el fin de garantizar la continuidad operativa del servicio. En caso de requerir asistencia, contactar al equipo de soporte en cualquier momento.
                        Para solicitudes específicas, tales como mejoras, ajustes personalizados o requerimientos adicionales, se deberá enviar un correo electrónico detallando la necesidad correspondiente.
                        Correo de soporte: gstorage946@gmail.com
                    </p>
                </div>
            )
        },
        'estado': {
            title: 'Estado del Sistema',
            content: <p>Todos los sistemas operativos.</p>
        },
        'terminos': {
            title: 'Términos de Servicio',
            content: <p>Los Términos de Servicio del sistema GStorage establecen las condiciones bajo las cuales los usuarios autorizados pueden acceder y utilizar la plataforma. Su objetivo es definir el marco de uso correcto, seguro y responsable del sistema, resguardando tanto la operación como la integridad de los datos gestionados.
                1. Alcance del Servicio
                GStorage es una plataforma web destinada a la gestión de inventarios, movimientos de mercancía y visualización del almacén en formato 2D y 3D. El acceso es exclusivo para usuarios registrados y con credenciales válidas, asignadas por el administrador del sistema.
                2. Obligaciones del Usuario
                Cada usuario es responsable de:
                Mantener la confidencialidad de sus credenciales de acceso.
                Utilizar el sistema únicamente para actividades relacionadas con la operación interna de la empresa.
                Registrar información verídica y actualizada en todas las interfaces del sistema.
                Reportar inmediatamente cualquier anomalía o acceso no autorizado.
                El uso indebido, la manipulación de datos o el intento de vulnerar la seguridad del sistema constituye una infracción grave que puede derivar en la suspensión del acceso.
                3. Limitaciones del Servicio
                El sistema opera bajo disponibilidad estándar en la nube, pudiendo existir breves períodos de mantención programada. GStorage no garantiza la continuidad del servicio en condiciones fuera del control de la empresa, como interrupciones de internet o fallas externas del proveedor de hosting.
                4. Propiedad Intelectual
                La plataforma, su diseño, arquitectura y módulos funcionales son propiedad de la empresa desarrolladora y están protegidos por las normas de propiedad intelectual correspondientes. Los usuarios no están autorizados a reproducir, distribuir o realizar ingeniería inversa del software.
                5. Modificaciones del Servicio
                La empresa podrá actualizar, ampliar o modificar funcionalidades con el fin de mejorar el rendimiento o la seguridad del sistema. Los usuarios serán informados oportunamente de los cambios que afecten directamente su operatividad.</p>
        },
        'privacidad': {
            title: 'Política de Privacidad',
            content: <p>La Política de Privacidad de GStorage establece los principios y procedimientos relacionados con la recolección, tratamiento, almacenamiento y protección de los datos personales y operativos de los usuarios de la plataforma.
                1. Datos Recopilados
                El sistema recopila únicamente la información necesaria para la operación del servicio, incluyendo:
                Nombre completo
                Correo electrónico corporativo
                Rol asignado dentro de la empresa
                Registros de actividad (bitácoras de acciones internas)
                No se recopilan datos sensibles ni información biométrica.
                2. Finalidad del Tratamiento
                Los datos se utilizan exclusivamente para:
                Autenticar la identidad del usuario
                Controlar los permisos y roles dentro del sistema
                Registrar movimientos para trazabilidad operacional
                Mantener la integridad del historial de inventarios
                En ningún caso se utilizan para fines comerciales ni se comparten con terceros externos a la organización.
                3. Almacenamiento y Seguridad
                Toda la información se almacena en bases de datos seguras con cifrado en tránsito (HTTPS/TLS).
                El acceso se encuentra restringido mediante autenticación y autorización basada en roles.
                Las copias de seguridad siguen estrictos protocolos de resguardo y se almacenan en entornos protegidos.
                4. Derechos del Usuario
                Los usuarios tienen derecho a:
                Solicitar la actualización de sus datos personales
                Solicitar la eliminación de su cuenta (previa autorización del administrador)
                Ser informados sobre incidentes de seguridad que puedan afectar sus datos
                5. Conservación de Datos
                Los registros operativos del sistema se conservan por motivos de auditoría y trazabilidad, incluso si el usuario deja de pertenecer a la empresa.</p>
        },
        'cookies': {
            title: 'Política de Cookies',
            content: <p>La Política de Cookies describe el uso de cookies dentro de la plataforma GStorage con el propósito de garantizar un funcionamiento óptimo de la aplicación web.
                1. Uso de Cookies Técnicas
                GStorage utiliza exclusivamente cookies técnicas esenciales para:
                Mantener activa la sesión del usuario
                Garantizar el funcionamiento del sistema de autenticación
                Recordar configuraciones internas necesarias para la operación
                Estas cookies no almacenan información personal sensible ni realizan seguimiento del usuario con fines publicitarios.
                2. Cookies No Utilizadas
                El sistema no utiliza cookies de terceros, cookies de análisis, marketing o perfiles de usuario.
                Cualquier futura integración que requiera nuevas cookies deberá ser informada previamente a los usuarios.
                3. Consentimiento
                Dado que las cookies utilizadas son estrictamente necesarias para el funcionamiento del sistema, no requieren consentimiento adicional según las directrices de buenas prácticas de privacidad. No obstante, los usuarios son informados al momento de iniciar sesión sobre su uso.
                4. Gestión y Eliminación
                Los usuarios pueden eliminar las cookies desde el navegador en cualquier momento, sin embargo, hacerlo antes de cerrar sesión podría interrumpir el funcionamiento normal del sistema.</p>
        },
        // Agrega más si es necesario
    };

    const activeModalData = activeModal ? modalContents[activeModal] : null;

    const FooterButton = ({ onClick, children }) => (
        <button
            onClick={onClick}
            className="text-gray-600 hover:text-indigo-600 transition text-left"
            type="button"
        >
            {children}
        </button>
    );

    return (
        <>
            <footer className="bg-white border-t border-gray-200 mt-auto">
                <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-12">

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">

                        <div>
                            <div className="mb-6">
                            </div>
                            <p className="text-gray-600 text-sm leading-relaxed mb-4">
                                Solución integral para la gestión logística inteligente. Optimizamos tu inventario, visualizamos tu almacén en 3D y controlamos tus despachos en tiempo real.
                            </p>
                            <div className="flex gap-4">
                                <a href="#" className="text-gray-400 hover:text-indigo-600 transition"><Twitter className="w-5 h-5" /></a>
                                <a href="#" className="text-gray-400 hover:text-indigo-600 transition"><Linkedin className="w-5 h-5" /></a>
                                <a href="https://github.com/KennyIm/gstorage-app" className="text-gray-400 hover:text-indigo-600 transition"><Github className="w-5 h-5" /></a>
                            </div>
                        </div>

                        <div>
                            <h3 className="font-semibold text-gray-900 mb-4 text-lg">Plataforma</h3>
                            <ul className="space-y-2 text-sm flex flex-col">
                                <Link to="/dashboard" className="text-gray-600 hover:text-indigo-600 transition">Dashboard</Link>
                                <Link to="/mercancias" className="text-gray-600 hover:text-indigo-600 transition">Inventario</Link>
                                <Link to="/visualizacion" className="text-gray-600 hover:text-indigo-600 transition">Visualizador 3D</Link>
                                <Link to="/despachos" className="text-gray-600 hover:text-indigo-600 transition">Despachos</Link>
                            </ul>
                        </div>

                        <div>
                            <h3 className="font-semibold text-gray-900 mb-4 text-lg">Soporte</h3>
                            <ul className="space-y-2 text-sm flex flex-col items-start">
                                <FooterButton onClick={() => openModal('ayuda')}>Centro de Ayuda</FooterButton>
                                <FooterButton onClick={() => openModal('estado')}>Estado del Sistema</FooterButton>
                                <FooterButton onClick={() => openModal('terminos')}>Términos de Servicio</FooterButton>
                                <FooterButton onClick={() => openModal('privacidad')}>Política de Privacidad</FooterButton>
                                <FooterButton onClick={() => openModal('cookies')}>Cookies</FooterButton>
                            </ul>
                        </div>

                        <div>
                            <h3 className="font-semibold text-gray-900 mb-4 text-lg">Contacto</h3>
                            <ul className="space-y-3 text-sm">
                                <li className="flex items-center gap-3 text-gray-600">
                                    <Mail className="w-5 h-5 text-indigo-600 shrink-0" />
                                    <a href="mailto:soporte@gstorage.com" className="hover:text-indigo-600">gstorage946@gmail.com</a>
                                </li>
                            </ul>
                        </div>

                    </div>

                    <div className="pt-8 border-t border-gray-200">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                            <p className="text-sm text-gray-500">
                                © {currentYear} GStorage Inc. Todos los derechos reservados.
                            </p>
                        </div>
                    </div>
                </div>
            </footer>
            {activeModalData && (
                <Modal
                    isOpen={!!activeModal}
                    onClose={closeModal}
                    title={activeModalData.title}
                >
                    {activeModalData.content}
                </Modal>
            )}
        </>
    );
}