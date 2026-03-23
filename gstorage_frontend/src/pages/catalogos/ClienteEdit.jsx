import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import apiClient from '../../services/api';

export default function ClienteEdit() {
  const [formData, setFormData] = useState(null);
  const [error, setError] = useState(null);
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    apiClient.get(`/api/inventario/clientes/${id}/`)
      .then(res => {
        setFormData(res.data);
      })
      .catch(err => setError('No se pudo cargar el cliente.'));
  }, [id]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await apiClient.put(`/api/inventario/clientes/${id}/`, formData);
      navigate('/clientes');
    } catch (err) {
      setError('Error al actualizar el cliente.');
    }
  };

  if (!formData) return <div>Cargando...</div>;

  return (
    <div>
      <h1>Editar Cliente</h1>
      <hr />
      {error && <div className="alert alert-danger">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="form-label">Nombre Cliente</label>
          <input type="text" name="nombre_cliente" className="form-control" value={formData.nombre_cliente} onChange={handleChange} required />
        </div>
        <div className="mb-3">
          <label className="form-label">RUT</label>
          <input type="text" name="rut_cliente" className="form-control" value={formData.rut_cliente} onChange={handleChange} />
        </div>
        <div className="mb-3">
          <label className="form-label">Teléfono</label>
          <input type="text" name="telefono_contacto" className="form-control" value={formData.telefono_contacto} onChange={handleChange} />
        </div>
        <div className="mb-3">
          <label className="form-label">Email</label>
          <input type="email" name="email_contacto" className="form-control" value={formData.email_contacto} onChange={handleChange} />
        </div>
        <button type="submit" className="btn btn-primary">Actualizar</button>
        <Link to="/clientes" className="btn btn-secondary ms-2">Cancelar</Link>
      </form>
    </div>
  );
}