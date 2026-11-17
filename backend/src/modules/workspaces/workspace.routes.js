
import { Router } from "express";

import { authenticate } from "../../middleware/auth.middleware.js";
import { requireTrustedOrigin } from "../../middleware/origin.middleware.js";
import {
  createWorkspaceController,
  getUserWorkspacesController,
  getWorkspaceDetailsController,
  updateWorkspaceController,
  deleteWorkspaceController,
  getWorkspaceMembersController,
  inviteWorkspaceMemberController,
} from "./workspace.controller.js";
const router = Router();

// Create a workspace for the authenticated user.
router.post(
  "/",
  requireTrustedOrigin,
  authenticate,
  createWorkspaceController
);

router.get(
    "/:workspaceId/members",
    authenticate,
    getWorkspaceMembersController
);

router.get(
  "/",
  authenticate,
  getUserWorkspacesController
);

router.get(
  "/:workspaceId",
  authenticate,
  getWorkspaceDetailsController
);


router.patch(
  "/:workspaceId",
  authenticate,
  updateWorkspaceController
);

router.delete(
  "/:workspaceId",
  authenticate,
  deleteWorkspaceController
);

router.post(
    "/:workspaceId/invitations",
    requireTrustedOrigin,
    authenticate,
    inviteWorkspaceMemberController
);


export default router;
