import dotenv from 'dotenv';
import app from './app';
import { loadOwnerProfile } from './profile/owner-profile.loader';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

async function bootstrap() {
  // Load Brain 0 (Owner Profile) first
  await loadOwnerProfile();

  const server = app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Server is running in ${NODE_ENV} mode on port ${PORT}`);
  });

  // Graceful shutdown handling
  const gracefulShutdown = (signal: string) => {
    // eslint-disable-next-line no-console
    console.log(`Received ${signal}. Shutting down gracefully...`);
    server.close(() => {
      // eslint-disable-next-line no-console
      console.log('HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Fatal bootstrapping error:', err);
  process.exit(1);
});
