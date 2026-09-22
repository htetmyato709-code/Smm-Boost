// js/user.js
import { supabase, ADMIN_EMAIL } from './config.js';

let currentUser = null;
let currentBalance = 0;
let servicesList = [];
let selectedService = null;
let currentCategory = "";

// Brand Logos (TikTok, Telegram, Facebook, Instagram, YouTube)
const brandLogos = {
  'tiktok': 'https://upload.wikimedia.org/wikipedia/en/a/a9/TikTok_logo.svg',
  'telegram': 'https://upload.wikimedia.org/wikipedia/commons/8/82/Telegram_logo.svg',
  'facebook': 'https://upload.wikimedia.org/wikipedia/commons/0/05/Facebook_Logo_%282019%29.png',
  'instagram': 'https://upload.wikimedia.org/wikipedia/commons/e/e7/Instagram_logo_2016.svg',
  'youtube': 'https://upload.wikimedia.org/wikipedia/commons/0/09/YouTube_full-color_icon_%282017%29.svg'
};

async function initUserDashboard() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  currentUser = user;
  
  if (document.getElementById('userEmailDisplay')) {
    document.getElementById('userEmailDisplay').innerText = user.email;
  }

  if (user.email === ADMIN_EMAIL && document.getElementById('adminPanelLink')) {
    document.getElementById('adminPanelLink').classList.remove('hidden');
    document.getElementById('adminPanelLink').classList.add('block');
  }

  const { data: profile } = await supabase.from('profiles').select('balance').eq('id', user.id).single();
  if (profile && document.getElementById('userBalanceDisplay')) {
    currentBalance = Number(profile.balance || 0);
    document.getElementById('userBalanceDisplay').innerText = `${currentBalance.toLocaleString()} Ks`;
  }

  await loadServicesFromDB();
}

// Drawer Controls
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

// Logout Modal
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

// Custom Category Dropdown Toggle
window.toggleCatDropdown = function(e) {
  e.stopPropagation();
  document.getElementById('catDropdownList').classList.toggle('hidden');
};

window.addEventListener('click', (e) => {
  const dropdown = document.getElementById('catDropdownList');
  const btn = document.getElementById('catDropdownBtn');
  if (dropdown && btn && !dropdown.contains(e.target) && !btn.contains(e.target)) {
    dropdown.classList.add('hidden');
  }
});

// Load Services
async function loadServicesFromDB() {
  const { data, error } = await supabase.from('services').select('*').order('numeric_id', { ascending: true });
  if (!error && data) {
    servicesList = data;
  }
  populateCategories();
}

// Category List တွင် တကယ့် Logo ပုံများဖြင့် ပြသခြင်း
function populateCategories() {
  const list = document.getElementById('catDropdownList');
  if (!list) return;
  list.innerHTML = '';

  let categoryMap = {};
  servicesList.forEach(s => {
    categoryMap[s.category] = s.platform;
  });

  for (const [catName, platformName] of Object.entries(categoryMap)) {
    const logoUrl = brandLogos[platformName.toLowerCase()] || brandLogos['tiktok'];
    
    const item = document.createElement('div');
    item.className = "flex items-center gap-3 px-4 py-3 hover:bg-slate-800 cursor-pointer transition text-sm text-slate-200";
    item.innerHTML = `
      <img src="${logoUrl}" class="w-5 h-5 rounded-md object-contain bg-white/10 p-0.5" alt="${platformName}">
      <span class="font-medium">${catName}</span>
    `;
    item.onclick = () => selectCategory(catName, platformName, logoUrl);
    list.appendChild(item);
  }
}

// Category တစ်ခုအား ရွေးချယ်လိုက်သည့်အခါ
function selectCategory(catName, platformName, logoUrl) {
  currentCategory = catName;
  document.getElementById('selectedCatText').innerHTML = `
    <img src="${logoUrl}" class="w-5 h-5 rounded-md object-contain bg-white/10 p-0.5" alt="${platformName}">
    <span class="text-white font-medium">${catName}</span>
  `;
  document.getElementById('catDropdownList').classList.add('hidden');

  // Service Dropdown ကို ဖွင့်ပြီး သက်ဆိုင်ရာ Service များသာ ထည့်သွင်းခြင်း
  const servSelect = document.getElementById('serviceSelect');
  servSelect.innerHTML = '<option value="">-- Service တစ်ခုရွေးပါ --</option>';
  servSelect.disabled = false;

  const filtered = servicesList.filter(s => s.category === catName);
  filtered.forEach(s => {
    servSelect.innerHTML += `<option value="${s.id}">ID: ${s.numeric_id || '-'} - ${s.name} (${s.rate} Ks)</option>`;
  });

  resetDetails();
}

document.getElementById('serviceSelect')?.addEventListener('change', (e) => {
  const serviceId = e.target.value;
  selectedService = servicesList.find(s => s.id === serviceId);

  if (selectedService) {
    document.getElementById('serviceDetailsBox').classList.remove('hidden');
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
  if (box) box.classList.add('hidden');
  const charge = document.getElementById('totalCharge');
  if (charge) charge.innerText = "0 Ks";
  const time = document.getElementById('detailTime');
  if (time) time.innerText = "-";
}

// Order Form Submit
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
    btn.innerText = "Order တင်မည်";
    return;
  }

  const newBalance = currentBalance - total;
  await supabase.from('profiles').update({ balance: newBalance }).eq('id', currentUser.id);

  // Success Modal
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
                                                                                           
