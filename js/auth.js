// js/auth.js
import { supabase, ADMIN_EMAIL } from './config.js';

// Signup Form Handler
const signupForm = document.getElementById('signupForm');
if (signupForm) {
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const btn = document.getElementById('signupBtn');

    btn.disabled = true;
    btn.innerText = "Registering...";

    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      alert("အကောင့်ဖွင့်ရာတွင် အမှားရှိပါသည်: " + error.message);
      btn.disabled = false;
      btn.innerText = "Sign Up";
    } else {
      // Profiles table ထဲ User အချက်အလက်သွင်းခြင်း
      if (data.user) {
        await supabase.from('profiles').insert([{
          id: data.user.id,
          email: data.user.email,
          balance: 0,
          role: data.user.email === ADMIN_EMAIL ? 'admin' : 'user'
        }]);
      }
      alert("အကောင့်အောင်မြင်စွာ ဖွင့်ပြီးပါပြီ။ Login ဝင်ရောက်နိုင်ပါပြီ။");
      window.location.href = "login.html";
    }
  });
}

// Login Form Handler
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const btn = document.getElementById('loginBtn');

    btn.disabled = true;
    btn.innerText = "Logging in...";

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      alert("အကောင့်ဝင်ရောက်၍ မရပါ: " + error.message);
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
