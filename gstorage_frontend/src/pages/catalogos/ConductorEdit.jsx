import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import apiClient from '../../services/api';

export default function ConductorEdit() {
  const [formData, setFormData] = useState(null);
  const [error, setError] = useState(null);
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    apiClient.get(`/api/inventario/conductores/${id}/`)
      .then(res => {
        setFormData(res.data);
      })
      .catch(err => setError('No se pudo cargar el conductor.'));
  }, [id]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await apiClient.put(`/api/inventario/conductores/${id}/`, formData);
      navigate('/conductores');
    } catch (err) {
      setError('Error al actualizar el conductor.');
    }
  };

  if (!formData) return <div>Cargando...</div>;

  return (
    <div>
      <h1>Editar Conductor</h1>
      <hr />
      {error && <div className="alert alert-danger">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="form-label">Nombre Completo</label>
          <input type="text" name="nombre_completo" className="form-control" value={formData.nombre_completo} onChange={handleChange} required />
        </div>
        <div className="mb-3">
          <label className="form-label">RUT</label>
          <input type="text" name="rut_conductor" className="form-control" value={formData.rut_conductor} onChange={handleChange} required />
        </div>
        <div className="mb-3">
          <label className="form-label">Número de Licencia</label>
          <input type="text" name="numero_licencia" className="form-control" value={formData.numero_licencia} onChange={handleChange} required />
        </div>
        <div className="mb-3">
          <label className="form-label">Teléfono</label>
          <input type="text" name="telefono" className="form-control" value={formData.telefono} onChange={handleChange} />
        </div>
        <button type="submit" className="btn btn-primary">Actualizar</button>
        <Link to="/conductores" className="btn btn-secondary ms-2">Cancelar</Link>
      </form>
    </div>
  );
}