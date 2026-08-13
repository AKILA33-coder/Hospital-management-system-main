// ═══════════════════════════════════════ Billing.js ═══
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';

export function Billing() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState('all');

  const { data: bills=[], isLoading } = useQuery({
    queryKey: ['bills', filter],
    queryFn: () => api.get(filter==='all'?'/billing':`/billing?status=${filter}`).then(r=>r.data.data),
  });
  const payMut = useMutation({
    mutationFn: id => api.patch(`/billing/${id}/payment`, { payment_status:'paid', payment_mode:'Cash' }),
    onSuccess: () => qc.invalidateQueries(['bills']),
  });

  const { data: summary } = useQuery({
    queryKey: ['billing-summary'], queryFn: () => api.get('/billing/summary').then(r=>r.data.data),
  });

  const billBadge = s => s==='paid'?'badge badge-green':s==='partial'?'badge badge-amber':'badge badge-red';

  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:16 }}>
        <div className="stat-card">
          <div style={{ fontSize:11,fontWeight:600,color:'#999',marginBottom:5 }}>Today's Revenue</div>
          <div style={{ fontSize:24,fontWeight:700,color:'#0F6E56' }}>₹{Number(summary?.todayRevenue||0).toLocaleString('en-IN')}</div>
        </div>
        <div className="stat-card">
          <div style={{ fontSize:11,fontWeight:600,color:'#999',marginBottom:5 }}>Pending Amount</div>
          <div style={{ fontSize:24,fontWeight:700,color:'#A32D2D' }}>₹{Number(summary?.pendingAmount||0).toLocaleString('en-IN')}</div>
        </div>
        <div className="stat-card">
          <div style={{ fontSize:11,fontWeight:600,color:'#999',marginBottom:5 }}>Total Bills</div>
          <div style={{ fontSize:24,fontWeight:700,color:'#185FA5' }}>{bills.length}</div>
        </div>
      </div>

      <div className="page-header">
        <div className="filter-tabs">
          {['all','paid','pending','partial'].map(f=>(
            <button key={f} className={`ftab${filter===f?' active':''}`} onClick={()=>setFilter(f)}>
              {f.charAt(0).toUpperCase()+f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <table>
          <thead><tr>
            <th>Bill No</th><th>Patient</th><th>Total</th><th>Discount</th><th>Insurance</th><th>Net Payable</th><th>Mode</th><th>Status</th><th>Actions</th>
          </tr></thead>
          <tbody>
            {isLoading ? <tr className="loading-row"><td colSpan={9}>Loading…</td></tr>
            : bills.map(b=>(
              <tr key={b.bill_id}>
                <td style={{ fontFamily:'monospace',fontSize:11,color:'#aaa' }}>{b.bill_number}</td>
                <td><div style={{ fontWeight:600 }}>{b.patient_name}</div><div style={{ fontSize:11,color:'#aaa' }}>{b.phone}</div></td>
                <td>₹{Number(b.total_amount).toLocaleString('en-IN')}</td>
                <td style={{ color:'#3B6D11' }}>₹{Number(b.discount).toLocaleString('en-IN')}</td>
                <td style={{ color:'#185FA5' }}>₹{Number(b.insurance_cover).toLocaleString('en-IN')}</td>
                <td style={{ fontWeight:700,fontSize:14 }}>₹{Number(b.net_payable).toLocaleString('en-IN')}</td>
                <td>{b.payment_mode}</td>
                <td><span className={billBadge(b.payment_status)}>{b.payment_status}</span></td>
                <td>
                  {b.payment_status !== 'paid' && (
                    <button className="btn btn-sm" style={{ color:'#3B6D11',borderColor:'#b2d68b' }}
                      onClick={()=>payMut.mutate(b.bill_id)}>Mark Paid</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════ Pharmacy.js ═══
export function Pharmacy() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [apiErr, setApiErr] = useState('');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ med_code:'', med_name:'', generic_name:'', category:'', manufacturer:'', unit_price:'', stock_qty:'', reorder_level:20, expiry_date:'' });

  const { data: meds=[], isLoading } = useQuery({
    queryKey: ['medicines', search],
    queryFn: () => api.get(`/medicines?search=${search}`).then(r=>r.data.data),
  });

  const createMut = useMutation({
    mutationFn: b => api.post('/medicines', b),
    onSuccess: () => { qc.invalidateQueries(['medicines']); setModal(false); setApiErr(''); },
    onError: e => setApiErr(e.response?.data?.message || 'Failed'),
  });
  const restockMut = useMutation({
    mutationFn: ({ id, qty }) => api.patch(`/medicines/${id}/restock`, { qty }),
    onSuccess: () => qc.invalidateQueries(['medicines']),
  });
  const deleteMut = useMutation({
    mutationFn: id => api.delete(`/medicines/${id}`),
    onSuccess: () => qc.invalidateQueries(['medicines']),
  });

  const f = k => e => setForm({ ...form, [k]: e.target.value });

  const lvl = m => Math.min(100, Math.round(m.stock_qty / Math.max(m.reorder_level*2,1) * 100));
  const lvlColor = pct => pct <= 20 ? '#A32D2D' : pct <= 50 ? '#EF9F27' : '#1D9E75';

  return (
    <div>
      <div className="page-header">
        <input className="field" style={{ marginBottom:0, width:220 }}
          placeholder="🔍 Search medicine…" value={search} onChange={e=>setSearch(e.target.value)} />
        <button className="btn btn-primary" style={{ marginLeft:'auto' }} onClick={()=>{ setModal(true); setApiErr(''); }}>
          + Add Medicine
        </button>
      </div>

      <div className="card">
        <table>
          <thead><tr>
            <th>Code</th><th>Medicine Name</th><th>Category</th><th>Stock</th><th>Reorder At</th>
            <th>Unit Price</th><th>Expiry</th><th>Level</th><th>Actions</th>
          </tr></thead>
          <tbody>
            {isLoading ? <tr className="loading-row"><td colSpan={9}>Loading…</td></tr>
            : meds.map(m=>{
              const pct = lvl(m);
              return (
                <tr key={m.med_id}>
                  <td style={{ fontFamily:'monospace',fontSize:11,color:'#aaa' }}>{m.med_code}</td>
                  <td>
                    <div style={{ fontWeight:600 }}>{m.med_name}</div>
                    {m.generic_name && <div style={{ fontSize:11,color:'#aaa' }}>{m.generic_name}</div>}
                  </td>
                  <td><span className="badge badge-gray">{m.category}</span></td>
                  <td>
                    <span style={{ fontWeight:700, color: m.stock_qty<=m.reorder_level?'#A32D2D':'inherit' }}>
                      {m.stock_qty}
                    </span>
                  </td>
                  <td style={{ color:'#aaa', fontSize:12 }}>{m.reorder_level}</td>
                  <td>₹{m.unit_price}</td>
                  <td style={{ fontFamily:'monospace', fontSize:11 }}>{m.expiry_date?.split('T')[0] || '—'}</td>
                  <td>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div className="prog"><div className="prog-fill" style={{ width:`${pct}%`, background:lvlColor(pct) }} /></div>
                      <span style={{ fontSize:11, fontWeight:600, color:lvlColor(pct) }}>{pct}%</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display:'flex', gap:4 }}>
                      <button className="btn btn-sm" style={{ color:'#3B6D11',borderColor:'#b2d68b' }}
                        onClick={()=>{ const q=window.prompt('Restock qty:','100'); if(q&&Number(q)>0) restockMut.mutate({id:m.med_id,qty:Number(q)}); }}>
                        +Stock
                      </button>
                      <button className="btn btn-sm btn-danger"
                        onClick={()=>{ if(window.confirm('Remove medicine?')) deleteMut.mutate(m.med_id); }}>Del</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="overlay">
          <div className="modal" style={{ width:500 }}>
            <div className="modal-head">
              <strong style={{ flex:1 }}>💊 Add Medicine</strong>
              <button className="btn btn-sm" onClick={()=>setModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              {apiErr && <div className="alert-err">{apiErr}</div>}
              <div className="field-row">
                <div className="field"><label>Medicine Code * (unique)</label><input value={form.med_code} onChange={f('med_code')} placeholder="MD011" required /></div>
                <div className="field"><label>Medicine Name * (unique)</label><input value={form.med_name} onChange={f('med_name')} placeholder="Metformin 500mg Tab" required /></div>
              </div>
              <div className="field-row">
                <div className="field"><label>Generic Name</label><input value={form.generic_name} onChange={f('generic_name')} /></div>
                <div className="field"><label>Category *</label>
                  <select value={form.category} onChange={f('category')} required>
                    <option value="">-- Select --</option>
                    {['Antibiotic','Analgesic','Cardiac','Antidiabetic','Antacid','Antihypertensive','Bronchodilator','Antiplatelet','Other'].map(c=><option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="field-row">
                <div className="field"><label>Manufacturer</label><input value={form.manufacturer} onChange={f('manufacturer')} /></div>
                <div className="field"><label>Unit Price (₹) *</label><input type="number" step="0.01" value={form.unit_price} onChange={f('unit_price')} required /></div>
              </div>
              <div className="field-row">
                <div className="field"><label>Initial Stock *</label><input type="number" value={form.stock_qty} onChange={f('stock_qty')} required /></div>
                <div className="field"><label>Reorder Level</label><input type="number" value={form.reorder_level} onChange={f('reorder_level')} /></div>
              </div>
              <div className="field"><label>Expiry Date</label><input type="date" value={form.expiry_date} onChange={f('expiry_date')} /></div>
              <div className="alert-warn" style={{ marginBottom:0 }}>⚠️ Duplicate medicine code or name is rejected automatically</div>
            </div>
            <div className="modal-foot">
              <button className="btn" onClick={()=>setModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={()=>createMut.mutate(form)} disabled={createMut.isPending}>Add Medicine</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════ LabReports.js ═══
export function LabReports() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [apiErr, setApiErr] = useState('');
  const [filter, setFilter] = useState('all');
  const [form, setForm] = useState({ patient_id:'', doctor_id:'', test_id:'', result_value:'', result_status:'pending', remarks:'', reported_by:'' });

  const { data: reports=[], isLoading } = useQuery({
    queryKey: ['lab-reports'], queryFn: () => api.get('/lab-reports').then(r=>r.data.data),
  });
  const { data: patients=[] } = useQuery({ queryKey:['pat-list'], queryFn: () => api.get('/patients?limit=200').then(r=>r.data.data.rows) });
  const { data: doctors=[]  } = useQuery({ queryKey:['doctors'],  queryFn: () => api.get('/doctors').then(r=>r.data.data) });
  const { data: tests=[]    } = useQuery({ queryKey:['lab-tests'], queryFn: () => api.get('/lab-tests').then(r=>r.data.data) });

  const createMut = useMutation({
    mutationFn: b => api.post('/lab-reports', b),
    onSuccess: () => { qc.invalidateQueries(['lab-reports']); setModal(false); setApiErr(''); },
    onError: e => setApiErr(e.response?.data?.message || 'Failed'),
  });

  const f = k => e => setForm({ ...form, [k]: e.target.value });

  const labBadge = s =>
    s==='critical'?'badge badge-red':s==='abnormal'?'badge badge-amber':s==='normal'?'badge badge-green':'badge badge-gray';

  const rows = reports.filter(r => filter==='all' ? true : r.result_status===filter);

  return (
    <div>
      <div className="page-header">
        <div className="filter-tabs">
          {['all','pending','normal','abnormal','critical'].map(f2=>(
            <button key={f2} className={`ftab${filter===f2?' active':''}`} onClick={()=>setFilter(f2)}>
              {f2.charAt(0).toUpperCase()+f2.slice(1)}
            </button>
          ))}
        </div>
        <button className="btn btn-primary" style={{ marginLeft:'auto' }} onClick={()=>{ setModal(true); setApiErr(''); }}>
          + New Report
        </button>
      </div>

      <div className="card">
        <table>
          <thead><tr>
            <th>Report ID</th><th>Patient</th><th>Test</th><th>Doctor</th><th>Date</th><th>Result</th><th>Status</th>
          </tr></thead>
          <tbody>
            {isLoading ? <tr className="loading-row"><td colSpan={7}>Loading…</td></tr>
            : rows.map(r=>(
              <tr key={r.report_id}>
                <td style={{ fontFamily:'monospace',fontSize:11,color:'#aaa' }}>LR-{String(r.report_id).padStart(3,'0')}</td>
                <td style={{ fontWeight:600 }}>{r.patient_name}</td>
                <td>{r.test_name}</td>
                <td>{r.doctor_name}</td>
                <td style={{ fontFamily:'monospace',fontSize:11 }}>
                  {new Date(r.sample_date).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}
                </td>
                <td style={{ maxWidth:160,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontSize:12 }}>
                  {r.result_value || 'Pending'}
                </td>
                <td><span className={labBadge(r.result_status)}>{r.result_status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="overlay">
          <div className="modal" style={{ width:480 }}>
            <div className="modal-head">
              <strong style={{ flex:1 }}>🔬 New Lab Report</strong>
              <button className="btn btn-sm" onClick={()=>setModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              {apiErr && <div className="alert-err">{apiErr}</div>}
              <div className="field"><label>Patient *</label>
                <select value={form.patient_id} onChange={f('patient_id')} required>
                  <option value="">-- Select patient --</option>
                  {patients.map(p=><option key={p.patient_id} value={p.patient_id}>{p.full_name} · {p.phone}</option>)}
                </select>
              </div>
              <div className="field"><label>Ordering Doctor *</label>
                <select value={form.doctor_id} onChange={f('doctor_id')} required>
                  <option value="">-- Select doctor --</option>
                  {doctors.map(d=><option key={d.doctor_id} value={d.doctor_id}>{d.full_name}</option>)}
                </select>
              </div>
              <div className="field"><label>Test *</label>
                <select value={form.test_id} onChange={f('test_id')} required>
                  <option value="">-- Select test --</option>
                  {tests.map(t=><option key={t.test_id} value={t.test_id}>{t.test_name} (₹{t.unit_price})</option>)}
                </select>
              </div>
              <div className="field-row">
                <div className="field"><label>Result Value</label><input value={form.result_value} onChange={f('result_value')} placeholder="e.g. HbA1c: 7.2%" /></div>
                <div className="field"><label>Result Status</label>
                  <select value={form.result_status} onChange={f('result_status')}>
                    {['pending','normal','abnormal','critical'].map(s=><option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="field"><label>Remarks</label>
                <textarea style={{ height:60,resize:'vertical' }} value={form.remarks} onChange={f('remarks')} />
              </div>
              <div className="field"><label>Reported By</label>
                <input value={form.reported_by} onChange={f('reported_by')} placeholder="Lab technician name" />
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn" onClick={()=>setModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={()=>createMut.mutate(form)} disabled={createMut.isPending}>Save Report</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Billing;
