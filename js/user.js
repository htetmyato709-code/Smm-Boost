// js/user.js
import { supabase, ADMIN_EMAIL } from './config.js';

let currentUser = null;
let currentBalance = 0;
let servicesList = [];
let selectedService = null;

async function initUserDashboard() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  currentUser = user;
  
  if(document.getElementById('userEmailDisplay')) document.getElementById('userEmailDisplay').innerText = user.email;

  if (user.email === ADMIN_EMAIL && document.getElementById('adminPanelLink')) {
    document.getElementById('adminPanelLink').classList.remove('hidden');
    document.getElementById('adminPanelLink').classList.add('flex');
  }

  const { data: profile } = await supabase.from('profiles').select('balance').eq('id', user.id).single();
  if (profile && document.getElementById('userBalanceDisplay')) {
    currentBalance = Number(profile.balance || 0);
    document.getElementById('userBalanceDisplay').innerText = `${currentBalance.toLocaleString()} Ks`;
  }

  await loadServicesFromDB();
}

// ==========================================
// Side Drawer Sidebar လုပ်ဆောင်ချက်များ
// ==========================================
window.openDrawer = function() {
  const drawer = document.getElementById('sideDrawer');
  const backdrop = document.getElementById('drawerBackdrop');
  
  backdrop.classList.remove('hidden');
  setTimeout(() => backdrop.classList.remove('opacity-0'), 10);
  
  drawer.classList.remove('translate-x-full');
};

window.closeDrawer = function() {
  const drawer = document.getElementById('sideDrawer');
  const backdrop = document.getElementById('drawerBackdrop');
  
  drawer.classList.add('translate-x-full');
  backdrop.classList.add('opacity-0');
  setTimeout(() => backdrop.classList.add('hidden'), 300);
};

// ==========================================

async function loadServicesFromDB() {
  const { data, error } = await supabase.from('services').select('*').order('created_at', { ascending: true });
  if (!error && data) {
    servicesList = data;
  }
  renderServiceOptions('All');
}

window.filterCategory = function(platform) {
  const buttons = document.querySelectorAll('.category-btn');
  buttons.forEach(btn => {
    btn.classList.remove('bg-indigo-600/30', 'border-indigo-500');
    btn.classList.add('border-slate-800');
  });
  event.currentTarget.classList.add('bg-indigo-600/30', 'border-indigo-500');
  event.currentTarget.classList.remove('border-slate-800');
  renderServiceOptions(platform);
};

function renderServiceOptions(category) {
  const select = document.getElementById('serviceSelect');
  if(!select) return;
  select.innerHTML = '<option value="">-- Service တစ်ခုရွေးပါ --</option>';

  const filtered = category === 'All' 
    ? servicesList 
    : servicesList.filter(s => s.platform.toLowerCase() === category.toLowerCase());

  filtered.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = `🔵 ID: ${s.provider_service_id || s.id.slice(0,3)} | ${s.name} - (${s.rate} Ks)`;
    select.appendChild(opt);
  });
  resetDetails();
}

document.getElementById('serviceSelect')?.addEventListener('change', (e) => {
  const serviceId = e.target.value;
  selectedService = servicesList.find(s => s.id === serviceId);

  if (selectedService) {
    document.getElementById('serviceDetailsBox').classList.remove('hidden');
    document.getElementById('detailNote').innerText = selectedService.note || "မှတ်ချက်မရှိပါ။";
    document.getElementById('detailTime').innerText = selectedService.time || "တွက်ချက်နေဆဲ";
    document.getElementById('detailMin').innerText = selectedService.min_qty.toLocaleString();
    document.getElementById('detailMax').innerText = selectedService.max_qty.toLocaleString();
    calculatePrice();
  } else {
    resetDetails();
  }
});

document.getElementById('orderQuantity')?.addEventListener('input', calculatePrice);

function calculatePrice() {
  const qty = parseInt(document.getElementById('orderQuantity').value) || 0;
  if (selectedService && qty > 0) {
    const total = Math.ceil((qty / 1000) * selectedService.rate);
    document.getElementById('totalCharge').innerText = `${total.toLocaleString()} Ks`;
  } else {
    document.getElementById('totalCharge').innerText = "0 Ks";
  }
}

function resetDetails() {
  selectedService = null;
  const box = document.getElementById('serviceDetailsBox');
  if(box) box.classList.add('hidden');
  const charge = document.getElementById('totalCharge');
  if(charge) charge.innerText = "0 Ks";
  const time = document.getElementById('detailTime');
  if(time) time.innerText = "ရွေးချယ်ပါ";
}

document.getElementById('orderForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!selectedService) return alert("Service ရွေးပေးပါ။");

  const qty = parseInt(document.getElementById('orderQuantity').value);
  const link = document.getElementById('orderLink').value;
  const total = Math.ceil((qty / 1000) * selectedService.rate);

  if (qty < selectedService.min_qty || qty > selectedService.max_qty) {
    return alert(`အရေအတွက်သည် ${selectedService.min_qty} နှင့် ${selectedService.max_qty} ကြား ဖြစ်ရပါမည်။`);
  }

  if (currentBalance < total) {
    return alert("လက်ကျန်ငွေ မလုံလောက်ပါ။ ကျေးဇူးပြု၍ ငွေအရင်ဖြည့်ပါ (Topup)။");
  }

  const btn = document.getElementById('submitOrderBtn');
  btn.disabled = true;
  btn.innerText = "Processing...";

  const { data: newOrder, error: orderError } = await supabase.from('orders').insert([{
    user_id: currentUser.id,
    service_id: selectedService.provider_service_id,
    service_name: selectedService.name,
    target_link: link,
    quantity: qty,
    charge: total,
    status: 'pending'
  }]).select().single();

  if (orderError) {
    alert("Order တင်ရာတွင် အမှားရှိပါသည်: " + orderError.message);
    btn.disabled = false;
    btn.innerText = "🚀 Order တင်မည်";
    return;
  }

  const newBalance = currentBalance - total;
  await supabase.from('profiles').update({ balance: newBalance }).eq('id', currentUser.id);

  // Show Success Modal
  document.getElementById('modalOrderId').innerText = `#${newOrder.id.slice(0, 4).toUpperCase()}`;
  document.getElementById('modalLink').innerText = link;
  document.getElementById('modalQty').innerText = qty.toLocaleString();
  document.getElementById('modalCharge').innerText = `${total.toLocaleString()} Ks`;
  document.getElementById('modalBal').innerText = `${newBalance.toLocaleString()} Ks`;

  const modal = document.getElementById('successModal');
  const content = document.getElementById('modalContent');
  modal.classList.remove('hidden');
  
  setTimeout(() => {
    content.classList.remove('scale-95', 'opacity-0');
    content.classList.add('scale-100', 'opacity-100');
  }, 10);
});

window.closeSuccessModal = function() {
  window.location.reload();
};

document.getElementById('logoutBtn')?.addEventListener('click', async () => {
  await supabase.auth.signOut();
  window.location.href = "login.html";
});

initUserDashboard();
    
