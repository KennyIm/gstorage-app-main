import uuid
from django.shortcuts import render
from django.db.models import Q, Count, Prefetch
import boto3
import os
from datetime import timedelta
from django.utils import timezone
from django.db import transaction
from rest_framework import status, viewsets, filters
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination
from rest_framework import permissions
from rest_framework.decorators import action
from django.core.files.storage import default_storage
from inventario.models import Mercancia
from .models import ControlEntrega, ComprobanteEntrega, LlamadaTelefonica, EventoTelefonico
from .serializers import ComprobanteEntregaSerializer, ControlEntregaSerializer, MercanciaSeguimientoSerializer, EventoTelefonicoSerializer, LlamadaTelefonicaDetailSerializer, LlamadaTelefonicaListSerializer

from inventario.models import Despacho
from inventario.serializers import DespachoListSerializer, MercanciaListSerializer
from django.conf import settings
import requests



class DespachosMovilActivosAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        ahora = timezone.now()
        anio_actual = ahora.year
        mes_actual = ahora.month
        filtro_en_curso = ~Q(estado_despacho__in=['Eliminado', 'Cancelado', 'Finalizado'])

        primer_dia_mes = ahora.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        ventana_mes_anterior = primer_dia_mes - timedelta(days=3)

        filtro_finalizados_mes_actual = (
            Q(estado_despacho='Finalizado') & (
                Q(fecha_salida_real__year=anio_actual, fecha_salida_real__month=mes_actual) |
                Q(fecha_salida_real__gte=ventana_mes_anterior, fecha_salida_real__lt=primer_dia_mes) |
                Q(fecha_salida_real__isnull=True, fecha_programada__year=anio_actual, fecha_programada__month=mes_actual)
            )
        )

        queryset = Despacho.objects.filter(
            activo=True
        ).exclude(
            estado_despacho__in=['Eliminado', 'Cancelado']
        ).filter(
            filtro_en_curso | filtro_finalizados_mes_actual,
            mercancia__activo=True
        ).distinct().order_by('-id_despacho')

        serializer = DespachoListSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class MercanciasDespachoMovilAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, id_despacho):
        mercancias = Mercancia.objects.filter(
            id_despacho_id=id_despacho,
            activo=True
        ).select_related('control_entrega', 'id_cliente', 'id_destino').order_by('id_mercancia')

        serializer = MercanciaSeguimientoSerializer(
            mercancias, 
            many=True, 
            context={'request': request}
        )
        return Response(serializer.data, status=status.HTTP_200_OK)


class GenerarPresignedUrlPODAPIView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        nombre_original = request.data.get('nombre_archivo', 'foto.jpg')
        content_type = request.data.get('content_type', 'image/jpeg')
        
        extension = os.path.splitext(nombre_original)[1] or '.jpg'
        timestamp = timezone.now().strftime("%Y%m%d_%H%M%S")
        key = f"comprobantes_entrega/pod_{timestamp}{extension}"

        s3_client = boto3.client('s3', region_name='us-east-1')

        try:
            upload_url = s3_client.generate_presigned_url(
                'put_object',
                Params={
                    'Bucket': 'gstorage-media-medalla',
                    'Key': key,
                    'ContentType': content_type
                },
                ExpiresIn=300
            )

            return Response({
                "upload_url": upload_url,
                "file_path": key,
                "nombre_guardado": nombre_original
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": f"Error al generar URL S3: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class RegistrarEntregaAPIView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def patch(self, request, id_mercancia=None):
        mercancia_ids = request.data.get('mercancia_ids', [])
        if isinstance(mercancia_ids, str):
            mercancia_ids = [i.strip() for i in mercancia_ids.split(',') if i.strip()]
        elif not isinstance(mercancia_ids, list):
            mercancia_ids = [str(mercancia_ids)]

        if not mercancia_ids and id_mercancia:
            mercancia_ids = [str(id_mercancia)]

        if not mercancia_ids:
            return Response({"error": "Debe especificar al menos una mercancía."}, status=status.HTTP_400_BAD_REQUEST)
        foto_path = request.data.get('foto_path')
        if not foto_path and 'foto_comprobante' in request.FILES:
            from django.core.files.storage import default_storage
            archivo = request.FILES['foto_comprobante']
            timestamp = timezone.now().strftime("%Y%m%d_%H%M%S")
            foto_path = default_storage.save(f"comprobantes_entrega/pod_{timestamp}_{archivo.name}", archivo)
        mercancias = Mercancia.objects.filter(
            Q(id_mercancia__in=mercancia_ids) | Q(pk__in=mercancia_ids)
        )

        if not mercancias.exists():
            return Response({"error": "Mercancías no encontradas."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            with transaction.atomic():
                ahora = timezone.now()

                for m in mercancias:
                    control, _ = ControlEntrega.objects.get_or_create(mercancia=m)
                    control.estado_entrega = 'Recibido'
                    control.fecha_entrega = ahora
                    if foto_path:
                        control.foto_comprobante.name = foto_path
                    control.save()

                mercancias.update(estado='Recibido')

            return Response({
                "mensaje": f"¡POD de ruta guardado y estado marcado como Recibido para {mercancias.count()} carga(s)!",
                "mercancia_ids": list(mercancias.values_list('id_mercancia', flat=True))
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": f"Error en BD: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class RegistrarIncidenciaAPIView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = (JSONParser, FormParser, MultiPartParser)

    def patch(self, request, id_mercancia):
        try:
            mercancia = Mercancia.objects.get(pk=id_mercancia, activo=True)
        except Mercancia.DoesNotExist:
            return Response(
                {"error": "La mercancía no existe o está inactiva."},
                status=status.HTTP_404_NOT_FOUND,
            )
        estado_entrega = request.data.get("estado_entrega", "No_Domicilio")
        observaciones = request.data.get("observaciones", "")
        with transaction.atomic():
            control, _ = ControlEntrega.objects.get_or_create(mercancia=mercancia)
            control.estado_entrega = estado_entrega
            control.observaciones = observaciones
            control.fecha_entrega = timezone.now()
            control.save()
            mercancia.estado = "En Observacion"
            mercancia.save(update_fields=["estado"])
        return Response(
            {"mensaje": "Incidencia registrada. Mercancía marcada en observación."},
            status=status.HTTP_200_OK,
        )


class ConsultarControlEntregaAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, id_mercancia):
        try:
            control = ControlEntrega.objects.select_related('mercancia').get(mercancia_id=id_mercancia)
            serializer = ControlEntregaSerializer(control, context={'request': request})
            return Response(serializer.data, status=status.HTTP_200_OK)
        except ControlEntrega.DoesNotExist:
            return Response(None, status=status.HTTP_200_OK)


class ComprobanteEntregaViewSet(viewsets.ModelViewSet):
    serializer_class = ComprobanteEntregaSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)

    def get_queryset(self):
        queryset = ComprobanteEntrega.objects.select_related(
            "mercancia", "despacho"
        ).all()
        id_despacho = self.request.query_params.get("id_despacho")
        id_mercancia = self.request.query_params.get("id_mercancia")
        if id_despacho:
            queryset = queryset.filter(despacho_id=id_despacho)
        if id_mercancia:
            queryset = queryset.filter(mercancia_id=id_mercancia)
        return queryset

    @action(detail=False, methods=["post"], url_path="subir-masivo")
    def subir_masivo(self, request):
        archivo = request.FILES.get("archivo")
        id_despacho = request.data.get("despacho")
        mercancia_ids = request.data.getlist("mercancia_ids")
        observaciones = request.data.get("observaciones", "")
        if not archivo:
            return Response(
                {"error": "Debe adjuntar un archivo válido (PDF o Imagen)."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not mercancia_ids:
            return Response(
                {"error": "Debe seleccionar al menos una mercancía."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            with transaction.atomic():
                path = default_storage.save(f"comprobantes/{archivo.name}", archivo)
                url_absoluta = request.build_absolute_uri(default_storage.url(path))
                comprobantes_a_crear = [
                    ComprobanteEntrega(
                        mercancia_id=m_id,
                        despacho_id=id_despacho,
                        url_archivo=url_absoluta,
                        nombre_original=archivo.name,
                        observaciones=observaciones,
                    )
                    for m_id in mercancia_ids
                ]
                ComprobanteEntrega.objects.bulk_create(comprobantes_a_crear)
                Mercancia.objects.filter(pk__in=mercancia_ids).update(
                    estado="Entregado"
                )
            return Response(
                {
                    "mensaje": f"Comprobante asociado exitosamente a {len(mercancia_ids)} mercancías.",
                    "url_archivo": url_absoluta,
                },
                status=status.HTTP_201_CREATED,
            )
        except Exception as e:
            return Response(
                {"error": f"Error al procesar la carga masiva: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class MercanciasSeguimientoDespachoAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, id_despacho):
        mercancias = Mercancia.objects.filter(
            id_despacho_id=id_despacho,
            activo=True
        ).select_related(
            'control_entrega',
            'id_cliente',
            'id_destino'
        ).order_by('id_mercancia')

        serializer = MercanciaSeguimientoSerializer(
            mercancias, 
            many=True, 
            context={'request': request}
        )
        return Response(serializer.data, status=status.HTTP_200_OK)



# ********** VIEWS PARA LLAMADAS *************** #

class LlamadaPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

class LlamadaTelefonicaViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['unique_id', 'origen', 'bodega_seleccionada']
    ordering_fields = ['fecha_inicio', 'fecha_fin', 'estado_final']
    ordering = ['-fecha_inicio']
    pagination_class = LlamadaPagination

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return LlamadaTelefonicaDetailSerializer
        return LlamadaTelefonicaListSerializer

    def get_queryset(self):
        queryset = LlamadaTelefonica.objects.all()

        if self.action == 'retrieve':
            queryset = queryset.prefetch_related(
                Prefetch(
                    'eventos',
                    queryset=EventoTelefonico.objects.order_by('creado_en')
                )
            )

        estado = self.request.query_params.get('estado')
        bodega = self.request.query_params.get('bodega')
        origen = self.request.query_params.get('origen')
        fecha_desde = self.request.query_params.get('fecha_desde')
        fecha_hasta = self.request.query_params.get('fecha_hasta')

        if estado:
            queryset = queryset.filter(estado_final=estado)
        if bodega:
            queryset = queryset.filter(bodega_seleccionada__icontains=bodega)
        if origen:
            queryset = queryset.filter(origen__icontains=origen)
        if fecha_desde:
            queryset = queryset.filter(fecha_inicio__date__gte=fecha_desde)
        if fecha_hasta:
            queryset = queryset.filter(fecha_inicio__date__lte=fecha_hasta)

        return queryset

    @action(detail=False, methods=['get'], url_path='resumen')
    def resumen(self, request):
        """Métricas consolidadas para tarjetas KPI en el frontend"""
        qs = self.get_queryset()
        stats = qs.aggregate(
            total=Count('unique_id'),
            contestadas_bodega=Count(
                'unique_id',
                filter=Q(estado_final=LlamadaTelefonica.EstadoFinal.CONTESTADA_BODEGA)
            ),
            desviadas_general=Count(
                'unique_id',
                filter=Q(
                    estado_final__in=[
                        LlamadaTelefonica.EstadoFinal.NO_CONTESTA_DESVIADA,
                        LlamadaTelefonica.EstadoFinal.CONTESTADA_GENERAL,
                    ]
                )
            ),
            abandonadas=Count(
                'unique_id',
                filter=Q(estado_final=LlamadaTelefonica.EstadoFinal.ABANDONADA)
            ),
            en_curso=Count(
                'unique_id',
                filter=Q(estado_final=LlamadaTelefonica.EstadoFinal.EN_CURSO)
            ),
        )
        return Response(stats)


class EventoTelefonicoViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = EventoTelefonicoSerializer
    permission_classes = [IsAuthenticated]
    ordering = ['-creado_en']

    def get_queryset(self):
        queryset = EventoTelefonico.objects.select_related('llamada').all()
        unique_id = self.request.query_params.get('unique_id')
        tipo_evento = self.request.query_params.get('tipo_evento')

        if unique_id:
            queryset = queryset.filter(llamada_id=unique_id)
        if tipo_evento:
            queryset = queryset.filter(tipo_evento=tipo_evento)

        return queryset

class WebhookMovilView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        token = request.data.get("api_key") or request.headers.get("X-Api-Key")
        if token != getattr(settings, "TELEFONIA_MOBILE_API_KEY", "gstorage_mobile_2026"):
            return Response({"detail": "No autorizado"}, status=status.HTTP_401_UNAUTHORIZED)

        bodega = request.data.get("bodega", "General")
        origen = request.data.get("origen") or "Desconocido"
        estado = (request.data.get("estado") or "").upper()
        call_uuid = request.data.get("call_uuid") or f"{bodega[:3].upper()}-{uuid.uuid4().hex[:12]}"

        if estado == "RINGING":
            llamada, _ = LlamadaTelefonica.objects.get_or_create(
                unique_id=call_uuid,
                defaults={
                    "origen": origen,
                    "bodega_seleccionada": bodega,
                    "estado_final": LlamadaTelefonica.EstadoFinal.EN_CURSO,
                }
            )
            EventoTelefonico.objects.create(
                llamada=llamada,
                tipo_evento="CALL_INIT",
                destino=bodega,
                payload=request.data,
            )

        elif estado == "ANSWERED":
            llamada, _ = LlamadaTelefonica.objects.get_or_create(
                unique_id=call_uuid,
                defaults={"origen": origen, "bodega_seleccionada": bodega}
            )
            llamada.estado_final = LlamadaTelefonica.EstadoFinal.CONTESTADA_BODEGA
            llamada.save(update_fields=["estado_final"])

            EventoTelefonico.objects.create(
                llamada=llamada,
                tipo_evento="BRANCH_ANSWERED",
                destino=bodega,
                payload=request.data,
            )

        elif estado in ["ENDED", "MISSED"]:
            llamada, _ = LlamadaTelefonica.objects.get_or_create(
                unique_id=call_uuid,
                defaults={"origen": origen, "bodega_seleccionada": bodega}
            )

            if llamada.fecha_fin is not None:
                return Response({"status": "already_closed", "unique_id": call_uuid}, status=status.HTTP_200_OK)

            llamada.fecha_fin = timezone.now()

            if estado == "MISSED" or llamada.estado_final == LlamadaTelefonica.EstadoFinal.EN_CURSO:
                llamada.estado_final = LlamadaTelefonica.EstadoFinal.ABANDONADA
                motivo = "NOANSWER"
                self._notificar_whatsapp_perdida(origen, bodega)
            else:
                motivo = "NORMAL_CLEARING"

            llamada.save(update_fields=["estado_final", "fecha_fin"])

            EventoTelefonico.objects.create(
                llamada=llamada,
                tipo_evento="GENERAL_RESULT",
                destino=bodega,
                motivo_fallo=motivo,
                payload=request.data,
            )

        return Response({"status": "ok", "unique_id": call_uuid}, status=status.HTTP_200_OK)

    def _notificar_whatsapp_perdida(self, origen, bodega):
        evo_url = getattr(settings, "EVOLUTION_API_URL", None)
        evo_key = getattr(settings, "EVOLUTION_API_KEY", None)
        instance = getattr(settings, "EVOLUTION_INSTANCE", "bodega_notificaciones")
        alert_num = getattr(settings, "WHATSAPP_ALERT_NUMBER", None)

        if not all([evo_url, evo_key, alert_num]):
            return

        try:
            requests.post(
                f"{evo_url}/message/sendText/{instance}",
                headers={"apikey": evo_key, "Content-Type": "application/json"},
                json={
                    "number": alert_num,
                    "text": (
                        f"⚠️ *LLAMADA PERDIDA EN BODEGA*\n\n"
                        f"• *Bodega:* {bodega}\n"
                        f"• *Número Cliente:* {origen}\n"
                        f"• *Estado:* No contestada\n\n"
                        f"_Registro automático GStorage_"
                    ),
                },
                timeout=4,
            )
        except requests.RequestException:
            pass