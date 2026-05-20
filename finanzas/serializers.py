from rest_framework import serializers
from .models import DocumentoCobro, PagoRecibido, GastoOperativo, ProveedorGasto
from inventario.models import Mercancia

class MercanciaPendienteCobroSerializer(serializers.ModelSerializer):
    cliente_nombre = serializers.CharField(source='id_cliente.nombre_cliente', read_only=True)
    destino_nombre = serializers.CharField(source='id_destino.nombre_ciudad', read_only=True)
    despacho_id = serializers.CharField(source='id_despacho.id_despacho', read_only=True)
    cliente_rut = serializers.CharField(source='id_cliente.rut_cliente', read_only=True)
    codigo_ruta = serializers.CharField(source='id_despacho.id_ruta.codigo_ruta', read_only=True)

    fecha_ingreso = serializers.DateTimeField(format="%Y-%m-%d", read_only=True)
    

    class Meta:
        model = Mercancia
        fields = [
            'id_mercancia', 'cliente_nombre', 'id_cliente', 'destino_nombre',
            'despacho_id', 'cantidad_bultos', 'kg', 'm3','cliente_rut',
            'precio_total', 'tipo_documento_pago', 'fecha_ingreso', 'codigo_ruta',
            'numero_orden_entrega',
        ]

class DocumentoCobroSerializer(serializers.ModelSerializer):
    fecha_emision = serializers.DateTimeField(format="%Y-%m-%d", read_only=True)
    fecha_vencimiento = serializers.DateField(format="%Y-%m-%d")
    class Meta:
        model = DocumentoCobro
        fields = '__all__'
        read_only_fields = [
            'subtotal', 'iva', 'total_a_pagar', 'saldo_pendiente', 'estado'
        ]


class DocumentoCobroListSerializer(serializers.ModelSerializer):
    cliente_nombre = serializers.CharField(source='cliente_deudor.nombre_cliente', read_only=True, default="N/A")
    proveedor_nombre = serializers.CharField(source='proveedor_deudor.nombre_proveedor', read_only=True, default="N/A")
    class Meta:
        model = DocumentoCobro
        fields = [
            'id', 'tipo_documento', 'numero_documento',
            'cliente_nombre', 'proveedor_nombre', 'fecha_emision',
            'fecha_vencimiento', 'total_a_pagar', 'saldo_pendiente', 'estado'
        ]

class RegistrarPagoSerializer(serializers.Serializer):
    documento_id = serializers.IntegerField()
    monto_pagado = serializers.DecimalField(max_digits=12, decimal_places=0)
    medio_pago = serializers.CharField(max_length=20)
    numero_operacion_banco = serializers.CharField(max_length=100, required=False, allow_blank=True)
    comprobante_banco = serializers.FileField(required=False, allow_null=True)

class GastoOperativoSerializer(serializers.ModelSerializer):
    proveedor_nombre = serializers.CharField(source='proveedor.nombre_proveedor', read_only=True, default="N/A")
    camion_patente = serializers.CharField(source='camion_asociado.patente', read_only=True, default="N/A")
    conductor_nombre = serializers.CharField(source='conductor_asociado.nombre_conductor', read_only=True, default="N/A")
    
    class Meta:
        model = GastoOperativo
        fields = '__all__'
        read_only_fields = ['empresa', 'fecha_creacion', 'activo']

    def create(self, validated_data):
        request = self.context.get('request')
        if request and hasattr(request.user, 'perfil'):
            validated_data['empresa'] = request.user.perfil.empresa
        return super().create(validated_data)

class ProveedorGastoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProveedorGasto
        fields = ['id', 'nombre_proveedor', 'rut_proveedor']
