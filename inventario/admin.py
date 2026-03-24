from django.contrib import admin
from .models import (
    Cliente, Conductor, Camion, Ruta, Destino, 
    Ubicacion, Despacho, Mercancia, Estanteria,AreaRestringida,Proveedor
)

# Registra todos los modelos para que aparezcan en el admin
admin.site.register(Cliente)
admin.site.register(Conductor)
admin.site.register(Camion)
admin.site.register(Ruta)
admin.site.register(Destino)
admin.site.register(Ubicacion)
admin.site.register(Despacho)
admin.site.register(Mercancia)
admin.site.register(Proveedor)

@admin.register(Estanteria)
class EstanteriaAdmin(admin.ModelAdmin):
    list_display = ('codigo_estanteria', 'empresa', 'pos_x', 'pos_y', 'pos_z', 'num_modulos_ancho', 'num_niveles_alto', 'activo')
    list_filter = ('empresa', 'activo')
    search_fields = ('codigo_estanteria',)

@admin.register(AreaRestringida)
class AreaRestringidaAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'empresa', 'pos_x', 'pos_z', 'ancho', 'largo', 'color')
    list_filter = ('empresa',)
    search_fields = ('nombre',)
    
