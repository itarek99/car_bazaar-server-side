const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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
    const bookingsCollection = client.db('carBazaar').collection('bookings');

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
        res.status(403).send({ message: 'forbidden access' });
      }
    });

    app.get('/category/:id', verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { category: id, status: 'available' };
      const cars = await carsCollection.find(query).toArray();
      res.send(cars);
    });

    app.get('/advertised-products', async (req, res) => {
      const query = { advertise: true, status: 'available' };
      const advertisedProduct = await carsCollection.find(query).toArray();
      res.send(advertisedProduct);
    });

    app.get('/my-orders', verifyJWT, async (req, res) => {
      const email = req.decoded.email;
      const query = { buyerEmail: email };
      const result = await bookingsCollection.find(query).toArray();
      res.send(result);
    });

    app.get('/users/seller/:email', async (req, res) => {
      const email = req.params.email;
      const filter = { email };
      const user = await userCollection.findOne(filter);
      res.send({ isSeller: user?.role === 'seller' });
    });

    app.get('/users/admin/:email', async (req, res) => {
      const email = req.params.email;
      const filter = { email };
      const user = await userCollection.findOne(filter);
      res.send({ isAdmin: user?.role === 'admin' });
    });

    app.get('/jwt', async (req, res) => {
      const email = req.query.email;
      const token = jwt.sign({ email }, process.env.PRIVATE_KEY, { expiresIn: '24h' });
      res.send({ accessToken: token });
    });

    app.get('/all-sellers', verifyJWT, async (req, res) => {
      const query = { role: 'seller' };
      const sellers = await userCollection.find(query).toArray();
      res.send(sellers);
    });

    app.delete('/all-sellers/:id', verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });

    app.get('/all-buyers', verifyJWT, async (req, res) => {
      const query = { role: 'buyer' };
      const sellers = await userCollection.find(query).toArray();
      res.send(sellers);
    });

    app.delete('/all-buyers/:id', verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });

    app.post('/bookings', async (req, res) => {
      const bookingData = req.body;
      const result = await bookingsCollection.insertOne(bookingData);
      res.send({ ...result, id: bookingData.productId });
    });

    app.patch('/advertisements/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };

      const updateDoc = {
        $set: {
          advertise: true,
        },
      };

      const result = await carsCollection.updateOne(filter, updateDoc, options);
      res.send(result);
    });

    app.patch('/booked-status', async (req, res) => {
      const id = req.query.productId;
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };

      const updateDoc = {
        $set: {
          status: 'booked',
        },
      };

      const result = await carsCollection.updateOne(filter, updateDoc, options);
      res.send(result);
    });

    app.delete('/advertisements/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };

      const result = await carsCollection.deleteOne(query);
      res.send(result);
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

app.get('/', (_, res) => {
  res.send('Car Bazar Server Running!');
});

app.listen(port, () => {
  console.log(`car bazar server running on port: ${port}`);
});
