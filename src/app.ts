/* global __DEV__ */

/**
 * Uncomment next line to get perfomance logging of component
 * rerenders
 */
// import './wdyr'
import Bugsnag from '@bugsnag/react-native'
import BugsnagPerformance from '@bugsnag/react-native-performance'
import { asObject, asString } from 'cleaners'
import { LogBox, Text, TextInput } from 'react-native'
import { getVersion } from 'react-native-device-info'
import RNFS from 'react-native-fs'

import { initDeviceSettings } from './actions/DeviceSettingsActions'
import { changeTheme, getTheme } from './components/services/ThemeContext'
import { ENV } from './env'
import { NumberMap } from './types/types'
import { log, logToServer } from './util/logger'
import { initInfoServer } from './util/network'

// Uncomment the next line to remove popup warning/error boxes.
// LogBox.ignoreAllLogs()
LogBox.ignoreLogs(['Require cycle:', 'Attempted to end a Span which has already ended.'])

// Mute specific console output types.
// Useful for debugging using console output, i.e. mute everything but `debug`
for (const consoleOutputType of ENV.MUTE_CONSOLE_OUTPUT) {
  switch (consoleOutputType) {
    case 'log':
      console.log = () => {}
      break
    case 'info':
      console.info = () => {}
      break
    case 'warn':
      console.warn = () => {}
      break
    case 'error':
      console.error = () => {}
      break
    case 'debug':
      console.debug = () => {}
      break
    case 'trace':
      console.trace = () => {}
      break
    case 'group':
      console.group = () => {}
      break
    case 'groupCollapsed':
      console.groupCollapsed = () => {}
      break
    case 'groupEnd':
      console.groupEnd = () => {}
      break
  }
}

Bugsnag.start({
  onError: event => {
    log(`Bugsnag Device ID: ${event.device.id ?? ''}`)
  }
})
const asServerDetails = asObject({
  host: asString,
  port: asString
})

const ENABLE_PERF_LOGGING = false
const PERF_LOGGING_ONLY = false

const perfTimers: NumberMap = {}
const perfCounters: NumberMap = {}
const perfTotals: NumberMap = {}

console.log('***********************')
console.log('App directory: ' + RNFS.DocumentDirectoryPath)
console.log('***********************')

// @ts-expect-error
global.clog = console.log

// Disable the font scaling
// @ts-expect-error
if (!Text.defaultProps) {
  // @ts-expect-error
  Text.defaultProps = {}
}
// @ts-expect-error
Text.defaultProps.allowFontScaling = false

// @ts-expect-error
if (!TextInput.defaultProps) {
  // @ts-expect-error
  TextInput.defaultProps = {}
}
// @ts-expect-error
TextInput.defaultProps.allowFontScaling = false

if (!__DEV__) {
  console.log = log
  console.info = log
  console.warn = log
  console.error = log
}

const appVersion = getVersion()
const releaseStage = __DEV__ || appVersion === '99.99.99' ? 'development' : appVersion.includes('-') ? 'testing' : 'production'

BugsnagPerformance.start({
  apiKey: ENV.BUGSNAG_API_KEY,
  appVersion,
  releaseStage,
  logger: {
    debug(message: string) {
      console.log(message)
    },
    info(message: string) {
      console.log(message)
    },
    warn(message: string) {
      console.warn(message)
    },
    error(message: string) {
      console.error(message)
    }
  }
})

if (ENV.LOG_SERVER) {
  console.log = function () {
    logToServer(arguments)
  }

  console.info = console.log

  console.warn = console.log

  console.error = console.log
}

const clog = console.log

if (PERF_LOGGING_ONLY) {
  console.log = () => {}
}

if (ENABLE_PERF_LOGGING) {
  // @ts-expect-error
  if (!global.nativePerformanceNow && window && window.performance) {
    // @ts-expect-error
    global.nativePerformanceNow = () => window.performance.now()
  }
  const makeDate = () => {
    const d = new Date(Date.now())
    const h = ('0' + d.getHours().toString()).slice(-2)
    const m = ('0' + d.getMinutes().toString()).slice(-2)
    const s = ('0' + d.getSeconds().toString()).slice(-2)
    const ms = ('00' + d.getMilliseconds().toString()).slice(-3)
    return `${h}:${m}:${s}.${ms}`
  }

  // @ts-expect-error
  global.pnow = function (label: string) {
    const d = makeDate()
    clog(`${d} PTIMER PNOW: ${label}`)
  }

  // @ts-expect-error
  global.pstart = function (label: string) {
    const d = makeDate()
    if (!perfTotals[label]) {
      perfTotals[label] = 0
      perfCounters[label] = 0
    }
    if (typeof perfTimers[label] === 'undefined') {
      // @ts-expect-error
      perfTimers[label] = global.nativePerformanceNow()
    } else {
      clog(`${d}: PTIMER Error: PTimer already started: ${label}`)
    }
  }

  // @ts-expect-error
  global.pend = function (label: string) {
    const d = makeDate()
    if (typeof perfTimers[label] === 'number') {
      // @ts-expect-error
      const elapsed = global.nativePerformanceNow() - perfTimers[label]
      perfTotals[label] += elapsed
      perfCounters[label]++
      clog(`${d}: PTIMER ${label}:${elapsed}ms total:${perfTotals[label]}ms count:${perfCounters[label]}`)
      delete perfTimers[label]
    } else {
      clog(`${d}: PTIMER Error: PTimer not started: ${label}`)
    }
  }

  // @ts-expect-error
  global.pcount = function (label: string) {
    const d = makeDate()
    if (typeof perfCounters[label] === 'undefined') {
      perfCounters[label] = 1
    } else {
      perfCounters[label] = perfCounters[label] + 1
    }
    if (perfCounters[label] % 1 === 0) {
      clog(`${d}: PTIMER PCOUNT ${label}:${perfCounters[label]}`)
    }
  }
} else {
  // @ts-expect-error
  global.pnow = function (label: string) {}
  // @ts-expect-error
  global.pstart = function (label: string) {}
  // @ts-expect-error
  global.pend = function (label: string) {}
  // @ts-expect-error
  global.pcount = function (label: string) {}
}

const realFetch = fetch
// @ts-expect-error
fetch = async (...args: any) => {
  // @ts-expect-error
  return await realFetch(...args).catch(e => {
    Bugsnag.leaveBreadcrumb('realFetchError', {
      url: args[0],
      errorName: e.name,
      errorMsg: e.message
    })
    console.log(`realFetchError: ${args[0]} ${e.name} ${e.message}`)
    throw e
  })
}

if (ENV.DEBUG_THEME) {
  const themeFunc = async () => {
    try {
      const oldTheme = getTheme()
      const { host, port } = asServerDetails(ENV.THEME_SERVER)
      const url = `${host}:${port}/theme`
      console.log('THEME:\n' + JSON.stringify(oldTheme, null, 2))
      const postOptions = {
        headers: {
          'Content-Type': 'application/json'
        },
        method: 'POST',
        body: JSON.stringify(oldTheme)
      }
      await realFetch(url, postOptions)
      const getOptions = {
        headers: {
          'Content-Type': 'application/json'
        },
        method: 'GET'
      }
      let themeJson = ''
      setInterval(async () => {
        try {
          const response = await realFetch(url, getOptions)
          const overrideTheme = await response.json()
          const newTheme = { ...oldTheme, ...overrideTheme }
          const newThemeJson = JSON.stringify(newTheme, null, 2)
          if (newThemeJson !== themeJson) {
            console.log('Theme changed!')
            changeTheme(newTheme)
            themeJson = newThemeJson
          }
        } catch (e: any) {
          console.log(`Failed get theme`, e.message)
        }
      }, 3000)
    } catch (e: any) {
      console.log(`Failed to access theme server`)
    }
  }
  themeFunc().catch(err => console.error(err))
}

initDeviceSettings().catch(err => console.log(err))
initInfoServer().catch(err => console.log(err))
