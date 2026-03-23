import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import apiClient from '../../services/api';

export default function CamionEdit() {
  const [formData, setFormData] = useState(null);
  const [error, setError] = useState(null);
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    apiClient.get(`/api/inventario/camiones/${id}/`)
      .then(res => {
        setFormData(res.data);
      })
      .catch(err => setError('No se pudo cargar el camión.'));
  }, [id]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await apiClient.put(`/api/inventario/camiones/${id}/`, formData);
      navigate('/camiones');
    } catch (err) {
      setError('Error al actualizar el camión.');
    }
  };

  if (!formData) return <div>Cargando...</div>;

  return (
    <div>
      <h1>Editar Camión</h1>
      <hr />
      {error && <div className="alert alert-danger">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="form-label">Patente</label>
          <input type="text" name="patente" className="form-control" value={formData.patente} onChange={handleChange} required />
        </div>
        <div className="mb-3">
          <label className="form-label">Marca</label>
          <input type="text" name="marca" className="form-control" value={formData.marca} onChange={handleChange} />
        </div>
        <div className="mb-3">
          <label className="form-label">Modelo</label>
          <input type="text" name="modelo" className="form-control" value={formData.modelo} onChange={handleChange} />
        </div>
        <div className="row">
          <div className="col-md-6 mb-3">
            <label className="form-label">Capacidad Máx (Kg)</label>
            <input type="number" name="capacidad_max_kg" className="form-control" value={formData.capacidad_max_kg} onChange={handleChange} step="0.01" required />
          </div>
          <div className="col-md-6 mb-3">
            <label className="form-label">Capacidad Máx (m³)</label>
            <input type="number" name="capacidad_max_m3" className="form-control" value={formData.capacidad_max_m3} onChange={handleChange} step="0.01" required />
          </div>
        </div>
        <button type="submit" className="btn btn-primary">Actualizar</button>
        <Link to="/camiones" className="btn btn-secondary ms-2">Cancelar</Link>
      </form>
    </div>
  );
}