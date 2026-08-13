import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import api from '../utils/api';

const PIE_COLORS = ['#0F6E56','#185FA5','#854F0B','#A32D2D','#1D9E75','#3B6D11'];

function StatCard({ icon, label, value, sub, color }) {
  return (
    <div className="stat-card">
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
        <div>
          <div style={{ fontSize:11, fontWeight:600, color:'#999', marginBottom:6 }}>{label}</div>
          <div style={{ fontSize:26, fontWeight:700, color: color || '#222' }}>{value}</div>
          {sub && <div style={{ fontSize:11, color:'#bbb', marginTop:3 }}>{sub}</div>}
        </div>
        <span style={{ fontSize:22 }}>{icon}</span>
      </div>
    </div>
  );
}

function ActivityRow({ type, detail, ts }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, padding:'7px 0', borderBottom:'1px solid #F0EEE8', fontSize:12 }}>
      <span style={{ fontSize:15 }}>{type === 'admission' ? '🏥' : '🧾'}</span>
      <span style={{ flex:1, color:'#333' }}>
        {type === 'admission' ? `${detail} admitted` : `Invoice: ${detail}`}
      </span>
      <span style={{ fontSize:10, color:'#bbb', fontFamily:'monospace', whiteSpace:'nowrap' }}>
        {ts ? new Date(ts).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' }) : ''}
      </span>
    </div>
  );
}

export default function Dashboard() {
  const { data: d, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/dashboard/summary').then(r => r.data.data),
    refetchInterval: 60_000,
  });

  if (isLoading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:300, color:'#bbb', fontSize:14 }}>
      Loading dashboard…
    </div>
  );
  if (!d) return null;

  const weekData = d.weeklyAdmits?.map(r => ({
    day: new Date(r.day).toLocaleDateString('en-IN', { weekday:'short' }),
    admissions: r.count,
  })) || [];

  return (
    <div>
      {/* Stat grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:16 }}>
        <StatCard icon="👥" label="Total Patients"       value={d.totalPatients}      color="#0F6E56" sub="registered" />
        <StatCard icon="🛏️"  label="Currently Admitted"  value={d.admitted}           color="#185FA5" sub={`+${d.admittedToday||0} today`} />
        <StatCard icon="🩺" label="Doctors on Duty"      value={d.doctorsOnDuty}      color="#854F0B" sub="active" />
        <StatCard icon="📅" label="Appointments Today"   value={d.appointmentsToday}  color="#3B6D11" sub="scheduled" />
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:18 }}>
        <StatCard icon="✅" label="Beds Available"  value={d.bedsAvailable}  color="#1D9E75" />
        <StatCard icon="🔴" label="Beds Occupied"   value={d.bedsOccupied}   color="#A32D2D" />
        <StatCard icon="💰" label="Today's Revenue" value={`₹${Number(d.todayRevenue||0).toLocaleString('en-IN')}`} color="#0F6E56" />
        <StatCard icon="⏳" label="Pending Bills"   value={d.pendingBills}   color="#854F0B" />
      </div>

      {/* Charts row */}
      <div style={{ display:'grid', gridTemplateColumns:'1.5fr 1fr', gap:14, marginBottom:14 }}>
        {/* Weekly bar */}
        <div className="card" style={{ padding:'16px 20px' }}>
          <div style={{ fontWeight:700, fontSize:13, marginBottom:14 }}>📈 Weekly Admissions</div>
          {weekData.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={weekData} barSize={22}>
                <XAxis dataKey="day" tick={{ fontSize:11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize:11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius:8, border:'1px solid #E8E6E0', fontSize:12 }}
                  formatter={v => [v, 'Admissions']}
                />
                <Bar dataKey="admissions" fill="#0F6E56" radius={[5,5,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height:160, display:'flex', alignItems:'center', justifyContent:'center', color:'#bbb', fontSize:12 }}>
              No data for past 7 days
            </div>
          )}
        </div>

        {/* Dept distribution pie */}
        <div className="card" style={{ padding:'16px 20px' }}>
          <div style={{ fontWeight:700, fontSize:13, marginBottom:10 }}>🏥 Admissions by Dept</div>
          {d.deptDist?.some(r => r.val > 0) ? (
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={d.deptDist} dataKey="val" nameKey="dept_name" cx="50%" cy="50%" outerRadius={60} label={false}>
                  {d.deptDist.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius:8, fontSize:12 }} formatter={(v,n) => [v, n]} />
                <Legend iconSize={8} wrapperStyle={{ fontSize:10 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height:160, display:'flex', alignItems:'center', justifyContent:'center', color:'#bbb', fontSize:12 }}>
              No admissions data
            </div>
          )}
        </div>
      </div>

      {/* Activity + Low stock */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
        <div className="card" style={{ padding:'16px 20px' }}>
          <div style={{ fontWeight:700, fontSize:13, marginBottom:10 }}>🕐 Recent Activity</div>
          {d.recentActivity?.length ? d.recentActivity.map((a, i) => (
            <ActivityRow key={i} type={a.type} detail={a.detail} ts={a.ts} />
          )) : <div style={{ color:'#bbb', fontSize:12 }}>No recent activity</div>}
        </div>

        <div className="card" style={{ padding:'16px 20px' }}>
          <div style={{ fontWeight:700, fontSize:13, marginBottom:10 }}>⚠️ Low Stock Alerts</div>
          {d.lowStockAlerts?.length ? d.lowStockAlerts.map(m => (
            <div key={m.med_code} style={{
              display:'flex', alignItems:'center', gap:10,
              padding:'7px 0', borderBottom:'1px solid #F0EEE8', fontSize:12,
            }}>
              <span style={{ flex:1 }}>💊 {m.med_name}</span>
              <span style={{ fontWeight:700, color:'#A32D2D' }}>{m.stock_qty} left</span>
              <div className="prog">
                <div className="prog-fill" style={{
                  width: `${Math.min(100, Math.round(m.stock_qty/m.reorder_level*100))}%`,
                  background: m.stock_qty < 10 ? '#A32D2D' : '#EF9F27',
                }} />
              </div>
            </div>
          )) : (
            <div style={{ color:'#3B6D11', fontSize:12, padding:'8px 0' }}>✅ All medicines adequately stocked</div>
          )}
        </div>
      </div>
    </div>
  );
}
