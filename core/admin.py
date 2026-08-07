from django.contrib import admin
from .models import Profile, Location, Room, Specialty, DoctorShift, Patient, Appointment

# Registrando cada tabela para aparecer no painel
admin.site.register(Profile)
admin.site.register(Location)
admin.site.register(Room)
admin.site.register(Specialty)
admin.site.register(DoctorShift)
admin.site.register(Patient)
admin.site.register(Appointment)

# Personalizando o título do painel (opcional, mas fica mais bonito!)
admin.site.site_header = "Administração - ConsultaMed"
admin.site.site_title = "ConsultaMed"
admin.site.index_title = "Bem-vindo ao sistema ConsultaMed"