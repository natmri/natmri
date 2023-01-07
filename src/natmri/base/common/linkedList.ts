// 链表节点
class Node<E> {
  static Undefined: Node<any>

  element: E
  prev: Node<E>
  next: Node<E>

  constructor(element: E) {
    this.element = element
    this.prev = Node.Undefined
    this.next = Node.Undefined
  }
}

// close vite complied error
Node.Undefined = new Node<any>(undefined)

export class LinkedList<E> {
  private _first: Node<E> = Node.Undefined
  private _last: Node<E> = Node.Undefined
  private _size = 0

  get size(): number {
    return this._size
  }

  // empty linkedlist check
  isEmpty(): boolean {
    return this._first === Node.Undefined
  }

  // clear linkedlist
  clear(): void {
    let node = this._first
    while (node !== Node.Undefined) {
      const next = node.next
      node.prev = Node.Undefined
      node.next = Node.Undefined
      node = next
    }

    this._first = Node.Undefined
    this._last = Node.Undefined
    this._size = 0
  }

  // insert an element for linkedlist head
  unshift(element: E): () => void {
    return this._insert(element, false)
  }

  // insert an element for linkedlist ended
  push(element: E): () => void {
    return this._insert(element, true)
  }

  // get an element for linkedlist for ended
  pop(): E | undefined {
    if (this._last === Node.Undefined) {
      return undefined
    }
    else {
      const res = this._last.element
      this._remove(this._last)
      return res
    }
  }

  // get an element for linkedlist for head
  shift(): E | undefined {
    if (this._first === Node.Undefined) {
      return undefined
    }
    else {
      const res = this._first.element
      this._remove(this._first)
      return res
    }
  }

  // insert an element
  private _insert(element: E, atTheLast = false) {
    const node = new Node(element)
    // insert origin node
    if (this._first === Node.Undefined) {
      this._first = node
      this._last = node
    }
    else if (!atTheLast) {
      // unshift
      this._first.prev = node
      node.next = this._first
      this._first = node
    }
    else {
      // push
      this._last.next = node
      node.prev = this._last
      this._last = node
    }

    // done insert element
    this._size += 1

    let didRemove = false

    return () => {
      if (!didRemove) {
        this._remove(node)
        didRemove = true
      }
    }
  }

  // remove an element
  private _remove(node: Node<E>) {
    // no first, no last
    if (node.prev !== Node.Undefined && node.next !== Node.Undefined) {
      // find form the middle
    }
    else if (node.prev === Node.Undefined && node.next === Node.Undefined) {
      // only one node
      this._first = Node.Undefined
      this._last = Node.Undefined
    }
    else if (node.next === Node.Undefined) {
      // last node
      this._last = this._last.prev
      this._last.next = Node.Undefined
    }
    else if (node.prev === Node.Undefined) {
      // first node
      this._first = this._first.next
      this._first.prev = Node.Undefined
    }

    // done remove element
    this._size -= 1

    return node.element
  }

  *[Symbol.iterator]() {
    let node = this._first
    while (node !== Node.Undefined) {
      yield node.element
      node = node.next
    }
  }
}
