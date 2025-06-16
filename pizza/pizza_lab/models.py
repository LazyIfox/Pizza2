from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.conf import settings
from storages.backends.s3boto3 import S3Boto3Storage
from django.contrib.auth.models import BaseUserManager, AbstractBaseUser, PermissionsMixin

minio_storage = S3Boto3Storage()

class CustomUserManager(BaseUserManager):
    def create_user(self, username, password=None, **extra_fields):
        if not username:
            raise ValueError('The Username field must be set')
        user = self.model(username=username, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, username, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(username, password, **extra_fields)

class CustomUser(AbstractBaseUser, PermissionsMixin):
    username = models.CharField(max_length=40, unique=True, verbose_name="Никнейм")
    password = models.CharField(max_length=128, verbose_name="Пароль")
    is_active = models.BooleanField(default=True, verbose_name="Активен?")
    is_staff = models.BooleanField(default=False, verbose_name="Является ли пользователь менеджером?")
    is_superuser = models.BooleanField(default=False, verbose_name="Является ли пользователь админом?")
    is_cook = models.BooleanField(default=False, verbose_name="Является ли пользователь поваром?")

    USERNAME_FIELD = 'username'

    objects = CustomUserManager()

    def __str__(self):
        return self.username
    
class Pizza(models.Model):
    name = models.CharField(max_length=255)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    description = models.TextField()
    cook = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, blank=True, related_name='pizzas')
    deleted = models.BooleanField(default=False)
    image = models.ImageField(upload_to='pizza/', null=True, blank=True, storage=minio_storage)
    is_vegetarian = models.BooleanField(null=True, blank=True)

    def __str__(self):
        return self.name
    
class Order_pizza(models.Model):
    class OrderStatus(models.TextChoices):
        DRAFT = "DRAFT"
        DELETED = "DELETED"
        FORMED = "FORMED"
        COMPLETED = "COMPLETED"
        REJECTED = "REJECTED"

    status = models.CharField(
        max_length=10,
        choices=OrderStatus.choices,
        default=OrderStatus.DRAFT,
    )

    creation_datetime = models.DateTimeField(auto_now_add=True)
    formation_datetime = models.DateTimeField(blank=True, null=True)
    completion_datetime = models.DateTimeField(blank=True, null=True)
    client = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.DO_NOTHING, related_name='created_orders')
    manager = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.DO_NOTHING, related_name='managed_orders', blank=True, null=True)

    def __str__(self):
        return f"Заказ № {self.id}"

class ProductInOrder(models.Model):
    order = models.ForeignKey(Order_pizza, on_delete=models.CASCADE)
    product = models.ForeignKey(Pizza, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField()
    end_quantity = models.PositiveIntegerField(default=0, verbose_name="Приготовлено пицц")
    is_ready = models.BooleanField(default=False, verbose_name="Заказ выполнен?")

    def save(self, *args, **kwargs):
        self.is_ready = self.end_quantity >= self.quantity
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.order_id}-{self.product_id}"

    class Meta:
        unique_together = ('order', 'product'),