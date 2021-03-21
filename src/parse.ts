import fastCsv from "fast-csv";
import exchangeRates from "exchange-rates-api";

/************* CONFIG *************/

const CSV_FILE = "csv/2020.csv";
const MY_CURRENCY = "EUR";

/*********** END CONFIG ***********/

const { parseFile } = fastCsv;
const { convert } = exchangeRates;

type Currency = "USD" | "EUR" | "GBX";

type Action =
  | "Deposit"
  | "Withdrawal"
  | "Market buy"
  | "Market sell"
  | "Stop sell"
  | "Dividend (Ordinary)"
  | "Dividend (Return of capital)";

type T212CsvEntry = {
  Action: Action;
  Time?: Date;
  ISIN?: string;
  Ticker?: string;
  Name?: string;
  "No. of shares": number;
  "Price / share": number;
  "Currency (Price / share)": Currency;
  "Exchange rate": number;
  "Result (EUR)": number;
  "Total (EUR)": number;
  "Withholding tax": number;
  "Currency (Withholding tax)": Currency;
  "Charge amount (EUR)": number;
  "Stamp duty reserve tax (EUR)": number;
  "Transaction fee (EUR)": number;
  "Finra fee (EUR)": number;
  Notes: string;
  ID: string;
};

type RawT212CsvEntry = {
  Action: Action;
  Time?: string;
  ISIN?: string;
  Ticker?: string;
  Name?: string;
  "No. of shares": string;
  "Price / share": string;
  "Currency (Price / share)": Currency;
  "Exchange rate": string;
  "Result (EUR)": string;
  "Total (EUR)": string;
  "Withholding tax": string;
  "Currency (Withholding tax)": Currency;
  "Charge amount (EUR)": string;
  "Stamp duty reserve tax (EUR)": string;
  "Transaction fee (EUR)": string;
  "Finra fee (EUR)": string;
  Notes: string;
  ID: string;
};

function trunc(num: number, placesAfterTheDot = 3): number {
  const multiplicand = Math.pow(10, placesAfterTheDot);
  return Math.trunc(num * multiplicand) / multiplicand;
}

function parseNumber(input: string): number {
  if (!input || input === "Not available") {
    return 0;
  }

  try {
    return Number.parseFloat(input);
  } catch (err) {
    return 0;
  }
}

async function parseCsv(file: string): Promise<T212CsvEntry[]> {
  const rows: T212CsvEntry[] = [];

  await new Promise<void>((resolve, reject) => {
    parseFile<RawT212CsvEntry, T212CsvEntry>(file, { headers: true })
      .transform(
        (data: RawT212CsvEntry): T212CsvEntry => ({
          ...data,
          Time: data.Time ? new Date(data.Time) : undefined,
          "No. of shares": parseNumber(data["No. of shares"]),
          "Price / share": parseNumber(data["Price / share"]),
          "Exchange rate": parseNumber(data["Exchange rate"]),
          "Result (EUR)": parseNumber(data["Result (EUR)"]),
          "Total (EUR)": parseNumber(data["Total (EUR)"]),
          "Withholding tax": parseNumber(data["Withholding tax"]),
          "Charge amount (EUR)": parseNumber(data["Charge amount (EUR)"]),
          "Stamp duty reserve tax (EUR)": parseNumber(
            data["Stamp duty reserve tax (EUR)"]
          ),
          "Transaction fee (EUR)": parseNumber(data["Transaction fee (EUR)"]),
          "Finra fee (EUR)": parseNumber(data["Finra fee (EUR)"]),
        })
      )
      .on("error", (error) => reject(error))
      .on("data", (row) => rows.push(row))
      .on("end", (rowCount: number) => {
        console.log(`Parsed ${rowCount} rows`);
        resolve();
      });
  });

  return rows;
}

async function getDividends(
  dividends: T212CsvEntry[],
  currency: Currency = "EUR"
) {
  const dividendsNetTotal = dividends
    .filter((d) => d["Currency (Withholding tax)"] === currency)
    .reduce((total, cur) => total + cur["Total (EUR)"], 0);

  const dividendsTax = (
    await Promise.all(
      dividends
        .filter((d) => d["Withholding tax"] > 0)
        .filter((d) => d["Currency (Withholding tax)"] === currency)
        .map(async (d) =>
          convert(
            d["Withholding tax"],
            d["Currency (Withholding tax)"],
            MY_CURRENCY,
            d.Time!
          )
        )
    )
  ).reduce((total, cur) => total + cur, 0);

  return {
    dividendsTotal: trunc(dividendsNetTotal + dividendsTax),
    dividendsNetTotal: trunc(dividendsNetTotal),
    dividendsTax: trunc(dividendsTax),
  };
}

async function getPrintableDividendResult(
  dividends: T212CsvEntry[],
  currency: Currency
) {
  const res = await getDividends(dividends, currency);
  return `
      ----- Dividends ${currency} -----
      Dividends (Total): ${res.dividendsTotal} ${MY_CURRENCY}
      Dividends (Tax): ${res.dividendsTax} ${MY_CURRENCY}`;
}

function getSellResults(
  soldShares: T212CsvEntry[],
  currency: Currency = "EUR"
) {
  const profits = soldShares
    .filter((d) => d["Currency (Price / share)"] === currency)
    .filter((d) => d["Result (EUR)"] > 0)
    .reduce((total, cur) => total + cur["Result (EUR)"], 0);

  const losses = soldShares
    .filter((d) => d["Currency (Price / share)"] === currency)
    .filter((d) => d["Result (EUR)"] < 0)
    .reduce((total, cur) => total + cur["Result (EUR)"], 0);

  return {
    profits: trunc(profits),
    losses: trunc(losses),
    total: trunc(profits + losses),
  };
}

function getPrintableSellResults(
  soldShares: T212CsvEntry[],
  currency: Currency
) {
  const res = getSellResults(soldShares, currency);
  return `
      ----- P/L ${currency} -----
      Profits: ${res.profits} ${MY_CURRENCY}
      Losses: ${res.losses} ${MY_CURRENCY}
      Total: ${res.total} ${MY_CURRENCY}`;
}

(async () => {
  const currencies: Currency[] = ["EUR", "USD", "GBX"];
  const rows = await parseCsv(CSV_FILE);
  const dividends = rows.filter(
    (r) =>
      r.Action === "Dividend (Ordinary)" ||
      r.Action === "Dividend (Return of capital)"
  );
  const soldShares = rows.filter(
    (r) => r.Action === "Market sell" || r.Action === "Stop sell"
  );

  const dividendsResult = await Promise.all(
    currencies.map((c) => getPrintableDividendResult(dividends, c))
  );

  const soldSharesResult = await Promise.all(
    currencies.map((c) => getPrintableSellResults(soldShares, c))
  );

  console.log(`
    CSV file: ${CSV_FILE}

    --------- Dividends ---------
    ${dividendsResult.join("\n")}

    ------------ P/L ------------
    ${soldSharesResult.join("\n")}
`);
})();
