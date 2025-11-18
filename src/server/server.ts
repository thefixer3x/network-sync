/**
 * HTTP Server Entry Point
 *
 * Starts the Express HTTP server with all infrastructure initialized
 */

import { Logger } from '../utils/Logger.js';
import { createApp } from './app.js';
import { initializeServer, shutdownServer, setupGracefulShutdown } from './init.js';

const logger = new Logger('Server');

const PORT = process.env['PORT'] ? parseInt(process.env['PORT'], 10) : 3001;
const HOST = process.env['HOST'] || '0.0.0.0';

/**
 * Start the HTTP server
 */
async function startServer() {
  try {
    logger.info('Starting Social Media Orchestrator server...');

    // Initialize infrastructure (database, cache, queues)
    await initializeServer();

    // Create Express app
    const app = createApp();

    // Start HTTP server
    const server = app.listen(PORT, HOST, () => {
      logger.info(`Server listening on ${HOST}:${PORT}`);
      logger.info(`Health check: http://${HOST}:${PORT}/health`);
      logger.info(`Liveness probe: http://${HOST}:${PORT}/health/live`);
      logger.info(`Readiness probe: http://${HOST}:${PORT}/health/ready`);
    });

    // Setup graceful shutdown
    setupGracefulShutdown();

    // Shutdown server on process exit
    const gracefulShutdown = async () => {
      logger.info('Closing HTTP server...');

      server.close(async () => {
        logger.info('HTTP server closed');

        try {
          await shutdownServer();
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown', error);
          process.exit(1);
        }
      });

      // Force close after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

    // Handle unhandled errors
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection', { reason, promise });
    });

    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception', { error });
      gracefulShutdown();
    });

  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

// Start server if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}

export { startServer };
