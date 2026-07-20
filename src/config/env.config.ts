export interface AppConfig {
  port: number;
  env: 'development' | 'production' | 'test';
  aiProvider: 'openrouter' | 'gemini' | 'openai' | 'mock';
  searchProvider: 'duckduckgo' | 'tavily' | 'mock';
  logLevel: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  skipAlexaVerification: boolean;
  openRouterApiKey?: string;
  tavilyApiKey?: string;
}

export function loadAppConfig(): AppConfig {
  const env = (process.env.NODE_ENV || 'development').toLowerCase() as AppConfig['env'];
  const port = parseInt(process.env.PORT || '3000', 10);
  const aiProvider = (
    process.env.AI_PROVIDER || 'openrouter'
  ).toLowerCase() as AppConfig['aiProvider'];
  const searchProvider = (
    process.env.SEARCH_PROVIDER || 'duckduckgo'
  ).toLowerCase() as AppConfig['searchProvider'];
  const logLevel = (process.env.LOG_LEVEL || 'INFO').toUpperCase() as AppConfig['logLevel'];
  const skipAlexaVerification = process.env.SKIP_ALEXA_VERIFICATION === 'true';

  return {
    port,
    env,
    aiProvider,
    searchProvider,
    logLevel,
    skipAlexaVerification,
    openRouterApiKey: process.env.OPENROUTER_API_KEY,
    tavilyApiKey: process.env.TAVILY_API_KEY,
  };
}

export const appConfig = loadAppConfig();
