from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Empresa, Perfil, Sucursal
from inventario.models import Estanteria
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_decode
from django.core import signing
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

class EmpresaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Empresa
        fields = '__all__'

class PerfilWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Perfil
        fields = ['empresa', 'telefono', 'rol', 'sucursal']
        read_only_fields = ['empresa']

    def validate(self, data):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            raise serializers.ValidationError("No autenticado.")
        
        requester_rol = request.user.perfil.rol
        new_role = data.get('rol')

        if new_role == 'DUENO' and requester_rol != 'DUENO':
            raise serializers.ValidationError(
                {"rol": "Solo el Dueño actual puede asignar el rol de Dueño a otros usuarios."}
            )
        if self.instance and self.instance.rol == 'DUENO':
             if requester_rol != 'DUENO':
                 raise serializers.ValidationError(
                     {"detail": "No tienes permisos para modificar el perfil del Dueño."}
                 )

        return data

class EstanteriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Estanteria
        fields = '__all__'

class PerfilReadSerializer(serializers.ModelSerializer):
    empresa = serializers.StringRelatedField() 
    empresa_nombre = serializers.StringRelatedField(source='empresa', read_only=True)
    sucursal = serializers.StringRelatedField()
    sucursal_nombre = serializers.StringRelatedField(source='sucursal', read_only=True)
    rol_display = serializers.CharField(source='get_rol_display', read_only=True)

    class Meta:
        model = Perfil
        fields = ['empresa', 'empresa_nombre', 'telefono', 'rol', 'rol_display','sucursal','sucursal_nombre','sucursal_id', 'is_2fa_enabled']

class UserSerializer(serializers.ModelSerializer):
    perfil = PerfilReadSerializer(read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'perfil', 'is_active']

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True)
    
    class Meta:
        model = User
        fields = ('id', 'username', 'password', 'email', 'first_name', 'last_name')
        read_only_fields = ('id',)

    def create(self, validated_data):
        password = validated_data.pop('password')
        
        user = User.objects.create(**validated_data)
        
        user.set_password(password)
        user.save()
        
        return user
    
class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True, write_only=True)
    new_password1 = serializers.CharField(required=True, write_only=True)
    new_password2 = serializers.CharField(required=True, write_only=True)

    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("La contraseña antigua es incorrecta.")
        return value

    def validate(self, data):
        if data['new_password1'] != data['new_password2']:
            raise serializers.ValidationError({"new_password2": "Las nuevas contraseñas no coinciden."})
        
        try:
            validate_password(data['new_password1'], self.context['request'].user)
        except serializers.ValidationError as e:
            raise serializers.ValidationError({"new_password1": e.messages})

        return data

    def save(self, **kwargs):
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password1'])
        user.save()
        return user

class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        return value

class PasswordResetConfirmSerializer(serializers.Serializer):
    new_password1 = serializers.CharField(write_only=True)
    new_password2 = serializers.CharField(write_only=True)
    uidb64 = serializers.CharField()
    token = serializers.CharField()

    def validate(self, attrs):
        if attrs['new_password1'] != attrs['new_password2']:
            raise serializers.ValidationError({"password": "Las contraseñas no coinciden."})
        
        try:
            uid = urlsafe_base64_decode(attrs['uidb64']).decode()
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            raise serializers.ValidationError({"token": "Enlace inválido o usuario no encontrado."})

        if not default_token_generator.check_token(user, attrs['token']):
            raise serializers.ValidationError({"token": "El enlace ha expirado o es inválido."})

        attrs['user'] = user
        return attrs

    def save(self):
        user = self.validated_data['user']
        user.set_password(self.validated_data['new_password1'])
        user.save()
        return user
    

class SucursalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Sucursal
        fields = ['id', 'nombre', 'ciudad', 'empresa']

class AdminPasswordResetSerializer(serializers.Serializer):
    password = serializers.CharField(write_only=True, min_length=8)

    def validate_password(self, value):
        return value

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        user = self.user
        perfil = getattr(user, 'perfil', None)
        print("¡Pasando por el validador 2FA!")
        
        if perfil and perfil.is_2fa_enabled:
            pre_auth_id = signing.dumps({'user_id': user.id}, salt='2fa-pre-auth')
            return {
                'requires_2fa': True,
                'pre_auth_id': pre_auth_id
            }
        return data


class Verify2FASerializer(serializers.Serializer):
    pre_auth_id = serializers.CharField(required=True)
    code = serializers.CharField(max_length=6, min_length=6, required=True)
