from django.shortcuts import render, redirect, get_object_or_404
from django.db import connection
from rest_framework import viewsets, status, filters
from rest_framework.response import Response
from rest_framework.decorators import action, api_view
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAdminUser as IsAdmin, BasePermission
from django.utils import timezone
from django.contrib.auth import authenticate, login, logout
from pizza_lab.models import Pizza, ProductInOrder, Order_pizza, CustomUser
from serializers import PizzaSerializer, OrderPizzaSerializer, ProductInOrderSerializer,LoginSerializer,RegisterSerializer
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from drf_yasg.utils import swagger_auto_schema
from pizza_lab.models import CustomUser
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import permission_classes, authentication_classes
from rest_framework.authentication import SessionAuthentication, BasicAuthentication
from django.conf import settings
import redis
from .permissions import IsAdmin, IsManager, IsCook, IsClient, IsCookOrManager
from rest_framework import permissions
from django.middleware.csrf import get_token
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.csrf import csrf_protect
from rest_framework.views import APIView

session_storage = redis.StrictRedis(host=settings.REDIS_HOST, port=settings.REDIS_PORT)

@csrf_exempt
@swagger_auto_schema(method='post', request_body=RegisterSerializer)
@api_view(['POST'])
@permission_classes([AllowAny])
def register_user(request):
    is_authenticated = request.user and request.user.is_authenticated
    role = request.data.get('role')

    if not is_authenticated and role in ['moderator', 'superuser', 'cook']:
        return Response(
            {'error': 'Только модератор или админ может создавать сотрудников.'},
            status=status.HTTP_403_FORBIDDEN
        )

    if is_authenticated and role in ['moderator', 'superuser', 'cook']:
        if not (request.user.is_superuser or request.user.is_staff):
            return Response(
                {'error': 'Недостаточно прав для создания пользователя с ролью сотрудника.'},
                status=status.HTTP_403_FORBIDDEN
            )

    serializer = RegisterSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response({'message': 'User registered'}, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@swagger_auto_schema(method='post', request_body=LoginSerializer)
@api_view(['POST'])
@permission_classes([AllowAny])
@authentication_classes([])
@ensure_csrf_cookie
def login_user(request):
    username = request.data.get('username')
    password = request.data.get('password')
    user = authenticate(request, username=username, password=password)
    
    if user:
        login(request, user)
        csrf_token = get_token(request)

        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT id
                FROM pizza_lab_order_pizza
                WHERE client_id = %s AND status = 'DRAFT'
            """, [user.id])
            row = cursor.fetchone()

        draft_order_id = row[0] if row else 0

        return Response({
            'message': 'Login successful',
            'username': user.username,
            'is_staff': user.is_staff,
            'is_superuser': user.is_superuser,
            'is_cook': getattr(user, 'is_cook', False),
            'csrf_token': csrf_token,
            'draft_order_id': draft_order_id,
        }, status=status.HTTP_200_OK)

    return Response({'error': 'Invalid credentials'}, status=status.HTTP_400_BAD_REQUEST)

@swagger_auto_schema(method='post')
@api_view(['POST'])
@permission_classes([IsAuthenticated])
@csrf_protect
def logout_user(request):
    logout(request)
    return Response({'message': 'Logout successful'})


@authentication_classes([SessionAuthentication, BasicAuthentication])
@permission_classes([IsAuthenticated])
def TypesPizzas(request):
    query = request.GET.get('text', '').strip().lower()

    pizzas = Pizza.objects.filter(deleted=False)

    if query:
        pizzas = pizzas.filter(name__icontains=query)

    products_in_draft_order = 0
    if request.user.is_authenticated:
        products_in_draft_order = ProductInOrder.objects.filter(
            order__client=request.user,
            order__status=Order_pizza.OrderStatus.DRAFT
        ).count()

    return render(request, 'pizza.html', {
        'pizzas': pizzas,
        'items_in_cart': products_in_draft_order,
    })

def Detail(request, id):
    pizza = get_object_or_404(Pizza, id=id, deleted=False)

    return render(request, "detail.html", {
        "pizza": pizza
    })

def remove_pizza(request, id):
    if request.method != "POST":
        return redirect('pizzas')

    query = "UPDATE pizza_lab_pizza SET deleted = TRUE WHERE id = %s"

    with connection.cursor() as cursor:
        cursor.execute(query, [id])

    return redirect('pizzas')

def sendText(request):
    input_text = request.POST['text']

class PizzaViewSet(viewsets.ModelViewSet):
    queryset = Pizza.objects.all()
    serializer_class = PizzaSerializer
    search_fields = ['name']
    ordering_fields = ['price']
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    authentication_classes = [SessionAuthentication, BasicAuthentication]
    model_class = CustomUser

    def get_queryset(self):
        return Pizza.objects.filter(deleted=False)
    
    def list(self, request, *args, **kwargs): #вывод всех пицц
        queryset = self.filter_queryset(self.get_queryset())

        user = request.user
        if user.is_authenticated and getattr(user, 'is_cook', False):
            queryset = queryset.filter(cook=user)
        is_vegetarian = request.query_params.get('is_vegetarian', None)
        if is_vegetarian is not None:
            queryset = queryset.filter(is_vegetarian=is_vegetarian.lower() == 'true')

        ordering = request.query_params.get('ordering', None)
        if ordering:
            queryset = queryset.order_by(ordering)

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response({
                "pizzas": serializer.data,
                "draft_order_id": self.get_draft_order_id(request),
            })

        serializer = self.get_serializer(queryset, many=True)
        return Response({
            "pizzas": serializer.data,
            "draft_order_id": self.get_draft_order_id(request),
        })

    def get_draft_order_id(self, request): #нужен для вывода id заявки-черновика текущего пользователя.
        user = request.user
        if not user.is_authenticated:
            return None
        draft_order = Order_pizza.objects.filter(
            client=user,
            status=Order_pizza.OrderStatus.DRAFT
        ).first()
        return draft_order.id if draft_order else None
    
    @swagger_auto_schema(request_body=PizzaSerializer)
    def create(self, request, *args, **kwargs): #создание пиццы
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
    @swagger_auto_schema(request_body=PizzaSerializer)
    def update(self, request, pk=None): #изменение информации о пицце
        pizza = get_object_or_404(Pizza, pk=pk)
        serializer = self.get_serializer(pizza, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
    def delete(self, request, pk, format=None):
        pizza = get_object_or_404(Pizza, pk=pk)
        pizza.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

class OrderPizzaViewSet(viewsets.ModelViewSet):
    queryset = Order_pizza.objects.exclude(status=Order_pizza.OrderStatus.DELETED)
    serializer_class = OrderPizzaSerializer
    authentication_classes = [SessionAuthentication, BasicAuthentication]
    permission_classes = [IsCookOrManager]

    def get_permissions(self):
        if self.action == 'list':
            if self.request.user.is_authenticated and (
                self.request.user.is_staff or self.request.user.is_superuser or getattr(self.request.user, 'is_cook', False)
            ):
                return [IsCookOrManager()]
            else:
                return [IsClient()]
        elif self.action in ['create', 'add_to_draft']:
            return [IsClient()]
        elif self.action in ['update_order', 'reject', 'complete']:
            return [IsManager()]
        elif self.action == 'form':
            return [IsAuthenticated()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user

        if getattr(self, 'swagger_fake_view', False) or not user.is_authenticated:
            return Order_pizza.objects.none()

        queryset = super().get_queryset()

        if user.is_cook:
            queryset = queryset.filter(
                status=Order_pizza.OrderStatus.FORMED,
                productinorder__product__cook=user
            ).distinct()
        elif not (user.is_superuser or user.is_staff):
            queryset = queryset.filter(client=user)

        status = self.request.query_params.get('status')
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        client_username = self.request.query_params.get('client_username')
        manager_username = self.request.query_params.get('manager_username')

        if status:
            queryset = queryset.filter(status=status)
        if start_date and end_date:
            queryset = queryset.filter(formation_datetime__range=[start_date, end_date])
        if client_username:
            queryset = queryset.filter(client__username=client_username)
        if manager_username:
            queryset = queryset.filter(manager__username=manager_username)

        return queryset

    def perform_create(self, serializer):
        #фиксируем пользователя
        serializer.save(client=self.request.user, status=Order_pizza.OrderStatus.DRAFT)

    @swagger_auto_schema(request_body=OrderPizzaSerializer)
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            self.perform_create(serializer)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['put'])
    @swagger_auto_schema(request_body=OrderPizzaSerializer)
    def update_order(self, request, pk=None):
        order = self.get_object()
        serializer = self.get_serializer(order, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['put']) #меняет статус на сформирован
    def form(self, request, pk=None):
        order = self.get_object()
        if order.status != Order_pizza.OrderStatus.DRAFT:
            return Response({"error": "Only draft orders can be formed."}, status=status.HTTP_400_BAD_REQUEST)

        order.status = Order_pizza.OrderStatus.FORMED
        order.formation_datetime = timezone.now()
        order.save()
        return Response(OrderPizzaSerializer(order).data)

    @action(detail=True, methods=['put']) #меняет статус на завершён
    def complete(self, request, pk=None):
        order = self.get_object()
        if order.status != Order_pizza.OrderStatus.FORMED:
            return Response({"error": "Only formed orders can be completed."}, status=status.HTTP_400_BAD_REQUEST)

        order.status = Order_pizza.OrderStatus.COMPLETED
        order.completion_datetime = timezone.now()
        order.manager = request.user
        order.save()
        return Response(OrderPizzaSerializer(order).data)

    @action(detail=True, methods=['put']) #меняет статус на отклонён
    def reject(self, request, pk=None):
        order = self.get_object()
        if order.status != Order_pizza.OrderStatus.FORMED:
            return Response({"error": "Only formed orders can be rejected."}, status=status.HTTP_400_BAD_REQUEST)

        order.status = Order_pizza.OrderStatus.REJECTED
        order.completion_datetime = timezone.now()
        order.manager = request.user
        order.save()
        return Response(OrderPizzaSerializer(order).data)

    @action(detail=False, methods=['post'])  # добавление пиццы в заявку черновик
    @swagger_auto_schema(request_body=OrderPizzaSerializer)
    def add_to_draft(self, request):
        user = request.user
        if not user.is_authenticated:
            return Response({"error": "User must be authenticated."}, status=401)

        draft_order = Order_pizza.objects.filter(client=user, status=Order_pizza.OrderStatus.DRAFT).first()

        if not draft_order:
            draft_order = Order_pizza.objects.create(client=user, status=Order_pizza.OrderStatus.DRAFT)

        product_id = request.data.get('product_id')
        quantity = request.data.get('quantity')

        if not product_id or not quantity:
            return Response({"error": "Product ID and quantity are required."}, status=status.HTTP_400_BAD_REQUEST)

        product = get_object_or_404(Pizza, id=product_id)
        product_in_order, created = ProductInOrder.objects.get_or_create(
            order=draft_order,
            product=product,
            defaults={'quantity': quantity}
        )

        if not created:
            product_in_order.quantity += int(quantity)
            product_in_order.save()

        return Response({
            "message": "Product added to draft order.",
            "order_id": draft_order.id
        }, status=status.HTTP_200_OK)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.status = Order_pizza.OrderStatus.DELETED
        instance.save()
        return Response(status=status.HTTP_204_NO_CONTENT)

    def retrieve(self, request, *args, **kwargs): #возвращает заявку по id 
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def user_orders(self, request):
        user = request.user
        if not user.is_authenticated:
            return Response({"error": "User must be authenticated."}, status=401)

        if user.is_cook:
            orders = Order_pizza.objects.exclude(
                status__in=[Order_pizza.OrderStatus.DELETED, Order_pizza.OrderStatus.DRAFT]
            )
        else:
            orders = Order_pizza.objects.filter(client=user).exclude(status=Order_pizza.OrderStatus.DELETED)

        serializer = self.get_serializer(orders, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['delete'])
    def remove_pizza(self, request, pk=None):
        order = self.get_object()
        product_id = request.data.get('product_id')

        if not product_id:
            return Response({"error": "Product ID is required."}, status=status.HTTP_400_BAD_REQUEST)

        product_in_order = get_object_or_404(ProductInOrder, order=order, product_id=product_id)

        if product_in_order.quantity > 1:
            product_in_order.quantity -= 1
            product_in_order.save()
        else:
            product_in_order.delete()

            if not ProductInOrder.objects.filter(order=order).exists():
                order.delete()
                return Response({"message": "Order deleted as it was empty."}, status=status.HTTP_200_OK)

        return Response({"message": "Product removed from order."}, status=status.HTTP_200_OK)
    
class ProductInOrderViewSet(viewsets.ModelViewSet):
    queryset = ProductInOrder.objects.all()
    serializer_class = ProductInOrderSerializer
    authentication_classes = [SessionAuthentication, BasicAuthentication]
    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(request_body=ProductInOrderSerializer)
    def update(self, request, pk=None):
        product_in_order = self.get_object()
        serializer = self.get_serializer(product_in_order, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    @action(detail=False, methods=['post'], url_path='increment-cooked')
    def increment_cooked(self, request):
        order_id = request.data.get('order_id')
        product_id = request.data.get('product_id')

        if not order_id or not product_id:
            return Response({'error': 'order_id and product_id are required.'}, status=400)

        try:
            product_in_order = ProductInOrder.objects.get(order_id=order_id, product_id=product_id)
        except ProductInOrder.DoesNotExist:
            return Response({'error': 'ProductInOrder not found.'}, status=404)

        if product_in_order.end_quantity < product_in_order.quantity:
            product_in_order.end_quantity += 1
            product_in_order.save()
            return Response({'message': 'Cooked count incremented.'}, status=200)
        else:
            return Response({'message': 'All pizzas already cooked.'}, status=400)

class CookTaskListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if not getattr(user, 'is_cook', False):
            return Response({'detail': 'Only cooks can access this.'}, status=403)

        #получаем все позиции, где заказ сформирован и пицца под ответсвенностью повару
        product_entries = ProductInOrder.objects.filter(
            order__status='FORMED',
            product__cook=user
        ).select_related('product', 'order')

        result = []

        for entry in product_entries:
            remaining = entry.quantity - entry.end_quantity
            if remaining <= 0:
                continue

            result.append({
                'pizza_id': entry.product.id,
                'pizza_name': entry.product.name,
                'pizza_image': request.build_absolute_uri(entry.product.image.url) if entry.product.image else None,
                'order_id': entry.order.id,
                'formation_datetime': entry.order.formation_datetime,
                'remaining_to_cook': remaining,
            })

        return Response(result, status=status.HTTP_200_OK)
