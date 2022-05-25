const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;

// middletare
app.use(cors());
app.use(express.json());

// mongodb database

const uri = `mongodb+srv://${process.env.APP_USER}:${process.env.APP_PASS}@cluster0.65gfy.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        await client.connect();
        const toolCollection = client.db('native_tools').collection('tools');
        const orderCollection = client.db('native_tools').collection('orders');

        // get all tools 
        app.get('/tool', async (req, res) => {
            const query = {};
            const tools = await toolCollection.find(query).toArray();
            res.send(tools);
        });

        // get single tool by id 
        app.get('/tool/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const tool = await toolCollection.findOne(query);
            res.send(tool);
        });

        // post order
        app.post('/order', async (req, res) => {
            const order = req.body;
            const result = await orderCollection.insertOne(order);
            res.send(result);
        });
    }
    finally {

    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Welcome to Native Tools Manufacturer');
});

app.listen(port, () => {
    console.log('Native tools running by:', port);
});
