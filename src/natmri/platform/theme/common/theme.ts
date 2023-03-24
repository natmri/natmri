import type { Event } from 'natmri/base/common/event'

export type ColorTheme = 'light' | 'dark' | 'system'

export interface IColorThemeChangeEvent {
  theme: ColorTheme
}

export interface IThemeService {
  getColorTheme(): ColorTheme
  setColorTheme(theme: ColorTheme): void

  onColorThemeChange: Event<IColorThemeChangeEvent>
}
