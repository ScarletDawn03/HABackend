import express from "express";
import session from "express-session";

const app = express();

export default session({
  secret: "a-very-secure-secret-key",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24,
  },
});
