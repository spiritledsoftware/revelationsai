export type ModelInfo = {
  name: string;
  description: string;
  contextSize: `${number}k`;
  provider: 'bedrock' | 'openai' | 'anthropic';
  link: string;
  tier: 'free' | 'plus';
};

export const freeTierModels = {
  'gpt-4o-mini': {
    name: 'GPT-4o Mini',
    description: 'A large language model trained by OpenAI',
    contextSize: '128k',
    provider: 'openai',
    link: 'https://openai.com/index/gpt-4o-mini-advancing-cost-efficient-intelligence/',
    tier: 'free'
  } satisfies ModelInfo
} as const;
export type FreeTierModelId = keyof typeof freeTierModels;
export const freeTierModelIds = Object.keys(freeTierModels) as FreeTierModelId[];

export const plusTierModels = {
  'gpt-4o': {
    name: 'GPT-4o',
    description: 'A large language model trained by OpenAI',
    contextSize: '128k',
    provider: 'openai',
    link: 'https://openai.com/index/hello-gpt-4o/',
    tier: 'plus'
  } satisfies ModelInfo,
  'claude-3-5-sonnet-20240620': {
    name: 'Claude-3.5 Sonnet',
    description: 'A large language model trained by Anthropic',
    contextSize: '200k',
    provider: 'anthropic',
    link: 'https://www.anthropic.com/news/claude-3-5-sonnet',
    tier: 'plus'
  } satisfies ModelInfo
} as const;
export type PlusTierModelId = keyof typeof plusTierModels;
export const plusTierModelIds = Object.keys(plusTierModels) as PlusTierModelId[];

export const allModels = {
  ...freeTierModels,
  ...plusTierModels
} as const;
