import { base64Decode, base64Encode } from '@/utils/EncodeDecodeUtils'

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

/**
 * Extracts the raw global asset ID from a QR-scanned value that may be either a
 * raw global asset ID (e.g. `urn:p2o:module:bb01`) or a deep-link URL built by
 * {@link buildAasDeepLinkUrl} (e.g. `https://host/aasviewer?globalAssetId=...`).
 *
 * Deep-link URLs store the ID base64url-encoded in the `globalAssetId` query
 * parameter. When such a URL is detected, that parameter is decoded back to the
 * raw ID so the AAS discovery service can resolve it. Any other value (including
 * non deep-link URLs and raw IDs) is returned trimmed and unchanged.
 *
 * @param text - The scanned text, either a raw global asset ID or a deep-link URL.
 * @returns The raw global asset ID, or the trimmed input if it is not a deep-link URL.
 */
export function extractGlobalAssetIdFromScannedContent (text: string): string {
  const trimmed = (text ?? '').trim()
  if (trimmed === '') {
    return ''
  }

  // Not an http(s) URL -> assume it is already a raw global asset ID.
  if (!/^https?:\/\//i.test(trimmed)) {
    return trimmed
  }

  try {
    const url = new URL(trimmed)
    // searchParams.get is case-sensitive, so check both casings explicitly.
    const paramValue
      = url.searchParams.get('globalAssetId')
        ?? url.searchParams.get('globalassetid')
    if (paramValue === null) {
      return trimmed
    }
    const decoded = base64Decode(paramValue).trim()
    return decoded === '' ? trimmed : decoded
  } catch {
    return trimmed
  }
}
