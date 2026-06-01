<script setup lang="ts">
const { listDue, reschedule, markDone } = useFollowUps()
const { data, refresh } = await useAsyncData('due-followups', () => listDue())

async function onDone(id: number) {
  await markDone(id)
  await refresh()
}
async function onReschedule(id: number, date: string) {
  if (!date) return
  await reschedule(id, date)
  await refresh()
}
</script>

<template>
  <DueList
    :rows="(data ?? []) as any"
    @done="onDone"
    @reschedule="onReschedule"
  />
</template>
