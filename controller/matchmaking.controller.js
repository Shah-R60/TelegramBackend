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
          
          // If already matched, verify if the match is still valid
          if (existing.status === 'matched') {
               // Check if the partner is still matched with us
               const partner = await CallQueue.findOne({ user_id: existing.matched_with });
               
               if (partner && partner.status === 'matched' && partner.matched_with === userId.toString()) {
                    // Match is valid, return it
                    return res.status(200).json(
                         new ApiResponse(200, { 
                              status: 'matched', 
                              matchedWith: existing.matched_with,
                              callId: existing.call_id,
                              queueEntry: existing 
                         }, "Match found (existing)")
                    );
               } else {
                    // Match is stale (partner left or is in different state)
                    console.log(`♻️ [STALE MATCH] Cleaning up stale match for user ${userId}`);
                    await CallQueue.deleteOne({ user_id: userId });
                    // Proceed to join logic below (as if new user)
               }
          } else {
               // If waiting, return waiting status
               return res.status(200).json(
                    new ApiResponse(200, { 
                         status: 'waiting', 
                         queueEntry: existing 
                    }, "Already in queue")
               );
          }
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
               new: false // Return the original document (before update)
          }
     );

     // If someone is waiting, match with them
     if (waitingUser) {
          console.log(`🤝 [MATCHING] User ${userId} matched with ${waitingUser.user_id}`);
          
          // Generate deterministic Call ID to handle race conditions
          // Use sorted IDs and sum of timestamps to ensure both parties generate same ID if they match simultaneously
          const sortedIds = [userId.toString(), waitingUser.user_id.toString()].sort();
          // Note: waitingUser is the doc, userId is from req. We need current user's doc? No, current user doesn't have a doc yet.
          // So we can't use current user's createdAt.
          // But in joinQueue, we are the active matcher. We can just use Date.now() because we are the single source of truth for this match event.
          // The race condition only happens in checkStatus where two existing users match each other.
          // Here, one user is new (no doc). So no race with checkStatus (which requires doc).
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

     // If we are waiting, try to find a match (active matching during polling)
     // This handles the case where two users joined simultaneously and both ended up waiting
     if (queueEntry.status === 'waiting') {
          const waitingUser = await CallQueue.findOneAndUpdate(
               {
                    status: 'waiting',
                    user_id: { $ne: userId }
               },
               {
                    $set: { status: 'matching' }
               },
               {
                    sort: { createdAt: 1 },
                    new: false
               }
          );

          if (waitingUser) {
               console.log(`🤝 [POLLING MATCH] User ${userId} matched with ${waitingUser.user_id}`);
               
               // Deterministic Call ID for race conditions in polling
               // Both users have documents with createdAt
               const sortedIds = [userId.toString(), waitingUser.user_id.toString()].sort();
               const timeSeed = queueEntry.createdAt.getTime() + waitingUser.createdAt.getTime();
               const callId = `${sortedIds[0]}_${sortedIds[1]}_${timeSeed}`;

               // Update other user
               waitingUser.status = 'matched';
               waitingUser.matched_with = userId;
               waitingUser.call_id = callId;
               await waitingUser.save();

               // Update self
               queueEntry.status = 'matched';
               queueEntry.matched_with = waitingUser.user_id;
               queueEntry.call_id = callId;
               await queueEntry.save();

               return res.status(200).json(
                    new ApiResponse(200, {
                         status: 'matched',
                         matchedWith: waitingUser.user_id.toString(),
                         callId: callId,
                         queueEntry: queueEntry
                    }, "Match found during polling")
               );
          }
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
