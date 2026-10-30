import { describe, expect, it } from 'vitest'
import { base64Encode } from '@/utils/EncodeDecodeUtils'
import { buildAasDeepLinkUrl } from '@/utils/QrDeepLinkUtils'

describe('QrDeepLinkUtils.ts; Tests for \'buildAasDeepLinkUrl()\'', () => {
  it('returns an empty string for a blank asset ID', () => {
    expect(buildAasDeepLinkUrl('')).toStrictEqual('')
    expect(buildAasDeepLinkUrl(' '.repeat(3))).toStrictEqual('')
    expect(buildAasDeepLinkUrl('')).toStrictEqual('')
  })

  it('builds a deep link with explicit origin and root base path', () => {
    const url = buildAasDeepLinkUrl('urn:p2o:module:bb01', 'https://example.com', '/')
    expect(url).toStrictEqual(`https://example.com/aasviewer?globalAssetId=${base64Encode('urn:p2o:module:bb01')}`)
  })

  it('strips trailing slashes from the origin', () => {
    const url = buildAasDeepLinkUrl('urn:p2o:module:bb01', 'https://example.com///', '/')
    expect(url).toStrictEqual(`https://example.com/aasviewer?globalAssetId=${base64Encode('urn:p2o:module:bb01')}`)
  })

  it('respects a non-root base path', () => {
    const url = buildAasDeepLinkUrl('urn:p2o:module:bb01', 'https://example.com', '/ui/')
    expect(url).toStrictEqual(`https://example.com/ui/aasviewer?globalAssetId=${base64Encode('urn:p2o:module:bb01')}`)
  })

  it('adds a trailing slash to a base path that lacks one', () => {
    const url = buildAasDeepLinkUrl('urn:p2o:module:bb01', 'https://example.com', '/ui')
    expect(url).toStrictEqual(`https://example.com/ui/aasviewer?globalAssetId=${base64Encode('urn:p2o:module:bb01')}`)
  })

  it('adds a leading slash to a base path that lacks one', () => {
    const url = buildAasDeepLinkUrl('urn:p2o:module:bb01', 'https://example.com', 'ui/')
    expect(url).toStrictEqual(`https://example.com/ui/aasviewer?globalAssetId=${base64Encode('urn:p2o:module:bb01')}`)
  })

  it('falls back to the current origin when no origin is provided', () => {
    const originalDescriptor = Object.getOwnPropertyDescriptor(window, 'location')
    // jsdom blocks cross-origin history.replaceState, so stub `location.origin` directly.
    Object.defineProperty(window, 'location', {
      value: { ...window.location, origin: 'https://scanner.local:8080' },
      configurable: true,
    })
    try {
      const url = buildAasDeepLinkUrl('urn:p2o:module:bb01')
      expect(url).toStrictEqual(`https://scanner.local:8080/aasviewer?globalAssetId=${base64Encode('urn:p2o:module:bb01')}`)
    } finally {
      if (originalDescriptor) {
        Object.defineProperty(window, 'location', originalDescriptor)
      }
    }
  })

  it('encodes the asset ID so round-trip decoding returns the original', () => {
    const url = buildAasDeepLinkUrl('urn:p2o:module:bb01', 'https://example.com', '/')
    const query = new URL(url).searchParams.get('globalAssetId')
    expect(query).not.toStrictEqual(null)
    expect(Buffer.from(query ?? '', 'base64url').toString('utf8')).toStrictEqual('urn:p2o:module:bb01')
  })
})
