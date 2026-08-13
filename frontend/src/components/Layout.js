import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../App';

const NAV = [
  { group: 'Overview',    items: [{ to:'/',             icon:'📊', label:'Dashboard'    }] },
  { group: 'Clinical',    items: [
    { to:'/patients',     icon:'👥', label:'Patients'     },
    { to:'/appointments', icon:'📅', label:'Appointments' },
    { to:'/doctors',      icon:'🩺', label:'Doctors'      },
    { to:'/beds',         icon:'🛏️',  label:'Wards & Beds' },
  ]},
  { group: 'Operations',  items: [
    { to:'/billing',      icon:'🧾', label:'Billing'      },
    { to:'/pharmacy',     icon:'💊', label:'Pharmacy'     },
    { to:'/lab',          icon:'🔬', label:'Lab Reports'  },
  ]},
];

const PAGE_TITLES = {
  '/':'/Dashboard', '/patients':'Patients', '/appointments':'Appointments',
  '/doctors':'Doctors', '/beds':'Wards & Beds', '/billing':'Billing',
  '/pharmacy':'Pharmacy', '/lab':'Lab Reports',
};

export default function Layout({ children }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [title, setTitle] = useState('Dashboard');

  useEffect(() => {
    setTitle(PAGE_TITLES[location.pathname] || 'HMS');
  }, [location.pathname]);

  const logout = () => { signOut(); navigate('/login'); };
  const now = new Date().toLocaleDateString('en-IN', { weekday:'short', day:'2-digit', month:'short', year:'numeric' });

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden' }}>
      {/* ── SIDEBAR ── */}
      <aside style={{
        width: 210, flexShrink: 0,
        background: '#fff',
        borderRight: '1px solid #E8E6E0',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Logo */}
        <div style={{ padding:'16px 16px 12px', borderBottom:'1px solid #E8E6E0' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:34, height:34, background:'#0F6E56', borderRadius:9, display:'flex', alignItems:'center', justifyContent:'center', fontSize:17 }}>🏥</div>
            <div>
              <div style={{ fontWeight:700, fontSize:13.5, color:'#0F6E56', letterSpacing:'-.2px' }}>MedCore HMS</div>
              <div style={{ fontSize:10, color:'#aaa' }}>Hospital Management</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex:1, overflowY:'auto', padding:'6px 0' }}>
          {NAV.map(group => (
            <div key={group.group} style={{ marginBottom:4 }}>
              <div style={{ fontSize:10, fontWeight:700, letterSpacing:'.7px', color:'#bbb', padding:'8px 16px 3px', textTransform:'uppercase' }}>
                {group.group}
              </div>
              {group.items.map(item => (
                <NavLink key={item.to} to={item.to} end={item.to === '/'}
                  style={({ isActive }) => ({
                    display: 'flex', alignItems: 'center', gap: 9,
                    padding: '7px 16px',
                    fontSize: 13, fontWeight: isActive ? 600 : 400,
                    color: isActive ? '#0F6E56' : '#555',
                    textDecoration: 'none',
                    background: isActive ? '#E1F5EE' : 'transparent',
                    borderLeft: `2px solid ${isActive ? '#0F6E56' : 'transparent'}`,
                    transition: '.12s',
                  })}>
                  <span style={{ fontSize:15, lineHeight:1 }}>{item.icon}</span>
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* User footer */}
        <div style={{ padding:'10px 14px', borderTop:'1px solid #E8E6E0', display:'flex', alignItems:'center', gap:8 }}>
          <div style={{
            width:28, height:28, borderRadius:'50%',
            background:'#9FE1CB', display:'flex', alignItems:'center',
            justifyContent:'center', fontSize:11, fontWeight:700, color:'#085041',
          }}>
            {(user?.full_name || 'A').charAt(0).toUpperCase()}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:12, fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
              {user?.full_name || 'Admin'}
            </div>
            <div style={{ fontSize:10, color:'#aaa' }}>{user?.role || 'admin'}</div>
          </div>
          <button onClick={logout} title="Logout"
            style={{ background:'none', border:'none', fontSize:15, color:'#bbb', cursor:'pointer', padding:'2px 4px', borderRadius:4 }}>
            ⏻
          </button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', background:'#F4F3EF' }}>
        {/* Topbar */}
        <header style={{
          display:'flex', alignItems:'center',
          padding:'10px 22px', background:'#fff',
          borderBottom:'1px solid #E8E6E0', gap:14,
        }}>
          <span style={{ fontWeight:700, fontSize:15 }}>{title}</span>
          <div style={{ marginLeft:'auto', fontSize:11, color:'#bbb', fontWeight:500 }}>{now}</div>
        </header>

        {/* Content */}
        <main style={{ flex:1, overflowY:'auto', padding:'20px 22px' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
