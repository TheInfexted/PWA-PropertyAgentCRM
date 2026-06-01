<script setup lang="ts">
import { parseDelimited, autoMapColumns, type ColumnMap } from '~~/shared/utils/import'
import type { ImportPreview } from '~/composables/useImport'

const emit = defineEmits<{ imported: [count: number] }>()

const FIELDS: { key: keyof ColumnMap; label: string }[] = [
  { key: 'name', label: 'Name' },
  { key: 'phone', label: 'Phone' },
  { key: 'area', label: 'Area' },
  { key: 'status', label: 'Status' },
  { key: 'remarks', label: 'Remarks' },
]

const step = ref<'input' | 'map' | 'preview'>('input')
const raw = ref('')
const hasHeader = ref(true)
const header = ref<string[]>([])
const body = ref<string[][]>([])
const map = ref<ColumnMap>({ name: null, phone: null, area: null, status: null, remarks: null })
const previewData = ref<ImportPreview | null>(null)
const includeDuplicates = ref(false)
const busy = ref(false)
const error = ref('')

const { preview, commit } = useImport()

function onFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => { raw.value = String(reader.result ?? '') }
  reader.readAsText(file)
}

function toMapping() {
  const grid = parseDelimited(raw.value)
  if (!grid.length) { error.value = 'Nothing to import. Paste rows or choose a file.'; return }
  error.value = ''
  const { header: h, body: b } = splitHeaderAndBody(grid, hasHeader.value)
  header.value = h
  body.value = b
  map.value = hasHeader.value ? autoMapColumns(h) : { name: 0, phone: 1, area: null, status: null, remarks: null }
  step.value = 'map'
}

async function toPreview() {
  busy.value = true; error.value = ''
  try {
    previewData.value = await preview(body.value, map.value)
    step.value = 'preview'
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Could not build the preview.'
  } finally { busy.value = false }
}

async function confirmImport() {
  busy.value = true; error.value = ''
  try {
    const res = await commit(body.value, map.value, includeDuplicates.value)
    emit('imported', res.inserted)
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Import failed.'
  } finally { busy.value = false }
}
</script>

<template>
  <div class="space-y-5">
    <section v-if="step === 'input'" class="rounded-lg border border-line bg-surface p-6 shadow-card">
      <h2 class="text-base font-semibold text-ink">Paste your spreadsheet</h2>
      <p class="mt-1 text-sm text-muted">Copy the rows from Google Sheets or Excel and paste below, or choose a CSV file.</p>
      <textarea
        v-model="raw"
        rows="8"
        placeholder="Name	Contact	Area	Status	Remarks"
        class="mt-3 w-full rounded-md border border-line bg-card px-3 py-2 font-mono text-[13px]"
      />
      <div class="mt-3 flex items-center justify-between">
        <label class="flex items-center gap-2 text-sm text-muted">
          <input v-model="hasHeader" type="checkbox" class="accent-[var(--color-accent)]"> First row is a header
        </label>
        <label class="cursor-pointer text-sm text-accent hover:text-accent-strong">
          Choose CSV file
          <input type="file" accept=".csv,text/csv" class="hidden" @change="onFile">
        </label>
      </div>
      <p v-if="error" class="mt-2 text-sm text-red-600">{{ error }}</p>
      <button class="mt-4 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-strong active:translate-y-px" @click="toMapping">
        Continue
      </button>
    </section>

    <section v-else-if="step === 'map'" class="rounded-lg border border-line bg-surface p-6 shadow-card">
      <h2 class="text-base font-semibold text-ink">Match the columns</h2>
      <p class="mt-1 text-sm text-muted">{{ body.length }} rows found. Tell us which column is which.</p>
      <div class="mt-4 grid gap-3 sm:grid-cols-2">
        <label v-for="f in FIELDS" :key="f.key" class="flex flex-col gap-1">
          <span class="text-xs font-medium text-muted">{{ f.label }}</span>
          <select v-model="map[f.key]" class="rounded-md border border-line bg-card px-3 py-2 text-sm">
            <option :value="null">— not in sheet —</option>
            <option v-for="(h, i) in header" :key="i" :value="i">{{ h || `Column ${i + 1}` }}</option>
          </select>
        </label>
      </div>
      <p v-if="error" class="mt-2 text-sm text-red-600">{{ error }}</p>
      <div class="mt-4 flex gap-2">
        <button class="rounded-md px-3 py-2 text-sm text-muted hover:text-ink" @click="step = 'input'">Back</button>
        <button :disabled="busy" class="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-strong active:translate-y-px disabled:opacity-60" @click="toPreview">
          {{ busy ? 'Checking…' : 'Preview' }}
        </button>
      </div>
    </section>

    <section v-else class="space-y-4">
      <div class="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
        <span class="font-semibold text-ink">{{ previewData?.summary.valid }} ready to import</span>
        <span v-if="previewData?.summary.existingDuplicates" class="text-amber-700">{{ previewData?.summary.existingDuplicates }} already in your list</span>
        <span v-if="previewData?.summary.inBatchDuplicates" class="text-muted">{{ previewData?.summary.inBatchDuplicates }} repeated in the paste</span>
        <span v-if="previewData?.summary.errors" class="text-red-600">{{ previewData?.summary.errors }} skipped (no name or phone)</span>
      </div>

      <label v-if="previewData?.summary.existingDuplicates" class="flex items-center gap-2 text-sm text-muted">
        <input v-model="includeDuplicates" type="checkbox" class="accent-[var(--color-accent)]"> Import the {{ previewData?.summary.existingDuplicates }} that already exist anyway
      </label>

      <ImportPreviewTable :rows="previewData?.rows ?? []" />

      <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
      <div class="flex gap-2">
        <button class="rounded-md px-3 py-2 text-sm text-muted hover:text-ink" @click="step = 'map'">Back</button>
        <button :disabled="busy" class="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-strong active:translate-y-px disabled:opacity-60" @click="confirmImport">
          {{ busy ? 'Importing…' : 'Import leads' }}
        </button>
      </div>
    </section>
  </div>
</template>
