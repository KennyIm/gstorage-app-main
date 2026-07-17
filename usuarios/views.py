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
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
import pyotp
import qrcode
import io
import base64
from cryptography.fernet import Fernet
from django.core import signing
from rest_framework.decorators import action
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
    AdminPasswordResetSerializer,
    CustomTokenObtainPairSerializer,
    Verify2FASerializer,
    UserMeSerializer
    
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


@action(detail=False, methods=['get'])
class MeView(generics.RetrieveUpdateAPIView):
    queryset = User.objects.all()
    serializer_class = UserMeSerializer
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
    pagination_class = None

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


def set_refresh_cookie(response, refresh_token_string):
    response.set_cookie(
        key='refresh_token',
        value=refresh_token_string,
        httponly=True,                     # TODO
        secure=False,                      # CAMBIAR A True EN PRODUCCIÓN CON HTTPS
        samesite='Lax',                    # Protege contra ataques CSRF
        max_age=7 * 24 * 60 * 60,
        path='/',                  
    )

class LoginThrottleView(TokenObtainPairView):
    throttle_scope = 'login'
    serializer_class = CustomTokenObtainPairSerializer
    
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200 and 'refresh' in response.data:
            refresh_token = response.data.pop('refresh')
            set_refresh_cookie(response, refresh_token)
        return response


class Verify2FAView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = Verify2FASerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
        pre_auth_id = serializer.validated_data['pre_auth_id']
        code = serializer.validated_data['code']
        
        try:
            vuelo_data = signing.loads(pre_auth_id, salt='2fa-pre-auth', max_age=300)
            user_id = vuelo_data.get('user_id')
            user = User.objects.get(pk=user_id)
        except (signing.SignatureExpired, signing.BadSignature, User.DoesNotExist):
            return Response({"error": "La sesión de verificación ha expirado o es inválida."}, status=status.HTTP_400_BAD_REQUEST)
        
        perfil = user.perfil
        if not perfil.two_factor_secret:
            return Response({"error": "No configurado."}, status=status.HTTP_400_BAD_REQUEST)            
        try:
            fernet = Fernet(settings.FIELD_ENCRYPTION_KEY.encode())
            secreto_plano = fernet.decrypt(perfil.two_factor_secret.encode('utf-8')).decode('utf-8')
        except Exception:
            return Response({"error": "Error crítico en las llaves criptográficas."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
        totp = pyotp.TOTP(secreto_plano)
        if totp.verify(code):
            refresh = RefreshToken.for_user(user)
            
            response = Response({'access': str(refresh.access_token)}, status=status.HTTP_200_OK)
            set_refresh_cookie(response, str(refresh))
            return response
            
        return Response({"error": "Código verificador incorrecto."}, status=status.HTTP_400_BAD_REQUEST)

class CustomTokenRefreshView(TokenRefreshView):
    def post(self, request, *args, **kwargs):
        refresh_token = request.COOKIES.get('refresh_token')
        if not refresh_token:
            return Response({"error": "Falta el token de actualización."}, status=status.HTTP_401_UNAUTHORIZED)
        
        serializer = self.get_serializer(data={'refresh': refresh_token})
        try:
            serializer.is_valid(raise_exception=True)
        except TokenError as e:
            raise InvalidToken(e.args[0])
            
        res_data = serializer.validated_data
        response = Response({'access': res_data.get('access')}, status=status.HTTP_200_OK)
        
        if 'refresh' in res_data:
            set_refresh_cookie(response, res_data['refresh'])
            
        return response

class CustomLogoutView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        refresh_token = request.COOKIES.get('refresh_token')
        response = Response({"detail": "Sesión cerrada correctamente."}, status=status.HTTP_200_OK)
        response.delete_cookie('refresh_token', path='/api/')
        
        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                token.blacklist()
            except Exception:
                pass 
                
        return response


class ObtenerQR2FAView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        user = request.user
        perfil = getattr(user, 'perfil', None)
        
        if not perfil:
            return Response({"error": "El usuario no tiene un perfil asociado."}, status=status.HTTP_400_BAD_REQUEST)
        
        if perfil.is_2fa_enabled:
            return Response(
                {"error": "Acceso denegado. El Doble Factor ya se encuentra activo en esta cuenta."}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        fernet = Fernet(settings.FIELD_ENCRYPTION_KEY.encode())
        
        if not perfil.two_factor_secret:
            secreto_plano = pyotp.random_base32()            
            secreto_cifrado = fernet.encrypt(secreto_plano.encode('utf-8')).decode('utf-8')
            perfil.two_factor_secret = secreto_cifrado
            perfil.save()
        else:
            secreto_cifrado = perfil.two_factor_secret
            secreto_plano = fernet.decrypt(secreto_cifrado.encode('utf-8')).decode('utf-8')
            
        totp = pyotp.TOTP(secreto_plano)
        provisioning_uri = totp.provisioning_uri(name=user.username, issuer_name="GStorage-Medalla")
        
        qr = qrcode.QRCode(version=1, box_size=10, border=4)
        qr.add_data(provisioning_uri)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        buffer = io.BytesIO()
        img.save(buffer, format="PNG")
        
        qr_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
        
        return Response({
            "qr_image": f"data:image/png;base64,{qr_base64}",
            "secret_key": secreto_plano
        }, status=status.HTTP_200_OK)


class ConfirmarActivacion2FAView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        user = request.user
        code = request.data.get('code')
        
        if not code or len(code) != 6:
            return Response({"error": "Código de 6 dígitos requerido."}, status=status.HTTP_400_BAD_REQUEST)
            
        perfil = user.perfil
        if not perfil.two_factor_secret:
            return Response({"error": "No configurado."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            fernet = Fernet(settings.FIELD_ENCRYPTION_KEY.encode())
            secreto_plano = fernet.decrypt(perfil.two_factor_secret.encode('utf-8')).decode('utf-8')
        except Exception:
            return Response({"error": "Error crítico en las llaves criptográficas."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
        totp = pyotp.TOTP(secreto_plano)
        if totp.verify(code):
            perfil.is_2fa_enabled = True 
            perfil.save()
            return Response({"message": "Doble Factor (2FA) activado con éxito en su cuenta."}, status=status.HTTP_200_OK)
            
        return Response({"error": "Código de verificación inválido. Reintente."}, status=status.HTTP_400_BAD_REQUEST)

class Desactivar2FAView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        user = request.user
        perfil = getattr(user, 'perfil', None)
        
        if not perfil:
            return Response({"error": "Perfil no encontrado."}, status=status.HTTP_400_BAD_REQUEST)
            
        if not perfil.is_2fa_enabled:
            return Response({"error": "El Doble Factor ya se encuentra desactivado."}, status=status.HTTP_400_BAD_REQUEST)
            
        perfil.is_2fa_enabled = False
        perfil.two_factor_secret = None
        perfil.save()
        
        return Response({"message": "Autenticación de Doble Factor desactivada correctamente."}, status=status.HTTP_200_OK)
