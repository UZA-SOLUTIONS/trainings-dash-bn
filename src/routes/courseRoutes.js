import { Router } from "express";
import * as courseController from "../controllers/courseController.js";
import { authenticate, authorizeRoles } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validationMiddleware.js";
import { createCourseSchema, updateCourseSchema } from "../validators/courseValidator.js";

const router = Router();
const staff = [authenticate, authorizeRoles("admin", "instructor")];
const admin = [authenticate, authorizeRoles("admin")];

router.get("/", ...staff, courseController.list);
router.get("/:id", ...staff, courseController.getOne);
router.post("/", ...admin, validate(createCourseSchema), courseController.create);
router.patch("/:id", ...admin, validate(updateCourseSchema), courseController.update);
router.delete("/:id", ...admin, courseController.remove);

export default router;
