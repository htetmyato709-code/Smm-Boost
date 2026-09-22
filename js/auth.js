// js/auth.js
import { supabase, ADMIN_EMAIL } from './config.js';

// ==========================================
// Signup Form Handler
// ==========================================
const signupForm = document.getElementById('signupForm');
if (signupForm) {
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('signupUsername').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('signupConfirmPassword').value;
    const btn = document.getElementById('signupBtn');
    const errorBox = document.getElementById('errorBox');

    // Password Match စစ်ဆေးခြင်း
    if (password !== confirmPassword) {
      errorBox.innerText = "Passwords မတူညီပါ။ ကျေးဇူးပြု၍ ပြန်လည်စစ်ဆေးပါ။";
      errorBox.classList.remove('hidden');
      return;
    }

    errorBox.classList.add('hidden');
    btn.disabled = true;
    btn.innerText = "Registering...";

    // Supabase တွင် အကောင့်သစ်ဖွင့်ခြင်း
    const { data, error } = await supabase.auth.signUp({ 
      email, 
      password 
    });

    if (error) {
      errorBox.innerText = "အကောင့်ဖွင့်ရာတွင် အမှားရှိပါသည်: " + error.message;
      errorBox.classList.remove('hidden');
      btn.disabled = false;
      btn.innerText = "Sign Up";
    } else {
      // Profiles table ထဲ User အချက်အလက်နှင့် Username သွင်းခြင်း
      if (data.user) {
        await supabase.from('profiles').insert([{
          id: data.user.id,
          username: username, // SQL တွင် Username Column ရှိရန်လိုအပ်သည်
          email: data.user.email,
          balance: 0,
          role: data.user.email === ADMIN_EMAIL ? 'admin' : 'user'
        }]);
      }
      
      // အကောင့်ဖွင့်ခြင်း အောင်မြင်ပါက Form ကိုဖျောက်ပြီး Success Modal ပြမည်
      document.getElementById('signupContainer').classList.add('hidden');
      document.getElementById('displayUsername').innerText = username;
      
      const modal = document.getElementById('successModal');
      const content = document.getElementById('modalContent');
      modal.classList.remove('hidden');
      
      // လှပသော Animation Effect လေးအတွက်
      setTimeout(() => {
        content.classList.remove('scale-95', 'opacity-0');
        content.classList.add('scale-100', 'opacity-100');
      }, 50);
    }
  });
}

// Modal ထဲမှ Login Button ကို နှိပ်လျှင် Login Page သို့သွားရန်
window.goToLogin = function() {
  window.location.href = "login.html";
};


// ==========================================
// Login Form Handler
// ==========================================
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const btn = document.getElementById('loginBtn');
    
    // Login form တွင် error ပြရန် element အသစ် (id='loginError') ရှိလျှင်သုံးမည်။
    const errorBox = document.getElementById('loginError') || null;

    btn.disabled = true;
    btn.innerText = "Logging in...";
    if(errorBox) errorBox.classList.add('hidden');

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      if(errorBox) {
        errorBox.innerText = "အကောင့်ဝင်ရောက်၍ မရပါ: " + error.message;
        errorBox.classList.remove('hidden');
      } else {
        alert("အကောင့်ဝင်ရောက်၍ မရပါ: " + error.message);
      }
      btn.disabled = false;
      btn.innerText = "Log In";
    } else {
      if (data.user.email === ADMIN_EMAIL) {
        window.location.href = "admin-dashboard.html";
      } else {
        window.location.href = "user-dashboard.html";
      }
    }
  });
}
