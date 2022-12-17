<script setup lang="ts">
import Counter from './components/Counter.vue'
import { sayHello } from '#preload/common'

const getIconsUrl = (name: string) => {
  return `natmri://assets/icons/${name}`
}
</script>

<template>
  <div text-xl>
    <Counter />
    <div mt-2>
      <button @click="sayHello">
        SayHello
      </button>
    </div>

    <div flex flex-col>
      <p>getIconsUrl function expample</p>

      <div self-start border rounded-md overflow-hidden p-1 mt-2>
        <img block object-cover :src="getIconsUrl('32x32.png')">
      </div>
    </div>
  </div>
</template>
