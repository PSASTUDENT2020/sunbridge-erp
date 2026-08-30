// Supabase Configuration
const SUPABASE_URL = 'https://wscaiebgqxgtfbisamyc.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_NSF28nhImZqYL9_3RUTmFg_yDANCLr6';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// Login Logic
async function login() {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  if (!email || !password) {
    alert("Please enter both email and password.");
    return;
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  
  if (error) {
    alert("Login failed: " + error.message);
  } else {
    checkAuth();
  }
}

// Logout Logic
async function logout() {
  await supabase.auth.signOut();
  location.reload();
}

// Check Authentication Session on Load
async function checkAuth() {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError) {
    console.error("Session fetch error:", sessionError.message);
    return;
  }

  if (session) {
    // Safely attempt to fetch profile without throwing single-row errors
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .maybeSingle();

    if (profileError) {
      console.warn("Profile fetch warning:", profileError.message);
    }

    document.getElementById('login-box').classList.add('hidden');
    document.getElementById('admin-box').classList.remove('hidden');
    
    // Display profile details or fallback to auth metadata
    const displayName = profile?.full_name || session.user.user_metadata?.full_name || session.user.email;
    const displayRole = profile?.role || 'Super Admin';

    document.getElementById('user-info').innerText = displayName;
    document.getElementById('role-info').innerText = `Role: ${displayRole}`;
    
    loadAcademies();
  }
}

// Fetch Academies and Update UI
async function loadAcademies() {
  const { data: academies, error } = await supabase.from('academies').select('*');
  const listElement = document.getElementById('academy-list');
  const selectElement = document.getElementById('branch-select');

  if (error) {
    console.error("Error loading academies:", error.message);
  }

  listElement.innerHTML = '';
  selectElement.innerHTML = '<option value="">Select Target Branch...</option>';

  if (academies && academies.length > 0) {
    academies.forEach(acad => {
      listElement.innerHTML += `
        <li class="pt-3 pb-3 flex justify-between items-center first:pt-0 last:pb-0">
          <div>
            <span class="font-semibold text-gray-800">${acad.name}</span>
            <span class="ml-2 px-2 py-0.5 text-xs bg-gray-200 text-gray-700 rounded-full font-mono">${acad.code}</span>
          </div>
        </li>`;
      selectElement.innerHTML += `<option value="${acad.id}">${acad.name} (${acad.code})</option>`;
    });
  } else {
    listElement.innerHTML = '<li class="text-gray-500 py-2">No active academies registered.</li>';
  }
}

// Add New Academy Branch
async function addAcademy() {
  const name = document.getElementById('academy-name').value;
  const code = document.getElementById('academy-code').value;

  if (!name || !code) {
    alert("Please enter both Branch Name and Code.");
    return;
  }

  const { error } = await supabase.from('academies').insert([{ name, code }]);

  if (error) {
    alert("Error adding academy: " + error.message);
  } else {
    document.getElementById('academy-name').value = '';
    document.getElementById('academy-code').value = '';
    loadAcademies();
  }
}

// Add Student under Selected Academy
async function addStudent() {
  const academyId = document.getElementById('branch-select').value;
  const name = document.getElementById('student-name').value;
  const roll = document.getElementById('student-roll').value;

  if (!academyId || !name || !roll) {
    alert("Please select a branch and fill in all student details.");
    return;
  }

  const { error } = await supabase.from('students').insert([
    { academy_id: academyId, full_name: name, roll_number: roll }
  ]);

  if (error) {
    alert("Error registering student: " + error.message);
  } else {
    alert("Student registered successfully!");
    document.getElementById('student-name').value = '';
    document.getElementById('student-roll').value = '';
  }
}

// Initialize on page load
checkAuth();
