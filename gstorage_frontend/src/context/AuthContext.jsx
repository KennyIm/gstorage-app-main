import { createContext, useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../services/api';

const AuthContext = createContext()

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
  const [authTokens, setAuthTokens] = useState(() =>
    localStorage.getItem('authTokens') ? JSON.parse(localStorage.getItem('authTokens')) : null
  )
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isInitializing, setIsInitializing] = useState(true)
  const [authLoading, setAuthLoading] = useState(false)
  const navigate = useNavigate()

  const registrarInicioSesionExitoso = async (tokensData) => {
    setAuthTokens(tokensData)
    localStorage.setItem('authTokens', JSON.stringify(tokensData))

    apiClient.defaults.headers.common['Authorization'] = `Bearer ${tokensData.access}`

    const userResponse = await apiClient.get('/api/usuarios/me/')
    setUser(userResponse.data)
  }

  const loginUser = async (username, password) => {
    setLoading(true)
    try {
      const response = await apiClient.post('/api/token/', {
        username: username,
        password: password
      })

      const data = response.data

      if (data.requires_2fa) {
        setLoading(false)
        return { requires2fa: true, preAuthId: data.pre_auth_id }
      }

      await registrarInicioSesionExitoso(data)
      setLoading(false)
      navigate('/')
      return { requires2fa: false }

    } catch (error) {
      console.error("Error de login paso 1:", error)
      setLoading(false)
      alert("Usuario o contraseña incorrectos.")
      return { error: true }
    }
  }

  const verify2fa = async (preAuthId, code) => {
    setLoading(true)
    try {
      const response = await apiClient.post('/api/token/verify-2fa/', {
        pre_auth_id: preAuthId,
        code: code
      })

      await registrarInicioSesionExitoso(response.data)
      setLoading(false)
      navigate('/')
      return { success: true }

    } catch (error) {
      console.error("Error en verificación 2FA:", error)
      setLoading(false)
      alert("Código verificador inválido o expirado.")
      return { success: false }
    }
  }

  const logoutUser = async () => {
    try {
      const storedTokens = JSON.parse(localStorage.getItem('authTokens'))
      if (storedTokens && storedTokens.refresh) {
        await apiClient.post('/api/logout/', { refresh: storedTokens.refresh })
      }
    } catch (error) {
      console.warn("No se pudo invalidar el token en el servidor.")
    } finally {
      localStorage.clear()
      delete apiClient.defaults.headers.common['Authorization']
      setAuthTokens(null)
      setUser(null)
      window.location.href = '/login'
    }
  }

  useEffect(() => {
    if (authTokens) {
      apiClient.get('/api/usuarios/me/')
        .then(response => {
          setUser(response.data)
          setIsInitializing(false)
        })
        .catch(() => {
          setAuthTokens(null)
          setUser(null)
          setIsInitializing(false)
        });
    } else {
      setIsInitializing(false)
    }
  }, [])

  const contextData = {
    authTokens,
    user,
    loginUser,
    verify2fa, 
    logoutUser,
    loading: authLoading 
  };

  return (
    <AuthContext.Provider value={contextData}>
      {isInitializing ? <div className="p-8 text-center font-sans text-xs text-slate-400 uppercase tracking-widest">Iniciando GStorage...</div> : children}
    </AuthContext.Provider>
  )
}

export default AuthContext