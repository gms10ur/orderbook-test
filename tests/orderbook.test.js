import axios from "axios";
import { jest } from "@jest/globals";
import {
  fetchBinanceOrderBook,
  fetchBtcTurkOrderBook,
  calculateUsdtNeeded,
  compareExchanges,
} from "../orderbook.js";

// Mock axios responses with status + correct structure
jest.spyOn(axios, "get").mockImplementation((url, config) => {
  if (url.includes("binance")) {
    return Promise.resolve({
      status: 200,
      data: {
        asks: [
          ["85813.59", "0.05105"],
          ["85814.00", "0.02500"],
          ["85820.00", "0.10000"],
        ],
        bids: [
          ["85813.50", "0.04000"],
          ["85813.00", "0.03000"],
        ],
      },
    });
  } else if (url.includes("btcturk")) {
    return Promise.resolve({
      status: 200,
      data: {
        data: {
          asks: [
            ["85757", "0.02330"],
            ["85758", "0.02330"],
            ["85761", "0.01000"],
          ],
          bids: [
            ["85710", "0.00116"],
            ["85700", "0.00075"],
          ],
        },
      },
    });
  }
  return Promise.reject(new Error(`Unhandled URL in mock: ${url}`));
});

test("compareExchanges returns correct comparison", async () => {
  const result = await compareExchanges(0.001);

  // Check structure
  expect(result).toHaveProperty("binance.price");
  expect(result).toHaveProperty("binance.usdtNeeded");
  expect(result).toHaveProperty("btcTurk.price");
  expect(result).toHaveProperty("btcTurk.usdtNeeded");
  expect(result).toHaveProperty("betterExchange");
  expect(result).toHaveProperty("priceDifferencePercent");

  // According to our mock data, BtcTurk should have the better price
  expect(result.betterExchange).toBe("BtcTurk");
  expect(result.priceDifferencePercent).toBe("0.06598878");
});
