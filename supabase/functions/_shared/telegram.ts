export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type InlineKeyboardButton = {
  text: string;
  url?: string;
  web_app?: {
    url: string;
  };
};

export type TelegramReplyMarkup = {
  inline_keyboard: InlineKeyboardButton[][];
};

type TelegramSendMessageBody = {
  chat_id: string;
  text: string;
  reply_markup?: TelegramReplyMarkup;
};

export const jsonResponse = (body: Record<string, unknown>, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });

export const sendTelegramMessage = async (
  botToken: string,
  chatId: string,
  text: string,
  replyMarkup?: TelegramReplyMarkup,
): Promise<void> => {
  const body: TelegramSendMessageBody = {
    chat_id: chatId,
    text,
    reply_markup: replyMarkup,
  };

  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Telegram sendMessage failed: ${response.status} ${errorText}`);
  }
};
