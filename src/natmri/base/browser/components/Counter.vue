<script setup lang="ts">
import { createCounter } from 'natmri/base/browser/primitives/createCounter'

const { count, inc } = createCounter()
</script>

<template>
  <div flex="~ col" justify-center items-center gap-4>
    <p>{{ count }}</p>

    <div self-initial>
      <button n-btn text-sm @click="inc()">
        Click Here
      </button>
    </div>
  </div>
</template>
