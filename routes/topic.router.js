import { Router } from "express";
import { upload } from "../middleware/multer.middleware.js";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { publishTopic, getAllTopics, getNewestTopic, getTopicById, updateTopic, deleteTopic } from "../controller/topic.controller.js";
import { admin } from "../middleware/admin.middleware.js";

const router = Router();

// Create topic with multiple file uploads
router.route("/uploadTopic").post(
     upload.fields([
          {
               name:"TopicImage",
               maxCount:1
          },
          {
               name: 'descriptionMedia',
               maxCount: 10
          }
     ]),verifyJWT,admin,
     publishTopic
);

// Get all topics - Requires authentication
router.route("/getAllTopics").get(verifyJWT, getAllTopics);

// Get newest topic - Requires authentication
router.route("/getNewestTopic").get(verifyJWT, getNewestTopic);

// Get topic by ID - Requires authentication
router.route("/:id").get(verifyJWT, getTopicById);

// Update topic
router.route("/:id").put(
     upload.fields([
          {
               name:"TopicImage",
               maxCount:1
          },
          {
               name: 'descriptionMedia',
               maxCount: 10
          }
     ]),verifyJWT,admin,
     updateTopic
);

// Delete topic
router.route("/:id").delete(verifyJWT,admin,deleteTopic);

export default router;
