import dotenv from 'dotenv';
import app from './app';
import { loadOwnerProfile } from './profile/owner-profile.loader';
import { Logger } from './utils/logger';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const aiProvider = (process.env.AI_PROVIDER || 'openrouter').toLowerCase();
const searchProvider = (process.env.SEARCH_PROVIDER || 'duckduckgo').toLowerCase();
const mockEnabled = aiProvider === 'mock' || searchProvider === 'mock';

async function bootstrap() {
  // Startup Logging
  Logger.info('Server', `AI Provider: ${aiProvider}`);
  Logger.info('Server', `Search Provider: ${searchProvider}`);
  Logger.info('Server', `Environment: ${NODE_ENV}`);
  Logger.info('Server', `Mock Enabled: ${mockEnabled}`);

  if (NODE_ENV === 'production' && mockEnabled) {
    throw new Error(
      'Production configuration error: Mock providers (MockAIProvider / MockSearchProvider) are forbidden in production.',
    );
  }

  // Load Brain 0 (Owner Profile) first
  await loadOwnerProfile();

  const server = app.listen(PORT, () => {
    Logger.info('Server', `Server is running in ${NODE_ENV} mode on port ${PORT}`);
  });

  // Graceful shutdown handling
  const gracefulShutdown = (signal: string) => {
    Logger.info('Server', `Received ${signal}. Shutting down gracefully...`);
    server.close(() => {
      Logger.info('Server', 'HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

bootstrap().catch((err) => {
  Logger.error('Server', 'Fatal bootstrapping error', err);
  process.exit(1);
});
