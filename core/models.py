from django.db import models
from django.contrib.auth.models import User

class Profile(models.Model):
    ROLES = [
        ('secretaria', 'Secretária'),
        ('medico', 'Médico'),
        ('secretaria_pacientes', 'Secretária de Pacientes'),
    ]
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    role = models.CharField(max_length=25, choices=ROLES)
    max_primeira_vez = models.IntegerField(null=True, blank=True)
    max_retorno = models.IntegerField(null=True, blank=True)

    def __str__(self):
        return f"{self.user.get_full_name()} - {self.role}"

class Location(models.Model):
    name = models.CharField(max_length=100)

    def __str__(self):
        return self.name

class Room(models.Model):
    name = models.CharField(max_length=100)
    location = models.ForeignKey(Location, on_delete=models.CASCADE)

    # As aspas resolvem o problema da ordem de leitura do Python!
    specialty = models.ForeignKey('Specialty', on_delete=models.SET_NULL, null=True, blank=True)
    doctor = models.ForeignKey('Profile', on_delete=models.SET_NULL, null=True, blank=True, limit_choices_to={'role': 'medico'})

    def __str__(self):
        return f"{self.name} ({self.location.name})"

class Specialty(models.Model):
    name = models.CharField(max_length=100)

    def __str__(self):
        return self.name

class DoctorShift(models.Model):
    TURNS = [('MANHÃ', 'Manhã'), ('TARDE', 'Tarde'), ('NOITE', 'Noite')]
    shift_date = models.DateField()
    turn = models.CharField(max_length=10, choices=TURNS)
    doctor = models.ForeignKey(Profile, on_delete=models.CASCADE, limit_choices_to={'role': 'medico'})
    room = models.ForeignKey(Room, on_delete=models.CASCADE)
    specialty = models.ForeignKey(Specialty, on_delete=models.CASCADE)

    # NOVO CAMPO: Quantidade de vagas disponíveis para agendamento
    vagas_totais = models.IntegerField(default=10)

    def __str__(self):
        return f"{self.shift_date} - {self.doctor.user.get_full_name()} ({self.turn})"

class Patient(models.Model):
    full_name = models.CharField(max_length=150)
    mother_name = models.CharField(max_length=150, null=True, blank=True)
    rg = models.CharField(max_length=20, null=True, blank=True)
    cpf = models.CharField(max_length=14, null=True, blank=True)
    cartao_sus = models.CharField(max_length=20, null=True, blank=True)
    birth_date = models.DateField(null=True, blank=True)
    phone = models.CharField(max_length=20, null=True, blank=True)
    has_previous_record = models.BooleanField(default=False)
    notes = models.TextField(null=True, blank=True)
    has_referral = models.BooleanField(default=False)
    referred_by = models.CharField(max_length=100, null=True, blank=True)

    def __str__(self):
        return self.full_name

class Appointment(models.Model):
    TURNS = [('MANHÃ', 'Manhã'), ('TARDE', 'Tarde'), ('NOITE', 'Noite')]
    TYPES = [('primeira_vez', 'Primeira Vez'), ('retorno', 'Retorno'), ('internato', 'Internato')]
    STATUS = [
        ('agendado', 'Agendado'),
        ('atendido', 'Atendido'),
        ('nao_compareceu', 'Não Compareceu'),
        ('cancelado', 'Cancelado'),
        ('bloqueado', 'Bloqueado'),
    ]

    patient = models.ForeignKey(Patient, on_delete=models.SET_NULL, null=True, blank=True)
    specialty = models.ForeignKey(Specialty, on_delete=models.SET_NULL, null=True, blank=True)
    doctor = models.ForeignKey(Profile, on_delete=models.CASCADE)
    location = models.ForeignKey(Location, on_delete=models.SET_NULL, null=True, blank=True)
    doctor_shift = models.ForeignKey(DoctorShift, on_delete=models.SET_NULL, null=True, blank=True)

    appointment_date = models.DateField()
    appointment_time = models.TimeField()
    turn = models.CharField(max_length=10, choices=TURNS)
    appointment_type = models.CharField(max_length=20, choices=TYPES, null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS, default='agendado')

    has_referral = models.BooleanField(default=False)
    secretary_notes = models.TextField(null=True, blank=True)
    medical_notes = models.TextField(null=True, blank=True)

    def __str__(self):
        return f"Consulta: {self.patient} em {self.appointment_date}"

# --- NOVAS TABELAS PARA COMUNICAÇÃO E RELATÓRIOS ---

class DailyReport(models.Model):
    report_date = models.DateField(auto_now_add=True)
    generated_by = models.ForeignKey(Profile, on_delete=models.SET_NULL, null=True)
    total_scheduled = models.IntegerField(default=0)
    total_attended = models.IntegerField(default=0)
    total_missed = models.IntegerField(default=0)

    def __str__(self):
        return f"Fechamento: {self.report_date}"

class AdminMessage(models.Model):
    sender = models.ForeignKey(Profile, on_delete=models.CASCADE)
    text_content = models.TextField()
    attached_file = models.FileField(upload_to='admin_files/', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Mensagem de {self.sender.user.first_name}"

class Intercurrence(models.Model):
    shift = models.ForeignKey(DoctorShift, on_delete=models.CASCADE)
    created_by = models.ForeignKey(Profile, on_delete=models.SET_NULL, null=True)
    description = models.TextField()
    is_resolved = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Alerta no Plantão: {self.shift.shift_date}"