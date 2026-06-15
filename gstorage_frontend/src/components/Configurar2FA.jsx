import React, { useState, useEffect } from 'react'
import apiClient from '../services/api'
import { Shield, QrCode, CheckCircle, RefreshCw, Copy, AlertTriangle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Configurar2FA() {

    document.title = "Activar2FA - GStorage"
    const navigate = useNavigate()
    const { user } = useAuth()
    const [loading, setLoading] = useState(false)
    const [qrImage, setQrImage] = useState('')
    const [secretKey, setSecretKey] = useState('')
    const [codigoConfirmacion, setCodigoConfirmacion] = useState('')
    const [isActivoExitoso, setIsActivoExitoso] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        if (user?.perfil?.is_2fa_enabled) {
            console.warn("Acceso denegado: El usuario ya cuenta con la protección 2FA.")
            navigate('/perfil')
        }
    }, [user, navigate])

    const cargarDatos2FA = async () => {
        setLoading(true)
        setError('')
        try {
            const response = await apiClient.get('/api/usuarios/2fa/obtener-qr/')
            setQrImage(response.data.qr_image)
            setSecretKey(response.data.secret_key)
        } catch (err) {
            setError('No se pudo inicializar la clave de seguridad del servidor.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        cargarDatos2FA()
    }, [])

    const handleActivarDefinitivo = async (e) => {
        e.preventDefault()
        setError('')
        if (codigoConfirmacion.length !== 6) {
            setError('El código debe tener exactamente 6 dígitos.')
            return
        }

        try {
            setLoading(true)
            await apiClient.post('/api/usuarios/2fa/confirmar/', { code: codigoConfirmacion })
            setIsActivoExitoso(true)
        } catch (err) {
            setError(err.response?.data?.error || 'Código incorrecto. Verifica la hora de tu teléfono.')
        } finally {
            setLoading(false)
        }
    }

    const copiarAlPortapapeles = () => {
        navigator.clipboard.writeText(secretKey)
        alert('Clave secreta copiada al portapapeles.')
    }

    if (isActivoExitoso) {
        return (
            <div className="max-w-md mx-auto bg-white p-8 rounded-2xl border border-slate-200 shadow-lg text-center font-sans my-8 animate-fadeIn">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                    <CheckCircle className="w-10 h-10" />
                </div>
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">¡Doble Factor Activado!</h2>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                    El Doble Factor de Autenticación (2FA) ha sido enlazado de forma exitosa. A partir de su próximo inicio de sesión, el sistema le solicitará el token dinámico de su aplicación móvil.
                </p>
                <button
                    type="button"
                    onClick={() => window.location.href = '/perfil'}
                    className="mt-6 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider shadow transition duration-200"
                >
                    Volver al Perfil
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-md mx-auto bg-white p-6 rounded-2xl border border-slate-200 shadow-sm font-sans">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                <Shield className="w-5 h-5 text-indigo-600" />
                <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">Configurar Doble Factor (2FA)</h2>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs font-bold flex items-center gap-2 mb-4">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {loading && !qrImage ? (
                <div className="text-center py-12 text-xs text-slate-400 font-bold uppercase tracking-widest animate-pulse">
                    Generando llaves criptográficas...
                </div>
            ) : (
                <div className="space-y-5">
                    <div className="flex gap-2 text-xs">
                        <span className="w-5 h-5 bg-slate-900 text-white rounded-full flex items-center justify-center font-black shrink-0">1</span>
                        <p className="text-slate-600 leading-tight">
                            Escanee este código QR con la cámara de su celular usando **Google Authenticator** o **Authy**.
                        </p>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex flex-col items-center justify-center shadow-inner relative group">
                        {qrImage ? (
                            <img src={qrImage} alt="Código QR de Seguridad" className="w-44 h-44 object-contain" />
                        ) : (
                            <div className="w-44 h-44 bg-slate-200 rounded-xl animate-pulse" />
                        )}

                        <div className="w-full mt-2 bg-white border border-slate-200 rounded-lg p-2 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                            <span className="truncate max-w-[80%]">Llave: {secretKey}</span>
                            <button onClick={copiarAlPortapapeles} type="button" className="text-indigo-600 hover:text-indigo-800 p-1">
                                <Copy className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>

                    <div className="flex gap-2 text-xs">
                        <span className="w-5 h-5 bg-slate-900 text-white rounded-full flex items-center justify-center font-black shrink-0">2</span>
                        <p className="text-slate-600 leading-tight">
                            Ingrese el código temporal de 6 números que le muestra su teléfono para verificar la sincronización horaria.
                        </p>
                    </div>

                    <form onSubmit={handleActivarDefinitivo} className="space-y-4">
                        <div className="relative max-w-[160px] mx-auto">
                            <input
                                type="text"
                                maxLength={6}
                                pattern="[0-9]*"
                                inputMode="numeric"
                                value={codigoConfirmacion}
                                onChange={(e) => setCodigoConfirmacion(e.target.value.replace(/[^0-9]/g, ''))}
                                className="w-full tracking-[0.4em] text-center font-black text-xl py-2 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition bg-slate-50/50"
                                placeholder="000000"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !codigoConfirmacion}
                            className="w-full bg-slate-900 text-white py-2.5 rounded-xl hover:bg-slate-800 transition disabled:opacity-40 font-bold text-xs uppercase tracking-wider shadow"
                        >
                            {loading ? 'Confirmando...' : 'Confirmar y Activar'}
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}