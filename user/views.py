from django.shortcuts import render, redirect, get_object_or_404
from django.http import HttpResponse
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.contrib.auth import get_user_model

from .forms import UserForm, ProfileForm, UserUpdateForm, TopicForm
from .models import Profile, ChatSession, Message, Topic

from django.views.generic.edit import CreateView

User = get_user_model()

class SignUp(CreateView):
    form_class = UserForm
    template_name = 'user/signup.html'
    success_url = '/'

@login_required
def profile_view(request):
    """Просмотр профиля пользователя"""
    return render(request, 'user/profile.html')

@login_required
def edit_profile(request):
    """Редактирование профиля пользователя"""
    if request.method == 'POST':
        user_form = UserUpdateForm(request.POST, instance=request.user)
        profile_form = ProfileForm(
            request.POST, 
            request.FILES, 
            instance=request.user.profile
        )
        
        if user_form.is_valid() and profile_form.is_valid():
            user_form.save()
            profile_form.save()
            messages.success(request, 'Ваш профиль успешно обновлен!')
            return redirect('user:profile')
        else:
            messages.error(request, 'Пожалуйста, исправьте ошибки в форме.')
    else:
        user_form = UserUpdateForm(instance=request.user)
        profile_form = ProfileForm(instance=request.user.profile)
    
    return render(request, 'user/edit_profile.html', {
        'user_form': user_form,
        'profile_form': profile_form
    })

@login_required
def chat_history(request):
    """Просмотр истории чатов пользователя"""
    chat_sessions = ChatSession.objects.filter(user=request.user).order_by('-updated_at')
    topics = Topic.objects.all()
    
    # Фильтрация по теме, если указана
    topic_id = request.GET.get('topic')
    if topic_id:
        try:
            chat_sessions = chat_sessions.filter(topic_id=int(topic_id))
        except ValueError:
            pass
    
    # Поиск по названию чата
    search_query = request.GET.get('q')
    if search_query:
        chat_sessions = chat_sessions.filter(title__icontains=search_query)
    
    return render(request, 'user/chat_history.html', {
        'chat_sessions': chat_sessions,
        'topics': topics,
        'current_topic': int(topic_id) if topic_id and topic_id.isdigit() else None,
        'search_query': search_query or '',
    })

@login_required
def chat_detail(request, chat_id):
    """Просмотр деталей конкретного чата"""
    chat_session = get_object_or_404(ChatSession, id=chat_id, user=request.user)
    messages_list = Message.objects.filter(chat_session=chat_session).order_by('timestamp')
    
    return render(request, 'user/chat_detail.html', {
        'chat_session': chat_session,
        'messages': messages_list,
    })

@login_required
def topic_list(request):
    """Список тем для чатов"""
    topics = Topic.objects.all().order_by('name')
    return render(request, 'user/topic_list.html', {
        'topics': topics
    })

@login_required
def topic_create(request):
    """Создание новой темы для чатов"""
    if request.method == 'POST':
        form = TopicForm(request.POST)
        if form.is_valid():
            form.save()
            messages.success(request, 'Тема успешно создана!')
            return redirect('user:topic_list')
    else:
        form = TopicForm()
    
    return render(request, 'user/topic_form.html', {
        'form': form,
        'title': 'Создание новой темы'
    })

@login_required
def topic_edit(request, topic_id):
    """Редактирование существующей темы"""
    topic = get_object_or_404(Topic, id=topic_id)
    
    if request.method == 'POST':
        form = TopicForm(request.POST, instance=topic)
        if form.is_valid():
            form.save()
            messages.success(request, 'Тема успешно обновлена!')
            return redirect('user:topic_list')
    else:
        form = TopicForm(instance=topic)
    
    return render(request, 'user/topic_form.html', {
        'form': form,
        'topic': topic,
        'title': 'Редактирование темы'
    })

@login_required
def topic_delete(request, topic_id):
    """Удаление темы"""
    topic = get_object_or_404(Topic, id=topic_id)
    
    if request.method == 'POST':
        topic.delete()
        messages.success(request, 'Тема успешно удалена!')
        return redirect('user:topic_list')
    
    return render(request, 'user/topic_confirm_delete.html', {
        'topic': topic
    })
