import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import apiClient from '../../services/api';

export default function CamionCreate() {
  const [formData, setFormData] = useState({
    patente: '',
    marca: '',
    modelo: '',
    capacidad_max_kg: 0,
    capacidad_max_m3: 0
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
      await apiClient.post('/api/inventario/camiones/', formData);
      navigate('/camiones');
    } catch (err) {
      setError('Error al guardar el camión.');
    }
  };

  return (
    <div>
      <h1>Nuevo Camión</h1>
      <hr />
      {error && <div className="alert alert-danger">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="form-label">Patente</label>
          <input type="text" name="patente" className="form-control" onChange={handleChange} required />
        </div>
        <div className="mb-3">
          <label className="form-label">Marca</label>
          <input type="text" name="marca" className="form-control" onChange={handleChange} />
        </div>
        <div className="mb-3">
          <label className="form-label">Modelo</label>
          <input type="text" name="modelo" className="form-control" onChange={handleChange} />
        </div>
        <div className="row">
          <div className="col-md-6 mb-3">
            <label className="form-label">Capacidad Máx (Kg)</label>
            <input type="number" name="capacidad_max_kg" className="form-control" onChange={handleChange} step="0.01" required />
          </div>
          <div className="col-md-6 mb-3">
            <label className="form-label">Capacidad Máx (m³)</label>
            <input type="number" name="capacidad_max_m3" className="form-control" onChange={handleChange} step="0.01" required />
          </div>
        </div>
        <button type="submit" className="btn btn-primary">Guardar</button>
        <Link to="/camiones" className="btn btn-secondary ms-2">Cancelar</Link>
      </form>
    </div>
  );
}