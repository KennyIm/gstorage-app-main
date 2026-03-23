import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import apiClient from '../../services/api';

export default function ConductorCreate() {
  const [formData, setFormData] = useState({
    nombre_completo: '',
    rut_conductor: '',
    numero_licencia: '',
    telefono: ''
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
      await apiClient.post('/api/inventario/conductores/', formData);
      navigate('/conductores');
    } catch (err) {
      setError('Error al guardar el conductor.');
    }
  };

  return (
    <div>
      <h1>Nuevo Conductor</h1>
      <hr />
      {error && <div className="alert alert-danger">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="form-label">Nombre Completo</label>
          <input type="text" name="nombre_completo" className="form-control" onChange={handleChange} required />
        </div>
        <div className="mb-3">
          <label className="form-label">RUT</label>
          <input type="text" name="rut_conductor" className="form-control" onChange={handleChange} required />
        </div>
        <div className="mb-3">
          <label className="form-label">Número de Licencia</label>
          <input type="text" name="numero_licencia" className="form-control" onChange={handleChange} required />
        </div>
        <div className="mb-3">
          <label className="form-label">Teléfono</label>
          <input type="text" name="telefono" className="form-control" onChange={handleChange} />
        </div>
        <button type="submit" className="btn btn-primary">Guardar</button>
        <Link to="/conductores" className="btn btn-secondary ms-2">Cancelar</Link>
      </form>
    </div>
  );
}