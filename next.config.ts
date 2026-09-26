import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const nextConfig: NextConfig = {
  /* config options here */
};

export default withSentryConfig(nextConfig, {
  org: "gest-ar",
  project: "pymez-360",
  silent: true,
  // Los eventos salen por el propio dominio: así no los bloquean los
  // filtros de publicidad que suele haber en las redes escolares.
  tunnelRoute: "/monitoring",
  // Sin token de Sentry no se pueden subir los mapas de código; se desactiva
  // para que el build no falle ni tire advertencias en cada compilación.
  sourcemaps: { disable: true },
});
