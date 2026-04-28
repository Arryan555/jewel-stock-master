import { Router, type IRouter } from "express";
import healthRouter from "./health";
import customersRouter from "./customers";
import productsRouter from "./products";
import invoicesRouter from "./invoices";
import girviRouter from "./girvi";
import ledgerRouter from "./ledger";
import reportsRouter from "./reports";

const router: IRouter = Router();

router.use(healthRouter);
router.use(customersRouter);
router.use(productsRouter);
router.use(invoicesRouter);
router.use(girviRouter);
router.use(ledgerRouter);
router.use(reportsRouter);

export default router;
