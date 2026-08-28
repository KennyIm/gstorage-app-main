from django.contrib.auth.backends import ModelBackend
from django.contrib.auth import get_user_model
from django.db.models import Q

from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.exceptions import AuthenticationFailed
from .models import PersonalOperativo

class EmailOrUsernameModelBackend(ModelBackend):
    def authenticate(self, request, username=None, password=None, **kwargs):
        UserModel = get_user_model()
        try:
            user = UserModel.objects.get(
                Q(username__iexact=username) | Q(email__iexact=username)
            )
        except UserModel.DoesNotExist:
            return None

        if user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None

class OperativoDummyUser:
    is_authenticated = True
    is_staff = False
    is_superuser = False

    def __init__(self, operativo):
        self.operativo = operativo
        self.pk = operativo.id
        self.id = operativo.id
        self.username = operativo.nombre
        self.empresa = operativo.empresa
    @property
    def perfil(self):
        return self

    @property
    def rol(self):
        return self.operativo.rol

    def __str__(self):
        return f"Operativo: {self.username}"


class ExpressJWTAuthentication(JWTAuthentication):
    def get_user(self, validated_token):
        if validated_token.get('is_express_session'):
            operativo_id = validated_token.get('operativo_id')
            try:
                operativo = PersonalOperativo.objects.get(id=operativo_id, activo=True)
                return OperativoDummyUser(operativo)
            except PersonalOperativo.DoesNotExist:
                raise AuthenticationFailed('Personal operativo inactivo o no encontrado.', code='user_not_found')
        
        return super().get_user(validated_token)