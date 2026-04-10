from rest_framework import serializers
from django.utils import timezone
from datetime import timedelta
from .models import (
    Mercancia, Cliente, Despacho, Conductor, 
    Camion, Ruta, Destino, Ubicacion, Estanteria, ReporteGenerado, HistorialMovimientos,
    AreaRestringida, Proveedor, Rampla, Cotizacion
)

class MercanciaListSerializer(serializers.ModelSerializer):
    id_cliente = serializers.StringRelatedField()
    id_ubicacion_actual = serializers.StringRelatedField()
    id_destino = serializers.StringRelatedField()

    class Meta:
        model = Mercancia
        fields = ['id_mercancia', 'id_cliente', 'id_ubicacion_actual', 'id_destino', 'estado', 'fecha_ingreso','id_proveedor']

class MercanciaCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Mercancia
        fields = [
            'id_cliente', 'descripcion_carga', 'cantidad_bultos', 
            'kg', 'm3', 'id_ubicacion_actual', 'id_destino','tipo'
        ]

class MercanciaListSerializer(serializers.ModelSerializer):
    cliente_nombre = serializers.CharField(source='id_cliente.nombre_cliente', read_only=True)
    ubicacion_codigo = serializers.CharField(source='id_ubicacion_actual.codigo_ubicacion', read_only=True)
    destino_nombre = serializers.CharField(source='id_destino.nombre_ciudad', read_only=True)
    despacho_str = serializers.CharField(source='id_despacho.__str__', read_only=True)

    class Meta:
        model = Mercancia
        fields = [
            'id_mercancia',
            'id_cliente', 'cliente_nombre',    
            'descripcion_carga',
            'id_ubicacion_actual', 'ubicacion_codigo',
            'id_destino', 'destino_nombre',       
            'estado',
            'fecha_ingreso',
            'id_despacho', 'despacho_str',       
            'cantidad_bultos',
            'motivo_baja',
            'kg', 
            'm3',
            'codigo_interno',
            'precio_total',
            'id_proveedor',
            'factura',
            'tipo',
            'paga_proveedor',
            'sucursal_id',
            'numero_orden_entrega'                
        ]

class MercanciaWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Mercancia
        fields = [
            'id_cliente', 'descripcion_carga', 'cantidad_bultos', 
            'kg', 'm3', 'id_ubicacion_actual', 'id_destino',
            'estado', 'id_despacho', 
            'motivo_baja', 'precio_total','id_usuario_creacion_id','id_proveedor','factura','tipo'
            ,'paga_proveedor','codigo_interno','sucursal_id','numero_orden_entrega'
        ]
        read_only_fields = ['empresa']

class DespachoListSerializer(serializers.ModelSerializer):
    id_camion = serializers.StringRelatedField()
    id_conductor = serializers.StringRelatedField()
    id_ruta = serializers.StringRelatedField()
    nombre_conductor = serializers.CharField(source='id_conductor.nombre_completo', read_only=True)
    nombre_sucursal = serializers.CharField(source='sucursal_id.nombre', read_only=True)

    class Meta:
        model = Despacho
        fields = [
            'id_despacho', 'fecha_programada', 'fecha_salida_real',
            'id_camion', 'id_conductor', 'id_ruta', 'estado_despacho','nombre_conductor',
            'origen','destino','id_rampla','sucursal_id','nombre_sucursal'
        ]

class DespachoWriteSerializer(serializers.ModelSerializer):
    nombre_conductor = serializers.CharField(source='id_conductor.nombre_completo', read_only=True)
    class Meta:
        model = Despacho
        fields = [
            'id_despacho',
            'fecha_programada', 'fecha_salida_real', 'id_camion', 
            'id_conductor', 'id_ruta', 'estado_despacho','nombre_conductor',
            'origen','destino','id_rampla','sucursal_id'
        ]
        read_only_fields = ['empresa']
    
    def validate(self, data):
        camion = data.get('id_camion')
        conductor = data.get('id_conductor')
        fecha_nueva_prog = data.get('fecha_programada')
        
        instance_id = self.instance.id_despacho if self.instance else None

        if camion and fecha_nueva_prog:
            # Excluimos el despacho actual si es una edición
            despachos_previos = Despacho.objects.filter(
                id_camion=camion
            ).exclude(
                estado_despacho='Finalizado'
            ).exclude(
                pk=instance_id 
            )

            for previo in despachos_previos:
                # El despacho previo ni siquiera ha salido.
                # El camión está totalmente bloqueado.
                if not previo.fecha_salida_real:
                     raise serializers.ValidationError({
                        "id_camion": f"El camión {camion} está ocupado en el Despacho #{previo.id_despacho} (Aún no sale)."
                    })
                
                # El despacho previo ya salió.
                # Aplicamos la regla de los 4 días.
                else:
                    fecha_liberacion = previo.fecha_salida_real.date() + timedelta(days=4)
                    if fecha_nueva_prog < fecha_liberacion:
                        raise serializers.ValidationError({
                            "id_camion": f"El camión no estará disponible hasta el {fecha_liberacion.strftime('%d/%m/%Y')} (4 días después del Despacho #{previo.id_despacho})."
                        })
        
        if conductor and fecha_nueva_prog:
            despachos_conductor = Despacho.objects.filter(id_conductor=conductor).exclude(pk=instance_id)
            
            for previo in despachos_conductor:
                if not previo.fecha_salida_real and previo.estado_despacho != 'Finalizado':
                     raise serializers.ValidationError({
                        "id_conductor": f"El conductor {conductor} ya está asignado al Despacho #{previo.id_despacho}."
                    })
                
                if previo.fecha_salida_real:
                    fecha_liberacion = previo.fecha_salida_real.date() + timedelta(days=4)
                    if fecha_nueva_prog < fecha_liberacion:
                        raise serializers.ValidationError({
                            "id_conductor": f"Conductor no disponible. Debe esperar hasta el {fecha_liberacion.strftime('%d/%m/%Y')}."
                        })
        return data

    def validate_fecha_salida_real(self, value):
        if value:
            now = timezone.now()
            if value < (now - timedelta(days=30)):
                raise serializers.ValidationError("La fecha de salida real no puede ser tan antigua (máx 30 días atrás).")
        return value

# Serializers para CATÁLOGOS
# Usamos un solo Serializer, ya que leer y escribir es igual

class ClienteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cliente
        fields = '__all__'
        read_only_fields = ['empresa']

class ConductorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Conductor
        fields = '__all__'
        read_only_fields = ['empresa']

class CamionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Camion
        fields = '__all__'
        read_only_fields = ['empresa']

class RutaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ruta
        fields = '__all__'
        read_only_fields = ['empresa', 'sucursal']

class DestinoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Destino
        fields = '__all__'
        read_only_fields = ['empresa']

class UbicacionSerializer(serializers.ModelSerializer):
    estanteria_codigo = serializers.StringRelatedField(source='estanteria', read_only=True)
    
    class Meta:
        model = Ubicacion
        fields = [
            'id_ubicacion', 
            'codigo_ubicacion', 
            'estanteria', 
            'estanteria_codigo', 
            'es_zona_suelo',
            'pos_x_rel', 
            'pos_y_rel', 
            'pos_z_rel',
            'estado_ocupado', 
            'capacidad_maxima_kg',
            'capacidad_max_m3',
            'tipo_almacenamiento'
        ]
        read_only_fields = ['empresa']

class EstanteriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Estanteria
        fields = '__all__'
        read_only_fields = ['empresa']

class ReporteGeneradoSerializer(serializers.ModelSerializer):
    usuario_nombre = serializers.CharField(source='usuario.username', read_only=True)
    class Meta:
        model = ReporteGenerado
        fields = '__all__'


class HistorialSerializer(serializers.ModelSerializer):
    usuario_nombre = serializers.CharField(source='id_usuario.username', read_only=True)
    sucursal_nombre = serializers.CharField(source='sucursal_id.nombre', read_only=True)

    class Meta:
        model = HistorialMovimientos
        fields = [
            'id_historial', 'fecha_hora_movimiento',
            'descripcion_adicional', 'usuario_nombre',
            'modelo_afectado', 
            'accion', 'sucursal_nombre','sucursal_id'
        ]

class AreaRestringidaSerializer(serializers.ModelSerializer):
    class Meta:
        model = AreaRestringida
        fields = '__all__'
        read_only_fields = ['empresa']


class ProveedorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Proveedor
        fields = '__all__'
        read_only_fields = ['empresa']

class RamplaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Rampla
        fields = '__all__'
        read_only_fields = ['activo', 'empresa']


class CotizacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cotizacion
        fields = '__all__'
        read_only_fields = [
            'empresa', 
            'id_usuario_creacion', 
            'fecha_creacion', 
            'fecha_confirmacion'
        ]