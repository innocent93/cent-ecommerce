import express from 'express';
import config from '../config/env.js';
import { SUPPORTED_CURRENCIES, refreshRates, convert } from '../utils/currency.js';
import sendSuccess from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

const currencyRouter = express.Router();

// GET /api/currency  — supported currencies + current rates relative to base
currencyRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    await refreshRates();
    const rates = Object.fromEntries(
      SUPPORTED_CURRENCIES.map((code) => [code, convert(1, code).amount])
    );
    return sendSuccess(res, { baseCurrency: config.baseCurrency, currencies: SUPPORTED_CURRENCIES, rates });
  })
);

export default currencyRouter;
