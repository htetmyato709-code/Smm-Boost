// js/ai-support.js
import { supabase } from './config.js';

// Telegram Bot Credentials
const BOT_TOKEN = "8881857952:AAEPVfwKin3LHUHTZsKTw3l0SsUekj5kFR0";
const OWNER_CHAT_ID = "8395042691";

let currentUser = null;
let currentVerifiedOrder = null;

async function initAISupport() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  currentUser = user;
}

// User Message UI Helper
function appendUserMessage(text) {
  const container = document.getElementById('chatMessages');
  const div = document.createElement('div');
  div.className = "flex justify-end";
  div.innerHTML = `
    <div class="bg-indigo-600 text-white p-3 rounded-2xl rounded-tr-sm text-xs max-w-[85%] leading-relaxed shadow-md">
      ${text}
    </div>
  `;
  container.appendChild(div);
  scrollToBottom();
}

// Bot Message UI Helper
function appendBotMessage(text) {
  const container = document.getElementById('chatMessages');
  const div = document.createElement('div');
  div.className = "flex items-start gap-2.5";
  div.innerHTML = `
    <div class="w-7 h-7 rounded-full bg-indigo-600/40 border border-indigo-500/40 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">🤖</div>
    <div class="glass bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl rounded-tl-sm text-xs leading-relaxed max-w-[85%] text-slate-200">
      ${text}
    </div>
  `;
  container.appendChild(div);
  scrollToBottom();
}

function scrollToBottom() {
  const container = document.getElementById('chatMessages');
  container.scrollTop = container.scrollHeight;
}

// 1. Order ID Input Handle
document.getElementById('chatForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const input = document.getElementById('orderIdInput');
  const rawVal = input.value.trim().replace('#', '');
  if (!rawVal) return;

  appendUserMessage(`Order ID: #${rawVal}`);
  input.value = '';

  const sendBtn = document.getElementById('sendBtn');
  sendBtn.disabled = true;
  appendBotMessage("ခေတ္တစောင့်ဆိုင်းပေးပါ... Order အချက်အလက်များကို ရှာဖွေစစ်ဆေးနေပါသည် 🔍");

  try {
    let order = null;
    
    // Check if input is numeric ID or UUID
    if (!isNaN(rawVal)) {
      const { data } = await supabase
        .from('orders')
        .select('*')
        .eq('numeric_id', parseInt(rawVal))
        .single();
      order = data;
    }

    if (!order) {
      const { data } = await supabase
        .from('orders')
        .select('*')
        .ilike('id', `${rawVal}%`)
        .single();
      order = data;
    }

    if (!order) {
      appendBotMessage(`တောင်းပန်ပါတယ်ခင်ဗျာ။ Order ID #${rawVal} ကို စနစ်ထဲတွင် ရှာမတွေ့ပါ။ နံပါတ် မှန်ကန်မှု ရှိ/မရှိ ပြန်လည်စစ်ဆေးပေးပါခင်ဗျာ။`);
      sendBtn.disabled = false;
      return;
    }

    // Verify current user ownership
    if (order.user_id !== currentUser.id) {
      appendBotMessage("ဤ Order သည် သင်တင်ထားသော အကောင့်နှင့် မသက်ဆိုင်ပါခင်ဗျာ။");
      sendBtn.disabled = false;
      return;
    }

    currentVerifiedOrder = order;

    // Show verified status & present options
    setTimeout(() => {
      appendBotMessage(`
        အတည်ပြုပြီးပါပြီ ✅<br>
        • <strong>Order ID:</strong> #${order.numeric_id || order.id.slice(0, 4)}<br>
        • <strong>Service:</strong> ${order.service_name}<br>
        • <strong>လက်ရှိ Status:</strong> <span class="uppercase font-bold text-amber-400">${order.status}</span><br><br>
        ဤ Order နှင့်ပတ်သက်ပြီး မည်သို့ ကူညီပေးရမလဲခင်ဗျာ? အောက်ပါတို့မှ ရွေးချယ်ပေးပါ။
      `);
      document.getElementById('optionsContainer').classList.remove('hidden');
      sendBtn.disabled = false;
    }, 400);

  } catch (err) {
    appendBotMessage("အမှားအယွင်း ဖြစ်ပေါ်ခဲ့ပါသည်: " + err.message);
    sendBtn.disabled = false;
  }
});

// 2. Issue Selection Logic & Telegram Dispatch
window.handleIssueSelection = async function(type) {
  if (!currentVerifiedOrder) return;

  document.getElementById('optionsContainer').classList.add('hidden');

  let issueTitle = "";
  if (type === 'speed_up') issueTitle = "⚡ နှေးနေလို့ မြန်ပေးပါ";
  if (type === 'refill') issueTitle = "🔄 ပြန်ကျသွားလို့ ပြန်ဖြည့်ပေးပါ (Refill)";
  if (type === 'cancel') issueTitle = "❌ Order ပယ်ဖျက်ပေးပါ (Cancel)";

  appendUserMessage(issueTitle);

  // Status check logic
  const status = currentVerifiedOrder.status.toLowerCase();

  // (က) နှေးနေလို့ မြန်ပေးပါ ရွေးချယ်မှု
  if (type === 'speed_up') {
    if (status === 'completed') {
      appendBotMessage("ဤ Order သည် စနစ်တွင် <strong>Completed (ပြီးဆုံး)</strong> ဖြစ်သွားပြီး ဖြစ်သောကြောင့် အရှိန်မြှင့်တင်ရန် မလိုအပ်တော့ပါခင်ဗျာ။");
      return;
    }
    if (status === 'cancelled') {
      appendBotMessage("ဤ Order အား စနစ်မှ <strong>Cancelled (ပယ်ဖျက်)</strong> ထားပြီး ဖြစ်ပါသည်ခင်ဗျာ။");
      return;
    }
    await notifyAdminTelegram(issueTitle);
  }

  // (ခ) ပြန်ဖြည့်ပေးပါ (Refill) ရွေးချယ်မှု
  else if (type === 'refill') {
    if (status !== 'completed') {
      appendBotMessage("ဤ Order သည် မပြီးဆုံးသေးပါ (Completed မဖြစ်သေးပါ)။ Order အပြီးသတ်ရောက်ရှိပြီးမှသာ ပြန်ကျပါက Refill တောင်းဆိုနိုင်ပါမည်ခင်ဗျာ။");
      return;
    }
    await notifyAdminTelegram(issueTitle);
  }

  // (ဂ) ပယ်ဖျက်ပေးပါ (Cancel) ရွေးချယ်မှု
  else if (type === 'cancel') {
    if (status === 'completed') {
      appendBotMessage("ဤ Order သည် လုပ်ဆောင်ပြီးစီးသွားပြီ (Completed) ဖြစ်သောကြောင့် ပယ်ဖျက်၍ မရနိုင်တော့ပါခင်ဗျာ။");
      return;
    }
    if (status === 'cancelled') {
      appendBotMessage("ဤ Order အား ပယ်ဖျက်ပြီးသား ဖြစ်ပါသည်ခင်ဗျာ။");
      return;
    }
    await notifyAdminTelegram(issueTitle);
  }
};

// 3. Send Telegram Notification
async function notifyAdminTelegram(issue) {
  appendBotMessage("အချက်အလက်များကို Admin ထံ အရေးပေါ် ပေးပို့နေပါသည်... ⏳");

  const orderId = currentVerifiedOrder.numeric_id || currentVerifiedOrder.id.slice(0, 4);
  const textMsg = `🚨 *AI Support Request တောင်းဆိုမှု*\n\n`
    + `👤 *User Email:* ${currentUser.email}\n`
    + `🔢 *Order ID:* #${orderId}\n`
    + `📌 *Service:* ${currentVerifiedOrder.service_name}\n`
    + `🔗 *Link:* ${currentVerifiedOrder.target_link}\n`
    + `📊 *Quantity:* ${currentVerifiedOrder.quantity}\n`
    + `⚙️ *Current Status:* ${currentVerifiedOrder.status.toUpperCase()}\n\n`
    + `❓ *တောင်းဆိုချက်:* ${issue}`;

  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: OWNER_CHAT_ID,
        text: textMsg,
        parse_mode: 'Markdown'
      })
    });

    const data = await res.json();
    if (data.ok) {
      appendBotMessage(`
        အစီရင်ခံစာ ပေးပို့ပြီးပါပြီ ✅<br><br>
        သင်၏ တောင်းဆိုချက် (<strong>${issue}</strong>) အား တာဝန်ရှိသူ Admin ဆီသို့ Telegram Bot မှတစ်ဆင့် တိုက်ရိုက် ပေးပို့လိုက်ပါပြီခင်ဗျာ။ မကြာမီ စစ်ဆေး၍ ဆောင်ရွက်ပေးပါလိမ့်မည်။ ကျေးဇူးတင်ပါသည်။
      `);
    } else {
      appendBotMessage("Telegram သို့ အကြောင်းကြားစာ ပေးပို့ရာတွင် အဆင်မပြေဖြစ်သွားပါသည်: " + data.description);
    }
  } catch (err) {
    appendBotMessage("ချိတ်ဆက်မှု မအောင်မြင်ပါ: " + err.message);
  }
}

initAISupport();
      
