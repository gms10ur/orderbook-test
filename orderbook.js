import axios from "axios";

export const runComparison = async (btcAmount = 0.001) => {
  console.log("Running comparison...");
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

};


runComparison(0.001);