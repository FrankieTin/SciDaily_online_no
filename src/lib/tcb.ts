import cloudbase from '@cloudbase/js-sdk';

// Get Env ID from environment variable or placeholder
const envId = import.meta.env.VITE_CLOUDBASE_ENV_ID || 'scidaily-cloud-d6gnquh2oc8ac3146';

const app = cloudbase.init({
  env: envId
});

export const auth = app.auth({ persistence: 'local' });
export const db = app.database();
export default app;
