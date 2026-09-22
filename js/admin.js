// js/admin.js
import { supabase, checkIsAdmin, ADMIN_EMAIL } from './config.js';

// စာမျက်နှာ စတင်ချိန်တွင် Admin ဟုတ်/မဟုတ် စစ်ဆေးခြင်း
async function initAdminAuth() {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) {
    alert("Admin အကောင့်ဖြင့်သာ ဝင်ရောက်ခွင့်ရှိပါသည်။");
    window.location.href = "login.html";
    return;
  }
  document.getElementById('adminEmailDisplay').innerText = `Logged in as: ${ADMIN_EMAIL}`;
  loadSettings();
}

// လက်ရှိ Settings Data များကို ဆွဲထုတ်ပြသခြင်း
async function loadSettings() {
  const { data, error } = await supabase
    .from('system_settings')
    .select('*')
    .eq('id', 'main_settings')
    .single();

  if (error) {
    console.error("Error loading settings:", error);
    return;
  }

  if (data) {
    document.getElementById('providerUrl').value = data.provider_url || '';
    document.getElementById('providerApiKey').value = data.provider_api_key || '';
    document.getElementById('kpayNumber').value = data.kpay_number || '';
    document.getElementById('kpayName').value = data.kpay_name || '';
    document.getElementById('waveNumber').value = data.wave_number || '';
    document.getElementById('waveName').value = data.wave_name || '';
  }
}

// Settings များကို Save လုပ်ခြင်း
document.getElementById('settingsForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const updates = {
    provider_url: document.getElementById('providerUrl').value,
    provider_api_key: document.getElementById('providerApiKey').value,
    kpay_number: document.getElementById('kpayNumber').value,
    kpay_name: document.getElementById('kpayName').value,
    wave_number: document.getElementById('waveNumber').value,
    wave_name: document.getElementById('waveName').value,
    updated_at: new Date().toISOString()
  };

  const { error } = await supabase
    .from('system_settings')
    .update(updates)
    .eq('id', 'main_settings');

  if (error) {
    alert("Save လုပ်ရာတွင် အမှားအယွင်းရှိပါသည်: " + error.message);
  } else {
    alert("Settings များကို အောင်မြင်စွာ ပြင်ဆင်ပြီးပါပြီ။");
  }
});

// Logout ပြုလုပ်ခြင်း
document.getElementById('logoutBtn').addEventListener('click', async () => {
  await supabase.auth.signOut();
  window.location.href = "login.html";
});

// Run Init
initAdminAuth();
          
