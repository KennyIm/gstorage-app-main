from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from .models import Despacho, Mercancia, Ubicacion, Estanteria
from decimal import Decimal

ESTADOS_AUDITADOS = ['Entregado', 'En Observacion']

@receiver(pre_save, sender=Mercancia)
def sincronizar_mercancia_en_transito(sender, instance, **kwargs):
    if instance.id_despacho:
        estado_camion = instance.id_despacho.estado_despacho

        if estado_camion == 'Programado':
            if instance.estado not in ESTADOS_AUDITADOS:
                instance.estado = 'Asignado'

        elif estado_camion in ['En Carga', 'En Tránsito']:
            if instance.estado not in ESTADOS_AUDITADOS:
                instance.estado = 'En Tránsito'
    else:
        if instance.estado in ['Asignado', 'En Tránsito']:
            instance.estado = 'En Bodega'

@receiver(post_save, sender=Mercancia)
def verificar_cierre_despacho_por_entregas(sender, instance, **kwargs):
    despacho = instance.id_despacho
    if not despacho or despacho.estado_despacho == 'Finalizado':
        return

    if instance.estado in ESTADOS_AUDITADOS:
        cargas_pendientes = Mercancia.objects.filter(
            id_despacho=despacho,
            activo=True
        ).exclude(estado__in=ESTADOS_AUDITADOS).exists()

        if not cargas_pendientes:
            despacho.estado_despacho = 'Finalizado'
            despacho.save()


@receiver(post_save, sender=Despacho)
def gestionar_recursos_despacho(sender, instance, created, **kwargs):
    despacho = instance
    mercancias = Mercancia.objects.filter(id_despacho=despacho, activo=True)

    if despacho.estado_despacho in ['En Carga', 'En Tránsito']:
        mercancias.exclude(estado__in=ESTADOS_AUDITADOS).update(estado='En Tránsito')

        for mercancia in mercancias.select_related('id_ubicacion_actual'):
            if mercancia.id_ubicacion_actual:
                ubicacion = mercancia.id_ubicacion_actual
                ubicacion.estado_ocupado = False
                ubicacion.save()
                Mercancia.objects.filter(pk=mercancia.pk).update(id_ubicacion_actual=None)
    elif despacho.estado_despacho == 'Finalizado':
        if despacho.id_camion and despacho.id_camion.estado_camion != 'DISPONIBLE':
            despacho.id_camion.estado_camion = 'DISPONIBLE'
            despacho.id_camion.save()

        if hasattr(despacho, 'id_rampla') and despacho.id_rampla and despacho.id_rampla.estado_rampla != 'Disponible':
            despacho.id_rampla.estado_rampla = 'Disponible'
            despacho.id_rampla.save()

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
def calcular_precio_mercancia(sender, instance, **kwargs):
    if instance.id_cliente and not instance.precio_total:
        peso = Decimal(str(instance.kg or 0.00))
        volumen = Decimal(str(instance.m3 or 0.00))
        
        precio_k = Decimal(str(instance.id_cliente.precio_kg or 0.00))
        precio_v = Decimal(str(instance.id_cliente.precio_m3 or 0.00))
    
        costo_por_peso = peso * precio_k
        costo_por_volumen = volumen * precio_v
        
        instance.precio_total = max(costo_por_peso,costo_por_volumen)