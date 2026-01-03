declare module 'colorthief' {
  type RGB = [number, number, number];
  
  class ColorThief {
    getColor(img: HTMLImageElement): RGB;
    getPalette(img: HTMLImageElement, colorCount?: number): RGB[];
  }
  
  export default ColorThief;
} 