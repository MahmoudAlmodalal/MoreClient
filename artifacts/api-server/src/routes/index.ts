import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import settingsRouter from "./settings";
import filesRouter from "./files";
import handoffsRouter from "./handoffs";
import learnRouter from "./learn";
import analyticsRouter from "./analytics";
import chatRouter from "./chat";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(settingsRouter);
router.use(filesRouter);
router.use(handoffsRouter);
router.use(learnRouter);
router.use(analyticsRouter);
router.use(chatRouter);
router.use(adminRouter);

export default router;
