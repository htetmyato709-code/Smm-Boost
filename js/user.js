// js/user.js
import { supabase, ADMIN_EMAIL } from './config.js';

let currentUser = null;
let currentBalance = 0;
let servicesList = [];
let selectedService = null;

// ပလက်ဖောင်းအလိုက် Logo Emoji များ သတ်မှတ်ခြင်း
const platformIcons = {
  'tiktok': '🎵',
  'telegram': '✈️',
  'youtube': '▶️',
  'instagram': '📸',
  'facebook': '📘'
};

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
// DRAWER & MODAL LOGICS
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

// Logout Modal System
window.openLogoutModal = function() {
  closeDrawer();
  document.getElementById('logoutModal').classList.remove('hidden');
};
window.closeLogoutModal = function() {
  document.getElementById('logoutModal').classList.add('hidden');
};
window.confirmLogout = async function() {
  await supabase.auth.signOut();
  window.location.href = "login.html";
};

// ==========================================
// CATEGORY & SERVICE LOGICS
// ==========================================
async function loadServicesFromDB() {
  const { data, error } = await supabase.from('services').select('*').order('numeric_id', { ascending: true });
  if (!error && data) {
    servicesList = data;
  }
  populateCategories();
}

// Category Dropdown အား Service များမှခွဲထုတ်၍ Emoji Logo ဖြင့်ထည့်သွင်းခြင်း
function populateCategories() {
  const catSelect = document.getElementById('categorySelect');
  if(!catSelect) return;
  catSelect.innerHTML = '<option value="">-- Category ရွေးချယ်ပါ --</option>';

  let categoryMap = {}; // Group by category to find its platform
  servicesList.forEach(s => {
    categoryMap[s.category] = s.platform;
  });

  for (const [catName, platformName] of Object.entries(categoryMap)) {
    const icon = platformIcons[platformName.toLowerCase()] || '📌';
    catSelect.innerHTML += `<option value="${catName}">${icon} ${catName}</option>`;
  }
}

// Category ရွေးလိုက်ပါက သက်ဆိုင်ရာ Service များသာ အောက်ဖောင်တွင်ပေါ်မည်
document.getElementById('categorySelect')?.addEventListener('change', (e) => {
  const selectedCat = e.target.value;
  const servSelect = document.getElementById('serviceSelect');
  
  servSelect.innerHTML = '<option value="">-- Service တစ်ခုရွေးပါ --</option>';
  
  if (selectedCat) {
    servSelect.disabled = false;
    const filtered = servicesList.filter(s => s.category === selectedCat);
    filtered.forEach(s => {
      servSelect.innerHTML += `<option value="${s.id}">ID: ${s.numeric_id || '-'} - ${s.name} (${s.rate} Ks)</option>`;
    });
  } else {
    servSelect.disabled = true;
  }
  
  resetDetails();
});

document.getElementById('serviceSelect')?.addEventListener('change', (e) => {
  const serviceId = e.target.value;
  selectedService = servicesList.find(s => s.id === serviceId);

  if (selectedService) {
    document.getElementById('serviceDetailsBox').classList.remove('hidden');
    // Box အတွင်း Service ID နှင့် Name အား ထင်ရှားစွာပြသခြင်း
    document.getElementById('displayNumId').innerText = selectedService.numeric_id || 'N/A';
    document.getElementById('displayTitle').innerText = selectedService.name;
    
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
  if(time) time.innerText = "-";
}

// ==========================================
// ORDER SUBMIT & SUCCESS MODAL
// ==========================================
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

  // Insert Order
  const { data: newOrder, error: orderError } = await supabase.from('orders').insert([{
    user_id: currentUser.id,
    service_id: selectedService.provider_service_id || selectedService.id,
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

  // Update Balance
  const newBalance = currentBalance - total;
  await supabase.from('profiles').update({ balance: newBalance }).eq('id', currentUser.id);

  // Show Success Modal (Numeric Order ID ဖြင့် ထင်ရှားစွာပြသမည်)
  document.getElementById('modalOrderId').innerText = `#${newOrder.numeric_id || newOrder.id.slice(0, 4)}`;
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

initUserDashboard();
