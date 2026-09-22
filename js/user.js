// js/user.js
import { supabase, ADMIN_EMAIL } from './config.js';

let currentUser = null;
let currentBalance = 0;
let servicesList = [];
let selectedService = null;
let activePlatformFilter = "All";

// High-Definition Official Logos (TikTok SVG Data URL ဖြင့် အမှောင်ထဲတွင် ပေါ်လွင်ထင်ရှားစွာ ရေးဆွဲထားပါသည်)
const brandLogos = {
  'tiktok': "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 448 512'%3E%3Cpath fill='%2325F4EE' d='M448,209.91a210.06,210.06,0,0,1-122.77-39.25V349.38A162.55,162.55,0,1,1,185,188.31V278.2a74.62,74.62,0,1,0,52.23,71.18V0l88,0a121.18,121.18,0,0,0,1.86,22.17h0A122.18,122.18,0,0,0,381,102.39a121.43,121.43,0,0,0,67,20.14Z'/%3E%3Cpath fill='%23FE2C55' d='M448,209.91a210.06,210.06,0,0,1-122.77-39.25V349.38A162.55,162.55,0,1,1,185,188.31V278.2a74.62,74.62,0,1,0,52.23,71.18V0l88,0a121.18,121.18,0,0,0,1.86,22.17h0A122.18,122.18,0,0,0,381,102.39a121.43,121.43,0,0,0,67,20.14Z' transform='translate(-6 -6)'/%3E%3Cpath fill='%23ffffff' d='M448,209.91a210.06,210.06,0,0,1-122.77-39.25V349.38A162.55,162.55,0,1,1,185,188.31V278.2a74.62,74.62,0,1,0,52.23,71.18V0l88,0a121.18,121.18,0,0,0,1.86,22.17h0A122.18,122.18,0,0,0,381,102.39a121.43,121.43,0,0,0,67,20.14Z' transform='translate(-3 -3)'/%3E%3C/svg%3E",
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

  // Set Top Tab Logo Images
  for (const [pName, url] of Object.entries(brandLogos)) {
    const el = document.getElementById(`tabLogo-${pName.charAt(0).toUpperCase() + pName.slice(1)}`);
    if (el) el.src = url;
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

// Logout Controls
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

// Top Platform Filters
window.selectPlatformFilter = function(platform) {
  activePlatformFilter = platform;
  const buttons = document.querySelectorAll('.platform-tab');
  buttons.forEach(btn => {
    btn.className = "platform-tab flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-900 border border-slate-800 text-slate-300 text-xs font-semibold whitespace-nowrap hover:border-slate-700 transition";
  });

  const activeBtn = document.getElementById(`btnPlat-${platform}`);
  if (activeBtn) {
    activeBtn.className = "platform-tab active flex items-center gap-2 px-4 py-2 rounded-2xl bg-blue-600 text-white border border-blue-500 text-xs font-semibold whitespace-nowrap transition shadow-md shadow-blue-600/30";
  }

  populateCategories();
  
  document.getElementById('selectedCatText').innerHTML = 'Category ရွေးချယ်ပါ';
  const servBtn = document.getElementById('servDropdownBtn');
  servBtn.disabled = true;
  document.getElementById('selectedServText').innerText = "-- အရင်ဆုံး Category ရွေးပါ --";
  resetDetails();
};

// Dropdowns Toggle
window.toggleCatDropdown = function(e) {
  e.stopPropagation();
  document.getElementById('servDropdownList').classList.add('hidden');
  document.getElementById('catDropdownList').classList.toggle('hidden');
};

window.toggleServDropdown = function(e) {
  e.stopPropagation();
  document.getElementById('catDropdownList').classList.add('hidden');
  document.getElementById('servDropdownList').classList.toggle('hidden');
};

window.addEventListener('click', () => {
  document.getElementById('catDropdownList')?.classList.add('hidden');
  document.getElementById('servDropdownList')?.classList.add('hidden');
});

// Load Services
async function loadServicesFromDB() {
  const { data, error } = await supabase.from('services').select('*').order('numeric_id', { ascending: true });
  if (!error && data) {
    servicesList = data;
  }
  populateCategories();
}

// Populate Categories
function populateCategories() {
  const list = document.getElementById('catDropdownList');
  if (!list) return;
  list.innerHTML = '';

  let filteredServices = servicesList;
  if (activePlatformFilter !== "All") {
    filteredServices = servicesList.filter(s => s.platform.toLowerCase() === activePlatformFilter.toLowerCase());
  }

  let categoryMap = {};
  filteredServices.forEach(s => {
    categoryMap[s.category] = s.platform;
  });

  const categories = Object.entries(categoryMap);
  if (categories.length === 0) {
    list.innerHTML = '<div class="px-4 py-3 text-xs text-slate-500">ဝန်ဆောင်မှု မရှိသေးပါ။</div>';
    return;
  }

  for (const [catName, platformName] of categories) {
    const logoUrl = brandLogos[platformName.toLowerCase()] || brandLogos['tiktok'];
    const item = document.createElement('div');
    item.className = "flex items-center gap-3 px-4 py-3 hover:bg-slate-800 cursor-pointer transition text-sm text-slate-200";
    item.innerHTML = `
      <div class="w-6 h-6 rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center p-1 flex-shrink-0">
        <img src="${logoUrl}" class="w-full h-full object-contain" alt="${platformName}">
      </div>
      <span class="font-medium">${catName}</span>
    `;
    item.onclick = () => selectCategory(catName, platformName, logoUrl);
    list.appendChild(item);
  }
}

// Select Category
function selectCategory(catName, platformName, logoUrl) {
  document.getElementById('selectedCatText').innerHTML = `
    <div class="w-6 h-6 rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center p-1 flex-shrink-0">
      <img src="${logoUrl}" class="w-full h-full object-contain" alt="${platformName}">
    </div>
    <span class="text-white font-medium">${catName}</span>
  `;
  document.getElementById('catDropdownList').classList.add('hidden');

  const servBtn = document.getElementById('servDropdownBtn');
  servBtn.disabled = false;
  document.getElementById('selectedServText').innerText = "-- Service တစ်ခုရွေးပါ --";

  const servList = document.getElementById('servDropdownList');
  servList.innerHTML = '';

  const filtered = servicesList.filter(s => s.category === catName);
  filtered.forEach(s => {
    const card = document.createElement('div');
    card.className = "bg-slate-950/70 hover:bg-slate-800 border border-slate-800 p-3 rounded-xl cursor-pointer transition space-y-2";
    card.innerHTML = `
      <div class="flex items-start gap-2">
        <span class="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">
          ${s.numeric_id || '1'}
        </span>
        <span class="text-xs font-semibold text-slate-200 leading-snug">
          ${s.name}
        </span>
      </div>
      <div class="flex justify-between items-center text-[11px] pt-1 border-t border-slate-800/80">
        <span class="font-bold text-blue-400">${Number(s.rate).toLocaleString()} Ks / 1K</span>
        <span class="text-slate-400">Min: ${Number(s.min_qty).toLocaleString()} - Max: ${Number(s.max_qty).toLocaleString()}</span>
      </div>
    `;
    card.onclick = () => selectServiceItem(s);
    servList.appendChild(card);
  });

  resetDetails();
}

// Select Service (Detect Comments Requirement)
function selectServiceItem(service) {
  selectedService = service;
  
  document.getElementById('selectedServText').innerHTML = `
    <span class="w-5 h-5 bg-blue-600 text-white rounded-full inline-flex items-center justify-center text-[10px] font-bold flex-shrink-0">
      ${service.numeric_id || '1'}
    </span>
    <span class="text-white truncate font-medium text-xs">${service.name} (${Number(service.rate).toLocaleString()} Ks)</span>
  `;
  document.getElementById('servDropdownList').classList.add('hidden');

  document.getElementById('serviceDetailsBox').classList.remove('hidden');
  document.getElementById('detailNote').innerText = service.note || "မှတ်ချက်မရှိပါ။";
  document.getElementById('detailTime').innerText = service.time || "တွက်ချက်နေဆဲ";
  document.getElementById('detailMin').innerText = Number(service.min_qty).toLocaleString();
  document.getElementById('detailMax').innerText = Number(service.max_qty).toLocaleString();
  
  // Custom Comments စစ်ဆေးခြင်း (အမည် သို့မဟုတ် အမျိုးအစားတွင် Comment ပါဝင်ပါက)
  const isComment = service.name.toLowerCase().includes('comment') || service.category.toLowerCase().includes('comment');
  const commentsContainer = document.getElementById('commentsContainer');
  const qtyInput = document.getElementById('orderQuantity');
  
  if (isComment) {
    commentsContainer.classList.remove('hidden');
    qtyInput.readOnly = true;
    qtyInput.value = 0;
  } else {
    commentsContainer.classList.add('hidden');
    qtyInput.readOnly = false;
  }

  calculatePrice();
}

// Comments ရေးလိုက်လျှင် တစ်ကြောင်းချင်းစီအလိုက် Quantity အလိုအလျောက် တွက်ချက်ခြင်း
document.getElementById('orderComments')?.addEventListener('input', (e) => {
  const lines = e.target.value.split('\n').filter(line => line.trim() !== '');
  const count = lines.length;
  document.getElementById('commentCount').innerText = `${count} Lines`;
  document.getElementById('orderQuantity').value = count;
  calculatePrice();
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
  document.getElementById('commentsContainer')?.classList.add('hidden');
  document.getElementById('orderComments').value = "";
  document.getElementById('orderQuantity').readOnly = false;
}

// Order Submit
document.getElementById('orderForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!selectedService) return alert("Service ရွေးပေးပါ။");

  const qty = parseInt(document.getElementById('orderQuantity').value);
  const link = document.getElementById('orderLink').value;
  const comments = document.getElementById('orderComments').value;
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
    comments: comments || null,
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
      
