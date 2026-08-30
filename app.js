// ==========================================
// 1. SUPABASE INITIALIZATION
// ==========================================
const SUPABASE_URL = 'https://wscaiebgqxgtfbisamyc.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_NSF28nhImZqYL9_3RUTmFg_yDANCLr6';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

let allStudentsCache = [];

// ==========================================
// 2. AUTHENTICATION & PAGE GUARD
// ==========================================
async function checkAuthPage() {
  const { data: { session } } = await supabase.auth.getSession();
  const currentPath = window.location.pathname;

  if (!session && !currentPath.endsWith('index.html') && currentPath !== '/' && currentPath !== '') {
    window.location.href = 'index.html';
  } else if (session && (currentPath.endsWith('index.html') || currentPath === '/' || currentPath === '')) {
    window.location.href = 'dashboard.html';
  } else if (session) {
    loadGlobalBranding();
  }
}

async function login(event) {
  if (event) event.preventDefault();

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const loginBtn = document.getElementById('login-btn');

  if (!email || !password) {
    alert("Please enter both email and password.");
    return;
  }

  loginBtn.innerText = "Logging in...";
  loginBtn.disabled = true;

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  loginBtn.innerText = "Log In";
  loginBtn.disabled = false;

  if (error) {
    alert("Login Error: " + error.message);
  } else {
    window.location.href = 'dashboard.html';
  }
}

async function logout() {
  await supabase.auth.signOut();
  window.location.href = 'index.html';
}

// ==========================================
// 3. GLOBAL BRANDING (Header Logo & Name)
// ==========================================
async function loadGlobalBranding() {
  const { data } = await supabase.from('school_settings').select('*').limit(1).single();
  if (data) {
    const nameEl = document.getElementById('header-school-name');
    const logoEl = document.getElementById('header-logo');

    if (nameEl && data.school_name) nameEl.innerText = data.school_name;
    if (logoEl && data.logo_url) {
      logoEl.src = data.logo_url;
      logoEl.classList.remove('hidden');
    }

    // Set preview name in printable voucher if present
    const pvSchoolName = document.getElementById('pv-school-name');
    if (pvSchoolName && data.school_name) pvSchoolName.innerText = data.school_name;
  }
}

// ==========================================
// 4. SCHOOL SETTINGS & LOGO UPLOAD
// ==========================================
async function loadSchoolSettingsForm() {
  const { data, error } = await supabase.from('school_settings').select('*').limit(1).single();
  
  if (data) {
    const nameInput = document.getElementById('set-name');
    const phoneInput = document.getElementById('set-phone');
    const emailInput = document.getElementById('set-email');
    const addressInput = document.getElementById('set-address');
    const previewImg = document.getElementById('current-logo-preview');

    if (nameInput) nameInput.value = data.school_name || '';
    if (phoneInput) phoneInput.value = data.phone || '';
    if (emailInput) emailInput.value = data.email || '';
    if (addressInput) addressInput.value = data.address || '';
    
    if (previewImg && data.logo_url) {
      previewImg.src = data.logo_url;
      previewImg.classList.remove('hidden');
    }

    loadGlobalBranding();
  }
}

async function saveSchoolSettings(event) {
  event.preventDefault();

  const name = document.getElementById('set-name').value;
  const phone = document.getElementById('set-phone').value;
  const email = document.getElementById('set-email').value;
  const address = document.getElementById('set-address').value;
  const fileInput = document.getElementById('set-logo-file');

  const btn = document.getElementById('save-settings-btn');
  btn.innerText = "Saving & Uploading...";
  btn.disabled = true;

  const { data: current } = await supabase.from('school_settings').select('id, logo_url').limit(1).single();
  let logoUrl = current?.logo_url || '';

  if (fileInput.files.length > 0) {
    const file = fileInput.files[0];
    const fileExt = file.name.split('.').pop();
    const filePath = `logo-${Date.now()}.${fileExt}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('school-assets')
      .upload(filePath, file, { cacheControl: '3600', upsert: true });

    if (uploadError) {
      alert("Logo Upload Error: " + uploadError.message);
      btn.innerText = "Save Changes";
      btn.disabled = false;
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from('school-assets')
      .getPublicUrl(filePath);

    logoUrl = publicUrlData.publicUrl;
  }

  const { error } = await supabase.from('school_settings').update({
    school_name: name,
    phone: phone,
    email: email,
    address: address,
    logo_url: logoUrl,
    updated_at: new Date().toISOString()
  }).eq('id', current.id);

  btn.innerText = "Save Changes";
  btn.disabled = false;

  if (error) {
    alert("Error updating settings: " + error.message);
  } else {
    alert("School details updated successfully!");
    loadSchoolSettingsForm();
  }
}

// ==========================================
// 5. ACADEMIES & FINANCE OFFICERS
// ==========================================
async function loadAcademiesList() {
  const tableBody = document.getElementById('academies-table-body');
  if (!tableBody) return;

  const { data, error } = await supabase.from('academies').select('*').order('created_at', { ascending: false });

  if (error) {
    tableBody.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-red-500">Error: ${error.message}</td></tr>`;
    return;
  }

  if (!data || data.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-gray-400">No branches added yet.</td></tr>`;
    return;
  }

  tableBody.innerHTML = data.map(branch => `
    <tr class="border-b hover:bg-gray-50">
      <td class="p-3 font-medium text-gray-800">${branch.name}</td>
      <td class="p-3"><span class="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-md font-mono">${branch.code}</span></td>
      <td class="p-3">${branch.finance_person_name || '<span class="text-gray-400">Unassigned</span>'}</td>
      <td class="p-3 text-xs">
        <div>${branch.finance_person_email || ''}</div>
        <div class="text-gray-400">${branch.finance_person_phone || ''}</div>
      </td>
    </tr>
  `).join('');
}

async function saveAcademy(event) {
  event.preventDefault();

  const name = document.getElementById('academy-name').value.trim();
  const code = document.getElementById('academy-code').value.trim();
  const financeName = document.getElementById('finance-name').value.trim();
  const financeEmail = document.getElementById('finance-email').value.trim();
  const financePhone = document.getElementById('finance-phone').value.trim();

  const btn = document.getElementById('save-academy-btn');
  btn.innerText = "Saving...";
  btn.disabled = true;

  const { error } = await supabase.from('academies').insert([{
    name: name,
    code: code,
    finance_person_name: financeName,
    finance_person_email: financeEmail,
    finance_person_phone: financePhone
  }]);

  btn.innerText = "Add Branch & Assign Finance";
  btn.disabled = false;

  if (error) {
    alert("Error adding academy: " + error.message);
  } else {
    alert("Academy and finance officer added successfully!");
    document.getElementById('academy-name').value = '';
    document.getElementById('academy-code').value = '';
    document.getElementById('finance-name').value = '';
    document.getElementById('finance-email').value = '';
    document.getElementById('finance-phone').value = '';
    loadAcademiesList();
  }
}

// ==========================================
// 6. STUDENT MANAGEMENT
// ==========================================
async function loadAcademyDropdown() {
  const select = document.getElementById('student-academy-select');
  if (!select) return;

  const { data, error } = await supabase.from('academies').select('id, name, code').order('name');

  if (error || !data || data.length === 0) {
    select.innerHTML = `<option value="">No academies found (Add one first)</option>`;
    return;
  }

  select.innerHTML = `<option value="">-- Select Branch --</option>` + 
    data.map(branch => `<option value="${branch.id}">${branch.name} (${branch.code})</option>`).join('');
}

async function loadStudentsList() {
  const tableBody = document.getElementById('students-table-body');
  if (!tableBody) return;

  const { data, error } = await supabase
    .from('students')
    .select('*, academies(name, code)')
    .order('created_at', { ascending: false });

  if (error) {
    tableBody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-red-500">Error: ${error.message}</td></tr>`;
    return;
  }

  allStudentsCache = data || [];
  renderStudentsTable(allStudentsCache);
}

function renderStudentsTable(students) {
  const tableBody = document.getElementById('students-table-body');
  if (!tableBody) return;

  if (students.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-gray-400">No student records found.</td></tr>`;
    return;
  }

  tableBody.innerHTML = students.map(student => `
    <tr class="border-b hover:bg-gray-50">
      <td class="p-3"><span class="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-md font-mono border">${student.roll_number}</span></td>
      <td class="p-3 font-medium text-gray-800">${student.full_name}</td>
      <td class="p-3 text-xs"><span class="bg-emerald-50 text-emerald-700 px-2 py-1 rounded border border-emerald-200">${student.academies ? student.academies.name : 'N/A'}</span></td>
      <td class="p-3">${student.class_grade || '<span class="text-gray-400">-</span>'}</td>
      <td class="p-3 text-xs text-gray-500">${student.guardian_phone || '<span class="text-gray-400">-</span>'}</td>
    </tr>
  `).join('');
}

function filterStudents() {
  const query = document.getElementById('student-search-input').value.toLowerCase();
  const filtered = allStudentsCache.filter(s => 
    s.full_name.toLowerCase().includes(query) || 
    s.roll_number.toLowerCase().includes(query)
  );
  renderStudentsTable(filtered);
}

async function saveStudent(event) {
  event.preventDefault();

  const academyId = document.getElementById('student-academy-select').value;
  const fullName = document.getElementById('student-name').value.trim();
  const rollNumber = document.getElementById('student-roll').value.trim();
  const classGrade = document.getElementById('student-grade').value.trim();
  const guardianPhone = document.getElementById('student-phone').value.trim();

  if (!academyId) {
    alert("Please select a branch / academy.");
    return;
  }

  const btn = document.getElementById('save-student-btn');
  btn.innerText = "Saving...";
  btn.disabled = true;

  const { error } = await supabase.from('students').insert([{
    academy_id: academyId,
    full_name: fullName,
    roll_number: rollNumber,
    class_grade: classGrade,
    guardian_phone: guardianPhone
  }]);

  btn.innerText = "Enroll Student";
  btn.disabled = false;

  if (error) {
    alert("Error enrolling student: " + error.message);
  } else {
    alert("Student enrolled successfully!");
    document.getElementById('student-name').value = '';
    document.getElementById('student-roll').value = '';
    document.getElementById('student-grade').value = '';
    document.getElementById('student-phone').value = '';
    loadStudentsList();
  }
}

// ==========================================
// 7. FEE VOUCHERS
// ==========================================
async function loadStudentDropdownForVoucher() {
  const select = document.getElementById('voucher-student-select');
  if (!select) return;

  const { data, error } = await supabase
    .from('students')
    .select('id, full_name, roll_number, academy_id, academies(name)')
    .order('full_name');

  if (error || !data || data.length === 0) {
    select.innerHTML = `<option value="">No students available</option>`;
    return;
  }

  select.innerHTML = `<option value="">-- Select Student --</option>` + 
    data.map(s => `<option value="${s.id}" data-academy="${s.academy_id}">${s.full_name} (${s.roll_number}) - ${s.academies ? s.academies.name : ''}</option>`).join('');
}

function updateTotalFee() {
  const tuition = parseFloat(document.getElementById('voucher-tuition').value) || 0;
  const other = parseFloat(document.getElementById('voucher-other').value) || 0;
  const total = tuition + other;
  
  const display = document.getElementById('voucher-total-display');
  if (display) display.innerText = `$${total.toFixed(2)}`;
}

async function saveVoucher(event) {
  event.preventDefault();

  const studentSelect = document.getElementById('voucher-student-select');
  const studentId = studentSelect.value;
  const selectedOption = studentSelect.options[studentSelect.selectedIndex];
  const academyId = selectedOption ? selectedOption.getAttribute('data-academy') : null;

  const issueDate = document.getElementById('voucher-issue-date').value;
  const dueDate = document.getElementById('voucher-due-date').value;
  const tuitionFee = parseFloat(document.getElementById('voucher-tuition').value) || 0;
  const otherFee = parseFloat(document.getElementById('voucher-other').value) || 0;
  const totalAmount = tuitionFee + otherFee;

  if (!studentId || !academyId) {
    alert("Please select a valid student.");
    return;
  }

  const btn = document.getElementById('save-voucher-btn');
  btn.innerText = "Generating...";
  btn.disabled = true;

  const voucherNo = `VCH-${Date.now().toString().slice(-6)}`;

  const { error } = await supabase.from('vouchers').insert([{
    voucher_no: voucherNo,
    student_id: studentId,
    academy_id: academyId,
    issue_date: issueDate,
    due_date: dueDate,
    tuition_fee: tuitionFee,
    other_fee: otherFee,
    total_amount: totalAmount,
    status: 'Unpaid'
  }]);

  btn.innerText = "Generate Voucher";
  btn.disabled = false;

  if (error) {
    alert("Error creating voucher: " + error.message);
  } else {
    alert(`Voucher ${voucherNo} generated!`);
    document.getElementById('voucher-tuition').value = '';
    document.getElementById('voucher-other').value = '';
    updateTotalFee();
    loadVouchersList();
  }
}

async function loadVouchersList() {
  const tableBody = document.getElementById('vouchers-table-body');
  if (!tableBody) return;

  const { data, error } = await supabase
    .from('vouchers')
    .select('*, students(full_name, roll_number), academies(name, finance_person_name, finance_person_email, finance_person_phone)')
    .order('created_at', { ascending: false });

  if (error) {
    tableBody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-red-500">Error: ${error.message}</td></tr>`;
    return;
  }

  if (!data || data.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-gray-400">No vouchers generated yet.</td></tr>`;
    return;
  }

  tableBody.innerHTML = data.map(v => `
    <tr class="border-b hover:bg-gray-50">
      <td class="p-3 font-mono font-semibold text-indigo-600">${v.voucher_no}</td>
      <td class="p-3 font-medium text-gray-800">${v.students ? v.students.full_name : 'N/A'}</td>
      <td class="p-3 text-xs text-gray-500">${v.academies ? v.academies.name : 'N/A'}</td>
      <td class="p-3 text-xs text-red-600">${v.due_date}</td>
      <td class="p-3 font-mono font-bold">$${parseFloat(v.total_amount).toFixed(2)}</td>
      <td class="p-3 text-center">
        <button onclick='previewVoucher(${JSON.stringify(v).replace(/'/g, "&apos;")})' class="bg-blue-100 text-blue-700 px-3 py-1 rounded text-xs hover:bg-blue-200">
          View & Print
        </button>
      </td>
    </tr>
  `).join('');
}

function previewVoucher(voucher) {
  document.getElementById('pv-voucher-no').innerText = voucher.voucher_no;
  document.getElementById('pv-branch-name').innerText = voucher.academies ? voucher.academies.name : '';
  document.getElementById('pv-student-name').innerText = voucher.students ? voucher.students.full_name : '-';
  document.getElementById('pv-roll-no').innerText = voucher.students ? voucher.students.roll_number : '-';
  document.getElementById('pv-issue-date').innerText = voucher.issue_date;
  document.getElementById('pv-due-date').innerText = voucher.due_date;
  document.getElementById('pv-tuition').innerText = `$${parseFloat(voucher.tuition_fee).toFixed(2)}`;
  document.getElementById('pv-other').innerText = `$${parseFloat(voucher.other_fee).toFixed(2)}`;
  document.getElementById('pv-total').innerText = `$${parseFloat(voucher.total_amount).toFixed(2)}`;

  if (voucher.academies) {
    const name = voucher.academies.finance_person_name || 'Finance Dept';
    const email = voucher.academies.finance_person_email || '';
    const phone = voucher.academies.finance_person_phone || '';
    document.getElementById('pv-finance-info').innerText = `${name} | ${email} ${phone}`;
  }

  const wrapper = document.getElementById('printable-voucher-wrapper');
  wrapper.classList.remove('hidden');
  wrapper.scrollIntoView({ behavior: 'smooth' });
}

// ==========================================
// 8. AUTO-EXECUTE AUTH CHECK ON SCRIPT LOAD
// ==========================================
checkAuthPage();
