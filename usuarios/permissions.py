from rest_framework import permissions

def _get_rol_from_user(request):
    if request.user and request.user.is_authenticated:
        if hasattr(request.user, 'perfil') and request.user.perfil.rol:
            return request.user.perfil.rol
    return None

class IsAdminEmpresa(permissions.BasePermission):
    message = "Debe ser Dueño o Secretaria para realizar esta acción."

    def has_permission(self, request, view):
        rol = _get_rol_from_user(request)
        return rol in ['DUENO', 'SECRETARIA']

class IsJefeDeBodega(permissions.BasePermission):
    message = "Debe ser Jefe de Bodega para esta acción."

    def has_permission(self, request, view):
        rol = _get_rol_from_user(request)
        return rol in ['DUENO', 'SECRETARIA', 'JEFE_BODEGA']

class IsOperario(permissions.BasePermission):
    message = "Debe ser un Operario o superior para esta acción."

    def has_permission(self, request, view):
        rol = _get_rol_from_user(request)
        return rol in ['DUENO', 'SECRETARIA', 'JEFE_BODEGA', 'OPERARIO']