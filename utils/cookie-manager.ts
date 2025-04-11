import * as logger from './logger'
import * as envManager from './env-manager'

// These are the keys we use to store the Steam cookies in our .env file
const ENV_KEYS = {
  SESSION_ID: 'STEAM_SESSION_ID',
  LOGIN_SECURE: 'STEAM_LOGIN_SECURE',
  MACHINE_AUTH: 'STEAM_MACHINE_AUTH',
  STEAM_ID: 'STEAM_ID',
  PARENTAL: 'STEAM_PARENTAL',
}

// This is the structure of the cookies we need to authenticate with Steam
// sessionId and steamLoginSecure are required, the rest are optional
interface Cookies {
  sessionId: string
  steamLoginSecure: string
  steamMachineAuth?: string
  steamId?: string
  steamParental?: string
}

// Save the Steam cookies to our .env file
// Returns true if successful, false otherwise
export function saveCookies(cookies: Cookies): boolean {
  // Create an object with all our cookies, using empty strings as fallbacks
  const envVars = {
    [ENV_KEYS.SESSION_ID]: cookies.sessionId || '',
    [ENV_KEYS.LOGIN_SECURE]: cookies.steamLoginSecure || '',
    [ENV_KEYS.MACHINE_AUTH]: cookies.steamMachineAuth || '',
    [ENV_KEYS.STEAM_ID]: cookies.steamId || '',
    [ENV_KEYS.PARENTAL]: cookies.steamParental || '',
  }

  return envManager.saveEnv(envVars)
}

// Load Steam cookies from our .env file
// Returns a Cookies object if successful, null otherwise
export function loadCookies(): Cookies | null {
  // Try to load the .env file
  if (!envManager.loadEnv()) {
    return null
  }

  // Make sure we have the required cookies
  // We need at least sessionId and steamLoginSecure to authenticate
  if (!process.env[ENV_KEYS.SESSION_ID] || !process.env[ENV_KEYS.LOGIN_SECURE]) {
    logger.logVerbose('Required cookies not found in environment variables')
    return null
  }

  // Create the cookies object with the required cookies
  const cookies: Cookies = {
    sessionId: process.env[ENV_KEYS.SESSION_ID]!,
    steamLoginSecure: process.env[ENV_KEYS.LOGIN_SECURE]!,
  }

  // Add optional cookies if they exist
  if (process.env[ENV_KEYS.MACHINE_AUTH]) {
    cookies.steamMachineAuth = process.env[ENV_KEYS.MACHINE_AUTH]
  }

  if (process.env[ENV_KEYS.STEAM_ID]) {
    cookies.steamId = process.env[ENV_KEYS.STEAM_ID]
  }

  if (process.env[ENV_KEYS.PARENTAL]) {
    cookies.steamParental = process.env[ENV_KEYS.PARENTAL]
  }

  logger.logVerbose('Successfully loaded authentication from environment variables')
  return cookies
}

// Delete the .env file containing the cookies
// Returns true if successful, false otherwise
export function deleteCookies(): boolean {
  return envManager.deleteEnv()
}
