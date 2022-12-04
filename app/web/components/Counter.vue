<script setup lang="ts">
const { inc, count } = useCounter(0)
</script>

<template>
  <p>{{ count }}</p>

  <button @click="() => inc()">
    点击 + 1
  </button>
</template>
