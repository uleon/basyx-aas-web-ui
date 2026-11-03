<template>
  <template v-if="mtpData">
    <!-- Metadata -->
    <v-card class="mb-4">
      <v-card-title class="bg-elevatedCard">
        <div class="d-flex align-center">
          <v-icon class="mr-2">mdi-cog-outline</v-icon>
          <span class="text-body-large">Module Metadata</span>
        </div>
      </v-card-title>

      <v-card-text>
        <div class="d-flex flex-wrap ga-2">
          <v-chip v-if="mtpData.assetId" color="primary" label>
            assetId: {{ mtpData.assetId }}
          </v-chip>

          <v-chip v-if="mtpData.tagName" label>
            tag: {{ mtpData.tagName }}
          </v-chip>

          <v-chip v-if="mtpData.productCode" label>
            product: {{ mtpData.productCode }}
          </v-chip>

          <v-chip v-if="mtpData.moduleName" label>
            module: {{ mtpData.moduleName }}
          </v-chip>

          <v-chip v-if="mtpData.manufacturer" label>
            mfr: {{ mtpData.manufacturer }}
          </v-chip>
        </div>

        <div class="d-flex flex-wrap ga-2 mt-3">
          <v-chip
            v-for="ns in mtpData.namespaces"
            :key="ns"
            color="info"
            label
            size="small"
          >
            {{ ns }}
          </v-chip>

          <v-chip color="success" label size="small">
            {{ mtpData.nodeCount }} OPC UA nodes
          </v-chip>
        </div>
      </v-card-text>
    </v-card>

    <!-- Services -->
    <v-card class="mb-4">
      <v-card-title class="bg-elevatedCard">
        <div class="d-flex align-center">
          <v-icon class="mr-2">mdi-lightning-bolt</v-icon>

          <span class="text-body-large">
            Services
            <span class="text-body-2 ml-1" style="opacity: 0.6">
              ({{ mtpData.services.length }})
            </span>
          </span>
        </div>
      </v-card-title>

      <v-card-text>
        <v-chip
          v-for="s in mtpData.services"
          :key="s"
          class="mr-2"
          color="primary"
          :model-value="true"
          prepend-icon="mdi-lightning-bolt"
          variant="flat"
        >
          {{ s }}
        </v-chip>

        <span v-if="mtpData.services.length === 0" class="text-medium-emphasis">
          No services declared.
        </span>
      </v-card-text>
    </v-card>

    <!-- Data Assemblies -->
    <v-card class="mb-4">
      <v-card-title class="bg-elevatedCard">
        <div class="d-flex align-center">
          <v-icon class="mr-2">mdi-database</v-icon>

          <span class="text-body-large">
            Data Assemblies
            <span class="text-body-2 ml-1" style="opacity: 0.6">
              ({{ mtpData.dataAssemblies.length }})
            </span>
          </span>
        </div>
      </v-card-title>

      <v-card-text>
        <v-chip
          v-for="da in mtpData.dataAssemblies"
          :key="da"
          class="mr-2"
          color="secondary"
          :model-value="true"
          variant="flat"
        >
          {{ da }}
        </v-chip>

        <span v-if="mtpData.dataAssemblies.length === 0" class="text-medium-emphasis">
          No data assemblies declared.
        </span>
      </v-card-text>
    </v-card>

    <!-- OPC UA Nodes, grouped by owning element -->
    <v-card class="mb-4">
      <v-card-title class="bg-elevatedCard">
        <div class="d-flex align-center">
          <v-icon class="mr-2">mdi-sitemap</v-icon>

          <span class="text-body-large">
            OPC UA Nodes
            <span class="text-body-2 ml-1" style="opacity: 0.6">
              ({{ mtpData.nodeCount }} in {{ nodeGroups.length }} groups)
            </span>
          </span>
        </div>
      </v-card-title>

      <v-card-text class="pt-0">
        <v-expansion-panels v-model="openPanels" class="pa-0" density="compact">
          <v-expansion-panel
            v-for="group in nodeGroups"
            :key="group.name"
            :value="group.name"
          >
            <v-expansion-panel-title>
              <div class="d-flex align-center">
                <span>{{ group.name }}</span>
                <v-spacer />

                <v-chip color="surface" size="x-small" variant="outlined">
                  {{ group.nodes.length }}
                </v-chip>
              </div>
            </v-expansion-panel-title>

            <v-expansion-panel-text>
              <div
                v-for="node in group.nodes"
                :key="node"
                class="d-flex align-center mb-1"
              >
                <v-icon class="mr-2" color="info" size="small">mdi-circle-slice-8</v-icon>
                <code class="text-body-2">{{ node }}</code>
              </div>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>

        <span v-if="nodeGroups.length === 0" class="text-medium-emphasis">
          No OPC UA nodes found.
        </span>
      </v-card-text>
    </v-card>

    <!-- Alias map (data-assembly attribute -> node id) -->
    <v-card v-if="aliasEntries.length > 0" class="mb-4">
      <v-card-title class="bg-elevatedCard">
        <div class="d-flex align-center">
          <v-icon class="mr-2">mdi-link-variant</v-icon>

          <span class="text-body-large">
            Alias Map
            <span class="text-body-2 ml-1" style="opacity: 0.6">
              ({{ aliasEntries.length }})
            </span>
          </span>
        </div>
      </v-card-title>

      <v-card-text class="pt-0">
        <v-expansion-panels>
          <v-expansion-panel>
            <v-expansion-panel-title>Aliases → OPC UA node ids</v-expansion-panel-title>

            <v-expansion-panel-text>
              <v-simple-table density="compact">
                <template #default>
                  <thead>
                    <tr>
                      <th class="text-left">Alias</th>
                      <th class="text-left">OPC UA Node</th>
                    </tr>
                  </thead>

                  <tbody>
                    <tr v-for="entry in aliasEntries" :key="entry.alias">
                      <td class="text-body-2">{{ entry.alias }}</td>
                      <td class="text-body-2"><code>{{ entry.node }}</code></td>
                    </tr>
                  </tbody>
                </template>
              </v-simple-table>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
      </v-card-text>
    </v-card>
  </template>
</template>

<script lang="ts" setup>
  // Shared, presentational view of a parsed MTP structure. Reused by the
  // MTPSubmodel (module-type package) and PEASubmodel (instance PEA) plugins
  // so the parsed structure is rendered identically in both. This component
  // has no `semanticId`, so the plugin loader ignores it; it is only rendered
  // as a child of the two plugins above.
  const props = defineProps({
    mtpData: {
      type: Object as any,
      default: () => null,
    },
  })

  // Local expansion state — purely visual, no need to lift to the parent.
  const openPanels = ref<any[]>([])

  const nodeGroups = computed(() => {
    const raw: Record<string, string[]> = props.mtpData?.opcuaNodes ?? {}
    if (Object.keys(raw).length === 0) return []
    return Object.entries(raw)
      .map(([name, nodes]) => ({ name, nodes, count: nodes.length }))
      .toSorted((a, b) => b.count - a.count || a.name.localeCompare(b.name))
  })
  const aliasEntries = computed(() => {
    if (!props.mtpData?.aliasMap) return []
    return Object.entries(props.mtpData.aliasMap)
      .map(([alias, node]) => ({ alias, node }))
  })
</script>
