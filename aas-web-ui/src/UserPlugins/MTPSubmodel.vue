<template>
  <v-container class="pa-0" fluid>
    <VisualizationHeader
      default-title="Module Type Package (MTP)"
      :submodel-element-data="submodelElementData"
    />

    <!-- Loading -->
    <v-card v-if="isLoading" class="mb-4">
      <v-skeleton-loader type="list-item-avatar, divider, list-item-avatar" />
    </v-card>

    <template v-else>
      <!-- MTP File -->
      <v-card v-if="mtpFile" class="mb-4">
        <v-card-title class="bg-elevatedCard">
          <div class="d-flex align-center">
            <v-icon class="mr-2">mdi-file-document-outline</v-icon>
            <span class="text-body-large">Module Type File</span>
          </div>
        </v-card-title>

        <v-card-text>
          <div class="d-flex align-center flex-wrap ga-3">
            <v-chip color="primary" label>
              {{ mtpFile.contentType || 'application/mtp' }}
            </v-chip>

            <v-chip v-if="mtpFilename" color="surface" label variant="outlined">
              {{ mtpFilename }}
            </v-chip>
          </div>

          <div class="mt-4 d-flex flex-wrap ga-2">
            <v-btn
              color="primary"
              :loading="downloading"
              prepend-icon="mdi-download"
              variant="tonal"
              @click="downloadMTPFile"
            >
              Download MTP
            </v-btn>

            <v-btn
              color="secondary"
              :loading="parsing"
              prepend-icon="mdi-magnify-scan"
              variant="tonal"
              @click="parseMTP"
            >
              {{ mtpData ? 'Re-parse MTP' : 'Parse MTP' }}
            </v-btn>
          </div>
        </v-card-text>
      </v-card>

      <v-alert
        v-if="parseError"
        class="mb-4"
        density="compact"
        type="error"
        variant="tonal"
      >
        {{ parseError }}
      </v-alert>

      <!-- Parsed structure (from the MTP service) -->
      <MTPStructureView v-if="mtpData" :mtp-data="mtpData" />

      <!-- Fallback: generic display if no MTP file found -->
      <v-card v-else>
        <v-card-text class="pt-1">
          <GenericDataVisu :submodel-element-data="submodelElementData.submodelElements" />
        </v-card-text>
      </v-card>
    </template>
  </v-container>
</template>

<script lang="ts" setup>
  import { useReferableUtils } from '@/composables/AAS/ReferableUtils'
  import { useSMHandling } from '@/composables/AAS/SMHandling'
  import { useSMEFile } from '@/composables/AAS/SubmodelElements/File'
  import { useRequestHandling } from '@/composables/RequestHandling'
  import { useAASStore } from '@/store/AASDataStore'
  import MTPStructureView from './MTPStructureView.vue'

  defineOptions({
    name: 'MTPSubmodel',
    semanticId: 'https://admin-shell.io/vdi/2658/1/0/MTPSubmodel',
  })

  // Same-origin API prefix for the P2O MTP service (proxied by nginx:
  // /aas/api/mtp/ -> 127.0.0.1:8095/). See etc/webgui/aas-gui.conf.
  const MTP_API = '/aas/api/mtp'

  // Stores
  const aasStore = useAASStore()

  // Composables
  const { setData } = useSMHandling()
  const { getSubmodelElementByIdShort } = useReferableUtils()
  const { downloadFile, getFilename, valueUrl } = useSMEFile()
  const { getRequest, postRequest } = useRequestHandling()

  const props = defineProps({
    submodelElementData: {
      type: Object as any,
      default: () => ({}),
    },
  })

  // Data
  const isLoading = ref(true)
  const downloading = ref(false)
  const parsing = ref(false)
  const submodelData = ref<any>({})
  const mtpData = ref<any>(null)
  const parseError = ref('')

  // Computed
  const selectedNode = computed(() => aasStore.getSelectedNode)
  const selectedAas = computed(() => aasStore.getSelectedAAS)
  const mtpFile = computed(() => {
    const el = getSubmodelElementByIdShort('MTPFile', submodelData.value)
    return el?.modelType ? el : null
  })
  const mtpFilename = computed(() => {
    if (mtpFile.value) return getFilename(mtpFile.value) || ''
    return ''
  })
  // Prefer the AAS globalAssetId as the store key; fall back to the AAS id.
  const aasAssetId = computed(() => {
    const aas: any = selectedAas.value
    return aas?.globalAssetId?.value
      || (typeof aas?.globalAssetId === 'string' ? aas.globalAssetId : '')
      || aas?.id
      || aas?.idShort
      || ''
  })

  onMounted(() => {
    initializeVisualization()
  })

  async function initializeVisualization (): Promise<void> {
    isLoading.value = true

    if (!props.submodelElementData || Object.keys(props.submodelElementData).length === 0) {
      isLoading.value = false
      return
    }

    const copiedData = { ...props.submodelElementData }
    submodelData.value = await setData(
      copiedData,
      selectedNode.value.path,
      false,
      selectedNode.value.timestamp,
    )
    isLoading.value = false

    // Auto-parse once the MTPFile is known, so the tree shows immediately.
    if (mtpFile.value) {
      await parseMTP()
    }
  }

  async function downloadMTPFile (): Promise<void> {
    if (!mtpFile.value) return
    downloading.value = true
    try {
      await downloadFile(mtpFile.value)
    } finally {
      downloading.value = false
    }
  }

  /**
   * Fetches the MTPFile attachment, uploads it to the MTP service, and loads
   * back the parsed structure (services / data assemblies / OPC UA nodes).
   */
  async function parseMTP (): Promise<void> {
    if (!mtpFile.value) return
    parsing.value = true
    parseError.value = ''

    try {
      const fileUrl = valueUrl(mtpFile.value)
      if (!fileUrl.url) {
        parseError.value = 'MTP file has no attachment URL.'
        return
      }
      // valueUrl flags every http(s) URL as "external", but the MTPFile is
      // stored as an *absolute same-origin* docs-server URL (e.g.
      // https://…/aas/docs/Module_M10/HuberTemperingBox.mtp). That is
      // retrievable directly, so only reject genuinely cross-origin URLs that
      // would require extra trust/credentials.
      let isCrossOrigin = false
      try {
        isCrossOrigin = new URL(fileUrl.url, window.location.origin).origin !== window.location.origin
      } catch {
        isCrossOrigin = true
      }
      if (isCrossOrigin) {
        parseError.value = 'MTP file is not a retrievable AAS attachment.'
        return
      }

      // 1) Read the raw attachment bytes from the AAS repository.
      const fetchRes = await getRequest(fileUrl.url, 'retrieving MTP attachment', false)
      if (!fetchRes.success || !(fetchRes.data instanceof Blob)) {
        parseError.value = 'Could not read the MTP attachment.'
        return
      }

      // 2) Upload to the MTP service (multipart form: file + optional assetId).
      const fd = new FormData()
      fd.append('file', new File([fetchRes.data], mtpFilename.value || 'module.mtp', { type: 'application/mtp' }))
      if (aasAssetId.value) fd.append('assetId', String(aasAssetId.value))

      const post = await postRequest(`${MTP_API}/mtp`, fd, new Headers(), 'parsing MTP', false)
      if (!post.success) {
        parseError.value = 'MTP parse failed on the server (see notification).'
        return
      }

      // 3) Load back the full parsed structure by asset id.
      const assetId = post.data?.assetId
      if (!assetId) {
        parseError.value = 'MTP stored but no asset id was returned.'
        return
      }
      const full = await getRequest(
        `${MTP_API}/mtp/${encodeURIComponent(assetId)}`,
        'reading parsed MTP',
        false,
      )
      if (full.success) {
        mtpData.value = full.data
      } else {
        parseError.value = 'MTP stored, but its structure could not be read back.'
      }
    } finally {
      parsing.value = false
    }
  }
</script>
