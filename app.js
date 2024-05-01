/* eslint-disable no-undef */
/* eslint-disable object-shorthand */
/* eslint-disable no-unused-vars */
/* eslint-disable semi */
/* eslint-disable key-spacing */
/* eslint-disable quotes */
const flash = require("connect-flash");
const {I18n}=require('i18n');
const csrf = require("tiny-csrf");
const { request } = require("http");
const express = require("express");
const app = express();
const { user, property, room, bookings } = require("./models");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const path = require("path");
const passport = require("passport");
const connectEnsureLogin = require("connect-ensure-login");
const session = require("express-session");
const LocalStartegy = require("passport-local");
const bcrypt = require("bcrypt");
const { error } = require("console");
const saltRounds = 10;
app.use(cookieParser("shh!some secret string"));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use((req, res, next) => {
  // Log the request method , URL and token
  console.log(
    `Request Method: ${req.method} | Request URL: ${req.url} | CSRF Token: ${req.body._csrf}`
  );
  next();
});
app.use(csrf("this_should_be_32_character_long", ["POST", "PUT", "DELETE"]));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(flash());

app.use(
  session({
    secret: "my-super-secret-key-017281611164576581653",
    cookie: {
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(path.join(__dirname, "public")));
app.use(function (request, response, next) {
  response.locals.messages = request.flash();
  next();
});
const i18n = new I18n({
  locales:['en','es'],
  directory:path.join(__dirname,'locale'),
  defaultLocale:'en'
})
app.use(i18n.init);
// app.use(functon(req,res,next){
//   i18n.setLocale(req,req.headers['abcd']);
//   next();
// })
const { v4: uuidv4 } = require("uuid");
const getUserIdMiddleware = (req, res, next) => {
  if (req.user) {
    req.userId = req.user.id;
  }
  next();
};
app.use(getUserIdMiddleware);
passport.use(
  new LocalStartegy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    async (username, password, done) => {
      try {
        const users = await user.findOne({ where: { email: username } });
        if (!users) {
          return done(null, false, { message: "Email is not registered" });
        }

        const result = await bcrypt.compare(password, users.password);
        if (result) {
          return done(null, users);
        } else {
          return done(null, false, { message: "Invalid password" });
        }
      } catch (error) {
        return done(error);
      }
    }
  )
);

passport.serializeUser((users, done) => {
  console.log("serializing user in session", users.id);
  done(null, users.id);
});
passport.deserializeUser((id, done) => {
  user
    .findByPk(id)
    .then((user) => {
      done(null, user);
    })
    .catch((error) => {
      done(error, null);
    });
});

function requireadmin(req, res, next) {
  if (req.user && req.user.admin === true) {
    return next();
  } else {
    res.status(401).json({ message: "Unauthorized user." });
  }
}

app.get("/", async (request, response) => {
  if (request.accepts("html")) {
    response.render("index.ejs", {});
  } else {
    response.json({});
  }
});

app.get("/login", (request, response) => {
  response.render("login.ejs", {
    title: "Login",
    csrfToken: request.csrfToken(),
  });
});

app.post(
  "/session",
  passport.authenticate("local", {
    failureRedirect: "/login",
    failureFlash: true,
  }),
  function (request, response) {
    console.log(request.user);
    console.log(request.user.id);
    if (request.user.admin === true) {
      response.redirect("/admin");
    } else {
      response.redirect("/muser");
    }
  }
);
app.get("/test",async (req,res)=>{
  res.send({id:1,name:res.__('Sign up')});
})
app.get("/admin", async (req, res) => {
  res.render("admin.ejs");
});

app.get("/muser", connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
  const userid = req.userId;
  const pts = await property.findAll();
  const un = await user.findOne({ where: { id: userid } });
  const username = un.firstname + " " + un.lastname;
  res.render("muser.ejs", { username, pts, csrfToken: req.csrfToken() });
});
app.get("/signup", (request, response) => {
  if (request.user) {
    return response.redirect("/login");
  }
  response.render("signup.ejs", {
    title: "Signup",
    csrfToken: request.csrfToken(),
  });
});

app.post("/users", async (request, response) => {
  var { firstname, lastname, email, password } = request.body;

  if (!firstname || !email) {
    request.flash("error", "First name and email are required");
    return response.redirect("/signup");
  }


  if (
    request.body.firstname.length !== 0 &&
    request.body.email.length !== 0 &&
    request.body.password.length === 0
  ) {
    request.flash("error", "Password is required");
    return response.redirect("/signup");
  }

  const hashedPwd = await bcrypt.hash(request.body.password, saltRounds);
  console.log(hashedPwd);
  try {
    // let admin = false;
    // if (request.body.email === "rishiktejgangadi@gmail.com") {
    //   admin = true;
    // }

    const users = await user.create({
      firstname: request.body.firstname,
      lastname: request.body.lastname,
      email: request.body.email,
      password: hashedPwd,
      admin: false,
    });

    request.login(users, (err) => {
      if (err) {
        console.log(err);
      }
      response.redirect("/login");
    });
  } catch (error) {
    console.log(error);
    request.flash("error", "Email is already registered");
    response.redirect("/signup");
  }
});

app.get("/signout", (request, response) => {
  request.logout((err) => {
    if (err) {
      return next(err);
    }
    response.redirect("/");
  });
});
app.get("/newproperty", async (request, response) => {
  response.render("createproperty.ejs", { csrfToken: request.csrfToken() });
});
app.post("/newproperty", async (request, response) => {
  const { propertyName, address, city, state, amenities, image } = request.body;
  userid = request.userId;
  const City = city.toLowerCase();
  try {
    const newProperty = await property.create({
      userid: userid,
      hname: propertyName,
      address: address,
      city: City,
      state: state,
      amenities: amenities,
    });
    response.redirect("/admin");
  } catch (error) {
    console.log(error);
    request.flash("error", "Failed to create property");
    response.redirect("/newproperty");
  }
});
app.get(
  "/userproperties",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    userid1 = request.userId;
    console.log("userid....", userid1);
    const properties = await property.findAll({
      where: { userid: userid1 },
    });
    console.log("pppp", properties);
    response.render("userProperties.ejs", { properties });
  }
);

app.get(
  "/insert-room",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    const h_id = request.query.hid;
    response.render("createroom.ejs", { h_id, csrfToken: request.csrfToken() });
  }
);
app.post(
  "/insert-room",
  connectEnsureLogin.ensureLoggedIn(),
  async (req, res) => {
    const Hid = req.query.hid;
    try {
      const { roomNumber, availableBeds, membersList, pricePerBed } = req.body;

      // Create a new room record in the database
      await room.create({
        hid: Hid,
        rid: roomNumber,
        tslots: availableBeds,
        membersList: membersList,
        price: pricePerBed,
      });

      // Redirect the user to a success page or any other desired page
      res.redirect("/admin");
    } catch (error) {
      // Handle any errors that occur during the room creation process
      console.error(error);
      res.status(500).send("An error occurred while creating the room.");
    }
  }
);

app.get(
  "/dhotels/:city",
  connectEnsureLogin.ensureLoggedIn(),
  async (req, res) => {
    const cityname = req.params.city;
    console.log("...c", cityname);
    const properties = await property.findAll({ where: { city: cityname } });
    console.log("....pp", properties);
    res.render("dhotels.ejs", { properties });
  }
);
app.post("/cities", connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
  const city = req.body.city;
  console.log(city);
  try {
    res.redirect(`/dhotels/${city}`);
  } catch (error) {
    // Handle any errors that occur during the query
    console.error("Error finding properties:", error);
    // Send an error response
    res.status(500).send("Internal Server Error");
  }
});
app.get("/hrooms", connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
  const Hid = req.query.property;
  const rooms = await room.findAll({ where: { hid: Hid } });
  res.render("hrooms.ejs", { rooms, csrfToken: req.csrfToken() });
});
app.post("/hrooms", connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
  const userId = req.user.id;
  const hotelId = req.query.hid;
  const { fromdate, todate, beds } = req.body;
  const roomId = req.query.roomid;

  const hotel = await property.findOne({ where: { id: hotelId } });
  const room1 = await room.findOne({ where: { id: roomId } });

  if (!hotel || !room1) {
    return res.status(404).send("Hotel or room not found");
  }

  const availableBeds = room1.tslots - room1.membersList.split(",").length;

  if (beds > availableBeds) {
    return res
      .status(400)
      .send("Number of beds requested exceeds availability");
  }

  const newMembersList = room1.membersList
    ? room1.membersList + "," + String(userId).repeat(beds)
    : String(userId).repeat(beds);

  const broom = await bookings.create({
    userid: userId,
    hid: hotelId,
    fromdate: fromdate,
    todate: todate,
    price: room1.price,
    hname: hotel.hname,
  });

  await room.update({ membersList: newMembersList }, { where: { id: roomId } });

  res.redirect("/pdf?broomid=" + broom.id);
});

app.get("/pdf", connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
  const bookingId = req.query.broomid;
  const booking = await bookings.findOne({ where: { id: bookingId } });
  const userId = req.user.id;
  const userRecord = await user.findOne({ where: { id: userId } });
  const username = userRecord.firstname + " " + userRecord.lastname;
  const receiptId = uuidv4();

  const reservationData = [
    {
      hotelName: booking.hname,
      receiptId: receiptId,
      checkInDate: booking.fromdate,
      checkOutDate: booking.todate,
      guestName: username,
      totalPrice: booking.price,
    },
  ];

  res.render("pdf.ejs", { reservationData });
});

app.get(
  "/mybookings",
  connectEnsureLogin.ensureLoggedIn(),
  async (req, res) => {
    const userId = req.user.id;
    const mybookings = await bookings.findAll({ where: { userid: userId } });
    res.render("mybookings.ejs", { mybookings });
  }
);

module.exports = app;
