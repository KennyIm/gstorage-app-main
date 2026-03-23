import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import apiClient from '../../services/api';

export default function UbicacionCreate() {
  const [esZonaSuelo, setEsZonaSuelo] = useState(false);
  const [estanterias, setEstanterias] = useState([]);
  
  const [formData, setFormData] = useState({
    codigo_ubicacion: '',
    estanteria: '',
    pos_x_rel: 0,
    pos_y_rel: 0,
    pos_z_rel: 0,
    capacidad_maxima_kg: '',
    capacidad_max_m3: '',
    tipo_almacenamiento: '',
    estado_ocupado: false
  });

  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    apiClient.get('/api/inventario/estanterias/')
      .then(res => setEstanterias(res.data))
      .catch(err => console.error("Error cargando estanterías"));
  }, []);

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
      

      pos_x_rel: parseInt(formData.pos_x_rel) || 0,
      pos_y_rel: parseInt(formData.pos_y_rel) || 0,
      pos_z_rel: parseInt(formData.pos_z_rel) || 0,

      capacidad_maxima_kg: formData.capacidad_maxima_kg ? parseFloat(formData.capacidad_maxima_kg) : null,
      capacidad_max_m3: formData.capacidad_max_m3 ? parseFloat(formData.capacidad_max_m3) : null,
    };

    if (!esZonaSuelo && !dataToSubmit.estanteria) {
      setError("Debes seleccionar una estantería.");
      return;
    }

    try {
      await apiClient.post('/api/inventario/ubicaciones/', dataToSubmit);
      navigate('/ubicaciones');
    } catch (err) {
      console.error(err.response);
      setError('Error al guardar la ubicación. Revisa la consola para más detalles.');
    }
  };

  return (
    <div>
      <h1>Nueva Ubicación</h1>
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
            <input type="text" name="codigo_ubicacion" className="form-control" onChange={handleChange} required />
          </div>
          
          <div className="col-md-4 mb-3">
            <label className="form-label">Tipo (Ej: Palet, Caja, Granel)</label>
            <input type="text" name="tipo_almacenamiento" className="form-control" onChange={handleChange} />
          </div>
          
          <div className="col-md-4 mb-3 pt-4">
             <div className="form-check">
              <input type="checkbox" name="estado_ocupado" className="form-check-input" checked={formData.estado_ocupado} onChange={handleChange} />
              <label className="form-check-label">Ya está ocupado</label>
            </div>
          </div>
        </div>

        {!esZonaSuelo ? (
          <div className="row border p-3 rounded mb-3">
            <h5 className="text-muted">Detalles de Estantería</h5>
            <div className="col-md-6 mb-3">
              <label className="form-label">Pertenece a Estantería</label>
              <select name="estanteria" className="form-select" onChange={handleChange} required={!esZonaSuelo}>
                <option value="">Selecciona...</option>
                {estanterias.map(est => (
                  <option key={est.id} value={est.id}>
                    {est.codigo} (Mod: {est.num_modulos_ancho}, Niv: {est.num_niveles_alto})
                  </option>
                ))}
              </select>
            </div>
            
            <div className="col-md-2 mb-3">
              <label className="form-label">Módulo (X)</label>
              <input type="number" name="pos_x_rel" className="form-control" onChange={handleChange} placeholder="0" step="1" required />
            </div>
            <div className="col-md-2 mb-3">
              <label className="form-label">Nivel (Y)</label>
              <input type="number" name="pos_y_rel" className="form-control" onChange={handleChange} placeholder="0" step="1" required />
            </div>
             <div className="col-md-2 mb-3">
              <label className="form-label">Profundidad (Z)</label>
              <input type="number" name="pos_z_rel" className="form-control" onChange={handleChange} placeholder="0" step="1" required />
            </div>
          </div>
        ) : (
          <div className="row border p-3 rounded mb-3 bg-white">
            <h5 className="text-muted">Coordenadas en el Suelo (Metros Enteros)</h5>
            <div className="col-md-4 mb-3">
              <label className="form-label">Posición X</label>
              <input type="number" name="pos_x_rel" className="form-control" onChange={handleChange} step="1" required />
              <div className="form-text">Usa números enteros (1, 2, 10...)</div>
            </div>
            <div className="col-md-4 mb-3">
              <label className="form-label">Posición Z</label>
              <input type="number" name="pos_z_rel" className="form-control" onChange={handleChange} step="1" required />
            </div>
            <div className="col-md-4 mb-3">
              <label className="form-label">Altura (Y)</label>
              <input type="number" className="form-control" value="0" disabled />
            </div>
          </div>
        )}

        {/* Capacidades */}
        <div className="row mb-3">
          <div className="col-md-6">
            <label className="form-label">Capacidad Máx (Kg)</label>
            <input type="number" name="capacidad_maxima_kg" className="form-control" onChange={handleChange} step="0.01" />
          </div>
          {/* --- NUEVO CAMPO: CAPACIDAD M3 --- */}
          <div className="col-md-6">
            <label className="form-label">Capacidad Máx (m³)</label>
            <input type="number" name="capacidad_max_m3" className="form-control" onChange={handleChange} step="0.01" />
          </div>
        </div>

        <button type="submit" className="btn btn-primary">Guardar Ubicación</button>
        <Link to="/ubicaciones" className="btn btn-secondary ms-2">Cancelar</Link>
      </form>
    </div>
  );
}