import { JSDOM } from 'jsdom'
import * as logger from './logger'
import cliProgress from 'cli-progress'

// These are the authentication parameters we need to access the Steam Market
interface AuthParams {
  sessionId: string
  steamLoginSecure: string
  steamMachineAuth?: string
  steamId?: string
  steamParental?: string
}

// Represents a single market transaction (purchase or sale)
interface MarketItem {
  name: string
  price: number
  type: 'sale' | 'purchase'
}

// The complete result of our market history calculation
interface MarketTotalResult {
  total: number
  sales: number
  purchases: number
  currency: string
  items: MarketItem[]
}

async function calculateSteamMarketTotal(authParams: AuthParams): Promise<MarketTotalResult> {
  const items: MarketItem[] = []
  let total: number = 0
  let salesTotal: number = 0
  let purchasesTotal: number = 0
  let currency: string = ''

  // Build the cookie string for authentication with the Steam API
  let cookieValue = `sessionid=${authParams.sessionId}; steamLoginSecure=${authParams.steamLoginSecure}`

  // Add optional cookies if they exist
  if (authParams.steamParental) {
    cookieValue += `; steamparental=${authParams.steamParental}`
  }

  if (authParams.steamMachineAuth && authParams.steamId) {
    cookieValue += `; steamMachineAuth${authParams.steamId}=${authParams.steamMachineAuth}`
  }

  // Helper function to sleep between API requests
  // This prevents us from hitting rate limits on Steam's API
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

  try {
    let start: number = 0
    // TODO: Add a flag to allow the user to specify the number of items to fetch per request
    // Unsure if this is a good idea, as it may cause issues rate limiting
    // Steam's API has a limit of 500 items per request
    const count: number = 500 // Number of items to fetch per request
    let totalCount: number = 0
    let hasMoreItems: boolean = true
    let pageCount: number = 0

    // Create a progress bar to show how many items we've processed
    const progressBar = new cliProgress.SingleBar({
      format: 'Progress |{bar}| {percentage}% | {value}/{total} items',
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
    })

    // Keep fetching pages until we've got all items
    while (hasMoreItems) {
      pageCount++
      const url = `https://steamcommunity.com/market/myhistory?start=${start}&count=${count}`
      logger.logVerbose(`Fetching data from: ${url}`)
      logger.logVerbose(`Fetching page ${pageCount} of market history...`)

      // Make the API request to get market history
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Cookie: cookieValue,
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`)
      }

      logger.logVerbose(`Received response with status: ${response.status}`)
      const data = await response.json()

      // On the first page, we get the total count of items
      // We use this to initialize our progress bar
      if (totalCount === 0 && data.total_count) {
        totalCount = data.total_count
        logger.logSuccess(`Found ${totalCount} total market items to process\n`)
        progressBar.start(totalCount, 0)
      }

      // Check if we got valid results
      if (!data.results_html) {
        logger.logError('No results found in the response - authentication may have failed')
        logger.logVerbose('Response data: ' + JSON.stringify(data, null, 2))
        break
      }

      // Parse the results_html property returned to get the transaction data
      // The results_html is the only property that contains the market history that we need
      const dom = new JSDOM(data.results_html)
      const document = dom.window.document

      const marketRows = document.querySelectorAll('.market_listing_row')
      logger.logVerbose(`Found ${marketRows.length} market listing rows on this page`)

      const previousItemsCount = items.length

      // Process each market transaction row
      for (const row of Array.from(marketRows)) {
        const gainOrLossElement = row.querySelector('.market_listing_gainorloss')
        const priceElement = row.querySelector('.market_listing_price')

        if (!gainOrLossElement || !priceElement) continue

        const gainOrLossText = gainOrLossElement.textContent?.trim()
        const priceText = priceElement.textContent?.trim()

        if (!gainOrLossText || !priceText) continue

        // Determine if this is a purchase or sale based on the +/- indicator
        const isSale = gainOrLossText.includes('-')
        const isPurchase = gainOrLossText.includes('+')

        // Extract the currency symbol and price value
        // This handles different currency formats
        const match = priceText.match(/([A-Z$£€¥]*)[\s]*([0-9.,]+)/)

        if (match) {
          const currencySymbol = match[1] || ''
          // If we haven't detected the currency yet, use this one
          if (!currency && currencySymbol) {
            currency = currencySymbol
            logger.logVerbose(`Detected currency: ${currency}`)
          }

          const priceValue = parseFloat(match[2].replace(',', '.'))

          if (!isNaN(priceValue)) {
            // Get the name of the item from the row
            let itemName = 'Unknown Item'
            const nameElement = row.querySelector('.market_listing_item_name')
            if (nameElement) {
              itemName = nameElement.textContent?.trim() || 'Unknown Item'
            }

            const type = isSale ? 'sale' : 'purchase'

            // Add the price to the appropriate total
            if (isSale) {
              salesTotal += priceValue
              logger.logVerbose(`Added sale: ${itemName} (${logger.formatCurrency(priceValue, currency)})`)
            } else if (isPurchase) {
              purchasesTotal += priceValue
              logger.logVerbose(`Added purchase: ${itemName} (${logger.formatCurrency(priceValue, currency)})`)
            }

            total += priceValue

            // Add the item to our list
            items.push({
              name: itemName,
              price: priceValue,
              type: type,
            })
          }
        }
      }

      const newItemsProcessed = items.length - previousItemsCount
      logger.logVerbose(`Processed ${newItemsProcessed} items on this page`)

      // Move to the next batch of items
      start += count

      // If we've processed all items, we're done
      if (start >= totalCount) {
        hasMoreItems = false
        progressBar.update(items.length)
        progressBar.stop()
        console.log() // Add a new line after the progress bar
        logger.logSuccess(`Processed ${items.length} / ${totalCount} total items`)
      } else {
        // Otherwise, update the progress bar and wait before the next request
        progressBar.update(items.length)
        logger.logVerbose(`Waiting 3 seconds before fetching next batch...`)
        await delay(3000) // Be nice to Steam's servers - don't spam requests
      }
    }

    // Return the final result with fixed decimal precision
    return {
      total: parseFloat(total.toFixed(2)),
      sales: parseFloat(salesTotal.toFixed(2)),
      purchases: parseFloat(purchasesTotal.toFixed(2)),
      currency,
      items,
    }
  } catch (error) {
    logger.logError('Error calculating Steam market total: ' + (error as Error).message)
    logger.logVerbose((error as Error).stack || '')
    throw error
  }
}

export { calculateSteamMarketTotal, AuthParams, MarketItem, MarketTotalResult }
