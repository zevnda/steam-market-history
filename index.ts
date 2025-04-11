import 'dotenv/config'
import * as logger from './utils/logger'
import { runCli } from './cli'

const args = process.argv.slice(2)
const VERBOSE = args.includes('--verbose')

logger.setVerboseMode(VERBOSE)

if (VERBOSE) {
  logger.logVerbose('Starting Steam Market Calculator with verbose logging enabled')
}

runCli()
