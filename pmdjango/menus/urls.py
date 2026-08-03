from django.urls import path, include
from .views import MenuApiView

urlpatterns = [
  path('menus/<str:group_code>/', MenuApiView.as_view(), name='menu-apiview'),
]