import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import apiClient from '../../services/api';

export default function EstanteriaEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiClient.get(`/api/inventario/estanterias/${id}/`)
      .then(res => {
        setFormData(res.data);
      })
      .catch(err => {
        console.error(err);
        setError('No se pudo cargar la información de la estantería.');
      });
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await apiClient.put(`/api/inventario/estanterias/${id}/`, formData);
      navigate('/estanterias');
    } catch (err) {
      console.error(err);
      setError('Error al actualizar la estantería.');
    }
  };

  if (!formData) return <div className="p-4">Cargando datos...</div>;

  return (
    <div>
      <h1>Editar Estantería</h1>
      <hr />
      {error && <div className="alert alert-danger">{error}</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="form-label">Código Estantería</label>
          <input 
            type="text" 
            name="codigo_estanteria" 
            className="form-control" 
            value={formData.codigo_estanteria} 
            onChange={handleChange} 
            required 
          />
        </div>

        <div className="row mb-3">
          <h5 className="text-muted">Posición en Almacén (Metros)</h5>
          <div className="col-md-4">
            <label className="form-label">X</label>
            <input type="number" name="pos_x" className="form-control" value={formData.pos_x} onChange={handleChange} step="0.1" required />
          </div>
          <div className="col-md-4">
            <label className="form-label">Y (Altura suelo)</label>
            <input type="number" name="pos_y" className="form-control" value={formData.pos_y} onChange={handleChange} step="0.1" required />
          </div>
          <div className="col-md-4">
            <label className="form-label">Z</label>
            <input type="number" name="pos_z" className="form-control" value={formData.pos_z} onChange={handleChange} step="0.1" required />
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

        <button type="submit" className="btn btn-primary">Actualizar</button>
        <Link to="/estanterias" className="btn btn-secondary ms-2">Cancelar</Link>
      </form>
    </div>
  );
}