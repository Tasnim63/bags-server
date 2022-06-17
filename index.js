const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");

//middleware
const port = process.env.PORT || 5000;
const app = express();

const corsConfig = {
  origin: true,
  credentials: true,
};
app.use(cors(corsConfig));
app.options("*", cors(corsConfig));
app.use(express.json());

function verifyUser(req, res, next) {
  const authorizationToken = req.headers.authorization;
  if (!authorizationToken) {
    return res.status(401).send({ message: "Unauthorized Access" });
  }
  const mainToken = authorizationToken.split(" ")[1];
  jwt.verify(mainToken, process.env.SECRET_ACCESS_TOKEN, (err, decoded) => {
    if (err) {
      return res
        .status(403)
        .send({ message: "Sorry!! Your Access Is Forbidden" });
    }
    req.decoded = decoded;
    next();
  });
}

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.k0zgs.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();
    const productCollection = client.db("bagsQ").collection("products");
    const reviewsCollection = client.db("bagsQ").collection("reviews");

    //get all inventory
    app.get("/products", async (req, res) => {
      const query = {};
      const limit = Number(req.query.limit);
      const pageNumber = Number(req.query.pageNumber);
      console.log(limit);
      const cursor = productCollection.find(query);
      const products = await cursor
        .skip(limit * pageNumber)
        .limit(limit)
        .toArray();
      const count = await productCollection.estimatedDocumentCount();
      console.log(count);
      res.json({ products, count });
    });

    //get all reviews
    app.get("/reviews", async (req, res) => {
      const query = {};
      const cursor = reviewsCollection.find(query);
      const reviews = await cursor.toArray();
      res.json(reviews);
    });

    //get single review by id
    app.get("/review/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const review = await reviewsCollection.findOne(query);
      res.json(review);
    });

    //add inventory
    app.post("/addinventory", async (req, res) => {
      const product = req.body;
      const result = await productCollection.insertOne(product);
      res.send(result);
    });

    //filter items according to user for myItem
    app.get("/myitem", verifyUser, async (req, res) => {
      const email = req.query.email;
      const decodEmail = req.decoded.email;
      if (email === decodEmail) {
        const query = { email: email };
        const cursor = productCollection.find(query);
        const myProducts = await cursor.toArray();
        res.send(myProducts);
      } else {
        res.status(403).send({ message: "Sorry!! Your Access Is Forbidden" });
      }
    });

    //find by id
    app.get("/inventory/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const product = await productCollection.findOne(query);
      res.send(product);
    });

    //update quantity
    app.patch("/update/:id", async (req, res) => {
      const id = req.params.id;
      const updatedQuantity = req.body.updatedQuantity;
      const filteredProduct = { _id: ObjectId(id) };
      const updateDoc = {
        $set: {
          quantity: updatedQuantity,
        },
      };
      const updatedProduct = await productCollection.updateOne(
        filteredProduct,
        updateDoc
      );
      res.send(updatedProduct);
    });

    app.post("/account", async (req, res) => {
      const email = req.body;
      const userToken = jwt.sign(email, process.env.SECRET_ACCESS_TOKEN);
      res.send({ token: userToken });
    });

    //delete inventory
    app.delete("/inventory/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await productCollection.deleteOne(query);
      res.send(result);
    });
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("bagsQ successfully connected");
});

app.listen(port, () => {
  console.log("Listening bagsQ from port", port);
});
