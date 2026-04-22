import cloudbase from '@cloudbase/js-sdk';

// Get Env ID from environment variable or placeholder
const envId = import.meta.env.VITE_CLOUDBASE_ENV_ID || 'scidaily-cloud-d6gnquh2oc8ac3146';

const app = cloudbase.init({
  env: envId,
  // 手机短信能力需使用上海地域，顺带统一认证请求区域。
  region: 'ap-shanghai',
});

export const auth = app.auth({ persistence: 'local' });
export const db = app.database();
export default app;
