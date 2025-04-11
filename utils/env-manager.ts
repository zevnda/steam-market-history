import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'
import * as logger from './logger'

const possibleEnvPaths = [
  path.join(__dirname, '..', '.env'),
  path.join(__dirname, '.env'),
  path.join(process.cwd(), '.env'),
  path.join(process.cwd(), 'dist', '.env'),
]

export const ENV_FILE = possibleEnvPaths.find(p => fs.existsSync(p)) || path.join(__dirname, '..', '.env')

interface EnvVariables {
  [key: string]: string
}

export function loadEnv(): boolean {
  try {
    if (fs.existsSync(ENV_FILE)) {
      const result = dotenv.config({ path: ENV_FILE })

      if (result.error) {
        logger.logError(`Error loading .env file from: ${ENV_FILE}`)
        logger.logVerbose(result.error.toString())
        return false
      }

      logger.logVerbose(`Successfully loaded environment variables from: ${ENV_FILE}`)
      return true
    }

    logger.logVerbose(`No .env file found in any of these locations: ${possibleEnvPaths.join(', ')}`)
    return false
  } catch (error) {
    logger.logError(`Error loading environment variables: ${(error as Error).message}`)
    logger.logVerbose((error as Error).stack || '')
    return false
  }
}

export function saveEnv(variables: EnvVariables): boolean {
  try {
    let envContent = '# This file contains sensitive information - do not share it with anyone\n\n'

    Object.entries(variables).forEach(([key, value]) => {
      if (value) {
        const escapedValue = value.replace(/\n/g, '\\n').replace(/"/g, '\\"')
        envContent += `${key}="${escapedValue}"\n`
      }
    })

    fs.writeFileSync(ENV_FILE, envContent, 'utf8')
    logger.logSuccess('Authentication saved to .env file')
    logger.logVerbose(`Saved to: ${ENV_FILE}`)
    return true
  } catch (error) {
    logger.logError(`Failed to save environment variables: ${(error as Error).message}`)
    logger.logVerbose((error as Error).stack || '')
    return false
  }
}

export function deleteEnv(): boolean {
  try {
    if (fs.existsSync(ENV_FILE)) {
      fs.unlinkSync(ENV_FILE)
      logger.logSuccess('Authentication data deleted successfully')
      return true
    }
    return false
  } catch (error) {
    logger.logError(`Failed to delete .env file: ${(error as Error).message}`)
    logger.logVerbose((error as Error).stack || '')
    return false
  }
}
