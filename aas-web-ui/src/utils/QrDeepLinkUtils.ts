import { base64Encode } from '@/utils/EncodeDecodeUtils'

const AAS_VIEWER_ROUTE = 'aasviewer'

function normalizeBasePath (value: string | undefined): string {
  const trimmed = (value ?? '').trim()
  if (trimmed === '') {
    return '/'
  }
  const withLeadingSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  if (withLeadingSlash === '/') {
    return '/'
  }
  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`
}

/**
 * Builds a navigatable deep link to the AAS viewer for the given global asset ID.
 *
 * The raw asset ID (e.g. `urn:p2o:module:bb01`) is not a URL and therefore cannot
 * be opened directly. Instead the ID is base64-encoded and placed in the
 * `globalAssetId` query parameter of the AAS viewer route. The router guard
 * (`globalAssetIdRedirectHandled`) resolves that parameter via the AAS discovery
 * service and opens the matching shell in the viewer, so scanning the QR code
 * (or opening the printed URL) navigates straight to the asset.
 *
 * @param globalAssetId - The global asset ID to link to.
 * @param origin - Absolute origin (scheme + host + port); defaults to the current origin.
 * @param basePath - Application base path (e.g. `/` or `/ui/`); defaults to `/`.
 * @returns The absolute deep link URL, or an empty string if the ID is blank.
 */
export function buildAasDeepLinkUrl (
  globalAssetId: string,
  origin?: string,
  basePath?: string,
): string {
  const id = (globalAssetId ?? '').trim()
  if (id === '') {
    return ''
  }

  const encodedId = base64Encode(id)
  if (encodedId === '') {
    return ''
  }

  const currentOrigin = typeof window === 'undefined' ? '' : window.location.origin
  const resolvedOrigin = (origin ?? currentOrigin).replace(/\/+$/, '')
  const base = normalizeBasePath(basePath)
  const route = base === '/' ? `/${AAS_VIEWER_ROUTE}` : `${base}${AAS_VIEWER_ROUTE}`

  return `${resolvedOrigin}${route}?globalAssetId=${encodedId}`
}
