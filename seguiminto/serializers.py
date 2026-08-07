from rest_framework import serializers
from .models import ComprobanteEntrega, ControlEntrega

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