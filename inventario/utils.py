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
import re
from collections import defaultdict

def actualizar_estados_automaticos(empresa):
    now = timezone.now()
    despachos_activos = Despacho.activos.filter(
        empresa=empresa,
        fecha_salida_real__isnull=False
    ).exclude(estado_despacho__in=['Finalizado', 'Eliminado'])

    count_actualizados = 0
    tiempo_carga = timedelta(hours=2)

    for d in despachos_activos:
        cambio_realizado = False
        tiempo_transcurrido = now - d.fecha_salida_real

        if tiempo_transcurrido >= tiempo_carga:
            if d.estado_despacho != 'En Tránsito':
                d.estado_despacho = 'En Tránsito'
                
                if d.id_camion and d.id_camion.estado_camion != 'EN_USO':
                    d.id_camion.estado_camion = 'EN_USO'
                    d.id_camion.save()
                
                if hasattr(d, 'id_rampla') and d.id_rampla and d.id_rampla.estado_rampla != 'EN_USO':
                    d.id_rampla.estado_rampla = 'EN_USO'
                    d.id_rampla.save()
                    
                cambio_realizado = True

        elif tiempo_transcurrido >= timedelta(seconds=0):
            if d.estado_despacho != 'En Carga':
                d.estado_despacho = 'En Carga'
                
                if d.id_camion and d.id_camion.estado_camion != 'EN_USO':
                    d.id_camion.estado_camion = 'EN_USO'
                    d.id_camion.save()
                
                if hasattr(d, 'id_rampla') and d.id_rampla and d.id_rampla.estado_rampla != 'EN_USO':
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

def es_oe_valida(codigo: str) -> bool:
    if not codigo:
        return False
    texto = str(codigo).strip()
    return bool(texto and texto not in ['Sin N/O', 'N/R', 'None', '-'])


def extraer_indice_oe(codigo: str) -> int | None:
    if not es_oe_valida(codigo):
        return None
    match = re.search(r'-(\d+)', str(codigo).strip())
    if match:
        try:
            return int(match.group(1))
        except ValueError:
            pass
    match_simple = re.match(r'^\D*(\d+)', str(codigo).strip())
    if match_simple:
        try:
            return int(match_simple.group(1))
        except ValueError:
            pass
            
    return None
def generar_numeros_orden_despacho(despacho, forzar_recalculo: bool = False):
    mercancias = Mercancia.activos.filter(id_despacho=despacho).order_by(
        'id_destino__nombre_ciudad', 
        'id_cliente__nombre_cliente'
    )

    if not mercancias.exists():
        return

    indices_usados = set()
    for m in mercancias:
        if es_oe_valida(m.numero_orden_entrega):
            idx = extraer_indice_oe(m.numero_orden_entrega)
            if idx is not None:
                indices_usados.add(idx)

    siguiente_indice_nuevo = (max(indices_usados) + 1) if indices_usados else 1

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
    
    mercancias_a_actualizar = []

    def procesar_lista(lista_cargas, es_proveedor, es_alternativa, index_actual, destino_nombre, prov_idx=0):
        if not lista_cargas:
            return
            
        destino_upper = str(destino_nombre).strip().upper() if destino_nombre else 'I'
        if destino_upper == 'CALAMA':
            inicial_destino = 'CA'
        else:
            inicial_destino = destino_upper[0] if destino_upper else 'I'

        sufijo_alt = "-A" if es_alternativa else ""
        
        if es_proveedor:
            sufijo_prov = "-P" if prov_idx == 0 else f"-P{prov_idx}"
        else:
            sufijo_prov = ""
            
        sufijo_final = f"{sufijo_alt}{sufijo_prov}"
        
        total_items = len(lista_cargas)
        total_paginas = math.ceil(total_items / 10.0)

        for idx, m in enumerate(lista_cargas):
            if not forzar_recalculo and es_oe_valida(m.numero_orden_entrega):
                continue

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
        indice_grupo = None
        if not forzar_recalculo:
            for m in todas:
                if es_oe_valida(m.numero_orden_entrega):
                    idx_encontrado = extraer_indice_oe(m.numero_orden_entrega)
                    if idx_encontrado is not None:
                        indice_grupo = idx_encontrado
                        break
        if indice_grupo is None:
            while siguiente_indice_nuevo in indices_usados:
                siguiente_indice_nuevo += 1
            indice_grupo = siguiente_indice_nuevo
            indices_usados.add(indice_grupo)
            siguiente_indice_nuevo += 1

        destino_str = getattr(todas[0].id_destino, 'nombre_ciudad', 'Iquique')
        
        procesar_lista(data['normales'], False, False, indice_grupo, destino_str)
        
        prov_normales_grupos = defaultdict(list)
        for m in data['proveedor']:
            p_id = m.id_proveedor_id or 0
            prov_normales_grupos[p_id].append(m)
            
        for p_idx, p_id in enumerate(sorted(prov_normales_grupos.keys())):
            procesar_lista(prov_normales_grupos[p_id], True, False, indice_grupo, destino_str, prov_idx=p_idx)
            
        procesar_lista(data['normales_alt'], False, True, indice_grupo, destino_str)
        
        prov_alt_grupos = defaultdict(list)
        for m in data['proveedor_alt']:
            p_id = m.id_proveedor_id or 0
            prov_alt_grupos[p_id].append(m)
            
        for p_idx, p_id in enumerate(sorted(prov_alt_grupos.keys())):
            procesar_lista(prov_alt_grupos[p_id], True, True, indice_grupo, destino_str, prov_idx=p_idx)

    if mercancias_a_actualizar:
        Mercancia.objects.bulk_update(mercancias_a_actualizar, ['numero_orden_entrega'])