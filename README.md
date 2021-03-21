# T212 Taxes

This is a simple script that can help you with your tax statement. It's parsing the CSV file that can be exported from Trading212 in order to give you an overview of received dividends and profits/losses.

## How to use this script

1. Clone/Download this repo
2. Make sure you have NodeJS 14 or higher installed.
3. Install the dependencies of this project. I recommend Yarn, but you can also use npm. Yarn: `yarn` NPM: `npm install`
4. Create a directory called `csv` and put your CSV from Trading212 in this directory
5. Edit the Config in the top of the script. You can find the script in `src/parse.ts`
6. Start the script with `yarn start` or `npm run start`

## Example output

```bash
    CSV file: csv/2020.csv

    --------- Dividends ---------

      ----- Dividends EUR -----
      Dividends (Total): 25.0 EUR
      Dividends (Tax): 0 EUR

      ----- Dividends USD -----
      Dividends (Total): 50.0 EUR
      Dividends (Tax): 10.0 EUR

      ----- Dividends GBX -----
      Dividends (Total): 0 EUR
      Dividends (Tax): 0 EUR

    ------------ P/L ------------

      ----- P/L EUR -----
      Profits: 100.0 EUR
      Losses: -50.0 EUR
      Total: 50.0 EUR

      ----- P/L USD -----
      Profits: 1000.0 EUR
      Losses: -200.0 EUR
      Total: 800.0 EUR

      ----- P/L GBX -----
      Profits: 0 EUR
      Losses: 0 EUR
      Total: 0 EUR
```
