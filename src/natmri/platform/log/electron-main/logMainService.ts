import { isDevelopment } from 'natmri/base/common/environment'
import { Disposable } from 'natmri/base/common/lifecycle'
import type { ILogger, ILoggerService } from 'natmri/platform/log/common/log'
import { AbstractLogger, LogLevel, now } from 'natmri/platform/log/common/log'

export class ConsoleMainLogger extends AbstractLogger implements ILogger {
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
    if (this.getLevel() <= LogLevel.Trace) {
      if (this.useColors)
        console.trace(`\x1B[33m[${this.getLabel()} ${now()}][Trace]\x1B[0m`, message, ...args)
      else
        console.trace(`[${this.getLabel()} ${now()}]`, message, ...args)
    }
  }

  debug(message: string | Error, ...args: any[]): void {
    if (this.getLevel() <= LogLevel.Debug)
      console.debug(`\x1B[32m[${this.getLabel()} ${now()}][DEBUG]\x1B[0m`, message, ...args)
    else
      console.debug(message, ...args)
  }

  info(message: string | Error, ...args: any[]): void {
    if (this.getLevel() <= LogLevel.Info)
      console.info(`\x1B[36m[${this.getLabel()} ${now()}][INFO]\x1B[0m`, message, ...args)
    else
      console.info(message, ...args)
  }

  warn(message: string | Error, ...args: any[]): void {
    if (this.getLevel() <= LogLevel.Warning)
      console.warn(`\x1B[33m[${this.getLabel()} ${now()}][WARNING]x1B[0m`, message, ...args)
    else
      console.warn(message, ...args)
  }

  error(message: string | Error, ...args: any[]): void {
    if (this.getLevel() <= LogLevel.Error)
      console.error(`\x1B[31m[${this.getLabel()} ${now()}][ERROR]\x1B[0m`, message, ...args)
    else
      console.error(message, ...args)
  }
}

export class LoggerMainService extends Disposable implements ILoggerService {
  private $logger = this._register(new ConsoleMainLogger())

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
    const logger = this._register(new ConsoleMainLogger())

    logger.setLabel(label)
    return logger
  }
}
