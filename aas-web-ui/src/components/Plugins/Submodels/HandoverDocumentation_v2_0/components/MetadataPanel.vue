<template>
  <v-expansion-panels v-if="hasMetadataChildren" variant="accordion" v-model="openPanel">
    <v-expansion-panel value="metadata">
      <v-expansion-panel-title>
        <v-list-item class="pa-0">
          <template #prepend>
            <v-icon size="small">mdi-table</v-icon>
          </template>

          <v-list-item-title>Version Metadata</v-list-item-title>
        </v-list-item>
      </v-expansion-panel-title>

      <v-expansion-panel-text class="pt-2">
        <VersionMetadataTable :version-smc="versionSmc" />
      </v-expansion-panel-text>
    </v-expansion-panel>
  </v-expansion-panels>
</template>

<script lang="ts" setup>
  import type { SubmodelElementLike } from '../types'
  import { hasMetadata } from '../utils/submodelElementUtils'

  defineOptions({
    name: 'MetadataPanel',
  })

  const props = defineProps<{
    versionSmc?: SubmodelElementLike | null
  }>()

  const versionSmc = computed(() => props.versionSmc ?? null)

  // Collapsed by default so the file attachments are visible without the
  // metadata table pushing them down; the user can expand it on demand.
  const openPanel = ref<string | null>(null)
  const hasMetadataChildren = computed(() => hasMetadata(versionSmc.value))
</script>
