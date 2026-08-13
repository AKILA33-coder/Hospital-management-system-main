// ═══════════════════════════════════════════════════════════
// Appointments.js
// ═══════════════════════════════════════════════════════════
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';

const apptBadge = s => {
  if (s === 'confirmed')  return 'badge badge-green';
  if (s === 'waiting')    return 'badge badge-amber';
  if (s === 'cancelled')  return 'badge badge-red';
  if (s === 'completed')  return 'badge badge-gray';
  return 'badge badge-blue';
};

export function Appointments() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [apiErr, setApiErr] = useState('');
  const [filter, setFilter] = useState('all');
  const [form, setForm] = useState({ patient_id:'', doctor_id:'', appt_datetime:'', appt_type:'Consultation', notes:'' });

  const { data: appts=[], isLoading } = useQuery({
    queryKey: ['appointments', filter],
    queryFn: () => {
      const params = filter === 'today' ? `?date=${new Date().toISOString().split('T')[0]}` : filter !== 'all' ? `?status=${filter}` : '';
      return api.get(`/appointments${params}`).then(r => r.data.data);
    },
  });
  const { data: patients=[] } = useQuery({ queryKey:['pat-list'], queryFn: () => api.get('/patients?limit=200').then(r=>r.data.data.rows) });
  const { data: doctors=[]  } = useQuery({ queryKey:['doctors'],  queryFn: () => api.get('/doctors').then(r=>r.data.data) });

  const createMut = useMutation({
    mutationFn: b => api.post('/appointments', b),
    onSuccess: () => { qc.invalidateQueries(['appointments']); setModal(false); setApiErr(''); setForm({ patient_id:'', doctor_id:'', appt_datetime:'', appt_type:'Consultation', notes:'' }); },
    onError: e => setApiErr(e.response?.data?.message || 'Booking failed'),
  });
  const cancelMut = useMutation({
    mutationFn: id => api.delete(`/appointments/${id}`),
    onSuccess: () => qc.invalidateQueries(['appointments']),
  });
  const statusMut = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/appointments/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries(['appointments']),
  });

  const f = k => e => setForm({ ...form, [k]: e.target.value });

  return (
    <div>
      <div className="page-header">
        <div className="filter-tabs">
          {['all','today','scheduled','confirmed','waiting','completed'].map(f2=>(
            <button key={f2} className={`ftab${filter===f2?' active':''}`} onClick={()=>setFilter(f2)}>
              {f2.charAt(0).toUpperCase()+f2.slice(1)}
            </button>
          ))}
        </div>
        <button className="btn btn-primary" style={{ marginLeft:'auto' }} onClick={()=>{ setModal(true); setApiErr(''); }}>
          + Book Appointment
        </button>
      </div>

      <div className="card">
        <table>
          <thead><tr>
            <th>Appt ID</th><th>Patient</th><th>Doctor</th><th>Department</th>
            <th>Date & Time</th><th>Type</th><th>Status</th><th>Actions</th>
          </tr></thead>
          <tbody>
            {isLoading ? <tr className="loading-row"><td colSpan={8}>Loading…</td></tr>
            : appts.length === 0 ? <tr><td colSpan={8} style={{ textAlign:'center', color:'#bbb', padding:'28px 0' }}>No appointments found</td></tr>
            : appts.map(a => (
              <tr key={a.appt_id}>
                <td style={{ fontFamily:'monospace', fontSize:11, color:'#aaa' }}>APT-{String(a.appt_id).padStart(3,'0')}</td>
                <td><div style={{ fontWeight:600 }}>{a.patient_name}</div><div style={{ fontSize:11,color:'#aaa' }}>{a.patient_phone}</div></td>
                <td><div>{a.doctor_name}</div><div style={{ fontSize:11,color:'#aaa' }}>{a.specialization}</div></td>
                <td>{a.dept_name}</td>
                <td style={{ fontFamily:'monospace', fontSize:11 }}>
                  {new Date(a.appt_datetime).toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}
                </td>
                <td><span className="badge badge-blue">{a.appt_type}</span></td>
                <td><span className={apptBadge(a.status)}>{a.status}</span></td>
                <td>
                  <div style={{ display:'flex', gap:4 }}>
                    {a.status === 'scheduled' && (
                      <button className="btn btn-sm" style={{ color:'#3B6D11', borderColor:'#b2d68b' }}
                        onClick={()=>statusMut.mutate({id:a.appt_id,status:'confirmed'})}>Confirm</button>
                    )}
                    {['scheduled','confirmed'].includes(a.status) && (
                      <button className="btn btn-sm btn-danger"
                        onClick={()=>{ if(window.confirm('Cancel appointment?')) cancelMut.mutate(a.appt_id); }}>Cancel</button>
                    )}
                    {a.status === 'confirmed' && (
                      <button className="btn btn-sm" onClick={()=>statusMut.mutate({id:a.appt_id,status:'completed'})}>Done</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="overlay">
          <div className="modal" style={{ width:480 }}>
            <div className="modal-head">
              <strong style={{ flex:1 }}>📅 Book New Appointment</strong>
              <button className="btn btn-sm" onClick={()=>setModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              {apiErr && <div className="alert-err">{apiErr}</div>}
              <div className="field">
                <label>Patient *</label>
                <select value={form.patient_id} onChange={f('patient_id')} required>
                  <option value="">-- Select patient --</option>
                  {patients.map(p=><option key={p.patient_id} value={p.patient_id}>{p.full_name} · {p.phone}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Doctor *</label>
                <select value={form.doctor_id} onChange={f('doctor_id')} required>
                  <option value="">-- Select doctor --</option>
                  {doctors.filter(d=>d.status==='on-duty').map(d=>(
                    <option key={d.doctor_id} value={d.doctor_id}>{d.full_name} — {d.specialization}</option>
                  ))}
                </select>
              </div>
              <div className="field-row">
                <div className="field">
                  <label>Date & Time *</label>
                  <input type="datetime-local" value={form.appt_datetime} onChange={f('appt_datetime')} required />
                </div>
                <div className="field">
                  <label>Type</label>
                  <select value={form.appt_type} onChange={f('appt_type')}>
                    {['Consultation','Follow-up','Review','Pre-op','Emergency'].map(t=><option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="field">
                <label>Notes</label>
                <textarea style={{ height:60, resize:'vertical' }} value={form.notes} onChange={f('notes')} placeholder="Optional notes" />
              </div>
              <div className="alert-warn" style={{ marginBottom:0 }}>
                ⚠️ Duplicate slot booking for the same doctor is blocked automatically
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn" onClick={()=>setModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={()=>createMut.mutate(form)} disabled={createMut.isPending}>
                {createMut.isPending ? 'Booking…' : 'Book Appointment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Appointments;
