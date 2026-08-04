from .models import Recipe
from groups.models import GroupMember
from django.db.models import Q

# Devuelve las recetas públicas si no estás autenticado
# y las privadas tuyas y de tus miembros de grupos
def get_my_visible_recipes(request):
  # Si no está autenticado solo ve las públicas
  if not request.user.is_authenticated:
    return Recipe.objects.filter(visibility = "PUBLIC")

  # Primero se obtiene los grupos en los que está este usuario
  # y luego se obtiene el id de todos sus compañeros
  my_groups_ids = GroupMember.objects.filter(
    user = request.user,
    accepted = True
  ).values_list("group_id", flat = True) # Con flat = True, solo se devuelve el id

  my_group_members_ids = GroupMember.objects.filter(
    group_id__in = my_groups_ids,
    accepted = True
  ).values_list("user_id", flat = True)

  return Recipe.objects.filter(
    Q(visibility = "PUBLIC") |
    Q(user = request.user) |
    Q(visibility = "PRIVATE", user_id__in = my_group_members_ids)
  )