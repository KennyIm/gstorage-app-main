from django.db import models
from django.utils import timezone

from inventario.models import Empresa, Sucursal, Cliente, Proveedor, Mercancia, Camion, Conductor, Despacho


class DocumentoCobro(models.Model):
    TIPOS_DOCUMENTO = [
        ('Factura', 'Factura Electrónica'),
        ('Guia_Cobro', 'Guía de Cobro (Sin Factura)'),
    ]

    ESTADOS_PAGO = [
        ('Emitido', 'Emitido (Por Pagar)'),
        ('Abonado', 'Abonado (Pago Parcial)'),
        ('Pagado', 'Pagado Totalmente'),
        ('Anulado', 'Anulado')
    ]

    CONDICIONES_PAGO = [
        ('Contra_Entrega', 'Contra Entrega'),
        ('Dias_15', '15 Días'),
        ('Dias_30', '30 Días'),
        ('Dias_45', '45 Días'),
        ('Dias_60', '60 Días'),
    ]

    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name="documentos_cobro")
    sucursal = models.ForeignKey(Sucursal, on_delete=models.CASCADE)
    cliente_deudor = models.ForeignKey(Cliente, on_delete=models.PROTECT, null=True, blank=True, related_name="cobros")
    proveedor_deudor = models.ForeignKey(Proveedor, on_delete=models.PROTECT, null=True, blank=True, related_name="cobros")
    tipo_documento = models.CharField(max_length=20, choices=TIPOS_DOCUMENTO, default='Factura')
    numero_documento = models.IntegerField(null=True, blank=True, verbose_name="Folio SII o N° Interno")
    mercancias_asociadas = models.ManyToManyField(Mercancia, related_name="documentos_cobro_asociados")
    fecha_emision = models.DateField(default=timezone.now)
    condicion_pago = models.CharField(max_length=20, choices=CONDICIONES_PAGO, default='Dias_30')
    fecha_vencimiento = models.DateField(verbose_name="Vence el")
    subtotal = models.DecimalField(max_digits=12, decimal_places=0, default=0)
    iva = models.DecimalField(max_digits=12, decimal_places=0, default=0)
    total_a_pagar = models.DecimalField(max_digits=12, decimal_places=0, default=0)
    saldo_pendiente = models.DecimalField(max_digits=12, decimal_places=0, default=0, verbose_name="Monto por Pagar")
    estado = models.CharField(max_length=20, choices=ESTADOS_PAGO, default='Emitido')
    pdf_documento = models.FileField(upload_to='cobranzas/', null=True, blank=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    activo = models.BooleanField(default=True)

    def __str__(self):
        deudor = self.cliente_deudor.nombre_cliente if self.cliente_deudor else (self.proveedor_deudor.nombre_proveedor if self.proveedor_deudor else "Sin Deudor")
        folio = f"#{self.numero_documento}" if self.numero_documento else "(Borrador)"
        return f"{self.tipo_documento} {folio} - {deudor}"



class PagoRecibido(models.Model):
    MEDIOS_PAGO = [
        ('Transferencia', 'Transferencia Bancaria'),
        ('Efectivo', 'Efectivo'),
        ('Cheque_Dia', 'Cheque al Día'),
        ('Cheque_Fecha', 'Cheque a Fecha')
    ]

    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name="pagos_recibidos")
    documento_pagado = models.ForeignKey(DocumentoCobro, on_delete=models.PROTECT, related_name="pagos")
    fecha_pago = models.DateField(default=timezone.now, verbose_name="Fecha en el Banco")
    monto_pagado = models.DecimalField(max_digits=12, decimal_places=0)
    medio_pago = models.CharField(max_length=20, choices=MEDIOS_PAGO, default='Transferencia')
    numero_operacion_banco = models.CharField(max_length=100, null=True, blank=True, verbose_name="N° Transferencia / Cheque")
    comprobante_banco = models.FileField(upload_to='comprobantes_banco/', null=True, blank=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Abono ${self.monto_pagado} a Documento {self.documento_pagado.id}"
    
class ProveedorGasto(models.Model):
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name="proveedores_gastos")
    nombre_proveedor = models.CharField(max_length=120, verbose_name="Nombre o Razón Social")
    rut_proveedor = models.CharField(max_length=15, unique=True, null=True, blank=True, verbose_name="RUT Proveedor")
    activo = models.BooleanField(default=True)

    def __str__(self):
        return self.nombre_proveedor

class GastoOperativo(models.Model):
    TIPOS_GASTO = [
        ('Combustible', 'Combustible'),
        ('Peaje', 'Peaje'),
        ('Mantenimiento', 'Mantenimiento / Taller'),
        ('Viatico', 'Viático de Conductor'),
        ('Servicio Externo', 'Flete Externo / Proveedor'),
        ('Administrativo', 'Gasto Administrativo')
    ]
    
    ESTADOS_GASTO = [
        ('Pendiente', 'Pendiente de Pago'),
        ('Pagado', 'Pagado')
    ]

    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name="gastos")
    proveedor = models.ForeignKey(ProveedorGasto, on_delete=models.PROTECT, related_name="gastos_asociados", null=True, blank=True)
    tipo_gasto = models.CharField(max_length=50, choices=TIPOS_GASTO)
    descripcion = models.CharField(max_length=255, verbose_name="Descripción del Gasto")
    camion_asociado = models.ForeignKey(Camion, on_delete=models.SET_NULL, null=True, blank=True, related_name="gastos")
    conductor_asociado = models.ForeignKey(Conductor, on_delete=models.SET_NULL, null=True, blank=True, related_name="viaticos")
    despacho_asociado = models.ForeignKey(Despacho, on_delete=models.SET_NULL, null=True, blank=True, related_name="gastos_ruta")
    numero_documento = models.CharField(max_length=50, null=True, blank=True, verbose_name="N° Boleta/Factura")
    fecha_gasto = models.DateField(default=timezone.now)
    monto_total = models.DecimalField(max_digits=12, decimal_places=0)
    estado = models.CharField(max_length=20, choices=ESTADOS_GASTO, default='Pendiente')
    comprobante_adjunto = models.FileField(upload_to='comprobantes_gastos/', null=True, blank=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    activo = models.BooleanField(default=True)

    def __str__(self):
        return f"Gasto {self.tipo_gasto} - ${self.monto_total}"