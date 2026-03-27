from django.db import models
from django.contrib.auth.models import User 
from django.db.models import Q
from django.conf import settings
from usuarios.models import Empresa, Sucursal

# --- Modelos de Catálogo ---

#REVISAR TODO 

# --- Managers para Borrado Lógico ---

class ClienteManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().filter(activo=True)

class ConductorManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().filter(activo=True)

class CamionManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().filter(activo=True)

class RutaManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().filter(activo=True)

class DestinoManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().filter(activo=True)

class UbicacionManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().filter(activo=True)

class DespachoManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().filter(activo=True)
    
class MercanciaManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().filter(is_active=True)
    
class EstanteriaManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().filter(activo=True)
    
class ProveedorManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().filter(activo=True)
    
class RamplaManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().filter(activo=True)
    
class Proveedor(models.Model):
    rut = models.CharField(max_length=20, primary_key=True, verbose_name="RUT del Proveedor")
    nombre_proveedor = models.CharField(max_length=150, verbose_name="Nombre / Razón Social")
    contacto = models.CharField(max_length=100, blank=True, null=True, verbose_name="Persona de Contacto")
    correo = models.EmailField(blank=True, null=True)
    telefono = models.CharField(max_length=20, blank=True, null=True)
    activo = models.BooleanField(default=True)
    objects = models.Manager() 
    activos = ProveedorManager()

    def __str__(self):
        return f"{self.nombre_proveedor} ({self.rut})"
    
class Cliente(models.Model):
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name="clientes")
    id_cliente = models.AutoField(primary_key=True)
    nombre_cliente = models.CharField(max_length=150, verbose_name="Nombre o Razón Social")
    rut_cliente = models.CharField(max_length=12, unique=True, null=True, blank=True, verbose_name="RUT")
    precio_kg= models.DecimalField(max_digits=10, decimal_places=0, default=0.0, verbose_name="Precio por Kg")
    precio_m3= models.DecimalField(max_digits=10, decimal_places=0, default=0.0, verbose_name="Precio por m3")
    telefono_contacto = models.CharField(max_length=20, null=True, blank=True, verbose_name="Teléfono")
    email_contacto = models.EmailField(max_length=100, null=True, blank=True, verbose_name="Email")
    nombre_contacto = models.CharField(max_length=100, blank=True, null=True, verbose_name="Persona de Contacto")
    direccion = models.CharField(max_length=255, blank=True, null=True, verbose_name="Calle y Número")
    ciudad = models.CharField(max_length=100, blank=True, null=True, verbose_name="Ciudad o Comuna")
    activo = models.BooleanField(default=True)
    objects = models.Manager() 
    activos = ClienteManager() 

    def __str__(self):
        return self.nombre_cliente

class Conductor(models.Model):
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name="conductores")
    id_conductor = models.AutoField(primary_key=True)
    nombre_completo = models.CharField(max_length=100, verbose_name="Nombre Completo")
    rut_conductor = models.CharField(max_length=12, unique=True, verbose_name="RUT")
    numero_licencia = models.CharField(max_length=20, verbose_name="N° Licencia")
    telefono = models.CharField(max_length=20, null=True, blank=True, verbose_name="Teléfono")
    activo = models.BooleanField(default=True)
    objects = models.Manager()
    activos = ConductorManager()

    def __str__(self):
        return f"{self.nombre_completo} ({self.rut_conductor})"

class Camion(models.Model):
    STATUS_CHOICES = [
        ('DISPONIBLE', 'Disponible'),
        ('EN_USO', 'En Uso'),
        ('MANTENIMIENTO', 'Mantenimiento'),
    ]
    
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name="camiones")
    id_camion = models.AutoField(primary_key=True)
    patente = models.CharField(max_length=10, unique=True, verbose_name="Patente")
    marca = models.CharField(max_length=50, null=True, blank=True)
    modelo = models.CharField(max_length=50, null=True, blank=True)
    
    activo = models.BooleanField(default=True)
    anio = models.IntegerField(null=True, blank=True, verbose_name="Año")
    estado_camion = models.CharField(max_length=20, choices=STATUS_CHOICES, default='DISPONIBLE', verbose_name="Estado")
    
    objects = models.Manager()
    activos = CamionManager()

    def __str__(self):
        return f"Camión {self.patente} ({self.marca})"
    
class Rampla(models.Model):
    STATUS_CHOICES = [
        ('DISPONIBLE', 'Disponible'),
        ('EN_USO', 'En Uso'),
        ('MANTENIMIENTO', 'Mantenimiento'),
    ]
    
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name="ramplas")
    id_rampla = models.AutoField(primary_key=True)
    patente = models.CharField(max_length=10, unique=True, verbose_name="Patente Rampla")
    marca = models.CharField(max_length=50, null=True, blank=True)
    modelo = models.CharField(max_length=50, null=True, blank=True)

    capacidad_max_kg = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Capacidad Máx (Kg)")
    capacidad_max_m3 = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Capacidad Máx (m³)")
    
    activo = models.BooleanField(default=True)
    anio = models.IntegerField(null=True, blank=True, verbose_name="Año")
    estado_rampla = models.CharField(max_length=20, choices=STATUS_CHOICES, default='DISPONIBLE', verbose_name="Estado")
    
    objects = models.Manager()
    activos = RamplaManager()

    def __str__(self):
        return f"Rampla {self.patente} - {self.capacidad_max_kg}Kg"


class Ruta(models.Model):
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name="rutas")
    sucursal = models.ForeignKey(Sucursal, on_delete=models.CASCADE)
    codigo_ruta = models.CharField(max_length=50, unique=True, null=True, blank=True, verbose_name="Código de Ruta")
    id_ruta = models.AutoField(primary_key=True)
    nombre_ruta = models.CharField(max_length=100, unique=True, verbose_name="Nombre de Ruta")
    descripcion = models.TextField(null=True, blank=True, verbose_name="Descripción")
    activo = models.BooleanField(default=True)
    objects = models.Manager()
    activos = RutaManager()

    def __str__(self):
        if self.codigo_ruta:
            return f"{self.codigo_ruta} - {self.nombre_ruta}"
        return self.nombre_ruta

class Destino(models.Model):
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name="destinos")
    id_destino = models.AutoField(primary_key=True)
    nombre_ciudad = models.CharField(max_length=100, verbose_name="Nombre de Ciudad")
    region = models.CharField(max_length=100, null=True, blank=True, verbose_name="Región")
    activo = models.BooleanField(default=True)
    objects = models.Manager()
    activos = DestinoManager()

    def __str__(self):
        return f"{self.nombre_ciudad}, {self.region}"
    
#VISUALIZACION 3D

class Estanteria(models.Model):
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name='estanterias')
    sucursal = models.ForeignKey(Sucursal, on_delete=models.CASCADE)
    codigo_estanteria = models.CharField(max_length=50, unique=True, verbose_name="Código de Estantería")
    
    # Coordenadas 3D donde empieza esta estantería
    pos_x = models.FloatField(default=0.0, verbose_name="Posición X (m)")
    pos_y = models.FloatField(default=0.0, verbose_name="Posición Y (m)")
    pos_z = models.FloatField(default=0.0, verbose_name="Posición Z (m)")
    rotacion = models.FloatField(default=0.0, verbose_name="Rotación (Grados)")
    
    # Dimensiones de la estantería (ej: 5 módulos de ancho, 3 niveles de alto)
    num_modulos_ancho = models.IntegerField(default=1, verbose_name="Módulos de Ancho")
    num_niveles_alto = models.IntegerField(default=1, verbose_name="Niveles de Alto")
    num_profundidad = models.IntegerField(default=1, verbose_name="Espacios de Profundidad") # Para paletas una detrás de otra

    # Dimensiones de CADA hueco (podrían ser por defecto)
    ancho_hueco_m = models.FloatField(default=1.0, verbose_name="Ancho de cada hueco (m)")
    alto_hueco_m = models.FloatField(default=1.0, verbose_name="Alto de cada hueco (m)")
    profundo_hueco_m = models.FloatField(default=1.0, verbose_name="Profundidad de cada hueco (m)")
    capacidad_carga_por_hueco_kg = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=50.0, 
        verbose_name="Capacidad por Hueco (Kg)"
    )

    activo = models.BooleanField(default=True)
    objects = models.Manager()  
    activos = EstanteriaManager()

    class Meta:
        verbose_name_plural = "Estanterías"
        unique_together = ('empresa', 'codigo_estanteria')

    def __str__(self):
        return f"{self.codigo_estanteria} ({self.empresa.nombre_empresa})"
  
class Ubicacion(models.Model):
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name='ubicaciones')
    sucursal = models.ForeignKey(Sucursal, on_delete=models.CASCADE)
    codigo_ubicacion = models.CharField(max_length=50, unique=True, verbose_name="Código de Ubicación")
    id_ubicacion = models.AutoField(primary_key=True)
    estanteria = models.ForeignKey(Estanteria, on_delete=models.SET_NULL, null=True, blank=True, related_name='ubicaciones_en_estanteria')
    es_zona_suelo = models.BooleanField(default=False, verbose_name="¿Es zona de suelo?")
    rotacion = models.FloatField(default=0.0, verbose_name="Rotación (Grados)")
    pos_x_rel = models.IntegerField(default=0, verbose_name="Posición Relativa X (módulo)") 
    pos_y_rel = models.IntegerField(default=0, verbose_name="Posición Relativa Y (nivel)")
    pos_z_rel = models.IntegerField(default=0, verbose_name="Posición Relativa Z (profundidad)")
    capacidad_max_m3 = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, verbose_name="Capacidad Máx (m³)")
    estado_ocupado = models.BooleanField(default=False, verbose_name="Estado Ocupado")
    tipo_almacenamiento = models.CharField(max_length=50, blank=True, null=True, verbose_name="Tipo de Almacenamiento")
    capacidad_maxima_kg = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, verbose_name="Capacidad Máxima (kg)")
    
    activo = models.BooleanField(default=True, verbose_name="Activo")
    objects = models.Manager()  
    activos = UbicacionManager()

    class Meta:
        verbose_name_plural = "Ubicaciones"
        unique_together = ('empresa', 'codigo_ubicacion')

    def __str__(self):
        return f"{self.codigo_ubicacion} ({self.empresa.nombre_empresa})"


# --- Modelos de Operación ---

class Despacho(models.Model):
    ESTADO_CHOICES = [
        ('Programado', 'Programado'),
        ('En Carga', 'En Carga'),
        ('En Tránsito', 'En Tránsito'),
        ('Finalizado', 'Finalizado'),
    ]

    UBICACIONES_CHOICES = [
    ('Santiago', 'Santiago'),
    ('Iquique', 'Iquique'),
    ('Antofagasta', 'Antofagasta'),
    ('Copiapo', 'Copiapo'),
    ('Mejillones','Mejillones'),
    ('Tocopilla', 'Tocopilla')
    ]
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name="despachos")
    sucursal = models.ForeignKey(Sucursal, on_delete=models.CASCADE)
    id_despacho = models.AutoField(primary_key=True)
    fecha_programada = models.DateField(verbose_name="Fecha Programada")
    fecha_salida_real = models.DateTimeField(null=True, blank=True, verbose_name="Fecha Salida Real")
    
    # Relaciones
    id_camion = models.ForeignKey(Camion, on_delete=models.PROTECT, verbose_name="Camión")
    id_rampla = models.ForeignKey(Rampla, on_delete=models.SET_NULL, null=True, blank=True, related_name="despachos")
    id_conductor = models.ForeignKey(Conductor, on_delete=models.PROTECT, verbose_name="Conductor")
    id_ruta = models.ForeignKey(Ruta, on_delete=models.PROTECT, verbose_name="Ruta")
    
    estado_despacho = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='Programado', verbose_name="Estado")

    # Auditoría
    id_usuario_creacion = models.ForeignKey(User, related_name='despachos_creados', on_delete=models.PROTECT, verbose_name="Usuario Creación", null=True, blank=True)
    id_usuario_ultima_modificacion = models.ForeignKey(User, related_name='despachos_modificados', on_delete=models.PROTECT, null=True, blank=True, verbose_name="Usuario Modificación")

    #Destinos
    origen = models.CharField(max_length=50, null=True, blank=True, choices=UBICACIONES_CHOICES, default='Santiago')
    destino = models.CharField(max_length=50, null=True, blank=True, choices=UBICACIONES_CHOICES, default='Santiago')

    activo = models.BooleanField(default=True)
    objects = models.Manager()
    activos = DespachoManager()

    def __str__(self):
        return f"Despacho #{self.id_despacho} - {self.fecha_programada} ({self.estado_despacho})"

class MercanciaManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().filter(activo=True)
    
class Mercancia(models.Model):
    ESTADO_CHOICES = [
        ('En Bodega', 'En Bodega'),
        ('Asignado', 'Asignado a Despacho'),
        ('En Tránsito', 'En Tránsito'),
        ('Entregado', 'Entregado'),
        ('Eliminado', 'Eliminado'),
        ('Merma', 'Merma'),
    ]
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name="mercancias")
    sucursal = models.ForeignKey(Sucursal, on_delete=models.CASCADE)
    id_mercancia = models.AutoField(primary_key=True)
    descripcion_carga = models.TextField(null=True, blank=True, verbose_name="Descripción")
    cantidad_bultos = models.IntegerField(default=1, verbose_name="Cantidad de Bultos")
    kg = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, verbose_name="Peso (Kg)")
    m3 = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, verbose_name="Volumen (m³)")
    precio_total = models.DecimalField(max_digits=12, decimal_places=0, default=0.0, verbose_name="Precio Calculado")
    factura = models.CharField(max_length=50, blank=True, null=True, verbose_name="Número de Factura")
    tipo = models.CharField(max_length=50, blank=True, null=True, verbose_name="Tipo de carga")
    codigo_interno= models.CharField(max_length=50,  blank=True, null=True, verbose_name="Código Interno Bodega")
    
    id_cliente = models.ForeignKey(Cliente, on_delete=models.PROTECT, verbose_name="Cliente")
    id_ubicacion_actual = models.ForeignKey(Ubicacion, on_delete=models.SET_NULL, null=True, blank=True, related_name='mercancias_en_ubicacion')
    id_destino = models.ForeignKey(Destino, on_delete=models.PROTECT, verbose_name="Destino")
    id_despacho = models.ForeignKey(Despacho, on_delete=models.SET_NULL, null=True, blank=True, verbose_name="Despacho Asignado")
    id_proveedor = models.ForeignKey(Proveedor, on_delete=models.SET_NULL, null=True, blank=True, related_name='mercancias', verbose_name="Proveedor de Origen")
    
    fecha_ingreso = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de Ingreso")
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='En Bodega', verbose_name="Estado")
    motivo_baja = models.TextField(null=True, blank=True, verbose_name="Motivo de Baja/Merma")
    paga_proveedor = models.BooleanField(default=False, verbose_name="¿Paga Proveedor?")
    numero_orden_entrega = models.CharField(max_length=50, null=True, blank=True)

    id_usuario_creacion = models.ForeignKey(User, related_name='mercancias_creadas', on_delete=models.PROTECT, verbose_name="Usuario Creación", null=True, blank=True)
    id_usuario_ultima_modificacion = models.ForeignKey(User, related_name='mercancias_modificadas', on_delete=models.PROTECT, null=True, blank=True, verbose_name="Usuario Modificación")
    activo = models.BooleanField(default=True, verbose_name="Activo")

    objects = models.Manager()
    activos = MercanciaManager()

    class Meta:
        constraints = [
            models.CheckConstraint(
                check=Q(kg__isnull=False) | Q(m3__isnull=False),
                name='kg_o_m3_no_nulos'
            )
        ]

    def __str__(self):
        return f"Lote #{self.id_mercancia} - {self.id_cliente.nombre_cliente}"
    

class HistorialMovimientos(models.Model):
    TIPO_MOVIMIENTO_CHOICES = [
        ('Creación', 'Creación'),
        ('Modificación Manual', 'Modificación Manual'),
        ('Asignación Despacho', 'Asignación Despacho'),
        ('Borrado Lógico', 'Borrado Lógico'),
    ]
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name="historial_movimientos")
    sucursal = models.ForeignKey(Sucursal, on_delete=models.CASCADE, null=True, blank=True)
    id_historial = models.AutoField(primary_key=True)
    id_mercancia = models.ForeignKey(Mercancia, on_delete=models.CASCADE, related_name="historial", null=True, blank=True)
    id_usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    id_ubicacion_anterior = models.ForeignKey(Ubicacion, on_delete=models.SET_NULL, null=True, blank=True, related_name="historial_anterior")
    id_ubicacion_nueva = models.ForeignKey(Ubicacion, on_delete=models.SET_NULL, null=True, blank=True, related_name="historial_nueva")
    fecha_hora_movimiento = models.DateTimeField(auto_now_add=True)
    tipo_movimiento = models.CharField(max_length=50, choices=TIPO_MOVIMIENTO_CHOICES)
    modelo_afectado = models.CharField(max_length=50, null=True, blank=True, verbose_name="Módulo (Ej: Camión)")
    accion = models.CharField(max_length=50) 
    descripcion_adicional = models.CharField(max_length=255, null=True, blank=True)

    def __str__(self):
        return f"Movimiento de {self.id_mercancia.id_mercancia} - {self.tipo_movimiento}"
    # def save(self, *args, **kwargs):

    #     if not self.activo:
    #         super().save(*args, **kwargs) 
    #         return
    #     if self.id_despacho:
    #         if self.id_despacho.estado_despacho == 'Programado':
    #             self.estado = 'Asignado'
    #         elif self.id_despacho.estado_despacho in ['En Carga', 'En Tránsito']:
    #             self.estado = 'En Tránsito'
    #         elif self.id_despacho.estado_despacho == 'Finalizado':
    #             self.estado = 'Entregado'
    #     else:
    #         self.estado = 'En Bodega'
        
    #     super().save(*args, **kwargs) 


class ReporteGenerado(models.Model):
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE)
    sucursal = models.ForeignKey(Sucursal, on_delete=models.CASCADE)
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    tipo = models.CharField(max_length=50) 
    formato = models.CharField(max_length=10) 
    archivo = models.FileField(upload_to='reportes/') 
    fecha_generacion = models.DateTimeField(auto_now_add=True)
    parametros = models.CharField(max_length=255, null=True, blank=True) 

    def __str__(self):
        return f"{self.tipo} - {self.fecha_generacion}"
    
class AreaRestringida(models.Model):
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name='areas_restringidas')
    sucursal = models.ForeignKey(Sucursal, on_delete=models.CASCADE)
    nombre = models.CharField(max_length=100, verbose_name="Nombre (Ej: Oficina)")
    
    # Posición (Esquina superior izquierda del área)
    pos_x = models.FloatField(verbose_name="Posición X (m)")
    pos_z = models.FloatField(verbose_name="Posición Z (m)")
    rotacion = models.FloatField(default=0.0, verbose_name="Rotación (Grados)")
    
    # Dimensiones
    ancho = models.FloatField(verbose_name="Ancho (m)") # X
    largo = models.FloatField(verbose_name="Largo (m)") # Z
    alto = models.FloatField(default=3.0, verbose_name="Alto (m)")
     
    
    color = models.CharField(max_length=20, default="#ff0000", verbose_name="Color Hex") # Rojo para prohibido

    def __str__(self):
        return f"{self.nombre} ({self.empresa.nombre_empresa})"