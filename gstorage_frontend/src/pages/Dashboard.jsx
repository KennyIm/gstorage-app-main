import React, { useState, useEffect } from 'react';
import apiClient from '../services/api';
import { Package, Truck, Activity, Warehouse, CalendarClock, Weight, Box } from 'lucide-react'; // Iconos logísticos
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const COLORS = ['#6366f1', '#7dff6b', '#b52647', '#36e5eb', '#10b981'];
  const COLORS_PIE = ['#3b82f6', '#e5e7eb'];

  useEffect(() => {
    apiClient.get('/api/inventario/dashboard-stats/')
      .then(res => {
        setData(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError("No se pudo cargar el dashboard.");
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-8 text-center">Cargando métricas...</div>;
  if (error) return <div className="p-8 text-center text-red-600">{error}</div>;
  if (!data) return null;

  const { metrics, distribution_data, movements_data, top_clientes, despachos_list } = data;

  const ocupacionData = [
    { name: 'Ocupado', value: metrics.ocupacion },
    { name: 'Libre', value: 100 - metrics.ocupacion }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 bg-gray-50/50 min-h-screen">
      
      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Centro de Control</h1>
        <p className="text-gray-600">Panorama operativo del almacén en tiempo real.</p>
      </div>

      {/* --- 1. KPIs PRINCIPALES --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        
        {/* Lotes en Bodega */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Stock en Bodega</p>
              <h3 className="text-3xl font-bold text-gray-900">{metrics.en_bodega}</h3>
            </div>
            <div className="p-3 bg-blue-50 rounded-xl text-blue-600"><Package size={24} /></div>
          </div>
          <div className="mt-4 flex gap-4 text-xs text-gray-500 font-medium">
             <div className="flex items-center gap-1"><Weight size={14}/> {metrics.total_kg.toLocaleString()} kg</div>
             <div className="flex items-center gap-1"><Box size={14}/> {metrics.total_m3.toLocaleString()} m³</div>
          </div>
        </div>

        {/* Ocupación Visual */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
          <div className="flex justify-between items-start z-10 relative">
             <div>
               <p className="text-sm font-medium text-gray-500 mb-1">Ocupación</p>
               <h3 className={`text-3xl font-bold ${metrics.ocupacion > 90 ? 'text-red-600' : 'text-gray-900'}`}>{metrics.ocupacion}%</h3>
             </div>
             <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600"><Warehouse size={24} /></div>
          </div>
          {/* Mini barra de progreso */}
          <div className="w-full bg-gray-100 h-1.5 rounded-full mt-6 overflow-hidden">
             <div className={`h-full rounded-full ${metrics.ocupacion > 85 ? 'bg-red-500' : 'bg-indigo-500'}`} style={{width: `${metrics.ocupacion}%`}}></div>
          </div>
        </div>

        {/* Despachos Activos */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">En Proceso</p>
              <h3 className="text-3xl font-bold text-gray-900">{metrics.despachos_activos}</h3>
            </div>
            <div className="p-3 bg-amber-50 rounded-xl text-amber-600"><Truck size={24} /></div>
          </div>
          <p className="text-xs text-amber-600 mt-4 font-medium">Despachos activos o programados</p>
        </div>

        {/* Top Cliente */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-start">
            <div>
               <p className="text-sm font-medium text-gray-500 mb-1">Cliente Principal</p>
               <h3 className="text-xl font-bold text-gray-900 truncate max-w-[150px]" title={top_clientes[0]?.name}>
                   {top_clientes[0]?.name || "N/A"}
               </h3>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600"><Activity size={24} /></div>
          </div>
          <p className="text-xs text-gray-500 mt-4">
              {top_clientes[0]?.value || 0} lotes almacenados
          </p>
        </div>
      </div>

      {/* --- 2. GRÁFICOS AVANZADOS --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        
        {/* Top 5 Clientes */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 lg:col-span-1">
           <h4 className="font-bold text-gray-800 mb-6">Top Clientes</h4>
           <div className="h-[250px]">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart layout="vertical" data={top_clientes} margin={{left: 0, right: 30}}>
                 <XAxis type="number" hide />
                 <YAxis dataKey="name" type="category" width={80} tick={{fontSize: 10}} />
                 <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '8px'}} />
                 <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={20} />
               </BarChart>
             </ResponsiveContainer>
           </div>
        </div>

        {/* Distribución por Estado */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 lg:col-span-1">
           <h4 className="font-bold text-gray-800 mb-2">Estado del Inventario</h4>
           <div className="h-[250px] relative">
             <ResponsiveContainer width="100%" height="100%">
               <PieChart>
                 <Pie
                   data={distribution_data}
                   innerRadius={60}
                   outerRadius={80}
                   paddingAngle={5}
                   dataKey="value"
                 >
                   {distribution_data.map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                   ))}
                 </Pie>
                 <Tooltip />
                 <Legend verticalAlign="bottom" height={36}/>
               </PieChart>
             </ResponsiveContainer>
             <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pb-8">
                 <span className="text-2xl font-bold text-gray-700">{metrics.en_bodega}</span>
                 <p className="text-[10px] text-gray-400 uppercase tracking-wide">Lotes</p>
             </div>
           </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 lg:col-span-1">
           <h4 className="font-bold text-gray-800 mb-6">Ritmo de Salidas</h4>
           <div className="h-[250px]">
             <ResponsiveContainer width="100%" height="100%">
                <LineChart data={movements_data}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9ca3af'}} />
                  <Tooltip contentStyle={{borderRadius: '8px'}} />
                  <Line type="monotone" dataKey="despachos" stroke="#10b981" strokeWidth={3} dot={{r: 4, fill:'#10b981'}} activeDot={{r: 6}} />
                </LineChart>
             </ResponsiveContainer>
           </div>
        </div>
      </div>

      {/* --- 3. PRÓXIMOS DESPACHOS (Tabla) --- */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex justify-between items-center">
            <h4 className="font-bold text-gray-800 flex items-center gap-2">
                <CalendarClock className="text-indigo-600" size={20}/> Agenda de Salidas
            </h4>
            <a href="/despachos" className="text-sm text-indigo-600 font-medium hover:underline">Ver todos</a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-600">
            <thead className="bg-gray-50 text-gray-500 font-medium">
              <tr>
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">Fecha Prog.</th>
                <th className="px-6 py-4">Ruta</th>
                <th className="px-6 py-4">Camión</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4 text-right">Carga</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {despachos_list.length === 0 ? (
                 <tr><td colSpan="6" className="text-center py-8 text-gray-400">No hay despachos próximos.</td></tr>
              ) : (
                despachos_list.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50/50 transition">
                    <td className="px-6 py-4 font-bold text-indigo-600">#{d.id}</td>
                    <td className="px-6 py-4 text-gray-900">{d.fecha}</td>
                    <td className="px-6 py-4">{d.ruta}</td>
                    <td className="px-6 py-4 text-xs font-mono  rounded w-fit">{d.camion}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          d.estado === 'En Carga' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {d.estado}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-bold">{d.bultos}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}