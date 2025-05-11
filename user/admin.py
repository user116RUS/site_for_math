from django.contrib import admin
from .models import Profile, Topic, ChatSession, Message

@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'location', 'birth_date']
    search_fields = ['user__username', 'user__email', 'location']
    list_filter = ['birth_date']

@admin.register(Topic)
class TopicAdmin(admin.ModelAdmin):
    list_display = ['name', 'created_at']
    search_fields = ['name', 'description']
    list_filter = ['created_at']

@admin.register(ChatSession)
class ChatSessionAdmin(admin.ModelAdmin):
    list_display = ['title', 'user', 'topic', 'created_at', 'updated_at', 'is_active']
    search_fields = ['title', 'user__username', 'topic__name']
    list_filter = ['created_at', 'updated_at', 'is_active', 'topic']
    date_hierarchy = 'created_at'

@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ['chat_session', 'role', 'short_content', 'timestamp']
    search_fields = ['content', 'chat_session__title']
    list_filter = ['role', 'timestamp', 'chat_session']
    date_hierarchy = 'timestamp'
    
    def short_content(self, obj):
        return obj.content[:50] + ('...' if len(obj.content) > 50 else '')
    short_content.short_description = 'Содержание'
