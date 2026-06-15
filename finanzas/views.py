from django.shortcuts import render, get_object_or_404
from rest_framework import generics, status, permissions
from cryptography.fernet import Fernet
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.utils.dateparse import parse_date
from django.db import transaction
from decimal import Decimal
from datetime import timedelta, datetime
import datetime
from django.utils import timezone
from django.db.models import Max, Sum, Q
from django.db.models.functions import ExtractMonth, ExtractYear
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from cryptography.fernet import Fernet
from django.conf import settings

from .models import DocumentoCobro, PagoRecibido, GastoOperativo, ProveedorGasto
from .serializers import MercanciaPendienteCobroSerializer, DocumentoCobroSerializer, DocumentoCobroListSerializer, RegistrarPagoSerializer, GastoOperativoSerializer, ProveedorGastoSerializer,DocumentoCobroDashboardSerializer
from inventario.models import Mercancia, Cliente

class MercanciasPendientesListaAPI(generics.ListAPIView):
    serializer_class = MercanciaPendienteCobroSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        empresa_id = self.request.user.perfil.empresa_id
        return Mercancia.objects.filter(
            empresa_id=empresa_id,
            estado_cobranza='Pendiente'
        ).order_by('fecha_ingreso')


class GenerarCobroAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    parser_classes = [MultiPartParser, FormParser]
    @transaction.atomic
    def post(self, request):
        datos = request.data
        raw_ids = datos.getlist('mercancias_ids') if hasattr(datos, 'getlist') else datos.get('mercancias_ids')
        
        if not raw_ids:
            return Response({"error": "Faltan las mercancías a facturar."}, status=status.HTTP_400_BAD_REQUEST)
            
        if not isinstance(raw_ids, list):
            if isinstance(raw_ids, str) and ',' in raw_ids:
                raw_ids = raw_ids.split(',')
            else:
                raw_ids = [raw_ids]
        mercancias_ids = list(set([int(i) for i in raw_ids if i and str(i).strip()]))
        cliente_id = datos.get('cliente_id')
        tipo_documento = datos.get('tipo_documento', 'Factura')
        condicion_pago = datos.get('condicion_pago', 'Dias_30')
        numero_documento = datos.get('numero_documento')
        fecha_emision_str = datos.get('fecha_emision')
        if fecha_emision_str:
            naive_datetime = datetime.datetime.strptime(fecha_emision_str, '%Y-%m-%d')
            fecha_emision = timezone.make_aware(naive_datetime)
        else:
            fecha_emision = timezone.now()
        archivo_pdf = request.FILES.get('pdf_documento')

        if not mercancias_ids or not cliente_id:
            return Response(
                {"error": "Faltan datos obligatorios"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            empresa = request.user.perfil.empresa
            sucursal = request.user.perfil.sucursal
            cliente = Cliente.objects.get(id_cliente=cliente_id, empresa=empresa)
            if tipo_documento == 'Guia_Cobro' and not numero_documento:
                ultima_guia = DocumentoCobro.objects.filter(
                    empresa=empresa,
                    tipo_documento='Guia_Cobro'
                ).order_by('-numero_documento').first()

                if ultima_guia and ultima_guia.numero_documento:
                    numero_documento = ultima_guia.numero_documento + 1
                else:
                    numero_documento = 1

            mercancias_ids = [int(id) for id in mercancias_ids if id]
            mercancias = Mercancia.objects.select_for_update().filter(
                id_mercancia__in=mercancias_ids, 
                id_cliente=cliente,
                estado_cobranza='Pendiente'
            )

            if mercancias.count() != len(mercancias_ids):
                return Response(
                    {"error": "Conflicto en la selección: algunas mercancías ya no están disponibles."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            primera_m = mercancias.first()
            el_proveedor_paga = primera_m.paga_proveedor
            proveedor_asignado = primera_m.id_proveedor if el_proveedor_paga else None
            subtotal = sum(m.precio_total for m in mercancias)
            subtotal = Decimal(subtotal)
            iva = Decimal('0.19') * subtotal if tipo_documento == 'Factura' else Decimal(0)
            total = subtotal + iva
            dias_plazo = {
                'Contra_Entrega': 0, 'Dias_15': 15, 'Dias_30': 30, 'Dias_45': 45, 'Dias_60': 60
            }.get(condicion_pago, 30)
            vencimiento = fecha_emision + timedelta(days=dias_plazo)
            nuevo_documento = DocumentoCobro.objects.create(
                empresa=empresa,
                sucursal=sucursal,
                cliente_deudor=cliente, 
                proveedor_deudor=proveedor_asignado,
                
                tipo_documento=tipo_documento,
                condicion_pago=condicion_pago,
                fecha_vencimiento=vencimiento,
                fecha_emision=fecha_emision,
                numero_documento=numero_documento,
                pdf_documento=archivo_pdf,
                subtotal=subtotal,
                iva=iva,
                total_a_pagar=total,
                saldo_pendiente=total,
                estado='Emitido'
            )
            nuevo_documento.mercancias_asociadas.set(mercancias)
            mercancias.update(estado_cobranza='En_Proceso', tipo_documento_pago=tipo_documento)

            nuevo_documento.refresh_from_db()

            serializer = DocumentoCobroSerializer(nuevo_documento)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except Cliente.DoesNotExist:
            return Response({"error": "Cliente no encontrado."}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        

class DocumentosEmitidosListaAPIView(generics.ListAPIView):
    serializer_class = DocumentoCobroListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        empresa_id = self.request.user.perfil.empresa_id
        return DocumentoCobro.objects.filter(empresa_id=empresa_id).order_by('-fecha_emision', '-id')
    

class RegistrarPagoAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    parser_classes = [MultiPartParser, FormParser]

    @transaction.atomic
    def post(self, request):
        serializer = RegistrarPagoSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        datos = serializer.validated_data
        
        documento_id = datos.get('documento_id')
        monto_pagado = datos.get('monto_pagado')
        medio_pago = datos.get('medio_pago')
        numero_operacion_banco = datos.get('numero_operacion_banco', '').strip()

        if medio_pago == 'Efectivo' and not numero_operacion_banco:
            total_efectivo = PagoRecibido.objects.filter(
                empresa=request.user.perfil.empresa,
                medio_pago='Efectivo'
            ).count()
            numero_operacion_banco = f"CAJA-{total_efectivo + 1:04d}"
        elif medio_pago in ['Cheque_Dia', 'Cheque_Fecha'] and not numero_operacion_banco:
            numero_operacion_banco = "S/N Cheque"
        
        comprobante_archivo = datos.get('comprobante_banco')

        try:
            documento = DocumentoCobro.objects.select_for_update().get(
                id=documento_id,
                empresa=request.user.perfil.empresa
            )

            if documento.saldo_pendiente <= 0:
                return Response({"error": "Este documento ya está pagado en su totalidad."}, status=status.HTTP_400_BAD_REQUEST)
            
            monto_pago = Decimal(str(monto_pagado))

            if monto_pago > documento.saldo_pendiente:
                return Response({"error": f"El pago (${monto_pago}) supera el saldo pendiente (${documento.saldo_pendiente})."}, status=status.HTTP_400_BAD_REQUEST)
            
            PagoRecibido.objects.create(
                empresa=request.user.perfil.empresa,
                documento_pagado=documento,
                monto_pagado=monto_pago,
                medio_pago=medio_pago,
                numero_operacion_banco=numero_operacion_banco,
                comprobante_banco=comprobante_archivo
            )

            documento.saldo_pendiente -= monto_pago

            if documento.saldo_pendiente == 0:
                documento.estado = 'Pagado'
                documento.mercancias_asociadas.update(estado_cobranza='Pagado')
            else:
                documento.estado = 'Abonado'
            
            documento.save()

            return Response({"mensaje": "Pago registrado correctamente", "nuevo_saldo":documento.saldo_pendiente}, status=status.HTTP_200_OK)
        
        except DocumentoCobro.DoesNotExist:
            return Response({"error": "Documento no encontrado."}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



class PerfilFinancieroClienteAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    def get(self, request, cliente_id):
        empresa = request.user.perfil.empresa

        try:
            cliente = Cliente.objects.get(id_cliente=cliente_id, empresa=empresa)

            mercancias_sueltas = Mercancia.objects.filter(
                id_cliente=cliente,
                estado_cobranza='Pendiente',
                activo=True
            ).select_related('id_proveedor')

            documentos = DocumentoCobro.objects.filter(
                cliente_deudor=cliente,
                activo=True
            ).select_related('proveedor_deudor').prefetch_related('pagos')

            historial_unificado = []

            monto_sin_facturar = 0
            monto_facturado = 0
            monto_pagado = 0

            for m in mercancias_sueltas:
                monto_sin_facturar += m.precio_total
                historial_unificado.append({
                    'id_unico': f"mer_{m.id_mercancia}",
                    'tipo_registro': 'Sin_Facturar',
                    'numero': m.numero_orden_entrega or f"Int-{m.id_mercancia}",
                    'proveedor_nombre': m.id_proveedor.nombre_proveedor if m.id_proveedor else "N/A",
                    'paga_proveedor': m.paga_proveedor,
                    'fecha': m.fecha_ingreso.strftime('%Y-%m-%d'),
                    'monto': m.precio_total,
                    'estado': 'Sin Facturar'
                })

            for d in documentos:
                fecha_final = d.fecha_emision.strftime('%Y-%m-%d')
                if d.estado == 'Pagado':
                    monto_pagado += d.total_a_pagar
                    ultimo_pago = d.pagos.aggregate(ultimo=Max('fecha_pago'))['ultimo']
                    if ultimo_pago:
                        fecha_final = ultimo_pago.strftime('%Y-%m-%d')
                else:
                    monto_facturado += d.total_a_pagar
                
                historial_unificado.append({
                    'id_unico' : f"doc_{d.id}",
                    'tipo_registro' : 'Documento',
                    'numero' : d.numero_documento or f"Borrador-{d.id}",
                    'proveedor_nombre' : d.proveedor_deudor.nombre_proveedor if d.proveedor_deudor else "N/A",
                    'paga_proveedor' : d.proveedor_deudor is not None,
                    'fecha' : fecha_final,
                    'monto' : d.total_a_pagar,
                    'estado' : d.get_estado_display()
                })
            
            rut_desencriptado = ""
            if cliente.rut_cliente_cifrado:
                try:
                    fernet = Fernet(settings.FIELD_ENCRYPTION_KEY.encode())
                    rut_desencriptado = fernet.decrypt(cliente.rut_cliente_cifrado.encode('utf-8')).decode('utf-8')
                except Exception:
                    rut_desencriptado = "Error al desencriptar"


            payload = {
                'cliente':{
                    'nombre': cliente.nombre_cliente,
                    'rut': rut_desencriptado
                },
                'metricas': {
                    'sin_facturar': float(monto_sin_facturar),
                    'facturado': float(monto_facturado),
                    'pagado': float(monto_pagado),
                },
                'historial': historial_unificado
            }
            return Response(payload, status=status.HTTP_200_OK)
        
        except Cliente.DoesNotExist:
            return Response({"error": "Cliente no encontrado."}, status=status.HTTP_404_NOT_FOUND)

class GastoOperativoListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = GastoOperativoSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        empresa_id = self.request.user.perfil.empresa_id
        return GastoOperativo.objects.filter(
            empresa_id=empresa_id, 
            activo=True
        ).order_by('-fecha_gasto', '-id')
    
class ProveedorGastoListCreateAPIView(generics.ListCreateAPIView): 
    serializer_class = ProveedorGastoSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return ProveedorGasto.objects.filter(
            empresa_id=self.request.user.perfil.empresa_id, 
            activo=True
        ).order_by('nombre_proveedor')

    def perform_create(self, serializer):
        serializer.save(empresa=self.request.user.perfil.empresa)


class PagarGastoOperativoAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    parser_classes = [MultiPartParser, FormParser]
    def patch(self, request, pk):
        try:
            gasto = GastoOperativo.objects.get(
                id=pk, 
                empresa=request.user.perfil.empresa, 
                activo=True
            )
            if gasto.estado == 'Pagado':
                return Response({"error": "Este gasto ya se encuentra totalmente liquidado."}, status=status.HTTP_400_BAD_REQUEST)            
            archivo_respaldo = request.FILES.get('comprobante_adjunto')
            if archivo_respaldo:
                gasto.comprobante_adjunto = archivo_respaldo
            
            gasto.estado = 'Pagado'
            gasto.save()
            
            return Response({"mensaje": "Gasto liquidado con éxito."}, status=status.HTTP_200_OK)
            
        except GastoOperativo.DoesNotExist:
            return Response({"error": "Gasto operativo no encontrado."}, status=status.HTTP_404_NOT_FOUND)
        

class DashboardFinanzasConsolidadoAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        empresa_id = request.user.perfil.empresa_id
        hoy = datetime.date.today()
        documentos_qs = DocumentoCobro.objects.filter(
            empresa_id=empresa_id, 
            activo=True
        ).select_related('cliente_deudor', 'proveedor_deudor').order_by('-fecha_emision')
        
        documentos_serializer = DocumentoCobroDashboardSerializer(documentos_qs, many=True)
        gastos_mensuales = GastoOperativo.objects.filter(
            empresa_id=empresa_id,
            activo=True,
            fecha_gasto__year=hoy.year
        ).annotate(
            mes=ExtractMonth('fecha_gasto')
        ).values('mes').annotate(
            total=Sum('monto_total')
        ).order_by('mes')
        ventas_mensuales = DocumentoCobro.objects.filter(
            empresa_id=empresa_id,
            activo=True,
            fecha_emision__year=hoy.year
        ).annotate(
            mes=ExtractMonth('fecha_emision')
        ).values('mes').annotate(
            facturado=Sum('subtotal', filter=Q(tipo_documento='Factura')),
            no_facturado=Sum('subtotal', filter=Q(tipo_documento='Guia_Cobro'))
        ).order_by('mes')

        tendencias_map = {}
        for m in range(1, 13):
            mes_str = f"{hoy.year}-{str(m).zfill(2)}"
            tendencias_map[m] = {
                "mes": mes_str, 
                "ventas_facturadas": 0,    
                "ventas_por_facturar": 0,
                "compras": 0
            }
        for v in ventas_mensuales:
            m_id = v['mes']
            if m_id in tendencias_map:
                tendencias_map[m_id]['ventas_facturadas'] = float(v['facturado'] or 0)
                tendencias_map[m_id]['ventas_por_facturar'] = float(v['no_facturado'] or 0)
        for g in gastos_mensuales:
            m_id = g['mes']
            if m_id in tendencias_map:
                tendencias_map[m_id]['compras'] = float(g['total'] or 0)

        total_por_pagar = GastoOperativo.objects.filter(
            empresa_id=empresa_id,
            estado='Pendiente',
            activo=True
        ).aggregate(total=Sum('monto_total'))['total'] or 0

        payload = {
            "saldo_bancos": 50000000, 
            "cuentas_por_pagar_exigible": float(total_por_pagar),
            "documentos": documentos_serializer.data,
            "grafico_mensual": list(tendencias_map.values())
        }

        return Response(payload, status=status.HTTP_200_OK)