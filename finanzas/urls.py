from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

urlpatterns = [
    path('pendientes/', views.MercanciasPendientesListaAPI.as_view(), name='mercancias-pendientes'),
    path('generar-cobro/', views.GenerarCobroAPIView.as_view(), name='generar-cobro'),
    path('documentos/', views.DocumentosEmitidosListaAPIView.as_view(), name='lista-documentos'),
    path('registrar-pago/', views.RegistrarPagoAPIView.as_view(), name='registrar-pago'),
    path('clientes/<int:cliente_id>/perfil-financiero/', views.PerfilFinancieroClienteAPIView.as_view(), name='perfil-financiero-cliente'),
    path('gastos-operativos/', views.GastoOperativoListCreateAPIView.as_view(), name='gastos-operativos'),
    path('proveedores-gastos/selector/', views.ProveedorGastoListCreateAPIView.as_view(), name='selector-proveedores-gastos'),
    path('gastos-operativos/<int:pk>/pagar/', views.PagarGastoOperativoAPIView.as_view(), name='pagar-gasto-operativo'),
]