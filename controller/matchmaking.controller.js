import { CallQueue } from '../model/callQueue.models.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';

// Join the matchmaking queue
const joinQueue = asyncHandler(async (req, res) => {
     const userId = req.user._id;

     console.log(`🔵 [JOIN QUEUE] User ${userId} attempting to join queue`);

     // Check if user is already in queue
     const existing = await CallQueue.findOne({ user_id: userId });

     if (existing) {
          console.log(`⚠️ [ALREADY IN QUEUE] User ${userId} already in queue with status: ${existing.status}`);
          return res.status(200).json(
               new ApiResponse(200, { 
                    status: 'already_in_queue', 
                    queueEntry: existing 
               }, "Already in queue")
          );
     }

     // Use findOneAndUpdate with atomic operation to prevent race conditions
     // Try to find and atomically update a waiting user to 'matching' status
     const waitingUser = await CallQueue.findOneAndUpdate(
          {
               status: 'waiting',
               user_id: { $ne: userId }
          },
          {
               $set: { status: 'matching' } // Temporary status to lock this user
          },
          {
               sort: { createdAt: 1 }, // Oldest first
               new: false // Return the original document
          }
     );

     // If someone is waiting, match with them
     if (waitingUser) {
          console.log(`🤝 [MATCHING] User ${userId} matched with ${waitingUser.user_id}`);
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

          console.log(`✅ [MATCH SUCCESS] Call created: ${callId}`);

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
          console.log(`⏳ [WAITING] User ${userId} added to queue`);
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
