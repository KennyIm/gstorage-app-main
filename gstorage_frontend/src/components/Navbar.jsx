import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Home, User, ChevronDown, LogOut, Users, LayoutDashboard, Database } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/api'; 
import logoImg from '../assets/logo.png';

export function Navbar() {
  const { user, logoutUser } = useAuth();
  const [sucursales, setSucursales] = useState([]);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  const userRol = user?.perfil?.rol?.trim() || '';
  const isAdmin = userRol === 'DUENO' || userRol === 'SECRETARIA';

  useEffect(() => {
    const fetchSucursales = async () => {
      try {
        const res = await apiClient.get('/api/usuarios/sucursales/');
        setSucursales(res.data);
      } catch (error) {
        console.error("Error al traer sucursales", error);
      }
    };
    fetchSucursales();
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  

  const getNombreSucursal = (id) => {
    if (!id) return 'Sin sucursal';
    const sucursal = sucursales.find(s => String(s.id) === String(id));
    return sucursal ? sucursal.nombre : `Suc ${id}`
  }

  return (
    <nav className="fixed top-0 left-0 right-0 bg-white shadow-md z-50 h-16 print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
        <div className="flex items-center justify-between h-full">

          {/* --- IZQUIERDA: LOGO / HOME --- */}
          <div className="flex items-center gap-8">
            <Link
              to="/"
              className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 transition no-underline"
            >
              <img src={logoImg} alt="Logo GStorage" className="h-20 w-auto" />
            </Link>
          </div>

          {/* --- DERECHA: USUARIO Y MENÚ --- */}
          <div className="flex items-center gap-4">
            {user ? (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition border border-transparent hover:border-gray-200"
                >
                  <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-sm">
                    <span className="font-medium text-sm">
                      {user.first_name ? user.first_name[0].toUpperCase() : user.username[0].toUpperCase()}
                    </span>
                  </div>

                  <div className="hidden md:flex flex-col items-start">
                    <span className="text-sm font-medium text-gray-700 leading-none">
                      {user.first_name || user.username}
                    </span>
                    <span className="text-xs text-gray-500 mt-1">
                      {user.perfil?.rol_display || 'Usuario'} | {getNombreSucursal(user.perfil?.sucursal_id)}
                    </span>
                  </div>

                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${showProfileMenu ? 'rotate-180' : ''}`} />
                </button>

                {/* --- DROPDOWN MENU --- */}
                {showProfileMenu && (
                  <div className="absolute right-0 mt-2 w-60 bg-white rounded-xl shadow-lg border border-gray-100 py-2 animate-in fade-in slide-in-from-top-2 duration-200">

                    {/* Enlace a Mi Perfil */}
                    <Link
                      to="/perfil"
                      onClick={() => setShowProfileMenu(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
                    >
                      <User className="w-4 h-4 text-gray-500" />
                      Mi Perfil
                    </Link>

                    {/* Enlace a Estadísticas*/}
                    {isAdmin && (
                      <Link
                        to="/dashboard"
                        onClick={() => setShowProfileMenu(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
                      >
                        <LayoutDashboard className="w-4 h-4 text-gray-500" />
                        Estadísticas
                      </Link>
                    )}

                    {/* Catalogos */}
                    {isAdmin && (
                      <Link to="/catalogos"
                        onClick={() => setShowProfileMenu(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition">
                        <Database className="w-4 h-4 text-gray-500" /> Catálogos
                      </Link>
                    )}


                    {/* Enlace a Gestión de Usuarios (Solo Admin) */}
                    {isAdmin && (
                      <Link
                        to="/gestionar-empleados"
                        onClick={() => setShowProfileMenu(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
                      >
                        <Users className="w-4 h-4 text-gray-500" />
                        Gestión de Usuarios
                      </Link>
                    )}

                    <div className="h-px bg-gray-100 my-2 mx-2"></div>

                    {/* Botón de Logout */}
                    <button
                      onClick={() => {
                        logoutUser();
                        setShowProfileMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition"
                    >
                      <LogOut className="w-4 h-4" />
                      Cerrar Sesión
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" className="text-indigo-600 font-medium hover:underline">
                Iniciar Sesión
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}