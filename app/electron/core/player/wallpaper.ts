import type { IPlayer } from './player'

export type IWallpaperPreviewExt = 'jpg' | 'png' | 'gif' | 'webp' | 'jpeg'
export type IWallpaperPreview = `${string}.${IWallpaperPreviewExt}`
export type IWallpaperCustomFileExt = 'json'
export type IWallpaperFilePath = `${string}.${IWallpaperCustomFileExt}`
export type IWallpaperFileVer = `${number}.${number}.${number}`
export type IWallpaperFileURI = `cws://${string}` /** custom wallpaper store protocol  */

export interface IWallpaperFile {
  name: string
  preview: IWallpaperPreview
  filepath: IWallpaperFilePath
  ver: IWallpaperFileVer
}

export interface IWallpaperPlayFile extends IWallpaperFile {
  id: string
  displayName: string
  url: IWallpaperFileURI
}

export interface IWallpaperPlayer extends IPlayer<IWallpaperPlayFile> {

}
