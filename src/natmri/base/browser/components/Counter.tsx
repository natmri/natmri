import { createCounter } from 'natmri/base/browser/primitives/createCounter'

export function Counter() {
  const { count, inc } = createCounter()

  return <>
    <p>{count()}</p>

    <button onClick={() => inc()}>
      点击 + 1
    </button>
  </>
}
