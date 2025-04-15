import axios from "axios";

// --- VALIDATION HELPERS ---

const validateBinanceData = (data) => {
  return data && Array.isArray(data.asks) && Array.isArray(data.bids);
};

const validateBtcTurkData = (data) => {
  return data && Array.isArray(data.asks) && Array.isArray(data.bids);
};

// --- FETCH FUNCTIONS ---

export const fetchBinanceOrderBook = async (
  symbol = "BTCUSDT",
  limit = 100
) => {
  const url = "https://www.binance.com/api/v1/depth";
  try {
    const response = await axios.get(url, {
      params: { symbol, limit },
      timeout: 5000,
    });

    if (response.status !== 200) {
      throw new Error(`Unexpected Binance status: ${response.status}`);
    }

    const data = response.data;

    if (!validateBinanceData(data)) {
      throw new Error("Binance response format is invalid");
    }

    return {
      asks: data.asks,
      bids: data.bids,
    };
  } catch (error) {
    console.error("Binance API Error:", {
      message: error.message,
      code: error.code,
      isAxiosError: error.isAxiosError,
    });
    throw new Error("Failed to fetch order book from Binance");
  }
};

export const fetchBtcTurkOrderBook = async (
  symbol = "BTCUSDT",
  limit = 100
) => {
  const url = "https://api.btcturk.com/api/v2/orderbook";
  try {
    const response = await axios.get(url, {
      params: { pairSymbol: symbol, limit },
      timeout: 5000,
    });

    if (response.status !== 200) {
      throw new Error(`Unexpected BtcTurk status: ${response.status}`);
    }

    const data = response.data?.data;

    if (!validateBtcTurkData(data)) {
      throw new Error("BtcTurk response format is invalid");
    }

    return {
      asks: data.asks,
      bids: data.bids,
    };
  } catch (error) {
    console.error("BtcTurk API Error:", {
      message: error.message,
      code: error.code,
      isAxiosError: error.isAxiosError,
    });
    throw new Error("Failed to fetch order book from BtcTurk");
  }
};

// --- CORE CALCULATION ---

export const calculateUsdtNeeded = (asks, btcAmount, partialFill = false) => {
  let remaining = btcAmount;
  let totalCost = 0;
  let filled = 0;

  for (const [priceStr, quantityStr] of asks) {
    const price = parseFloat(priceStr);
    const quantity = parseFloat(quantityStr);

    if (remaining <= quantity) {
      totalCost += remaining * price;
      filled += remaining;
      remaining = 0;
      break;
    } else {
      totalCost += quantity * price;
      remaining -= quantity;
      filled += quantity;
    }
  }

  if (filled === 0) {
    remaining = btcAmount; // No BTC was filled
  }

  const isFilled = remaining === 0;

  if (!isFilled && !partialFill) {
    throw new Error("Order book does not have enough liquidity for full fill.");
  }

  return {
    usdtNeeded: parseFloat(totalCost.toFixed(8)),
    filledBtc: parseFloat(filled.toFixed(8)),
    unfilledBtc: parseFloat(remaining.toFixed(8)),
    isPartial: !isFilled,
  };
};

// --- COMPARISON ---

export const compareExchanges = async (
  btcAmount,
  options = { partialFill: true }
) => {
  if (typeof btcAmount !== "number" || btcAmount <= 0) {
    throw new Error("Invalid BTC amount. Must be a positive number.");
  }

  const { partialFill } = options;

  try {
    const [binance, btcturk] = await Promise.all([
      fetchBinanceOrderBook(),
      fetchBtcTurkOrderBook(),
    ]);

    const binanceResult = calculateUsdtNeeded(
      binance.asks,
      btcAmount,
      partialFill
    );
    const btcturkResult = calculateUsdtNeeded(
      btcturk.asks,
      btcAmount,
      partialFill
    );

    const isZero = (val) => typeof val !== "number" || isNaN(val) || val <= 0;
    if (isZero(binanceResult.filledBtc) || isZero(btcturkResult.filledBtc)) {
      throw new Error(
        "Filled BTC is zero. Try enabling partial-fill or lowering BTC amount."
      );
    }

    const binancePricePerBTC =
      binanceResult.usdtNeeded / binanceResult.filledBtc;
    const btcturkPricePerBTC =
      btcturkResult.usdtNeeded / btcturkResult.filledBtc;

    const betterExchange =
      binancePricePerBTC < btcturkPricePerBTC ? "Binance" : "BtcTurk";

    const priceDiff = Math.abs(binancePricePerBTC - btcturkPricePerBTC);
    const priceDifferencePercent = (
      (priceDiff / Math.min(binancePricePerBTC, btcturkPricePerBTC)) *
      100
    ).toFixed(8);

    return {
      binance: {
        ...binanceResult,
        price: binancePricePerBTC.toFixed(8),
      },
      btcTurk: {
        ...btcturkResult,
        price: btcturkPricePerBTC.toFixed(8),
      },
      betterExchange,
      priceDifferencePercent,
    };
  } catch (error) {
    console.error("Failed to compare exchanges:", error.message);
    throw new Error("Comparison failed due to a data retrieval error.");
  }
};

// --- CLI ENTRY POINT ---

export const runComparison = async (btcAmount = 0.001, partialFill = false) => {
  if (typeof btcAmount !== "number" || btcAmount <= 0) {
    console.error(`[Error] Invalid BTC amount: ${btcAmount}`);
    return;
  }

  console.log(`Running BTC/USDT exchange comparison...`);
  console.log(`Requested BTC amount: ${btcAmount}`);
  console.log(`Partial-fill allowed: ${partialFill}\n`);

  try {
    const result = await compareExchanges(btcAmount, { partialFill });

    if (result.binance.filledBtc === 0 && result.btcTurk.filledBtc === 0) {
      console.log(
        "No sufficient liquidity on either exchange to fill the order."
      );
      return;
    }

    const format = (label, data) => {
      console.log(`${label}`);
      console.log(`  Price per BTC : ${data.price}`);
      console.log(`  USDT needed   : ${data.usdtNeeded}`);
      console.log(`  Filled BTC    : ${data.filledBtc}`);
      console.log(`  Unfilled BTC  : ${data.unfilledBtc}`);
      console.log(`  Partial fill  : ${data.isPartial}`);
    };

    console.log("--- Comparison Result ---");
    format("Binance", result.binance);
    format("BtcTurk", result.btcTurk);
    console.log(`\nBetter Exchange : ${result.betterExchange}`);
    console.log(`Price Difference: ${result.priceDifferencePercent}%`);
    console.log("-------------------------\n");
  } catch (error) {
    console.error(`[Error] Comparison failed: ${error.message}`);
  }
};
