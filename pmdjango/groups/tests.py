from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase
from .models import Group, GroupMember

User = get_user_model()

class GroupApiTests(APITestCase):
  def setUp(self):
    self.admin = User.objects.create_user(username = "admin", password = "adminpass123")
    self.member = User.objects.create_user(username = "member", password = "memberpass123")
    self.other_user = User.objects.create_user(username = "other", password = "otherpass123")
    self.group = Group.objects.create(
      group_code = "GROUP001",
      group_name = "Grupo principal",
      group_description = "Descripcion principal",
    )
    self.admin_membership = GroupMember.objects.create(
      user = self.admin,
      group = self.group,
      role = "ADMIN",
      accepted = True,
    )
    self.member_membership = GroupMember.objects.create(
      user = self.member,
      group = self.group,
      role = "MEMBER",
      accepted = True,
    )

  def test_create_group_creates_admin_membership(self):
    self.client.force_authenticate(user = self.other_user)

    response = self.client.post("/api/groups/", {
      "group_name": "Grupo nuevo",
      "group_description": "Descripcion nueva",
    }, format = "json")

    self.assertEqual(response.status_code, status.HTTP_201_CREATED)
    self.assertTrue(Group.objects.filter(group_name = "Grupo nuevo").exists())

    new_group = Group.objects.get(group_name = "Grupo nuevo")
    self.assertTrue(GroupMember.objects.filter(user = self.other_user, group = new_group, role = "ADMIN", accepted = True).exists())

  def test_get_groups_returns_only_accepted_groups(self):
    pending_group = Group.objects.create(
      group_code = "GROUP002",
      group_name = "Grupo pendiente",
      group_description = "Pendiente",
    )
    GroupMember.objects.create(
      user = self.admin,
      group = pending_group,
      role = "MEMBER",
      accepted = False,
    )
    self.client.force_authenticate(user = self.admin)

    response = self.client.get("/api/groups/")

    self.assertEqual(response.status_code, status.HTTP_200_OK)
    self.assertEqual(len(response.data), 1)
    self.assertEqual(response.data[0]["group_code"], "GROUP001")

  def test_join_group_creates_pending_membership(self):
    join_group = Group.objects.create(
      group_code = "GROUP003",
      group_name = "Grupo para unirse",
      group_description = "Join",
    )
    self.client.force_authenticate(user = self.other_user)

    response = self.client.post(f"/api/groups/{join_group.group_code}/")

    self.assertEqual(response.status_code, status.HTTP_201_CREATED)
    self.assertTrue(GroupMember.objects.filter(user = self.other_user, group = join_group, role = "MEMBER", accepted = False).exists())

  def test_admin_can_accept_pending_member(self):
    GroupMember.objects.create(
      user = self.other_user,
      group = self.group,
      role = "MEMBER",
      accepted = False,
    )
    self.client.force_authenticate(user = self.admin)

    response = self.client.patch(f"/api/groups/{self.group.group_code}/join/", {
      "user_id": self.other_user.id,
      "accepted": True,
    }, format = "json")

    self.assertEqual(response.status_code, status.HTTP_200_OK)
    self.assertTrue(GroupMember.objects.filter(user = self.other_user, group = self.group, accepted = True).exists())

  def test_admin_can_reject_pending_member(self):
    GroupMember.objects.create(
      user = self.other_user,
      group = self.group,
      role = "MEMBER",
      accepted = False,
    )
    self.client.force_authenticate(user = self.admin)

    response = self.client.patch(f"/api/groups/{self.group.group_code}/join/", {
      "user_id": self.other_user.id,
      "accepted": False,
    }, format = "json")

    self.assertEqual(response.status_code, status.HTTP_200_OK)
    self.assertFalse(GroupMember.objects.filter(user = self.other_user, group = self.group).exists())

  def test_non_admin_cannot_accept_pending_member(self):
    GroupMember.objects.create(
      user = self.other_user,
      group = self.group,
      role = "MEMBER",
      accepted = False,
    )
    self.client.force_authenticate(user = self.member)

    response = self.client.patch(f"/api/groups/{self.group.group_code}/join/", {
      "user_id": self.other_user.id,
      "accepted": True,
    }, format = "json")

    self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

  def test_admin_can_change_member_role(self):
    self.client.force_authenticate(user = self.admin)

    response = self.client.patch(f"/api/groups/{self.group.group_code}/role/", {
      "user_id": self.member.id,
      "role": "ADMIN",
    }, format = "json")

    self.assertEqual(response.status_code, status.HTTP_200_OK)
    self.member_membership.refresh_from_db()
    self.assertEqual(self.member_membership.role, "ADMIN")

  def test_last_admin_cannot_be_demoted(self):
    self.client.force_authenticate(user = self.admin)

    response = self.client.patch(f"/api/groups/{self.group.group_code}/role/", {
      "user_id": self.admin.id,
      "role": "MEMBER",
    }, format = "json")

    self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    self.admin_membership.refresh_from_db()
    self.assertEqual(self.admin_membership.role, "ADMIN")

  def test_admin_can_delete_group(self):
    self.client.force_authenticate(user = self.admin)

    response = self.client.delete(f"/api/groups/{self.group.group_code}/")

    self.assertEqual(response.status_code, status.HTTP_200_OK)
    self.assertFalse(Group.objects.filter(group_code = self.group.group_code).exists())

  def test_non_admin_cannot_delete_group(self):
    self.client.force_authenticate(user = self.member)

    response = self.client.delete(f"/api/groups/{self.group.group_code}/")

    self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    self.assertTrue(Group.objects.filter(group_code = self.group.group_code).exists())

  def test_member_can_leave_group(self):
    self.client.force_authenticate(user = self.member)

    response = self.client.delete(f"/api/groups/{self.group.group_code}/{self.member.id}/")

    self.assertEqual(response.status_code, status.HTTP_200_OK)
    self.assertFalse(GroupMember.objects.filter(user = self.member, group = self.group).exists())

  def test_admin_can_remove_member(self):
    self.client.force_authenticate(user = self.admin)

    response = self.client.delete(f"/api/groups/{self.group.group_code}/{self.member.id}/")

    self.assertEqual(response.status_code, status.HTTP_200_OK)
    self.assertFalse(GroupMember.objects.filter(user = self.member, group = self.group).exists())

  def test_member_cannot_remove_other_member(self):
    another_member = User.objects.create_user(username = "another", password = "anotherpass123")
    GroupMember.objects.create(
      user = another_member,
      group = self.group,
      role = "MEMBER",
      accepted = True,
    )
    self.client.force_authenticate(user = self.member)

    response = self.client.delete(f"/api/groups/{self.group.group_code}/{another_member.id}/")

    self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

  def test_last_admin_cannot_leave_group(self):
    self.client.force_authenticate(user = self.admin)

    response = self.client.delete(f"/api/groups/{self.group.group_code}/{self.admin.id}/")

    self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    self.assertTrue(GroupMember.objects.filter(user = self.admin, group = self.group).exists())
