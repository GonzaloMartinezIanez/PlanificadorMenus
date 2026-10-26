from datetime import datetime, time, timedelta, timezone as datetime_timezone
from unittest.mock import patch

from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.test import TransactionTestCase
from django.utils import timezone


class RecipeCreationDateMigrationTests(TransactionTestCase):
    def test_existing_recipes_receive_the_migration_day_in_madrid(self):
        self.addCleanup(self.restore_latest_migrations)
        executor = MigrationExecutor(connection)
        before = [("recipes", "0002_remove_recipe_recipe_category_and_more")]
        after = [("recipes", "0003_recipe_creation_date")]
        executor.migrate(before)
        old_apps = executor.loader.project_state(before).apps
        user = old_apps.get_model("users", "User").objects.create(
            username="migration-user"
        )
        recipe_model = old_apps.get_model("recipes", "Recipe")
        ids = [
            recipe_model.objects.create(
                user_id=user.pk, name=name, visibility="PUBLIC"
            ).pk
            for name in ["Receta antigua", "Otra receta antigua"]
        ]
        # A esta hora UTC ya es el día siguiente en Madrid durante todo el año.
        instant = datetime.combine(
            timezone.localdate(), time(23, 30), tzinfo=datetime_timezone.utc
        )
        expected = (instant + timedelta(days=1)).date()
        with (
            timezone.override("Europe/Madrid"),
            patch("django.utils.timezone.now", return_value=instant),
        ):
            executor = MigrationExecutor(connection)
            executor.migrate(after)
            new_apps = executor.loader.project_state(after).apps
            dates = list(
                new_apps.get_model("recipes", "Recipe")
                .objects.filter(pk__in=ids)
                .values_list("creation_date", flat=True)
            )
        self.assertEqual(dates, [expected, expected])

    def restore_latest_migrations(self):
        executor = MigrationExecutor(connection)
        executor.migrate(executor.loader.graph.leaf_nodes())

    def test_existing_comments_receive_the_same_migration_instant(self):
        self.addCleanup(self.restore_latest_migrations)
        before = [("recipes", "0003_recipe_creation_date")]
        after = [("recipes", "0004_recipecomment_created_at")]
        executor = MigrationExecutor(connection)
        executor.migrate(before)
        apps = executor.loader.project_state(before).apps
        user_model = apps.get_model("users", "User")
        first_user = user_model.objects.create(username="old-comment-author")
        second_user = user_model.objects.create(username="other-comment-author")
        recipe = apps.get_model("recipes", "Recipe").objects.create(
            user_id=first_user.pk, name="Receta", visibility="PUBLIC"
        )
        comment_model = apps.get_model("recipes", "RecipeComment")
        ids = [
            comment_model.objects.create(
                user_id=user.pk,
                recipe_id=recipe.pk,
                score=4,
                comment="Comentario anterior",
            ).pk
            for user in [first_user, second_user]
        ]
        instant = timezone.now()
        with patch("django.utils.timezone.datetime") as clock:
            clock.now.return_value = instant
            executor = MigrationExecutor(connection)
            executor.migrate(after)
        apps = executor.loader.project_state(after).apps
        dates = list(
            apps.get_model("recipes", "RecipeComment")
            .objects.filter(pk__in=ids)
            .values_list("created_at", flat=True)
        )
        self.assertEqual(dates, [instant, instant])
