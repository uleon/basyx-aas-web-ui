<template>
  <span class="d-inline-flex align-center document-preview-icon">
    <img
      v-if="showImage"
      alt=""
      class="document-preview-thumb"
      :src="imageUrl"
    >

    <v-icon v-else :icon="fallbackIcon" size="small" />
  </span>
</template>

<script lang="ts" setup>
  import type { SubmodelElementLike } from '../types'
  import { useSMEFile } from '@/composables/AAS/SubmodelElements/File'

  defineOptions({
    name: 'DocumentPreviewIcon',
  })

  const { valueBlob } = useSMEFile()

  const props = defineProps<{
    file?: SubmodelElementLike | null
  }>()

  const imageUrl = ref('')

  const contentType = computed(() => String(props.file?.contentType ?? '').toLowerCase())

  // Only render the actual file as an icon when it is an image; otherwise
  // fall back to a generic (or PDF) icon since non-image content cannot be
  // shown as a thumbnail.
  const showImage = computed(() => contentType.value.includes('image') && imageUrl.value !== '')

  const fallbackIcon = computed(() =>
    contentType.value.includes('pdf') ? 'mdi-file-pdf' : 'mdi-file-outline',
  )

  onMounted(async () => {
    if (props.file?.value && contentType.value.includes('image')) {
      imageUrl.value = await valueBlob(props.file)
    }
  })
</script>

<style scoped>
  .document-preview-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
  }

  .document-preview-thumb {
    max-width: 32px;
    max-height: 32px;
    object-fit: contain;
    border-radius: 4px;
  }
</style>
