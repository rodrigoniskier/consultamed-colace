import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { AppointmentWithDetails } from '../types';
import { LogOut, Calendar, Clock, User, ClipboardList, CheckCircle2, XCircle } from 'lucide-react';
import { format, isToday } from 'date-fns';
import { cn } from '../lib/utils';

export function DoctorDashboard() {
  const { profile, signOut } = useAuth();
  const [appointments, setAppointments] = useState<AppointmentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [selectedAppt, setSelectedAppt] = useState<AppointmentWithDetails | null>(null);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<string>('');

  useEffect(() => {
    if (!profile) return;
    
    fetchAppointments();

    const channel = supabase
      .channel('doctor_appointments')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `doctor_id=eq.${profile.id}`,
        },
        () => {
          fetchAppointments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile]);

  const fetchAppointments = async () => {
    if (!profile) return;
    
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('appointments')
      .select('*, patients(*), specialties(*), profiles(*)')
      .eq('doctor_id', profile.id)
      .gte('appointment_date', today)
      .order('appointment_date', { ascending: true })
      .order('appointment_time', { ascending: true });

    if (!error && data) {
      setAppointments(data as AppointmentWithDetails[]);
    }
    setLoading(false);
  };

  const handleUpdate = async () => {
    if (!selectedAppt) return;
    
    await supabase
      .from('appointments')
      .update({
        status,
        medical_notes: notes
      })
      .eq('id', selectedAppt.id);
      
    setSelectedAppt(null); // Close modal
  };

  const openAppt = (appt: AppointmentWithDetails) => {
    setSelectedAppt(appt);
    setNotes(appt.medical_notes || '');
    setStatus(appt.status);
  };

  const StatusIcon = ({ status }: { status: string }) => {
    switch (status) {
      case 'agendado': return <Calendar className="w-5 h-5 text-blue-500" />;
      case 'atendido': return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'nao_compareceu': return <XCircle className="w-5 h-5 text-red-500" />;
      case 'cancelado': return <XCircle className="w-5 h-5 text-gray-400" />;
      case 'bloqueado': return <XCircle className="w-5 h-5 text-red-600" />;
      default: return <Calendar className="w-5 h-5 text-blue-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Mobile Top Navbar */}
      <header className="bg-white text-slate-800 shadow-sm border-b border-slate-200 rounded-b-2xl px-6 py-4 flex justify-between items-center sticky top-0 z-10 w-full">
        <div className="flex flex-col gap-2">
          <img src="/logo.svg" alt="UNIPÊ Logo" className="h-8 object-contain object-left" />
          <h1 className="text-xl font-bold">Dr(a). {profile?.full_name?.split(' ')[0]}</h1>
        </div>
        <button onClick={signOut} className="p-2 text-slate-500 hover:text-red-500 hover:bg-slate-50 rounded-full transition">
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 py-6 w-full max-w-lg mx-auto">
        {loading ? (
          <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
        ) : appointments.length === 0 ? (
          <div className="text-center text-slate-500 p-8 flex flex-col items-center">
            <ClipboardList className="w-12 h-12 mb-3 text-slate-300" />
            <p>Nenhuma consulta agendada.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {appointments.map((appt) => {
              const isApptToday = isToday(new Date(appt.appointment_date + 'T00:00:00'));
              return (
                <div 
                  key={appt.id} 
                  onClick={() => appt.status !== 'bloqueado' && openAppt(appt)} // In a PWA, tappable cards are good UX. Bloqueado has no actions.
                  className={cn(
                    "bg-white rounded-xl p-4 shadow-sm border border-slate-200 transition",
                    appt.status === 'bloqueado' ? "bg-red-50/30 opacity-75" : "active:scale-[0.98] cursor-pointer"
                  )}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <div className={cn("px-2.5 py-1 rounded-md text-xs font-semibold", 
                        isApptToday ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700"
                      )}>
                        {isApptToday ? 'Hoje' : format(new Date(appt.appointment_date + 'T00:00:00'), 'dd/MM/yyyy')}
                      </div>
                      <div className={cn("flex items-center text-sm font-medium gap-1 px-2.5 py-1 rounded-md",
                        appt.status === 'bloqueado' ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600"
                      )}>
                        <Clock className="w-3.5 h-3.5" />
                        {appt.appointment_time}
                      </div>
                      {appt.appointment_type && appt.status !== 'bloqueado' && (
                        <div className="bg-purple-100 text-purple-700 px-2.5 py-1 rounded-md text-xs font-bold uppercase hidden sm:block">
                          {appt.appointment_type.replace('_', ' ')}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                       <StatusIcon status={appt.status} />
                    </div>
                  </div>
                  
                  {appt.status === 'bloqueado' ? (
                    <div className="flex items-center gap-3">
                       <div className="h-10 w-10 bg-red-100 text-red-500 rounded-full flex items-center justify-center">
                         <XCircle className="w-5 h-5" />
                       </div>
                       <div>
                         <h3 className="font-semibold text-red-800 leading-tight">Horário Bloqueado</h3>
                         {appt.secretary_notes && <p className="text-sm text-red-600 mt-0.5">{appt.secretary_notes}</p>}
                       </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 bg-blue-100 text-blue-700 rounded-full flex shrink-0 items-center justify-center font-bold text-lg mt-0.5">
                        {appt.patients?.full_name?.charAt(0) || 'P'}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-semibold text-slate-900 leading-tight">{appt.patients?.full_name}</h3>
                          {appt.appointment_type && (
                            <div className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase sm:hidden shrink-0">
                              {appt.appointment_type.replace('_', ' ')}
                            </div>
                          )}
                        </div>
                        <p className="text-sm text-slate-500 mt-0.5">{appt.specialties?.name}</p>
                        
                        {appt.secretary_notes && (
                          <div className="mt-3 bg-yellow-50 border border-yellow-100 rounded-lg p-2.5 text-sm text-yellow-800">
                            <strong>Notas da Secretária:</strong>
                            <p className="mt-0.5 italic">{appt.secretary_notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      <div className="py-4 text-center text-xs text-slate-400 font-medium">
        Desenvolvido por: Prof. Rodrigo Niskier | 2026
      </div>

      {/* Edit Modal / Bottom Sheet style */}
      {selectedAppt && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl p-6 shadow-xl animate-in slide-in-from-bottom-8">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-bold text-xl text-slate-800">Prontuário</h3>
              <button onClick={() => setSelectedAppt(null)}><XCircle className="w-6 h-6 text-slate-400" /></button>
            </div>
            
            <div className="mb-4 bg-slate-50 p-4 rounded-xl">
              <p className="font-semibold text-slate-800">{selectedAppt.patients?.full_name}</p>
              <p className="text-sm text-slate-500">Motivo: {selectedAppt.specialties?.name}</p>
              <p className="text-sm text-slate-500">Horário: {selectedAppt.appointment_time}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Status do Atendimento</label>
                <select 
                  value={status} 
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full rounded-lg border-slate-300 py-3 text-slate-900 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="agendado">Agendado</option>
                  <option value="atendido">Atendido</option>
                  <option value="nao_compareceu">Não Compareceu</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notas Médicas (Prontuário)</label>
                <textarea 
                  rows={4}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Observações clínicas, prescrições..."
                  className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 resize-none"
                />
              </div>

              <button 
                onClick={handleUpdate}
                className="w-full bg-blue-600 active:bg-blue-700 text-white py-3.5 rounded-xl font-bold shadow-md transition"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
