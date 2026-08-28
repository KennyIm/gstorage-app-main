import React from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Home, Compass, AlertTriangle } from 'lucide-react'
import logoImg from '../assets/logomedalla.png'

export default function NotFound() {
  document.title = "404 - Página no existente | GStorage"
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 relative overflow-hidden font-sans select-none">
      <style>{`
        @keyframes truckCrashSequence {
          0% {
            transform: translateX(-340px) rotate(0deg);
          }
          45% {
            transform: translateX(0px) rotate(0deg);
          }
          52% {
            transform: translateX(6px) rotate(-8deg);
          }
          62% {
            transform: translateX(2px) rotate(-3deg);
          }
          72% {
            transform: translateX(4px) rotate(-5.5deg);
          }
          85%, 100% {
            transform: translateX(3px) rotate(-4.5deg);
          }
        }
        @keyframes barrierShake {
          0%, 44% {
            transform: translate(260px, 100px) rotate(0deg);
          }
          48% {
            transform: translate(265px, 98px) rotate(3deg);
          }
          56% {
            transform: translate(258px, 101px) rotate(-1.5deg);
          }
          65% {
            transform: translate(262px, 100px) rotate(1deg);
          }
          75%, 100% {
            transform: translate(261px, 100px) rotate(0.5deg);
          }
        }
        @keyframes cargoEjection {
          0%, 46% {
            opacity: 0;
            transform: translate(180px, 120px) scale(0.4) rotate(0deg);
          }
          54% {
            opacity: 1;
            transform: translate(270px, 75px) scale(1) rotate(45deg);
          }
          70% {
            transform: translate(295px, 138px) rotate(115deg);
          }
          85%, 100% {
            opacity: 1;
            transform: translate(290px, 140px) rotate(95deg);
          }
        }
        @keyframes smokePuff {
          0% { transform: translate(0, 0) scale(0.6); opacity: 0; }
          20% { opacity: 0.7; }
          100% { transform: translate(-20px, -40px) scale(1.7); opacity: 0; }
        }
        @keyframes sparkFlash {
          0%, 100% { opacity: 0; }
          50% { opacity: 1; }
        }
        @keyframes hazardBlink {
          0%, 100% { opacity: 1; filter: drop-shadow(0 0 8px #f59e0b); }
          50% { opacity: 0.2; filter: none; }
        }

        .animate-truck-crash {
          transform-origin: 80px 148px; 
          animation: truckCrashSequence 1.5s cubic-bezier(0.22, 0.61, 0.36, 1) forwards;
        }
        .animate-barrier-impact {
          animation: barrierShake 1.5s ease-out forwards;
        }
        .animate-cargo-eject {
          animation: cargoEjection 1.5s cubic-bezier(0.18, 0.89, 0.32, 1.28) forwards;
        }
        .animate-smoke-delayed-1 {
          animation: smokePuff 2.2s infinite ease-out 0.8s;
        }
        .animate-smoke-delayed-2 {
          animation: smokePuff 2.5s infinite ease-out 1.3s;
        }
        .animate-spark-delayed {
          animation: sparkFlash 0.4s infinite steps(2, start) 0.7s;
        }
        .animate-hazard {
          animation: hazardBlink 1s infinite ease-in-out 0.7s;
        }
      `}</style>
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px] opacity-30 pointer-events-none" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-950/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-xl w-full flex flex-col items-center text-center">

        <div className="w-full max-w-md h-56 relative flex items-center justify-center mb-6">
          <svg viewBox="0 0 420 200" className="w-full h-full overflow-visible drop-shadow-2xl">
            <defs>
              <linearGradient id="roadGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1e293b" />
                <stop offset="100%" stopColor="#0f172a" />
              </linearGradient>
              <linearGradient id="cabGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#991b1b" />
                <stop offset="100%" stopColor="#ef4444" />
              </linearGradient>
              <linearGradient id="trailerGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#334155" />
                <stop offset="100%" stopColor="#1e293b" />
              </linearGradient>
            </defs>

            {/* Carretera */}
            <rect x="10" y="150" width="400" height="24" rx="4" fill="url(#roadGrad)" />
            <line x1="20" y1="162" x2="390" y2="162" stroke="#475569" strokeWidth="2" strokeDasharray="12 12" />

            {/* Marcas de frenada en el asfalto */}
            <path d="M70 156 C120 156, 170 154, 210 152" stroke="#090d16" strokeWidth="4" strokeLinecap="round" opacity="0.8" />
            <path d="M80 166 C130 166, 180 164, 220 162" stroke="#090d16" strokeWidth="4" strokeLinecap="round" opacity="0.8" />

            {/* Barrera de hormigón fracturada (Reacciona al choque) */}
            <g className="animate-barrier-impact">
              {/* Bloque principal */}
              <polygon points="0,55 10,10 40,10 50,55" fill="#64748b" />
              <polygon points="0,55 5,55 12,20 8,20" fill="#94a3b8" />
              
              {/* Rayas de advertencia reflectantes */}
              <path d="M12 20 L22 20 L12 35 L5 35 Z" fill="#eab308" />
              <path d="M22 20 L32 20 L20 40 L10 40 Z" fill="#0f172a" />
              <path d="M32 20 L40 20 L28 50 L18 50 Z" fill="#eab308" />
              
              {/* Grietas de impacto */}
              <path d="M15 15 L22 30 L18 45" stroke="#0f172a" strokeWidth="2" fill="none" />
              <path d="M22 30 L30 35" stroke="#0f172a" strokeWidth="1.5" fill="none" />

              {/* Escombros desprendidos */}
              <polygon points="-10,54 -5,48 2,54" fill="#64748b" />
              <polygon points="52,54 58,50 62,54" fill="#475569" />
              <polygon points="-4,52 0,46 6,52" fill="#eab308" />
            </g>
            <g className="animate-truck-crash">
              {/* Acoplado / Remolque */}
              <rect x="50" y="70" width="135" height="75" rx="3" fill="url(#trailerGrad)" stroke="#475569" strokeWidth="1.5" />
              <rect x="55" y="75" width="125" height="65" rx="2" fill="#0f172a" opacity="0.4" />
              
              {/* Logo Medalla en el costado del remolque */}
              <image 
                href={logoImg} 
                x="80" 
                y="85" 
                width="75" 
                height="38" 
                preserveAspectRatio="xMidYMid meet"
                className='bg-slate-50' 
              />
              {/* Cabina del camión */}
              <path d="M185 92 L225 92 L250 115 L255 145 L185 145 Z" fill="url(#cabGrad)" />
              {/* Parabrisas con grietas */}
              <polygon points="220,96 242,115 220,115" fill="#38bdf8" opacity="0.7" />
              <path d="M225 100 L235 110 M230 108 L238 104" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
              {/* Capó arrugado / deformado */}
              <path d="M248 115 L266 128 L255 145" fill="#7f1d1d" />
              {/* Ruedas con llantas */}
              <circle cx="80" cy="148" r="14" fill="#020617" stroke="#334155" strokeWidth="4" />
              <circle cx="80" cy="148" r="5" fill="#94a3b8" />
              <circle cx="115" cy="148" r="14" fill="#020617" stroke="#334155" strokeWidth="4" />
              <circle cx="115" cy="148" r="5" fill="#94a3b8" />
              <circle cx="225" cy="148" r="14" fill="#020617" stroke="#334155" strokeWidth="4" />
              <circle cx="225" cy="148" r="5" fill="#94a3b8" />
              {/* Baliza de emergencia parpadeante */}
              <polygon points="200,88 206,88 205,92 201,92" fill="#d97706" />
              <circle cx="203" cy="86" r="4" fill="#fbbf24" className="animate-hazard" />
            </g>

          </svg>
        </div>

        {/* Badge de Estado */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 text-red-400 text-xs font-black tracking-wider uppercase mb-3 shadow-inner">
          <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
          Error 404
          <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
        </div>

        {/* Título Principal */}
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-3">
          Error 404: Página no existente
        </h1>

        {/* Descripción */}
        <p className="text-slate-400 text-sm sm:text-base leading-relaxed mb-8 max-w-md mx-auto">
          El camión se desvió del trayecto programado. El registro, la ruta o la página que buscas no existe o fue dada de baja.
        </p>

        {/* Botones de Navegación */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-xs sm:max-w-none">
          <button
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-slate-900 hover:bg-slate-800 text-slate-200 transition shadow-sm cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver Atrás
          </button>

          <Link
            to="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-red-600 hover:bg-red-700 text-white transition shadow-lg shadow-red-900/30 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            Ir al Inicio
          </Link>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-slate-800/80 flex items-center justify-center gap-2 text-xs text-slate-500">
          <Compass className="w-3.5 h-3.5 text-slate-600" />
          <span>GStorage WMS • Sistema de Control Logístico</span>
        </div>

      </div>
    </div>
  );
}