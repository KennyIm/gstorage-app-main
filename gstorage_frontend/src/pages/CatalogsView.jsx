import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, Users, UserCircle, MapPin, Archive, Route, Map, icons, PencilRuler } from 'lucide-react';

export default function CatalogsView() {
  const navigate = useNavigate();

  const catalogs = [
    {
      id: 'camiones', // Ruta: /camiones
      title: 'Camiones',
      description: 'Gestiona la flota de vehículos de transporte',
      icon: Truck,
      color: 'bg-blue-500',
      hoverColor: 'hover:bg-blue-600',
    },
    {
      id:'ramplas', // Ruta: /ramplas
      title:'Ramplas',
      description:'Administrar ramplas y su información',
      icon: PencilRuler,
      color: 'bg-red-800',
      hoverColor: 'hover:bg-red-700',
    },
    {
      id: 'clientes', // Ruta: /clientes
      title: 'Clientes',
      description: 'Administra la información de clientes',
      icon: Users,
      color: 'bg-green-500',
      hoverColor: 'hover:bg-green-600',
    },
    {
      id:'proveedores', // Ruta: /proveedores
      title:'Proveedores',
      description:'Administrar proveedores y su información',
      icon: Users,
      color: 'bg-red-800',
      hoverColor: 'hover:bg-red-700',
    },
    {
      id: 'conductores', // Ruta: /conductores
      title: 'Conductores',
      description: 'Registra y gestiona conductores autorizados',
      icon: UserCircle,
      color: 'bg-purple-500',
      hoverColor: 'hover:bg-purple-600',
    },
    {
      id: 'destinos', // Ruta: /destinos
      title: 'Destinos',
      description: 'Administra los destinos de entrega',
      icon: MapPin,
      color: 'bg-orange-500',
      hoverColor: 'hover:bg-orange-600',
    },
    /*{
      id: 'estanterias', // Ruta: /estanterias
      title: 'Estanterías',
      description: 'Configura las estanterías del almacén',
      icon: Archive,
      color: 'bg-indigo-500',
      hoverColor: 'hover:bg-indigo-600',
    }*/,
    {
      id: 'rutas', // Ruta: /rutas
      title: 'Rutas',
      description: 'Define las rutas de distribución',
      icon: Route,
      color: 'bg-pink-500',
      hoverColor: 'hover:bg-pink-600',
    },
    /*{
      id: 'ubicaciones', // Ruta: /ubicaciones
      title: 'Ubicaciones',
      description: 'Gestiona las ubicaciones dentro del almacén',
      icon: Map,
      color: 'bg-cyan-500',
      hoverColor: 'hover:bg-cyan-600',
    }*/
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Catálogos del Sistema</h1>
        <p className="text-lg text-gray-600">
          Gestiona todos los catálogos de información del almacén y distribución
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {catalogs.map((catalog) => {
          const Icon = catalog.icon;
          return (
            <button
              key={catalog.id}
              onClick={() => navigate(`/${catalog.id}`)} 
              className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 p-8 text-left group border border-gray-100"
            >
              <div className={`w-14 h-14 ${catalog.color} ${catalog.hoverColor} rounded-lg flex items-center justify-center mb-4 transition-colors text-white shadow-sm group-hover:scale-110 duration-300`}>
                <Icon size={28} />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors">
                {catalog.title}
              </h2>
              <p className="text-gray-600">{catalog.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}