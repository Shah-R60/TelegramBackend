import { Router } from "express";
import { handleStreamWebhook } from "../controller/streamWebhook.controller.js";

const router = Router();

// Webhook endpoint - NO AUTH (GetStream calls this)
router.post("/webhook", handleStreamWebhook);

export default router;
