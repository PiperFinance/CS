import { Request, Response, Router } from "express";
import Swap from "../services/swap.service";
import { z } from "zod";

const router = Router();

const handleSwap = new Swap();

const Token = z.object({
  address: z.string(),
  symbol: z.string(),
  decimals: z.number(),
  name: z.string(),
  chainId: z.number(),
  logoURI: z.string().optional(),
  coingeckoId: z.nullable(z.string()).optional(),
  tags: z.string().array().optional(),
  lifiId: z.nullable(z.string()).optional(),
  listedIn: z.string().array(),
  verify: z.boolean(),
  related: z.any().array().optional(),
});

const schema = z.object({
  fromToken: Token,
  toToken: Token,
  amount: z.string(),
  address: z.string(),
  slippage: z.number(),
});

router.post('/routes', async (req: Request, res: Response) => {
  try {
    const { fromToken, toToken, amount, address, slippage } = schema.parse(
      req.body
    );
    
    const routes = await handleSwap.getRoutes({
      fromToken,
      toToken,
      amount,
      address,
      slippage,
    });
    res.send(routes);
  } catch (error: any) {
    console.log(error)
    res.status(400).json({ message: error.message });
  }
});

export default router;
