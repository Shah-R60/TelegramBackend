import { CallQueue } from '../model/callQueue.models.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';

// Join the matchmaking queue
const joinQueue = asyncHandler(async (req, res) => {
     const userId = req.user._id;

     // Check if user is already in queue
     const existing = await CallQueue.findOne({ user_id: userId });

     if (existing) {
          return res.status(200).json(
               new ApiResponse(200, { 
                    status: 'already_in_queue', 
                    queueEntry: existing 
               }, "Already in queue")
          );
     }

     // Look for someone waiting in the queue (not this user)
     const waitingUser = await CallQueue.findOne({
          status: 'waiting',
          user_id: { $ne: userId }
     }).sort({ createdAt: 1 });

     // If someone is waiting, match with them
     if (waitingUser) {
          const callId = `${Date.now()}_${userId.toString().substring(0, 8)}`;

          // Update the waiting user to matched
          waitingUser.status = 'matched';
          waitingUser.matched_with = userId;
          waitingUser.call_id = callId;
          await waitingUser.save();

          // Create entry for current user
          const newEntry = await CallQueue.create({
               user_id: userId,
               status: 'matched',
               matched_with: waitingUser.user_id,
               call_id: callId
          });

          return res.status(200).json(
               new ApiResponse(200, {
                    status: 'matched',
                    matchedWith: waitingUser.user_id.toString(),
                    callId: callId,
                    queueEntry: newEntry
               }, "Match found")
          );
     } else {
          // No one waiting, add to queue
          const newEntry = await CallQueue.create({
               user_id: userId,
               status: 'waiting'
          });

          return res.status(200).json(
               new ApiResponse(200, {
                    status: 'waiting',
                    queueEntry: newEntry
               }, "Added to queue")
          );
     }
});

// Leave the matchmaking queue
const leaveQueue = asyncHandler(async (req, res) => {
     const userId = req.user._id;

     await CallQueue.deleteOne({ user_id: userId });

     return res.status(200).json(
          new ApiResponse(200, { status: 'left_queue' }, "Left queue successfully")
     );
});

// Check queue status
const checkStatus = asyncHandler(async (req, res) => {
     const userId = req.user._id;

     const queueEntry = await CallQueue.findOne({ user_id: userId });

     if (!queueEntry) {
          return res.status(200).json(
               new ApiResponse(200, { status: 'not_in_queue' }, "Not in queue")
          );
     }

     return res.status(200).json(
          new ApiResponse(200, {
               status: queueEntry.status,
               queueEntry: queueEntry
          }, "Queue status retrieved")
     );
});

export {
     joinQueue,
     leaveQueue,
     checkStatus
};
