// js/admin.js
import { supabase, checkIsAdmin } from './config.js';

// ==========================================
// 1. Init App
// ==========================================
async function initAdminAuth() {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) {
    alert("Admin Only!");
    window.location.href = "login.html";
    return;
  }
  
  loadAdminOrders();
  loadPendingDeposits();
  loadSettings();
  loadUsers();
}

document.getElementById('logoutBtn')?.addEventListener('click', async () => {
  await supabase.auth.signOut();
  window.location.href = "login.html";
});


// ==========================================
// 2. Load Stats & Users List
// ==========================================
async function loadUsers() {
  const tbody = document.getElementById('usersTableBody');
  if (!tbody) return;

  const { data: users, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
  if (error || !users) return;

  if(document.getElementById('statUsers')) {
    document.getElementById('statUsers').innerText = users.length;
  }

  tbody.innerHTML = '';
  users.forEach(u => {
    const roleBadge = u.role === 'admin' 
      ? '<span class="bg-purple-100 text-purple-600 px-2 py-0.5 rounded text-[10px] font-bold">ADMIN</span>' 
      : '<span class="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold">USER</span>';
    const date = new Date(u.created_at).toLocaleDateString();
    
    tbody.innerHTML += `
      <tr class="hover:bg-slate-50">
        <td class="py-3 px-2 font-medium text-slate-700">${u.email}</td>
        <td class="py-3 px-2">${roleBadge}</td>
        <td class="py-3 px-2 font-bold text-emerald-600">${Number(u.balance || 0).toLocaleString()} Ks</td>
        <td class="py-3 px-2 text-slate-500">${date}</td>
      </tr>
    `;
  });
}


// ==========================================
// 3. Load Orders
// ==========================================
async function loadAdminOrders() {
  const container = document.getElementById('ordersContainer');
  if (!container) return;

  const { data: orders } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
  if (!orders || orders.length === 0) {
    container.innerHTML = '<p class="text-center text-sm text-slate-500 py-4">အော်ဒါများ မရှိသေးပါ။</p>';
    return;
  }

  // Stats
  if(document.getElementById('statTotalOrders')) {
    document.getElementById('statTotalOrders').innerText = orders.length;
    document.getElementById('statCompleted').innerText = orders.filter(o => o.status === 'completed').length;
    const rev = orders.filter(o => o.status === 'completed').reduce((sum, curr) => sum + Number(curr.charge || 0), 0);
    document.getElementById('statRevenue').innerText = `K ${rev.toLocaleString()}`;
  }

  container.innerHTML = '';
  orders.forEach(order => {
    let statusColor = 'text-amber-600 bg-amber-50';
    if(order.status === 'completed') statusColor = 'text-emerald-600 bg-emerald-50';
    if(order.status === 'cancelled') statusColor = 'text-rose-600 bg-rose-50';

    container.innerHTML += `
      <div class="bg-white p-4 rounded-3xl card-shadow border border-slate-100 space-y-3">
        <div class="flex justify-between items-start">
          <div class="flex items-center gap-2">
            <span class="font-black text-blue-600 text-base">#${order.id.slice(0, 4).toUpperCase()}</span>
            <span class="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-mono">PID: #${order.provider_order_id || 'N/A'}</span>
          </div>
          <span class="text-xs font-bold px-3 py-1 rounded-full ${statusColor}">${order.status.toUpperCase()}</span>
        </div>
        <div>
          <h3 class="text-sm font-bold text-slate-800">${order.service_name}</h3>
          <a href="${order.target_link}" target="_blank" class="text-xs text-blue-500 hover:underline mt-1 block truncate">🔗 ${order.target_link}</a>
        </div>
        <div class="flex justify-between items-center text-sm border-t border-slate-100 pt-3">
          <span class="font-semibold text-slate-600">Qty: ${order.quantity}</span>
          <span class="font-bold text-blue-600">${Number(order.charge).toLocaleString()} Ks</span>
        </div>
        <div class="flex flex-wrap gap-2 pt-2 justify-center">
          <button onclick="updateOrderStatus('${order.id}', 'pending')" class="text-[10px] font-bold px-3 py-1.5 rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50">Pending</button>
          <button onclick="updateOrderStatus('${order.id}', 'processing')" class="text-[10px] font-bold px-3 py-1.5 rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50">Processing</button>
          <button onclick="updateOrderStatus('${order.id}', 'completed')" class="text-[10px] font-bold px-3 py-1.5 rounded-full bg-emerald-600 text-white">Completed</button>
          <button onclick="updateOrderStatus('${order.id}', 'cancelled')" class="text-[10px] font-bold px-3 py-1.5 rounded-full bg-rose-100 text-rose-600">Canceled</button>
        </div>
      </div>
    `;
  });
}

window.updateOrderStatus = async function(id, status) {
  if(!confirm(`Change to ${status}?`)) return;
  await supabase.from('orders').update({ status }).eq('id', id);
  loadAdminOrders();
};


// ==========================================
// 4. Deposits
// ==========================================
window.loadPendingDeposits = async function() {
  const tbody = document.getElementById('depositTableBody');
  if (!tbody) return;

  const { data: deposits } = await supabase.from('deposits').select('*').eq('status', 'pending').order('created_at', { ascending: false });
  
  if (!deposits || deposits.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-slate-500">No pending deposits.</td></tr>';
    return;
  }

  tbody.innerHTML = '';
  deposits.forEach(dep => {
    tbody.innerHTML += `
      <tr class="hover:bg-slate-50">
        <td class="py-3 px-2 font-medium text-slate-700">${dep.user_email}</td>
        <td class="py-3 px-2 text-amber-600 text-xs">${dep.payment_method}</td>
        <td class="py-3 px-2 font-bold text-emerald-600">${Number(dep.amount).toLocaleString()} Ks</td>
        <td class="py-3 px-2 text-slate-400 font-mono text-[10px]">${dep.sender_name || '-'}</td>
        <td class="py-3 px-2 space-x-1">
          <button onclick="approveDeposit('${dep.id}', '${dep.user_id}', ${dep.amount})" class="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs font-bold">Approve</button>
          <button onclick="rejectDeposit('${dep.id}')" class="px-2 py-1 bg-rose-100 text-rose-700 rounded text-xs font-bold">Reject</button>
        </td>
      </tr>
    `;
  });
};

window.approveDeposit = async function(depositId, userId, amount) {
  if (!confirm(`ဒီအကောင့်ထဲသို့ ${amount} Ks ဖြည့်သွင်းပေးရန် သေချာပါသလား?`)) return;

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('balance')
    .eq('id', userId)
    .single();

  if (profileError) {
    alert("Profile ရှာမတွေ့ပါ! (ဒီအကောင့်သည် RLS Error တက်နေချိန်က ဖွင့်ခဲ့သော အကောင့်ဖြစ်နိုင်ပါသည်။ အကောင့်သစ်ဖွင့်၍ စမ်းသပ်ပါ။)");
    return;
  }

  const currentBal = Number(profile?.balance || 0);
  const newBal = currentBal + Number(amount);

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ balance: newBal })
    .eq('id', userId);

  if (updateError) {
    alert("Balance Update လုပ်ရာတွင် အမှားရှိပါသည်: " + updateError.message);
    return;
  }

  await supabase.from('deposits').update({ status: 'approved' }).eq('id', depositId);
  alert("ငွေဖြည့်သွင်းခြင်း အောင်မြင်ပါသည်။");
  loadPendingDeposits();
  loadUsers();
};

window.rejectDeposit = async function(depositId) {
  if (!confirm("Reject this deposit?")) return;
  await supabase.from('deposits').update({ status: 'rejected' }).eq('id', depositId);
  loadPendingDeposits();
};


// ==========================================
// 5. Settings
// ==========================================
async function loadSettings() {
  const { data } = await supabase.from('system_settings').select('*').eq('id', 'main_settings').single();
  if (data) {
    document.getElementById('providerUrl').value = data.provider_url || '';
    document.getElementById('providerApiKey').value = data.provider_api_key || '';
    document.getElementById('kpayNumber').value = data.kpay_number || '';
    document.getElementById('kpayName').value = data.kpay_name || '';
    document.getElementById('waveNumber').value = data.wave_number || '';
    document.getElementById('waveName').value = data.wave_name || '';
  }
}

document.getElementById('settingsForm')?.addEventListener('submit', async (e) => {
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
  await supabase.from('system_settings').update(updates).eq('id', 'main_settings');
  alert("Settings Saved!");
});


// ==========================================
// 6. Add Service
// ==========================================
document.getElementById('addServiceForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const btn = document.getElementById('saveServiceBtn');
  if(btn) {
    btn.disabled = true;
    btn.innerText = "Saving...";
  }

  const providerInput = document.getElementById('s_provider_id');
  const noteInput = document.getElementById('s_note');
  
  const serviceData = {
    platform: document.getElementById('s_platform').value,
    category: document.getElementById('s_category').value,
    name: document.getElementById('s_name').value,
    api_provider: document.getElementById('s_api_provider').value,
    provider_service_id: providerInput ? providerInput.value : "",
    rate: parseFloat(document.getElementById('s_rate').value),
    time: document.getElementById('s_time').value,
    min_qty: parseInt(document.getElementById('s_min').value),
    max_qty: parseInt(document.getElementById('s_max').value),
    note: noteInput ? noteInput.value : ""
  };
  
  const { error } = await supabase.from('services').insert([serviceData]);
  
  if (error) {
    alert("Service သိမ်းဆည်းရာတွင် အမှားရှိပါသည်: " + error.message);
  } else {
    alert("Service အသစ် အောင်မြင်စွာ ထည့်သွင်းပြီးပါပြီ။");
    e.target.reset();
  }

  if(btn) {
    btn.disabled = false;
    btn.innerText = "Save Service";
  }
});

// Run Init
initAdminAuth();
    
