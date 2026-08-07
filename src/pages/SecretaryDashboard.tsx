import React, { useEffect, useState } from 'react';
import { supabase, supabaseAuthHelper } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { AppointmentWithDetails, Patient, Profile, Specialty, Location } from '../types';
import { LogOut, Plus, Users, Stethoscope, Search, Edit, Map, Printer, Calendar } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// A single dashboard that contains basic Secretary views (simplified for the prompt)
export function SecretaryDashboard() {
  const { profile, signOut } = useAuth();
  
  const [appointments, setAppointments] = useState<AppointmentWithDetails[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Profile[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'agendamentos' | 'pacientes' | 'medicos' | 'especialidades' | 'mapa_visual' | 'mapa_salas'>('agendamentos');
  
  // Forms States
  const [showApptModal, setShowApptModal] = useState(false);
  const [newAppt, setNewAppt] = useState({ patient_id: '', specialty_id: '', doctor_id: '', location_id: '', appointment_date: '', appointment_time: '', turn: 'MANHÃ', status: 'agendado', appointment_type: 'primeira_vez', secretary_notes: '', has_referral: false });

  const [showEditApptModal, setShowEditApptModal] = useState(false);
  const [editAppt, setEditAppt] = useState<any>(null);

  const [mapFilter, setMapFilter] = useState({ date: format(new Date(), 'yyyy-MM-dd'), doctor_id: '', specialty_id: '', location_id: '' });
  
  const [shiftsFilter, setShiftsFilter] = useState({ month: new Date(), location_id: '' });
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [newShift, setNewShift] = useState({ shift_date: '', turn: 'MANHÃ', doctor_id: '', room_id: '', specialty_id: '' });
  const [selectedShiftForEdit, setSelectedShiftForEdit] = useState<any>(null);

  const [showBlockModal, setShowBlockModal] = useState(false);
  const [newBlock, setNewBlock] = useState({ doctor_id: '', appointment_date: '', appointment_time: '', turn: 'MANHÃ', status: 'bloqueado', secretary_notes: '' });

  const [showPatientModal, setShowPatientModal] = useState(false);
  const [newPatient, setNewPatient] = useState({ full_name: '', rg: '', cpf: '', cartao_sus: '', birth_date: '', phone: '', notes: '' });


  const [showDoctorModal, setShowDoctorModal] = useState(false);
  const [newDoctor, setNewDoctor] = useState({ full_name: '', email: '', password: '' });

  const [showSpecialtyModal, setShowSpecialtyModal] = useState(false);
  const [newSpecialty, setNewSpecialty] = useState({ name: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    
    const [apptsRes, patRes, docRes, specRes, locRes, roomsRes, shiftsRes] = await Promise.all([
      supabase.from('appointments').select('*, patients(*), specialties(*), profiles(*), locations(*)').order('appointment_date', { ascending: false }),
      supabase.from('patients').select('*').order('full_name'),
      supabase.from('profiles').select('*').eq('role', 'medico'),
      supabase.from('specialties').select('*'),
      supabase.from('locations').select('*'),
      supabase.from('rooms').select('*'),
      supabase.from('doctor_shifts').select('*, profiles(*), specialties(*)')
    ]);

    if (apptsRes.data) setAppointments(apptsRes.data as unknown as AppointmentWithDetails[]);
    if (patRes.data) setPatients(patRes.data);
    if (docRes.data) setDoctors(docRes.data as Profile[]);
    if (specRes.data) setSpecialties(specRes.data);
    if (locRes.data) setLocations(locRes.data);
    if (roomsRes.data) setRooms(roomsRes.data);
    if (shiftsRes.data) setShifts(shiftsRes.data);
    
    setLoading(false);
  };

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newAppt.appointment_type === 'primeira_vez' || newAppt.appointment_type === 'retorno') {
      const doc = doctors.find(d => d.id === newAppt.doctor_id);
      if (doc) {
        const todayAppts = appointments.filter(a => a.doctor_id === doc.id && a.appointment_date === newAppt.appointment_date && a.status !== 'cancelado' && a.status !== 'bloqueado');
        const countFirst = todayAppts.filter(a => a.appointment_type === 'primeira_vez').length;
        const countReturn = todayAppts.filter(a => a.appointment_type === 'retorno').length;

        if (newAppt.appointment_type === 'primeira_vez' && doc.max_primeira_vez != null && countFirst >= doc.max_primeira_vez) {
          alert(`Limite de vagas para Primeira Vez atingido para este médico neste dia (Máx: ${doc.max_primeira_vez}).`);
          return;
        }
        if (newAppt.appointment_type === 'retorno' && doc.max_retorno != null && countReturn >= doc.max_retorno) {
          alert(`Limite de vagas para Retorno atingido para este médico neste dia (Máx: ${doc.max_retorno}).`);
          return;
        }
      }
    }

    await supabase.from('appointments').insert([{
      ...newAppt, 
      patient_id: parseInt(newAppt.patient_id), 
      specialty_id: parseInt(newAppt.specialty_id),
      location_id: newAppt.location_id ? parseInt(newAppt.location_id) : null
    }]);
    setShowApptModal(false);
    setNewAppt({ patient_id: '', specialty_id: '', doctor_id: '', location_id: '', appointment_date: '', appointment_time: '', turn: 'MANHÃ', status: 'agendado', appointment_type: 'primeira_vez', secretary_notes: '', has_referral: false });
    fetchData();
  };

  const handleSaveShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedShiftForEdit) {
      await supabase.from('doctor_shifts').update({
        doctor_id: newShift.doctor_id,
        specialty_id: newShift.specialty_id
      }).eq('id', selectedShiftForEdit.id);
    } else {
      await supabase.from('doctor_shifts').insert([newShift]);
    }
    setShowShiftModal(false);
    setNewShift({ shift_date: '', turn: 'MANHÃ', doctor_id: '', room_id: '', specialty_id: '' });
    setSelectedShiftForEdit(null);
    fetchData();
  };

  const handleDeleteShift = async (id: number) => {
    if (window.confirm("Deseja remover este médico da escala?")) {
      await supabase.from('doctor_shifts').delete().eq('id', id);
      setShowShiftModal(false);
      setNewShift({ shift_date: '', turn: 'MANHÃ', doctor_id: '', room_id: '', specialty_id: '' });
      setSelectedShiftForEdit(null);
      fetchData();
    }
  };

  const handleUpdateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editAppt) return;
    await supabase.from('appointments').update({
      doctor_id: editAppt.doctor_id,
      appointment_date: editAppt.appointment_date,
      appointment_time: editAppt.appointment_time,
      location_id: editAppt.location_id ? parseInt(editAppt.location_id) : null
    }).eq('id', editAppt.id);
    setShowEditApptModal(false);
    setEditAppt(null);
    fetchData();
  };

  const handleCreateBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    await supabase.from('appointments').insert([{ 
      ...newBlock, 
      patient_id: null, 
      specialty_id: null 
    }]);
    setShowBlockModal(false);
    setNewBlock({ doctor_id: '', appointment_date: '', appointment_time: '', turn: 'MANHÃ', status: 'bloqueado', secretary_notes: '' });
    fetchData();
  };

  const handleDeleteAppointment = async (id: number) => {
    if (window.confirm("Deseja realmente cancelar e faturar a remoção do agendamento?")) {
      await supabase.from('appointments').delete().eq('id', id);
      fetchData();
    }
  };

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    await supabase.from('patients').insert([newPatient]);
    setShowPatientModal(false);
    setNewPatient({ full_name: '', rg: '', cpf: '', cartao_sus: '', birth_date: '', phone: '', notes: '' });
    fetchData();
  };

  const handleDeletePatient = async (id: number) => {
    if (window.confirm("Deseja realmente excluir este paciente?")) {
      await supabase.from('patients').delete().eq('id', id);
      fetchData();
    }
  };

  const handleCreateDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // 1. SignUp to create auth user securely without affecting our session
      const { data: authData, error: authError } = await supabaseAuthHelper.auth.signUp({
        email: newDoctor.email,
        password: newDoctor.password,
      });

      if (authError) throw authError;

      // 2. Insert into profiles with the new UID
      if (authData.user) {
        await supabase.from('profiles').insert([{ 
          id: authData.user.id, 
          full_name: newDoctor.full_name, 
          role: 'medico' 
        }]);
      } else {
        alert("Ocorreu um problema ao criar as credenciais do médico.");
      }
    } catch (err: any) {
      alert("Erro ao cadastrar médico: " + err.message);
    }
    
    setShowDoctorModal(false);
    setNewDoctor({ full_name: '', email: '', password: '' });
    fetchData();
  };

  const handleDeleteDoctor = async (id: string) => {
    if (window.confirm("Deseja excluir as informações deste médico? IMPORTANTE: Para que ele perca o acesso integralmente, exclua-o também na seção Authentication do Supabase.")) {
      await supabase.from('profiles').delete().eq('id', id);
      fetchData();
    }
  };

  const handleCreateSpecialty = async (e: React.FormEvent) => {
    e.preventDefault();
    await supabase.from('specialties').insert([newSpecialty]);
    setShowSpecialtyModal(false);
    setNewSpecialty({ name: '' });
    fetchData();
  };

  const handleDeleteSpecialty = async (id: number) => {
    if (window.confirm("Deseja realmente excluir esta especialidade?")) {
      await supabase.from('specialties').delete().eq('id', id);
      fetchData();
    }
  };

  return (
    <div className="h-screen bg-slate-50 text-slate-900 flex flex-col font-sans select-none overflow-hidden print:bg-white print:h-auto">
      {/* Top Navigation Bar */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-10 shadow-sm print:hidden">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-4">
            <img src="/logo.svg" alt="UNIPÊ Logo" className="h-10 object-contain" />
            <span className="font-bold text-xl tracking-tight text-slate-800">Medicina - UNIPÊ</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-500">
            <button onClick={() => setView('agendamentos')} className={view === 'agendamentos' ? "text-blue-600 border-b-2 border-blue-600 py-5" : "hover:text-slate-800 transition-colors py-5"}>Agenda Global</button>
            <button onClick={() => setView('pacientes')} className={view === 'pacientes' ? "text-blue-600 border-b-2 border-blue-600 py-5" : "hover:text-slate-800 transition-colors py-5"}>Pacientes</button>
            <button onClick={() => setView('medicos')} className={view === 'medicos' ? "text-blue-600 border-b-2 border-blue-600 py-5" : "hover:text-slate-800 transition-colors py-5"}>Médicos</button>
            <button onClick={() => setView('especialidades')} className={view === 'especialidades' ? "text-blue-600 border-b-2 border-blue-600 py-5" : "hover:text-slate-800 transition-colors py-5"}>Especialidades</button>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={signOut} className="text-slate-400 hover:text-red-500 transition-colors p-2 rounded-full hover:bg-slate-50" title="Sair">
            <LogOut className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3 px-3 py-1.5 bg-slate-100 rounded-full border border-slate-200">
            <div className="w-6 h-6 rounded-full bg-slate-300 flex items-center justify-center font-bold text-xs text-slate-700">
              {profile?.full_name?.charAt(0) || 'U'}
            </div>
            <div className="text-xs font-semibold leading-none hidden sm:block">
              <p className="text-slate-900">{profile?.full_name || 'Usuário'}</p>
              <p className="text-slate-500 text-[10px] mt-0.5 uppercase tracking-wider">Secretária</p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Sidebar Filters */}
        <aside className="w-64 border-r border-slate-200 bg-white p-6 hidden md:flex flex-col gap-6 print:hidden">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Ações Rápidas</h3>
            <button onClick={() => setShowApptModal(true)} className="w-full bg-blue-600 text-white rounded-xl py-3 px-4 font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all">
              <Plus className="w-4 h-4" />
              Novo Agendamento
            </button>
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Navegação</h3>
            <div className="flex flex-col gap-2">
              <label onClick={() => setView('mapa_salas')} className={`flex items-center gap-3 text-sm cursor-pointer p-2 rounded-lg transition-colors ${view === 'mapa_salas' ? 'bg-slate-50 text-slate-900 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}>
                <Map className="w-4 h-4 text-blue-600" />
                <span>Gestão de Escalas</span>
              </label>
              <label onClick={() => setView('mapa_visual')} className={`flex items-center gap-3 text-sm cursor-pointer p-2 rounded-lg transition-colors ${view === 'mapa_visual' ? 'bg-slate-50 text-slate-900 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}>
                <Calendar className="w-4 h-4 text-blue-600" />
                <span>Mapa Visual (Diário)</span>
              </label>
              <label onClick={() => setView('agendamentos')} className={`flex items-center gap-3 text-sm cursor-pointer p-2 rounded-lg transition-colors ${view === 'agendamentos' ? 'bg-slate-50 text-slate-900 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}>
                <Stethoscope className="w-4 h-4 text-blue-600" />
                <span>Agendamentos</span>
              </label>
              <label onClick={() => setView('pacientes')} className={`flex items-center gap-3 text-sm cursor-pointer p-2 rounded-lg transition-colors ${view === 'pacientes' ? 'bg-slate-50 text-slate-900 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}>
                <Users className="w-4 h-4 text-blue-600" />
                <span>Pacientes</span>
              </label>
              <label onClick={() => setView('medicos')} className={`flex items-center gap-3 text-sm cursor-pointer p-2 rounded-lg transition-colors ${view === 'medicos' ? 'bg-slate-50 text-slate-900 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}>
                <Plus className="w-4 h-4 text-blue-600" />
                <span>Médicos</span>
              </label>
              <label onClick={() => setView('especialidades')} className={`flex items-center gap-3 text-sm cursor-pointer p-2 rounded-lg transition-colors ${view === 'especialidades' ? 'bg-slate-50 text-slate-900 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}>
                <Edit className="w-4 h-4 text-blue-600" />
                <span>Especialidades</span>
              </label>
            </div>
          </div>

          <div className="mt-auto flex flex-col gap-4">
            <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
              <p className="text-blue-800 text-xs font-bold mb-1">Dica do Dia</p>
              <p className="text-blue-600 text-[11px] leading-relaxed italic">
                "Mantenha as notas médicas atualizadas para facilitar o retorno do paciente."
              </p>
            </div>
            <div className="text-xs text-slate-400 font-medium text-center">
              Desenvolvido por: Prof. Rodrigo Niskier | 2026
            </div>
          </div>
        </aside>

        {/* Main Table View */}
        <section className="flex-1 flex flex-col p-4 md:p-8 gap-4 md:gap-8 bg-slate-50 overflow-hidden print:hidden">
          <div className="flex flex-col md:flex-row md:items-end justify-between shrink-0 gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
                {view === 'mapa_visual' && 'Mapa Visual de Atendimentos'}
                {view === 'agendamentos' && 'Agenda de Consultas'}
                {view === 'pacientes' && 'Base de Pacientes'}
                {view === 'medicos' && 'Corpo Clínico (Médicos)'}
                {view === 'especialidades' && 'Especialidades Médicas'}
              </h1>
              <p className="text-slate-500 mt-1 capitalize">{format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
            </div>
            <div className="flex gap-3">
              <div className="bg-white border border-slate-200 rounded-lg px-4 py-2 flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400 uppercase">Total:</span>
                <span className="text-lg font-bold text-slate-800">
                  {view === 'agendamentos' && appointments.length}
                  {view === 'pacientes' && patients.length}
                  {view === 'medicos' && doctors.length}
                  {view === 'especialidades' && specialties.length}
                </span>
              </div>
              
              {view === 'mapa_visual' && (
                <>
                  <button onClick={() => window.print()} className="bg-white border border-slate-200 text-slate-700 rounded-lg px-4 py-2 font-semibold text-sm flex items-center gap-2 hover:bg-slate-50 hidden md:flex">
                    <Printer className="w-4 h-4" /> Imprimir Mapa
                  </button>
                  <button onClick={() => setShowBlockModal(true)} className="bg-red-50 text-red-600 border border-red-200 rounded-lg px-4 py-2 font-semibold text-sm flex items-center gap-2 hover:bg-red-100 hidden md:flex">
                    Bloquear Horário
                  </button>
                </>
              )}
              {view === 'agendamentos' && (
                <>
                  <button onClick={() => window.print()} className="bg-white border border-slate-200 text-slate-700 rounded-lg px-4 py-2 font-semibold text-sm flex items-center gap-2 hover:bg-slate-50 hidden md:flex">
                    <Printer className="w-4 h-4" /> Mapa Diário
                  </button>
                  <button onClick={() => setShowBlockModal(true)} className="bg-red-50 text-red-600 border border-red-200 rounded-lg px-4 py-2 font-semibold text-sm flex items-center gap-2 hover:bg-red-100 hidden md:flex">
                    Bloquear Horário
                  </button>
                  <button onClick={() => setShowApptModal(true)} className="bg-blue-600 text-white rounded-lg px-4 py-2 font-semibold text-sm flex items-center gap-2 hover:bg-blue-700 hidden md:flex">
                    <Plus className="w-4 h-4" /> Novo
                  </button>
                </>
              )}
              {view === 'pacientes' && (
                <button onClick={() => setShowPatientModal(true)} className="bg-blue-600 text-white rounded-lg px-4 py-2 font-semibold text-sm flex items-center gap-2 hover:bg-blue-700">
                  <Plus className="w-4 h-4" /> Novo
                </button>
              )}
              {view === 'medicos' && (
                <button onClick={() => setShowDoctorModal(true)} className="bg-blue-600 text-white rounded-lg px-4 py-2 font-semibold text-sm flex items-center gap-2 hover:bg-blue-700">
                  <Plus className="w-4 h-4" /> Novo
                </button>
              )}
              {view === 'especialidades' && (
                <button onClick={() => setShowSpecialtyModal(true)} className="bg-blue-600 text-white rounded-lg px-4 py-2 font-semibold text-sm flex items-center gap-2 hover:bg-blue-700">
                  <Plus className="w-4 h-4" /> Nova
                </button>
              )}
            </div>
          </div>

          {/* Data Table Container */}
          {loading ? (
             <div className="flex flex-1 items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
          ) : view === 'agendamentos' ? (
            <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-0">
              <div className="grid grid-cols-6 bg-slate-50 border-b border-slate-200 px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest shrink-0">
                <div className="col-span-2 md:col-span-1">Horário / Turno</div>
                <div className="col-span-4 md:col-span-2">Paciente</div>
                <div className="hidden md:block col-span-1">Especialidade</div>
                <div className="hidden md:block col-span-1">Médico</div>
                <div className="hidden md:block col-span-1">Status</div>
              </div>

              <div className="flex-1 overflow-auto divide-y divide-slate-100">
                {appointments.map(appt => (
                  <div key={appt.id} className={`grid grid-cols-6 px-4 md:px-6 py-4 items-center transition-colors cursor-pointer group ${appt.status === 'bloqueado' ? 'bg-red-50/50 hover:bg-red-50' : 'hover:bg-slate-50'}`}>
                    <div className="col-span-2 md:col-span-1">
                      <p className={`font-mono font-bold ${appt.status === 'atendido' ? 'text-green-700' : appt.status === 'bloqueado' ? 'text-red-700' : 'text-slate-700'}`}>{appt.appointment_time || '00:00'}</p>
                      <p className={`text-[10px] uppercase ${appt.status === 'atendido' ? 'text-green-400' : appt.status === 'bloqueado' ? 'text-red-400' : 'text-slate-400'}`}>{appt.turn}</p>
                    </div>
                    <div className="col-span-4 md:col-span-2">
                       {appt.status === 'bloqueado' ? (
                         <>
                           <p className="font-semibold text-red-800 flex items-center gap-2">Horário Bloqueado</p>
                           <p className="text-xs text-red-500 mt-1">{appt.secretary_notes}</p>
                         </>
                       ) : (
                         <>
                           <p className="font-semibold text-slate-800 line-clamp-1">{appt.patients?.full_name}</p>
                           <p className="text-xs text-slate-500 flex gap-2">
                             <span>CPF: {appt.patients?.cpf || '-'}</span> 
                             <span>SUS: {appt.patients?.cartao_sus || '-'}</span>
                           </p>
                           
                           {/* Mobile Only Info */}
                           <div className="md:hidden mt-2 flex flex-wrap gap-2 items-center">
                              <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase">{appt.specialties?.name}</span>
                              <span className={`text-[10px] font-bold capitalize ${
                                appt.status === 'atendido' ? 'text-green-600' :
                                appt.status === 'cancelado' || appt.status === 'nao_compareceu' ? 'text-red-600' :
                                'text-blue-600'
                              }`}>{appt.status === 'nao_compareceu' ? 'não compareceu' : appt.status}</span>
                              {appt.appointment_type && <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase">{appt.appointment_type.replace('_', ' ')}</span>}
                           </div>
                         </>
                       )}
                    </div>
                    <div className="hidden md:block col-span-1">
                      {appt.status !== 'bloqueado' && appt.specialties && (
                        <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-[11px] font-bold uppercase">{appt.specialties?.name}</span>
                      )}
                    </div>
                    <div className="hidden md:block col-span-1">
                      <p className="text-sm font-medium">{appt.profiles?.full_name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteAppointment(appt.id); }} className={`text-[10px] uppercase font-bold hover:text-red-700 transition-colors ${appt.status === 'bloqueado' ? 'text-red-500' : 'text-red-400'}`}>
                           {appt.status === 'bloqueado' ? 'Desbloquear' : 'Excluir'}
                        </button>
                        {appt.status !== 'bloqueado' && (
                          <button onClick={(e) => { e.stopPropagation(); setEditAppt(appt); setShowEditApptModal(true); }} className="text-[10px] uppercase font-bold text-blue-500 hover:text-blue-700 transition-colors">
                             Editar
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="hidden md:block col-span-1">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                           appt.status === 'atendido' ? 'bg-green-500' :
                           appt.status === 'cancelado' || appt.status === 'nao_compareceu' || appt.status === 'bloqueado' ? 'bg-red-500' :
                           'bg-blue-500'
                        }`}></div>
                        <span className={`text-xs font-bold capitalize ${
                           appt.status === 'atendido' ? 'text-green-600' :
                           appt.status === 'cancelado' || appt.status === 'nao_compareceu' || appt.status === 'bloqueado' ? 'text-red-600' :
                           'text-slate-600'
                        }`}>{appt.status === 'nao_compareceu' ? 'não compareceu' : appt.status}</span>
                      </div>
                      {appt.appointment_type && appt.status !== 'bloqueado' && (
                        <div className="mt-1 text-[10px] text-slate-500 uppercase font-medium">{appt.appointment_type.replace('_', ' ')}</div>
                      )}
                    </div>
                  </div>
                ))}
                {appointments.length === 0 && (
                  <div className="p-8 text-center text-slate-500 text-sm">Nenhum agendamento encontrado.</div>
                )}
              </div>
              
              <div className="h-12 border-t border-slate-100 flex items-center justify-between px-6 bg-slate-50/50 shrink-0">
                <span className="text-xs text-slate-400 font-medium italic">Última atualização: Tempo Real (Supabase Connected)</span>
                <div className="flex gap-2">
                   <button onClick={() => setShowBlockModal(true)} className="md:hidden text-xs bg-red-600 text-white px-3 py-1.5 rounded font-bold">Bloquear Horário</button>
                   <button onClick={() => setShowApptModal(true)} className="md:hidden text-xs bg-blue-600 text-white px-3 py-1.5 rounded font-bold">Novo Agendamento</button>
                </div>
              </div>
            </div>
          ) : view === 'mapa_salas' ? (
            <div className="flex-1 overflow-auto min-h-0 bg-white rounded-2xl border border-slate-200 flex flex-col">
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex gap-4 items-end">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mês</label>
                  <input type="month" value={format(shiftsFilter.month, 'yyyy-MM')} onChange={e => {
                    const [y, m] = e.target.value.split('-');
                    if (y && m) setShiftsFilter({...shiftsFilter, month: new Date(parseInt(y), parseInt(m) - 1, 1)});
                  }} className="border border-slate-300 rounded p-1.5 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Local</label>
                  <select value={shiftsFilter.location_id} onChange={e=>setShiftsFilter({...shiftsFilter, location_id: e.target.value})} className="border border-slate-300 rounded p-1.5 text-sm w-48">
                    <option value="">Selecione...</option>
                    {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
              </div>
              
              {!shiftsFilter.location_id ? (
                <div className="flex-1 flex items-center justify-center text-slate-400">Selecione um local para visualizar as escalas.</div>
              ) : (
                <div className="flex-1 overflow-auto p-4">
                  <div className="flex">
                     <div className="w-32 shrink-0 border-r border-slate-200">
                        <div className="h-10 border-b border-slate-200"></div>
                        {rooms.filter(r => String(r.location_id) === shiftsFilter.location_id).map(r => (
                          <div key={r.id} className="h-16 flex items-center px-2 border-b border-slate-200 font-bold text-sm text-slate-700 bg-slate-50">{r.name}</div>
                        ))}
                     </div>
                     <div className="flex-1 overflow-x-auto select-none">
                       <div className="flex w-max shrink-0">
                         {eachDayOfInterval({start: startOfMonth(shiftsFilter.month), end: endOfMonth(shiftsFilter.month)}).map(d => (
                            <div key={d.toISOString()} className="w-24 shrink-0 px-2 py-1 border-b border-slate-200 text-center font-bold text-xs sticky top-0 bg-white z-10 border-r">
                               {format(d, 'dd/MM')}
                            </div>
                         ))}
                       </div>
                       {rooms.filter(r => String(r.location_id) === shiftsFilter.location_id).map(r => (
                         <div key={r.id} className="flex w-max shrink-0">
                           {eachDayOfInterval({start: startOfMonth(shiftsFilter.month), end: endOfMonth(shiftsFilter.month)}).map(d => {
                             const ds = format(d, 'yyyy-MM-dd');
                             const cellShifts = shifts.filter(s => s.room_id === r.id && s.shift_date === ds);
                             const mShift = cellShifts.find(s => s.turn === 'MANHÃ');
                             const tShift = cellShifts.find(s => s.turn === 'TARDE');
                             
                             return (
                               <div key={d.toISOString()} className="w-24 shrink-0 h-16 border-r border-b border-slate-200 flex flex-col p-1 gap-1">
                                 <button onClick={() => { if (mShift) setSelectedShiftForEdit(mShift); setNewShift({ doctor_id: mShift?.doctor_id || '', specialty_id: mShift?.specialty_id || '', room_id: r.id.toString(), shift_date: ds, turn: 'MANHÃ' }); setShowShiftModal(true); }} className={`flex-1 rounded flex items-center justify-center text-[9px] font-bold leading-tight uppercase transition-colors ${mShift ? 'bg-blue-100 text-blue-800 hover:bg-blue-200 border border-blue-200' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>
                                    {mShift ? <span className="line-clamp-1">{mShift.profiles?.full_name?.split(' ')[0]} (M)</span> : 'Livre (M)'}
                                 </button>
                                 <button onClick={() => { if (tShift) setSelectedShiftForEdit(tShift); setNewShift({ doctor_id: tShift?.doctor_id || '', specialty_id: tShift?.specialty_id || '', room_id: r.id.toString(), shift_date: ds, turn: 'TARDE' }); setShowShiftModal(true); }} className={`flex-1 rounded flex items-center justify-center text-[9px] font-bold leading-tight uppercase transition-colors ${tShift ? 'bg-purple-100 text-purple-800 hover:bg-purple-200 border border-purple-200' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>
                                    {tShift ? <span className="line-clamp-1">{tShift.profiles?.full_name?.split(' ')[0]} (T)</span> : 'Livre (T)'}
                                 </button>
                               </div>
                             );
                           })}
                         </div>
                       ))}
                     </div>
                  </div>
                </div>
              )}
            </div>
          ) : view === 'mapa_visual' ? (
            <div className="flex-1 overflow-auto min-h-0 bg-white rounded-2xl border border-slate-200 p-6">
               <div className="flex flex-col md:flex-row gap-4 mb-6">
                 <div>
                   <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Data</label>
                   <input type="date" value={mapFilter.date} onChange={e=>setMapFilter({...mapFilter, date: e.target.value})} className="border rounded-lg p-2 text-sm" />
                 </div>
                 <div>
                   <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Médico</label>
                   <select value={mapFilter.doctor_id} onChange={e=>setMapFilter({...mapFilter, doctor_id: e.target.value})} className="border rounded-lg p-2 text-sm w-full md:w-48">
                      <option value="">Todos</option>
                      {doctors.map(d=><option key={d.id} value={d.id}>{d.full_name}</option>)}
                   </select>
                 </div>
                 <div>
                   <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Local / Sala</label>
                   <select value={mapFilter.location_id} onChange={e=>setMapFilter({...mapFilter, location_id: e.target.value})} className="border rounded-lg p-2 text-sm w-full md:w-48">
                      <option value="">Todos</option>
                      {locations.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
                   </select>
                 </div>
               </div>

               <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {Array.from({length: 21}).map((_, i) => {
                     const hour = Math.floor(i / 2) + 8;
                     const min = i % 2 === 0 ? '00' : '30';
                     const timeStr = `${hour.toString().padStart(2, '0')}:${min}`;
                     
                     const matchedAppts = appointments.filter(a => 
                       a.appointment_date === mapFilter.date &&
                       (!mapFilter.doctor_id || a.doctor_id === mapFilter.doctor_id) &&
                       (!mapFilter.location_id || String(a.location_id) === mapFilter.location_id)
                     );
                     
                     const myAppt = matchedAppts.find(a => a.appointment_time === timeStr);

                     return (
                       <div key={timeStr} 
                            onClick={() => {
                               if (!myAppt) {
                                  setNewAppt({...newAppt, appointment_date: mapFilter.date, doctor_id: mapFilter.doctor_id, location_id: mapFilter.location_id, appointment_time: timeStr});
                                  setShowApptModal(true);
                               }
                            }}
                            className={`p-3 rounded-xl border ${myAppt ? (myAppt.status === 'bloqueado' ? 'bg-red-50 border-red-200 cursor-not-allowed' : 'bg-blue-50 border-blue-200') : 'bg-white border-slate-200 hover:border-blue-400 cursor-pointer'} flex flex-col gap-1 transition-all`}>
                          <span className="font-mono text-sm font-bold text-slate-700">{timeStr}</span>
                          {myAppt ? (
                            <span className={`text-[10px] font-semibold uppercase ${myAppt.status === 'bloqueado' ? 'text-red-600' : 'text-blue-700 line-clamp-1'}`}>
                               {myAppt.status === 'bloqueado' ? 'Bloqueado' : myAppt.patients?.full_name}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">Livre</span>
                          )}
                       </div>
                     );
                  })}
               </div>
            </div>
          ) : view === 'pacientes' ? (
            <div className="flex-1 overflow-auto min-h-0 py-2">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {patients.map(p => (
                  <div key={p.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow transition flex justify-between items-start">
                    <div>
                      <div className="font-bold text-lg text-slate-900 mb-1">{p.full_name}</div>
                      <div className="text-sm text-slate-500 flex flex-col gap-1">
                        <span><strong className="font-medium text-slate-700">CPF:</strong> {p.cpf || '-'}</span>
                        <span><strong className="font-medium text-slate-700">SUS:</strong> {p.cartao_sus || '-'}</span>
                        <span><strong className="font-medium text-slate-700">RG:</strong> {p.rg || '-'}</span>
                        <span><strong className="font-medium text-slate-700">Fone:</strong> {p.phone || '-'}</span>
                        <span><strong className="font-medium text-slate-700">Nasc.:</strong> {p.birth_date ? new Date(p.birth_date).toLocaleDateString('pt-BR') : '-'}</span>
                      </div>
                    </div>
                    <button onClick={() => handleDeletePatient(p.id)} className="text-slate-400 hover:text-red-500">Excluir</button>
                  </div>
                ))}
                {patients.length === 0 && <div className="col-span-full p-8 text-center text-slate-500">Nenhum paciente cadastrado.</div>}
              </div>
            </div>
          ) : view === 'medicos' ? (
            <div className="flex-1 overflow-auto min-h-0 py-2">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {doctors.map(d => (
                  <div key={d.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow transition flex justify-between items-start">
                    <div>
                      <div className="font-bold text-lg text-slate-900 mb-1">{d.full_name}</div>
                      <div className="text-sm text-slate-500">Médico Cadastrado</div>
                    </div>
                    <button onClick={() => handleDeleteDoctor(d.id)} className="text-slate-400 hover:text-red-500">Excluir</button>
                  </div>
                ))}
                {doctors.length === 0 && <div className="col-span-full p-8 text-center text-slate-500">Nenhum médico cadastrado.</div>}
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-auto min-h-0 py-2">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {specialties.map(s => (
                  <div key={s.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow transition flex justify-between items-center">
                    <div className="font-bold text-slate-900">{s.name}</div>
                    <button onClick={() => handleDeleteSpecialty(s.id)} className="text-slate-400 hover:text-red-500 text-sm">Excluir</button>
                  </div>
                ))}
                {specialties.length === 0 && <div className="col-span-full p-8 text-center text-slate-500">Nenhuma especialidade cadastrada.</div>}
              </div>
            </div>
          )}
        </section>
      </main>

      {/* Shift Edit/Create Modal */}
      {showShiftModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 print:hidden">
          <div className="bg-white w-full max-w-md rounded-2xl p-8 shadow-2xl">
            <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Map className="w-5 h-5 text-blue-600" />
              {selectedShiftForEdit ? 'Editar Escala Médica' : 'Alocar Escala Médica'}
            </h3>
            
            <form onSubmit={handleSaveShift} className="space-y-4">
               <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Médico</label>
                  <select required value={newShift.doctor_id} onChange={e=>setNewShift({...newShift, doctor_id: e.target.value})} className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border">
                    <option value="">Selecione...</option>
                    {doctors.map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}
                  </select>
               </div>
               <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Especialidade (Opcional)</label>
                  <select value={newShift.specialty_id} onChange={e=>setNewShift({...newShift, specialty_id: e.target.value})} className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border">
                    <option value="">Selecione...</option>
                    {specialties.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
               </div>
               
               <div className="text-sm text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <p><strong>Data:</strong> {format(new Date(newShift.shift_date + 'T00:00:00'), 'dd/MM/yyyy')}</p>
                  <p><strong>Turno:</strong> {newShift.turn}</p>
                  <p><strong>Sala:</strong> {rooms.find(r => String(r.id) === newShift.room_id)?.name}</p>
               </div>

              <div className="flex justify-between items-center gap-3 pt-6">
                {selectedShiftForEdit ? (
                  <button type="button" onClick={() => handleDeleteShift(selectedShiftForEdit.id)} className="px-4 py-2 text-red-600 hover:text-red-700 font-bold text-sm">Remover</button>
                ) : <div></div>}
                <div className="flex gap-2">
                  <button type="button" onClick={() => { setShowShiftModal(false); setSelectedShiftForEdit(null); }} className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 bg-white hover:bg-slate-50 font-medium text-sm">Cancelar</button>
                  <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm text-sm">Salvar Registro</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Block Appointment Modal */}
      {showBlockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-8 shadow-2xl">
            <h3 className="text-xl font-bold text-red-600 mb-6 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-600 inline-block"></span>
              Bloquear Horário
            </h3>
            
            <form onSubmit={handleCreateBlock} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Médico Responsável</label>
                  <select required value={newBlock.doctor_id} onChange={e=>setNewBlock({...newBlock, doctor_id: e.target.value})} className="w-full rounded-lg border-slate-300 shadow-sm focus:border-red-500 focus:ring-red-500 p-2 border">
                    <option value="">Selecione...</option>
                    {doctors.map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Data</label>
                  <input type="date" required value={newBlock.appointment_date} onChange={e=>setNewBlock({...newBlock, appointment_date: e.target.value})} className="w-full rounded-lg border-slate-300 shadow-sm focus:border-red-500 focus:ring-red-500 p-2 border" />
                </div>
                
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Horário</label>
                  <input type="time" required value={newBlock.appointment_time} onChange={e=>setNewBlock({...newBlock, appointment_time: e.target.value})} className="w-full rounded-lg border-slate-300 shadow-sm focus:border-red-500 focus:ring-red-500 p-2 border" />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Motivo do Bloqueio</label>
                  <textarea rows={2} value={newBlock.secretary_notes || ''} onChange={e=>setNewBlock({...newBlock, secretary_notes: e.target.value})} placeholder="Reunião, cirurgia, licença..." className="w-full rounded-lg border-slate-300 shadow-sm focus:border-red-500 focus:ring-red-500 p-2 border" />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6">
                <button type="button" onClick={() => setShowBlockModal(false)} className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 bg-white hover:bg-slate-50 font-medium">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium shadow-sm">Confirmar Bloqueio</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Basic Create Appointment Modal */}
      {showApptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl p-8 shadow-2xl">
            <h3 className="text-xl font-bold text-slate-900 mb-6">Novo Agendamento</h3>
            
            <form onSubmit={handleCreateAppointment} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Paciente</label>
                  <select required value={newAppt.patient_id} onChange={e=>setNewAppt({...newAppt, patient_id: e.target.value})} className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border">
                    <option value="">Selecione...</option>
                    {patients.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                  </select>
                </div>
                
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Médico Responsável</label>
                  <select required value={newAppt.doctor_id} onChange={e=>setNewAppt({...newAppt, doctor_id: e.target.value})} className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border">
                    <option value="">Selecione...</option>
                    {doctors.map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}
                  </select>
                </div>

                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Local / Sala</label>
                  <select value={newAppt.location_id} onChange={e=>setNewAppt({...newAppt, location_id: e.target.value})} className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border">
                    <option value="">Selecione...</option>
                    {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>

                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Especialidade</label>
                  <select required value={newAppt.specialty_id} onChange={e=>setNewAppt({...newAppt, specialty_id: e.target.value})} className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border">
                    <option value="">Selecione...</option>
                    {specialties.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>

                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Consulta</label>
                  <select required value={newAppt.appointment_type} onChange={e=>setNewAppt({...newAppt, appointment_type: e.target.value as any})} className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border">
                    <option value="primeira_vez">Primeira Vez</option>
                    <option value="retorno">Retorno</option>
                    <option value="internato">Internato</option>
                  </select>
                </div>

                <div className="col-span-2 md:col-span-1 flex items-center justify-start mt-6">
                  <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700">
                    <input type="checkbox" checked={newAppt.has_referral} onChange={e=>setNewAppt({...newAppt, has_referral: e.target.checked})} className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500" />
                    Paciente possui Encaminhamento
                  </label>
                </div>

                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Data</label>
                  <input type="date" required value={newAppt.appointment_date} onChange={e=>setNewAppt({...newAppt, appointment_date: e.target.value})} className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border" />
                </div>
                
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Horário</label>
                  <input type="time" required value={newAppt.appointment_time} onChange={e=>setNewAppt({...newAppt, appointment_time: e.target.value})} className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border" />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Observações da Secretária</label>
                  <textarea rows={2} value={newAppt.secretary_notes || ''} onChange={e=>setNewAppt({...newAppt, secretary_notes: e.target.value})} placeholder="Adicione notas para o médico ou sobre o preparo..." className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border" />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6">
                <button type="button" onClick={() => setShowApptModal(false)} className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 bg-white hover:bg-slate-50 font-medium">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm">Confirmar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Patient Modal */}
      {showPatientModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-8 shadow-2xl">
            <h3 className="text-xl font-bold text-slate-900 mb-6">Cadastrar Paciente</h3>
            <form onSubmit={handleCreatePatient} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo</label>
                <input type="text" required value={newPatient.full_name} onChange={e=>setNewPatient({...newPatient, full_name: e.target.value})} className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 p-2 border focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Data de Nasc.</label>
                  <input type="date" value={newPatient.birth_date} onChange={e=>setNewPatient({...newPatient, birth_date: e.target.value})} className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 p-2 border focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Telefone</label>
                  <input type="text" value={newPatient.phone} onChange={e=>setNewPatient({...newPatient, phone: e.target.value})} className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 p-2 border focus:ring-blue-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">CPF</label>
                  <input type="text" value={newPatient.cpf} onChange={e=>setNewPatient({...newPatient, cpf: e.target.value})} className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 p-2 border focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Cartão SUS</label>
                  <input type="text" value={newPatient.cartao_sus} onChange={e=>setNewPatient({...newPatient, cartao_sus: e.target.value})} className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 p-2 border focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">RG</label>
                <input type="text" value={newPatient.rg} onChange={e=>setNewPatient({...newPatient, rg: e.target.value})} className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 p-2 border focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Observações / Histórico</label>
                <textarea rows={3} value={newPatient.notes} onChange={e=>setNewPatient({...newPatient, notes: e.target.value})} className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 p-2 border focus:ring-blue-500" />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowPatientModal(false)} className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">Cadastrar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Doctor Modal */}
      {showDoctorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-8 shadow-2xl">
            <h3 className="text-xl font-bold text-slate-900 mb-6">Cadastrar Médico</h3>
            <div className="mb-4 text-xs text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-200">
              Após o cadastro, o médico poderá fazer login com este e-mail e senha no sistema.<br/><br/>
              <strong>Importante:</strong> Certifique-se que no Supabase a opção "Confirm email" está DESABILITADA (Authentication &gt; Providers &gt; Email), senão o acesso ficará bloqueado.
            </div>
            <form onSubmit={handleCreateDoctor} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Médico (ex: Dr. João)</label>
                <input type="text" required value={newDoctor.full_name} onChange={e=>setNewDoctor({...newDoctor, full_name: e.target.value})} className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 p-2 border focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">E-mail de Acesso</label>
                <input type="email" required value={newDoctor.email} onChange={e=>setNewDoctor({...newDoctor, email: e.target.value})} className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 p-2 border focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Senha Provisória</label>
                <input type="password" required value={newDoctor.password} onChange={e=>setNewDoctor({...newDoctor, password: e.target.value})} className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 p-2 border focus:ring-blue-500" minLength={6} />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowDoctorModal(false)} className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">Cadastrar Médico</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Appointment Modal */}
      {showEditApptModal && editAppt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 print:hidden">
          <div className="bg-white w-full max-w-md rounded-2xl p-8 shadow-2xl">
            <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Edit className="w-5 h-5 text-blue-600" />
              Editar Agendamento
            </h3>
            
            <form onSubmit={handleUpdateAppointment} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Médico Responsável</label>
                  <select required value={editAppt.doctor_id} onChange={e=>setEditAppt({...editAppt, doctor_id: e.target.value})} className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border">
                    <option value="">Selecione...</option>
                    {doctors.map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Local / Sala</label>
                  <select value={editAppt.location_id || ''} onChange={e=>setEditAppt({...editAppt, location_id: e.target.value})} className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border">
                    <option value="">Selecione...</option>
                    {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>

                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Data</label>
                  <input type="date" required value={editAppt.appointment_date} onChange={e=>setEditAppt({...editAppt, appointment_date: e.target.value})} className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border" />
                </div>
                
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Horário</label>
                  <input type="time" required value={editAppt.appointment_time} onChange={e=>setEditAppt({...editAppt, appointment_time: e.target.value})} className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border" />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6">
                <button type="button" onClick={() => { setShowEditApptModal(false); setEditAppt(null); }} className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 bg-white hover:bg-slate-50 font-medium">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm">Salvar Alterações</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Specialty Modal */}
      {showSpecialtyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-8 shadow-2xl">
            <h3 className="text-xl font-bold text-slate-900 mb-6">Nova Especialidade</h3>
            <form onSubmit={handleCreateSpecialty} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Especialidade</label>
                <input type="text" required value={newSpecialty.name} onChange={e=>setNewSpecialty({...newSpecialty, name: e.target.value})} className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 p-2 border focus:ring-blue-500" />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowSpecialtyModal(false)} className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Print View */}
      <div className="hidden print:block p-8 bg-white text-black min-h-screen">
        <h1 className="text-2xl font-bold text-center mb-6">Mapa de Atendimento Diário</h1>
        {mapFilter.doctor_id ? (
           <div className="mb-4">
             <p><strong>Profissional:</strong> {doctors.find(d=>d.id === mapFilter.doctor_id)?.full_name || 'Todos'}</p>
             <p><strong>Data:</strong> {format(new Date(mapFilter.date), 'dd/MM/yyyy')}</p>
           </div>
        ) : (
           <div className="mb-4">
             <p><strong>Data:</strong> {format(new Date(mapFilter.date), 'dd/MM/yyyy')}</p>
             <p className="text-xs text-slate-500">Selecione um médico no Mapa Visual ou Agenda para uma impressão específica.</p>
           </div>
        )}
        <table className="w-full border-collapse border border-black max-w-full">
          <thead>
            <tr>
              <th className="border border-black p-2 text-left text-sm w-32">Turno/Hora</th>
              <th className="border border-black p-2 text-left text-sm">Paciente</th>
              <th className="border border-black p-2 text-left text-sm w-32">RG</th>
              <th className="border border-black p-2 text-left text-sm w-48">Assinatura do Paciente</th>
            </tr>
          </thead>
          <tbody>
             {appointments.filter(a => a.status !== 'bloqueado' && (!mapFilter.doctor_id || a.doctor_id === mapFilter.doctor_id) && a.appointment_date === mapFilter.date).map(a => (
               <tr key={a.id}>
                 <td className="border border-black p-2 text-sm">{a.turn.substring(0,1)} - {a.appointment_time}</td>
                 <td className="border border-black p-2 text-sm truncate">{a.patients?.full_name}</td>
                 <td className="border border-black p-2 text-sm">{a.patients?.rg || '-'}</td>
                 <td className="border border-black p-2 h-10 w-48"></td>
               </tr>
             ))}
             {appointments.filter(a => a.status !== 'bloqueado' && (!mapFilter.doctor_id || a.doctor_id === mapFilter.doctor_id) && a.appointment_date === mapFilter.date).length === 0 && (
                <tr><td colSpan={4} className="p-4 text-center border-black border text-slate-500 italic">Nenhum agendamento para este filtro.</td></tr>
             )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
