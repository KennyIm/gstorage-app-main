from django.db import models
from django.contrib.auth.models import User
from inventario.models import Mercancia, Despacho
# Create your models here.

class PerfilRepartidor(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='perfil_movil')
    conductor = models.OneToOneField('inventario.Conductor', on_delete=models.CASCADE, verbose_name="Conductor ERP")
    activo = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Perfil de Repartidor Móvil"
        verbose_name_plural = "Perfiles de Repartidores Móviles"

    def __str__(self):
        return f"Acceso Móvil: {self.conductor.nombre} (User: {self.user.username})"


class ControlEntrega(models.Model):
    ESTADOS_ENTREGA = [
        ('Pendiente', 'Pendiente en Camión'),
        ('Entregado', 'Entregado Exitosamente'),
        ('Rechazado', 'Rechazado por Cliente'),
        ('No_Domicilio', 'No se encontraba en domicilio'),
    ]

    mercancia = models.OneToOneField(
        Mercancia, 
        on_delete=models.CASCADE, 
        related_name='control_entrega',
        verbose_name="Mercancía"
    )
    estado_entrega = models.CharField(max_length=20, choices=ESTADOS_ENTREGA, default='Pendiente')
    fecha_entrega = models.DateTimeField(null=True, blank=True)
    latitud_entrega = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitud_entrega = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    foto_comprobante = models.ImageField(upload_to='comprobantes_entrega/', null=True, blank=True)
    observaciones = models.TextField(blank=True, null=True)

    class Meta:
        verbose_name = "Evidencia de Entrega (POD)"
        verbose_name_plural = "Evidencias de Entregas (POD)"

    def __str__(self):
        return f"Carga #{self.mercancia.id_mercancia} - {self.estado_entrega}"


class ComprobanteEntrega(models.Model):
    id_comprobante = models.AutoField(primary_key=True)
    mercancia = models.ForeignKey(
        Mercancia, 
        on_delete=models.CASCADE, 
        related_name='comprobantes',
        db_column='id_mercancia',
        verbose_name="Mercancía"
    )
    despacho = models.ForeignKey(
        Despacho, 
        on_delete=models.CASCADE, 
        related_name='comprobantes',
        db_column='id_despacho',
        verbose_name="Despacho"
    )
    url_archivo = models.URLField(max_length=500, verbose_name="URL del Comprobante")
    nombre_original = models.CharField(max_length=255, blank=True, null=True)
    observaciones = models.TextField(blank=True, null=True)
    fecha_subida = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'comprobante_entrega'
        ordering = ['-fecha_subida']

    def __str__(self):
        return f"Comprobante #{self.id_comprobante} - Mercancía: {self.mercancia_id} - Despacho: {self.despacho_id}"
