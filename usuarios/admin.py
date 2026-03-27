from django.contrib import admin
from .models import Empresa, Perfil, Sucursal

@admin.register(Empresa)
class EmpresaAdmin(admin.ModelAdmin):
    list_display = ('nombre_empresa', 'rut_empresa', 'activa', 'fecha_creacion')
    search_fields = ('nombre_empresa', 'rut_empresa')

@admin.register(Perfil)
class PerfilAdmin(admin.ModelAdmin):
    list_display = ('user', 'get_empresa', 'telefono', 'get_sucursal')
    search_fields = ('user__username', 'empresa__nombre_empresa', 'sucursal__nombre')

    @admin.display(description='Empresa')
    def get_empresa(self, obj):
        if obj.empresa:
            return obj.empresa.nombre_empresa
        return "N/A"
    @admin.display(description='Sucursal')
    def get_sucursal(self, obj):
        if obj.sucursal:
            return obj.sucursal.nombre
        return "N/A"

@admin.register(Sucursal)
class SucursalAdmin(admin.ModelAdmin):
    list_display = ('id', 'nombre', 'ciudad', 'empresa')
    search_fields = ('nombre', 'ciudad')
    list_filter = ('empresa', 'ciudad')