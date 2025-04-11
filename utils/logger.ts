interface ConsoleColors {
  reset: string
  bright: string
  dim: string
  red: string
  green: string
  yellow: string
  blue: string
  magenta: string
  cyan: string
  white: string
}

export const consoleColors: ConsoleColors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
}

let VERBOSE: boolean = false

export function setVerboseMode(isVerbose: boolean): void {
  VERBOSE = isVerbose
}

export function log(message: string, color: string = ''): void {
  console.log(`${color}${message}${consoleColors.reset}`)
}

export function logInfo(message: string): void {
  log(`ℹ️  ${message}`, consoleColors.cyan)
}

export function logSuccess(message: string): void {
  log(`✅ ${message}`, consoleColors.green)
}

export function logError(message: string): void {
  log(`❌ ${message}`, consoleColors.red)
}

export function logWarning(message: string): void {
  log(`⚠️  ${message}`, consoleColors.yellow)
}

export function logVerbose(message: string): void {
  if (VERBOSE) {
    log(`🔍 ${message}`, consoleColors.dim)
  }
}

export function logHeader(message: string): void {
  console.log('\n' + '='.repeat(60))
  log(message, consoleColors.bright + consoleColors.cyan)
  console.log('='.repeat(60) + '\n')
}

export function formatCurrency(amount: number, currency: string): string {
  return `${currency}${amount.toFixed(2)}`
}
