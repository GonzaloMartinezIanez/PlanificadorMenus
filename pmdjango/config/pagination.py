from rest_framework.pagination import PageNumberPagination


class RecipePagination(PageNumberPagination):
    page_size = 24
    page_size_query_param = "page_size"
    max_page_size = 100


class IngredientPagination(RecipePagination):
    page_size = 30


class CommentPagination(RecipePagination):
    page_size = 20


def paginated_response(queryset, request, serializer_class, pagination_class, **kwargs):
    kwargs.setdefault("context", {"request": request})
    paginator = pagination_class()
    page = paginator.paginate_queryset(queryset, request)
    serializer = serializer_class(page, many=True, **kwargs)
    return paginator.get_paginated_response(serializer.data)
