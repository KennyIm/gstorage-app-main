from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import RegistrarEntregaAPIView, RegistrarIncidenciaAPIView, ComprobanteEntregaViewSet, ConsultarControlEntregaAPIView,DespachosMovilActivosAPIView, MercanciasDespachoMovilAPIView, MercanciasSeguimientoDespachoAPIView

router = DefaultRouter()
router.register(r'comprobantes', ComprobanteEntregaViewSet, basename='comprobante')

urlpatterns = [
    path('control-entrega/<int:id_mercancia>/', ConsultarControlEntregaAPIView.as_view(), name='api-consultar-entrega'),
    path('control-entrega/<int:id_mercancia>/registrar/', RegistrarEntregaAPIView.as_view(), name='api-registrar-entrega'),
    path('control-entrega/<int:id_mercancia>/incidencia/', RegistrarIncidenciaAPIView.as_view(), name='api-registrar-incidencia'),
    path('despachos-movil/', DespachosMovilActivosAPIView.as_view(), name='despachos_movil_activos'),
    path('despachos-movil/<int:id_despacho>/mercancias/', MercanciasDespachoMovilAPIView.as_view(), name='mercancias_despacho_movil'),
    path('despachos/<int:id_despacho>/seguimiento-mercancias/', MercanciasSeguimientoDespachoAPIView.as_view(), name='mercancias-seguimiento-despacho'),
    path('', include(router.urls)),
]