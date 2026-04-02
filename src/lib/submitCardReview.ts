import { supabase } from "@/src/lib/supabase";
import { Platform } from "react-native";

export type SubmitCardReviewRating = "again" | "hard" | "good" | "easy";

function appendNetworkFailureHint(detail: string): string {
  if (!/failed to fetch|network request failed/i.test(detail)) {
    return detail;
  }
  if (Platform.OS === "web") {
    return `${detail}\n\nExpo Web: часто мешают блокировщики, расширения или режим инкогнито. Попробуй Chrome без расширений или тот же сценарий в Expo Go на телефоне (iOS/Android).`;
  }
  return `${detail}\n\nПроверь интернет и VPN. Убедись, что в .env EXPO_PUBLIC_SUPABASE_URL=https://….supabase.co и после правок выполнен перезапуск: npx expo start -c`;
}

/**
 * Достаёт причину из FunctionsFetchError: поле `context` — это нативная ошибка fetch,
 * JSON.stringify от неё даёт `{}`, поэтому в UI казалось пусто.
 */
function enrichInvokeError(error: unknown): Error {
  if (!(error && typeof error === "object")) {
    return error instanceof Error ? error : new Error(String(error));
  }
  const e = error as { name?: string; message?: string; context?: unknown };
  if (e.name === "FunctionsFetchError" && e.context != null) {
    const ctx = e.context;
    const detail =
      ctx instanceof Error
        ? ctx.message
        : typeof ctx === "object" &&
            ctx !== null &&
            "message" in ctx &&
            typeof (ctx as { message: unknown }).message === "string"
          ? (ctx as { message: string }).message
          : String(ctx);
    const raw =
      detail && detail !== "{}"
        ? detail
        : "Сеть недоступна, неверный EXPO_PUBLIC_SUPABASE_URL, или запрос заблокирован (VPN/файрвол).";
    const hint = appendNetworkFailureHint(raw);
    return new Error(`${e.message}\n→ ${hint}`);
  }
  return error instanceof Error ? error : new Error(String(error));
}

/**
 * FunctionsHttpError.context — это `Response`; тело с сервера содержит реальную причину (error/details).
 */
async function enrichHttpInvokeError(error: unknown): Promise<Error> {
  if (!(error && typeof error === "object")) {
    return error instanceof Error ? error : new Error(String(error));
  }
  const e = error as { name?: string; message?: string; context?: unknown };
  if (e.name !== "FunctionsHttpError" || e.context == null) {
    return enrichInvokeError(error);
  }

  const ctx = e.context;
  const isResponse =
    typeof Response !== "undefined" && ctx instanceof Response;

  if (!isResponse) {
    return enrichInvokeError(error);
  }

  const res = ctx as Response;
  const status = res.status;
  let body = "";
  try {
    body = await res.clone().text();
  } catch {
    body = "";
  }

  let detail = body;
  try {
    const j = JSON.parse(body) as {
      error?: string;
      details?: string;
      message?: string;
    };
    detail =
      [j.details, j.error, j.message].filter(Boolean).join(" — ") ||
      JSON.stringify(j, null, 2);
  } catch {
    /* keep body as text */
  }

  const hint =
    status === 503 || /failed to start/i.test(detail)
      ? "\n(503: смотри логи Edge Function в Dashboard; часто — деплой или импорты.)"
      : status >= 500
        ? "\n(5xx: миграция БД / RLS — docs/SUPABASE_MANUAL_STEPS.md.)"
        : "";

  return new Error(`HTTP ${status} от Edge Function\n${detail || "(пустое тело)"}${hint}`);
}

/**
 * Вызывает Edge Function `submit-card-review` (серверный SRS).
 */
export async function submitCardReviewInvoke(cardId: string, rating: SubmitCardReviewRating) {
  const result = await supabase.functions.invoke("submit-card-review", {
    body: { card_id: cardId, rating },
  });
  if (result.error) {
    return { ...result, error: await enrichHttpInvokeError(result.error) };
  }
  return result;
}
