from .models import Recipe, RecipeComment
from .serializers import CommentInputSerializer, CommentOutputSerializer
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from groups.models import GroupMember
from django.db.models import Avg, Count

def get_recipe(request, id):
  recipe = Recipe.objects.filter(id = id).first()
  if not recipe:
    return None, Response({"error": "La receta no existe."}, status = status.HTTP_404_NOT_FOUND)

  if recipe.visibility == "PUBLIC":
    return recipe, None

  my_groups_ids = GroupMember.objects.filter(
      user = request.user,
      accepted = True
    ).values_list("group_id", flat = True) # Con flat = True, solo se devuelve el id
  
  my_group_members_ids = GroupMember.objects.filter(
    group_id__in = my_groups_ids,
    accepted = True
  ).values_list("user_id", flat = True)

  if recipe.user == request.user or recipe.user_id in my_group_members_ids:
    return recipe, None
  else:
    return None, Response({"error": "No tienes permiso para ver esta receta."}, status = status.HTTP_403_FORBIDDEN)

def updateScore(recipe):
  recipe_score = RecipeComment.objects.filter(recipe = recipe).aggregate(
    avg_score = Avg("score"),
    num_valorations = Count("id")
  )

  recipe.avg_score = recipe_score["avg_score"] or 0
  recipe.num_valorations = recipe_score["num_valorations"] or 0
  recipe.save()

class CommentApiView(APIView):
  permission_classes = [IsAuthenticated]

  def get(self, request, id):
    recipe, error = get_recipe(request, id)
    if error:
      return error

    comments = RecipeComment.objects.filter(recipe = recipe, comment__isnull = False)
    serializer = CommentOutputSerializer(comments, many = True)

    return Response(serializer.data, status = status.HTTP_200_OK)

  def post(self, request, id):
    serializer = CommentInputSerializer(data = request.data)
    serializer.is_valid(raise_exception = True)

    recipe, error = get_recipe(request, id)
    if error:
      return error

    if RecipeComment.objects.filter(recipe = recipe, user = request.user).exists():
      return Response({"error": "Ya has valorado esta receta."}, status = status.HTTP_400_BAD_REQUEST)

    comment = RecipeComment.objects.create(
      user = request.user,
      recipe = recipe,
      score = serializer.validated_data["score"],
      comment = serializer.validated_data.get("comment") or None,
    )

    updateScore(recipe)

    output_serializer = CommentOutputSerializer(comment)
    return Response(output_serializer.data, status = status.HTTP_200_OK)

  def put(self, request, id):
    serializer = CommentInputSerializer(data = request.data)
    serializer.is_valid(raise_exception = True)

    recipe, error = get_recipe(request, id)
    if error:
      return error

    comment = RecipeComment.objects.filter(recipe = recipe, user = request.user).first()
    if not comment:
      return Response({"error": "No has valorado esta receta."}, status = status.HTTP_404_NOT_FOUND)

    comment.score = serializer.validated_data.get("score")
    comment.comment = serializer.validated_data.get("comment") or None
    comment.save()

    updateScore(recipe)

    output_serializer = CommentOutputSerializer(comment)
    return Response(output_serializer.data, status = status.HTTP_201_CREATED)

class MyCommentApiView(APIView):
  permission_classes = [IsAuthenticated]

  def get(self, request, id):
    recipe, error = get_recipe(request, id)
    if error:
      return error

    comment = RecipeComment.objects.filter(recipe = recipe, user = request.user).first()
    if not comment:
      return Response({"comment": None}, status = status.HTTP_200_OK)

    serializer = CommentOutputSerializer(comment)
    return Response(serializer.data, status = status.HTTP_200_OK)

class CommentDeleteApiView(APIView):
  permission_classes = [IsAuthenticated]

  def delete(self, request, id_recipe, id_user):
    recipe, error = get_recipe(request, id_recipe)
    if error:
      return error

    comment = RecipeComment.objects.filter(recipe = recipe, user_id = id_user).first()
    if not comment:
      return Response({"error": "El comentario no existe."}, status = status.HTTP_404_NOT_FOUND)

    # Eres el autor del comentario
    if comment.user == request.user:
      comment.delete()
      updateScore(recipe)
      return Response({"message": "Comentario eliminado correctamente."}, status = status.HTTP_200_OK)
    # No eres el dueño de la receta
    elif recipe.user != request.user:
      return Response({"error": "No tienes permiso para eliminar este comentario."}, status = status.HTTP_403_FORBIDDEN)
    # Eres el dueño de la receta y eliminas el texto pero NO la puntuación
    else:
      comment.comment = None
      comment.save()
      updateScore(recipe)
      return Response({"message": "Texto del comentario eliminado correctamente."}, status = status.HTTP_200_OK)
