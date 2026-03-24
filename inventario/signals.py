from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from .models import Despacho, Mercancia, Ubicacion, Estanteria
from decimal import Decimal

@receiver(post_save, sender=Despacho)
def actualizar_estado_mercancias(sender, instance, created, **kwargs):
    
    despacho = instance
    mercancias_asociadas = Mercancia.objects.filter(id_despacho=despacho)
    
    nuevo_estado_mercancia = ''
    accion_ubicacion = None 

    if despacho.estado_despacho == 'Programado':
        nuevo_estado_mercancia = 'Asignado'
        accion_ubicacion = 'ocupar'
    elif despacho.estado_despacho in ['En Carga', 'En Tránsito']:
        nuevo_estado_mercancia = 'En Tránsito'
        accion_ubicacion = 'liberar' 
    elif despacho.estado_despacho == 'Finalizado':
        nuevo_estado_mercancia = 'Entregado'
        accion_ubicacion = 'liberar' 

    if nuevo_estado_mercancia:
        mercancias_asociadas.update(estado=nuevo_estado_mercancia)
        
        if accion_ubicacion:
            nuevo_estado_ocupado = True if accion_ubicacion == 'ocupar' else False
            
            for mercancia in mercancias_asociadas.select_related('id_ubicacion_actual'):
                if mercancia.id_ubicacion_actual:
                    try:
                        ubicacion = mercancia.id_ubicacion_actual
                        
                        if accion_ubicacion == 'ocupar' and ubicacion.estado_ocupado:
                            print(f"¡CONFLICTO! Ubicación {ubicacion.codigo_ubicacion} ya está ocupada. Mercancía {mercancia.id_mercancia} necesita reubicación.")
                            continue 
                        
                        ubicacion.estado_ocupado = nuevo_estado_ocupado
                        ubicacion.save()

                        mercancia.id_ubicacion_actual = None
                        mercancia.save()
                    except Exception as e:
                        print(f"Error al {accion_ubicacion} ubicación {ubicacion.codigo_ubicacion}: {e}")

@receiver(post_save, sender=Estanteria)
def generar_ubicaciones_automaticas(sender, instance, created, **kwargs):
    if created:
        ubicaciones_a_crear = []
        
        total_niveles = instance.num_niveles_alto + 1 # +1 para incluir el nivel 0
        
        volumen = instance.ancho_hueco_m * instance.alto_hueco_m * instance.profundo_hueco_m
        
        for x in range(instance.num_modulos_ancho):       
            for y in range(total_niveles):                
                for z in range(instance.num_profundidad): 
                    # Generamos un código automático: EST-A-M0-N1-P0
                    codigo_aut = f"{instance.codigo_estanteria}-M{x}-N{y}-P{z}"

                    ubicacion = Ubicacion(
                        empresa=instance.empresa,
                        estanteria=instance,
                        codigo_ubicacion=codigo_aut,
                        
                        # Coordenadas relativas para el 3D
                        pos_x_rel=x,
                        pos_y_rel=y,
                        pos_z_rel=z,
                        
                        # Datos por defecto
                        es_zona_suelo=False,
                        estado_ocupado=False,
                        capacidad_maxima_kg=instance.capacidad_carga_por_hueco_kg,
                        capacidad_max_m3=volumen,
                        tipo_almacenamiento="Estándar"
                    )
                    ubicaciones_a_crear.append(ubicacion)
    
        if ubicaciones_a_crear:
            Ubicacion.objects.bulk_create(ubicaciones_a_crear)
            print(f"✅ Se generaron {len(ubicaciones_a_crear)} ubicaciones para {instance.codigo_estanteria}")


@receiver(pre_save, sender=Mercancia)
def actualizar_estado_por_despacho(sender, instance, **kwargs):
    if instance.id_despacho:
        estado_del_camion = instance.id_despacho.estado_despacho 
        if estado_del_camion == 'Programado':
            instance.estado = 'Asignado'
        elif estado_del_camion == 'En Tránsito':
            instance.estado = 'Despachado'
        elif estado_del_camion == 'Entregado':
            instance.estado = 'Entregado'
            
    else:
        # Solo la devolvemos a bodega si no es una merma o algo especial
        if instance.estado in ['Asignado', 'Despachado', 'Entregado']:
            instance.estado = 'En Bodega'      

@receiver(pre_save, sender=Mercancia)
def calcular_precio_mercancia(sender, instance, **kwargs):
    """
    Calcula el precio SOLO si no se ha ingresado uno manualmente.
    """
    if instance.id_cliente and not instance.precio_total:
        peso = Decimal(str(instance.kg or 0.00))
        volumen = Decimal(str(instance.m3 or 0.00))
        
        precio_k = Decimal(str(instance.id_cliente.precio_kg or 0.00))
        precio_v = Decimal(str(instance.id_cliente.precio_m3 or 0.00))
    
        costo_por_peso = peso * precio_k
        costo_por_volumen = volumen * precio_v
        
        instance.precio_total = max(costo_por_peso,costo_por_volumen)