-- SRS: розширюємо user_card_progress + додаємо глобальну таблицю налаштувань.

-- 1) Status: allow relearning
ALTER TABLE public.user_card_progress
  DROP CONSTRAINT IF EXISTS user_card_progress_status_check; -- видаляємо стару перевірку status, якщо вона існує

ALTER TABLE public.user_card_progress
  ADD CONSTRAINT user_card_progress_status_check -- додаємо оновлену перевірку status для картки
  CHECK (status = ANY (ARRAY[
    'new'::text,        -- початковий статус
    'learning'::text,   -- на етапі навчання
    'review'::text,     -- на ревʼю
    'relearning'::text  -- повторне навчання після помилки
  ]));

-- 2) Learning / relearning step index (matches CardScheduleSnapshot.learningStepIndex)
ALTER TABLE public.user_card_progress
  ADD COLUMN IF NOT EXISTS learning_step_index integer NOT NULL DEFAULT 0; -- індекс кроку навчання/перенавчання

-- 3) Global SRS parameters (single row, id = 1)
CREATE TABLE IF NOT EXISTS public.app_spaced_repetition_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- єдиний рядок з id=1
  learning_steps_seconds integer[] NOT NULL DEFAULT ARRAY[60, 600],      -- проміжки для навчання
  relearning_steps_seconds integer[] NOT NULL DEFAULT ARRAY[600],       -- проміжки для перенавчання
  graduating_interval_days integer NOT NULL DEFAULT 1,                 -- інтервал після успішного завершення навчання
  easy_interval_during_learning_days integer NOT NULL DEFAULT 4,       -- інтервал для "легкого" відповіді під час навчання
  learning_hard_delay_seconds integer NOT NULL DEFAULT 60,             -- затримка після "тяжкої" відповіді
  relearning_hard_delay_seconds integer NOT NULL DEFAULT 600,         -- затримка в режимі перенавчання при "тяжко"
  interval_modifier double precision NOT NULL DEFAULT 1.0,             -- множник інтервалів
  easy_bonus double precision NOT NULL DEFAULT 1.3,                    -- бонус за легку відповідь
  lapse_interval_multiplier double precision NOT NULL DEFAULT 0,       -- множник інтервалу після провалу
  ease_minimum_permille integer NOT NULL DEFAULT 1300,                -- мінімальне значення easiness (1300‰ = 1.3)
  min_lapse_interval_days integer NOT NULL DEFAULT 1,                 -- мінімум днів після провалу
  updated_at timestamp with time zone NOT NULL DEFAULT now()          -- час останнього оновлення
);

INSERT INTO public.app_spaced_repetition_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING; -- якщо рядок вже є, пропускаємо

COMMENT ON TABLE public.app_spaced_repetition_settings IS 'Global SRS tuning; maps to GlobalSpacedRepetitionSettings in app code.'; -- коментар для таблиці
