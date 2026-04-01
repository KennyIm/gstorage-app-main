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
    const refreshToken = localStorage.getItem('refresh_token');
    if (refreshToken) {
      await apiClient.post('/api/logout/', { refresh: refreshToken });
    }
  } catch (error) {
    console.error("Error en blacklist:", error);
  } finally {
    localStorage.clear(); 
    delete apiClient.defaults.headers.common['Authorization'];
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
        .catch(error => {
          console.error("Token inválido, cerrando sesión:", error);
          logoutUser();
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [authTokens]);

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