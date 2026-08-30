const SUPABASE_URL = 'https://wscaiebgqxgtfbisamyc.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_NSF28nhImZqYL9_3RUTmFg_yDANCLr6';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// View Switching Logic
function switchTab(viewId) {
  document.querySelectorAll('.view-panel').forEach(panel => panel.classList.add('hidden'));
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('bg-blue-600', 'text-white');
    btn.classList.add('bg-gray-200', 'text-gray-700');
  });

  document.getElementById(viewId).classList.remove('hidden');

  const activeBtn = Array.from(document.querySelectorAll('.tab-btn')).find(
    btn => btn.getAttribute('onclick').includes(viewId)
  );
  if (activeBtn) {
    activeBtn.classList.remove('bg-gray-200', 'text-gray-700');
    activeBtn.classList.add('bg-blue-600', 'text-white');
  }
}

// Handle Login Event
async function handleLogin(event) {
  event.preventDefault();

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const loginBtn = document.getElementById('login-btn');

  loginBtn.innerText = "Logging in...";
  loginBtn.disabled = true;

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  loginBtn.innerText = "Log In";
  loginBtn.disabled = false;

  if (error) {
    alert("Login Error: " + error.message);
  } else {
    showApp(data.session);
  }
}

// Logout Logic
async function logout() {
  await supabase.auth.signOut();
  location.reload();
}

// Show App Interface after Login
async function showApp(session) {
  document.getElementById('login-box').classList.add('hidden');
  document.getElementById('app-container').classList.remove('hidden');
  document.getElementById('user-badge').classList.remove('hidden');
  document.getElementById('user-info').innerText = session.user.email;

  loadAllData();
}

// Check Session on Load
async function checkAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    showApp(session);
  }
}

// Master Data Fetch
async function loadAllData() {
  loadAcademies();
  loadStudents();
  loadVouchers();
}

// 1. ACADEMIES DATA
async function loadAcademies() {
  const { data: academies } = await supabase.from('academies').select('*');
  const listElement = document.getElementById('academy-list');
  const selectElement = document.getElementById('branch-select');

  listElement.innerHTML = '';
  selectElement.innerHTML = '<option value="">Select Target Branch...</option>';

  if (academies && academies.length > 0) {
    document.getElementById('count-academies').innerText = academies.length;
    academies.forEach(acad => {
      listElement.innerHTML += `<li class="py-2 flex justify-between"><span><strong>${acad.name}</strong> (${acad.code})</span></li>`;
      selectElement.innerHTML += `<option value="${acad.id}">${acad.name} (${acad.code})</option>`;
    });
  } else {
    listElement.innerHTML = '<li class="text-gray-500 py-2">No active academies.</li>';
  }
}

async function addAcademy() {
  const name = document.getElementById('academy-name').value;
  const code = document.getElementById('academy-code').value;

  if (!name || !code) return alert("Enter Name and Code.");

  const { error } = await supabase.from('academies').insert([{ name, code }]);
  if (error) alert(error.message);
  else {
    document.getElementById('academy-name').value = '';
    document.getElementById('academy-code').value = '';
    loadAcademies();
  }
}

// 2. STUDENTS DATA
async function loadStudents() {
  const { data: students } = await supabase.from('students').select('*, academies(name)');
  const listElement = document.getElementById('student-list');
  const voucherSelect = document.getElementById('voucher-student-select');

  listElement.innerHTML = '';
  voucherSelect.innerHTML = '<option value="">Select Student...</option>';

  if (students && students.length > 0) {
    document.getElementById('count-students').innerText = students.length;
    students.forEach(std => {
      listElement.innerHTML += `<li class="py-2 flex justify-between"><span><strong>${std.full_name}</strong> (Roll: ${std.roll_number}) - <span class="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">${std.academies ? std.academies.name : 'N/A'}</span></span></li>`;
      voucherSelect.innerHTML += `<option value="${std.id}">${std.full_name} (${std.roll_number})</option>`;
    });
  } else {
    listElement.innerHTML = '<li class="text-gray-500 py-2">No registered students.</li>';
  }
}

async function addStudent() {
  const academyId = document.getElementById('branch-select').value;
  const name = document.getElementById('student-name').value;
  const roll = document.getElementById('student-roll').value;

  if (!academyId || !name || !roll) return alert("Fill in all student details.");

  const { error } = await supabase.from('students').insert([{ academy_id: academyId, full_name: name, roll_number: roll }]);
  if (error) alert(error.message);
  else {
    document.getElementById('student-name').value = '';
    document.getElementById('student-roll').value = '';
    loadStudents();
  }
}

// 3. FEE VOUCHERS DATA
async function loadVouchers() {
  const { data: vouchers } = await supabase.from('fee_vouchers').select('*, students(full_name)');
  const listElement = document.getElementById('voucher-list');

  listElement.innerHTML = '';

  if (vouchers && vouchers.length > 0) {
    document.getElementById('count-vouchers').innerText = vouchers.length;
    vouchers.forEach(v => {
      listElement.innerHTML += `<li class="py-2 flex justify-between"><span>Voucher <strong>#${v.voucher_number}</strong> - ${v.students ? v.students.full_name : 'Student'}</span> <span class="font-mono text-green-700 font-bold">PKR ${v.amount_due} (Due: ${v.due_date})</span></li>`;
    });
  } else {
    listElement.innerHTML = '<li class="text-gray-500 py-2">No active vouchers generated.</li>';
  }
}

async function addVoucher() {
  const studentId = document.getElementById('voucher-student-select').value;
  const amount = document.getElementById('voucher-amount').value;
  const dueDate = document.getElementById('voucher-due').value;

  if (!studentId || !amount || !dueDate) return alert("Fill in all voucher details.");

  // Get academy_id for the selected student
  const { data: student } = await supabase.from('students').select('academy_id').eq('id', studentId).single();
  const voucherNum = 'VCH-' + Math.floor(100000 + Math.random() * 900000);

  const { error } = await supabase.from('fee_vouchers').insert([{
    academy_id: student.academy_id,
    student_id: studentId,
    voucher_number: voucherNum,
    amount_due: amount,
    due_date: dueDate
  }]);

  if (error) alert(error.message);
  else {
    document.getElementById('voucher-amount').value = '';
    document.getElementById('voucher-due').value = '';
    loadVouchers();
  }
}

// Initialize session
checkAuth();
