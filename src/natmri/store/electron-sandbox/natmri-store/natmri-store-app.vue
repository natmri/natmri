<script setup lang="ts">
import Counter from 'natmri/base/browser/components/Counter.vue'
import { createService } from 'natmri/base/browser/primitives/createServices'
import { INativeHostService } from 'natmri/platform/native/electron-browser/native'

function getIconsUrl(name: string) {
  return `natmri://assets/icons/${name}`
}

onBeforeMount(async () => {
  const nativeHostService = createService(INativeHostService)
  console.log(await nativeHostService.getOSProperties())
  console.log(await nativeHostService.isAdmin())
})
</script>

<template>
  <div flex flex-col>
    <div relative select-none h="[30px]">
      <div top-0 left-0 bottom-0 right-0 absolute region-drag />
    </div>
    <div>
      <h2 text-2xl font-bold p-4>
        Natmri - Store
      </h2>

      <Counter />

      <div class="flex gap-4">
        <button class="n-btn-primary">
          Primary
        </button>
        <button class="n-btn-danger">
          Danger
        </button>
        <button class="n-btn-success">
          Success
        </button>
        <button class="n-btn-warning">
          Warning
        </button>
        <button class="n-btn-info">
          Info
        </button>
        <button class="n-btn-link">
          Link
        </button>
      </div>

      <div class="ml-2 n-card inline-flex flex-col">
        <div class="n-card-header">
          <h3>Card Header</h3>
        </div>
        <div class="n-card-body">
          <p>Card Body</p>
        </div>
      </div>

      <div flex flex-col>
        <p>getIconsUrl function expample</p>

        <div self-start border rounded-md overflow-hidden p-1 mt-2>
          <img block object-cover :src="getIconsUrl('128x128.png')" alt="application icon">
        </div>
      </div>
    </div>
  </div>
</template>
