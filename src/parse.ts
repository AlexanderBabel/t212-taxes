import commander from "commander";
import { Currency, parseCsv } from "./helper/csv.js";
import { getPrintableDividendResult } from "./helper/dividends.js";
import { getPrintableSellResults } from "./helper/sellResults.js";

const { Command, Option } = commander;

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
