import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import apiClient from '../../services/api';

export default function DestinoCreate() {
  const [formData, setFormData] = useState({
    nombre_ciudad: '',
    region: ''
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
      await apiClient.post('/api/inventario/destinos/', formData);
      navigate('/destinos');
    } catch (err) {
      setError('Error al guardar el destino.');
    }
  };

  return (
    <div>
      <h1>Nuevo Destino</h1>
      <hr />
      {error && <div className="alert alert-danger">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="form-label">Nombre de Ciudad</label>
          <input type="text" name="nombre_ciudad" className="form-control" onChange={handleChange} required />
        </div>
        <div className="mb-3">
          <label className="form-label">Región</label>
          <input type="text" name="region" className="form-control" onChange={handleChange} />
        </div>
        <button type="submit" className="btn btn-primary">Guardar</button>
        <Link to="/destinos" className="btn btn-secondary ms-2">Cancelar</Link>
      </form>
    </div>
  );
}