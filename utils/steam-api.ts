import { JSDOM } from 'jsdom'
import * as logger from './logger'
import cliProgress from 'cli-progress'

interface AuthParams {
  sessionId: string
  steamLoginSecure: string
  steamMachineAuth?: string
  steamId?: string
  steamParental?: string
}

interface MarketItem {
  name: string
  price: number
}

interface MarketTotalResult {
  total: number
  currency: string
  items: MarketItem[]
}

async function calculateSteamMarketTotal(authParams: AuthParams): Promise<MarketTotalResult> {
  const items: MarketItem[] = []
  let total: number = 0
  let currency: string = ''

  let cookieValue = `sessionid=${authParams.sessionId}; steamLoginSecure=${authParams.steamLoginSecure}`

  if (authParams.steamParental) {
    cookieValue += `; steamparental=${authParams.steamParental}`
  }

  if (authParams.steamMachineAuth && authParams.steamId) {
    cookieValue += `; steamMachineAuth${authParams.steamId}=${authParams.steamMachineAuth}`
  }

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

  try {
    let start: number = 0
    const count: number = 500
    let totalCount: number = 0
    let hasMoreItems: boolean = true
    let pageCount: number = 0

    const progressBar = new cliProgress.SingleBar({
      format: 'Progress |{bar}| {percentage}% | {value}/{total} items',
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
    })

    while (hasMoreItems) {
      pageCount++
      const url = `https://steamcommunity.com/market/myhistory?start=${start}&count=${count}`
      logger.logVerbose(`Fetching data from: ${url}`)
      logger.logVerbose(`Fetching page ${pageCount} of market history...`)

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

      if (totalCount === 0 && data.total_count) {
        totalCount = data.total_count
        logger.logSuccess(`Found ${totalCount} total market items to process\n`)
        progressBar.start(totalCount, 0)
      }

      if (!data.results_html) {
        logger.logError('No results found in the response - authentication may have failed')
        logger.logVerbose('Response data: ' + JSON.stringify(data, null, 2))
        break
      }

      const dom = new JSDOM(data.results_html)
      const document = dom.window.document

      const priceElements = document.querySelectorAll('.market_listing_price')
      logger.logVerbose(`Found ${priceElements.length} price elements on this page`)

      const previousItemsCount = items.length

      for (const priceElement of Array.from(priceElements)) {
        const priceText = priceElement.textContent?.trim()

        if (!priceText) continue

        const match = priceText.match(/([A-Z$£€¥]*)[\s]*([0-9.,]+)/)

        if (match) {
          const currencySymbol = match[1] || ''
          if (!currency && currencySymbol) {
            currency = currencySymbol
            logger.logVerbose(`Detected currency: ${currency}`)
          }

          const priceValue = parseFloat(match[2].replace(',', '.'))

          if (!isNaN(priceValue)) {
            total += priceValue

            const row = priceElement.closest('.market_listing_row')
            let itemName = 'Unknown Item'
            if (row) {
              const nameElement = row.querySelector('.market_listing_item_name')
              if (nameElement) {
                itemName = nameElement.textContent?.trim() || 'Unknown Item'
              }
            }

            items.push({
              name: itemName,
              price: priceValue,
            })

            logger.logVerbose(`Added item: ${itemName} (${logger.formatCurrency(priceValue, currency)})`)
          }
        }
      }

      const newItemsProcessed = items.length - previousItemsCount
      logger.logVerbose(`Processed ${newItemsProcessed} items on this page`)

      start += count

      if (start >= totalCount) {
        hasMoreItems = false
        progressBar.update(items.length)
        progressBar.stop()
        logger.logSuccess(`Processed ${items.length} / ${totalCount} total items`)
      } else {
        progressBar.update(items.length)
        logger.logVerbose(`Waiting 3 seconds before fetching next batch...`)
        await delay(3000)
      }
    }

    return {
      total: parseFloat(total.toFixed(2)),
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
