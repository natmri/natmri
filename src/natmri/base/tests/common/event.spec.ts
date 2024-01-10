import { beforeEach, expect, it, suite } from 'vitest'
import { timeout } from 'natmri/base/common/async'
import { errorHandler, setUnexpectedErrorHandler } from 'natmri/base/common/errors'
import { Emitter, Event } from 'natmri/base/common/event'
import { DisposableStore, isDisposable } from 'natmri/base/common/lifecycle'
import type { IDisposable } from 'natmri/base/common/lifecycle'

export class EventCounter {
  count = 0

  reset() {
    this.count = 0
  }

  onEvent() {
    this.count += 1
  }
}

export class Document3 {
  private readonly _onDidChange = new Emitter<string>()

  onDidChange: Event<string> = this._onDidChange.event

  setText(value: string) {
    // ...
    this._onDidChange.fire(value)
  }
}

suite('Event utils dispose', () => {
  it('no leak with snapshot-utils', () => {
    const store = new DisposableStore()
    const emitter = new Emitter<number>()
    const evens = Event.filter(emitter.event, n => n % 2 === 0, store)

    let all = 0
    const leaked = evens(n => all += n)
    expect(isDisposable(leaked)).toBeTruthy()

    emitter.dispose()
    store.dispose()
  })

  it('no leak with debounce-util', () => {
    const store = new DisposableStore()
    const emitter = new Emitter<number>()
    const debounced = Event.debounce(emitter.event, _l => 0, undefined, undefined, store)

    let all = 0
    const leaked = debounced(n => all += n)
    expect(isDisposable(leaked)).toBeTruthy()

    emitter.dispose()
    store.dispose()
  })
})

suite('Event', () => {
  const counter = new EventCounter()

  beforeEach(() => counter.reset())

  it('emitter plain', () => {
    const doc = new Document3()

    const subscription = doc.onDidChange(counter.onEvent, counter)

    doc.setText('far')
    doc.setText('boo')

    // unhook listener
    subscription.dispose()
    doc.setText('boo')
    expect(counter.count).toStrictEqual(2)
  })

  it('emitter, bucket', () => {
    const bucket: IDisposable[] = []
    const doc = new Document3()
    const subscription = doc.onDidChange(counter.onEvent, counter, bucket)

    doc.setText('far')
    doc.setText('boo')

    // unhook listener
    while (bucket.length)
      bucket.pop()!.dispose()

    doc.setText('boo')

    // noop
    subscription.dispose()

    doc.setText('boo')
    expect(counter.count).toStrictEqual(2)
  })

  it('emitter, store', () => {
    const bucket = new DisposableStore()
    const doc = new Document3()
    const subscription = doc.onDidChange(counter.onEvent, counter, bucket)

    doc.setText('far')
    doc.setText('boo')

    // unhook listener
    bucket.clear()
    doc.setText('boo')

    // noop
    subscription.dispose()

    doc.setText('boo')
    expect(counter.count).toStrictEqual(2)
  })

  it('onFirstAdd|onLastRemove', () => {
    let firstCount = 0
    let lastCount = 0
    const a = new Emitter({
      onWillAddFirstListener() { firstCount += 1 },
      onDidRemoveLastListener() { lastCount += 1 },
    })

    expect(firstCount).toStrictEqual(0)
    expect(lastCount).toStrictEqual(0)

    const subscription = a.event(() => { })
    expect(firstCount).toStrictEqual(1)
    expect(lastCount).toStrictEqual(0)

    subscription.dispose()
    expect(firstCount).toStrictEqual(1)
    expect(lastCount).toStrictEqual(1)

    a.event(() => { })
    expect(firstCount).toStrictEqual(2)
    expect(lastCount).toStrictEqual(1)
  })

  it('throwingListener', () => {
    const origErrorHandler = errorHandler.getUnexpectedErrorHandler()
    setUnexpectedErrorHandler(() => null)

    try {
      const a = new Emitter<undefined>()
      let hit = false
      a.event(() => {
        // eslint-disable-next-line no-throw-literal
        throw 9
      })
      a.event(() => {
        hit = true
      })
      a.fire(undefined)
      expect(hit).toStrictEqual(true)
    }
    finally {
      setUnexpectedErrorHandler(origErrorHandler)
    }
  })

  it('reusing event function and context', () => {
    let counter = 0
    function listener() {
      counter += 1
    }
    const context = {}

    const emitter = new Emitter<undefined>()
    const reg1 = emitter.event(listener, context)
    const reg2 = emitter.event(listener, context)

    emitter.fire(undefined)
    expect(counter).toStrictEqual(2)

    reg1.dispose()
    emitter.fire(undefined)
    expect(counter).toStrictEqual(3)

    reg2.dispose()
    emitter.fire(undefined)
    expect(counter).toStrictEqual(3)
  })

  it('debounce Event', (done: () => void) => {
    const doc = new Document3()

    const onDocDidChange = Event.debounce(doc.onDidChange, (prev: string[] | undefined, cur) => {
      if (!prev)
        prev = [cur]

      else if (!prev.includes(cur))
        prev.push(cur)

      return prev
    }, 10)

    let count = 0

    onDocDidChange((keys) => {
      count++
      expect(keys, 'was not expecting keys.').toBeTruthy()
      if (count === 1) {
        doc.setText('4')
        expect(keys).toStrictEqual(['1', '2', '3'])
      }
      else if (count === 2) {
        expect(keys).toStrictEqual(['4'])
        done()
      }
    })

    doc.setText('1')
    doc.setText('2')
    doc.setText('3')
  })

  it('debounce Event - leading 1', async () => {
    const emitter = new Emitter<void>()
    const debounced = Event.debounce(emitter.event, (_l, e) => e, 0, /* leading= */true)

    let calls = 0
    debounced(() => {
      calls++
    })

    // If the source event is fired once, the debounced (on the leading edge) event should be fired only once
    emitter.fire()

    await timeout(1)
    expect(calls).toStrictEqual(1)
  })

  it('debounce Event - leading 2', async () => {
    const emitter = new Emitter<void>()
    const debounced = Event.debounce(emitter.event, (_l, e) => e, 0, /* leading= */true)

    let calls = 0
    debounced(() => {
      calls++
    })

    // If the source event is fired multiple times, the debounced (on the leading edge) event should be fired twice
    emitter.fire()
    emitter.fire()
    emitter.fire()
    await timeout(1)
    expect(calls).toEqual(2)
  })

  it('debounce Event - leading reset', async () => {
    const emitter = new Emitter<number>()
    const debounced = Event.debounce(emitter.event, (l, _e) => l ? l + 1 : 1, 0, /* leading= */true)

    const calls: number[] = []
    debounced(e => calls.push(e))

    emitter.fire(1)
    emitter.fire(1)

    await timeout(1)
    expect(calls).toStrictEqual([1, 1])
  })

  it('emitter - In Order Delivery', () => {
    const a = new Emitter<string>()
    const listener2Events: string[] = []
    a.event((event) => {
      if (event === 'e1') {
        a.fire('e2')
        // expectents are de).toStrictEqual(ivered at this point
        expect(listener2Events).toStrictEqual(['e1', 'e2'])
      }
    })
    a.event((event) => {
      listener2Events.push(event)
    })
    a.fire('e1')

    // expectents are de).toStrictEqual(ivered in order
    expect(listener2Events).toStrictEqual(['e1', 'e2'])
  })

  it('cannot read property \'_actual\' of undefined #142204', () => {
    const e = new Emitter<number>()
    const dispo = e.event(() => { })
    dispo.dispose.call(undefined) // expectable can be).toStrictEqual(called with this
  })
})
