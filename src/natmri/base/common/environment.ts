import { process } from 'natmri/base/common/globals'

export const LANGUAGE_DEFAULT = 'en'

let _isWindows = false
let _isMacintosh = false
let _isLinux = false
let _isLinuxSnap = false
let _isNative = false
let _isWeb = false
let _isElectron = false
let _isIOS = false
let _isMobile = false
let _locale: string | undefined
let _language: string = LANGUAGE_DEFAULT
let _userAgent: string | undefined
const _isDevelopment = !!process.env.NATMRI_DEV

export interface IProcessEnvironment {
  [key: string]: string | undefined
}

export const globals: any = (typeof self === 'object' ? self : typeof global === 'object' ? global : {})

const isElectronProcess = typeof process?.versions?.electron === 'string'
const isElectronRenderer = isElectronProcess && process?.type === 'renderer'

interface INavigator {
  userAgent: string
  maxTouchPoints?: number
}
declare const navigator: INavigator

// Web environment
if (typeof navigator === 'object' && !isElectronRenderer) {
  _userAgent = navigator.userAgent
  _isWindows = _userAgent.includes('Windows')
  _isMacintosh = _userAgent.includes('Macintosh')
  _isIOS = (_userAgent.includes('Macintosh') || _userAgent.includes('iPad') || _userAgent.includes('iPhone')) && !!navigator.maxTouchPoints && navigator.maxTouchPoints > 0
  _isLinux = _userAgent.includes('Linux')
  _isMobile = _userAgent?.indexOf('Mobi') >= 0
  _isWeb = true

  _locale = LANGUAGE_DEFAULT

  _language = _locale
}

// Native environment
else if (typeof process === 'object') {
  _isWindows = (process.platform === 'win32')
  _isMacintosh = (process.platform === 'darwin')
  _isLinux = (process.platform === 'linux')
  _isLinuxSnap = _isLinux && !!process.env.SNAP && !!process.env.SNAP_REVISION
  _isElectron = isElectronProcess
  _locale = LANGUAGE_DEFAULT
  _language = LANGUAGE_DEFAULT
  _isNative = true
}

// Unknown environment
else {
  console.error('Unable to resolve platform.')
}

export const enum Platform {
  Web,
  Mac,
  Linux,
  Windows,
}
export function PlatformToString(platform: Platform) {
  switch (platform) {
    case Platform.Web: return 'Web'
    case Platform.Mac: return 'Mac'
    case Platform.Linux: return 'Linux'
    case Platform.Windows: return 'Windows'
  }
}

let _platform: Platform = Platform.Web
if (_isMacintosh)
  _platform = Platform.Mac

else if (_isWindows)
  _platform = Platform.Windows

else if (_isLinux)
  _platform = Platform.Linux

export const isWindows = _isWindows
export const isMacintosh = _isMacintosh
export const isLinux = _isLinux
export const isLinuxSnap = _isLinuxSnap
export const isNative = _isNative
export const isElectron = _isElectron
export const isWeb = _isWeb
export const isWebWorker = (_isWeb && typeof globals.importScripts === 'function')
export const isIOS = _isIOS
export const isMobile = _isMobile
export const isDevelopment = _isDevelopment
/**
 * Whether we run inside a CI environment, such as
 * GH actions or Azure Pipelines.
 */
export const platform = _platform
export const userAgent = _userAgent

/**
 * The language used for the user interface. The format of
 * the string is all lower case (e.g. zh-tw for Traditional
 * Chinese)
 */
export const language = _language

export namespace Language {

  export function value(): string {
    return language
  }

  export function isDefaultVariant(): boolean {
    if (language.length === 2)
      return language === 'en'

    else if (language.length >= 3)
      return language[0] === 'e' && language[1] === 'n' && language[2] === '-'

    else
      return false
  }

  export function isDefault(): boolean {
    return language === 'en'
  }
}

/**
 * The OS locale or the locale specified by --locale. The format of
 * the string is all lower case (e.g. zh-tw for Traditional
 * Chinese). The UI is not necessarily shown in the provided locale.
 */
export const locale = _locale

export const enum OperatingSystem {
  Windows = 1,
  Macintosh = 2,
  Linux = 3,
}
export const OS = ((_isMacintosh || _isIOS) ? OperatingSystem.Macintosh : (_isWindows ? OperatingSystem.Windows : OperatingSystem.Linux))

let _isLittleEndian = true
let _isLittleEndianComputed = false
export function isLittleEndian(): boolean {
  if (!_isLittleEndianComputed) {
    _isLittleEndianComputed = true
    const test = new Uint8Array(2)
    test[0] = 1
    test[1] = 2
    const view = new Uint16Array(test.buffer)
    _isLittleEndian = (view[0] === (2 << 8) + 1)
  }
  return _isLittleEndian
}
