import * as Sentry from '@sentry/nextjs'

// Monitoreo de errores en el navegador.
// Sin trazas ni grabación de sesión a propósito: en el plan gratuito esos dos
// consumen la cuota rapidísimo, y lo que necesitamos ver son los errores.
Sentry.init({
  dsn: 'https://ab28911f36ced6f37a20b4fb7ebb47d8@o4512149484601344.ingest.us.sentry.io/4512149562261504',
  tracesSampleRate: 0,
  enabled: process.env.NODE_ENV === 'production',
  environment: process.env.NODE_ENV,
})

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
