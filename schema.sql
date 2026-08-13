-- ================================================================
--  HOSPITAL MANAGEMENT SYSTEM — COMPLETE DATABASE SCHEMA
--  MySQL 8.0+  |  Run: mysql -u root -p < schema.sql
-- ================================================================

CREATE DATABASE IF NOT EXISTS hms_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE hms_db;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS bill_items, bills, prescription_items, prescriptions,
  lab_reports, lab_tests, admissions, appointments, beds, wards,
  doctors, patients, departments, users;
SET FOREIGN_KEY_CHECKS = 1;

-- ──────────────────────────────────────────────
-- 1. DEPARTMENTS
-- ──────────────────────────────────────────────
CREATE TABLE departments (
  dept_id    INT AUTO_INCREMENT PRIMARY KEY,
  dept_name  VARCHAR(100) NOT NULL,
  dept_head  VARCHAR(100),
  floor_no   TINYINT,
  phone_ext  VARCHAR(10),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_dept_name (dept_name)
);

-- ──────────────────────────────────────────────
-- 2. DOCTORS
-- ──────────────────────────────────────────────
CREATE TABLE doctors (
  doctor_id      INT AUTO_INCREMENT PRIMARY KEY,
  emp_code       VARCHAR(10)  NOT NULL,
  full_name      VARCHAR(100) NOT NULL,
  specialization VARCHAR(100) NOT NULL,
  dept_id        INT NOT NULL,
  qualification  VARCHAR(200),
  experience_yrs TINYINT DEFAULT 0,
  phone          VARCHAR(15),
  email          VARCHAR(100),
  status         ENUM('on-duty','off-duty','leave') DEFAULT 'on-duty',
  joined_date    DATE,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_emp_code  (emp_code),
  UNIQUE KEY uq_doc_email (email),
  CONSTRAINT fk_doc_dept FOREIGN KEY (dept_id) REFERENCES departments(dept_id)
);

-- ──────────────────────────────────────────────
-- 3. PATIENTS
-- ──────────────────────────────────────────────
CREATE TABLE patients (
  patient_id      INT AUTO_INCREMENT PRIMARY KEY,
  patient_code    VARCHAR(10)  NOT NULL,
  full_name       VARCHAR(100) NOT NULL,
  dob             DATE         NOT NULL,
  gender          ENUM('Male','Female','Other') NOT NULL,
  blood_group     ENUM('A+','A-','B+','B-','AB+','AB-','O+','O-') NOT NULL,
  phone           VARCHAR(15)  NOT NULL,
  email           VARCHAR(100),
  address         TEXT,
  emergency_name  VARCHAR(100),
  emergency_phone VARCHAR(15),
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_patient_code (patient_code),
  UNIQUE KEY uq_patient_phone (phone)        -- prevents duplicate registration by phone
);

-- ──────────────────────────────────────────────
-- 4. WARDS & BEDS
-- ──────────────────────────────────────────────
CREATE TABLE wards (
  ward_id    INT AUTO_INCREMENT PRIMARY KEY,
  ward_name  VARCHAR(100) NOT NULL,
  dept_id    INT NOT NULL,
  ward_type  ENUM('General','ICU','Private','Semi-Private','NICU') DEFAULT 'General',
  total_beds TINYINT NOT NULL DEFAULT 10,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_ward_name (ward_name),
  CONSTRAINT fk_ward_dept FOREIGN KEY (dept_id) REFERENCES departments(dept_id)
);

CREATE TABLE beds (
  bed_id     INT AUTO_INCREMENT PRIMARY KEY,
  bed_number VARCHAR(10) NOT NULL,
  ward_id    INT NOT NULL,
  status     ENUM('available','occupied','maintenance') DEFAULT 'available',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_bed_number (bed_number),    -- prevents duplicate bed numbers
  CONSTRAINT fk_bed_ward FOREIGN KEY (ward_id) REFERENCES wards(ward_id)
);

-- ──────────────────────────────────────────────
-- 5. ADMISSIONS
-- ──────────────────────────────────────────────
CREATE TABLE admissions (
  admission_id   INT AUTO_INCREMENT PRIMARY KEY,
  patient_id     INT NOT NULL,
  doctor_id      INT NOT NULL,
  bed_id         INT NOT NULL,
  admission_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  discharge_date DATETIME,
  diagnosis      VARCHAR(255) NOT NULL,
  status         ENUM('admitted','discharged','transferred') DEFAULT 'admitted',
  notes          TEXT,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_adm_patient FOREIGN KEY (patient_id) REFERENCES patients(patient_id),
  CONSTRAINT fk_adm_doctor  FOREIGN KEY (doctor_id)  REFERENCES doctors(doctor_id),
  CONSTRAINT fk_adm_bed     FOREIGN KEY (bed_id)     REFERENCES beds(bed_id)
);

-- ──────────────────────────────────────────────
-- 6. APPOINTMENTS
-- ──────────────────────────────────────────────
CREATE TABLE appointments (
  appt_id       INT AUTO_INCREMENT PRIMARY KEY,
  patient_id    INT NOT NULL,
  doctor_id     INT NOT NULL,
  appt_datetime DATETIME NOT NULL,
  appt_type     ENUM('Consultation','Follow-up','Review','Pre-op','Emergency') NOT NULL,
  status        ENUM('scheduled','confirmed','waiting','completed','cancelled') DEFAULT 'scheduled',
  notes         TEXT,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_appt_slot (doctor_id, appt_datetime),  -- prevents double-booking same slot
  CONSTRAINT fk_appt_patient FOREIGN KEY (patient_id) REFERENCES patients(patient_id),
  CONSTRAINT fk_appt_doctor  FOREIGN KEY (doctor_id)  REFERENCES doctors(doctor_id)
);

-- ──────────────────────────────────────────────
-- 7. MEDICINES
-- ──────────────────────────────────────────────
CREATE TABLE medicines (
  med_id        INT AUTO_INCREMENT PRIMARY KEY,
  med_code      VARCHAR(10)  NOT NULL,
  med_name      VARCHAR(150) NOT NULL,
  generic_name  VARCHAR(150),
  category      VARCHAR(80)  NOT NULL,
  manufacturer  VARCHAR(100),
  unit_price    DECIMAL(10,2) NOT NULL DEFAULT 0,
  stock_qty     INT NOT NULL DEFAULT 0,
  reorder_level INT NOT NULL DEFAULT 20,
  expiry_date   DATE,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_med_code (med_code),
  UNIQUE KEY uq_med_name (med_name)          -- prevents duplicate medicine entries
);

-- ──────────────────────────────────────────────
-- 8. LAB
-- ──────────────────────────────────────────────
CREATE TABLE lab_tests (
  test_id      INT AUTO_INCREMENT PRIMARY KEY,
  test_code    VARCHAR(10)  NOT NULL,
  test_name    VARCHAR(150) NOT NULL,
  dept_id      INT,
  normal_range VARCHAR(100),
  unit_price   DECIMAL(10,2) DEFAULT 0,
  UNIQUE KEY uq_test_code (test_code),
  UNIQUE KEY uq_test_name (test_name),
  CONSTRAINT fk_lt_dept FOREIGN KEY (dept_id) REFERENCES departments(dept_id)
);

CREATE TABLE lab_reports (
  report_id     INT AUTO_INCREMENT PRIMARY KEY,
  patient_id    INT NOT NULL,
  doctor_id     INT NOT NULL,
  test_id       INT NOT NULL,
  sample_date   DATETIME DEFAULT CURRENT_TIMESTAMP,
  result_value  VARCHAR(255),
  result_status ENUM('normal','abnormal','critical','pending') DEFAULT 'pending',
  remarks       TEXT,
  reported_by   VARCHAR(100),
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_lr_patient FOREIGN KEY (patient_id) REFERENCES patients(patient_id),
  CONSTRAINT fk_lr_doctor  FOREIGN KEY (doctor_id)  REFERENCES doctors(doctor_id),
  CONSTRAINT fk_lr_test    FOREIGN KEY (test_id)    REFERENCES lab_tests(test_id)
);

-- ──────────────────────────────────────────────
-- 9. BILLING
-- ──────────────────────────────────────────────
CREATE TABLE bills (
  bill_id         INT AUTO_INCREMENT PRIMARY KEY,
  bill_number     VARCHAR(15)   NOT NULL,
  patient_id      INT NOT NULL,
  admission_id    INT,
  bill_date       DATETIME DEFAULT CURRENT_TIMESTAMP,
  total_amount    DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount        DECIMAL(12,2) DEFAULT 0,
  insurance_cover DECIMAL(12,2) DEFAULT 0,
  net_payable     DECIMAL(12,2) GENERATED ALWAYS AS
                  (total_amount - discount - insurance_cover) STORED,
  payment_mode    ENUM('Cash','Card','UPI','Insurance','Pending') DEFAULT 'Pending',
  payment_status  ENUM('paid','pending','partial','waived') DEFAULT 'pending',
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_bill_number (bill_number),
  CONSTRAINT fk_bill_patient FOREIGN KEY (patient_id) REFERENCES patients(patient_id)
);

CREATE TABLE bill_items (
  item_id     INT AUTO_INCREMENT PRIMARY KEY,
  bill_id     INT NOT NULL,
  description VARCHAR(200) NOT NULL,
  item_type   ENUM('consultation','procedure','medicine','lab','ward','other') NOT NULL,
  qty         INT DEFAULT 1,
  unit_price  DECIMAL(10,2) NOT NULL,
  total       DECIMAL(10,2) GENERATED ALWAYS AS (qty * unit_price) STORED,
  CONSTRAINT fk_bi_bill FOREIGN KEY (bill_id) REFERENCES bills(bill_id) ON DELETE CASCADE
);

-- ──────────────────────────────────────────────
-- 10. USERS (Login)
-- ──────────────────────────────────────────────
CREATE TABLE users (
  user_id       INT AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(50)  NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name     VARCHAR(100) NOT NULL,
  role          ENUM('admin','doctor','nurse','receptionist','pharmacist','lab_tech') NOT NULL,
  email         VARCHAR(100),
  is_active     BOOLEAN DEFAULT TRUE,
  last_login    DATETIME,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_username   (username),
  UNIQUE KEY uq_user_email (email)
);

-- ================================================================
-- TRIGGERS
-- ================================================================

-- Auto patient_code on insert
DELIMITER $$
CREATE TRIGGER trg_patient_code BEFORE INSERT ON patients
FOR EACH ROW BEGIN
  IF NEW.patient_code IS NULL OR NEW.patient_code = '' THEN
    SET NEW.patient_code = CONCAT('P', LPAD(
      (SELECT IFNULL(MAX(patient_id),0)+1 FROM patients), 4, '0'));
  END IF;
END$$

-- Bed → occupied when admitted
CREATE TRIGGER trg_bed_admitted AFTER INSERT ON admissions
FOR EACH ROW BEGIN
  IF NEW.status = 'admitted' THEN
    UPDATE beds SET status = 'occupied' WHERE bed_id = NEW.bed_id;
  END IF;
END$$

-- Bed → available when discharged
CREATE TRIGGER trg_bed_discharged AFTER UPDATE ON admissions
FOR EACH ROW BEGIN
  IF NEW.status = 'discharged' AND OLD.status = 'admitted' THEN
    UPDATE beds SET status = 'available' WHERE bed_id = OLD.bed_id;
  END IF;
END$$
DELIMITER ;

-- ================================================================
-- VIEWS
-- ================================================================

CREATE OR REPLACE VIEW vw_admitted_patients AS
SELECT a.admission_id, p.patient_code, p.full_name AS patient_name,
       p.phone, p.blood_group, d.full_name AS doctor_name,
       dep.dept_name, w.ward_name, b.bed_number,
       a.diagnosis, a.admission_date, a.status AS admission_status
FROM admissions a
JOIN patients p    ON p.patient_id = a.patient_id
JOIN doctors  d    ON d.doctor_id  = a.doctor_id
JOIN beds     b    ON b.bed_id     = a.bed_id
JOIN wards    w    ON w.ward_id    = b.ward_id
JOIN departments dep ON dep.dept_id = w.dept_id
WHERE a.status = 'admitted';

CREATE OR REPLACE VIEW vw_today_appointments AS
SELECT a.appt_id, p.full_name AS patient_name, p.phone,
       d.full_name AS doctor_name, dep.dept_name,
       a.appt_datetime, a.appt_type, a.status
FROM appointments a
JOIN patients p    ON p.patient_id = a.patient_id
JOIN doctors  d    ON d.doctor_id  = a.doctor_id
JOIN departments dep ON dep.dept_id = d.dept_id
WHERE DATE(a.appt_datetime) = CURDATE()
ORDER BY a.appt_datetime;

CREATE OR REPLACE VIEW vw_low_stock AS
SELECT med_code, med_name, category, stock_qty, reorder_level, expiry_date
FROM medicines WHERE stock_qty <= reorder_level;

CREATE OR REPLACE VIEW vw_pending_bills AS
SELECT b.bill_number, p.full_name AS patient_name,
       b.total_amount, b.insurance_cover, b.net_payable,
       b.payment_status, b.bill_date
FROM bills b JOIN patients p ON p.patient_id = b.patient_id
WHERE b.payment_status IN ('pending','partial');

-- ================================================================
-- STORED PROCEDURES
-- ================================================================

DELIMITER $$

-- Safe patient registration (duplicate phone check)
CREATE PROCEDURE sp_register_patient(
  IN p_name VARCHAR(100), IN p_dob DATE, IN p_gender VARCHAR(10),
  IN p_blood VARCHAR(4),  IN p_phone VARCHAR(15), IN p_email VARCHAR(100),
  IN p_address TEXT, OUT p_result VARCHAR(200))
BEGIN
  IF EXISTS (SELECT 1 FROM patients WHERE phone = p_phone) THEN
    SET p_result = CONCAT('ERROR: Phone ', p_phone, ' already registered');
  ELSE
    INSERT INTO patients(full_name,dob,gender,blood_group,phone,email,address)
    VALUES(p_name,p_dob,p_gender,p_blood,p_phone,p_email,p_address);
    SET p_result = CONCAT('SUCCESS: Patient ID ', LAST_INSERT_ID());
  END IF;
END$$

-- Safe appointment booking (slot conflict check)
CREATE PROCEDURE sp_book_appointment(
  IN p_patient INT, IN p_doctor INT, IN p_dt DATETIME,
  IN p_type VARCHAR(20), OUT p_result VARCHAR(200))
BEGIN
  IF EXISTS (SELECT 1 FROM appointments WHERE doctor_id=p_doctor AND appt_datetime=p_dt AND status!='cancelled') THEN
    SET p_result = 'ERROR: Slot already booked for this doctor';
  ELSE
    INSERT INTO appointments(patient_id,doctor_id,appt_datetime,appt_type)
    VALUES(p_patient,p_doctor,p_dt,p_type);
    SET p_result = CONCAT('SUCCESS: Appointment ID ', LAST_INSERT_ID());
  END IF;
END$$
DELIMITER ;

-- ================================================================
-- SEED DATA
-- ================================================================

INSERT IGNORE INTO departments(dept_name, dept_head, floor_no, phone_ext) VALUES
('Cardiology',      'Dr. Priya Nair',   2, '201'),
('Orthopaedics',    'Dr. Anand Raj',    3, '301'),
('Neurology',       'Dr. Sathish K',    3, '302'),
('Endocrinology',   'Dr. Rajan Pillai', 2, '202'),
('General Surgery', 'Dr. Vijay M',      4, '401'),
('Pulmonology',     'Dr. Anitha R',     2, '203'),
('Pathology',       'Dr. Karthik S',    1, '101'),
('Radiology',       'Dr. Meera L',      1, '102'),
('Emergency',       'Dr. Suresh T',     0, '001');

INSERT IGNORE INTO doctors(emp_code,full_name,specialization,dept_id,qualification,experience_yrs,phone,email,status,joined_date) VALUES
('EMP001','Dr. Priya Nair',   'Cardiologist',        1,'MD, DM Cardiology',     12,'9841001001','priya.nair@hms.com',   'on-duty','2013-06-01'),
('EMP002','Dr. Rajan Pillai', 'Endocrinologist',     4,'MD, DM Endocrinology',   8,'9841002002','rajan.pillai@hms.com', 'on-duty','2017-03-15'),
('EMP003','Dr. Anand Raj',    'Orthopaedic Surgeon', 2,'MS Orthopaedics',        15,'9841003003','anand.raj@hms.com',    'on-duty','2010-08-20'),
('EMP004','Dr. Vijay M',      'General Surgeon',     5,'MS General Surgery',     10,'9841004004','vijay.m@hms.com',      'leave',  '2015-01-10'),
('EMP005','Dr. Sathish K',    'Neurologist',          3,'MD, DM Neurology',       9,'9841005005','sathish.k@hms.com',    'on-duty','2016-05-22'),
('EMP006','Dr. Anitha R',     'Pulmonologist',        6,'MD, DM Pulmonology',     6,'9841006006','anitha.r@hms.com',     'on-duty','2019-09-01'),
('EMP007','Dr. Suresh T',     'Emergency Medicine',   9,'MD Emergency Medicine',  7,'9841007007','suresh.t@hms.com',     'on-duty','2018-02-14'),
('EMP008','Dr. Meera L',      'Radiologist',          8,'MD Radiology',            5,'9841008008','meera.l@hms.com',      'on-duty','2020-07-01');

INSERT IGNORE INTO wards(ward_name,dept_id,ward_type,total_beds) VALUES
('Cardiology General', 1,'General',    10),
('Cardiology ICU',     1,'ICU',         4),
('Orthopaedics Ward',  2,'General',     8),
('Neurology Ward',     3,'General',     6),
('Endocrinology Ward', 4,'General',     6),
('Surgery Ward',       5,'General',    10),
('Post-Op Ward',       5,'Semi-Private',4),
('Pulmonology Ward',   6,'General',     6);

INSERT IGNORE INTO beds(bed_number,ward_id,status) VALUES
('C-001',1,'occupied'),('C-002',1,'available'),('C-003',1,'available'),('C-004',1,'available'),
('CI-001',2,'occupied'),('CI-002',2,'available'),
('O-001',3,'occupied'),('O-002',3,'available'),('O-003',3,'available'),
('N-001',4,'available'),('N-002',4,'available'),
('EN-001',5,'occupied'),('EN-002',5,'available'),
('S-001',6,'available'),('S-002',6,'available'),
('PO-001',7,'available'),
('PU-001',8,'occupied'),('PU-002',8,'available');

INSERT IGNORE INTO patients(patient_code,full_name,dob,gender,blood_group,phone,email,address,emergency_name,emergency_phone) VALUES
('P0001','Arjun Kumar',   '1990-04-12','Male',  'O+', '9876500001','arjun.kumar@email.com',   'No.5 Gandhi St, Coimbatore','Priya Kumar', '9876500011'),
('P0002','Meena Devi',    '1966-07-25','Female','A+', '9876500002','meena.devi@email.com',    'Saibaba Colony, Coimbatore','Ramu Devi',   '9876500012'),
('P0003','Suresh Babu',   '1979-11-03','Male',  'B+', '9876500003','suresh.babu@email.com',   'RS Puram, Coimbatore',      'Latha Babu',  '9876500013'),
('P0004','Kavitha S',     '1996-02-18','Female','AB-','9876500004','kavitha.s@email.com',     'Peelamedu, Coimbatore',     'Siva S',      '9876500014'),
('P0005','Ravi Shankar',  '1962-09-30','Male',  'O-', '9876500005','ravi.shankar@email.com',  'Ganapathy, Coimbatore',     'Vijaya Ravi', '9876500015'),
('P0006','Lakshmi P',     '1983-05-07','Female','A-', '9876500006','lakshmi.p@email.com',     'Singanallur, Coimbatore',   'Prakash P',   '9876500016'),
('P0007','Murugan T',     '1969-12-14','Male',  'B-', '9876500007','murugan.t@email.com',     'Vadavalli, Coimbatore',     'Selvi T',     '9876500017'),
('P0008','Preethi M',     '1995-08-22','Female','O+', '9876500008','preethi.m@email.com',     'Ukkadam, Coimbatore',       'Manoj M',     '9876500018'),
('P0009','Ramesh D',      '1975-03-09','Male',  'B+', '9876500009','ramesh.d@email.com',      'Thudiyalur, Coimbatore',    'Deepa D',     '9876500019'),
('P0010','Sakthi V',      '1988-06-28','Male',  'AB+','9876500010','sakthi.v@email.com',      'Kuniyamuthur, Coimbatore',  'Vani V',      '9876500020');

INSERT IGNORE INTO admissions(patient_id,doctor_id,bed_id,diagnosis,status) VALUES
(1,1,1,'Hypertension with LVH',         'admitted'),
(5,1,5,'Acute STEMI Post-PCI',           'admitted'),
(3,3,7,'Femur Fracture Post-ORIF',       'admitted'),
(2,2,11,'Type 2 Diabetes HbA1c 8.2',    'admitted'),
(7,6,17,'Community Acquired Pneumonia',  'admitted');

INSERT IGNORE INTO appointments(patient_id,doctor_id,appt_datetime,appt_type,status) VALUES
(1,1,'2025-05-09 09:00:00','Follow-up',   'confirmed'),
(6,5,'2025-05-09 10:30:00','Consultation','waiting'),
(10,3,'2025-05-09 11:00:00','Review',     'confirmed'),
(8,4,'2025-05-10 09:00:00','Pre-op',      'scheduled'),
(9,2,'2025-05-10 14:00:00','Consultation','scheduled'),
(2,2,'2025-05-09 15:00:00','Review',      'confirmed'),
(4,4,'2025-05-11 10:00:00','Follow-up',   'scheduled'),
(3,3,'2025-05-12 11:00:00','Review',      'scheduled');

INSERT IGNORE INTO medicines(med_code,med_name,generic_name,category,manufacturer,unit_price,stock_qty,reorder_level,expiry_date) VALUES
('MD001','Metformin 500mg Tab',    'Metformin',       'Antidiabetic',     'Cipla',     12.00,240,50,'2025-12-31'),
('MD002','Atorvastatin 20mg Tab',  'Atorvastatin',    'Cardiac',          'Sun Pharma',28.00, 18,25,'2025-06-30'),
('MD003','Paracetamol 650mg Tab',  'Paracetamol',     'Analgesic',        'Abbott',     5.00,520,100,'2026-03-31'),
('MD004','Amoxicillin 500mg Cap',  'Amoxicillin',     'Antibiotic',       'GSK',       22.00, 45,30,'2025-09-30'),
('MD005','Omeprazole 20mg Cap',    'Omeprazole',      'Antacid',          'Ranbaxy',   18.00,  8,20,'2025-04-30'),
('MD006','Amlodipine 5mg Tab',     'Amlodipine',      'Antihypertensive', 'Cipla',     15.00,160,30,'2025-11-30'),
('MD007','Clopidogrel 75mg Tab',   'Clopidogrel',     'Antiplatelet',     'Sun Pharma',35.00, 90,25,'2026-01-31'),
('MD008','Azithromycin 500mg Tab', 'Azithromycin',    'Antibiotic',       'Pfizer',    45.00, 55,20,'2025-08-31'),
('MD009','Insulin Glargine 100U',  'Insulin Glargine','Antidiabetic',     'Sanofi',   320.00, 30,15,'2025-10-31'),
('MD010','Salbutamol 100mcg Inh',  'Salbutamol',      'Bronchodilator',   'GSK',      180.00, 22,10,'2026-02-28');

INSERT IGNORE INTO lab_tests(test_code,test_name,dept_id,normal_range,unit_price) VALUES
('LT001','Complete Blood Count',7,'RBC 4.5-5.5 M/uL',  250.00),
('LT002','Lipid Profile',       7,'LDL < 100 mg/dL',   450.00),
('LT003','HbA1c',               7,'< 5.7%',             380.00),
('LT004','ECG 12-lead',         1,'Normal sinus rhythm',200.00),
('LT005','X-Ray (per view)',    8,'—',                  300.00),
('LT006','MRI Brain',           8,'—',                 3500.00),
('LT007','Chest X-Ray',         8,'Clear lung fields',  350.00),
('LT008','Echocardiogram',      1,'EF > 55%',          1200.00);

INSERT IGNORE INTO lab_reports(patient_id,doctor_id,test_id,result_value,result_status,remarks,reported_by) VALUES
(1,1,2,'LDL: 142 mg/dL, TG: 210 mg/dL','abnormal','High LDL — statin therapy recommended','Dr. Karthik S'),
(2,2,3,'HbA1c: 8.2%',                   'abnormal','Poor glycaemic control — review dosage', 'Dr. Karthik S'),
(3,3,5,'Fracture mid-shaft femur L',     'abnormal','ORIF done — follow-up 6 weeks',         'Dr. Meera L'),
(5,1,4,'STEMI pattern leads II,aVF',     'critical','Primary PCI performed — stable',         'Dr. Priya Nair'),
(7,6,7,'Consolidation right lower lobe', 'abnormal','CAP — start IV Amoxicillin',             'Dr. Meera L'),
(6,5,6,'Pending',                        'pending', 'Awaiting radiologist report',            NULL);

INSERT IGNORE INTO bills(bill_number,patient_id,bill_date,total_amount,discount,insurance_cover,payment_mode,payment_status) VALUES
('BL-2025-001',4,'2025-05-02 11:00:00',45000,2000,20000,'Insurance','paid'),
('BL-2025-002',2,'2025-05-07 09:30:00', 6200,   0, 2000,'Pending',  'pending'),
('BL-2025-003',5,'2025-05-08 14:00:00',72000,   0,35000,'Insurance','pending'),
('BL-2025-004',1,'2025-05-09 08:00:00', 8500, 500, 3000,'Card',     'pending'),
('BL-2025-005',3,'2025-05-06 10:00:00',38000,1000,15000,'Insurance','partial');

INSERT IGNORE INTO bill_items(bill_id,description,item_type,qty,unit_price) VALUES
(1,'Appendectomy Surgery','procedure',1,30000),(1,'Ward Charges 7 days','ward',7,800),(1,'Post-op Medicines','medicine',1,5000),
(2,'Endocrinology Consult','consultation',2,1200),(2,'Lab HbA1c + FBS','lab',2,500),(2,'Metformin 30-day','medicine',1,360),
(3,'ICU Charges 3 days','ward',3,8000),(3,'Cardiac Intervention','procedure',1,45000),(3,'Cardiology Consult','consultation',3,1500),
(4,'Cardiology Consult','consultation',1,1500),(4,'ECG + Echo','lab',2,700),(4,'Medicines','medicine',1,1800),
(5,'Ortho Surgery','procedure',1,28000),(5,'Ward 5 days','ward',5,800),(5,'Physio Sessions','procedure',4,1000);

-- Admin user — password: Admin@123
INSERT IGNORE INTO users(username,password_hash,full_name,role,email) VALUES
('admin','$2b$10$X9f3mZq1WvNt5YADJ5Qn8.3P6sRkLjH4oVzMiCbwK2dXeUYpTsGrC','Administrator','admin','admin@hms.com');
