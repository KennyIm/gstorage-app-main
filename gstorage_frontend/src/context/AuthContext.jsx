import { useState, useEffect, useContext, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import apiClient, { setTokenEnMemoria, clearTokenEnMemoria, ejecutarRefreshSilencioso } from '../services/api'
import { AuthContext } from '../services/AuthContextInstance'

export const useAuth = () => useContext(AuthContext)

const canalAutenticacion = new BroadcastChannel('gstorage_auth_sync')

export const AuthProvider = ({ children }) => {
  const [authTokens, setAuthTokens] = useState(null)
  const [user, setUser] = useState(null)
  const [isInitializing, setIsInitializing] = useState(true)
  const [authLoading, setAuthLoading] = useState(false)
  const navigate = useNavigate()

  const verificarSesionExistente = useCallback(async () => {
    const haySesionActiva = localStorage.getItem('gstorage_logged_in') === 'true'
    const esRutaPublica = ['/login', '/login-express', '/404'].some(r => window.location.pathname.startsWith(r))

    if (!haySesionActiva && esRutaPublica) {
      clearTokenEnMemoria()
      setAuthTokens(null)
      setUser(null)
      return null
    }

    try {
      const access = await ejecutarRefreshSilencioso()
      setAuthTokens({ access })
      sessionStorage.setItem('gstorage_has_session', 'true')

      const isExpress = localStorage.getItem('is_express_session') === 'true'
      if (isExpress) {
        const expressUserData = {
          nombre: localStorage.getItem('operativo_nombre') || 'Operativo',
          rol: localStorage.getItem('operativo_rol') || 'PATIO',
          isExpress: true,
        }
        setUser(expressUserData)
        return access
      }

      const userResponse = await apiClient.get('/api/usuarios/me/')
      setUser(userResponse.data)
      return access

    } catch (error) {
      clearTokenEnMemoria()
      sessionStorage.removeItem('gstorage_has_session')
      setAuthTokens(null)
      setUser(null)
      return null
    }
  }, [])

  const registrarInicioSesionExitoso = async (tokensData, expressData = null) => {
    sessionStorage.setItem('gstorage_has_session', 'true')
    setTokenEnMemoria(tokensData.access)
    setAuthTokens(tokensData)

    let userData = null
    if (expressData || tokensData.is_express) {
      localStorage.setItem('is_express_session', 'true')
      const nombre = expressData?.nombre || tokensData.nombre || 'Operativo'
      const rol = expressData?.rol || tokensData.rol || 'PATIO'
      localStorage.setItem('operativo_nombre', nombre)
      localStorage.setItem('operativo_rol', rol)
      userData = { nombre, rol, isExpress: true }
      setUser(userData)
    } else {
      localStorage.removeItem('is_express_session')
      const userResponse = await apiClient.get('/api/usuarios/me/')
      userData = userResponse.data
      setUser(userData)
    }

    canalAutenticacion.postMessage({
      tipo: 'LOGIN_EXITOSO',
      access: tokensData.access,
      user: userData,
    })

    const rutaPrevia = sessionStorage.getItem('gstorage_ruta_retorno')
    if (rutaPrevia && !['/login', '/login-express', '/404'].includes(rutaPrevia)) {
      sessionStorage.removeItem('gstorage_ruta_retorno')
      navigate(rutaPrevia)
    } else {
      if (userData?.isExpress) {
        navigate('/operaciones')
      } else {
        const esChofer = userData?.es_chofer || userData?.perfil_movil || userData?.rol === 'chofer'
        navigate(esChofer ? '/reparto/ruta' : '/')
      }
    }
  }

  const loginUser = async (username, password) => {
    setAuthLoading(true)
    try {
      const response = await apiClient.post('/api/token/', { username, password })
      const data = response.data
      if (data.requires_2fa) {
        setAuthLoading(false)
        return { requires2fa: true, preAuthId: data.pre_auth_id }
      }
      await registrarInicioSesionExitoso(data)
      setAuthLoading(false)
      return { requires2fa: false }
    } catch (error) {
      console.error("Error de login paso 1:", error)
      setAuthLoading(false)
      alert("Usuario o contraseña incorrectos.")
      return { error: true }
    }
  }

  const loginExpressUser = async (tokensData, expressData) => {
    setAuthLoading(true)
    try {
      await registrarInicioSesionExitoso(tokensData, expressData)
    } finally {
      setAuthLoading(false)
    }
  }

  const verify2fa = async (preAuthId, code) => {
    setAuthLoading(true)
    try {
      const response = await apiClient.post('/api/token/verify-2fa/', {
        pre_auth_id: preAuthId,
        code: code,
      })
      await registrarInicioSesionExitoso(response.data)
      setAuthLoading(false)
      return { success: true }
    } catch (error) {
      console.error("Error en verificación 2FA:", error)
      setAuthLoading(false)
      alert("Código verificador inválido o expirado.")
      return { success: false }
    }
  }

  const logoutUser = async () => {
    const urlActual = window.location.pathname
    const esExpress = localStorage.getItem('is_express_session') === 'true'

    if (urlActual && !['/login', '/login-express', '/404'].includes(urlActual)) {
      sessionStorage.setItem('gstorage_ruta_retorno', urlActual)
    }

    clearTokenEnMemoria()
    sessionStorage.removeItem('gstorage_has_session')
    setAuthTokens(null)
    setUser(null)
    localStorage.removeItem('gstorage_logged_in')
    localStorage.removeItem('gstorage_last_activity')
    localStorage.removeItem('is_express_session')
    localStorage.removeItem('operativo_nombre')
    localStorage.removeItem('operativo_rol')

    canalAutenticacion.postMessage({ tipo: 'LOGOUT_PROCESADO' })

    try {
      await apiClient.post('/api/logout/')
    } catch (error) {
    } finally {
      const destinoLogin = esExpress ? '/login-express' : '/login'
      if (window.location.pathname !== destinoLogin) {
        window.location.href = destinoLogin
      }
    }
  }

  useEffect(() => {
    verificarSesionExistente().finally(() => {
      setIsInitializing(false)
    })
  }, [verificarSesionExistente])

  useEffect(() => {
    if (!user) return
    const KEY_LAST_ACTIVITY = 'gstorage_last_activity'
    const MAX_INACTIVITY_TIME = 1800000

    const registrarActividadOperador = () => {
      localStorage.setItem(KEY_LAST_ACTIVITY, Date.now().toString())
    }

    window.addEventListener('keydown', registrarActividadOperador)
    window.addEventListener('click', registrarActividadOperador)
    window.addEventListener('scroll', registrarActividadOperador)
    window.addEventListener('mousemove', registrarActividadOperador)
    registrarActividadOperador()

    const intervaloChequeo = setInterval(() => {
      const ultimaActividad = parseInt(localStorage.getItem(KEY_LAST_ACTIVITY) || '0', 10)
      const tiempoTranscurrido = Date.now() - ultimaActividad
      if (tiempoTranscurrido >= MAX_INACTIVITY_TIME) {
        clearInterval(intervaloChequeo)
        logoutUser()
      }
    }, 10000)

    return () => {
      window.removeEventListener('keydown', registrarActividadOperador)
      window.removeEventListener('click', registrarActividadOperador)
      window.removeEventListener('scroll', registrarActividadOperador)
      window.removeEventListener('mousemove', registrarActividadOperador)
      clearInterval(intervaloChequeo)
    }
  }, [user])

  useEffect(() => {
    const escucharCanalInterPestañas = (evento) => {
      const { tipo, access, user: userData } = evento.data

      if (tipo === 'LOGIN_EXITOSO') {
        sessionStorage.setItem('gstorage_has_session', 'true')
        localStorage.setItem('gstorage_logged_in', 'true')
        setTokenEnMemoria(access)
        setAuthTokens({ access })
        setUser(userData)

        const rutaPrevia = sessionStorage.getItem('gstorage_ruta_retorno')
        if (rutaPrevia && !['/login', '/login-express', '/404'].includes(rutaPrevia)) {
          sessionStorage.removeItem('gstorage_ruta_retorno')
          navigate(rutaPrevia)
        } else {
          if (userData?.isExpress) {
            navigate('/operaciones')
          } else {
            const esChofer = userData?.es_chofer || userData?.perfil_movil || userData?.rol === 'chofer'
            navigate(esChofer ? '/reparto/ruta' : '/')
          }
        }
      }

      if (tipo === 'LOGOUT_PROCESADO') {
        const esExpress = localStorage.getItem('is_express_session') === 'true'

        clearTokenEnMemoria()
        sessionStorage.removeItem('gstorage_has_session')
        localStorage.removeItem('gstorage_logged_in')
        localStorage.removeItem('gstorage_last_activity')
        localStorage.removeItem('is_express_session')
        localStorage.removeItem('operativo_nombre')
        localStorage.removeItem('operativo_rol')

        setAuthTokens(null)
        setUser(null)

        const destinoLogin = esExpress ? '/login-express' : '/login'
        if (!['/login', '/login-express'].includes(window.location.pathname)) {
          window.location.href = destinoLogin
        }
      }
    }

    canalAutenticacion.addEventListener('message', escucharCanalInterPestañas)
    return () => canalAutenticacion.removeEventListener('message', escucharCanalInterPestañas)
  }, [navigate])

  const contextData = {
    authTokens,
    user,
    loginUser,
    loginExpressUser,
    verify2fa,
    logoutUser,
    loading: authLoading,
  }

  return (
    <AuthContext.Provider value={contextData}>
      {isInitializing ? (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 font-sans text-xs text-slate-400 uppercase tracking-widest">
          Iniciando GStorage...
        </div>
      ) : children}
    </AuthContext.Provider>
  )
}

export default AuthProvider