from django.db import models
from django.contrib.auth.models import AbstractUser

# Hereda de los usuarios de django
class User(AbstractUser):
    google_id = models.CharField(max_length=255, unique=True, null=True, blank=True)
    profile_picture = models.URLField(blank=True, null=True)

    def __str__(self):
        return self.username
