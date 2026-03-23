from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'empresas', views.EmpresaViewSet, basename='empresa')
router.register(r'users', views.UserViewSet, basename='user')

urlpatterns = [
    path('', include(router.urls)),
    path('me/', views.MeView.as_view(), name='auth_me'),
    
    path('register/', views.RegisterView.as_view(), name='auth_register'),
    path('perfil/<int:user_id>/', views.PerfilUpdateView.as_view(), name='perfil_update'),
    path('change-password/', views.ChangePasswordView.as_view(), name='auth_change_password'),
    path('password-reset/', views.PasswordResetRequestView.as_view(), name='password_reset_request'),
    path('password-reset/confirm/', views.PasswordResetConfirmView.as_view(), name='password_reset_confirm'),
    path('empresa/config/', views.EmpresaConfigView.as_view(), name='empresa_config'),
]