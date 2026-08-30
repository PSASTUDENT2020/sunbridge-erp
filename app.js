/* ==========================================================================
   SUNBRIDGE ERP - MASTER APPLICATION ENGINE (app.js)
   ========================================================================== */

// --- 1. SUPABASE CLIENT INITIALIZATION ---
const SUPABASE_URL = "https://yluiejaiscltnjlmiruo.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_tLoxhnZTNHezgc2pLDKTVA_YsYR7IT3";

// Fallback initialization if library is loaded on page
const supabase = window.supabase 
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY) 
  : null;

// --- 2. GLOBAL ROUTING & AUTHENTICATION HELPER ---
function goTo(page) {
  window.location.href = page;
}

// Global Auth Check (Runs automatically on protected pages)
async function checkAuth(requiredRole = null) {
  if (!supabase) return null;

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    if (!window.location.pathname.endsWith('index.html') && window.location.pathname !== '/') {
      window.location.href = 'index.html';
    }
    return null;
  }

  // Fetch Role Profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (requiredRole && profile && profile.role !== requiredRole && profile.role !== 'admin') {
    alert("Unauthorized access. Redirecting...");
    window.location.href = 'dashboard.html';
    return null;
  }

  return { user, profile };
}

// Global Logout Action
async function logout() {
  if (supabase) {
    await supabase.auth.signOut();
  }
  window.location.href = 'index.html';
}

// --- 3. INDEX.HTML (AUTHENTICATION & LOGIN) ---
async function login(event) {
  event.preventDefault();

  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const btn = document.getElementById('login-btn');

  if (!emailInput || !passwordInput) return false;

  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  btn.innerText = "Authenticating...";
  btn.disabled = true;

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (error) throw error;

    // Check Role Redirection
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single();

    if (profile && profile.role === 'finance') {
      window.location.href = 'finance.html';
    } else {
      window.location.href = 'dashboard.html';
    }
  } catch (err) {
    alert("Login failed: " + err.message);
    btn.innerText = "Log In";
    btn.disabled = false;
  }

  return false;
}

// --- 4. DASHBOARD.HTML (EXECUTIVE OVERVIEW) ---
async function loadExecutiveDashboard() {
  const auth = await checkAuth();
  if (!auth) return;

  try {
    const [studentsCount, staffCount, vouchers, expenses] = await Promise.all([
      getCount('students'),
      getCount('staff'),
      supabase.from('vouchers').select('total_amount, status'),
      supabase.from('expenses').select('amount')
    ]);

    // Update Student & Staff counters
    const sElem = document.getElementById('dash-students');
    const stElem = document.getElementById('dash-staff');
    if (sElem) sElem.innerText = studentsCount;
    if (stElem) stElem.innerText = staffCount;

    // Calculate Receivables
    if (vouchers.data) {
      const pending = vouchers.data
        .filter(v => v.status === 'Unpaid')
        .reduce((sum, v) => sum + (parseFloat(v.total_amount) || 0), 0);
      const rElem = document.getElementById('dash-receivables');
      if (rElem) rElem.innerText = `$${pending.toFixed(2)}`;
    }

    // Calculate Payroll / Expenses
    if (expenses.data) {
      const totalExp = expenses.data.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
      const eElem = document.getElementById('dash-expenses');
      if (eElem) eElem.innerText = `$${totalExp.toFixed(2)}`;
    }
  } catch (err) {
    console.error("Error loading dashboard metrics:", err);
  }
}

async function getCount(tableName) {
  const { count, error } = await supabase
    .from(tableName)
    .select('*', { count: 'exact', head: true });
  return error ? 0 : (count || 0);
}

// --- 5. STUDENTS.HTML (ROSTER & ENROLLMENT) ---
async function loadStudentsPage() {
  await checkAuth();
  await populateAcademyDropdown('student-academy-select');
  await fetchStudentsRoster();
}

async function fetchStudentsRoster() {
  const tbody = document.getElementById('students-table-body');
  if (!tbody) return;

  const { data, error } = await supabase
    .from('students')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    tbody.innerHTML = `<tr><td colspan="4" class="p-4 text-red-500">Error loading roster.</td></tr>`;
    return;
  }

  if (!data || data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="p-4 text-gray-400 text-center">No students registered yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = data.map(s => `
    <tr class="border-b hover:bg-gray-50 transition">
      <td class="p-3 font-mono font-bold text-gray-700">${s.roll_number || '-'}</td>
      <td class="p-3 font-medium text-gray-900">${s.full_name}</td>
      <td class="p-3 text-gray-600">${s.grade_class || '-'}</td>
      <td class="p-3 text-gray-600">${s.guardian_phone || '-'}</td>
    </tr>
  `).join('');
}

async function saveStudent(event) {
  event.preventDefault();
  const academyId = document.getElementById('student-academy-select')?.value;
  const fullName = document.getElementById('student-name')?.value.trim();
  const rollNo = document.getElementById('student-roll')?.value.trim();
  const grade = document.getElementById('student-grade')?.value.trim();
  const phone = document.getElementById('student-phone')?.value.trim();

  const btn = document.getElementById('save-student-btn');
  btn.innerText = "Enrolling...";
  btn.disabled = true;

  const { error } = await supabase.from('students').insert([{
    academy_id: academyId || null,
    full_name: fullName,
    roll_number: rollNo,
    grade_class: grade,
    guardian_phone: phone
  }]);

  btn.innerText = "Enroll Student";
  btn.disabled = false;

  if (error) {
    alert("Failed to enroll student: " + error.message);
  } else {
    alert("Student enrolled successfully!");
    event.target.reset();
    fetchStudentsRoster();
  }
  return false;
}

function filterStudents() {
  const q = document.getElementById('student-search-input')?.value.toLowerCase() || '';
  const rows = document.querySelectorAll('#students-table-body tr');
  rows.forEach(r => {
    r.style.display = r.innerText.toLowerCase().includes(q) ? '' : 'none';
  });
}

// --- 6. STAFF.HTML (STAFF DIRECTORY & AUTOMATED PAYROLL ENGINE) ---
async function loadStaffPage() {
  await checkAuth();
  await populateStaffDropdown('salary-staff-select');
  await fetchPayrollLedger();
}

async function fetchPayrollLedger() {
  const tbody = document.getElementById('payroll-ledger-body');
  if (!tbody) return;

  const { data, error } = await supabase
    .from('salary_payments')
    .select('*, staff(full_name, designation)')
    .order('created_at', { ascending: false });

  if (error) {
    tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-red-500">Error loading ledger.</td></tr>`;
    return;
  }

  if (!data || data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-gray-400 text-center">No payroll records found.</td></tr>`;
    return;
  }

  tbody.innerHTML = data.map(sp => `
    <tr class="border-b hover:bg-gray-50 transition text-sm">
      <td class="p-4 font-mono font-bold text-gray-800">${sp.transaction_ref}</td>
      <td class="p-4">
        <div class="font-medium text-gray-900">${sp.staff?.full_name || 'N/A'}</div>
        <div class="text-xs text-gray-400">${sp.staff?.designation || 'Employee'}</div>
      </td>
      <td class="p-4 text-gray-600">${sp.pay_period}</td>
      <td class="p-4 font-mono font-bold text-emerald-700">$${parseFloat(sp.amount).toFixed(2)}</td>
      <td class="p-4 text-center">
        <button onclick='previewPayslip(${JSON.stringify(sp).replace(/'/g, "&apos;")})' class="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1 rounded text-xs">
          View Slip
        </button>
      </td>
    </tr>
  `).join('');
}

async function processSalaryPayment(event) {
  event.preventDefault();

  const staffId = document.getElementById('salary-staff-select')?.value;
  const payPeriod = document.getElementById('salary-period')?.value.trim();
  const salaryAmount = parseFloat(document.getElementById('salary-amount')?.value) || 0;

  if (!staffId || salaryAmount <= 0) {
    alert("Please enter a valid staff member and amount.");
    return false;
  }

  const btn = document.getElementById('process-salary-btn');
  btn.innerText = "Processing...";
  btn.disabled = true;

  const txRef = `PAY-${Date.now().toString().slice(-6)}`;

  try {
    // 1. Create linked expense entry
    const { data: expense, error: expError } = await supabase.from('expenses').insert([{
      category: 'Staff Salary',
      amount: salaryAmount,
      reference_no: txRef,
      description: `Salary disalance for ${payPeriod}`
    }]).select().single();

    if (expError) throw expError;

    // 2. Log payroll payment
    const { error: salError } = await supabase.from('salary_payments').insert([{
      staff_id: staffId,
      expense_id: expense ? expense.id : null,
      transaction_ref: txRef,
      pay_period: payPeriod,
      amount: salaryAmount
    }]);

    if (salError) throw salError;

    alert(`Salary successfully processed!\nTx Reference: ${txRef}`);
    toggleModal('paySalaryModal', false);
    fetchPayrollLedger();
  } catch (err) {
    alert("Payroll Processing Error: " + err.message);
  } finally {
    btn.innerText = "Pay & Auto-Generate Expense";
    btn.disabled = false;
  }
  return false;
}

function previewPayslip(sp) {
  document.getElementById('ps-tx-ref').innerText = sp.transaction_ref;
  document.getElementById('ps-period').innerText = sp.pay_period;
  document.getElementById('ps-staff-name').innerText = sp.staff?.full_name || 'N/A';
  document.getElementById('ps-staff-role').innerText = sp.staff?.designation || 'Staff Member';
  document.getElementById('ps-amount').innerText = `$${parseFloat(sp.amount).toFixed(2)}`;

  const slipContainer = document.getElementById('printable-payslip');
  if (slipContainer) {
    slipContainer.classList.remove('hidden');
    slipContainer.scrollIntoView({ behavior: 'smooth' });
  }
}

// --- 7. FINANCE.HTML (FEE VOUCHERS & RECEIPT PRINTING) ---
async function loadStudentDropdownForVoucher() {
  const select = document.getElementById('voucher-student-select');
  if (!select) return;

  const { data } = await supabase.from('students').select('id, full_name, roll_number');
  if (!data || data.length === 0) {
    select.innerHTML = '<option value="">No students available</option>';
    return;
  }

  select.innerHTML = '<option value="">Select Student...</option>' + 
    data.map(s => `<option value="${s.id}">${s.full_name} (${s.roll_number || 'No Roll #'})</option>`).join('');
}

function updateTotalFee() {
  const tuition = parseFloat(document.getElementById('voucher-tuition')?.value) || 0;
  const other = parseFloat(document.getElementById('voucher-other')?.value) || 0;
  const display = document.getElementById('voucher-total-display');
  if (display) display.innerText = `$${(tuition + other).toFixed(2)}`;
}

async function saveVoucher(event) {
  event.preventDefault();
  const studentId = document.getElementById('voucher-student-select')?.value;
  const issueDate = document.getElementById('voucher-issue-date')?.value;
  const dueDate = document.getElementById('voucher-due-date')?.value;
  const tuition = parseFloat(document.getElementById('voucher-tuition')?.value) || 0;
  const other = parseFloat(document.getElementById('voucher-other')?.value) || 0;
  const total = tuition + other;

  const btn = document.getElementById('save-voucher-btn');
  btn.innerText = "Creating...";
  btn.disabled = true;

  const voucherNo = `VCH-${Date.now().toString().slice(-6)}`;

  const { error } = await supabase.from('vouchers').insert([{
    voucher_no: voucherNo,
    student_id: studentId,
    issue_date: issueDate,
    due_date: dueDate,
    tuition_fee: tuition,
    other_charges: other,
    total_amount: total,
    status: 'Unpaid'
  }]);

  btn.innerText = "Issue Voucher";
  btn.disabled = false;

  if (error) {
    alert("Error creating voucher: " + error.message);
  } else {
    alert("Voucher issued successfully!");
    toggleModal('generateVoucherModal', false);
    if (typeof fetchVouchers === 'function') fetchVouchers();
  }
  return false;
}

function previewVoucher(v) {
  document.getElementById('pv-voucher-no').innerText = v.voucher_no;
  document.getElementById('pv-student-name').innerText = v.students?.full_name || 'N/A';
  document.getElementById('pv-roll-no').innerText = v.students?.roll_number || '-';
  document.getElementById('pv-issue-date').innerText = v.issue_date;
  document.getElementById('pv-due-date').innerText = v.due_date;
  document.getElementById('pv-tuition').innerText = `$${parseFloat(v.tuition_fee || 0).toFixed(2)}`;
  document.getElementById('pv-other').innerText = `$${parseFloat(v.other_charges || 0).toFixed(2)}`;
  document.getElementById('pv-total').innerText = `$${parseFloat(v.total_amount || 0).toFixed(2)}`;

  const wrapper = document.getElementById('printable-voucher-wrapper');
  if (wrapper) {
    wrapper.classList.remove('hidden');
    wrapper.scrollIntoView({ behavior: 'smooth' });
  }
}

// --- 8. SHARED UTILITIES ---
async function populateAcademyDropdown(elementId) {
  const select = document.getElementById(elementId);
  if (!select) return;

  const { data } = await supabase.from('academies').select('id, name');
  if (!data || data.length === 0) {
    select.innerHTML = '<option value="">Main Branch</option>';
    return;
  }
  select.innerHTML = data.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
}

async function populateStaffDropdown(elementId) {
  const select = document.getElementById(elementId);
  if (!select) return;

  const { data } = await supabase.from('staff').select('id, full_name, designation');
  if (!data || data.length === 0) {
    select.innerHTML = '<option value="">No staff registered</option>';
    return;
  }
  select.innerHTML = '<option value="">Select Employee...</option>' + 
    data.map(st => `<option value="${st.id}">${st.full_name} (${st.designation || 'Staff'})</option>`).join('');
}

function toggleModal(id, show) {
  const modal = document.getElementById(id);
  if (!modal) return;
  if (show) modal.classList.remove('hidden');
  else modal.classList.add('hidden');
}

// --- 9. AUTOMATIC ROUTE INITIALIZER ---
document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname;

  if (path.endsWith('dashboard.html')) {
    loadExecutiveDashboard();
  } else if (path.endsWith('students.html')) {
    loadStudentsPage();
  } else if (path.endsWith('staff.html')) {
    loadStaffPage();
  }
});
