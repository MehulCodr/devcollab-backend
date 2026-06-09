import { Router } from "express";
import { handleGithubWebhook } from "../controllers/githubWebhook.controller.js";

const router = Router();

router.post("/", handleGithubWebhook);

export default router;