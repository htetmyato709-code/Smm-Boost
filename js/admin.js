// js/admin.js
import { supabase, checkIsAdmin, ADMIN_EMAIL } from './config.js';

// ==========================================
// 1. Admin Authentication & Initialization
// ==========================================
async function initAdminAuth() {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) {
    alert("Admin အကောင့်ဖြင့်သာ ဝင်ရောက်ခွင့်ရှိပါသည်။");
    window.location.href = "login.html";
    return;
  }
  
  const emailDisplay = document.getElementById('adminEmailDisplay');
  if (emailDisplay) emailDisplay.innerText = `Logged in as: ${ADMIN_EMAIL}`;

  // စာမျက်နှာရှိ Element များအလိုက် Data များ ဆွဲထုတ်ရန်
  if (document.getElementById('settingsForm')) loadSettings();
  if (document.getElementById('depositTableBody')) loadPendingDeposits();
  if (document.getElementById('ordersContainer')) loadAdminOrders();
}

// Logout
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.href = "login.html";
  });
}


// ==========================================
// 2. Orders Management (Light Theme UI)
// ==========================================
async function loadAdminOrders() {
  const container = document.getElementById('ordersContainer');
  if (!container) return;

  const { data: orders, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });

  if (error || !orders || orders.length === 0) {
    container.innerHTML = '<p class="text-center text-sm text-slate-500 py-4">အော်ဒါများ မရှိသေးပါ။</p>';
    return;
  }

  // Dashboard Stats တွက်ချက်ခြင်း
  if (document.getElementById('statTotalOrders')) {
    document.getElementById('statTotalOrders').innerText = orders.length;
    document.getElementById('statPending').innerText = orders.filter(o => o.status === 'pending' || o.status === 'processing').length;
    document.getElementById('statCompleted').innerText = orders.filter(o => o.status === 'completed').length;
    const totalRev = orders.filter(o => o.status === 'completed').reduce((sum, current) => sum + Number(current.charge || 0), 0);
    document.getElementById('statRevenue').innerText = `K ${totalRev.toLocaleString()}`;
  }

  container.innerHTML = '';

  orders.forEach(order => {
    let statusColor = 'text-amber-600 bg-amber-50';
    if(order.status === 'completed') statusColor = 'text-emerald-600 bg-emerald-50';
    if(order.status === 'cancelled') statusColor = 'text-rose-600 bg-rose-50';

    const card = document.createElement('div');
    card.className = "bg-white p-4 rounded-3xl card-shadow border border-slate-100 space-y-3";
    card.innerHTML = `
      <div class="flex justify-between items-start">
        <div class="flex items-center gap-2">
          <span class="font-black text-blue-600 text-base">#${order.id.slice(0, 4).toUpperCase()}</span>
          <span class="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-mono">PID: #${order.provider_order_id || 'N/A'}</span>
        </div>
        <span class="text-xs font-bold px-3 py-1 rounded-full ${statusColor}">${order.status.charAt(0).toUpperCase() + order.status.slice(1)}</span>
      </div>
      
      <div>
        <h3 class="text-sm font-bold text-slate-800 leading-tight">${order.service_name}</h3>
        <a href="${order.target_link}" target="_blank" class="text-xs text-blue-500 hover:underline mt-1 block truncate">🔗 ${order.target_link}</a>
      </div>

      <div class="flex justify-between items-center text-sm border-t border-slate-100 pt-3">
        <span class="font-semibold text-slate-600">Qty: ${order.quantity}</span>
        <span class="font-bold text-blue-600">${Number(order.charge).toLocaleString()} Ks</span>
      </div>

      <div class="flex flex-wrap gap-2 pt-2 justify-center">
        <button onclick="updateOrderStatus('${order.id}', 'pending')" class="text-[10px] font-bold px-3 py-1.5 rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50">Pending</button>
        <button onclick="updateOrderStatus('${order.id}', 'processing')" class="text-[10px] font-bold px-3 py-1.5 rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50">Processing</button>
        <button onclick="updateOrderStatus('${order.id}', 'completed')" class="text-[10px] font-bold px-3 py-1.5 rounded-full bg-emerald-600 text-white shadow-md shadow-emerald-500/20">Completed</button>
        <button onclick="updateOrderStatus('${order.id}', 'cancelled')" class="text-[10px] font-bold px-3 py-1.5 rounded-full bg-rose-100 text-rose-600">Canceled (Refund)</button>
      </div>
    `;
    container.appendChild(card);
  });
}

window.updateOrderStatus = async function(id, status) {
  if(!confirm(`Order Status အား ${status} သို့ပြောင်းရန် သေချာပါသလား?`)) return;
  await supabase.from('orders').update({ status: status }).eq('id', id);
  loadAdminOrders();
};


// ==========================================
// 3. Add Service (Services Management)
// ==========================================
const addServiceForm = document.getElementById('addServiceForm');
if (addServiceForm) {
  addServiceForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const serviceData = {
      platform: document.getElementById('s_platform').value,
      category: document.getElementById('s_category').value,
      name: document.getElementById('s_name').value,
      api_provider: document.getElementById('s_api_provider').value,
      provider_service_id: document.getElementById('s_provider_id').value,
      rate: parseFloat(document.getElementById('s_rate').value),
      time: document.getElementById('s_time').value,
      min_qty: parseInt(document.getElementById('s_min').value),
      max_qty: parseInt(document.getElementById('s_max').value),
      note: document.getElementById('s_note').value
    };

    const { error } = await supabase.from('services').insert([serviceData]);

    if (error) {
      alert("Service သိမ်းဆည်းရာတွင် အမှားရှိပါသည်: " + error.message);
    } else {
      alert("Service အသစ် အောင်မြင်စွာ ထည့်သွင်းပြီးပါပြီ။");
      addServiceForm.reset();
    }
  });
}


// ==========================================
// 4. Deposits / Topup Management
// ==========================================
export async function loadPendingDeposits() {
  const tbody = document.getElementById('depositTableBody');
  if (!tbody) return;
  
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
    tr.className = "hover:bg-slate-50"; // Light theme color adjustment
    tr.innerHTML = `
      <td class="py-3 px-2 font-medium text-slate-800">${dep.user_email}</td>
      <td class="py-3 px-2 text-amber-600">${dep.payment_method}</td>
      <td class="py-3 px-2 font-bold text-emerald-600">${Number(dep.amount).toLocaleString()} MMK</td>
      <td class="py-3 px-2 text-slate-500 font-mono text-xs">${dep.transaction_id}</td>
      <td class="py-3 px-2">
        ${dep.screenshot_url ? `<a href="${dep.screenshot_url}" target="_blank" class="text-blue-500 underline text-xs">View Slip</a>` : '-'}
      </td>
      <td class="py-3 px-2 text-right space-x-2">
        <button onclick="approveDeposit('${dep.id}', '${dep.user_id}', ${dep.amount})" class="px-3 py-1 bg-emerald-100 text-emerald-600 border border-emerald-200 rounded-lg hover:bg-emerald-200 text-xs transition">Approve</button>
        <button onclick="rejectDeposit('${dep.id}')" class="px-3 py-1 bg-rose-100 text-rose-600 border border-rose-200 rounded-lg hover:bg-rose-200 text-xs transition">Reject</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

window.approveDeposit = async function(depositId, userId, amount) {
  if (!confirm(`${amount.toLocaleString()} MMK အား အကောင့်ထဲ ဖြည့်သွင်းပေးရန် သေချာပါသလား?`)) return;

  const { data: userProfile } = await supabase.from('profiles').select('balance').eq('id', userId).single();
  const currentBal = Number(userProfile?.balance || 0);

  await supabase.from('profiles').update({ balance: currentBal + Number(amount) }).eq('id', userId);
  await supabase.from('deposits').update({ status: 'approved' }).eq('id', depositId);

  alert("Deposit အား အတည်ပြုပြီး ငွေပေါင်းထည့်ပေးလိုက်ပါပြီ။");
  loadPendingDeposits();
};

window.rejectDeposit = async function(depositId) {
  if (!confirm("ဤ ငွေသွင်းတောင်းဆိုမှုကို ပယ်ဖျက် (Reject) ရန် သေချာပါသလား?")) return;
  await supabase.from('deposits').update({ status: 'rejected' }).eq('id', depositId);
  alert("Deposit ကို ပယ်ဖျက်ပြီးပါပြီ။");
  loadPendingDeposits();
};

window.loadPendingDeposits = loadPendingDeposits;


// ==========================================
// 5. System Settings (Provider API & KPay/Wave)
// ==========================================
async function loadSettings() {
  const { data, error } = await supabase.from('system_settings').select('*').eq('id', 'main_settings').single();
  if (data) {
    document.getElementById('providerUrl').value = data.provider_url || '';
    document.getElementById('providerApiKey').value = data.provider_api_key || '';
    document.getElementById('kpayNumber').value = data.kpay_number || '';
    document.getElementById('kpayName').value = data.kpay_name || '';
    document.getElementById('waveNumber').value = data.wave_number || '';
    document.getElementById('waveName').value = data.wave_name || '';
  }
}

const settingsForm = document.getElementById('settingsForm');
if (settingsForm) {
  settingsForm.addEventListener('submit', async (e) => {
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
    const { error } = await supabase.from('system_settings').update(updates).eq('id', 'main_settings');
    if (error) alert("Save လုပ်ရာတွင် အမှားအယွင်းရှိပါသည်: " + error.message);
    else alert("Settings များကို အောင်မြင်စွာ ပြင်ဆင်ပြီးပါပြီ။");
  });
}

// 6. Start the app checks
initAdminAuth();
    
