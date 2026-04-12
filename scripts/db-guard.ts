/**
 * Guard de production — empeche l'execution de scripts DB destructifs en prod.
 * Utilise comme prefixe dans les scripts npm db:seed et db:reset.
 */

const env = process.env.NODE_ENV;
const isProduction =
  env === "production" ||
  !!process.env.RAILWAY_ENVIRONMENT ||
  !!process.env.CLOUD_RUN_JOB;

if (isProduction) {
  console.error("ERREUR: Ce script ne peut pas être exécuté en production.");
  console.error(`  NODE_ENV = ${env}`);
  process.exit(1);
}

console.log(`[db-guard] Environnement: ${env || "development"} — OK`);
