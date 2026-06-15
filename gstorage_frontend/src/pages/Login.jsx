import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, AlertCircle, ArrowLeft, CheckCircle, Star, Check, ShieldCheck } from 'lucide-react';
import apiClient from '../services/api';

function PricingPage({ onBack }) {
  return (
    <div className="w-full max-w-md animate-in fade-in zoom-in duration-300">
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
        {/* Cabecera del Plan */}
        <div className="bg-indigo-600 p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
          <h2 className="text-white text-3xl font-bold mb-2 relative z-10">Plan GStorage</h2>
          <p className="text-indigo-100 relative z-10">La solución definitiva para tu inventario</p>
          <p className="text-indigo-100 relative z-10">Es necesario una verificación general de la empresa ante de contratar</p>
        </div>
        
        <div className="p-8">
          {/* Precio */}
          <div className="text-center mb-8 pb-8 border-b border-gray-100">
            <span className="text-5xl font-extrabold text-gray-900 tracking-tight">$25.000</span>
            <span className="text-gray-500 font-medium ml-2">/mes</span>
          </div>

          {/* Características */}
          <ul className="space-y-4 mb-8">
            {[
              "Gestión ilimitada de inventario y stock",
              "Control de flota y conductores en tiempo real",
              "Seguimiento de rutas y despachos",
              "Soporte técnico prioritario 24/7",
              "Usuarios ilimitados"
            ].map((feature, idx) => (
              <li key={idx} className="flex items-start gap-3">
                <div className="p-1 bg-green-50 rounded-full mt-0.5 flex-shrink-0">
                  <Check className="w-4 h-4 text-green-600" />
                </div>
                <span className="text-gray-600 text-sm">{feature}</span>
              </li>
            ))}
          </ul>

          {/* Botón de Contacto (Dummy) */}
          <button 
            type="button"
            className="w-full bg-indigo-600 text-white py-3.5 rounded-xl hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 font-semibold mb-4 transform hover:-translate-y-0.5 active:translate-y-0"
          >
            Contactar Ventas
          </button>

          {/* Volver */}
          <button
            onClick={onBack}
            className="w-full text-gray-500 hover:text-gray-800 transition text-sm font-medium flex items-center justify-center gap-2 py-2"
          >
            <ArrowLeft className="w-4 h-4" /> Volver al inicio de sesión
          </button>
        </div>
      </div>
    </div>
  );
}

function LoginForm({ onForgotPassword, onPricing }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [twoFactorCode, setTwoFactorCode] = useState('')
  const [step, setStep] = useState(1)
  const [preAuthId, setPreAuthId] = useState('')
  const [error, setError] = useState('')
  const { loginUser, verify2fa, loading } = useAuth()
  const handleSubmitCredentials = async (e) => {
    e.preventDefault()
    setError('')
    
    const respuesta = await loginUser(email, password)
    
    if (respuesta?.requires2fa) {
      setPreAuthId(respuesta.preAuthId)
      setStep(2)
    }
  }
  const handleSubmitOTP = async (e) => {
    e.preventDefault()
    setError('')
    
    if (twoFactorCode.trim().length !== 6) {
      setError('El código debe tener exactamente 6 dígitos.')
      return
    }
    
    await verify2fa(preAuthId, twoFactorCode)
  }

  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-2xl shadow-xl p-8 transition-all duration-300">
        {step === 1 && (
          <>
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-full mb-4">
                <Lock className="w-8 h-8 text-indigo-600" />
              </div>
              <h1 className="text-gray-900 mb-2 font-medium text-2xl">Inicio de Sesión</h1>
              <p className="text-gray-600 text-sm">Ingrese sus credenciales para continuar</p>
            </div>

            <form onSubmit={handleSubmitCredentials} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-gray-700 mb-2 font-medium text-sm">
                  Usuario / Correo Electrónico
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    id="email"
                    type="text" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition text-sm"
                    placeholder="usuario"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-gray-700 mb-2 font-medium text-sm">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition text-sm"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-bold text-sm shadow-md"
              >
                {loading ? 'Verificando...' : 'Iniciar Sesión'}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={onForgotPassword}
                  className="text-indigo-600 hover:text-indigo-700 hover:underline transition text-sm font-medium"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            </form>
          </>
        )}
        {step === 2 && (
          <>
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full mb-4">
                <ShieldCheck className="w-8 h-8 text-emerald-600" />
              </div>
              <h1 className="text-gray-900 mb-2 font-medium text-2xl">Seguridad Dos Pasos</h1>
              <p className="text-gray-600 text-xs px-2 leading-relaxed">
                Abra la aplicación de autenticación en su celular e ingrese el código dinámico de 6 dígitos.
              </p>
            </div>

            <form onSubmit={handleSubmitOTP} className="space-y-6">
              <div>
                <label htmlFor="otpCode" className="block text-gray-700 mb-2 font-bold text-center text-xs uppercase tracking-wider">
                  Código de Verificación
                </label>
                <div className="relative max-w-[200px] mx-auto">
                  <input
                    id="otpCode"
                    type="text"
                    maxLength={6}
                    pattern="[0-9]*"
                    inputMode="numeric"
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full tracking-[0.5em] text-center font-black text-2xl py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                    placeholder="000000"
                    required
                    autoFocus
                  />
                </div>
                {error && <p className="text-red-500 text-xs text-center mt-2 font-medium">{error}</p>}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 text-white py-3 rounded-lg hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-bold text-sm shadow-md"
              >
                {loading ? 'Confirmando Token...' : 'Validar y Entrar'}
              </button>
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => { setStep(1); setTwoFactorCode(''); }}
                  className="inline-flex items-center gap-1.5 text-gray-500 hover:text-gray-800 transition text-xs font-semibold"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Volver a ingresar credenciales
                </button>
              </div>
            </form>
          </>
        )}

      </div>
    </div>
  )
}
function ForgotPassword({ onBack }) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await apiClient.post('/api/usuarios/password-reset/', { email });
      setSuccess(true);
    } catch (err) {
      setError('Hubo un problema al intentar enviar el correo. Intente nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-gray-900 mb-2 font-medium text-2xl">Email Enviado</h1>
            <p className="text-gray-600 mb-6">
              Hemos enviado instrucciones para restablecer tu contraseña a:
            </p>
            <p className="text-gray-900 mb-8 font-medium">{email}</p>
            <p className="text-gray-600 mb-6 text-sm">
              Por favor, revisa tu bandeja de entrada y sigue las instrucciones.
            </p>
            <button
              onClick={onBack}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition font-medium"
            >
              Volver al Inicio de Sesión
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-2xl shadow-xl p-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver
        </button>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-full mb-4">
            <Mail className="w-8 h-8 text-indigo-600" />
          </div>
          <h1 className="text-gray-900 mb-2 font-medium text-2xl">Recuperar Contraseña</h1>
          <p className="text-gray-600 text-sm">
            Ingresa tu correo electrónico y te enviaremos instrucciones.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-gray-700 mb-2 font-medium">
              Correo Electrónico
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                placeholder="usuario@empresa.com"
                required
              />
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {isLoading ? 'Enviando...' : 'Enviar Instrucciones'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function Login() {
  const [view, setView] = useState('login'); 

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4 font-sans">
      {view === 'login' && (
        <LoginForm 
          onForgotPassword={() => setView('forgot-password')} 
          onPricing={() => setView('pricing')} 
        />
      )}
      {view === 'forgot-password' && (
        <ForgotPassword onBack={() => setView('login')} />
      )}
      {view === 'pricing' && (
        <PricingPage onBack={() => setView('login')} />
      )}
    </div>
  );
}