import { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient, { setTokenEnMemoria, clearTokenEnMemoria, ejecutarRefreshSilencioso } from '../services/api';
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
    try {
      const access = await ejecutarRefreshSilencioso()      
      setAuthTokens({ access })
      const userResponse = await apiClient.get('/api/usuarios/me/')
      
      setUser(userResponse.data)
      return access;
    } catch (error) {
      clearTokenEnMemoria()
      setAuthTokens(null)
      setUser(null)
      return null;
    }
  }, []);

  const registrarInicioSesionExitoso = async (tokensData) => {
    setTokenEnMemoria(tokensData.access)
    setAuthTokens(tokensData)

    const userResponse = await apiClient.get('/api/usuarios/me/')
    const userData = userResponse.data
    setUser(userData)

    canalAutenticacion.postMessage({
      tipo: 'LOGIN_EXITOSO',
      access: tokensData.access,
      user: userData
    });

    const rutaPrevia = sessionStorage.getItem('gstorage_ruta_retorno');
    
    if (rutaPrevia && rutaPrevia !== '/login') {
      sessionStorage.removeItem('gstorage_ruta_retorno');
      navigate(rutaPrevia);
    } else {
      const esChofer = userData?.es_chofer || userData?.perfil_movil || userData?.rol === 'chofer';

      if (esChofer) {
        navigate('/reparto/ruta');
      } else {
        navigate('/');
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

  const verify2fa = async (preAuthId, code) => {
    setAuthLoading(true)
    try {
      const response = await apiClient.post('/api/token/verify-2fa/', {
        pre_auth_id: preAuthId,
        code: code
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
    if (urlActual && urlActual !== '/login') {
      sessionStorage.setItem('gstorage_ruta_retorno', urlActual)
    }
    
    clearTokenEnMemoria()
    setAuthTokens(null)
    setUser(null)
    localStorage.removeItem('gstorage_last_activity')

    canalAutenticacion.postMessage({ tipo: 'LOGOUT_PROCESADO' });

    try {
      await apiClient.post('/api/logout/')
    } catch (error) {
      console.warn("La cookie de sesión ya estaba vencida en el servidor o fue destruida previamente.")
    } finally {
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
  }
  useEffect(() => {
    verificarSesionExistente().finally(() => {
      setIsInitializing(false)
    })
  }, [verificarSesionExistente])

  useEffect(() => {
    if (!user) {
      return
    }

    const KEY_LAST_ACTIVITY = 'gstorage_last_activity'
    const MAX_INACTIVITY_TIME = 1800000

    const registrarActividadOperador = () => {
      localStorage.setItem(KEY_LAST_ACTIVITY, Date.now().toString())
    };

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
        console.log("Sesión cerrada por inactividad global del operador en todas las pestañas.")
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
    const escucharCanalInterPestañas = async (evento) => {
      const { tipo, access, user: userData } = evento.data

      if (tipo === 'LOGIN_EXITOSO') {
        setTokenEnMemoria(access)
        setAuthTokens({ access })
        setUser(userData)

        const rutaPrevia = sessionStorage.getItem('gstorage_ruta_retorno')
        if (rutaPrevia && rutaPrevia !== '/login') {
          sessionStorage.removeItem('gstorage_ruta_retorno')
          navigate(rutaPrevia)
        } else {
          const esChofer = userData?.es_chofer || userData?.perfil_movil || userData?.rol === 'chofer'
          navigate(esChofer ? '/reparto/ruta' : '/')
        }
      }

      if (tipo === 'LOGOUT_PROCESADO') {
        clearTokenEnMemoria()
        setAuthTokens(null)
        setUser(null)
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
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
    verify2fa,
    logoutUser,
    loading: authLoading
  }

  return (
    <AuthContext.Provider value={contextData}>
      {isInitializing ? (
        <div className="min-h-screen flex items-center justify-center bg-slate-100 font-sans text-xs text-slate-400 uppercase tracking-widest">
          Iniciando GStorage...
        </div>
      ) : children}
    </AuthContext.Provider>
  )
}

export default AuthProvider