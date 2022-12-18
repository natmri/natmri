import { useState } from 'react'

export function useCounter(initial = 0) {
  const [count, setCount] = useState(initial)

  const inc = (delta?: number) => {
    setCount(count => count + (delta ?? 1))
  }

  const dec = (delta?: number) => {
    setCount(count => count - (delta ?? 1))
  }

  const get = () => count

  const set = (val: number) => setCount(val)

  const reset = (val?: number) => setCount(val ?? initial)

  return {
    count,
    inc,
    dec,
    get,
    set,
    reset,
  }
}