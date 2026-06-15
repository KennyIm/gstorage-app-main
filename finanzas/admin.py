from django.contrib import admin
from django.utils.html import format_html
from .models import DocumentoCobro, PagoRecibido, ProveedorGasto, GastoOperativo

class PagoRecibidoInline(admin.TabularInline):
    model = PagoRecibido
    extra = 1 
    fields = ('fecha_pago', 'monto_pagado', 'medio_pago', 'numero_operacion_banco', 'comprobante_banco')
    raw_id_fields = ('empresa',)



@admin.register(DocumentoCobro)
class DocumentoCobroAdmin(admin.ModelAdmin):
    def deudor(self, obj):
        if obj.cliente_deudor:
            return format_html(f'<span style="color: #0284c7;">👤 Cliente: {obj.cliente_deudor.nombre_cliente}</span>')
        if obj.proveedor_deudor:
            return format_html(f'<span style="color: #b45309;">🏢 Prov: {obj.proveedor_deudor.nombre_proveedor}</span>')
        return "Sin deudor"
    deudor.short_description = "Deudor / Entidad"

    list_display = (
        'id', 
        'numero_documento', 
        'tipo_documento', 
        'deudor', 
        'total_a_pagar', 
        'saldo_pendiente', 
        'estado', 
        'fecha_emision',
        'activo'
    )
    
    list_filter = (
        'estado', 
        'tipo_documento', 
        'condicion_pago', 
        'fecha_emision', 
        'activo',
        'sucursal'
    )
    
    search_fields = (
        'numero_documento', 
        'cliente_deudor__nombre_cliente', 
        'proveedor_deudor__nombre_proveedor'
    )
    
    filter_horizontal = ('mercancias_asociadas',)
    
    inlines = [PagoRecibidoInline]
    
    ordering = ('-fecha_emision', '-id')

    fieldsets = (
        ('Estructura Corporativa', {
            'fields': ('empresa', 'sucursal', 'activo')
        }),
        ('Clasificación Tributaria', {
            'fields': ('tipo_documento', 'numero_documento', 'estado')
        }),
        ('Entidades Asociadas', {
            'fields': ('cliente_deudor', 'proveedor_deudor', 'mercancias_asociadas'),
            'description': 'Selecciona solo una entidad deudora por documento.'
        }),
        ('Plazos Contables', {
            'fields': ('fecha_emision', 'condicion_pago', 'fecha_vencimiento'),
        }),
        ('Valores Financieros ($)', {
            'fields': ('subtotal', 'iva', 'total_a_pagar', 'saldo_pendiente'),
        }),
        ('Archivos Adjuntos', {
            'fields': ('pdf_documento',),
        }),
    )



@admin.register(PagoRecibido)
class PagoRecibidoAdmin(admin.ModelAdmin):
    list_display = ('id', 'documento_pagado', 'monto_pagado', 'medio_pago', 'fecha_pago', 'numero_operacion_banco')
    list_filter = ('medio_pago', 'fecha_pago', 'empresa')
    search_fields = ('numero_operacion_banco', 'documento_pagado__numero_documento')
    raw_id_fields = ('documento_pagado', 'empresa')


@admin.register(ProveedorGasto)
class ProveedorGastoAdmin(admin.ModelAdmin):
    list_display = ('id', 'nombre_proveedor', 'rut_proveedor', 'activo', 'empresa')
    list_filter = ('activo', 'empresa')
    search_fields = ('nombre_proveedor', 'rut_proveedor')


@admin.register(GastoOperativo)
class GastoOperativoAdmin(admin.ModelAdmin):
    def camion(self, obj):
        return obj.camion_asociado.patente if obj.camion_asociado else "-"
    camion.short_description = "Camión"

    list_display = (
        'id', 
        'tipo_gasto', 
        'proveedor', 
        'camion', 
        'despacho_asociado', 
        'monto_total', 
        'estado', 
        'fecha_gasto'
    )
    
    list_filter = (
        'tipo_gasto', 
        'estado', 
        'fecha_gasto', 
        'empresa',
        'camion_asociado'
    )
    
    search_fields = (
        'numero_documento', 
        'descripcion', 
        'proveedor__nombre_proveedor', 
        'conductor_asociado__nombre_conductor',
        'despacho_asociado__id_despacho'
    )
    
    raw_id_fields = ('proveedor', 'camion_asociado', 'conductor_asociado', 'despacho_asociado', 'empresa')
    
    ordering = ('-fecha_gasto', '-id')