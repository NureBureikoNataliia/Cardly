/** Мінімальні типи для Edge (Deno); рантайм надає повний API. */
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
};
