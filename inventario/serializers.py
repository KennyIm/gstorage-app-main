import hashlib
from cryptography.fernet import Fernet
from django.conf import settings
from rest_framework import serializers
from django.utils import timezone
from datetime import timedelta
from .models import (
    Mercancia, Cliente, Despacho, Conductor, 
    Camion, Ruta, Destino, Ubicacion, Estanteria, ReporteGenerado, HistorialMovimientos,
    AreaRestringida, Proveedor, Rampla, Cotizacion
)

from seguiminto.serializers import ControlEntregaSerializer

def desencriptar_valor(valor_cifrado):
    if not valor_cifrado:
        return ""
    try:
        fernet = Fernet(settings.FIELD_ENCRYPTION_KEY.encode())
        return fernet.decrypt(valor_cifrado.encode('utf-8')).decode('utf-8')
    except Exception:
        return "Error al desencriptar"

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
    control_entrega = ControlEntregaSerializer(source='controlentrega', read_only=True)

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
            'direccion_entrega',
            'tipo_documento_mercancia',
            'control_entrega'        
        ]
    
    def get_es_colaborador(self, obj):
        if hasattr(obj, 'es_colaborador'):
            return obj.es_colaborador
            
        request = self.context.get('request')
        if request and request.user and request.user.is_authenticated and obj.id_despacho_id:
            user = request.user
            return obj.id_despacho.colaboradores_invitados.filter(
                usuario_invitado_id=user.id, 
                activo=True
            ).exists()
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
            'ultima_modificacion', 'colaboradores_activos','direccion_entrega','tipo_documento_mercancia'   
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
    nombre_ruta = serializers.CharField(source='id_ruta.codigo_ruta', read_only=True)
    es_colaborador = serializers.SerializerMethodField(read_only=True)
    nombre_conductor = serializers.CharField(source='id_conductor.nombre_completo', read_only=True)
    nombre_sucursal = serializers.CharField(source='sucursal_id.nombre', read_only=True)

    class Meta:
        model = Despacho
        fields = [
            'id_despacho', 'fecha_programada', 'fecha_salida_real',
            'id_camion', 'id_conductor', 'id_ruta','nombre_ruta', 'estado_despacho','nombre_conductor',
            'origen','destino','id_rampla','sucursal_id','nombre_sucursal','es_colaborador', 'orden_mercancias'
        ]
    
    def get_es_colaborador(self, obj):
        if hasattr(obj, 'es_colaborador'):
            return obj.es_colaborador
        request = self.context.get('request')
        if request and request.user and request.user.is_authenticated:
            return obj.colaboradores_invitados.filter(usuario_invitado=request.user, activo=True).exists()
        return False

class DespachoWriteSerializer(serializers.ModelSerializer):
    nombre_conductor = serializers.CharField(source='id_conductor.nombre_completo', read_only=True)
    nombre_ruta = serializers.CharField(source='id_ruta.codigo_ruta', read_only=True)
    colaboradores_activos = serializers.SerializerMethodField(read_only=True)
    class Meta:
        model = Despacho
        fields = [
            'id_despacho',
            'fecha_programada', 'fecha_salida_real', 'id_camion', 'nombre_ruta',
            'id_conductor', 'id_ruta', 'estado_despacho','nombre_conductor',
            'origen','destino','id_rampla','sucursal_id', 'colaboradores_activos', 'orden_mercancias'
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

                    fecha_inicio_previo = previo.fecha_salida_real.date()
                    
                    if fecha_inicio_previo <= fecha_nueva_prog <= fecha_liberacion:
                        raise serializers.ValidationError({
                            "id_conductor": f"Conflicto de fechas. El conductor estuvo/estará ocupado desde el {fecha_inicio_previo.strftime('%d/%m/%Y')} hasta el {fecha_liberacion.strftime('%d/%m/%Y')}."
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
    rut_cliente = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    telefono_contacto = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    email_contacto = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    direccion = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    direccion2 = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    class Meta:
        model = Cliente
        fields = [
            'id_cliente', 'nombre_cliente', 'precio_kg', 'precio_m3',
            'nombre_contacto', 'ciudad', 'direccion2', 'ciudad2', 'activo', 'empresa',
            'rut_cliente', 'telefono_contacto', 'email_contacto', 'direccion'
        ]
        read_only_fields = ['empresa']
    
    def validate_rut_cliente(self, value):
        if not value:
            return value
        rut_limpio = value.replace(".", "").replace("-", "").strip().upper()
        hash_rut = hashlib.sha256(rut_limpio.encode('utf-8')).hexdigest()
        queryset = Cliente.objects.filter(rut_hash=hash_rut)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError("El cliente con este RUT ya existe en el sistema.")
        return value

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        ret['rut_cliente'] = desencriptar_valor(instance.rut_cliente_cifrado)
        ret['telefono_contacto'] = desencriptar_valor(instance.telefono_cifrado)
        ret['email_contacto'] = desencriptar_valor(instance.email_cifrado)
        ret['direccion'] = desencriptar_valor(instance.direccion_cifrado)
        ret['direccion2'] = desencriptar_valor(instance.direccion_cifrado2)
        
        dir_plana = ret['direccion'] or ''
        ciudad_plana = instance.ciudad or ''
        
        if dir_plana and ciudad_plana:
            ret['destino'] = f"{dir_plana}, {ciudad_plana}"
        else:
            ret['destino'] = dir_plana or ciudad_plana or ""

        tel_plano = ret['telefono_contacto'] or ''
        email_plano = ret['email_contacto'] or ''
        
        if tel_plano and email_plano:
            ret['contacto'] = f"{tel_plano} | {email_plano}"
        else:
            ret['contacto'] = tel_plano or email_plano or ""

        return ret

    def create(self, validated_data):
        rut_plano = validated_data.pop('rut_cliente', None)
        tel_plano = validated_data.pop('telefono_contacto', None)
        email_plano = validated_data.pop('email_contacto', None)
        dir_plano = validated_data.pop('direccion', None)
        dir_plano2 = validated_data.pop('direccion2', None)

        instance = Cliente(**validated_data)
        fernet = Fernet(settings.FIELD_ENCRYPTION_KEY.encode())

        if rut_plano:
            instance.rut_plano_temporal = rut_plano 
            instance.rut_cliente_cifrado = fernet.encrypt(rut_plano.encode('utf-8')).decode('utf-8')
        if tel_plano:
            instance.telefono_cifrado = fernet.encrypt(tel_plano.encode('utf-8')).decode('utf-8')
        if email_plano:
            instance.email_cifrado = fernet.encrypt(email_plano.encode('utf-8')).decode('utf-8')
        if dir_plano:
            instance.direccion_cifrado = fernet.encrypt(dir_plano.encode('utf-8')).decode('utf-8')
        if dir_plano2:
            instance.direccion_cifrado2 = fernet.encrypt(dir_plano2.encode('utf-8')).decode('utf-8')

        instance.save()
        return instance

    def update(self, instance, validated_data):
        rut_plano = validated_data.pop('rut_cliente', None)
        tel_plano = validated_data.pop('telefono_contacto', None)
        email_plano = validated_data.pop('email_contacto', None)
        dir_plano = validated_data.pop('direccion', None)
        dir_plano2 = validated_data.pop('direccion2', None)

        fernet = Fernet(settings.FIELD_ENCRYPTION_KEY.encode())

        if rut_plano:
            instance.rut_plano_temporal = rut_plano
            instance.rut_cliente_cifrado = fernet.encrypt(rut_plano.encode('utf-8')).decode('utf-8')
        if tel_plano:
            instance.telefono_cifrado = fernet.encrypt(tel_plano.encode('utf-8')).decode('utf-8')
        if email_plano:
            instance.email_cifrado = fernet.encrypt(email_plano.encode('utf-8')).decode('utf-8')
        if dir_plano:
            instance.direccion_cifrado = fernet.encrypt(dir_plano.encode('utf-8')).decode('utf-8')
        if dir_plano2:
            instance.direccion_cifrado2 = fernet.encrypt(dir_plano2.encode('utf-8')).decode('utf-8')

        return super().update(instance, validated_data)

class ConductorSerializer(serializers.ModelSerializer):
    rut_conductor = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    telefono = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    numero_licencia = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    class Meta:
        model = Conductor
        fields = ['id_conductor', 'nombre_completo', 'numero_licencia', 'activo', 'empresa', 'rut_conductor', 'telefono']
        read_only_fields = ['empresa']

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        ret['rut_conductor'] = desencriptar_valor(instance.rut_conductor_cifrado)
        ret['telefono'] = desencriptar_valor(instance.telefono_conductor_cifrado)
        ret['numero_licencia'] = desencriptar_valor(instance.licencia_cifrado)
        return ret

    def create(self, validated_data):
        rut_plano = validated_data.pop('rut_conductor', None)
        tel_plano = validated_data.pop('telefono', None)
        lic_plano = validated_data.pop('numero_licencia', None)

        instance = Conductor(**validated_data)
        fernet = Fernet(settings.FIELD_ENCRYPTION_KEY.encode())

        if rut_plano:
            instance.rut_plano_temporal = rut_plano
            instance.rut_conductor_cifrado = fernet.encrypt(rut_plano.encode('utf-8')).decode('utf-8')
        if tel_plano:
            instance.telefono_conductor_cifrado = fernet.encrypt(tel_plano.encode('utf-8')).decode('utf-8')
        if lic_plano:
            instance.licencia_cifrado = fernet.encrypt(lic_plano.encode('utf-8')).decode('utf-8')

        instance.save()
        return instance

    def update(self, instance, validated_data):
        rut_plano = validated_data.pop('rut_conductor', None)
        tel_plano = validated_data.pop('telefono', None)
        lic_plano = validated_data.pop('numero_licencia', None)

        fernet = Fernet(settings.FIELD_ENCRYPTION_KEY.encode())

        if rut_plano:
            instance.rut_plano_temporal = rut_plano
            instance.rut_conductor_cifrado = fernet.encrypt(rut_plano.encode('utf-8')).decode('utf-8')
        if tel_plano:
            instance.telefono_conductor_cifrado = fernet.encrypt(tel_plano.encode('utf-8')).decode('utf-8')
        if lic_plano:
            instance.licencia_cifrado = fernet.encrypt(lic_plano.encode('utf-8')).decode('utf-8')

        return super().update(instance, validated_data)

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
            'accion', 'sucursal_nombre','sucursal_id','detalles'
        ]

class AreaRestringidaSerializer(serializers.ModelSerializer):
    class Meta:
        model = AreaRestringida
        fields = '__all__'
        read_only_fields = ['empresa']


class ProveedorSerializer(serializers.ModelSerializer):
    rut = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    correo = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    telefono = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    class Meta:
        model = Proveedor
        fields = ['id', 'empresa', 'nombre_proveedor', 'contacto', 'activo', 'rut', 'correo', 'telefono']
        read_only_fields = ['empresa']

    def validate_rut(self, value):
        if not value:
            return value
        
        rut_limpio = value.replace(".", "").replace("-", "").strip().upper()
        
        hash_rut = hashlib.sha256(rut_limpio.encode('utf-8')).hexdigest()
        
        queryset = Proveedor.objects.filter(rut_hash=hash_rut)
        
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
            
        if queryset.exists():
            raise serializers.ValidationError("El proveedor con este RUT ya existe en el sistema.")
            
        return value

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        ret['rut'] = desencriptar_valor(instance.rut_cifrado)
        ret['correo'] = desencriptar_valor(instance.correo_cifrado)
        ret['telefono'] = desencriptar_valor(instance.telefono_cifrado)
        return ret

    def create(self, validated_data):
        rut_plano = validated_data.pop('rut', None)
        correo_plano = validated_data.pop('correo', None)
        tel_plano = validated_data.pop('telefono', None)

        instance = Proveedor(**validated_data)
        fernet = Fernet(settings.FIELD_ENCRYPTION_KEY.encode())

        if rut_plano:
            instance.rut_plano_temporal = rut_plano
            instance.rut_cifrado = fernet.encrypt(rut_plano.encode('utf-8')).decode('utf-8')
        if correo_plano:
            instance.correo_cifrado = fernet.encrypt(correo_plano.encode('utf-8')).decode('utf-8')
        if tel_plano:
            instance.telefono_cifrado = fernet.encrypt(tel_plano.encode('utf-8')).decode('utf-8')

        instance.save()
        return instance

    def update(self, instance, validated_data):
        rut_plano = validated_data.pop('rut', None)
        correo_plano = validated_data.pop('correo', None)
        tel_plano = validated_data.pop('telefono', None)

        fernet = Fernet(settings.FIELD_ENCRYPTION_KEY.encode())

        if rut_plano:
            instance.rut_plano_temporal = rut_plano
            instance.rut_cifrado = fernet.encrypt(rut_plano.encode('utf-8')).decode('utf-8')
        if correo_plano:
            instance.correo_cifrado = fernet.encrypt(correo_plano.encode('utf-8')).decode('utf-8')
        if tel_plano:
            instance.telefono_cifrado = fernet.encrypt(tel_plano.encode('utf-8')).decode('utf-8')

        return super().update(instance, validated_data)

class RamplaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Rampla
        fields = '__all__'
        read_only_fields = ['activo', 'empresa']


class CotizacionSerializer(serializers.ModelSerializer):
    colaboradores_activos = serializers.SerializerMethodField()
    usuario_creacion_nombre = serializers.SerializerMethodField()
    class Meta:
        model = Cotizacion
        fields = '__all__'
        read_only_fields = [
            'empresa', 
            'id_usuario_creacion', 
            'fecha_creacion', 
            'fecha_confirmacion'
        ]
    
    def get_colaboradores_activos(self, obj):
        if hasattr(obj, '_prefetched_objects_cache') and 'colaboradores_invitados' in obj._prefetched_objects_cache:
            permisos = [p for p in obj.colaboradores_invitados.all() if p.activo]
        else:
            permisos = obj.colaboradores_invitados.filter(activo=True)
        return [{"id": p.usuario_invitado.id, "username": p.usuario_invitado.username} for p in permisos]
    
    def get_usuario_creacion_nombre(self, obj):
        if obj.id_usuario_creacion:
            return f"{obj.id_usuario_creacion.first_name} {obj.id_usuario_creacion.last_name}".strip() or obj.id_usuario_creacion.username
        return None

class InvitacionColaboradorSerializer(serializers.Serializer):
    usuario_invitado_id = serializers.IntegerField(
        help_text="ID del usuario al que se le dará acceso al despacho."
    )

class InvitacionCotizacionSerializer(serializers.Serializer):
    usuario_invitado_id = serializers.IntegerField(
        help_text="ID del usuario al que se le dará acceso a la cotización"
    )