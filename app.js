const SUPABASE_URL = 'https://wscaiebgqxgtfbisamyc.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_NSF28nhImZqYL9_3RUTmFg_yDANCLr6';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// 1. PAGE GUARD & SESSION CHECK
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

// 2. LOGIN LOGIC
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

// 3. LOGOUT LOGIC
async function logout() {
  await supabase.auth.signOut();
  window.location.href = 'index.html';
}

// 4. LOAD BRANDING (Logo & School Name on Headers)
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
  }
}

// Automatically check session on script load
checkAuthPage();
