from django.urls import path
from . import views_reportes
from . import views

urlpatterns = [

    # --- Endpoint del Dashboard ---
    path('dashboard-stats/', views.DashboardStatsAPI.as_view(), name='api-dashboard-stats'),

    # --- Endpoints de Mercancia ---
    path('mercancias/', views.MercanciaListCreateAPI.as_view(), name='api-mercancia-list-create'),
    path('mercancias/<int:pk>/', views.MercanciaDetailAPI.as_view(), name='api-mercancia-detail'),

    # --- Endpoints de Despacho ---
    path('despachos/', views.DespachoListCreateAPI.as_view(), name='api-despacho-list-create'),
    path('despachos/<int:pk>/', views.DespachoDetailAPI.as_view(), name='api-despacho-detail'),
    
    # --- Endpoints de Cliente ---
    path('clientes/', views.ClienteListCreateAPI.as_view(), name='api-cliente-list-create'),
    path('clientes/<int:pk>/', views.ClienteDetailAPI.as_view(), name='api-cliente-detail'),
    
    # --- Endpoints de Conductor ---
    path('conductores/', views.ConductorListCreateAPI.as_view(), name='api-conductor-list-create'),
    path('conductores/<int:pk>/', views.ConductorDetailAPI.as_view(), name='api-conductor-detail'),

    # --- Endpoints de Camion ---
    path('camiones/', views.CamionListCreateAPI.as_view(), name='api-camion-list-create'),
    path('camiones/<int:pk>/', views.CamionDetailAPI.as_view(), name='api-camion-detail'),

    # --- Endpoints de Ruta ---
    path('rutas/', views.RutaListCreateAPI.as_view(), name='api-ruta-list-create'),
    path('rutas/<int:pk>/', views.RutaDetailAPI.as_view(), name='api-ruta-detail'),

    # --- Endpoints de Destino ---
    path('destinos/', views.DestinoListCreateAPI.as_view(), name='api-destino-list-create'),
    path('destinos/<int:pk>/', views.DestinoDetailAPI.as_view(), name='api-destino-detail'),

    # --- Endpoints de Ubicacion ---
    path('ubicaciones/', views.UbicacionListCreateAPI.as_view(), name='api-ubicacion-list-create'),
    path('ubicaciones/<int:pk>/', views.UbicacionDetailAPI.as_view(), name='api-ubicacion-detail'),

    path('estanterias/', views.EstanteriaListCreateAPI.as_view(), name='api-estanteria-list-create'),
    path('estanterias/<int:pk>/', views.EstanteriaDetailAPI.as_view(), name='api-estanteria-detail'),

    path('reportes/recientes/', views_reportes.ReportesRecientesAPI.as_view(), name='reportes_recientes'),
    path('reportes/generar/', views_reportes.GenerarReporteAPI.as_view(), name='reportes_generar'),

    path('historial/', views.HistorialListAPI.as_view(), name='api-historial-list'),

    path('areas-restringidas/', views.AreaRestringidaListCreateAPI.as_view(), name='api-areas-list'),
    path('areas-restringidas/<int:pk>/', views.AreaRestringidaDetailAPI.as_view(), name='api-areas-detail'),



    # DJANGO VERSION VANILLA
    # path('', views.panel_inventario, name='panel-inventario'),

    # # --- URLs de Mercancia ---
    # path('mercancias/', views.MercanciaListView.as_view(), name='mercancia-list'),
    # path('mercancia/nueva/', views.MercanciaCreateView.as_view(), name='mercancia-create'),
    # path('mercancia/<int:pk>/', views.MercanciaDetailView.as_view(), name='mercancia-detail'),
    # path('mercancia/<int:pk>/editar/', views.MercanciaUpdateView.as_view(), name='mercancia-update'),
    # path('mercancia/<int:pk>/eliminar/', views.MercanciaDeleteView.as_view(), name='mercancia-delete'),

    # # --- URLs de Despachos ---
    # path('despachos/', views.DespachoListView.as_view(), name='despacho-list'),
    # path('despacho/nuevo/', views.DespachoCreateView.as_view(), name='despacho-create'),
    # path('despacho/<int:pk>/', views.DespachoDetailView.as_view(), name='despacho-detail'),
    # path('despacho/<int:pk>/editar/', views.DespachoUpdateView.as_view(), name='despacho-update'),
    # path('despacho/<int:pk>/eliminar/', views.DespachoDeleteView.as_view(), name='despacho-delete'),

    # # --- URLs de Clientes ---
    # path('clientes/', views.ClienteListView.as_view(), name='cliente-list'),
    # path('cliente/nuevo/', views.ClienteCreateView.as_view(), name='cliente-create'),
    # path('cliente/<int:pk>/editar/', views.ClienteUpdateView.as_view(), name='cliente-update'),
    # path('cliente/<int:pk>/eliminar/', views.ClienteDeleteView.as_view(), name='cliente-delete'),
    
    # # --- URLs de Conductores ---
    # path('conductores/', views.ConductorListView.as_view(), name='conductor-list'),
    # path('conductor/nuevo/', views.ConductorCreateView.as_view(), name='conductor-create'),
    # path('conductor/<int:pk>/editar/', views.ConductorUpdateView.as_view(), name='conductor-update'),
    # path('conductor/<int:pk>/eliminar/', views.ConductorDeleteView.as_view(), name='conductor-delete'),

    # # --- URLs de Camiones ---
    # path('camiones/', views.CamionListView.as_view(), name='camion-list'),
    # path('camion/nuevo/', views.CamionCreateView.as_view(), name='camion-create'),
    # path('camion/<int:pk>/editar/', views.CamionUpdateView.as_view(), name='camion-update'),
    # path('camion/<int:pk>/eliminar/', views.CamionDeleteView.as_view(), name='camion-delete'),

    # # --- URLs de Rutas ---
    # path('rutas/', views.RutaListView.as_view(), name='ruta-list'),
    # path('ruta/nueva/', views.RutaCreateView.as_view(), name='ruta-create'),
    # path('ruta/<int:pk>/editar/', views.RutaUpdateView.as_view(), name='ruta-update'),
    # path('ruta/<int:pk>/eliminar/', views.RutaDeleteView.as_view(), name='ruta-delete'),

    # # --- URLs de Destinos ---
    # path('destinos/', views.DestinoListView.as_view(), name='destino-list'),
    # path('destino/nuevo/', views.DestinoCreateView.as_view(), name='destino-create'),
    # path('destino/<int:pk>/editar/', views.DestinoUpdateView.as_view(), name='destino-update'),
    # path('destino/<int:pk>/eliminar/', views.DestinoDeleteView.as_view(), name='destino-delete'),

    # # --- URLs de Ubicaciones ---
    # path('ubicaciones/', views.UbicacionListView.as_view(), name='ubicacion-list'),
    # path('ubicacion/nueva/', views.UbicacionCreateView.as_view(), name='ubicacion-create'),
    # path('ubicacion/<int:pk>/editar/', views.UbicacionUpdateView.as_view(), name='ubicacion-update'),
    # path('ubicacion/<int:pk>/eliminar/', views.UbicacionDeleteView.as_view(), name='ubicacion-delete'),
]