import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import apiClient from '../../services/api';

export default function UbicacionEdit() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [esZonaSuelo, setEsZonaSuelo] = useState(false);
  const [estanterias, setEstanterias] = useState([]);
  
  const [formData, setFormData] = useState(null); // Null al inicio para mostrar carga
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Cargar estanterías y datos de la ubicación en paralelo
        const [estanteriasRes, ubicacionRes] = await Promise.all([
          apiClient.get('/api/inventario/estanterias/'),
          apiClient.get(`/api/inventario/ubicaciones/${id}/`)
        ]);

        setEstanterias(estanteriasRes.data);
        const data = ubicacionRes.data;

        // 2. Configurar el estado del Switch basado en los datos
        setEsZonaSuelo(data.es_zona_suelo);

        // 3. Rellenar el formulario
        setFormData({
          codigo_ubicacion: data.codigo_ubicacion,
          estanteria: data.estanteria || '', // ID de la estantería
          pos_x_rel: data.pos_x_rel,
          pos_y_rel: data.pos_y_rel,
          pos_z_rel: data.pos_z_rel,
          capacidad_maxima_kg: data.capacidad_maxima_kg || '',
          estado_ocupado: data.estado_ocupado
        });

      } catch (err) {
        setError('No se pudo cargar la información.');
      }
    };
    fetchData();
  }, [id]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const dataToSubmit = {
      ...formData,
      es_zona_suelo: esZonaSuelo,
      estanteria: esZonaSuelo ? null : formData.estanteria,
      pos_x_rel: parseFloat(formData.pos_x_rel),
      pos_y_rel: parseFloat(formData.pos_y_rel),
      pos_z_rel: parseFloat(formData.pos_z_rel),
    };

    if (!esZonaSuelo && !dataToSubmit.estanteria) {
      setError("Debes seleccionar una estantería.");
      return;
    }

    try {
      await apiClient.put(`/api/inventario/ubicaciones/${id}/`, dataToSubmit);
      navigate('/ubicaciones');
    } catch (err) {
      console.error(err);
      setError('Error al actualizar la ubicación.');
    }
  };

  if (!formData) return <div>Cargando formulario...</div>;

  return (
    <div>
      <h1>Editar Ubicación</h1>
      <hr />
      {error && <div className="alert alert-danger">{error}</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="card mb-4 bg-light">
          <div className="card-body">
            <div className="form-check form-switch">
              <input 
                className="form-check-input" 
                type="checkbox" 
                id="tipoSwitch"
                checked={esZonaSuelo}
                onChange={(e) => setEsZonaSuelo(e.target.checked)}
              />
              <label className="form-check-label fw-bold" htmlFor="tipoSwitch">
                {esZonaSuelo ? "🛠️ Zona de Suelo (Sin Estantería)" : "📚 Ubicación en Estantería"}
              </label>
            </div>
          </div>
        </div>

        <div className="row">
          <div className="col-md-4 mb-3">
            <label className="form-label">Código Ubicación</label>
            <input type="text" name="codigo_ubicacion" className="form-control" value={formData.codigo_ubicacion} onChange={handleChange} required />
          </div>
          
          <div className="col-md-4 mb-3">
            <label className="form-label">Capacidad Máx (Kg)</label>
            <input type="number" name="capacidad_maxima_kg" className="form-control" value={formData.capacidad_maxima_kg} onChange={handleChange} step="0.01" />
          </div>

          <div className="col-md-4 mb-3 pt-4">
             <div className="form-check">
              <input type="checkbox" name="estado_ocupado" className="form-check-input" checked={formData.estado_ocupado} onChange={handleChange} />
              <label className="form-check-label">Ocupado (Manual)</label>
            </div>
          </div>
        </div>
        {!esZonaSuelo ? (
          <div className="row border p-3 rounded mb-3">
            <h5 className="text-muted">Detalles de Estantería</h5>
            <div className="col-md-6 mb-3">
              <label className="form-label">Pertenece a Estantería</label>
              <select name="estanteria" className="form-select" value={formData.estanteria} onChange={handleChange} required={!esZonaSuelo}>
                <option value="">Selecciona...</option>
                {estanterias.map(est => (
                  <option key={est.id} value={est.id}>
                    {est.codigo_estanteria} (Mod: {est.num_modulos_ancho}, Niv: {est.num_niveles_alto})
                  </option>
                ))}
              </select>
            </div>
            
            <div className="col-md-2 mb-3">
              <label className="form-label">Módulo (X)</label>
              <input type="number" name="pos_x_rel" className="form-control" value={formData.pos_x_rel} onChange={handleChange} required />
            </div>
            <div className="col-md-2 mb-3">
              <label className="form-label">Nivel (Y)</label>
              <input type="number" name="pos_y_rel" className="form-control" value={formData.pos_y_rel} onChange={handleChange} required />
            </div>
             <div className="col-md-2 mb-3">
              <label className="form-label">Profundidad (Z)</label>
              <input type="number" name="pos_z_rel" className="form-control" value={formData.pos_z_rel} onChange={handleChange} required />
            </div>
          </div>
        ) : (
          <div className="row border p-3 rounded mb-3 bg-white">
            <h5 className="text-muted">Coordenadas en el Suelo (Globales)</h5>
            <div className="col-md-4 mb-3">
              <label className="form-label">Posición X (Metros)</label>
              <input type="number" name="pos_x_rel" className="form-control" value={formData.pos_x_rel} onChange={handleChange} step="0.5" required />
            </div>
            <div className="col-md-4 mb-3">
              <label className="form-label">Posición Z (Metros)</label>
              <input type="number" name="pos_z_rel" className="form-control" value={formData.pos_z_rel} onChange={handleChange} step="0.5" required />
            </div>
            <div className="col-md-4 mb-3">
              <label className="form-label">Altura (Y)</label>
              <input type="number" className="form-control" value="0" disabled />
            </div>
          </div>
        )}
        <button type="submit" className="btn btn-primary">Actualizar Ubicación</button>
        <Link to="/ubicaciones" className="btn btn-secondary ms-2">Cancelar</Link>
      </form>
    </div>
  );
}