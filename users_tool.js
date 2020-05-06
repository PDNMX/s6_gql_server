/*
* Script for creating users
* */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const {url, client_options} = require('./db_conf');
const MongoClient = require('mongodb').MongoClient;

const username = process.argv[2];
const password = process.argv[3]

const register = async (username, password) => {
    const hashedPassword = await bcrypt.hash(password, 10);
    const client = await MongoClient.connect(url, client_options);
    const db = client.db();
    const collection = db.collection('edca_users');

    const user = await collection.insertOne({
        username: username,
        password: hashedPassword
    });

    client.close();

    return user;
}

if (typeof username === "undefined"){
    console.log('Proporcione un nombre usuario')
    process.exit(1);
}

if (typeof password === "undefined"){
    console.log('Proporcione una contraseña');
    process.exit(1)
}

register(username, password).then(d =>{
    console.log(d.ops);
});

