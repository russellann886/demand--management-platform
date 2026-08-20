/// <reference types="@cloudflare/workers-types" />

import type { AuthUser } from '../../worker/auth/types';
import type { DemandCategoryRow, WorkerBindings } from '../../worker/db/types';
import {
  getMergeSuggestions,
  parseMergeSuggestions,
} from '../../worker/services/ai-merge';

const USER: AuthUser = {
  id: 'admin-id',
  email: 'admin@example.com',
  displayName: 'Admin',
  avatarUrl: null,
  active: true,
  roles: ['admin_replenish'],
};

describe('AI merge suggestion validation', () => {
  it('filters unknown, repeated and undersized demand groups', () => {
    const result = parseMergeSuggestions(
      JSON.stringify({
        suggestions: [
          {
            title: '第一组',
            reason: '目标一致',
            demandIds: ['a', 'a', 'unknown', 'b'],
          },
          {
            title: '第二组',
            reason: '部分重复',
            demandIds: ['b', 'c', 'd'],
          },
          {
            title: '无效组',
            reason: '清洗后不足两项',
            demandIds: ['d', 'unknown'],
          },
        ],
      }),
      new Set(['a', 'b', 'c', 'd']),
    );

    expect(result).toEqual([
      {
        title: '第一组',
        reason: '目标一致',
        demandIds: ['a', 'b'],
      },
      {
        title: '第二组',
        reason: '部分重复',
        demandIds: ['c', 'd'],
      },
    ]);
  });

  it('rejects a non-JSON model response', () => {
    expect(() => parseMergeSuggestions('not json', new Set(['a', 'b']))).toThrow(
      'AI 返回内容无法解析为 JSON',
    );
  });
});

describe('OpenRouter AI merge service', () => {
  it('uses the configured model and returns validated mock suggestions', async () => {
    const fetcher = jest.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const request = JSON.parse(String(init?.body)) as { model: string };
      expect(request.model).toBe('test/model');
      expect(init?.headers).toMatchObject({
        authorization: 'Bearer test-key',
      });
      return Response.json({
        choices: [
          {
            message: {
              content: JSON.stringify({
                suggestions: [
                  {
                    title: '整合建议',
                    reason: '目标一致',
                    demandIds: ['demand-1', 'unknown', 'demand-2'],
                  },
                ],
              }),
            },
          },
        ],
      });
    });

    await expect(
      getMergeSuggestions(
        createBindings(),
        USER,
        { categoryId: 'category-1' },
        fetcher,
      ),
    ).resolves.toEqual({
      suggestions: [
        {
          title: '整合建议',
          reason: '目标一致',
          demandIds: ['demand-1', 'demand-2'],
        },
      ],
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});

function createBindings(): WorkerBindings {
  const category = {
    id: 'category-1',
    section: '追补板块',
  } as DemandCategoryRow;
  const candidates = [
    {
      id: 'demand-1',
      title: '需求一',
      background: '背景一',
      department: '运营',
    },
    {
      id: 'demand-2',
      title: '需求二',
      background: '背景二',
      department: '运营',
    },
  ];
  const db = {
    prepare: (sql: string) => {
      const statement = {
        bind: () => statement,
        first: async () => (sql.includes('FROM demand_category') ? category : null),
        all: async () => ({
          results: sql.includes('LEFT JOIN merged_demand_source')
            ? candidates
            : [],
          success: true,
          meta: {},
        }),
      };
      return statement;
    },
  };
  return {
    APP_ENV: 'test',
    OPENROUTER_API_KEY: 'test-key',
    OPENROUTER_MODEL: 'test/model',
    DB: db as unknown as D1Database,
    FILES: {} as R2Bucket,
  };
}
