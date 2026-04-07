import React, { useState, useEffect } from 'react';
import { Download, FileText, Calendar, TrendingUp, Package, History, FileSpreadsheet, X } from 'lucide-react';
import apiClient from '../services/api';

export default function ReportsView() {
  document.title = "Reportes";
  const [recentReports, setRecentReports] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  
  const [config, setConfig] = useState({
    format: 'PDF', // 
    dateRange: 'historic', 
    startDate: '',
    endDate: ''
  });
  const [generating, setGenerating] = useState(false);


  const fetchRecent = async () => {
    try {
      const res = await apiClient.get('/api/inventario/reportes/recientes/');
      setRecentReports(res.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchRecent(); }, []);

  const handleOpenModal = (reportType) => {
    setSelectedReport(reportType);
    setShowModal(true);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      // 1. Solicitar generación al backend
      const res = await apiClient.post('/api/inventario/reportes/generar/', {
        tipo: selectedReport.title, 
        formato: config.format,
        fecha_inicio: config.dateRange === 'custom' ? config.startDate : null,
        fecha_fin: config.dateRange === 'custom' ? config.endDate : null,
      });
      
      const fileUrl = res.data.archivo;
      
      const downloadRes = await apiClient.get(fileUrl, {
        responseType: 'blob', 
      });

      const href = URL.createObjectURL(downloadRes.data);
      const link = document.createElement('a');
      link.href = href;
      
      const filename = fileUrl.split('/').pop();
      link.setAttribute('download', filename);
      
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(href);

      fetchRecent();
      setShowModal(false);
    } catch (err) {
      console.error("Error:", err);
      alert("Error al generar o descargar reporte.");
    } finally {
      setGenerating(false);
    }
  };

  const reportTypes = [
    { id: 1, title: 'Inventario', description: 'Estado actual y valoración.', icon: Package, color: 'bg-blue-500' },
    { id: 2, title: 'Despachos', description: 'Registro de salidas y entregas.', icon: TrendingUp, color: 'bg-green-500' },
    { id: 3, title: 'Historial', description: 'Auditoría de movimientos.', icon: History, color: 'bg-orange-500' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Generación de Reportes</h1>
        <p className="text-gray-600">Crea y descarga reportes detallados en PDF o Excel.</p>
      </div>

      {/* --- TARJETAS DE GENERACIÓN --- */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-8 border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Reportes Disponibles</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {reportTypes.map((report) => {
            const Icon = report.icon;
            return (
              <div key={report.id} className="border border-gray-200 rounded-xl p-5 hover:shadow-lg transition group cursor-pointer" onClick={() => handleOpenModal(report)}>
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 ${report.color} rounded-lg flex items-center justify-center text-white shadow-sm group-hover:scale-110 transition`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">{report.title}</h3>
                    <p className="text-sm text-gray-500 mb-3">{report.description}</p>
                    <span className="text-indigo-600 text-sm font-medium flex items-center gap-1 group-hover:translate-x-1 transition">
                      Configurar y Descargar →
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* --- LISTA DE RECIENTES --- */}
      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Reportes Recientes</h2>
        <div className="space-y-3">
          {recentReports.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No hay reportes generados aún.</p>
          ) : (
            recentReports.map((file) => (
              <div key={file.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition">
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${file.formato === 'PDF' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                    {file.formato === 'PDF' ? <FileText className="w-5 h-5" /> : <FileSpreadsheet className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Reporte de {file.tipo}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(file.fecha_generacion).toLocaleDateString()} • {file.parametros} • Generado por {file.usuario_nombre}
                    </p>
                  </div>
                </div>
                <a 
                  href={file.archivo} 
                  download 
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                >
                  <Download className="w-4 h-4" />
                  Descargar
                </a>
              </div>
            ))
          )}
        </div>
      </div>

      {/* --- MODAL DE CONFIGURACIÓN --- */}
      {showModal && selectedReport && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Configurar Reporte</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-6">
              {/* Selección de Formato */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Formato de Archivo</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setConfig({...config, format: 'PDF'})}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition ${config.format === 'PDF' ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <FileText className="w-5 h-5" /> PDF
                  </button>
                  <button
                    onClick={() => setConfig({...config, format: 'Excel'})}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition ${config.format === 'Excel' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <FileSpreadsheet className="w-5 h-5" /> Excel
                  </button>
                </div>
              </div>

              {/* Selección de Fechas */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Rango de Fechas</label>
                <select 
                  className="w-full p-2.5 border border-gray-300 rounded-lg mb-3"
                  value={config.dateRange}
                  onChange={(e) => setConfig({...config, dateRange: e.target.value})}
                >
                  <option value="historic">Histórico Completo</option>
                  <option value="custom">Rango Personalizado</option>
                </select>

                {config.dateRange === 'custom' && (
                  <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2">
                    <div>
                      <label className="text-xs text-gray-500">Desde</label>
                      <input type="date" className="w-full p-2 border rounded-lg" onChange={(e) => setConfig({...config, startDate: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Hasta</label>
                      <input type="date" className="w-full p-2 border rounded-lg" onChange={(e) => setConfig({...config, endDate: e.target.value})} />
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={handleGenerate}
                disabled={generating}
                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 disabled:opacity-70"
              >
                {generating ? 'Generando...' : `Descargar ${selectedReport.title}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}