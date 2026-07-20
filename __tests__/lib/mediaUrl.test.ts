import { getMediaProxyUrl } from '@/lib/mediaUrl';

describe('getMediaProxyUrl', () => {
  test('builds a same-origin proxy path for a CID', () => {
    expect(getMediaProxyUrl('QmAbc123')).toBe('/api/media/QmAbc123');
  });

  test('URL-encodes special characters in the CID', () => {
    expect(getMediaProxyUrl('Qm Abc/123')).toBe('/api/media/Qm%20Abc%2F123');
  });
});
