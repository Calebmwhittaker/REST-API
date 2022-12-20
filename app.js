import { PrismaClient } from "@prisma/client";
import express from "express";
import bodyParser from "body-parser";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { jwtsecret } from "./config.js";
import cors from "cors";

const prisma = new PrismaClient();
const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(bodyParser.json());

app.post("/users/register", async (req, res) => {
  try {
    const salt = await bcrypt.genSalt(10);
    req.body.password = await bcrypt.hash(req.body.password, salt);
    const user = await prisma.user.create({ data: req.body });
    delete user.password;
    res.json({ user });
  } catch (error) {
    console.log(error);
    res.status(400).json({ error });
  }
});

app.post("/users/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (user && (await bcrypt.compare(password, user.password))) {
    const token = jwt.sign({ id: user.id }, jwtsecret);
    res.json({ token });
  } else {
    res.status(400).json({ error: "Incorrect email or password" });
  }
});

app.get("/api/users", async (req, res) => {
  const users = await prisma.user.findMany();
  res.json({ users });
});

app.get("/api/users/:id", async (req, res) => {
  const userId = req.params.id;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user) {
    if (user.addressId) {
      await prisma.address.delete({ where: { id: user.addressId } });
    }
    res.json({ user });
  } else {
    res.status(404).json({ error: "User Not Found" });
  }
});

app.delete("/api/users/:id", async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await prisma.user.delete({ where: { id: userId } });
    res.json({ user });
  } catch (error) {
    res.status(404).json({ error });
  }
});

app.post("/api/addresses", async (req, res) => {
  try {
    const { userId, address } = req.body;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user) {
      const dbAddress = await prisma.address.create({ data: address });
      await prisma.user.update({
        where: { id: userId },
        data: { addressId: dbAddress.id },
      });
      res.json({ address: dbAddress });
    } else {
      res.status(400).json({ error: "Invalid User ID" });
    }
  } catch (error) {
    res.status(400).json({ error });
  }
});

app.get("/api/addresses", async (req, res) => {
  const addresses = await prisma.address.findMany();
  res.json({ addresses });
});

app.get("/api/addresses/:id", async (req, res) => {
  const addressId = req.params.id;
  const address = await prisma.address.findUnique({ where: { id: addressId } });
  if (address) {
    res.json({ address });
  } else {
    res.status(404).json({ error: "Address Not Found" });
  }
});

app.delete("/api/addresses/:id", async (req, res) => {
  try {
    const addressId = req.params.id;
    const address = await prisma.address.delete({ where: { id: addressId } });
    res.json({ address });
  } catch (error) {
    res.status(404).json({ error });
  }
});

app.listen(80, () => {
  console.log("Server listening on port 80");
});
