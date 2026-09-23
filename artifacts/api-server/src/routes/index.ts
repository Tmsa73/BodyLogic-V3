import { Router, type IRouter } from "express";
import healthRouter from "./health";
import profileRouter from "./profile";
import nutritionRouter from "./nutrition";
import fitnessRouter from "./fitness";
import sleepRouter from "./sleep";
import aiRouter from "./ai";
import historyRouter from "./history";
import dashboardRouter from "./dashboard";
import waterRouter from "./water";
import stepsRouter from "./steps";
import progressRouter from "./progress";
import notificationsRouter from "./notifications";
import mealIqRouter from "./meal-iq";
import lifeBalanceRouter from "./life-balance";

const router: IRouter = Router();

router.use(healthRouter);
router.use(profileRouter);
router.use(nutritionRouter);
router.use(fitnessRouter);
router.use(sleepRouter);
router.use(aiRouter);
router.use(historyRouter);
router.use(dashboardRouter);
router.use(waterRouter);
router.use(stepsRouter);
router.use(progressRouter);
router.use(notificationsRouter);
router.use(mealIqRouter);
router.use(lifeBalanceRouter);

export default router;
