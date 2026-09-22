// js/user.js
import { supabase, ADMIN_EMAIL } from './config.js';

let currentUser = null;
let currentBalance = 0;
let servicesList = [];
let selectedService = null;
let activePlatformFilter = "All";

// Dropdown အတွင်း ထည့်သွင်းပြသရန် တိကျကြည်လင်သော Inline SVG Logos
const platformSvgs = {
  tiktok: `<svg class="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none"><path d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.672a2.896 2.896 0 0 1-5.201 1.743l-.066-.098a2.894 2.894 0 0 1 2.37-4.512c.328 0 .644.055.938.156V9.45a6.34 6.34 0 0 0-.938-.07A6.337 6.337 0 0 0 3.14 15.717a6.337 6.337 0 0 0 10.74 4.542l.067-.066a6.3 6.3 0 0 0 1.867-4.475V8.868a8.196 8.196 0 0 0 4.775 1.523V6.946a4.835 4.835 0 0 1-1-.26z" fill="#00F2FE"/><path d="M18.589 5.686a4.793 4.793 0 0 1-3.77-4.245V1h-3.445v13.672a2.896 2.896 0 0 1-5.201 1.743l-.066-.098a2.894 2.894 0 0 1 2.37-4.512c.328 0 .644.055.938.156V8.45a6.34 6.34 0 0 0-.938-.07A6.337 6.337 0 0 0 2.14 14.717a6.337 6.337 0 0 0 10.74 4.542l.067-.066a6.3 6.3 0 0 0 1.867-4.475V7.868a8.196 8.196 0 0 0 4.775 1.523V5.946a4.835 4.835 0 0 1-1-.26z" fill="#FE2C55"/><path d="M19.089 6.186a4.793 4.793 0 0 1-3.77-4.245V1.5h-3.445v13.672a2.896 2.896 0 0 1-5.201 1.743l-.066-.098a2.894 2.894 0 0 1 2.37-4.512c.328 0 .644.055.938.156V8.95a6.34 6.34 0 0 0-.938-.07A6.337 6.337 0 0 0 2.64 15.217a6.337 6.337 0 0 0 10.74 4.542l.067-.066a6.3 6.3 0 0 0 1.867-4.475V8.368a8.196 8.196 0 0 0 4.775 1.523V6.446a4.835 4.835 0 0 1-1-.26z" fill="#FFFFFF"/></svg>`,
  telegram: `<svg class="w-4 h-4 text-[#24A1DE] flex-shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.121l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.458c.538-.196 1.006.128.832.943z"/></svg>`,
  youtube: `<svg class="w-4 h-4 text-[#FF0000] flex-shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`,
  facebook: `<svg class="w-4 h-4 text-[#1877F2] flex-shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>`,
  instagram: `<svg class="w-4 h-4 text-[#E4405F] flex-shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>`
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

// Side Drawer Controls
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
  const { data, error } = await supabase.from('services').select('*').order('created_at', { ascending: true });
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
    const svgIcon = platformSvgs[platformName.toLowerCase()] || platformSvgs['tiktok'];
    const item = document.createElement('div');
    item.className = "flex items-center gap-3 px-4 py-3 hover:bg-slate-800 cursor-pointer transition text-sm text-slate-200";
    item.innerHTML = `
      <div class="w-6 h-6 rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center p-1 flex-shrink-0">
        ${svgIcon}
      </div>
      <span class="font-medium">${catName}</span>
    `;
    item.onclick = () => selectCategory(catName, platformName, svgIcon);
    list.appendChild(item);
  }
}

// Select Category
function selectCategory(catName, platformName, svgIcon) {
  document.getElementById('selectedCatText').innerHTML = `
    <div class="w-6 h-6 rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center p-1 flex-shrink-0">
      ${svgIcon}
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
  filtered.forEach((s, index) => {
    const card = document.createElement('div');
    card.className = "bg-slate-950/70 hover:bg-slate-800 border border-slate-800 p-3 rounded-xl cursor-pointer transition space-y-2";
    card.innerHTML = `
      <div class="flex items-start gap-2">
        <span class="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">
          ${s.numeric_id || (index + 1)}
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
    card.onclick = () => selectServiceItem(s, s.numeric_id || (index + 1));
    servList.appendChild(card);
  });

  resetDetails();
}

// Select Service
function selectServiceItem(service, displayId) {
  selectedService = service;
  
  document.getElementById('selectedServText').innerHTML = `
    <span class="w-5 h-5 bg-blue-600 text-white rounded-full inline-flex items-center justify-center text-[10px] font-bold flex-shrink-0">
      ${displayId}
    </span>
    <span class="text-white truncate font-medium text-xs">${service.name} (${Number(service.rate).toLocaleString()} Ks)</span>
  `;
  document.getElementById('servDropdownList').classList.add('hidden');

  document.getElementById('serviceDetailsBox').classList.remove('hidden');
  document.getElementById('detailNote').innerText = service.note || "မှတ်ချက်မရှိပါ။";
  document.getElementById('detailTime').innerText = service.time || "တွက်ချက်နေဆဲ";
  document.getElementById('detailMin').innerText = Number(service.min_qty).toLocaleString();
  document.getElementById('detailMax').innerText = Number(service.max_qty).toLocaleString();
  
  // Custom Comments Check
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

// Comments line count calculate
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

// Order Form Submit
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
    
