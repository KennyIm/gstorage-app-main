import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import apiClient from '../../services/api';

export default function ClienteCreate() {
  const [formData, setFormData] = useState({
    nombre_cliente: '',
    rut_cliente: '',
    telefono_contacto: '',
    email_contacto: '',
    precio_kg: '',
    precio_m3: '',
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
      await apiClient.post('/api/inventario/clientes/', formData);
      navigate('/clientes');
    } catch (err) {
      setError('Error al guardar el cliente.');
    }
  };

  return (
    <div>
      <h1>Nuevo Cliente</h1>
      <hr />
      {error && <div className="alert alert-danger">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="form-label">Nombre Cliente</label>
          <input type="text" name="nombre_cliente" className="form-control" onChange={handleChange} required />
        </div>
        <div className="mb-3">
          <label className="form-label">RUT</label>
          <input type="text" name="rut_cliente" className="form-control" onChange={handleChange} />
        </div>
        <div className="mb-3">
          <label className="form-label">Teléfono</label>
          <input type="text" name="telefono_contacto" className="form-control" onChange={handleChange} />
        </div>
        <div className="mb-3">
          <label className="form-label">Email</label>
          <input type="email" name="email_contacto" className="form-control" onChange={handleChange} />
        </div>
        <div className="mb-3">
          <label className="form-label">Precio por Kg ($)</label>
          <input type="number" step="0.01" className="form-control" name="precio_kg" value={formData.precio_kg} onChange={handleChange} />
        </div>
        <div className="mb-3">
          <label className="form-label">Precio por m³ ($)</label>
          <input type="number" step="0.01" className="form-control" name="precio_m3" value={formData.precio_m3} onChange={handleChange} />
        </div>
        <button type="submit" className="btn btn-primary">Guardar</button>
        <Link to="/clientes" className="btn btn-secondary ms-2">Cancelar</Link>
      </form>
    </div>
  );
}