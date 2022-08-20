import { exchangeRates } from "exchange-rates-api";

const HOST = "https://api.exchangerate.host";

export function convert(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  date: Date | string = "latest"
) {
  if (typeof amount !== "number") {
    throw new TypeError("The 'amount' parameter has to be a number");
  }

  if (Array.isArray(toCurrency)) {
    throw new TypeError(
      "Cannot convert to multiple currencies at the same time"
    );
  }

  //@ts-ignore
  const instance = exchangeRates().setApiBaseUrl(HOST);

  if (date === "latest") {
    instance.latest();
  } else {
    instance.at(date);
  }

  return instance
    .base(fromCurrency)
    .symbols(toCurrency)
    .fetch()
    .then((rate: number) => rate * amount);
}
