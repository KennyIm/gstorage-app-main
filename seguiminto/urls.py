from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import RegistrarEntregaAPIView, RegistrarIncidenciaAPIView, ComprobanteEntregaViewSet, ConsultarControlEntregaAPIView

router = DefaultRouter()
router.register(r'comprobantes', ComprobanteEntregaViewSet, basename='comprobante')

urlpatterns = [
    path('control-entrega/<int:id_mercancia>/', ConsultarControlEntregaAPIView.as_view(), name='api-consultar-entrega'),
    path('control-entrega/<int:id_mercancia>/registrar/', RegistrarEntregaAPIView.as_view(), name='api-registrar-entrega'),
    path('control-entrega/<int:id_mercancia>/incidencia/', RegistrarIncidenciaAPIView.as_view(), name='api-registrar-incidencia'),
    path('', include(router.urls)),
]