import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import apiClient from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function CrearUsuario() {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    first_name: '',
    last_name: ''
  });
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { user } = useAuth(); 

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!user?.perfil?.empresa) {
        setError("Error: Tu cuenta de administrador no está asignada a ninguna empresa.");
        return;
    }

    try {
      const response = await apiClient.post('/api/usuarios/register/', formData);
      
      const newUserId = response.data.id; 
      const empresaId = user.perfil.empresa;
      
      await apiClient.put(`/api/usuarios/perfil/${newUserId}/`, {
        empresa: empresaId,
        rol: 'OPERARIO' 
      });
      navigate('/gestionar-empleados');

    } 
    catch (err) {
      console.error(err.response);
      
      if (err.response?.data && typeof err.response.data === 'object') {
        const errorData = err.response.data;
        const errorMessages = Object.keys(errorData)
          .map(key => `${key}: ${Array.isArray(errorData[key]) ? errorData[key].join(', ') : errorData[key]}`)
          .join('\n');
        setError(errorMessages);
      } else {
        setError('Error al crear el usuario. Revisa la consola para más detalles.');
      }
    }
  };

  return (
    <div>
      <h1>Crear Nuevo Empleado</h1>
      <hr />
      {error && (
        <div className="alert alert-danger" style={{ whiteSpace: 'pre-line' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="row">
          <div className="col-md-6 mb-3">
            <label htmlFor="username" className="form-label">Nombre de Usuario (Login)</label>
            <input
              type="text"
              id="username"
              name="username"
              className="form-control"
              value={formData.username}
              onChange={handleChange}
              required
            />
          </div>
          <div className="col-md-6 mb-3">
            <label htmlFor="password" className="form-label">Contraseña</label>
            <input
              type="password"
              id="password"
              name="password"
              className="form-control"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        <div className="mb-3">
          <label htmlFor="email" className="form-label">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            className="form-control"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>

        <div className="row">
          <div className="col-md-6 mb-3">
            <label htmlFor="first_name" className="form-label">Nombre</label>
            <input
              type="text"
              id="first_name"
              name="first_name"
              className="form-control"
              value={formData.first_name}
              onChange={handleChange}
            />
          </div>
          <div className="col-md-6 mb-3">
            <label htmlFor="last_name" className="form-label">Apellido</label>
            <input
              type="text"
              id="last_name"
              name="last_name"
              className="form-control"
              value={formData.last_name}
              onChange={handleChange}
            />
          </div>
        </div>
        
        <button type="submit" className="btn btn-primary">Crear Empleado</button>
        <Link to="/gestionar-empleados" className="btn btn-secondary ms-2">Cancelar</Link>
      </form>
    </div>
  );
}