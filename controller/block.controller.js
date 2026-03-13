import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { User } from '../model/user.models.js';
import { Block } from '../model/block.models.js';

const submitBlock = asyncHandler(async (req, res) => {
  const { blockedUserId, source } = req.body;
  const blockerId = req.user?._id;

  if (!blockedUserId) {
    throw new ApiError(400, 'Missing required fields');
  }

  if (blockedUserId === blockerId?.toString()) {
    throw new ApiError(400, 'Cannot block yourself');
  }

  const blockedUser = await User.findById(blockedUserId);
  if (!blockedUser) {
    throw new ApiError(404, 'User not found');
  }

  // Idempotent: if already exists, return success
  const existing = await Block.findOne({ blockerId, blockedUserId });
  if (existing) {
    return res
      .status(200)
      .json(new ApiResponse(200, { blockId: existing._id }, 'Block request already submitted'));
  }

  const block = await Block.create({
    blockerId,
    blockedUserId,
    source: source === 'after_call' || source === 'in_call' ? source : 'other',
  });

  return res
    .status(201)
    .json(new ApiResponse(201, { blockId: block._id }, 'Block request submitted'));
});

export { submitBlock };
