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

};


runComparison(0.001);