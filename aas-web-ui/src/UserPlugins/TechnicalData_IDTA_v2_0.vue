<template>
  <v-container class="pa-0" fluid>
    <VisualizationHeader
      default-title="Technical Data (IDTA)"
      :submodel-element-data="submodelElementData"
    />

    <v-row v-if="sections.length > 0" class="mt-4" dense>
      <v-col v-for="section in sections" :key="section.title" cols="12">
        <v-card class="mb-4" variant="outlined">
          <v-card-title class="pa-3" density="compact">
            <v-icon class="mr-2" color="primary" size="small">
              {{ section.icon }}
            </v-icon>

            <span class="text-title-subtitle">{{ section.title }}</span>
          </v-card-title>

          <v-simple-table v-if="section.rows.length > 0" class="text-body-2" density="compact">
            <template #default>
              <thead>
                <tr>
                  <th class="text-left text-caption font-medium text-medium-emphasis">Property</th>
                  <th class="text-left text-caption font-medium text-medium-emphasis">Value</th>
                </tr>
              </thead>

              <tbody>
                <tr v-for="row in section.rows" :key="row.raw">
                  <td class="text-body-2 font-medium text-truncate" :title="row.raw">{{ row.name }}</td>
                  <td class="text-body-2">{{ row.value }}<span v-if="row.unit" class="text-medium-emphasis">&nbsp;{{ row.unit }}</span></td>
                </tr>
              </tbody>
            </template>
          </v-simple-table>

          <v-card-subtitle v-else class="pa-3 text-medium-emphasis">No data</v-card-subtitle>
        </v-card>
      </v-col>
    </v-row>

    <v-container v-else class="text-medium-emphasis">No technical data sections found.</v-container>
  </v-container>
</template>

<script lang="ts" setup>
  // Options
  defineOptions({
    name: 'TechnicalDataIDTA',
    semanticId: 'https://admin-shell.io/idta/TechnicalData/2/0',
  })

  // Properties
  const props = defineProps({
    submodelElementData: {
      type: Object as any,
      default: {} as any,
    },
  })

  function prettify (id: string): string {
    return id
      .replace(/_/g, ' ')
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^./, c => c.toUpperCase())
  }

  function valueOf (el: any): string {
    if (el.modelType === 'MultiLanguageProperty' && Array.isArray(el.value)) {
      const pick = el.value.find((v: any) => v.lang === 'en') ?? el.value[0]
      return pick?.text ?? ''
    }
    if (el.modelType === 'SubmodelElementCollection') return '(nested sub-elements)'
    return el.value == null ? '' : String(el.value)
  }

  function iconFor (title: string): string {
    const t = title.toLowerCase()
    if (t.includes('product') || t.includes('identif')) return 'mdi-information-outline'
    if (t.includes('mechan')) return 'mdi-cog-outline'
    if (t.includes('electric')) return 'mdi-flash-outline'
    if (t.includes('cabling') || t.includes('cable')) return 'mdi-cable'
    if (t.includes('environ') || t.includes('condition')) return 'mdi-leaf-outline'
    return 'mdi-format-list-bulleted'
  }

  const sections = computed(() => {
    const els: any[] = props.submodelElementData?.submodelElements ?? []
    return els
      .filter(e => e.modelType === 'SubmodelElementCollection')
      .map(sm => {
        const items: any[] = sm.value ?? []
        const units: { base: string, unit: string }[] = []
        for (const it of items) {
          const id: string = it.idShort ?? ''
          if (id.endsWith('_EngUnit')) units.push({ base: id.slice(0, -'_EngUnit'.length), unit: valueOf(it) })
        }
        // A value X uses unit Base_EngUnit when X === Base or X starts with Base + '_'
        // (handles shared units, e.g. ShaftRotationTime_90_50Hz -> ShaftRotationTime_EngUnit).
        const resolveUnit = (id: string): string => {
          let best = ''
          let bestLen = -1
          for (const { base, unit } of units) {
            if ((id === base || id.startsWith(base + '_')) && base.length > bestLen) {
              best = unit
              bestLen = base.length
            }
          }
          return best
        }
        const rows: { raw: string, name: string, value: string, unit: string }[] = []
        for (const child of items) {
          const id: string = child.idShort ?? ''
          if (id.endsWith('_EngUnit')) continue
          rows.push({ raw: id, name: prettify(id), value: valueOf(child), unit: resolveUnit(id) })
        }
        return { title: sm.idShort, icon: iconFor(sm.idShort ?? ''), rows }
      })
  })
</script>
