import * as readline from 'readline'
import * as path from 'path'
import * as fs from 'fs'
import * as logger from './utils/logger'
import * as cookieManager from './utils/cookie-manager'
import { calculateSteamMarketTotal, AuthParams, MarketTotalResult } from './utils/steam-api'

// Helper function to get user input from the command line
function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise(resolve => {
    rl.question(`${logger.consoleColors.cyan}${question}${logger.consoleColors.reset}`, answer => {
      rl.close()
      resolve(answer)
    })
  })
}

// Save the transaction data to a JSON file
// Returns true if successful, false otherwise
function saveToJsonFile(data: MarketTotalResult, outputPath: string): boolean {
  try {
    // Format the data into a more readable structure
    const outputData = {
      summary: {
        totalSales: data.sales,
        totalPurchases: data.purchases,
        grandTotal: data.total,
        currency: data.currency,
        itemCount: data.items.length,
      },
      transactions: data.items.map(item => ({
        name: item.name,
        price: item.price,
        formattedPrice: logger.formatCurrency(item.price, data.currency),
        type: item.type,
      })),
    }

    // Create the directory if it doesn't exist
    const dir = path.dirname(outputPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    // Write the data to the file
    fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2), 'utf8')
    return true
  } catch (error) {
    logger.logError(`Failed to save transaction data: ${(error as Error).message}`)
    logger.logVerbose((error as Error).stack || '')
    return false
  }
}

// Main function to run the CLI interface
export async function runCli(topTransactionsCount = 10, outputPath: string | null = null): Promise<void> {
  logger.logHeader('STEAM MARKET HISTORY CALCULATOR')

  let authParams: AuthParams | null = null
  const savedCookies = cookieManager.loadCookies()
  let useSavedCookies = false

  // Check if we have saved cookies
  if (savedCookies) {
    logger.logInfo('Found saved authentication data in .env file')
    const useExisting = await prompt('Do you want to use saved authentication data? (y/n): ')

    if (useExisting.toLowerCase() === 'y') {
      authParams = savedCookies
      useSavedCookies = true
      logger.logSuccess('Using saved authentication data')
    } else {
      logger.logInfo('Proceeding with manual authentication entry')
    }
  }

  // If we're not using saved cookies, ask for them
  if (!useSavedCookies) {
    // Show instructions for finding the cookies
    logger.log('\n📋 Instructions:', logger.consoleColors.bright)
    logger.log('1. Go to "https://steamcommunity.com" and sign in to your account')
    logger.log('2. Press F12 to open Developer Tools, go to the Application (or Storage) tab')
    logger.log('3. Find the Cookies section on the left, and select the steamcommunity.com domain')
    logger.log('4. Find the following cookies and copy their values\n')

    logger.logHeader('ENTER AUTHENTICATION DETAILS')

    // Get the required cookies
    authParams = {
      sessionId: await prompt('sessionid: '),
      steamLoginSecure: await prompt('steamLoginSecure: '),
    }

    // Ask for optional cookies
    const useSma = await prompt('Do you need to provide a steamMachineAuth cookie? (y/n): ')
    if (useSma.toLowerCase() === 'y') {
      authParams.steamMachineAuth = await prompt('steamMachineAuth: ')
      authParams.steamId = await prompt('Steam ID: ')
      logger.logVerbose('Added steamMachineAuth to authentication parameters')
    }

    const useParental = await prompt('Do you need to provide a steamParental cookie? (y/n): ')
    if (useParental.toLowerCase() === 'y') {
      authParams.steamParental = await prompt('Steam Parental: ')
      logger.logVerbose('Added steamParental to authentication parameters')
    }

    // Ask if the user wants to save the cookies for next time
    const saveCookiesResponse = await prompt(
      'Would you like to save these authentication details for future use? (y/n): ',
    )
    if (saveCookiesResponse.toLowerCase() === 'y') {
      if (cookieManager.saveCookies(authParams)) {
        logger.logInfo(`Authentication details saved to ${path.join(__dirname, '.env')}`)
        logger.logWarning('Note: This file contains sensitive data and should not be shared')
      }
    }
  }

  logger.logHeader('CALCULATING STEAM MARKET TOTAL')
  logger.logInfo('Starting the calculation process, please wait...')

  try {
    // Calculate the market total using the Steam API
    const result: MarketTotalResult = await calculateSteamMarketTotal(authParams!)

    // Sort items by price (highest first) for display
    const sortedItems = [...result.items].sort((a, b) => b.price - a.price)

    // Display the top transactions
    logger.logHeader(`TOP ${topTransactionsCount} MOST VALUABLE TRANSACTIONS`)

    logger.log(
      `${logger.consoleColors.green}■${logger.consoleColors.reset} Sales | ${logger.consoleColors.red}■${logger.consoleColors.reset} Purchases\n`,
    )

    sortedItems.slice(0, topTransactionsCount).forEach((item, index) => {
      const color = item.type === 'purchase' ? logger.consoleColors.red : logger.consoleColors.green
      const symbol = item.type === 'purchase' ? '-' : '+'
      logger.log(
        `${index + 1}. ${item.name}: ${color}${symbol}${logger.formatCurrency(item.price, result.currency)}${logger.consoleColors.reset}`,
      )
    })

    // Save the data to a json file if requested
    if (outputPath) {
      logger.logInfo(`Saving transaction data to ${outputPath}...`)
      if (saveToJsonFile(result, outputPath)) {
        logger.logSuccess(`Transaction data successfully saved to ${outputPath}`)
      } else {
        logger.logError(`Failed to save transaction data to ${outputPath}`)
      }
    }

    // Display the summary results
    logger.logHeader('RESULTS')
    logger.logSuccess(`Total From Sales: ${logger.formatCurrency(result.sales, result.currency)}`)
    logger.logSuccess(`Total In Purchases: ${logger.formatCurrency(result.purchases, result.currency)}`)
    logger.logSuccess(`Grand Total: ${logger.formatCurrency(result.total, result.currency)}`)
    logger.logSuccess(`Total Items: ${result.items.length}\n`)
  } catch (error) {
    logger.logError('Failed to calculate market total')
    logger.logVerbose((error as Error).stack || '')

    // If we used saved cookies and it failed, ask if we should delete them
    if (useSavedCookies) {
      logger.logWarning('Authentication with saved data failed')
      const deleteCookies = await prompt('Would you like to delete the saved authentication data? (y/n): ')

      if (deleteCookies.toLowerCase() === 'y') {
        if (cookieManager.deleteCookies()) {
          logger.logInfo('Please run the program again to enter new authentication details')
        }
      }
    }
  }
}
