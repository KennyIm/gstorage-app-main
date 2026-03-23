from django.urls import path
from . import views

urlpatterns = [
    path('almacen-data/', views.Almacen3DDataAPI.as_view(), name='api-almacen-3d'),
]