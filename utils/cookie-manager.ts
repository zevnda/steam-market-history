import * as logger from './logger'
import * as envManager from './env-manager'

const ENV_KEYS = {
  SESSION_ID: 'STEAM_SESSION_ID',
  LOGIN_SECURE: 'STEAM_LOGIN_SECURE',
  MACHINE_AUTH: 'STEAM_MACHINE_AUTH',
  STEAM_ID: 'STEAM_ID',
  PARENTAL: 'STEAM_PARENTAL',
}

interface Cookies {
  sessionId: string
  steamLoginSecure: string
  steamMachineAuth?: string
  steamId?: string
  steamParental?: string
}

export function saveCookies(cookies: Cookies): boolean {
  const envVars = {
    [ENV_KEYS.SESSION_ID]: cookies.sessionId || '',
    [ENV_KEYS.LOGIN_SECURE]: cookies.steamLoginSecure || '',
    [ENV_KEYS.MACHINE_AUTH]: cookies.steamMachineAuth || '',
    [ENV_KEYS.STEAM_ID]: cookies.steamId || '',
    [ENV_KEYS.PARENTAL]: cookies.steamParental || '',
  }

  return envManager.saveEnv(envVars)
}

export function loadCookies(): Cookies | null {
  if (!envManager.loadEnv()) {
    return null
  }

  if (!process.env[ENV_KEYS.SESSION_ID] || !process.env[ENV_KEYS.LOGIN_SECURE]) {
    logger.logVerbose('Required cookies not found in environment variables')
    return null
  }

  const cookies: Cookies = {
    sessionId: process.env[ENV_KEYS.SESSION_ID]!,
    steamLoginSecure: process.env[ENV_KEYS.LOGIN_SECURE]!,
  }

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

export function deleteCookies(): boolean {
  return envManager.deleteEnv()
}
