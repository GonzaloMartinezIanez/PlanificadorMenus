from rest_framework import serializers
from .models import Group, GroupMember

class GroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = Group
        fields = ["group_code", "group_name", "group_description", "creation_date"]

class GroupCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Group
        fields = ["group_name", "group_description"]

class GroupMemberSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source = "user.id", read_only = True)
    username = serializers.CharField(source = "user.username", read_only = True)
    profile_picture = serializers.URLField(source = "user.profile_picture", read_only = True)
    group_code = serializers.CharField(source = "group.group_code", read_only = True)

    class Meta:
        model = GroupMember
        fields = ["user_id", "username", "profile_picture", "group_code", "role", "joining_date", "accepted"]

class JoinSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField()
    accepted = serializers.BooleanField()

    class Meta:
        model = GroupMember
        fields = ["user_id", "accepted"]

class RoleSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField()
    role = serializers.ChoiceField(choices = GroupMember.ROLE_CHOICES)

    class Meta:
        model = GroupMember
        fields = ["user_id", "role"]

class PatchGroupSerializer(serializers.ModelSerializer):
    class Meta:
            model = Group
            fields = ["group_name", "group_description"]
