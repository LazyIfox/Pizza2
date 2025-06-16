from rest_framework import permissions

class IsManager(permissions.BasePermission):
    """Разрешение для менеджера (is_staff=True) или суперпользователя"""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and
                    (request.user.is_staff or request.user.is_superuser))


class IsAdmin(permissions.BasePermission):
    """Разрешение только для суперпользователя"""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and
                    request.user.is_superuser)


class IsCook(permissions.BasePermission):
    """Разрешение для повара"""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and
                    request.user.is_cook)

class IsClient(permissions.BasePermission):
    def has_permission(self, request, view):
        return (
            request.user and request.user.is_authenticated and
            not request.user.is_staff and
            not request.user.is_superuser and
            not request.user.is_cook
        )

class IsCookOrManager(permissions.BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and (
            user.is_staff or user.is_superuser or getattr(user, 'is_cook', False)
        ))