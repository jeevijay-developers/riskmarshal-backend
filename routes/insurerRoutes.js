const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const {
  listInsurers,
  createInsurer,
  updateInsurer,
  deleteInsurer,
} = require("../controllers/insurerController");

router.use(authenticate);

router.get("/", listInsurers);
router.post("/", createInsurer);
router.put("/:id", updateInsurer);
router.delete("/:id", deleteInsurer);

module.exports = router;
