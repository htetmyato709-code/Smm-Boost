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
          
// js/admin.js ထဲသို့ ပေါင်းထည့်ရန်

// Pending ဖြစ်နေသော Deposits များကို ဆွဲထုတ်ပြသခြင်း
export async function loadPendingDeposits() {
  const tbody = document.getElementById('depositTableBody');
  tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-slate-500">Loading requests...</td></tr>';

  const { data: deposits, error } = await supabase
    .from('deposits')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error || !deposits.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-slate-500">မစစ်ဆေးရသေးသော Deposit မရှိပါ။</td></tr>';
    return;
  }

  tbody.innerHTML = '';
  deposits.forEach((dep) => {
    const tr = document.createElement('tr');
    tr.className = "hover:bg-slate-900/40";
    tr.innerHTML = `
      <td class="py-3 px-2 font-medium text-slate-200">${dep.user_email}</td>
      <td class="py-3 px-2 text-amber-400">${dep.payment_method}</td>
      <td class="py-3 px-2 font-bold text-emerald-400">${Number(dep.amount).toLocaleString()} MMK</td>
      <td class="py-3 px-2 text-slate-300 font-mono text-xs">${dep.transaction_id}</td>
      <td class="py-3 px-2">
        ${dep.screenshot_url ? `<a href="${dep.screenshot_url}" target="_blank" class="text-indigo-400 underline text-xs">View Slip</a>` : '-'}
      </td>
      <td class="py-3 px-2 text-right space-x-2">
        <button onclick="approveDeposit('${dep.id}', '${dep.user_id}', ${dep.amount})" class="px-3 py-1 bg-emerald-600/30 text-emerald-400 border border-emerald-500/40 rounded-lg hover:bg-emerald-600/50 text-xs transition">Approve</button>
        <button onclick="rejectDeposit('${dep.id}')" class="px-3 py-1 bg-rose-600/30 text-rose-400 border border-rose-500/40 rounded-lg hover:bg-rose-600/50 text-xs transition">Reject</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// 1-Click Approve: Status ပြောင်းပြီး User Account ထဲ Balance တိုက်ရိုက်ပေါင်းထည့်ခြင်း
window.approveDeposit = async function(depositId, userId, amount) {
  if (!confirm(`${amount.toLocaleString()} MMK အား အကောင့်ထဲ ဖြည့်သွင်းပေးရန် သေချာပါသလား?`)) return;

  // ၁။ User ရဲ့ လက်ရှိ balance ကို ယူခြင်း
  const { data: userProfile } = await supabase.from('profiles').select('balance').eq('id', userId).single();
  const currentBal = Number(userProfile?.balance || 0);

  // ၂။ Balance အသစ် ထည့်သွင်းခြင်း
  await supabase.from('profiles').update({ balance: currentBal + Number(amount) }).eq('id', userId);

  // ၃။ Deposit status ကို approved ပြောင်းခြင်း
  await supabase.from('deposits').update({ status: 'approved' }).eq('id', depositId);

  alert("Deposit အား အတည်ပြုပြီး ငွေပေါင်းထည့်ပေးလိုက်ပါပြီ။");
  loadPendingDeposits();
};

// 1-Click Reject: Status အား ပယ်ဖျက်ခြင်း
window.rejectDeposit = async function(depositId) {
  if (!confirm("ဤ ငွေသွင်းတောင်းဆိုမှုကို ပယ်ဖျက် (Reject) ရန် သေချာပါသလား?")) return;

  await supabase.from('deposits').update({ status: 'rejected' }).eq('id', depositId);
  alert("Deposit ကို ပယ်ဖျက်ပြီးပါပြီ။");
  loadPendingDeposits();
};

// စတင် run ချိန်တွင် load လုပ်ရန်
window.loadPendingDeposits = loadPendingDeposits;
loadPendingDeposits();
  
