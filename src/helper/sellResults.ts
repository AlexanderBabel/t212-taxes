import { Currency, T212CsvEntry } from "./csv.js";
import { round } from "./number.js";

function getSellResults(
  soldShares: T212CsvEntry[],
  currency: Currency = "EUR"
) {
  const soldSharesArray = soldShares.filter(
    (d) => d.pricePerShareCurrency === currency
  );

  const profits = soldSharesArray
    .filter((d) => d.result > 0)
    .reduce((total, cur) => total + cur.result, 0);

  const losses = soldSharesArray
    .filter((d) => d.result < 0)
    .reduce((total, cur) => total + cur.result, 0);

  return {
    profits: round(profits),
    losses: round(losses),
    total: round(profits + losses),
  };
}

export function getPrintableSellResults(
  soldShares: T212CsvEntry[],
  mainCurrency: Currency,
  currency?: Currency,
  label?: string
) {
  const res = getSellResults(soldShares, currency);
  return `
      ----- ${label ? label : currency} P/L -----
      Profits: ${res.profits} ${mainCurrency}
      Losses: ${res.losses} ${mainCurrency}
      Total: ${res.total} ${mainCurrency}`;
}
