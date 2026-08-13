import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';

export default function Beds() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [apiErr, setApiErr] = useState('');
  const [filter, setFilter] = useState('all');
  const [form, setForm] = useState({ patient_id:'', doctor_id:'', bed_id:'', diagnosis:'', notes:'' });

  const { data: beds=[], isLoading } = useQuery({
    queryKey: ['beds', filter],
    queryFn: () => api.get(filter==='all'?'/beds':`/beds?status=${filter}`).then(r=>r.data.data),
  });
  const { data: admitted=[] } = useQuery({
    queryKey: ['admissions'], queryFn: () => api.get('/admissions').then(r=>r.data.data),
  });
  const { data: patients=[] } = useQuery({ queryKey:['pat-list'], queryFn: () => api.get('/patients?limit=200').then(r=>r.data.data.rows) });
  const { data: doctors=[]  } = useQuery({ queryKey:['doctors'],  queryFn: () => api.get('/doctors').then(r=>r.data.data) });
  const { data: availBeds=[] } = useQuery({ queryKey:['avail-beds'], queryFn: () => api.get('/beds?status=available').then(r=>r.data.data) });

  const admitMut = useMutation({
    mutationFn: b => api.post('/admissions', b),
    onSuccess: () => { qc.invalidateQueries(['beds']); qc.invalidateQueries(['admissions']); setModal(false); setApiErr(''); },
    onError: e => setApiErr(e.response?.data?.message || 'Admission failed'),
  });
  const dischargeMut = useMutation({
    mutationFn: id => api.patch(`/admissions/${id}/discharge`),
    onSuccess: () => { qc.invalidateQueries(['beds']); qc.invalidateQueries(['admissions']); },
    onError: e => alert(e.response?.data?.message || 'Error'),
  });

  const f = k => e => setForm({ ...form, [k]: e.target.value });

  const avail = beds.filter(b=>b.status==='available').length;
  const occ   = beds.filter(b=>b.status==='occupied').length;
  const maint = beds.filter(b=>b.status==='maintenance').length;

  return (
    <div>
      {/* Stat row */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:16 }}>
        {[['🛏️ Total Beds', beds.length,'#222'],['🔴 Occupied',occ,'#A32D2D'],['✅ Available',avail,'#0F6E56'],['🔧 Maintenance',maint,'#854F0B']].map(([l,v,c])=>(
          <div key={l} className="stat-card">
            <div style={{ fontSize:11, fontWeight:600, color:'#999', marginBottom:5 }}>{l}</div>
            <div style={{ fontSize:26, fontWeight:700, color:c }}>{v}</div>
          </div>
        ))}
      </div>

      <div className="page-header">
        <div className="filter-tabs">
          {['all','available','occupied','maintenance'].map(f2=>(
            <button key={f2} className={`ftab${filter===f2?' active':''}`} onClick={()=>setFilter(f2)}>
              {f2.charAt(0).toUpperCase()+f2.slice(1)}
            </button>
          ))}
        </div>
        <button className="btn btn-primary" style={{ marginLeft:'auto' }} onClick={()=>{ setModal(true); setApiErr(''); }}>
          🛏️ Admit Patient
        </button>
      </div>

      <div className="card">
        <table>
          <thead><tr>
            <th>Bed No</th><th>Ward</th><th>Type</th><th>Patient</th><th>Doctor</th><th>Admitted On</th><th>Status</th><th>Actions</th>
          </tr></thead>
          <tbody>
            {isLoading ? <tr className="loading-row"><td colSpan={8}>Loading…</td></tr>
            : beds.map(b => {
              const adm = admitted.find(a => a.bed_number === b.bed_number);
              return (
                <tr key={b.bed_id}>
                  <td style={{ fontFamily:'monospace', fontWeight:700, color:'#0F6E56' }}>{b.bed_number}</td>
                  <td>{b.ward_name}</td>
                  <td><span className="badge badge-blue" style={{ fontSize:10 }}>{b.ward_type}</span></td>
                  <td>{b.patient_name || <span style={{ color:'#bbb' }}>—</span>}</td>
                  <td>{adm?.doctor_name || <span style={{ color:'#bbb' }}>—</span>}</td>
                  <td style={{ fontFamily:'monospace', fontSize:11 }}>
                    {adm ? new Date(adm.admission_date).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—'}
                  </td>
                  <td>
                    <span className={`badge badge-${b.status==='available'?'green':b.status==='occupied'?'blue':'amber'}`}>
                      {b.status}
                    </span>
                  </td>
                  <td>
                    {b.status === 'occupied' && adm && (
                      <button className="btn btn-sm btn-danger"
                        onClick={()=>{ if(window.confirm(`Discharge ${b.patient_name}?`)) dischargeMut.mutate(adm.admission_id); }}>
                        Discharge
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="overlay">
          <div className="modal" style={{ width:480 }}>
            <div className="modal-head">
              <strong style={{ flex:1 }}>🛏️ Admit Patient</strong>
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
              <div className="field">
                <label>Available Bed *</label>
                <select value={form.bed_id} onChange={f('bed_id')} required>
                  <option value="">-- Select bed --</option>
                  {availBeds.map(b=><option key={b.bed_id} value={b.bed_id}>{b.bed_number} · {b.ward_name} ({b.ward_type})</option>)}
                </select>
              </div>
              <div className="field">
                <label>Primary Diagnosis *</label>
                <input value={form.diagnosis} onChange={f('diagnosis')} placeholder="e.g. Hypertension, Fracture…" required />
              </div>
              <div className="field">
                <label>Notes</label>
                <textarea style={{ height:60, resize:'vertical' }} value={form.notes} onChange={f('notes')} />
              </div>
              <div className="alert-warn" style={{ marginBottom:0 }}>
                ⚠️ Already-admitted patients and occupied beds are blocked automatically
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn" onClick={()=>setModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={()=>admitMut.mutate(form)} disabled={admitMut.isPending}>
                {admitMut.isPending ? 'Admitting…' : 'Admit Patient'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
