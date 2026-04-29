import { Router, type IRouter } from "express";
import healthRouter from "./health";
import customersRouter from "./customers";
import productsRouter from "./products";
import invoicesRouter from "./invoices";
import estimatesRouter from "./estimates";
import girviRouter from "./girvi";
import ledgerRouter from "./ledger";
import karigarRouter from "./karigar";
import repairsRouter from "./repairs";
import schemesRouter from "./schemes";
import settingsRouter from "./settings";
import reportsRouter from "./reports";

const router: IRouter = Router();

router.use(healthRouter);
router.use(customersRouter);
router.use(productsRouter);
router.use(invoicesRouter);
router.use(estimatesRouter);
router.use(girviRouter);
router.use(ledgerRouter);
router.use(karigarRouter);
router.use(repairsRouter);
router.use(schemesRouter);
router.use(settingsRouter);
router.use(reportsRouter);

export default router;
