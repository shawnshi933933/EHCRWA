import { Router, type IRouter } from "express";
import healthRouter from "./health";
import equitiesRouter from "./equities";

const router: IRouter = Router();

router.use(healthRouter);
router.use(equitiesRouter);

export default router;
