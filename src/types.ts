export type Profile = {
  id: string;
  full_name: string;
  role: 'secretaria' | 'medico' | 'secretaria_pacientes';
  max_primeira_vez?: number | null;
  max_retorno?: number | null;
};

export type Location = {
  id: number;
  name: string;
};

export type Room = {
  id: number;
  name: string;
  location_id: number;
};

export type DoctorShift = {
  id: number;
  shift_date: string; // DATE
  turn: 'MANHÃ' | 'TARDE' | 'NOITE';
  doctor_id: string;
  room_id: number;
  specialty_id: number;
};

export type Specialty = {
  id: number;
  name: string;
};

export type Patient = {
  id: number;
  full_name: string;
  mother_name?: string | null;
  rg: string | null;
  cpf: string | null;
  cartao_sus: string | null;
  birth_date: string | null;
  phone: string | null;
  notes: string | null;
  has_referral?: boolean;
  referred_by?: string | null;
};

export type Appointment = {
  id: number;
  patient_id: number | null;
  specialty_id: number | null;
  doctor_id: string;
  location_id?: number | null;
  doctor_shift_id?: number | null;
  appointment_date: string; // DATE representation
  appointment_time: string;
  turn: 'MANHÃ' | 'TARDE' | 'NOITE';
  appointment_type: 'primeira_vez' | 'retorno' | 'internato' | null;
  status: 'agendado' | 'atendido' | 'nao_compareceu' | 'cancelado' | 'bloqueado';
  has_referral?: boolean;
  secretary_notes: string | null;
  medical_notes: string | null;
};

// Joined types for the frontend views
export type AppointmentWithDetails = Appointment & {
  patients?: Patient;
  specialties?: Specialty;
  locations?: Location;
  profiles: Profile; // The doctor's profile
  doctor_shifts?: DoctorShift;
};
