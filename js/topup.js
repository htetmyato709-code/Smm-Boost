// js/topup.js
import { supabase } from './config.js';

let currentUser = null;
let kpayNumber = "";
let waveNumber = "";

async function initTopup() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  currentUser = user;

  // လက်ကျန်ငွေဆွဲထုတ်ခြင်း
  const { data: profile } = await supabase.from('profiles').select('balance').eq('id', user.id).single();
  if (profile && document.getElementById('currentBalanceDisplay')) {
    document.getElementById('currentBalanceDisplay').innerText = `${Number(profile.balance || 0).toLocaleString()} Ks`;
  }

  // System Settings မှ Admin Payment ဖုန်းနံပါတ်များ ဆွဲထုတ်ခြင်း
  const { data: settings } = await supabase.from('system_settings').select('*').eq('id', 'main_settings').single();
  if (settings) {
    kpayNumber = settings.kpay_number || "";
    waveNumber = settings.wave_number || "";
    
    document.getElementById('kpayNumberText').innerText = settings.kpay_number || "မသတ်မှတ်ရသေးပါ";
    document.getElementById('kpayNameText').innerText = `Name: ${settings.kpay_name || '-'}`;
    document.getElementById('waveNumberText').innerText = settings.wave_number || "မသတ်မှတ်ရသေးပါ";
    document.getElementById('waveNameText').innerText = `Name: ${settings.wave_name || '-'}`;
  }
}

// Copy ခလုတ်များ
window.copyKpay = function() {
  if (kpayNumber) {
    navigator.clipboard.writeText(kpayNumber);
    alert("KPay နံပါတ် ကူးယူပြီးပါပြီ: " + kpayNumber);
  }
};

window.copyWave = function() {
  if (waveNumber) {
    navigator.clipboard.writeText(waveNumber);
    alert("WavePay နံပါတ် ကူးယူပြီးပါပြီ: " + waveNumber);
  }
};

// Form Submit နှင့် File Upload ပြုလုပ်ခြင်း
document.getElementById('topupForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const fileInput = document.getElementById('slipFile');
  const file = fileInput.files[0];
  const amount = parseFloat(document.getElementById('depositAmount').value);
  const senderName = document.getElementById('senderName').value;
  const payMethod = document.getElementById('payMethod').value;
  const btn = document.getElementById('submitTopupBtn');

  if (!file) {
    return alert("ငွေလွှဲပြေစာ ပုံဖိုင်အား ရွေးချယ်ပေးပါ။");
  }

  btn.disabled = true;
  btn.innerText = "Uploading Slip Image...";

  try {
    // ၁။ ပုံဖိုင်အား Supabase Storage (slips bucket) သို့ တင်ခြင်း
    const fileExt = file.name.split('.').pop();
    const fileName = `${currentUser.id}_${Date.now()}.${fileExt}`;
    const filePath = `topups/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('slips')
      .upload(filePath, file);

    if (uploadError) {
      throw new Error("ပုံဖိုင် Upload ပြုလုပ်၍ မရပါ: " + uploadError.message);
    }

    // တင်ထားသော ပုံ၏ Public URL ရယူခြင်း
    const { data: urlData } = supabase.storage
      .from('slips')
      .getPublicUrl(filePath);

    const screenshotUrl = urlData.publicUrl;

    btn.innerText = "Submitting Request...";

    // ၂။ Deposits Table ထဲသို့ Data သွင်းခြင်း
    const { error: insertError } = await supabase.from('deposits').insert([{
      user_id: currentUser.id,
      user_email: currentUser.email,
      payment_method: payMethod,
      amount: amount,
      sender_name: senderName,
      screenshot_url: screenshotUrl,
      status: 'pending'
    }]);

    if (insertError) {
      throw insertError;
    }

    alert("ငွေဖြည့်သွင်းမှု တောင်းဆိုပြီးပါပြီ။ Admin ဘက်မှ အတည်ပြုပေးသည်အထိ စောင့်ဆိုင်းပေးပါ။");
    window.location.href = "user-dashboard.html";

  } catch (err) {
    alert("အမှားအယွင်းရှိပါသည်: " + err.message);
    btn.disabled = false;
    btn.innerText = "ငွေဖြည့်တောင်းဆိုမည်";
  }
});

initTopup();
                                                       
