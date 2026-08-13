import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';

export default function Doctors() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [apiErr, setApiErr] = useState('');
  const [filter, setFilter] = useState('all');
  const [form, setForm] = useState({ emp_code:'', full_name:'', specialization:'', dept_id:'', qualification:'', experience_yrs:0, phone:'', email:'', joined_date:'' });

  const { data: doctors=[], isLoading } = useQuery({
    queryKey: ['doctors'], queryFn: () => api.get('/doctors').then(r => r.data.data),
  });
  const { data: depts=[] } = useQuery({
    queryKey: ['departments'], queryFn: () => api.get('/departments').then(r => r.data.data),
  });

  const createMut = useMutation({
    mutationFn: b => api.post('/doctors', b),
    onSuccess: () => { qc.invalidateQueries(['doctors']); setModal(false); setApiErr(''); },
    onError: e => setApiErr(e.response?.data?.message || 'Failed'),
  });
  const statusMut = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/doctors/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries(['doctors']),
  });

  const f = k => e => setForm({ ...form, [k]: e.target.value });

  const rows = doctors.filter(d => filter === 'all' ? true : d.status === filter);

  const docBadge = s => s === 'on-duty' ? 'badge badge-green' : s === 'leave' ? 'badge badge-amber' : 'badge badge-gray';

  return (
    <div>
      <div className="page-header">
        <div className="filter-tabs">
          {['all','on-duty','off-duty','leave'].map(f2=>(
            <button key={f2} className={`ftab${filter===f2?' active':''}`} onClick={()=>setFilter(f2)}>
              {f2.charAt(0).toUpperCase()+f2.slice(1)}
            </button>
          ))}
        </div>
        <button className="btn btn-primary" style={{ marginLeft:'auto' }} onClick={()=>{ setModal(true); setApiErr(''); }}>
          + Add Doctor
        </button>
      </div>

      <div className="card">
        <table>
          <thead><tr>
            <th>Emp Code</th><th>Name & Specialization</th><th>Department</th>
            <th>Experience</th><th>Patients</th><th>Contact</th><th>Status</th><th>Actions</th>
          </tr></thead>
          <tbody>
            {isLoading ? <tr className="loading-row"><td colSpan={8}>Loading…</td></tr>
            : rows.map(d => (
              <tr key={d.doctor_id}>
                <td style={{ fontFamily:'monospace', fontSize:11, color:'#aaa' }}>{d.emp_code}</td>
                <td><div style={{ fontWeight:600 }}>{d.full_name}</div><div style={{ fontSize:11,color:'#aaa' }}>{d.specialization}</div></td>
                <td>{d.dept_name}</td>
                <td>{d.experience_yrs} yrs</td>
                <td><span className="badge badge-blue">{d.current_patients}</span></td>
                <td><div style={{ fontSize:12 }}>{d.phone}</div><div style={{ fontSize:11,color:'#aaa' }}>{d.email}</div></td>
                <td><span className={docBadge(d.status)}>{d.status}</span></td>
                <td>
                  <div style={{ display:'flex', gap:4 }}>
                    {d.status !== 'on-duty'  && <button className="btn btn-sm" style={{ color:'#3B6D11', borderColor:'#b2d68b' }} onClick={()=>statusMut.mutate({id:d.doctor_id,status:'on-duty'})}>On Duty</button>}
                    {d.status !== 'leave'    && <button className="btn btn-sm btn-danger" onClick={()=>statusMut.mutate({id:d.doctor_id,status:'leave'})}>Leave</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="overlay">
          <div className="modal" style={{ width:500 }}>
            <div className="modal-head">
              <strong style={{ flex:1 }}>🩺 Add Doctor</strong>
              <button className="btn btn-sm" onClick={()=>setModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              {apiErr && <div className="alert-err">{apiErr}</div>}
              <div className="field-row">
                <div className="field"><label>Employee Code *</label><input value={form.emp_code} onChange={f('emp_code')} placeholder="EMP009" required /></div>
                <div className="field"><label>Full Name *</label><input value={form.full_name} onChange={f('full_name')} placeholder="Dr. Name" required /></div>
              </div>
              <div className="field-row">
                <div className="field"><label>Specialization *</label><input value={form.specialization} onChange={f('specialization')} required /></div>
                <div className="field">
                  <label>Department *</label>
                  <select value={form.dept_id} onChange={f('dept_id')} required>
                    <option value="">-- Select --</option>
                    {depts.map(d=><option key={d.dept_id} value={d.dept_id}>{d.dept_name}</option>)}
                  </select>
                </div>
              </div>
              <div className="field"><label>Qualification</label><input value={form.qualification} onChange={f('qualification')} placeholder="MD, DM Cardiology" /></div>
              <div className="field-row">
                <div className="field"><label>Experience (yrs)</label><input type="number" value={form.experience_yrs} onChange={f('experience_yrs')} min={0} /></div>
                <div className="field"><label>Joined Date</label><input type="date" value={form.joined_date} onChange={f('joined_date')} /></div>
              </div>
              <div className="field-row">
                <div className="field"><label>Phone</label><input value={form.phone} onChange={f('phone')} maxLength={10} /></div>
                <div className="field"><label>Email</label><input type="email" value={form.email} onChange={f('email')} /></div>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn" onClick={()=>setModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={()=>createMut.mutate(form)} disabled={createMut.isPending}>Add Doctor</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
