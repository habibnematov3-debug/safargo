import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, jsonResponse, sendTelegramMessage } from '../_shared/telegram.ts';

type NotifyPassengerPayload = {
  requestId?: string;
};

type PassengerRequestRow = {
  id: string;
  passenger_id: string;
  selected_driver_id: string | null;
  origin_label: string;
  destination_region_id: string;
  time_approx: string;
};

type UserRow = {
  id: string;
  name: string;
  telegram_chat_id: string | null;
};

type DriverProfileRow = {
  car_model: string | null;
  car_year: number | null;
  phone: string | null;
};

const regionLabels: Record<string, string> = {
  toshkent: 'Toshkent',
  samarkand: 'Samarqand',
  fargona: "Farg'ona",
  buxoro: 'Buxoro',
  namangan: 'Namangan',
  andijon: 'Andijon',
  qashqadaryo: 'Qashqadaryo',
};

const getEnv = (key: string): string => {
  const value = Deno.env.get(key);

  if (!value) {
    throw new Error(`${key} sozlanmagan`);
  }

  return value;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const { requestId } = (await req.json()) as NotifyPassengerPayload;

    if (!requestId) {
      return jsonResponse({ error: 'requestId kerak' }, 400);
    }

    const supabase = createClient(getEnv('SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'));

    const { data: request, error: requestError } = await supabase
      .from('passenger_requests')
      .select('id,passenger_id,selected_driver_id,origin_label,destination_region_id,time_approx')
      .eq('id', requestId)
      .maybeSingle<PassengerRequestRow>();

    if (requestError) {
      throw requestError;
    }

    if (!request) {
      return jsonResponse({ error: 'Request not found' }, 404);
    }

    if (!request.selected_driver_id) {
      return jsonResponse({ error: 'Driver tanlanmagan' }, 400);
    }

    const { data: passenger, error: passengerError } = await supabase
      .from('users')
      .select('id,name,telegram_chat_id')
      .eq('id', request.passenger_id)
      .maybeSingle<UserRow>();

    if (passengerError) {
      throw passengerError;
    }

    if (!passenger?.telegram_chat_id) {
      return jsonResponse({ error: 'No chat_id' }, 400);
    }

    const { data: driver, error: driverError } = await supabase
      .from('users')
      .select('id,name,telegram_chat_id')
      .eq('id', request.selected_driver_id)
      .maybeSingle<UserRow>();

    if (driverError) {
      throw driverError;
    }

    const { data: profile, error: profileError } = await supabase
      .from('driver_profiles')
      .select('car_model,car_year,phone')
      .eq('id', request.selected_driver_id)
      .maybeSingle<DriverProfileRow>();

    if (profileError) {
      throw profileError;
    }

    const destination = regionLabels[request.destination_region_id] ?? request.destination_region_id;
    const message = `✅ Safar tasdiqlandi!

🚗 Haydovchi: ${driver?.name ?? "Noma'lum"}
🚙 Mashina: ${profile?.car_model ?? ''} ${profile?.car_year ?? ''}
📞 Telefon: ${profile?.phone ?? "Noma'lum"}
🗺 Yo'nalish: ${request.origin_label} → ${destination}
🕐 Vaqt: ${request.time_approx}

Yaxshi safar! 🙏`;

    await sendTelegramMessage(getEnv('TELEGRAM_BOT_TOKEN'), passenger.telegram_chat_id, message);

    return jsonResponse({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return jsonResponse({ error: message }, 500);
  }
});
