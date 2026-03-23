import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import apiClient from '../../services/api';

export default function RutaCreate() {
  const [formData, setFormData] = useState({
    nombre_ruta: '',
    descripcion: ''
  });
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await apiClient.post('/api/inventario/rutas/', formData);
      navigate('/rutas');
    } catch (err) {
      setError('Error al guardar la ruta.');
    }
  };

  return (
    <div>
      <h1>Nueva Ruta</h1>
      <hr />
      {error && <div className="alert alert-danger">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="form-label">Nombre de Ruta</label>
          <input type="text" name="nombre_ruta" className="form-control" onChange={handleChange} required />
        </div>
        <div className="mb-3">
          <label className="form-label">Descripción</label>
          <textarea name="descripcion" className="form-control" rows="3" onChange={handleChange}></textarea>
        </div>
        <button type="submit" className="btn btn-primary">Guardar</button>
        <Link to="/rutas" className="btn btn-secondary ms-2">Cancelar</Link>
      </form>
    </div>
  );
}