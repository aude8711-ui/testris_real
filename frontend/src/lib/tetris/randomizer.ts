import { PieceType, PIECE_TYPES } from './pieces'

export class SevenBag {
  private bag: PieceType[] = []
  private seed: number

  constructor(seed: number) {
    this.seed = seed
    this.refill()
  }

  private rand(): number {
    this.seed = (this.seed * 1664525 + 1013904223) & 0xffffffff
    return (this.seed >>> 0) / 0x100000000
  }

  private refill() {
    this.bag = [...PIECE_TYPES]
    for (let i = this.bag.length - 1; i > 0; i--) {
      const j = Math.floor(this.rand() * (i + 1));
      [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]]
    }
  }

  next(): PieceType {
    if (this.bag.length === 0) this.refill()
    return this.bag.pop()!
  }

  peek(count: number): PieceType[] {
    while (this.bag.length < count) this.refill()
    return this.bag.slice(-count).reverse()
  }
}
