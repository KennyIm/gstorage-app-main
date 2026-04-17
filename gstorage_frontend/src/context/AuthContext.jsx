import { createContext, useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [authTokens, setAuthTokens] = useState(() =>
    localStorage.getItem('authTokens') ? JSON.parse(localStorage.getItem('authTokens')) : null
  );

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  const loginUser = async (username, password) => {
    setLoading(true);
    try {
      const response = await apiClient.post('/api/token/', {
        username: username,
        password: password
      });

      const data = response.data;
      setAuthTokens(data);
      localStorage.setItem('authTokens', JSON.stringify(data));

      const userResponse = await apiClient.get('/api/usuarios/me/');
      setUser(userResponse.data);

      setLoading(false);
      navigate('/');

    } catch (error) {
      console.error("Error de login:", error);
      setLoading(false);
      alert("¡Error! Usuario o contraseña incorrectos.");
    }
  };

  const logoutUser = async () => {
    try {
      const storedTokens = JSON.parse(localStorage.getItem('authTokens'));

      if (storedTokens && storedTokens.refresh) {
        await apiClient.post('/api/logout/', { refresh: storedTokens.refresh });
      }
    } catch (error) {
      console.warn("No se pudo hacer blacklist del token en el servidor.");
    } finally {
      localStorage.clear();
      delete apiClient.defaults.headers.common['Authorization'];
      setAuthTokens(null);
      setUser(null);
      window.location.href = '/login';
    }
  };

  useEffect(() => {
    if (authTokens) {
      apiClient.get('/api/usuarios/me/')
        .then(response => {
          setUser(response.data);
          setLoading(false);
        })
        .catch(() => {
          setAuthTokens(null);
          setUser(null);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const contextData = {
    authTokens: authTokens,
    user: user,
    loginUser: loginUser,
    logoutUser: logoutUser,
  };

  return (
    <AuthContext.Provider value={contextData}>
      {loading ? <div>Cargando aplicación...</div> : children}
    </AuthContext.Provider>
  );
};

export default AuthContext;