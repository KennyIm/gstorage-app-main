from django.shortcuts import render
from rest_framework import generics, permissions, viewsets, status
from django.contrib.auth.models import User
from .models import Empresa, Perfil, Sucursal
from inventario.views import get_empresa_from_user
from .permissions import IsAdminEmpresa
from rest_framework.response import Response
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string
from inventario.models import HistorialMovimientos
import copy


from .serializers import (
    EmpresaSerializer, 
    PerfilReadSerializer,  
    PerfilWriteSerializer, 
    UserSerializer, 
    RegisterSerializer,
    ChangePasswordSerializer,
    PasswordResetRequestSerializer, 
    PasswordResetConfirmSerializer,
    SucursalSerializer,
    AdminPasswordResetSerializer
)
class EmpresaViewSet(viewsets.ModelViewSet):
    queryset = Empresa.objects.all()
    serializer_class = EmpresaSerializer
    permission_classes = [permissions.IsAuthenticated] 

# --- Vistas para Usuarios ---

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer

    def perform_create(self, serializer):
        user = serializer.save()
        
        if self.request.user.is_authenticated and hasattr(self.request.user, 'perfil') and self.request.user.perfil.empresa:
            empresa = self.request.user.perfil.empresa
            
            HistorialMovimientos.objects.create(
                empresa=empresa,
                id_mercancia=None,
                id_usuario=self.request.user,
                tipo_movimiento='Creación',
                descripcion_adicional=f"Se creó el usuario: {user.username}",
            )

class UserViewSet(viewsets.ModelViewSet):
    serializer_class = UserSerializer
    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated(), IsAdminEmpresa()]
    
    def get_queryset(self):
        empresa = get_empresa_from_user(self.request)
        return User.objects.filter(perfil__empresa=empresa, is_active=True)
    
    def perform_destroy(self, instance):
        instance.is_active = False 
        instance.save()
        if hasattr(instance, 'perfil'):
             instance.perfil.rol = None
             instance.perfil.save()

class PerfilUpdateView(generics.UpdateAPIView):
    queryset = Perfil.objects.all()
    serializer_class = PerfilWriteSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminEmpresa]
    lookup_field = 'user_id'

    def perform_update(self, serializer):
        admin_user = self.request.user
        empresa_admin = admin_user.perfil.empresa

        instance = serializer.save(empresa=empresa_admin)

        accion = "Asignación de Rol/Empresa/Sucursal"
        detalle = f"Usuario {instance.user.username} asignado a empresa {empresa_admin.nombre_empresa} con rol {instance.rol}"

        HistorialMovimientos.objects.create(
            empresa=empresa_admin,
            id_mercancia=None, 
            id_usuario=admin_user, 
            tipo_movimiento='Modificación Manual', 
            descripcion_adicional=detalle,
            instancia = instance
        )


class MeView(generics.RetrieveUpdateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user
    
class ChangePasswordView(generics.UpdateAPIView):
    serializer_class = ChangePasswordSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user

    def update(self, request, *args, **kwargs):
        user = self.get_object()
        serializer = self.get_serializer(user, data=request.data, context={'request': request})
        
        if serializer.is_valid():
            serializer.save()
            return Response({"detail": "Contraseña actualizada exitosamente."}, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    

class PasswordResetRequestView(generics.GenericAPIView):
    serializer_class = PasswordResetRequestSerializer
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        email = serializer.validated_data['email']
        user = User.objects.filter(email=email).first()

        if user:
            token = default_token_generator.make_token(user)
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            
            reset_link = f"{settings.FRONTEND_URL}/reset-password/{uid}/{token}"
            
            subject = "Recuperación de Contraseña - GStorage"
            message = f"Hola {user.username},\n\nHas solicitado restablecer tu contraseña.\nHaz clic en el siguiente enlace:\n\n{reset_link}\n\nSi no fuiste tú, ignora este mensaje."

            from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@gstorage.com')
            
            try:
                send_mail(
                    subject=subject,
                    message=message,
                    from_email=settings.EMAIL_HOST_USER,
                    recipient_list=[email],
                    fail_silently=False, 
                )
            except Exception as e:
                print(f"Error enviando correo: {e}")

        return Response(
            {"detail": "Si el correo existe, se han enviado las instrucciones."}, 
            status=status.HTTP_200_OK
        )


class PasswordResetConfirmView(generics.GenericAPIView):
    serializer_class = PasswordResetConfirmSerializer
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"detail": "Contraseña restablecida exitosamente."}, status=status.HTTP_200_OK)
    
class EmpresaConfigView(generics.RetrieveUpdateAPIView):
    serializer_class = EmpresaSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminEmpresa]

    def get_object(self):
        return get_empresa_from_user(self.request)


class SucursalListAPI(generics.ListAPIView):
    serializer_class = SucursalSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        usuario = self.request.user
        try:
            empresa = usuario.perfil.empresa 
            return Sucursal.objects.filter(empresa=empresa)
        except AttributeError:
            return Sucursal.objects.none()
        

class AdminResetPasswordView(generics.UpdateAPIView):
    queryset = User.objects.all()
    serializer_class = AdminPasswordResetSerializer
    permission_classes = [permissions.IsAuthenticated] 

    def update(self, request, *args, **kwargs):
        user = self.get_object() 
        serializer = self.get_serializer(data=request.data)
        
        if serializer.is_valid():
            user.set_password(serializer.validated_data['password'])
            user.save()
            
            return Response(
                {"detail": f"Contraseña de {user.username} actualizada correctamente."}, 
                status=status.HTTP_200_OK
            )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)