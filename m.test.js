const request = require("supertest");
const app = require('./app');
const mongoose = require("mongoose"); 

describe("Water Intake Functional Test", () => {
  let userId;

  afterAll(async () => {
    await mongoose.connection.close();
  });

  test("Create user", async () => {
    const res = await request(app)
      .post("/api/nutrlink/test/create")
      .send({ name: "Saleh" });

    userId = res.body._id;

    expect(res.statusCode).toBe(201);
    expect(res.body.amoutOfWater).toBe(0);
  });

  test("Water intake accumulates correctly", async () => {
    const res1 = await request(app)
      .put(`/api/nutrlink/test/${userId}`)
      .send({ amoutOfWater: 500 });

    expect(res1.body.a).toBe(500);

    const res2 = await request(app)
      .put(`/api/nutrlink/test/${userId}`)
      .send({ amoutOfWater: 100 });

    expect(res2.body.a).toBe(600);
  });
});