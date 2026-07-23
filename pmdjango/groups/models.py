from django.conf import settings
from django.db import models

class Group(models.Model):
  group_code = models.CharField(max_length=8, unique=True, null=False, blank=False)
  group_name = models.CharField(max_length=100, null=False, blank=False)
  group_description = models.TextField(null=True, blank=True)
  creation_date = models.DateTimeField(auto_now_add=True, blank=False, null=False)

  def __str__(self):
    return f"{self.group_code} - {self.group_name}"

class GroupMember(models.Model):
  ROLE_CHOICES = [
    ("ADMIN", "ADMIN"),
    ("MEMBER", "MEMBER"),
  ]

  user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
  group = models.ForeignKey(Group, on_delete=models.CASCADE)
  role = models.CharField(max_length=10, choices=ROLE_CHOICES, default="MEMBER")
  joining_date = models.DateTimeField(auto_now_add=True, blank=False, null=False)
  accepted = models.BooleanField(default=False, blank=False, null=False)

  class Meta:
    unique_together = ("user", "group")

  def __str__(self):
    return f"{self.user.id} - {self.group.group_code} - {self.role} - Accepted = {self.accepted}"
