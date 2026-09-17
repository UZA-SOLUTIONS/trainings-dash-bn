import { Router } from "express";
import * as cohortController from "../controllers/cohortController.js";
import * as attendanceController from "../controllers/attendanceController.js";
import * as assessmentController from "../controllers/assessmentController.js";
import * as issueController from "../controllers/issueController.js";
import * as reportController from "../controllers/reportController.js";
import { authenticate, authorizeRoles } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validationMiddleware.js";
import { createCohortSchema, updateCohortSchema } from "../validators/cohortValidator.js";
import {
  createAttendanceSessionSchema,
  listAttendanceSessionsSchema,
} from "../validators/attendanceValidator.js";
import { createAssessmentSchema } from "../validators/assessmentValidator.js";
import { createIssueSchema, listIssuesQuerySchema } from "../validators/issueValidator.js";
import { reportQuerySchema } from "../validators/reportValidator.js";

const router = Router();
const staff = [authenticate, authorizeRoles("admin", "instructor")];
const adminOnly = [authenticate, authorizeRoles("admin")];

router.get("/", ...staff, cohortController.list);
router.get("/overview", ...staff, cohortController.overview);

router.get(
  "/:id/attendance/sessions",
  ...staff,
  validate(listAttendanceSessionsSchema, "query"),
  attendanceController.listSessions,
);
router.post(
  "/:id/attendance/sessions",
  ...staff,
  validate(createAttendanceSessionSchema),
  attendanceController.createSession,
);
router.get("/:id/assessments", ...staff, assessmentController.list);
router.post("/:id/assessments", ...staff, validate(createAssessmentSchema), assessmentController.create);
router.get("/:id/issues", ...staff, validate(listIssuesQuerySchema, "query"), issueController.listForCohort);
router.post("/:id/issues", ...staff, validate(createIssueSchema), issueController.createForCohort);
router.get("/:id/reports/attendance", ...staff, validate(reportQuerySchema, "query"), reportController.attendance);
router.get("/:id/reports/scores", ...staff, validate(reportQuerySchema, "query"), reportController.scores);
router.get("/:id/reports/issues", ...staff, validate(reportQuerySchema, "query"), reportController.issues);

router.get("/:id", ...staff, cohortController.getOne);
router.post("/", ...adminOnly, validate(createCohortSchema), cohortController.create);
router.patch("/:id", ...adminOnly, validate(updateCohortSchema), cohortController.update);
router.delete("/:id", ...adminOnly, cohortController.remove);

export default router;
