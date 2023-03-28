export function mapToString<K, V>(map: Map<K, V>): string {
  const entries: string[] = []
  map.forEach((value, key) => {
    entries.push(`${key} => ${value}`)
  })

  return `Map(${map.size}) {${entries.join(', ')}}`
}

export function setToString<K>(set: Set<K>): string {
  const entries: K[] = []
  set.forEach((value) => {
    entries.push(value)
  })

  return `Set(${set.size}) {${entries.join(', ')}}`
}
