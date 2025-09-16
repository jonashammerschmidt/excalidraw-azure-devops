const g = globalThis as any;
g.global ??= g;
g.process ??= { env: { NODE_ENV: 'production' } };
