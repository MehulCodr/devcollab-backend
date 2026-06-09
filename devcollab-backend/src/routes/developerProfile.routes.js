import { Router } from "express";
import {
  getMyDeveloperProfile,
  updateMyDeveloperProfile
} from "../controllers/developerProfile.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT);

router.get("/me", getMyDeveloperProfile);
router.put("/me", updateMyDeveloperProfile);

export default router;
