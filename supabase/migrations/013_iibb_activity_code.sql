-- Migración 013: guardar qué actividad de IIBB eligió la empresa
--
-- Hasta ahora sólo se guardaba `iibb_rate`, y la actividad se deducía al revés:
-- buscando en el catálogo de ATM Misiones la primera que tuviera esa alícuota.
-- Eso acierta poco. Las 24 actividades del catálogo se agrupan en apenas 6
-- alícuotas:
--
--     1,00% -> 3 actividades      3,00% -> 7 actividades
--     1,50% -> 4 actividades      3,50% -> 5 actividades
--     2,50% -> 1 actividad        4,00% -> 4 actividades
--
-- o sea que 20 de las 24 comparten alícuota con alguna otra y la ficha de la
-- empresa mostraba un rubro distinto del elegido. El impuesto siempre salió
-- bien —la alícuota es la correcta y la DDJJ usa la alícuota, no el código—,
-- pero didácticamente arruinaba justo lo que se quiere enseñar: que la
-- alícuota depende de la actividad.
--
-- Se deja nullable y NO se hace backfill a propósito: rellenar con la
-- actividad adivinada por alícuota sería inventar un dato. Las empresas
-- anteriores quedan en NULL y la interfaz muestra la sugerencia marcada como
-- "sin confirmar" hasta que alguien la confirme.
--
-- Aplicada en el proyecto de PyMEZ 360 (cqloepucatpusvusheel) el 2026-09-26.

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS iibb_activity_code TEXT;

COMMENT ON COLUMN public.companies.iibb_activity_code IS
  'Codigo de actividad del catalogo de ATM Misiones (lib/constants/iibb-misiones.ts). '
  'La alicuota de iibb_rate se deriva de aca. Nulo = todavia no se registro que actividad se eligio.';
