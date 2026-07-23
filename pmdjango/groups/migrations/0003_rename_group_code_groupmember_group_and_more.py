from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("groups", "0002_rename_user_id_groupmember_user"),
    ]

    operations = [
        migrations.RenameField(
            model_name="groupmember",
            old_name="group_code",
            new_name="group",
        ),
        migrations.AlterUniqueTogether(
            name="groupmember",
            unique_together={("user", "group")},
        ),
    ]
