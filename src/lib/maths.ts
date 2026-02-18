export function sum(arr: number[]) {
  return (arr.length > 0 ? arr.reduce((total, curr) => total += curr) : 0)
}

export function avg(arr: number[]) {
  return sum(arr) / arr.length
}

export function easeInOutCirc(x: number): number {
  return x < 0.5
    ? (1 - Math.sqrt(1 - Math.pow(2 * x, 2))) / 2
    : (Math.sqrt(1 - Math.pow(-2 * x + 2, 2)) + 1) / 2;
}

export function wrap(v: number, a: number, b: number, offset = 0) {
  let min = Math.min(a, b)
  let max = Math.max(a, b)
  let diff = max - min
  return (v % (diff + offset)) + min
}