import type { IPlayer } from './player'

export type IWallpaperBroadcastClientKind = ''
export type IWallpaperBroadcastServerKind = 'request'
export type IWallpaperPreviewExt = 'jpg' | 'png' | 'gif' | 'webp' | 'jpeg'
export type IWallpaperPreview = `${string}.${IWallpaperPreviewExt}`
export type IWallpaperCustomFileExt = 'json'
export type IWallpaperFilePath = `${string}.${IWallpaperCustomFileExt}`
export type IWallpaperFileVer = `${number}.${number}.${number}`
export type IWallpaperFileURI = `natmri-ws:${string}` /** schema:path custom wallpaper store protocol  */

export interface IWallpaperBroadcastClientData {
  kind: IWallpaperBroadcastClientKind
}

export interface IWallpaperBroadcastServerData {
  kind: IWallpaperBroadcastServerKind
}

export interface IWallpaperInitialEventConfig {

}

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
