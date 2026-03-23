import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import apiClient from '../../services/api';

export default function DestinoEdit() {
  const [formData, setFormData] = useState(null);
  const [error, setError] = useState(null);
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    apiClient.get(`/api/inventario/destinos/${id}/`)
      .then(res => {
        setFormData(res.data);
      })
      .catch(err => setError('No se pudo cargar el destino.'));
  }, [id]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await apiClient.put(`/api/inventario/destinos/${id}/`, formData);
      navigate('/destinos');
    } catch (err) {
      setError('Error al actualizar el destino.');
    }
  };

  if (!formData) return <div>Cargando...</div>;

  return (
    <div>
      <h1>Editar Destino</h1>
      <hr />
      {error && <div className="alert alert-danger">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="form-label">Nombre de Ciudad</label>
          <input type="text" name="nombre_ciudad" className="form-control" value={formData.nombre_ciudad} onChange={handleChange} required />
        </div>
        <div className="mb-3">
          <label className="form-label">Región</label>
          <input type="text" name="region" className="form-control" value={formData.region} onChange={handleChange} />
        </div>
        <button type="submit" className="btn btn-primary">Actualizar</button>
        <Link to="/destinos" className="btn btn-secondary ms-2">Cancelar</Link>
      </form>
    </div>
  );
}