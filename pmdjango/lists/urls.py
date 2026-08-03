from django.urls import path, include
from .views import ListApiView, ListDeleteAllApiView

urlpatterns = [
  path('lists/<str:group_code>/', ListApiView.as_view(), name='list-apiview'),
  path('lists/<str:group_code>/all/', ListDeleteAllApiView.as_view(), name='list-delete-all-apiview'),
]