import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import MercanciaList from './pages/MercanciaList'
import MercanciaDetail from './pages/MercanciaDetail'
import MercanciaCreate from './pages/MercanciaCreate'
import MercanciaEdit from './pages/MercanciaEdit'

import DespachoList from './pages/DespachoList';
import DespachoDetail from './pages/DespachoDetail';
import DespachoCreate from './pages/DespachoCreate';
import DespachoEdit from './pages/DespachoEdit';
import OrdenEntregaPrint from './components/OrdenEntregaPrint'

import ClienteList from './pages/catalogos/ClienteList';
import ClienteCreate from './pages/catalogos/ClienteCreate';
import ClienteEdit from './pages/catalogos/ClienteEdit';

import ConductorList from './pages/catalogos/ConductorList';
import ConductorCreate from './pages/catalogos/ConductorCreate';
import ConductorEdit from './pages/catalogos/ConductorEdit';

import CamionList from './pages/catalogos/CamionList';
import CamionCreate from './pages/catalogos/CamionCreate';
import CamionEdit from './pages/catalogos/CamionEdit';

import RutaList from './pages/catalogos/RutaList';
import RutaCreate from './pages/catalogos/RutaCreate';
import RutaEdit from './pages/catalogos/RutaEdit';

import DestinoList from './pages/catalogos/DestinoList';
import DestinoCreate from './pages/catalogos/DestinoCreate';
import DestinoEdit from './pages/catalogos/DestinoEdit';

import UbicacionList from './pages/catalogos/UbicacionList';
import UbicacionCreate from './pages/catalogos/UbicacionCreate';
import UbicacionEdit from './pages/catalogos/UbicacionEdit';

import Login from './pages/Login';
import PrivateRoute from './components/PrivateRoute';

import Perfil from './pages/Perfil';
import GestionarEmpleados from './pages/GestionarEmpleados';
import CrearUsuario from './pages/CrearUsuario';

import Visor3D from './pages/Visor3D';

import EstanteriaList from './pages/catalogos/EstanteriaList';
import EstanteriaCreate from './pages/catalogos/EstanteriaCreate';
import EstanteriaEdit from './pages/catalogos/EstanteriaEdit';

import Home from './pages/Home';

import ResetPassword from './pages/ResetPassword';

import ReportsView from './pages/Reportes';

import HistorialView from './pages/Historial';

import CatalogsView from './pages/CatalogsView';

import Proveedores from './pages/catalogos/ProveedorList'

import RamplasManager from './pages/catalogos/RamplasManager'

import PlanificadorRutas from './components/PlanificadorRutas'

import CotizacionList from './pages/CotizacionList'
import CotizacionCreate from './pages/CotizacionCreate'
import CotizacionEdit from './pages/CotizacionEdit'

import ManualUsuario from './pages/ManualUsuario'

import BandejaCobranza from './pages/BandejaCobranza'

import DocumentosEmitidos from './pages/DocumentosEmitidos'

import PerfilFinancieroCliente from './pages/PerfilFinancieroCliente'

import IngresoGastos from './pages/IngresoGastos'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/reset-password/:uid/:token" element={<ResetPassword />} />
      <Route element={<PrivateRoute />}>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="mercancias" element={<MercanciaList />} />
          <Route path="mercancias/:id" element={<MercanciaDetail />} />
          <Route path="mercancias/nueva" element={<MercanciaCreate />} />
          <Route path='mercancias/:id/editar' element={<MercanciaEdit />} />

          <Route path="despachos" element={<DespachoList />} />
          <Route path="despachos/nuevo" element={<DespachoCreate />} />
          <Route path="despachos/:id" element={<DespachoDetail />} />
          <Route path="despachos/:id/editar" element={<DespachoEdit />} />
          <Route path="/despachos/:id/imprimir-plantilla" element={<OrdenEntregaPrint />} />
          <Route path="/planificar" element={<PlanificadorRutas />} />

          <Route path="clientes" element={<ClienteList />} />
          <Route path="clientes/nuevo" element={<ClienteCreate />} />
          <Route path="clientes/:id/editar" element={<ClienteEdit />} />

          <Route path="conductores" element={<ConductorList />} />
          <Route path="conductores/nuevo" element={<ConductorCreate />} />
          <Route path="conductores/:id/editar" element={<ConductorEdit />} />

          <Route path="camiones" element={<CamionList />} />
          <Route path="camiones/nuevo" element={<CamionCreate />} />
          <Route path="camiones/:id/editar" element={<CamionEdit />} />

          <Route path="rutas" element={<RutaList />} />
          <Route path="rutas/nuevo" element={<RutaCreate />} />
          <Route path="rutas/:id/editar" element={<RutaEdit />} />

          <Route path="destinos" element={<DestinoList />} />
          <Route path="destinos/nuevo" element={<DestinoCreate />} />
          <Route path="destinos/:id/editar" element={<DestinoEdit />} />

          <Route path="perfil" element={<Perfil />} />
          <Route path="gestionar-empleados" element={<GestionarEmpleados />} />
          <Route path="gestionar-empleados/nuevo" element={<CrearUsuario />} />

          {/*<Route path="visualizacion" element={<Visor3D />} />

        <Route path="estanterias" element={<EstanteriaList />} />
        <Route path="estanterias/nueva" element={<EstanteriaCreate />} />
        <Route path="estanterias/:id/editar" element={<EstanteriaEdit />} />

        <Route path="ubicaciones" element={<UbicacionList />} />
        <Route path="ubicaciones/nuevo" element={<UbicacionCreate />} />
        <Route path="ubicaciones/:id/editar" element={<UbicacionEdit />} />
        */}

          <Route path="reportes" element={<ReportsView />} />

          <Route path="historial" element={<HistorialView />} />
          <Route path="catalogos" element={<CatalogsView />} />

          <Route path="proveedores" element={<Proveedores />} />
          <Route path="ramplas" element={<RamplasManager />} />


          <Route path="/cotizaciones" element={<CotizacionList />} />
          <Route path="/cotizaciones/crear" element={<CotizacionCreate />} />
          <Route path="/cotizaciones/editar/:id" element={<CotizacionEdit />} />

          <Route path="/ayuda" element={<ManualUsuario />} />

          <Route path='/generar-cobro' element={<BandejaCobranza/>} />

          <Route path='/documentos' element={<DocumentosEmitidos/>} />

          <Route path='/perfil-financiero' element={<PerfilFinancieroCliente/>}/>

          <Route path='/ingreso-gastos' element={<IngresoGastos/>}/>
        </Route>
      </Route>
    </Routes>
  )
}
export default App
