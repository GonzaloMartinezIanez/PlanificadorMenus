from django.urls import path, include
from .views import GroupApiView, GroupCodeApiView, GroupMemberJoinApiView, GroupMemberRoleApiView, GroupLeaveApiView

urlpatterns = [
    path('groups/', GroupApiView.as_view(), name='groups-apiview'),
    path('groups/<str:group_code>/', GroupCodeApiView.as_view(), name='groups-code-apiview'),
    path('groups/<str:group_code>/join/', GroupMemberJoinApiView.as_view(), name='groups-member-join-apiview'),
    path('groups/<str:group_code>/role/', GroupMemberRoleApiView.as_view(), name='groups-member-role-apiview'),
    path('groups/<str:group_code>/<int:user_id>/', GroupLeaveApiView.as_view(), name='groups-member-leave-apiview')
]