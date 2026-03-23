from django.contrib import admin
from .models import Empresa, Perfil

@admin.register(Empresa)
class EmpresaAdmin(admin.ModelAdmin):
    list_display = ('nombre_empresa', 'rut_empresa', 'activa', 'fecha_creacion')
    search_fields = ('nombre_empresa', 'rut_empresa')

@admin.register(Perfil)
class PerfilAdmin(admin.ModelAdmin):
    list_display = ('user', 'get_empresa', 'telefono')
    search_fields = ('user__username', 'empresa__nombre_empresa')

    @admin.display(description='Empresa')
    def get_empresa(self, obj):
        if obj.empresa:
            return obj.empresa.nombre_empresa
        return "N/A"