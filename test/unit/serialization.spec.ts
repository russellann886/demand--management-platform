import {
  deserializeAttachment,
  deserializeJson,
  deserializeNullableAttachment,
  deserializeStringArray,
  fromDbBoolean,
  serializeJson,
  serializeNullableAttachment,
  serializeStringArray,
  toDbBoolean,
} from '../../worker/db/serialization';

describe('D1 scalar and JSON conversion', () => {
  it('round-trips booleans and string arrays through SQLite values', () => {
    expect(toDbBoolean(true)).toBe(1);
    expect(toDbBoolean(false)).toBe(0);
    expect(fromDbBoolean(1)).toBe(true);
    expect(fromDbBoolean(0)).toBe(false);

    const stored = serializeStringArray(['运营', '产品']);
    expect(stored).toBe('["运营","产品"]');
    expect(deserializeStringArray(stored, 'departments')).toEqual([
      '运营',
      '产品',
    ]);
  });

  it('stores and hydrates nested KV attachments in arbitrary JSON', () => {
    const filePath =
      'users/user/images/33333333-3333-4333-8333-333333333333/image.png';
    const stored = serializeJson({
      gallery: [{ bucketId: 'legacy', filePath }],
      enabled: true,
    });

    expect(stored).toBe(
      `{"gallery":[{"fileKey":"${filePath}"}],"enabled":true}`,
    );
    expect(
      deserializeJson(
        stored,
        (value): value is {
          gallery: Array<{ bucketId: string; filePath: string }>;
          enabled: boolean;
        } =>
          !Array.isArray(value) &&
          value !== null &&
          typeof value === 'object' &&
          Array.isArray(value.gallery) &&
          typeof value.enabled === 'boolean',
        'custom_fields',
      ),
    ).toEqual({
      gallery: [{ bucketId: 'kv', filePath }],
      enabled: true,
    });
  });

  it('handles nullable attachments and rejects malformed D1 JSON', () => {
    expect(serializeNullableAttachment(null)).toBeNull();
    expect(deserializeNullableAttachment(null)).toBeNull();
    expect(() => deserializeStringArray('{"not":"an array"}')).toThrow(
      'unexpected shape',
    );
    expect(() => deserializeAttachment('{"fileKey":""}')).toThrow(
      'unexpected shape',
    );
    expect(() =>
      deserializeJson('{invalid', (_value): _value is string => true),
    ).toThrow('invalid JSON');
  });
});
