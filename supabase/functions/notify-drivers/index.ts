import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, jsonResponse, sendTelegramMessage, type TelegramReplyMarkup } from '../_shared/telegram.ts';

type NotifyDriversPayload = {
  requestId?: string;
};

type PassengerRequestRow = {
  id: string;
  origin_district_id: string;
  origin_label: string;
  destination_region_id: string;
  seats: number;
  time_approx: string;
  preferences: string[] | null;
};

type DriverUserRow = {
  id: string;
  name: string;
  telegram_chat_id: string | null;
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

const preferenceLabels: Record<string, string> = {
  front_seat: "Old o'rindiq",
  non_smoking: 'Chekmaslik',
  clean_car: 'Toza mashina',
  women_only: 'Ayollar uchun',
};

const getEnv = (key: string): string => {
  const value = Deno.env.get(key);

  if (!value) {
    throw new Error(`${key} sozlanmagan`);
  }

  return value;
};

const miniAppReplyMarkup = (): TelegramReplyMarkup => {
  const miniAppUrl = Deno.env.get('TELEGRAM_MINI_APP_URL');
  const button = miniAppUrl
    ? { text: "Ko'rish", web_app: { url: miniAppUrl } }
    : { text: "Ko'rish", url: 'https://t.me/Safargot_bot' };

  return { inline_keyboard: [[button]] };
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const { requestId } = (await req.json()) as NotifyDriversPayload;

    if (!requestId) {
      return jsonResponse({ error: 'requestId kerak' }, 400);
    }

    const supabase = createClient(getEnv('SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'));

    const { data: request, error: requestError } = await supabase
      .from('passenger_requests')
      .select('id,origin_district_id,origin_label,destination_region_id,seats,time_approx,preferences')
      .eq('id', requestId)
      .maybeSingle<PassengerRequestRow>();

    if (requestError) {
      throw requestError;
    }

    if (!request) {
      return jsonResponse({ error: 'Request not found' }, 404);
    }

    const { data: drivers, error: driversError } = await supabase
      .from('users')
      .select('id,name,telegram_chat_id')
      .eq('role', 'driver')
      .eq('district_id', request.origin_district_id)
      .not('telegram_chat_id', 'is', null)
      .returns<DriverUserRow[]>();

    if (driversError) {
      throw driversError;
    }

    const targetDrivers = (drivers ?? []).filter((driver) => driver.telegram_chat_id);

    if (targetDrivers.length === 0) {
      return jsonResponse({ ok: true, sent: 0 });
    }

    const destination = regionLabels[request.destination_region_id] ?? request.destination_region_id;
    const preferences =
      (request.preferences ?? []).map((preference) => preferenceLabels[preference] ?? preference).join(', ') || "Yo'q";

    const message = `🔔 Yangi so'rov!

📍 ${request.origin_label} → ${destination}
👤 ${request.seats} ta yo'lovchi
🕐 ${request.time_approx}
⭐ Imtiyozlar: ${preferences}

Arizangizni yuboring 👇`;

    const botToken = getEnv('TELEGRAM_BOT_TOKEN');
    const replyMarkup = miniAppReplyMarkup();
    const results = await Promise.allSettled(
      targetDrivers.map((driver) =>
        sendTelegramMessage(botToken, driver.telegram_chat_id ?? '', message, replyMarkup),
      ),
    );
    const failed = results.filter((result) => result.status === 'rejected').length;

    if (failed === targetDrivers.length) {
      return jsonResponse({ error: 'Telegram xabarlari yuborilmadi', failed }, 502);
    }

    return jsonResponse({ ok: true, sent: targetDrivers.length - failed, failed });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return jsonResponse({ error: message }, 500);
  }
});
