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
    es_colaborador = serializers.SerializerMethodField()
    id_ruta = serializers.StringRelatedField()

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
            'numero_orden_entrega',
            'es_colaborador',
            'id_ruta',        
        ]
    
    def get_es_colaborador(self, obj):
        user = self.context.get('request').user
        if obj.id_despacho:
            colaboradores = obj.id_despacho.colaboradores_invitados.all()
            for colab in colaboradores:
                if colab.usuario_invitado_id == user.id and colab.activo:
                    return True
        return False


class MercanciaWriteSerializer(serializers.ModelSerializer):
    creador_nombre = serializers.SerializerMethodField(read_only=True)
    ultima_modificacion = serializers.SerializerMethodField(read_only=True)
    colaboradores_activos = serializers.SerializerMethodField(read_only=True)
    class Meta:
        model = Mercancia
        fields = [
            'id_cliente', 'descripcion_carga', 'cantidad_bultos', 
            'kg', 'm3', 'id_ubicacion_actual', 'id_destino',
            'estado', 'id_despacho', 
            'motivo_baja', 'precio_total','id_usuario_creacion_id','id_proveedor','factura','tipo'
            ,'paga_proveedor','codigo_interno','sucursal_id','numero_orden_entrega','creador_nombre',
            'ultima_modificacion', 'colaboradores_activos'   
        ]
        read_only_fields = ['empresa', 'sucursal', 'sucursal_id', 'id_usuario_creacion']
    
    def update(self, instance, validated_data):
        validated_data.pop('sucursal', None)
        validated_data.pop('sucursal_id', None)
        validated_data.pop('empresa', None)
        validated_data.pop('id_usuario_creacion', None)
        
        return super().update(instance, validated_data)
    
    def get_colaboradores_activos(self, obj):
        if obj.id_despacho:
            invitados = obj.id_despacho.colaboradores_invitados.filter(activo=True)
            return [p.usuario_invitado.username for p in invitados]
        return []

    def get_creador_nombre(self, obj):
        if obj.id_usuario_creacion:
            return obj.id_usuario_creacion.username 
        return "Desconocido"

    def get_ultima_modificacion(self, obj):
        ultimo_movimiento = HistorialMovimientos.objects.filter(
            id_mercancia=obj
        ).order_by('-fecha_hora_movimiento').first()

        if ultimo_movimiento:
            return ultimo_movimiento.fecha_hora_movimiento
        return obj.fecha_ingreso

class DespachoListSerializer(serializers.ModelSerializer):
    id_camion = serializers.StringRelatedField()
    id_conductor = serializers.StringRelatedField()
    id_ruta = serializers.StringRelatedField()
    es_colaborador = serializers.SerializerMethodField(read_only=True)
    nombre_conductor = serializers.CharField(source='id_conductor.nombre_completo', read_only=True)
    nombre_sucursal = serializers.CharField(source='sucursal_id.nombre', read_only=True)

    class Meta:
        model = Despacho
        fields = [
            'id_despacho', 'fecha_programada', 'fecha_salida_real',
            'id_camion', 'id_conductor', 'id_ruta', 'estado_despacho','nombre_conductor',
            'origen','destino','id_rampla','sucursal_id','nombre_sucursal','es_colaborador'
        ]
    
    def get_es_colaborador(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            user = request.user
            return obj.colaboradores_invitados.filter(usuario_invitado=user, activo=True).exists()
        return False

class DespachoWriteSerializer(serializers.ModelSerializer):
    nombre_conductor = serializers.CharField(source='id_conductor.nombre_completo', read_only=True)
    colaboradores_activos = serializers.SerializerMethodField(read_only=True)
    class Meta:
        model = Despacho
        fields = [
            'id_despacho',
            'fecha_programada', 'fecha_salida_real', 'id_camion', 
            'id_conductor', 'id_ruta', 'estado_despacho','nombre_conductor',
            'origen','destino','id_rampla','sucursal_id', 'colaboradores_activos'
        ]
        read_only_fields = ['empresa']

    def get_colaboradores_activos(self, obj):
        permisos = obj.colaboradores_invitados.filter(activo=True)
        
        lista_colaboradores = []
        for permiso in permisos:
            usuario = permiso.usuario_invitado
            lista_colaboradores.append({
                "id": usuario.id,
                "username": usuario.username,
                "nombre_completo": f"{usuario.first_name} {usuario.last_name}".strip() or usuario.username,
                "otorgado_por": permiso.otorgado_por.username if permiso.otorgado_por else "Sistema"
            })
            
        return lista_colaboradores
    
    def validate(self, data):
        camion = data.get('id_camion')
        conductor = data.get('id_conductor')
        fecha_nueva_prog = data.get('fecha_programada')
        
        instance_id = self.instance.id_despacho if self.instance else None

        if camion and fecha_nueva_prog:
            despachos_previos = Despacho.objects.filter(
                id_camion=camion
            ).exclude(
                estado_despacho='Finalizado'
            ).exclude(
                pk=instance_id 
            )

            for previo in despachos_previos:
                if not previo.fecha_salida_real:
                     raise serializers.ValidationError({
                        "id_camion": f"El camión {camion} está ocupado en el Despacho #{previo.id_despacho} (Aún no sale)."
                    })
                
                else:
                    fecha_liberacion_exacta = previo.fecha_salida_real + timedelta(days=1, hours=4)
                    fecha_liberacion = fecha_liberacion_exacta.date()
                    
                    if fecha_nueva_prog < fecha_liberacion:
                        raise serializers.ValidationError({
                            "id_camion": f"El camión no estará disponible hasta el {fecha_liberacion.strftime('%d/%m/%Y')} (Despacho #{previo.id_despacho})."
                        })
        
        if conductor and fecha_nueva_prog:
            despachos_conductor = Despacho.objects.filter(id_conductor=conductor).exclude(pk=instance_id)
            
            for previo in despachos_conductor:
                if not previo.fecha_salida_real and previo.estado_despacho != 'Finalizado':
                     raise serializers.ValidationError({
                        "id_conductor": f"El conductor {conductor} ya está asignado al Despacho #{previo.id_despacho}."
                    })
                
                if previo.fecha_salida_real:
                    fecha_liberacion_exacta = previo.fecha_salida_real + timedelta(days=1, hours=4)
                    fecha_liberacion = fecha_liberacion_exacta.date()
                    
                    if fecha_nueva_prog < fecha_liberacion:
                        raise serializers.ValidationError({
                            "id_conductor": f"Conductor no disponible. Debe esperar hasta el {fecha_liberacion.strftime('%d/%m/%Y')}."
                        })
        
        return data

    def validate_fecha_salida_real(self, value):
        if value:
            now = timezone.now()
            if value < (now - timedelta(days=365)):
                raise serializers.ValidationError("La fecha de salida real no puede ser tan antigua (máx 1 año atrás).")
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

class InvitacionColaboradorSerializer(serializers.Serializer):
    usuario_invitado_id = serializers.IntegerField(
        help_text="ID del usuario al que se le dará acceso al despacho."
    )