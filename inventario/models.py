from django.db import models
import hashlib
from django.contrib.auth.models import User 
from django.db.models import Q
import json
import copy
from django.core.serializers.json import DjangoJSONEncoder
from django.conf import settings
from usuarios.models import Empresa, Sucursal
from django.core.exceptions import ValidationError


def validar_rut_chileno(rut_str):
    rut_limpio = rut_str.replace(".", "").replace("-", "").strip().upper()
    if len(rut_limpio) < 2:
        raise ValidationError("Formato de RUT inválido.")
    
    cuerpo = rut_limpio[:-1]
    dv = rut_limpio[-1]
    
    try:
        reverso = map(int, reversed(cuerpo))
        factores = [2, 3, 4, 5, 6, 7]
        suma = sum(f * v for f, v in zip(factores * (len(cuerpo) // 6 + 1), reverso))
        dv_esperado = 11 - (suma % 11)
        if dv_esperado == 11: dv_esperado = "0"
        elif dv_esperado == 10: dv_esperado = "K"
        else: dv_esperado = str(dv_esperado)
        
        if dv != dv_esperado:
            raise ValidationError("El dígito verificador del RUT no es válido.")
    except Exception:
        raise ValidationError("El RUT contiene caracteres inválidos.")
    
    return rut_limpio

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
    
class CotizacionManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().filter(activo=True)
    
class HistorialManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset()
    
class Proveedor(models.Model):
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name="proveedores")
    id = models.AutoField(primary_key=True)
    nombre_proveedor = models.CharField(max_length=150, verbose_name="Nombre / Razón Social")
    contacto = models.CharField(max_length=100, blank=True, null=True, verbose_name="Persona de Contacto")
    activo = models.BooleanField(default=True)
    objects = models.Manager() 
    activos = ProveedorManager()

    correo_cifrado = models.TextField(null=True, blank=True)
    telefono_cifrado = models.TextField(null=True, blank=True)

    rut_cifrado = models.TextField(null=True, blank=True, verbose_name="RUT Cifrado")
    rut_hash = models.CharField(max_length=64, unique=True, null=True, blank=True, db_index=True)

    def save(self, *args, **kwargs):
        if hasattr(self, 'rut_plano_temporal'):
            valor_rut = self.rut_plano_temporal
            if not valor_rut or str(valor_rut).strip() == "":
                self.rut_hash = None
                self.rut_cifrado = None
            else:
                rut_estandar = validar_rut_chileno(valor_rut)
                self.rut_hash = hashlib.sha256(rut_estandar.encode('utf-8')).hexdigest()
                
        super().save(*args, **kwargs)

    def __str__(self):
        return self.nombre_proveedor
    
class Cliente(models.Model):
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name="clientes")
    id_cliente = models.AutoField(primary_key=True)
    nombre_cliente = models.CharField(max_length=150, verbose_name="Nombre o Razón Social")
    precio_kg= models.DecimalField(max_digits=10, decimal_places=0, default=0.0, verbose_name="Precio por Kg")
    precio_m3= models.DecimalField(max_digits=10, decimal_places=0, default=0.0, verbose_name="Precio por m3")
    nombre_contacto = models.CharField(max_length=100, blank=True, null=True, verbose_name="Persona de Contacto")
    ciudad = models.CharField(max_length=100, blank=True, null=True, verbose_name="Ciudad o Comuna")
    ciudad2 = models.CharField(max_length=100, blank=True, null=True, verbose_name="Ciudad o Comuna (Secundaria)")
    activo = models.BooleanField(default=True)
    objects = models.Manager() 
    activos = ClienteManager()

    rut_cliente_cifrado = models.TextField(null=True, blank=True, verbose_name="RUT Cifrado") 
    telefono_cifrado = models.TextField(null=True, blank=True, verbose_name="Teléfono Cifrado")
    email_cifrado = models.TextField(null=True, blank=True, verbose_name="Email Cifrado")
    direccion_cifrado = models.TextField(null=True, blank=True, verbose_name="Dirección Cifrada")
    direccion_cifrado2 = models.TextField(null=True, blank=True, verbose_name="Dirección Cifrada2")

    rut_hash = models.CharField(max_length=64, unique=True, null=True, blank=True, db_index=True)

    def save(self, *args, **kwargs):
        if hasattr(self, 'rut_plano_temporal'):
            valor_rut = self.rut_plano_temporal
            if not valor_rut or str(valor_rut).strip() == "":
                self.rut_hash = None
                self.rut_cliente_cifrado = None
            else:
                rut_estandar = validar_rut_chileno(valor_rut)
                self.rut_hash = hashlib.sha256(rut_estandar.encode('utf-8')).hexdigest()
        super().save(*args, **kwargs)  

    def __str__(self):
        return self.nombre_cliente

class Conductor(models.Model):
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name="conductores")
    id_conductor = models.AutoField(primary_key=True)
    nombre_completo = models.CharField(max_length=100, verbose_name="Nombre Completo")
    activo = models.BooleanField(default=True)
    objects = models.Manager()
    activos = ConductorManager()

    rut_conductor_cifrado = models.TextField(null=True, blank=True, verbose_name="RUT Cifrado")
    telefono_conductor_cifrado = models.TextField(null=True, blank=True, verbose_name="Teléfono Cifrado")
    licencia_cifrado = models.TextField(null=True, blank=True, verbose_name="Licencia Cifrada")

    rut_hash = models.CharField(max_length=64, unique=True, null=True, blank=True, db_index=True)

    def save(self, *args, **kwargs):
        if hasattr(self, 'rut_plano_temporal') and self.rut_plano_temporal:
            rut_estandar = validar_rut_chileno(self.rut_plano_temporal)
            self.rut_hash = hashlib.sha256(rut_estandar.encode('utf-8')).hexdigest()
            
        super().save(*args, **kwargs)

    def __str__(self):
        return self.nombre_completo

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
    codigo_ruta = models.IntegerField(unique=True, null=True, blank=True, verbose_name="Código de Ruta")
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
        ('Eliminado', 'Eliminado')
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

    orden_mercancias = models.JSONField(default=list, blank=True, null=True)

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
    TIPOS_DOC_MERCANCIA = [
        ('Factura', 'Factura Electrónica'),
        ('Boleta', 'Boleta'),
        ('Guia', 'Guía de Despacho'),
        ('DUS', 'Documento Único de Salida (Aduana)'),
        ('Solicitud Envio', 'Solicitud de envió')
    ]
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name="mercancias")
    sucursal = models.ForeignKey(Sucursal, on_delete=models.CASCADE)
    id_mercancia = models.AutoField(primary_key=True)
    descripcion_carga = models.TextField(null=True, blank=True, verbose_name="Descripción")
    cantidad_bultos = models.IntegerField(default=1, verbose_name="Cantidad de Bultos")
    kg = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, verbose_name="Peso (Kg)")
    m3 = models.DecimalField(max_digits=10, decimal_places=3, null=True, blank=True, verbose_name="Volumen (m³)")
    precio_total = models.DecimalField(max_digits=12, decimal_places=0, default=0.0, verbose_name="Precio Calculado")
    factura = models.CharField(max_length=50, blank=True, null=True, verbose_name="Número de Factura")
    tipo_documento_mercancia = models.CharField(
        max_length=30,
        choices=TIPOS_DOC_MERCANCIA,
        default='Factura',
        verbose_name="Tipo de Documento de Mercancía"
    )
    tipo = models.CharField(max_length=50, blank=True, null=True, verbose_name="Tipo de carga")
    codigo_interno= models.CharField(max_length=50,  blank=True, null=True, verbose_name="Código Interno Bodega")
    direccion_entrega = models.CharField(max_length=255, null=True, blank=True, verbose_name="Dirección de entrega", help_text="Dirección específica de entrega para esta carga")
    
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

    tipo_documento_pago = models.CharField(
        max_length=20, 
        choices=[('Factura', 'Factura (+ IVA)'), ('Sin_Factura', 'Sin Factura / Guía')],
        default='Factura',
        verbose_name="Tipo de Cobro"
    )
    estado_cobranza = models.CharField(
        max_length=20,
        choices=[
            ('Pendiente', 'Pendiente de Cobro'), 
            ('En_Proceso', 'En Proceso de Cobro (Facturado)'), 
            ('Pagado', 'Pagado')
        ],
        default='Pendiente',
        verbose_name="Estado de Cobranza"
    )

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
    

def extraer_datos_auditoria(instancia):
    if not instancia: return None
    datos = {}
    
    for campo in instancia._meta.fields:
        nombre_campo = campo.name
        if nombre_campo in ['id', 'empresa', 'sucursal', 'usuario_creacion', 'fecha_creacion', 'fecha_actualizacion']:
            continue
            
        valor = getattr(instancia, nombre_campo)
        if valor is None:
            continue
        nombre_legible = str(campo.verbose_name).title()
        if nombre_legible.lower().startswith("id "):
            nombre_legible = nombre_legible[3:].strip() 
        if campo.is_relation and campo.many_to_one:
            atributos_magicos = ['nombre_cliente', 'codigo_ubicacion', 'nombre_ciudad', 'nombre', 'descripcion']
            
            encontro_texto = False
            for attr in atributos_magicos:
                if hasattr(valor, attr):
                    datos[nombre_legible] = str(getattr(valor, attr))
                    encontro_texto = True
                    break
            if not encontro_texto:
                datos[nombre_legible] = str(valor)
        else:
            if nombre_campo.endswith('_id') or nombre_campo.startswith('id_'):
                continue
            
            datos[nombre_legible] = valor
            
    try:
        return json.loads(json.dumps(datos, cls=DjangoJSONEncoder))
    except Exception as e:
        print(f"Error extrayendo auditoría: {e}")
        return None

def generar_diff(instancia_vieja, instancia_nueva):
    datos_viejos = extraer_datos_auditoria(instancia_vieja) or {}
    datos_nuevos = extraer_datos_auditoria(instancia_nueva) or {}
    
    cambios = {}
    for key, valor_nuevo in datos_nuevos.items():
        valor_viejo = datos_viejos.get(key)
        if valor_viejo != valor_nuevo:
            cambios[key] = {
                "viejo": valor_viejo,
                "nuevo": valor_nuevo
            }
            
    return {"es_diff": True, "cambios": cambios}


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

    detalles = models.JSONField(
        null=True, 
        blank=True, 
        verbose_name="Detalles del Movimiento",
        help_text="Guarda una foto en formato JSON de los datos en ese momento."
    )

    objects = HistorialManager()
    def create(self, **kwargs):
        instancia = kwargs.pop('instancia', None)
        
        if instancia:
            kwargs['detalles'] = extraer_datos_auditoria(instancia)
            
        return super().create(**kwargs)
    def __init__(self, *args, **kwargs):
        instancia_nueva = kwargs.pop('instancia', None)
        instancia_vieja = kwargs.pop('instancia_vieja', None) 
        
        if instancia_vieja and instancia_nueva:
            kwargs['detalles'] = generar_diff(instancia_vieja, instancia_nueva)
        elif instancia_nueva:
            kwargs['detalles'] = extraer_datos_auditoria(instancia_nueva)
            
        super().__init__(*args, **kwargs)

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
    
class Cotizacion(models.Model):
    ESTADOS_COTIZACION = [
        ('En proceso', 'En proceso'),
        ('Cotizado', 'Cotizado')
    ]
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name="cotizaciones")
    id_usuario_creacion = models.ForeignKey(User, related_name='cotizaciones_creadas', on_delete=models.PROTECT, verbose_name="Usuario Creación", null=True, blank=True)
    id_cotizacion = models.AutoField(primary_key=True)
    rut_cliente = models.CharField(max_length=12, verbose_name="RUT cliente")
    rut_proveedor = models.CharField(max_length=12, verbose_name="RUT proveedor")
    nombre_cliente = models.CharField(max_length=150, verbose_name="Nombre o Razón Social")
    proveedor = models.CharField(max_length=150, verbose_name="Nombre o Razón Social")
    contacto = models.CharField(max_length=50, null=True, blank=True, verbose_name="Contacto cotización")
    destino = models.CharField(max_length=100, blank=True, null=True, verbose_name="Dirección de destino")
    cantidad = models.IntegerField(default=1, verbose_name="Cantidad de bultos")
    tipo_bultos = models.CharField(max_length=50, blank=True, null=True, verbose_name="Tipo de bultos")
    kg = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, verbose_name="Peso (Kg)")
    m3 = models.DecimalField(max_digits=10, decimal_places=3, null=True, blank=True, verbose_name="Volumen (m³)")
    monto = models.DecimalField(max_digits=12, decimal_places=0, null=True, blank=True, verbose_name="Monto Cotizado")
    estado_cotizacion = models.CharField(max_length=50, choices=ESTADOS_COTIZACION)
    fecha_confirmacion = models.DateTimeField(null=True, blank=True, verbose_name="Fecha confirmación")
    fecha_creacion = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de creación")
    cotiza_proveedor = models.BooleanField(default=False, verbose_name="¿Cotiza proveedor?")
    activo = models.BooleanField(default=True)
    objects = models.Manager() 
    activos = CotizacionManager

    def __str__(self):
        return f"Cotización #{self.id_cotizacion} - {self.nombre_cliente}"
    

class PermisoColaboracion(models.Model):
    despacho = models.ForeignKey('Despacho', on_delete=models.CASCADE, related_name='colaboradores_invitados')
    usuario_invitado = models.ForeignKey(User, on_delete=models.CASCADE, related_name='despachos_compartidos')
    otorgado_por = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='invitaciones_enviadas', help_text="El usuario (jefe/admin) que concedió este permiso.")
    fecha_invitacion = models.DateTimeField(auto_now_add=True)
    activo = models.BooleanField(default=True, help_text="Si es False, el usuario pierde el acceso inmediatamente.")

    class Meta:
        unique_together = ('despacho', 'usuario_invitado')
        verbose_name = 'Permiso de Colaboración'
        verbose_name_plural = 'Permisos de Colaboración'

    def __str__(self):
        return f"Permiso para {self.usuario_invitado.username} en Despacho #{self.despacho.id_despacho}" 

class PermisoCotizacion(models.Model):
    cotizacion = models.ForeignKey(Cotizacion, on_delete=models.CASCADE, related_name='colaboradores_invitados')
    usuario_invitado = models.ForeignKey(User, on_delete=models.CASCADE, related_name='cotizaciones_compartidas')
    otorgado_por = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='invitaciones_cotizacion_enviadas', help_text="El usuario que concedió este permiso.")
    fecha_invitacion = models.DateTimeField(auto_now_add=True)
    activo = models.BooleanField(default=True)

    class Meta:
        unique_together = ('cotizacion', 'usuario_invitado')
        verbose_name = 'Permiso de Cotización'
        verbose_name_plural = 'Permisos de Cotizaciones'

    def __str__(self):
        return f"Permiso para {self.usuario_invitado.username} en Cotización #{self.cotizacion.id_cotizacion}"
    