const db     = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');

const ok  = (res, data, msg = 'Success', code = 200) =>
  res.status(code).json({ success: true, message: msg, data });
const err = (res, msg, code = 400) =>
  res.status(code).json({ success: false, message: msg });

// ════════════════════════════════════════════════════
// AUTH
// ════════════════════════════════════════════════════
exports.login = async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return err(res, 'Username & password required');
  try {
    const result = await db.query('SELECT * FROM users WHERE username=$1 AND is_active=true', [username]);
    const user = result.rows[0];
    if (!user) return err(res, 'Invalid credentials', 401);
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return err(res, 'Invalid credentials', 401);
    await db.query('UPDATE users SET last_login=NOW() WHERE user_id=$1', [user.user_id]);
    const token = jwt.sign(
      { user_id: user.user_id, role: user.role, name: user.full_name },
      process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );
    const { password_hash, ...safe } = user;
    ok(res, { user: safe, token });
  } catch (e) { console.error(e); err(res, 'Server error', 500); }
};

exports.me = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT user_id,username,full_name,role,email,last_login FROM users WHERE user_id=$1',
      [req.user.user_id]
    );
    ok(res, result.rows[0]);
  } catch (e) { err(res, 'Server error', 500); }
};

// ════════════════════════════════════════════════════
// DASHBOARD
// ════════════════════════════════════════════════════
exports.dashboardSummary = async (req, res) => {
  try {
    const pts    = await db.query('SELECT COUNT(*)::int n FROM patients');
    const adm    = await db.query("SELECT COUNT(*)::int n FROM admissions WHERE status='admitted'");
    const docs   = await db.query("SELECT COUNT(*)::int n FROM doctors WHERE status='on-duty'");
    const appts  = await db.query('SELECT COUNT(*)::int n FROM appointments WHERE DATE(appt_datetime)=CURRENT_DATE');
    const bavail = await db.query("SELECT COUNT(*)::int n FROM beds WHERE status='available'");
    const bocc   = await db.query("SELECT COUNT(*)::int n FROM beds WHERE status='occupied'");
    const pend   = await db.query("SELECT COUNT(*)::int n FROM bills WHERE payment_status='pending'");
    
    ok(res, {
      totalPatients: pts.rows[0]?.n || 0, 
      admitted: adm.rows[0]?.n || 0, 
      doctorsOnDuty: docs.rows[0]?.n || 0,
      appointmentsToday: appts.rows[0]?.n || 0, 
      bedsAvailable: bavail.rows[0]?.n || 0, 
      bedsOccupied: bocc.rows[0]?.n || 0,
      pendingBills: pend.rows[0]?.n || 0,
    });
  } catch (e) { console.error(e); err(res, 'Server error', 500); }
};

// ════════════════════════════════════════════════════
// PATIENTS
// ════════════════════════════════════════════════════
exports.getPatients = async (req, res) => {
  try {
    const { search = '', page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const like = `%${search}%`;
    const rows = await db.query(
      `SELECT p.* FROM patients p
       WHERE p.full_name ILIKE $1 OR p.patient_code ILIKE $2 OR p.phone ILIKE $3
       ORDER BY p.created_at DESC LIMIT $4 OFFSET $5`,
      [like, like, like, Number(limit), Number(offset)]
    );
    const total = await db.query(
      'SELECT COUNT(*)::int total FROM patients WHERE full_name ILIKE $1 OR patient_code ILIKE $2 OR phone ILIKE $3',
      [like, like, like]
    );
    ok(res, { rows: rows.rows, total: total.rows[0]?.total || 0, page: Number(page) });
  } catch (e) { console.error(e); err(res, 'Server error', 500); }
};

exports.getPatient = async (req, res) => {
  try {
    const p = await db.query('SELECT * FROM patients WHERE patient_id=$1', [req.params.id]);
    if (!p.rows[0]) return err(res, 'Not found', 404);
    ok(res, p.rows[0]);
  } catch (e) { console.error(e); err(res, 'Server error', 500); }
};

exports.createPatient = async (req, res) => {
  const { full_name, dob, gender, blood_group, phone, email, address } = req.body;
  if (!full_name || !dob || !gender || !blood_group || !phone)
    return err(res, 'full_name, dob, gender, blood_group, phone are required');
  if (!/^[0-9]{10}$/.test(phone)) return err(res, 'Phone must be 10 digits');
  try {
    const byPhone = await db.query('SELECT patient_id FROM patients WHERE phone=$1', [phone]);
    if (byPhone.rows[0]) return err(res, `Phone ${phone} already registered`, 409);
    
    const r = await db.query(
      `INSERT INTO patients(full_name,dob,gender,blood_group,phone,email,address)
       VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING patient_id`,
      [full_name, dob, gender, blood_group, phone, email || null, address || null]
    );
    const created = await db.query('SELECT * FROM patients WHERE patient_id=$1', [r.rows[0].patient_id]);
    ok(res, created.rows[0], 'Patient registered', 201);
  } catch (e) {
    console.error(e); err(res, 'Server error', 500);
  }
};

exports.updatePatient = async (req, res) => {
  const { full_name, dob, gender, blood_group, phone, email, address } = req.body;
  try {
    await db.query(
      `UPDATE patients SET full_name=$1,dob=$2,gender=$3,blood_group=$4,phone=$5,email=$6,address=$7 
       WHERE patient_id=$8`,
      [full_name, dob, gender, blood_group, phone, email, address, req.params.id]
    );
    ok(res, null, 'Patient updated');
  } catch (e) { console.error(e); err(res, 'Server error', 500); }
};

exports.deletePatient = async (req, res) => {
  try {
    await db.query('DELETE FROM patients WHERE patient_id=$1', [req.params.id]);
    ok(res, null, 'Patient deleted');
  } catch (e) { err(res, 'Server error', 500); }
};

exports.patientStats = async (req, res) => {
  try {
    const total    = await db.query('SELECT COUNT(*)::int n FROM patients');
    const admitted = await db.query("SELECT COUNT(*)::int n FROM admissions WHERE status='admitted'");
    ok(res, { total: total.rows[0]?.n || 0, admitted: admitted.rows[0]?.n || 0 });
  } catch (e) { err(res, 'Server error', 500); }
};

// ════════════════════════════════════════════════════
// APPOINTMENTS
// ════════════════════════════════════════════════════
exports.getAppointments = async (req, res) => {
  try {
    const rows = await db.query(
      `SELECT a.* FROM appointments a ORDER BY a.appt_datetime DESC LIMIT 50`
    );
    ok(res, rows.rows);
  } catch (e) { console.error(e); err(res, 'Server error', 500); }
};

exports.createAppointment = async (req, res) => {
  const { patient_id, doctor_id, appt_datetime, appt_type, notes } = req.body;
  if (!patient_id || !doctor_id || !appt_datetime || !appt_type)
    return err(res, 'patient_id, doctor_id, appt_datetime, appt_type required');
  try {
    const r = await db.query(
      `INSERT INTO appointments(patient_id,doctor_id,appt_datetime,appt_type,notes,status)
       VALUES($1,$2,$3,$4,$5,'scheduled') RETURNING appt_id`,
      [patient_id, doctor_id, appt_datetime, appt_type, notes || null]
    );
    ok(res, { appt_id: r.rows[0].appt_id }, 'Appointment booked', 201);
  } catch (e) {
    console.error(e); err(res, 'Server error', 500);
  }
};

exports.updateApptStatus = async (req, res) => {
  const { status } = req.body;
  const allowed = ['scheduled','confirmed','completed','cancelled'];
  if (!allowed.includes(status)) return err(res, 'Invalid status');
  try {
    await db.query('UPDATE appointments SET status=$1 WHERE appt_id=$2', [status, req.params.id]);
    ok(res, null, `Appointment ${status}`);
  } catch (e) { err(res, 'Server error', 500); }
};

// ════════════════════════════════════════════════════
// DOCTORS
// ════════════════════════════════════════════════════
exports.getDoctors = async (req, res) => {
  try {
    const rows = await db.query('SELECT * FROM doctors ORDER BY full_name');
    ok(res, rows.rows);
  } catch (e) { err(res, 'Server error', 500); }
};

exports.createDoctor = async (req, res) => {
  const { emp_code, full_name, specialization, dept_id, phone, email } = req.body;
  try {
    const r = await db.query(
      `INSERT INTO doctors(emp_code,full_name,specialization,dept_id,phone,email)
       VALUES($1,$2,$3,$4,$5,$6) RETURNING doctor_id`,
      [emp_code, full_name, specialization, dept_id, phone || null, email || null]
    );
    ok(res, { doctor_id: r.rows[0].doctor_id }, 'Doctor added', 201);
  } catch (e) {
    console.error(e); err(res, 'Server error', 500);
  }
};

exports.updateDoctorStatus = async (req, res) => {
  const { status } = req.body;
  if (!['on-duty','off-duty','leave'].includes(status)) return err(res, 'Invalid status');
  try {
    await db.query('UPDATE doctors SET status=$1 WHERE doctor_id=$2', [status, req.params.id]);
    ok(res, null, 'Status updated');
  } catch (e) { err(res, 'Server error', 500); }
};

// ════════════════════════════════════════════════════
// ADMISSIONS
// ════════════════════════════════════════════════════
exports.getAdmitted = async (req, res) => {
  try {
    const rows = await db.query(`SELECT * FROM admissions WHERE status='admitted' LIMIT 50`);
    ok(res, rows.rows);
  } catch (e) { err(res, 'Server error', 500); }
};

exports.admitPatient = async (req, res) => {
  const { patient_id, doctor_id, bed_id, diagnosis } = req.body;
  if (!patient_id || !doctor_id || !bed_id || !diagnosis)
    return err(res, 'patient_id, doctor_id, bed_id, diagnosis required');
  try {
    const r = await db.query(
      'INSERT INTO admissions(patient_id,doctor_id,bed_id,diagnosis) VALUES($1,$2,$3,$4) RETURNING admission_id',
      [patient_id, doctor_id, bed_id, diagnosis]
    );
    ok(res, { admission_id: r.rows[0].admission_id }, 'Patient admitted', 201);
  } catch (e) { console.error(e); err(res, 'Server error', 500); }
};

exports.dischargePatient = async (req, res) => {
  try {
    await db.query(
      "UPDATE admissions SET status='discharged', discharge_date=NOW() WHERE admission_id=$1", [req.params.id]
    );
    ok(res, null, 'Patient discharged');
  } catch (e) { err(res, 'Server error', 500); }
};

// ════════════════════════════════════════════════════
// BEDS
// ════════════════════════════════════════════════════
exports.getBeds = async (req, res) => {
  try {
    const rows = await db.query('SELECT * FROM beds ORDER BY bed_number');
    ok(res, rows.rows);
  } catch (e) { err(res, 'Server error', 500); }
};

// ════════════════════════════════════════════════════
// MEDICINES
// ════════════════════════════════════════════════════
exports.getMedicines = async (req, res) => {
  try {
    const rows = await db.query('SELECT * FROM medicines ORDER BY med_name');
    ok(res, rows.rows);
  } catch (e) { err(res, 'Server error', 500); }
};

exports.createMedicine = async (req, res) => {
  const { med_code, med_name, category, unit_price, stock_qty } = req.body;
  try {
    const r = await db.query(
      `INSERT INTO medicines(med_code,med_name,category,unit_price,stock_qty)
       VALUES($1,$2,$3,$4,$5) RETURNING med_id`,
      [med_code, med_name, category, unit_price, stock_qty]
    );
    ok(res, { med_id: r.rows[0].med_id }, 'Medicine added', 201);
  } catch (e) { console.error(e); err(res, 'Server error', 500); }
};

// ════════════════════════════════════════════════════
// BILLING
// ════════════════════════════════════════════════════
exports.getBills = async (req, res) => {
  try {
    const rows = await db.query('SELECT * FROM bills ORDER BY bill_date DESC LIMIT 50');
    ok(res, rows.rows);
  } catch (e) { err(res, 'Server error', 500); }
};

exports.createBill = async (req, res) => {
  const { patient_id, total_amount, discount } = req.body;
  try {
    const r = await db.query(
      `INSERT INTO bills(patient_id,total_amount,discount,net_payable)
       VALUES($1,$2,$3,$4) RETURNING bill_id`,
      [patient_id, total_amount, discount || 0, (total_amount - (discount || 0))]
    );
    ok(res, { bill_id: r.rows[0].bill_id }, 'Bill created', 201);
  } catch (e) { console.error(e); err(res, 'Server error', 500); }
};

exports.updatePayment = async (req, res) => {
  const { payment_status } = req.body;
  try {
    await db.query('UPDATE bills SET payment_status=$1 WHERE bill_id=$2', [payment_status, req.params.id]);
    ok(res, null, 'Payment updated');
  } catch (e) { err(res, 'Server error', 500); }
};

module.exports = exports;
