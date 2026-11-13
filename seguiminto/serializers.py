from rest_framework import serializers
from .models import ComprobanteEntrega, ControlEntrega, LlamadaTelefonica, EventoTelefonico
from inventario.models import Mercancia

class ComprobanteEntregaSerializer(serializers.ModelSerializer):
    class Meta:
        model = ComprobanteEntrega
        fields = [
            'id_comprobante',
            'mercancia',
            'despacho',
            'url_archivo',
            'nombre_original',
            'observaciones',
            'fecha_subida'
        ]
        read_only_fields = ['id_comprobante', 'fecha_subida']

class ControlEntregaSerializer(serializers.ModelSerializer):
    foto_comprobante_url = serializers.SerializerMethodField()

    class Meta:
        model = ControlEntrega
        fields = [
            'id',
            'estado_entrega',
            'fecha_entrega',
            'latitud_entrega',
            'longitud_entrega',
            'foto_comprobante',
            'foto_comprobante_url',
            'observaciones'
        ]

    def get_foto_comprobante_url(self, obj):
        request = self.context.get('request')
        if obj.foto_comprobante and hasattr(obj.foto_comprobante, 'url'):
            if request is not None:
                return request.build_absolute_uri(obj.foto_comprobante.url)
            return obj.foto_comprobante.url
        return None


class MercanciaSeguimientoSerializer(serializers.ModelSerializer):
    control_entrega = ControlEntregaSerializer(read_only=True)
    cliente_nombre = serializers.SerializerMethodField()
    destino_nombre = serializers.SerializerMethodField()

    class Meta:
        model = Mercancia
        fields = [
            'id_mercancia',
            'tipo_documento_mercancia',
            'factura',
            'numero_orden_entrega',
            'codigo_interno',
            'cliente_nombre',
            'destino_nombre',
            'direccion_entrega',
            'cantidad_bultos',
            'tipo',
            'kg',
            'm3',
            'estado',
            'control_entrega'
        ]

    def get_cliente_nombre(self, obj):
        if hasattr(obj, 'id_cliente') and obj.id_cliente:
            return obj.id_cliente.nombre_cliente
        return getattr(obj, 'nombre_cliente', '') or 'Sin Cliente'

    def get_destino_nombre(self, obj):
        if hasattr(obj, 'id_destino') and obj.id_destino:
            return obj.id_destino.nombre_ciudad
        return getattr(obj, 'nombre_destino', '') or 'Sin Destino'


# ******** SERIALIZERS PARA LAS LLAMADAS ******** #

class EventoTelefonicoSerializer(serializers.ModelSerializer):
    class Meta:
        model = EventoTelefonico
        fields = [
            'id',
            'tipo_evento',
            'destino',
            'motivo_fallo',
            'payload',
            'creado_en',
        ]


class LlamadaTelefonicaListSerializer(serializers.ModelSerializer):
    estado_final_display = serializers.CharField(
        source='get_estado_final_display',
        read_only=True
    )
    duracion_segundos = serializers.SerializerMethodField()
    total_eventos = serializers.IntegerField(source='eventos.count', read_only=True)

    class Meta:
        model = LlamadaTelefonica
        fields = [
            'unique_id',
            'origen',
            'bodega_seleccionada',
            'estado_final',
            'estado_final_display',
            'paga_proveedor',
            'fecha_inicio',
            'fecha_fin',
            'duracion_segundos',
            'total_eventos',
        ]

    def get_duracion_segundos(self, obj):
        if obj.fecha_inicio and obj.fecha_fin:
            return int((obj.fecha_fin - obj.fecha_inicio).total_seconds())
        return None


class LlamadaTelefonicaDetailSerializer(LlamadaTelefonicaListSerializer):
    eventos = EventoTelefonicoSerializer(many=True, read_only=True)

    class Meta(LlamadaTelefonicaListSerializer.Meta):
        fields = LlamadaTelefonicaListSerializer.Meta.fields + ['eventos']