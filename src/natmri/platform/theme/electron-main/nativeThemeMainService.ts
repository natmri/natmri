import { nativeTheme } from 'electron'
import { Emitter } from 'natmri/base/common/event'
import { createDecorator } from 'natmri/base/common/instantiation'
import { Disposable } from 'natmri/base/common/lifecycle'
import type { Event } from 'natmri/base/common/event'
import type { ColorTheme, IColorThemeChangeEvent, IThemeService } from 'natmri/platform/theme/common/theme'

export interface INativeThemeMainService extends IThemeService {
}

export const INativeThemeMainService = createDecorator<INativeThemeMainService>('nativeThemeMainService')

export class NativeThemeService extends Disposable implements INativeThemeMainService {
  private _colorTheme: ColorTheme = nativeTheme.themeSource

  private readonly _onColorThemeChange = this._register(new Emitter<IColorThemeChangeEvent>())
  readonly onColorThemeChange: Event<IColorThemeChangeEvent> = this._onColorThemeChange.event

  constructor() {
    super()

    this.registerListeners()
  }

  getColorTheme(): Exclude<ColorTheme, 'system'> {
    if (this._colorTheme === 'system') {
      if (nativeTheme.shouldUseDarkColors)
        return 'dark'
      else
        return 'light'
    }

    return this._colorTheme
  }

  setColorTheme(theme: ColorTheme): void {
    this._colorTheme = theme
  }

  private registerListeners(): void {
    nativeTheme.on('updated', () => {
      this._onColorThemeChange.fire({
        theme: this.getColorTheme(),
      })
    })
  }
}
