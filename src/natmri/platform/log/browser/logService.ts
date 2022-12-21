import { isDevelopment } from 'natmri/base/common/environment'
import { Disposable } from 'natmri/base/common/lifecycle'
import type { ILogger, ILoggerService } from 'natmri/platform/log/common/log'
import { AbstractLogger, LogLevel, now } from 'natmri/platform/log/common/log'

export class ConsoleLogger extends AbstractLogger implements ILogger {
  useColors = true

  log(level: LogLevel, message: string | Error, ...args: any[]) {
    switch (level) {
      case LogLevel.Trace:
        this.trace(message, ...args)
        break
      case LogLevel.Debug:
        this.debug(message, ...args)
        break
      case LogLevel.Info:
        this.info(message, ...args)
        break
      case LogLevel.Warning:
        this.warn(message, ...args)
        break
      case LogLevel.Error:
        this.error(message, ...args)
        break
      default:
        break
    }
  }

  trace(message: string | Error, ...args: any[]): void {
    if (this.getLevel() <= LogLevel.Trace)
      console.trace('%c %s %s', 'color: #888', `[${this.getLabel()} ${now()}]`, message, ...args)
    else
      console.trace(`[${this.getLabel()} ${now()}]`, message, ...args)
  }

  debug(message: string | Error, ...args: any[]): void {
    if (this.getLevel() <= LogLevel.Debug)
      console.debug('%c %s %s', 'color: #eee', `[${this.getLabel()} ${now()}]`, message, ...args)
    else
      console.debug(message, ...args)
  }

  info(message: string | Error, ...args: any[]): void {
    if (this.getLevel() <= LogLevel.Info)
      console.info('%c %s %s', 'color: #33f', `[${this.getLabel()} ${now()}]`, message, ...args)
    else
      console.info(message, ...args)
  }

  warn(message: string | Error, ...args: any[]): void {
    if (this.getLevel() <= LogLevel.Warning)
      console.warn('%c %s %s', 'color: #993', `[${this.getLabel()} ${now()}]`, message, ...args)
    else
      console.warn(message, ...args)
  }

  error(message: string | Error, ...args: any[]): void {
    if (this.getLevel() <= LogLevel.Error)
      console.error('%c %s %s', 'color: #f33', `[${this.getLabel()} ${now()}]`, message, ...args)
    else
      console.error(message, ...args)
  }
}

export class LoggerService extends Disposable implements ILoggerService {
  private $logger = this._register(new ConsoleLogger())

  constructor() {
    super()

    isDevelopment ? this.setLevel(LogLevel.Trace) : this.setLevel(LogLevel.Error)
  }

  setLevel(level: LogLevel) {
    this.$logger.setLevel(level)
  }

  getLevel() {
    return this.$logger.getLevel()
  }

  trace(message: string, ...args: any[]): void {
    this.$logger.trace(message, ...args)
  }

  debug(message: string, ...args: any[]): void {
    this.$logger.debug(message, ...args)
  }

  info(message: string, ...args: any[]): void {
    this.$logger.info(message, ...args)
  }

  warn(message: string, ...args: any[]): void {
    this.$logger.warn(message, ...args)
  }

  error(message: string | Error, ...args: any[]): void {
    this.$logger.error(message, ...args)
  }

  create(label: string): ILogger {
    const logger = this._register(new ConsoleLogger())

    logger.setLabel(label)
    return logger
  }
}
