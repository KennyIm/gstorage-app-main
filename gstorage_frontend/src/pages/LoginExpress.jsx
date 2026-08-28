import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import apiClient from '../services/api'
import logoImg from '../assets/logomedalla.png'

export default function LoginExpress() {
  const { loginExpressUser } = useAuth()
  const [step, setStep] = useState(1)
  const [rut, setRut] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const handleRutChange = (e) => {
    let value = e.target.value.replace(/[^0-9kK]/g, '')
    if (value.length > 9) value = value.slice(0, 9)
    
    if (value.length > 1) {
      const cuerpo = value.slice(0, -1)
      const dv = value.slice(-1).toUpperCase()
      value = `${cuerpo}-${dv}`
    }
    setRut(value)
  }

  const handleSolicitarOTP = async (e) => {
    e.preventDefault()
    if (!rut || rut.length < 7) {
      setError('Por favor ingresa un RUT válido.')
      return
    }
    setLoading(true)
    setError('')
    setMessage('')

    try {
      const res = await apiClient.post('/api/usuarios/auth/express/solicitar-otp/', { rut })
      setMessage(res.data.message || 'Código enviado al teléfono.')
      setStep(2)
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo enviar el código de verificación.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerificarOTP = async (e) => {
    e.preventDefault()
    if (!code || code.length !== 4) {
      setError('El código debe ser de 4 dígitos.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await apiClient.post('/api/usuarios/auth/express/verificar-otp/', { rut, code })
      await loginExpressUser(
        { access: res.data.access, is_express: true },
        { nombre: res.data.nombre, rol: res.data.rol }
      );
    } catch (err) {
      setError(err.response?.data?.error || 'Código incorrecto o ha expirado.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-6">
        
        {/* LOGO Y TÍTULO */}
        <div className="text-center mb-6">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-2">
            <img src={logoImg} alt="Logo" className="h-14 w-auto min-w-[30px]" />
          </div>
          <h1 className="text-xl font-bold text-slate-800">Acceso OPT</h1>
        </div>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs mb-4 text-center font-medium">
            ⚠️ {error}
          </div>
        )}
        {message && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 p-3 rounded-xl text-xs mb-4 text-center font-medium">
            {message}
          </div>
        )}

        {/* PASO 1: PEDIR RUT */}
        {step === 1 && (
          <form onSubmit={handleSolicitarOTP} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
              </label>
              <input
                type="text"
                placeholder="12345678-9"
                value={rut}
                onChange={handleRutChange}
                disabled={loading}
                className="w-full p-3 text-lg font-semibold tracking-wider rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-600 outline-none text-center"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full p-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition shadow-md shadow-blue-500/20 disabled:bg-slate-400 cursor-pointer"
            >
              {loading ? 'Consultando...' : 'Solicitar Código de Acceso'}
            </button>
          </form>
        )}

        {/* PASO 2: PEDIR CÓDIGO OTP */}
        {step === 2 && (
          <form onSubmit={handleVerificarOTP} className="space-y-4">
            <div className="text-center">
              <span className="text-xs text-slate-500">RUT: <strong>{rut}</strong></span>
              <button
                type="button"
                onClick={() => { setStep(1); setCode(''); setError(''); }}
                className="ml-2 text-xs text-blue-600 underline font-semibold cursor-pointer"
              >
                Cambiar
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 text-center">
                Código SMS / WhatsApp (4 dígitos):
              </label>
              <input
                type="text"
                maxLength={4}
                placeholder="8492"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
                disabled={loading}
                className="w-full p-3 text-2xl font-bold tracking-[0.5em] text-center rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-600 outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading || code.length !== 4}
              className="w-full p-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-sm transition shadow-md disabled:bg-slate-300 cursor-pointer"
            >
              {loading ? 'Verificando...' : 'Ingresar a la App'}
            </button>
          </form>
        )}

      </div>
    </div>
  );
}