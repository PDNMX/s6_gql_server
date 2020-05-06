require('dotenv').config();
const {ApolloServer} = require('apollo-server');
const {typeDefs, resolvers, getUser} = require('./schema');

// The ApolloServer constructor requires two parameters: your schema
// definition and your set of resolvers.

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({req}) => {
    const tokenWithBearer = req.headers.authorization || '';
    const token = tokenWithBearer.split(' ')[1];
    const user = getUser(token);
    return {user};
  }
});

// The `listen` method launches a web server.
const port = process.env.PORT || 3006;
server.listen({port}).then(({ url }) => {
  console.log(`🚀  Server ready at ${url}`);
});
