import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'
import * as logger from './logger'

// Look for the .env file in several possible locations
// This helps us find it regardless of where the app is run from
const possibleEnvPaths = [
  path.join(__dirname, '..', '.env'),
  path.join(__dirname, '.env'),
  path.join(process.cwd(), '.env'),
  path.join(process.cwd(), 'dist', '.env'),
]

// Either use an existing .env file or create a new one in the project root
export const ENV_FILE = possibleEnvPaths.find(p => fs.existsSync(p)) || path.join(__dirname, '..', '.env')

interface EnvVariables {
  [key: string]: string
}

// Load environment variables from the .env file
// Returns true if successful, false otherwise
export function loadEnv(): boolean {
  try {
    if (fs.existsSync(ENV_FILE)) {
      // Try to load the .env file using dotenv
      const result = dotenv.config({ path: ENV_FILE })

      if (result.error) {
        logger.logError(`Error loading .env file from: ${ENV_FILE}`)
        logger.logVerbose(result.error.toString())
        return false
      }

      logger.logVerbose(`Successfully loaded environment variables from: ${ENV_FILE}`)
      return true
    }

    // If we can't find the .env file, log all the places we looked
    logger.logVerbose(`No .env file found in any of these locations: ${possibleEnvPaths.join(', ')}`)
    return false
  } catch (error) {
    logger.logError(`Error loading environment variables: ${(error as Error).message}`)
    logger.logVerbose((error as Error).stack || '')
    return false
  }
}

// Save environment variables to the .env file
// Returns true if successful, false otherwise
export function saveEnv(variables: EnvVariables): boolean {
  try {
    // Start with a warning comment in the file
    let envContent = '# This file contains sensitive information - do not share it with anyone\n\n'

    // Add each variable to the file
    Object.entries(variables).forEach(([key, value]) => {
      if (value) {
        // Escape newlines and quotes to prevent issues in the .env format
        const escapedValue = value.replace(/\n/g, '\\n').replace(/"/g, '\\"')
        envContent += `${key}="${escapedValue}"\n`
      }
    })

    // Write the file to disk
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

// Delete the .env file
// Returns true if successful, false otherwise
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
