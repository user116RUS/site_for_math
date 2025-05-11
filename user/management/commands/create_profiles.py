from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from user.models import Profile

User = get_user_model()

class Command(BaseCommand):
    help = 'Создает профили для всех пользователей, у которых их нет'

    def handle(self, *args, **kwargs):
        users_without_profiles = []
        
        for user in User.objects.all():
            try:
                # Если профиль существует, просто проверим его
                user.profile
            except Profile.DoesNotExist:
                # Если профиля нет, добавим пользователя в список
                users_without_profiles.append(user)
                
        if not users_without_profiles:
            self.stdout.write(self.style.SUCCESS('Все пользователи уже имеют профили.'))
            return
        
        # Создаем профили для пользователей, у которых их нет
        for user in users_without_profiles:
            Profile.objects.create(user=user)
            self.stdout.write(self.style.SUCCESS(f'Создан профиль для пользователя {user.username}'))
        
        self.stdout.write(self.style.SUCCESS(f'Успешно создано {len(users_without_profiles)} профилей')) 