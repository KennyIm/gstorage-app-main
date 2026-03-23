import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import apiClient from '../../services/api';

export default function EstanteriaCreate() {
  const [formData, setFormData] = useState({
    codigo_estanteria: '',
    pos_x: 0, pos_y: 0, pos_z: 0,
    num_modulos_ancho: 1, num_niveles_alto: 1, num_profundidad: 1,
    ancho_hueco_m: 1.0, alto_hueco_m: 1.0, profundo_hueco_m: 1.0
  });
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await apiClient.post('/api/inventario/estanterias/', formData);
      navigate('/estanterias');
    } catch (err) {
      setError('Error al guardar la estantería.');
    }
  };

  return (
    <div>
      <h1>Nueva Estantería</h1>
      <hr />
      {error && <div className="alert alert-danger">{error}</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="form-label">Código Estantería</label>
          <input type="text" name="codigo_estanteria" className="form-control" onChange={handleChange} required />
        </div>

        <div className="row mb-3">
          <h5 className="text-muted">Posición en Almacén (Metros)</h5>
          <div className="col-md-4">
            <label className="form-label">X</label>
            <input type="number" name="pos_x" className="form-control" onChange={handleChange} step="0.1" required />
          </div>
          <div className="col-md-4">
            <label className="form-label">Y (Altura suelo)</label>
            <input type="number" name="pos_y" className="form-control" onChange={handleChange} step="0.1" required />
          </div>
          <div className="col-md-4">
            <label className="form-label">Z</label>
            <input type="number" name="pos_z" className="form-control" onChange={handleChange} step="0.1" required />
          </div>
        </div>

        <div className="row mb-3">
          <h5 className="text-muted">Estructura (Cantidad)</h5>
          <div className="col-md-4">
            <label className="form-label">Módulos a lo ancho</label>
            <input type="number" name="num_modulos_ancho" className="form-control" value={formData.num_modulos_ancho} onChange={handleChange} min="1" required />
          </div>
          <div className="col-md-4">
            <label className="form-label">Niveles de alto</label>
            <input type="number" name="num_niveles_alto" className="form-control" value={formData.num_niveles_alto} onChange={handleChange} min="1" required />
          </div>
          <div className="col-md-4">
            <label className="form-label">Profundidad</label>
            <input type="number" name="num_profundidad" className="form-control" value={formData.num_profundidad} onChange={handleChange} min="1" required />
          </div>
        </div>

        <div className="row mb-3">
          <h5 className="text-muted">Dimensiones de cada Hueco (Metros)</h5>
          <div className="col-md-4">
            <label className="form-label">Ancho</label>
            <input type="number" name="ancho_hueco_m" className="form-control" value={formData.ancho_hueco_m} onChange={handleChange} step="0.1" required />
          </div>
          <div className="col-md-4">
            <label className="form-label">Alto</label>
            <input type="number" name="alto_hueco_m" className="form-control" value={formData.alto_hueco_m} onChange={handleChange} step="0.1" required />
          </div>
          <div className="col-md-4">
            <label className="form-label">Profundidad</label>
            <input type="number" name="profundo_hueco_m" className="form-control" value={formData.profundo_hueco_m} onChange={handleChange} step="0.1" required />
          </div>
        </div>

        <button type="submit" className="btn btn-primary">Guardar</button>
        <Link to="/estanterias" className="btn btn-secondary ms-2">Cancelar</Link>
      </form>
    </div>
  );
}