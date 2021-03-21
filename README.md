# T212 Taxes

This is a simple script that can help you with your tax statement. It's parsing the CSV file that can be exported from Trading212 in order to give you an overview of received dividends and profits/losses.

## How to use this script

1. Clone/Download this repo
2. Make sure you have NodeJS 14 or higher installed.
3. Install the dependencies of this project. I recommend Yarn, but you can also use npm. Yarn: `yarn` NPM: `npm install`
4. Start the script with `yarn parse --help` or `npm run parse -- --help` in order to see the script help output
5. Run the script with the path to the csv as a parameter: `yarn parse <path to csv>` or `npm run parse -- <path to csv>`

## Help output

```bash
Usage: parse [options] <path-to-csv>

Prints out your profits and dividends from Trading212

Arguments:
  path-to-csv                         The path to the CSV that you downloaded from Trading212

Options:
  -c, --currency <currency>           The currency of your Trading212 account (choices: "EUR", "USD", "GBX", default: "EUR")
  -co, --country-code <country code>  The country code (e.g. DE, UK) of the country you are in. (Only needed if you are using the domestic option) (default: "DE")
  -d, --domestic                      Use this option if you want to show domestic profits and dividends separately (default: false)
  -h, --help                          display help for command
```

## Example outputs

Command: `yarn parse csv/2020.csv --country-code DE --currency EUR --domestic`

```bash
[CSV Parser] File: csv/2020.csv
[CSV Parser] Parsed 100 rows

      --------- Dividends ---------

      ----- Domestic EUR Dividends -----
      Dividends (Total): 25 EUR
      Dividends (Tax): 0 EUR


      ----- Foreign EUR Dividends -----
      Dividends (Total): 0 EUR
      Dividends (Tax): 0 EUR

      ----- Foreign USD Dividends -----
      Dividends (Total): 50 EUR
      Dividends (Tax): 10 EUR

      ----- Foreign GBX Dividends -----
      Dividends (Total): 0 EUR
      Dividends (Tax): 0 EUR

      ------------ P/L ------------

      ----- Domestic EUR P/L -----
      Profits: 100 EUR
      Losses: -50 EUR
      Total: 50 EUR


      ----- Foreign EUR P/L -----
      Profits: 0 EUR
      Losses: 0 EUR
      Total: 0 EUR

      ----- Foreign USD P/L -----
      Profits: 1000 EUR
      Losses: -200 EUR
      Total: 800 EUR

      ----- Foreign GBX P/L -----
      Profits: 0 EUR
      Losses: 0 EUR
      Total: 0 EUR
```

Command: `yarn parse csv/2020.csv --country-code DE --currency EUR`

```bash
[CSV Parser] File: csv/2020.csv
[CSV Parser] Parsed 100 rows

      --------- Dividends ---------

      ----- EUR Dividends -----
      Dividends (Total): 25 EUR
      Dividends (Tax): 0 EUR

      ----- USD Dividends -----
      Dividends (Total): 50 EUR
      Dividends (Tax): 10 EUR

      ----- GBX Dividends -----
      Dividends (Total): 0 EUR
      Dividends (Tax): 0 EUR

      ------------ P/L ------------

      ----- EUR P/L -----
      Profits: 100 EUR
      Losses: -50 EUR
      Total: 50 EUR

      ----- USD P/L -----
      Profits: 1000 EUR
      Losses: -200 EUR
      Total: 800 EUR

      ----- GBX P/L -----
      Profits: 0 EUR
      Losses: 0 EUR
      Total: 0 EUR
```
