import { createCounter } from 'natmri/base/browser/primitives/createCounter'

export function Counter() {
  const { count, inc } = createCounter()

  return <div flex="~ col" justify-center items-center gap-4>
    <p>{count()}</p>

    <div self-initial>
    <button n-btn text-sm onClick={() => inc()}>
      Click Here
    </button>
    </div>
  </div>
}
