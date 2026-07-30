import { describe, expect, it } from 'vitest';
import { resolveMetadataFetchUrl, validatePublicUrl } from './metadata.js';

describe('validatePublicUrl', () => {
  it('rejects unsupported protocols before any lookup', async () => { await expect(validatePublicUrl('file:///etc/passwd')).rejects.toThrow('HTTP hoặc HTTPS'); });
  it('rejects credentials before any lookup', async () => { await expect(validatePublicUrl('https://a:b@example.com')).rejects.toThrow('thông tin đăng nhập'); });
  it('allows localhost for locally hosted tools', async () => { await expect(validatePublicUrl('http://localhost:3000/dashboard')).resolves.toMatchObject({ hostname: 'localhost' }); });
  it('allows an IPv4 loopback address', async () => { await expect(validatePublicUrl('http://127.0.0.1:5173')).resolves.toMatchObject({ hostname: '127.0.0.1' }); });
  it('routes loopback metadata fetches through the configured Docker host gateway', () => {
    const previous = process.env.LOCALHOST_METADATA_GATEWAY;
    process.env.LOCALHOST_METADATA_GATEWAY = 'host.docker.internal';
    expect(resolveMetadataFetchUrl(new URL('http://localhost:19080/path?q=1')).href).toBe('http://host.docker.internal:19080/path?q=1');
    expect(resolveMetadataFetchUrl(new URL('https://example.com/path')).href).toBe('https://example.com/path');
    process.env.LOCALHOST_METADATA_GATEWAY = previous;
  });
});
