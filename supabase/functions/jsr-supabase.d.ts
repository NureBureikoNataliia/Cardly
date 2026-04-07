/**
 * IDE: TypeScript не знає про специфікатор `jsr:`. Рантайм Edge підтягує пакет з JSR.
 * Типи збігаються з `@supabase/supabase-js` у кореневому node_modules.
 */
declare module "jsr:@supabase/supabase-js@2" {
  export * from "@supabase/supabase-js";
}
