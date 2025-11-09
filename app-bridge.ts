import createApp from '@shopify/app-bridge';
import { getSessionToken } from '@shopify/app-bridge-utils';

const apiKey = process.env.SHOPIFY_API_KEY; // OBS: Detta fungerar bara om du injectar den i bygget

const app = createApp({
  apiKey: apiKey!,
  host: new URLSearchParams(window.location.search).get("host")!,
  forceRedirect: true,
});

export async function getToken() {
  return await getSessionToken(app);
}

export default app;
