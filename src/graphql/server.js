import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import cors from "cors";
import typeDefs from "./schema.js";
import resolvers from "./resolvers.js";
import { AuthorizationError } from "../utils/errors/customErrors.js";

// Create Apollo Server
const createApolloServer = async (app) => {
  // Create the Apollo Server instance
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    formatError: (formattedError, error) => {
      // Customize error messages
      if (error.originalError instanceof AuthorizationError) {
        return {
          message: error.message,
          status: 'FORBIDDEN',
        };
      }
      
      return {
        message: formattedError.message,
        status: 'ERROR',
      };
    },
  });

  // Start the server
  await server.start();

  // Apply middleware to Express app
  app.use(
    '/api/graphql',
    cors(),
    expressMiddleware(server, {
      context: async ({ req }) => {
        // Get the user from the request (already processed by verifyToken middleware)
        return { user: req.user };
      },
    })
  );

  return server;
};

export default createApolloServer;