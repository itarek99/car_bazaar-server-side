const { MongoClient, ServerApiVersion } = require('mongodb');
const jwt = require('jsonwebtoken');
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const app = express();

const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.ftr3rvj.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

const verifyJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).send({ message: 'unauthorized access' });
  }

  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.PRIVATE_KEY, (err, decoded) => {
    if (err) {
      return res.status(403).send({ message: 'access forbidden' });
    } else {
      req.decoded = decoded;
      next();
    }
  });
};

const run = async () => {
  try {
    const userCollection = client.db('carBazaar').collection('users');
    const carsCollection = client.db('carBazaar').collection('cars');

    app.get('/my-advertisements', verifyJWT, async (req, res) => {
      const decodedEmail = req.decoded.email;
      const email = req.query.email;
      const query = {
        advertiser_email: email,
      };

      if (decodedEmail === email) {
        const myAdvertisements = await carsCollection.find(query).toArray();
        res.send(myAdvertisements);
      } else {
        res.status(403).send({ message: 'forbidden access for getting data' });
      }
    });

    app.get('/users/seller/:email', async (req, res) => {
      const email = req.params.email;
      const filter = { email };
      const user = await userCollection.findOne(filter);
      res.send({ isSeller: user?.role === 'seller' });
    });

    app.get('/jwt', async (req, res) => {
      const email = req.query.email;
      const user = await userCollection.findOne({ email: email });

      if (user) {
        const token = jwt.sign({ email }, process.env.PRIVATE_KEY, { expiresIn: '24h' });
        res.send({ accessToken: token });
      } else {
        res.status(403).send({ accessToken: '' });
      }
    });

    app.post('/users', async (req, res) => {
      const user = req.body;
      console.log(user);
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    app.post('/cars', async (req, res) => {
      const car = req.body;
      const result = await carsCollection.insertOne(car);
      res.send(result);
    });
  } finally {
  }
};

run().catch((err) => console.error(err));

app.get('/', (req, res) => {
  res.send('Car Bazar Server Running!');
});

app.listen(port, () => {
  console.log(`car bazar server running on port: ${port}`);
});
