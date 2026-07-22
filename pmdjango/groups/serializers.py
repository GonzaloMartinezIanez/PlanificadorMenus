from rest_framework import serializers
from .models import Group, GroupMember

class GroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = Group
        fields = ['group_code', 'group_name', 'group_description', 'creation_date']

class GroupSimpleSerializer(serializers.ModelSerializer):
    class Meta:
            model = Group
            fields = ['group_name', 'group_description']

class GroupMemberSerializer(serializers.ModelSerializer):
    class Meta:
        model = GroupMember
        fields = ['user_id', 'group_code', 'role', 'joining_date', 'accepted']

