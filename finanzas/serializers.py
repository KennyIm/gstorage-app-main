from rest_framework import serializers
from .models import DocumentoCobro, PagoRecibido, GastoOperativo, ProveedorGasto
from inventario.models import Mercancia
from decimal import Decimal

class MercanciaPendienteCobroSerializer(serializers.ModelSerializer):
    cliente_nombre = serializers.CharField(source='id_cliente.nombre_cliente', read_only=True)
    cliente_rut = serializers.CharField(source='id_cliente.rut_cliente', read_only=True)
    proveedor_nombre = serializers.CharField(source='id_proveedor.nombre_proveedor', read_only=True)
    destino_nombre = serializers.CharField(source='id_destino.nombre_ciudad', read_only=True)
    despacho_id = serializers.CharField(source='id_despacho.id_despacho', read_only=True)
    codigo_ruta = serializers.CharField(source='id_despacho.id_ruta.codigo_ruta', read_only=True)
    fecha_ingreso = serializers.DateTimeField(format="%Y-%m-%d", read_only=True)
    
    mes = serializers.SerializerMethodField()
    valor_iva = serializers.SerializerMethodField()
    venta_final = serializers.SerializerMethodField()
    numero_documento_asociado = serializers.SerializerMethodField()
    
    descuento_autorizado = serializers.DecimalField(max_digits=12, decimal_places=0, default=0, read_only=True)
    monto_pagado = serializers.DecimalField(max_digits=12, decimal_places=0, default=0, read_only=True)
    deuda = serializers.SerializerMethodField()

    class Meta:
        model = Mercancia
        fields = [
            'id_mercancia', 'mes', 'fecha_ingreso', 'codigo_ruta', 'despacho_id',
            'numero_orden_entrega', 'factura', 'id_cliente', 'cliente_nombre', 'cliente_rut',
            'proveedor_nombre', 'destino_nombre', 'cantidad_bultos', 
            'kg', 'm3', 'precio_total', 'descuento_autorizado', 'valor_iva', 'venta_final',
            'monto_pagado', 'deuda', 'paga_proveedor', 'tipo_documento_pago',
            'estado_cobranza', 'numero_documento_asociado'
        ]

    def get_mes(self, obj):
        if obj.fecha_ingreso:
            meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]
            return meses[obj.fecha_ingreso.month - 1]
        return "-"
    def get_valor_iva(self, obj):
        neto = Decimal(str(obj.precio_total or 0))
        return neto * Decimal('0.19')
    def get_venta_final(self, obj):
        neto = Decimal(str(obj.precio_total or 0))
        iva = neto * Decimal('0.19')
        return neto + iva
    def get_deuda(self, obj):
        neto = Decimal(str(obj.precio_total or 0))
        venta_final = neto + (neto * Decimal('0.19'))
        return venta_final - Decimal(0)
    def get_numero_documento_asociado(self, obj):
        documento = obj.documentos_cobro_asociados.filter(activo=True).first()
        if documento:
            return f"{documento.numero_documento or 'Borrador'}"
        return ""

class DocumentoCobroSerializer(serializers.ModelSerializer):
    fecha_emision = serializers.DateField(format="%Y-%m-%d")
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
    rut_cliente = serializers.CharField(source='cliente_deudor.rut_cliente', read_only=True, default=None)
    rut = serializers.CharField(source='proveedor_deudor.rut', read_only=True, default=None)
    class Meta:
        model = DocumentoCobro
        fields = [
            'id', 'tipo_documento', 'numero_documento',
            'cliente_nombre', 'proveedor_nombre', 'fecha_emision',
            'fecha_vencimiento', 'total_a_pagar', 'saldo_pendiente', 'estado','rut_cliente','rut'
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


class DocumentoCobroDashboardSerializer(serializers.ModelSerializer):
    entidad = serializers.SerializerMethodField()
    rut = serializers.SerializerMethodField()
    
    class Meta:
        model = DocumentoCobro
        fields = [
            'id', 'tipo_documento', 'numero_documento', 'fecha_emision', 
            'fecha_vencimiento', 'subtotal', 'total_a_pagar', 
            'saldo_pendiente', 'estado', 'entidad', 'rut'
        ]

    def get_entidad(self, obj):
        if obj.cliente_deudor:
            return obj.cliente_deudor.nombre_cliente
        if obj.proveedor_deudor:
            return obj.proveedor_deudor.nombre_proveedor
        return "Sin Identificar"

    def get_rut(self, obj):
        if obj.cliente_deudor:
            return obj.cliente_deudor.rut_cliente
        if obj.proveedor_deudor:
            return obj.proveedor_deudor.rut
        return ""