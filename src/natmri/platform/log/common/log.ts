import { createDecorator } from '@livemoe/core'
import type { Event, IDisposable } from '@livemoe/utils'
import { Disposable, Emitter } from '@livemoe/utils'
import { toErrorMessage } from 'natmri/base/common/errors'

export const enum LogLevel {
  Trace,
  Debug,
  Info,
  Warning,
  Error,
}

export function now() {
  return new Date().toLocaleString()
}

export function format(args: any): string {
  let result = ''

  for (let i = 0; i < args.length; i++) {
    let a = args[i]

    if (typeof a === 'object') {
      try {
        a = JSON.stringify(a)
      }
      catch (e) { }
    }

    result += (i > 0 ? ' ' : '') + a
  }

  return result
}

export const DEFAULT_LOGLEVEL = LogLevel.Info

export interface ILogger extends IDisposable {
  onDidChangeLogLevel: Event<LogLevel>

  setLevel(level: LogLevel): void

  getLevel(): LogLevel

  trace(message: string, ...args: any[]): void

  debug(message: string, ...args: any[]): void

  info(message: string, ...args: any[]): void

  warn(message: string, ...args: any[]): void

  error(message: string | Error, ...args: any[]): void
}

export function log(logger: ILogger, level: LogLevel, message: string) {
  switch (level) {
    case LogLevel.Trace:
      return logger.trace(message)
    case LogLevel.Debug:
      return logger.debug(message)
    case LogLevel.Info:
      return logger.info(message)
    case LogLevel.Warning:
      return logger.warn(message)
    case LogLevel.Error:
      return logger.error(message)
    default:
      throw new Error(`Unknown log level: ${level}`)
  }
}

export interface ILoggerService {
  create(label: string): ILogger

  trace(message: string, ...args: any[]): void
  debug(message: string, ...args: any[]): void
  info(message: string, ...args: any[]): void
  warn(message: string, ...args: any[]): void
  error(message: string | Error, ...args: any[]): void
}

export const ILoggerService = createDecorator<ILoggerService>('ILoggerService')

export function LogLevelToString(logLevel: LogLevel): string {
  switch (logLevel) {
    case LogLevel.Trace: return 'trace'
    case LogLevel.Debug: return 'debug'
    case LogLevel.Info: return 'info'
    case LogLevel.Warning: return 'warn'
    case LogLevel.Error: return 'error'
  }
}

export function parseLogLevel(level: string) {
  switch (level) {
    case 'info':
      return LogLevel.Info
    case 'warn':
      return LogLevel.Warning
    case 'error':
      return LogLevel.Error
    case 'debug':
      return LogLevel.Debug
    case 'trace':
      return LogLevel.Trace
    default:
      return undefined
  }
}

export abstract class AbstractLogger extends Disposable {
  protected readonly _onDidChangeLogLevel = this._register(new Emitter<LogLevel>())

  private label = ''

  private _level: LogLevel = DEFAULT_LOGLEVEL

  constructor(level: LogLevel = DEFAULT_LOGLEVEL) {
    super()

    this._level = level
  }

  setLabel(label: string) {
    this.label = label
  }

  getLabel() {
    return this.label
  }

  getLevel(): LogLevel {
    return this._level
  }

  checkLogLevel(level: LogLevel) {
    return this._level <= level
  }

  get onDidChangeLogLevel(): Event<LogLevel> {
    return this._onDidChangeLogLevel.event
  }

  setLevel(level: LogLevel) {
    if (this._level !== level) {
      this._level = level
      this._onDidChangeLogLevel.fire(level)
    }
  }
}

export class AdapterLogger extends AbstractLogger implements ILogger {
  constructor(private readonly adapter: { log: (level: LogLevel, array: any[]) => void }, logLevel: LogLevel = DEFAULT_LOGLEVEL) {
    super()
    this.setLevel(logLevel)
  }

  trace(message: string, ...args: any[]): void {
    this.adapter.log(LogLevel.Trace, [this.extractError(message), ...args])
  }

  debug(message: string, ...args: any[]): void {
    this.adapter.log(LogLevel.Debug, [this.extractError(message), ...args])
  }

  info(message: string, ...args: any[]): void {
    this.adapter.log(LogLevel.Info, [this.extractError(message), ...args])
  }

  warn(message: string, ...args: any[]): void {
    this.adapter.log(LogLevel.Warning, [this.extractError(message), ...args])
  }

  error(message: string | Error, ...args: any[]): void {
    this.adapter.log(LogLevel.Error, [this.extractError(message), ...args])
  }

  extractError(msg: Error | string) {
    if (typeof msg === 'string')
      return msg

    return toErrorMessage(msg, this.getLevel() <= LogLevel.Trace)
  }
}
