import exchangeRates from "exchange-rates-api";
import { Currency, T212CsvEntry } from "./csv.js";
import { round } from "./number.js";

const { convert } = exchangeRates;

async function getDividends(
  dividends: T212CsvEntry[],
  mainCurrency: Currency,
  currency: Currency = "EUR"
) {
  const dividendsNetTotal = dividends
    .filter((d) => d.withholdingTaxCurrency === currency)
    .reduce((total, cur) => total + cur.total, 0);

  const dividendsTax = (
    await Promise.all(
      dividends
        .filter((d) => d.withholdingTax > 0)
        .filter((d) => d.withholdingTaxCurrency === currency)
        .map(async (d) =>
          convert(
            d.withholdingTax,
            d.withholdingTaxCurrency,
            mainCurrency,
            d.time!
          )
        )
    )
  ).reduce((total, cur) => total + cur, 0);

  return {
    dividendsTotal: round(dividendsNetTotal + dividendsTax),
    dividendsNetTotal: round(dividendsNetTotal),
    dividendsTax: round(dividendsTax),
  };
}

export async function getPrintableDividendResult(
  dividends: T212CsvEntry[],
  mainCurrency: Currency,
  currency?: Currency,
  label?: string
) {
  const res = await getDividends(dividends, mainCurrency, currency);
  return `
      ----- ${label ? label : currency} Dividends -----
      Dividends (Total): ${res.dividendsTotal} ${mainCurrency}
      Dividends (Tax): ${res.dividendsTax} ${mainCurrency}`;
}
