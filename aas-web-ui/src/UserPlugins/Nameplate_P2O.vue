<template>
  <v-container class="pa-0" fluid>
    <VisualizationHeader
      default-title="Nameplate (Typenschild)"
      :submodel-element-data="submodelElementData"
    />

    <!-- Two presentation alternatives for the same nameplate data, as tabs:
         tab 1 = p2o-lab "Typenschild" (blue metal-plate styling),
         tab 2 = the stock BaSyx "Digital Nameplate" viewer. -->
    <v-tabs v-model="activeTab" color="primary" density="compact" grow>
      <v-tab value="p2o">Typenschild (p2o)</v-tab>
      <v-tab value="stock">Digital Nameplate</v-tab>
    </v-tabs>

    <v-divider class="mt-2" />

    <v-window class="pt-3" :model-value="activeTab">
      <!-- Tab 1: p2o-lab Typenschild card (blue, metal-plate styling) -->
      <v-window-item value="p2o">
        <div
          class="pa-6 d-flex flex-column align-center"
          style="background: linear-gradient(135deg, #00386C 0%, #0a5a9e 55%, #49BAE5 100%); border-radius: 12px;"
        >
          <!-- p2o-lab logo (served at <basePath>/Logo/Logo_light.svg via the
           bind mount in etc/webgui/compose.yaml) -->
          <v-img
            alt="p2o-lab"
            class="mb-4"
            max-width="220"
            :src="logoSrc"
            style="filter: brightness(0) invert(1);"
          />

          <!-- Plate title -->
          <div class="text-white text-subtitle-1 font-weight-bold mb-4 letter-spacing">
            TECHNISCHE DATEN &middot; TYPENSCHILD
          </div>

          <v-row v-for="row in rows" :key="row.label" class="nameplate-row w-100">
            <v-col class="pr-4" cols="4">
              <div class="text-caption font-weight-medium nameplate-label text-white">
                {{ row.label }}
              </div>
            </v-col>

            <v-col class="pl-4" cols="8">
              <div class="nameplate-value">{{ row.value }}</div>
            </v-col>
          </v-row>

          <div class="text-caption mt-5 letter-spacing text-white">
            p2o-lab
          </div>
        </div>
      </v-window-item>

      <!-- Tab 2: the stock BaSyx Digital Nameplate viewer. It is a plain
           component (its semanticId was removed so it no longer auto-renders
           on its own); we hand it the same submodel data. -->
      <v-window-item value="stock">
        <Nameplate_v3_0 :submodel-element-data="submodelElementData" />
      </v-window-item>
    </v-window>
  </v-container>
</template>

<script lang="ts" setup>
  import { useReferableUtils } from '@/composables/AAS/ReferableUtils'
  import { useSMHandling } from '@/composables/AAS/SMHandling'
  import { useSME } from '@/composables/AAS/SubmodelElements/SubmodelElement'
  import { useAASStore } from '@/store/AASDataStore'
  import { useEnvStore } from '@/store/EnvironmentStore'

  defineOptions({
    name: 'NameplateP2O',
    semanticId: 'https://admin-shell.io/idta/nameplate/3/0/Nameplate',
  })

  const props = defineProps({
    submodelElementData: {
      type: Object as any,
      default: () => ({}),
    },
  })

  // Composables
  const { setData } = useSMHandling()
  const { getSubmodelElementByIdShort } = useReferableUtils()
  const { valueToDisplay } = useSME()
  const envStore = useEnvStore()
  const aasStore = useAASStore()

  const submodelData = ref<any>({})
  const selectedNode = computed(() => aasStore.getSelectedNode)

  // Which tab is active (p2o card first, stock viewer second).
  const activeTab = ref<'p2o' | 'stock'>('p2o')

  // P2O nameplate fields, in display order. `idShort` is the exact idShort
  // published by src/aas/submodel/nameplate.py (propertyFromData uses the
  // DataFrame column name, which matches nameplate_semantics.py).
  const FIELDS: { idShort: string, label: string }[] = [
    { idShort: 'ManufacturerName', label: 'Manufacturer' },
    { idShort: 'ManufacturerProductDesignation', label: 'Product Designation' },
    { idShort: 'YearOfConstruction', label: 'Year of Construction' },
    { idShort: 'HardwareVersion', label: 'Hardware Version' },
    { idShort: 'FirmwareVersion', label: 'Firmware Version' },
    { idShort: 'SoftwareVersion', label: 'Software Version' },
    { idShort: 'CountryOfOrigin', label: 'Country of Origin' },
    { idShort: 'Department', label: 'Department' },
  ]

  // Build the logo URL the same way AppNavigation.vue does:
  // <basePath>/Logo/<logoLightPath>, falling back to a bare /Logo/ when the
  // env store does not yet have a base path (dev mode).
  const logoSrc = computed<string>(() => {
    const basePath = import.meta.env.MODE === 'production'
      ? envStore.getEnvBasePath
      : import.meta.env.BASE_URL
    const logoFile = (envStore.getEnvLogoLightPath || 'Logo_light.svg')
      .replace(/^\/+/, '')
    if (basePath && basePath.trim() !== '' && !basePath.includes('PLACEHOLDER')) {
      const norm = basePath.endsWith('/') ? basePath : basePath + '/'
      return `${norm}Logo/${logoFile}`
    }
    return `/Logo/${logoFile}`
  })

  const rows = computed<{ label: string, value: string }[]>(() => {
    const out: { label: string, value: string }[] = []
    for (const f of FIELDS) {
      const el = getSubmodelElementByIdShort(f.idShort, submodelData.value)
      const v = el?.modelType ? (valueToDisplay(el) || '') : ''
      if (v) out.push({ label: f.label, value: v })
    }
    return out
  })

  onMounted(() => {
    initializeVisualization()
  })

  async function initializeVisualization (): Promise<void> {
    if (!props.submodelElementData || Object.keys(props.submodelElementData).length === 0) return
    const copiedData = { ...props.submodelElementData }
    submodelData.value = await setData(
      copiedData,
      selectedNode.value.path,
      false,
      selectedNode.value.timestamp,
    )
  }
</script>

<style scoped>
.letter-spacing {
  letter-spacing: 0.15em;
}

.nameplate-label {
  letter-spacing: 0.05em;
  opacity: 0.9;
}

.nameplate-value {
  background: rgba(255, 255, 255, 0.95);
  color: #00386C;
  font-weight: 600;
  font-size: 14px;
  padding: 4px 8px;
  border-radius: 3px;
  line-height: 1.5;
  word-break: break-word;
}
</style>
