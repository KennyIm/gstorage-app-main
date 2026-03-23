import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import apiClient from '../../services/api';

export default function RutaEdit() {
  const [formData, setFormData] = useState(null);
  const [error, setError] = useState(null);
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    apiClient.get(`/api/inventario/rutas/${id}/`)
      .then(res => {
        setFormData(res.data);
      })
      .catch(err => setError('No se pudo cargar la ruta.'));
  }, [id]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await apiClient.put(`/api/inventario/rutas/${id}/`, formData);
      navigate('/rutas');
    } catch (err) {
      setError('Error al actualizar la ruta.');
    }
  };

  if (!formData) return <div>Cargando...</div>;

  return (
    <div>
      <h1>Editar Ruta</h1>
      <hr />
      {error && <div className="alert alert-danger">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="form-label">Nombre de Ruta</label>
          <input type="text" name="nombre_ruta" className="form-control" value={formData.nombre_ruta} onChange={handleChange} required />
        </div>
        <div className="mb-3">
          <label className="form-label">Descripción</label>
          <textarea name="descripcion" className="form-control" rows="3" value={formData.descripcion} onChange={handleChange}></textarea>
        </div>
        <button type="submit" className="btn btn-primary">Actualizar</button>
        <Link to="/rutas" className="btn btn-secondary ms-2">Cancelar</Link>
      </form>
    </div>
  );
}