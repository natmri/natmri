export enum WallpapperCategory {
  Web = 0,
  Video = 1,
  Picture = 2,
  VideoStream = 3,
  App = 4,
  Scene = 5,
}

export function isAllowedInteractiveCategory(category: WallpapperCategory): boolean {
  switch (category) {
    case WallpapperCategory.Picture:
      return false
    case WallpapperCategory.Video:
      return false
    case WallpapperCategory.VideoStream:
      return false
    case WallpapperCategory.Web:
      return true
    case WallpapperCategory.App:
      return true
    case WallpapperCategory.Scene:
      return true
    default:
      return false
  }
}
