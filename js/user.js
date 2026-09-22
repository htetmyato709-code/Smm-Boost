// js/user.js
import { supabase } from './config.js';

let currentUser = null;
let currentBalance = 0;
let servicesList = [
  // ဥပမာ Service List (နောက်ပိုင်း Provider API မှ တိုက်ရိုက်ဆွဲတင်နိုင်သည်)
  { id: "101", platform: "TikTok", name: "TikTok Video Views [Instant]", rate: 150, min: 100, max: 1000000, time: "0 - 15 Mins" },
  { id: "102", platform: "TikTok", name: "TikTok Followers [Real + Non-Drop]", rate: 3500, min: 50, max: 50000, time: "1 - 3 Hours" },
  { id: "201", platform: "Telegram", name: "Telegram Channel Members [Fast]", rate: 2500, min: 100, max: 20000, time: "10 - 30 Mins" },
  { id: "301", platform: "YouTube", name: "YouTube Subscribers [No Drop]", rate: 8000, min: 50, max: 10000, time: "12 - 24 Hours" },
  { id: "401", platform: "Instagram", name: "Instagram Followers [High Quality]", rate: 3000, min: 100, max: 50000, time: "30 Mins" },
  { id: "501", platform: "Facebook", name: "Facebook Page Likes + Followers", rate: 4500, min: 100, max: 20000, time: "1 - 2 Hours" }
];

let selectedService = null;

// User Auth နှင့် Balance စစ်ဆေးခြင်း
async function initUserDashboard() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  currentUser = user;
  document.getElementById('userEmailDisplay').innerText = user.email;

  // Profile မှ Balance ယူခြင်း
  const { data: profile } = await supabase
    .from('profiles')
    .select('balance')
    .eq('id', user.id)
    .single();

  if (profile) {
    currentBalance = Number(profile.balance || 0);
    document.getElementById('userBalanceDisplay').innerText = `${currentBalance.toLocaleString()} MMK`;
  }

  renderServiceOptions('All');
}

// Category အလိုက် Service များကို Dropdown ထဲ ထည့်သွင်းခြင်း
window.filterCategory = function(platform) {
  // Category Button များ Active Style ပြောင်းခြင်း
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
  select.innerHTML = '<option value="">-- Service တစ်ခုရွေးပါ --</option>';

  const filtered = category === 'All' 
    ? servicesList 
    : servicesList.filter(s => s.platform.toLowerCase() === category.toLowerCase());

  filtered.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.id;
    // Service ID ကို အရှေ့တွင် ထင်ရှားစွာ ဖော်ပြခြင်း
    opt.textContent = `[ID: ${s.id}] ➔ ${s.name} - ${s.rate} MMK`;
    select.appendChild(opt);
  });

  resetDetails();
}

// Service ရွေးချယ်မှု ပြောင်းလဲသည့်အခါ အချက်အလက်များ ပြသခြင်း
document.getElementById('serviceSelect').addEventListener('change', (e) => {
  const serviceId = e.target.value;
  selectedService = servicesList.find(s => s.id === serviceId);

  if (selectedService) {
    document.getElementById('serviceDetailsBox').classList.remove('hidden');
    document.getElementById('detailTime').innerText = selectedService.time;
    document.getElementById('detailRate').innerText = selectedService.rate.toLocaleString();
    document.getElementById('detailMin').innerText = selectedService.min.toLocaleString();
    document.getElementById('detailMax').innerText = selectedService.max.toLocaleString();
    calculatePrice();
  } else {
    resetDetails();
  }
});

// Quantity ရိုက်ထည့်သည့်အခါ စုစုပေါင်းဈေးတွက်ချက်ခြင်း
document.getElementById('orderQuantity').addEventListener('input', calculatePrice);

function calculatePrice() {
  const qty = parseInt(document.getElementById('orderQuantity').value) || 0;
  if (selectedService && qty > 0) {
    const total = Math.ceil((qty / 1000) * selectedService.rate);
    document.getElementById('totalCharge').innerText = `${total.toLocaleString()} MMK`;
  } else {
    document.getElementById('totalCharge').innerText = "0 MMK";
  }
}

function resetDetails() {
  selectedService = null;
  document.getElementById('serviceDetailsBox').classList.add('hidden');
  document.getElementById('totalCharge').innerText = "0 MMK";
}

// Order Form Submit ပြုလုပ်ခြင်း
document.getElementById('orderForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!selectedService) return alert("Service ရွေးပေးပါ။");

  const qty = parseInt(document.getElementById('orderQuantity').value);
  const link = document.getElementById('orderLink').value;
  const note = document.getElementById('orderNote').value;
  const total = Math.ceil((qty / 1000) * selectedService.rate);

  if (qty < selectedService.min || qty > selectedService.max) {
    return alert(`အရေအတွက်သည် ${selectedService.min} နှင့် ${selectedService.max} ကြား ဖြစ်ရပါမည်။`);
  }

  if (currentBalance < total) {
    return alert("လက်ကျန်ငွေ မလုံလောက်ပါ။ ကျေးဇူးပြု၍ ငွေအရင်ဖြည့်ပါ (Topup)။");
  }

  const btn = document.getElementById('submitOrderBtn');
  btn.disabled = true;
  btn.innerText = "Processing Order...";

  // ၁။ Database ထဲ Order သိမ်းခြင်း
  const { error: orderError } = await supabase.from('orders').insert([{
    user_id: currentUser.id,
    service_id: selectedService.id,
    service_name: selectedService.name,
    target_link: link,
    quantity: qty,
    charge: total,
    status: 'pending'
  }]);

  if (orderError) {
    alert("Order တင်ရာတွင် အမှားရှိပါသည်: " + orderError.message);
    btn.disabled = false;
    btn.innerText = "Order တင်မည်";
    return;
  }

  // ၂။ Balance နုတ်ယူခြင်း
  const newBalance = currentBalance - total;
  await supabase.from('profiles').update({ balance: newBalance }).eq('id', currentUser.id);

  alert("Order အောင်မြင်စွာ တင်ပြီးပါပြီ။");
  window.location.reload();
});

// Logout
document.getElementById('logoutBtn').addEventListener('click', async () => {
  await supabase.auth.signOut();
  window.location.href = "login.html";
});

initUserDashboard();
                  
// js/user.js ရဲ့ Submit Event အပိုင်းတွင် ထည့်သွင်းရန်
import { sendAutoOrderToProvider } from './api.js';

// ... (ယခင် ရေးထားသော Balance စစ်ဆေးသည့်နေရာပြီးနောက်)

// ၁။ Main Provider ဆီသို့ Auto Order တိုက်ရိုက် ပို့ခြင်း
const providerRes = await sendAutoOrderToProvider(selectedService.id, link, qty);

let providerOrderId = null;
let orderStatus = 'pending';

if (providerRes.success) {
  providerOrderId = providerRes.orderId;
  orderStatus = 'processing'; // Provider ပေါ်ရောက်သွားပါက Processing ပြောင်းပါမည်
}

// ၂။ Database ထဲ Order မှတ်တမ်းသိမ်းခြင်း
await supabase.from('orders').insert([{
  user_id: currentUser.id,
  service_id: selectedService.id,
  service_name: selectedService.name,
  target_link: link,
  quantity: qty,
  charge: total,
  provider_order_id: providerOrderId,
  status: orderStatus
}]);

// ၃။ User Balance လျှော့ချခြင်း
await supabase.from('profiles').update({ balance: currentBalance - total }).eq('id', currentUser.id);

alert(providerRes.success 
  ? `Order အောင်မြင်စွာ တင်ပြီးပါပြီ။ Provider Order ID: ${providerOrderId}` 
  : "Order တင်ပြီးပါပြီ။ Provider သို့ ပို့ဆောင်ရန် Admin ဘက်မှ စစ်ဆေးပေးပါမည်။");

window.location.reload();
