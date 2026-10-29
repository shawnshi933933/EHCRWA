import { Router, type IRouter } from "express";
import {
  GetEquityDetailParams, GetEquityDetailResponse, GetEquityIssuerParams, GetEquityIssuerResponse,
  GetEquityUniverseResponse,
} from "@workspace/api-zod";
import { getIssuerDetail, getStockDetail, getUniverse, NotCoveredError } from "../lib/equity-service";
import { CmcError } from "../lib/cmc";

const router: IRouter = Router();

function failure(error: unknown) {
  if (error instanceof NotCoveredError) return { status: 404, error: error.message };
  if (error instanceof CmcError) return { status: 503, error: error.message };
  return { status: 503, error: "Market data is temporarily unavailable. No simulated data is substituted. Please try again later." };
}

router.get("/equity-universe", async (req, res): Promise<void> => {
  try {
    res.set("Cache-Control", "no-store");
    res.json(GetEquityUniverseResponse.parse(await getUniverse()));
  } catch (error) {
    const result = failure(error);
    req.log.warn({ message: error instanceof Error ? error.message : "Unknown source failure" }, "Equity matrix unavailable");
    res.status(result.status).json({ error: result.error });
  }
});

router.get("/equities/:rwaId", async (req, res): Promise<void> => {
  const params = GetEquityDetailParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "A positive stock ID is required." }); return; }
  try {
    res.set("Cache-Control", "no-store");
    res.json(GetEquityDetailResponse.parse(await getStockDetail(params.data.rwaId)));
  } catch (error) {
    const result = failure(error);
    req.log.warn({ message: error instanceof Error ? error.message : "Unknown source failure" }, "Stock detail unavailable");
    res.status(result.status).json({ error: result.error });
  }
});

router.get("/equity-issuers/:issuerId", async (req, res): Promise<void> => {
  const params = GetEquityIssuerParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "A valid issuer ID is required." }); return; }
  try {
    res.set("Cache-Control", "no-store");
    res.json(GetEquityIssuerResponse.parse(await getIssuerDetail(params.data.issuerId)));
  } catch (error) {
    const result = failure(error);
    req.log.warn({ message: error instanceof Error ? error.message : "Unknown source failure" }, "Issuer detail unavailable");
    res.status(result.status).json({ error: result.error });
  }
});

export default router;
