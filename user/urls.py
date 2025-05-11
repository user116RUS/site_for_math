from django.contrib.auth.views import LoginView, LogoutView, PasswordResetView
from django.urls import path
from user import views

app_name = 'user'

urlpatterns = [
    path(
        'logout/',
        LogoutView.as_view(template_name='user/logged_out.html'),
        name='logout'
    ),
    path(
        'sign_up/',
        views.SignUp.as_view(),
        name='sign_up'
    ),
    path(
        'login/',
        LoginView.as_view(template_name='user/login.html'),
        name='login'
    ),
    path(
        'password_reset_form/',
        PasswordResetView.as_view(),
        name='password_reset_form'
    ),
    path('profile/', views.profile_view, name='profile'),
    path('profile/edit/', views.edit_profile, name='edit_profile'),
    path('chat-history/', views.chat_history, name='chat_history'),
    path('chat-history/<int:chat_id>/', views.chat_detail, name='chat_detail'),
    
    # URL для управления темами
    path('topics/', views.topic_list, name='topic_list'),
    path('topics/create/', views.topic_create, name='topic_create'),
    path('topics/<int:topic_id>/edit/', views.topic_edit, name='topic_edit'),
    path('topics/<int:topic_id>/delete/', views.topic_delete, name='topic_delete'),
]
