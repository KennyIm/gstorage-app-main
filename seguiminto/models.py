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


class LlamadaTelefonica(models.Model):
    class EstadoFinal(models.TextChoices):
        EN_CURSO = 'EN_CURSO', 'En Curso'
        CONTESTADA_BODEGA = 'CONTESTADA_BODEGA', 'Contestada por Bodega'
        NO_CONTESTA_DESVIADA = 'NO_CONTESTA_DESVIADA', 'No Contesta (Desviada)'
        CONTESTADA_GENERAL = 'CONTESTADA_GENERAL', 'Contestada por Central General'
        ABANDONADA = 'ABANDONADA', 'Abandonada'

    unique_id = models.CharField(
        max_length=64, 
        primary_key=True, 
        db_column='unique_id'
    )
    origen = models.CharField(max_length=50)
    bodega_seleccionada = models.CharField(max_length=50, null=True, blank=True)
    estado_final = models.CharField(
        max_length=50,
        choices=EstadoFinal.choices,
        default=EstadoFinal.EN_CURSO,
        db_index=True
    )
    paga_proveedor = models.BooleanField(default=False)
    fecha_inicio = models.DateTimeField(auto_now_add=True)
    fecha_fin = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'telefonia_llamadas'
        verbose_name = 'Llamada Telefónica'
        verbose_name_plural = 'Llamadas Telefónicas'
        ordering = ['-fecha_inicio']

    def __str__(self):
        return f"Llamada {self.unique_id} ({self.origen} -> {self.bodega_seleccionada or 'General'})"


class EventoTelefonico(models.Model):
    id = models.BigAutoField(primary_key=True)
    llamada = models.ForeignKey(
        LlamadaTelefonica,
        on_delete=models.CASCADE,
        to_field='unique_id',
        db_column='unique_id',
        related_name='eventos'
    )
    tipo_evento = models.CharField(max_length=50)
    destino = models.CharField(max_length=50, null=True, blank=True)
    motivo_fallo = models.CharField(max_length=50, null=True, blank=True)
    payload = models.JSONField(null=True, blank=True)
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'telefonia_eventos'
        verbose_name = 'Evento Telefónico'
        verbose_name_plural = 'Eventos Telefónicos'
        ordering = ['-creado_en']
        indexes = [
            models.Index(fields=['llamada'], name='idx_tel_evt_unique_id'),
        ]

    def __str__(self):
        return f"{self.tipo_evento} - {self.llamada_id}"