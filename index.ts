import session from "express-session";
import "@shopify/shopify-api/adapters/node";
import express from "express";
import dotenv from "dotenv";
import { shopifyApi, ApiVersion } from "@shopify/shopify-api";
import authRoutes from "./auth.js";
import ordersRoute from "./api/orders.js";
import shippingRatesRoutes from "./api/shipping-rates.js";
import ordersCreateWebhook from "./api/webhooks/orders-create.js";
import sendLabelEmailRouter from "./api/webhooks/send-label-email.js";
import appUninstalledWebhook from "./api/webhooks/app-uninstalled.js";
import customersDataRequest from "./api/webhooks/customers-data-request.js";
import customersRedact from "./api/webhooks/customers-redact.js";
import shopRedact from "./api/webhooks/shop-redact.js";
import path from "path";
import cookieParser from "cookie-parser";
import { customSessionStorage } from "./customSessionStorage.js";
import topLevelAuthRoute from "./auth/topLevel.js";

dotenv.config();

const app = express();
app.set("trust proxy", 1); // 🧠 Vercel kräver detta för secure cookies

app.use(
  session({
    secret: process.env.SHOPIFY_API_SECRET!,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: true,         // ❗ krävs för SameSite=None
      sameSite: "none",     // ❗ krävs för att funka i iframe
      httpOnly: true,       // extra säkerhet
      maxAge: 60000,        // 1 minut (räcker för OAuth)
    },
  })
);
const PORT = 3000;

app.use(cookieParser());
app.use("/", topLevelAuthRoute);
app.use("/", authRoutes);

// --- Shopify initiering ---
const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY!,
  apiSecretKey: process.env.SHOPIFY_API_SECRET!,
  scopes: process.env.SHOPIFY_SCOPES!.split(","),
  hostName: process.env.SHOPIFY_APP_URL!.replace(/https?:\/\//, ""),
  apiVersion: ApiVersion.July24,
  isEmbeddedApp: true,
  sessionStorage: customSessionStorage,
});

// --- Webhooks som kräver raw body först ---
app.use("/", ordersCreateWebhook);
app.use("/api/webhooks", appUninstalledWebhook);

// --- JSON-parser (måste komma efter eventuella raw body routes) ---
app.use(express.json());

// --- Statisk filserver ---
app.use(express.static("public"));

// --- Root: redirect vid installation annars index.html ---
app.get("/", (req, res) => {
  const shop = req.query.shop as string;
  const host = req.query.host as string;

  if (shop && host) {
    return res.redirect(`/auth?shop=${shop}&host=${host}`);
  }

  res.sendFile("index.html", { root: path.join(process.cwd(), "public") });
});

// --- API och webhooks ---
app.use("/api", ordersRoute);
app.use("/", shippingRatesRoutes);
app.use("/api/webhooks", sendLabelEmailRouter);
app.use("/", customersDataRequest);
app.use("/", customersRedact);
app.use("/", shopRedact);

export default app;
