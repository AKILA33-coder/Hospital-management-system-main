const express = require('express');
const { protect } = require('../middleware/auth');
const c = require('../controllers/index');

const router = express.Router();

// AUTH
router.post('/auth/login', c.login);
router.get('/auth/me',    protect, c.me);

// DASHBOARD
router.get('/dashboard/summary', protect, c.dashboardSummary);

// PATIENTS
router.get('/patients/stats', protect, c.patientStats);
router.get('/patients',       protect, c.getPatients);
router.get('/patients/:id',   protect, c.getPatient);
router.post('/patients',      protect, c.createPatient);
router.put('/patients/:id',   protect, c.updatePatient);
router.delete('/patients/:id',protect, c.deletePatient);

// APPOINTMENTS
router.get('/appointments',           protect, c.getAppointments);
router.post('/appointments',          protect, c.createAppointment);
router.patch('/appointments/:id/status', protect, c.updateApptStatus);
router.delete('/appointments/:id',    protect, c.cancelAppointment);

// DOCTORS
router.get('/doctors',              protect, c.getDoctors);
router.post('/doctors',             protect, c.createDoctor);
router.patch('/doctors/:id/status', protect, c.updateDoctorStatus);

// ADMISSIONS & BEDS
router.get('/admissions',             protect, c.getAdmitted);
router.post('/admissions',            protect, c.admitPatient);
router.patch('/admissions/:id/discharge', protect, c.dischargePatient);
router.get('/beds',                   protect, c.getBeds);

// MEDICINES
router.get('/medicines',             protect, c.getMedicines);
router.post('/medicines',            protect, c.createMedicine);
router.patch('/medicines/:id/restock', protect, c.restockMedicine);
router.delete('/medicines/:id',      protect, c.deleteMedicine);

// BILLING
router.get('/billing/summary',    protect, c.billingSummary);
router.get('/billing',            protect, c.getBills);
router.get('/billing/:id',        protect, c.getBill);
router.post('/billing',           protect, c.createBill);
router.patch('/billing/:id/payment', protect, c.updatePayment);

// LAB
router.get('/lab-reports',  protect, c.getLabReports);
router.post('/lab-reports', protect, c.createLabReport);
router.get('/lab-tests',    protect, c.getLabTests);

// MISC
router.get('/departments', protect, c.getDepartments);

module.exports = router;
