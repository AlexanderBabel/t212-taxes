import fastCsv from "fast-csv";
import exchangeRates from "exchange-rates-api";
import commander from "commander";

const { parseFile } = fastCsv;
const { convert } = exchangeRates;
const { Command, Option } = commander;

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
  action: Action;
  time?: Date;
  ISIN?: string;
  ticker?: string;
  name?: string;
  shares: number;
  pricePerShare: number;
  pricePerShareCurrency: Currency;
  exchangeRate: number;
  result: number;
  total: number;
  withholdingTax: number;
  withholdingTaxCurrency: Currency;
  chargeAmount: number;
  stampDutyReserveTax: number;
  transactionFee: number;
  finraFee: number;
  notes: string;
  id: string;
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
  "Result (EUR)"?: string;
  "Total (EUR)"?: string;
  "Withholding tax": string;
  "Currency (Withholding tax)": Currency;
  "Charge amount (EUR)"?: string;
  "Stamp duty reserve tax (EUR)"?: string;
  "Transaction fee (EUR)"?: string;
  "Finra fee (EUR)"?: string;
  Notes: string;
  ID: string;
  [key: string]: string | undefined;
};

function round(num: number, placesAfterTheDot = 2): number {
  const multiplicand = Math.pow(10, placesAfterTheDot);
  return Math.round(num * multiplicand) / multiplicand;
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

async function parseCsv(
  file: string,
  mainCurrency: Currency
): Promise<T212CsvEntry[]> {
  console.log(`[CSV Parser] File: ${file}`);
  const rows: T212CsvEntry[] = [];

  await new Promise<void>((resolve, reject) => {
    parseFile<RawT212CsvEntry, T212CsvEntry>(file, { headers: true })
      .transform(
        (data: RawT212CsvEntry): T212CsvEntry => ({
          ISIN: data.ISIN,
          ticker: data.Ticker,
          name: data.Name,
          action: data.Action,
          pricePerShareCurrency: data["Currency (Price / share)"],
          withholdingTaxCurrency: data["Currency (Withholding tax)"],
          notes: data.Notes,
          id: data.ID,

          time: data.Time ? new Date(data.Time) : undefined,

          shares: parseNumber(data["No. of shares"]),
          pricePerShare: parseNumber(data["Price / share"]),
          exchangeRate: parseNumber(data["Exchange rate"]),
          result: parseNumber(data[`Result (${mainCurrency})`]!),
          total: parseNumber(data[`Total (${mainCurrency})`]!),
          withholdingTax: parseNumber(data["Withholding tax"]),
          chargeAmount: parseNumber(data[`Charge amount (${mainCurrency})`]!),
          stampDutyReserveTax: parseNumber(
            data[`Stamp duty reserve tax (${mainCurrency})`]!
          ),
          transactionFee: parseNumber(
            data[`Transaction fee (${mainCurrency})`]!
          ),
          finraFee: parseNumber(data[`Finra fee (${mainCurrency})`]!),
        })
      )
      .on("error", (error) => reject(error))
      .on("data", (row) => rows.push(row))
      .on("end", (rowCount: number) => {
        console.log(`[CSV Parser] Parsed ${rowCount} rows`);
        resolve();
      });
  });

  return rows;
}

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

async function getPrintableDividendResult(
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

function getPrintableSellResults(
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

const program = new Command();
const currencies: Currency[] = ["EUR", "USD", "GBX"];

type CommandOptions = {
  currency: Currency;
  countryCode: string;
  domestic: boolean;
};

program
  .arguments("<path-to-csv>")
  .description("Prints out your profits and dividends from Trading212", {
    ["path-to-csv"]: "The path to the CSV that you downloaded from Trading212",
  })
  .addOption(
    new Option(
      "-c, --currency <currency>",
      "The currency of your Trading212 account"
    )
      .default("EUR")
      .choices(currencies)
  )
  .option(
    "-co, --country-code <country code>",
    "The country code (e.g. DE, UK) of the country you are in. (Only needed if you are using the domestic option)",
    "DE"
  )
  .option(
    "-d, --domestic",
    "Use this option if you want to show domestic profits and dividends separately",
    false
  )
  .action(async (pathToCsv: string, options: CommandOptions) => {
    const rows = await parseCsv(pathToCsv, options.currency);
    const dividends = rows.filter(
      (r) =>
        r.action === "Dividend (Ordinary)" ||
        r.action === "Dividend (Return of capital)"
    );
    const soldShares = rows.filter(
      (r) => r.action === "Market sell" || r.action === "Stop sell"
    );

    if (options.domestic) {
      const domesticDividends = dividends.filter((d) =>
        d.ISIN?.startsWith(options.countryCode)
      );
      const domesticDividendsResult = await getPrintableDividendResult(
        domesticDividends,
        options.currency,
        options.currency,
        `Domestic ${options.currency}`
      );

      const domesticSoldShares = soldShares.filter((s) =>
        s.ISIN?.startsWith(options.countryCode)
      );
      const domesticSoldSharesResult = await getPrintableSellResults(
        domesticSoldShares,
        options.currency,
        options.currency,
        `Domestic ${options.currency}`
      );

      const foreignDividends = dividends.filter(
        (d) => !d.ISIN?.startsWith(options.countryCode)
      );
      const foreignDividendsResult = await Promise.all(
        currencies.map((c) =>
          getPrintableDividendResult(
            foreignDividends,
            options.currency,
            c,
            `Foreign ${c}`
          )
        )
      );

      const foreignSoldShares = soldShares.filter(
        (s) => !s.ISIN?.startsWith(options.countryCode)
      );
      const foreignSoldSharesResult = await Promise.all(
        currencies.map((c) =>
          getPrintableSellResults(
            foreignSoldShares,
            options.currency,
            c,
            `Foreign ${c}`
          )
        )
      );

      console.log(`
      --------- Dividends ---------
      ${domesticDividendsResult}
  
      ${foreignDividendsResult.join("\n")}
  
      ------------ P/L ------------
      ${domesticSoldSharesResult}
  
      ${foreignSoldSharesResult.join("\n")}
    `);
    } else {
      const dividendsResult = await Promise.all(
        currencies.map((c) =>
          getPrintableDividendResult(dividends, options.currency, c)
        )
      );

      const soldSharesResult = await Promise.all(
        currencies.map((c) =>
          getPrintableSellResults(soldShares, options.currency, c)
        )
      );

      console.log(`
      --------- Dividends ---------
      ${dividendsResult.join("\n")}
  
      ------------ P/L ------------
      ${soldSharesResult.join("\n")}
    `);
    }
  })
  .parseAsync(process.argv);
