export function PrivacyNotice() {
  return (
    <p
      data-testid="privacy-notice"
      className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300"
    >
      Tu documento se lee en tu navegador. Al preguntar, solo se envían tu
      pregunta y los fragmentos relevantes a Gemini. Esta app no guarda nada;
      evita subir información sensible.
    </p>
  );
}
