const express = require("express");

const {
  getAvailableUnits,
} = require("../controllers/unitController");

const router = express.Router();

router.get("/available", getAvailableUnits);

module.exports = router;