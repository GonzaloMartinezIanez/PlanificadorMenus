from django.urls import path, include
from .views import ListApiView, ListPatchApiView

urlpatterns = [
  path('lists/<str:group_code>/', ListApiView.as_view(), name='list-apiview'),
  path('lists/<str:group_code>/<str:id_ingredient>/', ListPatchApiView.as_view(), name='list-delete-all-apiview'),
]