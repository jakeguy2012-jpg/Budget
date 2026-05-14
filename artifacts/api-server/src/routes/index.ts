import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import dashboardRouter from "./dashboard";
import transactionsRouter from "./transactions";
import categoriesRouter from "./categories";
import budgetsRouter from "./budgets";
import accountsRouter from "./accounts";
import connectionsRouter from "./connections";
import rulesRouter from "./rules";
import importsRouter from "./imports";
import exportRouter from "./export";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/dashboard", dashboardRouter);
router.use("/transactions", transactionsRouter);
router.use("/categories", categoriesRouter);
router.use("/budgets", budgetsRouter);
router.use("/accounts", accountsRouter);
router.use("/connections", connectionsRouter);
router.use("/rules", rulesRouter);
router.use("/imports", importsRouter);
router.use("/export", exportRouter);

export default router;
