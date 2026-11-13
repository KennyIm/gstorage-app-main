from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import RegistrarEntregaAPIView, RegistrarIncidenciaAPIView, ComprobanteEntregaViewSet, ConsultarControlEntregaAPIView,DespachosMovilActivosAPIView, MercanciasDespachoMovilAPIView, MercanciasSeguimientoDespachoAPIView, GenerarPresignedUrlPODAPIView, LlamadaTelefonicaViewSet, EventoTelefonicoViewSet, WebhookMovilView

router = DefaultRouter()
router.register(r'comprobantes', ComprobanteEntregaViewSet, basename='comprobante')

urlpatterns = [
    path('control-entrega/<int:id_mercancia>/', ConsultarControlEntregaAPIView.as_view(), name='api-consultar-entrega'),
    path('control-entrega/presigned-url/', GenerarPresignedUrlPODAPIView.as_view(), name='presigned_url_pod'),
    path('control-entrega/<int:id_mercancia>/registrar/', RegistrarEntregaAPIView.as_view(), name='registrar_entrega'),
    path('control-entrega/<int:id_mercancia>/incidencia/', RegistrarIncidenciaAPIView.as_view(), name='api-registrar-incidencia'),
    path('despachos-movil/', DespachosMovilActivosAPIView.as_view(), name='despachos_movil_activos'),
    path('despachos-movil/<int:id_despacho>/mercancias/', MercanciasDespachoMovilAPIView.as_view(), name='mercancias_despacho_movil'),
    path('despachos/<int:id_despacho>/seguimiento-mercancias/', MercanciasSeguimientoDespachoAPIView.as_view(), name='mercancias-seguimiento-despacho'),
    path(
        'telefonia/llamadas/',
        LlamadaTelefonicaViewSet.as_view({'get': 'list', 'post': 'create'}),
        name='telefonia-llamadas'
    ),
    path(
        'telefonia/llamadas/resumen/',
        LlamadaTelefonicaViewSet.as_view({'get': 'resumen'}),
        name='telefonia-llamadas-resumen'
    ),
    path(
        'telefonia/llamadas/<str:pk>/',
        LlamadaTelefonicaViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update'}),
        name='telefonia-llamadas-detalle'
    ),
    path(
        'telefonia/eventos/',
        EventoTelefonicoViewSet.as_view({'get': 'list'}),
        name='telefonia-eventos'
    ),
    path('telefonia/webhook-movil/', WebhookMovilView.as_view(), name='telefonia-webhook-movil'),
    path('', include(router.urls)),
]