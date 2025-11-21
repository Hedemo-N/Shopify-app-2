import createApp from "@shopify/app-bridge";
import {
  getSessionToken,
  authenticatedFetch,
} from "@shopify/app-bridge-utils";

// samma kod som du redan har, du behöver inte ändra nåt annat


const params = new URLSearchParams(window.location.search);
const shop = params.get("shop");
const host = params.get("host");

if (window.top === window.self) {
  window.location.href = `/auth?shop=${shop}&host=${host}`;
} else {
  const app = createApp({
    apiKey: "f1ad1b493f65f36ffbc728cb00e594fe",
    host,
    forceRedirect: true,
  }); 


  const fetchWithAuth = authenticatedFetch(app);

  async function load() {
    const token = await getSessionToken(app);

    const res = await fetchWithAuth("/api/get-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shop }),
    });

    const s = await res.json();

    document.getElementById("enable_ombud").checked = !!s.erbjuda_ombud;
    document.getElementById("enable_express").checked = !!s.erbjuda_hemleverans_express;
    document.getElementById("enable_evening").checked = !!s.erbjuda_hemleverans_kvall;

    document.getElementById("price_ombud").value = s.pris_ombud ?? "";
    document.getElementById("count_ombud").value = s.number_box ?? "";
    document.getElementById("cutoff_ombud").value = s.cutoff_time_ombud ?? "";

    document.getElementById("price_express").value = s.pris_hem2h ?? "";
    document.getElementById("price_evening").value = s.pris_hemkvall ?? "";
    document.getElementById("cutoff_evening").value = s.cutoff_time_evening ?? "";
  }

  async function save() {
    const body = {
      shop,

      erbjuda_ombud: document.getElementById("enable_ombud").checked,
      erbjuda_hemleverans_express: document.getElementById("enable_express").checked,
      erbjuda_hemleverans_kvall: document.getElementById("enable_evening").checked,

      pris_ombud: Number(document.getElementById("price_ombud").value),
      number_box: Number(document.getElementById("count_ombud").value),
      cutoff_time_ombud: document.getElementById("cutoff_ombud").value,

      pris_hem2h: Number(document.getElementById("price_express").value),
      pris_hemkvall: Number(document.getElementById("price_evening").value),
      cutoff_time_evening: document.getElementById("cutoff_evening").value,
    };

    await fetchWithAuth("/api/update-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  document.getElementById("saveBtn").onclick = save;

  load();
}
