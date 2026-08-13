import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';

const BLOOD  = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];
const GENDER = ['Male','Female','Other'];
const EMPTY  = { full_name:'', dob:'', gender:'Male', blood_group:'O+', phone:'', email:'', address:'', emergency_name:'', emergency_phone:'' };

const statusBadge = s => {
  if (s === 'admitted')    return 'badge badge-blue';
  if (s === 'discharged')  return 'badge badge-gray';
  return 'badge badge-green';
};

function age(dob) {
  if (!dob) return '—';
  return Math.floor((new Date() - new Date(dob)) / 31557600000);
}

export default function Patients() {
  const qc = useQueryClient();
  const [modal,  setModal]  = useState(false);
  const [viewModal, setViewModal] = useState(null);
  const [editId, setEditId] = useState(null);
  const [form,   setForm]   = useState(EMPTY);
  const [apiErr, setApiErr] = useState('');
  const [apiOk,  setApiOk]  = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const { data, isLoading } = useQuery({
    queryKey: ['patients', search],
    queryFn: () => api.get(`/patients?search=${search}&limit=50`).then(r => r.data.data.rows),
  });

  const { data: detail } = useQuery({
    queryKey: ['patient', viewModal],
    queryFn: () => api.get(`/patients/${viewModal}`).then(r => r.data.data),
    enabled: !!viewModal,
  });

  const createMut = useMutation({
    mutationFn: b => api.post('/patients', b),
    onSuccess: res => {
      qc.invalidateQueries(['patients']);
      setApiOk(`✅ Patient registered: ${res.data.data.patient_code}`);
      setApiErr(''); setForm(EMPTY);
    },
    onError: e => { setApiErr(e.response?.data?.message || 'Registration failed'); setApiOk(''); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, body }) => api.put(`/patients/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries(['patients']);
      setApiOk('✅ Patient updated'); setApiErr(''); closeModal();
    },
    onError: e => { setApiErr(e.response?.data?.message || 'Update failed'); setApiOk(''); },
  });

  const deleteMut = useMutation({
    mutationFn: id => api.delete(`/patients/${id}`),
    onSuccess: () => qc.invalidateQueries(['patients']),
    onError: e => alert(e.response?.data?.message || 'Delete failed'),
  });

  const f = k => e => setForm({ ...form, [k]: e.target.value });

  const submit = e => {
    e.preventDefault();
    if (editId) updateMut.mutate({ id: editId, body: form });
    else createMut.mutate(form);
  };

  const openAdd = () => { setEditId(null); setForm(EMPTY); setApiErr(''); setApiOk(''); setModal(true); };
  const openEdit = p => {
    setEditId(p.patient_id);
    setForm({
      full_name: p.full_name, dob: p.dob?.split('T')[0] || '',
      gender: p.gender, blood_group: p.blood_group,
      phone: p.phone, email: p.email || '', address: p.address || '',
      emergency_name: p.emergency_name || '', emergency_phone: p.emergency_phone || '',
    });
    setApiErr(''); setApiOk(''); setModal(true);
  };
  const closeModal = () => { setModal(false); setEditId(null); setApiErr(''); setApiOk(''); };

  const rows = (data || []).filter(p => {
    if (filter === 'all') return true;
    if (filter === 'admitted')   return p.admission_status === 'admitted';
    if (filter === 'outpatient') return !p.admission_status;
    if (filter === 'discharged') return p.admission_status === 'discharged';
    return true;
  });

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <input
          className="field" style={{ marginBottom:0, width:220 }}
          placeholder="🔍 Search name, code, phone…"
          value={search} onChange={e => setSearch(e.target.value)}
        />
        <div className="filter-tabs">
          {['all','admitted','outpatient','discharged'].map(f2 => (
            <button key={f2} className={`ftab${filter===f2?' active':''}`} onClick={() => setFilter(f2)}>
              {f2.charAt(0).toUpperCase()+f2.slice(1)}
            </button>
          ))}
        </div>
        <span style={{ marginLeft:'auto', fontSize:12, color:'#aaa' }}>{rows.length} records</span>
        <button className="btn btn-primary" onClick={openAdd}>+ Register Patient</button>
      </div>

      {/* Table */}
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Patient ID</th><th>Name</th><th>Age / Gender</th><th>Blood</th>
              <th>Condition</th><th>Doctor</th><th>Ward / Bed</th><th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr className="loading-row"><td colSpan={9}>Loading patients…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={9} style={{ textAlign:'center', color:'#bbb', padding:'32px 0' }}>No records found</td></tr>
            ) : rows.map(p => (
              <tr key={p.patient_id}>
                <td style={{ fontFamily:'monospace', fontSize:11, color:'#aaa' }}>{p.patient_code}</td>
                <td>
                  <div style={{ fontWeight:600 }}>{p.full_name}</div>
                  <div style={{ fontSize:11, color:'#aaa' }}>{p.phone}</div>
                </td>
                <td>{age(p.dob)} / {p.gender}</td>
                <td><span className="badge badge-blue" style={{ fontSize:10 }}>{p.blood_group}</span></td>
                <td style={{ maxWidth:140, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {p.diagnosis || '—'}
                </td>
                <td>{p.doctor_name || '—'}</td>
                <td style={{ fontSize:12 }}>{p.ward_name ? `${p.ward_name} · ${p.bed_number}` : '—'}</td>
                <td><span className={statusBadge(p.admission_status)}>{p.admission_status || 'outpatient'}</span></td>
                <td>
                  <div style={{ display:'flex', gap:4 }}>
                    <button className="btn btn-sm" onClick={() => setViewModal(p.patient_id)}>View</button>
                    <button className="btn btn-sm" onClick={() => openEdit(p)}>Edit</button>
                    <button className="btn btn-sm btn-danger"
                      onClick={() => { if(window.confirm(`Delete ${p.full_name}?`)) deleteMut.mutate(p.patient_id); }}>
                      Del
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {modal && (
        <div className="overlay">
          <div className="modal" style={{ width:520 }}>
            <div className="modal-head">
              <strong style={{ flex:1, fontSize:15 }}>{editId ? '✏️ Edit Patient' : '➕ Register New Patient'}</strong>
              <button className="btn btn-sm" onClick={closeModal}>✕</button>
            </div>
            <form onSubmit={submit}>
              <div className="modal-body">
                {apiErr && <div className="alert-err">{apiErr}</div>}
                {apiOk  && <div className="alert-ok">{apiOk}</div>}

                <div className="field-row">
                  <div className="field">
                    <label>Full Name *</label>
                    <input value={form.full_name} onChange={f('full_name')} required placeholder="Patient's full name" />
                  </div>
                  <div className="field">
                    <label>Date of Birth *</label>
                    <input type="date" value={form.dob} onChange={f('dob')} required />
                  </div>
                </div>
                <div className="field-row">
                  <div className="field">
                    <label>Gender *</label>
                    <select value={form.gender} onChange={f('gender')}>
                      {GENDER.map(g => <option key={g}>{g}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label>Blood Group *</label>
                    <select value={form.blood_group} onChange={f('blood_group')}>
                      {BLOOD.map(b => <option key={b}>{b}</option>)}
                    </select>
                  </div>
                </div>
                <div className="field-row">
                  <div className="field">
                    <label>Phone * (10 digits — unique)</label>
                    <input value={form.phone} onChange={f('phone')} required maxLength={10} pattern="[0-9]{10}" placeholder="9876543210" />
                  </div>
                  <div className="field">
                    <label>Email (optional)</label>
                    <input type="email" value={form.email} onChange={f('email')} placeholder="email@example.com" />
                  </div>
                </div>
                <div className="field">
                  <label>Address</label>
                  <input value={form.address} onChange={f('address')} placeholder="Full residential address" />
                </div>
                <div className="field-row">
                  <div className="field">
                    <label>Emergency Contact Name</label>
                    <input value={form.emergency_name} onChange={f('emergency_name')} />
                  </div>
                  <div className="field">
                    <label>Emergency Phone</label>
                    <input value={form.emergency_phone} onChange={f('emergency_phone')} maxLength={10} />
                  </div>
                </div>

                {!editId && (
                  <div className="alert-warn" style={{ marginBottom:0 }}>
                    ⚠️ Duplicate phone numbers are rejected automatically
                  </div>
                )}
              </div>
              <div className="modal-foot">
                <button type="button" className="btn" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn btn-primary"
                  disabled={createMut.isPending || updateMut.isPending}>
                  {editId ? 'Update Patient' : 'Register Patient'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Detail Modal */}
      {viewModal && detail && (
        <div className="overlay">
          <div className="modal" style={{ width:540 }}>
            <div className="modal-head">
              <strong style={{ flex:1 }}>👤 {detail.full_name}</strong>
              <button className="btn btn-sm" onClick={() => setViewModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:16 }}>
                {[
                  ['Patient ID', detail.patient_code],
                  ['Age', `${age(detail.dob)} yrs`],
                  ['Gender', detail.gender],
                  ['Blood Group', detail.blood_group],
                  ['Phone', detail.phone],
                  ['Status', detail.admission_status || 'Outpatient'],
                ].map(([l,v]) => (
                  <div key={l}>
                    <div style={{ fontSize:10, color:'#aaa', fontWeight:600 }}>{l}</div>
                    <div style={{ fontSize:13, fontWeight:600, marginTop:2 }}>{v}</div>
                  </div>
                ))}
              </div>

              {detail.admission_status === 'admitted' && (
                <div style={{ background:'#E6F1FB', borderRadius:8, padding:'10px 14px', marginBottom:14, fontSize:12 }}>
                  <strong>Admitted:</strong> {detail.diagnosis} &nbsp;|&nbsp;
                  <strong>Doctor:</strong> {detail.doctor_name} &nbsp;|&nbsp;
                  <strong>Ward:</strong> {detail.ward_name} · {detail.bed_number}
                </div>
              )}

              {detail.labs?.length > 0 && (
                <div style={{ marginBottom:12 }}>
                  <div style={{ fontWeight:700, fontSize:12, marginBottom:6 }}>🔬 Recent Lab Reports</div>
                  {detail.labs.slice(0,3).map(l => (
                    <div key={l.report_id} style={{ display:'flex', gap:10, fontSize:12, padding:'5px 0', borderBottom:'1px solid #F0EEE8' }}>
                      <span style={{ flex:1 }}>{l.test_name}</span>
                      <span style={{ color:'#555' }}>{l.result_value || 'Pending'}</span>
                      <span className={`badge badge-${l.result_status==='critical'?'red':l.result_status==='abnormal'?'amber':l.result_status==='normal'?'green':'gray'}`}>
                        {l.result_status}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {detail.bills?.length > 0 && (
                <div>
                  <div style={{ fontWeight:700, fontSize:12, marginBottom:6 }}>🧾 Bills</div>
                  {detail.bills.map(b => (
                    <div key={b.bill_id} style={{ display:'flex', gap:10, fontSize:12, padding:'5px 0', borderBottom:'1px solid #F0EEE8' }}>
                      <span style={{ fontFamily:'monospace', color:'#aaa' }}>{b.bill_number}</span>
                      <span style={{ flex:1 }}>₹{Number(b.net_payable).toLocaleString('en-IN')}</span>
                      <span className={`badge badge-${b.payment_status==='paid'?'green':b.payment_status==='partial'?'amber':'red'}`}>
                        {b.payment_status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-foot">
              <button className="btn" onClick={() => { setViewModal(null); openEdit(detail); }}>Edit Patient</button>
              <button className="btn btn-primary" onClick={() => setViewModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
