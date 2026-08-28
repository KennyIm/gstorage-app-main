from django.db import models
from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth.models import User
import hashlib
from cryptography.fernet import Fernet

    
class Empresa(models.Model):
    id_empresa = models.AutoField(primary_key=True)
    nombre_empresa = models.CharField(max_length=255, unique=True, verbose_name="Nombre de la Empresa")
    rut_empresa = models.CharField(max_length=12, unique=True, null=True, blank=True, verbose_name="RUT de la Empresa")
    dueno_empresa = models.CharField(max_length=50, verbose_name="Dueño de la empresa")
    logo = models.ImageField(upload_to='logo_empresas/', null=True, blank=True, verbose_name="Logo de la empresa")
    telefono_contacto = models.CharField(max_length=20, null=True, blank=True, verbose_name="Teléfono") 
    email_contacto = models.EmailField(max_length=100, null=True, blank=True, verbose_name="Email") 
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    almacen_ancho = models.FloatField(default=20.0, verbose_name="Ancho Almacén (m)") 
    almacen_largo = models.FloatField(default=20.0, verbose_name="Largo Almacén (m)") 
    almacen_alto = models.FloatField(default=10.0, verbose_name="Alto Almacén (m)")  
    activa = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Empresa"
        verbose_name_plural = "Empresas"

    def __str__(self):
        return self.nombre_empresa

class Sucursal(models.Model):
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE)
    nombre = models.CharField(max_length=100)
    ciudad = models.CharField(max_length=100)

    def __str__(self):
        return f"{self.nombre}"

class Perfil(models.Model):
    class Roles(models.TextChoices):
        DUENO = 'DUENO', 'Dueño'
        ADMINISTRATIVO = 'ADMINISTRATIVO', 'Administrativo'
        SECRETARIA = 'SECRETARIA', 'Secretaria'
        JEFE_BODEGA = 'JEFE_BODEGA', 'Jefe de Bodega'
        OPERARIO = 'OPERARIO', 'Operario'

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, primary_key=True, related_name="perfil")
    sucursal = models.ForeignKey(Sucursal, on_delete=models.CASCADE, null=True, blank=True)
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, null=True, blank=True, related_name="perfiles")
    telefono = models.CharField(max_length=20, null=True, blank=True)
    is_2fa_enabled = models.BooleanField(default=False, verbose_name="2FA Activado")
    two_factor_secret = models.CharField(max_length=255, blank=True, null=True, verbose_name="Secreto TOTP")
    
    rol = models.CharField(
        max_length=20,
        choices=Roles.choices,
        null=True, 
        blank=True,
        verbose_name="Rol en la Empresa"
    )
    
    class Meta:
        verbose_name = "Perfil de Usuario"
        verbose_name_plural = "Perfiles de Usuario"

    def __str__(self):
        return f"Perfil de {self.user.username} (Rol: {self.get_rol_display()})"
    

@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        Perfil.objects.create(user=instance)

@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def save_user_profile(sender, instance, **kwargs):
    try:
        instance.perfil.save()
    except Perfil.DoesNotExist:
        Perfil.objects.create(user=instance)

def cifrar_dato(dato_plano: str) -> str:
    if not dato_plano:
        return None
    fernet = Fernet(settings.FIELD_ENCRYPTION_KEY.encode())
    return fernet.encrypt(str(dato_plano).strip().encode('utf-8')).decode('utf-8')

def descifrar_dato(dato_cifrado: str) -> str:
    if not dato_cifrado:
        return None
    try:
        fernet = Fernet(settings.FIELD_ENCRYPTION_KEY.encode())
        return fernet.decrypt(dato_cifrado.encode('utf-8')).decode('utf-8')
    except Exception:
        return None

def generar_rut_hash(rut_raw: str) -> str:
    if not rut_raw:
        return None
    rut_limpio = str(rut_raw).replace('.', '').replace('-', '').strip().upper()
    return hashlib.sha256(rut_limpio.encode('utf-8')).hexdigest()


class PersonalOperativo(models.Model):
    ROLES = [
        ('PATIO', 'Bodeguero de Patio'),
        ('CHOFER', 'Conductor de Reparto'),
    ]


    empresa = models.ForeignKey(
        'Empresa', 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True, 
        related_name="personal_operativo"
    )
    rut_cifrado = models.TextField(verbose_name="RUT Cifrado")
    rut_hash = models.CharField(max_length=64, unique=True, db_index=True, verbose_name="Hash RUT")
    telefono_cifrado = models.TextField(verbose_name="Teléfono Cifrado")
    
    nombre = models.CharField(max_length=100)
    rol = models.CharField(max_length=10, choices=ROLES)
    activo = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Personal Operativo"
        verbose_name_plural = "Personal Operativo"
    @property
    def rut(self):
        return descifrar_dato(self.rut_cifrado)

    @property
    def telefono(self):
        return descifrar_dato(self.telefono_cifrado)

    def set_rut(self, rut_plano):
        if rut_plano:
            self.rut_cifrado = cifrar_dato(rut_plano)
            self.rut_hash = generar_rut_hash(rut_plano)

    def set_telefono(self, telefono_plano):
        if telefono_plano:
            self.telefono_cifrado = cifrar_dato(telefono_plano)

    def __str__(self):
        return f"{self.nombre} ({self.get_rol_display()})"