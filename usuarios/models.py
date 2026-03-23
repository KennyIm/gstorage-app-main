from django.db import models
from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth.models import User

    
class Empresa(models.Model):
    id_empresa = models.AutoField(primary_key=True)
    nombre_empresa = models.CharField(max_length=255, unique=True, verbose_name="Nombre de la Empresa")
    rut_empresa = models.CharField(max_length=12, unique=True, null=True, blank=True, verbose_name="RUT de la Empresa")
    dueno_empresa = models.CharField(max_length=50, verbose_name="Dueño de la empresa")
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

class Perfil(models.Model):
    class Roles(models.TextChoices):
        DUENO = 'DUENO', 'Dueño'
        SECRETARIA = 'SECRETARIA', 'Secretaria'
        JEFE_BODEGA = 'JEFE_BODEGA', 'Jefe de Bodega'
        OPERARIO = 'OPERARIO', 'Operario'

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, primary_key=True, related_name="perfil")
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, null=True, blank=True, related_name="perfiles")
    telefono = models.CharField(max_length=20, null=True, blank=True)
    
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