"""
URL configuration for pizza project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path
from pizza_lab import views
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from pizza_lab.views import PizzaViewSet, OrderPizzaViewSet,ProductInOrderViewSet, CookTaskListView
from rest_framework.authtoken.views import obtain_auth_token
from rest_framework import permissions
from drf_yasg.views import get_schema_view
from drf_yasg import openapi
from pizza_lab.views import login_user, logout_user, register_user

router = DefaultRouter()
router.register(r'pizzas', PizzaViewSet, basename='pizza')
router.register(r'orders', OrderPizzaViewSet, basename='order')
router.register(r'product_in_order', ProductInOrderViewSet)

schema_view = get_schema_view(
   openapi.Info(
      title="Snippets API",
      default_version='v1',
      description="Test description",
      terms_of_service="https://www.google.com/policies/terms/",
      contact=openapi.Contact(email="contact@snippets.local"),
      license=openapi.License(name="BSD License"),
   ),
   public=True,
   permission_classes=(permissions.AllowAny,),
)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', views.TypesPizzas, name='pizzas'),
    path('pizza/<int:id>/', views.Detail, name='pizza_detail'),
    path('remove_pizza/<int:id>/', views.remove_pizza, name='remove_pizza'),
    path('api/', include(router.urls)),
    path('api/get-token/', obtain_auth_token, name='get-token'),
    path('api-auth/', include('rest_framework.urls', namespace='rest_framework')),
    path('login',  login_user, name='login'),
    path('logout', logout_user, name='logout'),
    path('swagger/', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),
    path('register/', register_user, name='register'),
    path('api/cook/tasks/', CookTaskListView.as_view(), name='cook-task-list'),
]
