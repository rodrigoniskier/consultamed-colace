import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Patient, Specialty, Location, DoctorShift } from '../types';
import { LogOut, Calendar, Plus, User, FileText, CheckCircle2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function PatientSecretaryDashboard() {
  const { profile, signOut } = useAuth();
  
  const [locations, setLocations] = useState<Location[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [shifts, setShifts] = useState<DoctorShift[]>([]);
  
  const [filters, setFilters] = useState({ location_id: '', specialty_id: '' });
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const [showModal, setShowModal] = useState(false);
  const [selectedShift, setSelectedShift] = useState<DoctorShift | null>(null);
  
  // Create / Select Patient Form inside Modal
  const [newAppt, setNewAppt] = useState({
    patient_id: '', 
    appointment_type: 'primeira_vez', 
    has_referral: false,
    referred_by: '',
    new_patient: false,
    full_name: '',
    rg: '',
    cpf: '',
    mother_name: '',
  });

  useEffect(() => {
    fetchBaseData();
  }, []);

  useEffect(() => {
    if (filters.location_id && filters.specialty_id) {
      fetchShifts();
    }
  }, [filters, currentMonth]);

  const fetchBaseData = async () => {
    const [locRes, specRes, patRes] = await Promise.all([
      supabase.from('locations').select('*'),
      supabase.from('specialties').select('*'),
      supabase.from('patients').select('*').order('full_name')
    ]);
    if (locRes.data) setLocations(locRes.data);
    if (specRes.data) setSpecialties(specRes.data);
    if (patRes.data) setPatients(patRes.data);
  };

  const fetchShifts = async () => {
    const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
    const end = format(endOfMonth(currentMonth), 'yyyy-MM-dd');
    
    // We only want shifts matching location and specialty
    const { data } = await supabase
      .from('doctor_shifts')
      .select('*, rooms(*)')
      .eq('specialty_id', filters.specialty_id)
      .gte('shift_date', start)
      .lte('shift_date', end);

    if (data) {
      // Filter by location_id (room's location)
      const validShifts = data.filter((s: any) => s.rooms && String(s.rooms.location_id) === String(filters.location_id));
      setShifts(validShifts);
    }
  };

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShift) return;

    let finalPatientId = newAppt.patient_id;

    // If new patient mode
    if (newAppt.new_patient) {
      const { data: newPat, error } = await supabase.from('patients').insert([{
        full_name: newAppt.full_name,
        rg: newAppt.rg,
        cpf: newAppt.cpf,
        mother_name: newAppt.mother_name,
      }]).select().single();
      
      if (error || !newPat) {
        alert("Erro ao criar paciente.");
        return;
      }
      finalPatientId = newPat.id;
      setPatients(prev => [...prev, newPat]);
    }

    if (!finalPatientId) {
      alert("Selecione ou crie um paciente.");
      return;
    }

    // Default time based on turn
    const time = selectedShift.turn === 'MANHÃ' ? '08:00' : '14:00';

    await supabase.from('appointments').insert([{
      patient_id: parseInt(finalPatientId),
      specialty_id: selectedShift.specialty_id,
      doctor_id: selectedShift.doctor_id,
      location_id: parseInt(filters.location_id),
      doctor_shift_id: selectedShift.id,
      appointment_date: selectedShift.shift_date,
      appointment_time: time,
      turn: selectedShift.turn,
      status: 'agendado',
      appointment_type: newAppt.appointment_type,
      has_referral: newAppt.has_referral,
      secretary_notes: newAppt.has_referral ? `Encaminhado por: ${newAppt.referred_by || 'Não informado'}` : null
    }]);

    setShowModal(false);
    alert("Agendamento criado com sucesso!");
    fetchShifts(); // Refresh
  };

  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });

  return (
    <div className="h-screen bg-slate-50 text-slate-900 flex flex-col font-sans select-none overflow-hidden">
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <Calendar className="w-6 h-6 text-blue-600" />
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-700 to-blue-500 bg-clip-text text-transparent">Agendamento de Pacientes</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm font-medium text-slate-600">
            {profile?.full_name} <span className="text-xs ml-1 bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold uppercase">Agendamento</span>
          </div>
          <button onClick={() => signOut()} className="text-slate-400 hover:text-red-500 p-2 rounded-full hover:bg-slate-100 transition-colors">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col p-6 overflow-auto">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Local de Atendimento</label>
              <select value={filters.location_id} onChange={e=>setFilters({...filters, location_id: e.target.value})} className="w-full rounded-lg border-slate-300 p-2.5 border text-sm">
                <option value="">Selecione o local...</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Especialidade</label>
              <select value={filters.specialty_id} onChange={e=>setFilters({...filters, specialty_id: e.target.value})} className="w-full rounded-lg border-slate-300 p-2.5 border text-sm">
                <option value="">Selecione a especialidade...</option>
                {specialties.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {!filters.location_id || !filters.specialty_id ? (
          <div className="flex-1 flex items-center justify-center bg-slate-100 rounded-xl border border-dashed border-slate-300">
            <p className="text-slate-500 font-medium">Selecione o Local e a Especialidade para buscar agendas.</p>
          </div>
        ) : (
          <div className="flex-1 bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h2 className="font-bold text-lg text-slate-800 capitalize">{format(currentMonth, 'MMMM yyyy', {locale: ptBR})}</h2>
              <div className="flex gap-2">
                 <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth()-1, 1))} className="px-3 py-1 bg-white border border-slate-300 rounded hover:bg-slate-50">&lt;</button>
                 <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth()+1, 1))} className="px-3 py-1 bg-white border border-slate-300 rounded hover:bg-slate-50">&gt;</button>
              </div>
            </div>
            
            <div className="grid grid-cols-7 gap-px bg-slate-200 flex-1">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                <div key={d} className="bg-slate-100 p-2 text-center text-xs font-bold text-slate-500 uppercase">{d}</div>
              ))}
              
              {/* Padding offset */}
              {Array.from({length: startOfMonth(currentMonth).getDay()}).map((_, i) => <div key={`pad-${i}`} className="bg-white" />)}

              {days.map(day => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const dayShifts = shifts.filter(s => s.shift_date === dateStr);
                const hasShift = dayShifts.length > 0;
                const isPast = day < new Date(new Date().setHours(0,0,0,0));

                return (
                  <div key={dateStr} className={`bg-white min-h-[100px] p-2 flex flex-col ${!hasShift || isPast ? 'opacity-50' : 'hover:bg-blue-50'}`}>
                     <span className={`text-sm font-semibold mb-2 ${hasShift ? 'text-blue-900' : 'text-slate-400'}`}>{format(day, 'd')}</span>
                     {hasShift && !isPast && (
                        <div className="flex flex-col gap-1 mt-auto">
                          {dayShifts.map(s => (
                             <button key={s.id} onClick={() => { setSelectedShift(s); setShowModal(true); setNewAppt({...newAppt, new_patient: false, rg: '', cpf: '', mother_name: ''}) }} className="text-left text-[10px] bg-blue-100 text-blue-800 px-2 py-1 rounded truncate hover:bg-blue-200">
                                {s.turn}
                             </button>
                          ))}
                        </div>
                     )}
                     {hasShift && isPast && (
                       <span className="text-[10px] text-slate-400 font-bold uppercase mt-auto">Expirado</span>
                     )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </main>

      {showModal && selectedShift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl p-8 shadow-2xl max-h-screen overflow-y-auto">
            <h3 className="text-xl font-bold text-slate-900 mb-2 flex items-center gap-2">
              <Plus className="w-5 h-5 text-blue-600" /> Agendar Paciente
            </h3>
            <p className="text-sm text-slate-500 mb-6">
               Data: {format(new Date(selectedShift.shift_date + 'T00:00:00'), 'dd/MM/yyyy')} - Turno: {selectedShift.turn}
            </p>
            
            <form onSubmit={handleCreateAppointment} className="space-y-4">
              
              <div className="flex bg-slate-100 p-1 rounded-lg">
                <button type="button" onClick={() => setNewAppt({...newAppt, new_patient: false})} className={`flex-1 py-1.5 text-sm font-medium rounded-md ${!newAppt.new_patient ? 'bg-white shadow-sm text-blue-700' : 'text-slate-500'}`}>Paciente Existente</button>
                <button type="button" onClick={() => setNewAppt({...newAppt, new_patient: true})} className={`flex-1 py-1.5 text-sm font-medium rounded-md ${newAppt.new_patient ? 'bg-white shadow-sm text-blue-700' : 'text-slate-500'}`}>Novo Paciente</button>
              </div>

              {!newAppt.new_patient ? (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Selecione o Paciente</label>
                  <select required value={newAppt.patient_id} onChange={e=>setNewAppt({...newAppt, patient_id: e.target.value})} className="w-full rounded-lg border-slate-300 p-2.5 border text-sm">
                    <option value="">Buscar...</option>
                    {patients.map(p => <option key={p.id} value={p.id}>{p.full_name} {p.cpf ? `(CPF: ${p.cpf})` : ''}</option>)}
                  </select>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo</label>
                    <input type="text" required value={newAppt.full_name} onChange={e=>setNewAppt({...newAppt, full_name: e.target.value})} className="w-full rounded-lg border-slate-300 p-2.5 border text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">RG</label>
                    <input type="text" value={newAppt.rg} onChange={e=>setNewAppt({...newAppt, rg: e.target.value})} className="w-full rounded-lg border-slate-300 p-2.5 border text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">CPF</label>
                    <input type="text" value={newAppt.cpf} onChange={e=>setNewAppt({...newAppt, cpf: e.target.value})} className="w-full rounded-lg border-slate-300 p-2.5 border text-sm" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Mãe</label>
                    <input type="text" value={newAppt.mother_name} onChange={e=>setNewAppt({...newAppt, mother_name: e.target.value})} className="w-full rounded-lg border-slate-300 p-2.5 border text-sm" />
                  </div>
                </div>
              )}

              <hr className="border-slate-200" />
              
              <div className="grid grid-cols-2 gap-4 mt-4">
                 <div className="col-span-2 md:col-span-1">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Consulta</label>
                    <select required value={newAppt.appointment_type} onChange={e=>setNewAppt({...newAppt, appointment_type: e.target.value})} className="w-full rounded-lg border-slate-300 p-2.5 border text-sm">
                      <option value="primeira_vez">Primeira Vez</option>
                      <option value="retorno">Retorno</option>
                    </select>
                 </div>
                 
                 <div className="col-span-2 mt-2">
                    <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700">
                      <input type="checkbox" checked={newAppt.has_referral} onChange={e=>setNewAppt({...newAppt, has_referral: e.target.checked})} className="w-4 h-4 text-blue-600" />
                      Paciente possui Encaminhamento?
                    </label>
                 </div>

                 {newAppt.has_referral && (
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Quem encaminhou? (USF, Hospital, etc)</label>
                      <input type="text" required value={newAppt.referred_by} onChange={e=>setNewAppt({...newAppt, referred_by: e.target.value})} className="w-full rounded-lg border-slate-300 p-2.5 border text-sm" />
                    </div>
                 )}
              </div>

              <div className="flex justify-end gap-3 pt-6 mt-4 border-t border-slate-100">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 bg-white hover:bg-slate-50 font-medium">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm">Confirmar Agendamento</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
