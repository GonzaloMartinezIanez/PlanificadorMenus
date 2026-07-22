from django.urls import path, include
from .views import GroupApiView

urlpatterns = [
    path('groups/', GroupApiView.as_view(), name='groups-apiview'),
]