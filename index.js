const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const app = express();
const port = process.env.PORT || 5000;

// middletare
app.use(cors());
app.use(express.json());

// mongodb database

const uri = `mongodb+srv://${process.env.APP_USER}:${process.env.APP_PASS}@cluster0.65gfy.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'Unauthorized access' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden access' })
        }
        req.decoded = decoded;
        next();
    });
};

async function run() {
    try {
        await client.connect();
        const toolCollection = client.db('native_tools').collection('tools');
        const orderCollection = client.db('native_tools').collection('orders');
        const userCollection = client.db('native_tools').collection('users');
        const paymentCollection = client.db('native_tools').collection('payments');
        const reviewCollection = client.db('native_tools').collection('reviews');

        // stripe
        app.post('/create-payment-intent', verifyJWT, async (req, res) => {
            const order = req.body;
            const price = order.orderValue;
            const amount = price * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            });
            res.send({ clientSecret: paymentIntent.client_secret })
        })

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

        // save new user to database
        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            }
            const result = await userCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1d' });
            res.send({ result, token });
        })

        // save user other data 
        app.put('/user', async (req, res) => {
            const email = req.query.email;
            const data = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: data,
            };
            const result = await userCollection.updateOne(filter, updateDoc, options);
            res.send(result);
        })

        // post order
        app.post('/order', async (req, res) => {
            const order = req.body;
            const result = await orderCollection.insertOne(order);
            res.send(result);
        });

        //get order details of user
        app.get('/order', verifyJWT, async (req, res) => {
            const email = req.query.email;
            const decodedEmail = req.decoded.email;
            if (email === decodedEmail) {
                const query = { buyerEmail: email };
                const result = await orderCollection.find(query).toArray();
                return res.send(result);
            }
            else {
                return res.status(403).send({ message: 'Forbidden access' });
            }
        });

        // update payment data
        app.patch('/order/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const payment = req.body;
            const filter = { _id: ObjectId(id) };
            const updateDoc = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId,
                }
            };
            const result = await paymentCollection.insertOne(payment);
            const updatedOrder = await orderCollection.updateOne(filter, updateDoc);
            res.send(updatedOrder);
        });

        // get a single order details
        app.get('/order/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const order = await orderCollection.findOne(query);
            res.send(order);
        });

        // delete a order
        app.delete('/order/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            console.log(id);
            const filter = { _id: ObjectId(id) };
            const result = await orderCollection.deleteOne(filter);
            res.send(result);
        });

        // post a review
        app.post('/review', async (req, res) => {
            const review = req.body;
            const result = await reviewCollection.insertOne(review);
            res.send(result);
        })

        // get review
        app.get('/review', async (req, res) => {
            const query = {};
            const result = await reviewCollection.find(query).toArray();
            res.send(result);
        })
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
