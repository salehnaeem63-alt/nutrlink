const request = require("supertest");
const app = require('./app');
const mongoose = require("mongoose"); 

describe("Water Intake Non-Functional Test", () => {
  
  afterAll(async () => {
    
    await mongoose.connection.close();
  });

  test("Update responds within 500ms", async () => {
    const start = Date.now();

    const res = await request(app)
      .put("/api/nutrlink/test/123456789012")
      .send({ amoutOfWater: 100 });

    const duration = Date.now() - start;
    expect(duration).toBeLessThan(500);
  });
});