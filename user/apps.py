from django.apps import AppConfig


class UserConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'user'
    
    def ready(self):
        # Импортируем файл signals.py, чтобы сигналы были зарегистрированы
        import user.models  # Импортируем сигналы из models.py
