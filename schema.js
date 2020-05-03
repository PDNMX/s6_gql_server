//const {gql} = require('apollo-server');
const {url, client_options} = require('./db_conf');
const MongoClient = require('mongodb').MongoClient;
const {importSchema} = require('graphql-import');

// A schema is a collection of type definitions (hence "typeDefs")
// that together define the "shape" of queries that are executed against
// your data.
const typeDefs = importSchema('schema.graphql');

// Resolvers define the technique for fetching the types defined in the
const resolvers = {
    Query: {
        summary: async () => {
            const client = await MongoClient.connect(url, client_options);
            const db = client.db();

            const releases = db.collection('edca_releases');
            const totalAmount = db.collection('edca_contracts_total');
            const contracts_amounts = db.collection("edca_contracts_amounts");

            let queries  = [
                releases.countDocuments(),
                releases.distinct("buyer.name"),
                releases.countDocuments({"tender.procurementMethod": { $regex: "open", $options: "i"}}),
                releases.countDocuments({"tender.procurementMethod": { $regex: "selective", $options: "i"}}),
                releases.countDocuments({"tender.procurementMethod": { $regex: "direct", $options: "i"}}),
                totalAmount.findOne(),
                contracts_amounts.findOne({'_id': 'open'}),
                contracts_amounts.findOne({'_id': 'selective'}),
                contracts_amounts.findOne({'_id': 'direct'}),
                contracts_amounts.findOne({'_id': null}),
            ];

            const results = await Promise.all(queries);
            //console.log(results)
            client.close();

            return {
                procedimientos: results[0],
                instituciones: results[1].length,
                counts: {
                    open: results[2],
                    selective: results[3],
                    direct: results[4],
                    other: (results[0] - (results[2] + results[3] + results[4])),
                },
                amounts: {
                    total: results[5].total,
                    open: results[6].total,
                    selective: results[7].total,
                    direct: results[8].total,
                    other: results[9].total
                }
            };
        },
        parties: async () => {
            let client;
            try {
                client = await MongoClient.connect(url, client_options);
                const db = client.db();
                const parties_ = db.collection('edca_parties');
                const parties = parties_.find({}).limit(10).toArray();
                client.close();
                return parties;
            } catch (e) {
                console.log(e)
            }
        }
    }
};

module.exports = {
    typeDefs,
    resolvers
}