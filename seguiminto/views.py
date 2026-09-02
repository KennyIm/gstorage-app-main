from django.shortcuts import render
from django.utils import timezone
from django.db import transaction
from rest_framework import status, viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from django.core.files.storage import default_storage
from inventario.models import Mercancia
from .models import ControlEntrega, ComprobanteEntrega
from .serializers import ComprobanteEntregaSerializer, ControlEntregaSerializer, MercanciaSeguimientoSerializer

from inventario.models import Despacho
from inventario.serializers import DespachoListSerializer, MercanciaListSerializer


class DespachosMovilActivosAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        queryset = Despacho.objects.filter(
            activo=True
        ).exclude(
            estado_despacho__in=['Eliminado', 'Cancelado']
        ).filter(
            mercancia__estado__in=['Entregado', 'En Observacion'],
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


class RegistrarEntregaAPIView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)

    def patch(self, request, id_mercancia=None):
        mercancia_ids = request.data.getlist('mercancia_ids')
        if not mercancia_ids:
            raw_ids = request.data.get('mercancia_ids')
            if raw_ids:
                mercancia_ids = [i.strip() for i in str(raw_ids).split(',') if i.strip()]
            elif id_mercancia:
                mercancia_ids = [id_mercancia]

        if not mercancia_ids:
            return Response({"error": "Debe especificar al menos una mercancía."}, status=status.HTTP_400_BAD_REQUEST)

        mercancias = Mercancia.objects.filter(pk__in=mercancia_ids, activo=True)
        if not mercancias.exists():
            return Response({"error": "No se encontraron mercancías activas."}, status=status.HTTP_404_NOT_FOUND)

        saved_file_path = None
        if 'foto_comprobante' in request.FILES:
            archivo_foto = request.FILES['foto_comprobante']
            timestamp = timezone.now().strftime("%Y%m%d_%H%M%S")
            nombre_archivo = f"comprobantes_entrega/pod_{timestamp}_{archivo_foto.name}"
            saved_file_path = default_storage.save(nombre_archivo, archivo_foto)

        with transaction.atomic():
            ahora = timezone.now()
            for m in mercancias:
                control, _ = ControlEntrega.objects.get_or_create(mercancia=m)
                control.estado_entrega = 'Entregado'
                control.fecha_entrega = ahora
                if saved_file_path:
                    control.foto_comprobante.name = saved_file_path
                control.save()

            mercancias.update(estado='Recibido')

        return Response({
            "mensaje": f"¡Entrega confirmada y sincronizada para {mercancias.count()} carga(s)!",
            "mercancia_ids": list(mercancias.values_list('id_mercancia', flat=True))
        }, status=status.HTTP_200_OK)


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