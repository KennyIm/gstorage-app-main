from django.utils import timezone
from datetime import timedelta
from .models import Despacho, Camion, HistorialMovimientos

def actualizar_estados_automaticos(empresa):
    now = timezone.now()
    # Buscamos despachos que NO estén finalizados y tengan fecha real asignada
    despachos_activos = Despacho.activos.filter(
        empresa=empresa,
        fecha_salida_real__isnull=False
    ).exclude(estado_despacho='Finalizado')

    count_actualizados = 0

    for d in despachos_activos:
        cambio_realizado = False
        tiempo_transcurrido = now - d.fecha_salida_real
        
        cinco_horas = timedelta(hours=5)
        tiempo_viaje = timedelta(days=2) # 2 días de viaje
        tiempo_total_para_fin = cinco_horas + tiempo_viaje

        # --- LÓGICA DE ESTADOS ---

        # 1(Pasaron 5h + 2 días)
        if tiempo_transcurrido >= tiempo_total_para_fin:
            if d.estado_despacho != 'Finalizado':
                d.estado_despacho = 'Finalizado'
                
                # Liberar Camión
                if d.id_camion:
                    d.id_camion.estado_camion = 'DISPONIBLE'
                    d.id_camion.save()
                
                # (La mercancía se actualiza a 'Entregado')
                cambio_realizado = True

        # (Pasaron más de 5 horas, pero menos del total)
        elif tiempo_transcurrido >= cinco_horas:
            if d.estado_despacho != 'En Tránsito':
                d.estado_despacho = 'En Tránsito'
                
                # Ocupar Camión
                if d.id_camion:
                    d.id_camion.estado_camion = 'EN_USO' 
                    d.id_camion.save()
                    
                cambio_realizado = True

        # (Ya pasó la hora de salida, pero son menos de 5 horas)
        elif tiempo_transcurrido >= timedelta(seconds=0):
            if d.estado_despacho != 'En Carga':
                d.estado_despacho = 'En Carga'
                
                # Ocupar Camión
                if d.id_camion:
                    d.id_camion.estado_camion = 'EN_USO' 
                    d.id_camion.save()
                
                cambio_realizado = True

        if cambio_realizado:
            d.save() 
            count_actualizados += 1
            
    return count_actualizados

def registrar_auditoria(empresa, usuario, modelo, accion, descripcion, mercancia=None):
    try:
        HistorialMovimientos.objects.create(
            empresa=empresa,
            id_usuario=usuario if usuario and usuario.is_authenticated else None,
            modelo_afectado=modelo,
            accion=accion,
            descripcion_adicional=descripcion,
            id_mercancia=mercancia 
        )
    except Exception as e:
        print(f"Error al registrar auditoría: {e}")