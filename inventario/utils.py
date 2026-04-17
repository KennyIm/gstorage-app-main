from django.utils import timezone
from datetime import timedelta
from .models import Despacho, Camion, HistorialMovimientos, Mercancia
import math

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

def registrar_auditoria(empresa, usuario, modelo, accion, descripcion, mercancia=None, sucursal=None):
    try:
        if sucursal is None and usuario and hasattr(usuario, 'perfil'):
            sucursal = usuario.perfil.sucursal 

        HistorialMovimientos.objects.create(
            empresa=empresa,
            id_usuario=usuario if usuario and hasattr(usuario, 'is_authenticated') and usuario.is_authenticated else None,
            sucursal=sucursal, 
            modelo_afectado=modelo,
            accion=accion,
            descripcion_adicional=descripcion,
            id_mercancia=mercancia 
        )
    except Exception as e:
        print("\n" + "="*50)
        print(f"🚨 ERROR CRÍTICO AL GUARDAR AUDITORÍA 🚨")
        print(f"Modelo: {modelo} | Acción: {accion}")
        print(f"Detalle del error de Django: {e}")
        print("="*50 + "\n")
        
        #raise e

def generar_numeros_orden_despacho(despacho):
    mercancias = Mercancia.activos.filter(id_despacho=despacho).order_by(
        'id_destino__nombre_ciudad', 
        'id_cliente__nombre_cliente'
    )

    if not mercancias.exists():
        return

    grupos = {}
    
    for m in mercancias:
        cliente_id = m.id_cliente.id_cliente if m.id_cliente else 0
        destino_id = m.id_destino.id_destino if m.id_destino else 0
        
        clave = f"{cliente_id}_{destino_id}"
        
        if clave not in grupos:
            grupos[clave] = {
                'normales': [],
                'proveedor': []
            }
            
        if getattr(m, 'paga_proveedor', False):
            grupos[clave]['proveedor'].append(m)
        else:
            grupos[clave]['normales'].append(m)

    origen = getattr(despacho, 'origen', 'Santiago')
    inicial_origen = str(origen)[0].upper() if origen else 'S'
    ruta_obj = getattr(despacho, 'id_ruta', None)
    numero_ruta = getattr(ruta_obj, 'codigo_ruta', None)
    
    if not numero_ruta:
        numero_ruta = getattr(despacho, 'numero_correlativo', despacho.id_despacho) or despacho.id_despacho
    
    orden_index = 1
    mercancias_a_actualizar = []

    def procesar_lista(lista_cargas, es_proveedor, index_actual, destino_nombre):
        if not lista_cargas:
            return
            
        inicial_destino = str(destino_nombre)[0].upper() if destino_nombre else 'I'
        sufijo = "-P" if es_proveedor else ""
        total_items = len(lista_cargas)
        total_paginas = math.ceil(total_items / 10.0)

        for idx, m in enumerate(lista_cargas):
            pagina_actual = (idx // 10) + 1
            
            if total_paginas > 1:
                codigo = f"{inicial_origen}{numero_ruta}-{index_actual}-{pagina_actual}{inicial_destino}{sufijo}"
            else:
                codigo = f"{inicial_origen}{numero_ruta}-{index_actual}{inicial_destino}{sufijo}"
            
            m.numero_orden_entrega = codigo
            mercancias_a_actualizar.append(m)

    for clave, data in grupos.items():
        todas = data['normales'] + data['proveedor']
        destino_str = getattr(todas[0].id_destino, 'nombre_ciudad', 'Iquique') if todas else 'Iquique'
        
        procesar_lista(data['normales'], False, orden_index, destino_str)
        procesar_lista(data['proveedor'], True, orden_index, destino_str)
        
        orden_index += 1

    if mercancias_a_actualizar:
        Mercancia.objects.bulk_update(mercancias_a_actualizar, ['numero_orden_entrega'])