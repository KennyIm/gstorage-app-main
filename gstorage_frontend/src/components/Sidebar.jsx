import React, { useState, useEffect } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { 
  ChevronDown, ChevronRight, LayoutDashboard, Package, 
  Truck, Users, Settings, Menu, X, DollarSign, 
  UserCircle, LogOut, ShieldCheck, Home 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/api';
import logoImg from '../assets/logomedalla.png';

export default function Sidebar() {
  const { user, logoutUser } = useAuth();
  const [isOpen, setIsOpen] = useState(true);
  const [openMenus, setOpenMenus] = useState({});
  const [sucursales, setSucursales] = useState([]);

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
    if (user) fetchSucursales();
  }, [user]);

  const getNombreSucursal = (id) => {
    const sucursal = sucursales.find(s => String(s.id) === String(id));
    return sucursal ? sucursal.nombre : `Suc ${id}`;
  };

  const toggleSubmenu = (menu) => {
    setOpenMenus(prev => ({ ...prev, [menu]: !prev[menu] }));
  };

  const menuConfig = [
    { name: 'Inicio', icon: <Home size={20} />, path: '/' },
    { name: 'Estadísticas', icon: <LayoutDashboard size={20} />, path: '/dashboard', show: isAdmin },
    { 
      name: 'Inventario', 
      icon: <Package size={20} />, 
      subItems: [
        { name: 'Mercancías', path: '/mercancias' },
        { name: 'Proveedores', path: '/proveedores' },
      ]
    },
    { 
      name: 'Logística', 
      icon: <Truck size={20} />, 
      subItems: [
        { name: 'Despachos', path: '/despachos' },
        { name: 'Planificador', path: '/planificar' },
        { name: 'Conductores', path: '/conductores' },
        { name: 'Camiones', path: '/camiones' },
        { name: 'Ramplas', path: '/ramplas'},
        { name: 'Rutas', path: '/rutas'},
        { name: 'Destinos', path: '/destinos'}
      ]
    },
    { name: 'Clientes', icon: <Users size={20} />, path: '/clientes' },
    { name: 'Gestión Usuarios', icon: <ShieldCheck size={20} />, path: '/gestionar-empleados', show: isAdmin },
  ];

  return (
    <div className={`flex flex-col h-screen bg-[#451a1a] text-slate-100 transition-all duration-300 shadow-2xl border-r border-red-900 ${isOpen ? 'w-64' : 'w-20'}`}>
      
      {/* --- HEADER --- */}
      <div className="flex items-center justify-between p-4 h-20 border-b border-red-700">
        <Link to="/" className="text-[#ff0000] flex items-center gap-3 overflow-hidden">
          <div className="bg-[#ede1e1] p-1.5 rounded-xl shadow-inner">
            <img src={logoImg} alt="Logo" className="h-8 w-auto min-w-[30px]" />
          </div>
          {isOpen && <span className="text-xl font-black text-white tracking-tight uppercase">GStorage</span>}
        </Link>
        <button onClick={() => setIsOpen(!isOpen)} className="p-2 rounded-lg hover:bg-red-700 transition text-red-100">
          {isOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* --- NAVEGACIÓN --- */}
      <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-2 custom-scrollbar">
        {menuConfig.map((item) => {
          if (item.show === false) return null;

          return (
            <div key={item.name}>
              {item.subItems ? (
                <div>
                  <button 
                    onClick={() => isOpen && toggleSubmenu(item.name)}
                    className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-red-700 transition group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-red-200 group-hover:text-white transition-colors">{item.icon}</span>
                      {isOpen && <span className="font-bold text-sm tracking-wide">{item.name}</span>}
                    </div>
                    {isOpen && (openMenus[item.name] ? <ChevronDown size={14} /> : <ChevronRight size={14} />)}
                  </button>
                  
                  {isOpen && openMenus[item.name] && (
                    <div className="ml-9 mt-1 space-y-1 border-l-2 border-red-700 pl-3">
                      {item.subItems.map(sub => (
                        (sub.show !== false) && (
                          <NavLink 
                            key={sub.name} 
                            to={sub.path}
                            className={({isActive}) => `block p-2 text-xs rounded-lg transition-all ${isActive ? 'bg-slate-50 text-red-800 font-black shadow-md' : 'text-red-100 hover:text-white hover:translate-x-1'}`}
                          >
                            {sub.name}
                          </NavLink>
                        )
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <NavLink 
                  to={item.path}
                  className={({isActive}) => `flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ${isActive ? 'bg-slate-50 text-red-800 shadow-xl font-black scale-[1.02]' : 'hover:bg-red-700 text-red-50'}`}
                >
                  <span className={({isActive}) => isActive ? 'text-red-800' : 'text-red-200'}>{item.icon}</span>
                  {isOpen && <span className="text-sm tracking-wide">{item.name}</span>}
                </NavLink>
              )}
            </div>
          );
        })}
      </nav>

      {/* --- PANEL DE USUARIO --- */}
      <div className="p-4 bg-[#751111] border-t border-red-700">
        <div className={`flex ${isOpen ? 'flex-row' : 'flex-col'} items-center gap-3`}>
          <Link to="/perfil" className="shrink-0">
            <div className="w-11 h-11 bg-slate-50 rounded-2xl flex items-center justify-center text-red-800 shadow-lg hover:rotate-3 transition-transform">
              <span className="font-black text-lg">
                {user?.first_name ? user.first_name[0].toUpperCase() : user?.username?.[0].toUpperCase()}
              </span>
            </div>
          </Link>

          {/* Info del Usuario */}
          {isOpen && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-white truncate leading-tight">{user?.first_name || user?.username}</p>
              <div className="flex flex-col">
                <span className="text-[10px] text-red-200 font-bold uppercase tracking-tighter">
                  {user?.perfil?.rol_display}
                </span>
                <span className="text-[10px] text-white/80 font-medium truncate">
                  {getNombreSucursal(user?.perfil?.sucursal_id)}
                </span>
              </div>
            </div>
          )}

          {/* Botón Logout con efecto hover agresivo */}
          <button 
            onClick={logoutUser}
            className="p-2.5 text-red-200 hover:text-white hover:bg-red-600 rounded-xl transition-all"
            title="Cerrar Sesión"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}