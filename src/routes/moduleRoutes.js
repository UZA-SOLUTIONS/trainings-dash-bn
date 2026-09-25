import { Router } from "express";
import * as moduleController from "../controllers/moduleController.js";
import { authenticate, authorizeRoles } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validationMiddleware.js";
import {
  addAttachmentSchema,
  createModuleSchema,
  updateModuleSchema,
} from "../validators/moduleValidator.js";

const router = Router();
const staff = [authenticate, authorizeRoles("admin", "instructor")];
const admin = [authenticate, authorizeRoles("admin")];

router.get("/", ...staff, moduleController.list);
router.get("/:id/attachments/:attachmentId", ...staff, moduleController.downloadAttachment);
router.post("/:id/attachments", ...staff, validate(addAttachmentSchema), moduleController.addAttachment);
router.delete("/:id/attachments/:attachmentId", ...staff, moduleController.removeAttachment);
router.get("/:id", ...staff, moduleController.getOne);
router.post("/", ...admin, validate(createModuleSchema), moduleController.create);
router.patch("/:id", ...admin, validate(updateModuleSchema), moduleController.update);
router.delete("/:id", ...admin, moduleController.remove);

export default router;
