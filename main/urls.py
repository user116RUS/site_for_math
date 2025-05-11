from django.urls import path
from . import views

app_name = 'main'

urlpatterns = [
    path('', views.index, name='index'),
    path('chat/', views.chat_view, name='chat'),
    path('simple-chat/', views.simple_chat_view, name='simple_chat'),
    path('api/process-message/', views.process_ai_message, name='process_message'),
]