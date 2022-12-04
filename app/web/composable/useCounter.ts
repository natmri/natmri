export function useCounter(initial = 0) {
  const count = ref(initial)

  const inc = (delta?: number) => {
    count.value += delta ?? 1
  }

  const dec = (delta?: number) => {
    count.value -= delta ?? 1
  }

  const get = () => count.value

  const set = (val: number) => count.value = val

  const reset = (val?: number) => count.value = val ?? initial

  return {
    count,
    inc,
    dec,
    get,
    set,
    reset,
  }
}
