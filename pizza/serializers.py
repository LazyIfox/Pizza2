from rest_framework import serializers
from pizza_lab.models import Pizza, Order_pizza, ProductInOrder
from collections import OrderedDict
from pizza_lab.models import CustomUser

class PizzaSerializer(serializers.ModelSerializer):
    cook = serializers.CharField(source='cook.username', read_only=True)

    class Meta:
        model = Pizza
        fields = ['id', 'name', 'price', 'description', 'cook', 'deleted', 'image', 'is_vegetarian']

    def get_fields(self):
        new_fields = OrderedDict()
        for name, field in super().get_fields().items():
            field.required = False
            new_fields[name] = field
        return new_fields

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        if 'price' in representation and isinstance(representation['price'], float):
            representation['price'] = int(representation['price'])
        return representation
    
class ProductInOrderSerializer(serializers.ModelSerializer):
    product = PizzaSerializer()

    class Meta:
        model = ProductInOrder
        fields = ['id', 'product', 'quantity']

    def get_fields(self):
        new_fields = OrderedDict()
        for name, field in super().get_fields().items():
            field.required = False
            new_fields[name] = field
        return new_fields

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ['username', 'password', 'is_superuser', 'is_staff', 'is_cook']
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        user = CustomUser.objects.create_user(
            username=validated_data['username'],
            password=validated_data['password'],
            is_superuser=validated_data.get('is_superuser', False),
            is_staff=validated_data.get('is_staff', False)
        )
        return user
    
class LoginSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=40, required=True)
    password = serializers.CharField(max_length=128, required=True)
    
class RegisterSerializer(serializers.ModelSerializer):
    ROLE_CHOICES = [
        ('moderator', 'Модератор'),
        ('superuser', 'Админ'),
        ('cook', 'Повар'),
    ]

    role = serializers.ChoiceField(choices=ROLE_CHOICES, write_only=True, required=False)
    password = serializers.CharField(write_only=True)

    class Meta:
        model = CustomUser
        fields = ['username', 'password', 'role']

    def create(self, validated_data):
        role = validated_data.pop('role', None)

        is_staff = role == 'moderator'
        is_superuser = role == 'superuser'
        is_cook = role == 'cook'

        user = CustomUser.objects.create_user(
            username=validated_data['username'],
            password=validated_data['password'],
            is_staff=is_staff,
            is_superuser=is_superuser,
            is_cook=is_cook,
        )
        return user

class OrderPizzaSerializer(serializers.ModelSerializer):
    client = serializers.PrimaryKeyRelatedField(queryset=CustomUser.objects.all())
    manager = serializers.PrimaryKeyRelatedField(queryset=CustomUser.objects.all(), allow_null=True)
    products = ProductInOrderSerializer(many=True, read_only=True, source='productinorder_set')

    class Meta:
        model = Order_pizza
        fields = ['id', 'status', 'creation_datetime', 'formation_datetime', 'completion_datetime', 'client', 'manager', 'products']
        read_only_fields = ['creation_datetime', 'formation_datetime', 'completion_datetime', 'client', 'manager', 'products']

    def get_fields(self):
        new_fields = OrderedDict()
        for name, field in super().get_fields().items():
            field.required = False
            new_fields[name] = field
        return new_fields