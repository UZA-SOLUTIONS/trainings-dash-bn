import * as candidateService from "../services/candidateService.js";
import { success } from "../utils/response.js";
import { asyncHandler } from "../utils/errors.js";

export const create = asyncHandler(async (req, res) => {
  const candidate = await candidateService.createCandidate(req.user, req.body);
  return success(res, { candidate }, "Candidate added successfully", 201);
});

export const bulkCreate = asyncHandler(async (req, res) => {
  const result = await candidateService.bulkCreateCandidates(req.user, req.body);
  return success(res, result, "Bulk add finished", 201);
});

export const list = asyncHandler(async (req, res) => {
  const candidates = await candidateService.listCandidates(req.user, {
    cohortId: req.query.cohortId,
  });
  return success(res, { candidates }, "Candidates retrieved successfully");
});

export const getOne = asyncHandler(async (req, res) => {
  const data = await candidateService.getCandidateProfile(req.user, req.params.id);
  return success(res, data, "Candidate retrieved successfully");
});

export const update = asyncHandler(async (req, res) => {
  const candidate = await candidateService.updateCandidate(req.user, req.params.id, req.body);
  return success(res, { candidate }, "Candidate updated successfully");
});

export const remove = asyncHandler(async (req, res) => {
  const result = await candidateService.deleteCandidate(req.user, req.params.id);
  return success(res, result, "Candidate deleted successfully");
});
