import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Box, FileText, History, Truck, LayoutDashboard } from 'lucide-react';

export default function Home() {
  document.title = "Inicio";
  const navigate = useNavigate();

  const features = [
    {
      id: 'dashboard', // Ruta: /dashboard
      title: 'Panel de Estadísticas',
      description: 'Resumen visual de métricas clave, ocupación y contadores del sistema.',
      icon: LayoutDashboard,
      color: 'bg-amber-500',
      hoverColor: 'hover:bg-amber-600',
    },
    {
      id: 'mercancias', // Ruta: /mercancias
      title: 'Visualización de Mercancía',
      description: 'Gestiona y visualiza todo el inventario de mercancías disponibles.',
      icon: Package,
      color: 'bg-blue-500',
      hoverColor: 'hover:bg-blue-600',
    },
    {
      id: 'despachos', // Ruta: /despachos
      title: 'Gestión de Despachos',
      description: 'Planifica viajes, asigna conductores y coordina la salida de carga.',
      icon: Truck,
      color: 'bg-indigo-500',
      hoverColor: 'hover:bg-indigo-600',
    },
    /*{
      id: 'visualizacion', // Ruta: /visualizacion
      title: 'Visualización 3D del Almacén',
      description: 'Explora el almacén y la ubicación de la carga en un modelo interactivo.',
      icon: Box,
      color: 'bg-purple-500',
      hoverColor: 'hover:bg-purple-600',
    }*/,
    {
      id: 'reportes', // Ruta: /reportes
      title: 'Generación de Reportes',
      description: 'Crea y descarga reportes detallados y manifiestos de carga.',
      icon: FileText,
      color: 'bg-green-500',
      hoverColor: 'hover:bg-green-600',
    },
    {
      id: 'historial', // Ruta: /historial 
      title: 'Historial de Cambios',
      description: 'Auditoría completa de movimientos y modificaciones en el sistema.',
      icon: History,
      color: 'bg-orange-500',
      hoverColor: 'hover:bg-orange-600',
    },
  ];

  const handleNavigate = (path) => {
    navigate(`/${path}`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Bienvenido a GStorage</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <button
              key={feature.id}
              onClick={() => handleNavigate(feature.id)}
              className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 p-6 text-left group border border-gray-100 flex flex-col h-full"
            >
              <div className={`w-12 h-12 ${feature.color} rounded-lg flex items-center justify-center mb-4 transition-colors text-white shadow-sm group-hover:scale-110 duration-300`}>
                <Icon size={24} />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors">
                {feature.title}
              </h2>
              <p className="text-gray-600 text-sm flex-grow">
                {feature.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}