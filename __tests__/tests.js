const request = require("supertest");
var cheerio = require("cheerio");
const db = require("../models/index");
const app = require("../app");
const { application } = require("express");

let server, agent;
function extractCsrfToken(res){
  var $ = cheerio.load(res.text);
  return $("[name=_csrf]").val()
}

const login = async (agent, username, password) => {
  let res = await agent.get("/login");
  let csrfToken = extractCsrfToken(res);
  res = await agent.post("/session").send({
    email: username,
    password: password,
    _csrf: csrfToken,
  });
};

describe("Hotel management", function () {
    beforeAll(async () => {
      await db.sequelize.sync({ force: true });
      server = app.listen(3000, () => {});
      agent = request.agent(server);
    });
    afterAll(async () => {
      try {
        await db.sequelize.close();
        await server.close();
      } catch (error) {
        console.log(error);
      }
    });
    test("Sign up",async()=> {
      let res = await agent.get("/signup");
      const csrfToken = extractCsrfToken(res);
      res = await agent.post("/users").send({
        firstName:"Test",
        lastName:"user A",
        email:"user.a@test.com",
        password:"12345678",
        _csrf:csrfToken
      });
      expect(res.statusCode).toBe(302);
    });
  
    test("Login",async()=>{
      let res=await agent.get("/login");
      const csrfToken = extractCsrfToken(res);
      res= await agent.post("/session").send({
        email:"user.a@test.com",
        password:"12345678",
        _csrf:csrfToken
      })
      expect(res.statusCode).toBe(302);
      expect(res.header.location).toBe("/login");
  
    })
})