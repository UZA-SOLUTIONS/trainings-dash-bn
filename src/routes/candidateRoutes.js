import { Router } from "express";
import * as candidateController from "../controllers/candidateController.js";
import * as issueController from "../controllers/issueController.js";
import { authenticate, authorizeRoles } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validationMiddleware.js";
import {
  bulkCreateCandidatesSchema,
  createCandidateSchema,
  updateCandidateSchema,
} from "../validators/candidateValidator.js";
import { createCandidateIssueSchema } from "../validators/issueValidator.js";

const router = Router();
const staff = [authenticate, authorizeRoles("admin", "instructor")];

router.post("/", ...staff, validate(createCandidateSchema), candidateController.create);
router.post("/bulk", ...staff, validate(bulkCreateCandidatesSchema), candidateController.bulkCreate);
router.get("/", ...staff, candidateController.list);
router.get("/:id/issues", ...staff, issueController.listForCandidate);
router.post(
  "/:id/issues",
  ...staff,
  validate(createCandidateIssueSchema),
  issueController.createForCandidate,
);
router.get("/:id", ...staff, candidateController.getOne);
router.patch("/:id", ...staff, validate(updateCandidateSchema), candidateController.update);
router.delete("/:id", ...staff, candidateController.remove);

export default router;
