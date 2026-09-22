// js/api.js
import { supabase } from './config.js';

// Provider ထံသို့ Auto Order ပို့ဆောင်သော Function
export async function sendAutoOrderToProvider(serviceId, link, quantity) {
  try {
    // ၁။ Database မှ Provider URL နှင့် API Key ကို ဆွဲထုတ်ခြင်း
    const { data: settings, error: settingsError } = await supabase
      .from('system_settings')
      .select('provider_url, provider_api_key')
      .eq('id', 'main_settings')
      .single();

    if (settingsError || !settings?.provider_url || !settings?.provider_api_key) {
      console.warn("Provider API settings မပြည့်စုံသေးပါ။");
      return { success: false, error: "Provider API not configured" };
    }

    // ၂။ Provider API Parameter များ ပြင်ဆင်ခြင်း (Standard SMM API v2)
    const payload = new URLSearchParams({
      key: settings.provider_api_key,
      action: 'add',
      service: serviceId,
      link: link,
      quantity: quantity.toString()
    });

    // ၃။ Provider ဆီသို့ POST Request ပို့ခြင်း
    const response = await fetch(settings.provider_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: payload.toString()
    });

    const result = await response.json();

    // Provider က Order ID ပြန်ပေးပါက အောင်မြင်သည်
    if (result && result.order) {
      return { success: true, orderId: result.order };
    } else {
      return { success: false, error: result.error || "Order Failed on Provider" };
    }
  } catch (err) {
    console.error("Auto Order API Error:", err);
    return { success: false, error: err.message };
  }
  }
