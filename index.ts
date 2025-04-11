import 'dotenv/config'
import * as logger from './utils/logger'
import { runCli } from './cli'

// Show help text when the --help flag is used
function displayHelp(): void {
  logger.logHeader('STEAM MARKET HISTORY CALCULATOR - HELP')

  logger.log('Usage: pnpm start [options]')
  logger.log('\nOptions:')
  logger.log('  --help                  Display this help output')
  logger.log('  --verbose               Enable verbose logging for debugging')
  logger.log('  --top=N                 Display top N most valuable transactions (default: 10)')
  logger.log('  --output=PATH           Save all transaction data to specified JSON file')

  logger.log('\nExamples:')
  logger.log('  pnpm start')
  logger.log('  pnpm start --verbose')
  logger.log('  pnpm start --top=20')
  logger.log('  pnpm start --output=data/export.json')
  logger.log('  pnpm start --top=15 --output=results.json --verbose')

  logger.log('\nFor more information, see the README.md file in the project root')
}

// Parse command line arguments
const args = process.argv.slice(2)
const VERBOSE = args.includes('--verbose')
const HELP = args.includes('--help')

// Show help and exit if --help flag is used
if (HELP) {
  displayHelp()
  process.exit(0)
}

// Parse the --top flag to determine how many top transactions to show
// If not specified or invalid, default to 10
const topArg = args.find(arg => arg.startsWith('--top='))
let TOP_COUNT = 10

if (topArg) {
  const countValue = topArg.split('=')[1]
  const parsedCount = parseInt(countValue, 10)
  if (!isNaN(parsedCount) && parsedCount > 0) {
    TOP_COUNT = parsedCount
  } else {
    logger.logWarning(`Invalid value for --top flag: ${countValue}. Using default value of 10.`)
  }
}

// Parse the --output flag to determine where to save the output file
// If not specified, no file will be generated
const outputArg = args.find(arg => arg.startsWith('--output='))
let outputPath: string | null = null

if (outputArg) {
  outputPath = outputArg.split('=')[1]
  if (!outputPath) {
    logger.logWarning('No output path specified with --output flag. No file will be generated.')
  } else {
    logger.logInfo(`Will output transaction data to: ${outputPath}`)
  }
}

// Set verbose mode based on the --verbose flag
logger.setVerboseMode(VERBOSE)

// Log verbose information if enabled
if (VERBOSE) {
  logger.logVerbose('Starting Steam Market History Calculator with verbose logging enabled')
  logger.logVerbose(`Will display top ${TOP_COUNT} most valuable transactions`)
  if (outputPath) {
    logger.logVerbose(`Will save transaction data to ${outputPath}`)
  }
}

// Run the CLI with the parsed options
runCli(TOP_COUNT, outputPath)
