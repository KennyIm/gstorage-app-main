from django.shortcuts import render
from django.urls import reverse_lazy
from django.contrib.auth.mixins import LoginRequiredMixin
from django.contrib.auth.decorators import login_required
from rest_framework import generics, permissions
from django.db.models import Count
from django.db.models import Sum
from django.db.models.functions import TruncMonth
from datetime import datetime, timedelta
from rest_framework.views import APIView     
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from .utils import actualizar_estados_automaticos, registrar_auditoria
from django.db.models import Q
from django.views.generic import (
    ListView, 
    DetailView, 
    CreateView, 
    UpdateView, 
    DeleteView
)
from .models import (
    Mercancia, Cliente, Despacho, Conductor, 
    Camion, Ruta, Destino, Ubicacion, HistorialMovimientos, Estanteria,
    AreaRestringida, Proveedor
)

from .serializers import (
    # Mercancia
    MercanciaListSerializer, MercanciaWriteSerializer,
    # Despacho
    DespachoListSerializer, DespachoWriteSerializer,
    # Catalogos
    ClienteSerializer, ConductorSerializer, CamionSerializer, 
    RutaSerializer, DestinoSerializer, UbicacionSerializer, EstanteriaSerializer,
    HistorialSerializer,
    AreaRestringidaSerializer,
    ProveedorSerializer
)
from usuarios.permissions import IsAdminEmpresa, IsJefeDeBodega, IsOperario

from django import forms

def get_empresa_from_user(request):
    if not request.user.is_authenticated or not hasattr(request.user, 'perfil'):
        raise ValidationError("Usuario no autenticado o sin perfil.")
    empresa = request.user.perfil.empresa
    if not empresa:
        raise ValidationError("El usuario no está asociado a ninguna empresa.")
    return empresa
# --- Vistas de API para Mercancia ---

class MercanciaListCreateAPI(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        empresa = get_empresa_from_user(self.request)
        queryset = Mercancia.activos.filter(empresa=empresa).order_by('-fecha_ingreso')
        despacho_id = self.request.query_params.get('id_despacho')
        estado = self.request.query_params.get('estado')
        estado_in = self.request.query_params.get('estado_in') 
        
        if estado:
            queryset = queryset.filter(estado=estado)
        if estado_in:
            estados = estado_in.split(',')
            queryset = queryset.filter(estado__in=estados)
        if despacho_id:
            queryset = queryset.filter(id_despacho=despacho_id)
        
        estado = self.request.query_params.get('estado')
        if estado:
            queryset = queryset.filter(estado=estado)
        return queryset
    

    def get_serializer_class(self):
        if self.request.method == 'GET':
            return MercanciaListSerializer
        return MercanciaWriteSerializer
    
    def perform_create(self, serializer):
        empresa = get_empresa_from_user(self.request)
        user = self.request.user
        
        nuevos_datos = serializer.validated_data
        ubicacion_seleccionada = nuevos_datos.get('id_ubicacion_actual')
        nuevo_kg = nuevos_datos.get('kg')
        nuevo_m3 = nuevos_datos.get('m3')

        # --- VALIDACIONES DE CREACIÓN ---
        if ubicacion_seleccionada:

            if ubicacion_seleccionada.empresa != empresa:
                raise ValidationError({"id_ubicacion_actual": "Esta ubicación no pertenece a su empresa."})
            
            if ubicacion_seleccionada.estado_ocupado:
                raise ValidationError(
                    {"id_ubicacion_actual": f"¡Conflicto! La ubicación {ubicacion_seleccionada.codigo_ubicacion} ya está ocupada por otro lote."}
                )

            if nuevo_kg and ubicacion_seleccionada.capacidad_maxima_kg:
                if float(nuevo_kg) > float(ubicacion_seleccionada.capacidad_maxima_kg):
                    raise ValidationError({
                        "id_ubicacion_actual": f"Exceso de Peso: El lote ({nuevo_kg}kg) supera la capacidad de la ubicación ({ubicacion_seleccionada.capacidad_maxima_kg}kg)."
                    })

            if nuevo_m3 and ubicacion_seleccionada.capacidad_max_m3:
                if float(nuevo_m3) > float(ubicacion_seleccionada.capacidad_max_m3):
                    raise ValidationError({
                        "id_ubicacion_actual": f"Exceso de Volumen: El lote ({nuevo_m3}m³) supera la capacidad de la ubicación ({ubicacion_seleccionada.capacidad_max_m3}m³)."
                    })
        instance = serializer.save(
            id_usuario_creacion=user,
            estado='En Bodega',
            activo=True,
            empresa=empresa
        )
        try:
            if instance.id_ubicacion_actual:
                instance.id_ubicacion_actual.estado_ocupado = True
                instance.id_ubicacion_actual.save()
        except Exception as e:
            print(f"Error al ocupar ubicación: {e}")
        HistorialMovimientos.objects.create(
            empresa=empresa,
            id_mercancia=instance,
            id_usuario=user,
            id_ubicacion_anterior=None,
            id_ubicacion_nueva=instance.id_ubicacion_actual,
            accion='Creación',
            descripcion_adicional=f"Mercancía creada en {instance.id_ubicacion_actual.codigo_ubicacion if instance.id_ubicacion_actual else 'Bodega General'}"
        )
    

class MercanciaDetailAPI(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = MercanciaWriteSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        empresa = get_empresa_from_user(self.request)
        return Mercancia.activos.filter(empresa=empresa)

    def perform_update(self, serializer):
        empresa = get_empresa_from_user(self.request)
        user = self.request.user if self.request.user.is_authenticated else None

        # 1. OBTENER DATOS ACTUALES 
        instance = self.get_object() 
        ubicacion_original = instance.id_ubicacion_actual
        estado_original = instance.estado

        # 2. OBTENER DATOS ENTRANTES (Lo que se quiere guardar)
        datos_nuevos = serializer.validated_data
        
        # Determinamos los valores finales (Si no vienen en el request, usamos los actuales)
        nueva_ubicacion = datos_nuevos.get('id_ubicacion_actual', instance.id_ubicacion_actual)
        nuevo_estado = datos_nuevos.get('estado', instance.estado)
        nuevo_kg = datos_nuevos.get('kg', instance.kg)
        nuevo_m3 = datos_nuevos.get('m3', instance.m3)

        # --- 3. VALIDACIONES DE NEGOCIO  ---
        
        if nueva_ubicacion and (nueva_ubicacion != ubicacion_original or nuevo_estado in ['En Bodega', 'Asignado']):
            
            # A. Validar si está ocupada por OTRO lote
            if nueva_ubicacion.estado_ocupado:
                ocupante = Mercancia.activos.filter(id_ubicacion_actual=nueva_ubicacion).exclude(pk=instance.pk).first()
                if ocupante:
                    raise ValidationError({
                        "id_ubicacion_actual": f"¡Conflicto! La ubicación {nueva_ubicacion.codigo_ubicacion} ya está ocupada por el Lote #{ocupante.id_mercancia}."
                    })
            
            # B. Validar que la ubicación pertenezca a la empresa
            if nueva_ubicacion.empresa != empresa:
                raise ValidationError({"id_ubicacion_actual": "Esta ubicación no pertenece a su empresa."})

            # C. VALIDAR PESO (KG)
            if nuevo_kg and nueva_ubicacion.capacidad_maxima_kg:
                if float(nuevo_kg) > float(nueva_ubicacion.capacidad_maxima_kg):
                    raise ValidationError({
                        "id_ubicacion_actual": f"Exceso de Peso: El lote ({nuevo_kg}kg) supera la capacidad de la ubicación ({nueva_ubicacion.capacidad_maxima_kg}kg)."
                    })

            # D. VALIDAR VOLUMEN (M3)
            if nuevo_m3 and nueva_ubicacion.capacidad_max_m3:
                if float(nuevo_m3) > float(nueva_ubicacion.capacidad_max_m3):
                    raise ValidationError({
                        "id_ubicacion_actual": f"Exceso de Volumen: El lote ({nuevo_m3}m³) supera la capacidad de la ubicación ({nueva_ubicacion.capacidad_max_m3}m³)."
                    })


        instance_actualizada = serializer.save(id_usuario_ultima_modificacion=user)



        # --- Caso Especial: Merma / Eliminado ---
        if nuevo_estado in ['Merma', 'Eliminado']:
            if ubicacion_original:
                try:
                    ubicacion_original.estado_ocupado = False
                    ubicacion_original.save()
                except Exception as e:
                    print(f"Error liberando: {e}")
            
            # Limpiar datos
            instance_actualizada.id_despacho = None
            instance_actualizada.id_ubicacion_actual = None
            instance_actualizada.save()
            
            HistorialMovimientos.objects.create(
                empresa=empresa, id_mercancia=instance_actualizada, id_usuario=user,
                id_ubicacion_anterior=ubicacion_original, id_ubicacion_nueva=None,
                tipo_movimiento='Modificación Manual', descripcion_adicional=f"Mercancía marcada como {nuevo_estado}"
            )
            return

        # --- Movimiento Normal  ---
        if ubicacion_original != nueva_ubicacion:
            if ubicacion_original:
                ubicacion_original.estado_ocupado = False
                ubicacion_original.save()
            
            if nueva_ubicacion and nuevo_estado in ['En Bodega', 'Asignado']:
                nueva_ubicacion.estado_ocupado = True
                nueva_ubicacion.save()
            
            HistorialMovimientos.objects.create(
                empresa=empresa, id_mercancia=instance_actualizada, id_usuario=user,
                id_ubicacion_anterior=ubicacion_original, id_ubicacion_nueva=nueva_ubicacion,
                tipo_movimiento='Modificación Manual', 
                descripcion_adicional=f"Movido de {ubicacion_original.codigo_ubicacion if ubicacion_original else 'Nada'} a {nueva_ubicacion.codigo_ubicacion if nueva_ubicacion else 'Nada'}"
            )

        # --- Cambio de Estado en el mismo lugar ---
        elif estado_original != nuevo_estado:
            if nuevo_estado in ['En Tránsito', 'Entregado']:
                if ubicacion_original:
                    ubicacion_original.estado_ocupado = False
                    ubicacion_original.save()
                instance_actualizada.id_ubicacion_actual = None
                instance_actualizada.save()

            elif nuevo_estado in ['En Bodega', 'Asignado']:
                if ubicacion_original:
                    ubicacion_original.estado_ocupado = True
                    ubicacion_original.save()

            HistorialMovimientos.objects.create(
                empresa=empresa, id_mercancia=instance_actualizada, id_usuario=user,
                id_ubicacion_anterior=ubicacion_original, id_ubicacion_nueva=instance_actualizada.id_ubicacion_actual,
                accion='Modificación Manual',
                descripcion_adicional=f"Cambio de estado de '{estado_original}' a '{nuevo_estado}'"
            )

    def perform_destroy(self, instance):
        empresa = get_empresa_from_user(self.request)
        user = self.request.user if self.request.user.is_authenticated else None
        
        # Historial
        HistorialMovimientos.objects.create(
            empresa=empresa, id_mercancia=instance, id_usuario=user,
            id_ubicacion_anterior=instance.id_ubicacion_actual, id_ubicacion_nueva=None,
            accion='Borrado Lógico',
            descripcion_adicional=f"Mercancía eliminada (Motivo: {instance.motivo_baja or 'No especificado'})"
        )

        # Liberar Ubicación
        if instance.id_ubicacion_actual:
            try:
                ubicacion = instance.id_ubicacion_actual
                ubicacion.estado_ocupado = False
                ubicacion.save()
            except Exception as e:
                print(f"Error al liberar ubicación en destroy: {e}")

        # Borrado Lógico
        instance.id_despacho = None
        instance.id_ubicacion_actual = None
        instance.activo = False
        instance.estado = 'Eliminado'
        instance.id_usuario_ultima_modificacion = user
        instance.save()

# --- Vistas de API para Despacho ---

class DespachoListCreateAPI(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        empresa = get_empresa_from_user(self.request)
        actualizar_estados_automaticos(empresa)
        return Despacho.objects.filter(empresa=empresa, activo=True).order_by('-fecha_programada')
    
    def get_serializer_class(self):
        if self.request.method == 'GET':
            return DespachoListSerializer
        return DespachoWriteSerializer
    
    def perform_create(self, serializer):
        empresa = get_empresa_from_user(self.request)
        instance = serializer.save(
            id_usuario_creacion=self.request.user, 
            empresa=empresa,
            activo=True
        )
        registrar_auditoria(
            empresa=empresa,
            usuario=self.request.user,
            modelo="Despacho",
            accion="Creación",
            descripcion=f"Despacho programado para {instance.fecha_programada}"
        )

class DespachoDetailAPI(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = DespachoWriteSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        empresa = get_empresa_from_user(self.request)
        return Despacho.objects.filter(empresa=empresa, activo=True)
    
    def perform_update(self, serializer):
        prev_estado = self.get_object().estado_despacho
        instance = serializer.save(id_usuario_ultima_modificacion=self.request.user)
        
        desc = f"Despacho #{instance.id_despacho} actualizado."
        if prev_estado != instance.estado_despacho:
            desc += f" Estado cambió de {prev_estado} a {instance.estado_despacho}."

        registrar_auditoria(
            empresa=instance.empresa,
            usuario=self.request.user,
            modelo="Despacho",
            accion="Edición",
            descripcion=desc
        )

    def perform_destroy(self, instance):
        instance.activo = False
        instance.id_usuario_ultima_modificacion = self.request.user
        instance.save()
        registrar_auditoria(
            empresa=instance.empresa,
            usuario=self.request.user,
            modelo="Despacho",
            accion="Eliminación",
            descripcion=f"Se eliminó (lógico) al despacho: {instance.id_despacho}"
        )

# --- Vistas de API para Clientes ---

class ClienteListCreateAPI(generics.ListCreateAPIView):
    serializer_class = ClienteSerializer
    permission_classes = [permissions.IsAuthenticated, IsJefeDeBodega]

    def get_queryset(self):
        empresa = get_empresa_from_user(self.request)
        return Cliente.objects.filter(empresa=empresa)
    
    def perform_create(self, serializer):
        empresa = get_empresa_from_user(self.request)
        instance=serializer.save(empresa=empresa, activo=True)
        registrar_auditoria(
            empresa=empresa,
            usuario=self.request.user,
            modelo="Cliente",
            accion="Creación",
            descripcion=f"Se creó el cliente: {instance.nombre_cliente}"
        )

class ClienteDetailAPI(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ClienteSerializer
    permission_classes = [permissions.IsAuthenticated, IsJefeDeBodega]
    
    def get_queryset(self):
        empresa = get_empresa_from_user(self.request)
        return Cliente.objects.filter(empresa=empresa)
    
    def perform_update(self, serializer):
        instance = serializer.save()
        registrar_auditoria(
            empresa=instance.empresa,
            usuario=self.request.user,
            modelo="Cliente",
            accion="Edición",
            descripcion=f"Se actualizaron datos del cliente: {instance.nombre_cliente}"
        )
    
    def perform_destroy(self, instance):
        instance.activo = False
        instance.save()
        registrar_auditoria(
            empresa=instance.empresa,
            usuario=self.request.user,
            modelo="Cliente",
            accion="Eliminación",
            descripcion=f"Se eliminó (lógico) al cliente: {instance.nombre_cliente}"
        )

# --- Vistas de API para Conductores ---

class ConductorListCreateAPI(generics.ListCreateAPIView):
    serializer_class = ConductorSerializer
    permission_classes = [permissions.IsAuthenticated, IsJefeDeBodega]
    
    def get_queryset(self):
        empresa = get_empresa_from_user(self.request)
        return Conductor.objects.filter(empresa=empresa)
    
    def perform_create(self, serializer):
        empresa = get_empresa_from_user(self.request)
        instance = serializer.save(empresa=empresa, activo=True)
        registrar_auditoria(
            empresa=empresa,
            usuario=self.request.user,
            modelo="Conductor",
            accion="Creación",
            descripcion=f"Se creó el conductor: {instance.nombre_completo}"
        )

class ConductorDetailAPI(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ConductorSerializer
    permission_classes = [permissions.IsAuthenticated, IsJefeDeBodega]

    def get_queryset(self):
        empresa = get_empresa_from_user(self.request)
        return Conductor.objects.filter(empresa=empresa)
    
    def perform_update(self, serializer):
        instance = serializer.save()
        registrar_auditoria(
            empresa=instance.empresa,
            usuario=self.request.user,
            modelo="Conductor",
            accion="Edición",
            descripcion=f"Se actualizarón datos del conductor: {instance.nombre_completo}"
        )
    
    def perform_destroy(self, instance): 
        instance.activo = False
        instance.save()
        registrar_auditoria(
            empresa=instance.empresa,
            usuario=self.request.user,
            modelo="Conductor",
            accion="Eliminación",
            descripcion=f"Se eliminó al conductor: {instance.nombre_completo}"
        )

# --- Vistas de API para Camiones ---

class CamionListCreateAPI(generics.ListCreateAPIView):
    serializer_class = CamionSerializer 
    permission_classes = [permissions.IsAuthenticated, IsJefeDeBodega]
    
    def get_queryset(self):
        empresa = get_empresa_from_user(self.request)
        return Camion.objects.filter(empresa=empresa)
    
    def perform_create(self, serializer):
        empresa = get_empresa_from_user(self.request)
        instance = serializer.save(empresa=empresa, activo=True)
        registrar_auditoria(
            empresa=empresa,
            usuario=self.request.user,
            modelo="Camion",
            accion="Creación",
            descripcion=f"Se creó el camión: {instance.patente}"
        )

class CamionDetailAPI(generics.RetrieveUpdateDestroyAPIView):
    queryset = Camion.objects.all() 
    serializer_class = CamionSerializer
    permission_classes = [permissions.IsAuthenticated, IsJefeDeBodega]

    def get_queryset(self):
        empresa = get_empresa_from_user(self.request)
        return Camion.objects.filter(empresa=empresa)
    
    def perform_update(self, serializer):
        instance = serializer.save()
        registrar_auditoria(
            empresa=instance.empresa,
            usuario=self.request.user,
            modelo="Camion",
            accion="Edición",
            descripcion=f"Se actualizarón datos del camión: {instance.patente}"
        )
    
    def perform_destroy(self, instance):
        instance.activo = False
        instance.save()
        registrar_auditoria(
            empresa=instance.empresa,
            usuario=self.request.user,
            modelo="Camion",
            accion="Eliminación",
            descripcion=f"Se eliminó el camión: {instance.patente}"
        )

# --- Vistas de API para Rutas ---

class RutaListCreateAPI(generics.ListCreateAPIView):
    serializer_class = RutaSerializer
    permission_classes = [permissions.IsAuthenticated, IsJefeDeBodega]
    
    def get_queryset(self):
        empresa = get_empresa_from_user(self.request)
        return Ruta.objects.filter(empresa=empresa)
    
    def perform_create(self, serializer):
        empresa = get_empresa_from_user(self.request)
        instance = serializer.save(empresa=empresa, activo=True)
        registrar_auditoria(
            empresa=empresa,
            usuario=self.request.user,
            modelo="Ruta",
            accion="Creación",
            descripcion=f"Se creó la ruta: {instance.nombre_ruta}"
        )

class RutaDetailAPI(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = RutaSerializer
    permission_classes = [permissions.IsAuthenticated, IsJefeDeBodega]

    def get_queryset(self):
        empresa = get_empresa_from_user(self.request)
        return Ruta.objects.filter(empresa=empresa)
    
    def perform_update(self, serializer):
        instance = serializer.save()
        registrar_auditoria(
            empresa=instance.empresa,
            usuario=self.request.user,
            modelo="Ruta",
            accion="Edición",
            descripcion=f"Se actualizarón datos de la ruta: {instance.nombre_ruta}"
        )
    
    def perform_destroy(self, instance):
        instance.activo = False
        instance.save()
        registrar_auditoria(
            empresa=instance.empresa,
            usuario=self.request.user,
            modelo="Ruta",
            accion="Eliminación",
            descripcion=f"Se eliminó la ruta: {instance.nombre_ruta}"
        )

# --- Vistas de API para Destinos ---

class DestinoListCreateAPI(generics.ListCreateAPIView):
    serializer_class = DestinoSerializer
    permission_classes = [permissions.IsAuthenticated, IsJefeDeBodega]

    def get_queryset(self):
        empresa = get_empresa_from_user(self.request)
        return Destino.objects.filter(empresa=empresa)
    
    def perform_create(self, serializer):
        empresa = get_empresa_from_user(self.request)
        instance = serializer.save(empresa=empresa, activo=True)
        registrar_auditoria(
            empresa=empresa,
            usuario=self.request.user,
            modelo="Destino",
            accion="Creación",
            descripcion=f"Se creó el destino: {instance.nombre_ciudad}"
        )

class DestinoDetailAPI(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = DestinoSerializer
    permission_classes = [permissions.IsAuthenticated, IsJefeDeBodega]

    def get_queryset(self):
        empresa = get_empresa_from_user(self.request)
        return Destino.objects.filter(empresa=empresa)
    
    def perform_update(self, serializer):
        instance = serializer.save()
        registrar_auditoria(
            empresa=instance.empresa,
            usuario=self.request.user,
            modelo="Destino",
            accion="Edición",
            descripcion=f"Se actualizarón datos del destino: {instance.nombre_ciudad}"
        )
    
    def perform_destroy(self, instance):
        instance.activo = False
        instance.save()
        registrar_auditoria(
            empresa=instance.empresa,
            usuario=self.request.user,
            modelo="Destino",
            accion="Eliminación",
            descripcion=f"Se eliminó el destino: {instance.nombre_ciudad}"
        )

# --- Vistas de API para Ubicaciones ---

class UbicacionListCreateAPI(generics.ListCreateAPIView):
    serializer_class = UbicacionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        empresa = get_empresa_from_user(self.request)
        return Ubicacion.activos.filter(empresa=empresa)
    
    def perform_create(self, serializer):
        empresa = get_empresa_from_user(self.request)
        serializer.save(empresa=empresa, activo=True)

class UbicacionDetailAPI(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = UbicacionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        empresa = get_empresa_from_user(self.request)
        return Ubicacion.activos.filter(empresa=empresa)
    
    def perform_destroy(self, instance):
        # --- VALIDACIÓN DE BORRADO ---
        if instance.estado_ocupado:
            mercancia = Mercancia.activos.filter(id_ubicacion_actual=instance).exists()
            
            if mercancia:
                raise ValidationError(
                    {"detail": f"No se puede eliminar la ubicación {instance.codigo_ubicacion}: Tiene mercancía asignada."}
                )

        instance.activo = False
        instance.save()


class DashboardStatsAPI(APIView):
    permission_classes = [permissions.IsAuthenticated, IsJefeDeBodega]

    def get(self, request, format=None):
        empresa = get_empresa_from_user(request)
        
        total_en_bodega = Mercancia.activos.filter(empresa=empresa, estado='En Bodega').count()
        despachos_programados = Despacho.objects.filter(empresa=empresa, estado_despacho='Programado').count() # Asumiendo borrado lógico para despachos
        ubicaciones_libres = Ubicacion.activos.filter(empresa=empresa, estado_ocupado=False).count()
        total_clientes = Cliente.activos.filter(empresa=empresa).count()

        context = {
            'total_en_bodega': total_en_bodega,
            'despachos_programados': despachos_programados,
            'ubicaciones_libres': ubicaciones_libres,
            'total_clientes': total_clientes,
        }
        
        return Response(context)
    
class EstanteriaListCreateAPI(generics.ListCreateAPIView):
    serializer_class = EstanteriaSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        empresa = get_empresa_from_user(self.request)
        return Estanteria.objects.filter(empresa=empresa)
    
    def perform_create(self, serializer):
        empresa = get_empresa_from_user(self.request)
        serializer.save(empresa=empresa, activo=True)

class EstanteriaDetailAPI(generics.RetrieveUpdateDestroyAPIView):
    queryset = Estanteria.objects.all()
    serializer_class = EstanteriaSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_update(self, serializer):
        # 1. Datos Antiguos
        instance = self.get_object()
        old_ancho = instance.num_modulos_ancho
        old_alto = instance.num_niveles_alto
        old_prof = instance.num_profundidad
        
        # 2. Validar antes de guardar
        # Obtenemos los datos que se intentan guardar
        new_ancho = serializer.validated_data.get('num_modulos_ancho', old_ancho)
        new_alto = serializer.validated_data.get('num_niveles_alto', old_alto)
        new_prof = serializer.validated_data.get('num_profundidad', old_prof)

        # --- LÓGICA DE REDUCCIÓN  ---
        if new_ancho < old_ancho or new_alto < old_alto or new_prof < old_prof:
            
            # Buscamos las ubicaciones que quedarían "fuera" de los nuevos límites
            ubicaciones_afectadas = Ubicacion.activos.filter(
                estanteria=instance
            ).filter(
                Q(pos_x_rel__gte=new_ancho) |     
                Q(pos_y_rel__gt=new_alto) |        
                Q(pos_z_rel__gte=new_prof)         
            )

            # Si alguna de esas ubicaciones está ocupada, PROHIBIR la acción
            if ubicaciones_afectadas.filter(estado_ocupado=True).exists():
                raise ValidationError(
                    {"detail": f"No se puede reducir el tamaño: Hay mercancía en las ubicaciones que intentas eliminar. Mueve la carga primero."}
                )
            
            # Si están vacías, las marcamos para borrar 
            # Guardamos los IDs para borrarlas después
            ids_a_borrar = list(ubicaciones_afectadas.values_list('id_ubicacion', flat=True))
        else:
            ids_a_borrar = []

        # 3. Guardar cambios 
        estanteria = serializer.save()

        # 4. Ejecutar Borrado de sobrantes 
        if ids_a_borrar:
            Ubicacion.objects.filter(id_ubicacion__in=ids_a_borrar).delete() 

        # 5. Lógica de Expansión
        if new_ancho > old_ancho or new_alto > old_alto or new_prof > old_prof:
             self.rellenar_huecos(estanteria)

    def perform_destroy(self, instance):
        # --- VALIDACIÓN DE BORRADO ---
        ubicaciones_ocupadas = Ubicacion.activos.filter(estanteria=instance, estado_ocupado=True)
        
        if ubicaciones_ocupadas.exists():
            count = ubicaciones_ocupadas.count()
            raise ValidationError(
                {"detail": f"No se puede eliminar la estantería: Contiene {count} ubicaciones con mercancía. Vacíela primero."}
            )
        Ubicacion.activos.filter(estanteria=instance).update(activo=False)
        
        instance.activo = False
        instance.save()

    def rellenar_huecos(self, estanteria):
        # Lógica para crear huecos faltantes cuando crece el rack
        total_niveles = estanteria.num_niveles_alto + 1
        volumen = estanteria.ancho_hueco_m * estanteria.alto_hueco_m * estanteria.profundo_hueco_m
        capacidad = estanteria.capacidad_carga_por_hueco_kg

        ubicaciones_crear = []
        for x in range(estanteria.num_modulos_ancho):
            for y in range(total_niveles):
                for z in range(estanteria.num_profundidad):
                    if not Ubicacion.objects.filter(estanteria=estanteria, pos_x_rel=x, pos_y_rel=y, pos_z_rel=z).exists():
                        codigo = f"{estanteria.codigo_estanteria}-M{x}-N{y}-P{z}"
                        
                        ubicaciones_crear.append(Ubicacion(
                            empresa=estanteria.empresa,
                            estanteria=estanteria,
                            codigo_ubicacion=codigo,
                            pos_x_rel=x, pos_y_rel=y, pos_z_rel=z,
                            capacidad_maxima_kg=capacidad,
                            capacidad_max_m3=volumen,
                            es_zona_suelo=False,
                            estado_ocupado=False
                        ))
        
        if ubicaciones_crear:
            Ubicacion.objects.bulk_create(ubicaciones_crear)
    

class HistorialListAPI(generics.ListAPIView):
    serializer_class = HistorialSerializer
    permission_classes = [permissions.IsAuthenticated ,IsJefeDeBodega]

    def get_queryset(self):
        empresa = get_empresa_from_user(self.request)
        return HistorialMovimientos.objects.filter(empresa=empresa).order_by('-fecha_hora_movimiento')

class DashboardStatsAPI(APIView):
    permission_classes = [permissions.IsAuthenticated, IsJefeDeBodega]

    def get(self, request, format=None):
        empresa = get_empresa_from_user(request)
        
        # --- 1. TARJETAS SUPERIORES (KPIs) ---
        total_en_bodega = Mercancia.activos.filter(empresa=empresa, estado='En Bodega').count()

        despachos_activos = Despacho.objects.filter(
            empresa=empresa, 
            activo=True,
            estado_despacho__in=['Programado', 'En Carga', 'En Tránsito']
        ).count()

        total_ubicaciones = Ubicacion.activos.filter(empresa=empresa).count()
        ubicaciones_ocupadas = Ubicacion.activos.filter(empresa=empresa, estado_ocupado=True).count()
        porcentaje_ocupacion = 0
        if total_ubicaciones > 0:
            porcentaje_ocupacion = round((ubicaciones_ocupadas / total_ubicaciones) * 100, 1)

        total_historico = Mercancia.objects.filter(empresa=empresa).count()


        # --- 2. GRÁFICOS ---

        estado_counts = Mercancia.activos.filter(empresa=empresa).values('estado').annotate(cantidad=Count('estado'))
        distribution_data = [
            {'name': item['estado'], 'value': item['cantidad']} 
            for item in estado_counts
        ]

        movements_data = [
            {'mes': 'Jun', 'despachos': 12},
            {'mes': 'Jul', 'despachos': 19},
            {'mes': 'Ago', 'despachos': 15},
            {'mes': 'Sep', 'despachos': 25},
            {'mes': 'Oct', 'despachos': 22},
            {'mes': 'Nov', 'despachos': despachos_activos + 5}, 
        ]


        proximos_despachos = Despacho.objects.filter(empresa=empresa, activo=True, estado_despacho__in=['Programado', 'En Carga']).order_by('fecha_programada')[:5]
        despachos_list = []
        for d in proximos_despachos:
            bultos = Mercancia.activos.filter(id_despacho=d).count()
            despachos_list.append({
                'id': d.id_despacho, 'ruta': d.id_ruta.nombre_ruta, 'camion': d.id_camion.patente,
                'fecha': d.fecha_programada.strftime('%d/%m'), 'estado': d.estado_despacho, 'bultos': bultos
            })

        despachos_list = []
        for d in proximos_despachos:
            bultos = Mercancia.activos.filter(id_despacho=d).count()
            despachos_list.append({
                'id': d.id_despacho,
                'ruta': d.id_ruta.nombre_ruta,
                'camion': d.id_camion.patente,
                'fecha': d.fecha_programada.strftime('%d/%m'),
                'estado': d.estado_despacho,
                'bultos': bultos
            })

        top_clientes_qs = Mercancia.activos.filter(empresa=empresa).values('id_cliente__nombre_cliente').annotate(cantidad=Count('id_mercancia')).order_by('-cantidad')[:5]
        top_clientes = [
            {'name': item['id_cliente__nombre_cliente'], 'value': item['cantidad']}
            for item in top_clientes_qs
        ]

        totales = Mercancia.activos.filter(empresa=empresa, estado='En Bodega').aggregate(
            total_kg=Sum('kg'),
            total_m3=Sum('m3')
        )
        total_kg = totales['total_kg'] or 0
        total_m3 = totales['total_m3'] or 0

        data = {
            'metrics': {
                'en_bodega': total_en_bodega,
                'despachos_activos': despachos_activos,
                'ocupacion': porcentaje_ocupacion,
                'total_historico': total_historico,
                'total_kg': total_kg,
                'total_m3': total_m3
            },
            'distribution_data': distribution_data,
            'movements_data': movements_data,
            'despachos_list': despachos_list,
            'top_clientes': top_clientes,
        }
        
        return Response(data)

class AreaRestringidaListCreateAPI(generics.ListCreateAPIView):
    serializer_class = AreaRestringidaSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        empresa = get_empresa_from_user(self.request)
        return AreaRestringida.objects.filter(empresa=empresa)

    def perform_create(self, serializer):
        empresa = get_empresa_from_user(self.request)
        serializer.save(empresa=empresa)

class AreaRestringidaDetailAPI(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AreaRestringidaSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        empresa = get_empresa_from_user(self.request)
        return AreaRestringida.objects.filter(empresa=empresa)

#Proveedores
class ProveedorListCreateAPI(generics.ListCreateAPIView):
    queryset = Proveedor.activos.all()
    serializer_class = ProveedorSerializer

class ProveedorRetrieveUpdateDestroyAPI(generics.RetrieveUpdateDestroyAPIView):
    queryset = Proveedor.objects.all()
    serializer_class = ProveedorSerializer

#DJANGO METODO SIN REACT (FUNCIONAL)


# @login_required
# def panel_inventario(request):
#     """
#     Vista principal de la app inventario, muestra un resumen.
#     """
#     total_en_bodega = Mercancia.objects.filter(estado='En Bodega').count()
#     despachos_programados = Despacho.objects.filter(estado_despacho='Programado').count()
#     ubicaciones_libres = Ubicacion.objects.filter(estado_ocupado=False).count()
#     total_clientes = Cliente.objects.count()

#     context = {
#         'total_en_bodega': total_en_bodega,
#         'despachos_programados': despachos_programados,
#         'ubicaciones_libres': ubicaciones_libres,
#         'total_clientes': total_clientes,
#     }
#     return render(request, 'inventario/panel.html', context)
#     
# # --- CRUD Completo para Mercancia ---

# class MercanciaListView(LoginRequiredMixin, ListView):
#     model = Mercancia
#     template_name = 'inventario/mercancia_list.html'
#     context_object_name = 'mercancias'
#     queryset = Mercancia.objects.select_related('id_cliente', 'id_ubicacion_actual', 'id_destino').order_by('-fecha_ingreso')

# class MercanciaDetailView(LoginRequiredMixin, DetailView):
#     model = Mercancia
#     template_name = 'inventario/mercancia_detail.html'
#     context_object_name = 'mercancia'

# class MercanciaCreateView(LoginRequiredMixin, CreateView):
#     model = Mercancia
#     template_name = 'inventario/mercancia_form.html'
#     fields = [
#         'id_cliente', 'descripcion_carga', 'cantidad_bultos', 
#         'kg', 'm3', 'id_ubicacion_actual', 'id_destino'
#     ]
#     success_url = reverse_lazy('mercancia-list')

#     def form_valid(self, form):
#         form.instance.id_usuario_creacion = self.request.user
#         return super().form_valid(form)

#     def form_invalid(self, form):
#         print("="*20, "FORMULARIO INVÁLIDO", "="*20)
#         print(form.errors.as_json())
#         print("="*50)
#         return super().form_invalid(form)

# class MercanciaUpdateView(LoginRequiredMixin, UpdateView):
#     model = Mercancia
#     template_name = 'inventario/mercancia_form.html'
#     fields = [
#         'id_cliente', 'descripcion_carga', 'cantidad_bultos', 
#         'kg', 'm3', 'id_ubicacion_actual', 'id_destino', 
#         'estado', 'id_despacho'
#     ]
    
#     def form_valid(self, form):
#         form.instance.id_usuario_ultima_modificacion = self.request.user
#         return super().form_valid(form)
    
#     def get_success_url(self):
#         return reverse_lazy('mercancia-detail', kwargs={'pk': self.object.pk})

# class MercanciaDeleteView(LoginRequiredMixin, DeleteView):
#     model = Mercancia
#     template_name = 'inventario/mercancia_confirm_delete.html'
#     success_url = reverse_lazy('mercancia-list')


# # --- CRUD para Clientes ---

# class ClienteListView(LoginRequiredMixin, ListView):
#     model = Cliente
#     template_name = 'inventario/cliente_list.html'
#     context_object_name = 'clientes'

# class ClienteCreateView(LoginRequiredMixin, CreateView):
#     model = Cliente
#     template_name = 'inventario/cliente_form.html'
#     fields = ['nombre_cliente', 'rut_cliente', 'telefono_contacto', 'email_contacto']
#     success_url = reverse_lazy('cliente-list')

# class ClienteUpdateView(LoginRequiredMixin, UpdateView):
#     model = Cliente
#     template_name = 'inventario/cliente_form.html'
#     fields = ['nombre_cliente', 'rut_cliente', 'telefono_contacto', 'email_contacto']
#     success_url = reverse_lazy('cliente-list')

# class ClienteDeleteView(LoginRequiredMixin, DeleteView):
#     model = Cliente
#     template_name = 'inventario/cliente_confirm_delete.html'
#     success_url = reverse_lazy('cliente-list')


# # --- CRUD para Despachos ---

# class DespachoForm(forms.ModelForm):
#     class Meta:
#         model = Despacho
#         fields = [
#             'fecha_programada', 'fecha_salida_real', 'id_camion', 
#             'id_conductor', 'id_ruta', 'estado_despacho'
#         ]
        
#         widgets = {
#             'fecha_programada': forms.DateInput(
#                 attrs={'type': 'date', 'class': 'form-control'}
#             ),
#             'fecha_salida_real': forms.DateTimeInput(
#                 attrs={'type': 'datetime-local', 'class': 'form-control'}
#             ),
#             'id_camion': forms.Select(attrs={'class': 'form-select'}),
#             'id_conductor': forms.Select(attrs={'class': 'form-select'}),
#             'id_ruta': forms.Select(attrs={'class': 'form-select'}),
#             'estado_despacho': forms.Select(attrs={'class': 'form-select'}),
#         }

# class DespachoListView(LoginRequiredMixin, ListView):
#     model = Despacho
#     template_name = 'inventario/despacho_list.html'
#     context_object_name = 'despachos'
#     queryset = Despacho.objects.select_related('id_camion', 'id_conductor', 'id_ruta').order_by('-fecha_programada')

# class DespachoDetailView(LoginRequiredMixin, DetailView):
#     model = Despacho
#     template_name = 'inventario/despacho_detail.html'
#     context_object_name = 'despacho'
    
#     def get_context_data(self, **kwargs):
#         context = super().get_context_data(**kwargs)
#         context['mercancias_asignadas'] = Mercancia.objects.filter(id_despacho=self.object)
#         return context

# class DespachoCreateView(LoginRequiredMixin, CreateView):
#     model = Despacho
#     form_class = DespachoForm  
#     template_name = 'inventario/despacho_form.html'

#     success_url = reverse_lazy('despacho-list')

#     def get_form(self, form_class=None):
#         form = super().get_form(form_class)
#         form.fields.pop('fecha_salida_real', None)
#         return form

#     def form_valid(self, form):
#         form.instance.id_usuario_creacion = self.request.user
#         return super().form_valid(form)

# class DespachoUpdateView(LoginRequiredMixin, UpdateView):
#     model = Despacho
#     form_class = DespachoForm 
#     template_name = 'inventario/despacho_form.html'

    
#     def form_valid(self, form):
#         form.instance.id_usuario_ultima_modificacion = self.request.user
#         return super().form_valid(form)

#     def get_success_url(self):
#         return reverse_lazy('despacho-detail', kwargs={'pk': self.object.pk})

# class DespachoDeleteView(LoginRequiredMixin, DeleteView):
#     model = Despacho
#     template_name = 'inventario/despacho_confirm_delete.html'
#     success_url = reverse_lazy('despacho-list')


# # --- CRUD para Conductores ---

# class ConductorListView(LoginRequiredMixin, ListView):
#     model = Conductor
#     template_name = 'inventario/conductor_list.html'
#     context_object_name = 'conductores'

# class ConductorCreateView(LoginRequiredMixin, CreateView):
#     model = Conductor
#     template_name = 'inventario/conductor_form.html'
#     fields = ['nombre_completo', 'rut_conductor', 'numero_licencia', 'telefono']
#     success_url = reverse_lazy('conductor-list')

# class ConductorUpdateView(LoginRequiredMixin, UpdateView):
#     model = Conductor
#     template_name = 'inventario/conductor_form.html'
#     fields = ['nombre_completo', 'rut_conductor', 'numero_licencia', 'telefono']
#     success_url = reverse_lazy('conductor-list')

# class ConductorDeleteView(LoginRequiredMixin, DeleteView):
#     model = Conductor
#     template_name = 'inventario/conductor_confirm_delete.html'
#     success_url = reverse_lazy('conductor-list')


# # --- CRUD para Camiones ---

# class CamionListView(LoginRequiredMixin, ListView):
#     model = Camion
#     template_name = 'inventario/camion_list.html'
#     context_object_name = 'camiones'

# class CamionCreateView(LoginRequiredMixin, CreateView):
#     model = Camion
#     template_name = 'inventario/camion_form.html'
#     fields = ['patente', 'marca', 'modelo', 'capacidad_max_kg', 'capacidad_max_m3']
#     success_url = reverse_lazy('camion-list')

# class CamionUpdateView(LoginRequiredMixin, UpdateView):
#     model = Camion
#     template_name = 'inventario/camion_form.html'
#     fields = ['patente', 'marca', 'modelo', 'capacidad_max_kg', 'capacidad_max_m3']
#     success_url = reverse_lazy('camion-list')

# class CamionDeleteView(LoginRequiredMixin, DeleteView):
#     model = Camion
#     template_name = 'inventario/camion_confirm_delete.html'
#     success_url = reverse_lazy('camion-list')


# # --- CRUD para Rutas ---

# class RutaListView(LoginRequiredMixin, ListView):
#     model = Ruta
#     template_name = 'inventario/ruta_list.html'
#     context_object_name = 'rutas'

# class RutaCreateView(LoginRequiredMixin, CreateView):
#     model = Ruta
#     template_name = 'inventario/ruta_form.html'
#     fields = ['nombre_ruta', 'descripcion']
#     success_url = reverse_lazy('ruta-list')

# class RutaUpdateView(LoginRequiredMixin, UpdateView):
#     model = Ruta
#     template_name = 'inventario/ruta_form.html'
#     fields = ['nombre_ruta', 'descripcion']
#     success_url = reverse_lazy('ruta-list')

# class RutaDeleteView(LoginRequiredMixin, DeleteView):
#     model = Ruta
#     template_name = 'inventario/ruta_confirm_delete.html'
#     success_url = reverse_lazy('ruta-list')


# # --- CRUD para Destinos ---

# class DestinoListView(LoginRequiredMixin, ListView):
#     model = Destino
#     template_name = 'inventario/destino_list.html'
#     context_object_name = 'destinos'

# class DestinoCreateView(LoginRequiredMixin, CreateView):
#     model = Destino
#     template_name = 'inventario/destino_form.html'
#     fields = ['nombre_ciudad', 'region']
#     success_url = reverse_lazy('destino-list')

# class DestinoUpdateView(LoginRequiredMixin, UpdateView):
#     model = Destino
#     template_name = 'inventario/destino_form.html'
#     fields = ['nombre_ciudad', 'region']
#     success_url = reverse_lazy('destino-list')

# class DestinoDeleteView(LoginRequiredMixin, DeleteView):
#     model = Destino
#     template_name = 'inventario/destino_confirm_delete.html'
#     success_url = reverse_lazy('destino-list')


# # --- CRUD para Ubicaciones ---

# class UbicacionListView(LoginRequiredMixin, ListView):
#     model = Ubicacion
#     template_name = 'inventario/ubicacion_list.html'
#     context_object_name = 'ubicaciones'

# class UbicacionCreateView(LoginRequiredMixin, CreateView):
#     model = Ubicacion
#     template_name = 'inventario/ubicacion_form.html'
#     fields = [
#         'codigo_ubicacion', 'pasillo', 'estanteria', 'nivel', 
#         'pos_x', 'pos_y', 'pos_z', 
#         'capacidad_max_kg', 'capacidad_max_m3', 'estado_ocupado'
#     ]
#     success_url = reverse_lazy('ubicacion-list')

# class UbicacionUpdateView(LoginRequiredMixin, UpdateView):
#     model = Ubicacion
#     template_name = 'inventario/ubicacion_form.html'
#     fields = [
#         'codigo_ubicacion', 'pasillo', 'estanteria', 'nivel', 
#         'pos_x', 'pos_y', 'pos_z', 
#         'capacidad_max_kg', 'capacidad_max_m3', 'estado_ocupado'
#     ]
#     success_url = reverse_lazy('ubicacion-list')

# class UbicacionDeleteView(LoginRequiredMixin, DeleteView):
#     model = Ubicacion
#     template_name = 'inventario/ubicacion_confirm_delete.html'
#     success_url = reverse_lazy('ubicacion-list')