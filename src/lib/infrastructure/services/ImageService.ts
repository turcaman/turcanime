import { Image } from "react-native";

export interface IImageService {
  prefetchImages(items: { image?: string }[]): void;
}

export class ImageService implements IImageService {
  prefetchImages(items: { image?: string }[]): void {
    items.forEach((item) => {
      if (item.image) {
        Image.prefetch(item.image).catch(() => {});
      }
    });
  }
}
