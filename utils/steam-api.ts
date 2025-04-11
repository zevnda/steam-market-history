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
  type: 'sale' | 'purchase'
}

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

      const marketRows = document.querySelectorAll('.market_listing_row')
      logger.logVerbose(`Found ${marketRows.length} market listing rows on this page`)

      const previousItemsCount = items.length

      for (const row of Array.from(marketRows)) {
        const gainOrLossElement = row.querySelector('.market_listing_gainorloss')
        const priceElement = row.querySelector('.market_listing_price')

        if (!gainOrLossElement || !priceElement) continue

        const gainOrLossText = gainOrLossElement.textContent?.trim()
        const priceText = priceElement.textContent?.trim()

        if (!gainOrLossText || !priceText) continue

        const isSale = gainOrLossText.includes('-')
        const isPurchase = gainOrLossText.includes('+')

        const match = priceText.match(/([A-Z$£€¥]*)[\s]*([0-9.,]+)/)

        if (match) {
          const currencySymbol = match[1] || ''
          if (!currency && currencySymbol) {
            currency = currencySymbol
            logger.logVerbose(`Detected currency: ${currency}`)
          }

          const priceValue = parseFloat(match[2].replace(',', '.'))

          if (!isNaN(priceValue)) {
            let itemName = 'Unknown Item'
            const nameElement = row.querySelector('.market_listing_item_name')
            if (nameElement) {
              itemName = nameElement.textContent?.trim() || 'Unknown Item'
            }

            const type = isSale ? 'sale' : 'purchase'

            if (isSale) {
              salesTotal += priceValue
              logger.logVerbose(`Added sale: ${itemName} (${logger.formatCurrency(priceValue, currency)})`)
            } else if (isPurchase) {
              purchasesTotal += priceValue
              logger.logVerbose(`Added purchase: ${itemName} (${logger.formatCurrency(priceValue, currency)})`)
            }

            total += priceValue

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
