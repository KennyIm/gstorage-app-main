from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions
from inventario.models import Ubicacion, Mercancia, Estanteria, AreaRestringida 
from inventario.views import get_empresa_from_user

class Almacen3DDataAPI(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, format=None):
        empresa = get_empresa_from_user(request)
        
        data_3d = {
            'dimensiones': {
                'ancho': empresa.almacen_ancho,
                'largo': empresa.almacen_largo,
                'alto': empresa.almacen_alto
            },
            'estanterias': [],
            'zonas_suelo': [],
            'areas_restringidas': []
        }

        # 1. Obtenemos todas las estanterías de la empresa
        estanterias = Estanteria.activos.filter(empresa=empresa)
        for est in estanterias:
            estanteria_data = {
                'id': est.id,
                'codigo': est.codigo_estanteria,
                'x': float(est.pos_x),
                'y': float(est.pos_y),
                'z': float(est.pos_z),
                'num_modulos_ancho': est.num_modulos_ancho,
                'num_niveles_alto': est.num_niveles_alto,
                'num_profundidad': est.num_profundidad,
                'ancho_hueco_m': float(est.ancho_hueco_m),
                'alto_hueco_m': float(est.alto_hueco_m),
                'profundo_hueco_m': float(est.profundo_hueco_m),
                'ubicaciones': []
            }
            
            # 2. Obtenemos las ubicaciones dentro de esta estantería
            ubicaciones_en_estanteria = Ubicacion.activos.filter(estanteria=est, es_zona_suelo=False)
            for u in ubicaciones_en_estanteria:
                ubicacion_data = {
                    'id': u.id_ubicacion,
                    'codigo': u.codigo_ubicacion,
                    'x_rel': u.pos_x_rel,
                    'y_rel': u.pos_y_rel,
                    'z_rel': u.pos_z_rel,
                    'ocupado': u.estado_ocupado,
                    'cap_kg': float(u.capacidad_maxima_kg) if u.capacidad_maxima_kg else None,
                    'cap_m3': float(u.capacidad_max_m3) if u.capacidad_max_m3 else None,
                    'mercancia': None
                }
                if u.estado_ocupado:
                    mercancia = Mercancia.activos.filter(id_ubicacion_actual=u).first()
                    if mercancia:
                        ubicacion_data['mercancia'] = {
                            'id': mercancia.id_mercancia,
                            'cliente': mercancia.id_cliente.nombre_cliente,
                            'descripcion': mercancia.descripcion_carga,
                            'bultos': mercancia.cantidad_bultos,
                            'kg': float(mercancia.kg) if mercancia.kg else 0,
                            'fecha_ingreso': mercancia.fecha_ingreso.strftime('%d/%m/%Y %H:%M'),
                            'fecha_ingreso_iso': mercancia.fecha_ingreso.isoformat(),
                            'despacho_id': mercancia.id_despacho.id_despacho if mercancia.id_despacho else None
                        }
                estanteria_data['ubicaciones'].append(ubicacion_data)
            
            data_3d['estanterias'].append(estanteria_data)

        # 3. Obtenemos las ubicaciones que son zonas de suelo
        zonas_suelo = Ubicacion.activos.filter(empresa=empresa, es_zona_suelo=True)
        for u in zonas_suelo:
            zona_data = {
                'id': u.id_ubicacion,
                'codigo': u.codigo_ubicacion,
                'x': float(u.pos_x_rel), 
                'y': float(u.pos_y_rel),
                'z': float(u.pos_z_rel),
                'width': 2, 
                'height': 0.1, 
                'depth': 2,
                'ocupado': u.estado_ocupado,
                'cap_kg': float(u.capacidad_maxima_kg) if u.capacidad_maxima_kg else None,
                'cap_m3': float(u.capacidad_max_m3) if u.capacidad_max_m3 else None,
                'mercancia': None
            }
            if u.estado_ocupado:
                mercancia = Mercancia.activos.filter(id_ubicacion_actual=u).first()
                if mercancia:
                    zona_data['mercancia'] = {
                        'id': mercancia.id_mercancia,
                        'cliente': mercancia.id_cliente.nombre_cliente,
                        'descripcion': mercancia.descripcion_carga,
                        'bultos': mercancia.cantidad_bultos,
                        'estado': mercancia.estado,
                        'kg': float(mercancia.kg) if mercancia.kg else 0,
                        'fecha_ingreso': mercancia.fecha_ingreso.strftime('%d/%m/%Y %H:%M'),
                        'fecha_ingreso_iso': mercancia.fecha_ingreso.isoformat(),
                        'despacho_id': mercancia.id_despacho.id_despacho if mercancia.id_despacho else None
                    }
            data_3d['zonas_suelo'].append(zona_data)

        areas = AreaRestringida.objects.filter(empresa=empresa)
        for area in areas:
            data_3d['areas_restringidas'].append({
                'id': area.id,
                'nombre': area.nombre,
                'x': area.pos_x,
                'z': area.pos_z,
                'width': area.ancho,
                'depth': area.largo,
                'height': area.alto,
                'color': area.color
            })

        return Response(data_3d)