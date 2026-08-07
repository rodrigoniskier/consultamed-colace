from django.contrib import admin
from django.urls import path
from django.contrib.auth import views as auth_views
from core import views
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('', auth_views.LoginView.as_view(template_name='login.html', redirect_authenticated_user=True), name='login'),
    path('logout/', views.custom_logout, name='logout'),
    path('admin/', admin.site.urls),

    # Dashboards
    path('dashboard/', views.dashboard, name='dashboard'),
    path('app-admin/', views.custom_admin_dashboard, name='custom_admin'),

    # Ações da Secretária/Médico
    path('add-patient/', views.add_patient, name='add_patient'),
    path('schedule-appointment/', views.schedule_appointment, name='schedule_appointment'),
    path('update-appointment/<int:pk>/', views.update_appointment, name='update_appointment'),
    path('cancel-appointment/<int:pk>/', views.cancel_appointment, name='cancel_appointment'),
    path('generate-report/', views.generate_daily_report, name='generate_report'),
    path('send-message/', views.send_admin_message, name='send_message'),

    # Gestão de Grades de Vagas
    path('create-shift/', views.create_shift, name='create_shift'),
    path('update-shift/<int:pk>/', views.update_shift, name='update_shift'),
    path('delete-shift/<int:pk>/', views.delete_shift, name='delete_shift'),

    # GESTÃO GLOBAL DE AGENDAMENTOS (ADMIN)
    path('admin-update-appointment/<int:pk>/', views.admin_update_appointment, name='admin_update_appointment'),
    path('admin-delete-appointment/<int:pk>/', views.admin_delete_appointment, name='admin_delete_appointment'),

    # Alertas e Intercorrências
    path('report-intercurrence/', views.report_intercurrence, name='report_intercurrence'),
    path('resolve-intercurrence/<int:pk>/', views.resolve_intercurrence, name='resolve_intercurrence'),

    # Cadastros Gerais
    path('add-specialty/', views.add_specialty, name='add_specialty'),
    path('add-location/', views.add_location, name='add_location'),
    path('add-room/', views.add_room, name='add_room'),
    path('add-doctor/', views.add_doctor, name='add_doctor'),

    # Relatórios
    path('print-map/', views.print_daily_map, name='print_map'),
]

# Arquivos de Mídia
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)