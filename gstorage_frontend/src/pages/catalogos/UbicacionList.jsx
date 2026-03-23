import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../services/api';

export default function UbicacionList() {
  const [ubicaciones, setUbicaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchUbicaciones = async () => {
    try {
      const response = await apiClient.get('/api/inventario/ubicaciones/');
      setUbicaciones(response.data);
    } catch (err) {
      setError('Error al cargar ubicaciones.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUbicaciones();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar esta ubicación?')) {
      try {
        await apiClient.delete(`/api/inventario/ubicaciones/${id}/`);
        fetchUbicaciones();
      } catch (err) {
        setError('Error al eliminar la ubicación.');
      }
    }
  };

  if (loading) return <div>Cargando...</div>;
  if (error) return <div className="alert alert-danger">{error}</div>;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center">
        <h1>Listado de Ubicaciones</h1>
      </div>
      <hr />
      <table className="table table-striped table-hover">
        <thead>
          <tr>
            <th>Código</th>
            <th>Tipo</th>
            <th>Detalles de Posición</th>
            <th>Estado</th>
            <th>Cap. (Kg)</th>
          </tr>
        </thead>
        <tbody>
          {ubicaciones.map(u => (
            <tr key={u.id_ubicacion}>
              <td className="fw-bold">{u.codigo_ubicacion}</td>
              
              {/* Columna TIPO */}
              <td>
                {u.es_zona_suelo ? (
                  <span className="badge bg-secondary">Zona Suelo</span>
                ) : (
                  <span className="badge bg-info text-dark">Estantería</span>
                )}
              </td>

              {/* Columna DETALLES */}
              <td>
                {u.es_zona_suelo ? (
                  <span>Coordenadas: X={u.pos_x_rel}, Z={u.pos_z_rel}</span>
                ) : (
                  <span>
                    <strong>{u.estanteria_codigo}</strong> <br/>
                    <small className="text-muted">
                      Módulo: {u.pos_x_rel} | Nivel: {u.pos_y_rel} | Prof: {u.pos_z_rel}
                    </small>
                  </span>
                )}
              </td>

              <td>
                {u.estado_ocupado ? (
                  <span className="badge bg-warning text-dark">Ocupado</span>
                ) : (
                  <span className="badge bg-success">Libre</span>
                )}
              </td>
              
              <td>{u.capacidad_maxima_kg || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}