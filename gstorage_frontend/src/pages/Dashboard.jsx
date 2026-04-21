import React, { useState, useEffect } from 'react';
import apiClient from '../services/api';
import { 
  Package, Truck, Activity, Warehouse, CalendarClock, 
  Weight, Box, DollarSign, AlertTriangle, ArrowRight, CheckCircle2 
} from 'lucide-react'; 
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function Dashboard() {
  document.title = "Gráficos";
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  useEffect(() => {
    apiClient.get('/api/inventario/dashboard-stats/')
      .then(res => {
        setData(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError("No se pudo cargar el centro de control. Verifique su conexión.");
        setLoading(false);
      });
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
    </div>
  );
  if (error) return <div className="p-8 text-center text-red-600 font-medium bg-red-50 rounded-lg m-8">{error}</div>;
  if (!data) return null;

  const { 
    metrics, 
    distribution_data = [], 
    movements_data = [], 
    top_clientes = [], 
    despachos_list = [],
    alertas = [] 
  } = data;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-slate-50 min-h-screen">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
      </div>

      {/* KPIs PRINCIPALES */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        
        {/* KPI: Stock Físico */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 transition-all hover:shadow-md">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-semibold text-slate-500 mb-1 uppercase tracking-wider">Lotes Almacenados</p>
              <h3 className="text-3xl font-bold text-slate-900">{metrics.en_bodega || 0}</h3>
            </div>
            <div className="p-3 bg-blue-50 rounded-xl text-blue-600"><Package size={24} /></div>
          </div>
          <div className="mt-4 flex gap-4 text-xs text-slate-600 font-medium bg-slate-50 p-2 rounded-lg">
             <div className="flex items-center gap-1"><Weight size={14} className="text-slate-400"/> {(metrics.total_kg || 0).toLocaleString('es-CL')} kg</div>
             <div className="flex items-center gap-1"><Box size={14} className="text-slate-400"/> {(metrics.total_m3 || 0).toLocaleString('es-CL')} m³</div>
          </div>
        </div>

        {/* KPI: Valorización */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 transition-all hover:shadow-md">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-semibold text-slate-500 mb-1 uppercase tracking-wider">Valor Estimado Stock</p>
              <h3 className="text-3xl font-bold text-slate-900">
                ${(metrics.valor_total || 0).toLocaleString('es-CL')}
              </h3>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600"><DollarSign size={24} /></div>
          </div>
          <p className="text-xs text-slate-500 mt-4 font-medium flex items-center gap-1">
            Capital retenido en bodega
          </p>
        </div>

        {/* KPI: Ocupación */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 transition-all hover:shadow-md">
          <div className="flex justify-between items-start">
             <div>
               <p className="text-sm font-semibold text-slate-500 mb-1 uppercase tracking-wider">Capacidad Usada</p>
               <h3 className={`text-3xl font-bold ${metrics.ocupacion >= 90 ? 'text-red-600' : metrics.ocupacion >= 75 ? 'text-amber-500' : 'text-slate-900'}`}>
                 {metrics.ocupacion || 0}%
               </h3>
             </div>
             <div className={`p-3 rounded-xl ${metrics.ocupacion >= 90 ? 'bg-red-50 text-red-600' : 'bg-indigo-50 text-indigo-600'}`}>
               <Warehouse size={24} />
             </div>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full mt-6 overflow-hidden">
             <div 
               className={`h-full rounded-full transition-all duration-1000 ${metrics.ocupacion >= 90 ? 'bg-red-500' : metrics.ocupacion >= 75 ? 'bg-amber-400' : 'bg-indigo-500'}`} 
               style={{width: `${metrics.ocupacion || 0}%`}}
             ></div>
          </div>
        </div>

        {/* KPI: Operaciones Activas */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 transition-all hover:shadow-md">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-semibold text-slate-500 mb-1 uppercase tracking-wider">Despachos en Curso</p>
              <h3 className="text-3xl font-bold text-slate-900">{metrics.despachos_activos || 0}</h3>
            </div>
            <div className="p-3 bg-amber-50 rounded-xl text-amber-600"><Truck size={24} /></div>
          </div>
          <p className="text-xs text-slate-500 mt-4 font-medium flex items-center gap-1">
             Rutas en ejecución hoy
          </p>
        </div>
      </div>

      {/* GRÁFICOS Y ALERTAS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        
        {/* Gráfico: Volumen de Salidas */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 lg:col-span-2">
           <div className="flex justify-between items-center mb-6">
             <h4 className="font-bold text-slate-800">Tendencia de Despachos</h4>
           </div>
           <div className="h-[280px]">
             <ResponsiveContainer width="100%" height="100%">
                <LineChart data={movements_data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                  <Tooltip 
                    contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} 
                    cursor={{stroke: '#e5e7eb', strokeWidth: 2}}
                  />
                  <Line type="monotone" name="Cant. Despachos" dataKey="despachos" stroke="#6366f1" strokeWidth={3} dot={{r: 4, fill:'#6366f1', strokeWidth: 2}} activeDot={{r: 6}} />
                </LineChart>
             </ResponsiveContainer>
           </div>
        </div>

        {/* Panel de Alertas Operativas */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col">
           <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h4 className="font-bold text-slate-800 flex items-center gap-2">
                <span size={18} className="text-amber-500"/> Alertas del Sistema
              </h4>
           </div>
           <div className="p-5 flex-1 overflow-y-auto max-h-[280px]">
              {alertas.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                  <CheckCircle2 size={40} className="text-emerald-400 mb-2 opacity-50"/>
                  <p className="text-sm">Todo opera con normalidad</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {alertas.map((alerta, i) => (
                    <div key={i} className={`p-3 rounded-lg border text-sm flex gap-3 items-start ${
                      alerta.tipo === 'critico' ? 'bg-red-50 border-red-100 text-red-800' : 'bg-amber-50 border-amber-100 text-amber-800'
                    }`}>
                      <AlertTriangle size={16} className={`shrink-0 mt-0.5 ${alerta.tipo === 'critico' ? 'text-red-500' : 'text-amber-500'}`} />
                      <div>
                        <p className="font-semibold">{alerta.titulo}</p>
                        <p className="text-xs opacity-80 mt-1">{alerta.mensaje}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
           </div>
        </div>
      </div>

      {/* TABLAS Y TOP CLIENTES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Tabla: Próximos Despachos */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden lg:col-span-2">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h4 className="font-bold text-slate-800 flex items-center gap-2">
                  <CalendarClock className="text-indigo-600" size={20}/> Agenda de Salidas
              </h4>
              <a href="/despachos" className="text-sm text-indigo-600 font-semibold hover:text-indigo-800 flex items-center gap-1">
                Ver despachos <ArrowRight size={16}/>
              </a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-600">
              <thead className="bg-white text-slate-500 font-semibold text-xs uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Orden</th>
                  <th className="px-6 py-4">Ruta & Camión</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4 text-right">Carga</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {despachos_list.length === 0 ? (
                   <tr><td colSpan="4" className="text-center py-8 text-slate-400">Sin despachos programados.</td></tr>
                ) : (
                  despachos_list.slice(0, 5).map((d) => ( 
                    <tr key={d.id} className="hover:bg-slate-50 transition-colors group cursor-pointer">
                      <td className="px-6 py-4">
                        <span className="font-bold text-indigo-600">#{d.id}</span>
                        <div className="text-xs text-slate-400 mt-1">{d.fecha}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-800">{d.ruta}</div>
                        <div className="text-xs font-mono text-slate-500 mt-1 flex items-center gap-1">
                          <Truck size={12}/> {d.camion}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider ${
                            d.estado === 'En Carga' ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                        }`}>
                          {d.estado}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-slate-700">
                        {d.bultos} <span className="text-xs font-normal text-slate-400">bultos</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Gráfico: Top Clientes */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
           <h4 className="font-bold text-slate-800 mb-6">Top Clientes (Por Lotes)</h4>
           <div className="h-[280px]">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart layout="vertical" data={top_clientes} margin={{left: -20, right: 0}}>
                 <XAxis type="number" hide />
                 <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 11, fill: '#475569'}} axisLine={false} tickLine={false} />
                 <Tooltip 
                   cursor={{fill: '#f8fafc'}} 
                   contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} 
                 />
                 <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} barSize={24}>
                   {top_clientes.map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                   ))}
                 </Bar>
               </BarChart>
             </ResponsiveContainer>
           </div>
        </div>

      </div>
    </div>
  );
}