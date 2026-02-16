export class SlideScheduler {
  private readonly slides: number[];
  private cursor = 0;

  constructor(slides: number[]) {
    this.slides = slides;
  }

  next(): number | null {
    if (this.cursor >= this.slides.length) {
      return null;
    }

    const value = this.slides[this.cursor];
    this.cursor += 1;
    return value;
  }
}
