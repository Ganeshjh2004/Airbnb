const express = require('express');
const router = express.Router();
const legalController = require('../controllers/legalController');

router.get("/privacy", legalController.privacy);
router.get("/terms", legalController.terms);

module.exports = router;
