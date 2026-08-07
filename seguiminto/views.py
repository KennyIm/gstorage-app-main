from django.shortcuts import render
from django.utils import timezone
from django.db import transaction
from rest_framework import status, viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from django.core.files.storage import default_storage
from inventario.models import Mercancia
from .models import ControlEntrega, ComprobanteEntrega
from .serializers import ComprobanteEntregaSerializer, ControlEntregaSerializer

class RegistrarEntregaAPIView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)

    def patch(self, request, id_mercancia):
        try:
            mercancia = Mercancia.objects.get(pk=id_mercancia, activo=True)
        except Mercancia.DoesNotExist:
            return Response({"error": "La mercancía no existe o fue dada de baja."}, status=status.HTTP_404_NOT_FOUND)
        control, created = ControlEntrega.objects.get_or_create(mercancia=mercancia)

        control.estado_entrega = 'Entregado'
        control.fecha_entrega = timezone.now()
        control.latitud_entrega = request.data.get('latitud_entrega')
        control.longitud_entrega = request.data.get('longitud_entrega')
        if 'foto_comprobante' in request.FILES:
            control.foto_comprobante = request.FILES['foto_comprobante']
        control.save()
        mercancia.estado = 'Entregado'
        mercancia.save()

        return Response({"mensaje": "Entrega registrada y confirmada."}, status=status.HTTP_200_OK)


class RegistrarIncidenciaAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, id_mercancia):
        try:
            mercancia = Mercancia.objects.get(pk=id_mercancia, activo=True)
        except Mercancia.DoesNotExist:
            return Response({"error": "La mercancía no existe."}, status=status.HTTP_404_NOT_FOUND)

        estado_entrega = request.data.get('estado_entrega')
        observaciones = request.data.get('observaciones', '')

        control, created = ControlEntrega.objects.get_or_create(mercancia=mercancia)
        control.estado_entrega = estado_entrega
        control.observaciones = observaciones
        control.fecha_entrega = timezone.now()
        control.save()
        if estado_entrega == 'No_Domicilio':
            mercancia.estado = 'En Bodega' 
        elif estado_entrega == 'Rechazado':
            mercancia.estado = 'Eliminado'
            mercancia.motivo_baja = f"Rechazado en ruta: {observaciones}"
        
        mercancia.save()

        return Response({"mensaje": "Incidencia registrada correctamente en la bitácora."}, status=status.HTTP_200_OK)


class ConsultarControlEntregaAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, id_mercancia):
        try:
            control = ControlEntrega.objects.get(mercancia_id=id_mercancia)
            serializer = ControlEntregaSerializer(control, context={'request': request})
            return Response(serializer.data, status=status.HTTP_200_OK)
        except ControlEntrega.DoesNotExist:
            return Response({"detalle": "Aún no se ha registrado entrega ni incidencia para esta mercancía."}, status=status.HTTP_404_NOT_FOUND)


class ComprobanteEntregaViewSet(viewsets.ModelViewSet):
    serializer_class = ComprobanteEntregaSerializer
    parser_classes = (MultiPartParser, FormParser)

    def get_queryset(self):
        queryset = ComprobanteEntrega.objects.select_related('mercancia', 'despacho').all()
        id_despacho = self.request.query_params.get('id_despacho')
        id_mercancia = self.request.query_params.get('id_mercancia')
        if id_despacho:
            queryset = queryset.filter(despacho_id=id_despacho)
        if id_mercancia:
            queryset = queryset.filter(mercancia_id=id_mercancia)
        return queryset

    @action(detail=False, methods=['post'], url_path='subir-masivo')
    def subir_masivo(self, request):
        archivo = request.FILES.get('archivo')
        id_despacho = request.data.get('despacho')
        mercancia_ids = request.data.getlist('mercancia_ids') 
        observaciones = request.data.get('observaciones', '')

        if not archivo:
            return Response({"error": "Debe adjuntar un archivo (PDF o Imagen)."}, status=status.HTTP_400_BAD_REQUEST)
        if not mercancia_ids:
            return Response({"error": "Debe seleccionar al menos una mercancía."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            with transaction.atomic():
                path = default_storage.save(f"comprobantes/{archivo.name}", archivo)
                url_absoluta = request.build_absolute_uri(default_storage.url(path))
                comprobantes_a_crear = []
                for m_id in mercancia_ids:
                    comprobantes_a_crear.append(
                        ComprobanteEntrega(
                            mercancia_id=m_id,
                            despacho_id=id_despacho,
                            url_archivo=url_absoluta,
                            nombre_original=archivo.name,
                            observaciones=observaciones
                        )
                    )
                ComprobanteEntrega.objects.bulk_create(comprobantes_a_crear)
                Mercancia.objects.filter(pk__in=mercancia_ids).update(estado='Entregado')

            return Response({
                "mensaje": f"Comprobante asociado exitosamente a {len(mercancia_ids)} mercancías.",
                "url_archivo": url_absoluta
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"error": f"Error al procesar la carga masiva: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
