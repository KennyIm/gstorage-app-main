import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { 
  Truck, 
  PackageCheck, 
  LogOut, 
  ChevronRight, 
  Compass, 
  UserCircle2,
  ShieldCheck,
  Radio
} from 'lucide-react'
import logoImg from '../../assets/logomedalla.png'
export default function MobileHome() {
  document.title = "Panel Operativo - GStorage Mobile"
  const { user, logoutUser } = useAuth()
  const MODULOS_OPERATIVOS = [
    {
      id: 'reparto',
      titulo: 'Reparto en Ruta',
      subtitulo: 'Control de viajes, seguimiento y firmas',
      ruta: '/reparto/ruta',
      icono: Truck,
      tag: 'Chofer / En Tránsito'
    },
    {
      id: 'patio',
      titulo: 'Recepción en Patio',
      subtitulo: 'Ingreso, verificación física y estiba',
      ruta: '/patio/recepcion',
      icono: PackageCheck,
      tag: 'Patio / Bodega'
    }
  ]
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between p-4 sm:p-6 font-sans select-none relative overflow-hidden">  
      <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:18px_18px] opacity-60 pointer-events-none" />
      <div className="absolute top-0 right-0 w-72 h-72 bg-red-100/60 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-red-50/50 rounded-full blur-3xl pointer-events-none" />
      <div className="relative z-10">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-center">
              <img src={logoImg} alt="GStorage" className="h-7 w-auto object-contain" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black tracking-widest text-red-700 uppercase leading-tight">
                GStorage WMS
              </span>
            </div>
          </div>
          <button
            onClick={logoutUser}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:text-red-700 hover:border-red-200 hover:bg-red-50 transition shadow-sm active:scale-95 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 text-red-600" />
            <span>Salir</span>
          </button>
        </div>
        <div className="mt-5 p-4 rounded-2xl bg-white border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-red-700" />
          <div className="flex items-center justify-between pl-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-red-700 shadow-inner">
                <UserCircle2 className="w-7 h-7 stroke-[1.8]" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                </div>
                <h2 className="text-base font-black text-slate-900 leading-snug truncate max-w-[190px]">
                  {user?.nombre || localStorage.getItem('operativo_nombre') || 'Operador'}
                </h2>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="relative z-10 my-6 flex-1 flex flex-col justify-center">
        <div className="flex items-center justify-between mb-3.5 px-1">
          <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
            Módulos Disponibles
          </p>
        </div>
        <div className="flex flex-col gap-3.5">
          {MODULOS_OPERATIVOS.map((modulo) => {
            const Icono = modulo.icono
            return (
              <Link
                key={modulo.id}
                to={modulo.ruta}
                className="group relative flex items-center justify-between p-4 rounded-2xl bg-white border border-slate-200 hover:border-red-600 hover:shadow-md transition-all duration-200 shadow-sm active:scale-[0.98]"
              >
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-red-700 rounded-r opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-100 group-hover:bg-red-700 group-hover:border-red-700 flex items-center justify-center text-red-700 group-hover:text-white transition-colors shrink-0 shadow-sm">
                    <Icono className="w-6 h-6 stroke-[1.8]" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-extrabold text-slate-900 text-base group-hover:text-red-700 transition-colors">
                      {modulo.titulo}
                    </h3>
                  </div>
                </div>
                <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 group-hover:bg-red-700 group-hover:border-red-700 text-slate-500 group-hover:text-white flex items-center justify-center shrink-0 transition-all shadow-sm">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </Link>
            )
          })}
        </div>
      </div>
      <div className="relative z-10 pt-4 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
        <div className="flex items-center gap-1.5">
          <Compass className="w-3.5 h-3.5 text-red-700" />
          <span className="font-semibold text-slate-700">GStorage Mobile</span>
        </div>
      </div>
    </div>
  )
}