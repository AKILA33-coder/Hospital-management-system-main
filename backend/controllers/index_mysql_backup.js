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
    const [[user]] = await db.query('SELECT * FROM users WHERE username=? AND is_active=1', [username]);
    if (!user) return err(res, 'Invalid credentials', 401);
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return err(res, 'Invalid credentials', 401);
    await db.query('UPDATE users SET last_login=NOW() WHERE user_id=?', [user.user_id]);
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
    const [[user]] = await db.query(
      'SELECT user_id,username,full_name,role,email,last_login FROM users WHERE user_id=?',
      [req.user.user_id]
    );
    ok(res, user);
  } catch (e) { err(res, 'Server error', 500); }
};

// ════════════════════════════════════════════════════
// DASHBOARD
// ════════════════════════════════════════════════════
exports.dashboardSummary = async (req, res) => {
  try {
    const [[pts]]    = await db.query('SELECT COUNT(*) n FROM patients');
    const [[adm]]    = await db.query("SELECT COUNT(*) n FROM admissions WHERE status='admitted'");
    const [[docs]]   = await db.query("SELECT COUNT(*) n FROM doctors WHERE status='on-duty'");
    const [[appts]]  = await db.query('SELECT COUNT(*) n FROM vw_today_appointments');
    const [[bavail]] = await db.query("SELECT COUNT(*) n FROM beds WHERE status='available'");
    const [[bocc]]   = await db.query("SELECT COUNT(*) n FROM beds WHERE status='occupied'");
    const [[rev]]    = await db.query(
      "SELECT IFNULL(SUM(net_payable),0) n FROM bills WHERE DATE(bill_date)=CURDATE() AND payment_status='paid'"
    );
    const [[pend]]   = await db.query("SELECT COUNT(*) n FROM bills WHERE payment_status='pending'");
    const [lowStk]   = await db.query('SELECT * FROM vw_low_stock ORDER BY stock_qty LIMIT 5');
    const [recent]   = await db.query(
      `(SELECT 'admission' type, p.full_name detail, a.admission_date ts
        FROM admissions a JOIN patients p ON p.patient_id=a.patient_id
        ORDER BY a.admission_date DESC LIMIT 4)
       UNION ALL
       (SELECT 'bill', CONCAT('₹',FORMAT(net_payable,0)), bill_date FROM bills ORDER BY bill_date DESC LIMIT 4)
       ORDER BY ts DESC LIMIT 6`
    );
    const [weekly]   = await db.query(
      `SELECT DATE(admission_date) day, COUNT(*) count FROM admissions
       WHERE admission_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
       GROUP BY DATE(admission_date) ORDER BY day`
    );
    const [deptDist] = await db.query(
      `SELECT dep.dept_name, COUNT(a.admission_id) val
       FROM departments dep
       LEFT JOIN doctors d ON d.dept_id=dep.dept_id
       LEFT JOIN admissions a ON a.doctor_id=d.doctor_id AND a.status='admitted'
       GROUP BY dep.dept_id, dep.dept_name ORDER BY val DESC LIMIT 6`
    );
    ok(res, {
      totalPatients: pts.n, admitted: adm.n, doctorsOnDuty: docs.n,
      appointmentsToday: appts.n, bedsAvailable: bavail.n, bedsOccupied: bocc.n,
      todayRevenue: rev.n, pendingBills: pend.n,
      lowStockAlerts: lowStk, recentActivity: recent, weeklyAdmits: weekly, deptDist
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
    const [rows] = await db.query(
      `SELECT p.*,
              a.diagnosis, a.status admission_status, a.admission_date,
              d.full_name doctor_name,
              w.ward_name, b.bed_number
       FROM patients p
       LEFT JOIN admissions a ON a.patient_id=p.patient_id AND a.status='admitted'
       LEFT JOIN doctors d   ON d.doctor_id=a.doctor_id
       LEFT JOIN beds b      ON b.bed_id=a.bed_id
       LEFT JOIN wards w     ON w.ward_id=b.ward_id
       WHERE p.full_name LIKE ? OR p.patient_code LIKE ? OR p.phone LIKE ?
       ORDER BY p.created_at DESC LIMIT ? OFFSET ?`,
      [like, like, like, Number(limit), Number(offset)]
    );
    const [[{ total }]] = await db.query(
      'SELECT COUNT(*) total FROM patients WHERE full_name LIKE ? OR patient_code LIKE ? OR phone LIKE ?',
      [like, like, like]
    );
    ok(res, { rows, total, page: Number(page) });
  } catch (e) { console.error(e); err(res, 'Server error', 500); }
};

exports.getPatient = async (req, res) => {
  try {
    const [[p]] = await db.query(
      `SELECT p.*, a.admission_id, a.diagnosis, a.status admission_status,
              a.admission_date, a.notes admission_notes,
              d.full_name doctor_name, d.specialization, w.ward_name, b.bed_number
       FROM patients p
       LEFT JOIN admissions a ON a.patient_id=p.patient_id AND a.status='admitted'
       LEFT JOIN doctors d ON d.doctor_id=a.doctor_id
       LEFT JOIN beds b    ON b.bed_id=a.bed_id
       LEFT JOIN wards w   ON w.ward_id=b.ward_id
       WHERE p.patient_id=?`, [req.params.id]
    );
    if (!p) return err(res, 'Not found', 404);
    const [labs]  = await db.query(
      `SELECT lr.*, lt.test_name FROM lab_reports lr
       JOIN lab_tests lt ON lt.test_id=lr.test_id WHERE lr.patient_id=? ORDER BY lr.sample_date DESC`,
      [req.params.id]
    );
    const [bills] = await db.query('SELECT * FROM bills WHERE patient_id=? ORDER BY bill_date DESC', [req.params.id]);
    const [appts] = await db.query(
      `SELECT a.*, d.full_name doctor_name FROM appointments a
       JOIN doctors d ON d.doctor_id=a.doctor_id WHERE a.patient_id=? ORDER BY a.appt_datetime DESC`,
      [req.params.id]
    );
    ok(res, { ...p, labs, bills, appointments: appts });
  } catch (e) { console.error(e); err(res, 'Server error', 500); }
};

exports.createPatient = async (req, res) => {
  const { full_name, dob, gender, blood_group, phone, email, address, emergency_name, emergency_phone } = req.body;
  if (!full_name || !dob || !gender || !blood_group || !phone)
    return err(res, 'full_name, dob, gender, blood_group, phone are required');
  if (!/^[0-9]{10}$/.test(phone)) return err(res, 'Phone must be 10 digits');
  try {
    // Duplicate phone check
    const [[byPhone]] = await db.query('SELECT patient_id, patient_code FROM patients WHERE phone=?', [phone]);
    if (byPhone) return err(res, `Phone ${phone} already registered as ${byPhone.patient_code}`, 409);
    // Duplicate email check
    if (email) {
      const [[byEmail]] = await db.query('SELECT patient_id FROM patients WHERE email=?', [email]);
      if (byEmail) return err(res, `Email ${email} already registered`, 409);
    }
    const [r] = await db.query(
      `INSERT INTO patients(full_name,dob,gender,blood_group,phone,email,address,emergency_name,emergency_phone)
       VALUES(?,?,?,?,?,?,?,?,?)`,
      [full_name, dob, gender, blood_group, phone, email || null, address || null, emergency_name || null, emergency_phone || null]
    );
    const [[created]] = await db.query('SELECT * FROM patients WHERE patient_id=?', [r.insertId]);
    ok(res, created, 'Patient registered', 201);
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return err(res, 'Duplicate phone or patient code', 409);
    console.error(e); err(res, 'Server error', 500);
  }
};

exports.updatePatient = async (req, res) => {
  const { full_name, dob, gender, blood_group, phone, email, address, emergency_name, emergency_phone } = req.body;
  try {
    if (phone) {
      const [[clash]] = await db.query(
        'SELECT patient_id FROM patients WHERE phone=? AND patient_id!=?', [phone, req.params.id]
      );
      if (clash) return err(res, `Phone ${phone} used by another patient`, 409);
    }
    await db.query(
      `UPDATE patients SET full_name=?,dob=?,gender=?,blood_group=?,phone=?,email=?,
       address=?,emergency_name=?,emergency_phone=? WHERE patient_id=?`,
      [full_name, dob, gender, blood_group, phone, email, address, emergency_name, emergency_phone, req.params.id]
    );
    ok(res, null, 'Patient updated');
  } catch (e) { console.error(e); err(res, 'Server error', 500); }
};

exports.deletePatient = async (req, res) => {
  try {
    const [[active]] = await db.query(
      "SELECT admission_id FROM admissions WHERE patient_id=? AND status='admitted'", [req.params.id]
    );
    if (active) return err(res, 'Cannot delete patient with active admission', 409);
    await db.query('DELETE FROM patients WHERE patient_id=?', [req.params.id]);
    ok(res, null, 'Patient deleted');
  } catch (e) { err(res, 'Server error', 500); }
};

exports.patientStats = async (req, res) => {
  try {
    const [[total]]    = await db.query('SELECT COUNT(*) n FROM patients');
    const [[admitted]] = await db.query("SELECT COUNT(*) n FROM admissions WHERE status='admitted'");
    const [[today]]    = await db.query("SELECT COUNT(*) n FROM admissions WHERE DATE(admission_date)=CURDATE()");
    ok(res, { total: total.n, admitted: admitted.n, admittedToday: today.n });
  } catch (e) { err(res, 'Server error', 500); }
};

// ════════════════════════════════════════════════════
// APPOINTMENTS
// ════════════════════════════════════════════════════
exports.getAppointments = async (req, res) => {
  try {
    const { date, status, doctor_id } = req.query;
    let where = '1=1'; const params = [];
    if (date)      { where += ' AND DATE(a.appt_datetime)=?'; params.push(date); }
    if (status)    { where += ' AND a.status=?';              params.push(status); }
    if (doctor_id) { where += ' AND a.doctor_id=?';           params.push(doctor_id); }
    const [rows] = await db.query(
      `SELECT a.*, p.full_name patient_name, p.phone patient_phone,
              d.full_name doctor_name, d.specialization, dep.dept_name
       FROM appointments a
       JOIN patients p    ON p.patient_id=a.patient_id
       JOIN doctors  d    ON d.doctor_id=a.doctor_id
       JOIN departments dep ON dep.dept_id=d.dept_id
       WHERE ${where} ORDER BY a.appt_datetime DESC`, params
    );
    ok(res, rows);
  } catch (e) { console.error(e); err(res, 'Server error', 500); }
};

exports.createAppointment = async (req, res) => {
  const { patient_id, doctor_id, appt_datetime, appt_type, notes } = req.body;
  if (!patient_id || !doctor_id || !appt_datetime || !appt_type)
    return err(res, 'patient_id, doctor_id, appt_datetime, appt_type required');
  try {
    // Slot conflict: same doctor same time
    const [[slotTaken]] = await db.query(
      "SELECT appt_id FROM appointments WHERE doctor_id=? AND appt_datetime=? AND status!='cancelled'",
      [doctor_id, appt_datetime]
    );
    if (slotTaken) return err(res, 'This time slot is already booked for the doctor', 409);

    // Same patient + same doctor same day
    const [[sameDay]] = await db.query(
      `SELECT appt_id FROM appointments WHERE patient_id=? AND doctor_id=?
       AND DATE(appt_datetime)=DATE(?) AND status NOT IN ('cancelled','completed')`,
      [patient_id, doctor_id, appt_datetime]
    );
    if (sameDay) return err(res, 'Patient already has appointment with this doctor today', 409);

    const [r] = await db.query(
      `INSERT INTO appointments(patient_id,doctor_id,appt_datetime,appt_type,notes,status)
       VALUES(?,?,?,?,?,'scheduled')`,
      [patient_id, doctor_id, appt_datetime, appt_type, notes || null]
    );
    const [[created]] = await db.query(
      `SELECT a.*, p.full_name patient_name, d.full_name doctor_name
       FROM appointments a JOIN patients p ON p.patient_id=a.patient_id
       JOIN doctors d ON d.doctor_id=a.doctor_id WHERE a.appt_id=?`, [r.insertId]
    );
    ok(res, created, 'Appointment booked', 201);
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return err(res, 'Duplicate appointment slot', 409);
    console.error(e); err(res, 'Server error', 500);
  }
};

exports.updateApptStatus = async (req, res) => {
  const { status } = req.body;
  const allowed = ['scheduled','confirmed','waiting','completed','cancelled'];
  if (!allowed.includes(status)) return err(res, 'Invalid status');
  try {
    await db.query('UPDATE appointments SET status=? WHERE appt_id=?', [status, req.params.id]);
    ok(res, null, `Appointment ${status}`);
  } catch (e) { err(res, 'Server error', 500); }
};

exports.cancelAppointment = async (req, res) => {
  try {
    await db.query("UPDATE appointments SET status='cancelled' WHERE appt_id=?", [req.params.id]);
    ok(res, null, 'Appointment cancelled');
  } catch (e) { err(res, 'Server error', 500); }
};

// ════════════════════════════════════════════════════
// DOCTORS
// ════════════════════════════════════════════════════
exports.getDoctors = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT d.*, dep.dept_name,
              (SELECT COUNT(*) FROM admissions a WHERE a.doctor_id=d.doctor_id AND a.status='admitted') current_patients
       FROM doctors d JOIN departments dep ON dep.dept_id=d.dept_id ORDER BY d.full_name`
    );
    ok(res, rows);
  } catch (e) { err(res, 'Server error', 500); }
};

exports.createDoctor = async (req, res) => {
  const { emp_code, full_name, specialization, dept_id, qualification, experience_yrs, phone, email, joined_date } = req.body;
  try {
    const [[dup]] = await db.query(
      'SELECT doctor_id FROM doctors WHERE emp_code=? OR (email IS NOT NULL AND email=?)', [emp_code, email]
    );
    if (dup) return err(res, 'Employee code or email already exists', 409);
    const [r] = await db.query(
      `INSERT INTO doctors(emp_code,full_name,specialization,dept_id,qualification,experience_yrs,phone,email,joined_date)
       VALUES(?,?,?,?,?,?,?,?,?)`,
      [emp_code, full_name, specialization, dept_id, qualification || null, experience_yrs || 0, phone || null, email || null, joined_date || null]
    );
    const [[created]] = await db.query('SELECT * FROM doctors WHERE doctor_id=?', [r.insertId]);
    ok(res, created, 'Doctor added', 201);
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return err(res, 'Duplicate emp_code or email', 409);
    console.error(e); err(res, 'Server error', 500);
  }
};

exports.updateDoctorStatus = async (req, res) => {
  const { status } = req.body;
  if (!['on-duty','off-duty','leave'].includes(status)) return err(res, 'Invalid status');
  try {
    await db.query('UPDATE doctors SET status=? WHERE doctor_id=?', [status, req.params.id]);
    ok(res, null, 'Status updated');
  } catch (e) { err(res, 'Server error', 500); }
};

// ════════════════════════════════════════════════════
// ADMISSIONS / BEDS
// ════════════════════════════════════════════════════
exports.getAdmitted = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM vw_admitted_patients');
    ok(res, rows);
  } catch (e) { err(res, 'Server error', 500); }
};

exports.admitPatient = async (req, res) => {
  const { patient_id, doctor_id, bed_id, diagnosis, notes } = req.body;
  if (!patient_id || !doctor_id || !bed_id || !diagnosis)
    return err(res, 'patient_id, doctor_id, bed_id, diagnosis required');
  try {
    const [[activeAdm]] = await db.query(
      "SELECT admission_id FROM admissions WHERE patient_id=? AND status='admitted'", [patient_id]
    );
    if (activeAdm) return err(res, 'Patient already has an active admission', 409);
    const [[bed]] = await db.query('SELECT status FROM beds WHERE bed_id=?', [bed_id]);
    if (!bed) return err(res, 'Bed not found', 404);
    if (bed.status !== 'available') return err(res, 'Bed is not available', 409);
    const [r] = await db.query(
      'INSERT INTO admissions(patient_id,doctor_id,bed_id,diagnosis,notes) VALUES(?,?,?,?,?)',
      [patient_id, doctor_id, bed_id, diagnosis, notes || null]
    );
    ok(res, { admission_id: r.insertId }, 'Patient admitted', 201);
  } catch (e) { console.error(e); err(res, 'Server error', 500); }
};

exports.dischargePatient = async (req, res) => {
  try {
    await db.query(
      "UPDATE admissions SET status='discharged', discharge_date=NOW() WHERE admission_id=?", [req.params.id]
    );
    ok(res, null, 'Patient discharged');
  } catch (e) { err(res, 'Server error', 500); }
};

exports.getBeds = async (req, res) => {
  try {
    const { status } = req.query;
    let where = '1=1'; const params = [];
    if (status) { where += ' AND b.status=?'; params.push(status); }
    const [rows] = await db.query(
      `SELECT b.*, w.ward_name, w.ward_type, p.full_name patient_name
       FROM beds b JOIN wards w ON w.ward_id=b.ward_id
       LEFT JOIN admissions a ON a.bed_id=b.bed_id AND a.status='admitted'
       LEFT JOIN patients   p ON p.patient_id=a.patient_id
       WHERE ${where} ORDER BY b.bed_number`, params
    );
    ok(res, rows);
  } catch (e) { err(res, 'Server error', 500); }
};

// ════════════════════════════════════════════════════
// MEDICINES
// ════════════════════════════════════════════════════
exports.getMedicines = async (req, res) => {
  try {
    const { low_stock, search } = req.query;
    let where = '1=1'; const params = [];
    if (low_stock === 'true') where += ' AND stock_qty <= reorder_level';
    if (search) {
      where += ' AND (med_name LIKE ? OR med_code LIKE ? OR generic_name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    const [rows] = await db.query(`SELECT * FROM medicines WHERE ${where} ORDER BY med_name`, params);
    ok(res, rows);
  } catch (e) { err(res, 'Server error', 500); }
};

exports.createMedicine = async (req, res) => {
  const { med_code, med_name, generic_name, category, manufacturer, unit_price, stock_qty, reorder_level, expiry_date } = req.body;
  try {
    const [[cDup]] = await db.query('SELECT med_id FROM medicines WHERE med_code=?', [med_code]);
    if (cDup) return err(res, `Medicine code ${med_code} already exists`, 409);
    const [[nDup]] = await db.query('SELECT med_id FROM medicines WHERE med_name=?', [med_name]);
    if (nDup) return err(res, `Medicine "${med_name}" already exists`, 409);
    const [r] = await db.query(
      `INSERT INTO medicines(med_code,med_name,generic_name,category,manufacturer,unit_price,stock_qty,reorder_level,expiry_date)
       VALUES(?,?,?,?,?,?,?,?,?)`,
      [med_code, med_name, generic_name || null, category, manufacturer || null, unit_price, stock_qty, reorder_level || 20, expiry_date || null]
    );
    const [[created]] = await db.query('SELECT * FROM medicines WHERE med_id=?', [r.insertId]);
    ok(res, created, 'Medicine added', 201);
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return err(res, 'Duplicate med_code or name', 409);
    console.error(e); err(res, 'Server error', 500);
  }
};

exports.restockMedicine = async (req, res) => {
  const qty = Number(req.body.qty);
  if (!qty || qty <= 0) return err(res, 'Quantity must be positive');
  try {
    await db.query('UPDATE medicines SET stock_qty = stock_qty + ? WHERE med_id=?', [qty, req.params.id]);
    ok(res, null, `Restocked +${qty}`);
  } catch (e) { err(res, 'Server error', 500); }
};

exports.deleteMedicine = async (req, res) => {
  try {
    await db.query('DELETE FROM medicines WHERE med_id=?', [req.params.id]);
    ok(res, null, 'Medicine removed');
  } catch (e) { err(res, 'Server error', 500); }
};

// ════════════════════════════════════════════════════
// BILLING
// ════════════════════════════════════════════════════
exports.getBills = async (req, res) => {
  try {
    const { status } = req.query;
    let where = '1=1'; const params = [];
    if (status) { where += ' AND b.payment_status=?'; params.push(status); }
    const [rows] = await db.query(
      `SELECT b.*, p.full_name patient_name, p.phone FROM bills b
       JOIN patients p ON p.patient_id=b.patient_id
       WHERE ${where} ORDER BY b.bill_date DESC`, params
    );
    ok(res, rows);
  } catch (e) { err(res, 'Server error', 500); }
};

exports.getBill = async (req, res) => {
  try {
    const [[bill]] = await db.query(
      'SELECT b.*, p.full_name patient_name FROM bills b JOIN patients p ON p.patient_id=b.patient_id WHERE b.bill_id=?',
      [req.params.id]
    );
    if (!bill) return err(res, 'Not found', 404);
    const [items] = await db.query('SELECT * FROM bill_items WHERE bill_id=?', [req.params.id]);
    ok(res, { ...bill, items });
  } catch (e) { err(res, 'Server error', 500); }
};

exports.createBill = async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const { patient_id, admission_id, items = [], discount = 0, insurance_cover = 0, payment_mode = 'Pending' } = req.body;

    // Auto bill number
    const [[last]] = await conn.query('SELECT bill_number FROM bills ORDER BY bill_id DESC LIMIT 1');
    const seq = last ? Number(last.bill_number.split('-')[2]) + 1 : 1;
    const bill_number = `BL-${new Date().getFullYear()}-${String(seq).padStart(3, '0')}`;

    // Check duplicate bill for same admission
    if (admission_id) {
      const [[dup]] = await conn.query(
        "SELECT bill_id FROM bills WHERE admission_id=? AND payment_status!='waived'", [admission_id]
      );
      if (dup) { await conn.rollback(); return err(res, 'Bill already exists for this admission', 409); }
    }
    const total = items.reduce((s, i) => s + (i.qty * i.unit_price), 0);
    const [r] = await conn.query(
      `INSERT INTO bills(bill_number,patient_id,admission_id,total_amount,discount,insurance_cover,payment_mode)
       VALUES(?,?,?,?,?,?,?)`,
      [bill_number, patient_id, admission_id || null, total, discount, insurance_cover, payment_mode]
    );
    for (const item of items) {
      await conn.query(
        'INSERT INTO bill_items(bill_id,description,item_type,qty,unit_price) VALUES(?,?,?,?,?)',
        [r.insertId, item.description, item.item_type, item.qty, item.unit_price]
      );
    }
    await conn.commit();
    const [[created]] = await conn.query('SELECT * FROM bills WHERE bill_id=?', [r.insertId]);
    ok(res, created, 'Bill created', 201);
  } catch (e) {
    await conn.rollback();
    if (e.code === 'ER_DUP_ENTRY') return err(res, 'Duplicate bill number', 409);
    console.error(e); err(res, 'Server error', 500);
  } finally { conn.release(); }
};

exports.updatePayment = async (req, res) => {
  const { payment_status, payment_mode } = req.body;
  try {
    await db.query('UPDATE bills SET payment_status=?, payment_mode=? WHERE bill_id=?',
      [payment_status, payment_mode, req.params.id]);
    ok(res, null, 'Payment updated');
  } catch (e) { err(res, 'Server error', 500); }
};

exports.billingSummary = async (req, res) => {
  try {
    const [[today]] = await db.query(
      "SELECT IFNULL(SUM(net_payable),0) revenue FROM bills WHERE DATE(bill_date)=CURDATE() AND payment_status='paid'"
    );
    const [[pending]] = await db.query(
      "SELECT IFNULL(SUM(net_payable),0) total FROM bills WHERE payment_status='pending'"
    );
    ok(res, { todayRevenue: today.revenue, pendingAmount: pending.total });
  } catch (e) { err(res, 'Server error', 500); }
};

// ════════════════════════════════════════════════════
// LAB REPORTS
// ════════════════════════════════════════════════════
exports.getLabReports = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT lr.*, p.full_name patient_name, d.full_name doctor_name, lt.test_name
       FROM lab_reports lr
       JOIN patients  p  ON p.patient_id=lr.patient_id
       JOIN doctors   d  ON d.doctor_id=lr.doctor_id
       JOIN lab_tests lt ON lt.test_id=lr.test_id
       ORDER BY lr.sample_date DESC`
    );
    ok(res, rows);
  } catch (e) { err(res, 'Server error', 500); }
};

exports.createLabReport = async (req, res) => {
  const { patient_id, doctor_id, test_id, result_value, result_status, remarks, reported_by } = req.body;
  try {
    const [r] = await db.query(
      `INSERT INTO lab_reports(patient_id,doctor_id,test_id,result_value,result_status,remarks,reported_by)
       VALUES(?,?,?,?,?,?,?)`,
      [patient_id, doctor_id, test_id, result_value || null, result_status || 'pending', remarks || null, reported_by || null]
    );
    ok(res, { report_id: r.insertId }, 'Report created', 201);
  } catch (e) { console.error(e); err(res, 'Server error', 500); }
};

// ════════════════════════════════════════════════════
// DEPARTMENTS / LAB TESTS
// ════════════════════════════════════════════════════
exports.getDepartments = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM departments ORDER BY dept_name');
    ok(res, rows);
  } catch (e) { err(res, 'Server error', 500); }
};

exports.getLabTests = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM lab_tests ORDER BY test_name');
    ok(res, rows);
  } catch (e) { err(res, 'Server error', 500); }
};
