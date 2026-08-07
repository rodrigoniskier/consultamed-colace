import json
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib.auth import logout
from django.contrib.auth.models import User
from django.db.models import Count, Q
from .models import Profile, Appointment, Patient, Specialty, DoctorShift, Room, Location, DailyReport, AdminMessage, Intercurrence
from datetime import date

def is_admin(user):
    if user.is_superuser:
        return True
    try:
        return user.profile.role == 'secretaria'
    except:
        return False

def custom_logout(request):
    logout(request)
    return redirect('login')

@login_required
def dashboard(request):
    if is_admin(request.user):
        return redirect('custom_admin')

    try:
        perfil = request.user.profile
    except Profile.DoesNotExist:
        return render(request, 'dashboard.html', {'perfil': None})

    if perfil.role == 'medico':
        consultas = Appointment.objects.filter(
            doctor=perfil, appointment_date__gte=date.today()
        ).order_by('appointment_date', 'appointment_time')
        return render(request, 'dashboard.html', {'perfil': perfil, 'consultas': consultas})

    elif perfil.role == 'secretaria_pacientes':
        # ATUALIZAÇÃO: Removemos o filtro 'gte' (maior ou igual) para enviar o histórico completo ao calendário
        turnos_ativos = DoctorShift.objects.all().order_by('shift_date')

        lista_vagas = []
        for turno in turnos_ativos:
            consultas_turno = Appointment.objects.filter(doctor_shift=turno, status__in=['agendado', 'atendido'])
            ocupadas = consultas_turno.count()
            livres = turno.vagas_totais - ocupadas

            qtd_primeira = consultas_turno.filter(appointment_type='primeira_vez').count()
            qtd_retorno = consultas_turno.filter(appointment_type='retorno').count()
            qtd_encaminhamento = consultas_turno.filter(appointment_type='encaminhamento').count()

            lista_vagas.append({
                'id': turno.id,
                'data': str(turno.shift_date),
                'medico': turno.doctor.user.get_full_name(),
                'medico_id': turno.doctor.id,
                'especialidade': turno.specialty.name,
                'turno': turno.turn,
                'livres': livres,
                'total': turno.vagas_totais,
                'qtd_primeira': qtd_primeira,
                'qtd_retorno': qtd_retorno,
                'qtd_encaminhamento': qtd_encaminhamento
            })

        search_q = request.GET.get('q', '').strip()
        search_d = request.GET.get('d', '').strip()
        agenda_date = request.GET.get('agenda_date', str(date.today()))

        is_searching = bool(search_q or search_d)

        if is_searching:
            consultas_query = Appointment.objects.all()
            if search_q:
                consultas_query = consultas_query.filter(
                    Q(patient__full_name__icontains=search_q) |
                    Q(patient__rg__icontains=search_q) |
                    Q(doctor__user__first_name__icontains=search_q) |
                    Q(doctor_shift__specialty__name__icontains=search_q) |
                    Q(doctor_shift__room__location__name__icontains=search_q)
                )
            if search_d:
                consultas_query = consultas_query.filter(appointment_date=search_d)

            consultas_list = consultas_query.order_by('-appointment_date', 'appointment_time')
            data_filtro_str = search_d if search_d else ""
        else:
            consultas_list = Appointment.objects.filter(appointment_date=agenda_date).order_by('appointment_time')
            data_filtro_str = agenda_date

        contexto = {
            'perfil': perfil,
            'consultas': consultas_list,
            'data_filtro': data_filtro_str,
            'search_q': search_q,
            'search_d': search_d,
            'is_searching': is_searching,
            'pacientes': Patient.objects.all().order_by('full_name'),
            'vagas_json': json.dumps(lista_vagas),
            'especialidades': Specialty.objects.all().order_by('name'),
        }
        return render(request, 'secretary_dashboard.html', contexto)

    return render(request, 'dashboard.html', {'perfil': perfil})

@login_required
def custom_admin_dashboard(request):
    if not is_admin(request.user):
        return redirect('dashboard')

    status_counts = Appointment.objects.values('status').annotate(total=Count('id'))
    grafico_status_labels = [item['status'].upper() for item in status_counts]
    grafico_status_data = [item['total'] for item in status_counts]

    esp_counts = Appointment.objects.values('doctor_shift__specialty__name').annotate(total=Count('id'))
    grafico_esp_labels = [item['doctor_shift__specialty__name'] or 'Sem Especialidade' for item in esp_counts]
    grafico_esp_data = [item['total'] for item in esp_counts]

    contexto = {
        'medicos': Profile.objects.filter(role='medico'),
        'especialidades': Specialty.objects.all(),
        'salas': Room.objects.all(),
        'locais': Location.objects.all(),
        'turnos_recentes': DoctorShift.objects.all().order_by('-shift_date')[:1000],
        'grafico_status_labels': json.dumps(grafico_status_labels),
        'grafico_status_data': json.dumps(grafico_status_data),
        'grafico_esp_labels': json.dumps(grafico_esp_labels),
        'grafico_esp_data': json.dumps(grafico_esp_data),
        'agendamentos_globais': Appointment.objects.all().order_by('-appointment_date', '-appointment_time')[:100],
        'relatorios_diarios': DailyReport.objects.all().order_by('-report_date'),
        'mensagens_recepcao': AdminMessage.objects.all().order_by('-created_at'),
        'alertas_pendentes': Intercurrence.objects.filter(is_resolved=False).order_by('-created_at'),
    }
    return render(request, 'custom_admin.html', contexto)

@login_required
def create_shift(request):
    if request.method == 'POST' and is_admin(request.user):
        DoctorShift.objects.create(
            shift_date=request.POST.get('shift_date'),
            turn=request.POST.get('turn'),
            doctor_id=request.POST.get('doctor_id'),
            room_id=request.POST.get('room_id'),
            specialty_id=request.POST.get('specialty_id'),
            vagas_totais=request.POST.get('vagas_totais')
        )
    return redirect('custom_admin')

@login_required
def add_specialty(request):
    if request.method == 'POST' and is_admin(request.user):
        Specialty.objects.create(name=request.POST.get('name'))
    return redirect('custom_admin')

@login_required
def add_location(request):
    if request.method == 'POST' and is_admin(request.user):
        Location.objects.create(name=request.POST.get('name'))
    return redirect('custom_admin')

@login_required
def add_room(request):
    if request.method == 'POST' and is_admin(request.user):
        Room.objects.create(
            name=request.POST.get('name'),
            location_id=request.POST.get('location_id'),
            specialty_id=request.POST.get('specialty_id') or None,
            doctor_id=request.POST.get('doctor_id') or None
        )
    return redirect('custom_admin')

@login_required
def add_doctor(request):
    if request.method == 'POST' and is_admin(request.user):
        novo_usuario = User.objects.create_user(
            username=request.POST.get('username'),
            password=request.POST.get('password'),
            first_name=request.POST.get('first_name')
        )
        Profile.objects.create(user=novo_usuario, role='medico')
    return redirect('custom_admin')

@login_required
def add_patient(request):
    if request.method == 'POST':
        tem_ficha = request.POST.get('has_previous_record') == 'sim'
        Patient.objects.create(
            full_name=request.POST.get('full_name'),
            mother_name=request.POST.get('mother_name'),
            rg=request.POST.get('rg'),
            phone=request.POST.get('phone'),
            has_previous_record=tem_ficha
        )
    return redirect('dashboard')

@login_required
def update_patient(request, pk):
    if request.method == 'POST':
        paciente = get_object_or_404(Patient, pk=pk)
        if 'full_name' in request.POST: paciente.full_name = request.POST.get('full_name')
        if 'rg' in request.POST: paciente.rg = request.POST.get('rg')
        if 'phone' in request.POST: paciente.phone = request.POST.get('phone')
        paciente.has_previous_record = request.POST.get('has_previous_record') == 'sim'
        paciente.save()
    return redirect('dashboard')

@login_required
def schedule_appointment(request):
    if request.method == 'POST':
        paciente = get_object_or_404(Patient, id=request.POST.get('patient_id'))
        turno_vaga = get_object_or_404(DoctorShift, id=request.POST.get('shift_id'))

        tipo_consulta = request.POST.get('appointment_type')
        notas = ""
        has_ref = False

        if tipo_consulta == 'encaminhamento':
            has_ref = True
            notas = f"Encaminhado por: {request.POST.get('referred_by', '')}"
            tipo_salvo = 'primeira_vez'
        else:
            tipo_salvo = tipo_consulta

        Appointment.objects.create(
            patient=paciente,
            doctor=turno_vaga.doctor,
            doctor_shift=turno_vaga,
            appointment_date=turno_vaga.shift_date,
            appointment_time="08:00:00",
            status='agendado',
            appointment_type=tipo_salvo,
            has_referral=has_ref,
            secretary_notes=notas
        )
    return redirect('dashboard')

@login_required
def update_appointment(request, pk):
    if request.method == 'POST':
        consulta = get_object_or_404(Appointment, pk=pk)
        if request.POST.get('status'): consulta.status = request.POST.get('status')
        if request.POST.get('medical_notes') is not None: consulta.medical_notes = request.POST.get('medical_notes')
        consulta.save()
    return redirect('dashboard')

@login_required
def cancel_appointment(request, pk):
    if request.method == 'POST':
        consulta = get_object_or_404(Appointment, pk=pk)
        consulta.status = 'cancelado'
        consulta.save()
    return redirect('dashboard')

@login_required
def generate_daily_report(request):
    if request.method == 'POST':
        hoje = date.today()
        consultas_hoje = Appointment.objects.filter(appointment_date=hoje)

        DailyReport.objects.create(
            generated_by=request.user.profile,
            total_scheduled=consultas_hoje.count(),
            total_attended=consultas_hoje.filter(status='atendido').count(),
            total_missed=consultas_hoje.filter(status='nao_compareceu').count()
        )
    return redirect('dashboard')

@login_required
def send_admin_message(request):
    if request.method == 'POST':
        AdminMessage.objects.create(
            sender=request.user.profile,
            text_content=request.POST.get('text_content'),
            attached_file=request.FILES.get('attached_file')
        )
    return redirect('dashboard')

@login_required
def delete_admin_message(request, pk):
    if request.method == 'POST' and is_admin(request.user):
        mensagem = get_object_or_404(AdminMessage, pk=pk)
        if mensagem.attached_file:
            mensagem.attached_file.delete(save=False)
        mensagem.delete()
    return redirect('custom_admin')

@login_required
def delete_daily_report(request, pk):
    if request.method == 'POST' and is_admin(request.user):
        relatorio = get_object_or_404(DailyReport, pk=pk)
        relatorio.delete()
    return redirect('custom_admin')

@login_required
def update_shift(request, pk):
    if request.method == 'POST' and is_admin(request.user):
        turno = get_object_or_404(DoctorShift, pk=pk)
        turno.shift_date = request.POST.get('shift_date')
        turno.turn = request.POST.get('turn')
        turno.vagas_totais = request.POST.get('vagas_totais')
        turno.save()
    return redirect('custom_admin')

@login_required
def delete_shift(request, pk):
    if request.method == 'POST' and is_admin(request.user):
        turno = get_object_or_404(DoctorShift, pk=pk)
        turno.delete()
    return redirect('custom_admin')

@login_required
def report_intercurrence(request):
    if request.method == 'POST':
        turno = get_object_or_404(DoctorShift, id=request.POST.get('shift_id'))
        Intercurrence.objects.create(
            shift=turno,
            created_by=request.user.profile,
            description=request.POST.get('description')
        )
    return redirect('dashboard')

@login_required
def resolve_intercurrence(request, pk):
    if request.method == 'POST' and is_admin(request.user):
        alerta = get_object_or_404(Intercurrence, pk=pk)
        alerta.is_resolved = True
        alerta.save()
    return redirect('custom_admin')

@login_required
def admin_update_appointment(request, pk):
    if request.method == 'POST' and is_admin(request.user):
        consulta = get_object_or_404(Appointment, pk=pk)
        consulta.status = request.POST.get('status')
        consulta.appointment_type = request.POST.get('appointment_type')
        consulta.save()
    return redirect('custom_admin')

@login_required
def admin_delete_appointment(request, pk):
    if request.method == 'POST' and is_admin(request.user):
        consulta = get_object_or_404(Appointment, pk=pk)
        consulta.delete()
    return redirect('custom_admin')

@login_required
def print_daily_map(request):
    data_str = request.GET.get('date', str(date.today()))
    specialty_id = request.GET.get('specialty_id')

    consultas = Appointment.objects.filter(
        appointment_date=data_str,
        status__in=['agendado', 'atendido']
    )

    especialidade_nome = "Todas as Especialidades"
    if specialty_id:
        consultas = consultas.filter(doctor_shift__specialty_id=specialty_id)
        esp = Specialty.objects.filter(id=specialty_id).first()
        if esp:
            especialidade_nome = esp.name

    consultas = consultas.order_by('appointment_time')

    return render(request, 'print_daily_map.html', {
        'consultas': consultas,
        'data': data_str,
        'especialidade_nome': especialidade_nome
    })