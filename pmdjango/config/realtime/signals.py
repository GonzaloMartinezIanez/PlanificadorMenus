from django.db.models.signals import post_delete, post_save, pre_delete, pre_save
from django.dispatch import receiver
from groups.models import Group, GroupMember
from lists.models import List
from menus.models import Menu

from .events import publish


@receiver(pre_delete, sender=List)
@receiver(pre_delete, sender=Menu)
@receiver(pre_delete, sender=GroupMember)
def remember_group(sender, instance, **kwargs):
    instance._event_group_code = instance.group.group_code


@receiver(post_save, sender=Menu)
@receiver(post_delete, sender=Menu)
def menu_changed(sender, instance, **kwargs):
    code = getattr(instance, "_event_group_code", None) or instance.group.group_code
    publish(f"group.{code}", "menu.changed", code, date=instance.date.isoformat())


@receiver(post_save, sender=List)
@receiver(post_delete, sender=List)
def list_changed(sender, instance, **kwargs):
    code = getattr(instance, "_event_group_code", None) or instance.group.group_code
    publish(f"group.{code}", "shopping_list.changed", code)


@receiver(pre_save, sender=GroupMember)
def remember_membership(sender, instance, **kwargs):
    instance._was_pending = (
        sender.objects.filter(pk=instance.pk, accepted=False).exists()
        if instance.pk
        else False
    )


@receiver(post_save, sender=GroupMember)
def membership_saved(sender, instance, created, **kwargs):
    code = instance.group.group_code
    event = (
        "membership.requested"
        if created and not instance.accepted
        else "membership.changed"
    )
    publish(f"group.{code}", event, code)
    if instance.accepted and instance._was_pending:
        publish(
            f"user.{instance.user_id}", "membership.decided", code, status="accepted"
        )
    else:
        publish(f"user.{instance.user_id}", "membership.changed", code)


@receiver(post_delete, sender=GroupMember)
def membership_deleted(sender, instance, origin, **kwargs):
    if isinstance(origin, Group) or getattr(origin, "model", None) is Group:
        return  # La eliminación del grupo envía un único aviso personal.
    code = instance._event_group_code
    publish(f"group.{code}", "membership.changed", code)
    event = "membership.revoked" if instance.accepted else "membership.decided"
    publish(
        f"user.{instance.user_id}",
        event,
        code,
        status="removed" if instance.accepted else "rejected",
    )


@receiver(post_save, sender=Group)
def group_saved(sender, instance, created, **kwargs):
    if not created:
        code = instance.group_code
        publish(f"group.{code}", "group.updated", code)
        for user_id in instance.groupmember_set.filter(accepted=True).values_list(
            "user_id", flat=True
        ):
            publish(f"user.{user_id}", "group.updated", code)


@receiver(pre_delete, sender=Group)
def remember_recipients(sender, instance, **kwargs):
    instance._event_users = list(
        instance.groupmember_set.values_list("user_id", flat=True)
    )


@receiver(post_delete, sender=Group)
def group_deleted(sender, instance, **kwargs):
    for user_id in instance._event_users:
        publish(f"user.{user_id}", "group.deleted", instance.group_code)
