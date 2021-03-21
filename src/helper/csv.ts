import fastCsv from "fast-csv";
import { parseNumber } from "./number.js";

const { parseFile } = fastCsv;

export type Currency = "USD" | "EUR" | "GBX";

type Action =
  | "Deposit"
  | "Withdrawal"
  | "Market buy"
  | "Market sell"
  | "Stop sell"
  | "Dividend (Ordinary)"
  | "Dividend (Return of capital)";

export type T212CsvEntry = {
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

export async function parseCsv(
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
