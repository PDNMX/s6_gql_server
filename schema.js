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
        buyers: async () => {
            const client = await MongoClient.connect(url, client_options);
            const db = client.db();
            const collection = db.collection('edca_buyers');
            const buyers = await collection.find({}).toArray();
            client.close();
            return buyers;
        },
        topBuyers: async (parent, args, context, info) => {
            let limit = args.n;

            if (typeof limit === 'undefined' || limit < 1 || limit > 100){
                limit = 10;
            }

            const client = await MongoClient.connect(url, client_options);
            const db = client.db();
            const collection = db.collection('edca_buyers_amounts');
            let top = await collection.find({}, {limit: limit}).sort({total: -1}).toArray();

            client.close();
            top = top.map( b => ({
                id: b._id.id,
                name: b._id.name,
                total: b.total
            }));
            return top;
        },
        topSuppliers: async (parent, args, context, info) => {
            let limit = args.n;

            if (typeof limit === 'undefined' || limit < 1 || limit > 100){
                limit = 10;
            }

            const client = await MongoClient.connect(url, client_options);
            const db = client.db();
            const collection = db.collection('edca_awards_suppliers');
            let top = await collection.find({}, {limit: limit}).sort({"data.total": -1}).toArray();

            client.close();
            top = top.map( b => ({
                id: b.data._id[0].id,
                name: b.data._id[0].name,
                total: b.data.total
            }));
            return top;
        },
        cycles: async () => {
            const client = await MongoClient.connect(url, client_options);
            const db = client.db();
            const collection = db.collection('edca_releases');
            const cycles = await collection.distinct('cycle');
            client.close();
            return cycles.sort().reverse();
        },
        search: async (parent, args, context, info) => {

            const {
                contract_title,
                ocid,
                buyer_id,
                procurementMethod,
                supplierName,
                tender_title,
                cycle,
            } = args;

            let {
                page,
                pageSize
            } = args;


            if (typeof page === 'undefined' || page < 1){
                page = 0;
            }

            if (typeof pageSize === 'undefined' || pageSize < 1 || pageSize > 200){
                pageSize = 10;
            }

            let query = {};

            if (typeof ocid !== 'undefined'){
                query["ocid"] = ocid
            }

            if (typeof buyer_id !== 'undefined'){
                query["buyer.id"] = buyer_id ;
            }

            if (typeof procurementMethod !== 'undefined'){
                query["tender.procurementMethod"] = procurementMethod;
            }

            if (typeof cycle !== 'undefined'){
                query["cycle"] = cycle
            }

            if (typeof contract_title !== 'undefined'){
                query["contracts.title"] = {$regex: contract_title, $options: 'i'};
            }

            if (typeof tender_title !== 'undefined'){
                query["tender.title"] = {$regex: tender_title, $options: 'i'};
            }

            if (typeof supplierName !== 'undefined'){
                query["$and"] = [
                    {
                        "parties.name":{
                            $regex: supplierName, $options: 'i'
                        }
                    },
                    {"parties.roles": 'buyer'}
                ]
            }

            const skip = page * pageSize;

            const client = await MongoClient.connect(url, client_options);
            const db = client.db();
            const collection = db.collection('edca_releases');

            const count = await collection.countDocuments(query);
            const releases = await collection.find(query).skip(skip).limit(pageSize).toArray();
            client.close();
            return {
                page: page,
                pageSize: pageSize,
                totalRows: count,
                results: releases
            };
        }
    }
};

module.exports = {
    typeDefs,
    resolvers
}