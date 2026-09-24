from django.shortcuts import render
from django.db.models import Q
from datetime import timedelta
from django.utils import timezone
from django.db import transaction
from rest_framework import status, viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import IsAuthenticated
from rest_framework import permissions
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


class RegistrarEntregaAPIView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    parser_classes = (MultiPartParser, FormParser)

    def dispatch(self, request, *args, **kwargs):
        print("\n" + "="*50, flush=True)
        print(">>> [DISPATCH] ¡LA PETICIÓN LLEGÓ FÍSICAMENTE A DJANGO!", flush=True)
        print(f">>> Método: {request.method} | Path: {request.path}", flush=True)
        print("="*50, flush=True)
        return super().dispatch(request, *args, **kwargs)

    def patch(self, request, id_mercancia=None):
        print(">>> [REGISTRAR POD] Entrando a def patch()", flush=True)
        print(f">>> Archivos recibidos: {list(request.FILES.keys())}", flush=True)

        # 1. Parseo de IDs
        mercancia_ids = request.data.getlist('mercancia_ids')
        if not mercancia_ids:
            raw_ids = request.data.get('mercancia_ids')
            if raw_ids:
                mercancia_ids = [i.strip() for i in str(raw_ids).split(',') if i.strip()]
            elif id_mercancia:
                mercancia_ids = [str(id_mercancia)]

        print(f">>> [REGISTRAR POD] 2. IDs identificados: {mercancia_ids}", flush=True)

        if not mercancia_ids:
            print(">>> [ERROR] No se recibieron IDs de mercancía", flush=True)
            return Response({"error": "Debe especificar al menos una mercancía."}, status=status.HTTP_400_BAD_REQUEST)

        # 2. Búsqueda en base de datos
        mercancias = Mercancia.objects.filter(
            Q(id_mercancia__in=mercancia_ids) | Q(pk__in=mercancia_ids)
        )
        print(f">>> [REGISTRAR POD] 3. Mercancías encontradas en BD: {mercancias.count()}", flush=True)

        if not mercancias.exists():
            print(f">>> [ERROR] No existen mercancías para los IDs {mercancia_ids}", flush=True)
            return Response({"error": f"No se encontró mercancía con ID {mercancia_ids}."}, status=status.HTTP_400_BAD_REQUEST)

        for m in mercancias:
            print(f"    -> Mercancía a procesar: PK={m.pk} | ID_MERCANCIA={getattr(m, 'id_mercancia', None)} | Estado actual={m.estado}", flush=True)

        # 3. Procesamiento de archivo
        saved_file_path = None
        url_absoluta = None
        if 'foto_comprobante' in request.FILES:
            archivo_foto = request.FILES['foto_comprobante']
            print(f">>> [REGISTRAR POD] 4. Subiendo foto: {archivo_foto.name} ({archivo_foto.size} bytes)...", flush=True)
            try:
                timestamp = timezone.now().strftime("%Y%m%d_%H%M%S")
                nombre_archivo = f"comprobantes_entrega/pod_{timestamp}_{archivo_foto.name}"
                saved_file_path = default_storage.save(nombre_archivo, archivo_foto)
                url_absoluta = request.build_absolute_uri(default_storage.url(saved_file_path))
                print(f">>> [REGISTRAR POD] 4.1 Foto guardada con éxito: {saved_file_path}", flush=True)
                print(f">>> [REGISTRAR POD] 4.2 URL absoluta: {url_absoluta}", flush=True)
            except Exception as e:
                print(f">>> [EXCEPCIÓN S3/STORAGE]: {str(e)}", flush=True)
        else:
            print(">>> [AVISO] No vino 'foto_comprobante' en request.FILES", flush=True)

        # 4. Transacción a base de datos
        try:
            with transaction.atomic():
                ahora = timezone.now()
                comprobantes_a_crear = []

                for m in mercancias:
                    control, created = ControlEntrega.objects.get_or_create(mercancia=m)
                    control.estado_entrega = 'Recibido'
                    control.fecha_entrega = ahora
                    if saved_file_path:
                        control.foto_comprobante.name = saved_file_path
                    control.save()
                    print(f">>> [REGISTRAR POD] 5.1 ControlEntrega {'creado' if created else 'actualizado'} (ID: {control.id})", flush=True)

                    if saved_file_path:
                        despacho_id = m.id_despacho_id or getattr(m, 'despacho_id', None)
                        comprobantes_a_crear.append(
                            ComprobanteEntrega(
                                mercancia=m,
                                despacho_id=despacho_id,
                                url_archivo=url_absoluta,
                                nombre_original=archivo_foto.name,
                                observaciones="Entrega confirmada vía POD Móvil"
                            )
                        )

                if comprobantes_a_crear:
                    ComprobanteEntrega.objects.bulk_create(comprobantes_a_crear)
                    print(f">>> [REGISTRAR POD] 5.2 ComprobanteEntrega creados: {len(comprobantes_a_crear)}", flush=True)

                updated_rows = mercancias.update(estado='Recibido')
                print(f">>> [REGISTRAR POD] 5.3 Mercancías actualizadas a 'Recibido': {updated_rows}", flush=True)

            print(">>> [REGISTRAR POD] 6. Finalizado OK", flush=True)
            print("="*50 + "\n", flush=True)

            return Response({
                "mensaje": f"¡POD guardado y estado marcado como Recibido para {mercancias.count()} carga(s)!",
                "mercancia_ids": list(mercancias.values_list('id_mercancia', flat=True))
            }, status=status.HTTP_200_OK)

        except Exception as e:
            print(f">>> [EXCEPCIÓN DATABASE TRANSACTION]: {str(e)}", flush=True)
            return Response({"error": f"Fallo en base de datos: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


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