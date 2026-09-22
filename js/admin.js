// js/admin.js
import { supabase, checkIsAdmin } from './config.js';

let allServices = [];

async function initAdminAuth() {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) {
    alert("Admin Only!");
    window.location.href = "login.html";
    return;
  }
  
  loadAdminOrders();
  loadPendingDeposits();
  loadAdminServices();
  loadSettings();
  loadUsers();
}

document.getElementById('logoutBtn')?.addEventListener('click', async () => {
  await supabase.auth.signOut();
  window.location.href = "login.html";
});

// ==========================================
// 1. Orders Management & View Comments
// ==========================================
async function loadAdminOrders() {
  const container = document.getElementById('ordersContainer');
  if (!container) return;

  const { data: orders } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
  if (!orders || orders.length === 0) {
    container.innerHTML = '<p class="text-center text-sm text-slate-500 py-4">အော်ဒါများ မရှိသေးပါ။</p>';
    return;
  }

  // Dashboard Stats
  if (document.getElementById('statTotalOrders')) {
    document.getElementById('statTotalOrders').innerText = orders.length;
    document.getElementById('statCompleted').innerText = orders.filter(o => o.status === 'completed').length;
    const rev = orders.filter(o => o.status === 'completed').reduce((sum, curr) => sum + Number(curr.charge || 0), 0);
    document.getElementById('statRevenue').innerText = `K ${rev.toLocaleString()}`;
  }

  container.innerHTML = '';
  orders.forEach(order => {
    let statusColor = 'text-amber-600 bg-amber-50';
    if (order.status === 'completed') statusColor = 'text-emerald-600 bg-emerald-50';
    if (order.status === 'cancelled') statusColor = 'text-rose-600 bg-rose-50';

    // Comment ခလုတ် ထည့်သွင်းခြင်း
    const commentBtnHtml = order.comments ? `
      <button onclick="viewOrderComments('${encodeURIComponent(order.comments)}')" class="text-[10px] font-bold px-2.5 py-1 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-100 flex items-center gap-1">
        💬 View Comments
      </button>
    ` : '';

    container.innerHTML += `
      <div class="bg-white p-4 rounded-2xl card-shadow border border-slate-100 space-y-2.5">
        <div class="flex justify-between items-start">
          <div class="flex items-center gap-2">
            <span class="font-black text-blue-600 text-sm">#${order.numeric_id || order.id.slice(0, 4)}</span>
            <span class="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">PID: #${order.service_id || 'N/A'}</span>
          </div>
          <span class="text-[10px] font-bold px-2.5 py-0.5 rounded-full ${statusColor}">${order.status.toUpperCase()}</span>
        </div>
        
        <div>
          <h3 class="text-xs font-bold text-slate-800 leading-snug">${order.service_name}</h3>
          <a href="${order.target_link}" target="_blank" class="text-[11px] text-blue-500 hover:underline mt-1 block truncate">🔗 ${order.target_link}</a>
        </div>

        <div class="flex justify-between items-center text-xs border-t border-slate-100 pt-2">
          <span class="font-semibold text-slate-600">Qty: ${order.quantity}</span>
          <div class="flex items-center gap-2">
            ${commentBtnHtml}
            <span class="font-bold text-blue-600">${Number(order.charge).toLocaleString()} Ks</span>
          </div>
        </div>

        <div class="flex flex-wrap gap-1.5 pt-1 justify-end">
          <button onclick="updateOrderStatus('${order.id}', 'pending')" class="text-[10px] font-bold px-2.5 py-1 rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50">Pending</button>
          <button onclick="updateOrderStatus('${order.id}', 'processing')" class="text-[10px] font-bold px-2.5 py-1 rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50">Processing</button>
          <button onclick="updateOrderStatus('${order.id}', 'completed')" class="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-600 text-white">Completed</button>
          <button onclick="updateOrderStatus('${order.id}', 'cancelled')" class="text-[10px] font-bold px-2.5 py-1 rounded-full bg-rose-100 text-rose-600">Cancel</button>
        </div>
      </div>
    `;
  });
}

window.updateOrderStatus = async function(id, status) {
  if (!confirm(`Change to ${status}?`)) return;
  await supabase.from('orders').update({ status }).eq('id', id);
  loadAdminOrders();
};

window.viewOrderComments = function(encodedComments) {
  const comments = decodeURIComponent(encodedComments);
  document.getElementById('commentsModalContent').innerText = comments;
  document.getElementById('commentsModal').classList.remove('hidden');
};

window.closeCommentsModal = function() {
  document.getElementById('commentsModal').classList.add('hidden');
};

// ==========================================
// 2. Services Management (Add, Edit, Delete)
// ==========================================
async function loadAdminServices() {
  const tbody = document.getElementById('servicesTableBody');
  if (!tbody) return;

  const { data: services, error } = await supabase.from('services').select('*').order('numeric_id', { ascending: true });
  if (error || !services) return;

  allServices = services;
  tbody.innerHTML = '';

  if (services.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-slate-400">Service များ မရှိသေးပါ။</td></tr>';
    return;
  }

  services.forEach(s => {
    tbody.innerHTML += `
      <tr class="hover:bg-slate-50">
        <td class="py-2.5 px-2 font-bold text-blue-600">#${s.numeric_id || '-'}</td>
        <td class="py-2.5 px-2 font-medium text-slate-800 max-w-[150px] truncate">${s.name}</td>
        <td class="py-2.5 px-2 text-slate-500">${s.platform}</td>
        <td class="py-2.5 px-2 font-bold text-slate-700">${Number(s.rate).toLocaleString()} Ks</td>
        <td class="py-2.5 px-2 text-right space-x-1">
          <button onclick="editService('${s.id}')" class="px-2 py-1 bg-amber-100 text-amber-700 rounded text-[11px] font-bold hover:bg-amber-200">Edit</button>
          <button onclick="deleteService('${s.id}')" class="px-2 py-1 bg-rose-100 text-rose-700 rounded text-[11px] font-bold hover:bg-rose-200">Delete</button>
        </td>
      </tr>
    `;
  });
}

// Add or Edit Service Submit
document.getElementById('addServiceForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const editId = document.getElementById('edit_service_id').value;
  const btn = document.getElementById('saveServiceBtn');
  btn.disabled = true;
  btn.innerText = "Saving...";

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

  let resError = null;

  if (editId) {
    // Update existing
    const { error } = await supabase.from('services').update(serviceData).eq('id', editId);
    resError = error;
  } else {
    // Insert new
    const { error } = await supabase.from('services').insert([serviceData]);
    resError = error;
  }

  if (resError) {
    alert("Service သိမ်းဆည်းရာတွင် အမှားရှိပါသည်: " + resError.message);
  } else {
    alert(editId ? "Service အောင်မြင်စွာ ပြင်ဆင်ပြီးပါပြီ။" : "Service အသစ် အောင်မြင်စွာ ထည့်သွင်းပြီးပါပြီ။");
    cancelEditService();
    loadAdminServices();
  }

  btn.disabled = false;
  btn.innerText = "Save Service";
});

// Edit Service Form Filler
window.editService = function(id) {
  const service = allServices.find(s => s.id === id);
  if (!service) return;

  document.getElementById('edit_service_id').value = service.id;
  document.getElementById('s_platform').value = service.platform;
  document.getElementById('s_category').value = service.category;
  document.getElementById('s_name').value = service.name;
  document.getElementById('s_api_provider').value = service.api_provider;
  document.getElementById('s_provider_id').value = service.provider_service_id || '';
  document.getElementById('s_rate').value = service.rate;
  document.getElementById('s_time').value = service.time || '';
  document.getElementById('s_min').value = service.min_qty;
  document.getElementById('s_max').value = service.max_qty;
  document.getElementById('s_note').value = service.note || '';

  document.getElementById('serviceFormTitle').innerText = "Service ပြင်ဆင်ရန် (Edit)";
  document.getElementById('saveServiceBtn').innerText = "Update Service";
  document.getElementById('cancelEditBtn').classList.remove('hidden');

  // Scroll to form
  document.getElementById('addServiceForm').scrollIntoView({ behavior: 'smooth' });
};

window.cancelEditService = function() {
  document.getElementById('addServiceForm').reset();
  document.getElementById('edit_service_id').value = '';
  document.getElementById('serviceFormTitle').innerText = "Service အသစ်ထည့်ရန်";
  document.getElementById('saveServiceBtn').innerText = "Save Service";
  document.getElementById('cancelEditBtn').classList.add('hidden');
};

window.deleteService = async function(id) {
  if (!confirm("ဤ Service အား ဖျက်ပစ်ရန် သေချာပါသလား?")) return;
  const { error } = await supabase.from('services').delete().eq('id', id);
  if (error) alert("ဖျက်၍မရပါ: " + error.message);
  else {
    alert("Service ဖျက်ပြီးပါပြီ။");
    loadAdminServices();
  }
};

// ==========================================
// 3. Deposits Management
// ==========================================
window.loadPendingDeposits = async function() {
  const tbody = document.getElementById('depositTableBody');
  if (!tbody) return;

  const { data: deposits } = await supabase.from('deposits').select('*').eq('status', 'pending').order('created_at', { ascending: false });
  if (!deposits || deposits.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-slate-400">ငွေသွင်းတောင်းဆိုမှု မရှိပါ။</td></tr>';
    return;
  }

  tbody.innerHTML = '';
  deposits.forEach(dep => {
    tbody.innerHTML += `
      <tr class="hover:bg-slate-50">
        <td class="py-2.5 px-2 font-medium text-slate-700">${dep.user_email}</td>
        <td class="py-2.5 px-2 text-amber-600 text-xs font-bold">${dep.payment_method}</td>
        <td class="py-2.5 px-2 font-bold text-emerald-600">${Number(dep.amount).toLocaleString()} Ks</td>
        <td class="py-2.5 px-2 text-slate-600">${dep.sender_name || '-'}</td>
        <td class="py-2.5 px-2">
          ${dep.screenshot_url ? `<a href="${dep.screenshot_url}" target="_blank" class="text-blue-600 underline font-semibold text-xs">View Slip</a>` : '-'}
        </td>
        <td class="py-2.5 px-2 text-right space-x-1">
          <button onclick="approveDeposit('${dep.id}', '${dep.user_id}', ${dep.amount})" class="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs font-bold hover:bg-emerald-200">Approve</button>
          <button onclick="rejectDeposit('${dep.id}')" class="px-2 py-1 bg-rose-100 text-rose-700 rounded text-xs font-bold hover:bg-rose-200">Reject</button>
        </td>
      </tr>
    `;
  });
};

window.approveDeposit = async function(depositId, userId, amount) {
  if (!confirm(`ဒီအကောင့်ထဲသို့ ${amount} Ks ဖြည့်သွင်းပေးရန် သေချာပါသလား?`)) return;

  const { data: profile } = await supabase.from('profiles').select('balance').eq('id', userId).single();
  const currentBal = Number(profile?.balance || 0);

  await supabase.from('profiles').update({ balance: currentBal + Number(amount) }).eq('id', userId);
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
// 4. Users List
// ==========================================
async function loadUsers() {
  const tbody = document.getElementById('usersTableBody');
  if (!tbody) return;

  const { data: users } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
  if (!users) return;

  document.getElementById('statUsers').innerText = users.length;
  tbody.innerHTML = '';
  users.forEach(u => {
    const roleBadge = u.role === 'admin' 
      ? '<span class="bg-purple-100 text-purple-600 px-2 py-0.5 rounded text-[10px] font-bold">ADMIN</span>' 
      : '<span class="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold">USER</span>';
    
    tbody.innerHTML += `
      <tr class="hover:bg-slate-50">
        <td class="py-2.5 px-2 font-medium text-slate-700">${u.email}</td>
        <td class="py-2.5 px-2 text-slate-500">${u.phone || '-'}</td>
        <td class="py-2.5 px-2">${roleBadge}</td>
        <td class="py-2.5 px-2 font-bold text-emerald-600">${Number(u.balance || 0).toLocaleString()} Ks</td>
      </tr>
    `;
  });
}

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

initAdminAuth();
      
