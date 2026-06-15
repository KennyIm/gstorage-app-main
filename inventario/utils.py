from django.utils import timezone
from datetime import timedelta
import hashlib
from cryptography.fernet import Fernet
from django.conf import settings
from .models import Despacho, Camion, HistorialMovimientos, Mercancia
from django.core.serializers.json import DjangoJSONEncoder
from django.forms.models import model_to_dict
import json
import math

def actualizar_estados_automaticos(empresa):
    now = timezone.now()
    despachos_activos = Despacho.activos.filter(
        empresa=empresa,
        fecha_salida_real__isnull=False
    ).exclude(estado_despacho='Finalizado')

    count_actualizados = 0

    for d in despachos_activos:
        cambio_realizado = False
        tiempo_transcurrido = now - d.fecha_salida_real
        
        tiempo_carga = timedelta(hours=4) 
        tiempo_total_para_fin = timedelta(days=1, hours=4) 


        if tiempo_transcurrido >= tiempo_total_para_fin:
            if d.estado_despacho != 'Finalizado':
                d.estado_despacho = 'Finalizado'
                
                if d.id_camion:
                    d.id_camion.estado_camion = 'DISPONIBLE'
                    d.id_camion.save()
                
                # Liberar Rampla 
                if d.id_rampla:
                    d.id_rampla.estado_rampla = 'DISPONIBLE'
                    d.id_rampla.save()
                
                cambio_realizado = True

        # 2. EN TRÁNSITO 
        elif tiempo_transcurrido >= tiempo_carga:
            if d.estado_despacho != 'En Tránsito':
                d.estado_despacho = 'En Tránsito'
                
                # Ocupar Camión
                if d.id_camion:
                    d.id_camion.estado_camion = 'EN_USO' 
                    d.id_camion.save()
                
                # Ocupar Rampla 
                if d.id_rampla:
                    d.id_rampla.estado_rampla = 'EN_USO'
                    d.id_rampla.save()
                    
                cambio_realizado = True

        # 3. EN CARGA
        elif tiempo_transcurrido >= timedelta(seconds=0):
            if d.estado_despacho != 'En Carga':
                d.estado_despacho = 'En Carga'
                
                # Ocupar Camión
                if d.id_camion:
                    d.id_camion.estado_camion = 'EN_USO' 
                    d.id_camion.save()
                
                # Ocupar Rampla 
                if d.id_rampla:
                    d.id_rampla.estado_rampla = 'EN_USO'
                    d.id_rampla.save()
                
                cambio_realizado = True

        if cambio_realizado:
            d.save() 
            count_actualizados += 1
            
    return count_actualizados

def registrar_auditoria(empresa, usuario, modelo, accion, descripcion, mercancia=None, sucursal=None, instancia=None, instancia_vieja=None):
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
            id_mercancia=mercancia,
            instancia_vieja=instancia_vieja,
            instancia=instancia 
        )
    except Exception as e:
        print("\n" + "="*50)
        print(f"ERROR CRÍTICO AL GUARDAR AUDITORÍA")
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
    try:
        fernet = Fernet(settings.FIELD_ENCRYPTION_KEY.encode())
    except Exception:
        fernet = None

    for m in mercancias:
        cliente_id = m.id_cliente.id_cliente if m.id_cliente else 0
        destino_id = m.id_destino.id_destino if m.id_destino else 0
        
        clave = f"{cliente_id}_{destino_id}"
        
        if clave not in grupos:
            grupos[clave] = {
                'normales': [],
                'proveedor': [],
                'normales_alt': [],
                'proveedor_alt': []
            }
            
        es_alternativa = False
        if m.direccion_entrega:
            dir_entrega = m.direccion_entrega.strip().lower()
            dir1 = ""
            dir2 = ""
            
            if m.id_cliente and fernet:
                try:
                    campo_dir1 = getattr(m.id_cliente, 'direccion_cifrado', getattr(m.id_cliente, 'direccion_cliente_cifrado', None))
                    if campo_dir1:
                        dir1 = fernet.decrypt(campo_dir1.encode('utf-8')).decode('utf-8').strip().lower()
                    
                    campo_dir2 = getattr(m.id_cliente, 'direccion_cifrado2', getattr(m.id_cliente, 'direccion2_cliente_cifrado', None))
                    if campo_dir2:
                        dir2 = fernet.decrypt(campo_dir2.encode('utf-8')).decode('utf-8').strip().lower()
                except Exception:
                    dir1 = ""
                    dir2 = ""

            if dir_entrega and dir_entrega != dir1 and dir_entrega != dir2:
                es_alternativa = True

        es_proveedor = getattr(m, 'paga_proveedor', False)

        if es_proveedor and es_alternativa:
            grupos[clave]['proveedor_alt'].append(m)
        elif es_proveedor and not es_alternativa:
            grupos[clave]['proveedor'].append(m)
        elif not es_proveedor and es_alternativa:
            grupos[clave]['normales_alt'].append(m)
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

    def procesar_lista(lista_cargas, es_proveedor, es_alternativa, index_actual, destino_nombre):
        if not lista_cargas:
            return
            
        destino_upper = str(destino_nombre).strip().upper() if destino_nombre else 'I'
        
        if destino_upper == 'CALAMA':
            inicial_destino = 'CA'
        else:
            inicial_destino = destino_upper[0] if destino_upper else 'I'

        sufijo_alt = "-A" if es_alternativa else ""
        sufijo_prov = "-P" if es_proveedor else ""
        sufijo_final = f"{sufijo_alt}{sufijo_prov}"
        
        total_items = len(lista_cargas)
        total_paginas = math.ceil(total_items / 10.0)

        for idx, m in enumerate(lista_cargas):
            pagina_actual = (idx // 10) + 1
            
            if total_paginas > 1:
                codigo = f"{inicial_origen}{numero_ruta}-{index_actual}-{pagina_actual}{inicial_destino}{sufijo_final}"
            else:
                codigo = f"{inicial_origen}{numero_ruta}-{index_actual}{inicial_destino}{sufijo_final}"
            
            m.numero_orden_entrega = codigo
            mercancias_a_actualizar.append(m)

    for clave, data in grupos.items():
        todas = data['normales'] + data['proveedor'] + data['normales_alt'] + data['proveedor_alt']
        if not todas:
            continue
            
        destino_str = getattr(todas[0].id_destino, 'nombre_ciudad', 'Iquique')
        
        procesar_lista(data['normales'], False, False, orden_index, destino_str)
        procesar_lista(data['proveedor'], True, False, orden_index, destino_str)
        procesar_lista(data['normales_alt'], False, True, orden_index, destino_str)
        procesar_lista(data['proveedor_alt'], True, True, orden_index, destino_str)
        
        orden_index += 1

    if mercancias_a_actualizar:
        Mercancia.objects.bulk_update(mercancias_a_actualizar, ['numero_orden_entrega'])